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
  /** Duy nhất theo phân loại — tạo tiêu chí thứ hai cho cùng phân loại trả 409. */
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

  /** Diễn giải bằng lời — thứ reviewer trích dẫn khi giải thích kết quả phân loại. */
  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  judgmentCriteria?: string;

  /**
   * Cắt khoảng trắng, hạ chữ thường và khử trùng lặp khi nhận vào.
   * RuleMatcherService hạ chữ thường cả hai vế trước khi so, nên lưu chữ hoa
   * chỉ tạo ra các từ khoá khác nhau trong DB mà hành xử y hệt lúc khớp. Chuỗi
   * rỗng bị loại vì nó là chuỗi con của mọi văn bản và sẽ khớp tất cả.
   */
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

  /**
   * Chặn trên/dưới để một lỗi gõ nhầm không đẩy tiêu chí ra xa tới mức thứ tự
   * phá hoà của RuleMatcherService mất ý nghĩa.
   */
  @ApiPropertyOptional({
    minimum: 0,
    maximum: 1000,
    default: 100,
    description: 'nhỏ hơn thì thắng khi vendor khớp nhiều tiêu chí',
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
    description: 'lớn hơn thì thắng khi priority bằng nhau',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  weight?: number;
}
