/**
 * LLM Providers Example
 *
 * Demonstrates how to use all 5 LLM providers for L3 validation:
 * 1. AnthropicLLMProvider - Claude models
 * 2. OpenAILLMProvider - GPT models
 * 3. LiteLLMProvider - Universal proxy (100+ models)
 * 4. VertexLLMProvider - Google Gemini models
 * 5. BedrockLLMProvider - AWS Bedrock (Claude on AWS)
 */

import { GuardrailEngine } from '../src';

console.log('🤖 LLM Providers Example\n');
console.log('This example shows how to configure each of the 5 supported LLM providers.\n');

// ============================================================================
// Provider 1: Anthropic Claude
// ============================================================================

console.log('1️⃣  Anthropic Claude');
console.log('===================\n');

console.log('Install dependency:');
console.log('npm install @anthropic-ai/sdk\n');

console.log('Code:');
console.log(`
import { AnthropicLLMProvider } from '@llm-guardrails/core/llm';
import Anthropic from '@anthropic-ai/sdk';

const anthropicProvider = new AnthropicLLMProvider({
  client: new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  }),
  model: 'claude-3-haiku-20240307', // Fast and cheap
  // Alternative models:
  // - 'claude-3-sonnet-20240229' (balanced)
  // - 'claude-3-opus-20240229' (most accurate)
});

const engine = new GuardrailEngine({
  guards: ['injection', 'pii'],
  level: 'advanced',
  llm: {
    enabled: true,
    provider: anthropicProvider,
  },
});

const result = await engine.checkInput('Your input here');
`);

console.log('✨ Best for: High accuracy, low cost, fast responses');
console.log('💰 Cost: ~$0.00025 per check');
console.log('⚡ Latency: 50-100ms\n');

// ============================================================================
// Provider 2: OpenAI GPT
// ============================================================================

console.log('2️⃣  OpenAI GPT');
console.log('==============\n');

console.log('Install dependency:');
console.log('npm install openai\n');

console.log('Code:');
console.log(`
import { OpenAILLMProvider } from '@llm-guardrails/core/llm';
import OpenAI from 'openai';

const openaiProvider = new OpenAILLMProvider({
  client: new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  }),
  model: 'gpt-4o-mini', // Fast and cheap
  // Alternative models:
  // - 'gpt-4o' (most accurate, expensive)
  // - 'gpt-3.5-turbo' (legacy, not recommended)
});

const engine = new GuardrailEngine({
  guards: ['injection', 'pii'],
  level: 'advanced',
  llm: {
    enabled: true,
    provider: openaiProvider,
  },
});

const result = await engine.checkInput('Your input here');
`);

console.log('✨ Best for: JSON formatting, structured outputs');
console.log('💰 Cost: ~$0.0003 per check');
console.log('⚡ Latency: 80-150ms\n');

// ============================================================================
// Provider 3: LiteLLM (Universal)
// ============================================================================

console.log('3️⃣  LiteLLM (Universal Proxy)');
console.log('=============================\n');

console.log('Setup LiteLLM proxy:');
console.log('pip install litellm[proxy]');
console.log('litellm --model claude-3-haiku-20240307\n');

console.log('Code:');
console.log(`
import { LiteLLMProvider } from '@llm-guardrails/core/llm';

const litellmProvider = new LiteLLMProvider({
  baseUrl: 'http://localhost:4000', // LiteLLM proxy URL
  model: 'claude-3-haiku-20240307', // Any model!
  apiKey: process.env.LITELLM_API_KEY, // Optional
});

const engine = new GuardrailEngine({
  guards: ['injection', 'pii'],
  level: 'advanced',
  llm: {
    enabled: true,
    provider: litellmProvider,
  },
});

const result = await engine.checkInput('Your input here');
`);

console.log('✨ Best for: Multi-provider, flexibility, 100+ models');
console.log('💰 Cost: Varies by model');
console.log('⚡ Latency: Varies by model');
console.log('\n📚 Supported providers:');
console.log('   • Anthropic, OpenAI, Cohere, Replicate');
console.log('   • Azure OpenAI, AWS Bedrock, Google Vertex');
console.log('   • Hugging Face, Ollama, Together AI');
console.log('   • And 100+ more!\n');

// ============================================================================
// Provider 4: Google Vertex AI
// ============================================================================

