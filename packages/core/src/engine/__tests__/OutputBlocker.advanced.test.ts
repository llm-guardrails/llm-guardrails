import { OutputBlocker } from '../OutputBlocker';
import type { GuardrailResult } from '../../types';
import type { BlockedMessageOptions } from '../../types/output';

describe('OutputBlocker Advanced Messages', () => {
  const mockResult: GuardrailResult = {
    passed: false,
    blocked: true,
    reason: 'Injection detected',
    guard: 'injection',
    results: [],
  };

  describe('wrapper configuration', () => {
    it('should apply prefix wrapper', () => {
      const blocker = new OutputBlocker('block', {
        blockedMessage: {
          message: 'Blocked',
          wrapper: {
            prefix: '[SYSTEM] ',
          },
        } as BlockedMessageOptions,
      });

      const result = blocker.applyStrategy(mockResult, 'original');

      expect(result.sanitized).toBe('[SYSTEM] Blocked');
    });

    it('should apply suffix wrapper', () => {
      const blocker = new OutputBlocker('block', {
        blockedMessage: {
          message: 'Blocked',
          wrapper: {
            suffix: ' [END]',
          },
        } as BlockedMessageOptions,
      });

      const result = blocker.applyStrategy(mockResult, 'original');

      expect(result.sanitized).toBe('Blocked [END]');
    });

    it('should apply tagFormat wrapper', () => {
      const blocker = new OutputBlocker('block', {
        blockedMessage: {
          message: 'Content blocked',
          wrapper: {
            tagFormat: '[GUARDRAIL:${guard}]',
          },
        } as BlockedMessageOptions,
      });

      const result = blocker.applyStrategy(mockResult, 'original');

      expect(result.sanitized).toBe('[GUARDRAIL:injection] Content blocked');
    });

    it('should apply prefix and suffix together', () => {
      const blocker = new OutputBlocker('block', {
        blockedMessage: {
          message: 'Blocked',
          wrapper: {
            prefix: '[START] ',
            suffix: ' [END]',
          },
        } as BlockedMessageOptions,
      });

      const result = blocker.applyStrategy(mockResult, 'original');

      expect(result.sanitized).toBe('[START] Blocked [END]');
    });
  });

  describe('per-guard messages', () => {
    it('should use per-guard message when available', () => {
      const blocker = new OutputBlocker('block', {
        blockedMessage: {
          message: 'Default message',
          perGuard: {
            'injection': 'Security attack detected',
            'pii': 'Personal data blocked',
          },
        } as BlockedMessageOptions,
      });

      const result = blocker.applyStrategy(mockResult, 'original');

      expect(result.sanitized).toBe('Security attack detected');
    });

    it('should fallback to default message when no per-guard match', () => {
      const blocker = new OutputBlocker('block', {
        blockedMessage: {
          message: 'Default message',
          perGuard: {
            'pii': 'Personal data blocked',
          },
        } as BlockedMessageOptions,
      });

      const result = blocker.applyStrategy(mockResult, 'original');

      expect(result.sanitized).toBe('Default message');
    });

    it('should support per-guard function callbacks', () => {
      const blocker = new OutputBlocker('block', {
        blockedMessage: {
          message: 'Default message',
          perGuard: {
            'injection': (result) => ({
              message: `Attack from ${result.guard}`,
            }),
          },
        } as BlockedMessageOptions,
      });

      const result = blocker.applyStrategy(mockResult, 'original');

      expect(result.sanitized).toBe('Attack from injection');
    });
  });

  describe('includeMetadata', () => {
    it('should include metadata when configured', () => {
      const blocker = new OutputBlocker('block', {
        blockedMessage: {
          message: 'Blocked',
          includeMetadata: true,
        } as BlockedMessageOptions,
      });

      const result = blocker.applyStrategy(mockResult, 'original');

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.blocked).toBe(true);
      expect(result.metadata?.guard).toBe('injection');
      expect(result.metadata?.reason).toBe('Injection detected');
    });

    it('should not include metadata by default', () => {
      const blocker = new OutputBlocker('block', {
        blockedMessage: {
          message: 'Blocked',
        } as BlockedMessageOptions,
      });

      const result = blocker.applyStrategy(mockResult, 'original');

      expect(result.metadata?.blocked).toBeUndefined();
    });
  });
});
