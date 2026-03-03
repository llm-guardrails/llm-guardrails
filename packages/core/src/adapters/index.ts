/**
 * Gateway Adapters
 *
 * Zero-config integration with AI SDKs.
 */

// Main facade
export { Guardrails } from './Guardrails';

// Adapters
export { AnthropicAdapter } from './AnthropicAdapter';
export { OpenAIAdapter } from './OpenAIAdapter';
export { GeminiAdapter } from './GeminiAdapter';

// Base classes
export { BaseAdapter } from './BaseAdapter';
export { StreamGuard } from './StreamGuard';

// Auto-detection
export { AutoDetect, globalAutoDetect } from './AutoDetect';

// Types
export type {
  GatewayAdapter,
  GuardedClient,
  LLMRequest,
  LLMResponse,
  StreamChunk,
  AdapterConfig,
} from './types';
export { GuardrailViolation } from './types';

// Register built-in adapters
import { globalAutoDetect } from './AutoDetect';
import { AnthropicAdapter } from './AnthropicAdapter';
import { OpenAIAdapter } from './OpenAIAdapter';
import { GeminiAdapter } from './GeminiAdapter';

globalAutoDetect.registerAll([
  new AnthropicAdapter(),
  new OpenAIAdapter(),
  new GeminiAdapter(),
]);
