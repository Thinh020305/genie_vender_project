import { Test, TestingModule } from '@nestjs/testing';

import { VendorClassification } from '../generated/prisma/enums';
import { MatchableRule, RuleMatcherService } from './rule-matcher.service';

const BASE_DATE = new Date('2026-01-01T00:00:00.000Z');

const createRule = (overrides: Partial<MatchableRule> = {}): MatchableRule => ({
  id: 1,
  keyword: 'outsourcing',
  targetClassification: VendorClassification.OUTSOURCING_VENDOR,
  priority: 100,
  weight: 1,
  createdAt: BASE_DATE,
  ...overrides,
});

describe('RuleMatcherService', () => {
  let service: RuleMatcherService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RuleMatcherService],
    }).compile();

    service = module.get<RuleMatcherService>(RuleMatcherService);
  });

  describe('khi khong co rule nao khop', () => {
    it('tra ve null voi mang rule rong', () => {
      const outcome = service.match([], 'mot cong ty outsourcing');

      expect(outcome.result).toBeNull();
      expect(outcome.matchedRules).toEqual([]);
    });

    it('tra ve null chu khong gan gia tri mac dinh', () => {
      const rules = [createRule({ keyword: 'fintech' })];

      const outcome = service.match(rules, 'mot cong ty gia cong phan mem');

      expect(outcome.result).toBeNull();
      expect(outcome.matchedRules).toEqual([]);
    });

    it('tra ve null voi text rong', () => {
      const rules = [createRule({ keyword: 'outsourcing' })];

      const outcome = service.match(rules, '');

      expect(outcome.result).toBeNull();
    });
  });

  describe('khi co rule khop', () => {
    it('tra ve rule duy nhat khop', () => {
      const rules = [
        createRule({
          id: 7,
          keyword: 'erp',
          targetClassification: VendorClassification.SI_COMPANY,
        }),
      ];

      const outcome = service.match(rules, 'trien khai he thong erp');

      expect(outcome.result).toBe(VendorClassification.SI_COMPANY);
      expect(outcome.matchedRules).toHaveLength(1);
      expect(outcome.matchedRules[0].id).toBe(7);
    });

    it('khop khong phan biet hoa thuong', () => {
      const rules = [createRule({ keyword: 'outsourcing' })];

      const outcome = service.match(rules, 'CONG TY OUTSOURCING HANG DAU');

      expect(outcome.result).toBe(VendorClassification.OUTSOURCING_VENDOR);
    });

    it('khop ca khi keyword luu trong DB chua duoc viet thuong', () => {
      const rules = [createRule({ keyword: 'OutSourcing' })];

      const outcome = service.match(rules, 'cong ty outsourcing hang dau');

      expect(outcome.result).toBe(VendorClassification.OUTSOURCING_VENDOR);
    });

    it('khop khi keyword nam giua cau', () => {
      const rules = [
        createRule({
          keyword: 'consulting',
          targetClassification: VendorClassification.CONSULTING_IT_SERVICE,
        }),
      ];

      const outcome = service.match(
        rules,
        'chung toi cung cap dich vu consulting cho doanh nghiep',
      );

      expect(outcome.result).toBe(VendorClassification.CONSULTING_IT_SERVICE);
    });
  });

  describe('thu tu uu tien khi nhieu rule cung khop', () => {
    it('priority nho hon thang', () => {
      const rules = [
        createRule({
          id: 1,
          keyword: 'erp',
          targetClassification: VendorClassification.SI_COMPANY,
          priority: 200,
        }),
        createRule({
          id: 2,
          keyword: 'outsourcing',
          targetClassification: VendorClassification.OUTSOURCING_VENDOR,
          priority: 50,
        }),
      ];

      const outcome = service.match(
        rules,
        'cong ty outsourcing trien khai erp',
      );

      expect(outcome.result).toBe(VendorClassification.OUTSOURCING_VENDOR);
      expect(outcome.matchedRules[0].id).toBe(2);
    });

    it('priority bang nhau thi weight lon hon thang', () => {
      const rules = [
        createRule({
          id: 1,
          keyword: 'erp',
          targetClassification: VendorClassification.SI_COMPANY,
          priority: 100,
          weight: 10,
        }),
        createRule({
          id: 2,
          keyword: 'outsourcing',
          targetClassification: VendorClassification.OUTSOURCING_VENDOR,
          priority: 100,
          weight: 80,
        }),
      ];

      const outcome = service.match(
        rules,
        'cong ty outsourcing trien khai erp',
      );

      expect(outcome.result).toBe(VendorClassification.OUTSOURCING_VENDOR);
      expect(outcome.matchedRules[0].id).toBe(2);
    });

    it('priority va weight bang nhau thi createdAt som hon thang', () => {
      const rules = [
        createRule({
          id: 1,
          keyword: 'erp',
          targetClassification: VendorClassification.SI_COMPANY,
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
        }),
        createRule({
          id: 2,
          keyword: 'outsourcing',
          targetClassification: VendorClassification.OUTSOURCING_VENDOR,
          createdAt: new Date('2026-02-01T00:00:00.000Z'),
        }),
      ];

      const outcome = service.match(
        rules,
        'cong ty outsourcing trien khai erp',
      );

      expect(outcome.result).toBe(VendorClassification.OUTSOURCING_VENDOR);
      expect(outcome.matchedRules[0].id).toBe(2);
    });

    it('ca ba tieu chi bang nhau thi ket qua van on dinh', () => {
      const rules = [
        createRule({
          id: 9,
          keyword: 'erp',
          targetClassification: VendorClassification.SI_COMPANY,
        }),
        createRule({
          id: 4,
          keyword: 'outsourcing',
          targetClassification: VendorClassification.OUTSOURCING_VENDOR,
        }),
      ];

      const outcome = service.match(
        rules,
        'cong ty outsourcing trien khai erp',
      );

      expect(outcome.matchedRules[0].id).toBe(4);
    });

    it('mot keyword tro toi nhieu classification thi priority quyet dinh', () => {
      const rules = [
        createRule({
          id: 1,
          keyword: 'software',
          targetClassification: VendorClassification.PRODUCT_COMPANY,
          priority: 300,
        }),
        createRule({
          id: 2,
          keyword: 'software',
          targetClassification: VendorClassification.OUTSOURCING_VENDOR,
          priority: 10,
        }),
      ];

      const outcome = service.match(rules, 'cong ty software viet nam');

      expect(outcome.result).toBe(VendorClassification.OUTSOURCING_VENDOR);
      expect(outcome.matchedRules).toHaveLength(2);
    });

    it('tra ve matchedRules da sap xep theo thu tu thang', () => {
      const rules = [
        createRule({ id: 1, keyword: 'erp', priority: 300 }),
        createRule({ id: 2, keyword: 'outsourcing', priority: 100 }),
        createRule({ id: 3, keyword: 'consulting', priority: 200 }),
      ];

      const outcome = service.match(rules, 'outsourcing va consulting va erp');

      expect(outcome.matchedRules.map((rule) => rule.id)).toEqual([2, 3, 1]);
    });
  });

  describe('tinh deterministic', () => {
    const buildRules = (): MatchableRule[] => [
      createRule({
        id: 1,
        keyword: 'erp',
        targetClassification: VendorClassification.SI_COMPANY,
        priority: 100,
        weight: 50,
      }),
      createRule({
        id: 2,
        keyword: 'outsourcing',
        targetClassification: VendorClassification.OUTSOURCING_VENDOR,
        priority: 100,
        weight: 50,
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
      }),
      createRule({
        id: 3,
        keyword: 'consulting',
        targetClassification: VendorClassification.CONSULTING_IT_SERVICE,
        priority: 100,
        weight: 50,
      }),
    ];

    const TEXT = 'cong ty outsourcing consulting va erp';

    it('dao nguoc thu tu dau vao van cho cung ket qua', () => {
      const original = service.match(buildRules(), TEXT);
      const reversed = service.match(buildRules().reverse(), TEXT);

      expect(reversed.result).toBe(original.result);
      expect(reversed.matchedRules.map((rule) => rule.id)).toEqual(
        original.matchedRules.map((rule) => rule.id),
      );
    });

    it('xao tron thu tu dau vao van cho cung ket qua', () => {
      const original = service.match(buildRules(), TEXT);

      const shuffled = buildRules();
      const [first] = shuffled.splice(1, 1);
      shuffled.push(first);

      const outcome = service.match(shuffled, TEXT);

      expect(outcome.result).toBe(original.result);
      expect(outcome.matchedRules.map((rule) => rule.id)).toEqual(
        original.matchedRules.map((rule) => rule.id),
      );
    });

    it('khong lam thay doi mang rule truyen vao', () => {
      const rules = buildRules();
      const idsBefore = rules.map((rule) => rule.id);

      service.match(rules, TEXT);

      expect(rules.map((rule) => rule.id)).toEqual(idsBefore);
    });
  });
});
