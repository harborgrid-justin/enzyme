### Deprecation Replacements Guide

This document lists all currently marked deprecated symbols and modules in the repository and provides their recommended replacements. Use this as the source of truth when migrating code away from deprecated APIs.

Scope
- Source: src/ (library code). Docs and examples may still reference deprecated APIs for illustration.
- Basis: TypeScript JSDoc `@deprecated` tags and explicit deprecation comments found in code.

Legend
- Deprecated → Replacement (module path)
- Notes provide migration hints or behavior differences.

#### Services Layer (migrate to '@/lib/api' where noted)

- HttpClient → ApiClient ('@/lib/api')
  - Notes: `src/lib/services/http.ts` is deprecated. Prefer `apiClient` and types from `@/lib/api`.
- httpClient → apiClient ('@/lib/api')
- HttpError → ApiError ('@/lib/api/types')
- In `src/lib/services/index.ts` deprecated exports:
  - createApiClient → createResourceClient ('./api-clients')
  - apiClients → resourceClients ('./api-clients')
  - ApiResponse → ResourceApiResponse ('./api-clients')
  - ApiClientConfig → ResourceClientConfig ('./api-clients')
  - ApiClient → ResourceClient ('./api-clients')

Additional notes for `src/lib/services/api-clients.ts`:
- File uses `apiClient` from `@/lib/api` already. The name `createApiClient` is deprecated; use `createResourceClient`. `apiClients` alias is deprecated; use `resourceClients`.

#### API Versioning (legacy services)
- src/lib/services/api-versioning.ts: Module deprecated in favor of `@/lib/api` facilities.
  - Replacement: Prefer versioning helpers within `@/lib/api` if available; otherwise keep usage internal and avoid new dependencies on this module.

#### Core Config Types
- MillisecondsUnbranded (number) → Milliseconds ('@/lib/shared/type-utils')
- SecondsUnbranded (number) → Seconds ('@/lib/shared/type-utils')
- PixelsUnbranded (number) → Pixels ('@/lib/shared/type-utils')
- PercentageUnbranded (number) → Percentage ('@/lib/shared/type-utils')
  - Notes: Prefer branded numeric types and constructors `ms, sec, px, pct` from `'@/lib/shared/type-utils'`.

#### Routing
- src/lib/routing/routes.ts: build functions marked deprecated – use route builder utilities.
  - Deprecated: legacy path builders → Replacement: `buildRoutePath` from `./route-builder`.
- src/lib/routing/types.ts
  - Deprecated: `createRouteFactory` (example) → Replacement: `createRouteBuilder` ('./route-builder').
  - Deprecated: `extractParams` → Replacement: `extractParamNames` ('./scanner').

#### Shared Event Utilities
- src/lib/shared/event-utils.ts
  - Deprecated: various legacy event emitter types → Replacement: `UnifiedEventEmitter` (same module or designated replacement module if exported there).

#### Selectors
- src/lib/state/selectors/index.ts (time-based selectors)
  - Deprecated: selectors that depend on `Date.now()` breaking memoization → Replacement: time-parameterized or pure selectors (refer to local replacements within the file).

#### Hooks
- src/lib/hooks/useResourceCleanup.ts
  - Deprecated: `useResourceCleanup` for mounted state tracking → Replacement: `useMountedState` from shared utilities.

#### Config
- src/config/index.ts
  - Deprecated: `RoutePath` type export location → Replacement: import `RoutePath` from `routes.registry` (see `src/lib/routing/route-registry.ts`).

#### Type-safe API client
- src/lib/services/type-safe-api-client.ts
  - Deprecated: `ApiError` reference from services → Replacement: `ApiError` from `@/lib/api/types`.

### Suggested Automated Replacements (safe)

These can typically be applied mechanically without behavioral changes:

1) Replace imports of deprecated services HTTP layer types/symbols:
- from `@/lib/services` or `@/lib/services/http`
  - `HttpClient` → import `ApiClient` from `@/lib/api`
  - `httpClient` → import `{ apiClient }` from `@/lib/api`
  - `HttpError` → import `{ ApiError }` from `@/lib/api/types`

2) Replace deprecated resource client aliases:
- `createApiClient` → `createResourceClient` (from `@/lib/services/api-clients` or `@/lib/services` index)
- `apiClients` → `resourceClients`
- `ApiResponse` → `ResourceApiResponse`
- `ApiClientConfig` → `ResourceClientConfig`
- `ApiClient` (resource alias) → `ResourceClient`

3) Replace unbranded config numeric types:
- `MillisecondsUnbranded` → `Milliseconds`
- `SecondsUnbranded` → `Seconds`
- `PixelsUnbranded` → `Pixels`
- `PercentageUnbranded` → `Percentage`
  - Ensure import: `import type { Milliseconds, Seconds, Pixels, Percentage } from '@/lib/shared/type-utils'`

4) Routing helpers:
- Imports referencing deprecated functions from `src/lib/routing/types.ts` or `routes.ts` → switch to `./route-builder` and `./scanner` per the mapping above.

5) Event utils:
- Replace legacy event emitter types/usages with `UnifiedEventEmitter`.

6) Hooks:
- Replace `useResourceCleanup` with `useMountedState` from shared utilities.

### Migration Checklist

- [ ] Replace service-layer HTTP usage with `@/lib/api`.
- [ ] Update resource client aliases to new names.
- [ ] Migrate to branded numeric types in config.
- [ ] Update routing helpers to route-builder/scanner APIs.
- [ ] Move to `UnifiedEventEmitter`.
- [ ] Replace deprecated selectors or refactor to pure equivalents.
- [ ] Swap `useResourceCleanup` for `useMountedState`.

If a symbol is missing from this list, search the codebase for `@deprecated` or consult the related module’s header.
