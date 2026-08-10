import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { ClassificationRulesService } from './classification-rules.service';
import { CreateClassificationRuleDto } from './dto/create-classification-rule.dto';
import { MatchClassificationRulesDto } from './dto/match-classification-rules.dto';
import { UpdateClassificationRuleDto } from './dto/update-classification-rule.dto';

@Controller('api/classification-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassificationRulesController {
  constructor(
    private readonly classificationRulesService: ClassificationRulesService,
  ) {}

  @Get()
  findAll() {
    return this.classificationRulesService.findAll();
  }

  // Phải khai trước @Get(':id') / @Patch(':id'): Express khớp theo thứ tự đăng
  // ký, nếu ':id' đứng trước thì "match" bị gán vào :id và ParseIntPipe trả 400.
  @Post('match')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.DEVELOPER)
  match(@Body() dto: MatchClassificationRulesDto) {
    return this.classificationRulesService.match(dto.text);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.classificationRulesService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateClassificationRuleDto) {
    return this.classificationRulesService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClassificationRuleDto,
  ) {
    return this.classificationRulesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.classificationRulesService.remove(id);
  }
}
