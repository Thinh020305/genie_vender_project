import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNumberString,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { SummaryType } from '../../generated/prisma/enums';

export class CreateVendorSummaryDto {
  @ApiProperty({ example: '42', description: 'bigint id, sent as a string' })
  @Transform(({ value }) =>
    value === null || value === undefined ? value : String(value),
  )
  @IsNumberString({ no_symbols: true })
  vendorId!: string;

  @ApiProperty({ enum: SummaryType })
  @IsEnum(SummaryType, {
    message: `summaryType must be one of: ${Object.values(SummaryType).join(', ')}`,
  })
  summaryType!: SummaryType;

  // [AI] REQUIRED here even though the column is nullable in docs/erd.md. A
  // summary row with no content carries no information — the nullable column
  // exists only to stay faithful to the ERD. Enforcing it at the DTO is the
  // cheaper half of the fix.
  // -> MENTION TO TEAM: if the ERD's nullable `content` was deliberate (e.g. a
  //    placeholder row created before an LLM call fills it in), this should be
  //    @IsOptional() instead and the workflow documented.
  @ApiProperty({ minLength: 1, maxLength: 20000 })
  @IsString()
  @MinLength(1)
  // [AI] 20000 is an invented ceiling — @db.Text has no limit, but an
  // unbounded request body is an easy way to bloat the table. Roughly the
  // size of a long LLM summary.
  @MaxLength(20000)
  content!: string;

  // [AI] There is deliberately NO createdById field on this DTO. The author is
  // taken from the JWT via @CurrentUser('sub') in the controller — accepting
  // it from the body would let any caller attribute a summary to someone else.
}
