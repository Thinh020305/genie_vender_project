import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateClassificationDto } from './dto/update-classification.dto';

@Injectable()
export class ClassificationHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async updateClassification(
    vendorId: string,
    dto: UpdateClassificationDto,
    changedById: string,
  ) {
    // [AI] this.prisma.vendor / this.prisma.classificationHistory — neither
    // delegate exists in the generated Prisma client yet (only User/Post
    // are generated as of the last uploaded repo state). This entire method
    // will not run until vendors.prisma lands and `prisma generate` reruns.
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor ${vendorId} not found`);
    }

    // [AI] Rejecting a same-value PATCH as a 400 is a judgment call, not
    // spec text. The spec only says "when classification is changed" —
    // read as implying history rows should represent real changes, but it
    // doesn't say what should happen if someone PATCHes to the same value.
    // -> MENTION TO TEAM: 400 error, or silent no-op 200?
    if (vendor.classification === dto.newClassification) {
      throw new BadRequestException(
        'New classification is identical to current classification',
      );
    }

    // [AI] $transaction wrapping both writes — spec says "automatically
    // record" but doesn't require atomicity explicitly. Used here so a
    // crash between the two writes can't leave a classification changed
    // with no corresponding history row (or vice versa).
    const [updatedVendor, historyRecord] = await this.prisma.$transaction([
      this.prisma.vendor.update({
        where: { id: vendorId },
        data: { classification: dto.newClassification },
      }),
      this.prisma.classificationHistory.create({
        data: {
          vendorId,
          changedById,
          previousClassification: vendor.classification,
          newClassification: dto.newClassification,
          reason: dto.reason,
        },
      }),
    ]);

    return { vendor: updatedVendor, history: historyRecord };
  }

  async getHistory(vendorId: string) {
    // [AI] No 404 check if vendorId doesn't exist — returns an empty array
    // instead. Spec doesn't specify this. Worth matching whatever behavior
    // Cường's GET /api/vendors/{id} uses, for consistency.
    // -> MENTION TO TEAM
    return this.prisma.classificationHistory.findMany({
      where: { vendorId },
      orderBy: { changedAt: 'desc' },
    });
  }
}
