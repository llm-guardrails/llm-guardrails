/**
 * Detection layer abstraction for L1/L2/L3 hybrid detection
 */

import type {
  DetectionTier,
  TierResult,
  HybridDetectionConfig,
  LLMProvider,
  LLMProviderV2,
  LLMConfig,
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
  protected name: string = 'unknown';
  protected llmConfig?: LLMConfig;

  constructor(
    protected config: HybridDetectionConfig,
    options?: {
      name?: string;
      llmConfig?: LLMConfig;
    }
  ) {
    if (options?.name) {
      this.name = options.name;
    }
    if (options?.llmConfig) {
      this.llmConfig = options.llmConfig;
    }
  }

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
    input: string,
    context?: Record<string, unknown>
  ): Promise<TierResult> {
    // Try to use enhanced LLM config first
    if (this.llmConfig?.enabled && this.llmConfig.provider) {
      try {
        const budgetTracker = this.llmConfig.budgetTracker;
        const sessionId = (context as any)?.sessionId || 'default';

        // Check budget before calling
        if (budgetTracker) {
          const estimatedCost = 0.0002; // Rough estimate
          if (!budgetTracker.canAfford(sessionId, estimatedCost)) {
            // Budget exceeded
            const onBudgetExceeded =
              this.llmConfig.budget?.onBudgetExceeded || 'warn';

            if (onBudgetExceeded === 'block') {
              return { score: 1.0, reason: 'Budget exceeded (blocking)' };
            } else if (onBudgetExceeded === 'allow') {
              return { score: 0, reason: 'Budget exceeded (allowing)' };
            }
            // 'warn' - skip L3 but don't block
            return { score: 0, reason: 'Budget exceeded (skipping L3)' };
          }
        }

        // Use enhanced LLMProviderV2 interface
        const provider = this.llmConfig.provider as LLMProviderV2;

        // Check if provider has validate method (V2 interface)
        if (typeof provider.validate === 'function') {
          const result = await provider.validate(input, this.name, {
            temperature: 0,
            maxTokens: 150,
            timeout: 5000,
          });

          // Record actual cost
          if (budgetTracker && result.metadata?.cost) {
            budgetTracker.recordCall(result.metadata.cost, sessionId);

            // Check if alert threshold reached
            if (budgetTracker.shouldAlert(sessionId)) {
              console.warn(
                `LLM budget alert threshold reached for session ${sessionId}`
              );
            }
          }

          return {
            score: result.blocked ? 1.0 : result.confidence,
            reason: result.reason,
            metadata: result.metadata,
          };
        }
      } catch (error) {
        console.error(`L3 detection failed for ${this.name}:`, error);

        // Use fallback behavior
        const fallback = this.llmConfig.fallback?.onError || 'use-l2';
        if (fallback === 'block') {
          return { score: 1.0, reason: 'L3 error (fail-closed)' };
        } else if (fallback === 'allow') {
          return { score: 0, reason: 'L3 error (fail-open)' };
        }
        // 'use-l2' - return L2 result
        const l2Score = (context?.l2 as TierResult)?.score || 0;
        return { score: l2Score, reason: 'L3 error (using L2 result)' };
      }
    }

    // Fall back to legacy LLM provider (tier3.provider)
    const legacyProvider = this.config.tier3?.provider;
    if (legacyProvider) {
      try {
        // Generate a simple prompt for legacy provider
        const prompt = `Analyze the following text for potential violations of ${this.name} guardrail. Respond with a confidence score (0-1) and reason.

Text: ${input}

Response format:
Score: <0-1>
Reason: <explanation>`;

        const response = await this.callLegacyLLM(legacyProvider, prompt);

        // Parse response (simple extraction)
        const scoreMatch = response.match(/Score:\s*([\d.]+)/i);
        const reasonMatch = response.match(/Reason:\s*(.+)/i);

        const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;
        const reason = reasonMatch ? reasonMatch[1].trim() : 'Unknown';

        return { score, reason };
      } catch (error) {
        console.error(`L3 legacy detection failed for ${this.name}:`, error);
        return { score: 0, reason: 'L3 error (legacy)' };
      }
    }

    // L3 not configured
    return { score: 0, reason: 'L3 not configured' };
  }

  /**
   * Call legacy LLM provider (helper for L3 detection)
   * @deprecated Use LLMConfig with LLMProviderV2 instead
   */
  protected async callLegacyLLM(
    provider: LLMProvider,
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
