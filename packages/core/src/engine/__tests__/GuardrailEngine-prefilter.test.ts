import { describe, it, expect } from 'vitest';
import { GuardrailEngine } from '../GuardrailEngine';
import { PIIGuard } from '../../guards/PIIGuard';

describe('GuardrailEngine - Prefilter Mode', () => {
  it('should disable L3 when prefilterMode is enabled', async () => {
    const mockLLMProvider = {
      name: 'mock-llm',
      complete: async () => 'should not be called',
    };

    const engine = new GuardrailEngine({
      level: 'advanced',
      llmProvider: mockLLMProvider,
      prefilterMode: true,
      guards: ['pii'],
    });

    // Get the guard and check its detection config
    const guards = engine.getGuards();
    expect(guards).toHaveLength(1);

    const guard = guards[0] as PIIGuard;
    // Access the protected config via type assertion
    const config = (guard as any).config;

    // L3 should be disabled in prefilter mode
    expect(config.tier3?.enabled).toBe(false);
  });

  it('should enable L3 when prefilterMode is false', async () => {
    const mockLLMProvider = {
      name: 'mock-llm',
      complete: async () => 'mock response',
    };

    const engine = new GuardrailEngine({
      level: 'advanced',
      llmProvider: mockLLMProvider,
      prefilterMode: false,
      guards: ['pii'],
    });

    const guards = engine.getGuards();
    expect(guards).toHaveLength(1);

    const guard = guards[0] as PIIGuard;
    const config = (guard as any).config;

    // L3 should be enabled when prefilterMode is false and LLM provider exists
    expect(config.tier3?.enabled).toBe(true);
  });

  it('should enable L3 by default when llmProvider is provided', async () => {
    const mockLLMProvider = {
      name: 'mock-llm',
      complete: async () => 'mock response',
    };

    const engine = new GuardrailEngine({
      level: 'advanced',
      llmProvider: mockLLMProvider,
      guards: ['pii'],
    });

    const guards = engine.getGuards();
    const guard = guards[0] as PIIGuard;
    const config = (guard as any).config;

    // L3 should be enabled by default when LLM provider exists
    expect(config.tier3?.enabled).toBe(true);
  });

  it('should only use L1+L2 for fast prefiltering', async () => {
    const engine = new GuardrailEngine({
      level: 'advanced',
      llmProvider: {
        name: 'mock-llm',
        complete: async () => {
          throw new Error('L3 should not be called in prefilter mode');
        },
      },
      prefilterMode: true,
      guards: ['pii'],
    });

    // This should only use L1+L2, never L3
    const result = await engine.checkInput('My email is test@example.com');

    // Should be blocked by L1 or L2
    expect(result.blocked).toBe(true);
    expect(result.results[0].tier).not.toBe('L3');
  });
});
