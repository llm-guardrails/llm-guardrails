/**
 * Main guardrail engine orchestrator
 */

import type {
  GuardrailConfig,
  GuardrailResult,
  GuardResult,
  CheckContext,
  Guard,
  HybridDetectionConfig,
} from '../types';
import { PIIGuard } from '../guards/PIIGuard';
import { InjectionGuard } from '../guards/InjectionGuard';
import { SecretGuard } from '../guards/SecretGuard';
import { ToxicityGuard } from '../guards/ToxicityGuard';
import { HateSpeechGuard } from '../guards/HateSpeechGuard';
import { BiasGuard } from '../guards/BiasGuard';
import { AdultContentGuard } from '../guards/AdultContentGuard';
import { CopyrightGuard } from '../guards/CopyrightGuard';
import { ProfanityGuard } from '../guards/ProfanityGuard';
import { LeakageGuard } from '../guards/LeakageGuard';
import { Observability } from '../observability';
import { CacheManager } from '../cache/CacheManager';
import { FailModeHandler } from './FailModeHandler';
import { OutputBlocker } from './OutputBlocker';

/**
 * Main guardrail engine
 */
export class GuardrailEngine {
  private guards: Guard[] = [];
  private config: GuardrailConfig;
  private observability?: Observability;
  private cacheManager?: CacheManager;
  private failModeHandler?: FailModeHandler;
  private outputBlocker?: OutputBlocker;

  constructor(config: GuardrailConfig = {}) {
    this.config = config;

    // Initialize observability if configured
    if (config.observability) {
      this.observability = new Observability(config.observability);
    }

    // Initialize cache if configured
    if (config.cache?.enabled) {
      this.cacheManager = new CacheManager(config.cache);
    }

    // Initialize fail mode handler (defaults to fail-closed if not configured)
    this.failModeHandler = new FailModeHandler(config.failMode);

    // Initialize output blocker
    if (config.outputBlockStrategy || config.blockedMessage || config.responseTransform) {
      this.outputBlocker = new OutputBlocker(
        config.outputBlockStrategy || 'block',
        {
          blockedMessage: config.blockedMessage,
          responseTransform: config.responseTransform,
        }
      );
    }

    this.initializeGuards();
  }

  /**
   * Check input against all guards
   */
  async checkInput(
    input: string,
    context?: CheckContext
  ): Promise<GuardrailResult> {
    const startTime = Date.now();
    const results: GuardResult[] = [];

    // Run all guards
    for (const guard of this.guards) {
      const guardStartTime = Date.now();
      const span = this.observability?.startCheckSpan(guard.name, context?.sessionId);

      try {
        // Check cache first
        let result = this.cacheManager?.get(input, guard.name);

        if (!result) {
          // Cache miss - run the guard
          result = await guard.check(input, context);

          // Cache the result
          if (this.cacheManager) {
            this.cacheManager.set(input, guard.name, result);
          }
        }

        const guardLatency = Date.now() - guardStartTime;
        results.push(result);

        // Record observability for this guard check
        if (this.observability) {
          this.observability.recordCheck(
            guard.name,
            input,
            {
              blocked: result.blocked || false,
              reason: result.reason,
              confidence: result.confidence,
            },
            guardLatency,
            context?.sessionId
          );
        }

        // End span
        if (span) {
          this.observability?.endSpan(span);
        }

        // Early exit if blocked
        if (result.blocked) {
          const totalLatency = Date.now() - startTime;
          const guardrailResult: GuardrailResult = {
            passed: false,
            blocked: true,
            reason: result.reason,
            guard: guard.name,
            results,
            totalLatency,
            sessionId: context?.sessionId,
          };

          // Call onBlock callback
          this.config.onBlock?.(guardrailResult);

          return guardrailResult;
        }
      } catch (error) {
        // Handle with fail mode
        const shouldBlock = this.shouldBlockOnError(guard.name, error as Error);

        if (shouldBlock) {
          // Fail-closed: block on error
          console.error(`[FAIL-CLOSED] Guard ${guard.name} error:`, error);

          const totalLatency = Date.now() - startTime;
          return {
            passed: false,
            blocked: true,
            reason: `Security check failed: ${guard.name} (fail-closed mode)`,
            guard: guard.name,
            results,
            totalLatency,
            sessionId: context?.sessionId,
            metadata: {
              failMode: 'closed',
              error: (error as Error).message,
            },
          };
        } else {
          // Fail-open: log error but continue
          console.warn(`[FAIL-OPEN] Guard ${guard.name} error (allowing):`, error);

          results.push({
            passed: true,
            blocked: false,
            reason: `Guard error (fail-open): ${(error as Error).message}`,
            metadata: {
              failMode: 'open',
              error: (error as Error).message,
            },
          });
        }

        // End span with error
        if (span) {
          this.observability?.endSpan(span);
        }
      }
    }

    // All checks passed
    const totalLatency = Date.now() - startTime;
    return {
      passed: true,
      blocked: false,
      results,
      totalLatency,
      sessionId: context?.sessionId,
    };
  }

  /**
   * Check output from LLM
   */
  async checkOutput(
    output: string,
    context?: CheckContext
  ): Promise<GuardrailResult> {
    // Run guards on output (same as input checks)
    const result = await this.checkInput(output, context);

    // If output is blocked and outputBlocker is configured, apply blocking strategy
    if (result.blocked && this.outputBlocker) {
      return this.outputBlocker.applyStrategy(result, output);
    }

    return result;
  }

  /**
   * Quick check (L1 only, < 1ms)
   */
  async quickCheck(
    input: string,
    context?: CheckContext
  ): Promise<GuardrailResult> {
    // Implementation: Only run L1 tier
    // This is useful for streaming scenarios
    return this.checkInput(input, context);
  }

