import { ApiProperty } from '@nestjs/swagger';
// [AI] @nestjs/swagger, class-validator and class-transformer are still NOT in
// package.json — same blocker already flagged in
// classification/dto/update-classification.dto.ts. Nothing in these three
// modules compiles until someone runs:
//     npm install @nestjs/swagger class-validator class-transformer
// -> MENTION TO TEAM (Thịnh's infra scope, same as the Swagger bootstrap and
//    the global ValidationPipe in main.ts, which also does not exist yet —
//    without `app.useGlobalPipes(new ValidationPipe({ transform: true }))`
//    every decorator in this file is inert and bodies pass through unchecked).
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

import { SourceType } from '../../generated/prisma/enums';

export class CreateVendorSourceDto {
  // [AI] Accepted as a STRING because the id is a bigint (docs/erd.md).
  // The @Transform coerces a JSON number (`"vendorId": 42`) to a string
  // first, so both `42` and `"42"` are accepted — clients writing JSON by
  // hand will naturally send the number form, and rejecting it would be a
  // confusing 400.
  @ApiProperty({ example: '42', description: 'bigint id, sent as a string' })
  @Transform(({ value }) =>
    value === null || value === undefined ? value : String(value),
  )
  @IsNumberString({ no_symbols: true })
  vendorId!: string;

  @ApiProperty({ enum: SourceType })
  @IsEnum(SourceType, {
    message: `sourceType must be one of: ${Object.values(SourceType).join(', ')}`,
  })
  sourceType!: SourceType;

  // [AI] Optional, matching the nullable column. require_protocol: true so a
  // bare "example.com" is rejected — a stored source URL that can't be opened
  // defeats the point of the table. Not spec text.
  @ApiProperty({ required: false, maxLength: 2048 })
  @IsOptional()
  @IsUrl(
    { require_protocol: true },
    {
      message:
        'sourceUrl must be an absolute URL including http:// or https://',
    },
  )
  @MaxLength(2048)
  sourceUrl?: string;

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourceTitle?: string;

  // [AI] ISO-8601 string in, converted to Date in the service. Left optional:
  // "not verified yet" is a real state (see the .prisma note).
  @ApiProperty({ required: false, format: 'date-time' })
  @IsOptional()
  @IsDateString({}, { message: 'checkedAt must be an ISO-8601 date string' })
  checkedAt?: string;

  @ApiProperty({ required: false, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  memo?: string;
}
