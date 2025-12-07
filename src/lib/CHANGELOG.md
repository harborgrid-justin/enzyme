# Changelog

All notable changes to the Harbor React Library will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Comprehensive library documentation
- Example files for routing, auth, RBAC, and performance

---

## [3.0.0] - 2024-11-26

### Added

#### New Features

- **Progressive Hydration System** - Priority-based hydration with 5 levels (critical, high, normal, low, idle)
- **Predictive Prefetching** - ML-based navigation prediction for faster page loads
- **Performance Observatory** - Real-time performance dashboard component
- **Web Vitals Collection** - Automatic LCP, INP, CLS, FCP, TTFB tracking
- **Security Infrastructure** - CSP management, CSRF protection, XSS prevention, secure storage
- **Feature Module Factory** - Complete plug-and-play feature system with auto-discovery

#### New Hooks

- `useHydration`, `useHydrationMetrics`, `useHydrationProgress`
- `usePredictivePrefetch`, `usePerformanceBudget`, `useMemoryPressure`
- `useNetworkQuality`, `useAdaptiveImageQuality`
- `useSecureStorage`, `useCSRFToken`, `useSanitizedContent`
- `useFeatureVisibility`, `useAccessibleFeatures`

#### New Components

- `HydrationProvider`, `HydrationBoundary`, `LazyHydration`
- `PerformanceObservatory`, `PerformanceProvider`
- `SecurityProvider`, `FlagGate`, `FlagGateAll`, `FlagGateAny`
- `PredictiveLink`

### Changed

#### Breaking Changes

- **React Query 5 Migration**
    - `cacheTime` renamed to `gcTime`
    - `useQuery` options restructured
    - Mutation callbacks simplified

- **Auth Guard Refactoring**
    - `ProtectedRoute` replaced with `RequireAuth`, `RequireRole`, `RequirePermission`
    - Guards are now composable and can be nested

- **Routing API Updates**
    - `createTypedRouter` renamed to `createRouter`
    - Route metadata structure updated
    - Type-safe route builders enhanced

- **Hook Renames**
    - `useAuthentication` -> `useAuth`
    - `useApiQuery` -> `useApiRequest`
    - `useApiMutate` -> `useApiMutation`
    - `useFlag` -> `useFeatureFlag`
    - `FeatureGate` -> `FlagGate`

#### Non-Breaking Changes

- Improved TypeScript types across all modules
- Better tree-shaking support
- Enhanced error messages
- Performance optimizations

### Deprecated

- `useAuthentication` (use `useAuth`)
- `ProtectedRoute` (use `RequireAuth` + `RequireRole`)
- `FeatureGate` (use `FlagGate`)

### Removed

- Legacy `AppProvider` (use individual providers)
- Old state management API (use Zustand-based API)
- Deprecated routing utilities

### Fixed

- Memory leak in WebSocket reconnection logic
- Race condition in token refresh
- Incorrect type inference in route builders
- Performance regression in large lists

### Security

- Added CSRF protection by default
- Implemented Content Security Policy management
- Added XSS prevention utilities
- Encrypted secure storage implementation

---

## [2.0.0] - 2024-06-15

### Added

- Zustand-based state management
- React Query integration
- Enhanced error boundaries with hierarchy
- Performance monitoring hooks
- Network status tracking

### Changed

- **Breaking**: Provider architecture restructured
- **Breaking**: API client refactored
- **Breaking**: State management completely rewritten

### Removed

- Custom state management solution
- Legacy fetch wrapper

---

## [1.0.0] - 2024-01-10

### Added

- Initial release
- Basic authentication system
- Simple routing utilities
- Feature flag support
- Theme system
- Basic UI components

---

## Migration Guides

### Migrating from 2.x to 3.x

See [Migration Guide](./docs/MIGRATION.md) for detailed instructions.

**Quick migration checklist:**

1. Update React Query to v5
2. Rename hooks:
    - `useAuthentication` -> `useAuth`
    - `useApiQuery` -> `useApiRequest`
    - `useApiMutate` -> `useApiMutation`
3. Replace `ProtectedRoute` with `RequireAuth` and `RequireRole`
4. Replace `FeatureGate` with `FlagGate`
5. Update `cacheTime` to `gcTime` in query options
6. Run TypeScript compiler to catch remaining issues

### Migrating from 1.x to 2.x

1. Split `AppProvider` into individual providers
2. Migrate state to Zustand
3. Update API client usage
4. Replace deprecated components

---

## Release Schedule

- **Major releases** (x.0.0): Every 6-12 months, may contain breaking changes
- **Minor releases** (3.x.0): Every 1-2 months, new features, backward compatible
- **Patch releases** (3.0.x): As needed, bug fixes only

---

## Support Policy

| Version | Status      | Support Until |
|---------|-------------|---------------|
| 3.x     | Current     | Active        |
| 2.x     | Maintenance | 2025-06-15    |
| 1.x     | End of Life | 2024-06-15    |

---

## Links

- [Documentation](./README.md)
- [Migration Guide](./docs/MIGRATION.md)
- [Contributing](./CONTRIBUTING.md)
