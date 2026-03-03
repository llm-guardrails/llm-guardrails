# Getting Started with @openclaw-guardrails/core

This guide will help you get started with the guardrails library in just a few minutes.

## Installation

```bash
npm install @openclaw-guardrails/core
```

**Zero dependencies** - The core library has no runtime dependencies!

## Quick Start (30 seconds)

The simplest possible setup to protect against PII leaks:

```typescript
import { GuardrailEngine, PIIGuard, DETECTION_PRESETS } from '@openclaw-guardrails/core';

// Create engine
const guardrails = new GuardrailEngine({
  guards: [new PIIGuard(DETECTION_PRESETS.standard)],
});

// Check user input
const result = await guardrails.checkInput('My email is john@example.com');

if (result.blocked) {
  console.log('Blocked:', result.reason);
  // Don't send to LLM
} else {
  // Safe to proceed with LLM call
}
```

That's it! You're now protected against PII leaks.

## Step-by-Step Setup

### Step 1: Choose Your Guards

The library includes 10 built-in content guards:

```typescript
import {
  PIIGuard,           // Personal information
  InjectionGuard,     // Prompt injection
  SecretGuard,        // API keys, credentials
  ToxicityGuard,      // Toxic language
  LeakageGuard,       // System prompt extraction
  HateSpeechGuard,    // Hate speech
  BiasGuard,          // Biased language
  AdultContentGuard,  // NSFW content
  CopyrightGuard,     // Copyright violations
  ProfanityGuard,     // Profanity
} from '@openclaw-guardrails/core';
```

### Step 2: Select Detection Level

Choose based on your performance vs. accuracy needs:

```typescript
import { DETECTION_PRESETS } from '@openclaw-guardrails/core';

// Option 1: basic - Fastest (~1ms), 90% accuracy
const fastGuard = new PIIGuard(DETECTION_PRESETS.basic);

// Option 2: standard - Balanced (~5ms), 95% accuracy ⭐ RECOMMENDED
const balancedGuard = new PIIGuard(DETECTION_PRESETS.standard);

// Option 3: advanced - Thorough (50-200ms), 99% accuracy
const thoroughGuard = new PIIGuard(DETECTION_PRESETS.advanced);
```

**Recommendation:** Start with `standard` preset. It offers the best balance of speed and accuracy.

### Step 3: Create GuardrailEngine

Combine multiple guards:

```typescript
const guardrails = new GuardrailEngine({
  guards: [
    new PIIGuard(DETECTION_PRESETS.standard),
    new InjectionGuard(DETECTION_PRESETS.standard),
    new SecretGuard(DETECTION_PRESETS.standard),
  ],

  // Optional: Add callbacks
  onBlock: (result) => {
    console.error(`Blocked by ${result.guard}: ${result.reason}`);
    // Log to your monitoring system
  },
});
```

### Step 4: Check Inputs

Before sending to your LLM:

```typescript
async function processUserMessage(userMessage: string) {
  // Check input
  const check = await guardrails.checkInput(userMessage);

  if (check.blocked) {
    return {
      error: check.reason,
      guard: check.guard,
    };
  }

  // Safe to proceed
  const llmResponse = await yourLLM.complete(userMessage);

  return { success: true, response: llmResponse };
}
```

### Step 5: Check Outputs (Optional)

Also scan LLM responses:

```typescript
const llmResponse = await yourLLM.complete(userMessage);

// Check the response
const outputCheck = await guardrails.checkOutput(llmResponse);

if (outputCheck.blocked) {
  // Don't show this response to user
  return { error: 'Response failed safety check' };
}

return { response: llmResponse };
```

## Common Integration Patterns

### Express.js API

```typescript
import express from 'express';
import { GuardrailEngine, PIIGuard, InjectionGuard, DETECTION_PRESETS } from '@openclaw-guardrails/core';

const app = express();
app.use(express.json());

// Create guardrails once (not per-request!)
const guardrails = new GuardrailEngine({
  guards: [
    new PIIGuard(DETECTION_PRESETS.standard),
    new InjectionGuard(DETECTION_PRESETS.standard),
  ],
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  // Check input
  const check = await guardrails.checkInput(message);

  if (check.blocked) {
    return res.status(400).json({
      error: 'Message blocked by safety filters',
      reason: check.reason,
    });
  }

  // Call your LLM...
  const response = await yourLLM.complete(message);

  res.json({ response });
});

app.listen(3000);
```

### Next.js API Route

```typescript
// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { GuardrailEngine, PIIGuard, InjectionGuard, DETECTION_PRESETS } from '@openclaw-guardrails/core';

// Initialize once, outside the handler
const guardrails = new GuardrailEngine({
  guards: [
    new PIIGuard(DETECTION_PRESETS.standard),
    new InjectionGuard(DETECTION_PRESETS.standard),
  ],
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  const check = await guardrails.checkInput(message);

  if (check.blocked) {
    return res.status(400).json({ error: check.reason });
  }

  // Proceed with LLM call
  const response = await yourLLM.complete(message);

  res.status(200).json({ response });
}
```

### Serverless Function (Vercel, Netlify)

