import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { VendorClassification } from '../../generated/prisma/enums';

export class CreateClassificationRuleDto {
  // [AI] docs/erd.md's "classificationName". Enum-typed — see the header note
  // in prisma/schema/classification-rules.prisma.
  @ApiProperty({ enum: VendorClassification })
  @IsEnum(VendorClassification, {
    message: `targetClassification must be one of: ${Object.values(VendorClassification).join(', ')}`,
  })
  targetClassification!: VendorClassification;

  // [AI] Trimmed and lowercased on the way in. RuleMatcherService.match()
  // already lowercases both sides before comparing, so storing a mixed-case
  // keyword changes nothing at match time — but it DOES change the
  // @@unique([keyword, targetClassification]) constraint, which is
  // case-SENSITIVE in Postgres. Without normalising here, "Fintech" and
  // "fintech" are two separate rows that behave identically at runtime.
  // Not spec text; this is a bug-avoidance decision.
  @ApiProperty({ minLength: 2, maxLength: 100, example: 'outsourcing' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MinLength(2, {
    message:
      'keyword must be at least 2 characters: single-character keywords match nearly every vendor',
  })
  @MaxLength(100)
  keyword!: string;

  // [AI] docs/erd.md "description".
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  // [AI] docs/erd.md "judgmentCriteria" — prose for reviewers. `keyword` is
  // what actually executes; nothing keeps the two in agreement.
  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  judgmentCriteria?: string;

  // [AI] Bounds 0..1000 are invented. They exist mainly so a typo can't push a
  // rule so far out of range that the tie-break ordering in
  // RuleMatcherService.compareRules() becomes meaningless.
  @ApiPropertyOptional({
    minimum: 0,
    maximum: 1000,
    default: 100,
    description: 'lower wins when several rules match',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  priority?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 1000,
    default: 1,
    description: 'higher wins when priority ties',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  weight?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
