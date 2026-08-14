// src/classification/classification-history.controller.ts
import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma/enums';
import { ClassificationHistoryService } from './classification-history.service';
import { UpdateClassificationDto } from './dto/update-classification.dto';

// [AI] Base path "api/vendors" — same collision caveat as before, unchanged
// by adding Swagger. Not re-flagging in full here, see earlier writeup.
@ApiTags('vendors')
// [AI] ApiBearerAuth() references a security scheme name that must match
// whatever Thịnh registers via DocumentBuilder().addBearerAuth() in
// main.ts. Using the implicit default here — if he names the scheme
// something else (e.g. 'jwt' or 'access-token'), this needs to match.
// -> CONFIRM WITH THỊNH
@ApiBearerAuth()
@Controller('vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassificationHistoryController {
  constructor(
    private readonly classificationHistoryService: ClassificationHistoryService,
  ) {}

  @Patch(':id/classification')
  @Roles(Role.ADMIN, Role.DEVELOPER)
  @ApiOperation({
    summary: "Update a vendor's classification and record the change",
    description:
      'Requires ADMIN or DEVELOPER. Writes vendor.classification and a classification_histories row in a single transaction.',
  })
  @ApiParam({ name: 'id', description: 'Vendor UUID' })
  @ApiResponse({ status: 200, description: 'Classification updated' })
  @ApiResponse({
    status: 400,
    description: 'New value equals current value, or fails DTO validation',
  })
  @ApiResponse({ status: 403, description: 'REVIEWER role forbidden' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  updateClassification(
    @Param('id') id: number,
    @Body() dto: UpdateClassificationDto,
    @CurrentUser('sub') changedById: number,
  ) {
    return this.classificationHistoryService.updateClassification(
      id,
      dto,
      changedById,
    );
  }

  @Get(':id/classification-history')
  @ApiOperation({
    summary: 'Get the classification change history for a vendor',
    description: 'Open to all authenticated roles, including REVIEWER.',
  })
  @ApiParam({ name: 'id', description: 'Vendor UUID' })
  @ApiResponse({
    status: 200,
    description: 'History rows, ordered by changedAt descending',
  })
  getHistory(@Param('id') id: number) {
    return this.classificationHistoryService.getHistory(id);
  }
}
