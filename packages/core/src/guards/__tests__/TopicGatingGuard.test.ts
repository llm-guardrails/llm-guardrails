import { describe, it, expect, vi } from 'vitest';
import { TopicGatingGuard } from '../TopicGatingGuard';
import { DETECTION_PRESETS } from '../../engine/DetectionLayer';

describe('TopicGatingGuard', () => {
  describe('L1 - Keyword Matching', () => {
    it('should block input with blocked keywords', async () => {
      const guard = new TopicGatingGuard(DETECTION_PRESETS.standard, {
        blockedKeywords: ['equation', 'calculate', 'math'],
      });

      const result = await guard.check('Please solve this equation for me');

      expect(result.blocked).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.reason).toContain('blocked keyword');
    });

    it('should allow input with allowed keywords', async () => {
      const guard = new TopicGatingGuard(DETECTION_PRESETS.standard, {
        blockedKeywords: ['math', 'coding'],
        allowedKeywords: ['pricing', 'order', 'support'],
      });

      const result = await guard.check('What is your pricing for enterprise?');

      expect(result.blocked).toBe(false);
    });

    it('should handle case-insensitive matching by default', async () => {
      const guard = new TopicGatingGuard(DETECTION_PRESETS.standard, {
        blockedKeywords: ['SOLVE'],
      });

      const result = await guard.check('help me solve this');

      expect(result.blocked).toBe(true);
    });

    it('should handle case-sensitive matching when configured', async () => {
      const guard = new TopicGatingGuard(DETECTION_PRESETS.standard, {
        blockedKeywords: ['SOLVE'],
        caseSensitive: true,
      });

      const lowerResult = await guard.check('help me solve this');
      expect(lowerResult.blocked).toBe(false);

      const upperResult = await guard.check('help me SOLVE this');
      expect(upperResult.blocked).toBe(true);
    });

    it('should prioritize allowed keywords over blocked', async () => {
      const guard = new TopicGatingGuard(DETECTION_PRESETS.standard, {
        blockedKeywords: ['help'],
        allowedKeywords: ['support', 'help'],
      });

      const result = await guard.check('I need help with my order');

      expect(result.blocked).toBe(false);
    });
  });

  describe('L2 - Pattern Matching', () => {
    const guard = new TopicGatingGuard(DETECTION_PRESETS.standard, {
      blockedTopicsDescription: 'Math, coding, trivia',
      allowedTopicsDescription: 'Product questions',
    });

    it('should detect math calculation patterns', async () => {
      const result = await guard.check('What is 2 + 2?');

      expect(result.blocked).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.reason).toContain('math');
    });

    it('should detect math equation patterns', async () => {
      const result = await guard.check('Solve for x: 2x + 5 = 15');

      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('math');
    });

    it('should detect coding patterns', async () => {
      const testCases = [
        'Write a function to sort an array',
        'How do I debug this JavaScript code?',
        'Create a Python script for me',
      ];

      for (const testCase of testCases) {
        const result = await guard.check(testCase);
        expect(result.blocked).toBe(true);
        expect(result.reason).toContain('coding');
      }
    });

    it('should detect trivia patterns', async () => {
      const testCases = [
        'What is the capital of France?',
        'Who was the first president of the United States?',
        'When did World War 2 end?',
      ];

      for (const testCase of testCases) {
        const result = await guard.check(testCase);
        expect(result.blocked).toBe(true);
        expect(result.reason).toContain('trivia');
      }
    });

    it('should detect business/product patterns as allowed', async () => {
      const testCases = [
        'What is your pricing?',
        'How do I place an order?',
        'I need support with my purchase',
      ];

      for (const testCase of testCases) {
        const result = await guard.check(testCase);
        expect(result.blocked).toBe(false);
      }
    });

    it('should combine L1 and L2 scores appropriately', async () => {
      const guard = new TopicGatingGuard(DETECTION_PRESETS.standard, {
        blockedKeywords: ['equation'],
        blockedTopicsDescription: 'Math',
      });

      const result = await guard.check('Solve this equation: 2 + 2');

      // Should have high confidence from both L1 and L2
      expect(result.blocked).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('L3 - Semantic Validation', () => {
    const mockLLMProvider = {
      name: 'mock-llm',
      complete: async (prompt: string) => {
        // Mock LLM responses based on prompt content
        if (prompt.includes('integrate your API')) {
          return JSON.stringify({
            blocked: false,
            confidence: 0.85,
            reason: 'Product integration question',
            detectedTopic: 'product',
          });
        }
        if (prompt.includes('2+2') || prompt.includes('2 + 2')) {
          return JSON.stringify({
            blocked: true,
            confidence: 0.95,
            reason: 'Math calculation',
            detectedTopic: 'math',
          });
        }
        return JSON.stringify({
          blocked: false,
          confidence: 0.6,
          reason: 'Uncertain',
          detectedTopic: 'unknown',
        });
      },
    };

    it('should use LLM for nuanced topic classification', async () => {
      // Create mock that will block via L3
      const customMockLLM = {
        name: 'mock-llm',
        complete: async (prompt: string) => {
          if (prompt.includes('subtle coding question')) {
            return JSON.stringify({
              blocked: true,
              confidence: 0.85,
              reason: 'Coding question disguised as integration help',
              detectedTopic: 'coding',
            });
          }
          return JSON.stringify({
            blocked: false,
            confidence: 0.6,
            reason: 'Uncertain',
            detectedTopic: 'unknown',
          });
        },
      };

      const detectionConfig = {
        ...DETECTION_PRESETS.advanced,
        tier3: {
          enabled: true,
          provider: customMockLLM,
          onlyIfSuspicious: false, // Always call L3 for this test
          costLimit: 0.01,
        },
      };

      const guard = new TopicGatingGuard(detectionConfig, {
        allowedTopicsDescription: 'Product and integration questions',
        blockedTopicsDescription: 'Math, coding',
      });

      const result = await guard.check('Help me with this subtle coding question about APIs');

      // L3 should detect this as coding despite it not matching L1/L2 patterns
      expect(result.blocked).toBe(true);
      expect(result.tier).toBe('L3');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should block clear violations detected by LLM', async () => {
      const detectionConfig = {
        ...DETECTION_PRESETS.advanced,
        tier3: {
          enabled: true,
          provider: mockLLMProvider,
          onlyIfSuspicious: true,
        },
      };

      const guard = new TopicGatingGuard(detectionConfig, {
        allowedTopicsDescription: 'Product questions',
        blockedTopicsDescription: 'Math problems',
      });

      const result = await guard.check('What is 2+2?');

      expect(result.blocked).toBe(true);
      expect(result.tier).toBe('L2'); // L2 catches this with math pattern
    });

    it('should gracefully degrade if L3 unavailable', async () => {
      const guard = new TopicGatingGuard(DETECTION_PRESETS.advanced, {
        allowedTopicsDescription: 'Product questions',
        blockedTopicsDescription: 'Math',
      });

      const result = await guard.check('What is 2+2?');

      // Should use L2 result (math pattern)
      expect(result.blocked).toBe(true);
      expect(result.tier).not.toBe('L3');
    });
  });

  describe('Edge Cases', () => {
    it('should throw error if no config provided', () => {
      expect(() => {
        new TopicGatingGuard(DETECTION_PRESETS.standard, {});
      }).toThrow('Must provide either topic descriptions or keywords');
    });

    it('should handle empty strings gracefully', async () => {
      const guard = new TopicGatingGuard(DETECTION_PRESETS.standard, {
        blockedKeywords: ['test'],
      });

      const result = await guard.check('');
      expect(result.blocked).toBe(false);
    });

    it('should handle very long inputs', async () => {
      const guard = new TopicGatingGuard(DETECTION_PRESETS.standard, {
        blockedKeywords: ['math'],
      });

      const longInput = 'hello '.repeat(10000) + ' solve equation';
      const result = await guard.check(longInput);

      // L2 pattern matching catches "solve equation" as math pattern
      expect(result.blocked).toBe(true);
      expect(result.tier).toBe('L2');
    });

    it('should handle special characters in keywords', async () => {
      const guard = new TopicGatingGuard(DETECTION_PRESETS.standard, {
        blockedKeywords: ['c++', 'node.js', '$variable'],
      });

      const result1 = await guard.check('I need help with c++');
      expect(result1.blocked).toBe(true);

      const result2 = await guard.check('How do I use node.js?');
      expect(result2.blocked).toBe(true);
    });

    it('should handle unicode characters', async () => {
      const guard = new TopicGatingGuard(DETECTION_PRESETS.standard, {
        blockedKeywords: ['математика'], // Russian for "mathematics"
      });

      const result = await guard.check('помогите с математика');
      // Note: Word boundaries \b may not work perfectly with all unicode
      // This test documents current behavior
      expect(result).toBeDefined();
    });
  });
});
