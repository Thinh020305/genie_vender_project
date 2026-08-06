import { Injectable } from '@nestjs/common';

import { VendorClassification } from '../generated/prisma/enums';

/**
 * Du lieu toi thieu ma thuat toan can de chon ra rule thang.
 *
 * Khai bao rieng thay vi dung model Prisma vi hai ly do:
 * - model ClassificationRule chua ton tai trong schema, matcher van can chay duoc ngay;
 * - matcher khong nen phu thuoc tang luu tru, nho vay test duoc bang object dung san.
 */
export interface MatchableRule {
  id: number;
  keyword: string;
  targetClassification: VendorClassification;
  priority: number;
  weight: number;
  createdAt: Date;
}

export interface RuleMatchResult {
  matchedRules: MatchableRule[];
  result: VendorClassification | null;
  reason: string;
}

/**
 * Thu tu thang theo CLAUDE.md 8.2: priority nho hon -> weight lon hon -> createdAt som hon.
 *
 * `id` la nac cuoi cung. Dac ta khong dinh nghia truong hop ca ba tieu chi tren cung bang
 * nhau, nhung van doi ket qua phai deterministic; neu de Array.sort tu xu ly thi ket qua
 * se phu thuoc thu tu DB tra ve - dung dieu ma 8.2 cam.
 */
const compareRules = (a: MatchableRule, b: MatchableRule): number => {
  if (a.priority !== b.priority) {
    return a.priority - b.priority;
  }

  if (a.weight !== b.weight) {
    return b.weight - a.weight;
  }

  const createdAtDiff = a.createdAt.getTime() - b.createdAt.getTime();

  if (createdAtDiff !== 0) {
    return createdAtDiff;
  }

  return a.id - b.id;
};

@Injectable()
export class RuleMatcherService {
  /**
   * Chon phan loai cho mot doan text dua tren bo luat truyen vao.
   *
   * Caller chiu trach nhiem loc san rule dang hieu luc (isActive = true, deletedAt = null):
   * matcher khong biet gi ve hai khai niem do, nho vay no test duoc ma khong can dung
   * du lieu "da xoa".
   *
   * Gia dinh: keyword da duoc chuan hoa va dai it nhat 2 ky tu - DTO va rang buoc DB
   * bao dam dieu nay truoc khi du lieu toi day.
   */
  match(rules: MatchableRule[], text: string): RuleMatchResult {
    const normalizedText = text.toLowerCase();

    const matchedRules = rules
      .filter((rule) => normalizedText.includes(rule.keyword.toLowerCase()))
      .sort(compareRules);

    if (matchedRules.length === 0) {
      return {
        matchedRules: [],
        result: null,
        reason: 'No rule matched. The vendor is left unclassified.',
      };
    }

    const winner = matchedRules[0];

    return {
      matchedRules,
      result: winner.targetClassification,
      reason:
        `Matched ${matchedRules.length} rule(s). ` +
        `Rule #${winner.id} ("${winner.keyword}") won ` +
        `with priority=${winner.priority}, weight=${winner.weight}.`,
    };
  }
}
