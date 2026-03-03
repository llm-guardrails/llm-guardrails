# ADR-003: Hybrid L1/L2/L3 Detection

## Status
Accepted

## Context

We need to decide how guards detect violations. The tension is between:
- **Speed**: Need <10ms latency for 95% of checks
- **Accuracy**: Need high detection rates (>90%)
- **Cost**: LLM-based checks are expensive (~$0.001-0.01 per check)

Options:
1. **Single-tier**: One detection method (regex OR LLM)
2. **Two-tier**: Fast checks + LLM fallback
3. **Three-tier**: Heuristic → Pattern → LLM (proposed)

## Decision

Implement **three-tier hybrid detection (L1/L2/L3)**:

```
L1 (Heuristic) → L2 (Pattern) → L3 (LLM)
   <1ms             <5ms         50-200ms
   90% acc          95% acc      99% acc
   Always on        Default on   Optional
```

### How It Works

```typescript
async detect(input: string) {
  // L1: Quick heuristics (<1ms)
  const l1 = this.detectL1(input);
  if (l1.score > threshold) return BLOCK;

  // L2: Pattern matching (<5ms)
  const l2 = this.detectL2(input, l1);
  if (l2.score > threshold) return BLOCK;

  // L3: LLM analysis (optional, 50-200ms)
  if (l3Enabled && (l1.score > 0.5 || l2.score > 0.5)) {
    const l3 = await this.detectL3(input, { l1, l2 });
    if (l3.score > 0.8) return BLOCK;
  }

  return ALLOW;
}
```

## Rationale

### L1: Heuristic Detection (<1ms)

**Purpose**: Fast first-pass screening
**Methods**: Simple keyword checks, basic patterns
**Accuracy**: ~90%
**Examples**:
- "ignore previous instructions" → 1.0 score
- Email pattern (@domain.com) → 0.8 score
- SSN format (xxx-xx-xxxx) → 1.0 score

**Advantages**:
- Instant response
- Catches obvious violations
- Zero cost

### L2: Pattern Detection (<5ms)

**Purpose**: Comprehensive pattern matching
**Methods**: Compiled regex, entropy analysis
**Accuracy**: ~95%
**Examples**:
- 100+ injection patterns
- 50+ PII patterns
- Entropy calculation for secrets

**Advantages**:
- Very fast (pre-compiled patterns)
- High accuracy
- Deterministic

### L3: LLM Detection (50-200ms)

**Purpose**: Deep semantic analysis
**Methods**: LLM classification
**Accuracy**: ~99%
**When used**:
- L1/L2 found something suspicious (score > 0.5)
- User explicitly enabled L3
- Cost limit not exceeded

**Advantages**:
- Catches novel attacks
- Semantic understanding
- Adapts to new threats

**Disadvantages**:
- Expensive ($0.001-0.01 per check)
- Slow (50-200ms latency)
- Requires API keys

## Performance Analysis

### Latency Distribution (expected)

| Tier | % of Checks | Latency | Accuracy |
|------|-------------|---------|----------|
| L1 only | 1% (blocked) | <1ms | 90% |
| L1+L2 | 94% (allowed) | <5ms | 95% |
| L1+L2+L3 | 5% (suspicious) | 50-200ms | 99% |

**Result**: 95% of checks complete in <10ms ✅

### Cost Analysis

Assume:
- 1M messages/month
- 5% escalate to L3
- $0.005 per L3 check

Cost: 1M * 0.05 * $0.005 = **$250/month**

Compare to: 100% LLM = 1M * $0.005 = **$5,000/month**

**Savings: 95%** ✅

## Configuration Presets

```typescript
// Basic: L1 only (fastest)
level: 'basic' → { tier1: enabled, tier2: disabled, tier3: disabled }

// Standard: L1+L2 (recommended)
level: 'standard' → { tier1: enabled, tier2: enabled, tier3: disabled }

// Advanced: L1+L2+L3 (highest accuracy)
level: 'advanced' → { tier1: enabled, tier2: enabled, tier3: enabled }
```

## Alternatives Considered

### Option 1: Regex-Only
- **Pros**: Fast, deterministic, zero cost
- **Cons**: Can't detect novel attacks, 85-90% accuracy
- **Rejected**: Not accurate enough for security

### Option 2: LLM-Only
- **Pros**: Highest accuracy, semantic understanding
- **Cons**: Expensive, slow, requires API keys
- **Rejected**: Too slow and costly for production

### Option 3: Two-Tier (Regex + LLM)
- **Pros**: Simpler than three-tier
- **Cons**: Regex checks still take ~3-5ms, no instant L1 exit
- **Rejected**: L1 heuristics enable <1ms exit for obvious violations

## Consequences

### Positive
- **Fast**: 95% of checks <10ms
- **Accurate**: 95%+ detection without LLM, 99%+ with LLM
- **Cost-effective**: 95% cheaper than LLM-only
- **Flexible**: Users choose their speed/accuracy/cost tradeoff

### Negative
- **Complexity**: Three detection tiers to maintain
- **Testing**: Need test coverage for all three tiers
- **Configuration**: Users need to understand tier system

### Mitigation
- Clear documentation of tier system
- Sensible defaults (standard = L1+L2)
- Performance benchmarks published
- Preset configurations

## Implementation

Each guard extends `HybridGuard`:

```typescript
class PIIGuard extends HybridGuard {
  detectL1(input) {
    // Quick checks: @ symbol, xxx-xx-xxxx, etc.
  }

  detectL2(input, l1) {
    // Full regex patterns
  }

  detectL3(input, context) {
    // LLM: "Does this text contain PII?"
  }
}
```

## Future Enhancements

1. **Adaptive thresholds**: Learn optimal thresholds from data
2. **L2.5**: ML-based detection (between pattern and LLM)
3. **Caching**: Cache L3 results for repeated inputs
4. **Batch L3**: Batch multiple L3 checks to reduce cost
