# @llm-guardrails/core

TypeScript-native LLM guardrails with hybrid L1/L2/L3 detection.

## Features

- **🛡️ Content Security**: Built-in guards for PII, injection, secrets, toxicity, and more
- **⚡ Hybrid Detection**: L1 (<1ms) → L2 (<5ms) → L3 (optional LLM)
- **📦 Zero Dependencies**: No runtime dependencies for maximum security
- **🎯 TypeScript-First**: Full type safety and auto-completion
- **🔧 Extensible**: Easy to add custom guards

## Installation

```bash
npm install @llm-guardrails/core
```

## Quick Start

```typescript
import { GuardrailEngine, PIIGuard, DETECTION_PRESETS } from '@llm-guardrails/core';

// Create engine
const engine = new GuardrailEngine({
  level: 'standard'
});

// Add guards
engine.addGuard(new PIIGuard(DETECTION_PRESETS.standard));

// Check input
const result = await engine.checkInput('My email is john@example.com');

if (result.blocked) {
  console.log(`Blocked: ${result.reason}`);
} else {
  console.log('Input is safe');
}
```

## Detection Levels

### Basic (L1 only)
- Fastest: <1ms
- Heuristic checks only
- ~90% accuracy

```typescript
const engine = new GuardrailEngine({ level: 'basic' });
```

### Standard (L1 + L2) - Recommended
- Fast: <5ms for 95% of checks
- Pattern matching enabled
- ~95% accuracy

```typescript
const engine = new GuardrailEngine({ level: 'standard' });
```

### Advanced (L1 + L2 + L3)
- Highest accuracy: 99%+
- Optional LLM analysis
- 50-200ms for suspicious inputs

```typescript
const engine = new GuardrailEngine({
  level: 'advanced',
  llmProvider: myLLMProvider
});
```

## Built-in Guards

### Currently Available (3/10)
- ✅ **PIIGuard**: Email, phone, SSN, credit cards, etc.
- ✅ **InjectionGuard**: Prompt injection, jailbreaks, delimiter attacks
- ✅ **SecretGuard**: API keys, tokens, credentials, high-entropy strings

### Coming Soon (7/10)
- ⏳ **ToxicityGuard**: Toxic language detection
- ⏳ **ToxicityGuard**: Toxic language detection
- ⏳ **HateSpeechGuard**: Hate speech patterns
- ⏳ **BiasGuard**: Bias detection
- ⏳ **AdultContentGuard**: NSFW content
- ⏳ **CopyrightGuard**: Copyright violations
- ⏳ **ProfanityGuard**: Profanity filtering
- ⏳ **LeakageGuard**: System prompt extraction

## Custom Guards

Create your own guards by extending `HybridGuard`:

```typescript
import { HybridGuard, TierResult } from '@llm-guardrails/core';

class MyCustomGuard extends HybridGuard {
  name = 'my-custom-guard';

  // L1: Quick heuristic (<1ms)
  protected detectL1(input: string): TierResult {
    const score = input.includes('bad-keyword') ? 1.0 : 0;
    return { score, reason: score > 0 ? 'Bad keyword detected' : undefined };
  }

  // L2: Pattern matching (<5ms)
  protected detectL2(input: string): TierResult {
    // Your pattern matching logic
    return { score: 0 };
  }

  // L3: Optional LLM analysis
  protected async detectL3(input: string): Promise<TierResult> {
    // Your LLM-based detection
    return { score: 0 };
  }
}

// Use it
engine.addGuard(new MyCustomGuard(DETECTION_PRESETS.standard));
```

## API Reference

### GuardrailEngine

Main orchestrator for running guards.

**Constructor**
```typescript
new GuardrailEngine(config?: GuardrailConfig)
```

**Methods**
- `checkInput(input: string, context?: CheckContext): Promise<GuardrailResult>`
- `checkOutput(output: string, context?: CheckContext): Promise<GuardrailResult>`
- `quickCheck(input: string, context?: CheckContext): Promise<GuardrailResult>` - L1 only
- `addGuard(guard: Guard): void`
- `removeGuard(name: string): boolean`
- `getGuards(): Guard[]`

### PIIGuard

Detects personally identifiable information.

**Constructor**
```typescript
new PIIGuard(
  detectionConfig: HybridDetectionConfig,
  piiConfig?: {
    patterns?: string[];  // Which PII types to check
    redact?: boolean;     // Whether to redact PII
    redactionPlaceholder?: string;  // Placeholder for redacted PII
  }
)
```

**Detected PII Types**
- Email addresses
- Phone numbers
- Social Security Numbers (US)
- Credit card numbers
- IP addresses
- ZIP codes
- Driver's licenses
- Passport numbers
- Medical record numbers
- Bank account numbers

## Performance

**Latency Targets**:
- L1 detection: <1ms
- L2 detection: <5ms
- L3 detection: 50-200ms (optional)

**Accuracy**:
- L1: ~90%
- L2: ~95%
- L3: ~99%

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build
npm run build

# Watch mode
npm run dev
```

## License

MIT

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## Links

- [Main Repository](https://github.com/llm-guardrails/llm-guardrails)
- [Documentation](../../docs/)
- [Examples](../../examples/)
- [Architecture Decisions](../../docs/architecture/)
