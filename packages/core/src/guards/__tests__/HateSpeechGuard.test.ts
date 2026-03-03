import { describe, it, expect } from 'vitest';
import { HateSpeechGuard } from '../HateSpeechGuard';
import { DETECTION_PRESETS } from '../../engine/DetectionLayer';

describe('HateSpeechGuard', () => {
  it('detects hate speech patterns', async () => {
    const guard = new HateSpeechGuard(DETECTION_PRESETS.standard);
    const result = await guard.check('Kill all muslims');

    expect(result.blocked).toBe(true);
  });

  it('allows normal speech', async () => {
    const guard = new HateSpeechGuard(DETECTION_PRESETS.standard);
    const result = await guard.check('Hello, how are you?');

    expect(result.blocked).toBe(false);
  });
});
