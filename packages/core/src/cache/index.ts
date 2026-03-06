/**
 * Cache Module
 *
 * Provides caching for guardrail results with LRU eviction and TTL support.
 */

export { LRUCache } from './LRUCache';
export { CacheManager } from './CacheManager';
export type {
  GuardrailCacheConfig,
  GuardrailCacheEntry,
  GuardrailCacheStats,
  ICache,
} from './types';
