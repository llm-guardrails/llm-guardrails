/**
 * Guarded OpenAI Client
 *
 * Drop-in replacement for OpenAI SDK with built-in guardrails.
 */

import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionChunk } from 'openai/resources/chat/completions';
import { GuardrailEngine, type GuardrailConfig, type GuardrailResult } from '@llm-guardrails/core';

/**
 * Configuration for GuardedOpenAI
 */
export interface GuardedOpenAIConfig extends OpenAI.ClientOptions {
  /** Guardrails configuration */
  guardrails?: GuardrailConfig;
  /** Check input messages (default: true) */
  checkInput?: boolean;
  /** Check output from LLM (default: true) */
  checkOutput?: boolean;
  /** Throw error on block (default: true) */
  throwOnBlock?: boolean;
  /** Custom block handler */
  onBlock?: (result: GuardrailResult, messages: ChatCompletionMessageParam[]) => void;
}

/**
 * Error thrown when guardrails block a request
 */
export class GuardrailBlockError extends Error {
  constructor(
    public result: GuardrailResult,
    public messages: ChatCompletionMessageParam[]
  ) {
    super(`Guardrail blocked: ${result.reason} (guard: ${result.guard})`);
    this.name = 'GuardrailBlockError';
  }
}

/**
 * OpenAI client with built-in guardrails
 *
 * Drop-in replacement for OpenAI SDK with automatic content moderation.
 */
export class GuardedOpenAI extends OpenAI {
  private guardrailEngine: GuardrailEngine;
  private config: GuardedOpenAIConfig;

  constructor(config: GuardedOpenAIConfig = {}) {
    super(config);
    this.config = config;
    this.guardrailEngine = new GuardrailEngine(config.guardrails);

    // Override chat.completions.create to add guardrails
    this.chat.completions.create = this.createGuardedCompletion.bind(this);
  }

  /**
   * Create chat completion with guardrails
   */
  private async createGuardedCompletion(
    body: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
    options?: OpenAI.RequestOptions
  ): Promise<OpenAI.Chat.ChatCompletion>;
  private async createGuardedCompletion(
    body: OpenAI.Chat.ChatCompletionCreateParamsStreaming,
    options?: OpenAI.RequestOptions
  ): Promise<AsyncIterable<ChatCompletionChunk>>;
  private async createGuardedCompletion(
    body: OpenAI.Chat.ChatCompletionCreateParams,
    options?: OpenAI.RequestOptions
  ): Promise<OpenAI.Chat.ChatCompletion | AsyncIterable<ChatCompletionChunk>> {
    const checkInput = this.config.checkInput !== false;
    const checkOutput = this.config.checkOutput !== false;

    // Check input if enabled
    if (checkInput) {
      await this.checkMessages(body.messages);
    }

    // Call original OpenAI API
    const response = await super.chat.completions.create(body as any, options);

    // Handle streaming
    if (body.stream) {
      return this.guardStreamedResponse(response as AsyncIterable<ChatCompletionChunk>, checkOutput);
    }

    // Check output if enabled
    const completion = response as OpenAI.Chat.ChatCompletion;
    if (checkOutput) {
      await this.checkCompletion(completion);
    }

    return completion;
  }

  /**
   * Check input messages for violations
   */
  private async checkMessages(messages: ChatCompletionMessageParam[]): Promise<void> {
    // Combine all user/assistant messages for checking
    const content = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
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
   * Check completion output for violations
   */
  private async checkCompletion(completion: OpenAI.Chat.ChatCompletion): Promise<void> {
    const content = completion.choices
      .map((choice) => choice.message.content)
      .filter(Boolean)
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
    stream: AsyncIterable<ChatCompletionChunk>,
    checkOutput: boolean
  ): AsyncIterable<ChatCompletionChunk> {
    const chunks: string[] = [];

    for await (const chunk of stream) {
      // Collect content for checking
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        chunks.push(content);
      }

      yield chunk;
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
