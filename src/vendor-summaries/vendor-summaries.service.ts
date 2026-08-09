import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SummaryType } from '../generated/prisma/enums';

@Injectable()
export class VendorSummariesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    vendorId: number,
    memberId: number,
    content: string,
    type: SummaryType,
  ) {
    return await this.prisma.vendorSummary.create({
      data: {
        vendorId,
        createdBy: memberId,
        content,
        summaryType: type,
      },
    });
  }

  async findByVendor(vendorId: number) {
    return await this.prisma.vendorSummary.findMany({
      where: {
        vendorId,
      },
      include: {
        author: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
