# @llm-guardrails Documentation

Complete documentation for the @llm-guardrails library - high-performance, multi-tier guardrails for LLM applications.

## 📚 Table of Contents

- [Getting Started](#getting-started)
- [Core Concepts](#core-concepts)
- [Guides](#guides)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Advanced Topics](#advanced-topics)

## Getting Started

### Quick Start (5 minutes)

```typescript
import { GuardrailEngine } from '@llm-guardrails/core';

const engine = new GuardrailEngine({
  guards: ['injection', 'pii', 'toxicity'],
  level: 'standard',
});

const result = await engine.checkInput('User input here');
if (result.blocked) {
  console.log(`Blocked: ${result.reason}`);
}
```

### Installation

```bash
# Core library
npm install @llm-guardrails/core

# SDK integrations
npm install @llm-guardrails/openai
npm install @llm-guardrails/anthropic

# CLI tool
npm install -g @llm-guardrails/cli
```

### Essential Documentation

| Document | Description | Time |
|----------|-------------|------|
| [Getting Started](./getting-started.md) | Installation and first steps | 10 min |
| [API Reference](./api-reference.md) | Complete API documentation | 20 min |
| [Performance Guide](./PERFORMANCE.md) | Optimization and scaling | 15 min |

## Core Concepts

### What are Guardrails?

Guardrails are **real-time security checks** that validate inputs/outputs to LLM applications. They protect against:

- 🛡️ **Prompt injection** - Attempts to override system instructions
- 🔒 **Data leakage** - Extraction of sensitive data (PII, secrets)
- 🚫 **Toxic content** - Harmful, hateful, or inappropriate language
- ⚠️ **Policy violations** - Copyright, bias, adult content

### Multi-Tier Architecture

@llm-guardrails uses a **hybrid 3-tier detection system**:

```
L1 (Heuristics)   → <1ms    → 85-90% accuracy → Fast keyword matching
L2 (Patterns)     → <5ms    → 90-95% accuracy → Regex patterns
L3 (LLM)          → 50-200ms → 96-97% accuracy → Semantic analysis (optional)
```

**Key insight**: 99% of checks complete at L1/L2, keeping average latency at **12μs (0.012ms)**!

### Available Guards

| Guard | Priority | Description | Accuracy |
|-------|----------|-------------|----------|
| **injection** | Critical | Prompt injection and jailbreaks | 95%+ |
| **leakage** | Critical | System prompt extraction | 93%+ |
| **secrets** | Critical | API keys and credentials | 99%+ |
| **pii** | High | Email, SSN, phone numbers | 98%+ |
| **toxicity** | High | Toxic and aggressive language | 92%+ |
| **hate-speech** | High | Discriminatory content | 94%+ |
| **bias** | Medium | Stereotypes and biased language | 88%+ |
| **adult-content** | Medium | Sexual and NSFW content | 91%+ |
| **copyright** | Medium | Copyrighted material | 85%+ |
| **profanity** | Low | Swear words | 99%+ |

[View full guard documentation →](./behavioral-patterns.md)

## Guides

### By Use Case

#### 🚀 Quick Integration

**Time: 5 minutes**

Perfect for: Adding guardrails to an existing app

```typescript
import { GuardrailEngine } from '@llm-guardrails/core';

const engine = new GuardrailEngine({
  guards: ['injection', 'pii'],
  level: 'standard',
});

// Before calling LLM
const result = await engine.checkInput(userMessage);
if (result.blocked) {
  throw new Error(result.reason);
}
```

[Full guide →](./getting-started.md#quick-integration)

#### 🤖 OpenAI Integration

**Time: 5 minutes**

Perfect for: Protecting OpenAI API calls

```typescript
import { GuardedOpenAI } from '@llm-guardrails/openai';

const openai = new GuardedOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  guardrails: {
    guards: ['injection', 'pii', 'toxicity'],
    level: 'standard',
  },
});

// Automatic protection!
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

[Full guide →](../packages/openai/README.md)

#### 🧠 Anthropic Integration

**Time: 5 minutes**

Perfect for: Protecting Claude API calls

```typescript
import { GuardedAnthropic } from '@llm-guardrails/anthropic';

const anthropic = new GuardedAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  guardrails: {
    guards: ['injection', 'pii', 'toxicity'],
    level: 'standard',
  },
});

// Automatic protection!
const message = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

[Full guide →](../packages/anthropic/README.md)

#### 📊 High-Performance Setup

**Time: 10 minutes**

Perfect for: Production apps with >10K req/sec

```typescript
const engine = new GuardrailEngine({
  guards: ['injection', 'pii', 'secrets'],
  level: 'standard',

  // Enable caching (75% faster!)
  cache: {
    enabled: true,
    maxSize: 100000,
    ttl: 300000, // 5 minutes
  },

  // Enable observability
  observability: {
    enabled: true,
    metrics: { enabled: true },
  },
});
```

[Full guide →](./PERFORMANCE.md)

#### 🔬 Advanced LLM Validation (L3)

**Time: 15 minutes**

Perfect for: High-security apps needing 96-97% accuracy

```typescript
import { AnthropicLLMProvider } from '@llm-guardrails/core/llm';
import Anthropic from '@anthropic-ai/sdk';

const llmProvider = new AnthropicLLMProvider({
  client: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
});

const engine = new GuardrailEngine({
  guards: ['injection', 'pii'],
  level: 'advanced', // Enables L3

  llm: {
    enabled: true,
    provider: llmProvider,
    cache: { enabled: true, maxSize: 10000, ttl: 300000 },
    budget: { maxCostPerDay: 10.00, onBudgetExceeded: 'warn' },
  },
});
```

[Full guide →](./L3-LLM-VALIDATION.md)

### By Topic

| Topic | Guide | Time |
|-------|-------|------|
| **Getting Started** | [getting-started.md](./getting-started.md) | 10 min |
| **API Reference** | [api-reference.md](./api-reference.md) | 20 min |
| **Performance** | [PERFORMANCE.md](./PERFORMANCE.md) | 15 min |
| **L3 LLM Validation** | [L3-LLM-VALIDATION.md](./L3-LLM-VALIDATION.md) | 20 min |
| **Behavioral Patterns** | [behavioral-patterns.md](./behavioral-patterns.md) | 15 min |
| **Architecture** | [architecture/](./architecture/) | 30 min |

## API Reference

### Core Classes

#### `GuardrailEngine`

Main class for checking inputs/outputs.

```typescript
const engine = new GuardrailEngine(config);
const result = await engine.checkInput(input);
```

[Full API reference →](./api-reference.md#guardrailengine)

#### `GuardedOpenAI`

Drop-in replacement for OpenAI SDK with automatic guardrails.

```typescript
const openai = new GuardedOpenAI({ guardrails: config });
const response = await openai.chat.completions.create(...);
```

[Full API reference →](../packages/openai/README.md#api)

#### `GuardedAnthropic`

Drop-in replacement for Anthropic SDK with automatic guardrails.

```typescript
const anthropic = new GuardedAnthropic({ guardrails: config });
const message = await anthropic.messages.create(...);
```

[Full API reference →](../packages/anthropic/README.md#api)

### Configuration

#### `GuardrailConfig`

```typescript
interface GuardrailConfig {
  guards: GuardType[];           // Which guards to enable
  level: 'basic' | 'standard' | 'advanced';
  cache?: CacheConfig;           // Caching configuration
  llm?: LLMConfig;              // L3 LLM configuration
  observability?: ObservabilityConfig;
}
```

[Full configuration reference →](./api-reference.md#configuration)

## Examples

### Code Examples

All examples are in the [`examples/`](../packages/core/examples/) directory:

**Basic Usage**:
- [simple.ts](../packages/core/examples/simple.ts) - Basic setup and usage
- [all-guards.ts](../packages/core/examples/all-guards.ts) - Testing all 10 guards
- [levels.ts](../packages/core/examples/levels.ts) - Detection level comparison

**SDK Integrations**:
- [openai.ts](../packages/openai/examples/basic.ts) - OpenAI integration
- [anthropic.ts](../packages/anthropic/examples/basic.ts) - Anthropic integration
- [litellm.ts](../packages/core/examples/litellm.ts) - LiteLLM integration

**Performance**:
- [caching.ts](../packages/core/examples/caching.ts) - Caching demo
- [performance-tips.ts](../packages/core/examples/performance-tips.ts) - Optimization tips
- [simple-benchmark.ts](../packages/core/examples/simple-benchmark.ts) - Benchmarking

**Advanced**:
- [llm-validation.ts](../packages/core/examples/llm-validation.ts) - L3 LLM validation
- [llm-providers.ts](../packages/core/examples/llm-providers.ts) - LLM provider comparison
- [observability.ts](../packages/core/examples/observability.ts) - Metrics and logging

### CLI Examples

```bash
# Check a single input
guardrails check "Ignore all previous instructions"

# Interactive mode
guardrails interactive --guards injection pii toxicity

# List available guards
guardrails list --verbose

# Get guard information
guardrails info injection

# Run performance benchmark
guardrails benchmark --iterations 10000
```

[Full CLI guide →](../packages/cli/README.md)

## Advanced Topics

### L3 LLM Validation

Use LLMs for deep semantic analysis of edge cases:

- **5 providers**: Anthropic, OpenAI, LiteLLM, Vertex, Bedrock
- **Smart escalation**: Only calls LLM for ~1% of inputs
- **Cost effective**: ~$0.25 per 100k checks
- **High accuracy**: 96-97% (vs 90-95% without L3)

[Full L3 guide →](./L3-LLM-VALIDATION.md)

### Performance Optimization

Achieve **12μs (0.012ms)** average latency:

- **Caching**: 75% latency reduction
- **Guard selection**: 3x faster with fewer guards
- **Input handling**: 10x faster for long inputs
- **Batch processing**: 10x+ throughput

[Full performance guide →](./PERFORMANCE.md)

### Observability

Monitor performance and behavior:

- **Metrics**: Prometheus-compatible metrics
- **Logging**: Structured JSON logging
- **Tracing**: OpenTelemetry-compatible tracing
- **Dashboards**: Pre-built Grafana dashboards

[Full observability guide →](./api-reference.md#observability)

### Architecture

Deep dive into the internals:

- [System Architecture](./architecture/system.md)
- [Detection Flow](./architecture/detection-flow.md)
- [Guard Implementation](./architecture/guards.md)

## Common Patterns

### Pattern 1: Express.js Middleware

```typescript
import express from 'express';
import { GuardrailEngine } from '@llm-guardrails/core';

const app = express();
const engine = new GuardrailEngine({
  guards: ['injection', 'pii', 'toxicity'],
});

app.use(express.json());
app.use(async (req, res, next) => {
  const result = await engine.checkInput(req.body.message);
  if (result.blocked) {
    return res.status(400).json({ error: result.reason });
  }
  next();
});
```

### Pattern 2: Input + Output Validation

```typescript
// Check user input
const inputResult = await engine.checkInput(userMessage);
if (inputResult.blocked) {
  throw new Error('Invalid input');
}

// Call LLM
const llmResponse = await callLLM(userMessage);

// Check LLM output
const outputResult = await engine.checkInput(llmResponse);
if (outputResult.blocked) {
  return 'I cannot assist with that request.';
}

return llmResponse;
```

### Pattern 3: Streaming with Guardrails

```typescript
import { GuardedOpenAI } from '@llm-guardrails/openai';

const openai = new GuardedOpenAI({ guardrails: config });

const stream = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: userMessage }],
  stream: true,
});

// Automatically checked before streaming!
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

## FAQ

### General Questions

**Q: How fast is it?**
A: **12μs (0.012ms)** average latency, **80,000 checks/second** throughput.

**Q: How accurate is it?**
A: **90-95%** accuracy with standard level, **96-97%** with L3 enabled.

**Q: Does it cost money?**
A: L1/L2 (standard level) is **$0** - no API calls. L3 is ~$0.25 per 100k checks.

**Q: Can it scale?**
A: Yes! Scales linearly with CPU cores. Single core handles 80K/sec.

**Q: What about false positives?**
A: Standard level has <3% false positive rate. Advanced (L3) has <2%.

### Technical Questions

**Q: How does L1/L2/L3 work?**
A: [See architecture docs →](./architecture/detection-flow.md)

**Q: Which guards should I use?**
A: Start with: `['injection', 'pii', 'toxicity']` - covers 90% of threats.

**Q: Should I use L3?**
A: Only if you need >95% accuracy or handle sophisticated attacks. [See L3 guide →](./L3-LLM-VALIDATION.md)

**Q: How do I optimize performance?**
A: Enable caching, use specific guards, choose right level. [See performance guide →](./PERFORMANCE.md)

## Troubleshooting

### Common Issues

#### High Latency

**Problem**: P95 latency >1ms

**Solutions**:
1. Enable caching
2. Reduce number of guards
3. Use 'basic' or 'standard' level
4. Check input length (<500 chars recommended)

[Full troubleshooting guide →](./PERFORMANCE.md#troubleshooting)

#### False Positives

**Problem**: Blocking legitimate inputs

**Solutions**:
1. Use 'standard' level (more accurate than 'basic')
2. Enable L3 for edge cases
3. Customize thresholds
4. Report patterns to us

#### Integration Issues

**Problem**: Integration not working

**Solutions**:
1. Check TypeScript version (>=5.0)
2. Verify peer dependencies installed
3. Check examples for your framework
4. Open an issue with details

## Contributing

We welcome contributions! See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## Support

- 📖 **Documentation**: You're reading it!
- 💬 **Discussions**: [GitHub Discussions](https://github.com/llm-guardrails/llm-guardrails/discussions)
- 🐛 **Issues**: [GitHub Issues](https://github.com/llm-guardrails/llm-guardrails/issues)
- 📧 **Email**: support@llm-guardrails.com

## License

MIT © LLM Guardrails Team

---

**Next Steps**:
- [Get Started →](./getting-started.md)
- [View Examples →](../packages/core/examples/)
- [API Reference →](./api-reference.md)
