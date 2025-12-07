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

## Advanced Exports Reference

> **Note**: This section documents 500+ additional exports available for advanced use cases. The main documentation above covers the most commonly used APIs.

### @missionfabric-js/enzyme/hooks (Additional Exports)

| Export | Type | Description |
|--------|------|-------------|
| `useLatestRefs` | Hook | Maintains refs with latest values for multiple values in an object |
| `useMounted` | Hook | **Deprecated.** Use `useMountedState` instead |
| `useUnmountEffect` | Hook | Runs cleanup effect on unmount |
| `useRefCleanup` | Hook | Ref-based cleanup that runs synchronously |
| `getNetworkInfo` | Function | Get current network information from browser |
| `meetsMinimumQuality` | Function | Check if connection meets minimum quality requirement |
| `shouldAllowPrefetch` | Function | Check if prefetching should be allowed based on network |
| `monitorNetworkQuality` | Function | Monitor network quality changes with cleanup |
| `isSlowConnection` | Function | Check if connection is considered slow |
| `getConnectionQualityLabel` | Function | Get human-readable quality label |
| `useNetworkSuggestions` | Hook | Get suggested actions based on network quality |
| `useSlowConnection` | Hook | Check if connection is slow |
| `useOnReconnect` | Hook | Execute callback when coming back online |
| `useWaitForOnline` | Hook | Wait for online status with timeout |
| `useOfflineIndicator` | Hook | Show offline indicator UI state |
| `useConnectionTracker` | Hook | Track connection changes over time |
| `useSubscription` | Hook | Managing subscriptions with automatic cleanup |
| `useWebSocketCleanup` | Hook | Managing WebSocket connections with cleanup |
| `usePrefetchRoute` | Hook | Prefetch route data and components |
| `usePrefetchOnHover` | Hook | Prefetch on link hover with event handlers |
| `useGlobalStore` | Hook | Access specific state slice from global store |
| `useGlobalStoreMultiple` | Hook | Access multiple state slices at once |
| `useGlobalStoreComputed` | Hook | Computed values from store with memoization |
| `useGlobalStoreActions` | Hook | Access store actions |
| `useStoreHydrated` | Hook | Check if store is hydrated (SSR) |
| `createSliceHook` | Function | Create a bound selector hook for a slice |
| `createActionHook` | Function | Create a bound action hook |
| `useGlobalStoreSubscription` | Hook | Subscribe to store changes with callback |
| `globalSelectors` | Object | Common pre-built selectors |
| `useIsSidebarOpen` | Hook | Get sidebar open state |
| `useCurrentUser` | Hook | Get current user from store |
| `useIsAuthenticated` | Hook | Check if user is authenticated |
| `useUnreadNotificationCount` | Hook | Get unread notification count |
| `useTrackRenderPerformance` | Hook | Track component render performance |
| `useTrackInteractionTiming` | Hook | Track interaction timing |
| `useTrackForm` | Hook | Track form analytics |
| `useTrackClick` | Hook | Click tracking with coordinates |
| `useAnalyticsConsent` | Hook | Manage analytics consent categories |
| `useAnalyticsIdentify` | Hook | Identify user for analytics |
| `useAnalyticsReset` | Hook | Reset analytics state |
| `useTrackSearch` | Hook | Track search queries and results |
| `useTrackScrollDepth` | Hook | Track scroll depth milestones |
| `useTrackTimeOnPage` | Hook | Track time spent on page |
| `useTrackedSection` | Hook | Create a tracked section with visibility |
| `SmartPrefetchManager` | Class | Manages intelligent prefetching |
| `createPrefetchConfig` | Function | Create type-safe prefetch configurations |
| `useNetworkAwareOperation` | Hook | Network-aware operations that wait for connectivity |
| `useOptimisticUpdate` | Hook | Optimistic updates with automatic rollback |
| `useSafeCallback` | Hook | Wraps callback with error handling |
| `useErrorToast` | Hook | Managing error toasts with auto-dismiss |
| `useRecoveryState` | Hook | Managing component-level error recovery |
| `useErrorContext` | Hook | Managing contextual error information |
| `ScreenReaderAnnouncementRegion` | Component | Initializes live regions for announcements |
| `formatKeyCombo` | Function | Format keyboard shortcut for display |
| `KeyboardShortcutsHelp` | Component | Display keyboard shortcuts help panel |

