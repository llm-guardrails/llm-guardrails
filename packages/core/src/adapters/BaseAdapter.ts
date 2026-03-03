/**
 * Base Gateway Adapter
 *
 * Abstract base class for gateway adapters with common functionality.
 */

import type { GuardrailEngine } from '../engine/GuardrailEngine';
import type { GuardrailResult } from '../types';
import type {
  GatewayAdapter,
  GuardedClient,
  AdapterConfig,
} from './types';
import { GuardrailViolation } from './types';

export abstract class BaseAdapter<TClient = any>
  implements GatewayAdapter<TClient>
{
  abstract name: string;

  protected config: AdapterConfig;

  constructor(config: AdapterConfig = {}) {
    this.config = {
      onBlockedInput: 'throw',
      onBlockedOutput: 'throw',
      streamChecking: true,
      streamCheckInterval: { chunks: 10, characters: 500 },
      ...config,
    };
  }

  abstract detect(client: any): boolean;
  abstract wrap(client: TClient, engine: GuardrailEngine): GuardedClient<TClient>;

  /**
   * Handle a blocked input according to configuration
   */
  protected handleBlockedInput(result: GuardrailResult): never | string {
    if (this.config.onBlockedInput === 'throw') {
      throw new GuardrailViolation(
        result.reason || 'Input blocked by guardrails',
        result,
        'input'
      );
    }

    if (this.config.onBlockedInput === 'sanitize') {
      // Return a safe fallback message
      return '[Content blocked by guardrails]';
    }

    // 'warn' - log warning and allow (handled by caller)
    console.warn('[Guardrails Warning] Input blocked:', result.reason);
    throw new GuardrailViolation(
      result.reason || 'Input blocked by guardrails',
      result,
      'input'
    );
  }

  /**
   * Handle a blocked output according to configuration
   */
  protected handleBlockedOutput(
    result: GuardrailResult,
    originalContent: string
  ): string {
    if (this.config.onBlockedOutput === 'throw') {
      throw new GuardrailViolation(
        result.reason || 'Output blocked by guardrails',
        result,
        'output'
      );
    }

    if (this.config.onBlockedOutput === 'sanitize') {
      // Return a safe fallback message
      return '[Response blocked by guardrails]';
    }

    // 'warn' - log warning and return original
    console.warn('[Guardrails Warning] Output blocked:', result.reason);
    return originalContent;
  }

  /**
   * Extract user message from various message formats
   */
  protected extractUserMessage(messages: any[]): string {
    if (!Array.isArray(messages)) {
      return '';
    }

    const userMsg = messages.find((m) => m.role === 'user');
    if (!userMsg) {
      return '';
    }

    // Handle different content formats
    if (typeof userMsg.content === 'string') {
      return userMsg.content;
    }

    if (Array.isArray(userMsg.content)) {
      // Handle content blocks (e.g., Anthropic format)
      return userMsg.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');
    }

    return JSON.stringify(userMsg.content);
  }

  /**
   * Extract assistant content from response
   */
  protected extractAssistantContent(response: any): string {
    // OpenAI format
    if (response.choices?.[0]?.message?.content) {
      return response.choices[0].message.content;
    }

    // Anthropic format
    if (response.content?.[0]?.text) {
      return response.content[0].text;
    }

    if (response.content?.[0]?.type === 'text') {
      return response.content[0].text;
    }

    // Gemini format
    if (response.text) {
      return response.text;
    }

    if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
      return response.candidates[0].content.parts[0].text;
    }

    // Generic
    if (typeof response.content === 'string') {
      return response.content;
    }

    return '';
  }
}
