/**
 * Example 7: All Gateway Adapters
 *
 * Comprehensive demonstration of all 6 gateway adapters with
 * zero-config auto-detection.
 */

import { Guardrails } from '../src/adapters/Guardrails';
import {
  AnthropicAdapter,
  OpenAIAdapter,
  GeminiAdapter,
  LiteLLMAdapter,
  PortkeyAdapter,
  MastraAdapter,
} from '../src/adapters';

console.log('=== Gateway Adapters Demo ===\n');

// List all supported adapters
console.log('Supported Adapters:');
const adapters = Guardrails.getAdapters();
adapters.forEach((adapter, i) => {
  console.log(`  ${i + 1}. ${adapter}`);
});
console.log('');

// Example 1: Anthropic (auto-detect)
console.log('1. Anthropic Adapter');
const anthropicClient = {
  messages: { create: async () => ({}) },
  constructor: { name: 'Anthropic' },
};
const detected1 = Guardrails.detect(anthropicClient);
console.log(`   ✓ Auto-detected: ${detected1}\n`);

// Example 2: OpenAI (auto-detect)
console.log('2. OpenAI Adapter');
const openaiClient = {
  chat: { completions: { create: async () => ({}) } },
  baseURL: 'https://api.openai.com/v1',
  constructor: { name: 'OpenAI' },
};
const detected2 = Guardrails.detect(openaiClient);
console.log(`   ✓ Auto-detected: ${detected2}\n`);

// Example 3: Gemini (auto-detect)
console.log('3. Gemini Adapter');
const geminiClient = {
  generateContent: async () => ({}),
  startChat: () => ({}),
  constructor: { name: 'GenerativeModel' },
};
const detected3 = Guardrails.detect(geminiClient);
console.log(`   ✓ Auto-detected: ${detected3}\n`);

// Example 4: LiteLLM (auto-detect)
console.log('4. LiteLLM Adapter');
const litellmClient = {
  completion: async () => ({}),
  acompletion: async () => ({}),
  addMiddleware: () => {},
  constructor: { name: 'LiteLLM' },
};
const detected4 = Guardrails.detect(litellmClient);
console.log(`   ✓ Auto-detected: ${detected4}\n`);

// Example 5: Portkey (auto-detect)
console.log('5. Portkey Adapter');
const portkeyClient = {
  chat: { completions: { create: async () => ({}) } },
  completions: { create: async () => ({}) },
  constructor: { name: 'Portkey' },
};
const detected5 = Guardrails.detect(portkeyClient);
console.log(`   ✓ Auto-detected: ${detected5}\n`);

// Example 6: Mastra (auto-detect)
console.log('6. Mastra Adapter');
const mastraClient = {
  generate: async () => ({}),
  stream: async function* () {
    yield {};
  },
  tools: [],
  systemPrompt: 'You are a helpful assistant',
  constructor: { name: 'Agent' },
};
const detected6 = Guardrails.detect(mastraClient);
console.log(`   ✓ Auto-detected: ${detected6}\n`);

// Example 7: Manual adapter selection
console.log('7. Manual Adapter Selection');
const customClient = {
  messages: { create: async () => ({}) },
  constructor: { name: 'CustomClient' },
};

// Use specific adapter instead of auto-detect
const guarded = Guardrails.wrap(
  customClient,
  new AnthropicAdapter(),
  {
    guards: ['pii', 'injection'],
  }
);
console.log('   ✓ Manually wrapped with AnthropicAdapter\n');

