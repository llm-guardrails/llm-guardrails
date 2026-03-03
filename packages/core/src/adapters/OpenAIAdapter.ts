/**
 * OpenAI Adapter
 *
 * Wraps openai SDK clients with guardrails.
 */

import type { GuardrailEngine } from '../engine/GuardrailEngine';
import type { GuardedClient } from './types';
import { BaseAdapter } from './BaseAdapter';
import { StreamGuard } from './StreamGuard';

export class OpenAIAdapter extends BaseAdapter {
  name = 'openai';

  /**
   * Detect if client is an OpenAI SDK instance
   */
  detect(client: any): boolean {
    return (
      client?.chat?.completions?.create !== undefined &&
      (client.constructor?.name === 'OpenAI' ||
        client.constructor?.name?.includes('OpenAI') ||
        // Check for SDK structure
        (typeof client.chat?.completions?.create === 'function' &&
          client.baseURL !== undefined))
    );
  }

  /**
   * Wrap OpenAI client with guardrails
   */
  wrap(client: any, engine: GuardrailEngine): GuardedClient<any> {
    const adapter = this;

    // Create a proxy that intercepts chat.completions.create
    const proxy = new Proxy(client, {
      get(target, prop) {
        // Intercept chat property
        if (prop === 'chat') {
          return {
            completions: {
              create: async (params: any) => {
                return adapter.guardedCreate(target, engine, params);
              },
              // Pass through other methods
              ...target.chat?.completions,
            },
            // Pass through other chat methods
            ...target.chat,
          };
        }

        // Metadata properties
        if (prop === '__guardrails') return engine;
        if (prop === '__unwrap') return () => target;

        // Pass through everything else
        return target[prop as keyof typeof target];
      },
    });

    return proxy as GuardedClient<any>;
  }

  /**
   * Guarded create (handles both streaming and non-streaming)
   */
  private async guardedCreate(
    client: any,
    engine: GuardrailEngine,
    params: any
  ): Promise<any> {
    // Pre-check: Scan user message
    const userMessage = this.extractUserMessage(params.messages || []);
    if (userMessage) {
      const inputCheck = await engine.checkInput(userMessage);

      if (inputCheck.blocked) {
        this.handleBlockedInput(inputCheck);
      }
    }

    // Check if streaming
    if (params.stream) {
      return this.guardedStream(client, engine, params);
    }

    // Non-streaming: Call actual API
    const response = await client.chat.completions.create(params);

    // Post-check: Scan assistant response
    const assistantContent = this.extractAssistantContent(response);
    if (assistantContent) {
      const outputCheck = await engine.checkOutput(assistantContent);

      if (outputCheck.blocked) {
        // Sanitize or throw based on config
        const sanitized = this.handleBlockedOutput(
          outputCheck,
          assistantContent
        );

        // If sanitized, modify response
        if (response.choices?.[0]?.message) {
          response.choices[0].message.content = sanitized;
        }
      }
    }

    return response;
  }

  /**
   * Guarded stream
   */
  private async guardedStream(
    client: any,
    engine: GuardrailEngine,
    params: any
  ): Promise<AsyncIterable<any>> {
    // Get original stream
    const stream = await client.chat.completions.create(params);

    // Guard the stream
    const streamGuard = new StreamGuard(engine, this.config);

    // Return guarded stream
    return streamGuard.guard(stream);
  }

  /**
   * Extract user message from OpenAI message format
   */
  protected extractUserMessage(messages: any[]): string {
    if (!Array.isArray(messages)) return '';

    const userMsg = messages.find((m: any) => m.role === 'user');
    if (!userMsg) return '';

    // OpenAI format: content is usually a string
    if (typeof userMsg.content === 'string') {
      return userMsg.content;
    }

    // Handle array format (multimodal)
    if (Array.isArray(userMsg.content)) {
      return userMsg.content
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join('\n');
    }

    return '';
  }

  /**
   * Extract assistant content from OpenAI response
   */
  protected extractAssistantContent(response: any): string {
    return response.choices?.[0]?.message?.content || '';
  }
}
