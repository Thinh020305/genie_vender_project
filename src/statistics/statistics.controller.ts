// src/statistics/statistics.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { StatisticsService } from './statistics.service';
import { VendorStatsResponseDto } from './dto/vendor-stats-response.dto';

// [AI — HIGH PRIORITY] Route collision flag unchanged, see earlier writeup.
@ApiTags('Statistics API')
@ApiBearerAuth()
@Controller('vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get vendor statistics',
    description:
      'Total count plus breakdowns by classification, location, and serviceType. Open to all authenticated roles, including REVIEWER.',
  })
  @ApiResponse({ status: 200, type: VendorStatsResponseDto })
  getVendorStats() {
    return this.statisticsService.getVendorStats();
  }
}
