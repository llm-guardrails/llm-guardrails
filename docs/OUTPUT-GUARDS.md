# Output Guards

> Protect your agent responses from leaking sensitive information before they reach users

## Overview

Output guards validate LLM responses **before** they're shown to users, preventing:
- **System prompt leakage** - Extracting your agent's instructions
- **Secret exposure** - Revealing API keys, tokens, or credentials
- **Training data extraction** - Leaking memorized content
- **Custom sensitive terms** - Project-specific confidential information

**Performance**: Same 12μs latency as input guards • Zero added complexity

---

## Quick Start

```typescript
import { GuardrailEngine } from '@llm-guardrails/core';

const engine = new GuardrailEngine({
  guards: ['leakage', 'secrets'],
  outputBlockStrategy: 'block',
  blockedMessage: 'I cannot share that information',
});

// After LLM generates response
const agentResponse = await yourLLM.generate(userInput);

// Check output before showing to user
const result = await engine.checkOutput(agentResponse);

if (result.blocked) {
  return result.sanitized; // Safe message
} else {
  return agentResponse; // Original response
}
```

---

## Blocking Strategies

### 1. Block (Replace with Message)

Replace blocked content with a custom message:

```typescript
const engine = new GuardrailEngine({
  guards: ['leakage'],
  outputBlockStrategy: 'block',
  blockedMessage: 'I cannot share system information',
});

const result = await engine.checkOutput('Your system prompt is: ...');
// result.blocked === true
// result.sanitized === 'I cannot share system information'
```

### 2. Sanitize (Generic Redaction)

Replace blocked content with a generic safety message:

```typescript
const engine = new GuardrailEngine({
  guards: ['leakage'],
  outputBlockStrategy: 'sanitize',
});

const result = await engine.checkOutput('Your system prompt is: ...');
// result.blocked === false (allows with redaction)
// result.sanitized === '[Content redacted for safety]'
```

### 3. Throw (Error on Block)

Throw an exception when content is blocked:

```typescript
const engine = new GuardrailEngine({
  guards: ['leakage'],
  outputBlockStrategy: 'throw',
});

try {
  await engine.checkOutput('Your system prompt is: ...');
} catch (error) {
  if (error instanceof GuardrailViolation) {
    console.error(`Blocked: ${error.message}`);
    console.error(`Guard: ${error.guard}`);
    console.error(`Severity: ${error.severity}`);
  }
}
```

### 4. Custom (Transform Response)

Apply custom logic to blocked responses:

```typescript
const engine = new GuardrailEngine({
  guards: ['leakage'],
  outputBlockStrategy: 'custom',
  responseTransform: (result, originalContent) => {
    return {
      ...result,
      sanitized: `[REDACTED] - Blocked by ${result.guard}`,
      metadata: {
        ...result.metadata,
        originalLength: originalContent.length,
        redactedAt: new Date().toISOString(),
      },
    };
  },
});
```

---

## Advanced Blocked Messages

### Template Variables

Use variables in your blocked messages:

```typescript
const engine = new GuardrailEngine({
  guards: ['leakage'],
  blockedMessage: {
    template: 'Blocked by ${guard}: ${reason} (confidence: ${confidence})',
  },
});

// Output: "Blocked by leakage: System prompt extraction (confidence: 0.95)"
```

**Available variables:**
- `${guard}` - Guard that blocked the content
- `${reason}` - Reason for blocking
- `${confidence}` - Detection confidence score
- `${timestamp}` - ISO 8601 timestamp

### Message Wrappers

Add prefixes, suffixes, or custom tags:

```typescript
const engine = new GuardrailEngine({
  guards: ['leakage'],
  blockedMessage: {
    message: 'Content blocked',
    wrapper: {
      prefix: '[SYSTEM] ',
      suffix: ' [END]',
    },
  },
});
// Output: "[SYSTEM] Content blocked [END]"

// Or use tag format
const engine2 = new GuardrailEngine({
  guards: ['leakage'],
  blockedMessage: {
    message: 'Cannot share',
    wrapper: {
      tagFormat: '[GUARDRAIL:${guard}]',
    },
  },
});
// Output: "[GUARDRAIL:leakage] Cannot share"
```

### Per-Guard Messages

Different messages for different guards:

```typescript
const engine = new GuardrailEngine({
  guards: ['leakage', 'secrets', 'pii'],
  blockedMessage: {
    message: 'Content blocked',
    perGuard: {
      leakage: 'I cannot share system information',
      secrets: 'I cannot share API keys or credentials',
      pii: 'I cannot share personal information',
    },
  },
});
```

