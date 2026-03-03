/**
 * Auto-Detection System
 *
 * Automatically detect which gateway adapter to use based on the client.
 */

import type { GuardrailEngine } from '../engine/GuardrailEngine';
import type { GatewayAdapter, GuardedClient } from './types';

export class AutoDetect {
  private adapters: GatewayAdapter[] = [];

  /**
   * Register an adapter
   */
  register(adapter: GatewayAdapter): void {
    this.adapters.push(adapter);
  }

  /**
   * Register multiple adapters
   */
  registerAll(adapters: GatewayAdapter[]): void {
    this.adapters.push(...adapters);
  }

  /**
   * Auto-detect and wrap a client with the appropriate adapter
   */
  wrap<T>(client: T, engine: GuardrailEngine): GuardedClient<T> {
    for (const adapter of this.adapters) {
      if (adapter.detect(client)) {
        console.log(`[Guardrails] Auto-detected: ${adapter.name}`);
        return adapter.wrap(client, engine) as GuardedClient<T>;
      }
    }

    throw new Error(
      `[Guardrails] Unknown gateway client. Supported: ${this.adapters.map((a) => a.name).join(', ')}`
    );
  }

  /**
   * Detect which adapter would be used (without wrapping)
   */
  detect(client: any): string | null {
    for (const adapter of this.adapters) {
      if (adapter.detect(client)) {
        return adapter.name;
      }
    }
    return null;
  }

  /**
   * Get all registered adapter names
   */
  getAdapters(): string[] {
    return this.adapters.map((a) => a.name);
  }
}

/**
 * Global auto-detect instance
 * Adapters can register themselves here
 */
export const globalAutoDetect = new AutoDetect();
