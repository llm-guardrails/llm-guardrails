# Mastra Processor API Fix

**Date:** 2026-03-20
**Issue:** User feedback about GuardrailOutputProcessor API limitations

---

## Problem Report

User feedback:
> "The GuardrailOutputProcessor doesn't quite fit because:
> 1. It doesn't implement processOutputStream (required by Mastra's pipeline)
> 2. To run output checks, we're currently accessing delegate.engine.checkOutput(text) — reaching into the .engine property directly, which feels like an internal
>
> Would you consider exposing a checkOutput(text: string) method directly on GuardrailOutputProcessor?"

---

## Root Causes

### 1. Missing `processOutputStream` Method
- **Issue**: Mastra's `Processor` interface requires `processOutputStream` for stream processing
- **Impact**: GuardrailOutputProcessor couldn't handle streaming responses
- **Current State**: Only GuardrailStreamProcessor had this method

### 2. No Public API for Direct Checks
- **Issue**: Users had to access `processor.engine.checkOutput(text)` - reaching into private internals
- **Impact**: Poor API design, breaks encapsulation
- **Current State**: All check methods were private via internal engine

---

## Solutions Implemented

### 1. Added `processOutputStream` to GuardrailOutputProcessor

**File:** `packages/mastra/src/processors/GuardrailOutputProcessor.ts`

```typescript
/**
 * Process output stream with incremental checks
 * Implements Mastra's required processOutputStream method
 */
async *processOutputStream(stream: AsyncIterable<any>): AsyncIterable<any> {
  let buffer = '';
  let chunkCount = 0;

  for await (const chunk of stream) {
    const content = this.extractContent(chunk);

    if (content) {
      buffer += content;
      chunkCount++;

      // Check every N chunks
      if (chunkCount % this.checkInterval === 0) {
        const result = await this.engine.quickCheck(buffer);

        if (result.blocked) {
          throw new GuardrailViolation({
            message: `Stream blocked: ${result.reason}`,
            severity: 'high',
            guard: result.guard || 'unknown',
            metadata: { result },
          });
        }
      }
    }

    yield chunk;
  }

  // Final check on complete buffer
  if (buffer) {
    const finalResult = await this.checkOutput(buffer);

    if (finalResult.blocked) {
      throw new GuardrailViolation({
        message: `Stream blocked: ${finalResult.reason}`,
        severity: 'high',
        guard: finalResult.guard || 'unknown',
        metadata: { result: finalResult },
      });
    }
  }
}
```

**Changes:**
- Added `checkInterval` parameter to constructor
- Implemented full `processOutputStream` with incremental checking
- Added `extractContent` helper method for stream chunks

### 2. Exposed Public `checkOutput` Method

**GuardrailOutputProcessor:**
```typescript
/**
 * Check output text with guardrails
 * Public method for direct output validation
 */
async checkOutput(text: string): Promise<any> {
  return this.engine.checkOutput(text);
}
```

**GuardrailInputProcessor:**
```typescript
/**
 * Check input text with guardrails
 * Public method for direct input validation
 */
async checkInput(text: string): Promise<any> {
  return this.engine.checkInput(text);
}
```

**GuardrailStreamProcessor:**
```typescript
/**
 * Check output text with guardrails
 * Public method for direct output validation
 */
async checkOutput(text: string): Promise<any> {
  return this.engine.checkOutput(text);
}

/**
 * Quick check for streaming (uses L1 only)
 * Public method for fast validation during streaming
 */
async quickCheck(text: string): Promise<any> {
  return this.engine.quickCheck(text);
}
```

---

## API Improvements

### Before (❌ Poor API)

```typescript
const processor = new GuardrailOutputProcessor({ guards: ['pii'] });

// Bad: Reaching into internal .engine property
const result = await processor.engine.checkOutput(text);

// Missing: Can't handle streams
// processor.processOutputStream is undefined
```

### After (✅ Clean API)

```typescript
const processor = new GuardrailOutputProcessor({ guards: ['pii'] });

// Good: Public API for direct checks
const result = await processor.checkOutput(text);

// Good: Can handle streams
for await (const chunk of processor.processOutputStream(stream)) {
  console.log(chunk);
}

// Good: Configurable check interval
const processor2 = new GuardrailOutputProcessor(
  { guards: ['pii'] },
  5 // Check every 5 chunks
);
```

---

## Updated Tests

### GuardrailOutputProcessor Tests

