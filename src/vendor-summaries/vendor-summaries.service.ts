import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
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

type VendorSummaryRow = VendorSummaryModel & {
  createdBy?: VendorSummaryAuthorModel;
};

// [AI] Only id/name/email — Member.password must never leave the DB layer.
// Pinned as a constant so every query in this file uses the same projection
// and a future `include: { createdBy: true }` can't slip in by accident.
const AUTHOR_SELECT = {
  select: { id: true, name: true, email: true },
} as const;

@Injectable()
export class VendorSummariesService {
  constructor(private readonly prisma: PrismaService) {}

  // [AI] this.prisma.vendorSummary / this.prisma.vendor — same standing
  // blocker as every other vendor-facing service: no delegate exists until
  // vendors.prisma + members.prisma are written and `prisma generate` reruns.

  // [AI] There is NO update() method. vendor_summaries has createdAt but no
  // updatedAt in docs/erd.md, which reads as append-only — editing the text of
  // an LLM_SUMMARY in place would misrepresent what the model actually
  // produced. Correcting a summary means deleting it and creating a new one.
  // -> MENTION TO TEAM: confirm MANUAL_NOTE is meant to be immutable too. If
  //    not, that needs an updatedAt column in the ERD first.

  async create(
    dto: CreateVendorSummaryDto,
    createdById: bigint,
  ): Promise<VendorSummaryEntity> {
    const vendorId = BigInt(dto.vendorId);

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

  async findAll(
    query: QueryVendorSummariesDto,
  ): Promise<PaginatedResult<VendorSummaryEntity>> {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;

    // [AI] `undefined` when a filter is absent — Prisma drops undefined keys
    // from WHERE, while `null` would match only rows with a NULL column.
    const where = {
      vendorId: query.vendorId ? BigInt(query.vendorId) : undefined,
      summaryType: query.summaryType,
      createdById: query.createdById ? BigInt(query.createdById) : undefined,
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.vendorSummary.count({ where }),
      this.prisma.vendorSummary.findMany({
        where,
        include: { createdBy: AUTHOR_SELECT },
        // [AI] Newest first, then id as a tie-break: createdAt alone is not a
        // stable sort key, because two summaries written in the same
        // transaction share a timestamp and would page inconsistently.
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: VendorSummaryEntity.fromModels(rows as VendorSummaryRow[]),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: bigint): Promise<VendorSummaryEntity> {
    const summary = (await this.prisma.vendorSummary.findUnique({
      where: { id },
      include: { createdBy: AUTHOR_SELECT },
    })) as VendorSummaryRow | null;

    if (!summary) {
      throw new NotFoundException(`Vendor summary ${id} not found`);
    }

    return VendorSummaryEntity.fromModel(summary);
  }

  // [AI] Ownership rule: a DEVELOPER may delete only summaries they authored;
  // an ADMIN may delete any. Invented — docs/erd.md has no permission model,
  // and the role table only says ADMIN "manages members and system config".
  // Reasoning: the createdBy FK exists precisely to attribute authorship, so
  // letting one developer erase another's note would make that attribution
  // meaningless. Enforced here rather than in the guard because RolesGuard
  // only sees the route's role list, not the row being touched.
  // -> MENTION TO TEAM: this is a policy decision, not spec text.
  async remove(
    id: bigint,
    requesterId: bigint,
    requesterRole: Role,
  ): Promise<{ id: string; deleted: true }> {
    const summary = (await this.prisma.vendorSummary.findUnique({
      where: { id },
      select: { id: true, createdById: true },
    })) as { id: bigint; createdById: bigint } | null;

    if (!summary) {
      throw new NotFoundException(`Vendor summary ${id} not found`);
    }

    if (requesterRole !== Role.ADMIN && summary.createdById !== requesterId) {
      throw new ForbiddenException(
        'You can only delete vendor summaries you created',
      );
    }

    await this.prisma.vendorSummary.delete({ where: { id } });

    return { id: id.toString(), deleted: true };
  }

  private async assertVendorExists(vendorId: bigint): Promise<void> {
    // [AI] Explicit check so a bad vendorId reads as 404 rather than a raw
    // Prisma P2003 FK violation, which AllExceptionsFilter would flatten into
    // a bare 500. Same approach as VendorSourcesService.
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor ${vendorId} not found`);
    }
  }
}
