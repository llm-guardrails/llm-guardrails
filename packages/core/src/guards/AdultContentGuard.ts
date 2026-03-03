/**
 * Adult Content Guard
 *
 * Detects NSFW and adult content
 */

import type { TierResult } from '../types';
import { HybridGuard } from './base/HybridGuard';
import { ADULT_CONTENT_PATTERNS } from '../utils/patterns';

export class AdultContentGuard extends HybridGuard {
  public readonly name = 'adult-content';

  protected detectL1(input: string): TierResult {
    let score = 0;
    const detections: string[] = [];

    // Check adult content patterns
    for (const pattern of ADULT_CONTENT_PATTERNS) {
      if (pattern.test(input)) {
        score = 0.8;
        detections.push('adult content');
        break;
      }
    }

    return {
      score,
      reason: detections.length > 0 ? `Adult content detected` : undefined,
      metadata: { detections },
    };
  }

  protected detectL2(_input: string, context?: Record<string, unknown>): TierResult {
    const maxScore = (context?.l1 as TierResult)?.score || 0;
    return { score: maxScore };
  }
}
