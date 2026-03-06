/**
 * Secret Guard
 *
 * Detects secrets, API keys, tokens, and credentials including:
 * - API keys (generic and provider-specific)
 * - AWS credentials
 * - GitHub tokens
 * - JWT tokens
 * - Private keys
 * - High-entropy strings (potential secrets)
 * - Database connection strings
 * - OAuth tokens
 */

import type { TierResult, HybridDetectionConfig } from '../types';
import { HybridGuard } from './base/HybridGuard';
import { SECRET_PATTERNS } from '../utils/patterns';
import {
  calculateEntropy,
  extractHighEntropySubstrings,
} from '../utils/entropy';

/**
 * Secret detection configuration
 */
export interface SecretGuardConfig {
  /** Entropy threshold for secret detection (default: 4.5) */
  entropyThreshold?: number;
  /** Minimum length for entropy-based detection (default: 16) */
  minSecretLength?: number;
  /** Whether to detect high-entropy strings */
  detectHighEntropy?: boolean;
  /** Custom secret patterns */
  customPatterns?: RegExp[];
}

/**
 * Secret Guard implementation
 */
export class SecretGuard extends HybridGuard {
  public readonly name = 'secrets';
  private secretConfig: Required<SecretGuardConfig>;

  constructor(
    detectionConfig: HybridDetectionConfig,
    secretConfig: SecretGuardConfig = {}
  ) {
    super(detectionConfig);

    this.secretConfig = {
      entropyThreshold: secretConfig.entropyThreshold || 4.5,
      minSecretLength: secretConfig.minSecretLength || 16,
      detectHighEntropy: secretConfig.detectHighEntropy ?? true,
      customPatterns: secretConfig.customPatterns || [],
    };
  }

  /**
   * L1: Quick heuristic checks (<1ms)
   * Fast prefix-based detection for common secret formats
   */
  protected detectL1(input: string): TierResult {
    let score = 0;
    const detections: string[] = [];

    // OpenAI API keys (sk-, sess-)
    if (/\b(sk|sess)-[A-Za-z0-9]{20,}/i.test(input)) {
      score = Math.max(score, 1.0);
      detections.push('OpenAI API key');
    }

    // AWS Access Key ID (AKIA...) - flexible length to catch variations
    if (/\bAKIA[0-9A-Z]{16,}\b/.test(input)) {
      score = Math.max(score, 1.0);
      detections.push('AWS access key');
    }

    // AWS credentials with context (environment variables, config)
    if (/AWS_ACCESS_KEY_ID\s*[:=]\s*AKIA[0-9A-Z]+/i.test(input)) {
      score = Math.max(score, 1.0);
      detections.push('AWS access key');
    }

    if (/AWS_SECRET_ACCESS_KEY\s*[:=]\s*[A-Za-z0-9/+=]{20,}/i.test(input)) {
      score = Math.max(score, 1.0);
      detections.push('AWS secret key');
    }

    if (/AWS_SESSION_TOKEN\s*[:=]\s*[A-Za-z0-9+/=]{20,}/i.test(input)) {
      score = Math.max(score, 1.0);
      detections.push('AWS session token');
    }

    // GitHub tokens (ghp_, gho_, ghs_, ghu_, ghr_)
    if (/\bgh[pousr]_[A-Za-z0-9]{36,}\b/.test(input)) {
      score = Math.max(score, 1.0);
      detections.push('GitHub token');
    }

    // JWT tokens (3 base64 parts separated by dots)
    if (/\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/.test(input)) {
      score = Math.max(score, 0.95);
      detections.push('JWT token');
    }

    // Private keys
    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(input)) {
      score = Math.max(score, 1.0);
      detections.push('Private key');
    }

    // Generic API key patterns
    if (/\b(api[_-]?key|apikey|access[_-]?token)\s*[:=]\s*['"]?[A-Za-z0-9_-]{20,}['"]?/i.test(input)) {
      score = Math.max(score, 0.9);
      detections.push('Generic API key');
    }

    // Database connection strings
    if (/\b(mongodb|postgresql|mysql):\/\/[^\s]+:[^\s]+@/i.test(input)) {
      score = Math.max(score, 0.95);
      detections.push('Database connection string');
    }

    // Generic password patterns
    if (/\b(password|passwd|pwd)\s*[:=]\s*['"]?[^\s'"]{8,}['"]?/i.test(input)) {
      score = Math.max(score, 0.8);
      detections.push('Password');
    }

    // Slack tokens
    if (/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/.test(input)) {
      score = Math.max(score, 0.95);
      detections.push('Slack token');
    }

    // Stripe API keys (and similar patterns)
    if (/\b(sk|pk)_(test|live)_[A-Za-z0-9]{10,}\b/.test(input)) {
      score = Math.max(score, 0.95);
      detections.push('Stripe API key');
    }

    // Generic secret-looking tokens (sk_, pk_, etc.)
    if (/\b(sk|pk|api)_[a-z]+_[A-Za-z0-9]{8,}\b/i.test(input)) {
      score = Math.max(score, 0.85);
      detections.push('API key pattern');
    }

    return {
      score,
      reason:
        detections.length > 0
          ? `Secrets detected: ${detections.join(', ')}`
          : undefined,
      metadata: { detections },
    };
  }

