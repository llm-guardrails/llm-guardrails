import { describe, it, expect } from 'vitest';
import { TokenCounter } from '../TokenCounter';

describe('TokenCounter', () => {
  const counter = new TokenCounter();

  describe('Basic Counting', () => {
    it('counts tokens for GPT models', () => {
      const text = 'Hello, how are you doing today?';
      const tokens = counter.count(text, 'gpt-4');

      // ~6 words × 1.3 = ~8 tokens
      expect(tokens).toBeGreaterThan(6);
      expect(tokens).toBeLessThan(12);
    });

    it('counts tokens for Claude models', () => {
      const text = 'Hello, how are you doing today?';
      const tokens = counter.count(text, 'claude-3-5-sonnet-20241022');

      expect(tokens).toBeGreaterThan(6);
      expect(tokens).toBeLessThan(12);
    });

    it('counts tokens for Gemini models', () => {
      const text = 'Hello, how are you doing today?';
      const tokens = counter.count(text, 'gemini-1.5-pro');

      expect(tokens).toBeGreaterThan(5);
      expect(tokens).toBeLessThan(12);
    });

    it('handles empty strings', () => {
      const tokens = counter.count('', 'gpt-4');
      expect(tokens).toBe(0);
    });

    it('handles very long text', () => {
      const text = 'word '.repeat(1000);
      const tokens = counter.count(text, 'gpt-4');

      // ~1000 words × 1.3 = ~1300 tokens
      expect(tokens).toBeGreaterThan(1000);
      expect(tokens).toBeLessThan(1500);
    });
  });

  describe('Message Counting', () => {
    it('counts tokens in messages array', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' },
      ];

      const tokens = counter.countMessages(messages, 'gpt-4');

      // Content tokens + overhead (4 tokens per message + 3 for conversation)
      expect(tokens).toBeGreaterThan(10);
      expect(tokens).toBeLessThan(30);
    });

    it('adds overhead for message formatting', () => {
      const singleMessage = [{ role: 'user', content: 'Hello' }];

      const tokens = counter.countMessages(singleMessage, 'gpt-4');

      // Should include overhead (4 tokens + 3 for conversation)
      expect(tokens).toBeGreaterThan(2); // More than just "Hello"
    });

    it('uses different overhead for Claude', () => {
      const messages = [{ role: 'user', content: 'Hello' }];

      const gptTokens = counter.countMessages(messages, 'gpt-4');
      const claudeTokens = counter.countMessages(messages, 'claude-3-5-sonnet-20241022');

      // Claude has lower overhead (3 vs 4)
      expect(claudeTokens).toBeLessThanOrEqual(gptTokens);
    });
  });

  describe('Accuracy', () => {
    it('approximates within reasonable range for typical prompts', () => {
      const prompt = `You are a helpful assistant. Please analyze the following code and suggest improvements:

function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}`;

      const tokens = counter.count(prompt, 'gpt-4');

      // Manual count: ~45 words, should be ~60 tokens
      expect(tokens).toBeGreaterThan(45);
      expect(tokens).toBeLessThan(80);
    });

    it('handles code with special characters', () => {
      const code = 'const x = { foo: "bar", baz: [1, 2, 3] };';
      const tokens = counter.count(code, 'gpt-4');

      expect(tokens).toBeGreaterThan(5);
      expect(tokens).toBeLessThan(20);
    });

    it('handles non-English text', () => {
      const text = 'Bonjour, comment allez-vous aujourdhui?';
      const tokens = counter.count(text, 'gpt-4');

      expect(tokens).toBeGreaterThan(4);
      expect(tokens).toBeLessThan(12);
    });
  });

  describe('Model-specific Behavior', () => {
    it('uses fallback for unknown models', () => {
      const text = 'Hello world';
      const tokens = counter.count(text, 'unknown-model-12345');

      // Should use generic counting (~4 chars per token)
      // "Hello world" = 11 chars ÷ 4 = ~3 tokens
      expect(tokens).toBeGreaterThan(2);
      expect(tokens).toBeLessThan(6);
    });

    it('handles model names with versions', () => {
      const text = 'Hello world';

      const gpt4Tokens = counter.count(text, 'gpt-4');
      const gpt4TurboTokens = counter.count(text, 'gpt-4-turbo-2024-04-09');

      // Should use same GPT counting logic
      expect(gpt4TurboTokens).toBe(gpt4Tokens);
    });
  });

  describe('Edge Cases', () => {
    it('handles whitespace-only text', () => {
      const tokens = counter.count('   \n\t   ', 'gpt-4');
      expect(tokens).toBe(0);
    });

    it('handles text with multiple spaces', () => {
      const text = 'Hello    world    test';
      const tokens = counter.count(text, 'gpt-4');

      // Should count as 3 words
      expect(tokens).toBeGreaterThan(2);
      expect(tokens).toBeLessThan(6);
    });

    it('handles text with newlines', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const tokens = counter.count(text, 'gpt-4');

      // Should count as 6 words
      expect(tokens).toBeGreaterThan(5);
      expect(tokens).toBeLessThan(10);
    });
  });
});
