/**
 * @llm-guardrails/anthropic
 *
 * Anthropic SDK integration with LLM guardrails.
 * Drop-in replacement for Anthropic SDK with built-in safety.
 */

export { GuardedAnthropic, GuardrailBlockError } from './GuardedAnthropic';
export type { GuardedAnthropicConfig } from './GuardedAnthropic';

// Re-export useful types from core
export type {
  GuardrailConfig,
  GuardrailResult,
  GuardResult,
  DetectionLevel,
} from '@llm-guardrails/core';
