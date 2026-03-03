/**
 * LiteLLM Adapter
 *
 * Wraps LiteLLM proxy/client with guardrails using native middleware.
 * LiteLLM provides a unified interface to multiple LLM providers.
 */

import type { GuardrailEngine } from '../engine/GuardrailEngine';
import type { GuardedClient } from './types';
import { BaseAdapter } from './BaseAdapter';
import { StreamGuard } from './StreamGuard';

export class LiteLLMAdapter extends BaseAdapter {
  name = 'litellm';

  /**
   * Detect if client is a LiteLLM instance
   */
  detect(client: any): boolean {
    return (
      // Check for LiteLLM-specific properties
      (client?.completion !== undefined ||
        client?.acompletion !== undefined ||
        client?.addMiddleware !== undefined) &&
      // Check constructor or type hints
      (client.constructor?.name === 'LiteLLM' ||
        client._client_type === 'litellm' ||
        // Check for litellm-specific methods
        (typeof client.completion === 'function' &&
          typeof client.acompletion === 'function'))
    );
  }

  /**
   * Wrap LiteLLM client with guardrails
   */
  wrap(client: any, engine: GuardrailEngine): GuardedClient<any> {
    // LiteLLM has native middleware support - use it if available
    if (typeof client.addMiddleware === 'function') {
      return this.wrapWithMiddleware(client, engine);
    }

    // Otherwise, use proxy pattern
    return this.wrapWithProxy(client, engine);
  }

  /**
   * Wrap using LiteLLM's native middleware (preferred)
   */
  private wrapWithMiddleware(
    client: any,
    engine: GuardrailEngine
  ): GuardedClient<any> {
    const adapter = this;

    // Add guardrails as middleware
    client.addMiddleware({
      name: 'openclaw-guardrails',

      // Pre-request hook
      async preRequest(request: any) {
        const userMessage = adapter.extractLiteLLMMessage(request);
        if (userMessage) {
          const inputCheck = await engine.checkInput(userMessage);

          if (inputCheck.blocked) {
            adapter.handleBlockedInput(inputCheck);
          }
        }

        return request;
      },

      // Post-response hook
      async postResponse(response: any) {
        const assistantContent = adapter.extractLiteLLMResponse(response);
        if (assistantContent) {
          const outputCheck = await engine.checkOutput(assistantContent);

          if (outputCheck.blocked) {
            const sanitized = adapter.handleBlockedOutput(
              outputCheck,
              assistantContent
            );

            // Modify response content
            if (response.choices?.[0]?.message) {
              response.choices[0].message.content = sanitized;
            }
          }
        }

        return response;
      },
    });

    // Attach metadata
    Object.defineProperties(client, {
      __guardrails: {
        value: engine,
        enumerable: false,
      },
      __unwrap: {
        value: () => {
          // Remove middleware (if possible)
          if (client.removeMiddleware) {
            client.removeMiddleware('openclaw-guardrails');
          }
          return client;
        },
        enumerable: false,
      },
    });

    return client as GuardedClient<any>;
  }

  /**
   * Wrap using proxy pattern (fallback)
   */
  private wrapWithProxy(client: any, engine: GuardrailEngine): GuardedClient<any> {
    const adapter = this;

    const proxy = new Proxy(client, {
      get(target, prop) {
        // Intercept completion methods
        if (prop === 'completion' || prop === 'acompletion') {
          return async (params: any) => {
            return adapter.guardedCompletion(target, engine, params, prop as string);
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
   * Guarded completion (for proxy pattern)
   */
  private async guardedCompletion(
    client: any,
    engine: GuardrailEngine,
    params: any,
    method: string
  ): Promise<any> {
    // Pre-check
    const userMessage = this.extractLiteLLMMessage(params);
    if (userMessage) {
      const inputCheck = await engine.checkInput(userMessage);

      if (inputCheck.blocked) {
        this.handleBlockedInput(inputCheck);
      }
    }

    // Check if streaming
    if (params.stream) {
      return this.guardedStream(client, engine, params, method);
    }

    // Call actual API
    const response = await client[method](params);

    // Post-check
    const assistantContent = this.extractLiteLLMResponse(response);
    if (assistantContent) {
      const outputCheck = await engine.checkOutput(assistantContent);

      if (outputCheck.blocked) {
        const sanitized = this.handleBlockedOutput(
          outputCheck,
          assistantContent
        );

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
    params: any,
    method: string
  ): Promise<AsyncIterable<any>> {
    // Get original stream
    const stream = await client[method](params);

    // Guard the stream
    const streamGuard = new StreamGuard(engine, this.config);

    return streamGuard.guard(stream);
  }

  /**
   * Extract user message from LiteLLM request
   */
  private extractLiteLLMMessage(request: any): string {
    // LiteLLM uses OpenAI-compatible format
    if (Array.isArray(request.messages)) {
      const userMsg = request.messages.find((m: any) => m.role === 'user');
      if (userMsg?.content) {
        return typeof userMsg.content === 'string'
          ? userMsg.content
          : JSON.stringify(userMsg.content);
      }
    }

    // Legacy prompt format
    if (typeof request.prompt === 'string') {
      return request.prompt;
    }

    return '';
  }

  /**
   * Extract assistant content from LiteLLM response
   */
  private extractLiteLLMResponse(response: any): string {
    // OpenAI-compatible format
    if (response.choices?.[0]?.message?.content) {
      return response.choices[0].message.content;
    }

    // Text completion format
    if (response.choices?.[0]?.text) {
      return response.choices[0].text;
    }

    return '';
  }
}
