import { describe, it, expect } from 'vitest';
import { CostCalculator } from '../CostCalculator';

describe('CostCalculator', () => {
  const calculator = new CostCalculator();

  describe('Cost Calculation', () => {
    it('calculates cost for Claude Sonnet', () => {
      const cost = calculator.calculate(
        1000, // input tokens
        2000, // output tokens
        'claude-3-5-sonnet-20241022'
      );

      // $3 per 1M input = $0.003 for 1K
      // $15 per 1M output = $0.030 for 2K
      // Total: $0.033
      expect(cost).toBeCloseTo(0.033, 5);
    });

    it('calculates cost for GPT-4o', () => {
      const cost = calculator.calculate(
        1000, // input tokens
        2000, // output tokens
        'gpt-4o'
      );

      // $5 per 1M input = $0.005 for 1K
      // $15 per 1M output = $0.030 for 2K
      // Total: $0.035
      expect(cost).toBeCloseTo(0.035, 5);
    });

    it('calculates cost for GPT-3.5 Turbo', () => {
      const cost = calculator.calculate(
        10000, // input tokens
        5000, // output tokens
        'gpt-3.5-turbo'
      );

      // $0.50 per 1M input = $0.005 for 10K
      // $1.50 per 1M output = $0.0075 for 5K
      // Total: $0.0125
      expect(cost).toBeCloseTo(0.0125, 5);
    });

    it('includes cache costs when provided', () => {
      const cost = calculator.calculate(
        1000,
        2000,
        'claude-3-5-sonnet-20241022',
        { cacheHits: 5000 }
      );

      // $0.033 (base) + ($0.30 per 1M × 5K) = $0.033 + $0.0015
      expect(cost).toBeCloseTo(0.0345, 4);
    });

    it('ignores cache costs for models without caching', () => {
      const costWithoutCache = calculator.calculate(1000, 2000, 'gpt-4o');

      const costWithCache = calculator.calculate(1000, 2000, 'gpt-4o', { cacheHits: 5000 });

      expect(costWithCache).toBe(costWithoutCache);
    });
  });

  describe('Cost Estimation', () => {
    it('estimates cost conservatively', () => {
      const estimated = calculator.estimateCost(1000, 'claude-3-5-sonnet-20241022');

      // With default 2x output ratio: 1000 input + 2000 estimated output
      const actual = calculator.calculate(1000, 2000, 'claude-3-5-sonnet-20241022');

      expect(estimated).toBeCloseTo(actual, 5);
    });

    it('uses custom output ratio', () => {
      const estimated = calculator.estimateCost(1000, 'claude-3-5-sonnet-20241022', {
        expectedOutputRatio: 3,
      });

      // 1000 input + 3000 estimated output
      const actual = calculator.calculate(1000, 3000, 'claude-3-5-sonnet-20241022');

      expect(estimated).toBeCloseTo(actual, 5);
    });
  });

  describe('Model Pricing Lookup', () => {
    it('gets pricing for known model', () => {
      const pricing = calculator.getPricing('gpt-4o');

      expect(pricing).toBeDefined();
      expect(pricing?.model).toBe('gpt-4o');
      expect(pricing?.provider).toBe('openai');
      expect(pricing?.inputCostPer1M).toBe(5.0);
    });

    it('fuzzy matches model variants', () => {
      const pricing = calculator.getPricing('gpt-4o-2024-05-13');

      expect(pricing).toBeDefined();
      expect(pricing?.model).toBe('gpt-4o');
    });

    it('returns null for unknown models', () => {
      const pricing = calculator.getPricing('totally-unknown-model');

      expect(pricing).toBeNull();
    });

    it('uses conservative estimate for unknown models', () => {
      const cost = calculator.calculate(1000, 2000, 'unknown-model');

      // Should use GPT-4 pricing (conservative)
      // $30 per 1M input = $0.030 for 1K
      // $60 per 1M output = $0.120 for 2K
      // Total: $0.150
      expect(cost).toBeCloseTo(0.150, 3);
    });
  });

  describe('Model List', () => {
    it('lists all supported models', () => {
      const models = calculator.listModels();

      expect(models).toContain('claude-3-5-sonnet-20241022');
      expect(models).toContain('gpt-4o');
      expect(models).toContain('gemini-1.5-pro');
      expect(models.length).toBeGreaterThan(15); // 20+ models
    });
  });

  describe('Edge Cases', () => {
    it('handles zero tokens', () => {
      const cost = calculator.calculate(0, 0, 'gpt-4o');
      expect(cost).toBe(0);
    });

    it('handles very large token counts', () => {
      const cost = calculator.calculate(1_000_000, 1_000_000, 'gpt-4o');

      // $5 per 1M input + $15 per 1M output = $20
      expect(cost).toBeCloseTo(20.0, 2);
    });

    it('handles fractional tokens', () => {
      const cost = calculator.calculate(500, 1500, 'gpt-3.5-turbo');

      // Should handle correctly
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(0.01);
    });
  });

  describe('Real-world Scenarios', () => {
    it('calculates cost for typical chat message', () => {
      // Typical: ~500 input, ~200 output tokens
      const cost = calculator.calculate(500, 200, 'gpt-4o');

      // Should be a few cents
      expect(cost).toBeGreaterThan(0.001);
      expect(cost).toBeLessThan(0.01);
    });

    it('calculates cost for long document analysis', () => {
      // Long document: ~10K input, ~1K output
      const cost = calculator.calculate(10000, 1000, 'claude-3-5-sonnet-20241022');

      // $3 × 10 = $0.03 input
      // $15 × 1 = $0.015 output
      // Total: $0.045
      expect(cost).toBeCloseTo(0.045, 3);
    });

    it('calculates cost for code generation', () => {
      // Code gen: ~1K input, ~3K output
      const cost = calculator.calculate(1000, 3000, 'gpt-4o');

      // $5 × 0.001 = $0.005 input
      // $15 × 0.003 = $0.045 output
      // Total: $0.050
      expect(cost).toBeCloseTo(0.050, 3);
    });
  });
});
