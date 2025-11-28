# Harbor React Framework Integration Guide

> **Complete documentation for combining, layering, and nesting Harbor React libraries**

This integration guide provides **150+ detailed examples** showing how to properly compose the Harbor React Framework libraries together for maximum performance, security, and developer experience.

## Quick Navigation

| Guide | Libraries Covered | Examples |
|-------|------------------|----------|
| [Auth + Security + State](./AUTH_SECURITY_STATE.md) | `auth`, `security`, `state` | 20+ |
| [Performance + Monitoring + Hydration](./PERFORMANCE_MONITORING_HYDRATION.md) | `performance`, `monitoring`, `hydration` | 16+ |
| [Routing + State + Guards](./ROUTING_STATE_GUARDS.md) | `routing`, `state`, `auth/guards` | 20+ |
| [Realtime + Queries + Services](./REALTIME_QUERIES_SERVICES.md) | `realtime`, `queries`, `services` | 20+ |
| [UI + Theme + Hooks + A11y](./UI_THEME_HOOKS_ACCESSIBILITY.md) | `ui`, `theme`, `hooks` | 14+ |
| [Feature Flags + Error Boundaries + Full Stack](./FEATURE_FLAGS_ERROR_BOUNDARIES_FULLSTACK.md) | `flags`, `monitoring`, all | 14+ |

---

## Provider Composition Order

The correct nesting order for all providers is critical for proper functionality:

```tsx
// app/providers.tsx - CORRECT ORDER
<GlobalErrorBoundary>           {/* 1. Catches all errors */}
  <SecurityProvider>            {/* 2. CSP, CSRF protection */}
    <AuthProvider>              {/* 3. Authentication context */}
      <QueryClientProvider>     {/* 4. Data caching */}
        <FeatureFlagProvider>   {/* 5. Feature toggles */}
          <StoreProvider>       {/* 6. App state */}
            <ThemeProvider>     {/* 7. UI theming */}
              <RealtimeProvider>     {/* 8. WebSocket/SSE */}
                <HydrationProvider>  {/* 9. SSR hydration */}
                  <RouterProvider /> {/* 10. Routing */}
                </HydrationProvider>
              </RealtimeProvider>
            </ThemeProvider>
          </StoreProvider>
        </FeatureFlagProvider>
      </QueryClientProvider>
    </AuthProvider>
  </SecurityProvider>
</GlobalErrorBoundary>
```

### Why This Order?

1. **Error Boundary First**: Catches any initialization errors in providers
2. **Security Before Auth**: CSRF tokens available for login requests
3. **Auth Before Query**: Authentication context available for API calls
4. **Query Before Flags**: Can fetch feature flags with auth headers
5. **Flags Before Store**: State can react to feature flag changes
6. **Store Before Theme**: Theme preferences stored in state
7. **Theme Before Realtime**: Realtime components can use theme
8. **Realtime Before Hydration**: WebSocket connects during hydration
9. **Hydration Before Router**: Routes hydrate progressively

---

## Module Dependency Graph

```
                    ┌─────────────┐
                    │  monitoring │
                    │ (errors)    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ security │ │   auth   │ │  flags   │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             └────────────┼────────────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
              ▼           ▼           ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │  state   │ │ queries  │ │ services │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             └────────────┼────────────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
              ▼           ▼           ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ realtime │ │ routing  │ │ hydration│
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             └────────────┼────────────┘
                          │
                          ▼
                    ┌──────────┐
                    │    ui    │◄──── theme, hooks
                    │components│
                    └──────────┘
```

---

## Common Integration Patterns

### Pattern 1: Protected Feature with All Layers

```tsx
import { RequireAuth, RequirePermission } from '@/lib/auth/authGuards';
import { FlagGate } from '@/lib/flags';
import { ErrorBoundary } from '@/lib/monitoring';
import { HydrationBoundary } from '@/lib/hydration';

export function ProtectedFeature({ children }) {
  return (
    <RequireAuth fallback={<LoginRedirect />}>
      <RequirePermission permission="feature:access">
        <FlagGate flag="new-feature" fallback={<LegacyFeature />}>
          <ErrorBoundary fallback={<FeatureError />}>
            <HydrationBoundary priority="high">
              {children}
            </HydrationBoundary>
          </ErrorBoundary>
        </FlagGate>
      </RequirePermission>
    </RequireAuth>
  );
}
```

