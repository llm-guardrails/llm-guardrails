import type { GuardrailConfig } from '@llm-guardrails/core';
import type { DetectionLevel, GuardrailResult } from '@llm-guardrails/core';
import type { FailMode } from '@llm-guardrails/core';

/**
 * Gateway-level guard configuration
 * Applies guards at the orchestrator/routing level before reaching individual agents
 */
export interface GatewayGuardConfig {
  /** Guards to apply on input (before routing to agents) */
  input?: string[];

  /** Guards to apply on output (after agent processing) */
  output?: string[];

  /** Detection level */
  level?: DetectionLevel;

  /** Failure mode for gateway guards */
  failMode?: FailMode;

  /** Callback when gateway blocks */
  onBlock?: (result: GuardrailResult) => void;
}

/**
 * Agent-level guard configuration
 * Applies guards to specific agent inputs/outputs
 * Extends GuardrailConfig to support all core features
 */
export interface AgentGuardConfig extends GuardrailConfig {
  /** Guards to apply on this specific agent's input */
  input?: string[];

  /** Guards to apply on this specific agent's output */
  output?: string[];
}
