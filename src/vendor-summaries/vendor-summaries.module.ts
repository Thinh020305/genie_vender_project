import { Module } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { VendorSummariesController } from './vendor-summaries.controller';
import { VendorSummariesService } from './vendor-summaries.service';

// [AI] PrismaService provided locally, matching every other module in the repo.
// See the note in vendor-sources.module.ts about the per-module connection
// pool this creates.
@Module({
  controllers: [VendorSummariesController],
  providers: [VendorSummariesService, PrismaService],
  // [AI] Exported so Sơn's LLM module can persist an LLM_SUMMARY through this
  // service instead of writing to prisma.vendorSummary directly — that keeps
  // the vendor-existence check and the author attribution in one place.
  exports: [VendorSummariesService],
})
export class VendorSummariesModule {}
