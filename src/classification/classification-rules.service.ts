import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { CreateClassificationRuleDto } from './dto/create-classification-rule.dto';
import { QueryClassificationRulesDto } from './dto/query-classification-rules.dto';
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

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

const DEFAULT_PRIORITY = 100;
const DEFAULT_WEIGHT = 1;

// [AI] Soft-deleted rows are excluded from every read path in this service.
// Written once as a constant so a future query can't forget it and start
// leaking deleted rules back into matches.
const NOT_DELETED = { deletedAt: null } as const;

// [AI] Duck-typed P2002 check. The proper form is
// `err instanceof Prisma.PrismaClientKnownRequestError`, but that type lives in
// src/generated/prisma, which currently only contains User and Post —
// importing it here would be a hard compile error today. Swap this for the
// instanceof check once `prisma generate` has run against the real schema.
// -> MENTION TO TEAM: temporary shim, not the intended final form.
const isUniqueConstraintError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: unknown }).code === 'P2002';

// [AI] Number(model.id) is the one lossy conversion in this module:
// MatchableRule declares `id: number` (rule-matcher.service.ts owns that
// interface and does not import Prisma), while the column is a bigint per
// docs/erd.md. Safe in practice — the id only has to survive being echoed back
// in the match reason string, and a rules table reaching 2^53 rows is not a
// real scenario. Converting here rather than widening MatchableRule keeps the
// change contained to this file.
// -> MENTION TO TEAM: if MatchableRule.id is ever widened to bigint, this
//    function is the only thing that needs to change.
const toMatchableRule = (model: ClassificationRuleModel): MatchableRule => ({
  id: Number(model.id),
  keyword: model.keyword,
  targetClassification: model.targetClassification,
  priority: model.priority,
  weight: model.weight,
  createdAt: model.createdAt,
});

