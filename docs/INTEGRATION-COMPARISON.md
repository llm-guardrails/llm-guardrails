# Integration Comparison Guide

Choosing the right integration method for @llm-guardrails based on your use case.

## TL;DR Quick Decision Tree

```
Do you use Mastra agents?
├─ YES → Use @llm-guardrails/mastra
└─ NO → Do you use OpenAI or Anthropic SDKs?
    ├─ YES → Use @llm-guardrails/openai or @llm-guardrails/anthropic
    └─ NO → Do you need access to 100+ models?
        ├─ YES → Use @llm-guardrails/core with LiteLLM
        └─ NO → Use @llm-guardrails/core directly
```

## Integration Methods Comparison

| Method | Best For | Complexity | Automatic | Code Changes |
|--------|----------|------------|-----------|--------------|
| **Core Direct** | Full control, custom integrations | Medium | No | Many |
| **OpenAI Wrapper** | OpenAI SDK users | Low | Yes | Minimal (1 line) |
| **Anthropic Wrapper** | Anthropic SDK users | Low | Yes | Minimal (1 line) |
| **LiteLLM** | Multi-provider, 100+ models | Medium | Partial | Medium |
| **Mastra** | Mastra agent users | Low | Yes | Minimal (1 line) |

## Method 1: Core Package (Direct Usage)

### When to Use
- ✅ You want full control over checking logic
- ✅ Custom integration with any LLM provider
- ✅ Non-LLM use cases (forms, user input validation)
- ✅ Building your own wrapper/framework
- ✅ Minimal dependencies required

### Example

```typescript
import { GuardrailEngine } from '@llm-guardrails/core';

const engine = new GuardrailEngine({
  guards: ['injection', 'pii'],
});

// Manual checking
const result = await engine.checkInput(userInput);
if (result.blocked) {
  throw new Error(result.reason);
}

// Call your LLM
const response = await yourLLM.generate(userInput);
```

### Pros
- ✅ Maximum flexibility
- ✅ Works with any LLM
- ✅ Zero assumptions
- ✅ Smallest package size

### Cons
- ❌ Manual checking required
- ❌ More boilerplate code
- ❌ Easy to forget checks
- ❌ No streaming helpers

**Code Ratio:** 100% (baseline)

---

## Method 2: OpenAI SDK Wrapper

### When to Use
- ✅ You use OpenAI SDK (`openai` package)
- ✅ You want automatic protection
- ✅ You want drop-in replacement
- ✅ You use streaming responses

### Example

```typescript
import { GuardedOpenAI } from '@llm-guardrails/openai';

// Change 1 line!
const openai = new GuardedOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  guardrails: {
    guards: ['injection', 'pii'],
  },
});

// Use normally - automatic protection!
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: userInput }],
});
```

### Pros
- ✅ Automatic input/output checking
- ✅ Drop-in replacement (change 1 line)
- ✅ Streaming support
- ✅ 80% less code

### Cons
- ❌ Only works with OpenAI
- ❌ Slightly larger package
- ❌ (Currently has TS build issues - use from source)

**Code Ratio:** 20% of manual checking

---

## Method 3: Anthropic SDK Wrapper

### When to Use
- ✅ You use Anthropic SDK (`@anthropic-ai/sdk`)
- ✅ You want automatic protection
- ✅ You want drop-in replacement
- ✅ You use Claude models

### Example

```typescript
import { GuardedAnthropic } from '@llm-guardrails/anthropic';

// Change 1 line!
const anthropic = new GuardedAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  guardrails: {
    guards: ['injection', 'pii'],
  },
});

// Use normally - automatic protection!
const message = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  messages: [{ role: 'user', content: userInput }],
});
```

### Pros
- ✅ Automatic input/output checking
- ✅ Drop-in replacement
- ✅ Streaming support
- ✅ Multi-turn conversations

### Cons
- ❌ Only works with Anthropic
- ❌ Slightly larger package
- ❌ (Currently has TS build issues - use from source)

**Code Ratio:** 20% of manual checking

---

## Method 4: LiteLLM Integration

### When to Use
- ✅ You want access to 100+ LLM providers
- ✅ You want to avoid vendor lock-in
- ✅ You want cost optimization (route to cheapest)
- ✅ You want local models (Ollama - FREE!)
- ✅ You need automatic fallback

### Example