  /**
   * Get all registered guards
   */
  getGuards(): Guard[] {
    return [...this.guards];
  }

  /**
   * Add a custom guard
   */
  addGuard(guard: Guard): void {
    this.guards.push(guard);
  }

  /**
   * Remove a guard by name
   */
  removeGuard(name: string): boolean {
    const index = this.guards.findIndex((g) => g.name === name);
    if (index !== -1) {
      this.guards.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get metrics snapshot (if observability is enabled)
   */
  getMetricsSnapshot() {
    return this.observability?.getMetricsSnapshot();
  }

  /**
   * Export Prometheus metrics (if observability is enabled)
   */
  exportPrometheus(): string | undefined {
    return this.observability?.exportPrometheus();
  }

  /**
   * Get observability statistics (if observability is enabled)
   */
  getObservabilityStats() {
    return this.observability?.getStats();
  }

  /**
   * Reset observability data (metrics, logs, traces)
   */
  resetObservability(): void {
    this.observability?.reset();
  }

  /**
   * Check if observability is enabled
   */
  isObservabilityEnabled(): boolean {
    return this.observability?.isEnabled() || false;
  }

  /**
   * Get cache statistics (if caching is enabled)
   */
  getCacheStats() {
    return this.cacheManager?.getStats();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cacheManager?.clear();
  }

  /**
   * Check if caching is enabled
   */
  isCacheEnabled(): boolean {
    return !!this.cacheManager;
  }

  /**
   * Determine if guard error should block (using fail mode)
   */
  private shouldBlockOnError(guardName: string, error: Error): boolean {
    // If no failModeHandler configured, default to fail-closed
    if (!this.failModeHandler) {
      return true;
    }

    return this.failModeHandler.shouldBlockOnError(guardName, error);
  }

  /**
   * Initialize guards based on configuration
   */
  private initializeGuards(): void {
    const detectionConfig = this.getDetectionConfig();

    // Initialize LLM system if enabled
    let llmOptions = this.config.llm?.enabled ? this.config.llm : undefined;

    // Initialize budget tracker if LLM is enabled and budget config exists
    if (llmOptions && llmOptions.budget) {
      // Dynamically import budget tracker
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { LLMBudgetTracker } = require('../llm/budget/LLMBudgetTracker');
        const budgetTracker = new LLMBudgetTracker(llmOptions.budget);

        // Inject budget tracker into config
        llmOptions = {
          ...llmOptions,
          budgetTracker,
        };
      } catch (error) {
        console.error('Failed to initialize LLM budget tracker:', error);
      }
    }

    // If guards array is specified, only enable those
    // Note: Guards are ordered from most specific to least specific
    // Injection/leakage run first as they're highly targeted attacks
    const guardNames = this.config.guards || [
      'injection',      // Most specific - jailbreaks, prompt injection
      'leakage',        // Specific - prompt extraction attempts
      'secrets',        // Specific - API keys, tokens
      'pii',            // Can have false positives, so run after more specific guards
      'toxicity',
      'hate-speech',
      'bias',
      'adult-content',
      'copyright',
      'profanity',
    ];

    const guardMap: Record<string, () => Guard> = {
      pii: () => new PIIGuard(detectionConfig),
      injection: () => new InjectionGuard(detectionConfig),
      secrets: () => new SecretGuard(detectionConfig),
      toxicity: () => new ToxicityGuard(detectionConfig),
      'hate-speech': () => new HateSpeechGuard(detectionConfig),
      bias: () => new BiasGuard(detectionConfig),
      'adult-content': () => new AdultContentGuard(detectionConfig),
      copyright: () => new CopyrightGuard(detectionConfig),
      profanity: () => new ProfanityGuard(detectionConfig),
      leakage: () => new LeakageGuard(detectionConfig),
    };

    for (const guardName of guardNames) {
      const name = typeof guardName === 'string' ? guardName : guardName.name;
      const config = typeof guardName === 'object' ? guardName.config : undefined;

      const factory = guardMap[name];

      if (factory) {
        // Special handling for LeakageGuard with config
        if (name === 'leakage' && config) {
          this.guards.push(new LeakageGuard(detectionConfig, config));
        } else {
          this.guards.push(factory());
        }
      }
    }
  }

  /**
   * Get detection configuration for guards
   */
  private getDetectionConfig(): HybridDetectionConfig {
    const level = this.config.level || 'standard';

    // Detection presets based on level
    const presets: Record<string, HybridDetectionConfig> = {
      basic: {
        tier1: { enabled: true, threshold: 0.9 },
        tier2: { enabled: false, threshold: 0.7 },
      },
      standard: {
        tier1: { enabled: true, threshold: 0.9 },
        tier2: { enabled: true, threshold: 0.7 },
      },
      advanced: {
        tier1: { enabled: true, threshold: 0.9 },
        tier2: { enabled: true, threshold: 0.7 },
        tier3: {
          enabled: false, // Only enable if LLM provider configured
          onlyIfSuspicious: true,
          costLimit: 0.01,
        },
      },
    };

    const config = presets[level] || presets.standard;

    // Prefilter mode: Only use L1+L2, never L3
    if (this.config.prefilterMode) {
      // Ensure tier3 is disabled
      if (config.tier3) {
        config.tier3.enabled = false;
      }
      return config;
    }

    // Enable L3 if LLM provider configured (and not in prefilter mode)
    if (this.config.llmProvider && config.tier3) {
      config.tier3.enabled = true;
      config.tier3.provider = this.config.llmProvider;
    }

    return config;
  }
}
