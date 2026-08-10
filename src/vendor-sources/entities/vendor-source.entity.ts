import { ApiProperty } from '@nestjs/swagger';

import { SourceType } from '../../generated/prisma/enums';

// [AI] Hand-written mirror of the VendorSource model in
// prisma/schema/vendor-sources.prisma. NOT imported from
// src/generated/prisma — that client currently only generates User and Post,
// so importing a VendorSource type from it is a hard "no exported member"
// error today, whereas this local shape lets the entity + DTO layer compile
// standalone. Delete this interface and import the generated type once
// vendors.prisma lands and `prisma generate` reruns.
// -> MENTION TO TEAM: this must be kept in sync with the .prisma file by hand
//    until then.
export interface VendorSourceModel {
  id: number;
  vendorId: number;
  sourceType: SourceType;
  sourceUrl: string | null;
  sourceTitle: string | null;
  checkedAt: Date | null;
  memo: string | null;
}

// [AI] ids are plain JSON numbers. An earlier version serialized them as
// strings because the columns were BigInt and JSON.stringify() throws on a raw
// bigint. Now that the ids are Int — matching Vendor.id and Member.id — that
// problem disappears, along with the string/number inconsistency it created
// against RuleMatcherService, which has always typed its rule id as `number`.
export class VendorSourceEntity {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 42 })
  vendorId!: number;

  @ApiProperty({ enum: SourceType })
  sourceType!: SourceType;

  @ApiProperty({ nullable: true, type: String })
  sourceUrl!: string | null;

  @ApiProperty({ nullable: true, type: String })
  sourceTitle!: string | null;

  @ApiProperty({ nullable: true, type: Date })
  checkedAt!: Date | null;

  @ApiProperty({ nullable: true, type: String })
  memo!: string | null;

  static fromModel(model: VendorSourceModel): VendorSourceEntity {
    const entity = new VendorSourceEntity();

    entity.id = model.id;
    entity.vendorId = model.vendorId;
    entity.sourceType = model.sourceType;
    entity.sourceUrl = model.sourceUrl;
    entity.sourceTitle = model.sourceTitle;
    entity.checkedAt = model.checkedAt;
    entity.memo = model.memo;

    return entity;
  }

  static fromModels(models: VendorSourceModel[]): VendorSourceEntity[] {
    return models.map((model) => VendorSourceEntity.fromModel(model));
  }
}
