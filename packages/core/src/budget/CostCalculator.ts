/**
 * Cost Calculator
 *
 * Calculates LLM costs based on token usage and model pricing.
 */

import { MODEL_PRICING, getModelPricing, type ModelPricing } from './pricing/models';

export class CostCalculator {
  /**
   * Calculate cost for given usage
   */
  calculate(
    inputTokens: number,
    outputTokens: number,
    model: string,
    options?: {
      cacheHits?: number;
    }
  ): number {
    const pricing = getModelPricing(model);

    if (!pricing) {
      // Unknown model, estimate based on GPT-4 pricing (conservative)
      const inputCost = (inputTokens / 1_000_000) * 30.0;
      const outputCost = (outputTokens / 1_000_000) * 60.0;
      return inputCost + outputCost;
    }

    let cost = 0;

    // Input tokens
    cost += (inputTokens / 1_000_000) * pricing.inputCostPer1M;

    // Output tokens
    cost += (outputTokens / 1_000_000) * pricing.outputCostPer1M;

    // Cache hits (if supported and provided)
    if (options?.cacheHits && pricing.cacheCostPer1M) {
      cost += (options.cacheHits / 1_000_000) * pricing.cacheCostPer1M;
    }

    return cost;
  }

  /**
   * Estimate cost before making API call (conservative estimate)
   */
  estimateCost(
    inputTokens: number,
    model: string,
    options?: {
      expectedOutputRatio?: number; // Expected output/input ratio (default: 2)
    }
  ): number {
    const outputRatio = options?.expectedOutputRatio || 2;
    const estimatedOutputTokens = Math.ceil(inputTokens * outputRatio);

    return this.calculate(inputTokens, estimatedOutputTokens, model);
  }

  /**
   * Get pricing information for a model
   */
  getPricing(model: string): ModelPricing | null {
    return getModelPricing(model);
  }

  /**
   * List all supported models
   */
  listModels(): string[] {
    return Object.keys(MODEL_PRICING);
  }
}
