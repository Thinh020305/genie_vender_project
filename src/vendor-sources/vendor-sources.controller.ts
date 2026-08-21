import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { CreateVendorSourceDto } from './dto/create-vendor-source.dto';
import { QueryVendorSourcesDto } from './dto/query-vendor-sources.dto';
import { UpdateVendorSourceDto } from './dto/update-vendor-source.dto';
import { VendorSourcesService } from './vendor-sources.service';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';

@ApiTags('Source API')
@ApiBearerAuth()
@Controller('vendors/:id/sources')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorSourcesController {
  constructor(private readonly vendorSourcesService: VendorSourcesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.DEVELOPER)
  create(
    @Param('id', ParseIntPipe) vendorId: number,
    @Body() dto: CreateVendorSourceDto,
  ) {
    return this.vendorSourcesService.create(vendorId, dto);
  }

  // Route đọc không gắn @Roles(): RolesGuard cho qua mọi vai trò đã xác thực,
  // đó là cách REVIEWER có quyền chỉ đọc.
  @Get()
  findAll(
    @Param('id', ParseIntPipe) vendorId: number,
    @Query() query: QueryVendorSourcesDto,
  ) {
    return this.vendorSourcesService.findAllForVendor(vendorId, query);
  }

  @Get(':sourceId')
  @ApiExcludeEndpoint()
  findOne(
    @Param('id', ParseIntPipe) vendorId: number,
    @Param('sourceId', ParseIntPipe) sourceId: number,
  ) {
    return this.vendorSourcesService.findOne(vendorId, sourceId);
  }

  @Patch(':sourceId')
  @Roles(Role.ADMIN, Role.DEVELOPER)
  update(
    @Param('id', ParseIntPipe) vendorId: number,
    @Param('sourceId', ParseIntPipe) sourceId: number,
    @Body() dto: UpdateVendorSourceDto,
  ) {
    return this.vendorSourcesService.update(vendorId, sourceId, dto);
  }

  @Delete(':sourceId')
  @ApiExcludeEndpoint()
  @Roles(Role.ADMIN)
  remove(
    @Param('id', ParseIntPipe) vendorId: number,
    @Param('sourceId', ParseIntPipe) sourceId: number,
  ) {
    return this.vendorSourcesService.remove(vendorId, sourceId);
  }
}
