/**
 * Main guardrail engine orchestrator
 */

import type {
  GuardrailConfig,
  GuardrailResult,
  GuardResult,
  CheckContext,
  Guard,
} from '../types';

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
    // Guards will be registered here as they're implemented
    // For now, this is a placeholder

    // Example:
    // if (this.shouldEnableGuard('pii')) {
    //   this.guards.push(new PIIGuard(this.getDetectionConfig()));
    // }
  }

  /**
   * Check if a guard should be enabled
   * TODO: Use this when auto-registering guards
   */
  // private shouldEnableGuard(guardName: string): boolean {
  //   // If guards config is not specified, enable all
  //   if (!this.config.guards) return true;
  //
  //   const guardConfig = this.config.guards.find((g) => g.name === guardName);
  //   return guardConfig?.enabled !== false;
  // }

  /**
   * Get detection configuration for guards
   * TODO: Use this when auto-registering guards
   */
  // private getDetectionConfig() {
  //   const level: DetectionLevel = this.config.level || 'standard';
  //   const preset = DETECTION_PRESETS[level];
  //
  //   // Add LLM provider if configured
  //   if (this.config.llmProvider && preset.tier3) {
  //     preset.tier3.enabled = true;
  //     preset.tier3.provider = this.config.llmProvider;
  //   }
  //
  //   return preset;
  // }
}
