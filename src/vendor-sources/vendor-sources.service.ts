import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { CreateVendorSourceDto } from './dto/create-vendor-source.dto';
import { QueryVendorSourcesDto } from './dto/query-vendor-sources.dto';
import { UpdateVendorSourceDto } from './dto/update-vendor-source.dto';
import {
  VendorSourceEntity,
  VendorSourceModel,
} from './entities/vendor-source.entity';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

@Injectable()
export class VendorSourcesService {
  constructor(private readonly prisma: PrismaService) {}

  // [AI] this.prisma.vendorSource / this.prisma.vendor — neither delegate
  // exists in the generated client yet (only User and Post are generated as
  // of the current repo state). Same standing blocker as the classification,
  // statistics and llm modules: nothing in this file runs until
  // vendors.prisma is written and `prisma generate` reruns.

  async create(dto: CreateVendorSourceDto): Promise<VendorSourceEntity> {
    const vendorId = BigInt(dto.vendorId);

    // [AI] Explicit existence check before the insert, rather than letting the
    // FK constraint reject it. Prisma surfaces an FK violation as P2003, which
    // AllExceptionsFilter would turn into a bare 500 — it only special-cases
    // HttpException. A 404 naming the vendor is far more useful, and this
    // matches the check ClassificationHistoryService.updateClassification()
    // already does.
    await this.assertVendorExists(vendorId);

    const created = (await this.prisma.vendorSource.create({
      data: {
        vendorId,
        sourceType: dto.sourceType,
        // [AI] `?? null` rather than leaving the key off: an omitted optional
        // DTO field is `undefined`, and Prisma treats `undefined` as "do not
        // set this column" — which happens to be equivalent on create, but
        // is NOT equivalent on update (see update() below). Written the same
        // way in both places so the two read identically.
        sourceUrl: dto.sourceUrl ?? null,
        sourceTitle: dto.sourceTitle ?? null,
        checkedAt: dto.checkedAt ? new Date(dto.checkedAt) : null,
        memo: dto.memo ?? null,
      },
    })) as VendorSourceModel;

    return VendorSourceEntity.fromModel(created);
  }

  async findAll(
    query: QueryVendorSourcesDto,
  ): Promise<PaginatedResult<VendorSourceEntity>> {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;

    const where = {
      // [AI] `undefined` (not null) when the filter is absent — Prisma drops
      // undefined keys from the WHERE clause, whereas `null` would filter for
      // rows whose vendorId IS NULL and match nothing.
      vendorId: query.vendorId ? BigInt(query.vendorId) : undefined,
      sourceType: query.sourceType,
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.vendorSource.count({ where }),
      this.prisma.vendorSource.findMany({
        where,
        // [AI] vendor_sources has no createdAt column in docs/erd.md, so
        // there is no "newest first" ordering available. Falling back to id
        // DESC, which for @default(autoincrement()) is insertion order — the
        // closest available proxy.
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: VendorSourceEntity.fromModels(rows as VendorSourceModel[]),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: bigint): Promise<VendorSourceEntity> {
    const source = (await this.prisma.vendorSource.findUnique({
      where: { id },
    })) as VendorSourceModel | null;

    if (!source) {
      throw new NotFoundException(`Vendor source ${id} not found`);
    }

    return VendorSourceEntity.fromModel(source);
  }

  async update(
    id: bigint,
    dto: UpdateVendorSourceDto,
  ): Promise<VendorSourceEntity> {
    await this.findOne(id);

    const updated = (await this.prisma.vendorSource.update({
      where: { id },
      data: {
        sourceType: dto.sourceType,
        // [AI] Deliberately `undefined` here, unlike create(). On a PATCH, an
        // omitted field must mean "leave it alone", and Prisma skips
        // undefined keys. Using `?? null` here would wipe every field the
        // client didn't resend, turning PATCH into PUT.
        // -> KNOWN LIMITATION: this also means a field can never be cleared
        //    back to NULL through this endpoint, because JSON `null` and
        //    "absent" both arrive as absent after validation. Fixing that
        //    properly needs an explicit sentinel; not built, since docs/erd.md
        //    doesn't call for it.
        sourceUrl: dto.sourceUrl,
        sourceTitle: dto.sourceTitle,
        checkedAt: dto.checkedAt ? new Date(dto.checkedAt) : undefined,
        memo: dto.memo,
      },
    })) as VendorSourceModel;

    return VendorSourceEntity.fromModel(updated);
  }

  async remove(id: bigint): Promise<{ id: string; deleted: true }> {
    await this.findOne(id);

    await this.prisma.vendorSource.delete({ where: { id } });

    // [AI] Hard delete, unlike ClassificationRule's soft delete. A source row
    // is a factual pointer to external evidence with no decision history
    // attached to it, so there's nothing to preserve for audit. Returning
    // { id, deleted } instead of 204 so ResponseInterceptor still has a body
    // to wrap.
    return { id: id.toString(), deleted: true };
  }

  private async assertVendorExists(vendorId: bigint): Promise<void> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor ${vendorId} not found`);
    }
  }
}
