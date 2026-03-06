/**
 * OpenAI LLM provider for L3 validation
 */

import type OpenAI from 'openai';
import type {
  LLMProviderV2,
  LLMValidationResult,
  LLMValidationOptions,
  LLMProviderInfo,
} from '../../types/llm.js';
import { PromptEngine } from '../prompts/PromptEngine.js';
import { LLMCache } from '../cache/LLMCache.js';

/**
 * OpenAI provider options
 */
export interface OpenAIProviderOptions {
  /** OpenAI client instance (optional, will create if not provided) */
  client?: OpenAI;
  /** API key (required if client not provided) */
  apiKey?: string;
  /** Model to use (default: gpt-4o-mini) */
  model?: string;
  /** Prompt engine (optional, will create if not provided) */
  promptEngine?: PromptEngine;
  /** Cache instance (optional) */
  cache?: LLMCache;
}

/**
 * OpenAI LLM provider
 */
export class OpenAILLMProvider implements LLMProviderV2 {
  private client: OpenAI;
  private model: string;
  private promptEngine: PromptEngine;
  private cache?: LLMCache;

  /**
   * Create a new OpenAI provider
   * @param options - Provider options
   */
  constructor(options: OpenAIProviderOptions) {
    // Initialize client
    if (options.client) {
      this.client = options.client;
    } else if (options.apiKey) {
      // Dynamically import OpenAI SDK
      const OpenAISDK = this.requireOpenAI();
      this.client = new OpenAISDK({ apiKey: options.apiKey });
    } else {
      throw new Error(
        'Either client or apiKey must be provided for OpenAILLMProvider'
      );
    }

    this.model = options.model || 'gpt-4o-mini';
    this.promptEngine = options.promptEngine || new PromptEngine();
    this.cache = options.cache;
  }

  /**
   * Validate input using OpenAI
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

      // Call OpenAI API
      const response = await this.client.chat.completions.create({
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
      const text = response.choices[0]?.message?.content || '';

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
          tokens:
            (response.usage?.prompt_tokens || 0) +
            (response.usage?.completion_tokens || 0),
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
      console.error('OpenAI validation error:', error);
      throw new Error(
        `OpenAI validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Calculate cost based on token usage
   * @param usage - Token usage from API response
   * @returns Cost in dollars
   */
  private calculateCost(
    usage:
      | {
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
        }
      | undefined
  ): number {
    if (!usage) {
      return 0;
    }

    // GPT-4o-mini pricing (as of 2024):
    // Input: $0.15 per 1M tokens
    // Output: $0.60 per 1M tokens
    const inputCost = (usage.prompt_tokens / 1_000_000) * 0.15;
    const outputCost = (usage.completion_tokens / 1_000_000) * 0.6;
    return inputCost + outputCost;
  }

  /**
   * Get provider information
   * @returns Provider info
   */
  getInfo(): LLMProviderInfo {
    return {
      name: 'openai',
      model: this.model,
      costPerCheck: 0.0001, // Approximate average cost
      averageLatency: 200, // Approximate average latency in ms
    };
  }

  /**
   * Dynamically require OpenAI SDK
   * @returns OpenAI SDK constructor
   */
  private requireOpenAI(): typeof OpenAI {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('openai') as typeof OpenAI;
    } catch (error) {
      throw new Error(
        'OpenAI SDK not found. Install it with: npm install openai'
      );
    }
  }
}
