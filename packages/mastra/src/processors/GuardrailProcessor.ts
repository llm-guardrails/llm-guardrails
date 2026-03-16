import type { GuardrailConfig } from '@llm-guardrails/core';
import { GuardrailInputProcessor } from './GuardrailInputProcessor';
import { GuardrailOutputProcessor } from './GuardrailOutputProcessor';
import { GuardrailStreamProcessor } from './GuardrailStreamProcessor';
import type { Processor } from './GuardrailInputProcessor';

/**
 * Combined guardrail processor
 * Implements all Processor methods (input, output, stream)
 */
export class GuardrailProcessor implements Processor {
  private inputProcessor: GuardrailInputProcessor;
  private outputProcessor: GuardrailOutputProcessor;
  private streamProcessor: GuardrailStreamProcessor;

  constructor(config: GuardrailConfig, streamCheckInterval: number = 10) {
    this.inputProcessor = new GuardrailInputProcessor(config);
    this.outputProcessor = new GuardrailOutputProcessor(config);
    this.streamProcessor = new GuardrailStreamProcessor(
      config,
      streamCheckInterval
    );
  }

  /**
   * Process input
   */
  async processInput(input: any): Promise<any> {
    return this.inputProcessor.processInput(input);
  }

  /**
   * Process output result
   */
  async processOutputResult(result: any): Promise<any> {
    return this.outputProcessor.processOutputResult(result);
  }

  /**
   * Process output stream
   */
  async *processOutputStream(stream: AsyncIterable<any>): AsyncIterable<any> {
    yield* this.streamProcessor.processOutputStream(stream);
  }
}
