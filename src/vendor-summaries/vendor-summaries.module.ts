import { Module } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { VendorSummariesController } from './vendor-summaries.controller';
import { VendorSummariesService } from './vendor-summaries.service';

@Module({
  controllers: [VendorSummariesController],
  providers: [VendorSummariesService, PrismaService],
  // Export để module LLM lưu bản tóm tắt qua service này thay vì gọi thẳng
  // prisma.vendorSummary, giữ phần kiểm tra vendor và quy trách nhiệm tác giả
  // ở một chỗ.
  exports: [VendorSummariesService],
})
export class VendorSummariesModule {}
