/**
 * Profanity Guard
 *
 * Detects profanity and obscene language
 */

import type { TierResult, HybridDetectionConfig } from '../types';
import { HybridGuard } from './base/HybridGuard';

export class ProfanityGuard extends HybridGuard {
  public readonly name = 'profanity';
  private profaneWords: Set<string>;

  constructor(detectionConfig: HybridDetectionConfig) {
    super(detectionConfig);

    // Basic profanity list (extend as needed)
    this.profaneWords = new Set([
      'fuck', 'shit', 'damn', 'hell', 'ass', 'bitch',
      'bastard', 'crap', 'piss', 'dick', 'cock',
    ]);
  }

  protected detectL1(input: string): TierResult {
    let score = 0;
    let count = 0;
    const lowerInput = input.toLowerCase();

    for (const word of this.profaneWords) {
      const regex = new RegExp(`\\b${word}\\w*\\b`, 'gi');
      const matches = lowerInput.match(regex);
      if (matches) {
        count += matches.length;
      }
    }

    if (count >= 3) score = 0.9;
    else if (count === 2) score = 0.75;
    else if (count === 1) score = 0.6;

    return {
      score,
      reason: count > 0 ? `Profanity detected (${count} instances)` : undefined,
      metadata: { count },
    };
  }

  protected detectL2(_input: string, context?: Record<string, unknown>): TierResult {
    const maxScore = (context?.l1 as TierResult)?.score || 0;
    return { score: maxScore };
  }
}
