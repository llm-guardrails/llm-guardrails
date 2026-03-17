/**
 * Topic Gating Guard
 *
 * Detects off-topic or domain-inappropriate requests including:
 * - Math problems and calculations
 * - Coding and programming questions
 * - Trivia and general knowledge
 * - Any topic outside allowed business scope
 */

import type { TierResult, HybridDetectionConfig } from '../types';
import { HybridGuard } from './base/HybridGuard';

/**
 * Topic gating configuration
 */
export interface TopicGatingGuardConfig {
  /** Semantic description of allowed topics (used by L3 LLM) */
  allowedTopicsDescription?: string;

  /** Semantic description of blocked topics (used by L3 LLM) */
  blockedTopicsDescription?: string;

  /** Keyword hints for fast L1/L2 filtering of blocked topics */
  blockedKeywords?: string[];

  /** Keyword hints for fast L1/L2 filtering of allowed topics */
  allowedKeywords?: string[];

  /** Gating mode */
  mode?: 'block-off-topic' | 'allow-only-topics';

  /** Case-sensitive keyword matching */
  caseSensitive?: boolean;
}

/**
 * Topic Gating Guard implementation
 */
export class TopicGatingGuard extends HybridGuard {
  public readonly name = 'topic-gating';
  private guardConfig: Required<TopicGatingGuardConfig>;
  private blockedKeywordsRegex?: RegExp;
  private allowedKeywordsRegex?: RegExp;

  constructor(
    detectionConfig: HybridDetectionConfig,
    guardConfig: TopicGatingGuardConfig = {}
  ) {
    super(detectionConfig);

    // Validate configuration
    if (!guardConfig.allowedTopicsDescription &&
        !guardConfig.blockedTopicsDescription &&
        !guardConfig.blockedKeywords?.length &&
        !guardConfig.allowedKeywords?.length) {
      throw new Error(
        'TopicGatingGuard: Must provide either topic descriptions or keywords'
      );
    }

    this.guardConfig = {
      allowedTopicsDescription: guardConfig.allowedTopicsDescription || '',
      blockedTopicsDescription: guardConfig.blockedTopicsDescription || '',
      blockedKeywords: guardConfig.blockedKeywords || [],
      allowedKeywords: guardConfig.allowedKeywords || [],
      mode: guardConfig.mode || 'block-off-topic',
      caseSensitive: guardConfig.caseSensitive ?? false,
    };

    // Compile keywords into efficient regex patterns
    if (this.guardConfig.blockedKeywords.length > 0) {
      this.blockedKeywordsRegex = this.compileKeywords(
        this.guardConfig.blockedKeywords,
        this.guardConfig.caseSensitive
      );
    }

    if (this.guardConfig.allowedKeywords.length > 0) {
      this.allowedKeywordsRegex = this.compileKeywords(
        this.guardConfig.allowedKeywords,
        this.guardConfig.caseSensitive
      );
    }
  }

  /**
   * Compile keywords into efficient regex pattern
   */
  private compileKeywords(keywords: string[], caseSensitive: boolean): RegExp {
    // Escape special regex characters
    const escapedKeywords = keywords.map(keyword =>
      keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );

    // Create alternation pattern with word boundaries
    const pattern = `\\b(${escapedKeywords.join('|')})\\b`;
    const flags = caseSensitive ? 'g' : 'gi';

    return new RegExp(pattern, flags);
  }

  /**
   * L1: Quick heuristic checks (<1ms)
   * Fast keyword-based detection for obvious topic violations
   */
  protected detectL1(input: string): TierResult {
    let score = 0;
    const detections: string[] = [];

    // Check allowed keywords first (higher priority)
    if (this.allowedKeywordsRegex?.test(input)) {
      score = 0.0; // Definitely allowed
      detections.push('allowed keyword detected');
      return {
        score,
        reason: detections.join(', '),
        metadata: { detections },
      };
    }

    // Check blocked keywords
    if (this.blockedKeywordsRegex) {
      const matches = input.match(this.blockedKeywordsRegex);
      if (matches && matches.length > 0) {
        score = 1.0; // Definitely blocked
        detections.push(`blocked keyword: ${matches[0]}`);
      }
    }

    return {
      score,
      reason: detections.length > 0 ? detections.join(', ') : undefined,
      metadata: { detections },
    };
  }

  protected detectL2(input: string, context?: Record<string, unknown>): TierResult {
    return { score: 0 };
  }

  protected async detectL3(
    input: string,
    context?: Record<string, unknown>
  ): Promise<TierResult> {
    return { score: 0 };
  }
}
