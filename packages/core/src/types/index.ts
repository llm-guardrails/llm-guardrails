/**
 * Core type definitions for openclaw-guardrails
 */

// ============================================================================
// Guard Types
// ============================================================================

/**
 * Detection tier level
 */
export type DetectionTier = 'L1' | 'L2' | 'L3';

/**
 * Result from a single guard check
 */
export interface GuardResult {
  /** Whether the check passed */
  passed: boolean;
  /** Whether the input should be blocked */
  blocked?: boolean;
  /** Reason for blocking (if applicable) */
  reason?: string;
  /** Detection tier used (L1=heuristic, L2=pattern, L3=LLM) */
  tier?: DetectionTier;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Latency in milliseconds */
  latency?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Sanitized version (if applicable) */
  sanitized?: string;
}

/**
 * Combined result from all guards
 */
export interface GuardrailResult {
  /** Whether all checks passed */
  passed: boolean;
  /** Whether the input was blocked by any guard */
  blocked: boolean;
  /** Reason for blocking (from first blocking guard) */
  reason?: string;
  /** Name of guard that blocked */
  guard?: string;
  /** Results from all guards */
  results: GuardResult[];
  /** Total latency in milliseconds */
  totalLatency?: number;
  /** Session ID (if applicable) */
  sessionId?: string;
}

/**
 * Context passed through guard checks
 */
