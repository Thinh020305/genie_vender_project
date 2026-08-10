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

// Không có vendorId: route lồng dưới vendor nên vendor lấy từ đường dẫn.
export class CreateVendorSourceDto {
  @ApiProperty({ enum: SourceType })
  @IsEnum(SourceType, {
    message: `sourceType must be one of: ${Object.values(SourceType).join(', ')}`,
  })
  sourceType!: SourceType;

  // Tuỳ chọn ở mức từng trường; ràng buộc "URL hoặc ghi chú demo" là điều kiện
  // liên trường nên kiểm ở service.
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

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString({}, { message: 'checkedAt must be an ISO-8601 date string' })
  checkedAt?: string;

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
