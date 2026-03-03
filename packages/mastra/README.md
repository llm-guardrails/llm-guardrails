# @openclaw-guardrails/mastra

> Mastra integration for OpenClaw Guardrails - Add guardrails to Mastra agents with a simple decorator

[![npm version](https://img.shields.io/npm/v/@openclaw-guardrails/mastra.svg)](https://www.npmjs.com/package/@openclaw-guardrails/mastra)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🎯 **Simple Decorator API** - Wrap Mastra agents with one function call
- 🛡️ **Comprehensive Protection** - PII, injection, secrets, toxicity, and more
- 🔧 **Tool-Level Guards** - Protect individual tool inputs/outputs
- 📊 **Behavioral Analysis** - Detect cross-message threats
- 💰 **Budget Controls** - Track and limit LLM costs
- 🚀 **Zero Config** - Works out of the box with sensible defaults
- 📦 **Lightweight** - Minimal overhead on agent execution

## Installation

```bash
npm install @openclaw-guardrails/mastra @openclaw-guardrails/core
```

## Quick Start

### Basic Usage

```typescript
import { Agent } from '@mastra/core';
import { withGuardrails } from '@openclaw-guardrails/mastra';
import { GuardrailEngine } from '@openclaw-guardrails/core';

// Create your Mastra agent
const agent = new Agent({
  name: 'Customer Support',
  systemPrompt: 'You are a helpful customer support agent.',
  tools: [searchTool, emailTool],
});

// Wrap with guardrails
const engine = new GuardrailEngine({
  guards: ['pii', 'injection', 'toxicity'],
});

const guardedAgent = withGuardrails(agent, engine);

// Use as normal - guardrails applied automatically
const response = await guardedAgent.generate('How can I help you?');
```

### Quick Guard (Presets)

```typescript
import { quickGuard } from '@openclaw-guardrails/mastra';

// Use preset configurations
const guardedAgent = quickGuard(agent, 'production');
// Options: 'basic' | 'standard' | 'advanced' | 'production'
```

### Factory Pattern

```typescript
import { createGuardedAgentFactory } from '@openclaw-guardrails/mastra';

// Create a factory with shared configuration
const guardAgent = createGuardedAgentFactory({
  guards: ['pii', 'injection', 'secrets'],
  behavioral: true,
  budget: { maxCostPerSession: 1.0 },
});

// Wrap multiple agents with same config
const agent1 = guardAgent(supportAgent);
const agent2 = guardAgent(salesAgent);
const agent3 = guardAgent(analyticsAgent);
```

## Configuration

### Full Configuration

```typescript
import { withGuardrails } from '@openclaw-guardrails/mastra';
import { GuardrailEngine } from '@openclaw-guardrails/core';

const engine = new GuardrailEngine({
  // Content guards
  guards: [
    'pii',
    'injection',
    'secrets',
    'toxicity',
    'leakage',
    'hate-speech',
    'bias',
  ],

  // Behavioral analysis
  behavioral: {
    enabled: true,
    patterns: [
      'file-exfiltration',
      'credential-theft',
      'escalation-attempts',
    ],
    storage: 'memory',
  },

  // Budget controls
  budget: {
    maxTokensPerSession: 100000,
    maxCostPerSession: 10.0,
    trackGuardrailCosts: true,
  },

  // Callbacks
  onBlock: (result) => {
    console.error(`Blocked: ${result.reason}`);
  },
});

const guardedAgent = withGuardrails(agent, engine, {
  // Check tool inputs
  checkToolInputs: true,

  // Check tool outputs
  checkToolOutputs: true,

  // Check final agent response
  checkFinalResponse: true,

  // Per-tool configuration
  toolConfigs: {
    emailTool: {
      skipInputCheck: false,
      skipOutputCheck: true,
      customGuards: ['pii'],
    },
    searchTool: {
      skipInputCheck: true,
      skipOutputCheck: false,
    },
  },
});
```

### Tool-Specific Guards

```typescript
import { toolSpecificGuards } from '@openclaw-guardrails/mastra';

const config = toolSpecificGuards({
  emailTool: {
    guards: ['pii'],
    skipOutputCheck: false,
  },
  databaseTool: {
    guards: ['pii', 'secrets', 'injection'],
    skipInputCheck: false,
    skipOutputCheck: false,
  },
  searchTool: {
    skipInputCheck: true, // Allow any search query
    skipOutputCheck: false, // But check results
  },
});

const guardedAgent = withGuardrails(agent, engine, config);
```

### Conditional Guards

```typescript
import { conditionalGuard } from '@openclaw-guardrails/mastra';

// Only apply guardrails in production
const guardedAgent = conditionalGuard(
  agent,
  () => process.env.NODE_ENV === 'production',
  { guards: ['pii', 'injection'] }
);
```

### Multiple Agents

```typescript
import { guardAgents } from '@openclaw-guardrails/mastra';

const [agent1, agent2, agent3] = guardAgents(
  [supportAgent, salesAgent, analyticsAgent],
  {
    guards: ['pii', 'injection'],
    behavioral: true,
  }
);
```

### Per-Agent Configuration

```typescript
import { createPerAgentGuard } from '@openclaw-guardrails/mastra';

const guardAgent = createPerAgentGuard({
  support: {
    guards: ['pii', 'toxicity'],
    checkToolInputs: true,
  },
  sales: {
    guards: ['pii', 'injection'],
    budget: { maxCostPerSession: 5.0 },
  },
  default: {
    guards: ['pii'],
  },
});

const supportAgent = guardAgent('support', supportAgentInstance);
const salesAgent = guardAgent('sales', salesAgentInstance);
```

### Monitoring

```typescript
import { guardWithMonitoring } from '@openclaw-guardrails/mastra';

const guardedAgent = guardWithMonitoring(
  agent,
  { guards: ['pii', 'injection'] },
  {
    onBlock: (reason, source) => {
      console.error(`Blocked ${source}: ${reason}`);
      metrics.increment('guardrails.blocks', { source });
    },
    onWarn: (reason) => {
      console.warn(`Warning: ${reason}`);
    },
    onCheck: (passed, latency) => {
      metrics.histogram('guardrails.latency', latency);
    },
  }
);
```

## API Reference

### `withGuardrails(agent, engine, config?)`

Main decorator function to wrap a Mastra agent with guardrails.

**Parameters:**
- `agent: T` - Mastra agent instance
- `engine: GuardrailEngine` - Guardrail engine with configuration
- `config?: MastraGuardrailConfig` - Optional Mastra-specific configuration

**Returns:** `GuardedAgent<T>` - Wrapped agent with guardrails

### `quickGuard(agent, preset?)`

Quick wrapper with preset configurations.

**Parameters:**
- `agent: T` - Mastra agent instance
- `preset?: 'basic' | 'standard' | 'advanced' | 'production'` - Preset level (default: 'standard')

**Returns:** `GuardedAgent<T>` - Wrapped agent with guardrails

**Presets:**
- `basic` - PII and injection detection only
- `standard` - PII, injection, secrets, toxicity
- `advanced` - All content guards + behavioral analysis
- `production` - All guards + behavioral + budget controls

### `createGuardedAgentFactory(config)`

Create a factory function for wrapping multiple agents with shared configuration.

**Parameters:**
- `config: MastraGuardrailConfig` - Shared configuration

**Returns:** `<T>(agent: T) => GuardedAgent<T>` - Factory function

### `guardAgents(agents, config?)`

Wrap multiple agents at once with the same configuration.

**Parameters:**
- `agents: T[]` - Array of agent instances
- `config?: MastraGuardrailConfig` - Shared configuration

**Returns:** `GuardedAgent<T>[]` - Array of wrapped agents

### `createPerAgentGuard(configs)`

Create a function to wrap agents with per-agent configurations.

**Parameters:**
- `configs: Record<string, MastraGuardrailConfig>` - Configurations keyed by agent name

**Returns:** `<T>(name: string, agent: T) => GuardedAgent<T>` - Guard function

### `conditionalGuard(agent, condition, config?)`

Apply guardrails only if condition is met.

**Parameters:**
- `agent: T` - Agent instance
- `condition: () => boolean` - Function that returns true to apply guards
- `config?: MastraGuardrailConfig` - Configuration

**Returns:** `GuardedAgent<T> | T` - Wrapped agent or original agent

### `toolSpecificGuards(toolConfigs)`

Create configuration for tool-specific guardrails.

**Parameters:**
- `toolConfigs: Record<string, ToolConfig>` - Tool-specific configurations

**Returns:** `MastraGuardrailConfig` - Configuration object

### `guardWithMonitoring(agent, config?, callbacks?)`

Wrap agent with guardrails and add monitoring callbacks.

**Parameters:**
- `agent: T` - Agent instance
- `config?: MastraGuardrailConfig` - Configuration
- `callbacks?: MonitoringCallbacks` - Monitoring callbacks

**Returns:** `GuardedAgent<T>` - Wrapped agent with monitoring

## Examples

### Example 1: Customer Support Agent

```typescript
import { Agent } from '@mastra/core';
import { quickGuard } from '@openclaw-guardrails/mastra';

const supportAgent = new Agent({
  name: 'Support',
  systemPrompt: 'You are a helpful customer support agent.',
  tools: [searchKnowledgeBase, createTicket],
});

// Apply production-grade guardrails
const guardedSupport = quickGuard(supportAgent, 'production');

// Use normally
const response = await guardedSupport.generate(
  'My email is john@example.com and I need help'
);
// ✗ Blocked - Contains PII
```

### Example 2: Multi-Agent System

```typescript
import { guardAgents } from '@openclaw-guardrails/mastra';

const [support, sales, analytics] = guardAgents(
  [supportAgent, salesAgent, analyticsAgent],
  {
    guards: ['pii', 'injection', 'toxicity'],
    behavioral: {
      enabled: true,
      patterns: ['credential-theft', 'data-exfil-via-code'],
    },
    budget: {
      maxCostPerSession: 5.0,
    },
  }
);
```

### Example 3: Tool-Specific Protection

```typescript
import { toolSpecificGuards } from '@openclaw-guardrails/mastra';

const guardedAgent = withGuardrails(
  agent,
  engine,
  toolSpecificGuards({
    sendEmail: {
      guards: ['pii', 'toxicity'],
      skipInputCheck: false,
      skipOutputCheck: true,
    },
    executeCode: {
      guards: ['injection', 'secrets'],
      skipInputCheck: false,
      skipOutputCheck: false,
    },
  })
);
```

## Integration with Mastra Workflows

```typescript
import { Workflow } from '@mastra/core';
import { createGuardedAgentFactory } from '@openclaw-guardrails/mastra';

const guardAgent = createGuardedAgentFactory({
  guards: ['pii', 'injection'],
});

const workflow = new Workflow({
  name: 'Support Workflow',
  agents: [
    guardAgent(triageAgent),
    guardAgent(resolutionAgent),
    guardAgent(followUpAgent),
  ],
});
```

## Performance

Guardrails add minimal overhead to agent execution:

- **Content Guards (L1/L2):** ~2-5ms per check
- **Behavioral Analysis:** <1ms overhead per message
- **Budget Tracking:** <0.5ms overhead per message
- **Tool Guards:** ~1-3ms per tool call

For most use cases, this overhead is negligible compared to LLM inference time.

## Best Practices

1. **Use Presets for Quick Setup**: Start with `quickGuard(agent, 'standard')` and customize as needed
2. **Configure Tool-Level Guards**: Not all tools need the same level of protection
3. **Enable Behavioral Analysis**: Essential for detecting sophisticated multi-step attacks
4. **Set Budget Limits**: Prevent runaway costs in production
5. **Monitor Blocks**: Use callbacks to track what's being blocked
6. **Skip Safe Tools**: Use `skipInputCheck`/`skipOutputCheck` for trusted tools
7. **Test in Development**: Verify guardrails don't block legitimate use cases

## Troubleshooting

### Agent methods not working

Make sure you're using the wrapped agent:
```typescript
const guardedAgent = withGuardrails(agent, engine);
await guardedAgent.generate(...); // ✓ Correct
await agent.generate(...); // ✗ Wrong - uses unwrapped agent
```

### Too many false positives

Adjust guard sensitivity or skip specific checks:
```typescript
const config = {
  guards: ['pii', 'injection'], // Only critical guards
  checkToolOutputs: false, // Skip tool output checks
};
```

### Performance issues

- Use `quickGuard(agent, 'basic')` for lightweight protection
- Skip tool output checks if not needed
- Use conditional guards to only apply in production

## License

MIT

## Support

- 📖 [Documentation](https://github.com/openclaw/guardrails)
- 🐛 [Issues](https://github.com/openclaw/guardrails/issues)
- 💬 [Discussions](https://github.com/openclaw/guardrails/discussions)
