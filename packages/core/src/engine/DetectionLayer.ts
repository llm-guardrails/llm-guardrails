/**
 * Detection layer abstraction for L1/L2/L3 hybrid detection
 */

import type {
  DetectionTier,
  TierResult,
  HybridDetectionConfig,
  LLMProvider,
} from '../types';

/**
 * Default detection configuration presets
 */
export const DETECTION_PRESETS: Record<string, HybridDetectionConfig> = {
  basic: {
    tier1: { enabled: true, threshold: 0.9 },
    tier2: { enabled: false, threshold: 0.8 },
  },
  standard: {
    tier1: { enabled: true, threshold: 0.9 },
    tier2: { enabled: true, threshold: 0.7 },
  },
  advanced: {
    tier1: { enabled: true, threshold: 0.9 },
    tier2: { enabled: true, threshold: 0.7 },
    tier3: {
      enabled: false, // Requires LLM provider
      onlyIfSuspicious: true,
      costLimit: 0.01, // $0.01 per check
    },
  },
};

/**
 * Base class for hybrid detection layers
 */
export abstract class DetectionLayer {
  constructor(protected config: HybridDetectionConfig) {}

  /**
   * Run detection with L1/L2/L3 escalation
   */
  async detect(
    input: string,
    context?: Record<string, unknown>
  ): Promise<{
    blocked: boolean;
    tier: DetectionTier;
    result: TierResult;
    latency: number;
  }> {
    const startTime = Date.now();

    // L1: Heuristic (< 1ms)
    if (this.config.tier1.enabled) {
      const l1 = this.detectL1(input);

      if (l1.score >= this.config.tier1.threshold) {
        return {
          blocked: true,
          tier: 'L1',
          result: l1,
          latency: Date.now() - startTime,
        };
      }

      // Store L1 result for L2
      context = { ...context, l1 };
    }

    // L2: Pattern (< 5ms)
    if (this.config.tier2.enabled) {
      const l2 = this.detectL2(input, context);

      if (l2.score >= this.config.tier2.threshold) {
        return {
          blocked: true,
          tier: 'L2',
          result: l2,
          latency: Date.now() - startTime,
        };
      }

      // Store L2 result for L3
      context = { ...context, l2 };
    }

    // L3: LLM (50-200ms, only if suspicious and enabled)
    if (this.config.tier3?.enabled) {
      const l1Score = (context?.l1 as TierResult)?.score || 0;
      const l2Score = (context?.l2 as TierResult)?.score || 0;
      const maxScore = Math.max(l1Score, l2Score);

      // Only escalate to L3 if previous tiers found something suspicious
      if (!this.config.tier3.onlyIfSuspicious || maxScore > 0.5) {
        const l3 = await this.detectL3(input, context);

        if (l3.score >= 0.8) {
          // L3 has fixed threshold
          return {
            blocked: true,
            tier: 'L3',
            result: l3,
            latency: Date.now() - startTime,
          };
        }
      }
    }

    // Not blocked
    return {
      blocked: false,
      tier: this.config.tier2.enabled ? 'L2' : 'L1',
      result: { score: 0 },
      latency: Date.now() - startTime,
    };
  }

  /**
   * L1: Heuristic detection (< 1ms)
   * Simple rules, keyword matching, basic checks
   */
  protected abstract detectL1(input: string): TierResult;

  /**
   * L2: Pattern-based detection (< 5ms)
   * Regex patterns, compiled rules, entropy analysis
   */
  protected abstract detectL2(
    input: string,
    context?: Record<string, unknown>
  ): TierResult;

  /**
   * L3: LLM-based detection (50-200ms)
   * Deep analysis using language models
   */
  protected async detectL3(
    _input: string,
    _context?: Record<string, unknown>
  ): Promise<TierResult> {
    // Default implementation - subclasses can override
    return { score: 0, reason: 'L3 not implemented' };
  }

  /**
   * Call LLM provider (helper for L3 detection)
   */
  protected async callLLM(
    provider: LLMProvider | undefined,
    prompt: string
  ): Promise<string> {
    if (!provider) {
      throw new Error('LLM provider not configured');
    }

    const maxTokens = this.config.tier3?.costLimit
      ? Math.floor(this.config.tier3.costLimit * 100000)
      : 100;

    return await provider.complete(prompt, {
      maxTokens,
      temperature: 0,
    });
  }
}
