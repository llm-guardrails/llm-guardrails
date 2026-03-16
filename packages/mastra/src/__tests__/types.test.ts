import { describe, it, expect } from 'vitest';
import type { GatewayGuardConfig, AgentGuardConfig } from '../types';

describe('Gateway and Agent Guard Types', () => {
  it('should accept GatewayGuardConfig', () => {
    const config: GatewayGuardConfig = {
      input: ['injection', 'pii'],
      output: ['leakage', 'secrets'],
      level: 'standard',
      failMode: 'closed',
      onBlock: (result) => {
        console.log('Blocked:', result.reason);
      },
    };

    expect(config.input).toEqual(['injection', 'pii']);
    expect(config.output).toEqual(['leakage', 'secrets']);
    expect(config.level).toBe('standard');
    expect(config.failMode).toBe('closed');
    expect(config.onBlock).toBeTypeOf('function');
  });

  it('should accept minimal GatewayGuardConfig', () => {
    const config: GatewayGuardConfig = {
      input: ['injection'],
    };

    expect(config.input).toEqual(['injection']);
    expect(config.output).toBeUndefined();
  });

  it('should accept AgentGuardConfig', () => {
    const config: AgentGuardConfig = {
      input: ['injection'],
      output: ['leakage'],
      guards: ['pii', 'toxicity'],
      outputBlockStrategy: 'block',
      blockedMessage: 'Cannot share that',
    };

    expect(config.input).toEqual(['injection']);
    expect(config.output).toEqual(['leakage']);
    expect(config.guards).toEqual(['pii', 'toxicity']);
    expect(config.outputBlockStrategy).toBe('block');
  });

  it('should allow AgentGuardConfig to extend GuardrailConfig', () => {
    const config: AgentGuardConfig = {
      guards: ['injection', 'pii'],
      level: 'advanced',
      failMode: {
        mode: 'open',
        perGuard: {
          'injection': 'closed',
        },
      },
      behavioral: true,
      budget: {
        maxCostPerSession: 1.0,
      },
    };

    expect(config.guards).toEqual(['injection', 'pii']);
    expect(config.level).toBe('advanced');
    expect(config.failMode).toBeDefined();
    expect(config.behavioral).toBe(true);
    expect(config.budget).toBeDefined();
  });
});
