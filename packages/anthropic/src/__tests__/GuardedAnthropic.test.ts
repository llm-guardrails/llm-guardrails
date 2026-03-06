/**
 * Tests for GuardedAnthropic
 */

import { describe, it, expect, vi } from 'vitest';
import { GuardedAnthropic, GuardrailBlockError } from '../GuardedAnthropic';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn(),
      };
      constructor(config: any) {}
    },
  };
});

describe('GuardedAnthropic', () => {
  describe('Initialization', () => {
    it('should create instance with default config', () => {
      const client = new GuardedAnthropic({
        apiKey: 'test-key',
      });

      expect(client).toBeInstanceOf(GuardedAnthropic);
      expect(client.getGuardrailEngine()).toBeDefined();
    });

    it('should accept guardrail configuration', () => {
      const client = new GuardedAnthropic({
        apiKey: 'test-key',
        guardrails: {
          guards: ['injection', 'pii'],
          level: 'standard',
        },
      });

      const engine = client.getGuardrailEngine();
      const guards = engine.getGuards();

      expect(guards.length).toBeGreaterThan(0);
      expect(guards.some((g) => g.name === 'injection')).toBe(true);
    });

    it('should support caching configuration', () => {
      const client = new GuardedAnthropic({
        apiKey: 'test-key',
        guardrails: {
          cache: {
            enabled: true,
            maxSize: 100,
            ttl: 5000,
          },
        },
      });

      expect(client.isCacheEnabled()).toBe(true);
    });
  });

  describe('Guardrail Engine Access', () => {
    it('should provide access to guardrail engine', () => {
      const client = new GuardedAnthropic({ apiKey: 'test-key' });
      const engine = client.getGuardrailEngine();

      expect(engine).toBeDefined();
      expect(engine.getGuards).toBeDefined();
    });

    it('should provide cache statistics', () => {
      const client = new GuardedAnthropic({
        apiKey: 'test-key',
        guardrails: {
          cache: { enabled: true },
        },
      });

      const stats = client.getCacheStats();
      expect(stats).toBeDefined();
    });

    it('should allow clearing cache', () => {
      const client = new GuardedAnthropic({
        apiKey: 'test-key',
        guardrails: {
          cache: { enabled: true },
        },
      });

      expect(() => client.clearCache()).not.toThrow();
    });
  });

  describe('Configuration Options', () => {
    it('should support disabling input checking', () => {
      const client = new GuardedAnthropic({
        apiKey: 'test-key',
        checkInput: false,
        guardrails: {
          guards: ['injection'],
        },
      });

      expect(client).toBeDefined();
    });

    it('should support disabling output checking', () => {
      const client = new GuardedAnthropic({
        apiKey: 'test-key',
        checkOutput: false,
        guardrails: {
          guards: ['toxicity'],
        },
      });

      expect(client).toBeDefined();
    });

    it('should support custom block handler', () => {
      const onBlock = vi.fn();

      const client = new GuardedAnthropic({
        apiKey: 'test-key',
        guardrails: {
          guards: ['injection'],
        },
        onBlock,
      });

      expect(client).toBeDefined();
    });

    it('should support throwOnBlock option', () => {
      const client = new GuardedAnthropic({
        apiKey: 'test-key',
        guardrails: {
          guards: ['injection'],
        },
        throwOnBlock: false,
      });

      expect(client).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw GuardrailBlockError', () => {
      const result = {
        passed: false,
        blocked: true,
        reason: 'Test block',
        guard: 'test-guard',
        results: [],
        totalLatency: 0,
      };

      const error = new GuardrailBlockError(result, []);

      expect(error).toBeInstanceOf(GuardrailBlockError);
      expect(error.message).toContain('Test block');
      expect(error.result).toEqual(result);
    });
  });

  describe('Integration', () => {
    it('should work with observability', () => {
      const client = new GuardedAnthropic({
        apiKey: 'test-key',
        guardrails: {
          guards: ['injection'],
          observability: {
            metrics: { enabled: true },
          },
        },
      });

      expect(client.getGuardrailEngine().isObservabilityEnabled()).toBe(true);
    });

    it('should work with all guard types', () => {
      const allGuards = [
        'injection',
        'leakage',
        'secrets',
        'pii',
        'toxicity',
        'hate-speech',
        'bias',
        'adult-content',
        'copyright',
        'profanity',
      ];

      const client = new GuardedAnthropic({
        apiKey: 'test-key',
        guardrails: {
          guards: allGuards,
        },
      });

      const engine = client.getGuardrailEngine();
      const guards = engine.getGuards();

      expect(guards.length).toBe(allGuards.length);
    });
  });

  describe('Cache Integration', () => {
    it('should use cache when enabled', () => {
      const client = new GuardedAnthropic({
        apiKey: 'test-key',
        guardrails: {
          guards: ['injection'],
          cache: {
            enabled: true,
            maxSize: 100,
            ttl: 5000,
          },
        },
      });

      expect(client.isCacheEnabled()).toBe(true);

      const stats = client.getCacheStats();
      expect(stats).toBeDefined();
      expect(stats!.maxSize).toBe(100);
    });

    it('should not use cache when disabled', () => {
      const client = new GuardedAnthropic({
        apiKey: 'test-key',
        guardrails: {
          guards: ['injection'],
        },
      });

      expect(client.isCacheEnabled()).toBe(false);
      expect(client.getCacheStats()).toBeUndefined();
    });
  });

  describe('Observability Integration', () => {
    it('should support full observability stack', () => {
      const client = new GuardedAnthropic({
        apiKey: 'test-key',
        guardrails: {
          guards: ['injection'],
          observability: {
            metrics: { enabled: true },
            logging: { enabled: true, level: 'info' },
            tracing: { enabled: true },
          },
        },
      });

      expect(client.getGuardrailEngine().isObservabilityEnabled()).toBe(true);
      const stats = client.getObservabilityStats();
      expect(stats).toBeDefined();
    });
  });
});
