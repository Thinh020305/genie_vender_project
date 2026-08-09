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

// [AI] Prefix is "api/vendor-sources", NOT "api/vendors/:vendorId/sources".
// The nested form is more RESTful, but statistics.controller.ts already
// documents a live route-collision hazard on the "api/vendors" prefix:
// Express matches in REGISTRATION order, so Cường's GET /api/vendors/:id can
// swallow sibling static segments depending on module import order in
// app.module.ts. A separate top-level prefix cannot collide with it at all,
// and the vendor is passed as a body field / ?vendorId= filter instead.
// -> MENTION TO TEAM: this is a deviation from the nested-resource convention
//    the endpoint table may imply. Easy to change later if the team would
//    rather fix the ordering hazard once and nest everything.
@Controller('api/vendor-sources')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorSourcesController {
  constructor(private readonly vendorSourcesService: VendorSourcesService) {}

  // [AI] Write routes are ADMIN + DEVELOPER, read routes carry no @Roles() at
  // all. That asymmetry is intentional and relies on RolesGuard's documented
  // fallback: no roles metadata => any authenticated user passes, which is
  // what gives REVIEWER read-only access without extra code. Same pattern
  // used by ClassificationHistoryController and StatisticsController.
  @Post()
  @Roles(Role.ADMIN, Role.DEVELOPER)
  create(@Body() dto: CreateVendorSourceDto) {
    return this.vendorSourcesService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryVendorSourcesDto) {
    return this.vendorSourcesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.vendorSourcesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.DEVELOPER)
  update(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: UpdateVendorSourceDto,
  ) {
    return this.vendorSourcesService.update(id, dto);
  }

  // [AI] DELETE restricted to ADMIN only, one step tighter than POST/PATCH.
  // Inferred from the role table ("ADMIN: manages members and system
  // config"), not stated for this route. Reasoning: a deleted source row is
  // unrecoverable (hard delete), so it reads as a heavier action than editing
  // one.
  // -> MENTION TO TEAM: DEVELOPER can create sources but not delete their own
  //    mistakes, which may be too strict in practice.
  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.vendorSourcesService.remove(id);
  }
}
