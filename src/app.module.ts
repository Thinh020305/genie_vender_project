import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service';
import {
  APP_FILTER,
  APP_GUARD,
  APP_INTERCEPTOR,
} from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AuthModule } from './auth/auth.module';
import { ClassificationModule } from './classification/classification.module';
import { StatisticsModule } from './statistics/statistics.module';
import { LlmModule } from './llm/llm.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,ClassificationModule, StatisticsModule, LlmModule
  ],
import { PrismaService } from '../prisma/prisma.service';
import { ClassificationModule } from './classification/classification.module';
import { StatisticsModule } from './statistics/statistics.module';
import { LlmModule } from './llm/llm.module';

@Module({
  imports: [ClassificationModule, StatisticsModule, LlmModule],
  controllers: [AppController],
  providers: [AppService,PrismaModule
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
