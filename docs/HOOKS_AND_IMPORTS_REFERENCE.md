# Enzyme Framework: Master Hooks and Import Reference Guide

> **For LLMs and Developers**: This is the authoritative reference for all hooks, functions, and imports available in the `@missionfabric-js/enzyme` framework. Use this guide instead of searching through compiled `dist` folders.

## Table of Contents

1. [Quick Start Import Guide](#quick-start-import-guide)
2. [Package Structure](#package-structure)
3. [Core Hooks Reference](#core-hooks-reference)
4. [State Management](#state-management)
5. [API & Data Fetching](#api--data-fetching)
6. [Authentication & Security](#authentication--security)
7. [Routing & Navigation](#routing--navigation)
8. [Feature Flags & Configuration](#feature-flags--configuration)
9. [UI, Theme & Performance](#ui-theme--performance)
10. [Realtime & Streaming](#realtime--streaming)
11. [Complete Module Exports](#complete-module-exports)

---

## Quick Start Import Guide

### Main Package Entry Point

```typescript
// Import from the main package
import { useAuth, useFeatureFlag, useStore } from '@missionfabric-js/enzyme'
```

### Submodule Imports (Recommended for Tree-Shaking)

```typescript
// API & HTTP
import { apiClient, useApiRequest, useApiMutation } from '@missionfabric-js/enzyme/api'

// Authentication
import { AuthProvider, useAuth, RequireAuth } from '@missionfabric-js/enzyme/auth'

// State Management
import { useStore, createFeatureStore } from '@missionfabric-js/enzyme/state'

// Feature Flags
import { useFeatureFlag, FlagGate } from '@missionfabric-js/enzyme/flags'

// Configuration
import { useConfig, ConfigProvider } from '@missionfabric-js/enzyme/config'

// Hooks
import { useTheme, useDebouncedValue, useOnlineStatus } from '@missionfabric-js/enzyme/hooks'

// Routing
import { AppLink, useRouteNavigate } from '@missionfabric-js/enzyme/routing'

// Performance
import { usePerformanceBudget, useRenderMetrics } from '@missionfabric-js/enzyme/performance'

// Security
import { useCSRFToken, useSanitizedContent } from '@missionfabric-js/enzyme/security'

// Realtime
import { useRealtimeStream, RealtimeProvider } from '@missionfabric-js/enzyme/realtime'

// Streaming & Hydration
import { StreamProvider, HydrationProvider } from '@missionfabric-js/enzyme/streaming'

// UI Components
import { Button, Spinner, ToastProvider } from '@missionfabric-js/enzyme/ui'

// Theme
import { ThemeProvider, useThemeContext, tokens } from '@missionfabric-js/enzyme/theme'

// Utilities
import { debounce, throttle } from '@missionfabric-js/enzyme/utils'
```

---

## Package Structure

The Enzyme framework exports **26 submodules**:

| Submodule | Purpose |
|-----------|---------|
| `/api` | HTTP client, API hooks, request building |
| `/auth` | Authentication, RBAC, route guards |
| `/config` | Configuration management, validation |
| `/contexts` | React context definitions |
| `/coordination` | Cross-module event bus, DI, lifecycle |
| `/core` | Core infrastructure |
| `/data` | Validation, normalization, sync |
| `/feature` | Feature module system |
| `/flags` | Feature flags, A/B testing |
| `/hooks` | Shared React hooks |
| `/hydration` | Progressive hydration |
| `/layouts` | Adaptive layouts, container queries |
| `/monitoring` | Error boundaries, reporting |
| `/performance` | Web Vitals, performance budgets |
| `/queries` | React Query utilities |
| `/realtime` | WebSocket, SSE clients |
| `/routing` | Type-safe routing |
| `/security` | CSP, CSRF, XSS protection |
| `/services` | Service layer, caching |
| `/shared` | Shared utilities |
| `/state` | Zustand-based state management |
| `/streaming` | Progressive HTML streaming |
| `/system` | Application lifecycle |
| `/theme` | Theming, design tokens |
| `/ui` | UI components |
| `/utils` | Utility functions |
| `/ux` | UX utilities, accessibility |
| `/vdom` | Virtual modular DOM |

---

## Core Hooks Reference

### Lifecycle & State Hooks

#### useIsMounted
```typescript
import { useIsMounted } from '@missionfabric-js/enzyme/hooks'

const isMounted = useIsMounted()
// Returns: () => boolean - Function to check if component is mounted
```

#### useMountedState
```typescript
import { useMountedState } from '@missionfabric-js/enzyme/hooks'

const { isMounted, ifMounted } = useMountedState()
// isMounted: () => boolean
// ifMounted: <T>(fn: () => T) => T | undefined
```

#### useLatestRef / useLatestCallback
```typescript
import { useLatestRef, useLatestCallback } from '@missionfabric-js/enzyme/hooks'

const ref = useLatestRef(value);        // Keeps ref current without re-renders
const callback = useLatestCallback(fn);  // Stable callback with latest closure
```

#### useSafeState
```typescript
import { useSafeState } from '@missionfabric-js/enzyme/hooks'

const [state, setState] = useSafeState(initialValue)
// Same as useState but won't update after unmount
```

### Timing Hooks

#### useDebouncedValue / useDebouncedCallback
```typescript
import { useDebouncedValue, useDebouncedCallback } from '@missionfabric-js/enzyme/hooks'

const debouncedQuery = useDebouncedValue(query, 300)

const { callback, cancel, flush } = useDebouncedCallback(
  (value) => saveToServer(value),
  1000,
  { leading: false, trailing: true }
)
```

#### useThrottledValue
```typescript
import { useThrottledValue } from '@missionfabric-js/enzyme/hooks'

const throttledValue = useThrottledValue(value, 100)
```

#### useTimeout / useInterval
```typescript
import { useTimeout, useInterval } from '@missionfabric-js/enzyme/hooks'

const { set, clear, clearAll } = useTimeout()
const timeoutId = set(() => console.log('Done'), 2000)

const { set: setInterval, clearAll } = useInterval()
setInterval(() => tick(), 1000)
```

### Resource Management

#### useDisposable
```typescript
import { useDisposable } from '@missionfabric-js/enzyme/hooks'

const { register, registerFn, disposeAll } = useDisposable()
registerFn(() => cleanup())  // Auto-cleanup on unmount
```

#### useAbortController
```typescript
import { useAbortController } from '@missionfabric-js/enzyme/hooks'

const { getSignal, abort, reset } = useAbortController()
fetch(url, { signal: getSignal() })
```

#### useEventListener
```typescript
import { useEventListener } from '@missionfabric-js/enzyme/hooks'

const { add, remove, removeAll } = useEventListener()
add(window, 'resize', handleResize)
```

### Network Hooks

#### useOnlineStatus / useNetworkStatus
```typescript
import { useOnlineStatus, useNetworkStatus, useNetworkQuality } from '@missionfabric-js/enzyme/hooks'

const isOnline = useOnlineStatus()          // boolean
const status = useNetworkStatus()            // Full network info
const quality = useNetworkQuality()          // 'offline' | 'poor' | 'fair' | 'good' | 'excellent'
```

#### useOfflineFallback
```typescript
import { useOfflineFallback } from '@missionfabric-js/enzyme/hooks'

const { value, isOffline, isFallback } = useOfflineFallback(liveData, {
  fallbackValue: cachedData,
  showNotification: true
})
```

#### useNetworkAwareFetch
```typescript
import { useNetworkAwareFetch } from '@missionfabric-js/enzyme/hooks'

const { canFetch, quality, suggestions } = useNetworkAwareFetch({
  minQuality: 'good'
})
```

### Async Hooks

#### useAsync
```typescript
import { useAsync } from '@missionfabric-js/enzyme/hooks'

const { execute, cancel, loading, error, value } = useAsync(
  () => fetchData(id),
  [id]
)
```

#### useAsyncWithRecovery
```typescript
import { useAsyncWithRecovery } from '@missionfabric-js/enzyme/hooks'

const { data, isLoading, isError, retry, reset } = useAsyncWithRecovery(
  () => fetchUser(userId),
  {
    maxRetries: 3,
    autoRetry: true,
    onError: (err) => toast.error(err.message)
  }
)
```

### Buffering Hooks

#### useBuffer
```typescript
import { useBuffer, useTimeWindowBuffer, useBatchBuffer } from '@missionfabric-js/enzyme/hooks'

const { add, flush, size } = useBuffer({
  maxSize: 10,
  flushInterval: 5000,
  onFlush: (items) => sendBatch(items)
})
```

### Theme Hooks

#### useTheme / useSystemThemePreference
```typescript
import { useTheme, useSystemThemePreference } from '@missionfabric-js/enzyme/hooks'

const { isDark, toggle, setLight, setDark } = useTheme()
const { prefersDark } = useSystemThemePreference()
```

### Analytics Hooks

#### usePageView / useTrackEvent
```typescript
import { usePageView, useTrackEvent, useTrackFeature } from '@missionfabric-js/enzyme/hooks'

usePageView('Dashboard', { section: 'main' })

const trackEvent = useTrackEvent()
trackEvent('button_click', { button: 'submit' })

const { trackAction, trackView } = useTrackFeature('search')
```

### Accessibility Hooks

#### useScreenReaderAnnounce
```typescript
import { useScreenReaderAnnounce, announceToScreenReader } from '@missionfabric-js/enzyme/hooks'

const announce = useScreenReaderAnnounce()
announce('5 results found')

// Or imperatively:
announceToScreenReader('Saved successfully', { priority: 'polite' })
```

#### useKeyboardShortcuts
```typescript
import { useKeyboardShortcuts } from '@missionfabric-js/enzyme/hooks'

const { shortcuts } = useKeyboardShortcuts([
  { id: 'save', keys: 'Ctrl+S', handler: handleSave, category: 'Actions' },
  { id: 'close', keys: 'Escape', handler: handleClose, category: 'Navigation' }
])
```

---

## State Management

### Global Store

```typescript
import {
  useStore,
  getStoreState,
  subscribeToStore,
  resetStore,
  hasStoreHydrated,
  waitForHydration
} from '@missionfabric-js/enzyme/state'

// Select state
const locale = useStore(state => state.locale)

// Get state outside React
const state = getStoreState()

// Subscribe to changes
const unsubscribe = subscribeToStore(
  state => state.theme,
  (newTheme) => applyTheme(newTheme)
)

// Wait for hydration (SSR)
await waitForHydration()
```

### Convenience Hooks

```typescript
import {
  useUIState, useUIActions,
  useSessionState, useSessionActions,
  useSettingsState, useSettingsActions,
  useSidebar, useModal, useLoading
} from '@missionfabric-js/enzyme/state'

// UI State
const { sidebarOpen, activeModal } = useUIState()
const { toggleSidebar, openModal, closeModal } = useUIActions()

// Convenience hooks
const { isOpen, toggle } = useSidebar()
const { open, close, data } = useModal()
const { isLoading, start, stop } = useLoading()
```

### Feature Stores

```typescript
import {
  createFeatureStore,
  createLazyFeatureStore,
  registerFeatureStore
} from '@missionfabric-js/enzyme/state'

const useTasksStore = createFeatureStore(
  (set) => ({
    tasks: [],
    addTask: (task) => set(state => { state.tasks.push(task) })
  }),
  { name: 'tasks', persist: { partialize: s => ({ tasks: s.tasks }) } }
)
```

### Selectors

```typescript
import {
  createSelector,
  createParameterizedSelector,
  selectLocale,
  selectTheme,
  selectDisplaySettings
} from '@missionfabric-js/enzyme/state'

// Pre-built selectors
const locale = useStore(selectLocale)
const settings = useStore(selectDisplaySettings)

// Custom memoized selectors
const selectFullName = createSelector(
  [selectFirstName, selectLastName],
  (first, last) => `${first} ${last}`
)

// Parameterized selectors
const selectItemById = createParameterizedSelector(
  (id) => (state) => state.items.find(i => i.id === id)
)
```

### Multi-Tab Sync

```typescript
import { useBroadcastSync } from '@missionfabric-js/enzyme/state'

const sync = useBroadcastSync(useStore, {
  channelName: 'app-sync',
  syncKeys: ['theme', 'locale'],
  conflictStrategy: 'last-write-wins'
})
```

---

## API & Data Fetching

### API Client

```typescript
import {
  apiClient,
  createApiClient,
  useApiRequest,
  useApiMutation,
  useApiCache
} from '@missionfabric-js/enzyme/api'

// Direct usage
const response = await apiClient.get('/users')
await apiClient.post('/users', { name: 'John' })

// React Query hooks
const { data, isLoading, refetch } = useApiRequest({
  url: '/users/:id',
  queryKey: ['user', id],
  pathParams: { id }
})

const { mutate, isPending } = useApiMutation({
  method: 'POST',
  url: '/users',
  invalidateQueries: [['users']]
})
```

### Request Builder

```typescript
import { RequestBuilder, get, post } from '@missionfabric-js/enzyme/api'

const request = new RequestBuilder()
  .get('/users/:id')
  .pathParam('id', '123')
  .query({ include: 'posts' })
  .timeout(5000)
  .build()

// Or use factory functions
const request = post('/users')
  .json({ name: 'John' })
  .build()
```

### Data Validation

```typescript
import { v, is, rules } from '@missionfabric-js/enzyme/data'

const userSchema = v.object({
  id: v.string().uuid(),
  email: v.string().email(),
  age: v.number().min(18)
})

if (is(userSchema, data)) {
  // data is typed as User
}
```

### Data Synchronization

```typescript
import {
  createSyncEngine,
  createConflictResolver,
  useOptimisticSync
} from '@missionfabric-js/enzyme/data'

const engine = createSyncEngine({
  sources: [apiSource, localStorageSource],
  conflictResolver: serverWinsResolver
})

const { data, update, sync } = useOptimisticSync({
  engine,
  entityType: 'tasks'
})
```

### React Query Utilities

```typescript
import {
  queryClient,
  queryKeys,
  useDashboardStats,
  useUsers,
  usePrefetch
} from '@missionfabric-js/enzyme/queries'

// Pre-built query hooks
const { data: stats } = useDashboardStats()
const { data: users } = useUsers({ page: 1 })

// Prefetching
const { prefetch } = usePrefetch()
prefetch(['user', id], () => fetchUser(id))
```

---

## Authentication & Security

### Authentication Provider

```typescript
import {
  AuthProvider,
  useAuth,
  useAuthContext,
  useHasRole,
  useHasPermission,
  authService
} from '@missionfabric-js/enzyme/auth'

function App() {
  return (
    <AuthProvider>
      <YourApp />
    </AuthProvider>
  )
}

// In components
const { user, isAuthenticated, login, logout } = useAuth()
const isAdmin = useHasRole('admin')
const canEdit = useHasPermission('users:write')
```

### Route Guards

```typescript
import { RequireAuth, RequireRole, RequirePermission } from '@missionfabric-js/enzyme/auth'

<RequireAuth redirectTo="/login">
  <Dashboard />
</RequireAuth>

<RequireRole roles={['admin', 'manager']}>
  <AdminPanel />
</RequireRole>

<RequirePermission permission="billing:manage" fallback={<UpgradePrompt />}>
  <BillingSettings />
</RequirePermission>
```

### Security Provider

```typescript
import { SecurityProvider, useSecurityContext } from '@missionfabric-js/enzyme/security'

<SecurityProvider
  config={{ reportToServer: true }}
  onViolation={(v) => logViolation(v)}
>
  <App />
</SecurityProvider>
```

### CSRF Protection

```typescript
import { useCSRFToken, useSecureFetch } from '@missionfabric-js/enzyme/security'

const { token, headers, formInputProps } = useCSRFToken()

// In forms
<form>
  <input {...formInputProps} />
</form>

// In fetch calls
const secureFetch = useSecureFetch()
await secureFetch('/api/data', { method: 'POST', body })
```

### XSS Prevention

```typescript
import {
  useSanitizedContent,
  useSafeInnerHTML,
  useValidatedInput
} from '@missionfabric-js/enzyme/security'

const { sanitizedHTML, wasModified, isSafe } = useSanitizedContent(userHtml)
const { props } = useSafeInnerHTML(content)
const { isValid, threats } = useValidatedInput(input)

<div {...props} />
```

### Secure Storage

```typescript
import { useSecureStorage } from '@missionfabric-js/enzyme/security'

const { value, setValue, removeValue } = useSecureStorage('user-prefs')
await setValue({ theme: 'dark' })
```

---

## Routing & Navigation

### Navigation Hooks

```typescript
import {
  useRouteNavigate,
  useRouteInfo,
  useQueryParams,
  useTabParam
} from '@missionfabric-js/enzyme/routing'

const { navigateTo, navigateWithParams, goBack } = useRouteNavigate()
navigateWithParams('/users/:id', { id: '123' })

const { pathname, isActiveRoute } = useRouteInfo()
const [query, setQuery] = useQueryParams()
const [tab, setTab] = useTabParam('activeTab', 'overview')
```

### Link Components

```typescript
import { AppLink, AppNavLink } from '@missionfabric-js/enzyme/routing'

<AppLink to="/users/:id" params={{ id: '123' }} prefetch>
  View User
</AppLink>

<AppNavLink to="/dashboard" activeClassName="text-blue-500">
  Dashboard
</AppNavLink>
```

### Router Setup

```typescript
import { createRouter } from '@missionfabric-js/enzyme/routing'

const router = createRouter(routes, {
  prefetchOnHover: true,
  prefetchDelay: 100
})
```

### Layout Hooks

```typescript
import {
  useViewport,
  useViewportPosition,
  useScrollContext,
  useLayoutAncestry,
  usePortalContext
} from '@missionfabric-js/enzyme/layouts'

const { width, height, orientation } = useViewport()
const { isVisible, scrollIntoView } = useViewportPosition()
const { scrollTo, scrollDirection } = useScrollContext()
const { isInLayout, constraints } = useLayoutAncestry()
```

---

## Feature Flags & Configuration

### Feature Flags

```typescript
import {
  FeatureFlagProvider,
  useFeatureFlag,
  useFeatureFlags,
  FlagGate
} from '@missionfabric-js/enzyme/flags'

// Provider setup
<FeatureFlagProvider initialFlags={{ 'dark-mode': true }}>
  <App />
</FeatureFlagProvider>

// In components
const isDarkMode = useFeatureFlag('dark-mode')
const { flags, isEnabled, setFlag } = useFeatureFlags()

// Conditional rendering
<FlagGate flag="new-dashboard" fallback={<OldDashboard />}>
  <NewDashboard />
</FlagGate>
```

### Flag Keys (Type-Safe)

```typescript
import { flagKeys, flagCategories } from '@missionfabric-js/enzyme/flags'

// Type-safe flag access
const isDark = useFeatureFlag(flagKeys.DARK_MODE)

// Available categories: UI, AUTH, DATA, REPORTS, SEARCH, ADMIN, UX, BETA
```

### Configuration

```typescript
import {
  ConfigProvider,
  useConfig,
  useConfigValue,
  useEnvironment
} from '@missionfabric-js/enzyme/config'

<ConfigProvider config={appConfig} schema={schema}>
  <App />
</ConfigProvider>

const config = useConfig()
const timeout = useConfigValue('api.timeout', 10000)
const env = useEnvironment()  // 'development' | 'production' | etc.
```

### Dynamic Configuration

```typescript
import { useDynamicConfig, useConfigValidation } from '@missionfabric-js/enzyme/config'

const { config, isLoading, error, refresh } = useDynamicConfig()
const { isValid, errors, warnings } = useConfigValidation()
```

---

## UI, Theme & Performance

### Theme System

```typescript
import { ThemeProvider, useThemeContext, tokens } from '@missionfabric-js/enzyme/theme'

<ThemeProvider defaultTheme="system">
  <App />
</ThemeProvider>

const { theme, resolvedTheme, setTheme } = useThemeContext()

// Design tokens
console.log(tokens.spacing.md)  // '1rem'
console.log(tokens.colors.primary)
```

### Performance Monitoring

```typescript
import {
  PerformanceProvider,
  usePerformanceBudget,
  useRenderMetrics,
  useLongTaskDetector,
  useMemoryPressure
} from '@missionfabric-js/enzyme/performance'

const { isWithinBudget, degradationState } = usePerformanceBudget()
const { renderCount, lastRenderTime, averageRenderTime } = useRenderMetrics('MyComponent')
const { longTasks, isBlocked } = useLongTaskDetector({ threshold: 50 })
const { pressure, snapshot, usagePercent } = useMemoryPressure()
```

### Error Boundaries

```typescript
import {
  ErrorBoundary,
  GlobalErrorBoundary,
  withErrorBoundary,
  useErrorBoundary
} from '@missionfabric-js/enzyme/monitoring'

<GlobalErrorBoundary fallback={<ErrorPage />}>
  <App />
</GlobalErrorBoundary>

// HOC usage
const SafeComponent = withErrorBoundary(MyComponent, {
  fallback: <ErrorMessage />
})

// Hierarchical boundaries
import { CriticalErrorBoundary, FeatureErrorBoundary } from '@missionfabric-js/enzyme/monitoring'
```

### Loading & Skeletons

```typescript
import {
  LoadingProvider,
  useLoading,
  SkeletonFactory,
  createCardSkeleton
} from '@missionfabric-js/enzyme/ux'

const { isLoading, start, stop } = useLoading()
const CardSkeleton = createCardSkeleton({ animated: true })
```

---

## Realtime & Streaming

### WebSocket / SSE

```typescript
import {
  RealtimeProvider,
  useRealtimeStream,
  useRealtimeConnection,
  createWebSocketClient
} from '@missionfabric-js/enzyme/realtime'

<RealtimeProvider config={{ wsUrl: 'wss://...' }}>
  <App />
</RealtimeProvider>

const { messages, isConnected, send } = useRealtimeStream('notifications')
const { status, reconnect } = useRealtimeConnection()
```

### Streaming HTML

```typescript
import {
  StreamProvider,
  StreamBoundary,
  useStreamStatus
} from '@missionfabric-js/enzyme/streaming'

<StreamProvider>
  <StreamBoundary id="hero" priority="critical">
    <HeroContent />
  </StreamBoundary>
  <StreamBoundary id="sidebar" priority="low">
    <Sidebar />
  </StreamBoundary>
</StreamProvider>
```

### Hydration

```typescript
import {
  HydrationProvider,
  HydrationBoundary,
  useHydration,
  useIsHydrated
} from '@missionfabric-js/enzyme/hydration'

<HydrationProvider>
  <HydrationBoundary priority="critical" aboveTheFold>
    <Header />
  </HydrationBoundary>
</HydrationProvider>

const { status, trigger } = useHydration()
const isHydrated = useIsHydrated()
```

---

## Complete Module Exports

### @missionfabric-js/enzyme/api

| Export | Type | Description |
|--------|------|-------------|
| `apiClient` | Instance | Singleton API client |
| `createApiClient` | Function | Create new API client |
| `useApiRequest` | Hook | GET requests with React Query |
| `useApiMutation` | Hook | Mutations with React Query |
| `useApiCache` | Hook | Cache management |
| `useApiHealth` | Hook | Endpoint health monitoring |
| `RequestBuilder` | Class | Fluent request builder |
| `get`, `post`, `put`, `patch`, `del` | Functions | Request factories |
| `parseResponse` | Function | Response parsing |
| `normalizeError` | Function | Error normalization |
| `mockServer` | Instance | Mock server for testing |

### @missionfabric-js/enzyme/auth

| Export | Type | Description |
|--------|------|-------------|
| `AuthProvider` | Component | Auth context provider |
| `useAuth` | Hook | Full auth access |
| `useAuthContext` | Hook | Raw context access |
| `useHasRole` | Hook | Role check |
| `useHasPermission` | Hook | Permission check |
| `authService` | Service | Auth service singleton |
| `RequireAuth` | Component | Auth guard |
| `RequireRole` | Component | Role guard |
| `RequirePermission` | Component | Permission guard |
| `routeMetadata` | Object | Route auth config |
| `canAccessRoute` | Function | Access check |

### @missionfabric-js/enzyme/state

| Export | Type | Description |
|--------|------|-------------|
| `useStore` | Hook | Global store access |
| `getStoreState` | Function | Get state outside React |
| `subscribeToStore` | Function | Subscribe to changes |
| `resetStore` | Function | Reset to initial state |
| `hasStoreHydrated` | Function | Check hydration |
| `waitForHydration` | Function | Await hydration |
| `createFeatureStore` | Function | Create feature store |
| `createSlice` | Function | Create store slice |
| `createSelector` | Function | Create memoized selector |
| `useBroadcastSync` | Hook | Multi-tab sync |

### @missionfabric-js/enzyme/hooks

| Export | Type | Description |
|--------|------|-------------|
| `useIsMounted` | Hook | Mount status |
| `useSafeState` | Hook | Safe state updates |
| `useDebouncedValue` | Hook | Debounced value |
| `useDebouncedCallback` | Hook | Debounced function |
| `useThrottledValue` | Hook | Throttled value |
| `useOnlineStatus` | Hook | Online/offline status |
| `useNetworkQuality` | Hook | Network quality |
| `useAsync` | Hook | Async operations |
| `useAbortController` | Hook | Request cancellation |
| `useTheme` | Hook | Theme control |
| `usePageView` | Hook | Page view tracking |
| `useTrackEvent` | Hook | Event tracking |

### @missionfabric-js/enzyme/security

| Export | Type | Description |
|--------|------|-------------|
| `SecurityProvider` | Component | Security context |
| `useCSRFToken` | Hook | CSRF token access |
| `useSecureFetch` | Hook | CSRF-protected fetch |
| `useSanitizedContent` | Hook | XSS-safe content |
| `useSafeInnerHTML` | Hook | Safe innerHTML props |
| `useSecureStorage` | Hook | Encrypted storage |
| `useCSPNonce` | Hook | CSP nonce access |
| `sanitizeHTML` | Function | HTML sanitization |
| `encodeHTML` | Function | HTML encoding |

### @missionfabric-js/enzyme/routing

| Export | Type | Description |
|--------|------|-------------|
| `AppLink` | Component | Type-safe link |
| `AppNavLink` | Component | Nav link with active state |
| `useRouteNavigate` | Hook | Navigation functions |
| `useRouteInfo` | Hook | Current route info |
| `useQueryParams` | Hook | Query parameter state |
| `useTabParam` | Hook | Tab URL state |
| `createRouter` | Function | Router factory |
| `RouteRegistry` | Class | Route registry |

### @missionfabric-js/enzyme/performance

| Export | Type | Description |
|--------|------|-------------|
| `PerformanceProvider` | Component | Performance context |
| `usePerformanceBudget` | Hook | Budget awareness |
| `useRenderMetrics` | Hook | Render tracking |
| `useLongTaskDetector` | Hook | Long task detection |
| `useMemoryPressure` | Hook | Memory monitoring |
| `useNetworkQuality` | Hook | Network quality |
| `VitalsCollector` | Class | Core Web Vitals |
| `PerformanceMonitor` | Class | Performance monitoring |

### @missionfabric-js/enzyme/flags

| Export | Type | Description |
|--------|------|-------------|
| `FeatureFlagProvider` | Component | Flag provider |
| `useFeatureFlag` | Hook | Single flag check |
| `useFeatureFlags` | Hook | Multiple flags |
| `FlagGate` | Component | Conditional render |
| `FlagGateAll` | Component | All flags required |
| `FlagGateAny` | Component | Any flag required |
| `flagKeys` | Object | Type-safe flag keys |
| `withFeatureFlag` | HOC | Flag-gated component |

---

## Best Practices

### 1. Prefer Submodule Imports

```typescript
// Good - Better tree-shaking
import { useAuth } from '@missionfabric-js/enzyme/auth'

// Avoid - Larger bundle
import { useAuth } from '@missionfabric-js/enzyme'
```

### 2. Use Type-Safe Patterns

```typescript
// Use type-safe flag keys
import { flagKeys } from '@missionfabric-js/enzyme/flags'
useFeatureFlag(flagKeys.DARK_MODE)  // Not: useFeatureFlag('dark-mode')

// Use typed routes
navigateWithParams('/users/:id', { id: '123' })
```

### 3. Leverage Built-in Hooks

```typescript
// Use provided hooks instead of reimplementing
import { useDebouncedValue, useOnlineStatus } from '@missionfabric-js/enzyme/hooks'
```

### 4. Provider Hierarchy

```typescript
// Recommended provider order
<SecurityProvider>
  <AuthProvider>
    <ConfigProvider>
      <ThemeProvider>
        <PerformanceProvider>
          <App />
        </PerformanceProvider>
      </ThemeProvider>
    </ConfigProvider>
  </AuthProvider>
</SecurityProvider>
```

---

## Version Information

- **Package**: `@missionfabric-js/enzyme`
- **Version**: 1.1.0
- **Node.js**: >= 20.0.0
- **React**: ^18.3.1 || ^19.0.0
- **TypeScript**: ^5.9.3

---

## Additional Resources

- [API Documentation](./API_DOCUMENTATION.md)
- [Configuration Reference](./CONFIG_REFERENCE.md)
- [Security Guide](./security/README.md)
- [Performance Guide](./PERFORMANCE.md)
- [Testing Guide](./TESTING.md)
