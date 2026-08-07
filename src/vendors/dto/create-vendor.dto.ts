// validate dữ liệu khi nhận yêu cầu tạo mới vendor
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { VendorClassification } from '@prisma/client';

export class CreateVendorDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty({ message: 'Classification is required' })
  @IsEnum(VendorClassification, { message: 'Invalid vendor classification' })
  classification: VendorClassification;
}
