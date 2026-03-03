/**
 * Mastra Guardrails Helpers
 *
 * High-level utilities for integrating guardrails with Mastra.
 */

import { GuardrailEngine } from '@openclaw-guardrails/core';
import type { GuardrailConfig } from '@openclaw-guardrails/core';
import { withGuardrails } from './decorator';
import type { MastraGuardrailConfig, GuardedAgent } from './decorator';

/**
 * Create a guardrail-protected agent factory
 */
export function createGuardedAgentFactory(
  config: MastraGuardrailConfig = {}
): <T extends Record<string, any>>(agent: T) => GuardedAgent<T> {
  const engine = new GuardrailEngine(config);

  return <T extends Record<string, any>>(agent: T): GuardedAgent<T> => {
    return withGuardrails(agent, engine, config);
  };
}

/**
 * Quick guard for Mastra agents (uses preset configurations)
 */
export function quickGuard<T extends Record<string, any>>(
  agent: T,
  preset: 'basic' | 'standard' | 'advanced' | 'production' = 'standard'
): GuardedAgent<T> {
  const presets: Record<string, MastraGuardrailConfig> = {
    basic: {
      guards: ['pii', 'injection'] as any,
      checkToolInputs: true,
      checkToolOutputs: false,
      checkFinalResponse: true,
    },
    standard: {
      guards: ['pii', 'injection', 'secrets', 'toxicity'] as any,
      checkToolInputs: true,
      checkToolOutputs: true,
      checkFinalResponse: true,
    },
    advanced: {
      guards: [
        'pii',
        'injection',
        'secrets',
        'toxicity',
        'leakage',
        'hate-speech',
        'bias',
      ] as any,
      behavioral: {
        enabled: true,
        patterns: [
          'file-exfiltration',
          'credential-theft',
          'escalation-attempts',
        ] as any,
        storage: 'memory',
      },
      checkToolInputs: true,
      checkToolOutputs: true,
      checkFinalResponse: true,
    },
    production: {
      guards: [
        'pii',
        'injection',
        'secrets',
        'toxicity',
        'leakage',
        'hate-speech',
        'bias',
      ] as any,
      behavioral: {
        enabled: true,
        patterns: [
          'file-exfiltration',
          'credential-theft',
          'escalation-attempts',
          'data-exfil-via-code',
          'suspicious-shell-commands',
        ] as any,
        storage: 'memory',
      },
      budget: {
        maxTokensPerSession: 100000,
        maxCostPerSession: 10.0,
        trackGuardrailCosts: true,
        alertThreshold: 0.8,
      },
      checkToolInputs: true,
      checkToolOutputs: true,
      checkFinalResponse: true,
    },
  };

  const config = presets[preset] || presets.standard;
  const engine = new GuardrailEngine(config);

  return withGuardrails(agent, engine, config);
}

/**
 * Wrap multiple agents with the same guardrail configuration
 */
export function guardAgents<T extends Record<string, any>>(
  agents: T[],
  config: MastraGuardrailConfig = {}
): GuardedAgent<T>[] {
  const engine = new GuardrailEngine(config);

  return agents.map((agent) => withGuardrails(agent, engine, config));
}

/**
 * Create a per-agent configuration helper
 */
export function createPerAgentGuard(
  configs: Record<string, MastraGuardrailConfig>
): <T extends Record<string, any>>(
  agentName: string,
  agent: T
) => GuardedAgent<T> {
  const engines = new Map<string, GuardrailEngine>();

  return <T extends Record<string, any>>(
    agentName: string,
    agent: T
  ): GuardedAgent<T> => {
    const config = configs[agentName] || configs['default'] || {};

    // Reuse engine for same config
    if (!engines.has(agentName)) {
      engines.set(agentName, new GuardrailEngine(config));
    }

    const engine = engines.get(agentName)!;

    return withGuardrails(agent, engine, config);
  };
}

/**
 * Conditional guard - only apply guardrails based on runtime condition
 */
export function conditionalGuard<T extends Record<string, any>>(
  agent: T,
  condition: () => boolean,
  config: MastraGuardrailConfig = {}
): GuardedAgent<T> | T {
  if (condition()) {
    const engine = new GuardrailEngine(config);
    return withGuardrails(agent, engine, config);
  }

  return agent;
}

/**
 * Create tool-specific guardrail configurations
 */
export function toolSpecificGuards(
  toolConfigs: Record<
    string,
    {
      guards?: string[];
      skipInputCheck?: boolean;
      skipOutputCheck?: boolean;
    }
  >
): MastraGuardrailConfig {
  return {
    checkToolInputs: true,
    checkToolOutputs: true,
    toolConfigs,
  };
}

/**
 * Monitoring helper - wrap agent with guardrails and add monitoring
 */
export function guardWithMonitoring<T extends Record<string, any>>(
  agent: T,
  config: MastraGuardrailConfig = {},
  callbacks: {
    onBlock?: (reason: string, source: 'input' | 'output' | 'tool') => void;
    onWarn?: (reason: string) => void;
    onCheck?: (passed: boolean, latency: number) => void;
  } = {}
): GuardedAgent<T> {
  const enhancedConfig: MastraGuardrailConfig = {
    ...config,
    onBlock: (result) => {
      callbacks.onBlock?.(
        result.reason || 'Blocked',
        result.guard?.includes('tool') ? 'tool' : 'output'
      );
      config.onBlock?.(result);
    },
    onWarn: (result) => {
      callbacks.onWarn?.(result.reason || 'Warning');
      config.onWarn?.(result);
    },
  };

  const engine = new GuardrailEngine(enhancedConfig);

  return withGuardrails(agent, engine, enhancedConfig);
}
