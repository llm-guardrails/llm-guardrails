/**
 * Portkey Adapter
 *
 * Wraps Portkey AI Gateway SDK with guardrails.
 * Portkey provides observability, reliability, and routing for LLM APIs.
 */

import type { GuardrailEngine } from '../engine/GuardrailEngine';
import type { GuardedClient } from './types';
import { BaseAdapter } from './BaseAdapter';
import { StreamGuard } from './StreamGuard';

export class PortkeyAdapter extends BaseAdapter {
  name = 'portkey';

  /**
   * Detect if client is a Portkey SDK instance
   */
  detect(client: any): boolean {
    return (
      // Check for Portkey-specific properties
      (client?.chat?.completions?.create !== undefined &&
        client?.completions?.create !== undefined &&
        client?.constructor?.name === 'Portkey') ||
      // Check for Portkey gateway headers
      (client?.chatCompletions?.create !== undefined &&
        (client._baseURL?.includes('portkey.ai') ||
          client.apiKey?.startsWith('pk-'))) ||
      // Check for Portkey-specific methods
      (typeof client.chat?.completions?.create === 'function' &&
        client.config?.provider !== undefined)
    );
  }

  /**
   * Wrap Portkey client with guardrails
   */
  wrap(client: any, engine: GuardrailEngine): GuardedClient<any> {
    const adapter = this;

    // Portkey uses OpenAI-compatible interface
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

        // Intercept legacy completions property
        if (prop === 'completions') {
          return {
            create: async (params: any) => {
              return adapter.guardedCompletions(target, engine, params);
            },
            // Pass through other methods
            ...target.completions,
          };
        }

        // Metadata properties
        if (prop === '__guardrails') return engine;
        if (prop === '__unwrap') return () => target;

        return target[prop as keyof typeof target];
      },
    });

    return proxy as GuardedClient<any>;
  }

  /**
   * Guarded chat completions create
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

    // Call actual API
    const response = await client.chat.completions.create(params);

    // Post-check: Scan assistant response
    const assistantContent = this.extractAssistantContent(response);
    if (assistantContent) {
      const outputCheck = await engine.checkOutput(assistantContent);

      if (outputCheck.blocked) {
        const sanitized = this.handleBlockedOutput(
          outputCheck,
          assistantContent
        );

        // Modify response
        if (response.choices?.[0]?.message) {
          response.choices[0].message.content = sanitized;
        }
      }
    }

    return response;
  }

  /**
   * Guarded legacy completions
   */
  private async guardedCompletions(
    client: any,
    engine: GuardrailEngine,
    params: any
  ): Promise<any> {
    // Pre-check
    const prompt = params.prompt || '';
    if (prompt) {
      const inputCheck = await engine.checkInput(
        typeof prompt === 'string' ? prompt : JSON.stringify(prompt)
      );

      if (inputCheck.blocked) {
        this.handleBlockedInput(inputCheck);
      }
    }

    // Check if streaming
    if (params.stream) {
      const stream = await client.completions.create(params);
      const streamGuard = new StreamGuard(engine, this.config);
      return streamGuard.guard(stream);
    }

    // Call actual API
    const response = await client.completions.create(params);

    // Post-check
    const text = response.choices?.[0]?.text || '';
    if (text) {
      const outputCheck = await engine.checkOutput(text);

      if (outputCheck.blocked) {
        const sanitized = this.handleBlockedOutput(outputCheck, text);
        if (response.choices?.[0]) {
          response.choices[0].text = sanitized;
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

    return streamGuard.guard(stream);
  }

  /**
   * Extract user message from Portkey message format (OpenAI-compatible)
   */
  protected extractUserMessage(messages: any[]): string {
    if (!Array.isArray(messages)) return '';

    const userMsg = messages.find((m: any) => m.role === 'user');
    if (!userMsg) return '';

    if (typeof userMsg.content === 'string') {
      return userMsg.content;
    }

    if (Array.isArray(userMsg.content)) {
      return userMsg.content
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join('\n');
    }

    return '';
  }

  /**
   * Extract assistant content from Portkey response (OpenAI-compatible)
   */
  protected extractAssistantContent(response: any): string {
    return response.choices?.[0]?.message?.content || '';
  }
}
