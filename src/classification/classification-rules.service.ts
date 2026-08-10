import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassificationRuleDto } from './dto/create-classification-rule.dto';
import { UpdateClassificationRuleDto } from './dto/update-classification-rule.dto';
import {
  ClassificationRuleEntity,
  ClassificationRuleModel,
} from './entities/classification-rule.entity';
import {
  MatchableRule,
  RuleMatcherService,
  RuleMatchResult,
} from './rule-matcher.service';

const DEFAULT_PRIORITY = 100;
const DEFAULT_WEIGHT = 1;

/**
 * Nhận diện lỗi vi phạm ràng buộc duy nhất của Prisma. Dạng chuẩn là
 * `err instanceof Prisma.PrismaClientKnownRequestError`, nhưng type đó nằm
 * trong client được sinh ra, chưa dùng được cho tới khi schema đủ model.
 */
const isUniqueConstraintError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: unknown }).code === 'P2002';

/**
 * Tách một dòng tiêu chí thành nhiều MatchableRule, mỗi từ khoá một cái, vì
 * RuleMatcherService mô hình hoá một rule là một từ khoá đơn. Mọi bản tách đều
 * giữ id của tiêu chí gốc nên phần giải thích kết quả vẫn gọi đúng tên tiêu chí
 * đã thắng.
 */
const toMatchableRules = (model: ClassificationRuleModel): MatchableRule[] =>
  model.keywords.map((keyword) => ({
    id: model.id,
    keyword,
    targetClassification: model.classificationName,
    priority: model.priority,
    weight: model.weight,
    createdAt: model.createdAt,
  }));

@Injectable()
export class ClassificationRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ruleMatcher: RuleMatcherService,
  ) {}

  /**
   * Phục vụ GET /api/classification-rules.
   *
   * Trả về MẢNG THUẦN, không bọc phân trang: danh mục có đúng một dòng cho mỗi
   * VendorClassification nên không bao giờ vượt năm dòng, phân trang chỉ gây
   * nhiễu. Khác với vendor-sources và vendor-summaries là hai danh sách không
   * chặn trên nên có phân trang.
   */
  async findAll(): Promise<ClassificationRuleEntity[]> {
    const rules = await this.prisma.classificationRule.findMany({
      // Cùng thứ tự mà RuleMatcherService dùng để phá hoà, nên danh sách đọc
      // từ trên xuống chính là "tiêu chí nào thắng trước".
      orderBy: [
        { priority: 'asc' },
        { weight: 'desc' },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
    });

    return ClassificationRuleEntity.fromModels(rules);
  }

  async findOne(id: number): Promise<ClassificationRuleEntity> {
    return ClassificationRuleEntity.fromModel(await this.findOrThrow(id));
  }

  async create(
    dto: CreateClassificationRuleDto,
  ): Promise<ClassificationRuleEntity> {
    // Kiểm trước để thông báo xung đột nêu được tên phân loại và id dòng cũ.
    const existing = await this.prisma.classificationRule.findUnique({
      where: { classificationName: dto.classificationName },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        `A classification rule for ${dto.classificationName} already exists (id ${existing.id}). Update it instead.`,
      );
    }

    const created = await this.prisma.classificationRule.create({
      data: {
        classificationName: dto.classificationName,
        description: dto.description ?? null,
        judgmentCriteria: dto.judgmentCriteria ?? null,
        keywords: dto.keywords ?? [],
        priority: dto.priority ?? DEFAULT_PRIORITY,
        weight: dto.weight ?? DEFAULT_WEIGHT,
      },
    });

    return ClassificationRuleEntity.fromModel(created);
  }

  async update(
    id: number,
    dto: UpdateClassificationRuleDto,
  ): Promise<ClassificationRuleEntity> {
    await this.findOrThrow(id);

    try {
      const updated = await this.prisma.classificationRule.update({
        where: { id },
        data: {
          // Để undefined khi client không gửi — Prisma bỏ qua khoá undefined
          // nên PATCH vẫn là cập nhật một phần thay vì xoá trắng mọi trường
          // client không gửi lại. Riêng keywords vẫn xoá được bằng mảng rỗng.
          description: dto.description,
          judgmentCriteria: dto.judgmentCriteria,
          keywords: dto.keywords,
          priority: dto.priority,
          weight: dto.weight,
        },
      });

      return ClassificationRuleEntity.fromModel(updated);
    } catch (error) {
      // Phòng thủ: DTO đã bỏ classificationName nên về lý thuyết không chạm
      // được ràng buộc duy nhất. Giữ lại để nếu sau này ai đó thêm trường đó
      // trở lại thì lỗi hiện ra dưới dạng 409 chứ không phải 500 trống trơn.
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Another rule already describes this classification',
        );
      }

      throw error;
    }
  }

  /**
   * Xoá cứng. Với danh mục khoá theo classificationName, cách sửa sai thông
   * thường là xoá rồi tạo lại cùng tên — một dòng xoá mềm sẽ chặn vĩnh viễn
   * thao tác tạo lại đó vì vướng ràng buộc duy nhất. Route giới hạn cho ADMIN
   * vì bỏ một tiêu chí làm thay đổi cách đánh giá mọi vendor.
   */
  async remove(id: number): Promise<{ id: number; deleted: true }> {
    await this.findOrThrow(id);

    await this.prisma.classificationRule.delete({ where: { id } });

    return { id, deleted: true };
  }

  /**
   * Nạp danh mục, tách thành từng từ khoá rồi giao việc quyết định cho
   * RuleMatcherService.
   *
   * CHỈ XEM TRƯỚC. Hàm này không bao giờ ghi vendor.classification hay một dòng
   * classification_histories: mọi thay đổi phân loại phải ghi lại
   * previousClassification / newClassification / changedBy / changedAt / reason,
   * và đó là việc của PATCH /api/vendors/{id}/classification.
   *
   * Giới hạn đã biết: nạp toàn bộ danh mục mỗi lần gọi. Không đáng kể với năm
   * dòng; nếu danh mục lớn lên thì nên cache vì nó thay đổi ít hơn nhiều so với
   * số lần đọc.
   */
  async match(text: string): Promise<RuleMatchResult> {
    const rules = await this.prisma.classificationRule.findMany({});

    return this.ruleMatcher.match(rules.flatMap(toMatchableRules), text);
  }

  private async findOrThrow(id: number): Promise<ClassificationRuleModel> {
    const rule = await this.prisma.classificationRule.findUnique({
      where: { id },
    });

    if (!rule) {
      throw new NotFoundException(`Classification rule ${id} not found`);
    }

    return rule;
  }
}
