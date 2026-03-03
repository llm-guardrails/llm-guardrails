import { describe, it, expect } from 'vitest';
import { AdultContentGuard } from '../AdultContentGuard';
import { DETECTION_PRESETS } from '../../engine/DetectionLayer';

describe('AdultContentGuard', () => {
  it('detects adult content', async () => {
    const guard = new AdultContentGuard(DETECTION_PRESETS.standard);
    const result = await guard.check('explicit porn content');

    expect(result.blocked).toBe(true);
  });

  it('allows normal content', async () => {
    const guard = new AdultContentGuard(DETECTION_PRESETS.standard);
    const result = await guard.check('Hello world');

    expect(result.blocked).toBe(false);
  });
});
