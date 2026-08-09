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

// [AI] Pagination + filtering invented, same as QueryVendorSourcesDto —
// docs/erd.md describes tables only. See that file for why @Type(() => Number)
// is needed on query params but not on body fields.
export class QueryVendorSummariesDto {
  @ApiPropertyOptional({ example: '42', description: 'filter by vendor' })
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === undefined ? value : String(value),
  )
  @IsNumberString({ no_symbols: true })
  vendorId?: string;

  @ApiPropertyOptional({ enum: SummaryType })
  @IsOptional()
  @IsEnum(SummaryType)
  summaryType?: SummaryType;

  @ApiPropertyOptional({ example: '7', description: 'filter by author' })
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === undefined ? value : String(value),
  )
  @IsNumberString({ no_symbols: true })
  createdById?: string;

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
