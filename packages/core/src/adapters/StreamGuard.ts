/**
 * Stream Guard
 *
 * Universal streaming support for guardrails across all gateways.
 * Performs incremental checks on streaming responses.
 */

import type { GuardrailEngine } from '../engine/GuardrailEngine';
import type { AdapterConfig } from './types';
import { GuardrailViolation } from './types';

export class StreamGuard {
  private buffer = '';
  private chunkCount = 0;
  private lastCheckLength = 0;

  constructor(
    private engine: GuardrailEngine,
    private config: AdapterConfig = {}
  ) {}

  /**
   * Guard an async iterable stream
   */
  async *guard<T>(stream: AsyncIterable<T>): AsyncIterableIterator<T> {
    this.reset();

    for await (const chunk of stream) {
      // Extract content from chunk
      const content = this.extractContent(chunk);

      if (content) {
        this.buffer += content;
        this.chunkCount++;

        // Check if we should perform a guardrail check
        if (this.shouldCheck()) {
          await this.performCheck();
        }
      }

      // Yield the original chunk
      yield chunk;
    }

    // Final comprehensive check
    if (this.buffer) {
      await this.performFinalCheck();
    }
  }

  /**
   * Determine if we should check now based on interval config
   */
  private shouldCheck(): boolean {
    const interval = this.config.streamCheckInterval || {};

    // Check every N chunks
    if (interval.chunks && this.chunkCount % interval.chunks === 0) {
      return true;
    }

    // Check every M characters
    if (interval.characters) {
      const newChars = this.buffer.length - this.lastCheckLength;
      if (newChars >= interval.characters) {
        return true;
      }
    }

    return false;
  }

  /**
   * Perform an incremental check (quick L1/L2 only)
   */
  private async performCheck(): Promise<void> {
    // Use quickCheck for streaming (L1 only, fast)
    const result = await this.engine.quickCheck(this.buffer);

    this.lastCheckLength = this.buffer.length;

    if (result.blocked) {
      throw new GuardrailViolation(
        `Stream blocked: ${result.reason}`,
        result,
        'output'
      );
    }
  }

  /**
   * Perform final comprehensive check
   */
  private async performFinalCheck(): Promise<void> {
    // Use full check for final validation
    const result = await this.engine.checkInput(this.buffer);

    if (result.blocked) {
      throw new GuardrailViolation(
        `Final check failed: ${result.reason}`,
        result,
        'output'
      );
    }
  }

  /**
   * Extract text content from various stream chunk formats
   */
  private extractContent(chunk: any): string {
    // OpenAI format
    if (chunk.choices?.[0]?.delta?.content) {
      return chunk.choices[0].delta.content;
    }

    // Anthropic format (message stream events)
    if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
      return chunk.delta.text;
    }

    // Anthropic format (streaming)
    if (chunk.delta?.type === 'text_delta' && chunk.delta?.text) {
      return chunk.delta.text;
    }

    // Gemini format
    if (chunk.text) {
      return chunk.text;
    }

    if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
      return chunk.candidates[0].content.parts[0].text;
    }

    // Generic content field
    if (typeof chunk.content === 'string') {
      return chunk.content;
    }

    // Text delta
    if (chunk.delta?.content) {
      return chunk.delta.content;
    }

    return '';
  }

  /**
   * Reset internal state (for reuse)
   */
  private reset(): void {
    this.buffer = '';
    this.chunkCount = 0;
    this.lastCheckLength = 0;
  }

  /**
   * Get the accumulated buffer (for debugging)
   */
  getBuffer(): string {
    return this.buffer;
  }
}
