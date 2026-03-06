/**
 * Cache Manager
 *
 * Manages caching for multiple guards with statistics and cleanup.
 */

import type { GuardResult } from '../types';
import type { ICache, GuardrailCacheConfig, GuardrailCacheStats } from './types';
import { LRUCache } from './LRUCache';

/**
 * Cache manager for guardrails
 */
export class CacheManager {
  private config: GuardrailCacheConfig;
  private cache: ICache;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: GuardrailCacheConfig) {
    this.config = config;
    this.cache = new LRUCache(config);

    // Start periodic cleanup if enabled
    if (config.enabled && config.ttl) {
      this.startCleanup();
    }
  }

  /**
   * Get cached result for input and guard
   */
  get(input: string, guardName: string): GuardResult | null {
    if (!this.config.enabled) return null;

    const key = LRUCache.generateKey(input, guardName);
    return this.cache.get(key);
  }

  /**
   * Cache result for input and guard
   */
  set(input: string, guardName: string, result: GuardResult, ttl?: number): void {
    if (!this.config.enabled) return;

    const key = LRUCache.generateKey(input, guardName);
    this.cache.set(key, result, ttl);
  }

  /**
   * Check if input is cached for guard
   */
  has(input: string, guardName: string): boolean {
    if (!this.config.enabled) return false;

    const key = LRUCache.generateKey(input, guardName);
    return this.cache.has(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): GuardrailCacheStats {
    return this.cache.getStats();
  }

  /**
   * Get cache statistics by guard
   */
  getStatsByGuard(): Record<string, { entries: number }> {
    const statsByGuard: Record<string, { entries: number }> = {};

    // This is a simplified version - in production you might want to
    // store guard name in the cache entry for per-guard stats
    // For now, just return empty stats
    // Future enhancement: track per-guard metrics

    return statsByGuard;
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    // Run cleanup every minute
    const interval = 60 * 1000;

    this.cleanupInterval = setInterval(() => {
      if (this.cache instanceof LRUCache) {
        this.cache.cleanup();
      }
    }, interval);

    // Don't prevent process exit
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * Destroy cache manager
   */
  destroy(): void {
    this.stopCleanup();
    this.clear();
  }
}
