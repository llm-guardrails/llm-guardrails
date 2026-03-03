/**
 * Mastra Adapter
 *
 * Wraps Mastra agents and LLM instances with guardrails.
 * Mastra is a framework for building AI agents with tools and workflows.
 */

import type { GuardrailEngine } from '../engine/GuardrailEngine';
import type { GuardedClient } from './types';
import { BaseAdapter } from './BaseAdapter';
import { StreamGuard } from './StreamGuard';

export class MastraAdapter extends BaseAdapter {
  name = 'mastra';

  /**
   * Detect if client is a Mastra instance
   */
  detect(client: any): boolean {
    return (
      // Check for Mastra Agent
      (client?.generate !== undefined &&
        client?.stream !== undefined &&
        (client.constructor?.name === 'Agent' ||
          client.constructor?.name === 'MastraAgent')) ||
      // Check for Mastra LLM
      (client?.generate !== undefined &&
        client?.provider !== undefined &&
        client.constructor?.name?.includes('LLM')) ||
      // Check for Mastra-specific properties
      (client?.tools !== undefined &&
        client?.systemPrompt !== undefined &&
        typeof client.generate === 'function')
    );
  }

  /**
   * Wrap Mastra client with guardrails
   */
  wrap(client: any, engine: GuardrailEngine): GuardedClient<any> {
    // Determine client type
    if (this.isAgent(client)) {
      return this.wrapAgent(client, engine);
    }

    if (this.isLLM(client)) {
      return this.wrapLLM(client, engine);
    }

    // Fallback to generic wrap
    return this.wrapGeneric(client, engine);
  }

  /**
   * Check if client is a Mastra Agent
   */
  private isAgent(client: any): boolean {
    return (
      client?.generate !== undefined &&
      client?.tools !== undefined &&
      client?.systemPrompt !== undefined
    );
  }

  /**
   * Check if client is a Mastra LLM
   */
  private isLLM(client: any): boolean {
    return (
      client?.generate !== undefined &&
      client?.provider !== undefined &&
      !client?.tools
    );
  }

