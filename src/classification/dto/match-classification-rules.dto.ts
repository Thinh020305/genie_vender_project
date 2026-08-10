import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class MatchClassificationRulesDto {
  @ApiProperty({
    minLength: 2,
    maxLength: 20000,
    example: 'We provide offshore software development for Japanese clients',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(20000)
  text!: string;
}
