import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { SourceType } from '../generated/prisma/enums';
import { CreateVendorSourceDto } from './dto/create-vendor-source.dto';
import { QueryVendorSourcesDto } from './dto/query-vendor-sources.dto';
import { UpdateVendorSourceDto } from './dto/update-vendor-source.dto';
import {
  VendorSourceEntity,
  VendorSourceModel,
} from './entities/vendor-source.entity';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

const DEMO_DATA_MARKERS = ['demo data', 'demo-data', 'source unverified'];

export interface PaginatedSources {
  items: VendorSourceEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class VendorSourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    vendorId: number,
    dto: CreateVendorSourceDto,
  ): Promise<VendorSourceEntity> {
    await this.assertVendorExists(vendorId);
    this.assertSourceEvidence(dto.sourceType, dto.sourceUrl, dto.memo);

    const created = await this.prisma.vendorSource.create({
      data: {
        vendorId,
        sourceType: dto.sourceType,
        sourceUrl: dto.sourceUrl ?? null,
        sourceTitle: dto.sourceTitle ?? null,
        checkedAt: dto.checkedAt ? new Date(dto.checkedAt) : null,
        memo: dto.memo ?? null,
      },
    });

    return VendorSourceEntity.fromModel(created);
  }

  async findAllForVendor(
    vendorId: number,
    query: QueryVendorSourcesDto,
  ): Promise<PaginatedSources> {
    await this.assertVendorExists(vendorId);

    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;

    const where = {
      vendorId,
      sourceType: query.sourceType,
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.vendorSource.count({ where }),
      this.prisma.vendorSource.findMany({
        where,
        // Bảng không có createdAt; id giảm dần là thứ tự chèn ngược.
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: VendorSourceEntity.fromModels(rows),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(
    vendorId: number,
    sourceId: number,
  ): Promise<VendorSourceEntity> {
    return VendorSourceEntity.fromModel(
      await this.findOneForVendor(vendorId, sourceId),
    );
  }

  async update(
    vendorId: number,
    sourceId: number,
    dto: UpdateVendorSourceDto,
  ): Promise<VendorSourceEntity> {
    const existing = await this.findOneForVendor(vendorId, sourceId);

    // Kiểm trên dòng sau khi gộp: PATCH chỉ xoá sourceUrl vẫn có thể để lại
    // dòng không còn URL lẫn ghi chú demo.
    this.assertSourceEvidence(
      dto.sourceType ?? existing.sourceType,
      dto.sourceUrl ?? existing.sourceUrl ?? undefined,
      dto.memo ?? existing.memo ?? undefined,
    );

    const updated = await this.prisma.vendorSource.update({
      where: { id: sourceId },
      data: {
        sourceType: dto.sourceType,
        // undefined = giữ nguyên. Dùng `?? null` sẽ biến PATCH thành PUT.
        sourceUrl: dto.sourceUrl,
        sourceTitle: dto.sourceTitle,
        checkedAt: dto.checkedAt ? new Date(dto.checkedAt) : undefined,
        memo: dto.memo,
      },
    });

    return VendorSourceEntity.fromModel(updated);
  }

  async remove(
    vendorId: number,
    sourceId: number,
  ): Promise<{ id: number; deleted: true }> {
    await this.findOneForVendor(vendorId, sourceId);

    await this.prisma.vendorSource.delete({ where: { id: sourceId } });

    return { id: sourceId, deleted: true };
  }

  private assertSourceEvidence(
    sourceType: SourceType,
    sourceUrl: string | undefined,
    memo: string | undefined,
  ): void {
    const hasUrl = typeof sourceUrl === 'string' && sourceUrl.trim().length > 0;

    const normalizedMemo = (memo ?? '').toLowerCase();
    const hasDemoDataNote = DEMO_DATA_MARKERS.some((marker) =>
      normalizedMemo.includes(marker),
    );

    if (!hasUrl && !hasDemoDataNote) {
      throw new BadRequestException(
        `A source must have either a public sourceUrl or a memo containing one of: ${DEMO_DATA_MARKERS.map(
          (marker) => `"${marker}"`,
        ).join(', ')}`,
      );
    }

    if (!hasUrl && sourceType !== SourceType.DEMO_DATA) {
      throw new BadRequestException(
        `sourceUrl may only be omitted for sourceType ${SourceType.DEMO_DATA}, not ${sourceType}`,
      );
    }
  }

  // Lọc theo cả hai id để /vendors/1/sources/99 không chạm được dòng của vendor 2.
  private async findOneForVendor(
    vendorId: number,
    sourceId: number,
  ): Promise<VendorSourceModel> {
    await this.assertVendorExists(vendorId);

    const source = await this.prisma.vendorSource.findFirst({
      where: { id: sourceId, vendorId },
    });

    if (!source) {
      throw new NotFoundException(
        `Source ${sourceId} not found for vendor ${vendorId}`,
      );
    }

    return source;
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
