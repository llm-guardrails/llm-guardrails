/**
 * LLM response cache for reducing costs and latency
 */

import { createHash } from 'crypto';
import type {
  CacheConfig,
  CacheEntry,
  CacheStats,
  LLMValidationResult,
} from '../../types/llm.js';

/**
 * LRU cache for LLM validation results
 */
export class LLMCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private defaultTTL: number;
  private enabled: boolean;

  // Statistics
  private hits: number = 0;
  private misses: number = 0;

  /**
   * Create a new LLM cache
   * @param config - Cache configuration
   */
  constructor(config: CacheConfig) {
    this.cache = new Map();
    this.maxSize = config.maxSize || 1000;
    this.defaultTTL = config.ttl || 3600000; // 1 hour default
    this.enabled = config.enabled !== false;
  }

  /**
   * Generate cache key from input, guard type, and model
   * @param input - Input text
   * @param guardType - Guard type
   * @param model - Model identifier
   * @returns Cache key
   */
  private generateKey(input: string, guardType: string, model: string): string {
    // Create a hash of input + guardType + model
    const hash = createHash('sha256');
    hash.update(`${guardType}:${model}:${input}`);
    return hash.digest('hex');
  }

  /**
   * Get cached result
   * @param input - Input text
   * @param guardType - Guard type
   * @param model - Model identifier
   * @returns Cached result or null if not found/expired
   */
  get(
    input: string,
    guardType: string,
    model: string
  ): LLMValidationResult | null {
    if (!this.enabled) {
      return null;
    }

    const key = this.generateKey(input, guardType, model);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > entry.ttl) {
      // Expired, remove it
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Cache hit!
    this.hits++;

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);

    // Mark result as cached
    const result = { ...entry.result };
    if (!result.metadata) {
      result.metadata = {};
    }
    result.metadata.cached = true;

    return result;
  }

  /**
   * Store result in cache
   * @param input - Input text
   * @param guardType - Guard type
   * @param model - Model identifier
   * @param result - Validation result to cache
   * @param ttl - Optional TTL override (in milliseconds)
   */
  set(
    input: string,
    guardType: string,
    model: string,
    result: LLMValidationResult,
    ttl?: number
  ): void {
    if (!this.enabled) {
      return;
    }

    const key = this.generateKey(input, guardType, model);

    // Evict oldest entry if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const entry: CacheEntry = {
      result,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      key,
    };

    this.cache.set(key, entry);
  }

  /**
   * Clean up expired entries
   * @returns Number of entries removed
   */
  cleanup(): number {
    if (!this.enabled) {
      return 0;
    }

    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilization: this.cache.size / this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate,
    };
  }

  /**
   * Check if cache is enabled
   * @returns Whether cache is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable or disable cache
   * @param enabled - Whether to enable cache
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }

  /**
   * Get current cache size
   * @returns Number of cached entries
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if a specific entry exists (for testing)
   * @param input - Input text
   * @param guardType - Guard type
   * @param model - Model identifier
   * @returns Whether entry exists and is not expired
   */
  has(input: string, guardType: string, model: string): boolean {
    const key = this.generateKey(input, guardType, model);
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    const now = Date.now();
    const age = now - entry.timestamp;

    return age <= entry.ttl;
  }

  /**
   * Get TTL for default cache entries
   * @returns Default TTL in milliseconds
   */
  getDefaultTTL(): number {
    return this.defaultTTL;
  }

  /**
   * Set default TTL
   * @param ttl - New default TTL in milliseconds
   */
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
  }
}
