import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

import { SourceType } from '../../generated/prisma/enums';

/** Không có bộ lọc vendorId vì vendor luôn là tham số đường dẫn. */
export class QueryVendorSourcesDto {
  @ApiPropertyOptional({ enum: SourceType })
  @IsOptional()
  @IsEnum(SourceType)
  sourceType?: SourceType;

  /**
   * @Type(() => Number) cần cho tham số query nhưng không cần cho body: query
   * string luôn về dưới dạng chuỗi, thiếu nó thì @IsInt sẽ từ chối "?page=2".
   * Chỉ hoạt động khi main.ts bật ValidationPipe({ transform: true }).
   */
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  /** Trần 100 để "?limit=999999" không trở thành cách làm cạn bộ nhớ. */
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
