import { ApiProperty } from '@nestjs/swagger';

import { SummaryType } from '../../generated/prisma/enums';

// [AI] Hand-written mirror of the VendorSummary model in
// prisma/schema/vendor-summaries.prisma — same reason as
// vendor-sources/entities/vendor-source.entity.ts: the generated client only
// contains User and Post today, so the real type cannot be imported yet.
// Replace with the generated type once vendors.prisma + members.prisma land.
export interface VendorSummaryModel {
  id: bigint;
  vendorId: bigint;
  summaryType: SummaryType;
  content: string | null;
  createdById: bigint;
  createdAt: Date;
}

// [AI] Optional author block, populated only when the caller asked for it
// (findAll/findOne use a Prisma `include`). Typed separately so the entity can
// represent both the plain row and the joined row.
export interface VendorSummaryAuthorModel {
  id: bigint;
  name: string;
  email: string;
}

export class VendorSummaryAuthorEntity {
  @ApiProperty({ example: '7' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;
}

// [AI] bigint ids serialized as strings — see the long note in
// vendor-source.entity.ts for why (JSON.stringify throws on bigint, and
// numbers lose precision past 2^53).
export class VendorSummaryEntity {
  @ApiProperty({ example: '1', description: 'bigint id serialized as string' })
  id!: string;

  @ApiProperty({ example: '42', description: 'bigint id serialized as string' })
  vendorId!: string;

  @ApiProperty({ enum: SummaryType })
  summaryType!: SummaryType;

  @ApiProperty({ nullable: true, type: String })
  content!: string | null;

  @ApiProperty({ example: '7', description: 'bigint id serialized as string' })
  createdById!: string;

  @ApiProperty({ required: false, type: VendorSummaryAuthorEntity })
  createdBy?: VendorSummaryAuthorEntity;

  @ApiProperty()
  createdAt!: Date;

  static fromModel(
    model: VendorSummaryModel & { createdBy?: VendorSummaryAuthorModel },
  ): VendorSummaryEntity {
    const entity = new VendorSummaryEntity();

    entity.id = model.id.toString();
    entity.vendorId = model.vendorId.toString();
    entity.summaryType = model.summaryType;
    entity.content = model.content;
    entity.createdById = model.createdById.toString();
    entity.createdAt = model.createdAt;

    if (model.createdBy) {
      // [AI] Only id/name/email are surfaced. Member.password must never
      // reach a response, so the service pins an explicit `select` on the
      // include rather than pulling the whole member row — this mapper is the
      // second line of defence, not the first.
      entity.createdBy = {
        id: model.createdBy.id.toString(),
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
