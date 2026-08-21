// src/statistics/dto/vendor-stats-response.dto.ts
//
// [AI] These response DTOs did not exist before — added purely so
// @ApiResponse({ type: ... }) can generate a real schema instead of a
// blank body. The field names/shape match statistics.service.ts's
// invented response shape (see earlier flag: not in the PDF).
import { ApiProperty } from '@nestjs/swagger';

class ClassificationCountDto {
  @ApiProperty() classification!: string;
  @ApiProperty() count!: number;
}

class LocationCountDto {
  @ApiProperty() location!: string;
  @ApiProperty() count!: number;
}

class ServiceTypeCountDto {
  @ApiProperty() serviceType!: string;
  @ApiProperty() count!: number;
}

export class VendorStatsResponseDto {
  @ApiProperty() total!: number;
  @ApiProperty({ type: [ClassificationCountDto] })
  byClassification!: ClassificationCountDto[];
  @ApiProperty({ type: [LocationCountDto] }) byLocation!: LocationCountDto[];
  @ApiProperty({ type: [ServiceTypeCountDto] })
  byServiceType!: ServiceTypeCountDto[];
}
