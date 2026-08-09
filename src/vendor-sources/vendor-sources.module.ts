import { Module } from '@nestjs/common';
import { VendorSourcesController } from './vendor-sources.controller';
import { VendorSourcesService } from './vendor-sources.service';

@Module({
  controllers: [VendorSourcesController],
  providers: [VendorSourcesService],
})
export class VendorSourcesModule {}
