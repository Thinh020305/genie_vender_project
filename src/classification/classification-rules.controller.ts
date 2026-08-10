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

  /**
   * GET /api/classification-rules — đọc danh mục tiêu chí phân loại.
   *
   * Không gắn @Roles(): RolesGuard cho qua mọi vai trò đã xác thực khi route
   * không khai metadata. REVIEWER cần quyền đọc ở đây vì chính các tiêu chí này
   * làm cho một kết quả phân loại giải thích được.
   */
  @Get()
  findAll() {
    return this.classificationRulesService.findAll();
  }

  /**
   * Khai TRƯỚC @Get(':id') và @Patch(':id'). Express khớp route theo thứ tự
   * đăng ký, nên nếu ':id' đứng trước thì request tới
   * /api/classification-rules/match sẽ gán "match" vào tham số :id và
   * ParseIntPipe từ chối bằng 400 thay vì vào đúng handler này.
   */
  @Post('match')
  // 200 chứ không phải 201 mặc định của @Post: route này không tạo gì cả, chỉ
  // dùng POST vì đoạn text cần khớp quá dài để đưa vào query string.
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.DEVELOPER)
  match(@Body() dto: MatchClassificationRulesDto) {
    // Chỉ xem trước, không ghi gì. Muốn áp dụng kết quả thì phải gọi
    // PATCH /api/vendors/{id}/classification — đó mới là nơi ghi lịch sử thay
    // đổi phân loại.
    return this.classificationRulesService.match(dto.text);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.classificationRulesService.findOne(id);
  }

  /**
   * Ba route ghi dưới đây giới hạn cho ADMIN: một tiêu chí là cấu hình hệ
   * thống, nó đổi cách đánh giá MỌI vendor chứ không riêng một bản ghi. Chúng
   * cũng là đường duy nhất để đưa năm tiêu chí vào cơ sở dữ liệu.
   */
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
