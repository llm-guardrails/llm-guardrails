/**
 * @llm-guardrails/cli
 *
 * Interactive CLI tool for testing and demonstrating LLM guardrails.
 *
 * This package provides a command-line interface for:
 * - Testing inputs against guardrails
 * - Interactive REPL-style testing
 * - Performance benchmarking
 * - Guard information and examples
 *
 * @packageDocumentation
 */

// Export command functions for programmatic usage
export { checkCommand } from './commands/check';
export { interactiveCommand } from './commands/interactive';
export { listCommand } from './commands/list';
export { infoCommand } from './commands/info';
export { benchmarkCommand } from './commands/benchmark';

// Export utility functions
export * from './utils/format';

// Re-export core types for convenience
export type {
  GuardResult,
  GuardrailConfig,
  GuardConfig,
} from '@llm-guardrails/core';
