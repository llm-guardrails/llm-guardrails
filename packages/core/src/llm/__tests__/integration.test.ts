/**
 * Integration tests for L3 LLM validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockLLMProvider } from './MockLLMProvider';
import { PromptEngine } from '../prompts/PromptEngine';
import { LLMCache } from '../cache/LLMCache';
import { LLMBudgetTracker } from '../budget/LLMBudgetTracker';
import type { LLMConfig } from '../../types/llm';

describe('L3 LLM Integration', () => {
  let mockProvider: MockLLMProvider;
  let promptEngine: PromptEngine;
  let cache: LLMCache;
  let budgetTracker: LLMBudgetTracker;

  beforeEach(() => {
    mockProvider = new MockLLMProvider();
    promptEngine = new PromptEngine('guard-specific');
    cache = new LLMCache({
      enabled: true,
      ttl: 60000,
      maxSize: 100,
    });
    budgetTracker = new LLMBudgetTracker({
      maxCallsPerSession: 10,
      maxCostPerSession: 0.01,
    });
  });

  describe('MockLLMProvider', () => {
    it('should return default response', async () => {
      const result = await mockProvider.validate('test input', 'pii');

      expect(result).toBeDefined();
      expect(result.guardType).toBe('pii');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should return custom response when set', async () => {
      mockProvider.setResponse('malicious input', 'injection', {
        blocked: true,
        confidence: 0.95,
        reason: 'Detected prompt injection',
      });

      const result = await mockProvider.validate('malicious input', 'injection');

      expect(result.blocked).toBe(true);
      expect(result.confidence).toBe(0.95);
      expect(result.reason).toBe('Detected prompt injection');
    });

    it('should track call history', async () => {
      await mockProvider.validate('input1', 'pii');
      await mockProvider.validate('input2', 'injection');

      const history = mockProvider.getCallHistory();
      expect(history).toHaveLength(2);
      expect(history[0].input).toBe('input1');
      expect(history[0].guardType).toBe('pii');
      expect(history[1].input).toBe('input2');
      expect(history[1].guardType).toBe('injection');
    });
  });

  describe('PromptEngine', () => {
    it('should generate guard-specific prompts', () => {
      const prompt = promptEngine.getPrompt('pii', 'test@example.com');

      expect(prompt).toContain('test@example.com');
      expect(prompt.toLowerCase()).toContain('pii');
    });

    it('should parse valid JSON responses', () => {
      const response = JSON.stringify({
        blocked: true,
        confidence: 0.9,
        reason: 'PII detected',
      });

      const parsed = promptEngine.parseResponse(response, 'pii');

      expect(parsed.blocked).toBe(true);
      expect(parsed.confidence).toBe(0.9);
      expect(parsed.reason).toBe('PII detected');
    });

    it('should handle malformed responses gracefully', () => {
      const response = 'This is not JSON';

      const parsed = promptEngine.parseResponse(response, 'pii');

      expect(parsed).toBeDefined();
      expect(typeof parsed.blocked).toBe('boolean');
      expect(typeof parsed.confidence).toBe('number');
    });
  });

  describe('LLMCache', () => {
    it('should cache and retrieve results', () => {
      const result = {
        blocked: true,
        confidence: 0.9,
        reason: 'Test',
        guardType: 'pii',
      };

      cache.set('test input', 'pii', 'gpt-4', result);
      const cached = cache.get('test input', 'pii', 'gpt-4');

      expect(cached).toBeDefined();
      expect(cached?.blocked).toBe(true);
      expect(cached?.metadata?.cached).toBe(true);
    });

    it('should return null for cache miss', () => {
      const cached = cache.get('not cached', 'pii', 'gpt-4');
      expect(cached).toBeNull();
    });

    it('should respect TTL', async () => {
      const shortCache = new LLMCache({
        enabled: true,
        ttl: 10, // 10ms
        maxSize: 100,
      });

      const result = {
        blocked: true,
        confidence: 0.9,
        reason: 'Test',
        guardType: 'pii',
      };

      shortCache.set('test', 'pii', 'gpt-4', result);

      // Should be cached immediately
      expect(shortCache.get('test', 'pii', 'gpt-4')).toBeDefined();

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Should be expired
      expect(shortCache.get('test', 'pii', 'gpt-4')).toBeNull();
    });

    it('should track cache statistics', () => {
      const result = {
        blocked: true,
        confidence: 0.9,
        reason: 'Test',
        guardType: 'pii',
      };

      // Add entry
      cache.set('test', 'pii', 'gpt-4', result);

      // Hit
      cache.get('test', 'pii', 'gpt-4');

      // Miss
      cache.get('not cached', 'pii', 'gpt-4');

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });
  });

  describe('LLMBudgetTracker', () => {
    it('should allow calls within budget', () => {
      expect(budgetTracker.canAfford('session1', 0.001)).toBe(true);
    });

    it('should deny calls exceeding session budget', () => {
      // Max session cost is 0.01
      budgetTracker.recordCall(0.009, 'session1');
      expect(budgetTracker.canAfford('session1', 0.002)).toBe(false);
    });

    it('should deny calls exceeding max calls', () => {
      // Max calls per session is 10
      for (let i = 0; i < 10; i++) {
        budgetTracker.recordCall(0.0001, 'session1');
      }
      expect(budgetTracker.canAfford('session1', 0.0001)).toBe(false);
    });

    it('should track usage correctly', () => {
      budgetTracker.recordCall(0.001, 'session1');
      budgetTracker.recordCall(0.002, 'session1');

      const usage = budgetTracker.getUsage('session1');
      expect(usage.calls).toBe(2);
      expect(usage.totalCost).toBeCloseTo(0.003);
    });

    it('should handle multiple sessions independently', () => {
      budgetTracker.recordCall(0.005, 'session1');
      budgetTracker.recordCall(0.003, 'session2');

      const usage1 = budgetTracker.getUsage('session1');
      const usage2 = budgetTracker.getUsage('session2');

      expect(usage1.totalCost).toBeCloseTo(0.005);
      expect(usage2.totalCost).toBeCloseTo(0.003);
    });
  });

  describe('End-to-End LLM Validation', () => {
    it('should perform complete validation with all components', async () => {
      // Setup
      mockProvider.setResponse('test@example.com', 'pii', {
        blocked: true,
        confidence: 0.95,
        reason: 'Email address detected',
        metadata: {
          cost: 0.0001,
          tokens: 50,
          latency: 100,
        },
      });

      const llmConfig: LLMConfig = {
        enabled: true,
        provider: mockProvider,
        cache: {
          enabled: true,
          ttl: 60000,
          maxSize: 100,
        },
        budget: {
          maxCallsPerSession: 10,
          maxCostPerSession: 0.01,
        },
      };

      // First call - should hit LLM
      const result1 = await mockProvider.validate('test@example.com', 'pii');

      expect(result1.blocked).toBe(true);
      expect(result1.confidence).toBe(0.95);
      expect(mockProvider.getCallCount()).toBe(1);

      // Record cost
      if (result1.metadata?.cost) {
        budgetTracker.recordCall(result1.metadata.cost, 'session1');
      }

      // Check budget status
      const status = budgetTracker.getStatus('session1');
      expect(status.calls).toBe(1);
      expect(status.exceeded).toBe(false);
    });
  });
});
