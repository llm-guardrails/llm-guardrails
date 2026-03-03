/**
 * Budget Tracker
 *
 * Tracks token and cost usage with configurable limits.
 * Supports per-session and per-user budgets.
 */

import type { BudgetConfig, UsageRecord } from '../types';
import { TokenCounter } from './TokenCounter';
import { CostCalculator } from './CostCalculator';

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  usage?: {
    tokens: number;
    cost: number;
    limit: number;
  };
}

export class BudgetTracker {
  private config: BudgetConfig;
  private tokenCounter: TokenCounter;
  private costCalculator: CostCalculator;
  private store: Map<string, UsageRecord[]>; // Simple in-memory store
  private userStore: Map<string, number>; // User ID → total cost

  constructor(config: BudgetConfig = {}) {
    this.config = config;
    this.tokenCounter = new TokenCounter();
    this.costCalculator = new CostCalculator();
    this.store = new Map();
    this.userStore = new Map();
  }

  /**
   * Check if request is within budget (before making API call)
   */
  async checkBudget(
    input: string,
    model: string,
    sessionId: string,
    userId?: string
  ): Promise<BudgetCheckResult> {
    // Count input tokens
    const inputTokens = this.tokenCounter.count(input, model);

    // Estimate total tokens (input + expected output)
    const estimatedTotalTokens = inputTokens * 3; // Conservative: 2x output

    // Check token limit
    if (this.config.maxTokensPerSession) {
      const tokensUsed = await this.getTokensUsed(sessionId);

      if (tokensUsed + estimatedTotalTokens > this.config.maxTokensPerSession) {
        return {
          allowed: false,
          reason: `Session token limit exceeded: ${tokensUsed + estimatedTotalTokens} > ${this.config.maxTokensPerSession}`,
          usage: {
            tokens: tokensUsed,
            cost: 0,
            limit: this.config.maxTokensPerSession,
          },
        };
      }
    }

    // Check cost limit
    if (this.config.maxCostPerSession) {
      const estimatedCost = this.costCalculator.estimateCost(inputTokens, model);
      const costUsed = await this.getCostUsed(sessionId);

      if (costUsed + estimatedCost > this.config.maxCostPerSession) {
        return {
          allowed: false,
          reason: `Session cost limit exceeded: $${(costUsed + estimatedCost).toFixed(4)} > $${this.config.maxCostPerSession}`,
          usage: {
            tokens: 0,
            cost: costUsed,
            limit: this.config.maxCostPerSession,
          },
        };
      }

      // Check alert threshold
      if (this.config.alertThreshold) {
        const percentage = (costUsed + estimatedCost) / this.config.maxCostPerSession;

        if (percentage >= this.config.alertThreshold && percentage < 1.0) {
          // Emit warning (but allow the request)
          console.warn(
            `Budget warning: ${(percentage * 100).toFixed(1)}% of session budget used`
          );
        }
      }
    }

    // Check per-user cost limit
    if (userId && this.config.maxCostPerUser) {
      const userCost = this.getUserCost(userId);
      const estimatedCost = this.costCalculator.estimateCost(inputTokens, model);

      if (userCost + estimatedCost > this.config.maxCostPerUser) {
        return {
          allowed: false,
          reason: `User cost limit exceeded: $${(userCost + estimatedCost).toFixed(4)} > $${this.config.maxCostPerUser}`,
          usage: {
            tokens: 0,
            cost: userCost,
            limit: this.config.maxCostPerUser,
          },
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Record actual usage (after API response)
   */
  async recordUsage(record: UsageRecord): Promise<void> {
    // Add to session store
    const records = this.store.get(record.sessionId) || [];
    records.push(record);
    this.store.set(record.sessionId, records);

    // Add to user store
    if (record.userId) {
      const userCost = this.userStore.get(record.userId) || 0;
      this.userStore.set(record.userId, userCost + record.cost);
    }
  }

  /**
   * Get total tokens used for session
   */
  async getTokensUsed(sessionId: string): Promise<number> {
    const records = this.store.get(sessionId) || [];
    return records.reduce((sum, r) => sum + r.inputTokens + r.outputTokens, 0);
  }

  /**
   * Get total cost for session
   */
  async getCostUsed(sessionId: string): Promise<number> {
    const records = this.store.get(sessionId) || [];
    return records.reduce((sum, r) => sum + r.cost, 0);
  }

  /**
   * Get total cost for user
   */
  getUserCost(userId: string): number {
    return this.userStore.get(userId) || 0;
  }

  /**
   * Get session statistics
   */
  async getSessionStats(sessionId: string): Promise<{
    totalTokens: number;
    totalCost: number;
    requestCount: number;
  }> {
    const records = this.store.get(sessionId) || [];

    return {
      totalTokens: records.reduce((sum, r) => sum + r.inputTokens + r.outputTokens, 0),
      totalCost: records.reduce((sum, r) => sum + r.cost, 0),
      requestCount: records.length,
    };
  }

  /**
   * Clear session data
   */
  clearSession(sessionId: string): void {
    this.store.delete(sessionId);
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.store.clear();
    this.userStore.clear();
  }
}
