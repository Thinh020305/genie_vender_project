// Tiếp nhận các HTTP requests từ client, điều hướng dữ liệu qua DTO để kiểm tra tính hợp lệ và gọi Service tương ứng.
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { QueryVendorDto } from './dto/query-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  //Đăng ký vendor mới
  @Post()
  async create(@Body() createVendorDto: CreateVendorDto) {
    const data = await this.vendorsService.create(createVendorDto);
    return {
      status: 200,
      message: 'success',
      data,
    };
  }

  // GET /api/vendors - Danh sách phân trang, tìm kiếm, lọc
  @Get()
  async findAll(@Query() query: QueryVendorDto) {
    const data = await this.vendorsService.findAll(query);
    return {
      status: 200,
      message: 'success',
      data,
    };
  }

  //Lấy chi tiết một vendor
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.vendorsService.findOne(id);
    return {
      status: 200,
      message: 'success',
      data,
    };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVendorDto: UpdateVendorDto,
  ) {
    const data = await this.vendorsService.update(id, updateVendorDto);
    return {
      status: 200,
      message: 'success',
      data,
    };
  }

  // DELETE /api/vendors/:id - Xóa mềm vendor
  // @Roles('ADMIN') <-- Mở comment dòng này và import từ phần của Thịnh nếu muốn chặn cứng quyền
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const data = await this.vendorsService.remove(id);
    return {
      status: 200,
      message: 'success',
      data,
    };
  }
}
