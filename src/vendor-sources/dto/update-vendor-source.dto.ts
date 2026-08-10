import { PartialType } from '@nestjs/swagger';

import { CreateVendorSourceDto } from './create-vendor-source.dto';

// [AI] Every field optional. There is no vendorId to omit any more — the
// vendor comes from the path on every Source API route, so a source can never
// be re-parented to a different vendor through this DTO.
//
// Backs "PATCH /api/vendors/{id}/sources/{sourceId} — Update source
// information". Note the service re-checks the Step 3.3 evidence rule against
// the MERGED row, not against this body: clearing a memo on a source that has
// no URL would otherwise leave a row with neither a URL nor a demo-data note.
export class UpdateVendorSourceDto extends PartialType(CreateVendorSourceDto) {}
