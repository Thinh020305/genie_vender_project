// Chứa toàn bộ logic nghiệp vụ (business logic) liên quan đến Vendor
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  // Tạo mới một Vendor
  async create(createVendorDto: CreateVendorDto) {
    const vendor = await this.prisma.vendor.create({
      data: createVendorDto,
    });
    return vendor;
  }

  // Lấy thông tin chi tiết của 1 Vendor theo ID
  async findOne(id: number) {
    const vendor = await this.prisma.vendor.findFirst({
      where: {
        id,
        deletedAt: null, // Chỉ lấy những record chưa bị xóa mềm
      },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    return vendor;
  }
}