  /**
   * Wrap Mastra Agent
   */
  private wrapAgent(client: any, engine: GuardrailEngine): GuardedClient<any> {
    const adapter = this;

    const proxy = new Proxy(client, {
      get(target, prop) {
        // Intercept generate method
        if (prop === 'generate') {
          return async (input: any, options?: any) => {
            return adapter.guardedAgentGenerate(target, engine, input, options);
          };
        }

        // Intercept stream method
        if (prop === 'stream') {
          return async (input: any, options?: any) => {
            return adapter.guardedAgentStream(target, engine, input, options);
          };
        }

        // Intercept execute method (for agents with tools)
        if (prop === 'execute') {
          return async (input: any, options?: any) => {
            return adapter.guardedAgentExecute(target, engine, input, options);
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
   * Wrap Mastra LLM
   */
  private wrapLLM(client: any, engine: GuardrailEngine): GuardedClient<any> {
    const adapter = this;

    const proxy = new Proxy(client, {
      get(target, prop) {
        // Intercept generate method
        if (prop === 'generate') {
          return async (params: any) => {
            return adapter.guardedLLMGenerate(target, engine, params);
          };
        }

        // Intercept stream method
        if (prop === 'stream') {
          return async (params: any) => {
            return adapter.guardedLLMStream(target, engine, params);
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
   * Wrap generic Mastra client
   */
  private wrapGeneric(client: any, engine: GuardrailEngine): GuardedClient<any> {
    const adapter = this;

    const proxy = new Proxy(client, {
      get(target, prop) {
        if (prop === 'generate') {
          return async (...args: any[]) => {
            const input = adapter.extractInput(args[0]);
            if (input) {
              const inputCheck = await engine.checkInput(input);
              if (inputCheck.blocked) {
                adapter.handleBlockedInput(inputCheck);
              }
            }

            const result = await target.generate(...args);

            const output = adapter.extractOutput(result);
            if (output) {
              const outputCheck = await engine.checkOutput(output);
              if (outputCheck.blocked) {
                const sanitized = adapter.handleBlockedOutput(outputCheck, output);
                return adapter.replaceOutput(result, sanitized);
              }
            }

            return result;
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
   * Guarded agent generate
   */
  private async guardedAgentGenerate(
    agent: any,
    engine: GuardrailEngine,
    input: any,
    options?: any
  ): Promise<any> {
    // Pre-check input
    const userMessage = this.extractInput(input);
    if (userMessage) {
      const inputCheck = await engine.checkInput(userMessage);

      if (inputCheck.blocked) {
        this.handleBlockedInput(inputCheck);
      }
    }

    // Call agent
    const response = await agent.generate(input, options);

    // Post-check output
    const assistantContent = this.extractOutput(response);
    if (assistantContent) {
      const outputCheck = await engine.checkOutput(assistantContent);

      if (outputCheck.blocked) {
        const sanitized = this.handleBlockedOutput(outputCheck, assistantContent);
        return this.replaceOutput(response, sanitized);
      }
    }

    return response;
  }

  /**
   * Guarded agent stream
   */
  private async guardedAgentStream(
    agent: any,
    engine: GuardrailEngine,
    input: any,
    options?: any
  ): Promise<any> {
    // Pre-check input
    const userMessage = this.extractInput(input);
    if (userMessage) {
      const inputCheck = await engine.checkInput(userMessage);

      if (inputCheck.blocked) {
        this.handleBlockedInput(inputCheck);
      }
    }

    // Get stream
    const stream = await agent.stream(input, options);

    // Guard stream
    const streamGuard = new StreamGuard(engine, this.config);
    return streamGuard.guard(stream);
  }

  /**
   * Guarded agent execute (with tools)
   */
  private async guardedAgentExecute(
    agent: any,
    engine: GuardrailEngine,
    input: any,
    options?: any
  ): Promise<any> {
    // Pre-check input
    const userMessage = this.extractInput(input);
    if (userMessage) {
      const inputCheck = await engine.checkInput(userMessage);

      if (inputCheck.blocked) {
        this.handleBlockedInput(inputCheck);
      }
    }

    // Execute agent (may involve tool calls)
    const response = await agent.execute(input, options);

    // Post-check final output
    const assistantContent = this.extractOutput(response);
    if (assistantContent) {
      const outputCheck = await engine.checkOutput(assistantContent);

      if (outputCheck.blocked) {
        const sanitized = this.handleBlockedOutput(outputCheck, assistantContent);
        return this.replaceOutput(response, sanitized);
      }
    }

    return response;
  }

  /**
   * Guarded LLM generate
   */
  private async guardedLLMGenerate(
    llm: any,
    engine: GuardrailEngine,
    params: any
  ): Promise<any> {
    // Pre-check
    const userMessage = this.extractInput(params);
    if (userMessage) {
      const inputCheck = await engine.checkInput(userMessage);

      if (inputCheck.blocked) {
        this.handleBlockedInput(inputCheck);
      }
    }

    // Call LLM
    const response = await llm.generate(params);

    // Post-check
    const assistantContent = this.extractOutput(response);
    if (assistantContent) {
      const outputCheck = await engine.checkOutput(assistantContent);

      if (outputCheck.blocked) {
        const sanitized = this.handleBlockedOutput(outputCheck, assistantContent);
        return this.replaceOutput(response, sanitized);
      }
    }

    return response;
  }

  /**
   * Guarded LLM stream
   */
  private async guardedLLMStream(
    llm: any,
    engine: GuardrailEngine,
    params: any
  ): Promise<any> {
    // Pre-check
    const userMessage = this.extractInput(params);
    if (userMessage) {
      const inputCheck = await engine.checkInput(userMessage);

      if (inputCheck.blocked) {
        this.handleBlockedInput(inputCheck);
      }
    }

    // Get stream
    const stream = await llm.stream(params);

    // Guard stream
    const streamGuard = new StreamGuard(engine, this.config);
    return streamGuard.guard(stream);
  }

  /**
   * Extract input from various Mastra formats
   */
  private extractInput(input: any): string {
    if (typeof input === 'string') {
      return input;
    }

    if (input?.message) {
      return typeof input.message === 'string'
        ? input.message
        : JSON.stringify(input.message);
    }

    if (input?.prompt) {
      return input.prompt;
    }

    if (input?.messages) {
      const userMsg = Array.isArray(input.messages)
        ? input.messages.find((m: any) => m.role === 'user')
        : input.messages;
      return userMsg?.content || '';
    }

    if (input?.input) {
      return typeof input.input === 'string'
        ? input.input
        : JSON.stringify(input.input);
    }

    return '';
  }

  /**
   * Extract output from various Mastra formats
   */
  private extractOutput(output: any): string {
    if (typeof output === 'string') {
      return output;
    }

    if (output?.text) {
      return output.text;
    }

    if (output?.content) {
      return typeof output.content === 'string'
        ? output.content
        : JSON.stringify(output.content);
    }

    if (output?.message) {
      return typeof output.message === 'string'
        ? output.message
        : JSON.stringify(output.message);
    }

    if (output?.response) {
      return typeof output.response === 'string'
        ? output.response
        : JSON.stringify(output.response);
    }

    if (output?.output) {
      return typeof output.output === 'string'
        ? output.output
        : JSON.stringify(output.output);
    }

    return '';
  }

  /**
   * Replace output in response object
   */
  private replaceOutput(response: any, sanitized: string): any {
    if (typeof response === 'string') {
      return sanitized;
    }

    if (response?.text !== undefined) {
      return { ...response, text: sanitized };
    }

    if (response?.content !== undefined) {
      return { ...response, content: sanitized };
    }

    if (response?.message !== undefined) {
      return { ...response, message: sanitized };
    }

    if (response?.response !== undefined) {
      return { ...response, response: sanitized };
    }

    if (response?.output !== undefined) {
      return { ...response, output: sanitized };
    }

    return response;
  }
}
