import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
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

// [AI] Verbatim from Genie Vina.pdf Step 3.2: 'If source is unavailable, note
// must include "source unverified" or "demo data"'. Matched case-insensitively
// against memo, with the hyphenated spelling accepted too because
// SourceType.DEMO_DATA makes "demo-data" the natural thing to type.
const DEMO_DATA_MARKERS = ['demo data', 'demo-data', 'source unverified'];

@Injectable()
export class VendorSourcesService {
  constructor(private readonly prisma: PrismaService) {}

  // [AI] this.prisma.vendorSource / this.prisma.vendor — neither delegate
  // exists in the generated client yet (only User and Post are generated as of
  // the current repo state). Same standing blocker as the classification,
  // statistics and llm modules: nothing here runs until vendors.prisma is
  // written and `prisma generate` reruns.

  // [AI] Every method takes vendorId because the PDF's Source API is nested:
  // POST/GET  /api/vendors/{id}/sources
  // PATCH     /api/vendors/{id}/sources/{sourceId}
  // The vendorId is not decoration — findOneForVendor() scopes each lookup to
  // it, so /api/vendors/1/sources/99 cannot read or edit a source belonging to
  // vendor 2. Without that scoping the path segment would be advisory and any
  // authenticated user could walk the whole table by id.

  async create(
    vendorId: bigint,
    dto: CreateVendorSourceDto,
  ): Promise<VendorSourceEntity> {
    // [AI] Explicit existence check rather than letting the FK constraint
    // reject the insert. Prisma reports an FK violation as P2003, which
    // AllExceptionsFilter would flatten into a bare 500 — it only special-cases
    // HttpException. A 404 naming the vendor is far more useful, and matches
    // what ClassificationHistoryService.updateClassification() already does.
    await this.assertVendorExists(vendorId);

    this.assertSourceEvidence(dto.sourceType, dto.sourceUrl, dto.memo);

    const created = await this.prisma.vendorSource.create({
      data: {
        vendorId,
        sourceType: dto.sourceType,
        // [AI] `?? null` rather than omitting the key. Equivalent to omission
        // on create, but written the same way here as in update() would be
        // WRONG — see the note there. Kept explicit so the stored row is
        // obvious at the call site.
        sourceUrl: dto.sourceUrl ?? null,
        sourceTitle: dto.sourceTitle ?? null,
        checkedAt: dto.checkedAt ? new Date(dto.checkedAt) : null,
        memo: dto.memo ?? null,
      },
    });

    return VendorSourceEntity.fromModel(created);
  }

