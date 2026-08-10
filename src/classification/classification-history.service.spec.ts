import { ClassificationHistoryService } from './classification-history.service';

describe('ClassificationHistoryService', () => {
  it('throws BadRequestException when new classification equals current', async () => {
    const mockPrisma = {
      vendor: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: '1', classification: 'SI_COMPANY' }),
      },
      $transaction: jest.fn(),
    };
    const service = new ClassificationHistoryService(mockPrisma as any);
    await expect(
      service.updateClassification(
        '1',
        { newClassification: 'SI_COMPANY' } as any,
        'member-1',
      ),
    ).rejects.toThrow(
      'New classification is identical to current classification',
    );
  });
});
