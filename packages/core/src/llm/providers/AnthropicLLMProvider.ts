/**
 * Anthropic LLM provider for L3 validation
 */

import type Anthropic from '@anthropic-ai/sdk';
import type {
  LLMProviderV2,
  LLMValidationResult,
  LLMValidationOptions,
  LLMProviderInfo,
} from '../../types/llm.js';
import { PromptEngine } from '../prompts/PromptEngine.js';
import { LLMCache } from '../cache/LLMCache.js';

/**
 * Anthropic provider options
 */
export interface AnthropicProviderOptions {
  /** Anthropic client instance (optional, will create if not provided) */
  client?: Anthropic;
  /** API key (required if client not provided) */
  apiKey?: string;
  /** Model to use (default: claude-3-haiku-20240307) */
  model?: string;
  /** Prompt engine (optional, will create if not provided) */
  promptEngine?: PromptEngine;
  /** Cache instance (optional) */
  cache?: LLMCache;
}

/**
 * Anthropic LLM provider
 */
export class AnthropicLLMProvider implements LLMProviderV2 {
  private client: Anthropic;
  private model: string;
  private promptEngine: PromptEngine;
  private cache?: LLMCache;

  /**
   * Create a new Anthropic provider
   * @param options - Provider options
   */
  constructor(options: AnthropicProviderOptions) {
    // Initialize client
    if (options.client) {
      this.client = options.client;
    } else if (options.apiKey) {
      // Dynamically import Anthropic SDK
      const AnthropicSDK = this.requireAnthropic();
      this.client = new AnthropicSDK({ apiKey: options.apiKey });
    } else {
      throw new Error(
        'Either client or apiKey must be provided for AnthropicLLMProvider'
      );
    }

    this.model = options.model || 'claude-3-haiku-20240307';
    this.promptEngine = options.promptEngine || new PromptEngine();
    this.cache = options.cache;
  }

  /**
   * Validate input using Anthropic's Claude
   * @param input - Text to validate
   * @param guardType - Guard type
   * @param options - Validation options
   * @returns Validation result
   */
  async validate(
    input: string,
    guardType: string,
    options?: LLMValidationOptions
  ): Promise<LLMValidationResult> {
    const startTime = Date.now();

    // Check cache first
    if (this.cache) {
      const cached = this.cache.get(input, guardType, this.model);
      if (cached) {
        return cached;
      }
    }

    try {
      // Generate prompt
      const prompt = this.promptEngine.getPrompt(guardType, input);

      // Call Anthropic API
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: options?.maxTokens || 150,
        temperature: options?.temperature || 0,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Extract text from response
      const content = response.content[0];
      const text = content.type === 'text' ? content.text : '';

      // Parse response
      const parsed = this.promptEngine.parseResponse(text, guardType);

      // Calculate cost
      const cost = this.calculateCost(response.usage);

      // Calculate latency
      const latency = Date.now() - startTime;

      // Build result
      const result: LLMValidationResult = {
        blocked: parsed.blocked,
        confidence: parsed.confidence,
        reason: parsed.reason,
        guardType,
        metadata: {
          model: this.model,
          tokens: response.usage.input_tokens + response.usage.output_tokens,
          cost,
          latency,
          cached: false,
        },
      };

      // Cache result
      if (this.cache) {
        this.cache.set(input, guardType, this.model, result);
      }

      return result;
    } catch (error) {
      console.error('Anthropic validation error:', error);
      throw new Error(
        `Anthropic validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Calculate cost based on token usage
   * @param usage - Token usage from API response
   * @returns Cost in dollars
   */
  private calculateCost(usage: {
    input_tokens: number;
    output_tokens: number;
  }): number {
    // Claude 3 Haiku pricing (as of 2024):
    // Input: $0.25 per 1M tokens
    // Output: $1.25 per 1M tokens
    const inputCost = (usage.input_tokens / 1_000_000) * 0.25;
    const outputCost = (usage.output_tokens / 1_000_000) * 1.25;
    return inputCost + outputCost;
  }

  /**
   * Get provider information
   * @returns Provider info
   */
  getInfo(): LLMProviderInfo {
    return {
      name: 'anthropic',
      model: this.model,
      costPerCheck: 0.0002, // Approximate average cost
      averageLatency: 150, // Approximate average latency in ms
    };
  }

  /**
   * Dynamically require Anthropic SDK
   * @returns Anthropic SDK constructor
   */
  private requireAnthropic(): typeof Anthropic {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('@anthropic-ai/sdk') as typeof Anthropic;
    } catch (error) {
      throw new Error(
        'Anthropic SDK not found. Install it with: npm install @anthropic-ai/sdk'
      );
    }
  }
}
