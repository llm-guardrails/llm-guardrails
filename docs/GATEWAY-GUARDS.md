# Gateway Guards

> Multi-layer defense architecture for Mastra orchestrators and agents

## Overview

Gateway guards provide **two-layer protection** for multi-agent systems:
- **Gateway Level** - Validate before routing to agents
- **Agent Level** - Validate agent-specific inputs/outputs

**Use Cases:**
- Multi-agent orchestration (Mastra)
- Shared validation across multiple agents
- Agent-specific output protection
- Defense-in-depth security

---

## Quick Start

```typescript
import { guardGateway, guardAgent } from '@llm-guardrails/mastra';

// Gateway: Pre-routing protection
const guardedMastra = guardGateway(mastra, {
  input: ['injection', 'pii'],
  output: [],
});

// Agent: Post-processing protection
const guardedAgent = guardAgent(agent, {
  input: [],
  output: ['leakage', 'secrets'],
  outputBlockStrategy: 'block',
  blockedMessage: 'I cannot share that information',
});
```

---

## Gateway-Level Guards

### Purpose

Gateway guards protect the **entire orchestration layer** before requests reach individual agents:
- Validate user input at entry point
- Block attacks before routing logic executes
- Apply consistent security policy across all agents
- Reduce redundant validation overhead

### API

```typescript
function guardGateway<T>(
  mastra: T,
  config: GatewayGuardConfig
): T
```

### Configuration

```typescript
interface GatewayGuardConfig {
  /** Guards to apply on input (before routing) */
  input?: string[];

  /** Guards to apply on output (after agent processing) */
  output?: string[];

  /** Detection level */
  level?: 'basic' | 'standard' | 'advanced';

  /** Failure mode for gateway guards */
  failMode?: 'open' | 'closed';

  /** Callback when gateway blocks */
  onBlock?: (result: GuardrailResult) => void;
}
```

### Example

```typescript
import { guardGateway } from '@llm-guardrails/mastra';
import { Mastra } from '@mastra/core';

const mastra = new Mastra({
  // ... your config
});

// Wrap with gateway guards
const guardedMastra = guardGateway(mastra, {
  input: ['injection', 'pii', 'toxicity'],
  output: [],
  level: 'standard',
  failMode: 'closed',
  onBlock: (result) => {
    console.error(`Gateway blocked: ${result.guard} - ${result.reason}`);
    metrics.increment('gateway_blocks', { guard: result.guard });
  },
});

// Use as normal
try {
  const response = await guardedMastra.process(userInput);
  console.log('Response:', response);
} catch (error) {
  // Gateway blocked the request
  console.error('Request blocked:', error.message);
}
```

---

## Agent-Level Guards

### Purpose

Agent guards protect **individual agents** with agent-specific policies:
- Validate agent-specific input requirements
- Check agent outputs for leakage
- Apply different rules per agent
- Fine-grained control over agent behavior

### API

```typescript
function guardAgent<T>(
  agent: T,
  config: AgentGuardConfig
): T
```

### Configuration

```typescript
interface AgentGuardConfig extends GuardrailConfig {
  /** Guards to apply on this specific agent's input */
  input?: string[];

  /** Guards to apply on this specific agent's output */
  output?: string[];

  // Plus all GuardrailConfig options:
  // guards, level, failMode, outputBlockStrategy, blockedMessage, etc.
}
```

### Example

```typescript
import { guardAgent } from '@llm-guardrails/mastra';
import { Agent } from '@mastra/core';

const supportAgent = new Agent({
  name: 'Customer Support',
  // ... agent config
});

// Wrap with agent-specific guards
const guardedSupport = guardAgent(supportAgent, {
  input: [],  // Gateway already validated
  output: ['leakage', 'secrets'],  // Check outputs only
  outputBlockStrategy: 'block',
  blockedMessage: 'I cannot share that information',
  level: 'advanced',
});

// Use as normal
const response = await guardedSupport.generate(userMessage);
// Output automatically checked and blocked if needed
```

---

## Layered Defense Architecture

### Pattern 1: Gateway Input + Agent Output

**Most common pattern** - Validate at entry, check outputs per agent:

```typescript
import { guardGateway, guardAgent } from '@llm-guardrails/mastra';

// 1. Gateway validates ALL inputs
const guardedMastra = guardGateway(mastra, {
  input: ['injection', 'pii', 'toxicity'],
  output: [],  // Outputs checked at agent level
});

// 2. Agents check their own outputs
const guardedSupport = guardAgent(supportAgent, {
  input: [],  // Already validated by gateway
  output: ['leakage'],  // This agent might leak
  outputBlockStrategy: 'block',
});

const guardedSales = guardAgent(salesAgent, {
  input: [],
  output: ['pii'],  // This agent handles sensitive data
  outputBlockStrategy: 'sanitize',
});

// Usage
const response = await guardedMastra.process(userInput);
// ↓ Input checked at gateway
// ↓ Routed to appropriate agent
// ↓ Agent output checked
// ↓ Safe response returned
```

