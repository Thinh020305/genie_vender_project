import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from '../prisma/prisma.service';
<<<<<<< HEAD
import { ClassificationModule } from './classification/classification.module';
import { StatisticsModule } from './statistics/statistics.module';

@Module({
  imports: [ClassificationModule, StatisticsModule],
=======
import { PrismaModule } from '../prisma/prisma.module';
import { VendorsModule } from './vendors/vendors.module';

@Module({
  imports: [VendorsModule],
>>>>>>> origin/feature/doduccuong
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
