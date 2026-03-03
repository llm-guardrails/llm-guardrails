import { describe, it, expect } from 'vitest';
import {
  calculateEntropy,
  calculateNormalizedEntropy,
  hasHighEntropy,
  extractHighEntropySubstrings,
} from '../entropy';

describe('Entropy Utils', () => {
  describe('calculateEntropy', () => {
    it('returns 0 for empty string', () => {
      expect(calculateEntropy('')).toBe(0);
    });

    it('returns 0 for single character', () => {
      const entropy = calculateEntropy('aaaa');
      expect(entropy).toBe(0);
    });

    it('returns higher entropy for random strings', () => {
      const lowEntropy = calculateEntropy('aaaaaaa');
      const highEntropy = calculateEntropy('a1B2c3D');

      expect(highEntropy).toBeGreaterThan(lowEntropy);
    });

    it('calculates correct entropy for known cases', () => {
      // Equal distribution of 2 characters: -2 * (0.5 * log2(0.5)) = 1
      const entropy = calculateEntropy('aabb');
      expect(entropy).toBeCloseTo(1, 5);
    });
  });

  describe('calculateNormalizedEntropy', () => {
    it('returns value between 0 and 1', () => {
      const entropy = calculateNormalizedEntropy('random123string');
      expect(entropy).toBeGreaterThanOrEqual(0);
      expect(entropy).toBeLessThanOrEqual(1);
    });

    it('returns 0 for uniform string', () => {
      const entropy = calculateNormalizedEntropy('aaaaaa');
      expect(entropy).toBe(0);
    });
  });

  describe('hasHighEntropy', () => {
    it('detects high entropy strings (API keys)', () => {
      const apiKey = 'sk-proj-abc123XYZ789randomStringHere456';
      expect(hasHighEntropy(apiKey)).toBe(true);
    });

    it('rejects low entropy strings', () => {
      expect(hasHighEntropy('hello world')).toBe(false);
      expect(hasHighEntropy('aaaaaaaaaaaaaaaa')).toBe(false);
    });

    it('respects minimum length requirement', () => {
      expect(hasHighEntropy('aB3', 4.5, 16)).toBe(false); // Too short
    });

    it('uses custom threshold', () => {
      const str = 'somewhat-random-123';
      expect(hasHighEntropy(str, 3.0, 16)).toBe(true);
      expect(hasHighEntropy(str, 5.0, 16)).toBe(false);
    });
  });

  describe('extractHighEntropySubstrings', () => {
    it('extracts API keys from text', () => {
      const text =
        'My API key is sk-proj-abc123XYZ789randomString and it should be detected';
      const results = extractHighEntropySubstrings(text);

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.includes('sk-proj'))).toBe(true);
    });

    it('ignores normal words', () => {
      const text = 'This is just normal text without any secrets here';
      const results = extractHighEntropySubstrings(text);

      expect(results.length).toBe(0);
    });

    it('extracts multiple secrets', () => {
      const text =
        'Key1: AKIAIOSFODNN7EXAMPLE and Key2: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
      const results = extractHighEntropySubstrings(text, 16, 4.0);

      expect(results.length).toBeGreaterThan(0);
    });
  });
});
