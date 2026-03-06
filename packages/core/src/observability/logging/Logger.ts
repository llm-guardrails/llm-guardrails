/**
 * Structured Logger
 *
 * Provides structured logging with JSON formatting and multiple output destinations.
 */

import type { LoggingConfig, LogEntry } from '../types';
import * as crypto from 'crypto';

/**
 * Structured logger for guardrail operations
 */
export class Logger {
  private config: LoggingConfig;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 1000;

  constructor(config: LoggingConfig) {
    this.config = config;
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log('error', message, { ...context, error });
  }

  /**
   * Log a guardrail check
   */
  logCheck(
    guardName: string,
    input: string,
    result: { blocked: boolean; reason?: string; confidence?: number },
    sessionId?: string
  ): void {
    const inputHash = this.hashInput(input);

    this.info(`Guardrail check: ${guardName}`, {
      guardName,
      inputHash,
      blocked: result.blocked,
      reason: result.reason,
      confidence: result.confidence,
      sessionId,
      // Only include input if sensitive data is allowed
      ...(this.config.includeSensitive && { input: input.substring(0, 100) }),
    });
  }

  /**
   * Internal log method
   */
  private log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context?: Record<string, any>
  ): void {
    // Check if logging is enabled
    if (!this.config.enabled) return;

    // Check log level
    if (!this.shouldLog(level)) return;

    // Create log entry
    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      ...(context && { context: this.sanitizeContext(context) }),
    };

    // Extract common fields
    if (context?.guardName) entry.guardName = context.guardName;
    if (context?.sessionId) entry.sessionId = context.sessionId;
    if (context?.inputHash) entry.inputHash = context.inputHash;
    if (context?.error) entry.error = context.error;

    // Buffer the entry
    this.bufferEntry(entry);

    // Write to destination
    this.writeEntry(entry);
  }

  /**
   * Check if message should be logged based on level
   */
  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = this.config.level || 'info';
    const configLevelIndex = levels.indexOf(configLevel);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex >= configLevelIndex;
  }

  /**
   * Sanitize context to remove sensitive data
   */
  private sanitizeContext(context: Record<string, any>): Record<string, any> {
    const sanitized = { ...context };

    // Remove sensitive fields unless explicitly allowed
    if (!this.config.includeSensitive) {
      const sensitiveFields = ['input', 'apiKey', 'token', 'password', 'secret'];
      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      }
    }

    // Remove error object from context (it's in entry.error)
    delete sanitized.error;

    return sanitized;
  }

  /**
   * Hash input for privacy
   */
  private hashInput(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
  }

  /**
   * Buffer log entry
   */
  private bufferEntry(entry: LogEntry): void {
    this.logBuffer.push(entry);

    // Keep buffer size limited
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  /**
   * Write entry to destination
   */
  private writeEntry(entry: LogEntry): void {
    // Custom handler
    if (this.config.custom) {
      this.config.custom.log(entry);
      return;
    }

    // Format entry
    const formatted = this.formatEntry(entry);

    // Write to destination
    switch (this.config.destination) {
      case 'console':
      default:
        this.writeToConsole(formatted, entry.level);
        break;
      case 'file':
        this.writeToFile(formatted);
        break;
    }
  }

  /**
   * Format log entry
   */
  private formatEntry(entry: LogEntry): string {
    if (this.config.format === 'json') {
      return this.formatJSON(entry);
    } else {
      return this.formatText(entry);
    }
  }

  /**
   * Format as JSON
   */
  private formatJSON(entry: LogEntry): string {
    const json: any = {
      timestamp: new Date(entry.timestamp).toISOString(),
      level: entry.level,
      message: entry.message,
    };

    if (entry.guardName) json.guardName = entry.guardName;
    if (entry.sessionId) json.sessionId = entry.sessionId;
    if (entry.inputHash) json.inputHash = entry.inputHash;
    if (entry.context) json.context = entry.context;
    if (entry.error) {
      json.error = {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack,
      };
    }

    return JSON.stringify(json);
  }

  /**
   * Format as text
   */
  private formatText(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    let line = `[${timestamp}] ${level} ${entry.message}`;

    // Add guard name
    if (entry.guardName) {
      line += ` [guard=${entry.guardName}]`;
    }

    // Add session ID
    if (entry.sessionId) {
      line += ` [session=${entry.sessionId}]`;
    }

    // Add context
    if (entry.context && Object.keys(entry.context).length > 0) {
      line += ` ${JSON.stringify(entry.context)}`;
    }

    // Add error
    if (entry.error) {
      line += `\n  Error: ${entry.error.message}`;
      if (entry.error.stack) {
        line += `\n${entry.error.stack}`;
      }
    }

    return line;
  }

  /**
   * Write to console
   */
  private writeToConsole(message: string, level: string): void {
    switch (level) {
      case 'debug':
        console.debug(message);
        break;
      case 'info':
        console.info(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      case 'error':
        console.error(message);
        break;
    }
  }

  /**
   * Write to file
   */
  private writeToFile(message: string): void {
    // File writing would require fs module
    // For now, just log to console
    console.log(message);
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count?: number): LogEntry[] {
    const n = count || 100;
    return this.logBuffer.slice(-n);
  }

  /**
   * Clear log buffer
   */
  clearBuffer(): void {
    this.logBuffer = [];
  }

  /**
   * Get log statistics
   */
  getStats(): {
    total: number;
    byLevel: Record<string, number>;
  } {
    const stats = {
      total: this.logBuffer.length,
      byLevel: {} as Record<string, number>,
    };

    for (const entry of this.logBuffer) {
      stats.byLevel[entry.level] = (stats.byLevel[entry.level] || 0) + 1;
    }

    return stats;
  }
}
