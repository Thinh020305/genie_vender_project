import { Module } from '@nestjs/common';
import { VendorSummariesController } from './vendor-summaries.controller';
import { VendorSummariesService } from './vendor-summaries.service';

@Module({
  controllers: [VendorSummariesController],
  providers: [VendorSummariesService],
})
export class VendorSummariesModule {}
