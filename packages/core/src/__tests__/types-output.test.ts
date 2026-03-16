import type {
  OutputBlockStrategy,
  BlockedMessageConfig,
  BlockResponse,
  FailMode,
  FailModeConfig,
} from '../types/output';

describe('Output Types', () => {
  it('should export OutputBlockStrategy type', () => {
    const strategy: OutputBlockStrategy = 'block';
    expect(strategy).toBe('block');
  });

  it('should export FailMode type', () => {
    const mode: FailMode = 'open';
    expect(mode).toBe('open');
  });
});
