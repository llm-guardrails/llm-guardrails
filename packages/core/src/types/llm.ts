/**
 * Enhanced LLM types for L3 (LLM-based validation)
 */

// ============================================================================
// LLM Validation Types
// ============================================================================

/**
 * Result from LLM validation
 */
export interface LLMValidationResult {
  /** Whether the input should be blocked */
  blocked: boolean;
  /** Confidence score (0-1) */
  confidence: number;
  /** Reason for the decision */
  reason?: string;
  /** Guard type that performed the validation */
  guardType: string;
  /** Additional metadata */
  metadata?: {
    /** Model used */
    model?: string;
    /** Tokens consumed */
    tokens?: number;
    /** Cost in dollars */
    cost?: number;
    /** Latency in milliseconds */
    latency?: number;
    /** Whether result was from cache */
    cached?: boolean;
  };
}

/**
 * Enhanced LLM provider interface (V2)
 */
export interface LLMProviderV2 {
  /**
   * Validate input using LLM
   * @param input - Text to validate
   * @param guardType - Type of guard performing validation
   * @param options - Optional validation options
   * @returns Validation result
   */
  validate(
    input: string,
    guardType: string,
    options?: LLMValidationOptions
  ): Promise<LLMValidationResult>;

  /**
   * Get provider information
   * @returns Provider metadata
   */
  getInfo(): LLMProviderInfo;
}

/**
 * Options for LLM validation
 */
export interface LLMValidationOptions {
  /** Temperature for generation (0-1) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Cache key for result reuse */
  cacheKey?: string;
}

/**
 * LLM provider metadata
 */
export interface LLMProviderInfo {
  /** Provider name */
  name: string;
  /** Model being used */
  model: string;
  /** Estimated cost per check */
  costPerCheck: number;
  /** Average latency in milliseconds */
  averageLatency: number;
}

// ============================================================================
// Cache Types
// ============================================================================

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Whether caching is enabled */
  enabled: boolean;
  /** Time-to-live in milliseconds */
  ttl: number;
  /** Maximum cache size (number of entries) */
  maxSize: number;
}

/**
 * Cache entry
 */
export interface CacheEntry {
  /** Cached validation result */
  result: LLMValidationResult;
  /** Timestamp when cached */
  timestamp: number;
  /** Time-to-live in milliseconds */
  ttl: number;
  /** Cache key */
  key: string;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Current cache size */
  size: number;
  /** Maximum cache size */
  maxSize: number;
  /** Cache utilization (0-1) */
  utilization: number;
  /** Total hits */
  hits?: number;
  /** Total misses */
  misses?: number;
  /** Hit rate (0-1) */
  hitRate?: number;
}

// ============================================================================
// Budget Types
// ============================================================================

/**
 * LLM budget configuration
 */
export interface LLMBudgetConfig {
  /** Maximum LLM calls per session */
  maxCallsPerSession?: number;
  /** Maximum cost per session (in dollars) */
  maxCostPerSession?: number;
  /** Maximum cost per day (in dollars) */
  maxCostPerDay?: number;
  /** Alert threshold (0-1, e.g., 0.8 = alert at 80%) */
  alertThreshold?: number;
  /** Behavior when budget exceeded */
  onBudgetExceeded?: 'block' | 'allow' | 'warn';
}

/**
 * LLM budget usage
 */
export interface LLMBudgetUsage {
  /** Number of LLM calls */
  calls: number;
  /** Total cost in dollars */
  totalCost: number;
  /** Daily cost in dollars */
  dailyCost: number;
  /** Last reset timestamp */
  lastReset: number;
}

/**
 * LLM budget status
 */
export interface LLMBudgetStatus {
  /** Total calls made */
  calls: number;
  /** Total cost incurred */
  totalCost: number;
  /** Remaining budget */
  remainingBudget: number;
  /** Budget utilization (0-1) */
  utilization: number;
  /** Whether budget is exceeded */
  exceeded: boolean;
}

// ============================================================================
// Prompt Types
// ============================================================================

/**
 * Prompt strategy
 */
export type PromptStrategy = 'guard-specific' | 'generic' | 'hybrid';

/**
 * Prompt configuration
 */
export interface PromptConfig {
  /** Prompt strategy to use */
  strategy: PromptStrategy;
  /** Custom prompts for specific guards */
  customPrompts?: Record<string, string>;
}

/**
 * Parsed LLM response
 */
export interface ParsedLLMResponse {
  /** Whether input should be blocked */
  blocked: boolean;
  /** Confidence score (0-1) */
  confidence: number;
  /** Reason for decision */
  reason: string;
}

// ============================================================================
// Escalation Types
// ============================================================================

/**
 * L3 escalation configuration
 */
export interface EscalationConfig {
  /** L1 confidence threshold for escalation (below this, escalate to L2) */
  l1Threshold?: number;
  /** L2 confidence threshold for escalation (below this, escalate to L3) */
  l2Threshold?: number;
  /** Only escalate if previous tier detected something suspicious */
  onlyIfSuspicious?: boolean;
}

/**
 * Fallback behavior configuration
 */
export interface FallbackConfig {
  /** Behavior on timeout */
  onTimeout?: 'block' | 'allow';
  /** Behavior on error */
  onError?: 'block' | 'allow' | 'use-l2';
}

// ============================================================================
// LLM Configuration (for GuardrailConfig)
// ============================================================================

/**
 * Enhanced LLM configuration for guardrails
 */
export interface LLMConfig {
  /** Whether L3 (LLM-based validation) is enabled */
  enabled: boolean;

  /** LLM provider to use */
  provider: LLMProviderV2;

  /** Escalation settings */
  escalation?: EscalationConfig;

  /** Prompt configuration */
  prompts?: PromptConfig;

  /** Cache configuration */
  cache?: CacheConfig;

  /** Budget configuration */
  budget?: LLMBudgetConfig;

  /** Budget tracker instance (internal, set by engine) */
  budgetTracker?: any; // Will be LLMBudgetTracker

  /** Fallback behavior */
  fallback?: FallbackConfig;
}
