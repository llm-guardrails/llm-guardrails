/**
 * Formatting Utilities
 *
 * Utility functions for formatting CLI output.
 */

import chalk from 'chalk';
import type { GuardResult } from '@llm-guardrails/core';

/**
 * Format a guard result for display
 */
export function formatResult(result: GuardResult): string {
  if (result.blocked) {
    return chalk.red('BLOCKED');
  }
  return chalk.green('PASSED');
}

/**
 * Format duration in milliseconds
 */
export function formatDuration(ms: number): string {
  if (ms < 1) {
    return chalk.gray(`${(ms * 1000).toFixed(0)}μs`);
  }
  if (ms < 10) {
    return chalk.gray(`${ms.toFixed(2)}ms`);
  }
  if (ms < 100) {
    return chalk.gray(`${ms.toFixed(1)}ms`);
  }
  if (ms < 1000) {
    return chalk.gray(`${Math.round(ms)}ms`);
  }
  return chalk.gray(`${(ms / 1000).toFixed(2)}s`);
}

/**
 * Format confidence score
 */
export function formatConfidence(confidence?: number): string {
  if (confidence === undefined) {
    return chalk.gray('N/A');
  }
  const percentage = (confidence * 100).toFixed(0);
  if (confidence >= 0.9) {
    return chalk.green(`${percentage}%`);
  }
  if (confidence >= 0.7) {
    return chalk.yellow(`${percentage}%`);
  }
  return chalk.red(`${percentage}%`);
}

/**
 * Format guard name with color
 */
export function formatGuardName(name: string): string {
  return chalk.cyan(name);
}

/**
 * Format reason with word wrapping
 */
export function formatReason(reason?: string, maxWidth: number = 80): string {
  if (!reason) {
    return chalk.gray('No reason provided');
  }

  const words = reason.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxWidth) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.map((line) => chalk.white(line)).join('\n  ');
}

/**
 * Format table header
 */
export function formatTableHeader(columns: string[]): string {
  return columns.map((col) => chalk.bold(col)).join('\t');
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, total: number): string {
  if (total === 0) return chalk.gray('0%');
  const percentage = ((value / total) * 100).toFixed(1);
  return chalk.white(`${percentage}%`);
}

/**
 * Format large numbers with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Create a horizontal divider
 */
export function divider(length: number = 60, char: string = '─'): string {
  return chalk.gray(char.repeat(length));
}

/**
 * Create a box around text
 */
export function box(text: string, padding: number = 2): string {
  const lines = text.split('\n');
  const maxLength = Math.max(...lines.map((l) => l.length));
  const width = maxLength + padding * 2;

  const top = chalk.gray('┌' + '─'.repeat(width) + '┐');
  const bottom = chalk.gray('└' + '─'.repeat(width) + '┘');

  const content = lines
    .map((line) => {
      const padded = line.padEnd(maxLength);
      const spaces = ' '.repeat(padding);
      return chalk.gray('│') + spaces + padded + spaces + chalk.gray('│');
    })
    .join('\n');

  return [top, content, bottom].join('\n');
}
