import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClassificationModule } from './classification/classification.module';
import { StatisticsModule } from './statistics/statistics.module';
import { LlmModule } from './llm/llm.module';
import { VendorSourcesModule } from './vendor-sources/vendor-sources.module';
import { VendorSummariesModule } from './vendor-summaries/vendor-summaries.module';

// [AI] StatisticsModule stays ahead of the vendor modules in this list because
// statistics.controller.ts registers the STATIC route GET /api/vendors/stats
// and depends on being registered before any controller that binds
// GET /api/vendors/:id. VendorSourcesModule and VendorSummariesModule use
// their own top-level prefixes so they can't take part in that collision, but
// Cường's VendorsModule will — keep it last when it is added.
@Module({
  imports: [
    ClassificationModule,
    StatisticsModule,
    LlmModule,
    VendorSourcesModule,
    VendorSummariesModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
