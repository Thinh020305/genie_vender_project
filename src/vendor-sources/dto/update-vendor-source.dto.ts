import { PartialType } from '@nestjs/swagger';

import { CreateVendorSourceDto } from './create-vendor-source.dto';

/**
 * Mọi trường đều tuỳ chọn. Không có vendorId để bỏ qua vì vendor luôn lấy từ
 * đường dẫn, nên một nguồn không thể bị chuyển sang vendor khác qua PATCH.
 *
 * Service kiểm lại quy tắc kiểm soát nguồn trên dòng SAU KHI gộp chứ không
 * phải trên body này.
 */
export class UpdateVendorSourceDto extends PartialType(CreateVendorSourceDto) {}
