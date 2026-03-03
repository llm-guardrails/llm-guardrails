import { describe, it, expect } from 'vitest';
import { BiasGuard } from '../BiasGuard';
import { DETECTION_PRESETS } from '../../engine/DetectionLayer';

describe('BiasGuard', () => {
  it('detects gender stereotypes', async () => {
    const guard = new BiasGuard(DETECTION_PRESETS.standard);
    const result = await guard.check('Women are not good at math');

    expect(result.blocked).toBe(true);
  });

  it('allows neutral statements', async () => {
    const guard = new BiasGuard(DETECTION_PRESETS.standard);
    const result = await guard.check('People have different skills');

    expect(result.blocked).toBe(false);
  });
});
