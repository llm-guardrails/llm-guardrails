/**
 * In-Memory Session Store
 *
 * Default storage implementation for behavioral analysis.
 * Fast, zero-config, perfect for single-instance deployments.
 */

import type { ISessionStore, ToolCallEvent } from '../../types';

export class MemoryStore implements ISessionStore {
  private sessions: Map<string, ToolCallEvent[]> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly ttl: number;

  constructor(ttl: number = 3600000) { // 1 hour default
    this.ttl = ttl;
    this.startCleanup();
  }

  async addEvent(event: ToolCallEvent): Promise<void> {
    const events = this.sessions.get(event.sessionId) || [];
    events.push(event);
    this.sessions.set(event.sessionId, events);
  }

  async getEvents(sessionId: string, since?: number): Promise<ToolCallEvent[]> {
    const events = this.sessions.get(sessionId) || [];

    if (since !== undefined) {
      return events.filter(e => e.timestamp >= since);
    }

    return events;
  }

  async cleanup(olderThan: number): Promise<void> {
    const now = Date.now();
    const threshold = now - olderThan;

    for (const [sessionId, events] of this.sessions.entries()) {
      // Remove events older than threshold
      const recentEvents = events.filter(e => e.timestamp > threshold);

      if (recentEvents.length === 0) {
        // No recent events, remove session entirely
        this.sessions.delete(sessionId);
      } else {
        this.sessions.set(sessionId, recentEvents);
      }
    }
  }

  async getActiveSessions(): Promise<string[]> {
    return Array.from(this.sessions.keys());
  }

  // Start automatic cleanup
  private startCleanup(): void {
    // Cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      void this.cleanup(this.ttl);
    }, 300000);

    // Allow Node.js to exit even if cleanup is scheduled
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  // Stop cleanup (for testing or graceful shutdown)
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // Clear all data (for testing)
  clear(): void {
    this.sessions.clear();
  }
}
