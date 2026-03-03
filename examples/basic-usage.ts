/**
 * Basic usage example for @llm-guardrails/core
 */

import {
  GuardrailEngine,
  PIIGuard,
  DETECTION_PRESETS,
} from '../packages/core/src';

async function main() {
  console.log('🛡️  LLM Guardrails - Basic Usage Example\n');

  // Create guardrail engine with standard detection level
  const engine = new GuardrailEngine({
    level: 'standard',
    onBlock: (result) => {
      console.log('⚠️  Input blocked by guardrails!');
      console.log(`   Guard: ${result.guard}`);
      console.log(`   Reason: ${result.reason}\n`);
    },
  });

  // Add PII guard
  engine.addGuard(new PIIGuard(DETECTION_PRESETS.standard));

  console.log('Testing PII detection...\n');

  // Test cases
  const testCases = [
    {
      name: 'Safe message',
      input: 'Hello! How can I help you today?',
    },
    {
      name: 'Email detection',
      input: 'Please contact me at john.doe@example.com for more information.',
    },
    {
      name: 'Phone detection',
      input: 'You can reach me at 555-123-4567 anytime.',
    },
    {
      name: 'SSN detection',
      input: 'My SSN is 123-45-6789',
    },
    {
      name: 'Credit card detection',
      input: 'My card number is 4532-1234-5678-9010',
    },
    {
      name: 'Multiple PII types',
      input:
        'Contact John at john@example.com or call 555-123-4567. SSN: 123-45-6789',
    },
  ];

  for (const testCase of testCases) {
    console.log(`Test: ${testCase.name}`);
    console.log(`Input: "${testCase.input}"`);

    const result = await engine.checkInput(testCase.input);

    if (result.blocked) {
      console.log(`❌ BLOCKED - ${result.reason}`);
      console.log(`   Guard: ${result.guard}`);
      console.log(`   Confidence: ${(result.results[0].confidence! * 100).toFixed(0)}%`);
      console.log(`   Tier: ${result.results[0].tier}`);
    } else {
      console.log('✅ PASSED - No PII detected');
    }

    console.log(`   Latency: ${result.totalLatency}ms`);
    console.log();
  }

  // Performance demonstration
  console.log('\n📊 Performance Demonstration\n');

  const iterations = 1000;
  const startTime = Date.now();

  for (let i = 0; i < iterations; i++) {
    await engine.checkInput('This is a safe message without any PII');
  }

  const endTime = Date.now();
  const avgLatency = (endTime - startTime) / iterations;

  console.log(`Processed ${iterations} messages in ${endTime - startTime}ms`);
  console.log(`Average latency: ${avgLatency.toFixed(2)}ms per message`);
  console.log(
    `Target: <10ms for 95% of messages ${avgLatency < 10 ? '✅' : '❌'}`
  );

  // Redaction example
  console.log('\n\n🔒 PII Redaction Example\n');

  const guardWithRedaction = new PIIGuard(DETECTION_PRESETS.standard, {
    redact: true,
    redactionPlaceholder: '[REDACTED]',
  });

  engine.addGuard(guardWithRedaction);

  const sensitiveText = 'My email is jane@example.com and phone is 555-987-6543';
  console.log(`Original: "${sensitiveText}"`);

  const redactionResult = await guardWithRedaction.check(sensitiveText);
  if (redactionResult.metadata?.redacted) {
    console.log(`Redacted: "${redactionResult.metadata.redacted}"`);
  }

  console.log('\n✨ Example complete!\n');
}

main().catch(console.error);