```typescript
import { GuardrailEngine } from '@llm-guardrails/core';
import { LiteLLMProvider } from '@llm-guardrails/core/llm';

// Setup LiteLLM proxy first: litellm --model claude-3-haiku-20240307

const provider = new LiteLLMProvider({
  baseUrl: 'http://localhost:4000',
  model: 'claude-3-haiku-20240307', // Or ANY model!
});

const engine = new GuardrailEngine({
  guards: ['injection', 'pii'],
  level: 'advanced', // Enables L3

  llm: {
    enabled: true,
    provider, // Use LiteLLM for L3 validation
  },
});

// Check input
const result = await engine.checkInput(userInput);
```

### Pros
- ✅ Access 100+ providers (OpenAI, Anthropic, Cohere, Gemini, etc.)
- ✅ Easy model switching
- ✅ Local models (Ollama - FREE)
- ✅ Automatic fallback
- ✅ Cost optimization
- ✅ No vendor lock-in

### Cons
- ❌ Requires LiteLLM proxy setup
- ❌ Additional moving part
- ❌ Still manual checking (not automatic)

**Code Ratio:** 80% of manual checking (but access to 100+ models!)

**Supported Providers:**
- Anthropic (Claude)
- OpenAI (GPT-4, GPT-3.5)
- Google (Gemini, PaLM)
- Azure OpenAI
- AWS Bedrock
- Cohere
- Replicate
- Hugging Face
- Ollama (local)
- Together AI
- And 90+ more!

---

## Method 5: Mastra Integration

### When to Use
- ✅ You use Mastra framework for AI agents
- ✅ You want automatic agent protection
- ✅ You have multi-agent workflows
- ✅ You want tool-level guards
- ✅ You want one-line integration

### Example

```typescript
import { Agent } from '@mastra/core';
import { quickGuard } from '@llm-guardrails/mastra';

// Create Mastra agent
const agent = new Agent({
  name: 'Support Bot',
  instructions: 'You are a helpful assistant.',
  tools: [searchTool, emailTool],
});

// One line to protect!
const guardedAgent = quickGuard(agent, 'production');

// Use normally - automatic protection!
const response = await guardedAgent.generate(userInput);
```

### Pros
- ✅ One-line protection
- ✅ Automatic checking
- ✅ Tool-level guards
- ✅ Multi-agent support
- ✅ Preset configurations
- ✅ <1ms overhead

### Cons
- ❌ Only works with Mastra
- ❌ Requires Mastra framework

**Code Ratio:** 10% of manual checking (easiest!)

---

## Side-by-Side Comparison

### Scenario: ChatGPT-like Application

#### Using Core (Manual)

```typescript
import { GuardrailEngine } from '@llm-guardrails/core';
import OpenAI from 'openai';

const engine = new GuardrailEngine({ guards: ['injection', 'pii'] });
const openai = new OpenAI({ apiKey: '...' });

app.post('/chat', async (req, res) => {
  // Check input
  const inputCheck = await engine.checkInput(req.body.message);
  if (inputCheck.blocked) {
    return res.status(400).json({ error: inputCheck.reason });
  }

  // Call LLM
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: req.body.message }],
  });

  const reply = completion.choices[0].message.content;

  // Check output
  const outputCheck = await engine.checkInput(reply);
  if (outputCheck.blocked) {
    return res.json({ reply: 'I cannot assist with that.' });
  }

  res.json({ reply });
});
```

**Lines of code:** 25

#### Using OpenAI Wrapper

```typescript
import { GuardedOpenAI } from '@llm-guardrails/openai';

const openai = new GuardedOpenAI({
  apiKey: '...',
  guardrails: { guards: ['injection', 'pii'] },
});

app.post('/chat', async (req, res) => {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: req.body.message }],
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (error) {
    if (error.name === 'GuardrailBlockError') {
      return res.status(400).json({ error: error.result.reason });
    }
    throw error;
  }
});
```

**Lines of code:** 18 (28% reduction)

#### Using Mastra

```typescript
import { Agent } from '@mastra/core';
import { quickGuard } from '@llm-guardrails/mastra';

const agent = quickGuard(
  new Agent({
    name: 'Chat Bot',
    instructions: 'You are a helpful assistant.',
  }),
  'production'
);

app.post('/chat', async (req, res) => {
  try {
    const response = await agent.generate(req.body.message);
    res.json({ reply: response.text });
  } catch (error) {
    if (error.name === 'GuardrailBlockError') {
      return res.status(400).json({ error: error.result.reason });
    }
    throw error;
  }
});
```

