/**
 * Guarded Anthropic Client
 *
 * Drop-in replacement for Anthropic SDK with built-in guardrails.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, MessageStreamEvent } from '@anthropic-ai/sdk/resources/messages';
import { GuardrailEngine, type GuardrailConfig, type GuardrailResult } from '@llm-guardrails/core';

/**
 * Configuration for GuardedAnthropic
 */
export interface GuardedAnthropicConfig extends Anthropic.ClientOptions {
  /** Guardrails configuration */
  guardrails?: GuardrailConfig;
  /** Check input messages (default: true) */
  checkInput?: boolean;
  /** Check output from Claude (default: true) */
  checkOutput?: boolean;
  /** Throw error on block (default: true) */
  throwOnBlock?: boolean;
  /** Custom block handler */
  onBlock?: (result: GuardrailResult, messages: MessageParam[]) => void;
}

/**
 * Error thrown when guardrails block a request
 */
export class GuardrailBlockError extends Error {
  constructor(
    public result: GuardrailResult,
    public messages: MessageParam[]
  ) {
    super(`Guardrail blocked: ${result.reason} (guard: ${result.guard})`);
    this.name = 'GuardrailBlockError';
  }
}

/**
 * Anthropic client with built-in guardrails
 *
 * Drop-in replacement for Anthropic SDK with automatic content moderation.
 */
export class GuardedAnthropic extends Anthropic {
  private guardrailEngine: GuardrailEngine;
  private config: GuardedAnthropicConfig;

  constructor(config: GuardedAnthropicConfig = {}) {
    super(config);
    this.config = config;
    this.guardrailEngine = new GuardrailEngine(config.guardrails);

    // Override messages.create to add guardrails
    const originalCreate = this.messages.create.bind(this.messages);
    this.messages.create = this.createGuardedMessage.bind(this, originalCreate);
  }

  /**
   * Create message with guardrails
   */
  private async createGuardedMessage(
    originalCreate: any,
    body: Anthropic.MessageCreateParamsNonStreaming,
    options?: Anthropic.RequestOptions
  ): Promise<Anthropic.Message>;
  private async createGuardedMessage(
    originalCreate: any,
    body: Anthropic.MessageCreateParamsStreaming,
    options?: Anthropic.RequestOptions
  ): Promise<AsyncIterable<MessageStreamEvent>>;
  private async createGuardedMessage(
    originalCreate: any,
    body: Anthropic.MessageCreateParams,
    options?: Anthropic.RequestOptions
  ): Promise<Anthropic.Message | AsyncIterable<MessageStreamEvent>> {
    const checkInput = this.config.checkInput !== false;
    const checkOutput = this.config.checkOutput !== false;

    // Check input if enabled
    if (checkInput) {
      await this.checkMessages(body.messages);
    }

    // Call original Anthropic API
    const response = await originalCreate(body, options);

    // Handle streaming
    if (body.stream) {
      return this.guardStreamedResponse(response as AsyncIterable<MessageStreamEvent>, checkOutput);
    }

    // Check output if enabled
    const message = response as Anthropic.Message;
    if (checkOutput) {
      await this.checkMessage(message);
    }

    return message;
  }

  /**
   * Check input messages for violations
   */
  private async checkMessages(messages: MessageParam[]): Promise<void> {
    // Combine all user/assistant messages for checking
    const content = messages
      .map((m) => {
        if (typeof m.content === 'string') {
          return m.content;
        } else if (Array.isArray(m.content)) {
          return m.content
            .filter((c) => c.type === 'text')
            .map((c: any) => c.text)
            .join('\n');
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');

    if (!content.trim()) return;

    const result = await this.guardrailEngine.checkInput(content);

    if (result.blocked) {
      if (this.config.onBlock) {
        this.config.onBlock(result, messages);
      }

      if (this.config.throwOnBlock !== false) {
        throw new GuardrailBlockError(result, messages);
      }
    }
  }

  /**
   * Check message output for violations
   */
  private async checkMessage(message: Anthropic.Message): Promise<void> {
    const content = message.content
      .filter((c) => c.type === 'text')
      .map((c: any) => c.text)
      .join('\n');

    if (!content.trim()) return;

    const result = await this.guardrailEngine.checkOutput(content);

    if (result.blocked) {
      if (this.config.onBlock) {
        this.config.onBlock(result, []);
      }

      if (this.config.throwOnBlock !== false) {
        throw new GuardrailBlockError(result, []);
      }
    }
  }

  /**
   * Guard streamed response
   */
  private async *guardStreamedResponse(
    stream: AsyncIterable<MessageStreamEvent>,
    checkOutput: boolean
  ): AsyncIterable<MessageStreamEvent> {
    const chunks: string[] = [];

    for await (const event of stream) {
      // Collect content for checking
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          chunks.push(event.delta.text);
        }
      }

      yield event;
    }

    // Check complete output after streaming
    if (checkOutput && chunks.length > 0) {
      const fullContent = chunks.join('');
      const result = await this.guardrailEngine.checkOutput(fullContent);

      if (result.blocked) {
        if (this.config.onBlock) {
          this.config.onBlock(result, []);
        }

        // Note: For streaming, we can't un-send the chunks,
        // but we can notify about the violation
        console.warn('Guardrail violation detected in streamed output:', result.reason);
      }
    }
  }

  /**
   * Get guardrail engine for direct access
   */
  getGuardrailEngine(): GuardrailEngine {
    return this.guardrailEngine;
  }

  /**
   * Get cache statistics if caching is enabled
   */
  getCacheStats() {
    return this.guardrailEngine.getCacheStats();
  }

  /**
   * Get observability statistics if enabled
   */
  getObservabilityStats() {
    return this.guardrailEngine.getObservabilityStats();
  }

  /**
   * Clear guardrail cache
   */
  clearCache(): void {
    this.guardrailEngine.clearCache();
  }

  /**
   * Check if caching is enabled
   */
  isCacheEnabled(): boolean {
    return this.guardrailEngine.isCacheEnabled();
  }
}
