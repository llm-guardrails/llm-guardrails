/**
 * Gateway Adapter Types
 *
 * Type definitions for gateway adapters that wrap AI SDK clients
 * with guardrail protection.
 */

import type { GuardrailEngine } from '../engine/GuardrailEngine';
import type { GuardrailResult } from '../types';

/**
 * Base interface for gateway adapters
 */
export interface GatewayAdapter<TClient = any> {
  /** Adapter name (e.g., 'anthropic', 'openai') */
  name: string;

  /** Detect if a client is compatible with this adapter */
  detect(client: any): boolean;

  /** Wrap a client with guardrails */
  wrap(client: TClient, engine: GuardrailEngine): GuardedClient<TClient>;
}

/**
 * A client wrapped with guardrails
 */
export type GuardedClient<T> = T & {
  /** Reference to the guardrail engine */
  __guardrails: GuardrailEngine;

  /** Unwrap to get the original client */
  __unwrap(): T;
};

/**
 * LLM request (normalized format)
 */
export interface LLMRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  model?: string;
  metadata?: Record<string, any>;
}

/**
 * LLM response (normalized format)
 */
export interface LLMResponse {
  content: string;
  model?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Stream chunk (normalized format)
 */
export interface StreamChunk {
  content: string;
  done: boolean;
}

/**
 * Adapter configuration
 */
export interface AdapterConfig {
  /** How to handle blocked inputs */
  onBlockedInput?: 'throw' | 'sanitize' | 'warn';

  /** How to handle blocked outputs */
  onBlockedOutput?: 'throw' | 'sanitize' | 'warn';

  /** Whether to check streaming output incrementally */
  streamChecking?: boolean;

  /** Stream check interval (every N chunks or M characters) */
  streamCheckInterval?: {
    chunks?: number;
    characters?: number;
  };
}

/**
 * Guardrail violation error
 */
export class GuardrailViolation extends Error {
  constructor(
    message: string,
    public result: GuardrailResult,
    public phase: 'input' | 'output'
  ) {
    super(message);
    this.name = 'GuardrailViolation';
  }
}