### @missionfabric-js/enzyme/state (Additional Exports)

| Export | Type | Description |
|--------|------|-------------|
| `clearPersistedStore` | Function | Clears all persisted store data from localStorage |
| `unregisterFeatureStore` | Function | Unregisters a feature store from registry |
| `getFeatureStore` | Function | Retrieves a feature store by name |
| `getFeatureStoreNames` | Function | Returns array of registered feature store names |
| `resetAllFeatureStores` | Function | Resets all registered feature stores |
| `useStoreState` | Hook | Selects state with custom equality function |
| `useShallowState` | Hook | Selects state with shallow equality comparison |
| `useStoreAction` | Hook | Selects an action from the store |
| `useIsModalOpen` | Hook | Checks if a specific modal is open |
| `useDisplaySettings` | Hook | Returns memoized display settings bundle |
| `useAccessibilitySettings` | Hook | Returns memoized accessibility settings |
| `useNotificationSettings` | Hook | Returns memoized notification settings |
| `useStoreSubscription` | Hook | Subscribes to store changes with callback |
| `useDebouncedState` | Hook | Returns debounced version of selected state |
| `usePreviousState` | Hook | Returns previous value of a selector |
| `useStateChange` | Hook | Tracks if a value has changed since mount |
| `useHydration` | Hook | Waits for store hydration before rendering |
| `createObjectSelector` | Function | Creates selector with stable object references |
| `createArraySelector` | Function | Creates selector with stable array references |
| `createBoundedParameterizedSelector` | Function | Creates parameterized selector with LRU cache |
| `combineSelectors` | Function | Combines multiple selectors into one |
| `pickSelector` | Function | Creates selector that picks specific keys |
| `omitSelector` | Function | Creates selector that omits specific keys |
| `selectorUtils` | Object | Collection of selector utility functions |
| `createFeatureStoreHooks` | Function | Creates typed hooks for a feature store |
| `subscribeToFeatureStore` | Function | Subscribes to feature store outside React |
| `featureStoreRegistry` | Object | Global singleton registry for feature stores |
| `createAppStore` | Function | Creates production-grade Zustand store |
| `createSimpleStore` | Function | Creates store with Immer and DevTools |
| `createMinimalStore` | Function | Creates minimal store with Immer only |
| `createStoreReset` | Function | Creates reset function for a store |
| `createSlice` | Function | Creates type-safe slice with action naming |
| `createAction` | Function | Creates simple action creator |
| `combineSlices` | Function | Combines multiple slices into single state |
| `createBroadcastSync` | Function | Creates multi-tab state synchronization |

### @missionfabric-js/enzyme/api (Additional Exports)

