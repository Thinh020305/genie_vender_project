import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  VendorClassification,
  ServiceType,
} from '../../generated/prisma/client';

export class QueryVendorDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(VendorClassification)
  classification?: VendorClassification;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  techStack?: string;

  @IsOptional()
  @IsString()
  languageCapability?: string;

  @IsOptional()
  @IsEnum(ServiceType)
  serviceType?: ServiceType;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
