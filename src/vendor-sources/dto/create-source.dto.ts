import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { SourceType } from '../../generated/prisma/enums';

export class CreateSourceDto {
  @IsEnum(SourceType)
  sourceType!: SourceType;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sourceTitle?: string;

  @IsOptional()
  @IsString()
  memo?: string;
}
