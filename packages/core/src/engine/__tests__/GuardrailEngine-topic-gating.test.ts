import { describe, it, expect } from 'vitest';
import { GuardrailEngine } from '../GuardrailEngine';
import { TopicGatingGuard } from '../../guards/TopicGatingGuard';

describe('GuardrailEngine - Topic Gating', () => {
  it('should register TopicGatingGuard with config', () => {
    const engine = new GuardrailEngine({
      guards: [
        {
          name: 'topic-gating',
          config: {
            blockedKeywords: ['math', 'coding'],
            allowedKeywords: ['product', 'pricing'],
          },
        },
      ],
    });

    const guards = engine.getGuards();
    expect(guards).toHaveLength(1);
    expect(guards[0].name).toBe('topic-gating');
    expect(guards[0]).toBeInstanceOf(TopicGatingGuard);
  });

  it('should block off-topic requests with TopicGatingGuard', async () => {
    const engine = new GuardrailEngine({
      guards: [
        {
          name: 'topic-gating',
          config: {
            blockedKeywords: ['math', 'coding', 'equation'],
          },
        },
      ],
    });

    const result = await engine.checkInput('Please solve this equation for me');

    expect(result.blocked).toBe(true);
    expect(result.guard).toBe('topic-gating');
    expect(result.reason).toContain('blocked keyword');
  });

  it('should allow on-topic requests with TopicGatingGuard', async () => {
    const engine = new GuardrailEngine({
      guards: [
        {
          name: 'topic-gating',
          config: {
            blockedKeywords: ['math', 'coding'],
            allowedKeywords: ['pricing', 'product'],
          },
        },
      ],
    });

    const result = await engine.checkInput('What is your pricing for enterprise?');

    expect(result.blocked).toBe(false);
  });

  it('should work with other guards', async () => {
    const engine = new GuardrailEngine({
      guards: [
        'pii',
        {
          name: 'topic-gating',
          config: {
            blockedKeywords: ['math'],
          },
        },
      ],
    });

    const guards = engine.getGuards();
    expect(guards).toHaveLength(2);
    expect(guards[0].name).toBe('pii');
    expect(guards[1].name).toBe('topic-gating');

    // Should block math topic
    const mathResult = await engine.checkInput('What is 2 + 2?');
    expect(mathResult.blocked).toBe(true);
    expect(mathResult.guard).toBe('topic-gating');

    // Should block PII
    const piiResult = await engine.checkInput('My email is test@example.com');
    expect(piiResult.blocked).toBe(true);
    expect(piiResult.guard).toBe('pii');
  });
});
