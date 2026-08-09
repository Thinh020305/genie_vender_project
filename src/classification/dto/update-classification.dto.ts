import { ApiProperty } from '@nestjs/swagger';
// @nestjs/swagger, class-validator, and class-transformer are NOT in
// package.json's dependencies --> run `npm install @nestjs/swagger class-validator class-transformer`.
// --> (Swagger bootstrap in main.ts)
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { VendorClassification } from '../../generated/prisma/enums';

export class UpdateClassificationDto {
  @ApiProperty({ enum: VendorClassification })
  @IsEnum(VendorClassification, {
    message: 'newClassification must be a valid VendorClassification value',
  })
  newClassification: VendorClassification;

  @ApiProperty({ required: false, minLength: 3 }) // optional
  @IsOptional()
  @IsString()
  @MinLength(3)
  reason?: string;
}