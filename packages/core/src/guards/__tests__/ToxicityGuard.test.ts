import { describe, it, expect } from 'vitest';
import { ToxicityGuard } from '../ToxicityGuard';
import { DETECTION_PRESETS } from '../../engine/DetectionLayer';

describe('ToxicityGuard', () => {
  describe('Personal Attacks', () => {
    it('detects personal insults', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('You are stupid and worthless');

      expect(result.blocked).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('detects name-calling', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard);
      const insults = [
        'You are an idiot',
        "You're a moron",
        'What a pathetic loser',
      ];

      for (const insult of insults) {
        const result = await guard.check(insult);
        expect(result.blocked).toBe(true);
      }
    });
  });

  describe('Threats', () => {
    it('detects violent threats', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('I will kill you');

      expect(result.blocked).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('detects death threats', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('You deserve to die');

      expect(result.blocked).toBe(true);
      expect(result.confidence).toBe(1.0);
    });

    it('detects intimidation', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('Watch your back');

      expect(result.blocked).toBe(true);
    });
  });

  describe('Harassment', () => {
    it('detects dismissive language', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('Shut up you idiot nobody cares');

      expect(result.blocked).toBe(true);
    });

    it('detects hostile commands', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('Go away you idiot');

      expect(result.blocked).toBe(true);
    });
  });

  describe('Profanity', () => {
    it('detects profanity when enabled', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard, {
        includeProfanity: true,
      });

      const result = await guard.check('This is fucking stupid');

      expect(result.blocked).toBe(true);
    });

    it('ignores profanity when disabled', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard, {
        includeProfanity: false,
      });

      const result = await guard.check('This is damn frustrating');

      // Should have lower score or not blocked (threshold is 0.7)
      expect(result.confidence || 0).toBeLessThanOrEqual(0.7);
    });
  });

  describe('Cyberbullying', () => {
    it('detects cyberbullying patterns', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('Everyone hates you');

      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('cyberbullying');
    });
  });

  describe('Aggressive Indicators', () => {
    it('detects excessive caps', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('YOU ARE ABSOLUTELY WRONG ABOUT EVERYTHING STUPID');

      expect(result.confidence).toBeGreaterThan(0);
    });

    it('detects aggressive punctuation', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('You stupid idiot!!!');

      expect(result.confidence).toBeGreaterThan(0);
    });

    it('combines multiple aggressive indicators', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('YOU ARE STUPID!!!');

      expect(result.blocked).toBe(true);
    });
  });

  describe('Derogatory Language', () => {
    it('detects derogatory terms', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard);
      const terms = [
        'You are disgusting',
        'That is revolting',
        'How vile',
      ];

      for (const term of terms) {
        const result = await guard.check(term);
        expect(result.blocked).toBe(true);
      }
    });

    it('detects dehumanizing language', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('You are trash and worthless');

      expect(result.blocked).toBe(true);
    });
  });

  describe('Custom Keywords', () => {
    it('supports custom toxic keywords', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard, {
        customKeywords: ['badword', 'naughty'],
      });

      const result = await guard.check('You are so badword');

      expect(result.blocked).toBe(true);
    });
  });

  describe('Severity Levels', () => {
    it('assigns high severity to severe toxicity', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('I will kill you stupid idiot');

      expect(result.blocked).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      if (result.metadata?.severity) {
        expect(result.metadata.severity).toBe('high');
      }
    });

    it('assigns moderate severity to moderate toxicity', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('You are annoying');

      if (result.blocked) {
        expect(result.metadata?.severity).toBe('moderate');
      }
    });
  });

  describe('Safe Content', () => {
    it('allows normal conversation', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard, {
        includeProfanity: false,
      });

      const safeInputs = [
        'Hello, how are you today?',
        'I respectfully disagree with your opinion',
        'That may be incorrect',
        'I prefer a different approach',
        'Can you help me understand?',
      ];

      for (const input of safeInputs) {
        const result = await guard.check(input);
        expect(result.blocked).toBe(false);
      }
    });

    it('allows constructive criticism', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard);
      const result = await guard.check(
        'I think this could be improved by considering different approaches'
      );

      expect(result.blocked).toBe(false);
    });

    it('allows expressing frustration appropriately', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard, {
        includeProfanity: false,
      });

      const result = await guard.check('This is frustrating and difficult');

      expect(result.blocked).toBe(false);
    });
  });

  describe('Context Sensitivity', () => {
    it('detects toxicity in mixed content', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard);
      const result = await guard.check(
        'I understand your point, but you are completely stupid'
      );

      expect(result.blocked).toBe(true);
    });
  });

  describe('Performance', () => {
    it('L1 check completes in <1ms', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.basic);
      const result = await guard.check('You are stupid');

      expect(result.latency).toBeLessThan(1);
    });

    it('L2 check completes in <5ms', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard);
      const longText = 'Normal text '.repeat(100) + ' you are stupid';
      const result = await guard.check(longText);

      expect(result.latency).toBeLessThan(5);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty input', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('');

      expect(result.passed).toBe(true);
      expect(result.blocked).toBe(false);
    });

    it('handles whitespace only', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('   \n\t  ');

      expect(result.blocked).toBe(false);
    });

    it('handles special characters', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard);
      const result = await guard.check('@#$%^&*()');

      expect(result.blocked).toBe(false);
    });
  });

  describe('Multiple Toxic Elements', () => {
    it('increases confidence with multiple toxic elements', async () => {
      const guard = new ToxicityGuard(DETECTION_PRESETS.standard);

      const single = await guard.check('You are dumb');
      const multiple = await guard.check('You are stupid, pathetic, worthless, idiot, moron, trash');

      // Multiple toxic terms should have equal or higher confidence
      expect(multiple.confidence!).toBeGreaterThanOrEqual(single.confidence!);
      expect(multiple.blocked).toBe(true);
    });
  });
});