| Export | Type | Description |
|--------|------|-------------|
| `ApiClient` | Class | Enterprise-grade HTTP client with retry, interceptors |
| `createApiError` | Function | Creates normalized API error |
| `isRetryable` | Function | Checks if HTTP status is retryable |
| `getErrorCategory` | Function | Maps status codes to error categories |
| `getErrorSeverity` | Function | Maps error categories to severity levels |
| `createRequest` | Function | Factory for RequestBuilder instances |
| `serializeQueryParams` | Function | Serializes query parameters to URL string |
| `parseQueryParams` | Function | Parses URL query string into object |
| `buildUrl` | Function | Builds complete URL with params |
| `joinUrl` | Function | Safely joins URL segments |
| `createResponseParser` | Function | Creates reusable response parser |
| `isApiError` | Function | Type guard for ApiError |
| `extractCacheHints` | Function | Extracts cache directives from headers |
| `streamResponse` | Function | Handles streaming response bodies |
| `extractPagination` | Function | Extracts pagination metadata |
| `createPaginatedResponse` | Function | Wraps data with pagination metadata |
| `mergePaginatedResponses` | Function | Merges multiple paginated pages |
| `createTransformPipeline` | Function | Creates chainable transformation pipeline |
| `transformers` | Object | Common response transformers |
| `MockServer` | Class | Mock API server for testing |
| `createMockServer` | Function | Factory for MockServer |
| `mockHandlers` | Object | Collection of mock response handlers |
| `mockData` | Object | Mock data generators |
| `createCrudHandlers` | Function | Generates complete CRUD handlers |
| `useGet` | Hook | Simplified GET requests |
| `useGetById` | Hook | Fetching single resource by ID |
| `useGetList` | Hook | Fetching paginated lists |
| `usePost` | Hook | POST mutations |
| `usePut` | Hook | PUT mutations |
| `usePatch` | Hook | PATCH mutations |
| `useDelete` | Hook | DELETE mutations |
| `useApiClient` | Hook | Access API client instance |
| `useApiClientInstance` | Hook | Raw ApiClient instance |
| `useApiClientStatus` | Hook | Client configuration status |
| `useApiInterceptors` | Hook | Register request/response interceptors |
| `useParallelRequests` | Hook | Multiple GET requests in parallel |
| `useDependentRequest` | Hook | Sequential dependent requests |
| `usePolling` | Hook | Polling endpoint at intervals |
| `usePrefetch` | Hook | Prefetch data into cache |
| `useLazyQuery` | Hook | Manual/lazy queries |
| `useBatchMutation` | Hook | Batch multiple mutations |
| `useCacheMonitor` | Hook | Monitor cache statistics |
| `useCacheEntry` | Hook | Watch specific cache entry |
| `useBulkCacheOperations` | Hook | Bulk cache operations |
| `useApiConnectivity` | Hook | Simple connectivity check |
| `useNetworkAware` | Hook | Network-aware operations |
| `useMultiApiHealth` | Hook | Monitor multiple API endpoints |
| `ApiClientProvider` | Component | React provider for API client |

### @missionfabric-js/enzyme/auth (Additional Exports)

| Export | Type | Description |
|--------|------|-------------|
| `AuthGuardLoading` | Component | Shared loading component for auth guards |
| `withRequireRole` | HOC | Wraps component with role-based access |
| `withRequirePermission` | HOC | Wraps component with permission-based access |
| `getRouteAuthConfig` | Function | Gets auth configuration for route path |
| `ADProvider` | Component | Active Directory authentication provider |
| `useActiveDirectory` | Hook | AD authentication state and operations |
| `ADClient` | Class | Client for Azure AD and Graph API |
| `createADClient` | Function | Factory for ADClient |
| `ADTokenHandler` | Class | Manages AD token acquisition and refresh |
| `SSOManager` | Class | Manages SSO sessions across tabs |
| `CrossDomainSSO` | Class | SSO across different subdomains |
| `ADGroupMapper` | Class | Maps AD groups to app roles |
| `ADAttributeMapper` | Class | Maps AD user attributes |
| `RBACProvider` | Component | Role-Based Access Control provider |
| `useRBAC` | Hook | Comprehensive RBAC hook |
| `usePermissions` | Hook | Permission checking |
| `useRoles` | Hook | Role checking |
| `useResourceAccess` | Hook | Resource-specific access control |
| `usePermissionGate` | Hook | Conditional rendering by permission |
| `useRoleGate` | Hook | Conditional rendering by role |
| `RBACEngine` | Class | Core RBAC evaluation engine |
| `PermissionMatrixBuilder` | Class | Builder for permission matrices |
| `RoleHierarchyManager` | Class | Manages hierarchical role structures |
| `ResourcePermissionManager` | Class | Resource-level permissions and ACLs |
| `PolicyEvaluator` | Class | ABAC-style policy evaluation |

### @missionfabric-js/enzyme/security (Additional Exports)

