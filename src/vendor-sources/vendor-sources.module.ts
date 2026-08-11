import { Module } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { VendorSourcesController } from './vendor-sources.controller';
import { VendorSourcesService } from './vendor-sources.service';

@Module({
  controllers: [VendorSourcesController],
  providers: [VendorSourcesService, PrismaService],
  exports: [VendorSourcesService],
})
export class VendorSourcesModule {}