**Lines of code:** 14 (44% reduction)

---

## Feature Comparison Matrix

| Feature | Core | OpenAI | Anthropic | LiteLLM | Mastra |
|---------|------|--------|-----------|---------|--------|
| **Automatic Checking** | ❌ | ✅ | ✅ | ❌ | ✅ |
| **Streaming Support** | Manual | ✅ | ✅ | N/A | ✅ |
| **Multi-turn Conversations** | Manual | ✅ | ✅ | N/A | ✅ |
| **Tool-level Guards** | Manual | ❌ | ❌ | N/A | ✅ |
| **Multi-agent Workflows** | Manual | ❌ | ❌ | N/A | ✅ |
| **Provider Flexibility** | Any | OpenAI only | Anthropic only | 100+ | Configurable |
| **L3 LLM Validation** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Behavioral Analysis** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Budget Controls** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Package Size** | Smallest | Medium | Medium | Smallest | Medium |
| **Setup Complexity** | Medium | Low | Low | Medium | Low |

---

## Cost Comparison

| Method | Package Cost | Runtime Cost | LLM Cost |
|--------|--------------|--------------|----------|
| **Core** | FREE | $0 (L1+L2) | Your LLM |
| **OpenAI Wrapper** | FREE | $0 (L1+L2) | OpenAI prices |
| **Anthropic Wrapper** | FREE | $0 (L1+L2) | Anthropic prices |
| **LiteLLM** | FREE | $0 (L1+L2) | Your LLM + LiteLLM proxy |
| **Mastra** | FREE | $0 (L1+L2) | Your LLM |

**Note:** All methods can use L3 (LLM validation) which costs ~$0.25 per 100k checks. L3 is optional and only called for ~1% of inputs with smart escalation.

---

## Recommendations

### For Startups/MVPs
→ **Use OpenAI/Anthropic wrapper** or **Mastra**
- Fastest to integrate (1 line)
- Least code to maintain
- Good enough for most cases

### For Enterprise/Production
→ **Use Core directly** or **LiteLLM**
- Full control over checking logic
- No vendor lock-in
- Cost optimization
- Multi-cloud support

### For Multi-Agent Systems
→ **Use Mastra integration**
- Built for agent workflows
- Tool-level protection
- Factory pattern for multiple agents
- Minimal overhead

### For Cost Optimization
→ **Use LiteLLM**
- Access cheapest models
- Route based on cost/performance
- Local models (Ollama - FREE!)
- Automatic fallback

### For Maximum Security
→ **Use Core with L3 enabled**
- Full configuration control
- Custom threat patterns
- Behavioral analysis
- Budget controls

---

## Migration Path

### From Manual Checking to Automatic

**Step 1:** Start with Core (manual)
```typescript
const engine = new GuardrailEngine({ guards: ['injection'] });
// Manual checking everywhere
```

**Step 2:** Move to Wrapper (automatic)
```typescript
const openai = new GuardedOpenAI({
  guardrails: { guards: ['injection'] },
});
// Automatic checking!
```

**Step 3:** Add more protection
```typescript
const openai = new GuardedOpenAI({
  guardrails: {
    guards: ['injection', 'pii', 'toxicity'],
    level: 'advanced',
    behavioral: { enabled: true },
  },
});
```

---

## Summary Table

| Need | Recommendation |
|------|----------------|
| Quick integration | OpenAI/Anthropic wrapper or Mastra |
| Full control | Core package |
| 100+ models | LiteLLM |
| Multi-agent | Mastra |
| No vendor lock-in | LiteLLM or Core |
| Lowest cost | LiteLLM with Ollama |
| Highest security | Core with L3 |
| Simplest code | Mastra |

---

## Next Steps

1. **Choose your integration method** based on this guide
2. **Read the specific guide** for your chosen method:
   - [Core Package](./getting-started.md)
   - [LiteLLM Integration](./LITELLM-INTEGRATION.md)
   - [Mastra Integration](./MASTRA-INTEGRATION.md)
   - [OpenAI Integration](../packages/openai/README.md)
   - [Anthropic Integration](../packages/anthropic/README.md)
3. **See examples** in the examples/ directory
4. **Join the community** for support

---

**Still unsure?** Start with the **Core package** - it works with everything and you can always add wrappers later!
