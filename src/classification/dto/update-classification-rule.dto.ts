import { OmitType, PartialType } from '@nestjs/swagger';

import { CreateClassificationRuleDto } from './create-classification-rule.dto';

// [AI] classificationName is OMITTED, not just optional. It is the natural key
// of the five-criterion catalog (@unique in the schema), so "re-pointing" an
// existing criterion row at a different classification is not an edit — it is
// deleting one criterion and creating another, and doing it silently through
// PATCH would leave the description/judgmentCriteria of the old criterion
// attached to the new one.
// -> Changing which classification a rule describes = DELETE + POST.
export class UpdateClassificationRuleDto extends PartialType(
  OmitType(CreateClassificationRuleDto, ['classificationName'] as const),
) {}
