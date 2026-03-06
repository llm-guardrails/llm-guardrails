/**
 * AWS Bedrock provider for L3 validation
 */

import type {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import type {
  LLMProviderV2,
  LLMValidationResult,
  LLMValidationOptions,
  LLMProviderInfo,
} from '../../types/llm.js';
import { PromptEngine } from '../prompts/PromptEngine.js';
import { LLMCache } from '../cache/LLMCache.js';

/**
 * Bedrock provider options
 */
export interface BedrockProviderOptions {
  /** AWS region (default: us-east-1) */
  region?: string;
  /** Model ID (default: anthropic.claude-3-haiku-20240307-v1:0) */
  model?: string;
  /** AWS credentials (optional, will use default credential chain if not provided) */
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
  /** Prompt engine (optional, will create if not provided) */
  promptEngine?: PromptEngine;
  /** Cache instance (optional) */
  cache?: LLMCache;
}

/**
 * AWS Bedrock LLM provider
 */
export class BedrockLLMProvider implements LLMProviderV2 {
  private client: BedrockRuntimeClient;
  private model: string;
  private promptEngine: PromptEngine;
  private cache?: LLMCache;
  private InvokeModelCommand: typeof InvokeModelCommand;

  /**
   * Create a new Bedrock provider
   * @param options - Provider options
   */
  constructor(options: BedrockProviderOptions = {}) {
    // Dynamically import Bedrock SDK
    const BedrockSDK = this.requireBedrock();

    this.client = new BedrockSDK.BedrockRuntimeClient({
      region: options.region || 'us-east-1',
      credentials: options.credentials,
    });

    this.InvokeModelCommand = BedrockSDK.InvokeModelCommand;
    this.model = options.model || 'anthropic.claude-3-haiku-20240307-v1:0';
    this.promptEngine = options.promptEngine || new PromptEngine();
    this.cache = options.cache;
  }

  /**
   * Validate input using AWS Bedrock
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

      // Build request body based on model type
      const requestBody = this.buildRequestBody(
        prompt,
        options?.maxTokens || 150,
        options?.temperature || 0
      );

      // Call Bedrock API
      const command = new this.InvokeModelCommand({
        modelId: this.model,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody),
      });

      const response = await this.client.send(command);

      // Parse response
      const responseBody = JSON.parse(
        new TextDecoder().decode(response.body)
      );

      // Extract text based on model type
      const text = this.extractText(responseBody);

      // Parse response
      const parsed = this.promptEngine.parseResponse(text, guardType);

      // Calculate cost
      const cost = this.calculateCost(responseBody);

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
          tokens: this.extractTokenCount(responseBody),
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
      console.error('Bedrock validation error:', error);
      throw new Error(
        `Bedrock validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Build request body based on model type
   * @param prompt - Prompt text
   * @param maxTokens - Maximum tokens
   * @param temperature - Temperature
   * @returns Request body
   */
  private buildRequestBody(
    prompt: string,
    maxTokens: number,
    temperature: number
  ): any {
    // Check if it's an Anthropic model
    if (this.model.startsWith('anthropic.')) {
      return {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: maxTokens,
        temperature,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      };
    }

    // Default to generic format (works for many models)
    return {
      prompt,
      max_tokens: maxTokens,
      temperature,
    };
  }

  /**
   * Extract text from response body
   * @param responseBody - Response body
   * @returns Extracted text
   */
  private extractText(responseBody: any): string {
    // Anthropic format
    if (responseBody.content && Array.isArray(responseBody.content)) {
      const textContent = responseBody.content.find(
        (c: any) => c.type === 'text'
      );
      return textContent?.text || '';
    }

    // Generic format
    if (responseBody.completion) {
      return responseBody.completion;
    }

    if (responseBody.text) {
      return responseBody.text;
    }

    return '';
  }

  /**
   * Extract token count from response
   * @param responseBody - Response body
   * @returns Token count
   */
  private extractTokenCount(responseBody: any): number | undefined {
    if (responseBody.usage) {
      return (
        (responseBody.usage.input_tokens || 0) +
        (responseBody.usage.output_tokens || 0)
      );
    }
    return undefined;
  }

  /**
   * Calculate cost based on response
   * @param responseBody - Response body
   * @returns Cost in dollars
   */
  private calculateCost(responseBody: any): number {
    // Try to get usage from response
    const usage = responseBody.usage;
    if (!usage) {
      return 0;
    }

    // Anthropic Claude 3 Haiku on Bedrock pricing:
    // Input: $0.25 per 1M tokens
    // Output: $1.25 per 1M tokens
    const inputCost = ((usage.input_tokens || 0) / 1_000_000) * 0.25;
    const outputCost = ((usage.output_tokens || 0) / 1_000_000) * 1.25;
    return inputCost + outputCost;
  }

  /**
   * Get provider information
   * @returns Provider info
   */
  getInfo(): LLMProviderInfo {
    return {
      name: 'bedrock',
      model: this.model,
      costPerCheck: 0.0002, // Approximate average cost
      averageLatency: 200, // Approximate average latency in ms
    };
  }

  /**
   * Dynamically require Bedrock SDK
   * @returns Bedrock SDK
   */
  private requireBedrock(): {
    BedrockRuntimeClient: typeof BedrockRuntimeClient;
    InvokeModelCommand: typeof InvokeModelCommand;
  } {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('@aws-sdk/client-bedrock-runtime');
    } catch (error) {
      throw new Error(
        'AWS Bedrock SDK not found. Install it with: npm install @aws-sdk/client-bedrock-runtime'
      );
    }
  }
}
