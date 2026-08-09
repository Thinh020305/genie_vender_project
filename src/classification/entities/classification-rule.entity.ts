import { ApiProperty } from '@nestjs/swagger';

import { VendorClassification } from '../../generated/prisma/enums';

// [AI] Hand-written mirror of the ClassificationRule model in
// prisma/schema/classification-rules.prisma — the generated client only
// contains User and Post today, so the real type cannot be imported yet.
export interface ClassificationRuleModel {
  id: bigint;
  targetClassification: VendorClassification;
  keyword: string;
  description: string | null;
  judgmentCriteria: string | null;
  priority: number;
  weight: number;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// [AI] bigint id serialized as a string — see the note in
// vendor-sources/entities/vendor-source.entity.ts.
export class ClassificationRuleEntity {
  @ApiProperty({ example: '1', description: 'bigint id serialized as string' })
  id!: string;

  // [AI] Exposed as `targetClassification`, matching the column. docs/erd.md
  // calls this field "classificationName" — see the header comment in
  // classification-rules.prisma for why it is enum-typed instead of a varchar
  // name. Renaming the JSON key to `classificationName` was rejected: having
  // the API and the schema disagree on the field name is worse than the API
  // disagreeing with the ERD's draft wording.
  // -> MENTION TO TEAM if the ERD's naming is the one that must win.
  @ApiProperty({ enum: VendorClassification })
  targetClassification!: VendorClassification;

  @ApiProperty()
  keyword!: string;

  @ApiProperty({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty({ nullable: true, type: String })
  judgmentCriteria!: string | null;

  @ApiProperty({ description: 'lower wins when several rules match' })
  priority!: number;

  @ApiProperty({ description: 'higher wins when priority ties' })
  weight!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  // [AI] deletedAt is intentionally NOT exposed. Soft-deleted rules are
  // filtered out of every read path, so a client can never receive a row where
  // it would be non-null anyway.

  static fromModel(model: ClassificationRuleModel): ClassificationRuleEntity {
    const entity = new ClassificationRuleEntity();

    entity.id = model.id.toString();
    entity.targetClassification = model.targetClassification;
    entity.keyword = model.keyword;
    entity.description = model.description;
    entity.judgmentCriteria = model.judgmentCriteria;
    entity.priority = model.priority;
    entity.weight = model.weight;
    entity.isActive = model.isActive;
    entity.createdAt = model.createdAt;
    entity.updatedAt = model.updatedAt;

    return entity;
  }

  static fromModels(
    models: ClassificationRuleModel[],
  ): ClassificationRuleEntity[] {
    return models.map((model) => ClassificationRuleEntity.fromModel(model));
  }
}
