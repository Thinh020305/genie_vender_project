import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { VendorsModule } from './vendors/vendors.module';
import { VendorSourcesModule } from './vendor-sources/vendor-sources.module';
import { VendorSummariesModule } from './vendor-summaries/vendor-summaries.module';
import { ClassificationModule } from './classification/classification.module';

@Module({
  imports: [
    VendorsModule,
    VendorSourcesModule,
    VendorSummariesModule,
    ClassificationModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
