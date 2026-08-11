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

// Dạng chuẩn là `err instanceof Prisma.PrismaClientKnownRequestError`, nhưng
// type đó nằm trong client chưa sinh được.
const isUniqueConstraintError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: unknown }).code === 'P2002';

// RuleMatcherService coi một rule là một từ khoá đơn, nên tách mỗi tiêu chí
// thành nhiều rule; tất cả giữ id gốc để phần giải thích gọi đúng tiêu chí.
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

  // Trả mảng thuần, không phân trang: danh mục tối đa năm dòng.
  async findAll(): Promise<ClassificationRuleEntity[]> {
    const rules = await this.prisma.classificationRule.findMany({
      // Cùng thứ tự RuleMatcherService dùng để phá hoà.
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
          // undefined = giữ nguyên; riêng keywords xoá được bằng mảng rỗng.
          description: dto.description,
          judgmentCriteria: dto.judgmentCriteria,
          keywords: dto.keywords,
          priority: dto.priority,
          weight: dto.weight,
        },
      });

      return ClassificationRuleEntity.fromModel(updated);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Another rule already describes this classification',
        );
      }

      throw error;
    }
  }

  async remove(id: number): Promise<{ id: number; deleted: true }> {
    await this.findOrThrow(id);

    await this.prisma.classificationRule.delete({ where: { id } });

    return { id, deleted: true };
  }

  // Chỉ xem trước: không ghi vendor.classification hay lịch sử phân loại.
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
