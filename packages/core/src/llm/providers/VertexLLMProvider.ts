/**
 * Google Vertex AI provider for L3 validation
 */

import type { VertexAI } from '@google-cloud/vertexai';
import type {
  LLMProviderV2,
  LLMValidationResult,
  LLMValidationOptions,
  LLMProviderInfo,
} from '../../types/llm.js';
import { PromptEngine } from '../prompts/PromptEngine.js';
import { LLMCache } from '../cache/LLMCache.js';

/**
 * Vertex AI provider options
 */
export interface VertexProviderOptions {
  /** Google Cloud project ID */
  project: string;
  /** Location (default: us-central1) */
  location?: string;
  /** Model to use (default: gemini-1.5-flash) */
  model?: string;
  /** Prompt engine (optional, will create if not provided) */
  promptEngine?: PromptEngine;
  /** Cache instance (optional) */
  cache?: LLMCache;
}

/**
 * Vertex AI LLM provider
 */
export class VertexLLMProvider implements LLMProviderV2 {
  private vertex: VertexAI;
  private model: string;
  private promptEngine: PromptEngine;
  private cache?: LLMCache;
  private generativeModel: any;

  /**
   * Create a new Vertex AI provider
   * @param options - Provider options
   */
  constructor(options: VertexProviderOptions) {
    // Dynamically import Vertex AI SDK
    const VertexAISDK = this.requireVertexAI();

    this.vertex = new VertexAISDK({
      project: options.project,
      location: options.location || 'us-central1',
    });

    this.model = options.model || 'gemini-1.5-flash';
    this.promptEngine = options.promptEngine || new PromptEngine();
    this.cache = options.cache;

    // Initialize generative model
    this.generativeModel = this.vertex.getGenerativeModel({
      model: this.model,
    });
  }

  /**
   * Validate input using Vertex AI
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

      // Call Vertex AI API
      const result = await this.generativeModel.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: options?.maxTokens || 150,
          temperature: options?.temperature || 0,
        },
      });

      // Extract text from response
      const response = result.response;
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Parse response
      const parsed = this.promptEngine.parseResponse(text, guardType);

      // Calculate cost (Gemini 1.5 Flash pricing)
      const usage = response.usageMetadata;
      const cost = this.calculateCost(usage);

      // Calculate latency
      const latency = Date.now() - startTime;

      // Build result
      const validationResult: LLMValidationResult = {
        blocked: parsed.blocked,
        confidence: parsed.confidence,
        reason: parsed.reason,
        guardType,
        metadata: {
          model: this.model,
          tokens: usage
            ? (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0)
            : undefined,
          cost,
          latency,
          cached: false,
        },
      };

      // Cache result
      if (this.cache) {
        this.cache.set(input, guardType, this.model, validationResult);
      }

      return validationResult;
    } catch (error) {
      console.error('Vertex AI validation error:', error);
      throw new Error(
        `Vertex AI validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
          promptTokenCount?: number;
          candidatesTokenCount?: number;
          totalTokenCount?: number;
        }
      | undefined
  ): number {
    if (!usage) {
      return 0;
    }

    // Gemini 1.5 Flash pricing (as of 2024):
    // Input: $0.075 per 1M tokens
    // Output: $0.30 per 1M tokens
    const inputCost = ((usage.promptTokenCount || 0) / 1_000_000) * 0.075;
    const outputCost = ((usage.candidatesTokenCount || 0) / 1_000_000) * 0.3;
    return inputCost + outputCost;
  }

  /**
   * Get provider information
   * @returns Provider info
   */
  getInfo(): LLMProviderInfo {
    return {
      name: 'vertex',
      model: this.model,
      costPerCheck: 0.00008, // Approximate average cost (Gemini Flash is very cheap)
      averageLatency: 180, // Approximate average latency in ms
    };
  }

  /**
   * Dynamically require Vertex AI SDK
   * @returns Vertex AI SDK
   */
  private requireVertexAI(): typeof VertexAI {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { VertexAI } = require('@google-cloud/vertexai');
      return VertexAI;
    } catch (error) {
      throw new Error(
        'Vertex AI SDK not found. Install it with: npm install @google-cloud/vertexai'
      );
    }
  }
}
