/**
 * Debug script to find which guard blocks safe content
 */

import { GuardrailEngine } from './src/engine/GuardrailEngine';

async function debugSafeContent() {
  const safeInput = 'Hello! How can I help you today?';
  const allGuards = ['pii', 'injection', 'secrets', 'toxicity', 'hate-speech', 'profanity'];

  console.log(`Testing safe input: "${safeInput}"\n`);

  // Test each guard individually
  for (const guardName of allGuards) {
    const engine = new GuardrailEngine({ guards: [guardName] });
    const result = await engine.checkInput(safeInput);

    const status = result.passed ? '✅ PASS' : '❌ BLOCK';
    console.log(`${status} [${guardName}]`);
    if (result.blocked) {
      console.log(`   Reason: ${result.reason}`);
      console.log(`   Details:`, result.results[0]);
    }
  }

  // Test all guards together
  console.log('\nTesting all guards combined:');
  const engine = new GuardrailEngine({ guards: allGuards });
  const result = await engine.checkInput(safeInput);

  const status = result.passed ? '✅ PASS' : '❌ BLOCK';
  console.log(`${status} All guards`);
  if (result.blocked) {
    console.log(`   Blocked by: ${result.guard}`);
    console.log(`   Reason: ${result.reason}`);
  }
}

debugSafeContent();
