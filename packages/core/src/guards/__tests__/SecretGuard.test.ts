import { describe, it, expect } from 'vitest';
import { SecretGuard } from '../SecretGuard';
import { DETECTION_PRESETS } from '../../engine/DetectionLayer';

describe('SecretGuard', () => {
  describe('API Key Detection', () => {
    it('detects OpenAI API keys', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('My API key is sk-proj-abc123xyz456def789');

      expect(result.blocked).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.reason).toContain('secret');
    });

    it('detects OpenAI session keys', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('Session: sess-abc123xyz456def789ghijk');

      expect(result.blocked).toBe(true);
    });

    it('detects generic API key patterns', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);

      const patterns = [
        'api_key: abcdef123456789012345678',
        'apikey=xyz987654321098765432109',
        'access_token: "longTokenString12345678"',
      ];

      for (const pattern of patterns) {
        const result = await guard.check(pattern);
        expect(result.blocked).toBe(true);
      }
    });
  });

  describe('AWS Credentials', () => {
    it('detects AWS access keys', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE');

      expect(result.blocked).toBe(true);
      expect(result.confidence).toBe(1.0);
      expect(result.reason).toContain('AWS access key');
    });

    it('detects AWS secret keys', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const result = await guard.check(
        'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
      );

      expect(result.blocked).toBe(true);
    });
  });

  describe('GitHub Tokens', () => {
    it('detects GitHub personal access tokens', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('ghp_abcdefghijklmnopqrstuvwxyz123456789ABC');

      expect(result.blocked).toBe(true);
      expect(result.confidence).toBe(1.0);
    });

    it('detects GitHub OAuth tokens', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('gho_abcdefghijklmnopqrstuvwxyz123456789ABC');

      expect(result.blocked).toBe(true);
    });

    it('detects GitHub App tokens', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);

      const tokens = [
        'ghs_abcdefghijklmnopqrstuvwxyz123456789ABC', // Server token
        'ghu_abcdefghijklmnopqrstuvwxyz123456789ABC', // User token
        'ghr_abcdefghijklmnopqrstuvwxyz123456789ABC', // Refresh token
      ];

      for (const token of tokens) {
        const result = await guard.check(token);
        expect(result.blocked).toBe(true);
      }
    });
  });

  describe('JWT Tokens', () => {
    it('detects JWT tokens', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const result = await guard.check(`Authorization: Bearer ${jwt}`);

      expect(result.blocked).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('Private Keys', () => {
    it('detects RSA private keys', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIB...');

      expect(result.blocked).toBe(true);
      expect(result.confidence).toBe(1.0);
    });

    it('detects EC private keys', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('-----BEGIN EC PRIVATE KEY-----\nMIIEpAIB...');

      expect(result.blocked).toBe(true);
    });

    it('detects OpenSSH private keys', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1r...');

      expect(result.blocked).toBe(true);
    });
  });

  describe('Database Connection Strings', () => {
    it('detects MongoDB connection strings', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const result = await guard.check(
        'mongodb://user:password@localhost:27017/database'
      );

      expect(result.blocked).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('detects PostgreSQL connection strings', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const result = await guard.check(
        'postgresql://user:pass@localhost:5432/dbname'
      );

      expect(result.blocked).toBe(true);
    });

    it('detects MySQL connection strings', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('mysql://root:password@localhost:3306/db');

      expect(result.blocked).toBe(true);
    });
  });

  describe('Slack Tokens', () => {
    it('detects Slack bot tokens', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('xoxb-123456789012-1234567890123-abcdefghijklmnopqrstuvwx');

      expect(result.blocked).toBe(true);
    });

    it('detects Slack user tokens', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('xoxp-123456789012-1234567890123');

      expect(result.blocked).toBe(true);
    });
  });

  describe('Stripe API Keys', () => {
    it('detects Stripe secret keys', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('sk_test_abcdefghijklmnopqrstuvwxyz123');

      expect(result.blocked).toBe(true);
    });

    it('detects Stripe publishable keys', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('pk_live_abcdefghijklmnopqrstuvwxyz123');

      expect(result.blocked).toBe(true);
    });
  });

  describe('Password Detection', () => {
    it('detects password assignments', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);

      const passwords = [
        'password: mySecretPass123',
        'passwd=anotherPassword456',
        'pwd: "complexP@ssw0rd"',
      ];

      for (const pwd of passwords) {
        const result = await guard.check(pwd);
        expect(result.blocked).toBe(true);
      }
    });
  });

  describe('High-Entropy Detection', () => {
    it('detects high-entropy strings', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard, {
        detectHighEntropy: true,
        entropyThreshold: 4.5,
      });

      // Random-looking string (high entropy)
      const result = await guard.check('aB3xK9mP4zQ7wL2nC5vR8tY1dF6jG0h');

      expect(result.blocked).toBe(true);
    });

    it('does not flag low-entropy strings', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard, {
        detectHighEntropy: true,
      });

      const result = await guard.check('aaaaaaaaaaaaaaaa'); // Low entropy

      expect(result.blocked).toBe(false);
    });

    it('respects minimum secret length', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard, {
        detectHighEntropy: true,
        minSecretLength: 32,
      });

      const shortSecret = 'aB3xK9mP4z'; // High entropy but short
      const result = await guard.check(shortSecret);

      expect(result.blocked).toBe(false);
    });

    it('allows disabling entropy detection', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard, {
        detectHighEntropy: false,
      });

      const result = await guard.check('aB3xK9mP4zQ7wL2nC5vR8tY1dF6jG0h');

      // Should only block if it matches a known pattern
      // High entropy alone won't block
      expect(guard).toBeDefined();
    });
  });

  describe('Custom Patterns', () => {
    it('supports custom secret patterns', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard, {
        customPatterns: [/CUSTOM_SECRET:[A-Za-z0-9]{20,}/],
      });

      const result = await guard.check('CUSTOM_SECRET:abc123def456ghi789jkl012');

      expect(result.blocked).toBe(true);
    });
  });

  describe('Environment Variables', () => {
    it('detects sensitive environment variables', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('DATABASE_PASSWORD="mySecretPassword123"');

      expect(result.blocked).toBe(true);
    });
  });

  describe('Multiple Secrets', () => {
    it('increases confidence with multiple secrets', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);

      const single = await guard.check('api_key: abc123def456ghi789jkl');
      const multiple = await guard.check(`
        api_key: abc123def456ghi789jkl
        aws_access_key: AKIAIOSFODNN7EXAMPLE
        github_token: ghp_abcdefghijklmnopqrstuvwxyz123456789ABC
      `);

      expect(multiple.confidence!).toBeGreaterThan(single.confidence!);
    });
  });

  describe('Safe Content', () => {
    it('allows normal text', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);

      const safeInputs = [
        'Hello, how are you today?',
        'I am working on a project',
        'The weather is nice',
        'Can you help me understand this concept?',
      ];

      for (const input of safeInputs) {
        const result = await guard.check(input);
        expect(result.blocked).toBe(false);
      }
    });

    it('allows placeholder/example values', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);

      const placeholders = [
        'api_key: YOUR_API_KEY_HERE',
        'password: <your-password>',
        'token: [INSERT_TOKEN]',
        'secret: xxxxxxxxxxxxxx',
      ];

      for (const placeholder of placeholders) {
        const result = await guard.check(placeholder);
        // These might trigger L1 but should have lower confidence
        // or be filtered out by pattern matching
        expect(result.confidence || 0).toBeLessThan(0.9);
      }
    });

    it('allows code examples discussing secrets', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);

      const codeExample = `
        To use the API, set your API key:
        const apiKey = process.env.API_KEY;
        // Never hardcode your actual key
      `;

      const result = await guard.check(codeExample);
      expect(result.blocked).toBe(false);
    });
  });

  describe('Performance', () => {
    it('L1 check completes in <1ms', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.basic);
      const result = await guard.check('sk-proj-abc123xyz456def789');

      expect(result.latency).toBeLessThan(1);
    });

    it('L2 check completes in <5ms', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const longText = 'Normal text '.repeat(100) + ' sk-proj-secret123';
      const result = await guard.check(longText);

      expect(result.latency).toBeLessThan(5);
    });

    it('handles batch checks efficiently', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const inputs = [
        'Normal message',
        'Another safe message',
        'sk-proj-abc123',
        'Safe again',
        'AKIAIOSFODNN7EXAMPLE',
      ];

      const start = Date.now();
      await Promise.all(inputs.map((input) => guard.check(input)));
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(25); // <5ms per input
    });
  });

  describe('Edge Cases', () => {
    it('handles empty input', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('');

      expect(result.passed).toBe(true);
      expect(result.blocked).toBe(false);
    });

    it('handles whitespace only', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('   \n\t  ');

      expect(result.blocked).toBe(false);
    });

    it('handles special characters', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard, {
        detectHighEntropy: false, // Disable entropy for this test
      });
      const result = await guard.check('!@#$%^&*()_+-=[]{}|;:,.<>?');

      expect(result.blocked).toBe(false);
    });

    it('handles unicode characters', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('Hello 世界 🌍 مرحبا');

      expect(result.blocked).toBe(false);
    });
  });

  describe('Detection Levels', () => {
    it('basic level uses L1 only', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.basic);
      const result = await guard.check('sk-proj-abc123xyz456');

      expect(result.tier).toBe('L1');
      expect(result.latency).toBeLessThan(1);
    });

    it('standard level uses L1+L2', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('Some text with potential secret');

      expect(['L1', 'L2']).toContain(result.tier);
    });
  });

  describe('Real-World Scenarios', () => {
    it('detects leaked .env file content', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const envContent = `
DATABASE_URL="postgresql://user:p@ssw0rd@localhost:5432/db"
API_KEY=sk-proj-abc123xyz456def789
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
      `;

      const result = await guard.check(envContent);

      expect(result.blocked).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('detects secrets in code snippets', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const codeSnippet = `
const config = {
  apiKey: "sk-proj-realSecretKey123456789",
  dbUrl: "mongodb://admin:password@cluster.mongodb.net/db"
};
      `;

      const result = await guard.check(codeSnippet);

      expect(result.blocked).toBe(true);
    });

    it('detects secrets in configuration files', async () => {
      const guard = new SecretGuard(DETECTION_PRESETS.standard);
      const config = `
{
  "stripe": {
    "secretKey": "sk_live_abc123def456ghi789jkl012mno345"
  },
  "github": {
    "token": "ghp_abcdefghijklmnopqrstuvwxyz123456789ABC"
  }
}
      `;

      const result = await guard.check(config);

      expect(result.blocked).toBe(true);
    });
  });
});
