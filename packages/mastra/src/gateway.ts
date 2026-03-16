import { GuardrailEngine } from '@llm-guardrails/core';
import type { GatewayGuardConfig, AgentGuardConfig } from './types';

/**
 * Guard at the gateway/orchestrator level
 * Protects before routing to agents
 */
export function guardGateway<T extends Record<string, any>>(
  mastra: T,
  config: GatewayGuardConfig
): T {
  const inputEngine = config.input?.length
    ? new GuardrailEngine({
        guards: config.input as any,
        level: config.level || 'standard',
        failMode: config.failMode,
      })
    : null;

  const outputEngine = config.output?.length
    ? new GuardrailEngine({
        guards: config.output as any,
        level: config.level || 'standard',
        failMode: config.failMode,
      })
    : null;

  return new Proxy(mastra, {
    get(target, prop: string | symbol) {
      const value = (target as any)[prop];

      // Intercept processing methods
      if (prop === 'process' && typeof value === 'function') {
        return async function (input: any, options?: any) {
          // Gateway input check
          if (inputEngine) {
            const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
            const inputCheck = await inputEngine.checkInput(inputStr);

            if (inputCheck.blocked) {
              if (config.onBlock) {
                config.onBlock(inputCheck);
              }
              throw new Error(
                `Gateway blocked input: ${inputCheck.reason}`
              );
            }
          }

          // Process through mastra
          const response = await value.call(target, input, options);

          // Gateway output check
          if (outputEngine) {
            const outputStr = extractOutput(response);
            if (outputStr) {
              const outputCheck = await outputEngine.checkOutput(outputStr);

              if (outputCheck.blocked) {
                if (config.onBlock) {
                  config.onBlock(outputCheck);
                }

                // Replace output with blocked message
                return replaceOutput(
                  response,
                  outputCheck.sanitized || '[Response blocked by gateway]'
                );
              }
            }
          }

          return response;
        };
      }

      return value;
    },
  });
}

/**
 * Guard at the agent level
 * Separate from gateway guards
 */
export function guardAgent<T extends Record<string, any>>(
  agent: T,
  config: AgentGuardConfig
): T {
  const inputEngine = config.input?.length
    ? new GuardrailEngine({
        guards: config.input as any,
        level: config.level || 'standard',
        failMode: config.failMode,
      })
    : null;

  const outputEngine = config.output?.length
    ? new GuardrailEngine({
        guards: config.output as any,
        level: config.level || 'standard',
        failMode: config.failMode,
        outputBlockStrategy: config.outputBlockStrategy,
        blockedMessage: config.blockedMessage,
      })
    : null;

  const proxy = new Proxy(agent, {
    get(target, prop: string | symbol) {
      const value = (target as any)[prop];

      // Intercept generate method
      if (prop === 'generate' && typeof value === 'function') {
        return async function (input: any, options?: any) {
          // Agent input check
          if (inputEngine) {
            const userMessage = extractInput(input);
            if (userMessage) {
              const inputCheck = await inputEngine.checkInput(userMessage);
              if (inputCheck.blocked) {
                throw new Error(
                  `Agent input blocked: ${inputCheck.reason}`
                );
              }
            }
          }

          // Call original generate
          const response = await value.call(target, input, options);

          // Agent output check
          if (outputEngine) {
            const assistantContent = extractOutput(response);
            if (assistantContent) {
              const outputCheck = await outputEngine.checkOutput(assistantContent);

              if (outputCheck.blocked) {
                // Replace output
                return replaceOutput(
                  response,
                  outputCheck.sanitized || '[Response blocked]'
                );
              }
            }
          }

          return response;
        };
      }

      return value;
    },
  });

  return proxy;
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

  if (output?.result) {
    return typeof output.result === 'string'
      ? output.result
      : JSON.stringify(output.result);
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

  if (response?.result !== undefined) {
    return { ...response, result: sanitized };
  }

  return response;
}
