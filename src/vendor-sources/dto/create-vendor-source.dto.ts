import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
// [AI] @nestjs/swagger, class-validator and class-transformer are still NOT in
// package.json — a repo-wide blocker predating this file. Genie Vina.pdf Step 2
// makes Swagger MANDATORY for all endpoints, so this is required, not optional:
//     npm install @nestjs/swagger class-validator class-transformer
// It also needs `app.useGlobalPipes(new ValidationPipe({ transform: true }))`
// in main.ts, which does not exist yet — without it every decorator below is
// inert and request bodies pass through unvalidated.
// -> MENTION TO TEAM (Thịnh's infra scope: Swagger bootstrap + global pipe).
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

import { SourceType } from '../../generated/prisma/enums';

// [AI] There is NO vendorId field. Genie Vina.pdf's Source API nests every
// route under the vendor ("POST /api/vendors/{id}/sources"), so the vendor
// comes from the path. Accepting it in the body as well would allow a request
// whose path and body disagree.
export class CreateVendorSourceDto {
  @ApiProperty({ enum: SourceType })
  @IsEnum(SourceType, {
    message: `sourceType must be one of: ${Object.values(SourceType).join(', ')}`,
  })
  sourceType!: SourceType;

  // [AI] Optional at the FIELD level only. Step 3.3 requires every source to
  // carry either a public URL or a clear demo-data note, and Step 3.2 allows
  // sourceUrl to be absent "only for educational demo data" — that is a
  // cross-field rule, so it is enforced in VendorSourcesService rather than
  // here. class-validator could express it with a custom decorator, but the
  // service is where the same check can also cover PATCH, where the merged row
  // (not the request body) is what has to satisfy the rule.
  //
  // require_protocol: true so a bare "example.com" is rejected — a stored
  // source URL that cannot be opened defeats the point of the table.
  @ApiPropertyOptional({
    maxLength: 2048,
    example: 'https://example.com/about',
  })
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

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourceTitle?: string;

  // [AI] ISO-8601 string in, converted to Date in the service. Optional
  // because "not verified yet" is a real state — the column is nullable in the
  // ERD and is deliberately NOT defaulted to now().
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString({}, { message: 'checkedAt must be an ISO-8601 date string' })
  checkedAt?: string;

  // [AI] Carries the demo-data note Step 3.2 requires when there is no URL:
  // 'If source is unavailable, note must include "source unverified" or
  // "demo data"'. VendorSourcesService checks for those exact markers.
  @ApiPropertyOptional({
    maxLength: 1000,
    example:
      'demo data — no public source available for this educational record',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  memo?: string;
}
