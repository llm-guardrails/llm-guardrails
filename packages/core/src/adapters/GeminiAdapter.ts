/**
 * Gemini Adapter
 *
 * Wraps @google/generative-ai SDK clients with guardrails.
 */

import type { GuardrailEngine } from '../engine/GuardrailEngine';
import type { GuardedClient } from './types';
import { BaseAdapter } from './BaseAdapter';
import { StreamGuard } from './StreamGuard';

export class GeminiAdapter extends BaseAdapter {
  name = 'gemini';

  /**
   * Detect if client is a Gemini SDK instance
   */
  detect(client: any): boolean {
    return (
      // Check for GenerativeModel methods
      (client?.generateContent !== undefined &&
        client?.startChat !== undefined &&
        client?.constructor?.name === 'GenerativeModel') ||
      // Check for ChatSession methods
      (client?.sendMessage !== undefined &&
        client?.constructor?.name === 'ChatSession') ||
      // Check for GoogleGenerativeAI instance
      (client?.getGenerativeModel !== undefined &&
        client?.constructor?.name === 'GoogleGenerativeAI')
    );
  }

  /**
   * Wrap Gemini client with guardrails
   */
  wrap(client: any, engine: GuardrailEngine): GuardedClient<any> {
    // Handle different Gemini client types
    if (client.constructor?.name === 'GoogleGenerativeAI') {
      // Wrap the GoogleGenerativeAI instance
      return this.wrapGoogleAI(client, engine);
    }

    if (client.constructor?.name === 'GenerativeModel') {
      // Wrap the GenerativeModel instance
      return this.wrapGenerativeModel(client, engine);
    }

    if (client.constructor?.name === 'ChatSession') {
      // Wrap the ChatSession instance
      return this.wrapChatSession(client, engine);
    }

    throw new Error('[Gemini Adapter] Unknown Gemini client type');
  }

