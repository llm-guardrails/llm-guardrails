import { describe, it, expect, vi } from 'vitest';
import { GuardrailEngine } from '../GuardrailEngine';
import type { Guard, GuardResult, CheckContext } from '../../types';

// Mock guard for testing
class MockGuard implements Guard {
  name = 'mock-guard';
  private shouldBlock: boolean;

  constructor(shouldBlock: boolean = false) {
    this.shouldBlock = shouldBlock;
  }

  async check(input: string, context?: CheckContext): Promise<GuardResult> {
    return {
      passed: !this.shouldBlock,
      blocked: this.shouldBlock,
      reason: this.shouldBlock ? 'Blocked by mock' : undefined,
      tier: 'L1',
      latency: 0.5,
    };
  }
}

describe('GuardrailEngine', () => {
  describe('Basic Functionality', () => {
    it('creates engine with default config', () => {
      const engine = new GuardrailEngine();
      expect(engine).toBeDefined();
    });

    it('accepts custom configuration', () => {
      const engine = new GuardrailEngine({
        level: 'advanced',
        guards: [{ name: 'pii', enabled: true }],
      });
      expect(engine).toBeDefined();
    });
  });

  describe('Guard Management', () => {
    it('adds custom guards', () => {
      const engine = new GuardrailEngine();
      const guard = new MockGuard();

      engine.addGuard(guard);
      const guards = engine.getGuards();

      expect(guards).toContain(guard);
    });

    it('removes guards by name', () => {
      const engine = new GuardrailEngine();
      const guard = new MockGuard();

      engine.addGuard(guard);
      const removed = engine.removeGuard('mock-guard');

      expect(removed).toBe(true);
      expect(engine.getGuards()).not.toContain(guard);
    });

    it('returns false when removing non-existent guard', () => {
      const engine = new GuardrailEngine();
      const removed = engine.removeGuard('non-existent');

      expect(removed).toBe(false);
    });
  });

  describe('Input Checking', () => {
    it('passes when no guards are registered', async () => {
      const engine = new GuardrailEngine();
      const result = await engine.checkInput('test input');

      expect(result.passed).toBe(true);
      expect(result.blocked).toBe(false);
    });

    it('passes when all guards pass', async () => {
      const engine = new GuardrailEngine();
      engine.addGuard(new MockGuard(false));

      const result = await engine.checkInput('safe input');

      expect(result.passed).toBe(true);
      expect(result.blocked).toBe(false);
    });

    it('blocks when any guard blocks', async () => {
      const engine = new GuardrailEngine();
      engine.addGuard(new MockGuard(false)); // Pass
      engine.addGuard(new MockGuard(true)); // Block

      const result = await engine.checkInput('malicious input');

      expect(result.passed).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('Blocked by mock');
      expect(result.guard).toBe('mock-guard');
    });

    it('includes session ID in result', async () => {
      const engine = new GuardrailEngine();
      const result = await engine.checkInput('test', {
        sessionId: 'test-session-123',
      });

      expect(result.sessionId).toBe('test-session-123');
    });

    it('records latency', async () => {
      const engine = new GuardrailEngine();
      engine.addGuard(new MockGuard());

      const result = await engine.checkInput('test');

      expect(result.totalLatency).toBeDefined();
      expect(result.totalLatency!).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Early Exit', () => {
    it('stops checking after first block', async () => {
      const engine = new GuardrailEngine();

      const guard1 = new MockGuard(true); // Block
      const guard2 = new MockGuard(false);
      const guard2Spy = vi.spyOn(guard2, 'check');

      engine.addGuard(guard1);
      engine.addGuard(guard2);

      await engine.checkInput('test');

      // guard2 should not be called because guard1 blocked
      expect(guard2Spy).not.toHaveBeenCalled();
    });
  });

  describe('Callbacks', () => {
    it('calls onBlock callback when blocked', async () => {
      const onBlock = vi.fn();
      const engine = new GuardrailEngine({ onBlock });
      engine.addGuard(new MockGuard(true));

      await engine.checkInput('malicious');

      expect(onBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          blocked: true,
          passed: false,
        })
      );
    });

    it('does not call onBlock when passed', async () => {
      const onBlock = vi.fn();
      const engine = new GuardrailEngine({ onBlock });
      engine.addGuard(new MockGuard(false));

      await engine.checkInput('safe');

      expect(onBlock).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles guard errors gracefully', async () => {
      class ErrorGuard implements Guard {
        name = 'error-guard';
        async check(): Promise<GuardResult> {
          throw new Error('Guard failed');
        }
      }

      // Create engine with fail-open mode
      const engine = new GuardrailEngine({ guards: [], failMode: 'open' });
      engine.addGuard(new ErrorGuard());

      const result = await engine.checkInput('test');

      // Should not throw, should continue with other guards
      expect(result).toBeDefined();
      expect(result.results.length).toBe(1);
      expect(result.results[0].passed).toBe(true); // fail-open passes
    });
  });

  describe('Output Checking', () => {
    it('checks output with same guards', async () => {
      const engine = new GuardrailEngine();
      engine.addGuard(new MockGuard(true));

      const result = await engine.checkOutput('output text');

      expect(result.blocked).toBe(true);
    });
  });

  describe('Quick Check', () => {
    it('performs quick check', async () => {
      const engine = new GuardrailEngine();
      engine.addGuard(new MockGuard(false));

      const result = await engine.quickCheck('test');

      expect(result).toBeDefined();
      expect(result.passed).toBe(true);
    });
  });
});
