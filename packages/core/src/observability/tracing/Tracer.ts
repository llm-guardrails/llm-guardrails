/**
 * Tracer
 *
 * Provides distributed tracing support with OpenTelemetry compatibility.
 */

import type { TracingConfig, Span } from '../types';

/**
 * Simple tracer for distributed tracing
 */
export class Tracer {
  private config: TracingConfig;
  private activeSpans: Map<string, SpanImpl> = new Map();
  private completedSpans: SpanImpl[] = [];
  private maxCompletedSpans = 1000;

  constructor(config: TracingConfig) {
    this.config = config;
  }

  /**
   * Start a new span
   */
  startSpan(name: string, attributes?: Record<string, any>): Span {
    const span = new SpanImpl(name, attributes || {});
    this.activeSpans.set(span.id, span);

    // Send to provider if configured
    if (this.config.custom) {
      return this.config.custom.startSpan(name, attributes);
    }

    return span;
  }

  /**
   * Start a guardrail check span
   */
  startCheckSpan(guardName: string, sessionId?: string): Span {
    return this.startSpan('guardrail.check', {
      'guardrail.guard': guardName,
      ...(sessionId && { 'guardrail.session': sessionId }),
    });
  }

  /**
   * End a span
   */
  endSpan(span: Span): void {
    if (span instanceof SpanImpl) {
      span.end();
      this.activeSpans.delete(span.id);
      this.addCompletedSpan(span);
    }
  }

  /**
   * Add completed span to history
   */
  private addCompletedSpan(span: SpanImpl): void {
    this.completedSpans.push(span);

    // Keep history limited
    if (this.completedSpans.length > this.maxCompletedSpans) {
      this.completedSpans.shift();
    }
  }

  /**
   * Get active spans
   */
  getActiveSpans(): Span[] {
    return Array.from(this.activeSpans.values());
  }

  /**
   * Get completed spans
   */
  getCompletedSpans(count?: number): SpanImpl[] {
    const n = count || 100;
    return this.completedSpans.slice(-n);
  }

  /**
   * Get tracing statistics
   */
  getStats(): {
    activeSpans: number;
    completedSpans: number;
    averageDuration: number;
  } {
    const durations = this.completedSpans
      .filter((s) => s.duration !== undefined)
      .map((s) => s.duration!);

    return {
      activeSpans: this.activeSpans.size,
      completedSpans: this.completedSpans.length,
      averageDuration:
        durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0,
    };
  }

  /**
   * Clear span history
   */
  clearHistory(): void {
    this.completedSpans = [];
  }
}

/**
 * Span implementation
 */
class SpanImpl implements Span {
  public readonly id: string;
  public readonly name: string;
  public readonly startTime: number;
  public endTime?: number;
  public duration?: number;
  public attributes: Record<string, any>;
  public events: Array<{ name: string; timestamp: number; attributes?: Record<string, any> }> = [];
  public status?: { code: 'ok' | 'error'; message?: string };

  constructor(name: string, attributes: Record<string, any>) {
    this.id = this.generateId();
    this.name = name;
    this.startTime = Date.now();
    this.attributes = attributes;
  }

  /**
   * End the span
   */
  end(): void {
    if (!this.endTime) {
      this.endTime = Date.now();
      this.duration = this.endTime - this.startTime;
    }
  }

  /**
   * Set an attribute
   */
  setAttribute(key: string, value: any): void {
    this.attributes[key] = value;
  }

  /**
   * Add an event
   */
  addEvent(name: string, attributes?: Record<string, any>): void {
    this.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    });
  }

  /**
   * Set status
   */
  setStatus(status: 'ok' | 'error', message?: string): void {
    this.status = { code: status, message };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Export span in OpenTelemetry-compatible format
   */
  toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      attributes: this.attributes,
      events: this.events,
      status: this.status,
    };
  }
}
