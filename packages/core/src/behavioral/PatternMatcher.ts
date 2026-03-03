/**
 * Pattern Matcher
 *
 * Time-windowed sequence matching for behavioral threat detection.
 * Performance target: <1ms for typical session (50 events)
 */

import type { ThreatPattern, PatternStep, ToolCallEvent, DetectedThreat } from '../types';

export class PatternMatcher {
  private patterns: ThreatPattern[];

  constructor(patterns: ThreatPattern[]) {
    this.patterns = patterns;
  }

  /**
   * Check if events match any threat patterns
   * Returns all detected threats
   */
  matches(events: ToolCallEvent[]): DetectedThreat[] {
    const threats: DetectedThreat[] = [];

    for (const pattern of this.patterns) {
      const matches = this.matchPattern(pattern, events);

      for (const match of matches) {
        threats.push({
          pattern: pattern.name,
          severity: pattern.severity,
          evidence: match,
          timestamp: Date.now(),
          description: pattern.description,
        });
      }
    }

    return threats;
  }

  /**
   * Match a single pattern against events
   * Returns all matching sequences
   */
  private matchPattern(pattern: ThreatPattern, events: ToolCallEvent[]): ToolCallEvent[][] {
    const matches: ToolCallEvent[][] = [];
    const minOccurrences = pattern.minOccurrences || 1;

    // Try starting from each event
    for (let i = 0; i < events.length; i++) {
      const match = this.matchSequence(pattern, events, i);
      if (match) {
        matches.push(match);
      }
    }

    // Only return if we have enough occurrences
    return matches.length >= minOccurrences ? matches : [];
  }

  /**
   * Try to match pattern starting from specific event index
   */
  private matchSequence(
    pattern: ThreatPattern,
    events: ToolCallEvent[],
    startIndex: number
  ): ToolCallEvent[] | null {
    const matched: ToolCallEvent[] = [];
    const steps = pattern.steps;
    let currentStepIndex = 0;
    let lastMatchTime: number | null = null;

    for (let i = startIndex; i < events.length; i++) {
      const event = events[i];
      const step = steps[currentStepIndex];

      // Check if event matches current step
      if (this.matchesStep(event, step)) {
        // Check time window
        if (lastMatchTime !== null) {
          const timeSinceLastMatch = event.timestamp - lastMatchTime;

          // Check individual step time window
          if (step.timeWindow && timeSinceLastMatch > step.timeWindow) {
            return null; // Too much time between steps
          }

          // Check overall time window
          const totalTime = event.timestamp - matched[0].timestamp;
          if (totalTime > pattern.maxTimeWindow) {
            return null; // Pattern took too long overall
          }
        }

        matched.push(event);
        lastMatchTime = event.timestamp;
        currentStepIndex++;

        // All steps matched!
        if (currentStepIndex === steps.length) {
          return matched;
        }
      }
    }

    return null; // Didn't match all steps
  }

  /**
   * Check if event matches a pattern step
   */
  private matchesStep(event: ToolCallEvent, step: PatternStep): boolean {
    // Check tool name
    if (typeof step.tool === 'string') {
      if (event.tool !== step.tool) return false;
    } else {
      // RegExp
      if (!step.tool.test(event.tool)) return false;
    }

    // Check args (if specified)
    if (step.args) {
      for (const [key, pattern] of Object.entries(step.args)) {
        const value = event.args[key];

        if (value === undefined) return false;

        const valueStr = String(value);

        if (typeof pattern === 'string') {
          if (valueStr !== pattern) return false;
        } else {
          // RegExp
          if (!pattern.test(valueStr)) return false;
        }
      }
    }

    return true;
  }
}
