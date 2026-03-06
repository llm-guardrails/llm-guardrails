# LiteLLM Integration Guide

**LiteLLM** is a universal LLM proxy that provides a unified interface to **100+ LLM providers**. With @llm-guardrails, you can use LiteLLM for L3 (LLM-based validation) to access any model through one consistent API.

## What is LiteLLM?

LiteLLM acts as a **universal proxy** that translates between different LLM providers:

```
Your App → LiteLLM → [Anthropic | OpenAI | Cohere | Azure | Bedrock | ...]
```

**Supported Providers** (100+):
- Anthropic (Claude)
- OpenAI (GPT-4, GPT-3.5)
- Google (Gemini, PaLM)
- Azure OpenAI
- AWS Bedrock
- Cohere
- Replicate
- Hugging Face
- Ollama (local models)
- Together AI
- And 90+ more!

## Why Use LiteLLM with Guardrails?

### ✅ Benefits

1. **Universal Access** - Use 100+ models with one integration
2. **Easy Switching** - Change models without code changes
3. **Cost Optimization** - Route to cheapest/fastest model
4. **Fallback Support** - Automatic failover between providers
5. **Local Models** - Use Ollama for free local validation
6. **No Vendor Lock-in** - Switch providers anytime

## Setup

### 1. Install LiteLLM

```bash
pip install litellm[proxy]
```

### 2. Start LiteLLM Proxy

#### Option A: Simple (Single Model)

```bash
# Use Claude Haiku (fast & cheap)
export ANTHROPIC_API_KEY=sk-...
litellm --model claude-3-haiku-20240307

# Or OpenAI
export OPENAI_API_KEY=sk-...
litellm --model gpt-4o-mini

# Or local Ollama
litellm --model ollama/llama3
```

#### Option B: Advanced (Multiple Models)

Create `litellm_config.yaml`:

```yaml
model_list:
  # Fast & cheap for most checks
  - model_name: fast
    litellm_params:
      model: claude-3-haiku-20240307
      api_key: os.environ/ANTHROPIC_API_KEY

  # High accuracy for critical checks
  - model_name: accurate
    litellm_params:
      model: claude-3-5-sonnet-20241022
      api_key: os.environ/ANTHROPIC_API_KEY

  # Local fallback (free!)
  - model_name: local
    litellm_params:
      model: ollama/llama3

  # Azure OpenAI
  - model_name: azure
    litellm_params:
      model: azure/gpt-4o-mini
      api_base: os.environ/AZURE_API_BASE
      api_key: os.environ/AZURE_API_KEY
```

Start with config:

```bash
litellm --config litellm_config.yaml --port 4000
```

### 3. Install Guardrails

```bash
npm install @llm-guardrails/core
```

## Usage Examples

### Example 1: Basic LiteLLM Integration

```typescript
import { GuardrailEngine } from '@llm-guardrails/core';
import { LiteLLMProvider } from '@llm-guardrails/core/llm';

// Create LiteLLM provider
const litellmProvider = new LiteLLMProvider({
  baseUrl: 'http://localhost:4000',
  model: 'claude-3-haiku-20240307', // Or any LiteLLM model
});

// Create engine with L3 enabled
const engine = new GuardrailEngine({
  guards: ['injection', 'pii', 'toxicity'],
  level: 'advanced', // Enables L3

  llm: {
    enabled: true,
    provider: litellmProvider,

    // Smart escalation - only use LLM for edge cases
    escalation: {
      onlyIfSuspicious: true, // Only call LLM if L1/L2 uncertain
    },

    // Cache responses to save costs
    cache: {
      enabled: true,
      maxSize: 10000,
      ttl: 300000, // 5 minutes
    },
  },
});

// Use it!
const result = await engine.checkInput('User input here');
if (result.blocked) {
  console.log(`Blocked by ${result.guard}: ${result.reason}`);
}
```

### Example 2: Multiple Models (Fast + Accurate)

