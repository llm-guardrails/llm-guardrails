import { GuardrailEngine } from '@llm-guardrails/core';
import type { GuardrailConfig } from '@llm-guardrails/core';
import { GuardrailViolation } from '@llm-guardrails/core';
import type { Processor } from './GuardrailInputProcessor';

/**
 * Stream guardrail processor
 * Implements Mastra's Processor interface for streaming validation
 */
export class GuardrailStreamProcessor implements Processor {
  private engine: GuardrailEngine;
  private checkInterval: number;

  constructor(config: GuardrailConfig, checkInterval: number = 10) {
    this.engine = new GuardrailEngine(config);
    this.checkInterval = checkInterval;
  }

  /**
   * Process output stream with incremental checks
   */
  async *processOutputStream(stream: AsyncIterable<any>): AsyncIterable<any> {
    let buffer = '';
    let chunkCount = 0;

    for await (const chunk of stream) {
      const content = this.extractContent(chunk);

      if (content) {
        buffer += content;
        chunkCount++;

        // Check every N chunks
        if (chunkCount % this.checkInterval === 0) {
          const result = await this.engine.quickCheck(buffer);

          if (result.blocked) {
            throw new GuardrailViolation({
              message: `Stream blocked: ${result.reason}`,
              severity: 'high',
              guard: result.guard || 'unknown',
              metadata: { result },
            });
          }
        }
      }

      yield chunk;
    }

    // Final check on complete buffer
    if (buffer) {
      const finalResult = await this.engine.checkOutput(buffer);

      if (finalResult.blocked) {
        throw new GuardrailViolation({
          message: `Stream blocked: ${finalResult.reason}`,
          severity: 'high',
          guard: finalResult.guard || 'unknown',
          metadata: { result: finalResult },
        });
      }
    }
  }

  /**
   * Extract content from stream chunk
   */
  private extractContent(chunk: any): string {
    if (typeof chunk === 'string') {
      return chunk;
    }

    if (chunk?.content) {
      return String(chunk.content);
    }

    if (chunk?.text) {
      return String(chunk.text);
    }

    if (chunk?.delta?.content) {
      return String(chunk.delta.content);
    }

    return '';
  }
}
