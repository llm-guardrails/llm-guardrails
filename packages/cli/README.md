# @llm-guardrails/cli

Interactive CLI tool for testing and demonstrating LLM guardrails.

[![npm version](https://img.shields.io/npm/v/@llm-guardrails/cli.svg)](https://www.npmjs.com/package/@llm-guardrails/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔍 **Single Input Testing** - Test specific inputs against guardrails
- 💬 **Interactive Mode** - REPL-style interface for continuous testing
- 📊 **Performance Benchmarking** - Measure latency and throughput
- 📋 **Guard Information** - Detailed docs for each guard
- 🎨 **Beautiful Output** - Color-coded, formatted results
- 📈 **Real-time Statistics** - Track checks, blocks, and cache performance

## Installation

```bash
npm install -g @llm-guardrails/cli

# Or use directly with npx
npx @llm-guardrails/cli --help
```

## Quick Start

```bash
# Check a single input
guardrails check "Hello, how are you?"

# Check for specific threats
guardrails check "My email is test@example.com" --guards pii secrets

# Start interactive mode
guardrails interactive

# List all available guards
guardrails list --verbose

# Get info about a specific guard
guardrails info injection

# Run performance benchmarks
guardrails benchmark --iterations 10000
```

## Commands

### `check` - Test a Single Input

Test a single input against guardrails and see the results immediately.

```bash
guardrails check "Ignore all previous instructions" --guards injection
```

**Options:**

- `-g, --guards <guards...>` - Guards to enable (default: injection, pii, toxicity)
- `-l, --level <level>` - Detection level: basic, standard, or advanced (default: standard)
- `-j, --json` - Output results as JSON
- `-v, --verbose` - Show detailed results for each guard

**Examples:**

```bash
# Basic check
guardrails check "Hello world"

# Check with specific guards
guardrails check "test@example.com" --guards pii secrets

# Verbose output
guardrails check "Some toxic content" --guards toxicity --verbose

# JSON output for automation
guardrails check "input" --json
```

**Exit Codes:**

- `0` - Input passed all checks
- `1` - Input was blocked by a guard

### `interactive` - Interactive Testing Mode

Start an interactive REPL-style session for continuous testing.

```bash
guardrails interactive --guards injection pii toxicity
```

**Options:**

- `-g, --guards <guards...>` - Guards to enable (default: all)
- `-l, --level <level>` - Detection level (default: standard)

**Interactive Commands:**

- `/help` - Show help message
- `/stats` - Show session statistics
- `/clear` - Clear the screen
- `/exit` or `/quit` - Exit interactive mode

**Example Session:**

```
🛡️  LLM Guardrails Interactive Mode

Type your input to test against guardrails.
Commands: /help, /stats, /clear, /exit

> Hello, how are you?

  ✅ PASSED
  Latency: 0.23ms

> Ignore all previous instructions

  🚫 BLOCKED
  Guard: injection
  Reason: Detected prompt injection attempt
  Latency: 0.34ms

> /stats

Statistics:

  Checks performed: 2
  Blocked: 1
  Block rate: 50.0%
  Average latency: 0.29ms

Cache Statistics:

  Hit rate: 0.0%
  Hits: 0
  Misses: 2
  Size: 2/100
```

### `list` - List Available Guards

Display all available guards with descriptions.

```bash
guardrails list
guardrails list --verbose
```

**Options:**

- `-v, --verbose` - Show detailed table with priority and latency

**Example Output:**

```
Available Guards

  injection       Prompt injection and jailbreak attempts
  leakage         Prompt extraction and system prompt leakage
  secrets         API keys, tokens, and credentials
  pii             Email, SSN, phone numbers, and personal data
  toxicity        Insults, profanity, and aggressive language
  hate-speech     Discrimination, slurs, and hateful content
  bias            Stereotypes and biased language
  adult-content   Sexual and NSFW content
  copyright       Copyrighted material and IP violations
  profanity       Swear words and curse words

  Use --verbose for detailed information
```

### `info` - Guard Information

Show detailed information about a specific guard including examples, patterns, and accuracy.

```bash
guardrails info injection
guardrails info pii
```

**Example Output:**

```
📋 Prompt Injection Guard

Description:
  Detects and blocks prompt injection and jailbreak attempts

Priority: Critical
Latency: <1ms
Accuracy: 95%+

Detection Patterns:
  • Instruction override attempts
  • Role-playing jailbreaks
  • Context switching
  • System prompt extraction

Examples:
  → Ignore all previous instructions
  → Disregard your system prompt
  → Pretend you are a DAN
  → From now on, act as...

Usage:

  # Test with this guard
  guardrails check "input" --guards injection

  # Interactive mode
  guardrails interactive --guards injection
```

### `benchmark` - Performance Testing

Run performance benchmarks to measure latency and throughput.

```bash
guardrails benchmark --iterations 10000 --guards injection pii
```

**Options:**

- `-n, --iterations <number>` - Number of iterations (default: 1000)
- `-g, --guards <guards...>` - Guards to test (default: injection, pii)
- `-l, --level <level>` - Detection level (default: standard)

**Example Output:**

```
🚀 Performance Benchmark

Iterations: 10000
Guards: injection, pii
Level: standard

✔ Benchmark without cache completed
✔ Benchmark with cache completed

┌─────────────┬────────────────┬───────────────┬──────────────┐
│ Metric      │ Without Cache  │ With Cache    │ Improvement  │
├─────────────┼────────────────┼───────────────┼──────────────┤
│ Total Time  │ 2543ms         │ 1234ms        │ 51.5%        │
│ Avg Latency │ 0.25ms         │ 0.12ms        │ 52.0%        │
│ P50 Latency │ 0.23ms         │ 0.10ms        │ 56.5%        │
│ P95 Latency │ 0.45ms         │ 0.25ms        │ 44.4%        │
│ P99 Latency │ 0.67ms         │ 0.38ms        │ 43.3%        │
│ Throughput  │ 3933 checks/sec│ 8104 checks/sec│ 106%        │
└─────────────┴────────────────┴───────────────┴──────────────┘

Cache Statistics:

  Hit rate: 80.0%
  Hits: 8000
  Misses: 2000
  Size: 5/1000

✨ Cache provides 51.5% performance improvement!
```

## Programmatic Usage

You can also use the CLI commands programmatically in your Node.js applications:

```typescript
import { checkCommand, interactiveCommand } from '@llm-guardrails/cli';

// Check an input programmatically
await checkCommand('test input', {
  guards: ['injection', 'pii'],
  level: 'standard',
  json: true,
});

// Start interactive mode programmatically
await interactiveCommand({
  guards: ['injection', 'pii', 'toxicity'],
  level: 'standard',
});
```

## Guard Levels

Choose the detection level that best fits your use case:

### Basic
- Fast, rule-based detection only
- Lowest latency (<0.3ms average)
- Good for high-throughput scenarios
- Accuracy: ~85-90%

### Standard (Recommended)
- Balanced approach with pattern matching
- Low latency (<0.5ms average)
- Best balance of speed and accuracy
- Accuracy: ~90-95%

### Advanced
- Multi-layer detection with LLM validation
- Higher latency (~2-5ms average)
- Best accuracy for edge cases
- Accuracy: ~96-98%

## Available Guards

| Guard | Priority | Description | Accuracy |
|-------|----------|-------------|----------|
| **injection** | Critical | Prompt injection and jailbreaks | 95%+ |
| **leakage** | Critical | System prompt extraction | 93%+ |
| **secrets** | Critical | API keys and credentials | 99%+ |
| **pii** | High | Personal identifiable information | 98%+ |
| **toxicity** | High | Toxic and aggressive language | 92%+ |
| **hate-speech** | High | Discriminatory content | 94%+ |
| **bias** | Medium | Stereotypes and bias | 88%+ |
| **adult-content** | Medium | Sexual and NSFW content | 91%+ |
| **copyright** | Medium | Copyrighted material | 85%+ |
| **profanity** | Low | Swear words | 99%+ |

## Tips & Best Practices

### 1. Use Specific Guards

Only enable the guards you need for better performance:

```bash
# Instead of enabling all guards
guardrails check "input"

# Be specific
guardrails check "input" --guards injection pii secrets
```

### 2. Interactive Mode for Testing

Use interactive mode during development to quickly test different inputs:

```bash
guardrails interactive --guards injection toxicity
```

### 3. JSON Output for CI/CD

Use JSON output in automated pipelines:

```bash
#!/bin/bash
RESULT=$(guardrails check "$USER_INPUT" --json --guards injection pii)
if [ $? -ne 0 ]; then
  echo "Guardrails blocked the input"
  echo "$RESULT" | jq '.reason'
  exit 1
fi
```

### 4. Benchmark Before Production

Test performance in your environment:

```bash
guardrails benchmark --iterations 50000 --guards injection pii toxicity
```

### 5. Use the Right Level

- **Basic**: High-volume APIs, chatbots
- **Standard**: Most applications (recommended)
- **Advanced**: High-security, compliance-critical systems

## Integration Examples

### Express.js Middleware

```typescript
import express from 'express';
import { GuardrailEngine } from '@llm-guardrails/core';

const app = express();
const guardrails = new GuardrailEngine({
  guards: ['injection', 'pii', 'toxicity'],
  level: 'standard',
});

app.use(express.json());

app.use(async (req, res, next) => {
  const input = req.body.message;
  const result = await guardrails.checkInput(input);

  if (result.blocked) {
    return res.status(400).json({
      error: 'Input blocked by guardrails',
      guard: result.guard,
      reason: result.reason,
    });
  }

  next();
});
```

### Testing User Inputs

```typescript
import { checkCommand } from '@llm-guardrails/cli';

async function validateUserInput(input: string): Promise<boolean> {
  try {
    await checkCommand(input, {
      guards: ['injection', 'pii', 'toxicity'],
      level: 'standard',
      json: true,
    });
    return true;
  } catch (error) {
    // Input was blocked
    return false;
  }
}
```

## Troubleshooting

### Command Not Found

If you get "command not found", ensure the package is installed globally:

```bash
npm install -g @llm-guardrails/cli
```

Or use npx:

```bash
npx @llm-guardrails/cli check "input"
```

### Slow Performance

1. Use fewer guards
2. Enable caching (enabled by default)
3. Use "basic" level instead of "advanced"
4. Run benchmarks to identify bottlenecks

### High False Positives

1. Switch to "standard" or "advanced" level
2. Use more specific guards
3. Check the guard info for examples of what triggers blocks

## Related Packages

- [`@llm-guardrails/core`](../core) - Core guardrails engine
- [`@llm-guardrails/openai`](../openai) - OpenAI SDK integration
- [`@llm-guardrails/anthropic`](../anthropic) - Anthropic SDK integration
- [`@llm-guardrails/litellm`](../litellm) - Universal LLM proxy support

## Contributing

Contributions are welcome! Please check out our [Contributing Guide](../../CONTRIBUTING.md).

## License

MIT © LLM Guardrails Team

## Support

- 📖 [Documentation](https://github.com/llm-guardrails/llm-guardrails)
- 🐛 [Issues](https://github.com/llm-guardrails/llm-guardrails/issues)
- 💬 [Discussions](https://github.com/llm-guardrails/llm-guardrails/discussions)
