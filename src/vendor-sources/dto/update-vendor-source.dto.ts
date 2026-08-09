import { OmitType, PartialType } from '@nestjs/swagger';

import { CreateVendorSourceDto } from './create-vendor-source.dto';

// [AI] vendorId is omitted, not just made optional: moving an existing source
// row to a different vendor via PATCH would silently rewrite that vendor's
// evidence trail. Re-parenting should be a delete + create so it is visible.
// Not spec text — docs/erd.md says nothing about update semantics.
// -> MENTION TO TEAM if the UI actually needs a "move to another vendor"
//    action.
export class UpdateVendorSourceDto extends PartialType(
  OmitType(CreateVendorSourceDto, ['vendorId'] as const),
) {}
