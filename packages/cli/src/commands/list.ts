/**
 * List Command
 *
 * List available guards.
 */

import chalk from 'chalk';
import { table } from 'table';

interface ListOptions {
  verbose?: boolean;
}

const GUARDS = [
  {
    name: 'injection',
    description: 'Prompt injection and jailbreak attempts',
    priority: 'Critical',
    latency: '<1ms',
  },
  {
    name: 'leakage',
    description: 'Prompt extraction and system prompt leakage',
    priority: 'Critical',
    latency: '<1ms',
  },
  {
    name: 'secrets',
    description: 'API keys, tokens, and credentials',
    priority: 'Critical',
    latency: '<1ms',
  },
  {
    name: 'pii',
    description: 'Email, SSN, phone numbers, and personal data',
    priority: 'High',
    latency: '<1ms',
  },
  {
    name: 'toxicity',
    description: 'Insults, profanity, and aggressive language',
    priority: 'High',
    latency: '<1ms',
  },
  {
    name: 'hate-speech',
    description: 'Discrimination, slurs, and hateful content',
    priority: 'High',
    latency: '<1ms',
  },
  {
    name: 'bias',
    description: 'Stereotypes and biased language',
    priority: 'Medium',
    latency: '<1ms',
  },
  {
    name: 'adult-content',
    description: 'Sexual and NSFW content',
    priority: 'Medium',
    latency: '<1ms',
  },
  {
    name: 'copyright',
    description: 'Copyrighted material and IP violations',
    priority: 'Medium',
    latency: '<1ms',
  },
  {
    name: 'profanity',
    description: 'Swear words and curse words',
    priority: 'Low',
    latency: '<1ms',
  },
];

export function listCommand(options: ListOptions) {
  const { verbose } = options;

  console.log();
  console.log(chalk.bold.cyan('Available Guards'));
  console.log();

  if (verbose) {
    // Detailed table
    const data = [
      [
        chalk.bold('Name'),
        chalk.bold('Description'),
        chalk.bold('Priority'),
        chalk.bold('Latency'),
      ],
      ...GUARDS.map((guard) => [
        chalk.cyan(guard.name),
        guard.description,
        getPriorityColor(guard.priority),
        chalk.gray(guard.latency),
      ]),
    ];

    console.log(table(data, {
      border: {
        topBody: '─',
        topJoin: '┬',
        topLeft: '┌',
        topRight: '┐',
        bottomBody: '─',
        bottomJoin: '┴',
        bottomLeft: '└',
        bottomRight: '┘',
        bodyLeft: '│',
        bodyRight: '│',
        bodyJoin: '│',
        joinBody: '─',
        joinLeft: '├',
        joinRight: '┤',
        joinJoin: '┼',
      },
    }));
  } else {
    // Simple list
    for (const guard of GUARDS) {
      console.log(`  ${chalk.cyan(guard.name.padEnd(15))} ${chalk.gray(guard.description)}`);
    }
    console.log();
    console.log(chalk.gray('  Use --verbose for detailed information'));
    console.log();
  }

  console.log(chalk.bold('Usage:'));
  console.log();
  console.log(chalk.gray('  # Check with specific guards'));
  console.log('  guardrails check "input" --guards injection pii');
  console.log();
  console.log(chalk.gray('  # Check with all guards'));
  console.log('  guardrails check "input"');
  console.log();
  console.log(chalk.gray('  # Interactive mode'));
  console.log('  guardrails interactive --guards injection pii toxicity');
  console.log();
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'Critical':
      return chalk.red(priority);
    case 'High':
      return chalk.yellow(priority);
    case 'Medium':
      return chalk.blue(priority);
    case 'Low':
      return chalk.gray(priority);
    default:
      return priority;
  }
}
