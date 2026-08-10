import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma/enums';
import { ClassificationHistoryService } from './classification-history.service';
import { UpdateClassificationDto } from './dto/update-classification.dto';

// [AI] Base path "api/vendors" — spec gives the full route strings but
// never says which controller file/class each route lives in. Cường's
// VendorsController will very likely also use "api/vendors" as its prefix
// for CRUD. NestJS allows two controllers to share a prefix as long as no
// exact method+path collides, but this needs a quick sanity check once
// both controllers exist side by side.
// -> MENTION TO TEAM
@Controller('api/vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassificationHistoryController {
  constructor(
    private readonly classificationHistoryService: ClassificationHistoryService,
  ) {}

  @Patch(':id/classification')
  @Roles(Role.ADMIN, Role.DEVELOPER)
  updateClassification(
    @Param('id') id: string,
    @Body() dto: UpdateClassificationDto,
    // [AI] JwtPayload.sub is typed `number` in
    // common/interfaces/jwt-payload.interface.ts, but this file assumes
    // changedById is a String (matching the uuid Member.id assumption from
    // classification-history.prisma). TypeScript won't necessarily flag
    // this at compile time — CurrentUser's decorator loses that type
    // checking — but at runtime this would insert a number where Prisma
    // expects a String once Member.id's real type is settled.
    // -> MUST CONFIRM WITH THỊNH before this is safe to run
    @CurrentUser('sub') changedById: string,
  ) {
    return this.classificationHistoryService.updateClassification(
      id,
      dto,
      changedById,
    );
  }

  @Get(':id/classification-history')
  // [AI] No @Roles() decorator here is intentional — RolesGuard treats
  // "no roles metadata" as "allow any authenticated role," which is what
  // makes REVIEWER's read access work. That fallback behavior lives inside
  // roles.guard.ts's own logic, not stated anywhere in the spec text.
  getHistory(@Param('id') id: string) {
    return this.classificationHistoryService.getHistory(id);
  }
}
