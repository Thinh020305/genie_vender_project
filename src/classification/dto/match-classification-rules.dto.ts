import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

// [AI] Body for the rule-preview endpoint. This exists because
// rule-matcher.service.ts is currently orphaned — it is fully written and
// unit-tested but not registered in any module, so nothing can call it. This
// DTO plus POST /api/classification-rules/match gives it an entry point
// without touching that file.
// -> MENTION TO TEAM: this endpoint only PREVIEWS a match. It never writes to
//    vendor.classification or classification_histories — applying a result
//    stays a deliberate PATCH /api/vendors/{id}/classification, same
//    separation the LLM suggest endpoint already keeps.
export class MatchClassificationRulesDto {
  @ApiProperty({
    minLength: 2,
    maxLength: 20000,
    description:
      'free text to match rules against, e.g. a vendor profile or company description',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(20000)
  text!: string;
}
