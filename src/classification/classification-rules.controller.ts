import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';
import { Role } from '../generated/prisma/enums';
import { ClassificationRulesService } from './classification-rules.service';
import { CreateClassificationRuleDto } from './dto/create-classification-rule.dto';
import { MatchClassificationRulesDto } from './dto/match-classification-rules.dto';
import { QueryClassificationRulesDto } from './dto/query-classification-rules.dto';
import { UpdateClassificationRuleDto } from './dto/update-classification-rule.dto';

// [AI] "api/classification-rules" is its own top-level prefix, so unlike the
// three controllers already sharing "api/vendors" it has no route-collision
// exposure at all.
@Controller('api/classification-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassificationRulesController {
  constructor(
    private readonly classificationRulesService: ClassificationRulesService,
  ) {}

  // [AI] Writes are ADMIN-ONLY here, stricter than the ADMIN+DEVELOPER used on
  // vendor sources and summaries. Inferred from the role table: ADMIN
  // "manages members and system config", and a classification rule is system
  // config — it changes how EVERY vendor gets auto-classified, not just one
  // record. Not stated for these specific routes.
  // -> MENTION TO TEAM if DEVELOPER is expected to tune rules day to day.
  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateClassificationRuleDto) {
    return this.classificationRulesService.create(dto);
  }

  // [AI] No @Roles() on the read routes — RolesGuard's documented fallback
  // (no metadata => any authenticated role passes) is what gives REVIEWER
  // read access. Same pattern as the other controllers in this repo.
  @Get()
  findAll(@Query() query: QueryClassificationRulesDto) {
    return this.classificationRulesService.findAll(query);
  }

  // [AI] Declared BEFORE @Get(':id') on purpose. Express matches in
  // registration order, so if ':id' were registered first, a POST/GET to
  // /api/classification-rules/match would bind "match" as the :id param.
  // ParseBigIntPipe would then reject it as a 400 rather than routing here.
  // This is the same hazard statistics.controller.ts documents across
  // controllers — within a single controller it is at least fixable by
  // ordering, which is what this is.
  @Post('match')
  // [AI] 200 rather than the 201 Nest defaults to for @Post. This route
  // creates nothing — it is a POST only because the text to match against is
  // too large to sit in a query string.
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.DEVELOPER)
  match(@Body() dto: MatchClassificationRulesDto) {
    // [AI] PREVIEW ONLY. Returns RuleMatchResult and never writes to
    // vendor.classification or classification_histories — applying a result
    // stays a deliberate PATCH /api/vendors/{id}/classification by a human.
    // Structural, same as the separation llm.controller.ts keeps for rule 7:
    // this controller has no write path to either table.
    return this.classificationRulesService.match(dto.text);
  }

  @Get(':id')
  findOne(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.classificationRulesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: UpdateClassificationRuleDto,
  ) {
    return this.classificationRulesService.update(id, dto);
  }

  // [AI] Soft delete — the row stays in the table with deletedAt set. See the
  // reasoning in ClassificationRulesService.remove().
  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.classificationRulesService.remove(id);
  }
}