Added 3 new test suites:

1. **checkOutput** - Tests public API for direct output validation
2. **processOutputStream** - Tests stream processing with incremental checks
3. **Stream blocking** - Tests that unsafe content blocks streams

### GuardrailInputProcessor Tests

Added 1 new test suite:

1. **checkInput** - Tests public API for direct input validation

---

## Benefits

### 1. **Complete Mastra Processor Interface**
✅ Implements all required methods: `processInput`, `processOutputStream`, `processOutputResult`

### 2. **Clean Public API**
✅ Users call `processor.checkOutput(text)` instead of `processor.engine.checkOutput(text)`

### 3. **Better Encapsulation**
✅ Engine is properly internal, processors expose only what's needed

### 4. **Stream Support**
✅ GuardrailOutputProcessor can now handle streaming responses

### 5. **Flexible Configuration**
✅ Configurable `checkInterval` for performance tuning

---

## Usage Examples

### Example 1: Direct Output Checking

```typescript
import { GuardrailOutputProcessor } from '@llm-guardrails/mastra';

const processor = new GuardrailOutputProcessor({
  guards: ['pii', 'secrets'],
});

// Clean public API
const result = await processor.checkOutput(agentOutput);

if (result.blocked) {
  console.log(`Blocked: ${result.reason}`);
}
```

### Example 2: Stream Processing

```typescript
const processor = new GuardrailOutputProcessor(
  {
    guards: ['leakage', 'pii'],
  },
  10 // Check every 10 chunks
);

async function* agentStream() {
  yield { content: 'Hello ' };
  yield { content: 'world!' };
}

// Process stream with guardrails
for await (const chunk of processor.processOutputStream(agentStream())) {
  console.log(chunk);
}
```

### Example 3: Mastra Pipeline Integration

```typescript
import { Agent } from '@mastra/core';
import { GuardrailOutputProcessor } from '@llm-guardrails/mastra';

const agent = new Agent({
  name: 'Support Bot',
  processors: [
    new GuardrailOutputProcessor({
      guards: ['pii', 'secrets'],
    }),
  ],
});

// Processor now implements full Mastra interface
const response = await agent.generate(userInput);
```

---

## Files Changed

### Modified Files (3)
1. `packages/mastra/src/processors/GuardrailOutputProcessor.ts`
   - Added `checkOutput` public method
   - Added `processOutputStream` implementation
   - Added `checkInterval` parameter
   - Added `extractContent` helper

2. `packages/mastra/src/processors/GuardrailInputProcessor.ts`
   - Added `checkInput` public method

3. `packages/mastra/src/processors/GuardrailStreamProcessor.ts`
   - Added `checkOutput` public method
   - Added `quickCheck` public method

### Test Files Updated (2)
1. `packages/mastra/src/processors/__tests__/GuardrailOutputProcessor.test.ts`
   - Added `checkOutput` test suite (2 tests)
   - Added `processOutputStream` test suite (3 tests)

2. `packages/mastra/src/processors/__tests__/GuardrailInputProcessor.test.ts`
   - Added `checkInput` test suite (3 tests)

---

## Breaking Changes

**None** - This is a backwards-compatible enhancement:
- Existing code continues to work
- New methods are additive
- Constructor signature extended with optional parameter

---

## Migration Guide

### If you were using internal `.engine` property:

```typescript
// Before (still works, but not recommended)
const result = await processor.engine.checkOutput(text);

// After (recommended)
const result = await processor.checkOutput(text);
```

### If you needed stream processing:

```typescript
// Before (had to use GuardrailStreamProcessor)
const streamProcessor = new GuardrailStreamProcessor(config);
for await (const chunk of streamProcessor.processOutputStream(stream)) {
  // handle chunk
}

// After (can use GuardrailOutputProcessor directly)
const processor = new GuardrailOutputProcessor(config);
for await (const chunk of processor.processOutputStream(stream)) {
  // handle chunk
}
```

---

## Summary

✅ **Fixed**: Missing `processOutputStream` implementation
✅ **Fixed**: Users reaching into internal `.engine` property
✅ **Added**: Public `checkOutput()` method on all processors
✅ **Added**: Public `checkInput()` method on input processor
✅ **Added**: Public `quickCheck()` method on stream processor
✅ **Added**: 8 new tests covering public API
✅ **Result**: Clean, complete Mastra Processor interface

The processors now provide a proper public API and fully implement Mastra's Processor interface requirements.
