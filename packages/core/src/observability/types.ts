/**
 * Observability Types
 *
 * Configuration and interfaces for metrics, logging, and tracing.
 */

/**
 * Observability configuration
 */
export interface ObservabilityConfig {
  /** Metrics configuration */
  metrics?: MetricsConfig;
  /** Logging configuration */
  logging?: LoggingConfig;
  /** Tracing configuration */
  tracing?: TracingConfig;
}

/**
 * Metrics configuration
 */
export interface MetricsConfig {
  /** Enable metrics collection */
  enabled: boolean;
  /** Metrics provider */
  provider?: 'prometheus' | 'statsd' | 'datadog' | 'custom';
  /** Metric name prefix */
  prefix?: string;
  /** Custom labels to add to all metrics */
  customLabels?: Record<string, string>;
  /** Prometheus-specific config */
  prometheus?: {
    port?: number;
    path?: string;
    prefix?: string;
  };
  /** StatsD-specific config */
  statsd?: {
    host?: string;
    port?: number;
    prefix?: string;
  };
  /** DataDog-specific config */
  datadog?: {
    apiKey?: string;
    site?: string;
    prefix?: string;
  };
  /** Custom metrics handler */
  custom?: {
    record: (metric: Metric) => void | Promise<void>;
  };
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  /** Enable logging */
  enabled: boolean;
  /** Log level */
  level?: 'debug' | 'info' | 'warn' | 'error';
  /** Log format */
  format?: 'json' | 'text';
  /** Output destination */
  destination?: 'console' | 'file' | 'custom';
  /** File path (if destination='file') */
  filePath?: string;
  /** Custom log handler */
  custom?: {
    log: (entry: LogEntry) => void | Promise<void>;
  };
  /** Include sensitive data in logs */
  includeSensitive?: boolean;
}

/**
 * Tracing configuration
 */
export interface TracingConfig {
  /** Enable tracing */
  enabled: boolean;
  /** Tracing provider */
  provider?: 'opentelemetry' | 'custom';
  /** OpenTelemetry config */
  opentelemetry?: {
    endpoint?: string;
    serviceName?: string;
    headers?: Record<string, string>;
  };
  /** Custom tracer */
  custom?: {
    startSpan: (name: string, attributes?: Record<string, any>) => Span;
  };
}

/**
 * Metric data structure
 */
export interface Metric {
  /** Metric name */
  name: string;
  /** Metric type */
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  /** Metric value */
  value: number;
  /** Metric labels/tags */
  labels?: Record<string, string>;
  /** Timestamp */
  timestamp?: number;
  /** Unit */
  unit?: string;
  /** Help text */
  help?: string;
}

/**
 * Log entry structure
 */
export interface LogEntry {
  /** Log level */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** Log message */
  message: string;
  /** Timestamp */
  timestamp: number;
  /** Context metadata */
  context?: Record<string, any>;
  /** Error object (if level='error') */
  error?: Error;
  /** Guard name */
  guardName?: string;
  /** Session ID */
  sessionId?: string;
  /** Input hash (for privacy) */
  inputHash?: string;
}

/**
 * Span interface for tracing
 */
export interface Span {
  /** Span name */
  name: string;
  /** Start time */
  startTime: number;
  /** End span */
  end(): void;
  /** Add attribute */
  setAttribute(key: string, value: any): void;
  /** Add event */
  addEvent(name: string, attributes?: Record<string, any>): void;
  /** Set status */
  setStatus(status: 'ok' | 'error', message?: string): void;
}

/**
 * Guard statistics
 */
export interface GuardStats {
  /** Total checks for this guard */
  checks: number;
  /** Total blocks for this guard */
  blocks: number;
  /** Block rate (0-1) */
  blockRate: number;
  /** Average latency (ms) */
  averageLatency?: number;
}

/**
 * Metrics snapshot
 */
export interface MetricsSnapshot {
  /** Total checks performed */
  totalChecks: number;
  /** Total blocks */
  totalBlocks: number;
  /** Block rate (0-1) */
  blockRate: number;
  /** Checks by guard */
  checksByGuard: Record<string, number>;
  /** Blocks by guard */
  blocksByGuard: Record<string, number>;
  /** Per-guard statistics */
  guardStats?: Record<string, GuardStats>;
  /** Average latency (ms) */
  averageLatency: number;
  /** 90th percentile latency (ms) */
  p90Latency: number;
  /** 95th percentile latency (ms) */
  p95Latency: number;
  /** 99th percentile latency (ms) */
  p99Latency: number;
  /** False positive rate (if known) */
  falsePositiveRate?: number;
  /** Timestamp */
  timestamp: number;
}

/**
 * Observability statistics
 */
export interface ObservabilityStats {
  /** Metrics collected */
  metricsCollected: number;
  /** Logs written */
  logsWritten: number;
  /** Spans created */
  spansCreated: number;
  /** Last snapshot */
  lastSnapshot?: MetricsSnapshot;
}