// Example 8: Production configuration
console.log('8. Production Configuration (all features)');
const productionClient = Guardrails.auto(anthropicClient, {
  // Content guards
  guards: [
    'pii',
    'injection',
    'secrets',
    'toxicity',
    'leakage',
    'hate-speech',
    'bias',
  ],

  // Behavioral analysis
  behavioral: {
    enabled: true,
    patterns: [
      'file-exfiltration',
      'credential-theft',
      'escalation-attempts',
      'data-exfil-via-code',
    ],
    storage: 'memory',
  },

  // Budget controls
  budget: {
    maxTokensPerSession: 100000,
    maxCostPerSession: 10.0, // $10 limit
    maxCostPerUser: 50.0, // $50 per user
    trackGuardrailCosts: true,
    alertThreshold: 0.8, // Alert at 80%
  },

  // Adapter configuration
  onBlockedInput: 'throw',
  onBlockedOutput: 'sanitize',
  streamChecking: true,
  streamCheckInterval: {
    chunks: 10,
    characters: 500,
  },

  // Callbacks
  onBlock: (result) => {
    console.log(`   [BLOCKED] ${result.guard}: ${result.reason}`);
  },
  onWarn: (result) => {
    console.log(`   [WARN] ${result.guard}: ${result.reason}`);
  },
});

console.log('   ✓ Production client configured with all features\n');

// Example 9: Adapter comparison
console.log('9. Adapter Comparison\n');

interface AdapterFeature {
  adapter: string;
  streaming: boolean;
  middleware: boolean;
  multiModel: boolean;
  notes: string;
}

const features: AdapterFeature[] = [
  {
    adapter: 'Anthropic',
    streaming: true,
    middleware: false,
    multiModel: false,
    notes: 'Native SDK wrapper with proxy pattern',
  },
  {
    adapter: 'OpenAI',
    streaming: true,
    middleware: false,
    multiModel: false,
    notes: 'Native SDK wrapper with proxy pattern',
  },
  {
    adapter: 'Gemini',
    streaming: true,
    middleware: false,
    multiModel: false,
    notes: 'Supports 3 client types (SDK, Model, Chat)',
  },
  {
    adapter: 'LiteLLM',
    streaming: true,
    middleware: true,
    multiModel: true,
    notes: 'Native middleware support (preferred)',
  },
  {
    adapter: 'Portkey',
    streaming: true,
    middleware: false,
    multiModel: true,
    notes: 'OpenAI-compatible with routing',
  },
  {
    adapter: 'Mastra',
    streaming: true,
    middleware: false,
    multiModel: false,
    notes: 'Agent and LLM wrapper support',
  },
];

console.log('   Adapter          Stream  Middleware  Multi-Model');
console.log('   ───────────────  ──────  ──────────  ───────────');
features.forEach((f) => {
  const check = (val: boolean) => (val ? '✓' : '✗');
  console.log(
    `   ${f.adapter.padEnd(16)} ${check(f.streaming).padEnd(8)}${check(f.middleware).padEnd(12)}${check(f.multiModel)}`
  );
});

console.log('\n   Notes:');
features.forEach((f, i) => {
  console.log(`   ${i + 1}. ${f.adapter}: ${f.notes}`);
});

console.log('\n=== Demo Complete ===');

// Example 10: Integration patterns
function integrationPatterns() {
  console.log('\n=== Integration Patterns ===\n');

  // Pattern 1: Zero-config (recommended)
  console.log('Pattern 1: Zero-config');
  console.log('```typescript');
  console.log('import { Guardrails } from "@openclaw-guardrails/core";');
  console.log('const guarded = Guardrails.auto(client);');
  console.log('```\n');

  // Pattern 2: With configuration
  console.log('Pattern 2: With configuration');
  console.log('```typescript');
  console.log('const guarded = Guardrails.auto(client, {');
  console.log('  guards: ["pii", "injection"],');
  console.log('  behavioral: true,');
  console.log('  budget: { maxCostPerSession: 1.0 }');
  console.log('});');
  console.log('```\n');

  // Pattern 3: Manual adapter
  console.log('Pattern 3: Manual adapter selection');
  console.log('```typescript');
  console.log('import { Guardrails, AnthropicAdapter } from "@openclaw-guardrails/core";');
  console.log('const guarded = Guardrails.wrap(client, new AnthropicAdapter());');
  console.log('```\n');

  // Pattern 4: Standalone engine
  console.log('Pattern 4: Standalone engine (no adapter)');
  console.log('```typescript');
  console.log('const engine = Guardrails.engine({ guards: ["pii"] });');
  console.log('const result = await engine.checkInput(userMessage);');
  console.log('if (result.blocked) throw new Error(result.reason);');
  console.log('```\n');
}

integrationPatterns();
