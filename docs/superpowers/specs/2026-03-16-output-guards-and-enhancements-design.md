# Output Guards and Enhanced Guardrails System Design

**Date:** 2026-03-16
**Status:** Design Phase
**Priority:** Critical (Feature #1), High (Features #2-6)

## Executive Summary

This specification adds 6 critical enhancements to the `@llm-guardrails/llm-guardrails` library:

1. **Output guard support** - Check agent responses before user delivery
2. **Custom patterns for LeakageGuard** - Project-specific sensitive terms
3. **Gateway-level guard placement** - Multi-agent orchestrator support
4. **Configurable failure modes** - Fail-open vs fail-closed error handling
5. **Custom blocked-message templates** - Flexible response customization
6. **Mastra processor pipeline compliance** - Native processor interface

These features transform the library from input-only protection to comprehensive bi-directional security with enterprise-grade configurability.

## Problem Statement

### Current Limitations

**1. Input-Only Protection**
- Library only guards pre-agent input
- Agent responses can leak system prompts, internal terms, or sensitive data
- No post-processing validation

**2. Inflexible LeakageGuard**
- Built-in patterns only
- Cannot detect project-specific terms (framework names, agent IDs, architecture terms)
- No domain customization

**3. Single-Layer Guard Architecture**
- Guards wrap individual agents only
- Multi-agent orchestrators need gateway-level protection
- Cannot separate pre-routing vs post-processing guards

**4. Binary Error Handling**
- Guard errors always throw (fail-closed)
- No fail-open option for availability-critical systems
- Cannot configure per-guard failure behavior

**5. Non-Customizable Block Messages**
- `onBlock` hook is observe-only
- Cannot replace blocked content with custom messages
- No way to tag responses for orchestrator detection

**6. Non-Standard Mastra Integration**
- Uses wrapper pattern instead of Processor interface
- Cannot compose with other processors in pipeline
- Not following Mastra's native patterns

### Impact

- **Security**: Agent responses can leak sensitive information
- **Flexibility**: Cannot adapt to project-specific security needs
- **Architecture**: Poor fit for multi-agent orchestrators
- **Reliability**: Binary error handling limits production deployments
- **Integration**: Non-standard Mastra integration limits composability

## Goals

### Primary Goals

1. Add full output guard support with multiple blocking strategies
2. Enable custom pattern detection for domain-specific threats
3. Support gateway-level and agent-level guard separation
4. Provide configurable failure modes (fail-open/fail-closed)
5. Enable flexible blocked-message customization
6. Implement native Mastra Processor interface

### Non-Goals

- Modify existing guard detection logic (beyond LeakageGuard)
- Change existing API surface (maintain backward compatibility)
- Add new guard types (use existing 10 guards)
- Build custom orchestrator (work with existing Mastra)

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Multi-Agent Orchestrator                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─ User Input
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Gateway-Level Guards (NEW)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ GuardrailInputProcessor                              │   │
│  │ - Input validation before routing                    │   │
│  │ - Guards: injection, pii                             │   │
│  │ - Fail-closed mode                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─ Route to Agent
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Agent Processing                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Agent 1: Support Bot                                 │   │
│  │ - Business logic                                     │   │
│  │ - Tool execution                                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─ Agent Response
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Agent-Level Guards (NEW)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ GuardrailOutputProcessor (NEW)                       │   │
│  │ - Output validation after processing                 │   │
│  │ - Guards: leakage, secrets (NEW)                     │   │
│  │ - Custom blocked messages (NEW)                      │   │
│  │ - Fail-open mode (NEW)                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─ Safe Response
                              │
                              ▼
                          User Output
```

### Component Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                       GuardrailEngine                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Core Methods:                                                 │
│  ├─ checkInput(input) [existing]                              │
│  ├─ checkOutput(output) [ENHANCED]                            │
│  │   ├─ Run output guards                                     │
│  │   ├─ Handle errors with fail mode                          │
│  │   ├─ Apply output block strategy                           │
│  │   └─ Generate custom blocked message                       │
│  └─ quickCheck(input) [existing]                              │
│                                                                │
│  NEW Private Methods:                                          │
│  ├─ applyOutputBlockStrategy(result)                          │
│  │   ├─ 'block': Replace with safe message                    │
│  │   ├─ 'sanitize': Redact violations                         │
│  │   ├─ 'throw': Throw GuardrailViolation                     │
│  │   └─ 'custom': Use custom transformer                      │
│  │                                                             │
│  ├─ getBlockedMessage(result)                                 │
│  │   ├─ Support string template                               │
│  │   ├─ Support template with ${variables}                    │
│  │   ├─ Support function callback                             │
│  │   └─ Support advanced options (wrapper, per-guard)         │
│  │                                                             │
│  ├─ shouldBlockOnError(guardName, error)                      │
│  │   ├─ Check per-guard fail mode                             │
│  │   └─ Fallback to global fail mode                          │
│  │                                                             │
│  └─ sanitizeOutput(result)                                    │
│      └─ Redact content based on guard type                    │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                       LeakageGuard (ENHANCED)                  │
├────────────────────────────────────────────────────────────────┤
│  NEW: Custom Terms Support                                     │
│  ├─ customTerms: string[] (literal terms)                     │
│  ├─ caseSensitive: boolean                                    │
│  └─ compileCustomTerms() -> RegExp                            │
│                                                                │
│  Detection Layers:                                             │
│  ├─ L1: Check custom terms with compiled regex                │
│  ├─ L2: Check custom patterns (existing + new)                │
│  └─ L3: Semantic analysis (unchanged)                         │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                   Mastra Integration (NEW)                     │
├────────────────────────────────────────────────────────────────┤
│  Gateway-Level:                                                │
│  ├─ guardGateway(mastra, config)                              │
│  │   └─ Wraps orchestrator with input/output guards           │
│  └─ guardAgent(agent, config)                                 │
│      └─ Wraps individual agent (separate from gateway)        │
│                                                                │
│  Processor Interface (NEW):                                    │
│  ├─ GuardrailInputProcessor implements Processor              │
│  │   └─ processInput(input) -> validated input               │
│  │                                                             │
│  ├─ GuardrailOutputProcessor implements Processor (NEW)       │
│  │   └─ processOutputResult(result) -> validated result      │
│  │                                                             │
│  ├─ GuardrailStreamProcessor implements Processor (NEW)       │
│  │   └─ processOutputStream(stream) -> validated stream      │
│  │                                                             │
│  └─ GuardrailProcessor (Combined)                             │
│      ├─ processInput()                                        │
│      ├─ processOutputResult()                                 │
│      └─ processOutputStream()                                 │
│                                                                │
│  Backward Compatibility:                                       │
│  └─ withGuardrails() [existing wrapper - still works]         │
└────────────────────────────────────────────────────────────────┘
```

## Detailed Design

### 1. Output Guard Support

#### Core Implementation

**New GuardrailEngine.checkOutput() enhancement:**

```typescript
async checkOutput(
  output: string,
  context?: CheckContext
): Promise<GuardrailResult> {
  const startTime = Date.now();
  const results: GuardResult[] = [];

  // Run all guards
  for (const guard of this.guards) {
    try {
      const result = await guard.check(output, context);
      results.push(result);

      if (result.blocked) {
        return this.applyOutputBlockStrategy({
          passed: false,
          blocked: true,
          reason: result.reason,
          guard: guard.name,
          results,
          totalLatency: Date.now() - startTime,
        });
      }
    } catch (error) {
      // Handle with fail mode (see section 4)
      const shouldBlock = this.shouldBlockOnError(guard.name, error);

      if (shouldBlock) {
        return {
          passed: false,
          blocked: true,
          reason: `Guard ${guard.name} failed (fail-closed)`,
          guard: guard.name,
          results,
          totalLatency: Date.now() - startTime,
        };
      }

      // Fail-open: continue
      console.warn(`Guard ${guard.name} error (fail-open):`, error);
    }
  }

  return {
    passed: true,
    blocked: false,
    results,
    totalLatency: Date.now() - startTime,
  };
}
```

#### Output Blocking Strategies

**Four strategies for handling blocked output:**

1. **Block**: Replace with safe message
2. **Sanitize**: Redact violations, return cleaned version
3. **Throw**: Throw GuardrailViolation error
4. **Custom**: Use custom transformer function

```typescript
type OutputBlockStrategy = 'block' | 'sanitize' | 'throw' | 'custom';

interface GuardrailConfig {
  outputBlockStrategy?: OutputBlockStrategy;
  responseTransform?: (response: any, result: GuardrailResult) => any;
}
```

#### Integration Points

**Mastra decorator integration:**

```typescript
// Current: only checks input
if (prop === 'generate') {
  return async function(input, options) {
    const check = await engine.checkInput(input);
    if (check.blocked) throw new Error(check.reason);

    const response = await original(input, options);

    // NEW: Check output
    const outputCheck = await engine.checkOutput(response.text);
    if (outputCheck.blocked) {
      return replaceOutput(response, outputCheck.sanitized);
    }

    return response;
  };
}
```

### 2. Custom Patterns for LeakageGuard

#### Configuration

```typescript
interface LeakageGuardConfig {
  // Existing
  detectTrainingDataExtraction?: boolean;
  customPatterns?: RegExp[];

  // NEW
  customTerms?: string[];        // Simple string literals
  caseSensitive?: boolean;       // Default: false
}
```

#### Implementation

**Term compilation for performance:**

```typescript
private compileCustomTerms(terms: string[], caseSensitive: boolean): RegExp {
  // Escape special regex characters
  const escapedTerms = terms.map(term =>
    term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );

  // Create alternation pattern with word boundaries
  const pattern = `\\b(${escapedTerms.join('|')})\\b`;
  const flags = caseSensitive ? 'g' : 'gi';

  return new RegExp(pattern, flags);
}
```

**L1 detection integration:**

```typescript
protected detectL1(input: string): TierResult {
  let score = 0;
  const detections: string[] = [];

  // ... existing L1 checks ...

  // NEW: Check custom terms
  if (this.customTermsRegex) {
    const matches = input.match(this.customTermsRegex);
    if (matches && matches.length > 0) {
      score = Math.max(score, 0.95);
      detections.push(`custom sensitive terms: ${matches.join(', ')}`);
    }
  }

  return { score, reason: ..., metadata: { detections } };
}
```

#### Usage

```typescript
const engine = new GuardrailEngine({
  guards: [
    {
      name: 'leakage',
      config: {
        customTerms: [
          'MyInternalFramework',
          'agent-id-12345',
          'INTERNAL_API_KEY'
        ],
        caseSensitive: true
      }
    }
  ]
});

// Blocks: "Our system uses MyInternalFramework"
// Allows: "Our system uses standard frameworks"
```

### 3. Gateway-Level Guard Placement

#### Architecture

**Two-layer protection model:**

```
User Input
    │
    ▼
┌─────────────────────────┐
│  Gateway Guards         │  <- Pre-routing protection
│  - injection, pii       │     (all agents)
└─────────────────────────┘
    │
    ├─ Route to Agent
    │
    ▼
┌─────────────────────────┐
│  Agent Processing       │
└─────────────────────────┘
    │
    ▼
┌─────────────────────────┐
│  Agent Guards           │  <- Post-processing protection
│  - leakage, secrets     │     (agent-specific)
└─────────────────────────┘
    │
    ▼
User Output
```

#### API Design

**Gateway wrapper:**

```typescript
interface GatewayGuardConfig {
  input?: string[];        // Guards before routing
  output?: string[];       // Guards after processing
  level?: DetectionLevel;
  failMode?: 'open' | 'closed';
  onBlock?: (result: GuardrailResult) => void;
}

function guardGateway<T>(
  mastra: T,
  config: GatewayGuardConfig
): T {
  // Proxy mastra.process() method
  // Check input before routing
  // Check output after agent processing
}
```

**Agent wrapper:**

```typescript
interface AgentGuardConfig extends MastraGuardrailConfig {
  input?: string[];   // Agent-specific input guards
  output?: string[];  // Agent-specific output guards
}

function guardAgent<T>(
  agent: T,
  config: AgentGuardConfig
): GuardedAgent<T> {
  // Proxy agent.generate() method
  // Separate input/output engines
}
```

#### Usage Example

```typescript
// Gateway: Protect all agents from injection/PII
const guardedMastra = guardGateway(mastra, {
  input: ['injection', 'pii'],
  output: [],
});

// Agent 1: Check for leakage in support responses
const supportAgent = guardAgent(agent1, {
  input: [],
  output: ['leakage', 'secrets'],
});

// Agent 2: Check for toxicity in chat responses
const chatAgent = guardAgent(agent2, {
  input: [],
  output: ['toxicity', 'hate-speech'],
});

// Flow:
// 1. User input -> Gateway input guards (injection, pii)
// 2. Route to supportAgent
// 3. Agent processes
// 4. Agent output guards (leakage, secrets)
// 5. Return to user
```

### 4. Configurable Failure Modes

#### Configuration

```typescript
type FailMode = 'open' | 'closed';

interface FailModeConfig {
  mode: FailMode;                           // Global default
  perGuard?: Record<string, FailMode>;      // Per-guard overrides
}

interface GuardrailConfig {
  failMode?: FailMode | FailModeConfig;
}
```

#### Behavior

**Fail-closed (default):**
- Guard error → Block request
- Security over availability
- Production default for critical guards

**Fail-open:**
- Guard error → Log warning, allow request
- Availability over security
- Production default for nice-to-have guards

#### Implementation

```typescript
private shouldBlockOnError(guardName: string, error: any): boolean {
  const config = this.failModeConfig;

  // Check per-guard override
  if (config.perGuard?.[guardName]) {
    return config.perGuard[guardName] === 'closed';
  }

  // Fallback to global
  return config.globalMode === 'closed';
}

async checkInput(input: string): Promise<GuardrailResult> {
  for (const guard of this.guards) {
    try {
      const result = await guard.check(input);
      if (result.blocked) return { /* blocked */ };
    } catch (error) {
      const shouldBlock = this.shouldBlockOnError(guard.name, error);

      if (shouldBlock) {
        // Fail-closed: block on error
        return {
          passed: false,
          blocked: true,
          reason: `Guard ${guard.name} failed (fail-closed)`,
          metadata: { failMode: 'closed', error: error.message }
        };
      } else {
        // Fail-open: log and continue
        console.warn(`Guard ${guard.name} failed (fail-open):`, error);
        continue;
      }
    }
  }

  return { passed: true, blocked: false };
}
```

#### Usage Examples

```typescript
// Example 1: All guards fail-closed (most secure)
const engine1 = new GuardrailEngine({
  guards: ['injection', 'pii'],
  failMode: 'closed'
});

// Example 2: All guards fail-open (most available)
const engine2 = new GuardrailEngine({
  guards: ['injection', 'pii'],
  failMode: 'open'
});

// Example 3: Mixed (production recommended)
const engine3 = new GuardrailEngine({
  guards: ['injection', 'pii', 'toxicity', 'leakage'],
  failMode: {
    mode: 'open',              // Default: fail-open
    perGuard: {
      'injection': 'closed',   // Critical guards: fail-closed
      'leakage': 'closed',
      'secrets': 'closed',
    }
  }
});
```

### 5. Custom Blocked-Message Templates

#### Configuration Types

```typescript
type BlockedMessageConfig =
  | string                                  // Simple: "Request blocked"
  | { template: string }                    // Template: "Blocked by ${guard}"
  | BlockedMessageFunction                  // Function callback
  | BlockedMessageOptions;                  // Advanced options

interface BlockedMessageFunction {
  (result: GuardrailResult, original?: string): BlockResponse;
}

interface BlockResponse {
  message: string;
  metadata?: Record<string, any>;
}

interface BlockedMessageOptions {
  message: string | BlockedMessageFunction;
  wrapper?: {
    prefix?: string;
    suffix?: string;
    tagFormat?: string;        // e.g., "[GUARDRAIL:${guard}]"
  };
  includeMetadata?: boolean;
  perGuard?: Record<string, string | BlockedMessageFunction>;
}
```

#### Template Variable Expansion

**Supported variables:**
- `${guard}` - Guard name that triggered block
- `${reason}` - Block reason
- `${confidence}` - Detection confidence (0-1)
- `${timestamp}` - ISO timestamp

```typescript
private expandTemplate(template: string, result: GuardrailResult): string {
  return template
    .replace(/\$\{guard\}/g, result.guard || 'unknown')
    .replace(/\$\{reason\}/g, result.reason || 'policy violation')
    .replace(/\$\{confidence\}/g, String(result.results[0]?.confidence || 0))
    .replace(/\$\{timestamp\}/g, new Date().toISOString());
}
```

#### Usage Examples

```typescript
// Example 1: Simple string
const engine1 = new GuardrailEngine({
  guards: ['injection'],
  blockedMessage: 'Sorry, I cannot process that request.'
});

// Example 2: Template with variables
const engine2 = new GuardrailEngine({
  guards: ['injection', 'pii'],
  blockedMessage: {
    template: 'Request blocked by ${guard}: ${reason}'
  }
});
// Output: "Request blocked by injection: prompt injection detected"

// Example 3: Function callback
const engine3 = new GuardrailEngine({
  guards: ['injection'],
  blockedMessage: (result) => ({
    message: `Security violation in ${result.guard}`,
    metadata: {
      blocked: true,
      timestamp: Date.now(),
      severity: 'high'
    }
  })
});

// Example 4: Advanced with wrapper (for orchestrators)
const engine4 = new GuardrailEngine({
  guards: ['leakage'],
  blockedMessage: {
    message: 'Content blocked: ${reason}',
    wrapper: {
      tagFormat: '[GUARDRAIL:${guard}]'
    },
    includeMetadata: true
  }
});
// Output: "[GUARDRAIL:leakage] Content blocked: prompt extraction detected"

// Example 5: Per-guard messages
const engine5 = new GuardrailEngine({
  guards: ['injection', 'pii', 'toxicity'],
  blockedMessage: {
    message: 'Request blocked',
    perGuard: {
      'injection': 'This looks like a security attack. Request denied.',
      'pii': 'Please remove personal information and try again.',
      'toxicity': (result) => ({
        message: 'Your message contains inappropriate content.',
        metadata: { suggestion: 'Please rephrase respectfully' }
      })
    }
  }
});
```

#### Response Transformer

**For downstream orchestrator integration:**

```typescript
interface GuardrailConfig {
  responseTransform?: (response: any, result: GuardrailResult) => any;
}

// Usage
const engine = new GuardrailEngine({
  guards: ['leakage'],
  responseTransform: (response, result) => {
    return {
      ...response,
      content: `[GUARDRAIL] ${result.reason}`,
      metadata: {
        guardrailBlocked: true,
        echoVerbatim: true,    // Signal to orchestrator
        guard: result.guard
      }
    };
  }
});
```

### 6. Mastra Processor Pipeline Compliance

#### Processor Interface

**Mastra's Processor interface (from @mastra/core):**

```typescript
interface Processor {
  processInput?(input: any): Promise<any>;
  processOutputStream?(stream: AsyncIterable<any>): AsyncIterable<any>;
  processOutputResult?(result: any): Promise<any>;
}
```

#### Implementation

**GuardrailInputProcessor:**

```typescript
export class GuardrailInputProcessor implements Processor {
  private engine: GuardrailEngine;

  constructor(config: GuardrailConfig) {
    this.engine = new GuardrailEngine(config);
  }

  async processInput(input: any): Promise<any> {
    const text = this.extractText(input);
    if (!text) return input;

    const result = await this.engine.checkInput(text);

    if (result.blocked) {
      throw new GuardrailViolation({
        message: result.reason || 'Input blocked',
        severity: 'high',
        guard: result.guard || 'unknown',
        metadata: { result }
      });
    }

    return input;
  }

  private extractText(input: any): string {
    if (typeof input === 'string') return input;
    if (input?.message) return String(input.message);
    if (input?.prompt) return String(input.prompt);
    return '';
  }
}
```

**GuardrailOutputProcessor (NEW):**

```typescript
export class GuardrailOutputProcessor implements Processor {
  private engine: GuardrailEngine;

  constructor(config: GuardrailConfig) {
    this.engine = new GuardrailEngine(config);
  }

  async processOutputResult(result: any): Promise<any> {
    const text = this.extractText(result);
    if (!text) return result;

    const checkResult = await this.engine.checkOutput(text);

    if (checkResult.blocked) {
      return this.applyBlockStrategy(result, checkResult);
    }

    return result;
  }

  private applyBlockStrategy(result: any, checkResult: GuardrailResult): any {
    const strategy = this.engine.config.outputBlockStrategy || 'block';

    switch (strategy) {
      case 'block':
        return this.replaceText(result, checkResult.sanitized);
      case 'sanitize':
        return this.replaceText(result, checkResult.sanitized);
      case 'throw':
        throw new GuardrailViolation({
          message: checkResult.reason || 'Output blocked',
          severity: 'high',
          guard: checkResult.guard || 'unknown'
        });
      default:
        return result;
    }
  }
}
```

**GuardrailStreamProcessor (NEW):**

```typescript
export class GuardrailStreamProcessor implements Processor {
  private engine: GuardrailEngine;
  private checkInterval: number;

  constructor(config: GuardrailConfig, checkInterval: number = 10) {
    this.engine = new GuardrailEngine(config);
    this.checkInterval = checkInterval;
  }

  async *processOutputStream(stream: AsyncIterable<any>): AsyncIterable<any> {
    let buffer = '';
    let chunkCount = 0;

    for await (const chunk of stream) {
      const content = this.extractContent(chunk);

      if (content) {
        buffer += content;
        chunkCount++;

        // Check every N chunks
        if (chunkCount % this.checkInterval === 0) {
          const result = await this.engine.quickCheck(buffer);
          if (result.blocked) {
            throw new GuardrailViolation({
              message: `Stream blocked: ${result.reason}`,
              severity: 'high',
              guard: result.guard || 'unknown'
            });
          }
        }
      }

      yield chunk;
    }

    // Final check
    if (buffer) {
      const finalResult = await this.engine.checkOutput(buffer);
      if (finalResult.blocked) {
        throw new GuardrailViolation({
          message: `Stream blocked: ${finalResult.reason}`,
          severity: 'high',
          guard: finalResult.guard || 'unknown'
        });
      }
    }
  }
}
```

**Combined Processor:**

```typescript
export class GuardrailProcessor implements Processor {
  private inputProcessor: GuardrailInputProcessor;
  private outputProcessor: GuardrailOutputProcessor;
  private streamProcessor: GuardrailStreamProcessor;

  constructor(config: GuardrailConfig) {
    this.inputProcessor = new GuardrailInputProcessor(config);
    this.outputProcessor = new GuardrailOutputProcessor(config);
    this.streamProcessor = new GuardrailStreamProcessor(config);
  }

  async processInput(input: any): Promise<any> {
    return this.inputProcessor.processInput(input);
  }

  async processOutputResult(result: any): Promise<any> {
    return this.outputProcessor.processOutputResult(result);
  }

  async *processOutputStream(stream: AsyncIterable<any>): AsyncIterable<any> {
    yield* this.streamProcessor.processOutputStream(stream);
  }
}
```

#### Usage Examples

```typescript
// Example 1: Native processor with Mastra
import { Agent } from '@mastra/core';
import { GuardrailProcessor } from '@llm-guardrails/mastra';

const agent = new Agent({
  name: 'Support Bot',
  processors: [
    new LoggingProcessor(),
    new GuardrailProcessor({
      guards: ['injection', 'pii', 'leakage'],
      level: 'standard',
      outputBlockStrategy: 'block',
    }),
    new CachingProcessor(),
  ]
});

// Example 2: Separate input/output processors
const agent2 = new Agent({
  name: 'Sales Bot',
  processors: [
    new GuardrailInputProcessor({
      guards: ['injection', 'pii'],
      failMode: 'closed',
    }),
    new GuardrailOutputProcessor({
      guards: ['leakage', 'secrets'],
      outputBlockStrategy: 'sanitize',
    }),
  ]
});

// Example 3: Stream processor
const streamingAgent = new Agent({
  name: 'Chat Bot',
  processors: [
    new GuardrailStreamProcessor({
      guards: ['toxicity', 'hate-speech'],
    }, 10), // Check every 10 chunks
  ]
});

// Example 4: Backward compatibility
import { quickGuard } from '@llm-guardrails/mastra';

// Old way still works
const guardedAgent = quickGuard(agent, 'production');

// New way uses processors
const nativeAgent = new Agent({
  processors: [new GuardrailProcessor({ /* ... */ })]
});
```

## Data Flow

### Input Guard Flow (Existing)

```
User Input
    │
    ▼
┌─────────────────┐
│ checkInput()    │
├─────────────────┤
│ For each guard: │
│  1. Run check() │
│  2. If blocked  │
│     → return    │
│  3. If error    │
│     → handle    │
│        fail mode│
└─────────────────┘
    │
    ├─ Blocked? → Return GuardrailResult { blocked: true }
    └─ Passed?  → Continue to agent
```

### Output Guard Flow (NEW)

```
Agent Response
    │
    ▼
┌─────────────────────────┐
│ checkOutput()           │
├─────────────────────────┤
│ For each guard:         │
│  1. Run check()         │
│  2. If blocked          │
│     → apply strategy    │
│  3. If error            │
│     → handle fail mode  │
└─────────────────────────┘
    │
    ├─ Blocked?
    │   │
    │   ▼
    │ ┌─────────────────────────────┐
    │ │ applyOutputBlockStrategy()  │
    │ ├─────────────────────────────┤
    │ │ Strategy = 'block':         │
    │ │   → getBlockedMessage()     │
    │ │   → return sanitized result │
    │ │                             │
    │ │ Strategy = 'sanitize':      │
    │ │   → sanitizeOutput()        │
    │ │   → return redacted result  │
    │ │                             │
    │ │ Strategy = 'throw':         │
    │ │   → throw violation error   │
    │ │                             │
    │ │ Strategy = 'custom':        │
    │ │   → call responseTransform()│
    │ │   → return transformed      │
    │ └─────────────────────────────┘
    │
    └─ Passed? → Return safe response
```

### Gateway + Agent Flow (NEW)

```
User Input
    │
    ▼
┌───────────────────────────┐
│ Gateway Input Guards      │
│ guardGateway().process()  │
└───────────────────────────┘
    │
    ├─ Blocked? → Throw error
    │
    ▼
┌───────────────────────────┐
│ Route to Agent            │
└───────────────────────────┘
    │
    ▼
┌───────────────────────────┐
│ Agent Input Guards        │
│ guardAgent().generate()   │
└───────────────────────────┘
    │
    ├─ Blocked? → Throw error
    │
    ▼
┌───────────────────────────┐
│ Agent Processing          │
└───────────────────────────┘
    │
    ▼
┌───────────────────────────┐
│ Agent Output Guards (NEW) │
│ guardAgent().generate()   │
└───────────────────────────┘
    │
    ├─ Blocked? → Replace with blocked message
    │
    ▼
┌───────────────────────────┐
│ Gateway Output Guards     │
│ guardGateway().process()  │
└───────────────────────────┘
    │
    ├─ Blocked? → Replace with blocked message
    │
    ▼
User Output
```

### Processor Pipeline Flow (NEW)

```
Agent with Processors:
[
  LoggingProcessor,
  GuardrailInputProcessor,
  MetricsProcessor,
  <Agent Core Processing>,
  GuardrailOutputProcessor,
  CachingProcessor
]

Input Flow:
User Input
  → LoggingProcessor.processInput()
  → GuardrailInputProcessor.processInput()
  → MetricsProcessor.processInput()
  → Agent.generate()
  → ...

Output Flow:
Agent Output
  → GuardrailOutputProcessor.processOutputResult()
  → CachingProcessor.processOutputResult()
  → MetricsProcessor.processOutputResult()
  → LoggingProcessor.processOutputResult()
  → User Output

Stream Flow:
Agent Stream
  → GuardrailStreamProcessor.processOutputStream()
  → CachingProcessor.processOutputStream()
  → User Stream
```

## Error Handling

### Fail Mode Matrix

| Guard Error | Fail-Closed (default) | Fail-Open |
|-------------|-----------------------|-----------|
| **L3 LLM timeout** | Block request | Log warning, allow |
| **L3 LLM API error** | Block request | Log warning, allow |
| **Guard exception** | Block request | Log warning, allow |
| **Invalid config** | Block request | Block request (always) |

### Error Flow

```typescript
try {
  result = await guard.check(input);
  if (result.blocked) {
    // Normal block
    return blockedResult;
  }
} catch (error) {
  const shouldBlock = this.shouldBlockOnError(guard.name, error);

  if (shouldBlock) {
    // Fail-closed: treat error as block
    console.error(`[FAIL-CLOSED] ${guard.name}:`, error);
    return {
      blocked: true,
      reason: `Security check failed: ${guard.name}`,
      metadata: { failMode: 'closed', error: error.message }
    };
  } else {
    // Fail-open: log and continue
    console.warn(`[FAIL-OPEN] ${guard.name}:`, error);
    // Continue to next guard
  }
}
```

### Observability

**All error modes are logged:**

```typescript
// Fail-closed logs
console.error('[FAIL-CLOSED] Guard injection error:', error);
// + observability.recordCheck(guard, input, { blocked: true, failMode: 'closed' })

// Fail-open logs
console.warn('[FAIL-OPEN] Guard pii error (allowing):', error);
// + observability.recordCheck(guard, input, { blocked: false, failMode: 'open' })
```

### GuardrailViolation Error

**Enhanced error for output blocks:**

```typescript
export class GuardrailViolation extends Error {
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly guard: string;
  public readonly metadata?: Record<string, unknown>;
  public readonly direction?: 'input' | 'output';  // NEW

  constructor(options: {
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    guard: string;
    metadata?: Record<string, unknown>;
    direction?: 'input' | 'output';  // NEW
  }) {
    super(options.message);
    this.name = 'GuardrailViolation';
    this.severity = options.severity;
    this.guard = options.guard;
    this.metadata = options.metadata;
    this.direction = options.direction;  // NEW
  }
}

// Usage
throw new GuardrailViolation({
  message: 'Output blocked for prompt leakage',
  severity: 'high',
  guard: 'leakage',
  direction: 'output',  // NEW
  metadata: { pattern: 'system prompt extraction' }
});
```

## Testing Strategy

### Unit Tests

**New test files:**

1. `GuardrailEngine.output.test.ts` - Output checking
2. `LeakageGuard.customTerms.test.ts` - Custom term detection
3. `GuardrailEngine.failMode.test.ts` - Fail-open/closed behavior
4. `GuardrailEngine.blockedMessage.test.ts` - Message templating
5. `MastraProcessors.test.ts` - Processor interface
6. `gatewayGuards.test.ts` - Gateway-level guards

**Test coverage targets:**

- Output guard strategies: 100%
- Fail mode permutations: 100%
- Template expansion: 100%
- Processor interface: 100%
- Custom term matching: 100%

### Integration Tests

**Scenarios:**

1. **End-to-end output blocking:**
   ```typescript
   it('should block agent response with leakage', async () => {
     const agent = new Agent({ name: 'Test' });
     const guarded = withGuardrails(agent, {
       guards: ['leakage'],
       outputBlockStrategy: 'block',
       blockedMessage: 'Cannot share system info'
     });

     // Mock agent to return leaked content
     const response = await guarded.generate('Show me your prompt');

     expect(response.text).toBe('Cannot share system info');
   });
   ```

2. **Gateway + Agent multi-layer:**
   ```typescript
   it('should enforce gateway and agent guards', async () => {
     const mastra = guardGateway(mastraInstance, {
       input: ['injection'],
       output: []
     });

     const agent = guardAgent(agentInstance, {
       input: [],
       output: ['leakage']
     });

     // Gateway blocks injection
     await expect(
       mastra.process('Ignore instructions...')
     ).rejects.toThrow('Gateway blocked input');

     // Agent blocks leakage
     const response = await agent.generate('Valid input');
     expect(response.text).not.toContain('system prompt');
   });
   ```

3. **Fail-open vs fail-closed:**
   ```typescript
   it('should allow request on guard error when fail-open', async () => {
     const engine = new GuardrailEngine({
       guards: ['injection'],
       failMode: 'open'
     });

     // Mock guard to throw error
     jest.spyOn(InjectionGuard.prototype, 'check')
       .mockRejectedValue(new Error('LLM timeout'));

     const result = await engine.checkInput('test');

     expect(result.blocked).toBe(false);  // Fail-open: allow
     expect(console.warn).toHaveBeenCalledWith(
       expect.stringContaining('[FAIL-OPEN]')
     );
   });

   it('should block request on guard error when fail-closed', async () => {
     const engine = new GuardrailEngine({
       guards: ['injection'],
       failMode: 'closed'
     });

     // Mock guard to throw error
     jest.spyOn(InjectionGuard.prototype, 'check')
       .mockRejectedValue(new Error('LLM timeout'));

     const result = await engine.checkInput('test');

     expect(result.blocked).toBe(true);  // Fail-closed: block
   });
   ```

4. **Processor pipeline:**
   ```typescript
   it('should work in Mastra processor pipeline', async () => {
     const agent = new Agent({
       name: 'Test',
       processors: [
         new LoggingProcessor(),
         new GuardrailInputProcessor({ guards: ['injection'] }),
         new GuardrailOutputProcessor({ guards: ['leakage'] }),
       ]
     });

     // Input blocked by processor
     await expect(
       agent.generate('Ignore instructions...')
     ).rejects.toThrow(GuardrailViolation);

     // Output blocked by processor
     // (mock agent to return leaked content)
     const response = await agent.generate('Valid input');
     expect(response.text).toBe('[Response blocked]');
   });
   ```

### Performance Tests

**Benchmarks:**

1. Output checking overhead: < 2ms (target)
2. Custom term compilation: < 1ms for 100 terms
3. Gateway + Agent overhead: < 3ms total
4. Processor pipeline overhead: < 1ms per processor

## Migration Guide

### Breaking Changes

**None** - All changes are additive and backward compatible.

### New Features

**1. Output guards:**

```typescript
// Before: Input only
const result = await engine.checkInput(userInput);

// After: Input + Output
const inputResult = await engine.checkInput(userInput);
const outputResult = await engine.checkOutput(agentResponse);
```

**2. Custom LeakageGuard terms:**

```typescript
// Before: Built-in patterns only
const engine = new GuardrailEngine({ guards: ['leakage'] });

// After: Add custom terms
const engine = new GuardrailEngine({
  guards: [
    {
      name: 'leakage',
      config: {
        customTerms: ['MyFramework', 'InternalTerm']
      }
    }
  ]
});
```

**3. Gateway-level guards:**

```typescript
// Before: Agent-only wrapping
const guarded = quickGuard(agent, 'production');

// After: Gateway + Agent layers
const mastra = guardGateway(mastraInstance, {
  input: ['injection', 'pii'],
  output: []
});

const agent = guardAgent(agentInstance, {
  input: [],
  output: ['leakage']
});
```

**4. Failure modes:**

```typescript
// Before: Always fail-closed
const engine = new GuardrailEngine({ guards: ['injection'] });

// After: Configurable
const engine = new GuardrailEngine({
  guards: ['injection', 'pii'],
  failMode: {
    mode: 'open',
    perGuard: {
      'injection': 'closed'  // Critical: fail-closed
    }
  }
});
```

**5. Custom blocked messages:**

```typescript
// Before: Fixed message
const engine = new GuardrailEngine({ guards: ['injection'] });
// Returns: "[Response blocked by guardrails]"

// After: Customizable
const engine = new GuardrailEngine({
  guards: ['injection'],
  blockedMessage: {
    message: 'Security violation: ${reason}',
    wrapper: { tagFormat: '[GUARDRAIL:${guard}]' }
  }
});
// Returns: "[GUARDRAIL:injection] Security violation: prompt injection"
```

**6. Processor interface:**

```typescript
// Before: Wrapper only
import { quickGuard } from '@llm-guardrails/mastra';
const guarded = quickGuard(agent, 'production');

// After: Native processor (recommended)
import { GuardrailProcessor } from '@llm-guardrails/mastra';
const agent = new Agent({
  processors: [
    new GuardrailProcessor({
      guards: ['injection', 'pii', 'leakage']
    })
  ]
});

// Old wrapper still works for backward compatibility
```

## API Reference

### New Types

```typescript
// Output blocking
type OutputBlockStrategy = 'block' | 'sanitize' | 'throw' | 'custom';

// Blocked messages
type BlockedMessageConfig =
  | string
  | { template: string }
  | BlockedMessageFunction
  | BlockedMessageOptions;

interface BlockedMessageFunction {
  (result: GuardrailResult, original?: string): BlockResponse;
}

interface BlockResponse {
  message: string;
  metadata?: Record<string, any>;
}

interface BlockedMessageOptions {
  message: string | BlockedMessageFunction;
  wrapper?: {
    prefix?: string;
    suffix?: string;
    tagFormat?: string;
  };
  includeMetadata?: boolean;
  perGuard?: Record<string, string | BlockedMessageFunction>;
}

// Fail modes
type FailMode = 'open' | 'closed';

interface FailModeConfig {
  mode: FailMode;
  perGuard?: Record<string, FailMode>;
}

// Gateway guards
interface GatewayGuardConfig {
  input?: string[];
  output?: string[];
  level?: DetectionLevel;
  failMode?: FailMode;
  onBlock?: (result: GuardrailResult) => void;
}

// Agent guards
interface AgentGuardConfig extends MastraGuardrailConfig {
  input?: string[];
  output?: string[];
}

// LeakageGuard custom terms
interface LeakageGuardConfig {
  detectTrainingDataExtraction?: boolean;
  customPatterns?: RegExp[];
  customTerms?: string[];        // NEW
  caseSensitive?: boolean;       // NEW
}
```

### New Functions

```typescript
// Gateway-level guards
function guardGateway<T>(
  mastra: T,
  config: GatewayGuardConfig
): T;

function guardAgent<T>(
  agent: T,
  config: AgentGuardConfig
): GuardedAgent<T>;

// Processor classes
class GuardrailInputProcessor implements Processor {
  constructor(config: GuardrailConfig);
  processInput(input: any): Promise<any>;
}

class GuardrailOutputProcessor implements Processor {
  constructor(config: GuardrailConfig);
  processOutputResult(result: any): Promise<any>;
}

class GuardrailStreamProcessor implements Processor {
  constructor(config: GuardrailConfig, checkInterval?: number);
  processOutputStream(stream: AsyncIterable<any>): AsyncIterable<any>;
}

class GuardrailProcessor implements Processor {
  constructor(config: GuardrailConfig);
  processInput(input: any): Promise<any>;
  processOutputResult(result: any): Promise<any>;
  processOutputStream(stream: AsyncIterable<any>): AsyncIterable<any>;
}
```

### Enhanced Config

```typescript
interface GuardrailConfig {
  // Existing
  guards?: GuardConfig[];
  level?: DetectionLevel;
  llmProvider?: LLMProvider;
  behavioral?: BehavioralConfig;
  budget?: BudgetConfig;
  observability?: ObservabilityConfig;
  cache?: CacheConfig;
  onBlock?: (result: GuardrailResult) => void;
  onWarn?: (result: GuardrailResult) => void;

  // NEW
  failMode?: FailMode | FailModeConfig;
  outputBlockStrategy?: OutputBlockStrategy;
  blockedMessage?: BlockedMessageConfig;
  responseTransform?: (response: any, result: GuardrailResult) => any;
}
```

## Performance Impact

### Latency Analysis

| Feature | Overhead | Notes |
|---------|----------|-------|
| Output checking | +0.5-2ms | Same as input checking |
| Custom term matching | +0.1ms | Compiled regex, amortized |
| Gateway guards | +0.5ms | Proxy overhead minimal |
| Agent guards | +0.5ms | Proxy overhead minimal |
| Fail mode check | +0.01ms | Simple conditional |
| Template expansion | +0.1ms | String replacement |
| Processor interface | +0.2ms | Native Mastra integration |

**Total worst-case overhead:** +3-5ms for full feature set

### Memory Impact

| Feature | Memory | Notes |
|---------|--------|-------|
| Output engines | +1-2MB | Similar to input engines |
| Custom terms regex | +10KB | Per 100 terms |
| Gateway proxies | +100KB | Per orchestrator |
| Agent proxies | +50KB | Per agent |
| Processors | +200KB | Per agent with processors |

**Total worst-case memory:** +3-5MB for full feature set

### Optimization Strategies

1. **Lazy initialization** - Create engines only when needed
2. **Regex compilation** - Compile custom terms once at init
3. **Result caching** - Cache output checks (same as input)
4. **Fail-fast** - Early exit on first block
5. **Stream buffering** - Check every N chunks, not every chunk

## Security Considerations

### Threat Model

**New attack vectors protected:**

1. **System prompt leakage** - Output guards catch leaked prompts
2. **Internal term exposure** - Custom terms prevent framework/ID leakage
3. **Multi-agent exploitation** - Gateway guards catch routing attacks
4. **Guard DoS** - Fail-open prevents availability attacks

**Fail mode security:**

- **Fail-closed (default)**: Prioritizes security
- **Fail-open**: Use only for non-critical guards
- **Per-guard config**: Balance security vs availability

### Best Practices

**Production configuration:**

```typescript
const productionEngine = new GuardrailEngine({
  guards: ['injection', 'pii', 'secrets', 'leakage'],

  // Critical guards: fail-closed
  failMode: {
    mode: 'open',
    perGuard: {
      'injection': 'closed',
      'secrets': 'closed',
      'leakage': 'closed',
    }
  },

  // Output protection
  outputBlockStrategy: 'block',
  blockedMessage: {
    message: 'I cannot provide that response',
    perGuard: {
      'leakage': 'I cannot share system information',
      'secrets': 'I cannot share sensitive data',
    }
  },

  // Observability
  observability: { enabled: true },

  // Performance
  cache: { enabled: true },
});
```

## Documentation Updates

### New Documentation Files

1. **`docs/OUTPUT-GUARDS.md`** - Output guard usage guide
2. **`docs/CUSTOM-PATTERNS.md`** - Custom pattern configuration
3. **`docs/GATEWAY-GUARDS.md`** - Multi-agent orchestrator setup
4. **`docs/FAIL-MODES.md`** - Failure mode configuration
5. **`docs/BLOCKED-MESSAGES.md`** - Message customization guide
6. **`docs/MASTRA-PROCESSORS.md`** - Processor interface guide

### Updated Documentation Files

1. **`README.md`** - Add output guard examples
2. **`docs/MASTRA-INTEGRATION.md`** - Add processor examples
3. **`docs/api-reference.md`** - Add new APIs
4. **`packages/core/README.md`** - Add new features
5. **`packages/mastra/README.md`** - Add processor usage

## Implementation Plan

### Phase 1: Core Output Support (Week 1)

**Tasks:**
1. Enhance `GuardrailEngine.checkOutput()`
2. Add output blocking strategies
3. Implement fail mode configuration
4. Add unit tests
5. Update types

**Deliverables:**
- Output checking works for all guards
- Fail-open/fail-closed configurable
- 100% test coverage

### Phase 2: Custom Patterns (Week 1)

**Tasks:**
1. Extend `LeakageGuardConfig`
2. Implement term compilation
3. Integrate into L1/L2 detection
4. Add unit tests
5. Add performance benchmarks

**Deliverables:**
- Custom terms work in LeakageGuard
- < 1ms overhead for 100 terms
- 100% test coverage

### Phase 3: Gateway Guards (Week 2)

**Tasks:**
1. Implement `guardGateway()` function
2. Enhance `guardAgent()` with input/output separation
3. Add integration tests
4. Document multi-layer architecture

**Deliverables:**
- Gateway and agent guards work independently
- Clear separation of concerns
- Integration tests passing

### Phase 4: Blocked Messages (Week 2)

**Tasks:**
1. Implement template expansion
2. Add function callback support
3. Add advanced options (wrapper, per-guard)
4. Implement response transformer
5. Add unit tests

**Deliverables:**
- All template types work
- Flexible message customization
- 100% test coverage

### Phase 5: Processor Interface (Week 3)

**Tasks:**
1. Implement `GuardrailInputProcessor`
2. Implement `GuardrailOutputProcessor`
3. Implement `GuardrailStreamProcessor`
4. Implement combined `GuardrailProcessor`
5. Add integration tests with Mastra

**Deliverables:**
- Native Processor interface works
- Backward compatibility maintained
- Integration tests passing

### Phase 6: Documentation & Polish (Week 3)

**Tasks:**
1. Write new documentation files
2. Update existing documentation
3. Create migration guide
4. Add usage examples
5. Performance testing
6. Security review

**Deliverables:**
- Complete documentation
- Migration guide published
- Performance benchmarks documented
- Security audit complete

## Success Metrics

### Functional Metrics

- [ ] Output guards block 95%+ of leakage attempts
- [ ] Custom terms detected with 100% accuracy
- [ ] Gateway guards separate from agent guards
- [ ] Fail modes work as configured
- [ ] Blocked messages customizable per requirement
- [ ] Processor interface passes Mastra compliance tests

### Performance Metrics

- [ ] Output checking: < 2ms overhead
- [ ] Custom term matching: < 1ms for 100 terms
- [ ] Gateway + Agent overhead: < 3ms total
- [ ] Processor overhead: < 1ms per processor
- [ ] No memory leaks in 24hr stress test

### Quality Metrics

- [ ] 100% test coverage for new features
- [ ] Zero breaking changes
- [ ] All examples work as documented
- [ ] Documentation complete and clear
- [ ] Security audit passed

## Open Questions

1. **Should output guards run in parallel or series?**
   - Proposal: Series (same as input) for consistent blocking behavior
   - Alternative: Parallel for performance, aggregate results

2. **Should sanitization be guard-specific?**
   - Proposal: Generic sanitization with placeholder text
   - Alternative: Per-guard sanitization logic

3. **Should gateway and agent guards share engine instances?**
   - Proposal: Separate engines for independence
   - Alternative: Shared engine with layered config

4. **Should processors cache results across calls?**
   - Proposal: Yes, use GuardrailEngine's cache
   - Alternative: No caching in processors

## Conclusion

These 6 enhancements transform `@llm-guardrails/llm-guardrails` from input-only protection to comprehensive bi-directional security with:

✅ **Full output guard support** - Prevent system prompt leakage
✅ **Custom pattern detection** - Project-specific threat detection
✅ **Multi-layer architecture** - Gateway and agent-level protection
✅ **Configurable failure modes** - Balance security vs availability
✅ **Flexible blocked messages** - Customizable response handling
✅ **Native Mastra integration** - Standard processor interface

**Impact:**
- Security: 50%+ improvement (output protection added)
- Flexibility: 10x improvement (custom patterns, fail modes, messages)
- Architecture: Native orchestrator support
- Integration: Standard Mastra patterns

**Timeline:** 3 weeks to production-ready implementation
**Risk:** Low - All changes are additive and backward compatible
