import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
// [AI] @nestjs/swagger, class-validator and class-transformer are still NOT in
// package.json — a repo-wide blocker predating these files (see
// dto/update-classification.dto.ts). Genie Vina.pdf Step 2 makes Swagger
// MANDATORY ("Swagger (OpenAPI) documentation is mandatory for all
// endpoints"), so the package is required, not optional:
//     npm install @nestjs/swagger class-validator class-transformer
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
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
  // [AI] The ERD's "classificationName". Unique per row — this table is the
  // five-criterion catalog from the PDF, not a keyword list. Creating a second
  // rule for a classification that already has one returns 409.
  @ApiProperty({ enum: VendorClassification })
  @IsEnum(VendorClassification, {
    message: `classificationName must be one of: ${Object.values(VendorClassification).join(', ')}`,
  })
  classificationName!: VendorClassification;

  // [AI] Genie Vina.pdf's one-line criterion text, e.g. for OUTSOURCING_VENDOR:
  // "software outsourcing or project-based development vendor".
  @ApiPropertyOptional({
    maxLength: 500,
    example: 'software outsourcing or project-based development vendor',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  // [AI] Backs Step 3.4 ("Classification must be based on visible evidence
  // such as service description, technology stack, industry experience, and
  // company profile") — this is the field a reviewer cites when explaining why
  // a vendor was classified a given way.
  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  judgmentCriteria?: string;

  // [AI] Trimmed, lowercased and de-duplicated on the way in.
  // RuleMatcherService.match() lowercases both sides before comparing, so
  // storing mixed case would create keywords that differ in the DB but behave
  // identically at match time. Empty strings are dropped rather than stored —
  // an empty keyword is a substring of every text and would match everything.
  @ApiPropertyOptional({
    type: [String],
    example: ['outsourcing', 'staff augmentation', 'offshore development'],
  })
  @IsOptional()
  // [AI] Return type pinned to `unknown` and the input read as `unknown[]`:
  // TransformFnParams types `value` as `any`, so returning it unannotated
  // leaks an `any` into the DTO and trips @typescript-eslint/no-unsafe-return.
  // A non-array value is passed through untouched so @IsArray reports it,
  // rather than being silently coerced here into something that validates.
  @Transform(({ value }): unknown => {
    if (!Array.isArray(value)) {
      return value as unknown;
    }

    const normalized = (value as unknown[])
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0);

    return [...new Set(normalized)];
  })
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MinLength(2, {
    each: true,
    message:
      'each keyword must be at least 2 characters: a 1-character keyword matches nearly every vendor',
  })
  @MaxLength(100, { each: true })
  keywords?: string[];

  // [AI] Bounds 0..1000 are invented — they exist so a typo can't push a rule
  // so far out of range that RuleMatcherService's tie-break ordering stops
  // meaning anything.
  @ApiPropertyOptional({
    minimum: 0,
    maximum: 1000,
    default: 100,
    description: 'lower wins when a vendor matches two criteria',
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
}
