# Fail Modes

> Balance security and availability when guard checks fail

## Overview

Fail modes control what happens when a guard encounters an error (not when it blocks legitimate threats):

- **Fail-Closed** (default) - Block on error → Maximum security
- **Fail-Open** - Allow on error → Maximum availability

**Use Cases:**
- **Fail-Closed**: Critical security guards (injection, secrets)
- **Fail-Open**: Non-critical guards (profanity, bias) or high-availability services

---

## Quick Start

### Global Fail Mode

```typescript
import { GuardrailEngine } from '@llm-guardrails/core';

// Default: fail-closed (block on error)
const strictEngine = new GuardrailEngine({
  guards: ['injection', 'pii'],
  failMode: 'closed', // Optional - this is the default
});

// Fail-open (allow on error)
const permissiveEngine = new GuardrailEngine({
  guards: ['injection', 'pii'],
  failMode: 'open',
});
```

### Per-Guard Fail Modes

```typescript
const engine = new GuardrailEngine({
  guards: ['injection', 'pii', 'toxicity', 'profanity'],
  failMode: {
    mode: 'open',              // Default: prefer availability
    perGuard: {
      'injection': 'closed',   // Critical: always block on error
      'pii': 'closed',         // Critical: always block on error
      'toxicity': 'open',      // Less critical: allow on error
      'profanity': 'open',     // Less critical: allow on error
    },
  },
});
```

---

## Behavior

### Fail-Closed (Default)

When a guard throws an error, **block the request** (treat as a threat):

```typescript
const engine = new GuardrailEngine({
  guards: ['injection'],
  failMode: 'closed', // Default
});

// If injection guard throws error (e.g., regex compilation fails)
const result = await engine.checkInput('user input');
// result.blocked === true
// result.reason === "Security check failed: injection (fail-closed mode)"
```

**Output:**
```
[FAIL-CLOSED] Guard injection error: <error message>
```

**Pros:**
- ✅ Maximum security - no threats slip through
- ✅ Safe default for critical applications

**Cons:**
- ❌ Service unavailable if guards fail
- ❌ False positives during guard errors

### Fail-Open

When a guard throws an error, **allow the request** (log warning and continue):

```typescript
const engine = new GuardrailEngine({
  guards: ['injection'],
  failMode: 'open',
});

// If injection guard throws error
const result = await engine.checkInput('user input');
// result.blocked === false
// result.passed === true (with note about fail-open)
```

**Output:**
```
[FAIL-OPEN] Guard injection error (allowing): <error message>
```

**Pros:**
- ✅ Maximum availability - service continues
- ✅ Better user experience during transient failures

**Cons:**
- ❌ Threats might slip through during errors
- ❌ Requires robust monitoring

---

## Configuration

### Simple Global Mode

```typescript
const engine = new GuardrailEngine({
  guards: ['injection', 'pii', 'toxicity'],
  failMode: 'open', // All guards fail-open
});
```

### Hybrid Mode (Recommended)

Critical guards fail-closed, others fail-open:

```typescript
const engine = new GuardrailEngine({
  guards: ['injection', 'pii', 'toxicity', 'profanity', 'bias'],
  failMode: {
    mode: 'open',              // Default for unlisted guards
    perGuard: {
      'injection': 'closed',   // Critical: block on error
      'pii': 'closed',         // Critical: block on error
      // toxicity, profanity, bias inherit 'open' from default
    },
  },
});
```

### Environment-Based Configuration

```typescript
const failMode = process.env.NODE_ENV === 'production'
  ? 'closed'  // Strict in production
  : 'open';   // Permissive in development

const engine = new GuardrailEngine({
  guards: ['injection', 'pii'],
  failMode,
});
```

---

## Use Cases

### 1. Critical Security Guards (Fail-Closed)

Always block when security-critical guards fail:

```typescript
const engine = new GuardrailEngine({
  guards: ['injection', 'leakage', 'secrets'],
  failMode: 'closed', // Never let attacks through
});
```

**Use for:**
- Prompt injection detection
- Secret/credential detection
- System prompt leakage detection
- PII detection (regulated industries)

### 2. High-Availability Services (Fail-Open)

Keep service running even if guards fail:

```typescript
const engine = new GuardrailEngine({
  guards: ['toxicity', 'profanity', 'bias'],
  failMode: 'open', // Prefer availability
});
```

**Use for:**
- Content moderation (non-critical)
- Internal tools
- Development environments
- Non-regulated use cases

