/**
 * Cache Types
 *
 * Type definitions for the guardrail caching system.
 */

import type { GuardResult } from '../types';

/**
 * Guardrail cache configuration
 */
export interface GuardrailCacheConfig {
  /** Enable caching */
  enabled: boolean;
  /** Maximum cache size (number of entries) */
  maxSize?: number;
  /** Time-to-live in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Cache strategy */
  strategy?: 'lru' | 'lfu' | 'fifo';
  /** Enable cache statistics */
  enableStats?: boolean;
}

/**
 * Guardrail cached entry
 */
export interface GuardrailCacheEntry {
  /** Guard result */
  result: GuardResult;
  /** Cache key */
  key: string;
  /** Timestamp when cached */
  timestamp: number;
  /** TTL in milliseconds */
  ttl: number;
  /** Access count (for LFU) */
  accessCount?: number;
}

/**
 * Guardrail cache statistics
 */
export interface GuardrailCacheStats {
  /** Total cache hits */
  hits: number;
  /** Total cache misses */
  misses: number;
  /** Hit rate (0-1) */
  hitRate: number;
  /** Current cache size */
  size: number;
  /** Maximum cache size */
  maxSize: number;
  /** Cache utilization (0-1) */
  utilization: number;
  /** Total evictions */
  evictions: number;
  /** Average TTL of cached entries (ms) */
  averageTTL: number;
}

/**
 * Cache interface
 */
export interface ICache {
  /** Get cached result */
  get(key: string): GuardResult | null;
  /** Set cache entry */
  set(key: string, result: GuardResult, ttl?: number): void;
  /** Check if key exists and is valid */
  has(key: string): boolean;
  /** Clear all cache entries */
  clear(): void;
  /** Delete specific entry */
  delete(key: string): boolean;
  /** Get cache statistics */
  getStats(): GuardrailCacheStats;
  /** Get all cache keys */
  keys(): string[];
  /** Get cache size */
  size(): number;
}
