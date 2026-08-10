import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

import { SummaryType } from '../../generated/prisma/enums';

// [AI] No vendorId field — the vendor comes from the path
// (POST /api/vendors/{id}/summaries), matching how Genie Vina.pdf nests the
// Source API. Accepting it in the body too would allow a request whose path and
// body disagree.
export class CreateVendorSummaryDto {
  @ApiProperty({ enum: SummaryType })
  @IsEnum(SummaryType, {
    message: `summaryType must be one of: ${Object.values(SummaryType).join(', ')}`,
  })
  summaryType!: SummaryType;

  // [AI] REQUIRED here even though the column is nullable in the ERD. A summary
  // row with no content carries no information; the nullable column exists only
  // to stay faithful to the ERD's `content text` (which, unlike the columns
  // next to it, carries no [not null] marker).
  // -> MENTION TO TEAM: if the nullable content was deliberate (e.g. a
  //    placeholder row created before an LLM call fills it in), this should be
  //    @IsOptional() instead and the workflow documented.
  @ApiProperty({ minLength: 1, maxLength: 20000 })
  @IsString()
  @MinLength(1)
  // [AI] 20000 is an invented ceiling — @db.Text has no limit, but an unbounded
  // request body is an easy way to bloat the table. Roughly the size of a long
  // LLM summary; the PDF's own summary feature asks for "1-2 line" output.
  @MaxLength(20000)
  content!: string;

  // [AI] There is deliberately NO createdById field. The author is taken from
  // the JWT via @CurrentUser() in the controller — accepting it from the body
  // would let any caller attribute a summary to someone else, and createdBy is
  // the field that makes Step 3.7's "final classification must be reviewed by
  // the team" traceable to a person.
}