### 3. Hybrid Approach (Recommended)

Critical guards fail-closed, others fail-open:

```typescript
const engine = new GuardrailEngine({
  guards: ['injection', 'pii', 'toxicity', 'profanity'],
  failMode: {
    mode: 'open',            // Default: availability
    perGuard: {
      'injection': 'closed', // Security: block
      'pii': 'closed',       // Compliance: block
      // toxicity, profanity: allow (inherit 'open')
    },
  },
});
```

---

## Best Practices

### 1. Classify Your Guards

**Critical (Fail-Closed):**
- Injection detection
- Secret/credential detection
- PII detection (regulated)
- Leakage detection

**Non-Critical (Fail-Open):**
- Toxicity detection
- Profanity detection
- Bias detection
- Content moderation

### 2. Monitor Fail-Open Guards

When using fail-open, always monitor:

```typescript
const engine = new GuardrailEngine({
  guards: ['injection', 'pii', 'toxicity'],
  failMode: {
    mode: 'open',
    perGuard: {
      'injection': 'closed',
      'pii': 'closed',
    },
  },
  onWarn: (result) => {
    // Log fail-open events
    if (result.metadata?.failMode === 'open') {
      console.warn(`Guard ${result.guard} failed-open:`, result.reason);
      metrics.increment('guardrail_fail_open', {
        guard: result.guard,
        error: result.reason,
      });
    }
  },
});
```

### 3. Test Both Modes

Test how your application behaves in both fail modes:

```typescript
import { describe, it, expect } from 'vitest';
import { GuardrailEngine } from '@llm-guardrails/core';

describe('Fail Modes', () => {
  it('should block in fail-closed mode', async () => {
    const engine = new GuardrailEngine({
      guards: ['injection'],
      failMode: 'closed',
    });

    // Simulate guard error by using invalid config
    // (actual error simulation depends on your test setup)
    // expect result.blocked === true when guard errors
  });

  it('should allow in fail-open mode', async () => {
    const engine = new GuardrailEngine({
      guards: ['injection'],
      failMode: 'open',
    });

    // Simulate guard error
    // expect result.blocked === false when guard errors
  });
});
```

### 4. Use Hybrid Mode in Production

Recommended production configuration:

```typescript
const engine = new GuardrailEngine({
  guards: [
    'injection',   // fail-closed
    'leakage',     // fail-closed
    'secrets',     // fail-closed
    'pii',         // fail-closed
    'toxicity',    // fail-open
    'profanity',   // fail-open
  ],
  failMode: {
    mode: 'open',  // Default for non-critical
    perGuard: {
      'injection': 'closed',
      'leakage': 'closed',
      'secrets': 'closed',
      'pii': 'closed',
    },
  },
});
```

### 5. Alert on Fail-Closed Blocks

Set up alerts when fail-closed blocks occur:

```typescript
const engine = new GuardrailEngine({
  guards: ['injection'],
  failMode: 'closed',
  onBlock: (result) => {
    if (result.metadata?.failMode === 'closed') {
      // Alert: Critical guard failed and blocked request
      alerting.critical('Guardrail fail-closed block', {
        guard: result.guard,
        reason: result.reason,
        error: result.metadata?.error,
      });
    }
  },
});
```

---

## Integration Examples

### Next.js API Route

```typescript
import { GuardrailEngine } from '@llm-guardrails/core';

const engine = new GuardrailEngine({
  guards: ['injection', 'pii', 'toxicity'],
  failMode: {
    mode: 'open',
    perGuard: {
      'injection': 'closed',  // Critical
      'pii': 'closed',        // Critical
      // toxicity: fail-open
    },
  },
});

export async function POST(req: Request) {
  const { message } = await req.json();

  const check = await engine.checkInput(message);

  if (check.blocked) {
    // Could be legitimate threat OR fail-closed error
    return Response.json(
      { error: check.reason },
      { status: check.metadata?.failMode === 'closed' ? 503 : 400 }
    );
  }

  // Continue with LLM call
  const response = await llm.generate(message);
  return Response.json({ reply: response });
}
```

### Express.js with Monitoring

