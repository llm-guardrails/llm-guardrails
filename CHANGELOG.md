# Changelog

All notable changes to @llm-guardrails/core will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.0] - 2025-03-03

### Added - Core Release (Weeks 1-6 Complete)

#### Content Guards (10 Guards)
- **PIIGuard**: Detect 10+ PII types (email, phone, SSN, credit cards, addresses)
- **InjectionGuard**: 100+ compiled patterns for prompt injection detection
- **SecretGuard**: Entropy-based API key and credential detection
- **ToxicityGuard**: Toxic language, threats, harassment detection
- **LeakageGuard**: System prompt extraction attempt detection
- **HateSpeechGuard**: Hate speech and discriminatory language detection
- **BiasGuard**: Gender stereotypes and age bias detection
- **AdultContentGuard**: NSFW content filtering
- **CopyrightGuard**: Copyright violation detection
- **ProfanityGuard**: Profanity detection with count-based scoring

#### Behavioral Analysis
- **BehavioralGuard**: Cross-message threat detection
- **15 Built-in Threat Patterns**: File exfiltration, credential theft, escalation attempts, etc.
- **PatternMatcher**: Time-windowed sequence matching (<5ms performance)
- **MemoryStore**: In-memory session storage with automatic TTL cleanup
- **Session Isolation**: Race-condition safe with per-session locking

#### Budget System
- **BudgetGuard**: Token and cost limit enforcement
- **TokenCounter**: Accurate token counting for 20+ LLM models
- **CostCalculator**: Up-to-date pricing for major providers
- **Multi-level Limits**: Per-session and per-user budget controls
- **Alert Thresholds**: Configurable warnings (e.g., 80% budget)
- **Model Support**: GPT, Claude, Gemini, Mistral, Cohere, Llama, Groq

#### Core Engine
- **GuardrailEngine**: Main orchestrator with guard composition
- **DetectionLayer**: Hybrid L1/L2/L3 detection abstraction
- **DETECTION_PRESETS**: Pre-configured presets (basic, standard, advanced)
- **ResultCache**: Optional LRU caching for repeated inputs
- **Type Safety**: Full TypeScript types, zero `any` usage

#### Documentation
- **Getting Started Guide**: Complete setup instructions
- **API Reference**: Comprehensive API documentation
- **Behavioral Patterns Guide**: All 15 threat patterns explained
- **4 Code Examples**: Basic protection, behavioral analysis, budget tracking, full production

### Performance
- L1 Detection: ~0.3ms (target <1ms) ✅
- L2 Detection: ~2ms (target <5ms) ✅
- Behavioral Analysis: ~0.5ms overhead (target <1ms) ✅
- Budget Check: ~0.2ms overhead (target <0.5ms) ✅
- Full Suite (10 guards): ~8ms (target <10ms) ✅

### Testing
- 267 tests passing (2 skipped)
- 90%+ code coverage
- Comprehensive test suite for all components

### Architecture
- Zero runtime dependencies
- All external packages are optional peer dependencies
- TypeScript-first with full type safety
- Modular design for easy extension

## [Unreleased] - Future Versions

### Planned for v1.0.0
- Gateway adapters (Anthropic, OpenAI, Gemini SDKs)
- SQLite and Redis storage backends
- L3 LLM-based detection
- Framework plugins (LangChain, Claude Code, Mastra)
- Advanced caching optimizations
- Web dashboard for monitoring
- Enterprise features (audit logging, compliance reporting)

### Planned for v1.1.0
- Streaming support for all guards
- Custom guard templates
- Additional threat patterns
- Rate limiting per user/IP
- Advanced analytics and reporting

---

## Version History

- **0.9.0** (2025-03-03): Core release - Content guards, behavioral analysis, budget system
- **0.1.0** (2025-03-01): Initial project setup

---

## Migration Guide

### From 0.1.0 to 0.9.0

This is a major update from the initial prototype. Key changes:

1. **Package renamed**: Now `@llm-guardrails/core`
2. **New guards**: 10 content guards instead of basic prototype
3. **Added features**: Behavioral analysis and budget system
4. **TypeScript types**: Comprehensive type definitions
5. **Performance**: All targets achieved or exceeded

No breaking changes from 0.1.0 as it was a prototype.

---

## Maintenance

- **Pricing updates**: Model pricing updated as of 2025-03-03
- **Pattern database**: Injection patterns based on latest research
- **TypeScript**: Requires TypeScript 5.0+
- **Node.js**: Requires Node.js 18+

---

For detailed documentation, see:
- [Getting Started](/docs/getting-started.md)
- [API Reference](/docs/api-reference.md)
- [Examples](/examples/)
