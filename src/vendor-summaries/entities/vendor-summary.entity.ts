import { ApiProperty } from '@nestjs/swagger';

import { SummaryType } from '../../generated/prisma/enums';

/**
 * Hình dạng dòng vendor_summaries. Khai tại chỗ thay vì import từ Prisma
 * Client vì client chỉ được sinh sau khi Vendor và Member có mặt trong schema.
 */
export interface VendorSummaryModel {
  id: number;
  vendorId: number;
  summaryType: SummaryType;
  content: string | null;
  createdById: number;
  createdAt: Date;
}

/** Khối tác giả, chỉ có khi truy vấn dùng `include`. */
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
      // Chỉ lộ id/name/email. Service đã ghim `select` tường minh ở tầng truy
      // vấn; chỗ này là lớp phòng thủ thứ hai cho Member.password.
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
