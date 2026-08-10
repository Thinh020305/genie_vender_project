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

// [AI] Declared locally rather than shared from common/ — see the matching note
// in vendor-sources.service.ts for why this module keeps its own envelope type.
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

// [AI] Only id/name/email. Member.password must never leave the DB layer —
// Step 3.3 forbids exposing personal data, and members.password is the worst
// case of it. Pinned as a constant so every query in this file uses the same
// projection and a future `include: { createdBy: true }` cannot slip in.
const AUTHOR_SELECT = {
  select: { id: true, name: true, email: true },
} as const;

@Injectable()
export class VendorSummariesService {
  constructor(private readonly prisma: PrismaService) {}

  // [AI] this.prisma.vendorSummary / this.prisma.vendor — same standing
  // blocker as every other vendor-facing service: no delegate exists until
  // vendors.prisma + members.prisma are written and `prisma generate` reruns.

  // [AI] Every method takes vendorId because the routes are nested under the
  // vendor, mirroring the PDF's Source API. findOneForVendor() scopes each
  // lookup to it, so /api/vendors/1/summaries/99 cannot reach a summary
  // belonging to vendor 2.

  // [AI] There is NO update() method. vendor_summaries has createdAt but no
  // updatedAt in the ERD, which reads as append-only — editing the text of an
  // LLM_SUMMARY in place would misrepresent what the model actually produced,
  // and Step 3.7 requires LLM output to remain reviewable as what it was.
  // Correcting a summary means deleting it and creating a new one.
  // -> MENTION TO TEAM: confirm MANUAL_NOTE is meant to be immutable too. If
  //    not, that needs an updatedAt column in the ERD first.

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
    // [AI] 404s on an unknown vendor rather than returning an empty page — an
    // empty list would claim "this vendor has no summaries", a different and
    // misleading answer when the vendor does not exist.
    await this.assertVendorExists(vendorId);

    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;

    // [AI] `undefined` when a filter is absent — Prisma drops undefined keys
    // from WHERE, while `null` would match only rows with a NULL column.
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
        // [AI] Newest first, then id as a tie-break: createdAt alone is not a
        // stable sort key, because two summaries written in the same
        // transaction share a timestamp and would page inconsistently.
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

  // [AI] Ownership rule: a DEVELOPER may delete only summaries they authored;
  // an ADMIN may delete any. Invented — the PDF has no row-level permission
  // model, and Step 3.1 only says "ADMIN: full management access". Reasoning:
  // the createdBy FK exists precisely to attribute authorship, so letting one
  // developer erase another's note would make that attribution meaningless.
  // Enforced here rather than in RolesGuard because the guard only sees the
  // route's role list, never the row being touched.
  // -> MENTION TO TEAM: this is a policy decision, not spec text.
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

  // [AI] findFirst scoped to BOTH ids, not findUnique on summaryId alone —
  // that is what makes the {id} segment in the path load-bearing rather than
  // decorative. A mismatched pair 404s instead of quietly operating on another
  // vendor's row.
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
