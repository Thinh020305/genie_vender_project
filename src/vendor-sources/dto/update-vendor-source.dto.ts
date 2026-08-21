import { PartialType } from '@nestjs/swagger';

import { CreateVendorSourceDto } from './create-vendor-source.dto';

export class UpdateVendorSourceDto extends PartialType(CreateVendorSourceDto) {}
