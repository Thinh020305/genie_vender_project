import { Injectable } from '@nestjs/common';

import { VendorClassification } from '../generated/prisma/enums';

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
