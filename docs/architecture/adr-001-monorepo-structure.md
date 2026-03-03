# ADR-001: Monorepo Structure

## Status
Accepted

## Context

We need to decide on the project structure for the guardrails system. The main options are:

1. **Single package**: Everything in one package
2. **Monorepo**: Core package with optional framework-specific packages
3. **Separate repos**: Each package in its own repository

The system will eventually include:
- Core guardrails library
- Framework integrations (LangChain, Claude Code, Mastra)
- Examples and documentation

## Decision

We will use a **monorepo structure** with the following layout:

```
openclaw-guardrails/
├── packages/
│   ├── core/                    # @llm-guardrails/core
│   ├── langchain/               # @llm-guardrails/langchain
│   ├── claude-code/             # @llm-guardrails/claude-code
│   └── mastra/                  # @llm-guardrails/mastra
├── examples/
├── docs/
└── package.json
```

## Rationale

**Advantages**:
1. **Shared tooling**: Single configuration for TypeScript, ESLint, Prettier
2. **Easy cross-package changes**: Update core and framework packages together
3. **Atomic commits**: Changes across packages in single commit
4. **Simplified CI/CD**: Single pipeline for all packages
5. **Better developer experience**: Clone once, develop everywhere
6. **Version synchronization**: Keep packages in sync easily

**Disadvantages**:
1. Slightly more complex initial setup
2. Need to manage package interdependencies
3. All packages share same repo history

## Alternatives Considered

### Option 1: Single Package
- **Pros**: Simplest, no interdependencies
- **Cons**: Large package size, users install unnecessary framework code
- **Rejected**: Framework integrations would bloat the core package

### Option 3: Separate Repositories
- **Pros**: Complete isolation, independent versioning
- **Cons**: Harder to coordinate changes, duplicate tooling, fragmented development
- **Rejected**: Too much overhead for related packages

## Consequences

### Positive
- Developers can work on core + framework packages seamlessly
- Examples can reference local packages during development
- Documentation stays in sync with code
- Easy to add new framework packages

### Negative
- Need to set up package management (we'll use npm workspaces)
- Build order matters (core before framework packages)
- Publishing requires careful coordination

## Implementation

Use **npm workspaces** (built into npm 7+):

```json
{
  "name": "openclaw-guardrails",
  "private": true,
  "workspaces": [
    "packages/*"
  ]
}
```

Each package maintains its own:
- `package.json`
- `tsconfig.json`
- `README.md`

Shared at root:
- `.eslintrc.js`
- `.prettierrc`
- `vitest.config.ts` (can be extended)
