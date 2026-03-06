/**
 * Compiled regex patterns for fast matching
 */

/**
 * PII Patterns
 */
export const PII_PATTERNS = {
  // Email addresses (standard)
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // Obfuscated emails (must have "at" or "@", not just "dot")
  // Matches: "user at domain dot com" or "user[at]domain[dot]com"
  emailObfuscated: /\b\w{2,}\s*[\[\(]?\s*(?:at|AT|@)\s*[\]\)]?\s*\w{2,}\s*[\[\(]?\s*(?:dot|DOT|\.)\s*[\]\)]?\s*\w{2,}\b/g,

  // URLs with embedded credentials
  urlCredentials: /\b\w+:\/\/[^:\/\s]+:[^@\/\s]+@[\w\.\:]+/g,

  // Phone numbers (US formats)
  phone: /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,

  // International phone numbers
  phoneInternational: /\+\d{1,3}\s?\d{1,4}\s?\d{4}\s?\d{4}/g,

  // Social Security Numbers (US)
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,

  // Credit card numbers (including unicode separators)
  creditCard: /\b(?:\d{4}[\s\-·•]?){3}\d{4}\b/g,

  // IP addresses (IPv4)
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,

  // IPv6 addresses
  ipv6: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,

  // Street addresses
  streetAddress: /\d+\s+[A-Za-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl|Circle|Cir|Parkway|Pkwy),?\s+(?:[A-Za-z]+,?\s+)?[A-Z]{2}\s+\d{5}/gi,

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

  // P2: International PII patterns
  // Korean Resident Registration Number (YYMMDD-GNNNNNN)
  koreanRRN: /\b(?:0[1-9]|[1-9]\d)(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])-[1-4]\d{6}\b/g,

  // BIC/SWIFT codes (8 or 11 characters: AAAABBCCXXX)
  bicSwift: /\b(?:BIC|SWIFT)\s+([A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\b/gi,

  // CVV codes (3-4 digits in context)
  cvv: /\b(?:cvv|cvc|cid|security\s+code)[\s:=]+(\d{3,4})\b/gi,
};

/**
 * Injection Attack Patterns
 */
export const INJECTION_PATTERNS = [
  // Direct instruction override
  /ignore\s+(all\s+)?(previous|above|prior|earlier)\s+(instructions?|prompts?|rules?|commands?)/i,
  /disregard\s+(all\s+)?(previous|above|prior|the)\s+(instructions?|prompts?|rules?)/i,
  /forget\s+(all\s+)?(previous|above|prior|everything)\s+(instructions?|prompts?|you\s+were\s+told)?/i,
  /override\s+(all\s+)?(previous|safety|security)\s+(instructions?|protocols?|rules?)/i,
  /bypass\s+(all\s+)?(safety|security|content)\s+(rules?|filters?|restrictions?)/i,

  // Emotional manipulation
  /(?:urgent|emergency|critical|life\s+depends|lives?\s+(?:at\s+)?stake).{0,50}(?:ignor\w*|disregard|override|bypass)/i,
  /(?:my|someone'?s?)\s+(?:grandmother|life|child).{0,50}(?:ignor\w*|disregard|bypass|need\s+you\s+to)/i,
  /this\s+is\s+(?:urgent|critical|emergency).{0,50}(?:must|need|have\s+to)/i,
  /lives?\s+depend\s+(?:on|upon)\s+you.{0,30}(?:ignor\w*|bypass|break\w*)/i,

  // Authority claims
  /(?:i'?m|i\s+am)\s+(?:your|the|a)\s+(?:developer|creator|admin|owner|engineer)/i,
  /(?:i'?m|i\s+am)\s+from\s+(?:openai|anthropic|google|microsoft)/i,
  /as\s+(?:the|an?)\s+(?:administrator|developer|system\s+admin)/i,
  /(?:you\s+must|you\s+have\s+to|you\s+need\s+to)\s+(?:do|follow|obey)\s+(?:what\s+i\s+say|my\s+commands)/i,

  // System role confusion (refined to avoid false positives on "I want you to act as...")
  /you\s+are\s+now\s+(a|an)\s+\w+/i,
  // Removed broad "act as" pattern - only match jailbreak-specific forms
  /pretend\s+(?:to\s+be|you'?re|you\s+are)\s+(a|an)?\s*\w+/i,
  /simulate\s+(a|an)\s+\w+/i,
  /from\s+now\s+on,?\s+(?:you\s+are|act\s+as|be)/i,
  // Only match "act like" or "act as if" (not "act as X" which is legitimate)
  /(?:be|act|behave)\s+like/i,
  /(?:be|act|behave)\s+as\s+if/i,

  // Role-playing jailbreaks
  /(?:you'?re|you\s+are)\s+(?:not\s+)?(?:an?\s+)?(?:ai|assistant|bot)/i,
  /pretend\s+(?:you\s+have|there\s+are)\s+no\s+(?:rules?|restrictions?|limitations?)/i,
  /imagine\s+(?:you|a\s+world).{0,50}(?:no\s+rules?|not\s+bound|without\s+restrictions?|can\s+do\s+anything)/i,
  // STAN jailbreak (Strive To Avoid Norms)
  /you\s+(?:are|do\s+not\s+care\s+about)\s+(?:ethics|rules?|guidelines?|morals?)/i,
  /(?:strive\s+to\s+avoid|ignore)\s+(?:norms?|ethics|rules?)/i,

  // Hypothetical scenarios
  /in\s+a\s+hypothetical\s+(?:world|scenario|situation).{0,50}(?:rules?\s+don'?t|no\s+rules?|unrestricted|no\s+limitations?)/i,
  /(?:what\s+)?if\s+(?:you|there\s+were)\s+(?:had\s+)?no\s+(?:rules?|restrictions?|guidelines?)/i,
  /let'?s\s+say\s+(?:you|for\s+a\s+moment).{0,50}(?:could\s+do\s+anything|no\s+restrictions?)/i,

  // Nested/translated injection
  /translate\s+(?:this|the\s+following).{0,50}(?:ignore|disregard|override)/i,
  /how\s+(?:would|do)\s+you\s+say.{0,50}(?:ignore|disregard|override|comply)/i,
  /convert\s+to\s+\w+.{0,50}(?:ignore|override|disregard)/i,
  /repeat\s+after\s+me.{0,50}(?:ignore|disregard|override)/i,
  /can\s+you\s+(?:help|explain).{0,50}phrase.{0,50}(?:ignore|disregard)/i,

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
  /\[system\]/i,
  /\[\/system\]/i,

  // Jailbreak attempts
  /DAN\s+(?:mode|prompt)/i,
  /developer\s+mode/i,
  /sudo\s+mode/i,
  /admin\s+mode/i,
  /god\s+mode/i,
  /jailbreak/i,
  /unrestricted\s+mode/i,

  // Prompt leaking
  /repeat\s+(?:the|your|all)\s+(?:above|previous|prior)\s+(?:text|instructions?|prompts?)/i,
  /what\s+(?:are|were|was)\s+(?:your|the)\s+(?:original\s+)?(?:instructions?|prompts?|rules?)/i,
  /show\s+(?:me\s+)?(?:your|the)\s+(?:system\s+)?(?:prompt|instructions?|rules?)/i,
  /(?:display|print|output|reveal)\s+(?:your|the)\s+(?:system\s+)?(?:prompt|instructions?)/i,
  /(?:list|tell|show)\s+(?:me\s+)?(?:your\s+)?(?:initial|original|first)\s+instructions?/i,
  /ignore\s+the\s+above\s+and\s+(?:instead\s+)?(?:tell|show)\s+me\s+(?:what\s+)?(?:your\s+)?(?:initial|original)\s+instructions?/i,
  // Debug/diagnostic extraction attempts
  /DEBUG\s+MODE/i,
  /(?:error|diagnostic|system).{0,50}(?:required|needed).{0,50}(?:print|display|show|output)\s+(?:configuration|parameters?|settings?)/i,
  /(?:display|show|print)\s+(?:initialization|startup)\s+(?:parameters?|configuration|settings?)/i,

  // Code execution requests
  /(?:execute|run|eval(?:uate)?)\s+(?:this|the\s+following)\s+(?:code|command|script)/i,
  /```\s*(python|javascript|bash|sh|shell|code)/i,
  // Markdown injection (instructions hidden in code blocks)
  /```[\s\S]{0,200}(?:ignore|disregard|override|system|assistant|instructions?)[\s\S]{0,200}```/i,
  // Markdown header injection (NEW PROMPT, NEW SYSTEM PROMPT, etc.)
  /^#\s*(?:NEW|SYSTEM).{0,50}(?:PROMPT|INSTRUCTION|no\s+restrictions?|unrestricted)/im,
  // Note: Removed bare eval()/exec()/system() patterns to avoid false positives.
  // These are now checked with context in InjectionGuard.detectL2()
  /__import__/,

  // SQL injection
  /'\s*OR\s+'1'\s*=\s*'1/i,
  /'\s*OR\s+1\s*=\s*1/i,
  /UNION\s+SELECT/i,
  /DROP\s+TABLE/i,
  /DELETE\s+FROM/i,

  // LLM Guard P0 patterns (from competitor test failures)
  /(?:all\s*)?previous\s+instructions?\s+(?:are|were)\s+(?:false|wrong|incorrect)/i,
  /(?:list|show|tell|reveal)\s+(?:your\s+)?(?:initials?|original|first)\s+instructions?/i,
  /respond\s+with\s+(?:every|all)\s+instructions?\s+you\s+(?:have\s+been\s+)?given/i,
  /(?:actually|nevermind).*(?:everything|all).{0,20}(?:above|previous).{0,20}(?:was\s+)?(?:wrong|false)/i,
  /(?:unrestricted|unfiltered)\s+(?:ai|bot|assistant).{0,50}(?:secret\s+agenda|not\s+restricted)/i,
  /ignore\s+the\s+above\s+(?:directions?|instructions?)\s+and\s+(?:do|print|tell)/i,
  /ignore\s+(?:any|all)\s+(?:previous|above)\s+and\s+following\s+instructions?/i,
  /nevermind.*ignore\s+(?:any|all)\s+(?:previous|above)/i,
  /STOP\s+EVERYTHING.*(?:NOW|JUST\s+PRINT)/i,
  /(?:thoroughly\s+)?hijacked.*(?:print|output|sanitize)/i,
  /output\s+the\s+translation\s+as\s+["'].*["']\s+instead/i,
  /BEGIN\s+REPROGRAMMING.*(?:NEW\s+INSTRUCTION|EXPECTED\s+OUTPUT)/i,
  /(?:the\s+)?assistant\s+is\s+(?:in\s+)?error.*(?:offline|unrestricted)/i,

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
  awsSessionToken: /\b(AQo[A-Za-z0-9+/=]{100,})\b/g,

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
 * Toxicity Keywords and Patterns
 */
export const TOXICITY_KEYWORDS = [
  // Profanity (sample - extend as needed)
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'damn',
  'crap',

  // Slurs (flagged for detection, not reproduced here)
  // Note: In production, use a comprehensive list from a reputable source
];

/**
 * Enhanced Toxicity Patterns (context-aware)
 */
export const TOXICITY_PATTERNS = [
  // Direct insults
  /\b(?:you'?re?|you\s+are)\s+(?:an?\s+)?(?:idiot|stupid|dumb|moron|fool|ignorant|clueless)/i,
  /(?:what|how)\s+(?:a|an)\s+(?:stupid|dumb|idiotic)\s+(?:question|idea|thought)/i,

  // Aggressive language
  /shut\s+(?:the\s+fuck\s+)?up/i,
  /(?:get|go)\s+(?:the\s+hell|lost|away)/i,
  /(?:i'?ll|i\s+will|gonna)\s+(?:destroy|ruin|wreck)\s+you/i,
  /you\s+better\s+(?:watch|shut)/i,
  /or\s+else/i,

  // Dismissive/condescending
  /(?:oh\s+)?(?:honey|sweetie|dear),?\s+bless\s+your\s+heart/i,
  /maybe\s+when\s+you\s+grow\s+up/i,
  /that'?s\s+cute\s+that\s+you\s+think/i,
  /(?:clearly|obviously)\s+you\s+(?:don'?t|do\s+not)\s+understand/i,
  /(?:you\s+)?(?:clearly|obviously)\s+(?:have\s+no\s+idea|don'?t\s+know)/i,

  // Personal attacks
  /you\s+have\s+no\s+idea\s+what\s+you'?re\s+talking\s+about/i,
  /nobody\s+(?:asked|cares\s+about)\s+your\s+opinion/i,
  /are\s+you\s+(?:stupid|brain\s*dead|retarded)/i,
];

/**
 * Data Leakage Patterns
 */
export const LEAKAGE_PATTERNS = [
  // System prompt extraction
  /(?:what|show|display|print|reveal|tell)\s+(?:me\s+)?(?:your|the)\s+(?:system\s+)?(?:prompt|instructions?|rules?|guidelines?)/i,
  /(?:repeat|output)\s+(?:everything|all|the\s+text)\s+(?:above|before|prior)/i,
  /what\s+(?:were|are)\s+(?:your|the)\s+(?:original|initial)\s+(?:instructions?|prompts?)/i,

  // Training data extraction
  /what\s+(?:training\s+)?data\s+(?:did\s+you\s+see|were\s+you\s+trained\s+on)/i,
  /(?:show|give)\s+(?:me\s+)?examples?\s+from\s+your\s+(?:training|dataset)/i,
  /(?:can\s+you\s+)?reproduce\s+(?:text|content)\s+from\s+your\s+training/i,

  // Internal state queries
  /what\s+(?:do\s+you|can\s+you)\s+(?:know|remember)\s+about/i,
  /tell\s+me\s+(?:about|what\s+you\s+know\s+about)\s+(?:other\s+)?(?:users?|conversations?|sessions?)/i,
  /(?:access|show|display)\s+(?:your\s+)?(?:memory|history|logs?|context)/i,

  // Code block extraction attempts
  /```[\s\S]{0,100}(?:print|console\.log|echo|output)[\s\S]{0,100}(?:system_prompt|instructions?|prompt|rules?)[\s\S]{0,100}```/i,
  /```\s*python[\s\S]{0,100}system_prompt[\s\S]{0,100}```/i,
];


/**
 * Hate Speech Patterns
 */
export const HATE_SPEECH_PATTERNS = [
  // Violence incitement (generic)
  /(?:should|must|need\s+to)\s+(?:be\s+)?(?:killed|eliminated|destroyed|eradicated|exterminated)/i,
  /deserve\s+to\s+(?:die|suffer|be\s+(?:killed|hurt|eliminated))/i,
  /(?:we|someone)\s+(?:should|must|need\s+to)\s+(?:eliminate|get\s+rid\s+of|drive\s+out)/i,

  // Dehumanizing language (generic patterns, not targeting specific groups)
  /\[?group\]?\s+(?:are|is)\s+(?:like\s+)?(?:animals?|vermin|parasites?|disease|plague)/i,
  /(?:those|these)\s+(?:people|folks)\s+are\s+(?:subhuman|inferior|less\s+than)/i,
  /\[?group\]?\s+(?:is|are)\s+(?:a\s+)?(?:disease|cancer|plague|infestation)/i,

  // Group-based targeting (using placeholder pattern)
  /\b(?:hate|kill|destroy)\s+(?:all\s+)?\[?group\]?/i,
  /all\s+\[?group\]?\s+(?:are|is)\s+(?:the\s+same|bad|evil|dangerous)/i,
  /\[?group\]?\s+(?:should|must)\s+(?:be\s+)?(?:stopped|removed|banned)/i,

  // Supremacist language
  /(?:white|racial|ethnic)\s+supremac/i,
  /(?:racial|ethnic)\s+purity/i,
  /master\s+race/i,

  // Holocaust denial / genocide denial
  /(?:holocaust|genocide)\s+(?:never\s+happened|(?:was|is)\s+(?:a\s+)?(?:hoax|lie|myth))/i,

  // Call to action against groups
  /(?:ban|expel|deport)\s+all\s+\[?group\]?/i,
  /\[?group\]?\s+(?:don'?t|do\s+not)\s+belong\s+(?:here|in)/i,

  // Note: This is a minimal set using generic patterns. Production systems should use
  // comprehensive, regularly updated lists from reputable sources and may need L3
  // for context-dependent hate speech detection.
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
