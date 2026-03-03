/**
 * Token Counter
 *
 * Approximate token counting for 20+ LLM models.
 * Accuracy target: within 5% of actual tokens.
 */

export class TokenCounter {
  /**
   * Count tokens for given text and model
   * Uses approximation: ~4 chars per token for most models
   */
  count(text: string, model: string): number {
    // OpenAI models (GPT-3.5, GPT-4, etc.)
    if (model.includes('gpt')) {
      return this.countGPT(text);
    }

    // Anthropic Claude models
    if (model.includes('claude')) {
      return this.countClaude(text);
    }

    // Google Gemini models
    if (model.includes('gemini')) {
      return this.countGemini(text);
    }

    // Fallback: generic approximation
    return this.countGeneric(text);
  }

  /**
   * Count tokens for GPT models
   * GPT tokenizer: ~4 chars per token on average
   */
  private countGPT(text: string): number {
    // More accurate approximation:
    // - Split on whitespace
    // - ~1.3 tokens per word on average
    const words = text.split(/\s+/).filter(w => w.length > 0);
    return Math.ceil(words.length * 1.3);
  }

  /**
   * Count tokens for Claude models
   * Similar to GPT tokenization
   */
  private countClaude(text: string): number {
    // Claude uses similar tokenization to GPT
    const words = text.split(/\s+/).filter(w => w.length > 0);
    return Math.ceil(words.length * 1.3);
  }

  /**
   * Count tokens for Gemini models
   * Gemini tokenizer is similar but slightly different
   */
  private countGemini(text: string): number {
    // Gemini: slightly more efficient, ~1.2 tokens per word
    const words = text.split(/\s+/).filter(w => w.length > 0);
    return Math.ceil(words.length * 1.2);
  }

  /**
   * Generic token counting for unknown models
   * Most conservative estimate: ~4 chars per token
   */
  private countGeneric(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Count tokens in messages array (common format)
   */
  countMessages(messages: Array<{ role: string; content: string }>, model: string): number {
    let total = 0;

    for (const message of messages) {
      // Add tokens for content
      total += this.count(message.content, model);

      // Add overhead for message formatting (role, delimiters, etc.)
      // GPT: ~4 tokens per message overhead
      // Claude: ~3 tokens per message overhead
      if (model.includes('claude')) {
        total += 3;
      } else {
        total += 4;
      }
    }

    // Add overhead for conversation formatting
    total += 3;

    return total;
  }
}
