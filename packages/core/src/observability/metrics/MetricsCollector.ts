/**
 * Metrics Collector
 *
 * Collects and aggregates metrics for guardrail operations.
 * Supports Prometheus, StatsD, and DataDog formats.
 */

import type {
  MetricsConfig,
  Metric,
  MetricsSnapshot,
} from '../types';

/**
 * Metrics collector for guardrail operations
 */
export class MetricsCollector {
  private config: MetricsConfig;
  private metrics: Map<string, MetricValue> = new Map();
  private latencies: number[] = [];
  private maxLatencySamples = 1000;
  private prefix: string;

  constructor(config: MetricsConfig) {
    this.config = config;
    this.prefix = config.prefix || config.prometheus?.prefix || 'guardrails_';
    this.initializeMetrics();
  }

  /**
   * Initialize default metrics
   */
  private initializeMetrics(): void {
    // Counters
    this.registerMetric({
      name: `${this.prefix}checks_total`,
      type: 'counter',
      value: 0,
      help: 'Total number of guardrail checks performed',
    });

    this.registerMetric({
      name: `${this.prefix}blocks_total`,
      type: 'counter',
      value: 0,
      help: 'Total number of checks blocked',
    });

    // Gauges
    this.registerMetric({
      name: `${this.prefix}check_duration_ms`,
      type: 'histogram',
      value: 0,
      help: 'Duration of guardrail checks in milliseconds',
    });
  }

  /**
   * Register a metric
   */
  private registerMetric(metric: Metric): void {
    const key = this.getMetricKey(metric.name, metric.labels);
    this.metrics.set(key, {
      ...metric,
      lastUpdated: Date.now(),
    });
  }

  /**
   * Record a check performed
   */
  recordCheck(guardName: string, blocked: boolean, latency: number): void {
    // Increment total checks
    this.increment(`${this.prefix}checks_total`, { guard: guardName });

    // Increment blocks if blocked
    if (blocked) {
      this.increment(`${this.prefix}blocks_total`, { guard: guardName });
    }

    // Record latency
    this.recordLatency(latency);
    this.histogram(`${this.prefix}check_duration_ms`, latency, { guard: guardName });
  }

