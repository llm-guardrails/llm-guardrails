/**
 * Budget Guard
 *
 * Enforces token and cost budgets for LLM usage.
 * Integrates with existing guard system.
 */

import type { Guard, GuardResult, BudgetConfig } from '../types';
import { BudgetTracker } from './BudgetTracker';

export interface BudgetCheckContext {
  sessionId: string;
  model: string;
  userId?: string;
}

export class BudgetGuard implements Guard {
  public readonly name = 'budget';

  private tracker: BudgetTracker;

  constructor(config: BudgetConfig = {}) {
    this.tracker = new BudgetTracker(config);
  }

  /**
   * Check if input is within budget
   * Context must include sessionId and model
   */
  async check(input: string, context?: BudgetCheckContext): Promise<GuardResult> {
    if (!context?.sessionId || !context?.model) {
      return {
        passed: true,
        reason: 'Budget check skipped: missing sessionId or model in context',
      };
    }

    const startTime = Date.now();

    const result = await this.tracker.checkBudget(
      input,
      context.model,
      context.sessionId,
      context.userId
    );

    if (!result.allowed) {
      return {
        passed: false,
        blocked: true,
        reason: result.reason,
        latency: Date.now() - startTime,
        metadata: {
          usage: result.usage,
        },
      };
    }

    return {
      passed: true,
      latency: Date.now() - startTime,
      metadata: {
        sessionId: context.sessionId,
        model: context.model,
      },
    };
  }

  /**
   * Record actual usage after API response
   */
  async recordUsage(
    sessionId: string,
    inputTokens: number,
    outputTokens: number,
    model: string,
    userId?: string
  ): Promise<void> {
    const cost = await this.tracker['costCalculator'].calculate(
      inputTokens,
      outputTokens,
      model
    );

    await this.tracker.recordUsage({
      sessionId,
      inputTokens,
      outputTokens,
      model,
      cost,
      timestamp: Date.now(),
      userId,
    });
  }

  /**
   * Get session statistics
   */
  async getStats(sessionId: string) {
    return this.tracker.getSessionStats(sessionId);
  }

  /**
   * Clear session
   */
  clearSession(sessionId: string): void {
    this.tracker.clearSession(sessionId);
  }
}
