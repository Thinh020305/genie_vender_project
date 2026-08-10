import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { StatisticsService } from './statistics.service';

// [AI — HIGH PRIORITY] Route collision risk, not mentioned anywhere in the
// PDF: this controller registers "api/vendors" + "stats" (a STATIC path),
// while Cường's VendorsController registers "api/vendors" + ":id" (a
// DYNAMIC path) for GET /api/vendors/{id}. NestJS's default HTTP adapter
// (Express) matches routes in REGISTRATION ORDER, not by specificity — a
// GET request to /api/vendors/stats could be swallowed by /api/vendors/:id
// FIRST if VendorsModule is imported into app.module.ts before
// StatisticsModule, with "stats" bound as the :id param instead of hitting
// this controller at all.
// -> MUST MENTION TO CƯỜNG AND TEAM. Fix options: import StatisticsModule
//    before VendorsModule in app.module.ts, constrain :id with a regex/UUID
//    pipe so it can't match "stats", or keep this route on that ordering
//    contract permanently documented somewhere both of you will see it.
@Controller('api/vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('stats')
  // [AI] No @Roles() decorator — deliberate, same fallback used on the
  // classification-history GET endpoint: RolesGuard allows any
  // authenticated role when no roles metadata is set on the route, which
  // is what makes REVIEWER's read access work here without extra code.
  getVendorStats() {
    return this.statisticsService.getVendorStats();
  }
}
