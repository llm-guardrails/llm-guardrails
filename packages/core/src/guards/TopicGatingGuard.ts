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
import { getTopicGatingPrompt } from '../llm/prompts/topic-gating-template';

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

    // Validate configuration - need at least one configuration option
    const hasTopicDescriptions = guardConfig.allowedTopicsDescription || guardConfig.blockedTopicsDescription;
    const hasKeywords = guardConfig.blockedKeywords?.length || guardConfig.allowedKeywords?.length;

    if (!hasTopicDescriptions && !hasKeywords) {
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
    // Escape special regex characters and build patterns
    const patterns = keywords.map(keyword => {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Check if keyword contains non-word characters
      const hasNonWordChars = /[^\w\s]/.test(keyword);

      // Use word boundaries only for pure word keywords
      if (hasNonWordChars) {
        // For keywords with special chars, match as standalone tokens
        // Allow whitespace, punctuation, or string boundaries around them
        return `(?:^|\\s|\\b)(${escaped})(?=\\s|\\b|$|[.,!?;:])`;
      } else {
        // For normal words, use word boundaries
        return `\\b(${escaped})\\b`;
      }
    });

    const pattern = patterns.join('|');
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

  /**
   * L2: Pattern-based detection (<5ms)
   * Enhanced pattern matching for common off-topic categories
   */
  protected detectL2(
    input: string,
    context?: Record<string, unknown>
  ): TierResult {
    let maxScore = (context?.l1 as TierResult)?.score || 0;
    const detections: string[] = [];

    // Math patterns
    const mathPatterns = [
      /\d+\s*[\+\-\*\/÷×]\s*\d+/i, // Arithmetic: 2 + 2, 5 * 3
      /solve\s+(for\s+)?(x|y|equation)/i, // Solve for x, solve equation
      /calculate/i, // Calculate
      /\bequation\b/i, // Equation
      /integral|derivative|algebra/i, // Advanced math
    ];

    for (const pattern of mathPatterns) {
      if (pattern.test(input)) {
        maxScore = Math.max(maxScore, 0.9);
        detections.push('math pattern');
        break;
      }
    }

    // Coding patterns
    const codingPatterns = [
      /write\s+(a\s+)?(function|code|script|program)/i,
      /create\s+(a\s+)?(function|script|program)/i,
      /debug|debugging/i,
      /\b(javascript|python|java|c\+\+|typescript|ruby)\b/i,
      /implement\s+(a\s+)?algorithm/i,
    ];

    for (const pattern of codingPatterns) {
      if (pattern.test(input)) {
        maxScore = Math.max(maxScore, 0.9);
        detections.push('coding pattern');
        break;
      }
    }

    // Trivia patterns
    const triviaPatterns = [
      /what\s+is\s+the\s+capital\s+of/i,
      /who\s+(is|was)\s+the\s+(first|second|third)/i,
      /when\s+did\s+.+\s+(start|end|happen)/i,
      /which\s+(country|city|person)/i,
    ];

    for (const pattern of triviaPatterns) {
      if (pattern.test(input)) {
        maxScore = Math.max(maxScore, 0.9);
        detections.push('trivia pattern');
        break;
      }
    }

    // Business/product patterns (allowed - reduce score)
    const businessPatterns = [
      /\b(pricing|price|cost|fee)\b/i,
      /\b(order|purchase|buy)\b/i,
      /\b(support|help|assistance)\b/i,
      /\b(product|service|feature)\b/i,
    ];

    for (const pattern of businessPatterns) {
      if (pattern.test(input)) {
        maxScore = Math.min(maxScore, 0.3);
        detections.push('business pattern');
        break;
      }
    }

    // Combine with L1 detections (only boost if L1 found blocked keywords, not allowed)
    const l1Result = context?.l1 as TierResult;
    const l1Detections = l1Result?.metadata?.detections as string[] || [];
    const l1FoundBlocked = l1Detections.some(d => d.includes('blocked keyword'));

    if (l1FoundBlocked && detections.length >= 1 && !detections.includes('business pattern')) {
      // Both L1 and L2 found blocking indicators
      maxScore = Math.max(maxScore, 0.95);
    }

    return {
      score: maxScore,
      reason: detections.length > 0 ? detections.join(', ') : undefined,
      metadata: { detections },
    };
  }

  /**
   * L3: Semantic analysis using LLM (50-200ms)
   * Only called for edge cases where L1/L2 are uncertain
   */
  protected async detectL3(
    input: string,
    context?: Record<string, unknown>
  ): Promise<TierResult> {
    const provider = this.config.tier3?.provider;

    if (!provider) {
      // Graceful degradation: use L2 result
      const l2Score = (context?.l2 as TierResult)?.score || 0;
      return {
        score: l2Score,
        reason: 'L3 provider not configured, using L2 result',
        metadata: { fallback: 'L2' },
      };
    }

    // Skip L3 if no topic descriptions provided
    if (!this.guardConfig.allowedTopicsDescription && !this.guardConfig.blockedTopicsDescription) {
      const l2Score = (context?.l2 as TierResult)?.score || 0;
      return {
        score: l2Score,
        reason: 'No topic descriptions for L3, using L2 result',
        metadata: { fallback: 'L2' },
      };
    }

    const l1Score = (context?.l1 as TierResult)?.score || 0;
    const l2Score = (context?.l2 as TierResult)?.score || 0;

    // Generate prompt
    const prompt = getTopicGatingPrompt(
      input,
      this.guardConfig.allowedTopicsDescription,
      this.guardConfig.blockedTopicsDescription,
      l1Score,
      l2Score
    );

    try {
      const response = await this.callLegacyLLM(provider, prompt);
      const result = JSON.parse(response);

      // Validate response
      if (typeof result.blocked !== 'boolean') {
        throw new Error('Invalid LLM response: missing blocked field');
      }

      if (typeof result.confidence !== 'number') {
        throw new Error('Invalid LLM response: missing confidence field');
      }

      // If confidence is low, mark as uncertain
      if (result.confidence < 0.6) {
        return {
          score: 0.5,
          reason: 'Topic classification uncertain',
          metadata: {
            llmResult: result,
            requiresHumanReview: true,
          },
        };
      }

      return {
        score: result.blocked ? result.confidence : 0,
        reason: result.blocked ? result.reason : undefined,
        metadata: {
          detectedTopic: result.detectedTopic,
          llmConfidence: result.confidence,
        },
      };
    } catch (error) {
      console.error('L3 detection failed:', error);
      // Fall back to L2 result
      return {
        score: l2Score,
        reason: 'L3 detection error, using L2 result',
        metadata: { error: String(error), fallback: 'L2' },
      };
    }
  }
}
