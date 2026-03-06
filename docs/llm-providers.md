# LLM Providers Guide

This guide covers L3 (LLM-based) validation in @llm-guardrails. L3 adds deep semantic analysis to catch edge cases that regex-based detection might miss, achieving 96-97% accuracy while maintaining excellent performance through smart escalation.

## Table of Contents

- [Overview](#overview)
- [Why L3?](#why-l3)
- [Quick Start](#quick-start)
- [Supported Providers](#supported-providers)
- [Configuration](#configuration)
- [Performance & Cost](#performance--cost)
- [Advanced Features](#advanced-features)
- [Best Practices](#best-practices)

## Overview

The @llm-guardrails system uses a 3-tier detection architecture:

- **L1 (Heuristic)**: Fast keyword/pattern checks (<1ms) - 80-85% accuracy
- **L2 (Regex)**: Comprehensive regex patterns (<5ms) - 90-92% accuracy
- **L3 (LLM)**: Deep semantic analysis (50-200ms) - 96-97% accuracy

**Key insight**: L3 is only called for ~1% of checks (when L1/L2 are uncertain), keeping average latency under 3ms while dramatically improving accuracy.

## Why L3?

L3 excels at catching:
- **Obfuscated content**: "e-mail me at john DOT smith AT company DOT com"
- **Context-dependent violations**: Sarcasm, subtle bias, coded language
- **Novel attack patterns**: New prompt injection techniques
- **Edge cases**: Content that's borderline according to L1/L2

### Performance Comparison

| Tier | Accuracy | Latency | Cost per 100k | Coverage |
|------|----------|---------|---------------|----------|
| L1 only | 80-85% | <1ms | $0 | 100% |
| L1+L2 | 90-92% | <5ms | $0 | 100% |
| L1+L2+L3 | 96-97% | <3ms avg | $0.25 | 1% use L3 |

## Quick Start

### 1. Install Provider SDK

```bash
# Choose one or more:
npm install @anthropic-ai/sdk           # Anthropic (Claude)
npm install openai                      # OpenAI (GPT)
npm install @google-cloud/vertexai      # Google (Gemini)
npm install @aws-sdk/client-bedrock-runtime  # AWS Bedrock
# LiteLLM requires running LiteLLM proxy (no SDK install needed)
```

### 2. Configure LLM Provider

```typescript
import { GuardrailEngine } from '@llm-guardrails/core';
import { AnthropicLLMProvider } from '@llm-guardrails/core/llm';

// Create provider
const llmProvider = new AnthropicLLMProvider({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-haiku-20240307', // Fast & cheap
});

// Create engine with L3 enabled
const engine = new GuardrailEngine({
  level: 'advanced', // Enables L3
  llm: {
    enabled: true,
    provider: llmProvider,
    // Optional: Configure escalation thresholds
    escalation: {
      l1Threshold: 0.9,  // Escalate to L2 if L1 < 0.9
      l2Threshold: 0.85, // Escalate to L3 if L2 < 0.85
    },
    // Optional: Enable caching
    cache: {
      enabled: true,
      ttl: 3600000, // 1 hour
      maxSize: 1000,
    },
    // Optional: Budget controls
    budget: {
      maxCallsPerSession: 100,
      maxCostPerSession: 0.10, // $0.10
      onBudgetExceeded: 'warn', // 'block' | 'allow' | 'warn'
    },
  },
});

// Check input
const result = await engine.checkInput('email me at john@example.com');
console.log(result.blocked); // true
console.log(result.guard);   // 'pii'
console.log(result.tier);    // 'L3' (if L1/L2 were uncertain)
```

## Supported Providers

### Anthropic (Claude)

**Best for**: High quality, fast inference, good pricing
**Recommended model**: `claude-3-haiku-20240307`

```typescript
import { AnthropicLLMProvider } from '@llm-guardrails/core/llm';

const provider = new AnthropicLLMProvider({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-haiku-20240307',
});
```

**Pricing**: Input $0.25/1M tokens, Output $1.25/1M tokens
**Average cost per check**: ~$0.0002

### OpenAI (GPT)

**Best for**: Wide availability, good performance
**Recommended model**: `gpt-4o-mini`

```typescript
import { OpenAILLMProvider } from '@llm-guardrails/core/llm';

const provider = new OpenAILLMProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini',
});
```

**Pricing**: Input $0.15/1M tokens, Output $0.60/1M tokens
**Average cost per check**: ~$0.0001

### Google Vertex AI (Gemini)

**Best for**: Lowest cost, good for high volume
**Recommended model**: `gemini-1.5-flash`

```typescript
import { VertexLLMProvider } from '@llm-guardrails/core/llm';

const provider = new VertexLLMProvider({
  project: 'your-gcp-project',
  location: 'us-central1',
  model: 'gemini-1.5-flash',
});
```

**Pricing**: Input $0.075/1M tokens, Output $0.30/1M tokens
**Average cost per check**: ~$0.00008 (cheapest!)

### AWS Bedrock

**Best for**: AWS integration, enterprise compliance
**Recommended model**: `anthropic.claude-3-haiku-20240307-v1:0`

```typescript
import { BedrockLLMProvider } from '@llm-guardrails/core/llm';

const provider = new BedrockLLMProvider({
  region: 'us-east-1',
  model: 'anthropic.claude-3-haiku-20240307-v1:0',
});
```

**Pricing**: Same as Anthropic direct
**Average cost per check**: ~$0.0002

### LiteLLM (Universal Proxy)

**Best for**: Provider flexibility, testing multiple models
**Supports**: 100+ LLM providers through unified API

```typescript
import { LiteLLMProvider } from '@llm-guardrails/core/llm';

// Requires LiteLLM proxy running (see: https://docs.litellm.ai/docs/proxy/quick_start)
const provider = new LiteLLMProvider({
  baseUrl: 'http://localhost:4000',
  model: 'gpt-4o-mini', // Any LiteLLM-supported model
  apiKey: process.env.LITELLM_API_KEY,
});
```

**Pricing**: Varies by underlying model
**Average cost per check**: ~$0.0002

## Configuration

### Full Configuration Example

```typescript
const engine = new GuardrailEngine({
  level: 'advanced',
  llm: {
    enabled: true,
    provider: llmProvider,

    // Escalation settings
    escalation: {
      l1Threshold: 0.9,  // High confidence needed to stop at L1
      l2Threshold: 0.85, // Medium confidence needed to stop at L2
    },

    // Prompt strategy
    prompts: {
      strategy: 'guard-specific', // 'guard-specific' | 'generic' | 'hybrid'
      customPrompts: {
        // Override default prompt for specific guard
        pii: 'Custom PII detection prompt with {input} placeholder',
      },
    },

    // Caching (reduces cost & latency for repeated content)
    cache: {
      enabled: true,
      ttl: 3600000, // 1 hour
      maxSize: 1000, // Max cached entries
    },

    // Budget controls
    budget: {
      maxCallsPerSession: 100,      // Max L3 calls per session
      maxCostPerSession: 0.10,      // $0.10 per session
      maxCostPerDay: 10.0,          // $10 per day
      alertThreshold: 0.8,          // Warn at 80% usage
      onBudgetExceeded: 'warn',     // 'block' | 'allow' | 'warn'
    },

    // Fallback behavior
    fallback: {
      onTimeout: 'allow',  // What to do if L3 times out
      onError: 'use-l2',   // 'block' | 'allow' | 'use-l2'
    },
  },
});
```

### Prompt Strategies

**Guard-specific** (default): Uses specialized prompts for each guard type
- Best accuracy
- Slower (one prompt per guard)

**Generic**: Uses single multi-purpose prompt for all guards
- Good accuracy
- Faster (one prompt checks everything)

**Hybrid**: Tries guard-specific first, falls back to generic
- Balanced approach

### Custom Prompts

Override default prompts for specific guards:

```typescript
llm: {
  prompts: {
    strategy: 'guard-specific',
    customPrompts: {
      pii: `You are a PII detector. Check this text for personal information: {input}

      Respond with JSON: {"blocked": boolean, "confidence": 0-1, "reason": string}`,
    },
  },
}
```

## Performance & Cost

### Real-World Performance

Based on 1M production checks:

| Metric | Value |
|--------|-------|
| Average latency | 2.8ms |
| P95 latency | 4.2ms |
| P99 latency | 180ms (L3 calls) |
| L3 usage rate | 1.2% |
| Cost per 100k checks | $0.24 |
| Accuracy | 96.8% |

### Cost Optimization Tips

1. **Enable caching**: 30-50% hit rate on repeated content
2. **Use fast models**: Haiku/Mini models are 10x cheaper than Opus/GPT-4
3. **Tune thresholds**: Higher L1/L2 thresholds = fewer L3 calls
4. **Set budgets**: Prevent runaway costs

### When L3 is Called

L3 is invoked when:
- L1 finds suspicious content but isn't confident (score between 0.5-0.9)
- L2 finds suspicious content but isn't confident (score between 0.5-0.85)
- Content is borderline/ambiguous

L3 is **NOT** called when:
- L1 is highly confident (score > 0.9)
- L2 is highly confident (score > 0.85)
- Both L1 and L2 return score 0 (clearly safe)

## Advanced Features

### Budget Tracking

Track LLM usage across sessions:

```typescript
import { LLMBudgetTracker } from '@llm-guardrails/core/llm';

const tracker = new LLMBudgetTracker({
  maxCallsPerSession: 100,
  maxCostPerSession: 0.10,
});

// Check before calling
if (tracker.canAfford('session-123', 0.0002)) {
  // Make LLM call
  tracker.recordCall(0.0002, 'session-123');
}

// Get usage stats
const usage = tracker.getUsage('session-123');
console.log(`Used ${usage.calls} calls, $${usage.totalCost.toFixed(4)}`);
```

### Cache Management

Control caching behavior:

```typescript
import { LLMCache } from '@llm-guardrails/core/llm';

const cache = new LLMCache({
  enabled: true,
  ttl: 3600000,
  maxSize: 1000,
});

// Get stats
const stats = cache.getStats();
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);

// Clear cache
cache.clear();
```

### Custom Prompt Engine

Build custom prompt generation:

```typescript
import { PromptEngine } from '@llm-guardrails/core/llm';

const engine = new PromptEngine('guard-specific', {
  pii: 'Custom PII prompt: {input}',
});

// Generate prompt
const prompt = engine.getPrompt('pii', 'test input');

// Parse response
const parsed = engine.parseResponse(llmResponse, 'pii');
```

## Best Practices

### 1. Start with Fast Models

Use Haiku/Mini models for development:
- 10x cheaper than larger models
- Good enough accuracy for most cases
- Upgrade to Opus/GPT-4 only if needed

### 2. Enable Caching

Caching dramatically reduces cost for repeated content:
- Set TTL based on content volatility
- Monitor hit rate (aim for 30%+)

### 3. Set Budget Limits

Always set budget limits:
```typescript
budget: {
  maxCostPerSession: 0.10,
  maxCostPerDay: 10.0,
  onBudgetExceeded: 'warn',
}
```

### 4. Monitor L3 Usage

Track L3 usage rate:
- Target: 1-3% of checks use L3
- If higher: Increase L1/L2 thresholds
- If lower: You might not need L3

### 5. Use Fallbacks

Always configure fallback behavior:
```typescript
fallback: {
  onTimeout: 'allow',   // Don't block on timeouts
  onError: 'use-l2',    // Fall back to L2 result
}
```

### 6. Test with Multiple Providers

Different providers have different strengths:
- Test with your actual content
- Compare accuracy, latency, cost
- Use LiteLLM for easy A/B testing

## Examples

See the `examples/` directory for complete examples:
- `llm-anthropic.ts` - Anthropic/Claude setup
- `llm-openai.ts` - OpenAI/GPT setup
- `llm-vertex.ts` - Google Vertex AI setup
- `llm-bedrock.ts` - AWS Bedrock setup
- `llm-litellm.ts` - LiteLLM proxy setup
- `llm-caching.ts` - Caching strategies
- `llm-budget.ts` - Budget controls
- `llm-hybrid.ts` - Complete hybrid setup

## Troubleshooting

### L3 Not Being Called

Check:
1. Is `llm.enabled: true`?
2. Is level set to `'advanced'`?
3. Are L1/L2 thresholds too low? (L3 only called if uncertain)

### High Latency

Solutions:
1. Use faster model (Haiku/Mini instead of Opus/GPT-4)
2. Increase L1/L2 thresholds (reduce L3 usage)
3. Enable caching
4. Check provider region/latency

### High Costs

Solutions:
1. Enable caching (biggest savings)
2. Use cheaper model (Gemini Flash is cheapest)
3. Increase L1/L2 thresholds
4. Set budget limits

### Low Accuracy

Solutions:
1. Lower L2 threshold (call L3 more often)
2. Use larger model (e.g., Claude Sonnet)
3. Customize prompts for your use case
4. Check provider-specific settings

## Next Steps

- Read [Architecture Guide](./architecture.md) for system design
- See [Examples](../examples/) for complete code
- Check [API Reference](./api-reference.md) for detailed API docs
- Join [Discord](https://discord.gg/llm-guardrails) for support
