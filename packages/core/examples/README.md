# Examples - @llm-guardrails/core

Comprehensive examples showing how to use the guardrails library in different scenarios.

## Running the Examples

```bash
# From the packages/core directory
cd packages/core

# Build the library first
npm run build

# Run an example with ts-node or tsx
npx tsx examples/01-basic-protection.ts
```

## Available Examples

### 1. Basic Content Protection (`01-basic-protection.ts`)
Learn how to set up basic guardrails for:
- PII detection (emails, SSNs, credit cards)
- Prompt injection detection
- API key and secret detection
- Output scanning

**Key Concepts:**
- Creating a GuardrailEngine
- Using multiple guards
- Checking inputs and outputs
- Understanding detection presets

---

### 2. Behavioral Threat Detection (`02-behavioral-analysis.ts`)
Cross-message threat detection using behavioral analysis:
- File exfiltration attacks
- Credential theft patterns
- Mass data access
- Privilege escalation attempts

**Key Concepts:**
- BehavioralGuard configuration
- Built-in threat patterns
- Session tracking
- Tool call monitoring

---

### 3. Budget Tracking (`03-budget-tracking.ts`)
Track token usage and enforce cost budgets:
- Per-session limits
- Per-user limits
- Cost comparison across models
- Token counting

**Key Concepts:**
- BudgetGuard setup
- Recording actual usage
- Alert thresholds
- Model pricing comparison

---

### 4. Full Production Setup (`04-full-production.ts`)
Complete production-ready configuration with:
- All content guards enabled
- Behavioral analysis
- Budget controls
- Error handling
- Monitoring callbacks

**Key Concepts:**
- Combining all features
- Production error handling
- Monitoring and logging
- Real-world application patterns

---

## Example Patterns

### Quick Start Pattern

```typescript
import { GuardrailEngine, PIIGuard, DETECTION_PRESETS } from '@llm-guardrails/core';

const engine = new GuardrailEngine({
  guards: [new PIIGuard(DETECTION_PRESETS.standard)],
});

const result = await engine.checkInput('user input here');
if (result.blocked) {
  // Handle blocked content
}
```

### Express.js Integration

```typescript
import express from 'express';
import { GuardrailEngine, PIIGuard, InjectionGuard } from '@llm-guardrails/core';

const app = express();
const guardrails = new GuardrailEngine({
  guards: [
    new PIIGuard(DETECTION_PRESETS.standard),
    new InjectionGuard(DETECTION_PRESETS.standard),
  ],
});

app.post('/api/chat', async (req, res) => {
  const check = await guardrails.checkInput(req.body.message);

  if (check.blocked) {
    return res.status(400).json({ error: check.reason });
  }

  // Proceed with LLM call...
});
```

### Next.js API Route

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { GuardrailEngine, PIIGuard } from '@llm-guardrails/core';

const guardrails = new GuardrailEngine({
  guards: [new PIIGuard(DETECTION_PRESETS.standard)],
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const result = await guardrails.checkInput(req.body.prompt);

  if (result.blocked) {
    return res.status(400).json({ error: result.reason });
  }

  // Continue with LLM processing...
  res.status(200).json({ success: true });
}
```

---

## Advanced Usage

### Custom Threat Patterns

```typescript
import { BehavioralGuard, type ThreatPattern } from '@llm-guardrails/core';

const customPattern: ThreatPattern = {
  name: 'custom-data-leak',
  description: 'Custom pattern for detecting data leaks',
  severity: 'high',
  maxTimeWindow: 60000,
  steps: [
    { tool: 'database_query', args: { table: /users|customers/ } },
    { tool: /http|email/, timeWindow: 30000 },
  ],
};

const guard = new BehavioralGuard({
  patterns: [customPattern],
});
```

### Multiple Detection Levels

```typescript
import { PIIGuard, DETECTION_PRESETS } from '@llm-guardrails/core';

// Fast mode (L1 only, ~1ms)
const fastGuard = new PIIGuard(DETECTION_PRESETS.basic);

// Balanced mode (L1+L2, ~5ms) - Recommended
const balancedGuard = new PIIGuard(DETECTION_PRESETS.standard);

// Thorough mode (L1+L2+L3 with LLM, 50-200ms)
const thoroughGuard = new PIIGuard(DETECTION_PRESETS.advanced);
```

---

## Performance Tips

1. **Use appropriate detection presets:**
   - `basic` for high-throughput, latency-sensitive applications
   - `standard` for balanced protection (recommended)
   - `advanced` only when maximum accuracy is needed

2. **Reuse engine instances:**
   ```typescript
   // Good - create once, reuse
   const engine = new GuardrailEngine({ ... });

   // Bad - creating new instance per request
   app.post('/api/chat', async (req, res) => {
     const engine = new GuardrailEngine({ ... }); // ❌
   });
   ```

3. **Enable only needed guards:**
   ```typescript
   // Only use guards relevant to your use case
   const engine = new GuardrailEngine({
     guards: [
       new PIIGuard(DETECTION_PRESETS.standard),
       new InjectionGuard(DETECTION_PRESETS.standard),
       // Don't include guards you don't need
     ],
   });
   ```

4. **Batch check inputs when possible:**
   ```typescript
   // Check multiple inputs in parallel
   const results = await Promise.all(
     inputs.map(input => engine.checkInput(input))
   );
   ```

---

## Testing Your Integration

```typescript
import { describe, it, expect } from 'vitest';
import { GuardrailEngine, PIIGuard } from '@llm-guardrails/core';

describe('Guardrails Integration', () => {
  const engine = new GuardrailEngine({
    guards: [new PIIGuard(DETECTION_PRESETS.standard)],
  });

  it('blocks PII in input', async () => {
    const result = await engine.checkInput('My email is test@example.com');
    expect(result.blocked).toBe(true);
  });

  it('allows safe input', async () => {
    const result = await engine.checkInput('What is 2+2?');
    expect(result.passed).toBe(true);
  });
});
```

---

## Need Help?

- **Documentation:** See `/docs` directory
- **Issues:** Report bugs on GitHub
- **Examples not working?** Make sure you've run `npm run build` first

---

## License

MIT © 2025
