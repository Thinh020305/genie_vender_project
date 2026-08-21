import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { QueryVendorDto } from './dto/query-vendor.dto';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createVendorDto: CreateVendorDto) {
    const existing = await this.prisma.vendor.findUnique({
      where: { vendorCode: createVendorDto.vendorCode },
    });
    if (existing) {
      throw new ConflictException('Vendor code already exists');
    }

    return this.prisma.vendor.create({
      data: createVendorDto,
    });
  }

  async findOne(id: number) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }
    return vendor;
  }

  async update(id: number, updateVendorDto: UpdateVendorDto) {
    await this.findOne(id);
    return this.prisma.vendor.update({
      where: { id },
      data: updateVendorDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    // Xóa cứng do DB không có trường deletedAt
    return this.prisma.vendor.delete({
      where: { id },
    });
  }

  async findAll(query: QueryVendorDto) {
    const {
      page = 1,
      limit = 10,
      search,
      classification,
      location,
      techStack,
      languageCapability,
      serviceType,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const whereCondition: any = {};

    // Filters
    if (classification) whereCondition.classification = classification;
    if (serviceType) whereCondition.serviceType = serviceType;
    if (location)
      whereCondition.location = { contains: location, mode: 'insensitive' };
    if (techStack)
      whereCondition.techStack = { contains: techStack, mode: 'insensitive' };
    if (languageCapability) {
      whereCondition.languageCapability = {
        contains: languageCapability,
        mode: 'insensitive',
      };
    }

    // Keyword Search
    if (search) {
      whereCondition.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { techStack: { contains: search, mode: 'insensitive' } },
        { industryExperience: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.vendor.count({ where: whereCondition }),
    ]);

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
