import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

import { SummaryType } from '../../generated/prisma/enums';

/**
 * Không có trường vendorId: route lồng dưới vendor nên vendor lấy từ đường dẫn.
 * Cũng không có createdById — tác giả lấy từ JWT ở controller, nhận từ body sẽ
 * cho phép bất kỳ ai gán bản tóm tắt cho người khác.
 */
export class CreateVendorSummaryDto {
  @ApiProperty({ enum: SummaryType })
  @IsEnum(SummaryType, {
    message: `summaryType must be one of: ${Object.values(SummaryType).join(', ')}`,
  })
  summaryType!: SummaryType;

  /**
   * Bắt buộc ở tầng DTO dù cột cho phép NULL: một bản tóm tắt rỗng không mang
   * thông tin gì. Trần 20000 ký tự để một request không phình bảng dữ liệu.
   */
  @ApiProperty({ minLength: 1, maxLength: 20000 })
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  content!: string;
}
