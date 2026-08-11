import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClassificationHistoryController } from './classification-history.controller';
import { ClassificationHistoryService } from './classification-history.service';
import { ClassificationRulesController } from './classification-rules.controller';
import { ClassificationRulesService } from './classification-rules.service';
import { RuleMatcherService } from './rule-matcher.service';

// [AI] classification-rules.* is now wired in. The previous comment here said
// it was deliberately left out to avoid ownership overlap on this folder —
// that no longer applies, the work was explicitly requested. Sơn's
// classification-history.* files are untouched.
//
// [AI] RuleMatcherService is registered for the first time. It was written and
// unit-tested (rule-matcher.service.spec.ts) but never listed as a provider,
// so nothing could inject it — ClassificationRulesService is its first
// consumer.
@Module({
  controllers: [ClassificationHistoryController, ClassificationRulesController],
  providers: [
    ClassificationHistoryService,
    ClassificationRulesService,
    RuleMatcherService,
    PrismaService,
  ],
  // [AI] Exported so the LLM module can compare its suggestion against the
  // deterministic rule match, rather than reloading the rules itself.
  exports: [ClassificationRulesService, RuleMatcherService],
})
export class ClassificationModule {}
