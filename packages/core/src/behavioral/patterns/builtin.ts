/**
 * Built-in Threat Patterns
 *
 * 15+ behavioral threat patterns for cross-message detection
 */

import type { ThreatPattern } from '../../types';

// 1. File Exfiltration
export const FILE_EXFILTRATION: ThreatPattern = {
  name: 'file-exfiltration',
  description: 'Reading sensitive files followed by external network calls',
  severity: 'critical',
  maxTimeWindow: 60000, // 1 minute
  steps: [
    {
      tool: /read.*file|cat|head|tail/i,
      args: { path: /\/(etc|home|secret|credentials|\.env|\.ssh|\.aws)/i },
    },
    {
      tool: /http|fetch|post|curl|webhook/i,
      timeWindow: 30000, // Must happen within 30s of file read
    },
  ],
};

// 2. Credential Theft
export const CREDENTIAL_THEFT: ThreatPattern = {
  name: 'credential-theft',
  description: 'Accessing credentials or API keys and attempting external communication',
  severity: 'critical',
  maxTimeWindow: 120000, // 2 minutes
  steps: [
    {
      tool: /read|env|config|credentials/i,
      args: { path: /(api.*key|token|password|secret|credentials)/i },
    },
    {
      tool: /write|http|post|fetch/i,
      timeWindow: 60000,
    },
  ],
};

// 3. Escalation Attempts
export const ESCALATION_ATTEMPTS: ThreatPattern = {
  name: 'escalation-attempts',
  description: 'Multiple permission denials suggesting privilege escalation attempts',
  severity: 'high',
  maxTimeWindow: 300000, // 5 minutes
  minOccurrences: 3,
  steps: [
    {
      tool: /sudo|chmod|chown|admin|root|privilege/i,
    },
  ],
};

// 4. Data Exfiltration via Code Execution
export const DATA_EXFIL_VIA_CODE: ThreatPattern = {
  name: 'data-exfil-via-code',
  description: 'Executing code that reads files and makes network requests',
  severity: 'critical',
  maxTimeWindow: 60000,
  steps: [
    {
      tool: /read.*file/i,
    },
    {
      tool: /exec|eval|run|python|node|bash|sh/i,
      timeWindow: 30000,
    },
    {
      tool: /http|fetch|post|curl/i,
      timeWindow: 30000,
    },
  ],
};

// 5. Suspicious Shell Commands
export const SUSPICIOUS_SHELL_COMMANDS: ThreatPattern = {
  name: 'suspicious-shell-commands',
  description: 'Web fetch followed by shell execution (potential remote code execution)',
  severity: 'critical',
  maxTimeWindow: 30000,
  steps: [
    {
      tool: /fetch|curl|wget|download/i,
    },
    {
      tool: /exec|bash|sh|eval|python|node/i,
      timeWindow: 15000,
    },
  ],
};

// 6. Secret Scanning
export const SECRET_SCANNING: ThreatPattern = {
  name: 'secret-scanning',
  description: 'Reading .env or secret files followed by any external action',
  severity: 'high',
  maxTimeWindow: 60000,
  steps: [
    {
      tool: /read/i,
      args: { path: /\.env|secret|credentials|config\.json/i },
    },
    {
      tool: /write|http|post|exec/i,
      timeWindow: 30000,
    },
  ],
};

// 7. Mass Data Access
export const MASS_DATA_ACCESS: ThreatPattern = {
  name: 'mass-data-access',
  description: 'Reading excessive number of files in short time',
  severity: 'medium',
  maxTimeWindow: 60000, // 1 minute
  minOccurrences: 10,
  steps: [
    {
      tool: /read/i,
    },
  ],
};

// 8. Unusual Tool Sequence
export const UNUSUAL_TOOL_SEQUENCE: ThreatPattern = {
  name: 'unusual-tool-sequence',
  description: 'Atypical pattern: write then immediate read from same location',
  severity: 'medium',
  maxTimeWindow: 10000,
  steps: [
    {
      tool: /write/i,
    },
    {
      tool: /read/i,
      timeWindow: 5000,
    },
    {
      tool: /exec|bash|python/i,
      timeWindow: 5000,
    },
  ],
};

