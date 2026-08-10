import { ApiProperty } from '@nestjs/swagger';

import { SourceType } from '../../generated/prisma/enums';

/**
 * Hình dạng dòng vendor_sources. Khai tại chỗ thay vì import từ Prisma Client
 * vì client chỉ được sinh sau khi model Vendor có mặt trong schema; đổi sang
 * type sinh tự động khi điều đó xảy ra.
 */
export interface VendorSourceModel {
  id: number;
  vendorId: number;
  sourceType: SourceType;
  sourceUrl: string | null;
  sourceTitle: string | null;
  checkedAt: Date | null;
  memo: string | null;
}

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