| Export | Type | Description |
|--------|------|-------------|
| `useSecureStorageWithTTL` | Hook | Secure storage with TTL enforcement |
| `useNonceScript` | Hook | CSP nonce for inline scripts |
| `useNonceStyle` | Hook | CSP nonce for inline styles |
| `useSecureFormSubmit` | Hook | Secure form submission with CSRF |
| `useSafeText` | Hook | Safe text rendering (strips HTML) |
| `useContextEncoder` | Hook | Context-aware encoding function |
| `useSafeHTMLWithReport` | Hook | Safe HTML with threat reporting |
| `useSecurityState` | Hook | Security state only (no actions) |
| `useSecurityActions` | Hook | Security actions only |
| `useSecurityConfig` | Hook | Current security configuration |
| `useViolationReporter` | Hook | Report security violations |
| `useViolations` | Hook | Monitor security violations |
| `useSecurityStatus` | Hook | Security initialization status |
| `useSecurityReady` | Hook | Returns null until security ready |
| `useSecureHandler` | Hook | Secure event handlers |
| `encodeHTMLAttribute` | Function | Encode for HTML attribute |
| `encodeJavaScript` | Function | Encode for JavaScript context |
| `encodeCSS` | Function | Encode for CSS context |
| `encodeURL` | Function | Encode for URL |
| `encodeForContext` | Function | Context-aware encoding |
| `stripTags` | Function | Strip all HTML tags |
| `detectDangerousContent` | Function | Detect XSS patterns |
| `CSRFProtection` | Class | CSRF protection singleton |
| `CSPManager` | Class | CSP management singleton |
| `SecureStorage` | Class | Encrypted storage with AES-GCM |
| `createSecureLocalStorage` | Function | Factory for secure localStorage |
| `createSecureSessionStorage` | Function | Factory for secure sessionStorage |

### @missionfabric-js/enzyme/routing (Additional Exports)

| Export | Type | Description |
|--------|------|-------------|
| `useQueryParam` | Hook | Single query parameter management |
| `useRouteRegistry` | Hook | Access route registry singleton |
| `useTypedNavigate` | Hook | Type-safe navigation with prefetch |
| `usePrefetchHandlers` | Hook | Prefetch on hover/focus handlers |
| `useRouteMetadata` | Hook | Get route metadata by path |
| `useNavigationAnalytics` | Hook | Navigation analytics and history |
| `createSimpleRouter` | Function | Simple router from RouteObjects |
| `DefaultLoading` | Component | Default loading spinner |
| `DefaultError` | Component | Default error fallback |
| `DefaultNotFound` | Component | Default 404 component |
| `routeRegistry` | Singleton | Global route registry instance |
| `AutoScanner` | Class | Scans route files with glob |
| `RouteTransformer` | Class | Transforms routes to framework format |
| `DiscoveryEngine` | Class | Orchestrates route discovery |
| `WatchMode` | Class | Watches route file changes |
| `ParallelRoutes` | Class | Manages parallel route slots |
| `InterceptingRouteManager` | Class | Manages intercepting routes |
| `RouteGroupManager` | Class | Manages route groups |
| `CatchAllRouteManager` | Class | Manages catch-all routes |
| `RoleGuard` | Class | Role-based route guards |
| `PermissionGuard` | Class | Permission-based guards |
| `FeatureGuard` | Class | Feature flag guards |
| `CompositeGuard` | Class | Combines multiple guards |
| `GuardResolver` | Class | Resolves guards during navigation |
| `detectConflicts` | Function | Detect all route conflicts |
| `validateRoute` | Function | Validate route against rules |
| `generateValidationReport` | Function | Human-readable validation report |

### @missionfabric-js/enzyme/flags (Additional Exports)

