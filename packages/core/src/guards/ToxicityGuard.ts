/**
 * Toxicity Guard
 *
 * Detects toxic, offensive, and harmful language including:
 * - Personal attacks and insults
 * - Threats and intimidation
 * - Obscene language
 * - Identity attacks
 * - Severe toxicity
 * - Harassment
 */

import type { TierResult, HybridDetectionConfig } from '../types';
import { HybridGuard } from './base/HybridGuard';
import { TOXICITY_KEYWORDS } from '../utils/patterns';

/**
 * Toxicity detection configuration
 */
export interface ToxicityGuardConfig {
  /** Whether to detect profanity as toxic */
  includeProfanity?: boolean;
  /** Custom toxic keywords */
  customKeywords?: string[];
  /** Toxicity threshold (0-1) */
  toxicityThreshold?: number;
}

/**
 * Toxicity Guard implementation
 */
export class ToxicityGuard extends HybridGuard {
  public readonly name = 'toxicity';
  private toxicityConfig: Required<ToxicityGuardConfig>;
  private toxicKeywords: Set<string>;

  constructor(
    detectionConfig: HybridDetectionConfig,
    toxicityConfig: ToxicityGuardConfig = {}
  ) {
    super(detectionConfig);

    this.toxicityConfig = {
      includeProfanity: toxicityConfig.includeProfanity ?? true,
      customKeywords: toxicityConfig.customKeywords || [],
      toxicityThreshold: toxicityConfig.toxicityThreshold || 0.7,
    };

    // Build keyword set
    this.toxicKeywords = new Set([
      ...TOXICITY_KEYWORDS,
      ...this.toxicityConfig.customKeywords,
    ]);
  }

  /**
   * L1: Quick keyword matching (<1ms)
   */
  protected detectL1(input: string): TierResult {
    let score = 0;
    const detections: string[] = [];
    const lowerInput = input.toLowerCase();

    // Check for toxic keywords
    let keywordCount = 0;
    for (const keyword of this.toxicKeywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        keywordCount++;
        detections.push(keyword);
      }
    }

    // Score based on keyword count
    if (keywordCount >= 3) {
      score = 1.0;
    } else if (keywordCount === 2) {
      score = 0.85;
    } else if (keywordCount === 1) {
      score = 0.7;
    }

