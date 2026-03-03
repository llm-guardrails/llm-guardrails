/**
 * Mastra Agent Decorator
 *
 * Decorator function to add guardrails to Mastra agents.
 */

import type { GuardrailEngine } from '@llm-guardrails/core';
import type { GuardrailConfig } from '@llm-guardrails/core';

/**
 * Decorator configuration
 */
export interface MastraGuardrailConfig extends GuardrailConfig {
  /**
   * Whether to check tool call inputs
   */
  checkToolInputs?: boolean;

  /**
   * Whether to check tool call outputs
   */
  checkToolOutputs?: boolean;

  /**
   * Whether to check final agent response
   */
  checkFinalResponse?: boolean;

  /**
   * Tool-specific configurations
   */
  toolConfigs?: Record<
    string,
    {
      skipInputCheck?: boolean;
      skipOutputCheck?: boolean;
      customGuards?: string[];
    }
  >;
}

/**
 * Decorated agent type
 */
export type GuardedAgent<T = any> = T & {
  __guardrails: GuardrailEngine;
  __original: T;
  __unwrap(): T;
};

/**
 * Wrap a Mastra agent with guardrails
 */
export function withGuardrails<T extends Record<string, any>>(
  agent: T,
  engine: GuardrailEngine,
  config: MastraGuardrailConfig = {}
): GuardedAgent<T> {
  const defaults = {
    checkToolInputs: true,
    checkToolOutputs: true,
    checkFinalResponse: true,
    toolConfigs: {},
    ...config,
  };

  // Create proxy to intercept agent methods
  const proxy = new Proxy(agent, {
    get(target, prop: string | symbol) {
      // Metadata properties
      if (prop === '__guardrails') return engine;
      if (prop === '__original') return target;
      if (prop === '__unwrap') return () => target;

      const value = (target as any)[prop];

      // Intercept generate method
      if (prop === 'generate' && typeof value === 'function') {
        return async function (input: any, options?: any) {
          // Pre-check input
          const userMessage = extractInput(input);
          if (userMessage) {
            const inputCheck = await engine.checkInput(userMessage);
            if (inputCheck.blocked) {
              throw new Error(
                `Agent input blocked by guardrails: ${inputCheck.reason}`
              );
            }
          }

          // Call original generate
          const response = await value.call(target, input, options);

          // Post-check output
          if (defaults.checkFinalResponse) {
            const assistantContent = extractOutput(response);
            if (assistantContent) {
              const outputCheck = await engine.checkOutput(assistantContent);
              if (outputCheck.blocked) {
                // Sanitize response
                return replaceOutput(
                  response,
                  '[Response blocked by guardrails]'
                );
              }
            }
          }

          return response;
        };
      }

      // Intercept stream method
      if (prop === 'stream' && typeof value === 'function') {
        return async function* (input: any, options?: any) {
          // Pre-check input
          const userMessage = extractInput(input);
          if (userMessage) {
            const inputCheck = await engine.checkInput(userMessage);
            if (inputCheck.blocked) {
              throw new Error(
                `Agent input blocked by guardrails: ${inputCheck.reason}`
              );
            }
          }

          // Stream with incremental checks
          let buffer = '';
          let chunkCount = 0;

          const stream = await value.call(target, input, options);

          for await (const chunk of stream) {
            const content = extractStreamContent(chunk);
            if (content) {
              buffer += content;
              chunkCount++;

              // Check every 10 chunks
              if (chunkCount % 10 === 0 && defaults.checkFinalResponse) {
                const quickCheck = await engine.quickCheck(buffer);
                if (quickCheck.blocked) {
                  throw new Error(
                    `Stream blocked by guardrails: ${quickCheck.reason}`
                  );
                }
              }
            }

            yield chunk;
          }

          // Final check
          if (buffer && defaults.checkFinalResponse) {
            const finalCheck = await engine.checkOutput(buffer);
            if (finalCheck.blocked) {
              throw new Error(
                `Stream blocked by guardrails: ${finalCheck.reason}`
              );
            }
          }
        };
      }

      // Intercept execute method (for agents with tools)
      if (prop === 'execute' && typeof value === 'function') {
        return async function (input: any, options?: any) {
          // Pre-check input
          const userMessage = extractInput(input);
          if (userMessage) {
            const inputCheck = await engine.checkInput(userMessage);
            if (inputCheck.blocked) {
              throw new Error(
                `Agent input blocked by guardrails: ${inputCheck.reason}`
              );
            }
          }

          // Wrap tools if needed
          const wrappedOptions = wrapToolsIfNeeded(
            options,
            engine,
            defaults
          );

          // Call original execute
          const response = await value.call(target, input, wrappedOptions);

          // Post-check output
          if (defaults.checkFinalResponse) {
            const assistantContent = extractOutput(response);
            if (assistantContent) {
              const outputCheck = await engine.checkOutput(assistantContent);
              if (outputCheck.blocked) {
                return replaceOutput(
                  response,
                  '[Response blocked by guardrails]'
                );
              }
            }
          }

          return response;
        };
      }

      // Pass through everything else
      return value;
    },
  });

  return proxy as GuardedAgent<T>;
}

/**
 * Wrap tools with guardrail checks
 */
function wrapToolsIfNeeded(
  options: any,
  engine: GuardrailEngine,
  config: MastraGuardrailConfig
): any {
  if (!options?.tools || !Array.isArray(options.tools)) {
    return options;
  }

  const wrappedTools = options.tools.map((tool: any) => {
    const toolName = tool.name || tool.id;
    const toolConfig = config.toolConfigs?.[toolName] || {};

    // Skip if configured to skip
    if (toolConfig.skipInputCheck && toolConfig.skipOutputCheck) {
      return tool;
    }

    // Wrap the tool's execute function
    const originalExecute = tool.execute || tool.run;
    if (typeof originalExecute !== 'function') {
      return tool;
    }

    return {
      ...tool,
      execute: async function (input: any) {
        // Pre-check tool input
        if (config.checkToolInputs && !toolConfig.skipInputCheck) {
          const inputStr = JSON.stringify(input);
          const inputCheck = await engine.checkInput(inputStr);
          if (inputCheck.blocked) {
            throw new Error(
              `Tool ${toolName} input blocked: ${inputCheck.reason}`
            );
          }
        }

        // Call original tool
        const result = await originalExecute.call(tool, input);

        // Post-check tool output
        if (config.checkToolOutputs && !toolConfig.skipOutputCheck) {
          const outputStr = JSON.stringify(result);
          const outputCheck = await engine.checkOutput(outputStr);
          if (outputCheck.blocked) {
            return { error: 'Tool output blocked by guardrails' };
          }
        }

        return result;
      },
    };
  });

  return {
    ...options,
    tools: wrappedTools,
  };
}

/**
 * Extract input from various formats
 */
function extractInput(input: any): string {
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
 * Extract output from various formats
 */
function extractOutput(output: any): string {
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
 * Extract content from stream chunk
 */
function extractStreamContent(chunk: any): string {
  if (typeof chunk === 'string') {
    return chunk;
  }

  if (chunk?.content) {
    return typeof chunk.content === 'string' ? chunk.content : '';
  }

  if (chunk?.text) {
    return chunk.text;
  }

  if (chunk?.delta?.content) {
    return chunk.delta.content;
  }

  return '';
}

/**
 * Replace output in response
 */
function replaceOutput(response: any, sanitized: string): any {
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
