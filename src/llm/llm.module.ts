import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';

@Module({
  controllers: [LlmController],
  providers: [LlmService, PrismaService],
})
export class LlmModule {}
