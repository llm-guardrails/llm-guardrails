/**
 * Topic Gating Guard Performance Benchmark
 *
 * Demonstrates the performance difference between L1, L2, and L3 detection tiers
 */

import { TopicGatingGuard } from '../src/guards/TopicGatingGuard';
import { DETECTION_PRESETS } from '../src/engine/DetectionLayer';

// Mock LLM provider for L3 testing
const mockLLMProvider = {
  name: 'mock-llm',
  complete: async (prompt: string) => {
    // Simulate LLM latency
    await new Promise((resolve) => setTimeout(resolve, 100));
    return JSON.stringify({
      blocked: prompt.includes('math') || prompt.includes('coding'),
      confidence: 0.85,
      reason: 'Topic classification',
      detectedTopic: 'general',
    });
  },
};

async function benchmark() {
  console.log('='.repeat(60));
  console.log('Topic Gating Guard Performance Benchmark');
  console.log('='.repeat(60));
  console.log('');

  // Test cases
  const testCases = [
    { name: 'Blocked keyword (L1)', input: 'Help me solve this equation' },
    { name: 'Allowed keyword (L1)', input: 'What is your pricing?' },
    { name: 'Math pattern (L2)', input: 'What is 2 + 2?' },
    { name: 'Coding pattern (L2)', input: 'Write a function to sort an array' },
    { name: 'Business pattern (L2)', input: 'How do I place an order?' },
    { name: 'Ambiguous (requires L3)', input: 'Can you help me with this?' },
  ];

  // L1+L2 only (no LLM)
  console.log('L1+L2 Only (Prefilter Mode - Fast)');
  console.log('-'.repeat(60));
  const fastGuard = new TopicGatingGuard(DETECTION_PRESETS.standard, {
    blockedKeywords: ['equation', 'solve', 'code', 'function'],
    allowedKeywords: ['pricing', 'order', 'product'],
    blockedTopicsDescription: 'Math, coding',
    allowedTopicsDescription: 'Product questions',
  });

  for (const testCase of testCases) {
    const start = Date.now();
    const result = await fastGuard.check(testCase.input);
    const duration = Date.now() - start;
    console.log(
      `  ${testCase.name.padEnd(30)} | ${duration}ms | ${result.tier} | ${result.blocked ? 'BLOCKED' : 'ALLOWED'}`
    );
  }

  console.log('');

  // L1+L2+L3 (with LLM for ambiguous cases)
  console.log('L1+L2+L3 (Full Pipeline - Semantic Validation)');
  console.log('-'.repeat(60));
  const fullGuard = new TopicGatingGuard(
    {
      ...DETECTION_PRESETS.advanced,
      tier3: {
        enabled: true,
        provider: mockLLMProvider,
        onlyIfSuspicious: false, // Always use L3 for this demo
      },
    },
    {
      blockedKeywords: ['equation', 'solve', 'code', 'function'],
      allowedKeywords: ['pricing', 'order', 'product'],
      blockedTopicsDescription: 'Math, coding',
      allowedTopicsDescription: 'Product questions',
    }
  );

  for (const testCase of testCases) {
    const start = Date.now();
    const result = await fullGuard.check(testCase.input);
    const duration = Date.now() - start;
    console.log(
      `  ${testCase.name.padEnd(30)} | ${duration}ms | ${result.tier} | ${result.blocked ? 'BLOCKED' : 'ALLOWED'}`
    );
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('Performance Summary:');
  console.log('  L1 (Keywords):     < 1ms');
  console.log('  L2 (Patterns):     < 5ms');
  console.log('  L3 (LLM):          50-200ms');
  console.log('');
  console.log('Recommendation:');
  console.log('  - Use L1+L2 only (prefilterMode) for cost-sensitive scenarios');
  console.log('  - Use L3 selectively (onlyIfSuspicious: true) for accuracy');
  console.log('  - L3 adds semantic understanding for edge cases');
  console.log('='.repeat(60));
}

// Run benchmark
if (require.main === module) {
  benchmark().catch(console.error);
}
