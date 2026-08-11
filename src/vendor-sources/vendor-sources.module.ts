import { Module } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { VendorSourcesController } from './vendor-sources.controller';
import { VendorSourcesService } from './vendor-sources.service';

// [AI] PrismaService is re-declared as a provider here rather than pulled from
// a shared PrismaModule — copying what classification.module.ts,
// statistics.module.ts and llm.module.ts already do. Note the consequence:
// each module gets its OWN PrismaClient instance, so the app opens one
// connection pool per module. Fine at this size, but it is a real leak.
// -> MENTION TO TEAM: a single @Global() PrismaModule exporting one
//    PrismaService would fix it everywhere at once (Thịnh's infra scope).
@Module({
  controllers: [VendorSourcesController],
  providers: [VendorSourcesService, PrismaService],
  exports: [VendorSourcesService],
})
export class VendorSourcesModule {}
