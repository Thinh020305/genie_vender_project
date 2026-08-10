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
// `import type` chứ không phải import thường: JwtPayload xuất hiện trong chữ ký
// tham số có decorator, mà với isolatedModules + emitDecoratorMetadata cùng bật
// thì TypeScript báo TS1272 nếu import theo kiểu giá trị.
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../generated/prisma/enums';
import { CreateVendorSummaryDto } from './dto/create-vendor-summary.dto';
import { QueryVendorSummariesDto } from './dto/query-vendor-summaries.dto';
import { VendorSummariesService } from './vendor-summaries.service';

/**
 * CRUD cho vendor_summaries, lồng dưới vendor. Không có route PATCH vì bảng
 * chỉ ghi thêm.
 *
 * Lưu ý đường dẫn: controller này dùng "summaries" (số nhiều), còn route sinh
 * tóm tắt bằng LLM dùng "summary" (số ít) — hai đoạn khác nhau nên không thể
 * che nhau ở bất kỳ thứ tự đăng ký nào. Nếu endpoint LLM cần lưu kết quả, nên
 * ghi qua VendorSummariesService (đã export từ module này) với summaryType
 * LLM_SUMMARY để giữ phần kiểm tra vendor và quy trách nhiệm tác giả ở một chỗ.
 */
@Controller('api/vendors/:vendorId/summaries')
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

  /**
   * Route đọc không gắn @Roles(): RolesGuard cho qua mọi vai trò đã xác thực
   * khi route không khai metadata, đó là cách REVIEWER có quyền chỉ đọc.
   */
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

  /**
   * DEVELOPER qua được guard, nhưng service còn đòi hỏi phải là tác giả của
   * dòng đó (ADMIN thì xoá được mọi dòng). RolesGuard không diễn đạt được điều
   * này vì nó không nhìn thấy bản ghi.
   */
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
