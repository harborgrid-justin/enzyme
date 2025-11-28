# Harbor React Library Documentation

> **Scope**: This document indexes the Harbor React Library's internal documentation.
> For the React Template documentation, see [Template Documentation](../../../docs/INDEX.md).

Welcome to the Harbor React Library documentation hub. This index provides navigation to all documentation resources.

---

## Quick Start

- [README](../README.md) - Library overview, installation, and getting started
- [API Reference](./API.md) - Complete API documentation
- [Architecture](./ARCHITECTURE.md) - System design and architecture patterns

---

## Table of Contents

- [Core Documentation](#core-documentation)
- [Feature Guides](#feature-guides)
- [Examples](#examples)
- [Shared Utilities](#shared-utilities)
- [Contributing](#contributing)

---

## Core Documentation

### Library Overview

| Document | Description |
|----------|-------------|
| [README](../README.md) | Library introduction, installation, and quick start guide |
| [API Reference](./API.md) | Complete API documentation for all exports |
| [Architecture](./ARCHITECTURE.md) | System architecture, design patterns, and module organization |
| [Changelog](../CHANGELOG.md) | Version history and release notes |

### Configuration & Setup

| Document | Description |
|----------|-------------|
| [Configuration](./CONFIGURATION.md) | Configuration management, environment variables, and settings |
| [Migration Guide](./MIGRATION.md) | Upgrading between versions and migration patterns |
| [Library Migration Guide](../MIGRATION_GUIDE.md) | v3 to v4 migration with submodule imports |
| [Library Defaults](../core/config/library-defaults.ts) | Centralized default configuration values |

---

## Feature Guides

### Authentication & Authorization

| Document | Description |
|----------|-------------|
| [Authentication](./AUTHENTICATION.md) | JWT token management, auth flows, and session handling |
| [RBAC](./RBAC.md) | Role-Based Access Control implementation and patterns |

### Routing & Navigation

| Document | Description |
|----------|-------------|
| [Routing](./ROUTING.md) | Advanced routing patterns, guards, and navigation |

### Performance & Optimization

| Document | Description |
|----------|-------------|
| [Performance](./PERFORMANCE.md) | Web Vitals monitoring, optimization strategies, and profiling |

### Feature Management

| Document | Description |
|----------|-------------|
| [Feature Flags](./FEATURE-FLAGS.md) | Feature flag system, A/B testing, and gradual rollouts |

### Module Documentation

| Document | Description |
|----------|-------------|
| [Coordination](./module-docs/COORDINATION.md) | Event buses, dependency injection, provider orchestration |
| [Data Layer](./module-docs/DATA_LAYER.md) | Data validation, sync, normalization, integrity |
| [Theming](./module-docs/THEMING.md) | Theme management, design tokens, color palettes |

---

## Examples

Comprehensive code examples for common use cases:

| Example Collection | Description |
|--------------------|-------------|
| [Authentication Examples](./examples/auth-examples.md) | 25+ authentication and session management examples |
| [RBAC Examples](./examples/rbac-examples.md) | 25+ role-based access control examples |
| [Routing Examples](./examples/routing-examples.md) | 25+ routing and navigation examples |
| [Performance Examples](./examples/performance-examples.md) | 25+ performance optimization examples |

---

## Shared Utilities

Reusable utilities for common React patterns:

| Document | Description |
|----------|-------------|
| [Shared Hook Utilities](../hooks/shared/README.md) | Mounted state tracking, latest refs, network utilities, buffering |
| [Quick Reference](../hooks/shared/QUICK_REFERENCE.md) | Quick lookup for shared utility APIs |
| [Migration Checklist](../hooks/shared/MIGRATION_CHECKLIST.md) | Guide for migrating to shared utilities |

### Shared Utility Categories

- **Mounted State Tracking** - `useIsMounted()`, `useMountedState()`
- **Latest Value Refs** - `useLatestRef()`, `useLatestCallback()`, `useLatestRefs()`
- **Network Utilities** - `getNetworkInfo()`, `isSlowConnection()`, `shouldAllowPrefetch()`
- **Buffer/Batching** - `useBuffer()`, `useTimeWindowBuffer()`, `useBatchBuffer()`

---

## Contributing

| Document | Description |
|----------|-------------|
| [Contributing Guide](../CONTRIBUTING.md) | How to contribute to the Harbor React Library |
| [Changelog](../CHANGELOG.md) | Version history for tracking changes |

---

## Document Map

```
lib/
├── README.md              <- Entry point
├── CHANGELOG.md           <- Version history
├── CONTRIBUTING.md        <- Contribution guide
├── docs/
│   ├── INDEX.md           <- You are here
│   ├── API.md             <- API reference
│   ├── ARCHITECTURE.md    <- System architecture
│   ├── AUTHENTICATION.md  <- Auth documentation
│   ├── CONFIGURATION.md   <- Config documentation
│   ├── FEATURE-FLAGS.md   <- Feature flags
│   ├── MIGRATION.md       <- Migration guide
│   ├── PERFORMANCE.md     <- Performance docs
│   ├── RBAC.md            <- RBAC documentation
│   ├── ROUTING.md         <- Routing documentation
│   └── examples/
│       ├── auth-examples.md
│       ├── rbac-examples.md
│       ├── routing-examples.md
│       └── performance-examples.md
└── hooks/
    └── shared/
        ├── README.md
        ├── QUICK_REFERENCE.md
        └── MIGRATION_CHECKLIST.md
```

---

## Architecture Audits

The library has undergone comprehensive PhD-level engineering audits:

| Audit | Date | Agents | Issues Found | Issues Fixed | Status |
|-------|------|--------|--------------|--------------|--------|
| [Murder Board V2](./MURDER_BOARD_AUDIT_V2.md) | 2025-11-28 | 10 | 150+ | Critical Fixed | ✅ COMPLETE |
| [Murder Board V1](./MURDER_BOARD_AUDIT.md) | 2025-11-27 | 10 | 90+ | 90+ | ✅ COMPLETE |

### Audit Domains Covered

1. **API Architecture** - QueryClient, CSRF, JSON validation, rate limiting
2. **State Management** - Memory leaks, race conditions, hydration
3. **React Components** - Hooks violations, memoization, SSR safety
4. **Data Layer** - Cache management, validation, sync engine
5. **Performance** - HMR singletons, code splitting, INP optimization
6. **Accessibility** - WCAG 2.1 AA compliance, keyboard navigation
7. **Security** - Encryption, token storage, XSS/CSRF protection
8. **TypeScript** - Type consolidation, branded types, Result pattern
9. **UI/UX** - Theme tokens, Button component, skeleton factory
10. **Testing** - Full test infrastructure with 200+ test cases

### Key Standards Enforced

1. **Environment Detection**: Always use `isDev()`, `isProd()` from `@/lib/core/config/env-helper`
2. **State Mutations**: Use functional `setState` for Immer compatibility
3. **Accessibility**: Follow `/src/styles/accessibility.css` patterns
4. **API Calls**: Use centralized `apiClient` from `@/lib/api`
5. **Feature Flags**: Gate features with `useFeatureFlag()` hook

---

## Best Practices

### Environment Checks
```typescript
// Use centralized helpers
import { isDev, isProd } from '@/lib/core/config/env-helper';

// NOT direct env access
if (isDev()) { /* dev-only code */ }
```

### State Management
```typescript
// Use functional form for Immer
store.setState((state) => {
  state.setting = newValue;
});
```

### Performance
- Use `React.memo()` for pure components
- Extract inline styles to `useMemo()`
- Use `useCallback()` for event handlers

---

## See Also

- [GitHub Repository](https://github.com/harborgrid/harbor-react-lib)
- [Issue Tracker](https://github.com/harborgrid/harbor-react-lib/issues)
- [npm Package](https://www.npmjs.com/package/@harbor/react-lib)
