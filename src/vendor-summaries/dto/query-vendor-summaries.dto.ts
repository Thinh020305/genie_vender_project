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

export class QueryVendorSummariesDto {
  @ApiPropertyOptional({ enum: SummaryType })
  @IsOptional()
  @IsEnum(SummaryType)
  summaryType?: SummaryType;

  @ApiPropertyOptional({ example: '7' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : value,
  )
  @IsNumberString({ no_symbols: true })
  createdById?: string;

  // @Type cần cho query param: query string luôn về dạng chuỗi.
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
