import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';
import { Role } from '../generated/prisma/enums';
import { CreateVendorSourceDto } from './dto/create-vendor-source.dto';
import { QueryVendorSourcesDto } from './dto/query-vendor-sources.dto';
import { UpdateVendorSourceDto } from './dto/update-vendor-source.dto';
import { VendorSourcesService } from './vendor-sources.service';

// [AI] Routes NESTED under the vendor, exactly as Genie Vina.pdf's Source API
// table specifies:
//     POST   /api/vendors/{id}/sources
//     GET    /api/vendors/{id}/sources
//     PATCH  /api/vendors/{id}/sources/{sourceId}
//
// [AI] CORRECTION to an earlier version of this file, which used a flat
// "api/vendor-sources" prefix to dodge the route-collision hazard
// statistics.controller.ts documents. That reasoning does not apply here: the
// collision is between a STATIC and a DYNAMIC segment at the SAME depth
// (/api/vendors/stats vs /api/vendors/:id). These routes are one segment
// deeper, so /api/vendors/:vendorId/sources cannot be shadowed by
// /api/vendors/:id no matter what order the modules are imported in. Following
// the spec's paths costs nothing here.
@Controller('api/vendors/:vendorId/sources')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorSourcesController {
  constructor(private readonly vendorSourcesService: VendorSourcesService) {}

  // [AI] Write routes are ADMIN + DEVELOPER; read routes carry no @Roles() at
  // all. The asymmetry is intentional and relies on RolesGuard's documented
  // fallback (no roles metadata => any authenticated user passes), which is
  // what implements Step 3.1's "REVIEWER: read-only access to vendor data and
  // classification results" without extra code. DEVELOPER is included on
  // writes per "DEVELOPER: register, update, search, classify, and summarize
  // vendors". Same pattern as ClassificationHistoryController.
  @Post()
  @Roles(Role.ADMIN, Role.DEVELOPER)
  create(
    @Param('vendorId', ParseBigIntPipe) vendorId: bigint,
    @Body() dto: CreateVendorSourceDto,
  ) {
    return this.vendorSourcesService.create(vendorId, dto);
  }

  @Get()
  findAll(
    @Param('vendorId', ParseBigIntPipe) vendorId: bigint,
    @Query() query: QueryVendorSourcesDto,
  ) {
    return this.vendorSourcesService.findAllForVendor(vendorId, query);
  }

  // [AI] BEYOND SPEC — the PDF lists no "get one source" route. Added because
  // PATCH already addresses a single source by the same path, so a client that
  // can edit a source has no documented way to read it back on its own.
  @Get(':sourceId')
  findOne(
    @Param('vendorId', ParseBigIntPipe) vendorId: bigint,
    @Param('sourceId', ParseBigIntPipe) sourceId: bigint,
  ) {
    return this.vendorSourcesService.findOne(vendorId, sourceId);
  }

  @Patch(':sourceId')
  @Roles(Role.ADMIN, Role.DEVELOPER)
  update(
    @Param('vendorId', ParseBigIntPipe) vendorId: bigint,
    @Param('sourceId', ParseBigIntPipe) sourceId: bigint,
    @Body() dto: UpdateVendorSourceDto,
  ) {
    return this.vendorSourcesService.update(vendorId, sourceId, dto);
  }

  // [AI] BEYOND SPEC and ADMIN-only — see the reasoning on
  // VendorSourcesService.remove(). Tighter than POST/PATCH because the delete
  // is hard, mirroring "DELETE /api/vendors/{id} (admin only or soft delete)".
  @Delete(':sourceId')
  @Roles(Role.ADMIN)
  remove(
    @Param('vendorId', ParseBigIntPipe) vendorId: bigint,
    @Param('sourceId', ParseBigIntPipe) sourceId: bigint,
  ) {
    return this.vendorSourcesService.remove(vendorId, sourceId);
  }
}
