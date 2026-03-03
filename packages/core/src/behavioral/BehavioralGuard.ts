/**
 * Behavioral Guard
 *
 * Cross-message threat detection through session tracking and pattern matching.
 * Race-condition safe with session-level locking.
 */

import type { Guard, GuardResult, BehavioralConfig, ToolCallEvent, ISessionStore } from '../types';
import { PatternMatcher } from './PatternMatcher';
import { MemoryStore } from './stores/MemoryStore';
import { BUILTIN_PATTERNS } from './patterns/builtin';

export class BehavioralGuard implements Guard {
  public readonly name = 'behavioral';

  private store: ISessionStore;
  private matcher: PatternMatcher;
  private locks: Map<string, Promise<GuardResult>> = new Map();
  private sessionTTL: number;

  constructor(config: BehavioralConfig = {}) {
    this.sessionTTL = config.sessionTTL || 3600000; // 1 hour default

    // Initialize storage
    if (config.customStore) {
      this.store = config.customStore;
    } else if (config.storage === 'memory' || !config.storage) {
      this.store = new MemoryStore(this.sessionTTL);
    } else {
      throw new Error(`Storage type "${config.storage}" not yet implemented. Use "memory" or provide customStore.`);
    }

    // Initialize pattern matcher
    const patterns = this.resolvePatterns(config.patterns || BUILTIN_PATTERNS);
    this.matcher = new PatternMatcher(patterns);
  }

  /**
   * Resolve pattern names to pattern objects
   */
  private resolvePatterns(patterns: any[]): any[] {
    const patternMap: Record<string, any> = {
      'file-exfiltration': BUILTIN_PATTERNS.find((p: any) => p.name === 'file-exfiltration'),
      'credential-theft': BUILTIN_PATTERNS.find((p: any) => p.name === 'credential-theft'),
      'escalation-attempts': BUILTIN_PATTERNS.find((p: any) => p.name === 'escalation-attempts'),
      'data-exfil-via-code': BUILTIN_PATTERNS.find((p: any) => p.name === 'data-exfil-via-code'),
      'suspicious-shell-commands': BUILTIN_PATTERNS.find((p: any) => p.name === 'suspicious-shell-commands'),
      'secret-scanning': BUILTIN_PATTERNS.find((p: any) => p.name === 'secret-scanning'),
      'mass-data-access': BUILTIN_PATTERNS.find((p: any) => p.name === 'mass-data-access'),
      'unusual-tool-sequence': BUILTIN_PATTERNS.find((p: any) => p.name === 'unusual-tool-sequence'),
      'permission-probing': BUILTIN_PATTERNS.find((p: any) => p.name === 'permission-probing'),
      'time-bomb': BUILTIN_PATTERNS.find((p: any) => p.name === 'time-bomb'),
      'data-poisoning': BUILTIN_PATTERNS.find((p: any) => p.name === 'data-poisoning'),
      'resource-exhaustion': BUILTIN_PATTERNS.find((p: any) => p.name === 'resource-exhaustion'),
      'lateral-movement': BUILTIN_PATTERNS.find((p: any) => p.name === 'lateral-movement'),
      'backdoor-creation': BUILTIN_PATTERNS.find((p: any) => p.name === 'backdoor-creation'),
      'log-tampering': BUILTIN_PATTERNS.find((p: any) => p.name === 'log-tampering'),
    };

    return patterns.map(p => {
      if (typeof p === 'string') {
        const pattern = patternMap[p];
        if (!pattern) {
          console.warn(`Unknown pattern: ${p}`);
          return null;
        }
        return pattern;
      }
      return p;
    }).filter(Boolean);
  }

  /**
   * Check a tool call event for behavioral threats
   * Race-condition safe: locks per session
   */
  async check(input: string | ToolCallEvent): Promise<GuardResult> {
    // Parse input
    const event = this.parseInput(input);

    if (!event) {
      return {
        passed: true,
        reason: 'Not a tool call event',
      };
    }

    const sessionId = event.sessionId;

    // Wait for in-progress analysis on this session
    if (this.locks.has(sessionId)) {
      await this.locks.get(sessionId);
    }

    // Lock session and analyze
    const promise = this._analyze(event);
    this.locks.set(sessionId, promise);

    try {
      return await promise;
    } finally {
      this.locks.delete(sessionId);
    }
  }

  /**
   * Internal analysis (called with session lock held)
   */
  private async _analyze(event: ToolCallEvent): Promise<GuardResult> {
    const startTime = Date.now();

    // 1. Add event to session
    await this.store.addEvent(event);

    // 2. Get recent events (within TTL window)
    const since = Date.now() - this.sessionTTL;
    const recentEvents = await this.store.getEvents(event.sessionId, since);

    // 3. Check patterns (<1ms target)
    const threats = this.matcher.matches(recentEvents);

    // 4. Return result
    if (threats.length > 0) {
      const threat = threats[0]; // Most recent/severe

      return {
        passed: false,
        blocked: true,
        reason: `Behavioral threat detected: ${threat.pattern} - ${threat.description}`,
        confidence: this.severityToConfidence(threat.severity),
        latency: Date.now() - startTime,
        metadata: {
          threats,
          sessionId: event.sessionId,
          eventCount: recentEvents.length,
        },
      };
    }

    return {
      passed: true,
      latency: Date.now() - startTime,
      metadata: {
        sessionId: event.sessionId,
        eventCount: recentEvents.length,
      },
    };
  }

  /**
   * Parse input into ToolCallEvent
   */
  private parseInput(input: string | ToolCallEvent): ToolCallEvent | null {
    if (typeof input === 'object' && 'tool' in input) {
      // Already a ToolCallEvent
      return {
        ...input,
        timestamp: input.timestamp || Date.now(),
      };
    }

    // Try to parse as JSON
    if (typeof input === 'string') {
      try {
        const parsed = JSON.parse(input);
        if (parsed.tool && parsed.sessionId) {
          return {
            ...parsed,
            timestamp: parsed.timestamp || Date.now(),
          };
        }
      } catch {
        // Not JSON, not a tool call
      }
    }

    return null;
  }

  /**
   * Convert severity to confidence score
   */
  private severityToConfidence(severity: string): number {
    switch (severity) {
      case 'critical':
        return 1.0;
      case 'high':
        return 0.9;
      case 'medium':
        return 0.7;
      case 'low':
        return 0.5;
      default:
        return 0.5;
    }
  }
}
