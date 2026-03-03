import { describe, it, expect, beforeEach } from 'vitest';
import { BudgetTracker } from '../BudgetTracker';

describe('BudgetTracker', () => {
  let tracker: BudgetTracker;

  beforeEach(() => {
    tracker = new BudgetTracker({
      maxTokensPerSession: 10000,
      maxCostPerSession: 1.0,
      maxCostPerUser: 5.0,
      alertThreshold: 0.8,
    });
  });

  describe('Budget Checking', () => {
    it('allows requests within token budget', async () => {
      const result = await tracker.checkBudget(
        'Hello world', // ~3 tokens
        'gpt-4o',
        'session-1'
      );

      expect(result.allowed).toBe(true);
    });

    it('blocks requests exceeding token budget', async () => {
      // Record 9000 tokens used
      await tracker.recordUsage({
        sessionId: 'session-1',
        inputTokens: 4500,
        outputTokens: 4500,
        model: 'gpt-4o',
        cost: 0.1,
        timestamp: Date.now(),
      });

      // Try to use 4000 more tokens (would exceed 10000 limit)
      const longText = 'word '.repeat(1000); // ~1300 tokens × 3 = ~3900 estimated total
      const result = await tracker.checkBudget(longText, 'gpt-4o', 'session-1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('token limit exceeded');
    });

    it('allows requests within cost budget', async () => {
      const result = await tracker.checkBudget(
        'Short message', // Low cost
        'gpt-4o',
        'session-1'
      );

      expect(result.allowed).toBe(true);
    });

    it.skip('blocks requests exceeding cost budget', async () => {
      // Create tracker with only cost limit (no token limit)
      const costTracker = new BudgetTracker({
        maxCostPerSession: 0.01, // $0.01 limit
      });

      // Record $0.009 used
      await costTracker.recordUsage({
        sessionId: 'session-1',
        inputTokens: 25,
        outputTokens: 25,
        model: 'gpt-4o',
        cost: 0.009,
        timestamp: Date.now(),
      });

      // Try to use more (would exceed $0.01 limit)
      const result = await costTracker.checkBudget('Hello world', 'gpt-4o', 'session-1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('cost limit exceeded');
    });

    it.skip('blocks requests exceeding user budget', async () => {
      // Create tracker with only user cost limit (no token or session cost limits)
      const userTracker = new BudgetTracker({
        maxCostPerUser: 0.05, // $0.05 user limit
      });

      // Record $0.045 for user across multiple sessions
      for (let i = 0; i < 5; i++) {
        await userTracker.recordUsage({
          sessionId: `session-${i}`,
          inputTokens: 50,
          outputTokens: 50,
          model: 'gpt-4o',
          cost: 0.009,
          timestamp: Date.now(),
          userId: 'user-1',
        });
      }

      // Try to use more (would exceed $0.05 user limit)
      const result = await userTracker.checkBudget('Hello', 'gpt-4o', 'session-6', 'user-1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('User cost limit exceeded');
    });
  });

  describe('Usage Recording', () => {
    it('records usage correctly', async () => {
      await tracker.recordUsage({
        sessionId: 'session-1',
        inputTokens: 100,
        outputTokens: 200,
        model: 'gpt-4o',
        cost: 0.005,
        timestamp: Date.now(),
      });

      const tokensUsed = await tracker.getTokensUsed('session-1');
      const costUsed = await tracker.getCostUsed('session-1');

      expect(tokensUsed).toBe(300);
      expect(costUsed).toBeCloseTo(0.005, 5);
    });

    it('accumulates usage across multiple requests', async () => {
      await tracker.recordUsage({
        sessionId: 'session-1',
        inputTokens: 100,
        outputTokens: 200,
        model: 'gpt-4o',
        cost: 0.005,
        timestamp: Date.now(),
      });

      await tracker.recordUsage({
        sessionId: 'session-1',
        inputTokens: 150,
        outputTokens: 250,
        model: 'gpt-4o',
        cost: 0.007,
        timestamp: Date.now(),
      });

      const tokensUsed = await tracker.getTokensUsed('session-1');
      const costUsed = await tracker.getCostUsed('session-1');

      expect(tokensUsed).toBe(700);
      expect(costUsed).toBeCloseTo(0.012, 5);
    });

    it('tracks per-user costs separately', async () => {
      await tracker.recordUsage({
        sessionId: 'session-1',
        inputTokens: 100,
        outputTokens: 200,
        model: 'gpt-4o',
        cost: 0.005,
        timestamp: Date.now(),
        userId: 'user-1',
      });

      await tracker.recordUsage({
        sessionId: 'session-2',
        inputTokens: 100,
        outputTokens: 200,
        model: 'gpt-4o',
        cost: 0.005,
        timestamp: Date.now(),
        userId: 'user-2',
      });

      expect(tracker.getUserCost('user-1')).toBeCloseTo(0.005, 5);
      expect(tracker.getUserCost('user-2')).toBeCloseTo(0.005, 5);
    });
  });

  describe('Session Statistics', () => {
    it('provides session stats', async () => {
      await tracker.recordUsage({
        sessionId: 'session-1',
        inputTokens: 100,
        outputTokens: 200,
        model: 'gpt-4o',
        cost: 0.005,
        timestamp: Date.now(),
      });

      await tracker.recordUsage({
        sessionId: 'session-1',
        inputTokens: 150,
        outputTokens: 250,
        model: 'gpt-4o',
        cost: 0.007,
        timestamp: Date.now(),
      });

      const stats = await tracker.getSessionStats('session-1');

      expect(stats.totalTokens).toBe(700);
      expect(stats.totalCost).toBeCloseTo(0.012, 5);
      expect(stats.requestCount).toBe(2);
    });

    it('returns zero stats for new session', async () => {
      const stats = await tracker.getSessionStats('new-session');

      expect(stats.totalTokens).toBe(0);
      expect(stats.totalCost).toBe(0);
      expect(stats.requestCount).toBe(0);
    });
  });

  describe('Session Management', () => {
    it('keeps sessions separate', async () => {
      await tracker.recordUsage({
        sessionId: 'session-1',
        inputTokens: 100,
        outputTokens: 200,
        model: 'gpt-4o',
        cost: 0.005,
        timestamp: Date.now(),
      });

      await tracker.recordUsage({
        sessionId: 'session-2',
        inputTokens: 150,
        outputTokens: 250,
        model: 'gpt-4o',
        cost: 0.007,
        timestamp: Date.now(),
      });

      const session1Tokens = await tracker.getTokensUsed('session-1');
      const session2Tokens = await tracker.getTokensUsed('session-2');

      expect(session1Tokens).toBe(300);
      expect(session2Tokens).toBe(400);
    });

    it('clears session data', async () => {
      await tracker.recordUsage({
        sessionId: 'session-1',
        inputTokens: 100,
        outputTokens: 200,
        model: 'gpt-4o',
        cost: 0.005,
        timestamp: Date.now(),
      });

      tracker.clearSession('session-1');

      const tokensUsed = await tracker.getTokensUsed('session-1');
      expect(tokensUsed).toBe(0);
    });

    it('clears all data', async () => {
      await tracker.recordUsage({
        sessionId: 'session-1',
        inputTokens: 100,
        outputTokens: 200,
        model: 'gpt-4o',
        cost: 0.005,
        timestamp: Date.now(),
        userId: 'user-1',
      });

      tracker.clear();

      const tokensUsed = await tracker.getTokensUsed('session-1');
      const userCost = tracker.getUserCost('user-1');

      expect(tokensUsed).toBe(0);
      expect(userCost).toBe(0);
    });
  });

  describe('Alert Threshold', () => {
    it('configuration includes alert threshold', () => {
      const configuredTracker = new BudgetTracker({
        maxCostPerSession: 1.0,
        alertThreshold: 0.8,
      });

      expect(configuredTracker).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero token input', async () => {
      const result = await tracker.checkBudget('', 'gpt-4o', 'session-1');
      expect(result.allowed).toBe(true);
    });

    it('handles unknown models gracefully', async () => {
      const result = await tracker.checkBudget('Hello', 'unknown-model', 'session-1');
      expect(result.allowed).toBe(true);
    });

    it('returns zero for user without usage', () => {
      const cost = tracker.getUserCost('new-user');
      expect(cost).toBe(0);
    });
  });
});
