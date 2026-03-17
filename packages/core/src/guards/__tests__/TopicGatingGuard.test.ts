import { describe, it, expect } from 'vitest';
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
});
