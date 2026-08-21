import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Modules
import { AuthModule } from './auth/auth.module';
import { ClassificationModule } from './classification/classification.module';
import { StatisticsModule } from './statistics/statistics.module';
import { LlmModule } from './llm/llm.module';
import { VendorsModule } from './vendors/vendors.module';
import { VendorSourcesModule } from './vendor-sources/vendor-sources.module';
import { VendorSummariesModule } from './vendor-summaries/vendor-summaries.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

// Common
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,

    AuthModule,
    ClassificationModule,
    StatisticsModule,
    LlmModule,
    VendorsModule,
    VendorSourcesModule,
    VendorSummariesModule,
  ],

  controllers: [AppController],

  providers: [
    AppService,
    PrismaService,

    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
