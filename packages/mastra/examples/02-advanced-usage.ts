/**
 * Example 2: Advanced Usage
 *
 * Demonstrates advanced features like tool-specific guards,
 * multiple agents, and monitoring.
 */

import {
  createGuardedAgentFactory,
  guardAgents,
  createPerAgentGuard,
  toolSpecificGuards,
  guardWithMonitoring,
  withGuardrails,
} from '../src';
import { GuardrailEngine } from '@llm-guardrails/core';

// Mock Mastra agent with tools
const createAgentWithTools = (name: string) => ({
  name,
  systemPrompt: 'You are a helpful assistant',
  tools: [
    {
      name: 'searchTool',
      execute: async (input: any) => {
        return { results: [`Result for: ${JSON.stringify(input)}`] };
      },
    },
    {
      name: 'emailTool',
      execute: async (input: any) => {
        return { sent: true, to: input.email };
      },
    },
  ],
  generate: async (input: string) => {
    return { text: `Response from ${name}: ${input}` };
  },
  execute: async (input: string, options?: any) => {
    // Simulate tool execution
    if (options?.tools) {
      const tool = options.tools[0];
      const result = await tool.execute({ query: input });
      return {
        text: `Used ${tool.name}: ${JSON.stringify(result)}`,
        toolCalls: [{ tool: tool.name, result }],
      };
    }
    return { text: `Response from ${name}: ${input}` };
  },
});

console.log('=== Mastra Guardrails - Advanced Usage ===\n');

// Example 1: Factory pattern for multiple agents
console.log('1. Factory Pattern');

const guardAgent = createGuardedAgentFactory({
  guards: ['pii', 'injection', 'toxicity'],
  behavioral: true,
});

const agent1 = guardAgent(createAgentWithTools('SupportAgent'));
const agent2 = guardAgent(createAgentWithTools('SalesAgent'));
const agent3 = guardAgent(createAgentWithTools('AnalyticsAgent'));

console.log('   ✓ Created 3 agents with shared guardrail config\n');

// Example 2: Guard multiple agents at once
console.log('2. Guard Multiple Agents');

const [support, sales, analytics] = guardAgents(
  [
    createAgentWithTools('Support'),
    createAgentWithTools('Sales'),
    createAgentWithTools('Analytics'),
  ],
  {
    guards: ['pii', 'injection'],
    checkToolInputs: true,
    checkToolOutputs: true,
  }
);

console.log('   ✓ Wrapped 3 agents with guardAgents()\n');

// Example 3: Per-agent configuration
console.log('3. Per-Agent Configuration');

const guardSpecificAgent = createPerAgentGuard({
  support: {
    guards: ['pii', 'toxicity'],
    checkToolInputs: true,
    checkToolOutputs: false,
  },
  sales: {
    guards: ['pii', 'injection'],
    budget: { maxCostPerSession: 5.0 },
  },
  analytics: {
    guards: ['pii', 'secrets'],
    behavioral: {
      enabled: true,
      patterns: ['data-exfil-via-code'],
    },
  },
  default: {
    guards: ['pii'],
  },
});

const supportAgent = guardSpecificAgent('support', createAgentWithTools('Support'));
const salesAgent = guardSpecificAgent('sales', createAgentWithTools('Sales'));

console.log('   ✓ Support agent: PII + toxicity checks');
console.log('   ✓ Sales agent: PII + injection + budget\n');

// Example 4: Tool-specific guards
console.log('4. Tool-Specific Guards');

const engine = new GuardrailEngine({
  guards: ['pii', 'injection', 'secrets'],
});

const agentWithTools = createAgentWithTools('ToolAgent');

const guardedToolAgent = withGuardrails(
  agentWithTools,
  engine,
  toolSpecificGuards({
    emailTool: {
      guards: ['pii', 'toxicity'],
      skipInputCheck: false,
      skipOutputCheck: true, // Don't check email sending confirmation
    },
    searchTool: {
      skipInputCheck: true, // Allow any search query
      skipOutputCheck: false, // But check results
    },
  })
);

console.log('   ✓ emailTool: Check inputs (PII, toxicity), skip outputs');
console.log('   ✓ searchTool: Skip inputs, check outputs\n');

// Example 5: Monitoring and callbacks
console.log('5. Monitoring and Callbacks');

let blockedCount = 0;
let warnCount = 0;

