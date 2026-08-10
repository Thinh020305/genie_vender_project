import { ApiProperty } from '@nestjs/swagger';

import { VendorClassification } from '../../generated/prisma/enums';

// [AI] Hand-written mirror of the ClassificationRule model in
// prisma/schema/classification-rules.prisma. NOT imported from
// src/generated/prisma — that client currently only generates User and Post,
// so importing the real type is a hard "no exported member" error today.
// Delete this and import the generated type once `prisma generate` reruns.
export interface ClassificationRuleModel {
  id: bigint;
  classificationName: VendorClassification;
  description: string | null;
  judgmentCriteria: string | null;
  keywords: string[];
  priority: number;
  weight: number;
  createdAt: Date;
  updatedAt: Date;
}

// [AI] bigint id serialized as a string — JSON.stringify() throws on a raw
// bigint, and JSON numbers lose precision past 2^53. See the fuller note in
// vendor-sources/entities/vendor-source.entity.ts.
export class ClassificationRuleEntity {
  @ApiProperty({ example: '1', description: 'bigint id serialized as string' })
  id!: string;

  @ApiProperty({ enum: VendorClassification })
  classificationName!: VendorClassification;

  @ApiProperty({
    nullable: true,
    type: String,
    example: 'software outsourcing or project-based development vendor',
  })
  description!: string | null;

  @ApiProperty({ nullable: true, type: String })
  judgmentCriteria!: string | null;

  @ApiProperty({ type: [String] })
  keywords!: string[];

  @ApiProperty({ description: 'lower wins when a vendor matches two criteria' })
  priority!: number;

  @ApiProperty({ description: 'higher wins when priority ties' })
  weight!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromModel(model: ClassificationRuleModel): ClassificationRuleEntity {
    const entity = new ClassificationRuleEntity();

    entity.id = model.id.toString();
    entity.classificationName = model.classificationName;
    entity.description = model.description;
    entity.judgmentCriteria = model.judgmentCriteria;
    entity.keywords = model.keywords;
    entity.priority = model.priority;
    entity.weight = model.weight;
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
