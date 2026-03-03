# Contributing to LLM Guardrails

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/openclaw-guardrails.git
   cd openclaw-guardrails
   ```
3. **Install dependencies**:
   ```bash
   npm install
   cd packages/core
   npm install
   ```
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run typecheck
```

### Building

```bash
# Build all packages
npm run build

# Build in watch mode
cd packages/core
npm run dev
```

## Contribution Guidelines

### Code Style

- Use **TypeScript** for all code
- Follow the **ESLint** and **Prettier** configurations
- Write **clear, descriptive variable names**
- Add **JSDoc comments** for public APIs
- Keep functions **small and focused**

### Testing

- Write tests for **all new features**
- Maintain **>90% code coverage**
- Include **edge cases** in tests
- Add **performance benchmarks** for critical paths

### Commit Messages

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Test changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Build/tooling changes

**Examples**:
```
feat(guards): add InjectionGuard implementation

fix(engine): handle undefined context in checkInput

docs(readme): update quick start example

test(pii): add tests for credit card detection
```

### Pull Requests

1. **Update tests** for your changes
2. **Update documentation** if needed
3. **Run the full test suite** before submitting
4. **Keep PRs focused** - one feature/fix per PR
5. **Write a clear description** of your changes

**PR Template**:
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] Coverage maintained/improved

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

## Project Structure

```
openclaw-guardrails/
├── packages/
│   ├── core/              # Main guardrails library
│   ├── langchain/         # LangChain integration
│   ├── claude-code/       # Claude Code skill
│   └── mastra/            # Mastra integration
├── examples/              # Usage examples
├── docs/                  # Documentation
│   └── architecture/      # ADRs
└── package.json           # Root package
```

## Adding New Guards

To add a new guard:

1. **Create guard file**: `packages/core/src/guards/YourGuard.ts`
2. **Extend HybridGuard**:
   ```typescript
   import { HybridGuard, TierResult } from '../types';

   export class YourGuard extends HybridGuard {
     name = 'your-guard';

     protected detectL1(input: string): TierResult {
       // L1 implementation
     }

     protected detectL2(input: string): TierResult {
       // L2 implementation
     }
   }
   ```
3. **Add tests**: `packages/core/src/guards/__tests__/YourGuard.test.ts`
4. **Export from index**: Add to `packages/core/src/index.ts`
5. **Update documentation**: Add to README.md

## Performance Requirements

New code should meet these targets:
- **L1 detection**: <1ms
- **L2 detection**: <5ms
- **Memory**: No leaks in long-running processes
- **Accuracy**: >90% for L1/L2, >95% for L2 with L1

## Documentation

When adding features:
- Update **README.md** with examples
- Add **JSDoc comments** to public APIs
- Create **ADRs** for significant decisions
- Update **CHANGELOG.md**

## Security

- **Never commit secrets** or API keys
- **Validate all inputs** in guards
- **Handle errors gracefully**
- Report security issues via **GitHub Security Advisories**

## Questions?

- Open an **issue** for bugs or feature requests
- Start a **discussion** for questions
- Check **existing issues** before opening new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to LLM Guardrails! 🚀