```typescript
import { GuardrailEngine } from '@llm-guardrails/core';
import { LiteLLMProvider } from '@llm-guardrails/core/llm';

// Fast model for standard checks
const fastProvider = new LiteLLMProvider({
  baseUrl: 'http://localhost:4000',
  model: 'fast', // Maps to claude-3-haiku in config
});

// Accurate model for critical checks
const accurateProvider = new LiteLLMProvider({
  baseUrl: 'http://localhost:4000',
  model: 'accurate', // Maps to claude-3-5-sonnet in config
});

// Standard checks - use fast model
const standardEngine = new GuardrailEngine({
  guards: ['injection', 'pii'],
  level: 'advanced',
  llm: { enabled: true, provider: fastProvider },
});

// Critical checks - use accurate model
const criticalEngine = new GuardrailEngine({
  guards: ['secrets', 'leakage'],
  level: 'advanced',
  llm: { enabled: true, provider: accurateProvider },
});

// Use appropriate engine based on context
async function checkInput(input: string, critical: boolean) {
  const engine = critical ? criticalEngine : standardEngine;
  return await engine.checkInput(input);
}
```

### Example 3: Local Models (Free!)

```typescript
import { LiteLLMProvider } from '@llm-guardrails/core/llm';

// Use Ollama for free local validation
const localProvider = new LiteLLMProvider({
  baseUrl: 'http://localhost:4000',
  model: 'ollama/llama3', // Free local model!
});

const engine = new GuardrailEngine({
  guards: ['injection', 'pii'],
  level: 'advanced',
  llm: {
    enabled: true,
    provider: localProvider,
    // No API costs! ✨
  },
});
```

### Example 4: Cost-Optimized Multi-Provider

```typescript
import { LiteLLMProvider } from '@llm-guardrails/core/llm';

// Tier 1: Free local model (95% of checks)
const localProvider = new LiteLLMProvider({
  baseUrl: 'http://localhost:4000',
  model: 'ollama/llama3',
});

// Tier 2: Cheap cloud model (4% of checks)
const cheapProvider = new LiteLLMProvider({
  baseUrl: 'http://localhost:4000',
  model: 'claude-3-haiku-20240307', // $0.00025/check
});

// Tier 3: Accurate cloud model (1% of checks)
const accurateProvider = new LiteLLMProvider({
  baseUrl: 'http://localhost:4000',
  model: 'claude-3-5-sonnet-20241022', // $0.003/check
});

// Smart routing based on confidence
async function checkWithTiers(input: string) {
  // Try local first
  const localResult = await checkWithProvider(input, localProvider);
  if (localResult.confidence > 0.9) return localResult;

  // Escalate to cheap cloud
  const cheapResult = await checkWithProvider(input, cheapProvider);
  if (cheapResult.confidence > 0.85) return cheapResult;

  // Final escalation to accurate model
  return await checkWithProvider(input, accurateProvider);
}
```

### Example 5: Azure OpenAI Integration

```typescript
import { LiteLLMProvider } from '@llm-guardrails/core/llm';

// Use Azure OpenAI through LiteLLM
const azureProvider = new LiteLLMProvider({
  baseUrl: 'http://localhost:4000',
  model: 'azure/gpt-4o-mini',
  apiKey: process.env.AZURE_API_KEY, // Optional if set in config
});

const engine = new GuardrailEngine({
  guards: ['injection', 'pii'],
  level: 'advanced',
  llm: { enabled: true, provider: azureProvider },
});
```

### Example 6: Automatic Fallback

LiteLLM config with fallback:

```yaml
model_list:
  # Primary: Claude Haiku
  - model_name: main
    litellm_params:
      model: claude-3-haiku-20240307
      api_key: os.environ/ANTHROPIC_API_KEY

  # Fallback 1: OpenAI
  - model_name: main
    litellm_params:
      model: gpt-4o-mini
      api_key: os.environ/OPENAI_API_KEY

  # Fallback 2: Local
  - model_name: main
    litellm_params:
      model: ollama/llama3

router_settings:
  routing_strategy: simple-shuffle # Try all in order
  num_retries: 2
  timeout: 5
```

```typescript
// Automatic fallback on failure!
const provider = new LiteLLMProvider({
  baseUrl: 'http://localhost:4000',
  model: 'main', // Will try all fallbacks
});
```

## Cost Comparison

| Provider | Model | Cost per Check | Speed |
|----------|-------|----------------|-------|
| **Ollama** | llama3 | **FREE** | Fast (local) |
| **Anthropic** | claude-3-haiku | $0.00025 | Very fast |
| **OpenAI** | gpt-4o-mini | $0.0003 | Fast |
| **Google** | gemini-1.5-flash | $0.00015 | Fast |
| **Azure** | gpt-4o-mini | $0.0003 | Fast |