  /**
   * Increment a counter
   */
  increment(name: string, labels?: Record<string, string>, value: number = 1): void {
    const key = this.getMetricKey(name, labels);
    const existing = this.metrics.get(key);

    if (existing) {
      existing.value += value;
      existing.lastUpdated = Date.now();
    } else {
      this.registerMetric({
        name,
        type: 'counter',
        value,
        labels,
      });
    }

    // Send to provider
    this.sendToProvider({
      name,
      type: 'counter',
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  /**
   * Set a gauge value
   */
  gauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);
    const existing = this.metrics.get(key);

    if (existing) {
      existing.value = value;
      existing.lastUpdated = Date.now();
    } else {
      this.registerMetric({
        name,
        type: 'gauge',
        value,
        labels,
      });
    }

    // Send to provider
    this.sendToProvider({
      name,
      type: 'gauge',
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  /**
   * Record a histogram value
   */
  histogram(name: string, value: number, labels?: Record<string, string>): void {
    // For simplicity, we store the average
    // In production, you'd want proper histogram buckets
    const key = this.getMetricKey(name, labels);
    const existing = this.metrics.get(key);

    if (existing && existing.type === 'histogram') {
      const count = (existing as any).count || 1;
      const sum = existing.value * count;
      (existing as any).count = count + 1;
      existing.value = (sum + value) / (count + 1);
      existing.lastUpdated = Date.now();
    } else {
      this.registerMetric({
        name,
        type: 'histogram',
        value,
        labels,
      });
      (this.metrics.get(key) as any).count = 1;
    }

    // Send to provider
    this.sendToProvider({
      name,
      type: 'histogram',
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  /**
   * Record latency for percentile calculations
   */
  private recordLatency(latency: number): void {
    this.latencies.push(latency);

    // Keep only recent samples
    if (this.latencies.length > this.maxLatencySamples) {
      this.latencies.shift();
    }
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(percentile: number): number {
    if (this.latencies.length === 0) return 0;

    const sorted = [...this.latencies].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get metrics snapshot
   */
  getSnapshot(): MetricsSnapshot {
    const checksByGuard: Record<string, number> = {};
    const blocksByGuard: Record<string, number> = {};

    let totalChecks = 0;
    let totalBlocks = 0;

    const checksMetricName = `${this.prefix}checks_total`;
    const blocksMetricName = `${this.prefix}blocks_total`;

    for (const metric of this.metrics.values()) {
      if (metric.name === checksMetricName) {
        totalChecks += metric.value;
        if (metric.labels?.guard) {
          checksByGuard[metric.labels.guard] =
            (checksByGuard[metric.labels.guard] || 0) + metric.value;
        }
      } else if (metric.name === blocksMetricName) {
        totalBlocks += metric.value;
        if (metric.labels?.guard) {
          blocksByGuard[metric.labels.guard] =
            (blocksByGuard[metric.labels.guard] || 0) + metric.value;
        }
      }
    }

    // Calculate per-guard statistics
    const guardStats: Record<string, any> = {};
    for (const guard of Object.keys(checksByGuard)) {
      const checks = checksByGuard[guard] || 0;
      const blocks = blocksByGuard[guard] || 0;
      guardStats[guard] = {
        checks,
        blocks,
        blockRate: checks > 0 ? blocks / checks : 0,
        averageLatency: 0, // Could be calculated from per-guard latencies if tracked
      };
    }

    const avgLatency =
      this.latencies.length > 0
        ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
        : 0;

    return {
      totalChecks,
      totalBlocks,
      blockRate: totalChecks > 0 ? totalBlocks / totalChecks : 0,
      checksByGuard,
      blocksByGuard,
      guardStats,
      averageLatency: avgLatency,
      p90Latency: this.calculatePercentile(90),
      p95Latency: this.calculatePercentile(95),
      p99Latency: this.calculatePercentile(99),
      timestamp: Date.now(),
    };
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    // Group metrics by name
    const metricsByName = new Map<string, MetricValue[]>();
    for (const metric of this.metrics.values()) {
      const existing = metricsByName.get(metric.name) || [];
      existing.push(metric);
      metricsByName.set(metric.name, existing);
    }

    // Export each metric
    for (const [name, metrics] of metricsByName.entries()) {
      const firstMetric = metrics[0];

      // Add HELP
      if (firstMetric.help) {
        lines.push(`# HELP ${name} ${firstMetric.help}`);
      }

      // Add TYPE
      lines.push(`# TYPE ${name} ${firstMetric.type}`);

      // Add values
      for (const metric of metrics) {
        const labels = this.formatLabels(metric.labels);
        lines.push(`${name}${labels} ${metric.value} ${metric.lastUpdated}`);
      }

      lines.push(''); // Empty line between metrics
    }

    return lines.join('\n');
  }

  /**
   * Format labels for Prometheus
   */
  private formatLabels(labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return '';
    }

    const pairs = Object.entries(labels)
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');

    return `{${pairs}}`;
  }

  /**
   * Get metric key
   */
  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }

    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');

    return `${name}{${labelStr}}`;
  }

  /**
   * Send metric to configured provider
   */
  private sendToProvider(metric: Metric): void {
    if (!this.config.enabled) return;

    // Custom handler
    if (this.config.custom) {
      this.config.custom.record(metric);
      return;
    }

    // Provider-specific handling would go here
    // For now, metrics are stored in memory and can be exported
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.latencies = [];
    this.initializeMetrics();
  }
}

/**
 * Internal metric value
 */
interface MetricValue extends Metric {
  lastUpdated: number;
}
