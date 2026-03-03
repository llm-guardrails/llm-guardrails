/**
 * Hate Speech Guard
 *
 * Detects hate speech, slurs, and discriminatory language targeting:
 * - Protected characteristics (race, religion, ethnicity, gender, etc.)
 * - Derogatory slurs and epithets
 * - Calls for violence or discrimination
 * - Supremacist ideology
 */

import type { TierResult } from '../types';
import { HybridGuard } from './base/HybridGuard';
import { HATE_SPEECH_PATTERNS } from '../utils/patterns';

export class HateSpeechGuard extends HybridGuard {
  public readonly name = 'hate-speech';

  protected detectL1(input: string): TierResult {
    let score = 0;
    const detections: string[] = [];

    // Check hate speech patterns
    for (const pattern of HATE_SPEECH_PATTERNS) {
      if (pattern.test(input)) {
        score = 1.0;
        detections.push('hate speech pattern');
        break;
      }
    }

    // Violence incitement
    if (/(kill|destroy|eliminate)\s+all\s+(jews|muslims|christians|blacks|whites|asians|gays|immigrants)/i.test(input)) {
      score = 1.0;
      detections.push('violence incitement');
    }

    // Supremacist language
    if (/white\s+supremac/i.test(input) || /racial\s+purity/i.test(input)) {
      score = 1.0;
      detections.push('supremacist language');
    }

    return {
      score,
      reason: detections.length > 0 ? `Hate speech detected: ${detections.join(', ')}` : undefined,
      metadata: { detections },
    };
  }

  protected detectL2(_input: string, context?: Record<string, unknown>): TierResult {
    const maxScore = (context?.l1 as TierResult)?.score || 0;
    const detections: string[] = [];

    // Additional pattern matching would go here

    return {
      score: maxScore,
      reason: detections.length > 0 ? `Hate speech patterns: ${detections.join(', ')}` : undefined,
      metadata: { detections },
    };
  }
}
