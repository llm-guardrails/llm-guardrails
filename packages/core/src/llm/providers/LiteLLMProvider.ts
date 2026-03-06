/**
 * LiteLLM provider for L3 validation
 *
 * LiteLLM is a universal proxy that supports 100+ LLM providers
 * through a unified OpenAI-compatible API.
 */

import type {
  LLMProviderV2,
  LLMValidationResult,
  LLMValidationOptions,
  LLMProviderInfo,
} from '../../types/llm.js';
import { PromptEngine } from '../prompts/PromptEngine.js';
import { LLMCache } from '../cache/LLMCache.js';

/**
 * LiteLLM provider options
 */
export interface LiteLLMProviderOptions {
  /** LiteLLM base URL (default: http://localhost:4000) */
  baseUrl?: string;
  /** Model identifier (can be any LiteLLM-supported model) */
  model: string;
  /** API key (optional, depends on LiteLLM configuration) */
  apiKey?: string;
  /** Prompt engine (optional, will create if not provided) */
  promptEngine?: PromptEngine;
  /** Cache instance (optional) */
  cache?: LLMCache;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * LiteLLM provider
 */
export class LiteLLMProvider implements LLMProviderV2 {
  private baseUrl: string;
  private model: string;
  private apiKey?: string;
  private promptEngine: PromptEngine;
  private cache?: LLMCache;
  private timeout: number;

  /**
   * Create a new LiteLLM provider
   * @param options - Provider options
   */
  constructor(options: LiteLLMProviderOptions) {
    this.baseUrl = options.baseUrl || 'http://localhost:4000';
    this.model = options.model;
    this.apiKey = options.apiKey;
    this.promptEngine = options.promptEngine || new PromptEngine();
    this.cache = options.cache;
    this.timeout = options.timeout || 30000; // 30 seconds default
  }

  /**
   * Validate input using LiteLLM
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

      // Build request
      const requestBody = {
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: options?.maxTokens || 150,
        temperature: options?.temperature || 0,
      };

      // Call LiteLLM API (OpenAI-compatible)
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        options?.timeout || this.timeout
      );

      const response = await fetch(
        `${this.baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `LiteLLM API error (${response.status}): ${errorText}`
        );
      }

      const data = await response.json() as any;

      // Extract text from response
      const text = data.choices?.[0]?.message?.content || '';

      // Parse response
      const parsed = this.promptEngine.parseResponse(text, guardType);

      // Calculate cost (if usage is provided)
      const cost = this.calculateCost(data.usage);

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
          tokens: data.usage
            ? (data.usage.prompt_tokens || 0) +
              (data.usage.completion_tokens || 0)
            : undefined,
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
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('LiteLLM request timed out');
      }
      console.error('LiteLLM validation error:', error);
      throw new Error(
        `LiteLLM validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Calculate cost based on token usage
   * @param usage - Token usage from API response
   * @returns Cost in dollars (estimated)
   */
  private calculateCost(
    usage:
      | {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        }
      | undefined
  ): number {
    if (!usage) {
      return 0;
    }

    // Use generic pricing as LiteLLM supports many models
    // Average pricing: $0.50 per 1M tokens
    const totalTokens =
      usage.total_tokens ||
      (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
    return (totalTokens / 1_000_000) * 0.5;
  }

  /**
   * Get provider information
   * @returns Provider info
   */
  getInfo(): LLMProviderInfo {
    return {
      name: 'litellm',
      model: this.model,
      costPerCheck: 0.0002, // Approximate average cost
      averageLatency: 250, // Approximate average latency in ms (includes proxy overhead)
    };
  }
}
