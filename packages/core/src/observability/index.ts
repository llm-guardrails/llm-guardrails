/**
 * Observability Module
 *
 * Provides metrics, logging, and tracing for guardrail operations.
 */

export { Observability, createObservability } from './Observability';
export { MetricsCollector } from './metrics/MetricsCollector';
export { Logger } from './logging/Logger';
export { Tracer } from './tracing/Tracer';

export type {
  ObservabilityConfig,
  MetricsConfig,
  LoggingConfig,
  TracingConfig,
  Metric,
  LogEntry,
  Span,
  MetricsSnapshot,
  ObservabilityStats,
} from './types';
