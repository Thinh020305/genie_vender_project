import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Body cho route xem trước kết quả khớp tiêu chí. Route chỉ trả về tiêu chí
 * nào khớp và vì sao; nó không ghi vendor.classification hay lịch sử phân loại.
 */
export class MatchClassificationRulesDto {
  @ApiProperty({
    minLength: 2,
    maxLength: 20000,
    description: 'đoạn văn bản cần khớp, ví dụ hồ sơ vendor hoặc mô tả công ty',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(20000)
  text!: string;
}
