import type {
  OutputBlockStrategy,
  BlockedMessageConfig,
  BlockResponse,
  ResponseTransformer,
} from '../types/output';
import type { GuardrailResult } from '../types';
import { GuardrailViolation } from '../types';

/**
 * Configuration for OutputBlocker
 */
export interface OutputBlockerConfig {
  blockedMessage?: BlockedMessageConfig;
  responseTransform?: ResponseTransformer;
}

/**
 * Handles output blocking strategies
 */
export class OutputBlocker {
  private strategy: OutputBlockStrategy;
  private config: OutputBlockerConfig;

  constructor(strategy: OutputBlockStrategy, config: OutputBlockerConfig) {
    this.strategy = strategy || 'block';
    this.config = config;
  }

  /**
   * Apply output blocking strategy to result
   */
  applyStrategy(
    result: GuardrailResult,
    originalContent?: string
  ): GuardrailResult {
    switch (this.strategy) {
      case 'block':
        return this.applyBlockStrategy(result);

      case 'sanitize':
        return this.applySanitizeStrategy(result);

      case 'throw':
        this.applyThrowStrategy(result);
        // Never reaches here
        return result;

      case 'custom':
        return this.applyCustomStrategy(result);

      default:
        // Fallback to block
        return this.applyBlockStrategy(result);
    }
  }

  /**
   * Block strategy: replace with safe message
   */
  private applyBlockStrategy(result: GuardrailResult): GuardrailResult {
    const message = this.getBlockedMessage(result);

    return {
      ...result,
      blocked: true,
      sanitized: message,
    };
  }

  /**
   * Sanitize strategy: redact content
   */
  private applySanitizeStrategy(result: GuardrailResult): GuardrailResult {
    return {
      ...result,
      blocked: false, // Allow with sanitization
      sanitized: '[Content redacted for safety]',
    };
  }

  /**
   * Throw strategy: throw GuardrailViolation error
   */
  private applyThrowStrategy(result: GuardrailResult): never {
    throw new GuardrailViolation({
      message: result.reason || 'Output blocked by guardrails',
      severity: 'high',
      guard: result.guard || 'unknown',
      metadata: { result },
    });
  }

  /**
   * Custom strategy: use custom transformer
   */
  private applyCustomStrategy(result: GuardrailResult): GuardrailResult {
    if (this.config.responseTransform) {
      return this.config.responseTransform(result, result);
    }

    return result;
  }

  /**
   * Get blocked message based on config
   */
  private getBlockedMessage(result: GuardrailResult): string {
    const config = this.config.blockedMessage;

    if (!config) {
      return '[Response blocked by guardrails]';
    }

    // Simple string
    if (typeof config === 'string') {
      return config;
    }

    // Template with variables
    if (typeof config === 'object' && 'template' in config) {
      return this.expandTemplate(config.template, result);
    }

    // Function callback
    if (typeof config === 'function') {
      const response = config(result);
      return response.message;
    }

    // Advanced options (handled in Task 1.5)
    return '[Response blocked by guardrails]';
  }

  /**
   * Expand template variables
   */
  private expandTemplate(template: string, result: GuardrailResult): string {
    return template
      .replace(/\$\{guard\}/g, result.guard || 'unknown')
      .replace(/\$\{reason\}/g, result.reason || 'policy violation')
      .replace(/\$\{confidence\}/g, String(result.results[0]?.confidence || 0))
      .replace(/\$\{timestamp\}/g, new Date().toISOString());
  }
}
