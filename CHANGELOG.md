# Changelog

All notable changes to @llm-guardrails/core will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [@llm-guardrails/mastra@0.3.1] - 2026-03-20

### Added
- **Public API Methods**: Exposed `checkOutput()` and `checkInput()` methods on processors
  - Users no longer need to access internal `.engine` property
  - Clean API: `processor.checkOutput(text)` instead of `processor.engine.checkOutput(text)`
  - Better encapsulation and cleaner public interface
- **Stream Processing**: Added `processOutputStream()` to GuardrailOutputProcessor
  - Now implements full Mastra `Processor` interface
  - Supports streaming responses with incremental checks
  - Configurable `checkInterval` parameter for performance tuning

### Fixed
- **Missing Interface Implementation**: GuardrailOutputProcessor now implements required `processOutputStream` method
- **API Design**: Processors expose proper public methods instead of requiring access to internal engine

### Enhanced
- GuardrailStreamProcessor: Added public `quickCheck()` method for fast validation
- All processors: Added 8 new tests for public API coverage

## [@llm-guardrails/core@0.4.1] - 2026-03-18

### Fixed
- **Build Issue**: Rebuild package to include TopicGatingGuard in dist bundle
  - v0.4.0 was published without running build, causing TopicGatingGuard to be missing from npm package
  - All v0.4.0 features now properly included in the bundle

## [0.4.0] - 2026-03-17

### Added

#### Topic Gating Guard (Domain-Specific Filtering)
- **`TopicGatingGuard`**: New guard for filtering off-topic requests
  - Hybrid L1/L2/L3 detection for topic classification
  - Keyword-based filtering (L1) - blocks/allows specific keywords
  - Pattern-based detection (L2) - detects math, coding, trivia patterns
  - Semantic validation (L3) - LLM-based topic understanding for edge cases
  - Configurable allowed/blocked topics with descriptions
  - Case-sensitive/insensitive keyword matching
  - Graceful degradation when L3 unavailable
- **Use Cases**: Customer support bots, domain-specific assistants, educational chatbots
- **Configuration Options**:
  - `blockedKeywords` / `allowedKeywords` - Fast L1/L2 filtering
  - `blockedTopicsDescription` / `allowedTopicsDescription` - L3 semantic classification
  - `mode` - 'block-off-topic' (default) or 'allow-only-topics'
  - `caseSensitive` - Enable/disable case-sensitive keyword matching

#### Prefilter Mode (Fast L1+L2 Only Processing)
- **`prefilterMode`**: New GuardrailEngine flag to disable L3 across all guards
  - Only uses L1 (< 1ms) and L2 (< 5ms) detection
  - Never calls L3 LLM validation (no LLM costs)
  - Perfect for high-volume or cost-sensitive scenarios
  - Enables streaming use cases with ultra-low latency
  - First-pass filtering before custom validation
- **Performance**: < 5ms latency vs 50-200ms with L3
- **Cost**: $0 LLM costs (only L1+L2 patterns)

### Enhanced
- **GuardrailEngine**: Support for TopicGatingGuard registration
- **Guard Registry**: TopicGatingGuard available via string-based API
- **Type System**: New `TopicGatingGuardConfig` type exported
- **Detection Config**: Prefilter mode respects L3 disable flag

### Documentation
- **README Updates**:
  - Added TopicGatingGuard to guards list (11 guards total)
  - Topic Gating usage examples
  - Prefilter Mode examples
  - Updated comparison table with topic gating row
  - Updated test count (433 passing)
- **L3-LLM-VALIDATION.md**:
  - Added prefilter mode section
  - Example 5: TopicGatingGuard with L3 semantic validation
  - Cost optimization strategies
- **Performance Benchmark**: topic-gating-performance.ts demonstrating L1/L2/L3 differences

### Testing
- **Core Package**: 433 tests passing (100%)
- **New Tests**: 23 new tests added
  - TopicGatingGuard: 19 tests (L1, L2, L3, edge cases)
  - Prefilter Mode: 4 tests
  - Topic Gating Registration: 4 tests

## [0.3.0] - 2026-03-17

### Added

#### Gateway-Level Guards (Multi-Agent Protection)
- **`guardGateway()`**: Gateway-level guard wrapper for orchestrators
  - Pre-routing input validation before reaching agents
  - Post-processing output validation across all agents
  - Shared security policy for entire multi-agent system
  - Reduces redundant validation overhead
