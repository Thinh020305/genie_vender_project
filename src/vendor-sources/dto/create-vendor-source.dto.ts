import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

import { SourceType } from '../../generated/prisma/enums';

/**
 * Không có trường vendorId: Source API lồng dưới vendor nên vendor lấy từ
 * đường dẫn. Nhận thêm ở body sẽ cho phép một request mà path và body mâu thuẫn.
 */
export class CreateVendorSourceDto {
  @ApiProperty({ enum: SourceType })
  @IsEnum(SourceType, {
    message: `sourceType must be one of: ${Object.values(SourceType).join(', ')}`,
  })
  sourceType!: SourceType;

  /**
   * Tuỳ chọn ở mức từng trường. Ràng buộc "phải có URL hoặc ghi chú demo" là
   * điều kiện liên trường nên được kiểm trong VendorSourcesService — nơi cùng
   * một phép kiểm còn áp được cho PATCH, vốn phải xét dòng sau khi gộp chứ
   * không phải body.
   *
   * require_protocol để loại "example.com": một URL nguồn không mở được thì
   * mất luôn ý nghĩa của bảng.
   */
  @ApiPropertyOptional({
    maxLength: 2048,
    example: 'https://example.com/about',
  })
  @IsOptional()
  @IsUrl(
    { require_protocol: true },
    {
      message:
        'sourceUrl must be an absolute URL including http:// or https://',
    },
  )
  @MaxLength(2048)
  sourceUrl?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourceTitle?: string;

  /** Chuỗi ISO-8601, service chuyển sang Date. Để trống nghĩa là chưa đối chiếu. */
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString({}, { message: 'checkedAt must be an ISO-8601 date string' })
  checkedAt?: string;

  /** Nơi đặt lời khai dữ liệu demo khi không có URL công khai. */
  @ApiPropertyOptional({
    maxLength: 1000,
    example:
      'demo data — no public source available for this educational record',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  memo?: string;
}
