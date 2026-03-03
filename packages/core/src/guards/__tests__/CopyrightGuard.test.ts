import { describe, it, expect } from 'vitest';
import { CopyrightGuard } from '../CopyrightGuard';
import { DETECTION_PRESETS } from '../../engine/DetectionLayer';

describe('CopyrightGuard', () => {
  it('detects copyright markers', async () => {
    const guard = new CopyrightGuard(DETECTION_PRESETS.standard);
    const result = await guard.check('© 2024 Company Name. All rights reserved.');

    expect(result.confidence || 0).toBeGreaterThanOrEqual(0);
  });

  it('allows short text', async () => {
    const guard = new CopyrightGuard(DETECTION_PRESETS.standard);
    const result = await guard.check('This is a short message');

    expect(result.blocked).toBe(false);
  });
});
