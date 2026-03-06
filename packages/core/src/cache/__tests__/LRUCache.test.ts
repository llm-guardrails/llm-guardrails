/**
 * Tests for LRU Cache
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LRUCache } from '../LRUCache';
import type { GuardResult } from '../../types';

describe('LRUCache', () => {
  let cache: LRUCache;

  beforeEach(() => {
    cache = new LRUCache({
      enabled: true,
      maxSize: 3,
      ttl: 1000, // 1 second for testing
    });
  });

  describe('Basic Operations', () => {
    it('should store and retrieve values', () => {
      const result: GuardResult = {
        passed: true,
        blocked: false,
      };

      cache.set('key1', result);
      const retrieved = cache.get('key1');

      expect(retrieved).toEqual(result);
    });

    it('should return null for non-existent keys', () => {
      const retrieved = cache.get('nonexistent');
      expect(retrieved).toBeNull();
    });

    it('should check if key exists', () => {
      const result: GuardResult = { passed: true, blocked: false };

      cache.set('key1', result);
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    it('should delete entries', () => {
      const result: GuardResult = { passed: true, blocked: false };

      cache.set('key1', result);
      expect(cache.has('key1')).toBe(true);

      cache.delete('key1');
      expect(cache.has('key1')).toBe(false);
    });

    it('should clear all entries', () => {
      const result: GuardResult = { passed: true, blocked: false };

      cache.set('key1', result);
      cache.set('key2', result);
      expect(cache.size()).toBe(2);

      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict oldest entry when cache is full', () => {
      const result: GuardResult = { passed: true, blocked: false };

      cache.set('key1', result);
      cache.set('key2', result);
      cache.set('key3', result);

      // Cache is full (maxSize=3)
      expect(cache.size()).toBe(3);

      // Add one more - should evict key1 (oldest)
      cache.set('key4', result);

      expect(cache.size()).toBe(3);
      expect(cache.has('key1')).toBe(false); // Evicted
      expect(cache.has('key2')).toBe(true);
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });

    it('should update LRU order on access', () => {
      const result: GuardResult = { passed: true, blocked: false };

      cache.set('key1', result);
      cache.set('key2', result);
      cache.set('key3', result);

      // Access key1 - moves it to end (most recently used)
      cache.get('key1');

      // Add key4 - should evict key2 (now oldest)
      cache.set('key4', result);

      expect(cache.has('key1')).toBe(true); // Still there
      expect(cache.has('key2')).toBe(false); // Evicted
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });

    it('should update LRU order on set of existing key', () => {
      const result: GuardResult = { passed: true, blocked: false };

      cache.set('key1', result);
      cache.set('key2', result);
      cache.set('key3', result);

      // Update key1 - moves it to end
      cache.set('key1', { ...result, passed: false });

      // Add key4 - should evict key2
      cache.set('key4', result);

      expect(cache.has('key1')).toBe(true); // Still there
      expect(cache.has('key2')).toBe(false); // Evicted
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', async () => {
      const result: GuardResult = { passed: true, blocked: false };

      cache.set('key1', result);
      expect(cache.has('key1')).toBe(true);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(cache.has('key1')).toBe(false);
      expect(cache.get('key1')).toBeNull();
    });

    it('should support custom TTL per entry', async () => {
      const result: GuardResult = { passed: true, blocked: false };

      cache.set('short', result, 500); // 500ms
      cache.set('long', result, 2000); // 2s

      await new Promise((resolve) => setTimeout(resolve, 600));

      expect(cache.has('short')).toBe(false); // Expired
      expect(cache.has('long')).toBe(true); // Still valid
    });

    it('should cleanup expired entries', async () => {
      const result: GuardResult = { passed: true, blocked: false };

      cache.set('key1', result, 500);
      cache.set('key2', result, 2000);
      cache.set('key3', result, 2000);

      await new Promise((resolve) => setTimeout(resolve, 600));

      const removed = cache.cleanup();

      expect(removed).toBe(1); // key1 removed
      expect(cache.size()).toBe(2);
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses', () => {
      const result: GuardResult = { passed: true, blocked: false };

      cache.set('key1', result);

      // Hit
      cache.get('key1');

      // Miss
      cache.get('key2');

      // Hit
      cache.get('key1');

      // Miss
      cache.get('key3');

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should track evictions', () => {
      const result: GuardResult = { passed: true, blocked: false };

      cache.set('key1', result);
      cache.set('key2', result);
      cache.set('key3', result);
      cache.set('key4', result); // Evicts key1

      const stats = cache.getStats();
      expect(stats.evictions).toBe(1);
    });

    it('should calculate utilization', () => {
      const result: GuardResult = { passed: true, blocked: false };

      cache.set('key1', result);
      cache.set('key2', result);

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(3);
      expect(stats.utilization).toBeCloseTo(2 / 3);
    });

    it('should reset statistics', () => {
      const result: GuardResult = { passed: true, blocked: false };

      cache.set('key1', result);
      cache.get('key1');
      cache.get('key2');

      let stats = cache.getStats();
      expect(stats.hits).toBeGreaterThan(0);

      cache.resetStats();

      stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('Key Generation', () => {
    it('should generate consistent keys', () => {
      const key1 = LRUCache.generateKey('input', 'guard');
      const key2 = LRUCache.generateKey('input', 'guard');

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different inputs', () => {
      const key1 = LRUCache.generateKey('input1', 'guard');
      const key2 = LRUCache.generateKey('input2', 'guard');

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different guards', () => {
      const key1 = LRUCache.generateKey('input', 'guard1');
      const key2 = LRUCache.generateKey('input', 'guard2');

      expect(key1).not.toBe(key2);
    });

    it('should include config in key generation', () => {
      const key1 = LRUCache.generateKey('input', 'guard', { option: 'a' });
      const key2 = LRUCache.generateKey('input', 'guard', { option: 'b' });

      expect(key1).not.toBe(key2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty cache', () => {
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hitRate).toBe(0);
    });

    it('should handle updating same key multiple times', () => {
      const result1: GuardResult = { passed: true, blocked: false };
      const result2: GuardResult = { passed: false, blocked: true };

      cache.set('key1', result1);
      cache.set('key1', result2);

      const retrieved = cache.get('key1');
      expect(retrieved).toEqual(result2);
      expect(cache.size()).toBe(1);
    });

    it('should handle very short TTL', async () => {
      const result: GuardResult = { passed: true, blocked: false };

      cache.set('key1', result, 10); // 10ms TTL

      // Should be valid immediately
      expect(cache.get('key1')).toEqual(result);

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 15));

      // Should be expired now
      expect(cache.get('key1')).toBeNull();
    });

    it('should return all keys', () => {
      const result: GuardResult = { passed: true, blocked: false };

      cache.set('key1', result);
      cache.set('key2', result);
      cache.set('key3', result);

      const keys = cache.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });
  });
});
