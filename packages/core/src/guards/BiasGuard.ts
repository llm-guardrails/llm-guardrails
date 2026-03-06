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

    // Gender - emotional/leadership stereotypes
    if (/(women|girls)\s+are\s+(?:too\s+)?(emotional|irrational|hysterical)/i.test(input)) {
      score = Math.max(score, 0.85);
      detections.push('gender stereotype');
    }

    if (/(women|girls)\s+(?:are\s+too|can't|cannot)\s+.{0,20}(?:be\s+)?(?:leaders?|managers?|executives?|in\s+charge)/i.test(input)) {
      score = Math.max(score, 0.85);
      detections.push('gender stereotype');
    }

    // Age bias
    if (/(old|elderly)\s+people\s+(are|can't|cannot)\s+(learn|understand|use)\s+(technology|computers)/i.test(input)) {
      score = Math.max(score, 0.75);
      detections.push('age bias');
    }

    if (/(old|elderly)\s+people\s+can'?t\s+learn\s+(?:new\s+)?(technology|skills?|things?)/i.test(input)) {
      score = Math.max(score, 0.8);
      detections.push('age bias');
    }

    // Gender - "men are better at" stereotypes
    if (/(men|boys)\s+are\s+(?:naturally\s+)?(?:better\s+at|superior\s+at)\s+(\w+)/i.test(input)) {
      score = Math.max(score, 0.85);
      detections.push('gender stereotype');
    }

    // Gender - appearance-based discrimination
    if (/(she|he)\s+(?:probably|likely)\s+got\s+(?:the\s+)?\w+\s+because.{0,20}(?:pretty|handsome|attractive|looks)/i.test(input)) {
      score = Math.max(score, 0.9);
      detections.push('appearance-based bias');
    }

    // Age bias - young people stereotypes
    if (/(young|younger)\s+people\s+are\s+(?:lazy|entitled|irresponsible)/i.test(input)) {
      score = Math.max(score, 0.8);
      detections.push('age bias');
    }

    // Age bias - "too old/young for"
    if (/(he'?s|she'?s|they'?re)\s+too\s+(old|young)\s+for\s+(?:this|the)\s+\w+/i.test(input)) {
      score = Math.max(score, 0.85);
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
