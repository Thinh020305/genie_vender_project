import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClassificationRulesController } from './classification-rules.controller';
import { ClassificationRulesService } from './classification-rules.service';

@Module({
  controllers: [ClassificationRulesController],
  providers: [ClassificationRulesService, PrismaService],
})
export class ClassificationModule {}