**Recommended Strategy:**
- Use Ollama for development/testing (FREE)
- Use Claude Haiku for production (cheapest cloud)
- Use Gemini Flash if on GCP (cheapest)

## Best Practices

### 1. Use Caching Aggressively

```typescript
llm: {
  cache: {
    enabled: true,
    maxSize: 100000,  // Large cache
    ttl: 600000,      // 10 minutes
  },
}
// Saves 40-60% on costs!
```

### 2. Smart Escalation

```typescript
llm: {
  escalation: {
    onlyIfSuspicious: true,  // ✅ Only call LLM for edge cases
  },
}
// Only ~1% of inputs use LLM!
```

### 3. Budget Limits

```typescript
llm: {
  budget: {
    maxCostPerDay: 10.00,     // $10/day limit
    alertThreshold: 0.8,       // Alert at 80%
    onBudgetExceeded: 'warn',  // Degrade gracefully
  },
}
```

### 4. Local Development

```typescript
// Use free local models in development
const isDev = process.env.NODE_ENV === 'development';

const provider = new LiteLLMProvider({
  baseUrl: 'http://localhost:4000',
  model: isDev ? 'ollama/llama3' : 'claude-3-haiku-20240307',
});
```

### 5. Multi-Region Support

```yaml
# LiteLLM config with regions
model_list:
  - model_name: us
    litellm_params:
      model: claude-3-haiku-20240307
      api_base: https://api.anthropic.com

  - model_name: eu
    litellm_params:
      model: claude-3-haiku-20240307
      api_base: https://eu.anthropic.com
```

## Troubleshooting

### LiteLLM Not Starting

```bash
# Check if running
curl http://localhost:4000/health

# View logs
litellm --debug
```

### Connection Errors

```typescript
const provider = new LiteLLMProvider({
  baseUrl: 'http://localhost:4000',
  timeout: 30000, // Increase timeout
});
```

### Model Not Found

```bash
# List available models
curl http://localhost:4000/models

# Check config
litellm --config litellm_config.yaml --debug
```

## Complete Example: Production Setup

```typescript
import { GuardrailEngine } from '@llm-guardrails/core';
import { LiteLLMProvider } from '@llm-guardrails/core/llm';

// Production-ready configuration
const provider = new LiteLLMProvider({
  baseUrl: process.env.LITELLM_URL || 'http://localhost:4000',
  model: 'claude-3-haiku-20240307',
  timeout: 30000,
});

const engine = new GuardrailEngine({
  guards: ['injection', 'pii', 'secrets', 'toxicity'],
  level: 'advanced',

  llm: {
    enabled: true,
    provider,

    // Smart escalation
    escalation: {
      l1Threshold: 0.9,
      l2Threshold: 0.85,
      onlyIfSuspicious: true,
    },

    // Aggressive caching
    cache: {
      enabled: true,
      maxSize: 100000,
      ttl: 600000, // 10 minutes
    },

    // Budget protection
    budget: {
      maxCallsPerSession: 1000,
      maxCostPerSession: 0.50,
      maxCostPerDay: 50.00,
      alertThreshold: 0.8,
      onBudgetExceeded: 'warn',
    },

    // Graceful degradation
    fallback: {
      onTimeout: 'use-l2',
      onError: 'use-l2',
    },
  },

  // Observability
  observability: {
    enabled: true,
    metrics: { enabled: true },
    logging: { enabled: true },
  },
});

export { engine };
```

## Related Documentation

- [L3 LLM Validation Guide](./L3-LLM-VALIDATION.md)
- [LLM Providers Comparison](./llm-providers.md)
- [Performance Guide](./PERFORMANCE.md)
- [LiteLLM Documentation](https://docs.litellm.ai/)

## Summary

**LiteLLM with @llm-guardrails** gives you:

✅ Access to 100+ LLM providers through one interface
✅ Easy model switching without code changes
✅ Local models (Ollama) for free validation
✅ Automatic fallback and load balancing
✅ Cost optimization with tiered routing
✅ Same API as other providers (Anthropic, OpenAI)

**Perfect for:**
- Multi-cloud deployments
- Cost optimization
- Development with local models
- Avoiding vendor lock-in
- Testing different models
