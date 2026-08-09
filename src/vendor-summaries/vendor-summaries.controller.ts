import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';
// [AI] `import type`, not a value import. JwtPayload appears in a decorated
// parameter signature, and with isolatedModules + emitDecoratorMetadata both
// on (tsconfig.json), TypeScript raises TS1272 for a plain import there — it
// cannot tell whether the symbol survives to runtime for the metadata emit.
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../generated/prisma/enums';
import { CreateVendorSummaryDto } from './dto/create-vendor-summary.dto';
import { QueryVendorSummariesDto } from './dto/query-vendor-summaries.dto';
import { VendorSummariesService } from './vendor-summaries.service';

// [AI] Prefix "api/vendor-summaries" rather than nesting under "api/vendors" —
// same reasoning as VendorSourcesController: statistics.controller.ts
// documents a live registration-order collision hazard on that prefix, and a
// separate top-level path avoids it entirely.
@Controller('api/vendor-summaries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorSummariesController {
  constructor(
    private readonly vendorSummariesService: VendorSummariesService,
  ) {}

  // [AI] There is no @Patch route. vendor_summaries is append-only — see the
  // note at the top of VendorSummariesService.

  @Post()
  @Roles(Role.ADMIN, Role.DEVELOPER)
  create(
    @Body() dto: CreateVendorSummaryDto,
    // [AI] TYPE HAZARD, same one already flagged in
    // classification-history.controller.ts: JwtPayload.sub is declared
    // `number`, but Member.id is a bigint per docs/erd.md. The conversion
    // below is explicit so the mismatch is handled rather than silently
    // passed into Prisma — but if a member id ever exceeds 2^53 the JWT
    // payload has already lost precision by this point and BigInt() cannot
    // recover it.
    // -> MUST CONFIRM WITH THỊNH: JwtPayload.sub should become `string` once
    //    Member.id's real type is settled, and the auth module should sign it
    //    as a string.
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vendorSummariesService.create(dto, BigInt(user.sub));
  }

  // [AI] Read routes carry no @Roles(): RolesGuard's documented fallback lets
  // any authenticated user through when no roles metadata is set, which is
  // what gives REVIEWER read-only access ("read-only access to vendor data
  // and classification results").
  @Get()
  findAll(@Query() query: QueryVendorSummariesDto) {
    return this.vendorSummariesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.vendorSummariesService.findOne(id);
  }

  // [AI] DEVELOPER is allowed at the guard level, but the service additionally
  // requires that a DEVELOPER own the row (ADMIN may delete any). The guard
  // cannot express that on its own — it never sees the record.
  @Delete(':id')
  @Roles(Role.ADMIN, Role.DEVELOPER)
  remove(
    @Param('id', ParseBigIntPipe) id: bigint,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vendorSummariesService.remove(id, BigInt(user.sub), user.role);
  }
}