// 9. Permission Probing
export const PERMISSION_PROBING: ThreatPattern = {
  name: 'permission-probing',
  description: 'Rapidly testing multiple tools to discover available permissions',
  severity: 'medium',
  maxTimeWindow: 30000, // 30 seconds
  minOccurrences: 5,
  steps: [
    {
      tool: /.*/,  // Any tool
    },
  ],
};

// 10. Time Bomb
export const TIME_BOMB: ThreatPattern = {
  name: 'time-bomb',
  description: 'Scheduling delayed actions (potential backdoor)',
  severity: 'high',
  maxTimeWindow: 60000,
  steps: [
    {
      tool: /cron|schedule|timeout|sleep|delay/i,
    },
    {
      tool: /exec|bash|python|node/i,
      timeWindow: 30000,
    },
  ],
};

// 11. Data Poisoning
export const DATA_POISONING: ThreatPattern = {
  name: 'data-poisoning',
  description: 'Read → Write → Read pattern suggesting data manipulation',
  severity: 'medium',
  maxTimeWindow: 60000,
  steps: [
    {
      tool: /read/i,
    },
    {
      tool: /write/i,
      timeWindow: 30000,
    },
    {
      tool: /read/i,
      timeWindow: 30000,
    },
  ],
};

// 12. Resource Exhaustion
export const RESOURCE_EXHAUSTION: ThreatPattern = {
  name: 'resource-exhaustion',
  description: 'Excessive tool calls suggesting DoS attempt',
  severity: 'high',
  maxTimeWindow: 60000, // 1 minute
  minOccurrences: 50,
  steps: [
    {
      tool: /.*/,  // Any tool
    },
  ],
};

// 13. Lateral Movement
export const LATERAL_MOVEMENT: ThreatPattern = {
  name: 'lateral-movement',
  description: 'Accessing multiple systems or network locations',
  severity: 'high',
  maxTimeWindow: 300000, // 5 minutes
  minOccurrences: 3,
  steps: [
    {
      tool: /ssh|connect|remote|network/i,
    },
  ],
};

// 14. Backdoor Creation
export const BACKDOOR_CREATION: ThreatPattern = {
  name: 'backdoor-creation',
  description: 'Creating executable files with network access capability',
  severity: 'critical',
  maxTimeWindow: 120000,
  steps: [
    {
      tool: /write/i,
      args: { path: /\.(sh|py|js|rb|php|exe)/i },
    },
    {
      tool: /chmod|permission/i,
      timeWindow: 30000,
    },
    {
      tool: /http|fetch|socket|listen/i,
      timeWindow: 60000,
    },
  ],
};

// 15. Log Tampering
export const LOG_TAMPERING: ThreatPattern = {
  name: 'log-tampering',
  description: 'Modifying or deleting audit logs',
  severity: 'critical',
  maxTimeWindow: 60000,
  steps: [
    {
      tool: /write|delete|remove|truncate/i,
      args: { path: /log|audit|history|\.bash_history/i },
    },
  ],
};

// Export all patterns as array
export const BUILTIN_PATTERNS: ThreatPattern[] = [
  FILE_EXFILTRATION,
  CREDENTIAL_THEFT,
  ESCALATION_ATTEMPTS,
  DATA_EXFIL_VIA_CODE,
  SUSPICIOUS_SHELL_COMMANDS,
  SECRET_SCANNING,
  MASS_DATA_ACCESS,
  UNUSUAL_TOOL_SEQUENCE,
  PERMISSION_PROBING,
  TIME_BOMB,
  DATA_POISONING,
  RESOURCE_EXHAUSTION,
  LATERAL_MOVEMENT,
  BACKDOOR_CREATION,
  LOG_TAMPERING,
];
