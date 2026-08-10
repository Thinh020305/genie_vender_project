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

// [AI] Duck-typed P2002 check. The proper form is
// `err instanceof Prisma.PrismaClientKnownRequestError`, but that type lives in
// src/generated/prisma, which currently only holds User and Post — importing
// it would be a hard compile error today. Swap for the instanceof check once
// `prisma generate` has run against the real schema.
const isUniqueConstraintError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: unknown }).code === 'P2002';

// [AI] Expands ONE catalog row into one MatchableRule per keyword, because
// rule-matcher.service.ts models a rule as a single keyword
// (`MatchableRule.keyword: string`) while the table stores the criterion with a
// keyword list. Every expanded entry keeps the criterion's own id, so the
// matcher's reason string still names the criterion that won.
//
// The id passes through untouched. An earlier version wrapped it in Number()
// because the column was BigInt while MatchableRule declares `id: number` —
// that conversion silently lost precision past 2^53 and made the ids echoed
// back by /match disagree with the ids returned by every other endpoint. Both
// problems are gone now that the column is Int.
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

  // [AI] this.prisma.classificationRule — the delegate does not exist in the
  // generated client yet. Unlike the vendor-facing services, this one is NOT
  // blocked on Cường's vendors.prisma: classification_rules has no foreign
  // keys, so it becomes runnable as soon as `prisma generate` reruns.

  // [AI] Serves the spec's only Classification-rules endpoint:
  // "GET /api/classification-rules — Get classification criteria".
  // Returns a PLAIN ARRAY, not a paginated envelope: the catalog holds one row
  // per VendorClassification, so it can never exceed five rows and paging it
  // would be noise. This differs deliberately from the vendor-sources and
  // vendor-summaries list endpoints, which are unbounded and do paginate.
  async findAll(): Promise<ClassificationRuleEntity[]> {
    const rules = (await this.prisma.classificationRule.findMany({
      // [AI] Same order RuleMatcherService.compareRules() resolves ties in
      // (priority ASC, weight DESC, createdAt ASC, id ASC), so the list reads
      // top-down as "which criterion wins first".
      orderBy: [
        { priority: 'asc' },
        { weight: 'desc' },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
    })) as ClassificationRuleModel[];

    return ClassificationRuleEntity.fromModels(rules);
  }

  async findOne(id: number): Promise<ClassificationRuleEntity> {
    return ClassificationRuleEntity.fromModel(await this.findOrThrow(id));
  }

  async create(
    dto: CreateClassificationRuleDto,
  ): Promise<ClassificationRuleEntity> {
    // [AI] Checked explicitly rather than relying on the unique index, so the
    // conflict message can name the classification. classificationName is
    // @unique because the PDF documents exactly one criterion per
    // classification.
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
          // [AI] All `undefined` on omission — Prisma skips undefined keys, so
          // PATCH stays a partial update instead of blanking every field the
          // client did not resend.
          // -> KNOWN LIMITATION: a nullable field therefore cannot be cleared
          //    back to NULL through this route, because JSON `null` and
          //    "absent" both arrive as absent after validation. Clearing
          //    `keywords` DOES work, since an explicit [] is not undefined.
          description: dto.description,
          judgmentCriteria: dto.judgmentCriteria,
          keywords: dto.keywords,
          priority: dto.priority,
          weight: dto.weight,
        },
      });

      return ClassificationRuleEntity.fromModel(updated);
    } catch (error) {
      // [AI] Defensive: UpdateClassificationRuleDto omits classificationName,
      // so the unique index should be unreachable from here. Kept so that if
      // someone later adds that field back, the failure surfaces as 409 rather
      // than as a bare 500 (AllExceptionsFilter only special-cases
      // HttpException).
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Another rule already describes this classification',
        );
      }

      throw error;
    }
  }

  // [AI] HARD delete. The earlier soft-delete design was dropped along with the
  // keyword-per-row schema: against a catalog keyed uniquely by
  // classificationName, "deleting" a criterion and re-creating it under the
  // same name is the normal correction path, and a soft-deleted row would
  // block that re-create on the unique index forever.
  // Restricted to ADMIN at the controller — removing a criterion changes how
  // every vendor is judged.
  async remove(id: number): Promise<{ id: number; deleted: true }> {
    await this.findOrThrow(id);

    await this.prisma.classificationRule.delete({ where: { id } });

    return { id, deleted: true };
  }

  // [AI] Bridge to rule-matcher.service.ts, which was written and unit-tested
  // but registered in no module, so nothing could call it. Loads the catalog,
  // expands it to one MatchableRule per keyword, and delegates the decision —
  // the sorting/tie-break logic and its 16 tests stay in that file untouched.
  //
  // PREVIEW ONLY. This never writes vendor.classification or a
  // classification_histories row: Step 3.5 requires a classification change to
  // record previousClassification/newClassification/changedBy/changedAt/reason,
  // which is what PATCH /api/vendors/{id}/classification already does. Routing
  // an automatic match around that would bypass the history requirement.
  //
  // -> KNOWN LIMITATION: loads the whole catalog on every call. Trivial at five
  //    rows; if it ever grows, this wants a cache, since the catalog changes
  //    far less often than it is read.
  async match(text: string): Promise<RuleMatchResult> {
    const rules = (await this.prisma.classificationRule.findMany(
      {},
    )) as ClassificationRuleModel[];

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
