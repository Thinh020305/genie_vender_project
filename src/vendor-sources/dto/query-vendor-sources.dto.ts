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

import { SourceType } from '../../generated/prisma/enums';

// [AI] Pagination + filtering are entirely invented — docs/erd.md defines
// tables, not endpoints. Included because a flat "return every source row"
// list endpoint degrades badly once demo data is seeded.
export class QueryVendorSourcesDto {
  @ApiPropertyOptional({ example: '42', description: 'filter by vendor' })
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === undefined ? value : String(value),
  )
  @IsNumberString({ no_symbols: true })
  vendorId?: string;

  @ApiPropertyOptional({ enum: SourceType })
  @IsOptional()
  @IsEnum(SourceType)
  sourceType?: SourceType;

  // [AI] @Type(() => Number) is required here and NOT on the body DTOs: query
  // strings always arrive as strings, so without the transform @IsInt would
  // reject "?page=2". This only works if main.ts enables
  // `new ValidationPipe({ transform: true })` — see the note in
  // create-vendor-source.dto.ts.
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  // [AI] Max 100 chosen arbitrarily to stop `?limit=999999` from being a
  // trivial way to exhaust memory. Default 20, also arbitrary.
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
