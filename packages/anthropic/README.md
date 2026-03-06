# @llm-guardrails/anthropic

Anthropic SDK integration with LLM guardrails. Drop-in replacement for Anthropic SDK with built-in safety, content moderation, and attack prevention for Claude.

[![npm version](https://img.shields.io/npm/v/@llm-guardrails/anthropic.svg)](https://www.npmjs.com/package/@llm-guardrails/anthropic)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🛡️ **Drop-in Replacement** - Works exactly like Anthropic SDK
- 🚫 **Automatic Blocking** - Prevents prompt injection, PII leaks, toxic content
- ⚡ **High Performance** - <1ms average latency with caching
- 📊 **Observability** - Built-in metrics, logging, and tracing
- 🎯 **10 Built-in Guards** - Injection, PII, Toxicity, Hate Speech, and more
- 💰 **Cost Effective** - Caching reduces redundant API calls
- 🔄 **Streaming Support** - Works with streaming responses
- 🎨 **Customizable** - Configure guards, thresholds, and behaviors

## 📦 Installation

```bash
npm install @llm-guardrails/anthropic @anthropic-ai/sdk
# or
yarn add @llm-guardrails/anthropic @anthropic-ai/sdk
# or
pnpm add @llm-guardrails/anthropic @anthropic-ai/sdk
```

## 🚀 Quick Start

Replace `Anthropic` with `GuardedAnthropic` - that's it!

```typescript
import { GuardedAnthropic } from '@llm-guardrails/anthropic';

// Create client (same API as Anthropic)
const anthropic = new GuardedAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  guardrails: {
    guards: ['injection', 'pii', 'toxicity'],
    level: 'standard',
  },
});

// Use exactly like Anthropic SDK
const message = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(message.content[0].text);
```

### What Just Happened?

Your request was automatically checked for:
- ✅ Prompt injection attempts
- ✅ PII leaks (emails, SSNs, phone numbers)
- ✅ Toxic or harmful content
- ✅ And 7 other security threats

If any violation is detected, the request is blocked **before** calling Claude.

## 📖 Usage Examples

### Example 1: Basic Usage

```typescript
import { GuardedAnthropic, GuardrailBlockError } from '@llm-guardrails/anthropic';

const anthropic = new GuardedAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  guardrails: {
    guards: ['injection', 'pii', 'toxicity'],
  },
});

try {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      { role: 'user', content: 'What is the capital of France?' },
    ],
  });

  console.log(message.content[0].text);
} catch (error) {
  if (error instanceof GuardrailBlockError) {
    console.log('Blocked:', error.result.reason);
  }
}
```

### Example 2: Custom Block Handler

```typescript
const anthropic = new GuardedAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  guardrails: {
    guards: ['injection', 'pii'],
  },
  throwOnBlock: false, // Don't throw errors
  onBlock: (result, messages) => {
    // Custom handling
    console.log(`Blocked by ${result.guard}: ${result.reason}`);
    logToMonitoring(result);
    alertAdmin(result);
  },
});
```

### Example 3: Streaming Support

```typescript
const stream = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Tell me a story' }],
  stream: true,
});

for await (const event of stream) {
  if (event.type === 'content_block_delta') {
    process.stdout.write(event.delta.text);
  }
}
```

### Example 4: Multi-turn Conversations

```typescript
const conversation = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [
    { role: 'user', content: 'Hello! What can you help me with?' },
    { role: 'assistant', content: 'I can help with many things!' },
    { role: 'user', content: 'Tell me about Paris.' },
  ],
});

// All messages automatically checked for violations
```

### Example 5: Performance Optimization

```typescript
const anthropic = new GuardedAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  guardrails: {
    guards: ['injection', 'pii', 'toxicity'],
    cache: {
      enabled: true,
      maxSize: 1000,
      ttl: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Repeated checks are cached
await anthropic.messages.create({
  model: 'claude-3-5-haiku-20241022',
  max_tokens: 100,
  messages: [{ role: 'user', content: 'Hello' }],
});

// This check hits the cache - instant!
await anthropic.messages.create({
  model: 'claude-3-5-haiku-20241022',
  max_tokens: 100,
  messages: [{ role: 'user', content: 'Hello' }],
});

const stats = anthropic.getCacheStats();
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
```

### Example 6: Observability

```typescript
const anthropic = new GuardedAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  guardrails: {
    guards: ['injection', 'pii'],
    observability: {
      metrics: {
        enabled: true,
        provider: 'prometheus',
      },
      logging: {
        enabled: true,
        level: 'info',
        format: 'json',
      },
    },
  },
});

// Export metrics for Prometheus
app.get('/metrics', (req, res) => {
  const metrics = anthropic.getGuardrailEngine().exportPrometheus();
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});
```

### Example 7: Check Output Only

```typescript
// Only check Claude's output, not user input
const anthropic = new GuardedAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  guardrails: {
    guards: ['toxicity', 'hate-speech', 'bias'],
  },
  checkInput: false,  // Skip input checking
  checkOutput: true,  // Only check Claude's output
});
```

## 🛡️ Available Guards

All guards from `@llm-guardrails/core`:

| Guard | Description | Use Case |
|-------|-------------|----------|
| `injection` | Prompt injection, jailbreaks | **Critical** - Always enable |
| `leakage` | Prompt extraction attempts | **Critical** - Protects your prompts |
| `secrets` | API keys, tokens, passwords | **Critical** - Prevents credential leaks |
| `pii` | Email, SSN, phone numbers | **High priority** - Privacy protection |
| `toxicity` | Insults, profanity, aggression | **High priority** - Content moderation |
| `hate-speech` | Discrimination, slurs | **High priority** - Community safety |
| `bias` | Stereotypes, discrimination | Fairness & ethics |
| `adult-content` | Sexual/NSFW content | Content filtering |
| `copyright` | Copyrighted material | IP protection |
| `profanity` | Swear words, curse words | Family-friendly apps |

## ⚙️ Configuration

### Guard Configuration

```typescript
const anthropic = new GuardedAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  guardrails: {
    // Which guards to enable
    guards: ['injection', 'pii', 'toxicity'],

    // Detection level: 'basic' | 'standard' | 'advanced'
    level: 'standard',

    // Caching for performance
    cache: {
      enabled: true,
      maxSize: 1000,
      ttl: 5 * 60 * 1000,
    },

    // Observability
    observability: {
      metrics: { enabled: true },
      logging: { enabled: true, level: 'info' },
      tracing: { enabled: true },
    },
  },

  // Behavior configuration
  checkInput: true,   // Check user input
  checkOutput: true,  // Check Claude's output
  throwOnBlock: true, // Throw error on block

  // Custom block handler
  onBlock: (result, messages) => {
    console.log('Blocked:', result);
  },
});
```

### Detection Levels

- **`basic`**: Fast L1 heuristics only (<0.1ms)
- **`standard`**: L1 + L2 regex patterns (<1ms) - **Recommended**
- **`advanced`**: L1 + L2 + L3 LLM validation (configurable)

## 📊 API Reference

### GuardedAnthropic

Extends `Anthropic` class with guardrails.

```typescript
class GuardedAnthropic extends Anthropic {
  constructor(config: GuardedAnthropicConfig);

  // Same as Anthropic SDK
  messages.create(params): Promise<Message>;

  // Additional methods
  getGuardrailEngine(): GuardrailEngine;
  getCacheStats(): CacheStats | undefined;
  getObservabilityStats(): ObservabilityStats | undefined;
  clearCache(): void;
  isCacheEnabled(): boolean;
}
```

### GuardrailBlockError

Error thrown when request is blocked.

```typescript
class GuardrailBlockError extends Error {
  result: GuardrailResult;  // Violation details
  messages: MessageParam[];  // Blocked messages
}
```

## 🎯 Best Practices

### 1. Always Enable Critical Guards

```typescript
const anthropic = new GuardedAnthropic({
  guardrails: {
    guards: [
      'injection',  // ← Critical: Prevents prompt injection
      'leakage',    // ← Critical: Protects system prompts
      'secrets',    // ← Critical: Prevents credential leaks
      'pii',        // ← High priority
      'toxicity',   // ← High priority
    ],
  },
});
```

### 2. Enable Caching in Production

```typescript
const anthropic = new GuardedAnthropic({
  guardrails: {
    cache: {
      enabled: true,
      maxSize: 10000,      // Larger cache for production
      ttl: 15 * 60 * 1000, // 15 minutes
    },
  },
});
```

### 3. Add Observability

```typescript
const anthropic = new GuardedAnthropic({
  guardrails: {
    observability: {
      metrics: { enabled: true, provider: 'prometheus' },
      logging: { enabled: true, destination: 'file', filePath: './logs/guardrails.log' },
    },
  },
});

// Monitor your guardrails
setInterval(() => {
  const stats = anthropic.getCacheStats();
  console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
}, 60000);
```

### 4. Handle Blocks Gracefully

```typescript
try {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: userMessages,
  });
  return message.content[0].text;
} catch (error) {
  if (error instanceof GuardrailBlockError) {
    // User-friendly error message
    return "I can't help with that request. Please try something else.";
  }
  throw error;
}
```

## 🔧 Advanced Usage

### Direct Engine Access

```typescript
const anthropic = new GuardedAnthropic({...});
const engine = anthropic.getGuardrailEngine();

// Manual checking
const result = await engine.checkInput('user message');
if (result.blocked) {
  console.log('Blocked:', result.reason);
}

// Get specific guard
const guards = engine.getGuards();
console.log('Active guards:', guards.map(g => g.name));

// Add custom guard
import { Guard, GuardResult } from '@llm-guardrails/core';

class MyCustomGuard implements Guard {
  name = 'my-guard';
  async check(input: string): Promise<GuardResult> {
    // Custom logic
    return { passed: true, blocked: false };
  }
}

engine.addGuard(new MyCustomGuard());
```

## 🤝 Integration with Existing Code

Minimal changes required!

**Before:**
```typescript
import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic({ apiKey: '...' });
```

**After:**
```typescript
import { GuardedAnthropic } from '@llm-guardrails/anthropic';
const anthropic = new GuardedAnthropic({
  apiKey: '...',
  guardrails: { guards: ['injection', 'pii'] }
});
```

Everything else stays the same!

## 📈 Performance

- **Latency**: <1ms average with standard level
- **Cache hit rate**: 30-50% typical (for repeated content)
- **Overhead**: ~0.5ms added to each request
- **Throughput**: No impact on Claude API calls

## 🐛 Troubleshooting

### Issue: TypeScript errors

**Solution**: Ensure `@anthropic-ai/sdk` and `@llm-guardrails/core` are installed:
```bash
npm install @anthropic-ai/sdk @llm-guardrails/core
```

### Issue: "Module not found"

**Solution**: Make sure peer dependencies are installed:
```bash
npm install @anthropic-ai/sdk@^0.20.0
```

### Issue: Too many false positives

**Solution**: Adjust detection level or disable specific guards:
```typescript
const anthropic = new GuardedAnthropic({
  guardrails: {
    level: 'basic',  // Less strict
    guards: ['injection', 'secrets'], // Only critical guards
  },
});
```

## 🆚 Comparison with OpenAI Integration

Both `@llm-guardrails/openai` and `@llm-guardrails/anthropic` provide the same features:

| Feature | OpenAI | Anthropic |
|---------|--------|-----------|
| Drop-in replacement | ✅ | ✅ |
| All 10 guards | ✅ | ✅ |
| Streaming support | ✅ | ✅ |
| Caching | ✅ | ✅ |
| Observability | ✅ | ✅ |
| Custom handlers | ✅ | ✅ |

Use whichever SDK you prefer - the guardrails work identically!

## 📄 License

MIT © LLM Guardrails Team

## 🔗 Links

- [Core Package](https://www.npmjs.com/package/@llm-guardrails/core)
- [OpenAI Integration](https://www.npmjs.com/package/@llm-guardrails/openai)
- [GitHub Repository](https://github.com/llm-guardrails/llm-guardrails)
- [Documentation](https://github.com/llm-guardrails/llm-guardrails#readme)
- [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript)

## 🙏 Contributing

Contributions welcome! Please read our contributing guide.

---

**Made with ❤️ for safer AI applications**
