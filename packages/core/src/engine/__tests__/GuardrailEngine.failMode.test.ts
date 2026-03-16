import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GuardrailEngine } from '../GuardrailEngine';
import { InjectionGuard } from '../../guards/InjectionGuard';

describe('GuardrailEngine Fail Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkInput fail-closed', () => {
    it('should block on guard error when fail-closed', async () => {
      vi.spyOn(InjectionGuard.prototype, 'check').mockRejectedValue(
        new Error('LLM timeout')
      );

      const engine = new GuardrailEngine({
        guards: ['injection'],
        failMode: 'closed',
      });

      const result = await engine.checkInput('test input');

      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('fail-closed');
      expect(result.metadata?.failMode).toBe('closed');
    });

    it('should log error when fail-closed', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.spyOn(InjectionGuard.prototype, 'check').mockRejectedValue(
        new Error('LLM timeout')
      );

      const engine = new GuardrailEngine({
        guards: ['injection'],
        failMode: 'closed',
      });

      await engine.checkInput('test input');

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('[FAIL-CLOSED]'),
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe('checkInput fail-open', () => {
    it('should allow on guard error when fail-open', async () => {
      vi.spyOn(InjectionGuard.prototype, 'check').mockRejectedValue(
        new Error('LLM timeout')
      );

      const engine = new GuardrailEngine({
        guards: ['injection'],
        failMode: 'open',
      });

      const result = await engine.checkInput('test input');

      expect(result.blocked).toBe(false);
      expect(result.passed).toBe(true);
      expect(result.results[0]?.metadata?.failMode).toBe('open');
    });

    it('should log warning when fail-open', async () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      vi.spyOn(InjectionGuard.prototype, 'check').mockRejectedValue(
        new Error('LLM timeout')
      );

      const engine = new GuardrailEngine({
        guards: ['injection'],
        failMode: 'open',
      });

      await engine.checkInput('test input');

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('[FAIL-OPEN]'),
        expect.any(Error)
      );

      consoleWarn.mockRestore();
    });
  });

  describe('per-guard fail mode', () => {
    it('should use per-guard override', async () => {
      vi.spyOn(InjectionGuard.prototype, 'check').mockRejectedValue(
        new Error('Error')
      );

      const engine = new GuardrailEngine({
        guards: ['injection'],
        failMode: {
          mode: 'open',
          perGuard: {
            'injection': 'closed',
          },
        },
      });

      const result = await engine.checkInput('test input');

      expect(result.blocked).toBe(true); // injection is fail-closed
      expect(result.guard).toBe('injection');
    });
  });

  describe('default behavior', () => {
    it('should default to fail-closed when no config', async () => {
      vi.spyOn(InjectionGuard.prototype, 'check').mockRejectedValue(
        new Error('Error')
      );

      const engine = new GuardrailEngine({
        guards: ['injection'],
        // No failMode config
      });

      const result = await engine.checkInput('test input');

      expect(result.blocked).toBe(true);
    });
  });
});