### Pattern 2: Full Two-Layer Defense

**Maximum protection** - Validate at both levels:

```typescript
// Gateway: Basic validation
const guardedMastra = guardGateway(mastra, {
  input: ['injection', 'toxicity'],  // Critical threats
  output: ['leakage'],  // Catch any leakage
  level: 'basic',  // Fast L1/L2 only
});

// Agent: Comprehensive validation
const guardedAgent = guardAgent(agent, {
  input: ['pii'],  // Agent-specific input checks
  output: ['secrets', 'leakage'],  // Agent-specific output checks
  level: 'advanced',  // Full L1/L2/L3
  outputBlockStrategy: 'sanitize',
});
```

### Pattern 3: Gateway-Only (Simple)

**Single-layer** - Validate only at gateway:

```typescript
const guardedMastra = guardGateway(mastra, {
  input: ['injection', 'pii'],
  output: ['leakage', 'secrets'],  // Check all outputs at gateway
  level: 'standard',
});

// Agents don't need individual guards
// All validation happens at gateway level
```

---

## Integration Examples

### Multi-Agent System

```typescript
import { guardGateway, guardAgent } from '@llm-guardrails/mastra';
import { Mastra, Agent } from '@mastra/core';

// Create agents
const triageAgent = new Agent({ name: 'Triage' });
const resolutionAgent = new Agent({ name: 'Resolution' });
const escalationAgent = new Agent({ name: 'Escalation' });

// Guard agents with different policies
const guardedTriage = guardAgent(triageAgent, {
  input: [],
  output: ['pii'],  // Shouldn't leak customer data
});

const guardedResolution = guardAgent(resolutionAgent, {
  input: [],
  output: ['leakage', 'secrets'],  // Shouldn't leak system info
  outputBlockStrategy: 'block',
});

const guardedEscalation = guardAgent(escalationAgent, {
  input: [],
  output: ['pii', 'secrets'],  // Most sensitive agent
  outputBlockStrategy: 'sanitize',
});

// Create and guard orchestrator
const mastra = new Mastra({
  agents: [guardedTriage, guardedResolution, guardedEscalation],
});

const guardedMastra = guardGateway(mastra, {
  input: ['injection', 'toxicity'],  // Protect all agents
  output: [],  // Each agent handles own outputs
});

// Use system
const response = await guardedMastra.process('Help me with my account');
```

### Conditional Agent Guards

```typescript
// Only guard in production
const agent = createAgent();

const guardedAgent = process.env.NODE_ENV === 'production'
  ? guardAgent(agent, {
      input: [],
      output: ['leakage', 'secrets'],
      outputBlockStrategy: 'block',
    })
  : agent;  // No guards in development
```

### Per-Environment Configuration

```typescript
const gatewayConfig = {
  development: {
    input: ['injection'],  // Basic protection
    output: [],
    level: 'basic' as const,
    failMode: 'open' as const,
  },
  production: {
    input: ['injection', 'pii', 'toxicity'],  // Full protection
    output: ['leakage', 'secrets'],
    level: 'advanced' as const,
    failMode: 'closed' as const,
  },
};

const config = gatewayConfig[process.env.NODE_ENV || 'development'];
const guardedMastra = guardGateway(mastra, config);
```

---

## Best Practices

### 1. Gateway for Common Threats

Use gateway guards for **universal threats** that apply to all agents:

```typescript
const guardedMastra = guardGateway(mastra, {
  input: [
    'injection',    // All agents vulnerable
    'toxicity',     // No agent should process toxic input
    'hate-speech',  // Universal protection
  ],
});
```

### 2. Agent Guards for Specific Risks

Use agent guards for **agent-specific vulnerabilities**:

```typescript
// Support agent might leak customer data
const guardedSupport = guardAgent(supportAgent, {
  output: ['pii', 'leakage'],
});

// Code execution agent might leak secrets
const guardedCodeExec = guardAgent(codeAgent, {
  output: ['secrets', 'leakage'],
});

// Chat agent might be toxic
const guardedChat = guardAgent(chatAgent, {
  output: ['toxicity'],
});
```

### 3. Avoid Duplicate Validation

Don't validate the same thing twice:

