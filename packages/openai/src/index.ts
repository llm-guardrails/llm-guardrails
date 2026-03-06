/**
 * @llm-guardrails/openai
 *
 * OpenAI SDK integration with LLM guardrails.
 * Drop-in replacement for OpenAI SDK with built-in safety.
 */

export { GuardedOpenAI, GuardrailBlockError } from './GuardedOpenAI';
export type { GuardedOpenAIConfig } from './GuardedOpenAI';

// Re-export useful types from core
export type {
  GuardrailConfig,
  GuardrailResult,
  GuardResult,
  DetectionLevel,
} from '@llm-guardrails/core';
