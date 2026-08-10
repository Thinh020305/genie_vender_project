import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

import { SummaryType } from '../../generated/prisma/enums';

/** Không có bộ lọc vendorId vì vendor luôn là tham số đường dẫn. */
export class QueryVendorSummariesDto {
  @ApiPropertyOptional({ enum: SummaryType })
  @IsOptional()
  @IsEnum(SummaryType)
  summaryType?: SummaryType;

  @ApiPropertyOptional({ example: '7', description: 'lọc theo tác giả' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : value,
  )
  @IsNumberString({ no_symbols: true })
  createdById?: string;

  /**
   * @Type(() => Number) cần cho tham số query: query string luôn về dưới dạng
   * chuỗi. Chỉ hoạt động khi main.ts bật ValidationPipe({ transform: true }).
   */
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