console.log('4️⃣  Google Vertex AI');
console.log('====================\n');

console.log('Install dependency:');
console.log('npm install @google-cloud/vertexai\n');

console.log('Setup authentication:');
console.log('gcloud auth application-default login\n');

console.log('Code:');
console.log(`
import { VertexLLMProvider } from '@llm-guardrails/core/llm';

const vertexProvider = new VertexLLMProvider({
  project: 'your-gcp-project-id',
  location: 'us-central1', // Or 'us-east1', 'europe-west1', etc.
  model: 'gemini-1.5-flash', // Fast and cheap
  // Alternative models:
  // - 'gemini-1.5-pro' (most accurate)
  // - 'gemini-1.0-pro' (legacy)
});

const engine = new GuardrailEngine({
  guards: ['injection', 'pii'],
  level: 'advanced',
  llm: {
    enabled: true,
    provider: vertexProvider,
  },
});

const result = await engine.checkInput('Your input here');
`);

console.log('✨ Best for: Google Cloud integration, Gemini models');
console.log('💰 Cost: ~$0.00015 per check (cheapest!)');
console.log('⚡ Latency: 60-120ms\n');

// ============================================================================
// Provider 5: AWS Bedrock
// ============================================================================

console.log('5️⃣  AWS Bedrock');
console.log('===============\n');

console.log('Install dependency:');
console.log('npm install @aws-sdk/client-bedrock-runtime\n');

console.log('Setup credentials:');
console.log('aws configure\n');

console.log('Code:');
console.log(`
import { BedrockLLMProvider } from '@llm-guardrails/core/llm';

const bedrockProvider = new BedrockLLMProvider({
  region: 'us-east-1', // Or 'us-west-2', 'eu-west-1', etc.
  model: 'anthropic.claude-3-haiku-20240307-v1:0', // Fast and cheap
  // Alternative models:
  // - 'anthropic.claude-3-sonnet-*' (balanced)
  // - 'anthropic.claude-3-opus-*' (most accurate)

  // Optional: custom credentials
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const engine = new GuardrailEngine({
  guards: ['injection', 'pii'],
  level: 'advanced',
  llm: {
    enabled: true,
    provider: bedrockProvider,
  },
});

const result = await engine.checkInput('Your input here');
`);

console.log('✨ Best for: AWS integration, Claude on AWS');
console.log('💰 Cost: ~$0.00025 per check');
console.log('⚡ Latency: 70-130ms\n');

// ============================================================================
// Provider Comparison
// ============================================================================

console.log('\n📊 Provider Comparison');
console.log('======================\n');

const providers = [
  {
    name: 'Anthropic',
    cost: '$0.00025',
    latency: '50-100ms',
    accuracy: '⭐⭐⭐⭐⭐',
    setup: 'Easy',
    bestFor: 'General use, high accuracy',
  },
  {
    name: 'OpenAI',
    cost: '$0.0003',
    latency: '80-150ms',
    accuracy: '⭐⭐⭐⭐',
    setup: 'Easy',
    bestFor: 'JSON outputs, GPT ecosystem',
  },
  {
    name: 'LiteLLM',
    cost: 'Varies',
    latency: 'Varies',
    accuracy: 'Varies',
    setup: 'Medium',
    bestFor: 'Flexibility, 100+ models',
  },
  {
    name: 'Vertex AI',
    cost: '$0.00015',
    latency: '60-120ms',
    accuracy: '⭐⭐⭐⭐',
    setup: 'Medium',
    bestFor: 'GCP users, Gemini models',
  },
  {
    name: 'Bedrock',
    cost: '$0.00025',
    latency: '70-130ms',
    accuracy: '⭐⭐⭐⭐⭐',
    setup: 'Medium',
    bestFor: 'AWS users, Claude on AWS',
  },
];

console.log('┌────────────┬───────────┬──────────┬──────────┬────────┬─────────────────────────┐');
console.log('│ Provider   │ Cost      │ Latency  │ Accuracy │ Setup  │ Best For                │');
console.log('├────────────┼───────────┼──────────┼──────────┼────────┼─────────────────────────┤');

