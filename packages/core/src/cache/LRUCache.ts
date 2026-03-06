/**
 * LRU Cache with TTL
 *
 * Least Recently Used cache with time-to-live support for guardrail results.
 */

import type { GuardResult } from '../types';
import type { ICache, GuardrailCacheEntry, GuardrailCacheStats, GuardrailCacheConfig } from './types';
import * as crypto from 'crypto';

/**
 * LRU Cache implementation
 */
export class LRUCache implements ICache {
  private cache: Map<string, GuardrailCacheEntry> = new Map();
  private maxSize: number;
  private defaultTTL: number;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(config: GuardrailCacheConfig) {
    this.maxSize = config.maxSize || 1000;
    this.defaultTTL = config.ttl || 5 * 60 * 1000; // 5 minutes default
  }

  /**
   * Get cached result
   */
  get(key: string): GuardResult | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // LRU: Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.stats.hits++;
    return entry.result;
  }

  /**
   * Set cache entry
   */
  set(key: string, result: GuardResult, ttl?: number): void {
    // Check if we need to evict
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    const entry: GuardrailCacheEntry = {
      result,
      key,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };

    // If key exists, delete it first to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Delete specific entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Get cache statistics
   */
  getStats(): GuardrailCacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    // Calculate average TTL
    let totalTTL = 0;
    for (const entry of this.cache.values()) {
      totalTTL += entry.ttl;
    }
    const averageTTL = this.cache.size > 0 ? totalTTL / this.cache.size : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      size: this.cache.size,
      maxSize: this.maxSize,
      utilization: this.cache.size / this.maxSize,
      evictions: this.stats.evictions,
      averageTTL,
    };
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.evictions = 0;
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: GuardrailCacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Evict oldest entry (LRU)
   */
  private evictOldest(): void {
    // Map maintains insertion order, first key is oldest
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
      this.stats.evictions++;
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    let removed = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Generate cache key from input and guard name
   */
  static generateKey(input: string, guardName: string, config?: any): string {
    const data = `${input}:${guardName}:${JSON.stringify(config || {})}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
