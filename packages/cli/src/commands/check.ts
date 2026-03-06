/**
 * Check Command
 *
 * Check a single input against guardrails.
 */

import chalk from 'chalk';
import { GuardrailEngine } from '@llm-guardrails/core';

interface CheckOptions {
  guards?: string[];
  level?: 'basic' | 'standard' | 'advanced';
  json?: boolean;
  verbose?: boolean;
}

export async function checkCommand(input: string, options: CheckOptions) {
  const { guards, level = 'standard', json, verbose } = options;

  // Create engine
  const engine = new GuardrailEngine({
    guards: guards as any,
    level,
    cache: {
      enabled: false, // Disable cache for single checks
    },
  });

  // Run check
  const startTime = Date.now();
  const result = await engine.checkInput(input);
  const duration = Date.now() - startTime;

  // JSON output
  if (json) {
    console.log(JSON.stringify({ ...result, duration }, null, 2));
    return;
  }

  // Pretty output
  console.log();
  console.log(chalk.bold('═'.repeat(60)));
  console.log(chalk.bold.cyan('  LLM Guardrails Check'));
  console.log(chalk.bold('═'.repeat(60)));
  console.log();

  // Input preview
  const preview = input.length > 100 ? input.substring(0, 100) + '...' : input;
  console.log(chalk.gray('Input:'), chalk.white(preview));
  console.log();

  // Result
  if (result.blocked) {
    console.log(chalk.bold.red('🚫 BLOCKED'));
    console.log();
    console.log(chalk.red('Guard:'), chalk.white(result.guard));
    console.log(chalk.red('Reason:'), chalk.white(result.reason));
  } else {
    console.log(chalk.bold.green('✅ PASSED'));
    console.log();
    console.log(chalk.green('All checks passed successfully'));
  }

  console.log();
  console.log(chalk.gray('Latency:'), chalk.white(`${duration}ms`));
  console.log(chalk.gray('Guards checked:'), chalk.white(result.results.length));
  console.log();

  // Verbose output
  if (verbose) {
    console.log(chalk.bold('Guard Results:'));
    console.log();

    for (const guardResult of result.results) {
      const guardName = engine.getGuards().find(() => true)?.name || 'unknown';
      const status = guardResult.blocked
        ? chalk.red('BLOCKED')
        : chalk.green('PASSED');

      console.log(`  ${status} ${chalk.gray(guardName)}`);

      if (guardResult.reason) {
        console.log(`    ${chalk.gray('→')} ${guardResult.reason}`);
      }

      if (guardResult.confidence) {
        console.log(`    ${chalk.gray('Confidence:')} ${(guardResult.confidence * 100).toFixed(0)}%`);
      }

      if (guardResult.latency) {
        console.log(`    ${chalk.gray('Latency:')} ${guardResult.latency}ms`);
      }

      console.log();
    }
  }

  console.log(chalk.bold('═'.repeat(60)));
  console.log();

  // Exit with appropriate code
  process.exit(result.blocked ? 1 : 0);
}
