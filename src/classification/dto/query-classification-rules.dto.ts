import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { VendorClassification } from '../../generated/prisma/enums';

export class QueryClassificationRulesDto {
  @ApiPropertyOptional({ enum: VendorClassification })
  @IsOptional()
  @IsEnum(VendorClassification)
  targetClassification?: VendorClassification;

  @ApiPropertyOptional({ description: 'substring match against keyword' })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MaxLength(100)
  keyword?: string;

  // [AI] Query params arrive as the strings "true"/"false", which @IsBoolean
  // would reject, so the transform maps them first. Anything else is left
  // untouched so validation still reports it as invalid rather than silently
  // coercing to false.
  @ApiPropertyOptional({ description: 'defaults to active rules only' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

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
