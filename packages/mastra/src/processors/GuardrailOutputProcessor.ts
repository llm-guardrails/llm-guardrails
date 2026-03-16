import { GuardrailEngine } from '@llm-guardrails/core';
import type { GuardrailConfig } from '@llm-guardrails/core';
import { GuardrailViolation } from '@llm-guardrails/core';
import type { Processor } from './GuardrailInputProcessor';

/**
 * Output guardrail processor
 * Implements Mastra's Processor interface for output validation
 */
export class GuardrailOutputProcessor implements Processor {
  private engine: GuardrailEngine;

  constructor(config: GuardrailConfig) {
    this.engine = new GuardrailEngine(config);
  }

  /**
   * Process output result after agent generation
   */
  async processOutputResult(result: any): Promise<any> {
    const text = this.extractText(result);

    if (!text) {
      return result; // No text to check
    }

    const checkResult = await this.engine.checkOutput(text);

    // Apply blocking strategy if output was blocked or sanitized
    // (sanitize strategy sets blocked=false but provides sanitized text)
    if (checkResult.blocked || checkResult.sanitized) {
      return this.applyBlockStrategy(result, checkResult);
    }

    return result;
  }

  /**
   * Extract text from various output formats
   */
  private extractText(result: any): string {
    if (typeof result === 'string') {
      return result;
    }

    if (result?.text) {
      return String(result.text);
    }

    if (result?.content) {
      return String(result.content);
    }

    if (result?.message) {
      return String(result.message);
    }

    if (result?.response) {
      return String(result.response);
    }

    return '';
  }

  /**
   * Apply blocking strategy based on configuration
   */
  private applyBlockStrategy(result: any, checkResult: any): any {
    // checkResult.sanitized is set by OutputBlocker in checkOutput if blocking strategy is used
    // For throw strategy, OutputBlocker throws before we get here
    const sanitized = checkResult.sanitized;

    if (sanitized) {
      return this.replaceText(result, sanitized);
    }

    // If no sanitized text (shouldn't happen with proper OutputBlocker setup),
    // throw the violation
    throw new GuardrailViolation({
      message: checkResult.reason || 'Output blocked by guardrails',
      severity: 'high',
      guard: checkResult.guard || 'unknown',
      metadata: { result: checkResult },
    });
  }

  /**
   * Replace text in result object
   */
  private replaceText(result: any, replacement: string): any {
    if (typeof result === 'string') {
      return replacement;
    }

    if (result?.text !== undefined) {
      return { ...result, text: replacement };
    }

    if (result?.content !== undefined) {
      return { ...result, content: replacement };
    }

    if (result?.message !== undefined) {
      return { ...result, message: replacement };
    }

    if (result?.response !== undefined) {
      return { ...result, response: replacement };
    }

    return result;
  }
}
