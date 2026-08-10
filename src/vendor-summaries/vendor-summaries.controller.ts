import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
// [AI] `import type`, not a value import. JwtPayload appears in a decorated
// parameter signature, and with isolatedModules + emitDecoratorMetadata both on
// (tsconfig.json), TypeScript raises TS1272 for a plain import there.
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../generated/prisma/enums';
import { CreateVendorSummaryDto } from './dto/create-vendor-summary.dto';
import { QueryVendorSummariesDto } from './dto/query-vendor-summaries.dto';
import { VendorSummariesService } from './vendor-summaries.service';

// [AI] BEYOND SPEC as a whole. Genie Vina.pdf defines the vendor_summaries
// TABLE (ERD table 5) but its endpoint list contains no CRUD for it — the only
// summary route is "GET /api/vendors/{id}/summary", an LLM feature in Sơn's
// module. Without the routes below, MANUAL_NOTE and PROFILE_SUMMARY rows have
// no way in or out and the table is unreachable.
//
// [AI] PATH COLLISION CHECK, worth stating explicitly: this controller binds
// "api/vendors/:vendorId/summaries" (PLURAL) while the PDF's LLM route is
// "/api/vendors/{id}/summary" (SINGULAR). Different literal segments, so they
// cannot shadow each other in any registration order.
// -> MENTION TO SƠN: if his LLM endpoint persists its output, it should write
//    through VendorSummariesService (exported from this module) with
//    summaryType LLM_SUMMARY, rather than calling prisma.vendorSummary
//    directly — that keeps the vendor check and author attribution in one place.
@Controller('api/vendors/:vendorId/summaries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorSummariesController {
  constructor(
    private readonly vendorSummariesService: VendorSummariesService,
  ) {}

  // [AI] There is no @Patch route. vendor_summaries is append-only — see the
  // note at the top of VendorSummariesService.

  // [AI] ADMIN + DEVELOPER per Step 3.1, which lists "summarize vendors" among
  // DEVELOPER's abilities.
  @Post()
  @Roles(Role.ADMIN, Role.DEVELOPER)
  create(
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @Body() dto: CreateVendorSummaryDto,
    // [AI] `user.sub` is passed straight through. It used to be wrapped in
    // BigInt() because createdById was a BigInt column while JwtPayload.sub is
    // declared `number` — that conversion, and the precision hazard it carried,
    // are both gone now that Member.id and createdById are Int on every side.
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vendorSummariesService.create(vendorId, dto, user.sub);
  }

  // [AI] Read routes carry no @Roles(): RolesGuard's documented fallback lets
  // any authenticated user through when no roles metadata is set, which is what
  // implements Step 3.1's "REVIEWER: read-only access to vendor data and
  // classification results".
  @Get()
  findAll(
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @Query() query: QueryVendorSummariesDto,
  ) {
    return this.vendorSummariesService.findAllForVendor(vendorId, query);
  }

  @Get(':summaryId')
  findOne(
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @Param('summaryId', ParseIntPipe) summaryId: number,
  ) {
    return this.vendorSummariesService.findOne(vendorId, summaryId);
  }

  // [AI] DEVELOPER passes the guard, but the service additionally requires that
  // a DEVELOPER own the row (ADMIN may delete any). RolesGuard cannot express
  // that on its own — it never sees the record.
  @Delete(':summaryId')
  @Roles(Role.ADMIN, Role.DEVELOPER)
  remove(
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @Param('summaryId', ParseIntPipe) summaryId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vendorSummariesService.remove(
      vendorId,
      summaryId,
      user.sub,
      user.role,
    );
  }
}
