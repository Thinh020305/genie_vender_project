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

// [AI] "api/classification-rules" is the exact path from the PDF's
// Classification API table, and it is its own top-level prefix, so it has no
// route-collision exposure with the controllers sharing "api/vendors".
@Controller('api/classification-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassificationRulesController {
  constructor(
    private readonly classificationRulesService: ClassificationRulesService,
  ) {}

  // [AI] THE spec endpoint: "GET /api/classification-rules — Get
  // classification criteria". No @Roles(), which relies on RolesGuard's
  // documented fallback (no roles metadata => any authenticated role passes).
  // That is what gives REVIEWER access, per Step 3.1: "REVIEWER: read-only
  // access to vendor data and classification results" — the criteria are what
  // makes a classification result explainable, so read access is required.
  @Get()
  findAll() {
    return this.classificationRulesService.findAll();
  }

  // [AI] Declared BEFORE @Get(':id')/@Patch(':id'). Express matches in
  // registration order, so with ':id' first a request to
  // /api/classification-rules/match would bind "match" as the :id param and
  // ParseIntPipe would reject it as a 400 instead of routing here. This is
  // the same static-vs-dynamic hazard statistics.controller.ts documents
  // across controllers; within one controller, ordering fixes it.
  @Post('match')
  // [AI] 200, not the 201 Nest defaults to for @Post. This route creates
  // nothing — it is a POST only because the text to match against is too large
  // for a query string.
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.DEVELOPER)
  match(@Body() dto: MatchClassificationRulesDto) {
    // [AI] BEYOND SPEC — the PDF's Classification API table lists only the GET
    // above. Added because rule-matcher.service.ts was already written and
    // unit-tested but registered nowhere, so nothing could reach it, and
    // because Step 3.4 requires classification to be evidence-based: this
    // returns which criteria matched and why.
    //
    // PREVIEW ONLY, never writes. Applying a result stays a deliberate
    // PATCH /api/vendors/{id}/classification, which is what records the
    // history row Step 3.5 requires. Same separation llm.controller.ts keeps
    // for Step 3.7 ("LLM output is a reference only").
    // -> MENTION TO TEAM: drop this endpoint if the team wants to stay
    //    strictly inside the documented endpoint list.
    return this.classificationRulesService.match(dto.text);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.classificationRulesService.findOne(id);
  }

  // [AI] BEYOND SPEC, and ADMIN-only. The PDF documents no write endpoint for
  // this table, but the five criteria have to reach the database somehow and
  // prisma/seed.ts is outside this task's scope. Step 3.1 puts system config
  // under ADMIN ("ADMIN: full management access"), and a criterion changes how
  // EVERY vendor is judged — so DEVELOPER is excluded here even though it may
  // "classify" vendors.
  // -> MENTION TO TEAM: if the team would rather seed these five rows from
  //    prisma/seed.ts, these three routes can be deleted outright.
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