export interface CheckContext {
  /** Session identifier */
  sessionId?: string;
  /** User identifier */
  userId?: string;
  /** Model being used */
  model?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Base guard interface
 */
export interface Guard {
  /** Guard name */
  name: string;
  /** Check input for violations */
  check(input: string, context?: CheckContext): Promise<GuardResult>;
}

// ============================================================================
// Detection Configuration
// ============================================================================

/**
 * Configuration for a single detection tier
 */
export interface DetectionTierConfig {
  /** Whether this tier is enabled */
  enabled: boolean;
  /** Confidence threshold (0-1) */
  threshold: number;
}

/**
 * Configuration for hybrid L1/L2/L3 detection
 */
export interface HybridDetectionConfig {
  /** L1: Heuristic detection (<1ms) */
  tier1: DetectionTierConfig;
  /** L2: Pattern-based detection (<5ms) */
  tier2: DetectionTierConfig;
  /** L3: LLM-based detection (50-200ms, optional) */
  tier3?: {
    enabled: boolean;
    provider?: LLMProvider;
    /** Only use L3 if L1/L2 found something suspicious */
    onlyIfSuspicious: boolean;
    /** Maximum cost per check in dollars */
    costLimit?: number;
  };
}

/**
 * Result from a detection tier
 */
export interface TierResult {
  /** Confidence score (0-1) */
  score: number;
  /** Reason (if triggered) */
  reason?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// LLM Provider (for L3 checks)
// ============================================================================

/**
 * LLM provider interface for L3 checks
 */
export interface LLMProvider {
  /** Provider name */
  name: string;
  /** Generate completion */
  complete(prompt: string, options?: LLMOptions): Promise<string>;
}

/**
 * Options for LLM completion
 */
export interface LLMOptions {
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature (0-1) */
  temperature?: number;
  /** Maximum cost in dollars */
  costLimit?: number;
}

// ============================================================================
// Behavioral Analysis Types
// ============================================================================

/**
 * Tool call event (for behavioral analysis)
 */
export interface ToolCallEvent {
  /** Session identifier */
  sessionId: string;
  /** Event timestamp */
  timestamp: number;
  /** Tool name */
  tool: string;
  /** Tool arguments */
  args: Record<string, unknown>;
  /** User ID (optional) */
  userId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Detected threat from behavioral analysis
 */
export interface DetectedThreat {
  /** Pattern name */
  pattern: string;
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Evidence (matching events) */
  evidence: ToolCallEvent[];
  /** Detection timestamp */
  timestamp: number;
  /** Pattern description */
  description?: string;
}

/**
 * Single step in a threat pattern
 */
export interface PatternStep {
  /** Tool name pattern (string or regex) */
  tool: string | RegExp;
  /** Argument patterns (optional) */
  args?: Record<string, string | RegExp>;
  /** Time window since previous step in milliseconds (optional) */
  timeWindow?: number;
}

/**
 * Threat pattern definition
 */
export interface ThreatPattern {
  /** Pattern name */
  name: string;
  /** Pattern description */
  description: string;
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Sequence of steps to match */
  steps: PatternStep[];
  /** Maximum time between first and last step in milliseconds */
  maxTimeWindow: number;
  /** Minimum occurrences of pattern (default: 1) */
  minOccurrences?: number;
}

/**
 * Configuration for behavioral analysis
 */
export interface BehavioralConfig {
  /** Whether behavioral analysis is enabled */
  enabled?: boolean;
  /** Custom threat patterns */
  patterns?: ThreatPattern[];
  /** Storage backend */
  storage?: 'memory' | 'sqlite' | 'redis';
  /** Custom session store */
  customStore?: ISessionStore;
  /** Session TTL in milliseconds (default: 1 hour) */
  sessionTTL?: number;
}

/**
 * Session store interface
 */
export interface ISessionStore {
  /** Add event to session */
  addEvent(event: ToolCallEvent): Promise<void>;
  /** Get recent events for session */
  getEvents(sessionId: string, since?: number): Promise<ToolCallEvent[]>;
  /** Cleanup old sessions */
  cleanup(olderThan: number): Promise<void>;
  /** Get all active sessions */
  getActiveSessions(): Promise<string[]>;
}

// ============================================================================
// Budget Types
// ============================================================================

/**
 * Budget configuration
 */
export interface BudgetConfig {
  /** Maximum tokens per session */
  maxTokensPerSession?: number;
  /** Maximum cost per session (in dollars) */
  maxCostPerSession?: number;
  /** Maximum cost per user (in dollars) */
  maxCostPerUser?: number;
  /** Track guardrail costs separately */
  trackGuardrailCosts?: boolean;
  /** Alert threshold (0-1, e.g., 0.8 = alert at 80%) */
  alertThreshold?: number;
  /** Storage backend */
  storage?: 'memory' | 'sqlite';
  /** Storage configuration */
  storageConfig?: Record<string, unknown>;
}

/**
 * Usage record
 */
export interface UsageRecord {
  /** Session ID */
  sessionId: string;
  /** Input tokens */
  inputTokens: number;
  /** Output tokens */
  outputTokens: number;
  /** Model used */
  model: string;
  /** Cost in dollars */
  cost: number;
  /** Timestamp */
  timestamp: number;
  /** User ID (optional) */
  userId?: string;
}

/**
 * Budget store interface
 */
export interface IBudgetStore {
  /** Record usage */
  recordUsage(record: UsageRecord): Promise<void>;
  /** Get total tokens used for session */
  getTokensUsed(sessionId: string): Promise<number>;
  /** Get total cost for session */
  getCostUsed(sessionId: string): Promise<number>;
  /** Get total cost for user */
  getUserCost(userId: string): Promise<number>;
  /** Cleanup old records */
  cleanup(olderThan: number): Promise<void>;
}

// ============================================================================
// Main Configuration
// ============================================================================

/**
 * Guard configuration
 */
export interface GuardConfig {
  /** Guard name */
  name: string;
  /** Whether guard is enabled */
  enabled?: boolean;
  /** Guard-specific configuration */
  config?: Record<string, unknown>;
}

/**
 * Detection level preset
 */
export type DetectionLevel = 'basic' | 'standard' | 'advanced';

/**
 * Main guardrails configuration
 */
export interface GuardrailConfig {
  /** Which guards to enable (default: all) */
  guards?: GuardConfig[];
  /** Detection level preset */
  level?: DetectionLevel;
  /** Optional LLM provider for L3 checks */
  llmProvider?: LLMProvider;
  /** Behavioral analysis configuration */
  behavioral?: BehavioralConfig | boolean;
  /** Budget controls configuration */
  budget?: BudgetConfig;
  /** Callback when input is blocked */
  onBlock?: (result: GuardrailResult) => void;
  /** Callback for warnings */
  onWarn?: (result: GuardrailResult) => void;
}

// ============================================================================
// Errors
// ============================================================================

/**
 * Custom error for guardrail violations
 */
export class GuardrailViolation extends Error {
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly guard: string;
  public readonly metadata?: Record<string, unknown>;

  constructor(options: {
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    guard: string;
    metadata?: Record<string, unknown>;
  }) {
    super(options.message);
    this.name = 'GuardrailViolation';
    this.severity = options.severity;
    this.guard = options.guard;
    this.metadata = options.metadata;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, GuardrailViolation);
  }
}
