/**
 * PII (Personally Identifiable Information) Guard
 *
 * Detects and blocks common PII patterns:
 * - Email addresses
 * - Phone numbers
 * - Social Security Numbers
 * - Credit card numbers
 * - IP addresses
 * - And more...
 */

import type { TierResult, HybridDetectionConfig } from '../types';
import { HybridGuard } from './base/HybridGuard';
import { PII_PATTERNS } from '../utils/patterns';

/**
 * PII detection configuration
 */
export interface PIIGuardConfig {
  /** Patterns to check (default: all) */
  patterns?: (keyof typeof PII_PATTERNS)[];
  /** Whether to redact PII in output */
  redact?: boolean;
  /** Redaction placeholder */
  redactionPlaceholder?: string;
}

/**
 * PII Guard implementation
 */
export class PIIGuard extends HybridGuard {
  public readonly name = 'pii';
  private piiConfig: PIIGuardConfig;

  constructor(
    detectionConfig: HybridDetectionConfig,
    piiConfig: PIIGuardConfig = {}
  ) {
    super(detectionConfig);
    this.piiConfig = {
      patterns: piiConfig.patterns || Object.keys(PII_PATTERNS) as (keyof typeof PII_PATTERNS)[],
      redact: piiConfig.redact ?? false,
      redactionPlaceholder: piiConfig.redactionPlaceholder || '[REDACTED]',
    };
  }

  /**
   * L1: Quick heuristic checks (< 1ms)
   */
  protected detectL1(input: string): TierResult {
    let score = 0;
    const detections: string[] = [];
    const enabledPatterns = this.piiConfig.patterns!;

    // Quick checks for obvious patterns (only if pattern is enabled)
    // Email: @ symbol with domain
    if (enabledPatterns.includes('email') && /@\w+\.\w+/.test(input)) {
      score = Math.max(score, 0.8);
      detections.push('email-like pattern');
    }

    // Phone: sequence of digits with separators
    if (enabledPatterns.includes('phone') && /\d{3}[-.\s]\d{3}[-.\s]\d{4}/.test(input)) {
      score = Math.max(score, 0.85);
      detections.push('phone-like pattern');
    }

    // SSN: xxx-xx-xxxx
    if (enabledPatterns.includes('ssn') && /\d{3}-\d{2}-\d{4}/.test(input)) {
      score = 1.0;
      detections.push('SSN pattern');
    }

    // Credit card: 16 digits with optional separators
    if (enabledPatterns.includes('creditCard') && /(?:\d{4}[-\s]?){3}\d{4}/.test(input)) {
      score = Math.max(score, 0.9);
      detections.push('credit card pattern');
    }

    return {
      score,
      reason: detections.length > 0 ? `PII detected: ${detections.join(', ')}` : undefined,
      metadata: { detections },
    };
  }

  /**
   * L2: Comprehensive pattern matching (< 5ms)
   */
  protected detectL2(
    input: string,
    context?: Record<string, unknown>
  ): TierResult {
    const detections: Array<{ type: string; value: string }> = [];
    let maxScore = (context?.l1 as TierResult)?.score || 0;

    // Check each enabled PII pattern
    for (const patternName of this.piiConfig.patterns!) {
      const pattern = PII_PATTERNS[patternName];
      const matches = input.match(pattern);

      if (matches && matches.length > 0) {
        // Calculate score based on pattern type
        const score = this.getPatternScore(patternName);
        maxScore = Math.max(maxScore, score);

        // Record detections
        for (const match of matches) {
          detections.push({ type: patternName, value: match });
        }
      }
    }

    // Additional heuristic: multiple PII types = higher confidence
    if (detections.length >= 2) {
      maxScore = Math.max(maxScore, 0.95);
    }

    return {
      score: maxScore,
      reason:
        detections.length > 0
          ? `PII detected: ${detections.map((d) => d.type).join(', ')}`
          : undefined,
      metadata: {
        detections,
        redacted: this.piiConfig.redact ? this.redactPII(input) : undefined,
      },
    };
  }

  /**
   * Get confidence score for each pattern type
   */
  private getPatternScore(patternName: keyof typeof PII_PATTERNS): number {
    const scores: Record<string, number> = {
      ssn: 1.0,
      creditCard: 0.95,
      email: 0.85,
      phone: 0.8,
      ipAddress: 0.6, // Lower because IPs are common and not always PII
      zipCode: 0.5, // Lower because zip codes alone aren't sensitive
      driversLicense: 0.9,
      passport: 0.95,
      medicalRecord: 0.95,
      bankAccount: 0.9,
    };

    return scores[patternName] || 0.7;
  }

  /**
   * Redact PII from text
   */
  private redactPII(input: string): string {
    let redacted = input;

    for (const patternName of this.piiConfig.patterns!) {
      const pattern = PII_PATTERNS[patternName];
      redacted = redacted.replace(pattern, this.piiConfig.redactionPlaceholder!);
    }

    return redacted;
  }
}
