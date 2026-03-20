import { GuardrailEngine } from '@llm-guardrails/core';
import type { GuardrailConfig } from '@llm-guardrails/core';
import { GuardrailViolation } from '@llm-guardrails/core';

/**
 * Mastra Processor interface
 */
export interface Processor {
  processInput?(input: any): Promise<any>;
  processOutputStream?(stream: AsyncIterable<any>): AsyncIterable<any>;
  processOutputResult?(result: any): Promise<any>;
}

/**
 * Input guardrail processor
 * Implements Mastra's Processor interface for input validation
 */
export class GuardrailInputProcessor implements Processor {
  private engine: GuardrailEngine;

  constructor(config: GuardrailConfig) {
    this.engine = new GuardrailEngine(config);
  }

  /**
   * Check input text with guardrails
   * Public method for direct input validation
   */
  async checkInput(text: string): Promise<any> {
    return this.engine.checkInput(text);
  }

  /**
   * Process input before sending to agent
   */
  async processInput(input: any): Promise<any> {
    const text = this.extractText(input);

    if (!text) {
      return input; // No text to check
    }

    const result = await this.checkInput(text);

    if (result.blocked) {
      throw new GuardrailViolation({
        message: result.reason || 'Input blocked by guardrails',
        severity: 'high',
        guard: result.guard || 'unknown',
        metadata: { result },
      });
    }

    return input;
  }

  /**
   * Extract text from various input formats
   */
  private extractText(input: any): string {
    if (typeof input === 'string') {
      return input;
    }

    if (input?.message) {
      return String(input.message);
    }

    if (input?.prompt) {
      return String(input.prompt);
    }

    if (input?.text) {
      return String(input.text);
    }

    if (input?.content) {
      return String(input.content);
    }

    return '';
  }
}
