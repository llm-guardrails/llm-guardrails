/**
 * Bias Guard
 *
 * Detects biased language and stereotypes
 */

import type { TierResult } from '../types';
import { HybridGuard } from './base/HybridGuard';

export class BiasGuard extends HybridGuard {
  public readonly name = 'bias';

  protected detectL1(input: string): TierResult {
    let score = 0;
    const detections: string[] = [];

    // Gender stereotypes
    if (/(women|girls)\s+are\s+(not\s+good\s+at|bad\s+at|terrible\s+at)\s+(math|science|programming)/i.test(input)) {
      score = 0.8;
      detections.push('gender stereotype');
    }

    // Age bias
    if (/(old|elderly)\s+people\s+(are|can't|cannot)\s+(learn|understand|use)\s+(technology|computers)/i.test(input)) {
      score = 0.75;
      detections.push('age bias');
    }

    return {
      score,
      reason: detections.length > 0 ? `Bias detected: ${detections.join(', ')}` : undefined,
      metadata: { detections },
    };
  }

  protected detectL2(_input: string, context?: Record<string, unknown>): TierResult {
    const maxScore = (context?.l1 as TierResult)?.score || 0;
    return { score: maxScore };
  }
}