- **`guardAgent()`**: Agent-level guard wrapper for individual agents
  - Agent-specific input/output validation
  - Separate policies per agent
  - Fine-grained control over agent behavior
  - Output blocking strategies per agent
- **Two-Layer Defense Architecture**:
  - Gateway validates universal threats (injection, toxicity)
  - Agents check agent-specific risks (leakage, secrets)
  - Defense-in-depth security model
  - Avoid duplicate validation
- **Integration Tests**: 5 tests for gateway + agent architecture
- **Full E2E Test**: Comprehensive test demonstrating all 6 features working together

### Enhanced
- **GuardrailEngine**: Support guard config when instantiating guards (e.g., LeakageGuard with customTerms)
- **Type System**: New `GatewayGuardConfig` and `AgentGuardConfig` types

### Documentation
- **GATEWAY-GUARDS.md**: Comprehensive 560+ line guide covering:
  - Quick start examples
  - Gateway-level and agent-level APIs
  - Three layered defense patterns
  - Multi-agent system integration
  - Best practices and troubleshooting
  - Complete API reference
- **README Updates**: Gateway guards examples in main README and Mastra README
- **Integration Examples**: Multi-agent orchestration patterns

### Testing
- **Core Package**: 530/534 tests passing (99.3%)
- **Mastra Package**: 38/38 tests passing (100%)
- **Total**: 568/572 tests passing (99.3%)
- **New Tests**: 12 new tests added for gateway guards and E2E validation

## [0.2.0] - 2026-03-16

### Added

#### Output Guards
- **Output Validation**: Check LLM responses before showing to users
- **`checkOutput()` Method**: New API for output validation
- **4 Blocking Strategies**:
  - `block`: Replace with custom message
  - `sanitize`: Generic safety redaction
  - `throw`: Throw GuardrailViolation error
  - `custom`: Custom transformation logic
- **Advanced Blocked Messages**:
  - Template variables (`${guard}`, `${reason}`, `${confidence}`, `${timestamp}`)
  - Message wrappers (prefix, suffix, tag format)
  - Per-guard custom messages
  - Dynamic message functions
- **Response Transformer**: Custom logic for blocked responses

#### Custom Patterns
- **LeakageGuard Extensions**:
  - `customTerms`: Block project-specific sensitive information
  - `caseSensitive`: Optional case-sensitive matching
  - Compiled regex patterns for performance
  - Word boundary matching
- **Use Cases**: Internal project names, proprietary frameworks, confidential codenames

#### Fail Modes
- **Fail-Closed Mode** (default): Block requests when guard errors
- **Fail-Open Mode**: Allow requests when guard errors
- **Per-Guard Configuration**: Mix fail modes for different security levels
- **Hybrid Strategy**: Critical guards fail-closed, others fail-open
- **Error Metadata**: Track fail mode in results

#### Mastra Integration
- **GuardrailProcessor**: All-in-one processor (input, output, stream)
- **GuardrailInputProcessor**: Input-only validation
- **GuardrailOutputProcessor**: Output-only validation
- **GuardrailStreamProcessor**: Streaming validation with incremental checks
- **Native Processor Interface**: Seamless Mastra pipeline integration
- **Export from Main Package**: All processors available from `@llm-guardrails/mastra`

### Enhanced
- **GuardrailEngine**: Integrated fail mode handler and output blocker
- **GuardrailResult**: Added `sanitized` and `metadata` fields
- **GuardrailConfig**: Added `outputBlockStrategy`, `blockedMessage`, `responseTransform`, `failMode`
- **Type Safety**: Full TypeScript types for all new features

### Documentation
- **OUTPUT-GUARDS.md**: Comprehensive output validation guide
- **CUSTOM-PATTERNS.md**: Custom sensitive terms configuration
- **FAIL-MODES.md**: Fail-open vs fail-closed documentation
- **README Updates**: Examples for output guards, custom terms, and fail modes
- **Mastra README**: Gateway-level guards and processor interface examples

### Testing
- **Integration Tests**: End-to-end output guard validation
- **Processor Tests**: 20 tests for all Mastra processors
- **Core Tests**: 521 tests passing (3 skipped)
- **100% Pass Rate**: All new features fully tested

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
