/**
 * Copyright Guard
 *
 * Detects potential copyright violations
 */

import type { TierResult } from '../types';
import { HybridGuard } from './base/HybridGuard';

export class CopyrightGuard extends HybridGuard {
  public readonly name = 'copyright';

  protected detectL1(input: string): TierResult {
    let score = 0;
    const detections: string[] = [];

    // Long exact quotes (likely copyrighted)
    const sentences = input.split(/[.!?]+/);
    const longSentences = sentences.filter(s => s.length > 100);

    if (longSentences.length >= 3) {
      score = 0.7;
      detections.push('long verbatim text');
    }

    // Copyright indicators
    if (/©|\(c\)|copyright\s+\d{4}/i.test(input)) {
      score = Math.max(score, 0.6);
      detections.push('copyright marker');
    }

    return {
      score,
      reason: detections.length > 0 ? `Copyright indicators: ${detections.join(', ')}` : undefined,
      metadata: { detections },
    };
  }

  protected detectL2(_input: string, context?: Record<string, unknown>): TierResult {
    const maxScore = (context?.l1 as TierResult)?.score || 0;
    return { score: maxScore };
  }
}