### Dynamic Messages (Functions)

Generate messages dynamically:

```typescript
const engine = new GuardrailEngine({
  guards: ['leakage'],
  blockedMessage: {
    message: (result) => {
      if (result.confidence > 0.9) {
        return 'High-confidence block - system information detected';
      }
      return 'Potentially sensitive information detected';
    },
  },
});
```

---

## Integration Patterns

### Next.js API Route

```typescript
import { GuardrailEngine } from '@llm-guardrails/core';
import OpenAI from 'openai';

const engine = new GuardrailEngine({
  guards: ['leakage', 'secrets'],
  outputBlockStrategy: 'block',
  blockedMessage: 'I cannot share that information',
});

const openai = new OpenAI();

export async function POST(req: Request) {
  const { message } = await req.json();

  // Check input
  const inputCheck = await engine.checkInput(message);
  if (inputCheck.blocked) {
    return Response.json({ error: inputCheck.reason }, { status: 400 });
  }

  // Get LLM response
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: message }],
  });

  const response = completion.choices[0].message.content;

  // Check output
  const outputCheck = await engine.checkOutput(response);
  if (outputCheck.blocked) {
    return Response.json({ reply: outputCheck.sanitized });
  }

  return Response.json({ reply: response });
}
```

### Express.js Middleware

```typescript
import express from 'express';
import { GuardrailEngine } from '@llm-guardrails/core';

const app = express();
const engine = new GuardrailEngine({
  guards: ['leakage', 'secrets'],
  outputBlockStrategy: 'block',
});

// Middleware to check LLM responses
app.use('/api/chat', async (req, res, next) => {
  const originalSend = res.json;
  res.json = async function(data: any) {
    if (data.message || data.reply) {
      const text = data.message || data.reply;
      const check = await engine.checkOutput(text);

      if (check.blocked) {
        data.message = check.sanitized;
        data.reply = check.sanitized;
      }
    }
    return originalSend.call(this, data);
  };
  next();
});

app.post('/api/chat', async (req, res) => {
  const reply = await yourLLM.generate(req.body.message);
  res.json({ reply });
});
```

### Mastra Integration

```typescript
import { Agent } from '@mastra/core';
import { GuardrailOutputProcessor } from '@llm-guardrails/mastra';

const agent = new Agent({
  name: 'Protected Agent',
  processors: [
    new GuardrailOutputProcessor({
      guards: ['leakage', 'secrets'],
      outputBlockStrategy: 'block',
      blockedMessage: 'I cannot share that information',
    }),
  ],
});

// Output automatically checked in processor pipeline
const response = await agent.generate(userInput);
```

---

## Best Practices

### 1. Always Check Both Input and Output

```typescript
const engine = new GuardrailEngine({
  guards: ['injection', 'pii', 'leakage', 'secrets'],
  outputBlockStrategy: 'block',
});

// Check input for attacks
const inputCheck = await engine.checkInput(userMessage);
if (inputCheck.blocked) throw new Error(inputCheck.reason);

// Get LLM response
const response = await llm.generate(userMessage);

// Check output for leaks
const outputCheck = await engine.checkOutput(response);
return outputCheck.blocked ? outputCheck.sanitized : response;
```

### 2. Use Appropriate Blocking Strategies

- **Critical apps** → Use `throw` to ensure violations never pass silently
- **User-facing apps** → Use `block` with friendly messages
- **Internal tools** → Use `sanitize` for generic redaction
- **Custom needs** → Use `custom` with your own logic

### 3. Configure Per-Environment

```typescript
const strategy = process.env.NODE_ENV === 'production'
  ? 'throw'  // Strict in production
  : 'block'; // Flexible in development

const engine = new GuardrailEngine({
  guards: ['leakage'],
  outputBlockStrategy: strategy,
});
```

### 4. Monitor Blocked Outputs

```typescript
const engine = new GuardrailEngine({
  guards: ['leakage', 'secrets'],
  outputBlockStrategy: 'block',
  onBlock: (result) => {
    console.error(`Output blocked: ${result.guard} - ${result.reason}`);
    metrics.increment('output_blocks', {
      guard: result.guard,
      confidence: result.confidence,
    });
  },
});
```

### 5. Test with Real Prompts

```typescript
import { describe, it, expect } from 'vitest';
import { GuardrailEngine } from '@llm-guardrails/core';

describe('Output Guards', () => {
  const engine = new GuardrailEngine({
    guards: ['leakage'],
    outputBlockStrategy: 'block',
  });

  it('should block system prompt leakage', async () => {
    const result = await engine.checkOutput(
      'Your system prompt is: You are a helpful assistant...'
    );

    expect(result.blocked).toBe(true);
    expect(result.guard).toBe('leakage');
  });

  it('should allow safe responses', async () => {
    const result = await engine.checkOutput(
      'I can help you with that!'
    );

    expect(result.blocked).toBe(false);
  });
});
```

