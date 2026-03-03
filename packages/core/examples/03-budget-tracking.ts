/**
 * Example 3: Budget Tracking and Cost Control
 *
 * This example shows how to track token usage and enforce
 * cost budgets for LLM API calls.
 */

import {
  BudgetGuard,
  TokenCounter,
  CostCalculator,
} from '../src';

// Create budget guard with limits
const budgetGuard = new BudgetGuard({
  maxTokensPerSession: 50000,
  maxCostPerSession: 0.50,    // $0.50 per session
  maxCostPerUser: 5.00,       // $5.00 per user
  alertThreshold: 0.8,        // Warn at 80%
});

const tokenCounter = new TokenCounter();
const costCalculator = new CostCalculator();

async function simulateLLMCall(
  sessionId: string,
  userId: string,
  model: string,
  prompt: string
): Promise<void> {
  console.log(`\n📊 Simulating LLM call...`);
  console.log(`   Model: ${model}`);
  console.log(`   Prompt: "${prompt.substring(0, 50)}..."`);

  // Check budget before call
  const check = await budgetGuard.check(prompt, {
    sessionId,
    model,
    userId,
  });

  if (check.blocked) {
    console.log(`❌ BLOCKED: ${check.reason}`);
    return;
  }

  console.log(`✅ Budget check passed, making API call...`);

  // Simulate token counts (in real app, get from API response)
  const inputTokens = tokenCounter.count(prompt, model);
  const outputTokens = Math.floor(inputTokens * 2.5); // Assume 2.5x output

  // Calculate cost
  const cost = costCalculator.calculate(inputTokens, outputTokens, model);

  console.log(`   Input tokens: ${inputTokens}`);
  console.log(`   Output tokens: ${outputTokens}`);
  console.log(`   Cost: $${cost.toFixed(4)}`);

  // Record actual usage
  await budgetGuard.recordUsage(sessionId, inputTokens, outputTokens, model, userId);

  // Get session stats
  const stats = await budgetGuard.getStats(sessionId);
  console.log(`   Session total: ${stats.totalTokens} tokens, $${stats.totalCost.toFixed(4)}`);
}

async function main() {
  console.log('=== Budget Tracking Examples ===\n');

  // Example 1: Normal usage within budget
  console.log('1. Normal usage within budget:');
  await simulateLLMCall(
    'session-1',
    'user-1',
    'gpt-4o',
    'Explain quantum computing in simple terms'
  );

  // Example 2: Multiple calls accumulating
  console.log('\n2. Multiple calls in same session:');
  await simulateLLMCall(
    'session-2',
    'user-2',
    'gpt-4o',
    'Write a short story about a robot'
  );
  await simulateLLMCall(
    'session-2',
    'user-2',
    'gpt-4o',
    'Now make it longer with more details and character development. Add dialogue and description.'
  );

  // Example 3: Different models have different costs
  console.log('\n3. Comparing model costs:');

  console.log('\nUsing GPT-4o (expensive):');
  await simulateLLMCall(
    'session-3',
    'user-3',
    'gpt-4o',
    'Analyze this data and provide insights'
  );

  console.log('\nUsing GPT-4o-mini (cheaper):');
  await simulateLLMCall(
    'session-4',
    'user-3',
    'gpt-4o-mini',
    'Analyze this data and provide insights'
  );

  // Example 4: Approaching budget limit
  console.log('\n4. Approaching budget limit:');

  // Use expensive model multiple times
  for (let i = 0; i < 5; i++) {
    await simulateLLMCall(
      'session-5',
      'user-4',
      'gpt-4o',
      'Generate a very long response with lots of detail and explanation about machine learning algorithms'.repeat(10)
    );
  }

  // Example 5: Model pricing comparison
  console.log('\n5. Model pricing comparison:');
  const models = ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet-20241022', 'gemini-1.5-pro'];

  for (const model of models) {
    const pricing = costCalculator.getPricing(model);
    if (pricing) {
      console.log(`\n${model}:`);
      console.log(`   Input: $${pricing.inputCostPer1M}/1M tokens`);
      console.log(`   Output: $${pricing.outputCostPer1M}/1M tokens`);

      // Calculate cost for 1000 input + 2000 output tokens
      const cost = costCalculator.calculate(1000, 2000, model);
      console.log(`   Example cost (1K in, 2K out): $${cost.toFixed(4)}`);
    }
  }
}

main().catch(console.error);
