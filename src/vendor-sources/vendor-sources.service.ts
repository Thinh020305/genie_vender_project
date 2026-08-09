import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSourceDto } from './dto/create-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';

@Injectable()
export class VendorSourcesService {
  constructor(private readonly prisma: PrismaService) {}

  private validateSource(sourceUrl?: string | null, memo?: string | null) {
    const url = sourceUrl?.trim() || null;
    const normalizedMemo = memo?.trim().toLowerCase() || '';

    if (
      !url &&
      !normalizedMemo.includes('demo data') &&
      !normalizedMemo.includes('source unverified')
    ) {
      throw new BadRequestException(
        "Quy tắc nguồn: Nếu không có URL, 'memo' phải chứa 'demo data' hoặc 'source unverified'",
      );
    }

    return {
      sourceUrl: url,
      memo: memo?.trim() || null,
    };
  }

  async create(vendorId: number, dto: CreateSourceDto) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${vendorId} not found`);
    }

    const { sourceUrl, memo } = this.validateSource(dto.sourceUrl, dto.memo);

    return this.prisma.vendorSource.create({
      data: {
        vendorId,
        sourceType: dto.sourceType,
        sourceUrl,
        sourceTitle: dto.sourceTitle?.trim() || null,
        memo,
      },
    });
  }

  async findAllByVendor(vendorId: number) {
    return await this.prisma.vendorSource.findMany({
      where: {
        vendorId,
      },
      orderBy: {
        checkedAt: 'desc',
      },
    });
  }

  async update(id: number, dto: UpdateSourceDto) {
    const existingSource = await this.prisma.vendorSource.findUnique({
      where: {
        id,
      },
    });

    if (!existingSource) {
      throw new NotFoundException('Không tìm thấy nguồn dữ liệu');
    }

    const sourceUrl =
      dto.sourceUrl !== undefined ? dto.sourceUrl : existingSource.sourceUrl;

    const memo = dto.memo !== undefined ? dto.memo : existingSource.memo;

    const validated = this.validateSource(sourceUrl, memo);

    return this.prisma.vendorSource.update({
      where: {
        id,
      },
      data: {
        sourceType: dto.sourceType,
        sourceUrl: validated.sourceUrl,
        sourceTitle:
          dto.sourceTitle !== undefined
            ? dto.sourceTitle?.trim() || null
            : existingSource.sourceTitle,
        memo: validated.memo,
      },
    });
  }
}
