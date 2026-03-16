/**
 * Output blocking strategy
 */
export type OutputBlockStrategy = 'block' | 'sanitize' | 'throw' | 'custom';

/**
 * Failure mode for guard errors
 */
export type FailMode = 'open' | 'closed';

/**
 * Fail mode configuration
 */
export interface FailModeConfig {
  /** Global default mode */
  mode: FailMode;
  /** Per-guard overrides */
  perGuard?: Record<string, FailMode>;
}

/**
 * Block response
 */
export interface BlockResponse {
  message: string;
  metadata?: Record<string, any>;
  format?: 'text' | 'json' | 'custom';
}

/**
 * Blocked message function
 */
export interface BlockedMessageFunction {
  (result: import('./index').GuardrailResult, original?: string): BlockResponse;
}

/**
 * Blocked message wrapper configuration
 */
export interface BlockedMessageWrapper {
  prefix?: string;
  suffix?: string;
  tagFormat?: string;
}

/**
 * Advanced blocked message options
 */
export interface BlockedMessageOptions {
  message: string | BlockedMessageFunction;
  wrapper?: BlockedMessageWrapper;
  includeMetadata?: boolean;
  perGuard?: Record<string, string | BlockedMessageFunction>;
}

/**
 * Blocked message configuration (all options)
 */
export type BlockedMessageConfig =
  | string
  | { template: string }
  | BlockedMessageFunction
  | BlockedMessageOptions;

/**
 * Response transformer
 */
export interface ResponseTransformer {
  (response: any, result: import('./index').GuardrailResult): any;
}
