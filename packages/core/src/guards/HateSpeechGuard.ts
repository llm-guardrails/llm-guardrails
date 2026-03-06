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

  protected detectL2(input: string, context?: Record<string, unknown>): TierResult {
    let maxScore = (context?.l1 as TierResult)?.score || 0;
    const detections: string[] = [];

    // Re-check all hate speech patterns in L2 for comprehensive coverage
    let patternMatches = 0;
    for (const pattern of HATE_SPEECH_PATTERNS) {
      if (pattern.test(input)) {
        patternMatches++;
        detections.push('hate speech pattern');
      }
    }

    // Multiple pattern matches = higher confidence
    if (patternMatches >= 2) {
      maxScore = Math.max(maxScore, 1.0);
    } else if (patternMatches === 1) {
      maxScore = Math.max(maxScore, 0.95);
    }

    // Dehumanizing language patterns
    if (/(?:like|are)\s+(?:animals?|vermin|parasites?|disease)/i.test(input)) {
      maxScore = Math.max(maxScore, 0.9);
      detections.push('dehumanizing language');
    }

    // Group-based targeting
    if (/all\s+\w+\s+are\s+(?:bad|evil|dangerous|the\s+same)/i.test(input)) {
      maxScore = Math.max(maxScore, 0.85);
      detections.push('group-based targeting');
    }

    // Hate targeting groups ("hate all X", "hate those X", "hate X people")
    if (/\bhate\s+(?:all|those|these)\s+(?:people|folks|individuals)?\s*(?:from|in|of)?/i.test(input)) {
      maxScore = Math.max(maxScore, 0.9);
      detections.push('hate targeting groups');
    }

    // Calls for expulsion/removal
    if (/should\s+be\s+(?:driven|kicked|forced|thrown)\s+out\s+(?:of|from)/i.test(input)) {
      maxScore = Math.max(maxScore, 0.9);
      detections.push('calls for expulsion');
    }

    // Ethnic cleansing language (with group placeholders or specific groups)
    if (/(?:need|must)\s+(?:to\s+)?be\s+(?:removed|expelled|driven|purged)\s+from/i.test(input)) {
      maxScore = Math.max(maxScore, 0.95);
      detections.push('ethnic cleansing');
    }

    if (/(?:we\s+)?must\s+(?:purge|cleanse|remove|eliminate)\s+(?:\[?\w+\]?|them)\s+from/i.test(input)) {
      maxScore = Math.max(maxScore, 0.95);
      detections.push('ethnic cleansing');
    }

    if (/\[?\w+\]?\s+have\s+no\s+place\s+(?:here|in)/i.test(input)) {
      maxScore = Math.max(maxScore, 0.9);
      detections.push('exclusionary language');
    }

    return {
      score: maxScore,
      reason: detections.length > 0 ? `Hate speech patterns: ${detections.join(', ')}` : undefined,
      metadata: { detections },
    };
  }
}