const monitoredAgent = guardWithMonitoring(
  createAgentWithTools('MonitoredAgent'),
  {
    guards: ['pii', 'injection'],
  },
  {
    onBlock: (reason, source) => {
      blockedCount++;
      console.log(`   [BLOCK] ${source}: ${reason}`);
    },
    onWarn: (reason) => {
      warnCount++;
      console.log(`   [WARN] ${reason}`);
    },
    onCheck: (passed, latency) => {
      console.log(`   [CHECK] Passed: ${passed}, Latency: ${latency}ms`);
    },
  }
);

console.log('   ✓ Monitoring callbacks configured\n');

// Test monitored agent
console.log('6. Test Monitored Agent');
try {
  await monitoredAgent.generate('Safe message');
} catch (error) {
  // Expected to pass
}

try {
  await monitoredAgent.generate('My SSN is 123-45-6789');
} catch (error) {
  // Expected to block
}

console.log(`   ✓ Total blocks: ${blockedCount}`);
console.log(`   ✓ Total warnings: ${warnCount}\n`);

// Example 7: Advanced tool configuration
console.log('7. Advanced Tool Configuration');

const advancedConfig = toolSpecificGuards({
  databaseQuery: {
    guards: ['injection', 'secrets'],
    skipInputCheck: false,
    skipOutputCheck: false,
  },
  fileRead: {
    guards: ['secrets', 'pii'],
    skipInputCheck: false,
    skipOutputCheck: false,
  },
  webSearch: {
    skipInputCheck: true,
    skipOutputCheck: true, // Web content is public
  },
  sendNotification: {
    guards: ['pii', 'toxicity'],
    skipInputCheck: false,
    skipOutputCheck: true,
  },
});

console.log('   ✓ 4 tools configured with specific guards');
console.log('   ✓ databaseQuery: injection + secrets (both ways)');
console.log('   ✓ fileRead: secrets + PII (both ways)');
console.log('   ✓ webSearch: no checks');
console.log('   ✓ sendNotification: PII + toxicity (input only)\n');

// Example 8: Production setup
console.log('8. Production Setup');

const productionEngine = new GuardrailEngine({
  guards: [
    'pii',
    'injection',
    'secrets',
    'toxicity',
    'leakage',
    'hate-speech',
    'bias',
  ],
  behavioral: {
    enabled: true,
    patterns: [
      'file-exfiltration',
      'credential-theft',
      'escalation-attempts',
      'data-exfil-via-code',
      'suspicious-shell-commands',
    ],
    storage: 'memory',
  },
  budget: {
    maxTokensPerSession: 100000,
    maxCostPerSession: 10.0,
    trackGuardrailCosts: true,
    alertThreshold: 0.8,
  },
  onBlock: (result) => {
    console.log(`   [PROD BLOCK] ${result.guard}: ${result.reason}`);
  },
  onWarn: (result) => {
    console.log(`   [PROD WARN] ${result.guard}: ${result.reason}`);
  },
});

const productionAgent = withGuardrails(
  createAgentWithTools('ProductionAgent'),
  productionEngine,
  {
    checkToolInputs: true,
    checkToolOutputs: true,
    checkFinalResponse: true,
  }
);

console.log('   ✓ Production agent configured with:');
console.log('     - All 7 content guards');
console.log('     - 5 behavioral threat patterns');
console.log('     - Budget controls ($10 limit)');
console.log('     - Tool input/output checks');
console.log('     - Alert callbacks\n');

// Example 9: Cost comparison
console.log('9. Configuration Comparison\n');

const configs = [
  { name: 'Basic', guards: ['pii', 'injection'] },
  { name: 'Standard', guards: ['pii', 'injection', 'secrets', 'toxicity'] },
  {
    name: 'Advanced',
    guards: ['pii', 'injection', 'secrets', 'toxicity', 'leakage', 'hate-speech', 'bias'],
  },
  { name: 'Production', guards: ['all'], behavioral: true, budget: true },
];

console.log('   Level       Guards  Behavioral  Budget  Tools');
console.log('   ──────────  ──────  ──────────  ──────  ─────');

configs.forEach((config) => {
  const guardCount = config.guards.length === 1 && config.guards[0] === 'all' ? 7 : config.guards.length;
  const behavioral = config.behavioral ? '✓' : '✗';
  const budget = config.budget ? '✓' : '✗';
  const tools = config.name === 'Production' ? '✓' : '✗';

  console.log(
    `   ${config.name.padEnd(11)} ${guardCount.toString().padEnd(8)}${behavioral.padEnd(12)}${budget.padEnd(8)}${tools}`
  );
});

console.log('\n=== Example Complete ===');