### Pattern 2: Real-time Data with Cache

```tsx
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRealtimeStream } from '@/lib/realtime';
import { createResourceClient } from '@/lib/services';

export function useRealtimeResource(id: string) {
  const queryClient = useQueryClient();
  const client = createResourceClient({ resource: 'items' });

  // Initial fetch
  const query = useQuery({
    queryKey: ['items', id],
    queryFn: () => client.get(id)
  });

  // Real-time updates
  useRealtimeStream({
    channel: `items:${id}`,
    events: {
      updated: (data) => queryClient.setQueryData(['items', id], data)
    }
  });

  return query;
}
```

### Pattern 3: Theme-Aware Accessible Component

```tsx
import { useTheme } from '@/lib/theme';
import { useReducedMotion } from '@/lib/hooks';

export function AccessibleCard({ children }) {
  const { resolvedTheme } = useTheme();
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className={`card card--${resolvedTheme}`}
      style={{
        transition: prefersReducedMotion ? 'none' : 'all 0.2s ease'
      }}
      role="article"
    >
      {children}
    </div>
  );
}
```

### Pattern 4: Secure Authenticated Request

```tsx
import { useAuth } from '@/lib/auth';
import { useCSRFToken } from '@/lib/security';
import { createResourceClient } from '@/lib/services';

export function useSecureClient() {
  const { getAccessToken } = useAuth();
  const csrfToken = useCSRFToken();

  return createResourceClient({
    baseURL: '/api',
    tokenProvider: getAccessToken,
    headers: { 'X-CSRF-Token': csrfToken }
  });
}
```

---

## Anti-Patterns to Avoid

### 1. Wrong Provider Order

```tsx
// WRONG: State can't access auth
<StoreProvider>
  <AuthProvider>...</AuthProvider>
</StoreProvider>

// CORRECT
<AuthProvider>
  <StoreProvider>...</StoreProvider>
</AuthProvider>
```

### 2. Missing Error Boundaries

```tsx
// WRONG: Feature flag crash takes down app
<FlagGate flag="beta-feature">
  <BetaFeature />
</FlagGate>

// CORRECT
<FlagGate flag="beta-feature" fallback={<StableFeature />}>
  <ErrorBoundary fallback={<StableFeature />}>
    <BetaFeature />
  </ErrorBoundary>
</FlagGate>
```

### 3. Hooks in Loops

```tsx
// WRONG: Rules of Hooks violation
flags.map(flag => useFeatureFlag(flag))

// CORRECT: Use context
const { isEnabled } = useFeatureFlagContext();
flags.every(flag => isEnabled(flag))
```

### 4. Missing CSRF in Mutations

```tsx
// WRONG
await fetch('/api/update', { method: 'POST', body });

// CORRECT
await fetch('/api/update', {
  method: 'POST',
  headers: { 'X-CSRF-Token': csrfToken },
  body
});
```

---

## Performance Best Practices

| Practice | Implementation |
|----------|---------------|
| Lazy load features | `React.lazy()` + `<Suspense>` |
| Prefetch routes | `usePrefetchRoute()` on hover |
| Progressive hydration | `<HydrationBoundary priority="low">` |
| Optimistic updates | `onMutate` in mutations |
| Memoize selectors | `useMemo` for derived state |
| Batch realtime updates | Debounce cache updates |

---

## Accessibility Checklist

- [ ] All interactive elements keyboard accessible
- [ ] ARIA labels on icon-only buttons
- [ ] Focus management in modals
- [ ] Skip links for navigation
- [ ] Reduced motion support
- [ ] Color contrast 4.5:1 minimum
- [ ] Screen reader announcements for dynamic content

---

## Getting Started

1. **Read the module-specific guide** for your use case
2. **Copy the provider setup** from this README
3. **Follow the patterns** for your feature type
4. **Avoid the anti-patterns** listed above
5. **Test with accessibility tools** before shipping

---

## Need Help?

- Check the specific integration guide for your modules
- Review the anti-patterns section
- Ensure providers are in correct order
- Add error boundaries around new features

---

*Harbor React Framework v2.0 | Last updated: 2024*
