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

// Không bao giờ lấy Member.password. Gom thành hằng để mọi query dùng chung.
const AUTHOR_SELECT = {
  select: { id: true, name: true, email: true },
} as const;

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

// Bảng chỉ ghi thêm nên không có update(); sửa = xoá rồi tạo bản mới.
@Injectable()
export class VendorSummariesService {
  constructor(private readonly prisma: PrismaService) {}

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
    await this.assertVendorExists(vendorId);

    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;

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
        // Thêm id để phá hoà: hai bản ghi cùng transaction trùng createdAt.
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

  // DEVELOPER chỉ xoá được bản của mình; ADMIN xoá được mọi bản. RolesGuard
  // không kiểm được vì nó không thấy bản ghi.
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

  // Lọc theo cả hai id để /vendors/1/summaries/99 không chạm dòng của vendor 2.
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

  // Kiểm trước để vendorId sai trả 404 thay vì P2003 bị filter biến thành 500.
  private async assertVendorExists(vendorId: number): Promise<void> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor ${vendorId} not found`);
    }
  }
}
