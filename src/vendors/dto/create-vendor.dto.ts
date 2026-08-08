import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  IsUrl,
} from 'class-validator';
import {
  ServiceType,
  VendorClassification,
} from '../../generated/prisma/client';

export class CreateVendorDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  vendorCode!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  companyName!: string;

  @IsOptional()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  @MaxLength(255)
  website?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  location!: string;

  @IsNotEmpty()
  @IsEnum(ServiceType)
  serviceType!: ServiceType;

  @IsNotEmpty()
  @IsString()
  techStack!: string;

  @IsNotEmpty()
  @IsString()
  industryExperience!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  languageCapability!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  companySize!: string;

  @IsNotEmpty()
  @IsEnum(VendorClassification)
  classification!: VendorClassification;

  @IsOptional()
  @IsString()
  note?: string;
}