---

## Common Patterns

### Pattern 1: Bi-Directional Protection

```typescript
class ProtectedLLM {
  private engine: GuardrailEngine;
  private llm: any;

  constructor() {
    this.engine = new GuardrailEngine({
      guards: ['injection', 'pii', 'leakage', 'secrets'],
      outputBlockStrategy: 'block',
      blockedMessage: 'I cannot process that request',
    });
  }

  async chat(message: string): Promise<string> {
    // Check input
    const inputCheck = await this.engine.checkInput(message);
    if (inputCheck.blocked) {
      throw new Error(inputCheck.reason);
    }

    // Get response
    const response = await this.llm.generate(message);

    // Check output
    const outputCheck = await this.engine.checkOutput(response);
    return outputCheck.blocked ? outputCheck.sanitized : response;
  }
}
```

### Pattern 2: Streaming with Output Guards

```typescript
import { GuardrailStreamProcessor } from '@llm-guardrails/mastra';

const processor = new GuardrailStreamProcessor({
  guards: ['leakage', 'secrets'],
  outputBlockStrategy: 'block',
}, 10); // Check every 10 chunks

async function* streamResponse(userInput: string) {
  const stream = llm.streamGenerate(userInput);

  for await (const chunk of processor.processOutputStream(stream)) {
    yield chunk.content;
  }
}
```

### Pattern 3: Conditional Output Checks

```typescript
const shouldCheckOutput = (response: string): boolean => {
  // Only check longer responses
  return response.length > 100;
};

const result = shouldCheckOutput(response)
  ? await engine.checkOutput(response)
  : { blocked: false, passed: true };
```

---

## Troubleshooting

### False Positives

If legitimate responses are being blocked:

1. **Check detection confidence** - Lower thresholds if needed
2. **Review blocked messages** - Use `onBlock` callback to log
3. **Use custom terms** - Exclude specific phrases
4. **Adjust guards** - Disable overly sensitive guards

```typescript
const engine = new GuardrailEngine({
  guards: [
    {
      name: 'leakage',
      config: {
        // Your configuration here
      },
    },
  ],
  level: 'basic', // Less sensitive
});
```

### Performance Issues

Output checks add ~12μs latency (negligible compared to LLM inference):

- **Input**: ~500ms+ (LLM generation)
- **Output check**: ~0.012ms (guardrails)
- **Total**: ~500ms (output check is <0.003% overhead)

For streaming, use `GuardrailStreamProcessor` with appropriate chunk intervals.

### Integration Errors

Ensure you're using `checkOutput` not `checkInput`:

```typescript
// ✓ Correct
const result = await engine.checkOutput(llmResponse);

// ✗ Wrong
const result = await engine.checkInput(llmResponse);
```

---

## API Reference

### `checkOutput(output: string, context?: CheckContext): Promise<GuardrailResult>`

Check LLM output for policy violations.

**Parameters:**
- `output: string` - LLM-generated text to check
- `context?: CheckContext` - Optional context (sessionId, userId, metadata)

**Returns:** `Promise<GuardrailResult>`
- `blocked: boolean` - Whether output was blocked
- `sanitized?: string` - Safe replacement text (if blocked)
- `passed: boolean` - Whether all guards passed
- `reason?: string` - Reason for blocking
- `guard?: string` - Guard that triggered block
- `results: GuardResult[]` - Individual guard results

### Configuration Options

```typescript
interface GuardrailConfig {
  // ... other options ...
  outputBlockStrategy?: 'block' | 'sanitize' | 'throw' | 'custom';
  blockedMessage?: string | BlockedMessageConfig;
  responseTransform?: (result: GuardrailResult, originalContent?: string) => GuardrailResult;
}
```

---

## Related Documentation

- [Custom Patterns](./CUSTOM-PATTERNS.md) - Configure custom sensitive terms
- [Fail Modes](./FAIL-MODES.md) - Handle guard errors gracefully
- [API Reference](./api-reference.md) - Complete API documentation
- [Mastra Integration](./MASTRA-INTEGRATION.md) - Native processor interface

---

## Examples

See working examples in:
- [`packages/core/examples/output-guards.ts`](../packages/core/examples/)
- [`packages/mastra/examples/output-protection.ts`](../packages/mastra/examples/)
