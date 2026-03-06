#!/usr/bin/env node

/**
 * LLM Guardrails CLI
 *
 * Interactive CLI tool for testing and demonstrating guardrails.
 */

import { Command } from 'commander';
import { checkCommand } from './commands/check';
import { interactiveCommand } from './commands/interactive';
import { listCommand } from './commands/list';
import { benchmarkCommand } from './commands/benchmark';
import { infoCommand } from './commands/info';

const program = new Command();

program
  .name('llm-guardrails')
  .description('Interactive CLI tool for testing LLM guardrails')
  .version('0.1.0');

// Check command - test a single input
program
  .command('check')
  .description('Check an input against guardrails')
  .argument('<input>', 'Input text to check')
  .option('-g, --guards <guards...>', 'Guards to enable (default: all)', [
    'injection',
    'pii',
    'toxicity',
  ])
  .option('-l, --level <level>', 'Detection level (basic|standard|advanced)', 'standard')
  .option('-j, --json', 'Output as JSON')
  .option('-v, --verbose', 'Show detailed results')
  .action(checkCommand);

// Interactive command - interactive mode
program
  .command('interactive')
  .alias('i')
  .description('Start interactive testing mode')
  .option('-g, --guards <guards...>', 'Guards to enable (default: all)')
  .option('-l, --level <level>', 'Detection level', 'standard')
  .action(interactiveCommand);

// List command - show available guards
program
  .command('list')
  .alias('ls')
  .description('List available guards')
  .option('-v, --verbose', 'Show detailed information')
  .action(listCommand);

// Info command - show guard information
program
  .command('info')
  .description('Show information about a specific guard')
  .argument('<guard>', 'Guard name')
  .action(infoCommand);

// Benchmark command - performance testing
program
  .command('benchmark')
  .alias('bench')
  .description('Run performance benchmarks')
  .option('-n, --iterations <number>', 'Number of iterations', '1000')
  .option('-g, --guards <guards...>', 'Guards to test', ['injection', 'pii'])
  .option('-l, --level <level>', 'Detection level', 'standard')
  .action(benchmarkCommand);

// Parse arguments
program.parse();
