import { ApiProperty } from '@nestjs/swagger';

import { VendorClassification } from '../../generated/prisma/enums';

// Khai tại chỗ thay vì import từ Prisma Client: client chưa sinh được.
export interface ClassificationRuleModel {
  id: number;
  classificationName: VendorClassification;
  description: string | null;
  judgmentCriteria: string | null;
  keywords: string[];
  priority: number;
  weight: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ClassificationRuleEntity {
  @ApiProperty({ example: 1 })
  id!: number;

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

  @ApiProperty()
  priority!: number;

  @ApiProperty()
  weight!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromModel(model: ClassificationRuleModel): ClassificationRuleEntity {
    const entity = new ClassificationRuleEntity();

    entity.id = model.id;
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
