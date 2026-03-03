/**
 * Base class for guards with hybrid L1/L2/L3 detection
 */

import type {
  Guard,
  GuardResult,
  CheckContext,
  HybridDetectionConfig,
  TierResult,
} from '../../types';
import { DetectionLayer } from '../../engine/DetectionLayer';

/**
 * Base hybrid guard implementation
 */
export abstract class HybridGuard extends DetectionLayer implements Guard {
  public abstract readonly name: string;

  constructor(config: HybridDetectionConfig) {
    super(config);
  }

  /**
   * Main check method
   */
  async check(input: string, context?: CheckContext): Promise<GuardResult> {
    const detection = await this.detect(input, context as Record<string, unknown>);

    if (detection.blocked) {
      return {
        passed: false,
        blocked: true,
        reason: detection.result.reason || `Blocked by ${this.name}`,
        tier: detection.tier,
        confidence: detection.result.score,
        latency: detection.latency,
        metadata: detection.result.metadata,
      };
    }

    return {
      passed: true,
      blocked: false,
      tier: detection.tier,
      latency: detection.latency,
    };
  }

  /**
   * Subclasses must implement L1 detection
   */
  protected abstract detectL1(input: string): TierResult;

  /**
   * Subclasses must implement L2 detection
   */
  protected abstract detectL2(
    input: string,
    context?: Record<string, unknown>
  ): TierResult;

  /**
   * Optional: Subclasses can override L3 detection
   */
  protected async detectL3(
    _input: string,
    _context?: Record<string, unknown>
  ): Promise<TierResult> {
    // Default: no L3 implementation
    return { score: 0 };
  }
}
