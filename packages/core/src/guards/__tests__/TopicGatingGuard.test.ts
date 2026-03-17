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
});
