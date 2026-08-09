import { PartialType } from '@nestjs/swagger';

import { CreateClassificationRuleDto } from './create-classification-rule.dto';

// [AI] Every field is optional, including keyword and targetClassification —
// unlike UpdateVendorSourceDto, which omits vendorId. Editing a rule's keyword
// or target is a normal admin action here (the rule keeps its identity and its
// audit timestamps), whereas re-parenting a source row rewrites another
// vendor's evidence trail.
// -> NOTE: changing keyword/targetClassification can collide with the
//    @@unique([keyword, targetClassification]) constraint. The service catches
//    that and returns 409 rather than letting Prisma's P2002 fall through as
//    a 500.
export class UpdateClassificationRuleDto extends PartialType(
  CreateClassificationRuleDto,
) {}
