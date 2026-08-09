import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { VendorSourcesService } from './vendor-sources.service';
import { CreateSourceDto } from './dto/create-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';

@Controller('api/vendors/:vendorId/sources')
export class VendorSourcesController {
  constructor(private readonly service: VendorSourcesService) {}

  @Post()
  async create(
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @Body() dto: CreateSourceDto,
  ) {
    const data = await this.service.create(vendorId, dto);

    return {
      status: 201,
      message: 'success',
      data,
    };
  }

  @Get()
  async findAll(@Param('vendorId', ParseIntPipe) vendorId: number) {
    const data = await this.service.findAllByVendor(vendorId);

    return {
      status: 200,
      message: 'success',
      data,
    };
  }

  @Patch(':sourceId')
  async update(
    @Param('sourceId', ParseIntPipe) sourceId: number,
    @Body() dto: UpdateSourceDto,
  ) {
    const data = await this.service.update(sourceId, dto);

    return {
      status: 200,
      message: 'success',
      data,
    };
  }
}
