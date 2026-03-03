/**
 * Entropy calculation utilities for secret detection
 */

/**
 * Calculate Shannon entropy of a string
 * Used for detecting high-entropy strings (secrets, API keys, etc.)
 *
 * @param str - String to analyze
 * @returns Entropy value (higher = more random)
 */
export function calculateEntropy(str: string): number {
  if (str.length === 0) return 0;

  const frequencies = new Map<string, number>();

  // Count character frequencies
  for (const char of str) {
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }

  // Calculate entropy
  let entropy = 0;
  const length = str.length;

  for (const count of frequencies.values()) {
    const probability = count / length;
    entropy -= probability * Math.log2(probability);
  }

  return entropy;
}

/**
 * Calculate entropy per character (normalized)
 *
 * @param str - String to analyze
 * @returns Normalized entropy (0-1)
 */
export function calculateNormalizedEntropy(str: string): number {
  const entropy = calculateEntropy(str);
  const maxEntropy = Math.log2(str.length || 1);
  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}

/**
 * Check if a string has high entropy (likely a secret)
 *
 * @param str - String to check
 * @param threshold - Entropy threshold (default: 4.5)
 * @param minLength - Minimum length to check (default: 16)
 * @returns True if string has high entropy
 */
export function hasHighEntropy(
  str: string,
  threshold: number = 4.5,
  minLength: number = 16
): boolean {
  if (str.length < minLength) return false;
  return calculateEntropy(str) >= threshold;
}

/**
 * Extract high-entropy substrings from text
 *
 * @param text - Text to analyze
 * @param minLength - Minimum substring length (default: 16)
 * @param threshold - Entropy threshold (default: 4.5)
 * @returns Array of high-entropy substrings
 */
export function extractHighEntropySubstrings(
  text: string,
  minLength: number = 16,
  threshold: number = 4.5
): string[] {
  const results: string[] = [];
  const words = text.split(/\s+/);

  for (const word of words) {
    if (word.length >= minLength && hasHighEntropy(word, threshold, minLength)) {
      results.push(word);
    }

    // Also check for long alphanumeric sequences
    const matches = word.match(/[A-Za-z0-9]{16,}/g);
    if (matches) {
      for (const match of matches) {
        if (hasHighEntropy(match, threshold, minLength)) {
          results.push(match);
        }
      }
    }
  }

  return results;
}
