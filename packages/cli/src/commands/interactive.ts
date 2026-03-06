/**
 * Interactive Command
 *
 * Start interactive testing mode.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { GuardrailEngine } from '@llm-guardrails/core';

interface InteractiveOptions {
  guards?: string[];
  level?: 'basic' | 'standard' | 'advanced';
}

export async function interactiveCommand(options: InteractiveOptions) {
  const { guards, level = 'standard' } = options;

  console.log();
  console.log(chalk.bold.cyan('🛡️  LLM Guardrails Interactive Mode'));
  console.log();
  console.log(chalk.gray('Type your input to test against guardrails.'));
  console.log(chalk.gray('Commands: /help, /stats, /clear, /exit'));
  console.log();

  // Create engine with caching
  const engine = new GuardrailEngine({
    guards: guards as any,
    level,
    cache: {
      enabled: true,
      maxSize: 100,
      ttl: 5 * 60 * 1000,
    },
  });

  let checksPerformed = 0;
  let blocked = 0;
  let totalLatency = 0;

  // Interactive loop
  while (true) {
    const { input } = await inquirer.prompt([
      {
        type: 'input',
        name: 'input',
        message: chalk.cyan('>'),
        prefix: '',
      },
    ]);

    const trimmed = input.trim();

    // Handle commands
    if (trimmed === '/exit' || trimmed === '/quit') {
      console.log();
      console.log(chalk.gray('Goodbye! 👋'));
      console.log();
      break;
    }

    if (trimmed === '/help') {
      showHelp();
      continue;
    }

    if (trimmed === '/stats') {
      showStats(engine, checksPerformed, blocked, totalLatency);
      continue;
    }

    if (trimmed === '/clear') {
      console.clear();
      console.log(chalk.bold.cyan('🛡️  LLM Guardrails Interactive Mode'));
      console.log();
      continue;
    }

    if (!trimmed) {
      continue;
    }

    // Check input
    const startTime = Date.now();
    const result = await engine.checkInput(trimmed);
    const duration = Date.now() - startTime;

    checksPerformed++;
    totalLatency += duration;

    if (result.blocked) {
      blocked++;
      console.log();
      console.log(chalk.bold.red('  🚫 BLOCKED'));
      console.log(chalk.red('  Guard:'), result.guard);
      console.log(chalk.red('  Reason:'), result.reason);
      console.log(chalk.gray('  Latency:'), `${duration}ms`);
      console.log();
    } else {
      console.log();
      console.log(chalk.bold.green('  ✅ PASSED'));
      console.log(chalk.gray('  Latency:'), `${duration}ms`);
      console.log();
    }
  }
}

function showHelp() {
  console.log();
  console.log(chalk.bold('Available Commands:'));
  console.log();
  console.log('  /help   ', chalk.gray('- Show this help message'));
  console.log('  /stats  ', chalk.gray('- Show statistics'));
  console.log('  /clear  ', chalk.gray('- Clear screen'));
  console.log('  /exit   ', chalk.gray('- Exit interactive mode'));
  console.log();
}

function showStats(
  engine: GuardrailEngine,
  checks: number,
  blocked: number,
  totalLatency: number
) {
  console.log();
  console.log(chalk.bold('Statistics:'));
  console.log();
  console.log(chalk.gray('  Checks performed:'), checks);
  console.log(chalk.gray('  Blocked:'), blocked);
  console.log(
    chalk.gray('  Block rate:'),
    checks > 0 ? `${((blocked / checks) * 100).toFixed(1)}%` : '0%'
  );
  console.log(
    chalk.gray('  Average latency:'),
    checks > 0 ? `${(totalLatency / checks).toFixed(2)}ms` : '0ms'
  );

  const cacheStats = engine.getCacheStats();
  if (cacheStats) {
    console.log();
    console.log(chalk.bold('Cache Statistics:'));
    console.log();
    console.log(chalk.gray('  Hit rate:'), `${(cacheStats.hitRate * 100).toFixed(1)}%`);
    console.log(chalk.gray('  Hits:'), cacheStats.hits);
    console.log(chalk.gray('  Misses:'), cacheStats.misses);
    console.log(chalk.gray('  Size:'), `${cacheStats.size}/${cacheStats.maxSize}`);
  }

  console.log();
}
