import { ConflictException } from '@nestjs/common';
import { ClassificationRulesService } from './classification-rules.service';
import { RuleMatcherService } from './rule-matcher.service';
import { VendorClassification } from '../generated/prisma/enums';

describe('ClassificationRulesService.create', () => {
  it('maps a P2002 from create() to 409, not a raw 500', async () => {
    const mockPrisma = {
      classificationRule: {
        // pre-check sees nothing yet...
        findUnique: jest.fn().mockResolvedValue(null),
        // ...but by the time create() runs, another request already won.
        create: jest.fn().mockRejectedValue({ code: 'P2002' }),
      },
    };

    const service = new ClassificationRulesService(
      mockPrisma as any,
      new RuleMatcherService(),
    );

    await expect(
      service.create({
        classificationName: VendorClassification.PRODUCT_COMPANY,
      } as any),
    ).rejects.toThrow(ConflictException);
  });
});
