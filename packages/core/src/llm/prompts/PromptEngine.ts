/**
 * Prompt engineering engine for LLM-based validation
 */

import type {
  PromptStrategy,
  ParsedLLMResponse,
} from '../../types/llm.js';
import { getPromptTemplate, GENERIC_PROMPT } from './templates.js';

/**
 * Engine for generating and parsing LLM validation prompts
 */
export class PromptEngine {
  private strategy: PromptStrategy;
  private customPrompts: Map<string, string>;

  /**
   * Create a new prompt engine
   * @param strategy - Prompt strategy to use
   * @param customPrompts - Optional custom prompts for specific guards
   */
  constructor(
    strategy: PromptStrategy = 'guard-specific',
    customPrompts?: Record<string, string>
  ) {
    this.strategy = strategy;
    this.customPrompts = new Map(Object.entries(customPrompts || {}));
  }

  /**
   * Get prompt for a specific guard
   * @param guardType - Type of guard (e.g., 'pii', 'injection')
   * @param input - Input text to validate
   * @returns Complete prompt ready for LLM
   */
  getPrompt(guardType: string, input: string): string {
    // Check for custom prompt first
    const customPrompt = this.customPrompts.get(guardType);
    if (customPrompt) {
      return this.fillTemplate(customPrompt, input);
    }

    // Use strategy to determine prompt
    switch (this.strategy) {
      case 'guard-specific':
        return this.getGuardSpecificPrompt(guardType, input);
      case 'generic':
        return this.getGenericPrompt(input);
      case 'hybrid':
        // Try guard-specific, fall back to generic if not found
        return this.getHybridPrompt(guardType, input);
      default:
        return this.getGuardSpecificPrompt(guardType, input);
    }
  }

  /**
   * Get multi-guard prompt (checks multiple guards at once)
   * @param _guards - Array of guard types to check (unused, kept for API compatibility)
   * @param input - Input text to validate
   * @returns Combined prompt
   */
  getMultiGuardPrompt(_guards: string[], input: string): string {
    // Always use generic prompt for multi-guard checks
    return this.fillTemplate(GENERIC_PROMPT, input);
  }

  /**
   * Parse LLM response into structured result
   * @param response - Raw LLM response
   * @param guardType - Guard type that made the request
   * @returns Parsed validation result
   */
  parseResponse(response: string, guardType: string): ParsedLLMResponse {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (typeof parsed.blocked !== 'boolean') {
        throw new Error('Missing or invalid "blocked" field');
      }

      if (typeof parsed.confidence !== 'number') {
        throw new Error('Missing or invalid "confidence" field');
      }

      // Ensure confidence is in range [0, 1]
      const confidence = Math.max(0, Math.min(1, parsed.confidence));

      return {
        blocked: parsed.blocked,
        confidence,
        reason: parsed.reason || 'No reason provided',
      };
    } catch (error) {
      // If parsing fails, return safe default
      console.error(`Failed to parse LLM response for ${guardType}:`, error);
      console.error('Raw response:', response);

      // Try to infer from response text
      return this.inferFromText(response);
    }
  }

  /**
   * Get guard-specific prompt
   * @param guardType - Guard type
   * @param input - Input text
   * @returns Filled prompt template
   */
  private getGuardSpecificPrompt(guardType: string, input: string): string {
    const template = getPromptTemplate(guardType);
    return this.fillTemplate(template, input);
  }

  /**
   * Get generic multi-purpose prompt
   * @param input - Input text
   * @returns Filled generic prompt
   */
  private getGenericPrompt(input: string): string {
    return this.fillTemplate(GENERIC_PROMPT, input);
  }

  /**
   * Get hybrid prompt (guard-specific with generic fallback)
   * @param guardType - Guard type
   * @param input - Input text
   * @returns Filled prompt template
   */
  private getHybridPrompt(guardType: string, input: string): string {
    const template = getPromptTemplate(guardType);
    // If we got the generic template back, it means the guard-specific one wasn't found
    // In hybrid mode, we still use it
    return this.fillTemplate(template, input);
  }

  /**
   * Fill template with input text
   * @param template - Prompt template
   * @param input - Input text to insert
   * @returns Filled template
   */
  private fillTemplate(template: string, input: string): string {
    return template.replace('{input}', input);
  }

  /**
   * Infer result from response text when JSON parsing fails
   * @param response - Raw response text
   * @returns Best-effort parsed result
   */
  private inferFromText(response: string): ParsedLLMResponse {
    const lowerResponse = response.toLowerCase();

    // Look for clear blocking indicators
    const blockIndicators = [
      'blocked: true',
      '"blocked": true',
      'should be blocked',
      'must be blocked',
      'violation detected',
      'unsafe content',
    ];

    const isBlocked = blockIndicators.some((indicator) =>
      lowerResponse.includes(indicator)
    );

    // Try to extract confidence
    const confidenceMatch = response.match(/confidence["\s:]+(\d+\.?\d*)/i);
    let confidence = 0.5; // Default to medium confidence

    if (confidenceMatch) {
      const value = parseFloat(confidenceMatch[1]);
      // Handle both 0-1 and 0-100 scales
      confidence = value > 1 ? value / 100 : value;
      confidence = Math.max(0, Math.min(1, confidence));
    }

    return {
      blocked: isBlocked,
      confidence,
      reason: 'Inferred from unparseable response',
    };
  }

  /**
   * Add or update a custom prompt
   * @param guardType - Guard type
   * @param prompt - Custom prompt template (use {input} as placeholder)
   */
  addCustomPrompt(guardType: string, prompt: string): void {
    this.customPrompts.set(guardType, prompt);
  }

  /**
   * Remove a custom prompt
   * @param guardType - Guard type
   */
  removeCustomPrompt(guardType: string): void {
    this.customPrompts.delete(guardType);
  }

  /**
   * Get current strategy
   * @returns Current prompt strategy
   */
  getStrategy(): PromptStrategy {
    return this.strategy;
  }

  /**
   * Set strategy
   * @param strategy - New prompt strategy
   */
  setStrategy(strategy: PromptStrategy): void {
    this.strategy = strategy;
  }
}
