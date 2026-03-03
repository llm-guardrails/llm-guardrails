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

/**
 * Main guardrail engine
 */
export class GuardrailEngine {
  private guards: Guard[] = [];
  private config: GuardrailConfig;

  constructor(config: GuardrailConfig = {}) {
    this.config = config;
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
      try {
        const result = await guard.check(input, context);
        results.push(result);

        // Early exit if blocked
        if (result.blocked) {
          const guardrailResult: GuardrailResult = {
            passed: false,
            blocked: true,
            reason: result.reason,
            guard: guard.name,
            results,
            totalLatency: Date.now() - startTime,
            sessionId: context?.sessionId,
          };

          // Call onBlock callback
          this.config.onBlock?.(guardrailResult);

          return guardrailResult;
        }
      } catch (error) {
        // Log error but don't fail entire check
        console.error(`Guard ${guard.name} failed:`, error);
        results.push({
          passed: false,
          blocked: false,
          reason: `Guard error: ${error}`,
        });
      }
    }

    // All checks passed
    return {
      passed: true,
      blocked: false,
      results,
      totalLatency: Date.now() - startTime,
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
    // For now, use same checks as input
    // Future: could have different guards for output
    return this.checkInput(output, context);
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
   * Initialize guards based on configuration
   */
  private initializeGuards(): void {
    const detectionConfig = this.getDetectionConfig();

    // If guards array is specified, only enable those
    const guardNames = this.config.guards || [
      'pii',
      'injection',
      'secrets',
      'toxicity',
      'hate-speech',
      'bias',
      'adult-content',
      'copyright',
      'profanity',
      'leakage',
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
      const factory = guardMap[name];

      if (factory) {
        this.guards.push(factory());
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

    // Enable L3 if LLM provider configured
    if (this.config.llmProvider && config.tier3) {
      config.tier3.enabled = true;
      config.tier3.provider = this.config.llmProvider;
    }

    return config;
  }
}