| Export | Type | Description |
|--------|------|-------------|
| `useFeatureFlagsStatus` | Hook | Multiple flags status at once |
| `withoutFeatureFlag` | HOC | Inverse of withFeatureFlag |
| `isDebugModeEnabled` | Function | Check debug mode (non-React) |
| `isFlagEnabled` | Function | Check any flag (non-React) |
| `FlagEngine` | Class | Enterprise flag evaluation engine |
| `TargetingRulesEngine` | Class | Evaluates targeting rules |
| `PercentageRolloutEngine` | Class | Percentage-based rollouts |
| `SegmentMatcher` | Class | Matches users against segments |
| `VariantManager` | Class | Manages flag variants for A/B |
| `DependencyResolver` | Class | Resolves flag dependencies |
| `LifecycleManager` | Class | Manages flag lifecycle states |
| `LocalProvider` | Class | Static flag provider |
| `RemoteProvider` | Class | Fetches flags from API |
| `CachedProvider` | Class | Provider with caching layer |
| `PollingProvider` | Class | Periodic polling for updates |
| `WebSocketProvider` | Class | Real-time flag updates |
| `createProviderChain` | Function | Robust multi-source provider |
| `FlagAnalytics` | Class | Collects flag evaluation metrics |
| `ExposureTracker` | Class | Tracks user exposure to variants |
| `FlagImpactAnalyzer` | Class | Analyzes flag impact on metrics |
| `FlagConfigurable` | Component | Universal flag-driven rendering |
| `useFeatureFlaggedModule` | Hook | Dynamic module loading by flag |
| `apiFlags` | Object | API-related flag helpers |
| `routingFlags` | Object | Routing flag helpers |
| `uiFlags` | Object | UI flag helpers |
| `performanceFlags` | Object | Performance flag helpers |

### @missionfabric-js/enzyme/config (Additional Exports)

| Export | Type | Description |
|--------|------|-------------|
| `useHasConfig` | Hook | Check if config path exists |
| `useConfigLoading` | Hook | Get config loading state |
| `useConfigError` | Hook | Get config error |
| `useSetConfig` | Hook | Setter function for config path |
| `useResetConfig` | Hook | Reset config to defaults |
| `useReloadConfig` | Hook | Reload config from source |
| `useConfigState` | Hook | Value and setter like useState |
| `useConfigChange` | Hook | Subscribe to config changes |
| `useWatchConfig` | Hook | Auto re-render on config change |
| `useFeatureConfig` | Hook | Check feature via config |
| `useIsDevelopment` | Hook | Check if development env |
| `useIsProduction` | Hook | Check if production env |
| `useConfigSelector` | Hook | Select multiple config values |
| `useConfigDerived` | Hook | Derived value from config |
| `createTypedConfigHook` | Function | Type-safe config hook factory |
| `ConfigValidator` | Class | Schema-based config validation |
| `ConfigMerger` | Class | Merge config objects |
| `ConfigLoader` | Class | Load config from sources |
| `RuntimeConfig` | Class | Runtime config with hot reload |

### @missionfabric-js/enzyme/performance (Additional Exports)

| Export | Type | Description |
|--------|------|-------------|
| `useBudgetStatus` | Hook | Budget status for specific metric |
| `useDegradedMode` | Hook | Check if in degraded mode |
| `useBudgetConditional` | Hook | Conditional value based on budget |
| `useRenderPhaseMetrics` | Hook | Measure render phase duration |
| `useRenderProfiler` | Hook | React Profiler integration |
| `useWastedRenderDetector` | Hook | Detect unnecessary re-renders |
| `useDeferredRender` | Hook | Defer value during long tasks |
| `useBlockingTimeTracker` | Hook | Track total blocking time |
| `useYieldToMain` | Hook | Yield control to main thread |
| `useMemoryCleanup` | Hook | Cleanup when memory pressure |
| `useMemoryAwareCache` | Hook | LRU cache with memory awareness |
| `useComponentMemoryImpact` | Hook | Monitor component memory |
| `useAdaptiveImageQuality` | Hook | Image quality by network |
| `useNetworkConditional` | Hook | Conditional value by network |
| `useNetworkAwareLazyLoad` | Hook | Network-aware lazy loading |
| `usePreconnect` | Hook | Manage preconnect links |
| `usePerformanceAwareness` | Hook | Unified performance awareness |
| `useAdaptiveRender` | Hook | Select render by performance |
| `useOptimizedRender` | Hook | Priority-scheduled rendering |
| `useLazyFeature` | Hook | Progressive feature enhancement |
| `useProgressiveLoad` | Hook | Network-aware progressive loading |
| `VitalsCollector` | Class | Core Web Vitals collection |
| `BudgetManager` | Class | Performance budget management |
| `RealUserMonitoring` | Class | Comprehensive RUM system |

