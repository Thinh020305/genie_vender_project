import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClassificationRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.classificationRule.findMany({
      orderBy: {
        id: 'asc',
      },
    });
  }
}
