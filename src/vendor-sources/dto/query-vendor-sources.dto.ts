import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

import { SourceType } from '../../generated/prisma/enums';

export class QueryVendorSourcesDto {
  @ApiPropertyOptional({ enum: SourceType })
  @IsOptional()
  @IsEnum(SourceType)
  sourceType?: SourceType;

  // @Type cần cho query param: query string luôn về dạng chuỗi.
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
