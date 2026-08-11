import { Module } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { VendorSummariesController } from './vendor-summaries.controller';
import { VendorSummariesService } from './vendor-summaries.service';

@Module({
  controllers: [VendorSummariesController],
  providers: [VendorSummariesService, PrismaService],
  exports: [VendorSummariesService],
})
export class VendorSummariesModule {}
