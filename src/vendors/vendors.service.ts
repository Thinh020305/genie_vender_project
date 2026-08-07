// Chứa toàn bộ logic nghiệp vụ (business logic) liên quan đến Vendor
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

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

  // Cập nhật thông tin Vendor
  async update(id: number, updateVendorDto: any) {
    // Kiểm tra xem vendor có tồn tại và chưa bị xóa không
    await this.findOne(id);

    return this.prisma.vendor.update({
      where: { id },
      data: updateVendorDto,
    });
  }

  // Xóa mềm (Soft Delete) Vendor
  async remove(id: number) {
    // Kiểm tra xem vendor có tồn tại không trước khi xóa
    await this.findOne(id);

    return this.prisma.vendor.update({
      where: { id },
      data: {
        deletedAt: new Date(), // Ghi nhận thời gian xóa
      },
    });
  }

  // Lấy danh sách Vendor với Phân trang, Tìm kiếm & Lọc
  async findAll(query: QueryVendorDto) {
    const {
      page = 1,
      limit = 10,
      search,
      classification,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Xây dựng bộ điều kiện truy vấn (Where)
    const whereCondition: any = {
      deletedAt: null, // Chỉ lấy những record chưa bị xóa mềm
    };

    // 1. Logic lọc tổng hợp (Filter)
    if (classification) {
      whereCondition.classification = classification;
    }

    // 2. Logic tìm kiếm từ khóa (Keyword Search)
    if (search) {
      whereCondition.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 3. Truy vấn Database (Chạy song song đếm tổng số và lấy dữ liệu)
    const [items, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      this.prisma.vendor.count({
        where: whereCondition,
      }),
    ]);

    // Trả về dữ liệu kèm Metadata phân trang
    return {
      items,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }
}
