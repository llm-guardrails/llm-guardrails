# @llm-guardrails/openai

OpenAI SDK integration with LLM guardrails. Drop-in replacement for OpenAI SDK with built-in safety, content moderation, and attack prevention.

[![npm version](https://img.shields.io/npm/v/@llm-guardrails/openai.svg)](https://www.npmjs.com/package/@llm-guardrails/openai)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🛡️ **Drop-in Replacement** - Works exactly like OpenAI SDK
- 🚫 **Automatic Blocking** - Prevents prompt injection, PII leaks, toxic content
- ⚡ **High Performance** - <1ms average latency with caching
- 📊 **Observability** - Built-in metrics, logging, and tracing
- 🎯 **10 Built-in Guards** - Injection, PII, Toxicity, Hate Speech, and more
- 💰 **Cost Effective** - Caching reduces redundant API calls
- 🔄 **Streaming Support** - Works with streaming responses
- 🎨 **Customizable** - Configure guards, thresholds, and behaviors

## 📦 Installation

```bash
npm install @llm-guardrails/openai openai
# or
yarn add @llm-guardrails/openai openai
# or
pnpm add @llm-guardrails/openai openai
```

## 🚀 Quick Start

Replace `OpenAI` with `GuardedOpenAI` - that's it!

```typescript
import { GuardedOpenAI } from '@llm-guardrails/openai';

// Create client (same API as OpenAI)
const openai = new GuardedOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  guardrails: {
    guards: ['injection', 'pii', 'toxicity'],
    level: 'standard',
  },
});

// Use exactly like OpenAI SDK
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(response.choices[0].message.content);
```

### What Just Happened?

Your request was automatically checked for:
- ✅ Prompt injection attempts
- ✅ PII leaks (emails, SSNs, phone numbers)
- ✅ Toxic or harmful content
- ✅ And 7 other security threats

If any violation is detected, the request is blocked **before** calling OpenAI.

## 📖 Usage Examples

### Example 1: Basic Usage

```typescript
import { GuardedOpenAI, GuardrailBlockError } from '@llm-guardrails/openai';

const openai = new GuardedOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  guardrails: {
    guards: ['injection', 'pii', 'toxicity'],
  },
});

try {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'user', content: 'What is the capital of France?' },
    ],
  });

  console.log(response.choices[0].message.content);
} catch (error) {
  if (error instanceof GuardrailBlockError) {
    console.log('Blocked:', error.result.reason);
  }
}
```

### Example 2: Custom Block Handler

```typescript
const openai = new GuardedOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
const stream = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Tell me a story' }],
  stream: true,
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content || '';
  process.stdout.write(content);
}
```

### Example 4: Performance Optimization

```typescript
const openai = new GuardedOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello' }],
});

// This check hits the cache - instant!
await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello' }],
});

const stats = openai.getCacheStats();
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
```

### Example 5: Observability

```typescript
const openai = new GuardedOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
  const metrics = openai.getGuardrailEngine().exportPrometheus();
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});
```

### Example 6: Check Output Only

```typescript
// Only check LLM output, not user input
const openai = new GuardedOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  guardrails: {
    guards: ['toxicity', 'hate-speech', 'bias'],
  },
  checkInput: false,  // Skip input checking
  checkOutput: true,  // Only check LLM output
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
const openai = new GuardedOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
  checkOutput: true,  // Check LLM output
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

### GuardedOpenAI

Extends `OpenAI` class with guardrails.

```typescript
class GuardedOpenAI extends OpenAI {
  constructor(config: GuardedOpenAIConfig);

  // Same as OpenAI SDK
  chat.completions.create(params): Promise<ChatCompletion>;

  // Additional methods
  getGuardrailEngine(): GuardrailEngine;
  getCacheStats(): CacheStats | undefined;
  getObservabilityStats(): ObservabilityStats | undefined;
  clearCache(): void;
}
```

### GuardrailBlockError

Error thrown when request is blocked.

```typescript
class GuardrailBlockError extends Error {
  result: GuardrailResult;  // Violation details
  messages: ChatCompletionMessageParam[];  // Blocked messages
}
```

## 🎯 Best Practices

### 1. Always Enable Critical Guards

```typescript
const openai = new GuardedOpenAI({
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
const openai = new GuardedOpenAI({
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
const openai = new GuardedOpenAI({
  guardrails: {
    observability: {
      metrics: { enabled: true, provider: 'prometheus' },
      logging: { enabled: true, destination: 'file', filePath: './logs/guardrails.log' },
    },
  },
});

// Monitor your guardrails
setInterval(() => {
  const stats = openai.getCacheStats();
  console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
}, 60000);
```

### 4. Handle Blocks Gracefully

```typescript
try {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: userMessages,
  });
  return response.choices[0].message.content;
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
const openai = new GuardedOpenAI({...});
const engine = openai.getGuardrailEngine();

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
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: '...' });
```

**After:**
```typescript
import { GuardedOpenAI } from '@llm-guardrails/openai';
const openai = new GuardedOpenAI({
  apiKey: '...',
  guardrails: { guards: ['injection', 'pii'] }
});
```

Everything else stays the same!

## 📈 Performance

- **Latency**: <1ms average with standard level
- **Cache hit rate**: 30-50% typical (for repeated content)
- **Overhead**: ~0.5ms added to each request
- **Throughput**: No impact on OpenAI API calls

## 🐛 Troubleshooting

### Issue: TypeScript errors

**Solution**: Ensure `openai` and `@llm-guardrails/core` are installed:
```bash
npm install openai @llm-guardrails/core
```

### Issue: "Module not found"

**Solution**: Make sure peer dependencies are installed:
```bash
npm install openai@^4.0.0
```

### Issue: Too many false positives

**Solution**: Adjust detection level or disable specific guards:
```typescript
const openai = new GuardedOpenAI({
  guardrails: {
    level: 'basic',  // Less strict
    guards: ['injection', 'secrets'], // Only critical guards
  },
});
```

## 📄 License

MIT © LLM Guardrails Team

## 🔗 Links

- [Core Package](https://www.npmjs.com/package/@llm-guardrails/core)
- [GitHub Repository](https://github.com/llm-guardrails/llm-guardrails)
- [Documentation](https://github.com/llm-guardrails/llm-guardrails#readme)
- [OpenAI SDK](https://github.com/openai/openai-node)

## 🙏 Contributing

Contributions welcome! Please read our contributing guide.

---

**Made with ❤️ for safer AI applications**
