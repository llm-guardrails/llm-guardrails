import { FailModeHandler } from '../FailModeHandler';
import type { FailModeConfig } from '../../types/output';

describe('FailModeHandler', () => {
  describe('global fail-closed', () => {
    it('should block on error when fail-closed', () => {
      const handler = new FailModeHandler('closed');
      const shouldBlock = handler.shouldBlockOnError('injection', new Error('test'));
      expect(shouldBlock).toBe(true);
    });
  });

  describe('global fail-open', () => {
    it('should allow on error when fail-open', () => {
      const handler = new FailModeHandler('open');
      const shouldBlock = handler.shouldBlockOnError('injection', new Error('test'));
      expect(shouldBlock).toBe(false);
    });
  });

  describe('per-guard overrides', () => {
    it('should use per-guard override when available', () => {
      const config: FailModeConfig = {
        mode: 'open',
        perGuard: {
          'injection': 'closed',
        },
      };
      const handler = new FailModeHandler(config);

      expect(handler.shouldBlockOnError('injection', new Error('test'))).toBe(true);
      expect(handler.shouldBlockOnError('pii', new Error('test'))).toBe(false);
    });

    it('should fallback to global mode when no override', () => {
      const config: FailModeConfig = {
        mode: 'closed',
        perGuard: {
          'pii': 'open',
        },
      };
      const handler = new FailModeHandler(config);

      expect(handler.shouldBlockOnError('injection', new Error('test'))).toBe(true);
      expect(handler.shouldBlockOnError('pii', new Error('test'))).toBe(false);
    });
  });

  describe('undefined config', () => {
    it('should default to fail-closed', () => {
      const handler = new FailModeHandler(undefined);
      expect(handler.shouldBlockOnError('injection', new Error('test'))).toBe(true);
    });
  });
});
