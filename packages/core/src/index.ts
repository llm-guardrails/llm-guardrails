/**
 * @llm-guardrails/core
 *
 * TypeScript-native LLM guardrails with behavioral analysis and budget controls
 */

// Main engine
export { GuardrailEngine } from './engine/GuardrailEngine';
export { DetectionLayer, DETECTION_PRESETS } from './engine/DetectionLayer';

// Guards
export { HybridGuard } from './guards/base/HybridGuard';
export { PIIGuard } from './guards/PIIGuard';
export { InjectionGuard } from './guards/InjectionGuard';
export { SecretGuard } from './guards/SecretGuard';
export { ToxicityGuard } from './guards/ToxicityGuard';
export { LeakageGuard } from './guards/LeakageGuard';
export { HateSpeechGuard } from './guards/HateSpeechGuard';
export { BiasGuard } from './guards/BiasGuard';
export { AdultContentGuard } from './guards/AdultContentGuard';
export { CopyrightGuard } from './guards/CopyrightGuard';
export { ProfanityGuard } from './guards/ProfanityGuard';

// Behavioral Analysis
export { BehavioralGuard } from './behavioral/BehavioralGuard';
export { PatternMatcher } from './behavioral/PatternMatcher';
export { MemoryStore } from './behavioral/stores/MemoryStore';
export { BUILTIN_PATTERNS } from './behavioral/patterns/builtin';

// Budget System
export { BudgetGuard } from './budget/BudgetGuard';
export { BudgetTracker } from './budget/BudgetTracker';
export { TokenCounter } from './budget/TokenCounter';
export { CostCalculator } from './budget/CostCalculator';
export { MODEL_PRICING, getModelPricing } from './budget/pricing/models';

// Observability & Monitoring
export { Observability, createObservability } from './observability';
export { MetricsCollector } from './observability/metrics/MetricsCollector';
export { Logger } from './observability/logging/Logger';
export { Tracer } from './observability/tracing/Tracer';
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
} from './observability/types';

// Caching
export { LRUCache } from './cache/LRUCache';
export { CacheManager } from './cache/CacheManager';
export type {
  GuardrailCacheConfig,
  GuardrailCacheEntry,
  GuardrailCacheStats,
  ICache,
} from './cache/types';

// LLM Providers (L3 Validation) - Coming in v0.2.0
// export {
//   AnthropicLLMProvider,
//   OpenAILLMProvider,
//   LiteLLMProvider,
//   VertexLLMProvider,
//   BedrockLLMProvider,
// } from './llm/providers';
// export { PromptEngine } from './llm/prompts';
// export { LLMCache } from './llm/cache';
// export { LLMBudgetTracker } from './llm/budget';

// Gateway Adapters
export { Guardrails } from './adapters/Guardrails';
export { AnthropicAdapter } from './adapters/AnthropicAdapter';
export { OpenAIAdapter } from './adapters/OpenAIAdapter';
export { GeminiAdapter } from './adapters/GeminiAdapter';
export { LiteLLMAdapter } from './adapters/LiteLLMAdapter';
export { PortkeyAdapter } from './adapters/PortkeyAdapter';
export { MastraAdapter } from './adapters/MastraAdapter';
export { BaseAdapter } from './adapters/BaseAdapter';
export { StreamGuard } from './adapters/StreamGuard';
export { AutoDetect, globalAutoDetect } from './adapters/AutoDetect';
export type {
  GatewayAdapter,
  GuardedClient,
  AdapterConfig,
} from './adapters/types';
export { GuardrailViolation as AdapterGuardrailViolation } from './adapters/types';

// Types
export type {
  // Core types
  GuardrailConfig,
  GuardrailResult,
  GuardResult,
  Guard,
  CheckContext,
  // Detection types
  DetectionTier,
  DetectionLevel,
  DetectionTierConfig,
  HybridDetectionConfig,
  TierResult,
  // LLM provider (legacy)
  LLMProvider,
  LLMOptions,
  // LLM V2 (enhanced)
  LLMProviderV2,
  LLMValidationResult,
  LLMValidationOptions,
  LLMProviderInfo,
  LLMConfig,
  CacheConfig,
  CacheEntry,
  CacheStats,
  LLMBudgetConfig,
  LLMBudgetUsage,
  LLMBudgetStatus,
  PromptStrategy,
  ParsedLLMResponse,
  EscalationConfig,
  FallbackConfig,
  // Behavioral types
  ToolCallEvent,
  DetectedThreat,
  ThreatPattern,
  PatternStep,
  BehavioralConfig,
  ISessionStore,
  // Budget types
  BudgetConfig,
  UsageRecord,
  IBudgetStore,
  // Guard config
  GuardConfig,
} from './types';

// Errors
export { GuardrailViolation } from './types';

// Utils
export {
  calculateEntropy,
  calculateNormalizedEntropy,
  hasHighEntropy,
  extractHighEntropySubstrings,
} from './utils/entropy';

export {
  PII_PATTERNS,
  INJECTION_PATTERNS,
  SECRET_PATTERNS,
  compilePatterns,
  matchesAnyPattern,
} from './utils/patterns';
