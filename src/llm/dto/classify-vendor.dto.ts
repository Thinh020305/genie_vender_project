import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class ClassifyVendorDto {
  // POST /api/vendors/classify has no :id param in the spec's endpoint table
  // unlike PATCH /vendors/{id}/classification.
  // Decision made here: accept vendorId in the request BODY, look the
  // vendor up from the DB, and build the prompt from its stored fields.
  // Alternative: accept the raw fields (companyName, techStack, etc.)
  // directly in the body with no DB lookup
  // at all, for vendors not yet registered. Chose the DB-lookup version
  // because it ties cleanly into the "pre-fill reason on PATCH /classification"
  // flow — but this is a real design fork, not spec text.
  // -> MENTION TO TEAM
  @ApiProperty({ type: Number, minimum: 1, example: 1 })
  @IsInt()
  @Min(1)
  vendorId!: number;
}
