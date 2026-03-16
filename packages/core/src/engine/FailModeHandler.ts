import type { FailMode, FailModeConfig } from '../types/output';

/**
 * Handles fail-open vs fail-closed logic for guard errors
 */
export class FailModeHandler {
  private globalMode: FailMode;
  private perGuard: Record<string, FailMode>;

  constructor(config?: FailMode | FailModeConfig) {
    if (!config) {
      // Default: fail-closed (security first)
      this.globalMode = 'closed';
      this.perGuard = {};
    } else if (typeof config === 'string') {
      // Simple mode
      this.globalMode = config;
      this.perGuard = {};
    } else {
      // Complex config with per-guard overrides
      this.globalMode = config.mode || 'closed';
      this.perGuard = config.perGuard || {};
    }
  }

  /**
   * Determine if guard error should block (fail-closed) or allow (fail-open)
   */
  shouldBlockOnError(guardName: string, error: Error): boolean {
    // Check per-guard override first
    if (this.perGuard[guardName]) {
      return this.perGuard[guardName] === 'closed';
    }

    // Fallback to global mode
    return this.globalMode === 'closed';
  }

  /**
   * Get the effective mode for a guard
   */
  getModeForGuard(guardName: string): FailMode {
    return this.perGuard[guardName] || this.globalMode;
  }

  /**
   * Get global mode
   */
  getGlobalMode(): FailMode {
    return this.globalMode;
  }

  /**
   * Check if a guard has an override
   */
  hasOverride(guardName: string): boolean {
    return guardName in this.perGuard;
  }
}
