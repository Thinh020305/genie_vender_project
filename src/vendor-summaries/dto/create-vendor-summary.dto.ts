import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

import { SummaryType } from '../../generated/prisma/enums';

// Không có vendorId (lấy từ đường dẫn) và không có createdById (lấy từ JWT).
export class CreateVendorSummaryDto {
  @ApiProperty({ enum: SummaryType })
  @IsEnum(SummaryType, {
    message: `summaryType must be one of: ${Object.values(SummaryType).join(', ')}`,
  })
  summaryType!: SummaryType;

  // Bắt buộc dù cột cho phép NULL.
  @ApiProperty({ minLength: 1, maxLength: 20000 })
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  content!: string;
}