@Injectable()
export class ClassificationRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ruleMatcher: RuleMatcherService,
  ) {}

  // [AI] this.prisma.classificationRule — the delegate does not exist in the
  // generated client yet. Unlike the vendor-facing services, this one is NOT
  // blocked on Cường's vendors.prisma: classification_rules has no foreign
  // keys at all, so it becomes runnable as soon as `prisma generate` reruns.

  async create(
    dto: CreateClassificationRuleDto,
  ): Promise<ClassificationRuleEntity> {
    // [AI] The @@unique([keyword, targetClassification]) index counts
    // soft-deleted rows too — Postgres unique indexes don't know about
    // deletedAt. So re-adding a keyword that was previously soft-deleted would
    // hit P2002 forever with a plain create(). Reviving the existing row
    // instead keeps its id and createdAt, which matters because past
    // classification decisions reference that rule by id.
    const existing = (await this.prisma.classificationRule.findUnique({
      where: {
        keyword_targetClassification: {
          keyword: dto.keyword,
          targetClassification: dto.targetClassification,
        },
      },
    })) as ClassificationRuleModel | null;

    if (existing && existing.deletedAt === null) {
      throw new ConflictException(
        `A rule for keyword "${dto.keyword}" targeting ${dto.targetClassification} already exists`,
      );
    }

    if (existing) {
      const revived = (await this.prisma.classificationRule.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          description: dto.description ?? null,
          judgmentCriteria: dto.judgmentCriteria ?? null,
          priority: dto.priority ?? DEFAULT_PRIORITY,
          weight: dto.weight ?? DEFAULT_WEIGHT,
          isActive: dto.isActive ?? true,
        },
      })) as ClassificationRuleModel;

      return ClassificationRuleEntity.fromModel(revived);
    }

    const created = (await this.prisma.classificationRule.create({
      data: {
        targetClassification: dto.targetClassification,
        keyword: dto.keyword,
        description: dto.description ?? null,
        judgmentCriteria: dto.judgmentCriteria ?? null,
        // [AI] Defaults repeated here as well as in the schema. Prisma would
        // apply the @default() for an omitted key, so this is redundant — kept
        // explicit so the effective values are visible at the call site and
        // match what the revive branch above writes.
        priority: dto.priority ?? DEFAULT_PRIORITY,
        weight: dto.weight ?? DEFAULT_WEIGHT,
        isActive: dto.isActive ?? true,
      },
    })) as ClassificationRuleModel;

    return ClassificationRuleEntity.fromModel(created);
  }

  async findAll(
    query: QueryClassificationRulesDto,
  ): Promise<PaginatedResult<ClassificationRuleEntity>> {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;

    const where = {
      ...NOT_DELETED,
      targetClassification: query.targetClassification,
      // [AI] `undefined` when absent so Prisma drops the key — an explicit
      // `?isActive=false` still filters for inactive rules. Note this differs
      // from match() below, which hard-codes isActive: true.
      isActive: query.isActive,
      keyword: query.keyword ? { contains: query.keyword } : undefined,
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.classificationRule.count({ where }),
      this.prisma.classificationRule.findMany({
        where,
        // [AI] Listed in the same order RuleMatcherService.compareRules()
        // resolves ties (priority ASC, weight DESC, createdAt ASC, id ASC), so
        // the admin list reads top-down as "which rule wins first".
        orderBy: [
          { priority: 'asc' },
          { weight: 'desc' },
          { createdAt: 'asc' },
          { id: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: ClassificationRuleEntity.fromModels(
        rows as ClassificationRuleModel[],
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: bigint): Promise<ClassificationRuleEntity> {
    const rule = await this.findActiveOrThrow(id);

    return ClassificationRuleEntity.fromModel(rule);
  }

  async update(
    id: bigint,
    dto: UpdateClassificationRuleDto,
  ): Promise<ClassificationRuleEntity> {
    await this.findActiveOrThrow(id);

    try {
      const updated = (await this.prisma.classificationRule.update({
        where: { id },
        data: {
          // [AI] All `undefined` on omission — Prisma skips undefined keys, so
          // PATCH stays a partial update instead of nulling everything the
          // client didn't resend. Same caveat as UpdateVendorSourceDto: a
          // nullable field can't be cleared back to NULL through this route.
          targetClassification: dto.targetClassification,
          keyword: dto.keyword,
          description: dto.description,
          judgmentCriteria: dto.judgmentCriteria,
          priority: dto.priority,
          weight: dto.weight,
          isActive: dto.isActive,
        },
      })) as ClassificationRuleModel;

      return ClassificationRuleEntity.fromModel(updated);
    } catch (error) {
      // [AI] Editing keyword/targetClassification can collide with the unique
      // index, including against a SOFT-DELETED row the client can't even see.
      // Translated to 409 here; without this it surfaces as a bare 500,
      // because AllExceptionsFilter only special-cases HttpException.
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Another rule already uses this keyword and target classification',
        );
      }

      throw error;
    }
  }

  async remove(id: bigint): Promise<{ id: string; deleted: true }> {
    await this.findActiveOrThrow(id);

    // [AI] SOFT delete, unlike VendorSourcesService.remove()'s hard delete.
    // A rule that has already driven classification decisions is part of the
    // explanation for why a vendor is classified the way it is — dropping the
    // row would leave those decisions unexplainable. Reasoning, not spec text:
    // docs/erd.md has no deletedAt column at all (it is pre-existing in
    // classification-rules.prisma).
    await this.prisma.classificationRule.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    return { id: id.toString(), deleted: true };
  }

  // [AI] The bridge to the pre-existing, previously-unreachable
  // RuleMatcherService. Loads every live rule and delegates the actual
  // decision to it — the sorting/tie-break logic and its unit tests stay in
  // that file untouched.
  // -> KNOWN LIMITATION: loads the whole active rule set on every call. Fine
  //    for a demo-sized table; if the rule count ever grows, this wants a
  //    cache, because the set changes far less often than it is read.
  async match(text: string): Promise<RuleMatchResult> {
    const rules = (await this.prisma.classificationRule.findMany({
      where: { ...NOT_DELETED, isActive: true },
    })) as ClassificationRuleModel[];

    return this.ruleMatcher.match(rules.map(toMatchableRule), text);
  }

  // [AI] findFirst, not findUnique — findUnique cannot take a non-unique
  // field like deletedAt in its where clause. Soft-deleted rules read as 404
  // so a client can never observe, edit, or "un-delete" one by id; reviving
  // goes through create() instead.
  private async findActiveOrThrow(
    id: bigint,
  ): Promise<ClassificationRuleModel> {
    const rule = (await this.prisma.classificationRule.findFirst({
      where: { id, ...NOT_DELETED },
    })) as ClassificationRuleModel | null;

    if (!rule) {
      throw new NotFoundException(`Classification rule ${id} not found`);
    }

    return rule;
  }
}
