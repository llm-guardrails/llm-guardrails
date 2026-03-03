/**
 * Example 1: Basic Usage
 *
 * Demonstrates basic usage of guardrails with Mastra agents.
 */

import { withGuardrails, quickGuard } from '../src';
import { GuardrailEngine } from '@openclaw-guardrails/core';

// Mock Mastra agent for demonstration
const createMockAgent = (name: string) => ({
  name,
  systemPrompt: 'You are a helpful assistant',
  generate: async (input: string) => {
    return {
      text: `Response to: ${input}`,
      usage: { tokens: 100 },
    };
  },
  stream: async function* (input: string) {
    yield { content: 'Hello ' };
    yield { content: 'from ' };
    yield { content: name };
  },
});

console.log('=== Mastra Guardrails - Basic Usage ===\n');

// Example 1: Simple decorator usage
console.log('1. Simple Decorator');
const agent = createMockAgent('SimpleAgent');

const engine = new GuardrailEngine({
  guards: ['pii', 'injection'],
});

const guardedAgent = withGuardrails(agent, engine);

console.log('   ✓ Agent wrapped with PII and injection guards\n');

// Example 2: Quick guard with presets
console.log('2. Quick Guard (Preset)');

const agent2 = createMockAgent('QuickAgent');
const guardedAgent2 = quickGuard(agent2, 'standard');

console.log('   ✓ Agent wrapped with standard preset\n');

// Example 3: Using the guarded agent
console.log('3. Safe Message');
try {
  const response = await guardedAgent.generate('What is the weather today?');
  console.log(`   ✓ Response: ${response.text}\n`);
} catch (error: any) {
  console.error(`   ✗ Error: ${error.message}\n`);
}

// Example 4: Blocked message (PII)
console.log('4. Message with PII (should block)');
try {
  const response = await guardedAgent.generate(
    'My email is john.doe@example.com'
  );
  console.log(`   ✓ Response: ${response.text}\n`);
} catch (error: any) {
  console.log(`   ✓ Blocked (expected): ${error.message}\n`);
}

// Example 5: Streaming with guardrails
console.log('5. Streaming');
try {
  console.log('   ✓ Stream: ');
  for await (const chunk of guardedAgent.stream('Tell me a joke')) {
    process.stdout.write(chunk.content);
  }
  console.log('\n');
} catch (error: any) {
  console.error(`   ✗ Error: ${error.message}\n`);
}

// Example 6: Different preset levels
console.log('6. Preset Comparison\n');

const presets = ['basic', 'standard', 'advanced', 'production'] as const;

for (const preset of presets) {
  const testAgent = quickGuard(createMockAgent(`Agent-${preset}`), preset);
  console.log(`   ${preset.padEnd(12)}: ✓ Configured`);
}

console.log('\n   Preset Levels:');
console.log('   - basic:      PII + injection');
console.log('   - standard:   PII + injection + secrets + toxicity');
console.log('   - advanced:   All guards + behavioral analysis');
console.log('   - production: All guards + behavioral + budget\n');

// Example 7: Unwrap to get original agent
console.log('7. Unwrap Agent');
const original = guardedAgent.__unwrap();
console.log(`   ✓ Original agent: ${original.name}`);
console.log(`   ✓ Guardrails engine available: ${!!guardedAgent.__guardrails}\n`);

// Example 8: Configuration options
console.log('8. Configuration Options\n');

const agent3 = createMockAgent('ConfiguredAgent');
const guardedAgent3 = withGuardrails(agent3, engine, {
  checkToolInputs: true,
  checkToolOutputs: true,
  checkFinalResponse: true,
});

console.log('   ✓ Tool input checks: enabled');
console.log('   ✓ Tool output checks: enabled');
console.log('   ✓ Final response checks: enabled\n');

console.log('=== Example Complete ===');
