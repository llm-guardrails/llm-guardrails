/**
 * Mock LLM provider for testing
 */

import type {
  LLMProviderV2,
  LLMValidationResult,
  LLMValidationOptions,
  LLMProviderInfo,
} from '../../types/llm.js';

/**
 * Mock LLM provider for testing
 */
export class MockLLMProvider implements LLMProviderV2 {
  private responses: Map<string, LLMValidationResult>;
  private defaultResponse: LLMValidationResult;
  private callHistory: Array<{
    input: string;
    guardType: string;
    options?: LLMValidationOptions;
  }>;

  constructor(defaultResponse?: Partial<LLMValidationResult>) {
    this.responses = new Map();
    this.callHistory = [];
    this.defaultResponse = {
      blocked: false,
      confidence: 0.5,
      reason: 'Mock response',
      guardType: 'mock',
      metadata: {
        model: 'mock-model',
        tokens: 100,
        cost: 0.0001,
        latency: 10,
        cached: false,
      },
      ...defaultResponse,
    };
  }

  /**
   * Set response for specific input and guard type
   * @param input - Input text
   * @param guardType - Guard type
   * @param result - Result to return
   */
  setResponse(
    input: string,
    guardType: string,
    result: Partial<LLMValidationResult>
  ): void {
    const key = this.makeKey(input, guardType);
    this.responses.set(key, {
      ...this.defaultResponse,
      ...result,
      guardType,
    });
  }

  /**
   * Set default response for all requests
   * @param result - Default result
   */
  setDefaultResponse(result: Partial<LLMValidationResult>): void {
    this.defaultResponse = {
      ...this.defaultResponse,
      ...result,
    };
  }

  /**
   * Validate input (mock implementation)
   * @param input - Text to validate
   * @param guardType - Guard type
   * @param options - Validation options
   * @returns Mocked validation result
   */
  async validate(
    input: string,
    guardType: string,
    options?: LLMValidationOptions
  ): Promise<LLMValidationResult> {
    // Record call
    this.callHistory.push({ input, guardType, options });

    // Simulate latency
    await new Promise((resolve) => setTimeout(resolve, 1));

    // Get specific response or use default
    const key = this.makeKey(input, guardType);
    const response = this.responses.get(key) || {
      ...this.defaultResponse,
      guardType,
    };

    return response;
  }

  /**
   * Get provider information
   * @returns Provider info
   */
  getInfo(): LLMProviderInfo {
    return {
      name: 'mock',
      model: 'mock-model',
      costPerCheck: 0.0001,
      averageLatency: 10,
    };
  }

  /**
   * Get call history
   * @returns Array of calls made to this provider
   */
  getCallHistory(): Array<{
    input: string;
    guardType: string;
    options?: LLMValidationOptions;
  }> {
    return [...this.callHistory];
  }

  /**
   * Get number of calls made
   * @returns Call count
   */
  getCallCount(): number {
    return this.callHistory.length;
  }

  /**
   * Get calls for a specific guard type
   * @param guardType - Guard type to filter by
   * @returns Filtered call history
   */
  getCallsForGuard(guardType: string): Array<{
    input: string;
    guardType: string;
    options?: LLMValidationOptions;
  }> {
    return this.callHistory.filter((call) => call.guardType === guardType);
  }

  /**
   * Reset call history
   */
  resetHistory(): void {
    this.callHistory = [];
  }

  /**
   * Clear all responses
   */
  clearResponses(): void {
    this.responses.clear();
  }

  /**
   * Reset provider to initial state
   */
  reset(): void {
    this.responses.clear();
    this.callHistory = [];
  }

  /**
   * Make cache key from input and guard type
   * @param input - Input text
   * @param guardType - Guard type
   * @returns Cache key
   */
  private makeKey(input: string, guardType: string): string {
    return `${guardType}:${input}`;
  }
}
