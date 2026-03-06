/**
 * Budget tracker for LLM validation calls
 */

import type {
  LLMBudgetConfig,
  LLMBudgetStatus,
} from '../../types/llm.js';

/**
 * Session data
 */
interface SessionData {
  calls: number;
  totalCost: number;
  dailyCost: number;
  lastReset: number;
}

/**
 * Tracks LLM usage and enforces budget limits
 */
export class LLMBudgetTracker {
  private sessions: Map<string, SessionData>;
  private config: LLMBudgetConfig;
  private dailyResetTimer?: NodeJS.Timeout;

  /**
   * Create a new budget tracker
   * @param config - Budget configuration
   */
  constructor(config: LLMBudgetConfig) {
    this.config = config;
    this.sessions = new Map();

    // Set up daily reset
    if (config.maxCostPerDay !== undefined) {
      this.scheduleDailyReset();
    }
  }

  /**
   * Record an LLM call
   * @param cost - Cost in dollars
   * @param sessionId - Session identifier
   */
  recordCall(cost: number, sessionId: string = 'default'): void {
    const session = this.getOrCreateSession(sessionId);

    session.calls++;
    session.totalCost += cost;
    session.dailyCost += cost;

    this.sessions.set(sessionId, session);
  }

  /**
   * Check if session can afford a call
   * @param sessionId - Session identifier
   * @param estimatedCost - Estimated cost in dollars
   * @returns Whether the call is within budget
   */
  canAfford(sessionId: string = 'default', estimatedCost: number = 0): boolean {
    const session = this.getOrCreateSession(sessionId);

    // Check max calls per session
    if (
      this.config.maxCallsPerSession !== undefined &&
      session.calls >= this.config.maxCallsPerSession
    ) {
      return false;
    }

    // Check max cost per session
    if (
      this.config.maxCostPerSession !== undefined &&
      session.totalCost + estimatedCost > this.config.maxCostPerSession
    ) {
      return false;
    }

    // Check max cost per day
    if (
      this.config.maxCostPerDay !== undefined &&
      session.dailyCost + estimatedCost > this.config.maxCostPerDay
    ) {
      return false;
    }

    return true;
  }

  /**
   * Get usage for a session
   * @param sessionId - Session identifier
   * @returns Usage statistics
   */
  getUsage(sessionId: string = 'default'): {
    calls: number;
    totalCost: number;
    remainingBudget: number;
  } {
    const session = this.getOrCreateSession(sessionId);

    let remainingBudget = Infinity;

    if (this.config.maxCostPerSession !== undefined) {
      remainingBudget = Math.min(
        remainingBudget,
        this.config.maxCostPerSession - session.totalCost
      );
    }

    if (this.config.maxCostPerDay !== undefined) {
      remainingBudget = Math.min(
        remainingBudget,
        this.config.maxCostPerDay - session.dailyCost
      );
    }

    return {
      calls: session.calls,
      totalCost: session.totalCost,
      remainingBudget: Math.max(0, remainingBudget),
    };
  }

  /**
   * Get budget status for a session
   * @param sessionId - Session identifier
   * @returns Budget status
   */
  getStatus(sessionId: string = 'default'): LLMBudgetStatus {
    const session = this.getOrCreateSession(sessionId);
    const usage = this.getUsage(sessionId);

    let maxBudget = Infinity;
    if (this.config.maxCostPerSession !== undefined) {
      maxBudget = this.config.maxCostPerSession;
    }

    const utilization =
      maxBudget !== Infinity ? session.totalCost / maxBudget : 0;
    const exceeded = !this.canAfford(sessionId, 0);

    return {
      calls: session.calls,
      totalCost: session.totalCost,
      remainingBudget: usage.remainingBudget,
      utilization,
      exceeded,
    };
  }

  /**
   * Check if alert threshold has been reached
   * @param sessionId - Session identifier
   * @returns Whether alert threshold has been reached
   */
  shouldAlert(sessionId: string = 'default'): boolean {
    if (this.config.alertThreshold === undefined) {
      return false;
    }

    const status = this.getStatus(sessionId);
    return status.utilization >= this.config.alertThreshold;
  }

  /**
   * Reset daily counters
   */
  resetDaily(): void {
    for (const [sessionId, session] of this.sessions.entries()) {
      session.dailyCost = 0;
      session.lastReset = Date.now();
      this.sessions.set(sessionId, session);
    }
  }

  /**
   * Reset session counters
   * @param sessionId - Session identifier
   */
  resetSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Reset all counters
   */
  resetAll(): void {
    this.sessions.clear();
  }

  /**
   * Get or create session data
   * @param sessionId - Session identifier
   * @returns Session data
   */
  private getOrCreateSession(sessionId: string): SessionData {
    let session = this.sessions.get(sessionId);

    if (!session) {
      session = {
        calls: 0,
        totalCost: 0,
        dailyCost: 0,
        lastReset: Date.now(),
      };
      this.sessions.set(sessionId, session);
    }

    return session;
  }

  /**
   * Schedule daily reset
   */
  private scheduleDailyReset(): void {
    // Calculate milliseconds until midnight
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    // Schedule reset at midnight
    this.dailyResetTimer = setTimeout(() => {
      this.resetDaily();
      // Reschedule for next day
      this.scheduleDailyReset();
    }, msUntilMidnight);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.dailyResetTimer) {
      clearTimeout(this.dailyResetTimer);
      this.dailyResetTimer = undefined;
    }
  }

  /**
   * Get configuration
   * @returns Budget configuration
   */
  getConfig(): LLMBudgetConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param config - New configuration
   */
  updateConfig(config: Partial<LLMBudgetConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart daily reset if needed
    if (config.maxCostPerDay !== undefined && !this.dailyResetTimer) {
      this.scheduleDailyReset();
    }
  }

  /**
   * Get all session IDs
   * @returns Array of session IDs
   */
  getSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Get total usage across all sessions
   * @returns Total usage
   */
  getTotalUsage(): {
    sessions: number;
    calls: number;
    totalCost: number;
  } {
    let totalCalls = 0;
    let totalCost = 0;

    for (const session of this.sessions.values()) {
      totalCalls += session.calls;
      totalCost += session.totalCost;
    }

    return {
      sessions: this.sessions.size,
      calls: totalCalls,
      totalCost,
    };
  }
}
