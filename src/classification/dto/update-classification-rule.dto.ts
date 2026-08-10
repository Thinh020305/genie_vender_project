import { OmitType, PartialType } from '@nestjs/swagger';

import { CreateClassificationRuleDto } from './create-classification-rule.dto';

/**
 * Bỏ hẳn classificationName chứ không chỉ để tuỳ chọn. Đó là khoá tự nhiên của
 * danh mục, nên trỏ một dòng tiêu chí sang phân loại khác không phải là sửa —
 * đó là xoá một tiêu chí và tạo một tiêu chí khác, và làm âm thầm qua PATCH sẽ
 * để description/judgmentCriteria của tiêu chí cũ dính sang tiêu chí mới.
 */
export class UpdateClassificationRuleDto extends PartialType(
  OmitType(CreateClassificationRuleDto, ['classificationName'] as const),
) {}
