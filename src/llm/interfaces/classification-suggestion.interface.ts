// src/llm/interfaces/classification-suggestion.interface.ts
//
// [AI] Converted from `interface` to `class` — NestJS Swagger needs a
// class with @ApiProperty decorators to introspect a response schema; a
// plain TypeScript interface produces no schema at runtime. Filename kept
// as-is to avoid an unrelated import-path churn across the module.
import { ApiProperty } from '@nestjs/swagger';
import { VendorClassification } from '../../generated/prisma/enums';

export class ClassificationSuggestion {
  @ApiProperty({ enum: VendorClassification })
  suggestedClassification!: VendorClassification;

  @ApiProperty({ enum: ['low', 'medium', 'high'] })
  confidence!: 'low' | 'medium' | 'high';

  @ApiProperty()
  reasoning!: string;

  @ApiProperty({ type: [String] })
  evidenceUsed!: string[];

  // [AI] Not requested from the LLM — appended server-side after parsing.
  // See docs/llm-prompt-spec.md §7 for the distinction.
  @ApiProperty()
  disclaimer!: string;
}
