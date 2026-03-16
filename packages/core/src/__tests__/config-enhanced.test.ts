import type {
  GuardrailConfig,
  OutputBlockStrategy,
  FailMode,
  FailModeConfig,
  BlockedMessageConfig,
  ResponseTransformer,
} from '../types/index';

describe('Enhanced GuardrailConfig', () => {
  it('should accept failMode as string', () => {
    const config: GuardrailConfig = {
      failMode: 'open' as FailMode,
    };
    expect(config.failMode).toBe('open');
  });

  it('should accept failMode as config object', () => {
    const config: GuardrailConfig = {
      failMode: {
        mode: 'closed' as FailMode,
        perGuard: {
          'prompt-injection': 'open' as FailMode,
        },
      } as FailModeConfig,
    };
    expect(config.failMode).toBeDefined();
  });

  it('should accept outputBlockStrategy', () => {
    const config: GuardrailConfig = {
      outputBlockStrategy: 'sanitize' as OutputBlockStrategy,
    };
    expect(config.outputBlockStrategy).toBe('sanitize');
  });

  it('should accept blockedMessage as string', () => {
    const config: GuardrailConfig = {
      blockedMessage: 'Request blocked',
    };
    expect(config.blockedMessage).toBe('Request blocked');
  });

  it('should accept blockedMessage as function', () => {
    const mockFunction: BlockedMessageConfig = (result) => ({
      message: `Blocked: ${result.reason}`,
    });
    const config: GuardrailConfig = {
      blockedMessage: mockFunction,
    };
    expect(config.blockedMessage).toBe(mockFunction);
  });

  it('should accept responseTransform function', () => {
    const mockTransform: ResponseTransformer = (response, result) => ({
      ...response,
      blocked: result.blocked,
    });
    const config: GuardrailConfig = {
      responseTransform: mockTransform,
    };
    expect(config.responseTransform).toBe(mockTransform);
  });

  it('should accept all new properties together', () => {
    const config: GuardrailConfig = {
      failMode: 'closed' as FailMode,
      outputBlockStrategy: 'block' as OutputBlockStrategy,
      blockedMessage: 'Access denied',
      responseTransform: (response) => response,
    };
    expect(config.failMode).toBe('closed');
    expect(config.outputBlockStrategy).toBe('block');
    expect(config.blockedMessage).toBe('Access denied');
    expect(config.responseTransform).toBeDefined();
  });
});
