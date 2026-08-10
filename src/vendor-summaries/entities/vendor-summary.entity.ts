import { ApiProperty } from '@nestjs/swagger';

import { SummaryType } from '../../generated/prisma/enums';

// [AI] Hand-written mirror of the VendorSummary model in
// prisma/schema/vendor-summaries.prisma — same reason as
// vendor-sources/entities/vendor-source.entity.ts: the generated client only
// contains User and Post today, so the real type cannot be imported yet.
// Replace with the generated type once vendors.prisma + members.prisma land.
export interface VendorSummaryModel {
  id: number;
  vendorId: number;
  summaryType: SummaryType;
  content: string | null;
  createdById: number;
  createdAt: Date;
}

// [AI] Optional author block, populated only when the caller asked for it
// (findAll/findOne use a Prisma `include`). Typed separately so the entity can
// represent both the plain row and the joined row.
export interface VendorSummaryAuthorModel {
  id: number;
  name: string;
  email: string;
}

export class VendorSummaryAuthorEntity {
  @ApiProperty({ example: 7 })
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;
}

// [AI] ids are plain JSON numbers now that the columns are Int — see the note
// in vendor-source.entity.ts.
export class VendorSummaryEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 42 })
  vendorId!: number;

  @ApiProperty({ enum: SummaryType })
  summaryType!: SummaryType;

  @ApiProperty({ nullable: true, type: String })
  content!: string | null;

  @ApiProperty({ example: 7 })
  createdById!: number;

  @ApiProperty({ required: false, type: VendorSummaryAuthorEntity })
  createdBy?: VendorSummaryAuthorEntity;

  @ApiProperty()
  createdAt!: Date;

  static fromModel(
    model: VendorSummaryModel & { createdBy?: VendorSummaryAuthorModel },
  ): VendorSummaryEntity {
    const entity = new VendorSummaryEntity();

    entity.id = model.id;
    entity.vendorId = model.vendorId;
    entity.summaryType = model.summaryType;
    entity.content = model.content;
    entity.createdById = model.createdById;
    entity.createdAt = model.createdAt;

    if (model.createdBy) {
      // [AI] Only id/name/email are surfaced. Member.password must never
      // reach a response, so the service pins an explicit `select` on the
      // include rather than pulling the whole member row — this mapper is the
      // second line of defence, not the first.
      entity.createdBy = {
        id: model.createdBy.id,
        name: model.createdBy.name,
        email: model.createdBy.email,
      };
    }

    return entity;
  }

  static fromModels(
    models: (VendorSummaryModel & { createdBy?: VendorSummaryAuthorModel })[],
  ): VendorSummaryEntity[] {
    return models.map((model) => VendorSummaryEntity.fromModel(model));
  }
}
