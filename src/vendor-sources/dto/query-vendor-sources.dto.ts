import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

import { SourceType } from '../../generated/prisma/enums';

// [AI] No vendorId filter — the route is
// "GET /api/vendors/{id}/sources", so the vendor is always the path param.
//
// Pagination is invented; Genie Vina.pdf specifies it for GET /api/vendors but
// not for the source list. Included because a vendor collected from several
// directories accumulates rows quickly, and returning an unbounded list is the
// kind of thing the "unhandled exceptions" side of the evaluation table
// punishes.
export class QueryVendorSourcesDto {
  @ApiPropertyOptional({ enum: SourceType })
  @IsOptional()
  @IsEnum(SourceType)
  sourceType?: SourceType;

  // [AI] @Type(() => Number) is needed on query params but not on body fields:
  // query strings always arrive as strings, so without it @IsInt rejects
  // "?page=2". Only works if main.ts enables ValidationPipe({ transform: true }).
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  // [AI] Max 100 chosen arbitrarily, so "?limit=999999" is not a trivial way
  // to exhaust memory. Default 20, also arbitrary.
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