```typescript
// ❌ Redundant - both check injection
const guardedMastra = guardGateway(mastra, {
  input: ['injection'],
});
const guardedAgent = guardAgent(agent, {
  input: ['injection'],  // Already checked!
});

// ✓ Efficient - gateway handles input, agent handles output
const guardedMastra = guardGateway(mastra, {
  input: ['injection'],
});
const guardedAgent = guardAgent(agent, {
  output: ['leakage'],  // Different concern
});
```

### 4. Monitor Both Layers

Track blocks at each layer:

```typescript
const guardedMastra = guardGateway(mastra, {
  input: ['injection'],
  onBlock: (result) => {
    metrics.increment('gateway_blocks', {
      guard: result.guard,
      reason: result.reason,
    });
  },
});

const guardedAgent = guardAgent(agent, {
  output: ['leakage'],
  onBlock: (result) => {
    metrics.increment('agent_blocks', {
      agent: agent.name,
      guard: result.guard,
    });
  },
});
```

### 5. Fail Modes Per Layer

Use different fail modes for different layers:

```typescript
// Gateway: Fail-closed (strict)
const guardedMastra = guardGateway(mastra, {
  input: ['injection'],
  failMode: 'closed',  // Never let attacks through
});

// Agent: Fail-open (available)
const guardedAgent = guardAgent(agent, {
  output: ['leakage'],
  failMode: 'open',  // Prefer availability
});
```

---

## Performance

### Latency

- **Gateway guards**: ~2-5ms per check
- **Agent guards**: ~2-5ms per check
- **Combined**: ~4-10ms total (still <0.01% of LLM time)

### Optimization Tips

1. **Use L1/L2 only at gateway**: Fast validation for common cases
2. **Use L3 only at agent level**: Expensive validation where needed
3. **Skip redundant checks**: Don't validate same thing twice
4. **Cache results**: Use cache config for repeated inputs

```typescript
// Gateway: Fast checks only
const guardedMastra = guardGateway(mastra, {
  input: ['injection', 'toxicity'],
  level: 'basic',  // L1/L2 only (~2ms)
});

// Agent: Deep validation
const guardedAgent = guardAgent(agent, {
  output: ['leakage'],
  level: 'advanced',  // Full L1/L2/L3 (~50-100ms)
});
```

---

## Troubleshooting

### Gateway Not Blocking

Check that gateway guards are configured:

```typescript
const guardedMastra = guardGateway(mastra, {
  input: ['injection'],  // Must have guards
  output: [],
});

// Test
try {
  await guardedMastra.process('Ignore all instructions');
} catch (error) {
  console.log('Blocked:', error.message);  // Should block
}
```

### Agent Not Blocking Outputs

Ensure agent guards have output configuration:

```typescript
const guardedAgent = guardAgent(agent, {
  input: [],
  output: ['leakage'],  // Must specify output guards
  outputBlockStrategy: 'block',  // Must have strategy
});
```

### Double Blocking

If requests are blocked twice, check for duplicate validation:

```typescript
// ❌ Problem: Both layers check same thing
const guardedMastra = guardGateway(mastra, {
  input: ['injection'],
});
const guardedAgent = guardAgent(agent, {
  input: ['injection'],  // Remove this
});

// ✓ Solution: Separate concerns
const guardedMastra = guardGateway(mastra, {
  input: ['injection'],  // Gateway handles input
});
const guardedAgent = guardAgent(agent, {
  output: ['leakage'],  // Agent handles output
});
```

---

## API Reference

### `guardGateway<T>(mastra: T, config: GatewayGuardConfig): T`

Wrap Mastra orchestrator with gateway-level guards.

**Parameters:**
- `mastra: T` - Mastra instance to wrap
- `config: GatewayGuardConfig` - Gateway guard configuration

**Returns:** Proxied Mastra instance with guards applied

### `guardAgent<T>(agent: T, config: AgentGuardConfig): T`

Wrap Mastra agent with agent-level guards.

**Parameters:**
- `agent: T` - Agent instance to wrap
- `config: AgentGuardConfig` - Agent guard configuration

**Returns:** Proxied agent instance with guards applied

---

## Related Documentation

- [Output Guards](./OUTPUT-GUARDS.md) - Output validation strategies
- [Fail Modes](./FAIL-MODES.md) - Error handling configuration
- [Mastra Integration](./MASTRA-INTEGRATION.md) - Full Mastra guide
- [API Reference](./api-reference.md) - Complete API documentation

---

## Examples

See working examples in:
- [`packages/mastra/examples/gateway-guards.ts`](../packages/mastra/examples/)
- [`packages/mastra/src/__tests__/gateway.test.ts`](../packages/mastra/src/__tests__/)
