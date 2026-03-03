/**
 * @openclaw-guardrails/core
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
  // LLM provider
  LLMProvider,
  LLMOptions,
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