for (const p of providers) {
  const row = [
    p.name.padEnd(10),
    p.cost.padEnd(9),
    p.latency.padEnd(8),
    p.accuracy.padEnd(8),
    p.setup.padEnd(6),
    p.bestFor.padEnd(23),
  ];
  console.log(`│ ${row.join(' │ ')} │`);
}

console.log('└────────────┴───────────┴──────────┴──────────┴────────┴─────────────────────────┘');

// ============================================================================
// Recommendations
// ============================================================================

console.log('\n\n🎯 Recommendations');
console.log('==================\n');

console.log('🥇 **Best overall**: Anthropic Claude');
console.log('   • Excellent accuracy');
console.log('   • Fast and cheap');
console.log('   • Easy setup');
console.log('   • Great for most use cases\n');

console.log('🥈 **Runner-up**: Google Vertex AI');
console.log('   • Cheapest option ($0.00015/check)');
console.log('   • Good accuracy');
console.log('   • Perfect if you\'re on GCP\n');

console.log('🥉 **Multi-provider**: LiteLLM');
console.log('   • 100+ models to choose from');
console.log('   • Switch providers easily');
console.log('   • Great for experimentation\n');

console.log('☁️  **Cloud-specific**:');
console.log('   • AWS users → AWS Bedrock');
console.log('   • GCP users → Google Vertex AI');
console.log('   • Azure users → LiteLLM (supports Azure OpenAI)\n');

// ============================================================================
// Advanced Configuration
// ============================================================================

console.log('\n\n⚙️  Advanced Configuration');
console.log('==========================\n');

console.log('All providers support the same advanced features:\n');

console.log('Code:');
console.log(`
const engine = new GuardrailEngine({
  guards: ['injection', 'pii', 'secrets'],
  level: 'advanced',

  llm: {
    enabled: true,
    provider: yourProvider, // Any of the 5 providers!

    // Smart escalation
    escalation: {
      l1Threshold: 0.9,
      l2Threshold: 0.85,
      onlyIfSuspicious: true,
    },

    // Caching (40% cost savings!)
    cache: {
      enabled: true,
      ttl: 300000, // 5 minutes
      maxSize: 10000,
    },

    // Budget limits
    budget: {
      maxCallsPerSession: 1000,
      maxCostPerSession: 0.50,
      maxCostPerDay: 10.00,
      alertThreshold: 0.8,
      onBudgetExceeded: 'warn',
    },

    // Fallback behavior
    fallback: {
      onTimeout: 'use-l2',
      onError: 'use-l2',
    },
  },
});
`);

console.log('\n✨ All these features work with any provider!');
console.log('You can switch providers without changing your configuration.\n');

// ============================================================================
// Quick Start Guide
// ============================================================================

console.log('\n\n🚀 Quick Start Guide');
console.log('====================\n');

console.log('1. Choose a provider (we recommend Anthropic)');
console.log('2. Install the dependency:');
console.log('   npm install @anthropic-ai/sdk\n');

console.log('3. Set your API key:');
console.log('   export ANTHROPIC_API_KEY=your-key-here\n');

console.log('4. Create your engine:');
console.log(`
import { GuardrailEngine } from '@llm-guardrails/core';
import { AnthropicLLMProvider } from '@llm-guardrails/core/llm';
import Anthropic from '@anthropic-ai/sdk';

const provider = new AnthropicLLMProvider({
  client: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
});

const engine = new GuardrailEngine({
  guards: ['injection', 'pii'],
  level: 'advanced',
  llm: {
    enabled: true,
    provider,
    cache: { enabled: true, ttl: 300000, maxSize: 10000 },
    budget: { maxCostPerDay: 10.00, onBudgetExceeded: 'warn' },
  },
});
`);

console.log('5. Use it:');
console.log(`
const result = await engine.checkInput('Your input here');
if (result.blocked) {
  console.log('Blocked:', result.reason);
} else {
  console.log('Passed!');
}
`);

console.log('\n✅ That\'s it! You now have L3 LLM validation enabled.');

console.log('\n\n📚 Learn More');
console.log('==============\n');

console.log('• Full L3 Guide: docs/L3-LLM-VALIDATION.md');
console.log('• API Reference: docs/API.md');
console.log('• Examples: packages/core/examples/');
console.log('• GitHub: https://github.com/llm-guardrails/llm-guardrails');

console.log('\n🎉 Happy guardrailing!');
