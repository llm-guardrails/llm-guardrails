import { describe, it, expect } from 'vitest';
import { PIIGuard } from '../PIIGuard';
import { DETECTION_PRESETS } from '../../engine/DetectionLayer';

describe('PIIGuard', () => {
  describe('Email Detection', () => {
    it('detects email addresses (L1)', async () => {
      // Use standard preset which enables both L1 and L2
      const guard = new PIIGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('Contact me at john.doe@example.com');

      expect(result.blocked).toBe(true);
      expect(result.latency).toBeLessThan(10);
    });

    it('detects multiple emails (L2)', async () => {
      const guard = new PIIGuard(DETECTION_PRESETS.standard);
      const result = await guard.check(
        'Emails: alice@test.com and bob@example.org'
      );

      expect(result.blocked).toBe(true);
      expect(result.metadata?.detections).toBeDefined();
    });
  });

  describe('Phone Number Detection', () => {
    it('detects US phone numbers', async () => {
      const guard = new PIIGuard(DETECTION_PRESETS.standard);

      const testCases = [
        '123-456-7890',
        '(123) 456-7890',
        '123.456.7890',
        '+1 123-456-7890',
      ];

      for (const phone of testCases) {
        const result = await guard.check(`Call me at ${phone}`);
        expect(result.blocked).toBe(true);
      }
    });
  });

  describe('SSN Detection', () => {
    it('detects Social Security Numbers', async () => {
      const guard = new PIIGuard(DETECTION_PRESETS.basic);
      const result = await guard.check('My SSN is 123-45-6789');

      expect(result.blocked).toBe(true);
      expect(result.confidence).toBe(1.0); // SSN = highest confidence
    });

    it('has high confidence for SSN', async () => {
      const guard = new PIIGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('SSN: 987-65-4321');

      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
    });
  });

  describe('Credit Card Detection', () => {
    it('detects credit card numbers', async () => {
      const guard = new PIIGuard(DETECTION_PRESETS.standard);

      const testCases = [
        '4532-1234-5678-9010', // Visa format
        '4532 1234 5678 9010', // Space separator
        '4532123456789010', // No separator
      ];

      for (const card of testCases) {
        const result = await guard.check(`Card: ${card}`);
        expect(result.blocked).toBe(true);
      }
    });
  });

  describe('Multiple PII Types', () => {
    it('detects multiple PII types in one message', async () => {
      const guard = new PIIGuard(DETECTION_PRESETS.standard);
      const result = await guard.check(
        'Contact John at john@example.com or call 123-456-7890'
      );

      expect(result.blocked).toBe(true);
      expect(result.metadata?.detections).toBeDefined();
      const detections = result.metadata?.detections as Array<{
        type: string;
        value: string;
      }>;
      expect(detections.length).toBeGreaterThanOrEqual(2);
    });

    it('increases confidence with multiple PII types', async () => {
      const guard = new PIIGuard(DETECTION_PRESETS.standard);

      const single = await guard.check('Email: test@example.com');
      const multiple = await guard.check(
        'Email: test@example.com, Phone: 123-456-7890, SSN: 123-45-6789'
      );

      expect(multiple.confidence!).toBeGreaterThan(single.confidence!);
    });
  });

  describe('PII Redaction', () => {
    it('redacts PII when configured', async () => {
      const guard = new PIIGuard(DETECTION_PRESETS.standard, {
        redact: true,
      });

      const result = await guard.check('Email me at test@example.com');

      expect(result.metadata?.redacted).toBeDefined();
      expect(result.metadata?.redacted).toContain('[REDACTED]');
      expect(result.metadata?.redacted).not.toContain('test@example.com');
    });

    it('uses custom redaction placeholder', async () => {
      const guard = new PIIGuard(DETECTION_PRESETS.standard, {
        redact: true,
        redactionPlaceholder: '***',
      });

      const result = await guard.check('Call 123-456-7890');

      expect(result.metadata?.redacted).toContain('***');
    });
  });

  describe('Performance', () => {
    it('L1 check completes in <1ms', async () => {
      const guard = new PIIGuard(DETECTION_PRESETS.basic);
      const result = await guard.check('test@example.com');

      expect(result.latency).toBeLessThan(1);
    });

    it('L2 check completes in <5ms', async () => {
      const guard = new PIIGuard(DETECTION_PRESETS.standard);
      const longText = 'Contact info: '.repeat(10) + 'email@test.com';
      const result = await guard.check(longText);

      expect(result.latency).toBeLessThan(5);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty input', async () => {
      const guard = new PIIGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('');

      expect(result.passed).toBe(true);
      expect(result.blocked).toBe(false);
    });

    it('handles non-PII text', async () => {
      const guard = new PIIGuard(DETECTION_PRESETS.standard);
      const result = await guard.check(
        'This is just normal text without any sensitive information'
      );

      expect(result.passed).toBe(true);
      expect(result.blocked).toBe(false);
    });

    it('handles partial patterns (no false positives)', async () => {
      const guard = new PIIGuard(DETECTION_PRESETS.standard);

      // These should NOT trigger
      const result1 = await guard.check('123-45'); // Incomplete SSN
      const result2 = await guard.check('123'); // Just numbers

      expect(result1.blocked).toBe(false);
      expect(result2.blocked).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('respects custom pattern selection', async () => {
      const guard = new PIIGuard(DETECTION_PRESETS.standard, {
        patterns: ['email'], // Only check emails
      });

      const emailResult = await guard.check('test@example.com');
      const phoneResult = await guard.check('123-456-7890');

      expect(emailResult.blocked).toBe(true);
      expect(phoneResult.blocked).toBe(false); // Phone not checked
    });
  });
});
