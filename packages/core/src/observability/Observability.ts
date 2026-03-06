/**
 * Observability
 *
 * Main observability facade that provides metrics, logging, and tracing.
 */

import type {
  ObservabilityConfig,
  ObservabilityStats,
  MetricsSnapshot,
} from './types';
import { MetricsCollector } from './metrics/MetricsCollector';
import { Logger } from './logging/Logger';
import { Tracer } from './tracing/Tracer';

/**
 * Observability system for guardrails
 */
export class Observability {
  public readonly metrics?: MetricsCollector;
  public readonly logger?: Logger;
  public readonly tracer?: Tracer;

  constructor(config: ObservabilityConfig = {}) {
    // Initialize metrics if enabled
    if (config.metrics?.enabled) {
      this.metrics = new MetricsCollector(config.metrics);
    }

    // Initialize logger if enabled
    if (config.logging?.enabled) {
      this.logger = new Logger(config.logging);
    }

    // Initialize tracer if enabled
    if (config.tracing?.enabled) {
      this.tracer = new Tracer(config.tracing);
    }
  }

  /**
   * Record a guardrail check
   */
  recordCheck(
    guardName: string,
    input: string,
    result: { blocked: boolean; reason?: string; confidence?: number },
    latency: number,
    sessionId?: string
  ): void {
    // Record metrics
    if (this.metrics) {
      this.metrics.recordCheck(guardName, result.blocked, latency);
    }

    // Log the check
    if (this.logger) {
      this.logger.logCheck(guardName, input, result, sessionId);
    }
  }

  /**
   * Start a span for a check
   */
  startCheckSpan(guardName: string, sessionId?: string) {
    if (this.tracer) {
      return this.tracer.startCheckSpan(guardName, sessionId);
    }
    return null;
  }

  /**
   * End a span
   */
  endSpan(span: any): void {
    if (this.tracer && span) {
      this.tracer.endSpan(span);
    }
  }

  /**
   * Get metrics snapshot
   */
  getMetricsSnapshot(): MetricsSnapshot | undefined {
    return this.metrics?.getSnapshot();
  }

  /**
   * Export Prometheus metrics
   */
  exportPrometheus(): string | undefined {
    return this.metrics?.exportPrometheus();
  }

  /**
   * Get observability statistics
   */
  getStats(): ObservabilityStats {
    return {
      metricsCollected: this.metrics ? this.getMetricCount() : 0,
      logsWritten: this.logger ? this.logger.getStats().total : 0,
      spansCreated: this.tracer ? this.tracer.getStats().completedSpans : 0,
      lastSnapshot: this.metrics?.getSnapshot(),
    };
  }

  /**
   * Get total metric count
   */
  private getMetricCount(): number {
    const snapshot = this.metrics?.getSnapshot();
    return snapshot ? snapshot.totalChecks : 0;
  }

  /**
   * Reset all observability data
   */
  reset(): void {
    if (this.metrics) {
      this.metrics.reset();
    }
    if (this.logger) {
      this.logger.clearBuffer();
    }
    if (this.tracer) {
      this.tracer.clearHistory();
    }
  }

  /**
   * Check if observability is enabled
   */
  isEnabled(): boolean {
    return !!(this.metrics || this.logger || this.tracer);
  }
}

/**
 * Create observability from simple config
 */
export function createObservability(
  enabled: boolean = true,
  options: Partial<ObservabilityConfig> = {}
): Observability {
  if (!enabled) {
    return new Observability({});
  }

  return new Observability({
    metrics: {
      enabled: true,
      provider: 'prometheus',
      ...options.metrics,
    },
    logging: {
      enabled: true,
      level: 'info',
      format: 'json',
      destination: 'console',
      ...options.logging,
    },
    tracing: {
      enabled: true,
      provider: 'opentelemetry',
      ...options.tracing,
    },
  });
}
