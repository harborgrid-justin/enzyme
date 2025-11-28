# Migration Guide

> Comprehensive guide for migrating between major versions of the Harbor React Library.

---

## Table of Contents

- [v3.x to v4.x Migration](#v3x-to-v4x-migration)
- [Import Migration](#import-migration)
- [API Changes](#api-changes)
- [Deprecated Features](#deprecated-features)
- [Breaking Changes](#breaking-changes)
- [Migration Checklist](#migration-checklist)
- [Automated Migration](#automated-migration)
- [Troubleshooting](#troubleshooting)

---

## v3.x to v4.x Migration

### Overview

Version 4.0.0 introduces significant performance optimizations, primarily around bundle size reduction through minimized barrel exports. The main changes are:

1. **Minimized Main Index**: The main `@/lib` barrel export now only includes ~20 essential exports instead of 1,000+
2. **Submodule Imports Required**: Most imports must now come from specific submodules
3. **Type Consolidation**: Utility types moved to `@/lib/shared/type-utils`
4. **Deprecated Utilities**: Several utility modules marked for removal in v5.0.0

### Performance Impact

| Metric | v3.x | v4.x | Improvement |
|--------|------|------|-------------|
| Initial Bundle | ~847KB | ~153KB | 82% smaller |
| Parse Time (Mobile 3G) | ~3.5s | ~1.0s | 71% faster |
| Lighthouse Score | +27 points | - | - |

---

## Import Migration

### Before (v3.x) - Not Recommended

```typescript
// This pattern is now discouraged and will show deprecation warnings
import {
  useAuth,
  useFeatureFlag,
  useApiRequest,
  ErrorBoundary,
  ThemeProvider,
  createRouter,
  useStore,
  // ... importing everything from main barrel
} from '@/lib';
```

### After (v4.x) - Recommended

```typescript
// Import from specific submodules for optimal tree-shaking
import { useAuth, AuthProvider, RequireAuth } from '@/lib/auth';
import { useFeatureFlag, FlagGate, FeatureFlagProvider } from '@/lib/flags';
import { useApiRequest, useApiMutation, apiClient } from '@/lib/api';
import { ErrorBoundary, GlobalErrorBoundary } from '@/lib/monitoring';
import { ThemeProvider, useTheme } from '@/lib/theme';
import { createRouter, useTypedNavigate } from '@/lib/routing';
import { useStore } from '@/lib/state';
import { useSessionDuration, useIsSessionExpired } from '@/lib/state/hooks/useSessionTime';
```

### Quick Reference: Import Mapping

| v3.x Import | v4.x Submodule |
|-------------|----------------|
| `useAuth`, `AuthProvider` | `@/lib/auth` |
| `useFeatureFlag`, `FlagGate` | `@/lib/flags` |
| `useApiRequest`, `apiClient` | `@/lib/api` |
| `ErrorBoundary` | `@/lib/monitoring` |
| `ThemeProvider`, `useTheme` | `@/lib/theme` |
| `createRouter` | `@/lib/routing` |
| `useStore`, `createSlice` | `@/lib/state` |
| `HydrationProvider` | `@/lib/hydration` |
| `StreamProvider` | `@/lib/streaming` |
| `SecurityProvider` | `@/lib/security` |
| `initializeApp` | `@/lib/system` |
| `DeepPartial`, `Result` | `@/lib/shared/type-utils` |

---

## API Changes

### Session Time Selectors (IMPORTANT)

The following selectors are **deprecated** because they use `Date.now()` inside the selector combiner, which breaks memoization:

```typescript
// DEPRECATED - Do not use
import { selectSessionDuration, selectTimeUntilExpiry, selectIsSessionExpired } from '@/lib/state/selectors';
```

**Use the new hooks instead:**

```typescript
// RECOMMENDED - Proper time-based calculations
import {
  useSessionDuration,
  useTimeUntilExpiry,
  useIsSessionExpired,
  useSessionTimeInfo,
} from '@/lib/state/hooks/useSessionTime';

function SessionInfo() {
  // These hooks properly update on an interval without breaking memoization
  const duration = useSessionDuration();
  const timeUntilExpiry = useTimeUntilExpiry();
  const isExpired = useIsSessionExpired();

  // Or use the combined hook for all session time info
  const {
    duration,
    timeUntilExpiry,
    isExpired,
    formattedDuration,
    formattedTimeUntilExpiry,
  } = useSessionTimeInfo();

  return (
    <div>
      <p>Session active for: {formattedDuration}</p>
      <p>Expires in: {formattedTimeUntilExpiry}</p>
    </div>
  );
}
```

### Event Emitter Consolidation

Event emitter utilities have been consolidated into `@/lib/shared/event-utils`:

```typescript
// DEPRECATED - These are wrapper re-exports
import { EventEmitter } from '@/lib/utils/eventEmitter';
import { ModuleEventBus } from '@/lib/vdom/event-bus';
import { CoordinationEventBus } from '@/lib/coordination/event-bus';

// RECOMMENDED - Use the unified implementation
import {
  UnifiedEventEmitter,
  createEventEmitter,
  globalEventBus,
  createScopedEmitter,
} from '@/lib/shared/event-utils';
```

### API Client Migration

If you're still using `httpClient`, migrate to `apiClient`:

```typescript
// DEPRECATED
import { httpClient } from '@/lib/services/http';

// RECOMMENDED
import { apiClient } from '@/lib/api';

// The apiClient provides:
// - Type-safe requests
// - Automatic retry with exponential backoff
// - Request/response interceptors
// - Rate limiting
// - Request deduplication
```

---

## Deprecated Features

### Scheduled for Removal in v5.0.0

| Feature | Replacement | Notes |
|---------|-------------|-------|
| `@/lib/utils/eventEmitter` | `@/lib/shared/event-utils` | Wrapper re-export |
| `@/lib/vdom/event-bus` | `@/lib/shared/event-utils` | Wrapper re-export |
| `@/lib/coordination/event-bus` | `@/lib/shared/event-utils` | Wrapper re-export |
| `@/lib/services/http` | `@/lib/api` | Legacy HTTP client |
| `selectSessionDuration` | `useSessionDuration` | Memoization issue |
| `selectTimeUntilExpiry` | `useTimeUntilExpiry` | Memoization issue |
| `selectIsSessionExpired` | `useIsSessionExpired` | Memoization issue |

### ESLint Enforcement Timeline

- **v4.0.0** (Current): Deprecation warnings in development
- **v5.0.0** (Planned): ESLint errors for main index imports
- **v6.0.0** (Planned): Main index deprecated entirely

---

## Breaking Changes

### 1. Minimal Main Index

The main `@/lib` export now only includes essential items:

```typescript
// Still available from main index:
export { initializeApp, AppConfig } from './system';
export { AuthProvider, useAuth, User, AuthState } from './auth';
export { FeatureFlagProvider, useFeatureFlag, FlagGate } from './flags';
export { ErrorBoundary, GlobalErrorBoundary } from './monitoring';
export { PerformanceProvider, initPerformanceMonitoring } from './performance';
export { createQueryKeyFactory } from './queries';
export { ThemeProvider, useTheme, Theme } from './theme';

// Everything else requires submodule imports
```

### 2. Rules of Hooks Compliance

The `useHydration` hook has been fixed to comply with React's Rules of Hooks. If you were relying on the conditional behavior, the API is unchanged but the internal implementation is now correct:

```typescript
// Usage remains the same
const hydration = useHydration({ throwIfNoProvider: false });
```

### 3. Memoized Hook Returns

Several hooks now properly memoize their return values to prevent unnecessary re-renders:

- `useStream()` - Return value now wrapped in `useMemo`
- `useHydration()` - Already properly memoized

---

## Migration Checklist

### Phase 1: Update Imports (Required)

- [ ] Replace main barrel imports with submodule imports
- [ ] Update event emitter imports to use `@/lib/shared/event-utils`
- [ ] Replace deprecated selectors with hooks

### Phase 2: API Updates (Recommended)

- [ ] Migrate from `httpClient` to `apiClient`
- [ ] Update storage utilities to use `@/lib/shared/StorageManager`

### Phase 3: Type Updates (Optional)

- [ ] Import utility types from `@/lib/shared/type-utils`
- [ ] Update `Result` type usage to use consistent discriminant

### Phase 4: Verification

- [ ] Run build to check for import errors
- [ ] Run tests to verify functionality
- [ ] Check bundle size reduction

---

## Automated Migration

### Using the Migration Script

We provide a codemod to automate common migration tasks:

```bash
# Install the migration tool
npx @harbor/react-lib-migrate@latest

# Run the migration
npx @harbor/react-lib-migrate --path ./src

# Preview changes without applying
npx @harbor/react-lib-migrate --path ./src --dry-run

# Migrate specific patterns
npx @harbor/react-lib-migrate --path ./src --patterns barrel-imports,deprecated-selectors
```

### Manual Migration with Find/Replace

If you prefer manual migration, use these regex patterns:

```regex
# Find main barrel imports
import \{([^}]+)\} from ['"]@/lib['"];

# Find deprecated event emitter imports
import .* from ['"]@/lib/(utils/eventEmitter|vdom/event-bus|coordination/event-bus)['"];

# Find deprecated selectors
(selectSessionDuration|selectTimeUntilExpiry|selectIsSessionExpired)
```

---

## Troubleshooting

### "Cannot find module" Errors

If you see import errors after migrating:

1. Check the [Import Mapping](#quick-reference-import-mapping) table
2. Ensure you're importing from the correct submodule
3. Run `npm install` to ensure dependencies are up to date

### Bundle Size Not Reduced

If your bundle size hasn't decreased:

1. Check that you're not importing from the main `@/lib` barrel
2. Verify tree-shaking is enabled in your bundler
3. Use `npx vite-bundle-visualizer` to identify large imports

### Type Errors After Migration

If you encounter type errors:

1. Import types from their source modules, not the main index
2. Check if the type has been renamed or moved
3. Update generic type parameters if required

### Runtime Errors with Hooks

If hooks are throwing errors:

1. Ensure you're calling hooks at the top level of function components
2. Check that providers are properly set up in your app tree
3. Verify hook dependencies are correctly specified

---

## Getting Help

- **Documentation**: See [Architecture](./docs/ARCHITECTURE.md) for system design
- **Examples**: See [Examples](./docs/examples/) for usage patterns
- **Issues**: Report problems at [GitHub Issues](https://github.com/harborgrid-justin/white-cross/issues)
- **Changelog**: See [CHANGELOG.md](./CHANGELOG.md) for version history

---

## See Also

- [Architecture Documentation](./docs/ARCHITECTURE.md)
- [Performance Optimization Summary](./PERFORMANCE_OPTIMIZATION_SUMMARY.md)
- [Barrel Export Migration](./BARREL_EXPORT_MIGRATION.md)
- [Contributing Guide](./CONTRIBUTING.md)