```typescript
import express from 'express';
import { GuardrailEngine } from '@llm-guardrails/core';

const app = express();
const engine = new GuardrailEngine({
  guards: ['injection', 'pii'],
  failMode: {
    mode: 'open',
    perGuard: {
      'injection': 'closed',
    },
  },
  onWarn: (result) => {
    if (result.metadata?.failMode === 'open') {
      console.warn('Fail-open event:', result);
      metrics.increment('fail_open', { guard: result.guard });
    }
  },
  onBlock: (result) => {
    if (result.metadata?.failMode === 'closed') {
      console.error('Fail-closed block:', result);
      metrics.increment('fail_closed', { guard: result.guard });
    }
  },
});

app.post('/api/chat', async (req, res) => {
  const check = await engine.checkInput(req.body.message);

  if (check.blocked) {
    return res.status(400).json({ error: check.reason });
  }

  const reply = await llm.generate(req.body.message);
  res.json({ reply });
});
```

### Mastra with Fail Modes

```typescript
import { Agent } from '@mastra/core';
import { GuardrailInputProcessor } from '@llm-guardrails/mastra';

const agent = new Agent({
  name: 'Protected Agent',
  processors: [
    new GuardrailInputProcessor({
      guards: ['injection', 'pii', 'toxicity'],
      failMode: {
        mode: 'open',
        perGuard: {
          'injection': 'closed',
          'pii': 'closed',
        },
      },
    }),
  ],
});
```

---

## Troubleshooting

### How to Know Which Mode Triggered?

Check the metadata in blocked results:

```typescript
const result = await engine.checkInput('test');

if (result.blocked && result.metadata?.failMode) {
  if (result.metadata.failMode === 'closed') {
    console.log('Blocked due to fail-closed mode');
    console.log('Error:', result.metadata.error);
  }
}
```

### Service Degradation

If you see frequent fail-closed blocks:

1. **Check guard configuration** - Ensure guards are properly configured
2. **Review error logs** - Identify the root cause
3. **Consider fail-open** - For non-critical guards
4. **Fix underlying issues** - Don't just switch to fail-open

### Unexpected Behavior

If guards aren't behaving as expected:

1. **Verify configuration** - Check that `failMode` is set correctly
2. **Test in isolation** - Create minimal reproduction
3. **Check guard health** - Ensure guards are functioning normally

```typescript
// Test guard health
const engine = new GuardrailEngine({ guards: ['injection'] });
const result = await engine.checkInput('safe test input');

if (result.passed) {
  console.log('Guard is healthy');
} else if (result.metadata?.failMode) {
  console.log('Guard failed with fail mode:', result.metadata.failMode);
}
```

---

## API Reference

### FailMode Type

```typescript
type FailMode = 'open' | 'closed';
```

### FailModeConfig

```typescript
interface FailModeConfig {
  /** Default fail mode for all guards */
  mode: FailMode;

  /** Per-guard fail mode overrides */
  perGuard?: Record<string, FailMode>;
}
```

### Usage

```typescript
const engine = new GuardrailEngine({
  guards: ['injection', 'pii'],
  failMode: 'closed', // Simple mode
});

// Or

const engine = new GuardrailEngine({
  guards: ['injection', 'pii'],
  failMode: {
    mode: 'open',
    perGuard: {
      'injection': 'closed',
    },
  }, // Advanced mode
});
```

### Result Metadata

When a guard fails, the result includes metadata:

```typescript
interface GuardrailResult {
  blocked: boolean;
  metadata?: {
    failMode?: 'open' | 'closed';
    error?: string;
  };
}
```

---

## Decision Matrix

| Guard Type | Recommended Mode | Reason |
|------------|------------------|--------|
| Injection | Fail-Closed | Security-critical |
| Secrets | Fail-Closed | Security-critical |
| Leakage | Fail-Closed | Security-critical |
| PII (regulated) | Fail-Closed | Compliance-critical |
| PII (non-regulated) | Fail-Open | Availability preferred |
| Toxicity | Fail-Open | Content moderation |
| Profanity | Fail-Open | Content moderation |
| Bias | Fail-Open | Content moderation |
| Hate Speech | Fail-Open* | Content moderation |
| Copyright | Fail-Open | Content moderation |

\* Consider fail-closed for regulated industries

---

## Related Documentation

- [Output Guards](./OUTPUT-GUARDS.md) - Output validation strategies
- [Custom Patterns](./CUSTOM-PATTERNS.md) - Custom term configuration
- [API Reference](./api-reference.md) - Complete API documentation
- [Best Practices](./getting-started.md#best-practices) - General guardrail best practices

---

## Examples

See working examples in:
- [`packages/core/examples/fail-modes.ts`](../packages/core/examples/)
- [`packages/core/src/engine/__tests__/GuardrailEngine.failMode.test.ts`](../packages/core/src/engine/__tests__/)
