import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClassificationModule } from './classification/classification.module';
import { StatisticsModule } from './statistics/statistics.module';

@Module({
  imports: [ClassificationModule, StatisticsModule],
  controllers: [AppController],
  providers: [AppService,PrismaService],
})
export class AppModule {}
