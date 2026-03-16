/**
 * @llm-guardrails/mastra
 *
 * Mastra integration for LLM Guardrails.
 * Add guardrails to Mastra agents with a simple decorator.
 */

// Main decorator
export { withGuardrails } from './decorator';
export type {
  MastraGuardrailConfig,
  GuardedAgent,
} from './decorator';

// Helpers
export {
  createGuardedAgentFactory,
  quickGuard,
  guardAgents,
  createPerAgentGuard,
  conditionalGuard,
  toolSpecificGuards,
  guardWithMonitoring,
} from './helpers';

// Re-export core types for convenience
export type {
  GuardrailConfig,
  GuardrailResult,
  GuardResult,
} from '@llm-guardrails/core';

// Processor interface (native Mastra integration)
export {
  GuardrailInputProcessor,
  GuardrailOutputProcessor,
  GuardrailStreamProcessor,
  GuardrailProcessor,
} from './processors';
export type { Processor } from './processors';

// Gateway-level guards (layered defense)
export { guardGateway, guardAgent } from './gateway';
export type { GatewayGuardConfig, AgentGuardConfig } from './types';
