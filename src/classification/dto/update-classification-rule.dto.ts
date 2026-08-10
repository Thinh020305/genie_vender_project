import { OmitType, PartialType } from '@nestjs/swagger';

import { CreateClassificationRuleDto } from './create-classification-rule.dto';

// Bỏ classificationName: đó là khoá tự nhiên của danh mục, đổi nó = xoá tiêu
// chí này và tạo tiêu chí khác.
export class UpdateClassificationRuleDto extends PartialType(
  OmitType(CreateClassificationRuleDto, ['classificationName'] as const),
) {}
