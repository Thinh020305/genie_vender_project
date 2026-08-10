import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../generated/prisma/enums';
import { CreateVendorSummaryDto } from './dto/create-vendor-summary.dto';
import { QueryVendorSummariesDto } from './dto/query-vendor-summaries.dto';
import {
  VendorSummaryAuthorModel,
  VendorSummaryEntity,
  VendorSummaryModel,
} from './entities/vendor-summary.entity';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

export interface PaginatedSummaries {
  items: VendorSummaryEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type VendorSummaryRow = VendorSummaryModel & {
  createdBy?: VendorSummaryAuthorModel;
};

/**
 * Chỉ lấy id/name/email. Member.password không được phép rời khỏi tầng dữ
 * liệu. Gom thành hằng số để mọi truy vấn trong file dùng chung một phép chiếu
 * và không ai vô tình viết `include: { createdBy: true }`.
 */
const AUTHOR_SELECT = {
  select: { id: true, name: true, email: true },
} as const;

@Injectable()
export class VendorSummariesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Bảng chỉ ghi thêm nên service cố ý KHÔNG có update(): sửa nội dung một
   * LLM_SUMMARY tại chỗ sẽ làm sai lệch thứ mô hình thực sự trả về. Muốn sửa
   * thì xoá rồi tạo bản mới.
   *
   * Mọi phương thức nhận vendorId vì route lồng dưới vendor; findOneForVendor()
   * giới hạn truy vấn theo cả hai id nên /api/vendors/1/summaries/99 không với
   * tới bản tóm tắt của vendor 2.
   */
  async create(
    vendorId: number,
    dto: CreateVendorSummaryDto,
    createdById: number,
  ): Promise<VendorSummaryEntity> {
    await this.assertVendorExists(vendorId);

    const created = (await this.prisma.vendorSummary.create({
      data: {
        vendorId,
        summaryType: dto.summaryType,
        content: dto.content,
        createdById,
      },
      include: { createdBy: AUTHOR_SELECT },
    })) as VendorSummaryRow;

    return VendorSummaryEntity.fromModel(created);
  }

  async findAllForVendor(
    vendorId: number,
    query: QueryVendorSummariesDto,
  ): Promise<PaginatedSummaries> {
    // Trả 404 khi vendor không tồn tại thay vì trang rỗng: danh sách rỗng mang
    // nghĩa "vendor này chưa có bản tóm tắt nào", khác với "không có vendor".
    await this.assertVendorExists(vendorId);

    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;

    // Để undefined khi không lọc — Prisma bỏ qua khoá undefined, còn null sẽ
    // lọc theo cột IS NULL.
    const where = {
      vendorId,
      summaryType: query.summaryType,
      createdById: query.createdById ? Number(query.createdById) : undefined,
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.vendorSummary.count({ where }),
      this.prisma.vendorSummary.findMany({
        where,
        include: { createdBy: AUTHOR_SELECT },
        // Mới nhất trước, rồi id để phá hoà: riêng createdAt không phải khoá
        // sắp xếp ổn định vì hai bản ghi cùng transaction trùng timestamp và
        // sẽ phân trang không nhất quán.
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: VendorSummaryEntity.fromModels(rows),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(
    vendorId: number,
    summaryId: number,
  ): Promise<VendorSummaryEntity> {
    return VendorSummaryEntity.fromModel(
      await this.findOneForVendor(vendorId, summaryId),
    );
  }

  /**
   * Quy tắc sở hữu: DEVELOPER chỉ xoá được bản tóm tắt do chính mình viết,
   * ADMIN xoá được mọi bản. Khoá ngoại createdBy tồn tại để quy trách nhiệm
   * tác giả, nên cho một developer xoá ghi chú của người khác sẽ làm điều đó
   * vô nghĩa. Kiểm ở đây chứ không ở RolesGuard vì guard chỉ thấy danh sách
   * vai trò của route, không thấy bản ghi.
   */
  async remove(
    vendorId: number,
    summaryId: number,
    requesterId: number,
    requesterRole: Role,
  ): Promise<{ id: number; deleted: true }> {
    const summary = await this.findOneForVendor(vendorId, summaryId);

    if (requesterRole !== Role.ADMIN && summary.createdById !== requesterId) {
      throw new ForbiddenException(
        'You can only delete vendor summaries you created',
      );
    }

    await this.prisma.vendorSummary.delete({ where: { id: summaryId } });

    return { id: summaryId, deleted: true };
  }

  /**
   * findFirst theo CẢ HAI id chứ không findUnique theo mình summaryId — đây là
   * thứ khiến đoạn {id} trong đường dẫn có tác dụng thật. Cặp id không khớp trả
   * 404 thay vì lặng lẽ thao tác lên dòng của vendor khác.
   */
  private async findOneForVendor(
    vendorId: number,
    summaryId: number,
  ): Promise<VendorSummaryRow> {
    await this.assertVendorExists(vendorId);

    const summary = (await this.prisma.vendorSummary.findFirst({
      where: { id: summaryId, vendorId },
      include: { createdBy: AUTHOR_SELECT },
    })) as VendorSummaryRow | null;

    if (!summary) {
      throw new NotFoundException(
        `Summary ${summaryId} not found for vendor ${vendorId}`,
      );
    }

    return summary;
  }

  private async assertVendorExists(vendorId: number): Promise<void> {
    // Kiểm tường minh để vendorId sai trả 404, thay vì để Prisma ném vi phạm
    // khoá ngoại P2003 rồi bị AllExceptionsFilter biến thành 500 trống trơn.
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor ${vendorId} not found`);
    }
  }
}
