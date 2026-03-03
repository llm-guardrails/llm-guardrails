/**
 * Anthropic Adapter
 *
 * Wraps @anthropic-ai/sdk clients with guardrails.
 */

import type { GuardrailEngine } from '../engine/GuardrailEngine';
import type { GuardedClient } from './types';
import { BaseAdapter } from './BaseAdapter';
import { StreamGuard } from './StreamGuard';

export class AnthropicAdapter extends BaseAdapter {
  name = 'anthropic';

  /**
   * Detect if client is an Anthropic SDK instance
   */
  detect(client: any): boolean {
    return (
      client?.messages?.create !== undefined &&
      (client.constructor?.name === 'Anthropic' ||
        client.constructor?.name?.includes('Anthropic') ||
        // Check for SDK methods
        (typeof client.messages?.create === 'function' &&
          typeof client.messages?.stream === 'function'))
    );
  }

  /**
   * Wrap Anthropic client with guardrails
   */
  wrap(client: any, engine: GuardrailEngine): GuardedClient<any> {
    const adapter = this;

    // Create a proxy that intercepts messages.create and messages.stream
    const proxy = new Proxy(client, {
      get(target, prop) {
        // Intercept messages property
        if (prop === 'messages') {
          return {
            create: async (params: any) => {
              return adapter.guardedCreate(target, engine, params);
            },
            stream: (params: any) => {
              return adapter.guardedStream(target, engine, params);
            },
            // Pass through other methods
            ...target.messages,
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
   * Guarded create (non-streaming)
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

    // Call actual API
    const response = await client.messages.create(params);

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
        if (response.content?.[0]) {
          response.content[0].text = sanitized;
        }
      }
    }

    return response;
  }

  /**
   * Guarded stream
   */
  private guardedStream(
    client: any,
    engine: GuardrailEngine,
    params: any
  ): any {
    const adapter = this;

    // Return a modified stream object
    return {
      async *[Symbol.asyncIterator]() {
        // Pre-check: Scan user message
        const userMessage = adapter.extractUserMessage(params.messages || []);
        if (userMessage) {
          const inputCheck = await engine.checkInput(userMessage);

          if (inputCheck.blocked) {
            adapter.handleBlockedInput(inputCheck);
          }
        }

        // Get original stream
        const stream = await client.messages.stream(params);

        // Guard the stream
        const streamGuard = new StreamGuard(engine, adapter.config);

        // Yield chunks through guard
        for await (const chunk of streamGuard.guard(stream)) {
          yield chunk;
        }
      },

      // Preserve stream helper methods if they exist
      async finalMessage() {
        const stream = await client.messages.stream(params);
        return stream.finalMessage?.();
      },
    };
  }

  /**
   * Extract user message from Anthropic message format
   */
  protected extractUserMessage(messages: any[]): string {
    if (!Array.isArray(messages)) return '';

    const userMsg = messages.find((m: any) => m.role === 'user');
    if (!userMsg) return '';

    // Anthropic format: content can be string or array of content blocks
    if (typeof userMsg.content === 'string') {
      return userMsg.content;
    }

    if (Array.isArray(userMsg.content)) {
      return userMsg.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');
    }

    return '';
  }

  /**
   * Extract assistant content from Anthropic response
   */
  protected extractAssistantContent(response: any): string {
    if (!response.content) return '';

    // Find text content blocks
    const textBlocks = response.content.filter(
      (block: any) => block.type === 'text'
    );

    return textBlocks.map((block: any) => block.text).join('\n');
  }
}
