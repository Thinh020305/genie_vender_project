import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClassificationHistoryController } from './classification-history.controller';
import { ClassificationHistoryService } from './classification-history.service';

// [AI] GET /api/classification-rules is deliberately NOT wired into this
// module. Per Phân công công việc.docx, classification/classification-rules.*
// belongs to My, and Sơn's scope is classification-history.* only. Adding
// it here "since it's not built yet" would create ownership overlap on the
// same folder — confirm with My before anyone builds it.
// -> MENTION TO TEAM (do not build as a shortcut)
@Module({
  controllers: [ClassificationHistoryController],
  providers: [ClassificationHistoryService, PrismaService],
})
export class ClassificationModule {}