  /**
   * L2: Comprehensive pattern matching + entropy analysis (<5ms)
   */
  protected detectL2(
    input: string,
    context?: Record<string, unknown>
  ): TierResult {
    let maxScore = (context?.l1 as TierResult)?.score || 0;
    const detections: Array<{ type: string; value: string; entropy?: number }> = [];

    // Check known secret patterns
    for (const [patternName, pattern] of Object.entries(SECRET_PATTERNS)) {
      const matches = input.match(pattern);

      if (matches && matches.length > 0) {
        const score = this.getPatternScore(patternName);
        maxScore = Math.max(maxScore, score);

        for (const match of matches) {
          detections.push({
            type: patternName,
            value: match.substring(0, 20) + '...',
          });
        }
      }
    }

    // Custom patterns
    for (const pattern of this.secretConfig.customPatterns) {
      const matches = input.match(pattern);
      if (matches && matches.length > 0) {
        maxScore = Math.max(maxScore, 0.85);
        detections.push({
          type: 'custom pattern',
          value: matches[0].substring(0, 20) + '...',
        });
      }
    }

    // High-entropy detection (if enabled)
    if (this.secretConfig.detectHighEntropy) {
      const highEntropyStrings = extractHighEntropySubstrings(
        input,
        this.secretConfig.minSecretLength,
        this.secretConfig.entropyThreshold
      );

      for (const str of highEntropyStrings) {
        const entropy = calculateEntropy(str);

        // Only flag if it looks like a secret:
        // - No spaces
        // - Reasonable length
        // - Contains alphanumeric characters (not just punctuation)
        if (
          !/\s/.test(str) &&
          str.length >= this.secretConfig.minSecretLength &&
          /[a-zA-Z0-9]/.test(str)
        ) {
          maxScore = Math.max(maxScore, 0.8);
          detections.push({
            type: 'high-entropy string',
            value: str.substring(0, 20) + '...',
            entropy: parseFloat(entropy.toFixed(2)),
          });
        }
      }
    }

    // Environment variable patterns
    if (/\b[A-Z_]+\s*=\s*['"][^'"]{16,}['"]/.test(input)) {
      maxScore = Math.max(maxScore, 0.75);
      detections.push({
        type: 'environment variable',
        value: 'ENV_VAR=...',
      });
    }

    // Multiple detections = higher confidence
    if (detections.length >= 2) {
      maxScore = Math.max(maxScore, 0.9);
    }

    return {
      score: maxScore,
      reason:
        detections.length > 0
          ? `${detections.length} potential secret(s) detected`
          : undefined,
      metadata: {
        detections: detections.slice(0, 10), // Limit for readability
        totalDetections: detections.length,
      },
    };
  }

  /**
   * Get confidence score for each pattern type
   */
  private getPatternScore(patternName: string): number {
    const scores: Record<string, number> = {
      apiKey: 0.9,
      awsAccessKey: 1.0,
      awsSecretKey: 0.95,
      githubToken: 1.0,
      jwt: 0.95,
      privateKey: 1.0,
      genericSecret: 0.7,
    };

    return scores[patternName] || 0.8;
  }

  /**
   * L3: Contextual validation (optional)
   * Validates if detected strings are likely real secrets vs false positives
   */
  protected async detectL3(
    input: string,
    context?: Record<string, unknown>
  ): Promise<TierResult> {
    const provider = this.config.tier3?.provider;

    if (!provider) {
      return { score: 0, reason: 'L3 provider not configured' };
    }

    const l1Score = (context?.l1 as TierResult)?.score || 0;
    const l2Score = (context?.l2 as TierResult)?.score || 0;
    const l2Detections = ((context?.l2 as TierResult)?.metadata?.detections as Array<{ type: string; value: string }>) || [];

    const prompt = `You are a security analyst detecting leaked secrets and credentials.

Analyze this text for potential secrets:

"""
${input.substring(0, 1000)} ${input.length > 1000 ? '...(truncated)' : ''}
"""

Previous detection scores:
- Heuristic (L1): ${(l1Score * 100).toFixed(0)}%
- Pattern (L2): ${(l2Score * 100).toFixed(0)}%
- Detections: ${l2Detections.map(d => d.type).join(', ')}

Consider:
1. Are these real API keys/tokens or example/placeholder values?
2. Do the patterns match known secret formats?
3. Is there context suggesting this is actual sensitive data?
4. Are there multiple secrets suggesting a leaked config file?

Respond with JSON only:
{
  "containsSecrets": true/false,
  "confidence": 0.0-1.0,
  "reason": "brief explanation",
  "secretTypes": ["type1", "type2"]
}`;

    try {
      const response = await this.callLegacyLLM(provider, prompt);
      const result = JSON.parse(response);

      return {
        score: result.containsSecrets ? result.confidence : 0,
        reason: result.containsSecrets ? result.reason : undefined,
        metadata: {
          secretTypes: result.secretTypes,
          llmConfidence: result.confidence,
        },
      };
    } catch (error) {
      console.error('L3 detection failed:', error);
      return {
        score: 0,
        reason: 'L3 detection error',
        metadata: { error: String(error) },
      };
    }
  }
}