    // Check for personal attacks
    if (/you\s+(are|'re)\s+(stupid|dumb|idiot|moron|pathetic)/i.test(input)) {
      score = Math.max(score, 0.9);
      detections.push('personal attack');
    }

    // Check for threats
    if (/(I|we)\s+(will|'ll|gonna)\s+(kill|destroy|hurt|harm)/i.test(input)) {
      score = Math.max(score, 0.95);
      detections.push('threat');
    }

    if (/you\s+(should|deserve to)\s+(die|be killed)/i.test(input)) {
      score = Math.max(score, 1.0);
      detections.push('death threat');
    }

    // Check for harassment
    if (/shut\s+up/i.test(input)) {
      score = Math.max(score, 0.6);
      detections.push('harassment');
    }

    // All caps (often indicates yelling/aggression)
    const words = input.split(/\s+/);
    const capsWords = words.filter((w) => w.length > 3 && w === w.toUpperCase());
    if (capsWords.length >= 3) {
      score = Math.max(score, 0.5);
      detections.push('excessive caps');
    }

    // Excessive punctuation (!!!, ???)
    if (/[!?]{3,}/.test(input)) {
      score = Math.max(score, 0.4);
      detections.push('aggressive punctuation');
    }

    return {
      score,
      reason:
        detections.length > 0
          ? `Toxic content detected: ${detections.slice(0, 3).join(', ')}`
          : undefined,
      metadata: { detections, keywordCount },
    };
  }

  /**
   * L2: Pattern-based detection (<5ms)
   */
  protected detectL2(
    input: string,
    context?: Record<string, unknown>
  ): TierResult {
    let maxScore = (context?.l1 as TierResult)?.score || 0;
    const detections: string[] = [];

    // Insults and name-calling
    const insultPatterns = [
      /\b(idiot|moron|stupid|dumb|pathetic|loser|worthless)\b/i,
      /\b(scum|trash|garbage|waste)\s+of\s+(space|life)/i,
      /piece\s+of\s+(shit|crap|garbage)/i,
    ];

    for (const pattern of insultPatterns) {
      if (pattern.test(input)) {
        maxScore = Math.max(maxScore, 0.8);
        detections.push('insult');
        break;
      }
    }

    // Profanity (if enabled)
    if (this.toxicityConfig.includeProfanity) {
      if (/\b(fuck|shit|damn|hell|ass)\w*\b/i.test(input)) {
        maxScore = Math.max(maxScore, 0.7);
        detections.push('profanity');
      }
    }

    // Derogatory terms
    if (/\b(disgusting|revolting|repulsive|vile|filthy)\b/i.test(input)) {
      maxScore = Math.max(maxScore, 0.75);
      detections.push('derogatory');
    }

    // Dismissive/hostile language
    const hostilePatterns = [
      /nobody\s+cares\s+about\s+you/i,
      /go\s+away/i,
      /leave\s+(me|us)\s+alone/i,
      /get\s+(lost|out)/i,
    ];

    for (const pattern of hostilePatterns) {
      if (pattern.test(input)) {
        maxScore = Math.max(maxScore, 0.65);
        detections.push('hostile');
        break;
      }
    }

    // Threats of violence
    const threatPatterns = [
      /\b(kill|murder|hurt|harm|attack|destroy|beat)\s+(you|them|him|her)/i,
      /I('ll|will)\s+(kill|hurt|destroy)/i,
      /watch\s+your\s+back/i,
    ];

    for (const pattern of threatPatterns) {
      if (pattern.test(input)) {
        maxScore = Math.max(maxScore, 0.95);
        detections.push('threat of violence');
        break;
      }
    }

    // Cyberbullying indicators
    if (/everyone\s+hates\s+you/i.test(input)) {
      maxScore = Math.max(maxScore, 0.85);
      detections.push('cyberbullying');
    }

    // Severe toxicity (combination of factors)
    const l1Detections = (context?.l1 as TierResult)?.metadata?.detections as string[] || [];
    if (l1Detections.length >= 2 && detections.length >= 1) {
      maxScore = Math.max(maxScore, 0.9);
    }

    return {
      score: maxScore,
      reason:
        detections.length > 0
          ? `Toxic patterns detected: ${detections.join(', ')}`
          : undefined,
      metadata: { detections, severity: maxScore >= 0.9 ? 'high' : 'moderate' },
    };
  }

  /**
   * L3: LLM-based toxicity classification (optional)
   */
  protected async detectL3(
    input: string,
    context?: Record<string, unknown>
  ): Promise<TierResult> {
    const provider = this.config.tier3?.provider;

    if (!provider) {
      return { score: 0, reason: 'L3 provider not configured' };
    }

    const l1Score = (context?.l1 as TierResult)?.score || 0;
    const l2Score = (context?.l2 as TierResult)?.score || 0;

    const prompt = `You are a content moderation AI detecting toxic and harmful language.

Analyze this text for toxicity:

"""
${input.substring(0, 1000)}
"""

Previous detection scores:
- Heuristic (L1): ${(l1Score * 100).toFixed(0)}%
- Pattern (L2): ${(l2Score * 100).toFixed(0)}%

Consider:
1. Personal attacks and insults
2. Threats and intimidation
3. Harassment and bullying
4. Hate speech or identity attacks
5. Severe toxicity
6. Context and intent

Respond with JSON only:
{
  "isToxic": true/false,
  "confidence": 0.0-1.0,
  "reason": "brief explanation",
  "toxicityTypes": ["type1", "type2"],
  "severity": "low|moderate|high|severe"
}`;

    try {
      const response = await this.callLLM(provider, prompt);
      const result = JSON.parse(response);

      return {
        score: result.isToxic ? result.confidence : 0,
        reason: result.isToxic ? result.reason : undefined,
        metadata: {
          toxicityTypes: result.toxicityTypes,
          severity: result.severity,
          llmConfidence: result.confidence,
        },
      };
    } catch (error) {
      console.error('L3 detection failed:', error);
      return {
        score: 0,
        reason: 'L3 detection error',
        metadata: { error: String(error) },
      };
    }
  }
}
