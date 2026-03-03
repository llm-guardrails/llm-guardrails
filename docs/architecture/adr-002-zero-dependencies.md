# ADR-002: Zero Runtime Dependencies

## Status
Accepted

## Context

We need to decide on the dependency strategy for the core package. Options:

1. **Zero dependencies**: Implement everything from scratch
2. **Minimal dependencies**: Use only essential, well-maintained libraries
3. **Rich dependencies**: Leverage existing ecosystem libraries

This decision significantly impacts:
- Package size
- Installation speed
- Supply chain security
- Maintenance burden
- Bundle size for end users

## Decision

The **core package will have ZERO runtime dependencies**.

All optional features (SQLite, Redis, LLM SDKs) will be **peer dependencies** (user installs only what they need).

```json
{
  "dependencies": {},
  "peerDependencies": {
    "better-sqlite3": "^9.0.0",
    "ioredis": "^5.0.0"
  },
  "peerDependenciesMeta": {
    "better-sqlite3": { "optional": true },
    "ioredis": { "optional": true }
  }
}
```

## Rationale

### Advantages

**Security**:
- No transitive dependency vulnerabilities
- Smaller attack surface
- No supply chain attacks (e.g., event-stream incident)
- Users know exactly what code they're running

**Performance**:
- Smaller package size (~50KB vs 5MB+)
- Faster installation (seconds vs minutes)
- Smaller bundle for browsers/edge
- No dependency resolution conflicts

**Reliability**:
- No breakage from dependency updates
- Full control over behavior
- No maintenance burden from abandoned deps
- Predictable behavior across environments

**Developer Experience**:
- Simpler debugging (no black boxes)
- Easier to understand codebase
- No version conflicts with user's deps

### Disadvantages

**More Implementation Work**:
- Need to implement regex patterns (not using validator.js)
- Need to implement entropy calculation (not using entropy-string)
- Need to write pattern matchers (not using compromise)

**Counter-argument**: The implementations we need are simple:
- PII regex: ~50 patterns, we control quality
- Entropy: Shannon entropy is 10 lines of code
- Pattern matching: Simple string/regex operations

## What We Implement Ourselves

1. **PII Detection**: Regex patterns (better control than validator.js)
2. **Entropy Calculation**: Shannon entropy (trivial algorithm)
3. **Pattern Matching**: String/regex operations (no NLP needed)
4. **Token Counting**: Approximate counting (no tiktoken)

## What We Use as Peer Dependencies

Optional features only:
- `better-sqlite3`: SQLite storage (only if user needs persistence)
- `ioredis`: Redis storage (only if user needs distributed)
- LLM SDKs: For L3 detection (only if user needs it)

## Alternatives Considered

### Option 2: Minimal Dependencies
Use well-maintained libraries for common tasks:
- `validator`: Email/phone/credit card validation
- `compromise`: NLP for text analysis
- `tiktoken`: Token counting

**Rejected because**:
- validator.js is 500KB (too heavy for simple regex)
- compromise is 1.5MB (overkill for pattern matching)
- tiktoken requires WASM (adds complexity)
- Still introduces supply chain risk

### Option 3: Rich Dependencies
Use full ecosystem:
- `lodash`: Utilities
- `axios`: HTTP (for LLM calls)
- `date-fns`: Date handling
- Plus all the above

**Rejected because**:
- Package would be 5MB+
- Installation would take minutes
- High supply chain risk
- Many version conflicts with user deps

## Consequences

### Positive
- **Trust**: Users trust a dependency-free security library more
- **Speed**: Fastest installation and smallest bundle
- **Reliability**: No dependency-related breakage
- **Simplicity**: Easier to audit and understand

### Negative
- **Maintenance**: We maintain all code ourselves
- **Features**: Can't easily leverage ecosystem innovations
- **Expertise**: Need to ensure our implementations are correct

### Mitigation
- Extensive test coverage (>90%)
- Well-documented implementations
- Reference existing libraries for algorithms
- Community review of security-critical code

## Implementation Notes

All implementations are in `src/utils/`:
- `patterns.ts`: All regex patterns
- `entropy.ts`: Entropy calculation
- Other utilities as needed

Keep implementations:
- **Simple**: Prefer readable over clever
- **Tested**: >95% coverage for critical code
- **Documented**: Clear comments explaining algorithms
- **Fast**: Benchmark against alternatives
