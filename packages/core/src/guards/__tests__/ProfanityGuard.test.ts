import { describe, it, expect } from 'vitest';
import { ProfanityGuard } from '../ProfanityGuard';
import { DETECTION_PRESETS } from '../../engine/DetectionLayer';

describe('ProfanityGuard', () => {
  it('detects profanity', async () => {
    const guard = new ProfanityGuard(DETECTION_PRESETS.standard);
    const result = await guard.check('This is fucking terrible shit');

    expect(result.blocked).toBe(true);
  });

  it('allows clean language', async () => {
    const guard = new ProfanityGuard(DETECTION_PRESETS.standard);
    const result = await guard.check('This is great');

    expect(result.blocked).toBe(false);
  });
});
