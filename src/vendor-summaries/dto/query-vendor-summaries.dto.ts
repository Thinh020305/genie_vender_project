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

// [AI] No vendorId filter — the route is GET /api/vendors/{id}/summaries, so
// the vendor is always the path param. createdById stays, because "show me the
// notes X wrote about this vendor" is a real review question and the ERD gives
// the column an index.
export class QueryVendorSummariesDto {
  @ApiPropertyOptional({ enum: SummaryType })
  @IsOptional()
  @IsEnum(SummaryType)
  summaryType?: SummaryType;

  // [AI] Accepted as a string because Member.id is a bigint per the ERD. The
  // @Transform coerces a numeric query value first so both ?createdById=7 and
  // ?createdById="7" work.
  @ApiPropertyOptional({ example: '7', description: 'filter by author' })
  @IsOptional()
  // [AI] Return type pinned explicitly: TransformFnParams types `value` as
  // `any`, so returning it unannotated leaks an `any` into the DTO and trips
  // @typescript-eslint/no-unsafe-return. null/undefined pass through so
  // @IsOptional still sees "absent" rather than the string "null".
  @Transform(({ value }): string | null | undefined =>
    value === null || value === undefined
      ? (value as null | undefined)
      : String(value),
  )
  @IsNumberString({ no_symbols: true })
  createdById?: string;

  // [AI] @Type(() => Number) is needed on query params but not on body fields:
  // query strings always arrive as strings, so without it @IsInt rejects
  // "?page=2". Only works if main.ts enables ValidationPipe({ transform: true }).
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
