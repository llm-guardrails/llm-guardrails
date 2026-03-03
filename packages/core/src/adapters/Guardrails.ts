/**
 * Guardrails - Main Facade
 *
 * Simple API for wrapping AI clients with guardrails.
 */

import { GuardrailEngine } from '../engine/GuardrailEngine';
import type { GuardrailConfig } from '../types';
import type { GatewayAdapter, GuardedClient, AdapterConfig } from './types';
import { globalAutoDetect } from './AutoDetect';

export class Guardrails {
  /**
   * Auto-detect and wrap a client with guardrails
   *
   * @example
   * ```typescript
   * import Anthropic from '@anthropic-ai/sdk';
   * import { Guardrails } from '@openclaw-guardrails/core';
   *
   * const client = new Anthropic({ apiKey: '...' });
   * const guarded = Guardrails.auto(client);
   * ```
   */
  static auto<T>(
    client: T,
    config?: GuardrailConfig & AdapterConfig
  ): GuardedClient<T> {
    const engine = new GuardrailEngine(config);
    return globalAutoDetect.wrap(client, engine);
  }

  /**
   * Wrap a client with a specific adapter
   *
   * @example
   * ```typescript
   * import { Guardrails, AnthropicAdapter } from '@openclaw-guardrails/core';
   *
   * const guarded = Guardrails.wrap(client, new AnthropicAdapter());
   * ```
   */
  static wrap<T>(
    client: T,
    adapter: GatewayAdapter<T>,
    config?: GuardrailConfig & AdapterConfig
  ): GuardedClient<T> {
    const engine = new GuardrailEngine(config);
    return adapter.wrap(client, engine);
  }

  /**
   * Create a standalone engine (no adapter)
   *
   * @example
   * ```typescript
   * const engine = Guardrails.engine({
   *   guards: ['pii', 'injection', 'toxicity']
   * });
   *
   * const result = await engine.check('user input');
   * ```
   */
  static engine(config?: GuardrailConfig): GuardrailEngine {
    return new GuardrailEngine(config);
  }

  /**
   * Detect which adapter would be used for a client
   */
  static detect(client: any): string | null {
    return globalAutoDetect.detect(client);
  }

  /**
   * Get list of supported adapters
   */
  static getAdapters(): string[] {
    return globalAutoDetect.getAdapters();
  }
}
