import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getVendorStats() {
    // [AI] this.prisma.vendor — same blocker as the classification module:
    // no Vendor delegate exists in the generated Prisma client until
    // vendors.prisma is written and `prisma generate` reruns. This service
    // won't even compile against the current generated client.
    const [total, classificationGroups, locationGroups, serviceTypeGroups] =
      await Promise.all([
        this.prisma.vendor.count(),
        // [AI] "groupBy classification/location/serviceType" is spec text,
        // but Prisma's groupBy API shape (_count: { _all: true }) and the
        // decision to run all four queries in parallel via Promise.all are
        // both implementation choices, not spec content.
        this.prisma.vendor.groupBy({
          by: ['classification'],
          _count: { _all: true },
        }),
        this.prisma.vendor.groupBy({
          by: ['location'],
          _count: { _all: true },
        }),
        this.prisma.vendor.groupBy({
          by: ['serviceType'],
          _count: { _all: true },
        }),
      ]);

    // [AI] This entire response shape — total/byClassification/byLocation/
    // byServiceType as an object of arrays — is invented. The PDF only
    // says stats must cover "total, by classification, by location, by
    // service type"; it never specifies the JSON structure.
    // -> MENTION TO TEAM, especially if My's PPT/demo or a frontend mock
    //    already assumes some specific shape for this response.
    return {
      total,
      byClassification: classificationGroups.map((g) => ({
        classification: g.classification,
        count: g._count._all,
      })),
      byLocation: locationGroups.map((g) => ({
        location: g.location,
        count: g._count._all,
      })),
      byServiceType: serviceTypeGroups.map((g) => ({
        serviceType: g.serviceType,
        count: g._count._all,
      })),
    };
  }
}
