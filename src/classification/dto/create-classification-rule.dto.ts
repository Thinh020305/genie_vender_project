import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ enum: VendorClassification })
  @IsEnum(VendorClassification, {
    message: `classificationName must be one of: ${Object.values(VendorClassification).join(', ')}`,
  })
  classificationName!: VendorClassification;

  @ApiPropertyOptional({
    maxLength: 500,
    example: 'software outsourcing or project-based development vendor',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  judgmentCriteria?: string;

  // Hạ chữ thường và khử trùng lặp vì RuleMatcherService so sánh sau khi hạ
  // chữ thường cả hai vế; chuỗi rỗng bị loại vì nó khớp mọi văn bản.
  @ApiPropertyOptional({
    type: [String],
    example: ['outsourcing', 'staff augmentation', 'offshore development'],
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (!Array.isArray(value)) {
      return value;
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

  @ApiPropertyOptional({ minimum: 0, maximum: 1000, default: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  priority?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 1000, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  weight?: number;
}
