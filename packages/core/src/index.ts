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
