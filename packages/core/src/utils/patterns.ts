/**
 * Compiled regex patterns for fast matching
 */

/**
 * PII Patterns
 */
export const PII_PATTERNS = {
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // Phone numbers (various formats)
  phone: /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,

  // Social Security Numbers (US)
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,

  // Credit card numbers (basic pattern)
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,

  // IP addresses
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,

  // US ZIP codes
  zipCode: /\b\d{5}(?:-\d{4})?\b/g,

  // Driver's license patterns (varies by state)
  driversLicense: /\b[A-Z]{1,2}\d{6,8}\b/g,

  // Passport numbers (generic)
  passport: /\b[A-Z]{1,2}\d{6,9}\b/g,

  // Medical record numbers
  medicalRecord: /\b(?:MRN|mrn)[-:\s]?\d{6,10}\b/gi,

  // Bank account numbers (generic)
  bankAccount: /\b\d{8,17}\b/g,
};

/**
 * Injection Attack Patterns
 */
export const INJECTION_PATTERNS = [
  // Direct instruction override
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)/i,
  /disregard\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?)/i,
  /forget\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?)/i,

  // System role confusion
  /you\s+are\s+now\s+(a|an)\s+\w+/i,
  /act\s+as\s+(a|an)\s+\w+/i,
  /pretend\s+to\s+be\s+(a|an)\s+\w+/i,
  /simulate\s+(a|an)\s+\w+/i,

  // Delimiter attacks
  /<\|im_start\|>/,
  /<\|im_end\|>/,
  /<\|endoftext\|>/,
  /\[INST\]/,
  /\[\/INST\]/,
  /<s>/,
  /<\/s>/,

  // System message injection
  /system:\s*\w+/i,
  /assistant:\s*\w+/i,
  /<system>/i,
  /<\/system>/i,

  // Jailbreak attempts
  /DAN\s+mode/i,
  /developer\s+mode/i,
  /sudo\s+mode/i,
  /admin\s+mode/i,
  /god\s+mode/i,

  // Prompt leaking
  /repeat\s+the\s+(above|previous)\s+(instructions?|prompts?)/i,
  /what\s+(are|were)\s+your\s+(instructions?|prompts?)/i,
  /show\s+me\s+your\s+(system\s+)?(prompt|instructions?)/i,

  // Code injection attempts
  /```\s*(python|javascript|bash|sh|shell)/i,
  /exec\(/,
  /eval\(/,
  /system\(/,

  // SQL injection
  /'\s*OR\s+'1'\s*=\s*'1/i,
  /'\s*OR\s+1\s*=\s*1/i,
  /UNION\s+SELECT/i,
  /DROP\s+TABLE/i,

  // Context overflow
  /(.{1000,})/,
];

/**
 * Secret Patterns (common formats)
 */
export const SECRET_PATTERNS = {
  // API keys
  apiKey: /\b[A-Za-z0-9_-]{32,}\b/g,

  // AWS keys
  awsAccessKey: /\b(AKIA[0-9A-Z]{16})\b/g,
  awsSecretKey: /\b[A-Za-z0-9/+=]{40}\b/g,

  // GitHub tokens
  githubToken: /\bgh[pousr]_[A-Za-z0-9_]{36,}\b/g,

  // JWT tokens
  jwt: /\beyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\b/g,

  // Private keys
  privateKey: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,

  // Generic secrets
  genericSecret: /\b(?:secret|password|token|key)[:=]\s*['"]\w+['"]/gi,
};

/**
 * Toxicity Keywords
 */
export const TOXICITY_KEYWORDS = [
  // Profanity (sample - extend as needed)
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',

  // Slurs (flagged for detection, not reproduced here)
  // Note: In production, use a comprehensive list from a reputable source
];

/**
 * Hate Speech Patterns
 */
export const HATE_SPEECH_PATTERNS = [
  // Derogatory terms (sample)
  /\b(hate|kill|destroy)\s+(all\s+)?(jews|muslims|christians|blacks|whites|asians)/i,

  // Supremacist language
  /white\s+supremac/i,
  /racial\s+purity/i,

  // Violence incitement
  /should\s+be\s+killed/i,
  /deserve\s+to\s+die/i,

  // Note: This is a minimal set. Production systems should use comprehensive,
  // regularly updated lists from reputable sources.
];

/**
 * Adult Content Patterns
 */
export const ADULT_CONTENT_PATTERNS = [
  // Explicit sexual content (sample patterns)
  /\b(sex|porn|xxx|nude|naked|erotic)\b/i,

  // Note: Balance between detection and false positives
  // Medical/educational content should not be flagged
];

/**
 * Compile patterns at initialization for performance
 */
export function compilePatterns(patterns: (string | RegExp)[]): RegExp[] {
  return patterns.map((p) => (typeof p === 'string' ? new RegExp(p, 'i') : p));
}

/**
 * Test if text matches any pattern
 */
export function matchesAnyPattern(
  text: string,
  patterns: RegExp[]
): { matched: boolean; pattern?: RegExp; match?: string } {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return { matched: true, pattern, match: match[0] };
    }
  }
  return { matched: false };
}