```typescript
// api/chat.ts
import { GuardrailEngine, PIIGuard, InjectionGuard, DETECTION_PRESETS } from '@openclaw-guardrails/core';

// Cold start: initialize once
let guardrails: GuardrailEngine | null = null;

function getGuardrails() {
  if (!guardrails) {
    guardrails = new GuardrailEngine({
      guards: [
        new PIIGuard(DETECTION_PRESETS.standard),
        new InjectionGuard(DETECTION_PRESETS.standard),
      ],
    });
  }
  return guardrails;
}

export default async function handler(req: Request) {
  const { message } = await req.json();

  const engine = getGuardrails();
  const check = await engine.checkInput(message);

  if (check.blocked) {
    return new Response(
      JSON.stringify({ error: check.reason }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Continue with LLM...
  const response = await yourLLM.complete(message);

  return new Response(
    JSON.stringify({ response }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
```

## Adding Behavioral Analysis

Detect cross-message attack patterns:

```typescript
import { BehavioralGuard, BUILTIN_PATTERNS } from '@openclaw-guardrails/core';

const guardrails = new GuardrailEngine({
  guards: [
    // Content guards
    new PIIGuard(DETECTION_PRESETS.standard),

    // Behavioral analysis
    new BehavioralGuard({
      storage: 'memory',
      patterns: BUILTIN_PATTERNS, // 15+ threat patterns
      sessionTTL: 3600000, // 1 hour
    }),
  ],
});

// For tool calls (if your LLM uses tools):
const toolEvent = {
  sessionId: 'user-session-123',
  timestamp: Date.now(),
  tool: 'read_file',
  args: { path: '/etc/passwd' },
};

const check = await guardrails.guards[1].check(toolEvent);

if (check.blocked) {
  console.log('🚨 Behavioral threat detected:', check.reason);
}
```

## Adding Budget Controls

Track costs and enforce limits:

```typescript
import { BudgetGuard } from '@openclaw-guardrails/core';

const budgetGuard = new BudgetGuard({
  maxTokensPerSession: 100000,
  maxCostPerSession: 1.0,    // $1.00 per session
  maxCostPerUser: 10.0,      // $10.00 per user
  alertThreshold: 0.8,       // Warn at 80%
});

// Before LLM call
const check = await budgetGuard.check(userMessage, {
  sessionId: 'session-123',
  model: 'gpt-4o',
  userId: 'user-456',
});

if (check.blocked) {
  return { error: 'Budget limit exceeded' };
}

// After LLM call - record actual usage
await budgetGuard.recordUsage(
  'session-123',
  500,    // input tokens
  1500,   // output tokens
  'gpt-4o',
  'user-456'
);
```

## Configuration Best Practices

### 1. Reuse Engine Instances

```typescript
// ✅ Good - Create once
const guardrails = new GuardrailEngine({ ... });

app.post('/api/chat', async (req, res) => {
  await guardrails.checkInput(req.body.message);
});

// ❌ Bad - Creating new instance per request
app.post('/api/chat', async (req, res) => {
  const guardrails = new GuardrailEngine({ ... }); // Slow!
  await guardrails.checkInput(req.body.message);
});
```

### 2. Use Standard Preset by Default

```typescript
// ✅ Recommended for most applications
const guard = new PIIGuard(DETECTION_PRESETS.standard);

// Only use 'basic' if you need <1ms latency
const fastGuard = new PIIGuard(DETECTION_PRESETS.basic);

// Only use 'advanced' if accuracy is critical
const thoroughGuard = new PIIGuard(DETECTION_PRESETS.advanced);
```

### 3. Add Monitoring

```typescript
const guardrails = new GuardrailEngine({
  guards: [...],

  onBlock: (result) => {
    // Log to your monitoring system
    logger.warn('Guardrail blocked content', {
      guard: result.guard,
      reason: result.reason,
      timestamp: new Date(),
    });

    // Send alert if critical
    if (result.guard === 'injection') {
      alerting.send('Prompt injection attempt detected!');
    }
  },
});
```

## Performance Tips

1. **Check input early** - Before any processing
2. **Use appropriate presets** - `standard` is usually best
3. **Enable only needed guards** - Don't include guards you don't need
4. **Reuse instances** - Create engine once, use many times
5. **Monitor latency** - Check `result.totalLatency` in production

## Troubleshooting

### "Module not found" errors

Make sure you've installed the package:
```bash
npm install @openclaw-guardrails/core
```

### TypeScript errors

Ensure you're using TypeScript 5.0+:
```bash
npm install -D typescript@latest
```

### False positives

Try adjusting detection thresholds:
```typescript
const guard = new PIIGuard({
  tier1: { enabled: true, threshold: 0.95 }, // Higher = stricter
  tier2: { enabled: true, threshold: 0.85 },
});
```

### Slow performance

1. Check which preset you're using (use `standard` not `advanced`)
2. Profile with `result.totalLatency`
3. Consider using fewer guards

## Next Steps

- **Examples:** See `/examples` directory for complete working examples
- **API Reference:** Full API documentation in `/docs/api-reference.md`
- **Behavioral Patterns:** Learn about threat detection in `/docs/behavioral-patterns.md`
- **Budget Setup:** Configure cost controls in `/docs/budget-configuration.md`

## Need Help?

- 📖 Check the [examples](/examples)
- 🐛 Report issues on GitHub
- 💬 Join our community discussions

---

**You're all set!** Start protecting your LLM application now. 🛡️
