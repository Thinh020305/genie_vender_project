import { ApiProperty } from '@nestjs/swagger';
// [AI] @nestjs/swagger, class-validator, and class-transformer are NOT in
// package.json's dependencies today. This DTO won't compile until someone
// runs `npm install @nestjs/swagger class-validator class-transformer`.
// -> MENTION TO TEAM (likely Thịnh's infra scope, since Swagger bootstrap
//    in main.ts is also his responsibility per the task split)
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { VendorClassification } from '../../generated/prisma/enums';

export class UpdateClassificationDto {
  @ApiProperty({ enum: VendorClassification })
  @IsEnum(VendorClassification, {
    message: 'newClassification must be a valid VendorClassification value',
  })
  newClassification: VendorClassification;

  // [AI] Spec (rule 5) lists "reason" as a field to record but never says
  // whether it's required on write. Made optional + soft-validated here
  // (min length 3 if provided) rather than mandatory.
  // -> MENTION TO TEAM: should a classification change be rejected if no
  //    reason is given? Rule 5 just says "record ... reason", not "require" it.
  @ApiProperty({ required: false, minLength: 3 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  reason?: string;
}