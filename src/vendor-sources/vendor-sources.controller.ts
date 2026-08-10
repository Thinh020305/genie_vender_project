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

/**
 * Source API, lồng dưới vendor:
 *   POST   /api/vendors/{id}/sources
 *   GET    /api/vendors/{id}/sources
 *   PATCH  /api/vendors/{id}/sources/{sourceId}
 *
 * Các route này sâu hơn /api/vendors/:id một đoạn nên không thể bị route đó
 * che, bất kể thứ tự import module.
 */
@Controller('api/vendors/:vendorId/sources')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorSourcesController {
  constructor(private readonly vendorSourcesService: VendorSourcesService) {}

  /**
   * Route ghi dành cho ADMIN và DEVELOPER; route đọc cố ý không gắn @Roles().
   * RolesGuard cho qua mọi vai trò đã xác thực khi route không khai metadata,
   * đó là cách REVIEWER có quyền chỉ đọc mà không cần thêm code.
   */
  @Post()
  @Roles(Role.ADMIN, Role.DEVELOPER)
  create(
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @Body() dto: CreateVendorSourceDto,
  ) {
    return this.vendorSourcesService.create(vendorId, dto);
  }

  @Get()
  findAll(
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @Query() query: QueryVendorSourcesDto,
  ) {
    return this.vendorSourcesService.findAllForVendor(vendorId, query);
  }

  @Get(':sourceId')
  findOne(
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @Param('sourceId', ParseIntPipe) sourceId: number,
  ) {
    return this.vendorSourcesService.findOne(vendorId, sourceId);
  }

  @Patch(':sourceId')
  @Roles(Role.ADMIN, Role.DEVELOPER)
  update(
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @Param('sourceId', ParseIntPipe) sourceId: number,
    @Body() dto: UpdateVendorSourceDto,
  ) {
    return this.vendorSourcesService.update(vendorId, sourceId, dto);
  }

  /** Chặt hơn POST/PATCH vì đây là xoá cứng, không khôi phục được. */
  @Delete(':sourceId')
  @Roles(Role.ADMIN)
  remove(
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @Param('sourceId', ParseIntPipe) sourceId: number,
  ) {
    return this.vendorSourcesService.remove(vendorId, sourceId);
  }
}
