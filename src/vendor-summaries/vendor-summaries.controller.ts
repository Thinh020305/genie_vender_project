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
// `import type`: JwtPayload nằm trong tham số có decorator, import thường sẽ
// gây TS1272 với isolatedModules + emitDecoratorMetadata.
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../generated/prisma/enums';
import { CreateVendorSummaryDto } from './dto/create-vendor-summary.dto';
import { QueryVendorSummariesDto } from './dto/query-vendor-summaries.dto';
import { VendorSummariesService } from './vendor-summaries.service';
import { ApiBearerAuth, ApiExcludeController, ApiTags } from '@nestjs/swagger';

// Không có route PATCH: bảng chỉ ghi thêm.
@ApiTags('vendor-summaries')
@ApiBearerAuth()
@ApiExcludeController()
@Controller('vendors/:vendorId/summaries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorSummariesController {
  constructor(
    private readonly vendorSummariesService: VendorSummariesService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.DEVELOPER)
  create(
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @Body() dto: CreateVendorSummaryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vendorSummariesService.create(vendorId, dto, user.sub);
  }

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