  async findAllForVendor(
    vendorId: bigint,
    query: QueryVendorSourcesDto,
  ): Promise<PaginatedResult<VendorSourceEntity>> {
    // [AI] 404s on an unknown vendor instead of returning an empty page. An
    // empty list would say "this vendor has no sources", which is a different
    // and misleading answer when the vendor does not exist at all.
    await this.assertVendorExists(vendorId);

    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;

    const where = {
      vendorId,
      // [AI] `undefined` (not null) when the filter is absent — Prisma drops
      // undefined keys from WHERE, whereas null would filter for rows whose
      // sourceType IS NULL and match nothing.
      sourceType: query.sourceType,
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.vendorSource.count({ where }),
      this.prisma.vendorSource.findMany({
        where,
        // [AI] vendor_sources has no createdAt column in the ERD, so there is
        // no "newest first" ordering available. id DESC is the closest proxy:
        // for @default(autoincrement()) it is insertion order.
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
    vendorId: bigint,
    sourceId: bigint,
  ): Promise<VendorSourceEntity> {
    return VendorSourceEntity.fromModel(
      await this.findOneForVendor(vendorId, sourceId),
    );
  }

  async update(
    vendorId: bigint,
    sourceId: bigint,
    dto: UpdateVendorSourceDto,
  ): Promise<VendorSourceEntity> {
    const existing = await this.findOneForVendor(vendorId, sourceId);

    // [AI] The Step 3.3 evidence rule is checked against the MERGED row, not
    // against the request body. A PATCH that only clears sourceUrl looks
    // harmless field-by-field but can leave a stored row with neither a URL nor
    // a demo-data note — exactly the state the rule forbids.
    this.assertSourceEvidence(
      dto.sourceType ?? existing.sourceType,
      dto.sourceUrl ?? existing.sourceUrl ?? undefined,
      dto.memo ?? existing.memo ?? undefined,
    );

    const updated = await this.prisma.vendorSource.update({
      where: { id: sourceId },
      data: {
        sourceType: dto.sourceType,
        // [AI] Deliberately `undefined` here, unlike create(). On a PATCH an
        // omitted field must mean "leave it alone", and Prisma skips undefined
        // keys. Using `?? null` would wipe every field the client did not
        // resend, turning PATCH into PUT.
        // -> KNOWN LIMITATION: a field therefore cannot be cleared back to NULL
        //    through this endpoint, because JSON `null` and "absent" both
        //    arrive as absent after validation. Fixing that properly needs an
        //    explicit sentinel; not built, since the PDF does not call for it.
        sourceUrl: dto.sourceUrl,
        sourceTitle: dto.sourceTitle,
        checkedAt: dto.checkedAt ? new Date(dto.checkedAt) : undefined,
        memo: dto.memo,
      },
    });

    return VendorSourceEntity.fromModel(updated);
  }

  // [AI] BEYOND SPEC — the PDF's Source API table lists POST, GET and PATCH
  // only, no DELETE. Kept because a source added against the wrong vendor is
  // otherwise permanent, and restricted to ADMIN at the controller, mirroring
  // "DELETE /api/vendors/{id} — Delete vendor (admin only or soft delete)".
  // Hard delete: a source row is a factual pointer to external evidence with
  // no decision history attached, so there is nothing to preserve for audit.
  // -> MENTION TO TEAM: delete this route if the team wants to stay strictly
  //    inside the documented endpoint list.
  async remove(
    vendorId: bigint,
    sourceId: bigint,
  ): Promise<{ id: string; deleted: true }> {
    await this.findOneForVendor(vendorId, sourceId);

    await this.prisma.vendorSource.delete({ where: { id: sourceId } });

    return { id: sourceId.toString(), deleted: true };
  }

  // [AI] Enforces Genie Vina.pdf Step 3.3 ("Each vendor must include a public
  // source URL or a clear demo-data note") together with Step 3.2 ("website and
  // sourceUrl may be optional only for educational demo data. If source is
  // unavailable, note must include 'source unverified' or 'demo data'").
  //
  // Read as: a source row is only acceptable if it points at something
  // checkable, OR it openly says it does not. The second clause is what keeps
  // an unsourced row from silently looking like evidence.
  //
  // -> KNOWN GAP: this guarantees each SOURCE ROW is evidenced. It does not
  //    guarantee each VENDOR has at least one source, which is the other half
  //    of Step 3.3 — nothing here runs when a vendor is created with no
  //    sources at all. That check belongs in Cường's vendor-creation path or
  //    in a cross-table validation, and cannot be enforced from this module.
  //    -> MUST MENTION TO TEAM.
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

    // [AI] The converse check, and a judgment call rather than spec text:
    // Step 3.2 permits a missing URL "only for educational demo data", so a row
    // that has no URL and is NOT typed DEMO_DATA is claiming to be a real
    // public source it cannot show. Rejected rather than silently stored.
    // -> MENTION TO TEAM: this makes DEMO_DATA the only sourceType that may
    //    omit sourceUrl. If the team wants e.g. an ARTICLE with no link, this
    //    is the check to relax.
    if (!hasUrl && sourceType !== SourceType.DEMO_DATA) {
      throw new BadRequestException(
        `sourceUrl may only be omitted for sourceType ${SourceType.DEMO_DATA}, not ${sourceType}`,
      );
    }
  }

  // [AI] findFirst scoped to BOTH ids, not findUnique on sourceId alone. That
  // is what makes the {id} segment in /api/vendors/{id}/sources/{sourceId}
  // load-bearing: a mismatched pair 404s rather than quietly operating on
  // another vendor's row.
  private async findOneForVendor(
    vendorId: bigint,
    sourceId: bigint,
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
