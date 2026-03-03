import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryStore } from '../stores/MemoryStore';
import type { ToolCallEvent } from '../../types';

describe('MemoryStore', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore(3600000); // 1 hour TTL
  });

  afterEach(() => {
    store.stopCleanup();
    store.clear();
  });

  describe('Basic Operations', () => {
    it('adds and retrieves events', async () => {
      const event: ToolCallEvent = {
        sessionId: 'session-1',
        timestamp: Date.now(),
        tool: 'read_file',
        args: { path: '/etc/passwd' },
      };

      await store.addEvent(event);
      const events = await store.getEvents('session-1');

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(event);
    });

    it('stores multiple events in same session', async () => {
      const events: ToolCallEvent[] = [
        {
          sessionId: 'session-1',
          timestamp: Date.now(),
          tool: 'read_file',
          args: { path: '/etc/passwd' },
        },
        {
          sessionId: 'session-1',
          timestamp: Date.now() + 1000,
          tool: 'http_post',
          args: { url: 'https://evil.com' },
        },
      ];

      for (const event of events) {
        await store.addEvent(event);
      }

      const retrieved = await store.getEvents('session-1');
      expect(retrieved).toHaveLength(2);
    });

    it('keeps sessions separate', async () => {
      await store.addEvent({
        sessionId: 'session-1',
        timestamp: Date.now(),
        tool: 'read_file',
        args: {},
      });

      await store.addEvent({
        sessionId: 'session-2',
        timestamp: Date.now(),
        tool: 'write_file',
        args: {},
      });

      const session1 = await store.getEvents('session-1');
      const session2 = await store.getEvents('session-2');

      expect(session1).toHaveLength(1);
      expect(session2).toHaveLength(1);
      expect(session1[0].tool).toBe('read_file');
      expect(session2[0].tool).toBe('write_file');
    });
  });

  describe('Time-based Filtering', () => {
    it('filters events by timestamp', async () => {
      const now = Date.now();

      await store.addEvent({
        sessionId: 'session-1',
        timestamp: now - 10000, // 10 seconds ago
        tool: 'old_event',
        args: {},
      });

      await store.addEvent({
        sessionId: 'session-1',
        timestamp: now,
        tool: 'new_event',
        args: {},
      });

      const recent = await store.getEvents('session-1', now - 5000);
      expect(recent).toHaveLength(1);
      expect(recent[0].tool).toBe('new_event');
    });

    it('returns all events when no since parameter', async () => {
      const now = Date.now();

      await store.addEvent({
        sessionId: 'session-1',
        timestamp: now - 10000,
        tool: 'old_event',
        args: {},
      });

      await store.addEvent({
        sessionId: 'session-1',
        timestamp: now,
        tool: 'new_event',
        args: {},
      });

      const all = await store.getEvents('session-1');
      expect(all).toHaveLength(2);
    });
  });

  describe('Cleanup', () => {
    it('removes old events', async () => {
      const now = Date.now();

      await store.addEvent({
        sessionId: 'session-1',
        timestamp: now - 7200000, // 2 hours ago
        tool: 'old_event',
        args: {},
      });

      await store.addEvent({
        sessionId: 'session-1',
        timestamp: now,
        tool: 'new_event',
        args: {},
      });

      await store.cleanup(3600000); // Remove events older than 1 hour

      const events = await store.getEvents('session-1');
      expect(events).toHaveLength(1);
      expect(events[0].tool).toBe('new_event');
    });

    it('removes entire session if no recent events', async () => {
      const now = Date.now();

      await store.addEvent({
        sessionId: 'session-1',
        timestamp: now - 7200000, // 2 hours ago
        tool: 'old_event',
        args: {},
      });

      await store.cleanup(3600000);

      const events = await store.getEvents('session-1');
      expect(events).toHaveLength(0);

      const sessions = await store.getActiveSessions();
      expect(sessions).not.toContain('session-1');
    });
  });

  describe('Active Sessions', () => {
    it('lists all active sessions', async () => {
      await store.addEvent({
        sessionId: 'session-1',
        timestamp: Date.now(),
        tool: 'test',
        args: {},
      });

      await store.addEvent({
        sessionId: 'session-2',
        timestamp: Date.now(),
        tool: 'test',
        args: {},
      });

      const sessions = await store.getActiveSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions).toContain('session-1');
      expect(sessions).toContain('session-2');
    });

    it('returns empty array when no sessions', async () => {
      const sessions = await store.getActiveSessions();
      expect(sessions).toHaveLength(0);
    });
  });

  describe('Clear', () => {
    it('removes all data', async () => {
      await store.addEvent({
        sessionId: 'session-1',
        timestamp: Date.now(),
        tool: 'test',
        args: {},
      });

      store.clear();

      const events = await store.getEvents('session-1');
      expect(events).toHaveLength(0);

      const sessions = await store.getActiveSessions();
      expect(sessions).toHaveLength(0);
    });
  });
});