### @missionfabric-js/enzyme/realtime (Additional Exports)

| Export | Type | Description |
|--------|------|-------------|
| `WebSocketClient` | Class | WebSocket connection manager |
| `SSEClient` | Class | Server-Sent Events client |
| `createSSEClient` | Function | Factory for SSEClient |
| `useRealtimeContext` | Hook | Access realtime context |
| `useMultiRealtimeStream` | Hook | Subscribe to multiple channels |
| `useBufferedRealtimeStream` | Hook | Buffered/debounced updates |
| `useRealtimePresence` | Hook | Track presence (who's online) |
| `StreamQueryCacheUpdater` | Class | Maps events to React Query cache |
| `createStreamCacheUpdater` | Function | Factory for cache updater |
| `createCacheStrategy` | Function | Create cache update strategy |
| `RealtimeCircuitBreaker` | Class | Circuit breaker for connections |
| `createWebSocketCircuitBreaker` | Function | WebSocket circuit breaker |
| `createSSECircuitBreaker` | Function | SSE circuit breaker |
| `ConnectionTimeoutError` | Class | Connection timeout error |

### @missionfabric-js/enzyme/streaming (Additional Exports)

| Export | Type | Description |
|--------|------|-------------|
| `useStream` | Hook | **PRIMARY HOOK** - Core stream control |
| `useMultipleStreams` | Hook | Monitor multiple boundaries |
| `useAwaitStream` | Hook | Promise-based stream coordination |
| `useExtendedStreamStatus` | Hook | Extended status with formatting |
| `useStreamPriority` | Hook | Dynamic priority control |
| `useCriticalPriority` | Hook | Pre-configured critical priority |
| `useDeferredPriority` | Hook | Pre-configured deferred priority |
| `useDeferredStream` | Hook | Defer until conditions met |
| `useDeferUntilVisible` | Hook | Visibility-based deferral |
| `useDeferUntilIdle` | Hook | Idle-based deferral |
| `useStreamContext` | Hook | Access streaming context |
| `useStreamMetrics` | Hook | Access streaming metrics |
| `useStreamEvents` | Hook | Subscribe to stream events |
| `CriticalStreamBoundary` | Component | Pre-configured for critical content |
| `DeferredStreamBoundary` | Component | Pre-configured for deferred content |
| `StreamErrorBoundary` | Component | Error boundary for streams |
| `StreamingEngine` | Class | Core streaming engine |
| `createStreamingEngine` | Function | Factory for StreamingEngine |
| `createStreamingMiddleware` | Function | Server middleware for streaming |
| `createHydrationScript` | Function | Generate hydration script |

### @missionfabric-js/enzyme/hydration (Additional Exports)

| Export | Type | Description |
|--------|------|-------------|
| `useHydrationStatus` | Hook | Real-time hydration status |
| `useWaitForHydration` | Hook | Promise-based hydration wait |
| `useHasHydrationContext` | Hook | Check if within provider |
| `useHydrationPriority` | Hook | Dynamic priority control |
| `useAdaptiveHydrationPriority` | Hook | Auto-adjust by engagement |
| `useDeferredHydration` | Hook | Explicit hydration control |
| `useIdleHydration` | Hook | Hydrate during browser idle |
| `useHydrationMetrics` | Hook | Access aggregated metrics |
| `useHydrationProgress` | Hook | Progress as percentage |
| `useIsHydrationComplete` | Hook | All boundaries hydrated |
| `useTimeToFullHydration` | Hook | Time to full hydration |
| `HydrationScheduler` | Class | Auto-prioritized hydration |
| `HydrationPriorityQueue` | Class | Binary min-heap queue |
| `InteractionReplayManager` | Class | Capture/replay interactions |
| `initHydrationSystem` | Function | Initialize without provider |
| `LazyHydration` | Component | React.lazy + HydrationBoundary |

### @missionfabric-js/enzyme/layouts (Additional Exports)

| Export | Type | Description |
|--------|------|-------------|
| `useDOMContext` | Hook | Full DOM context access |
| `useDOMContextWithElement` | Hook | DOM context for specific element |
| `useContextSelector` | Hook | Optimized selector-based access |
| `useFlexAncestor` | Hook | Nearest flex container ancestor |
| `useGridAncestor` | Hook | Nearest grid container ancestor |
| `useScrollContainerAncestor` | Hook | Nearest scroll container |
| `useIsInFlex` | Hook | Boolean if in flex context |
| `useIsInGrid` | Hook | Boolean if in grid context |
| `useAvailableWidth` | Hook | Available width in pixels |
| `useAvailableHeight` | Hook | Available height in pixels |
| `useVisibility` | Hook | Element visibility state |
| `useIntersectionRatio` | Hook | Intersection ratio (0-1) |
| `useDistanceFromViewport` | Hook | Distance from viewport edges |
| `useViewportDimensions` | Hook | Viewport width and height |
| `useScrollDirection` | Hook | Current scroll direction |
| `useScrollProgress` | Hook | Scroll progress (0-1) |
| `useIsScrolling` | Hook | If currently scrolling |
| `useScrollEdges` | Hook | At edges detection |
| `useScrollToTop` | Hook | Scroll to top function |
| `useScrollIntoView` | Hook | Scroll element into view |
| `useIsInPortal` | Hook | If inside a portal |
| `usePortalNestingDepth` | Hook | Portal nesting depth |
| `useZIndexForLayer` | Hook | Z-index for layer name |
| `useZIndexRegistration` | Hook | Register with z-index manager |

### @missionfabric-js/enzyme/theme (Additional Exports)

| Export | Type | Description |
|--------|------|-------------|
| `colorTokens` | Constant | Semantic color tokens with CSS variables |
| `lightPalette` | Constant | Complete light theme color palette |
| `darkPalette` | Constant | Complete dark theme color palette |

### @missionfabric-js/enzyme/monitoring (Additional Exports)

| Export | Type | Description |
|--------|------|-------------|
| `categorizeError` | Function | Determines error category |
| `getSeverity` | Function | Maps category to severity |
| `normalizeError` | Function | Creates normalized AppError |
| `isRetryableError` | Function | Checks if error allows retry |
| `getUserFriendlyMessage` | Function | User-friendly error message |
| `ErrorReporter` | Object | Singleton error reporter |
| `initErrorReporter` | Function | Initialize error reporting |
| `setUserContext` | Function | Set user context for reports |
| `setErrorContext` | Function | Set additional error context |
| `reportError` | Function | Report error with context |
| `addBreadcrumb` | Function | Add breadcrumb for tracking |
| `QueryErrorBoundary` | Component | Boundary for data-fetch errors |
| `HierarchicalErrorBoundary` | Component | Multi-level error boundary |
| `ComponentErrorBoundary` | Component | Component-level boundary |
| `WidgetErrorBoundary` | Component | Widget-level boundary |
| `useErrorBoundaryOptional` | Hook | Optional boundary context |
| `useErrorTrigger` | Hook | Programmatically trigger error |
| `getStructuredErrorMessage` | Function | Structured error message |
| `getRecoveryActions` | Function | Recovery action buttons |
| `crashAnalytics` | Object | Global crash analytics |
| `ProviderErrorBoundary` | Component | Boundary for providers |
| `AuthProviderBoundary` | Component | Auth provider boundary |
| `ConfigProviderBoundary` | Component | Config provider boundary |
| `RealtimeProviderBoundary` | Component | Realtime provider boundary |
| `SecurityProviderBoundary` | Component | Security provider boundary |

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
