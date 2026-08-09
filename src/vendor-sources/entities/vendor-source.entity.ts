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
  id: bigint;
  vendorId: bigint;
  sourceType: SourceType;
  sourceUrl: string | null;
  sourceTitle: string | null;
  checkedAt: Date | null;
  memo: string | null;
}

// [AI] ids are exposed as STRINGS, not numbers. Two reasons, neither of them
// spec text:
//   1. JSON.stringify() throws "Do not know how to serialize a BigInt" on a
//      raw bigint, so returning the Prisma row directly would 500 every
//      response once vendor ids are bigints.
//   2. bigint exceeds JS Number.MAX_SAFE_INTEGER, so JSON numbers would
//      silently round on the client at large values.
// -> MENTION TO TEAM: every module that touches a bigint id needs this same
//    treatment. The alternative is one global BigInt.prototype.toJSON patch
//    in main.ts, which is less code but mutates a global builtin.
export class VendorSourceEntity {
  @ApiProperty({ example: '1', description: 'bigint id serialized as string' })
  id!: string;

  @ApiProperty({ example: '42', description: 'bigint id serialized as string' })
  vendorId!: string;

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

    entity.id = model.id.toString();
    entity.vendorId = model.vendorId.toString();
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
