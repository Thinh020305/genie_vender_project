import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { QueryVendorDto } from './dto/query-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../generated/prisma/enums';

// [FIX] JwtAuthGuard + RolesGuard are already registered globally via
// APP_GUARD in app.module.ts, so every route here is already authenticated.
// What was missing is @Roles() metadata: with none set, RolesGuard's
// getAllAndOverride() finds nothing and lets ANY authenticated role through
// (see roles.guard.ts) — including REVIEWER, which is spec'd as read-only.
// No @UseGuards() needed here; the global guards already read @Roles().
@ApiTags('vendors')
@ApiBearerAuth()
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async create(@Body() createVendorDto: CreateVendorDto) {
    const data = await this.vendorsService.create(createVendorDto);
    return {
      status: 201,
      message: 'success',
      data,
    };
  }

  // No @Roles(): RolesGuard lets any authenticated role through, which is
  // how REVIEWER gets its read access without a separate decorator.
  @Get()
  async findAll(@Query() query: QueryVendorDto) {
    const data = await this.vendorsService.findAll(query);
    return {
      status: 200,
      message: 'success',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.vendorsService.findOne(id);
    return {
      status: 200,
      message: 'success',
      data,
    };
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.DEVELOPER)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVendorDto: UpdateVendorDto,
  ) {
    const data = await this.vendorsService.update(id, updateVendorDto);
    return {
      status: 200,
      message: 'success',
      data,
    };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number) {
    const data = await this.vendorsService.remove(id);
    return {
      status: 200,
      message: 'success',
      data,
    };
  }
}