  /**
   * Wrap GoogleGenerativeAI instance
   */
  private wrapGoogleAI(client: any, engine: GuardrailEngine): GuardedClient<any> {
    const adapter = this;

    const proxy = new Proxy(client, {
      get(target, prop) {
        // Intercept getGenerativeModel
        if (prop === 'getGenerativeModel') {
          return (modelParams: any) => {
            const model = target.getGenerativeModel(modelParams);
            return adapter.wrapGenerativeModel(model, engine);
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
   * Wrap GenerativeModel instance
   */
  private wrapGenerativeModel(
    client: any,
    engine: GuardrailEngine
  ): GuardedClient<any> {
    const adapter = this;

    const proxy = new Proxy(client, {
      get(target, prop) {
        // Intercept generateContent
        if (prop === 'generateContent') {
          return async (request: any) => {
            return adapter.guardedGenerateContent(target, engine, request);
          };
        }

        // Intercept generateContentStream
        if (prop === 'generateContentStream') {
          return async (request: any) => {
            return adapter.guardedGenerateContentStream(target, engine, request);
          };
        }

        // Intercept startChat
        if (prop === 'startChat') {
          return (params: any) => {
            const chat = target.startChat(params);
            return adapter.wrapChatSession(chat, engine);
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
   * Wrap ChatSession instance
   */
  private wrapChatSession(
    client: any,
    engine: GuardrailEngine
  ): GuardedClient<any> {
    const adapter = this;

    const proxy = new Proxy(client, {
      get(target, prop) {
        // Intercept sendMessage
        if (prop === 'sendMessage') {
          return async (message: any) => {
            return adapter.guardedSendMessage(target, engine, message);
          };
        }

        // Intercept sendMessageStream
        if (prop === 'sendMessageStream') {
          return async (message: any) => {
            return adapter.guardedSendMessageStream(target, engine, message);
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
   * Guarded generateContent (non-streaming)
   */
  private async guardedGenerateContent(
    model: any,
    engine: GuardrailEngine,
    request: any
  ): Promise<any> {
    // Pre-check: Scan input
    const userMessage = this.extractGeminiInput(request);
    if (userMessage) {
      const inputCheck = await engine.checkInput(userMessage);

      if (inputCheck.blocked) {
        this.handleBlockedInput(inputCheck);
      }
    }

    // Call actual API
    const response = await model.generateContent(request);

    // Post-check: Scan response
    const assistantContent = this.extractGeminiResponse(response);
    if (assistantContent) {
      const outputCheck = await engine.checkOutput(assistantContent);

      if (outputCheck.blocked) {
        const sanitized = this.handleBlockedOutput(outputCheck, assistantContent);

        // Modify response if sanitized
        if (response.response?.text) {
          response.response.text = () => sanitized;
        }
      }
    }

    return response;
  }

  /**
   * Guarded generateContentStream
   */
  private async guardedGenerateContentStream(
    model: any,
    engine: GuardrailEngine,
    request: any
  ): Promise<any> {
    // Pre-check: Scan input
    const userMessage = this.extractGeminiInput(request);
    if (userMessage) {
      const inputCheck = await engine.checkInput(userMessage);

      if (inputCheck.blocked) {
        this.handleBlockedInput(inputCheck);
      }
    }

    // Get original stream
    const stream = await model.generateContentStream(request);

    // Guard the stream
    const streamGuard = new StreamGuard(engine, this.config);

    return {
      async *[Symbol.asyncIterator]() {
        for await (const chunk of streamGuard.guard(stream.stream)) {
          yield chunk;
        }
      },
      stream: streamGuard.guard(stream.stream),
    };
  }

  /**
   * Guarded sendMessage (chat)
   */
  private async guardedSendMessage(
    chat: any,
    engine: GuardrailEngine,
    message: any
  ): Promise<any> {
    // Pre-check
    const userMessage = typeof message === 'string' ? message : JSON.stringify(message);
    const inputCheck = await engine.checkInput(userMessage);

    if (inputCheck.blocked) {
      this.handleBlockedInput(inputCheck);
    }

    // Call actual API
    const response = await chat.sendMessage(message);

    // Post-check
    const assistantContent = this.extractGeminiResponse(response);
    if (assistantContent) {
      const outputCheck = await engine.checkOutput(assistantContent);

      if (outputCheck.blocked) {
        const sanitized = this.handleBlockedOutput(outputCheck, assistantContent);
        if (response.response?.text) {
          response.response.text = () => sanitized;
        }
      }
    }

    return response;
  }

  /**
   * Guarded sendMessageStream (chat)
   */
  private async guardedSendMessageStream(
    chat: any,
    engine: GuardrailEngine,
    message: any
  ): Promise<any> {
    // Pre-check
    const userMessage = typeof message === 'string' ? message : JSON.stringify(message);
    const inputCheck = await engine.checkInput(userMessage);

    if (inputCheck.blocked) {
      this.handleBlockedInput(inputCheck);
    }

    // Get stream
    const stream = await chat.sendMessageStream(message);

    // Guard the stream
    const streamGuard = new StreamGuard(engine, this.config);

    return {
      async *[Symbol.asyncIterator]() {
        for await (const chunk of streamGuard.guard(stream.stream)) {
          yield chunk;
        }
      },
      stream: streamGuard.guard(stream.stream),
    };
  }

  /**
   * Extract input from Gemini request
   */
  private extractGeminiInput(request: any): string {
    if (typeof request === 'string') {
      return request;
    }

    if (Array.isArray(request)) {
      return request
        .map((part: any) => {
          if (typeof part === 'string') return part;
          if (part.text) return part.text;
          return '';
        })
        .join('\n');
    }

    if (request.contents) {
      return this.extractFromContents(request.contents);
    }

    return '';
  }

  /**
   * Extract from contents array
   */
  private extractFromContents(contents: any[]): string {
    return contents
      .map((content: any) => {
        if (!content.parts) return '';
        return content.parts
          .map((part: any) => part.text || '')
          .join('\n');
      })
      .join('\n');
  }

  /**
   * Extract response from Gemini response
   */
  private extractGeminiResponse(response: any): string {
    // Try response.text() method
    if (typeof response?.response?.text === 'function') {
      try {
        return response.response.text();
      } catch {
        // Fall through
      }
    }

    // Try candidates format
    if (response?.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return response.response.candidates[0].content.parts[0].text;
    }

    // Try direct text property
    if (response?.text) {
      return response.text;
    }

    return '';
  }
}
