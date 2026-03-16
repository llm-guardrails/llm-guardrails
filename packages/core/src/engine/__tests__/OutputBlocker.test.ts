import { OutputBlocker } from '../OutputBlocker';
import type { GuardrailResult } from '../../types';
import { GuardrailViolation } from '../../types';
import { vi } from 'vitest';

describe('OutputBlocker', () => {
  const mockResult: GuardrailResult = {
    passed: false,
    blocked: true,
    reason: 'Test block',
    guard: 'test-guard',
    results: [],
  };

  describe('block strategy', () => {
    it('should return sanitized message', () => {
      const blocker = new OutputBlocker('block', {
        blockedMessage: 'Custom blocked message',
      });

      const result = blocker.applyStrategy(mockResult, 'original content');

      expect(result.sanitized).toBe('Custom blocked message');
      expect(result.blocked).toBe(true);
    });

    it('should use default message when none configured', () => {
      const blocker = new OutputBlocker('block', {});

      const result = blocker.applyStrategy(mockResult, 'original content');

      expect(result.sanitized).toBe('[Response blocked by guardrails]');
    });
  });

  describe('sanitize strategy', () => {
    it('should return redacted message', () => {
      const blocker = new OutputBlocker('sanitize', {});

      const result = blocker.applyStrategy(mockResult, 'original content');

      expect(result.sanitized).toBe('[Content redacted for safety]');
      expect(result.blocked).toBe(false); // Allow with sanitization
    });
  });

  describe('throw strategy', () => {
    it('should throw GuardrailViolation', () => {
      const blocker = new OutputBlocker('throw', {});

      expect(() => {
        blocker.applyStrategy(mockResult, 'original content');
      }).toThrow(GuardrailViolation);
    });

    it('should include guard metadata in error', () => {
      const blocker = new OutputBlocker('throw', {});

      try {
        blocker.applyStrategy(mockResult, 'original content');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(GuardrailViolation);
        expect((error as GuardrailViolation).guard).toBe('test-guard');
        expect((error as GuardrailViolation).severity).toBe('high');
      }
    });
  });

  describe('custom strategy', () => {
    it('should use responseTransform when provided', () => {
      const transformer = vi.fn((response, result) => ({
        ...response,
        customField: 'transformed',
      }));

      const blocker = new OutputBlocker('custom', {
        responseTransform: transformer,
      });

      const result = blocker.applyStrategy(mockResult, 'original content');

      expect(transformer).toHaveBeenCalledWith(mockResult, mockResult);
    });

    it('should return original result when no transformer', () => {
      const blocker = new OutputBlocker('custom', {});

      const result = blocker.applyStrategy(mockResult, 'original content');

      expect(result).toEqual(mockResult);
    });
  });

  describe('default strategy', () => {
    it('should default to block strategy', () => {
      const blocker = new OutputBlocker(undefined as any, {
        blockedMessage: 'Blocked',
      });

      const result = blocker.applyStrategy(mockResult, 'original content');

      expect(result.sanitized).toBe('Blocked');
    });
  });
});
