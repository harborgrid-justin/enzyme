# Components Quick Reference

Complete reference for all React components in @missionfabric-js/enzyme.

## Table of Contents

- [Providers](#providers)
- [Authentication](#authentication)
- [Error Boundaries](#error-boundaries)
- [Feature Flags](#feature-flags)
- [Layouts](#layouts)
- [Navigation](#navigation)
- [Real-time](#real-time)
- [Streaming](#streaming)
- [Hydration](#hydration)
- [Security](#security)
- [Module System](#module-system)
- [Loading & UX](#loading--ux)
- [Coordination](#coordination)
- [Shared Components](#shared-components)

---

## Providers

### `AuthProvider`
```typescript
interface AuthProviderProps {
  children: ReactNode;
  config?: AuthConfig;
}
```
**Module:** `/auth`
**Description:** Provides authentication context to application
**Key Props:** `children`, `config`
**Use Case:** Wrap app for authentication

**Example:**
```typescript
<AuthProvider>
  <App />
</AuthProvider>
```

### `ConfigProvider`
```typescript
interface ConfigProviderProps {
  config: AppConfig;
  schema?: ConfigSchema;
  children: ReactNode;
}
```
**Module:** `/config`
**Description:** Provides configuration to React tree
**Key Props:** `config`, `schema`, `children`
**Use Case:** Application configuration

### `FeatureFlagProvider`
```typescript
interface FeatureFlagProviderProps {
  flags?: Record<string, boolean>;
  children: ReactNode;
}
```
**Module:** `/flags`
**Description:** Provides feature flags to application
**Key Props:** `flags`, `children`
**Use Case:** Feature flag system

### `ThemeProvider`
```typescript
interface ThemeProviderProps {
  theme?: ThemeMode;
  children: ReactNode;
}
```
**Module:** `/theme`
**Description:** Provides theming system
**Key Props:** `theme`, `children`
**Use Case:** Theme management

### `PerformanceProvider`
```typescript
interface PerformanceProviderProps {
  budget?: PerformanceBudget;
  children: ReactNode;
}
```
**Module:** `/performance`
**Description:** Provides performance monitoring
**Key Props:** `budget`, `children`
**Use Case:** Performance tracking

### `RealtimeProvider`
```typescript
interface RealtimeProviderProps {
  url: string;
  options?: RealtimeOptions;
  children: ReactNode;
}
```
**Module:** `/realtime`
**Description:** Provides realtime connection
**Key Props:** `url`, `options`, `children`
**Use Case:** WebSocket/SSE connections

### `StreamProvider`
```typescript
interface StreamProviderProps {
  config?: StreamConfig;
  children: ReactNode;
}
```
**Module:** `/streaming`
**Description:** Provides streaming capabilities
**Key Props:** `config`, `children`
**Use Case:** SSR streaming

### `HydrationProvider`
```typescript
interface HydrationProviderProps {
  strategy?: HydrationStrategy;
  children: ReactNode;
}
```
**Module:** `/hydration`
**Description:** Provides progressive hydration
**Key Props:** `strategy`, `children`
**Use Case:** Progressive hydration

### `LoadingProvider`
```typescript
interface LoadingProviderProps {
  children: ReactNode;
}
```
**Module:** `/ux`
**Description:** Provides loading state management
**Key Props:** `children`
**Use Case:** Global loading states

### `RBACProvider`
```typescript
interface RBACProviderProps {
  config: RBACConfig;
  children: ReactNode;
}
```
**Module:** `/auth`
**Description:** Provides RBAC system
**Key Props:** `config`, `children`
**Use Case:** Role-based access control

### `ADProvider`
```typescript
interface ADProviderProps {
  config: ADConfig;
  children: ReactNode;
}
```
**Module:** `/auth`
**Description:** Provides Active Directory integration
**Key Props:** `config`, `children`
**Use Case:** Enterprise AD authentication

### `CoordinationProvider`
```typescript
interface CoordinationProviderProps {
  children: ReactNode;
}
```
**Module:** `/coordination`
**Description:** Provides cross-module coordination
**Key Props:** `children`
**Use Case:** Module coordination

### `ApiClientProvider`
```typescript
interface ApiClientProviderProps {
  client: ApiClient;
  children: ReactNode;
}
```
**Module:** `/api`
**Description:** Provides API client instance
**Key Props:** `client`, `children`
**Use Case:** API client context

### `ModuleProvider`
```typescript
interface ModuleProviderProps {
  moduleId: string;
  children: ReactNode;
}
```
**Module:** `/vdom`
**Description:** Provides virtual DOM module context
**Key Props:** `moduleId`, `children`
**Use Case:** Module system

### `DOMContextProvider`
```typescript
interface DOMContextProviderProps {
  children: ReactNode;
}
```
**Module:** `/layouts`
**Description:** Provides DOM context for layouts
**Key Props:** `children`
**Use Case:** Layout system

---

## Authentication

### `RequireAuth`
```typescript
interface RequireAuthProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}
```
**Module:** `/auth`
**Description:** Route guard requiring authentication
**Key Props:** `children`, `fallback`, `redirectTo`
**Use Case:** Protected routes

**Example:**
```typescript
<RequireAuth fallback={<LoginPage />}>
  <Dashboard />
</RequireAuth>
```

### `RequireRole`
```typescript
interface RequireRoleProps {
  role: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
}
```
**Module:** `/auth`
**Description:** Route guard requiring specific role
**Key Props:** `role`, `children`, `fallback`
**Use Case:** Role-based routing

### `RequirePermission`
```typescript
interface RequirePermissionProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}
```
**Module:** `/auth`
**Description:** Route guard requiring permission
**Key Props:** `permission`, `children`, `fallback`
**Use Case:** Permission-based routing

---

## Error Boundaries

### `ErrorBoundary`
```typescript
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}
```
**Module:** `/monitoring`
**Description:** React error boundary component
**Key Props:** `children`, `fallback`, `onError`
**Use Case:** Error handling

**Example:**
```typescript
<ErrorBoundary fallback={<ErrorPage />}>
  <App />
</ErrorBoundary>
```

### `GlobalErrorBoundary`
```typescript
interface GlobalErrorBoundaryProps {
  children: ReactNode;
}
```
**Module:** `/monitoring`
**Description:** Top-level application error boundary
**Key Props:** `children`
**Use Case:** Global error handling

### `HierarchicalErrorBoundary`
```typescript
interface HierarchicalErrorBoundaryProps {
  level: ErrorLevel;
  children: ReactNode;
  fallback?: ReactNode;
}
```
**Module:** `/monitoring`
**Description:** Hierarchical error boundary with levels
**Key Props:** `level`, `children`, `fallback`
**Use Case:** Layered error handling

### `CriticalErrorBoundary`
```typescript
interface CriticalErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}
```
**Module:** `/monitoring`
**Description:** Error boundary for critical sections
**Key Props:** `children`, `fallback`
**Use Case:** Critical error handling

### `FeatureErrorBoundary`
```typescript
interface FeatureErrorBoundaryProps {
  featureId: string;
  children: ReactNode;
  fallback?: ReactNode;
}
```
**Module:** `/monitoring`
**Description:** Error boundary for feature modules
**Key Props:** `featureId`, `children`, `fallback`
**Use Case:** Feature isolation

### `ComponentErrorBoundary`
```typescript
interface ComponentErrorBoundaryProps {
  componentName: string;
  children: ReactNode;
  fallback?: ReactNode;
}
```
**Module:** `/monitoring`
**Description:** Error boundary for individual components
**Key Props:** `componentName`, `children`, `fallback`
**Use Case:** Component-level errors

### `WidgetErrorBoundary`
```typescript
interface WidgetErrorBoundaryProps {
  widgetId: string;
  children: ReactNode;
  fallback?: ReactNode;
}
```
**Module:** `/monitoring`
**Description:** Error boundary for widget components
**Key Props:** `widgetId`, `children`, `fallback`
**Use Case:** Widget error isolation

---

## Feature Flags

### `FlagGate`
```typescript
interface FlagGateProps {
  flagKey: FlagKey;
  children: ReactNode;
  fallback?: ReactNode;
}
```
**Module:** `/flags`
**Description:** Conditionally renders based on single flag
**Key Props:** `flagKey`, `children`, `fallback`
**Use Case:** Feature toggling

**Example:**
```typescript
<FlagGate flagKey="new-feature" fallback={<OldFeature />}>
  <NewFeature />
</FlagGate>
```

### `FlagGateAll`
```typescript
interface FlagGateAllProps {
  flags: FlagKey[];
  children: ReactNode;
  fallback?: ReactNode;
}
```
**Module:** `/flags`
**Description:** Renders if ALL flags are enabled
**Key Props:** `flags`, `children`, `fallback`
**Use Case:** Multi-flag requirements

### `FlagGateAny`
```typescript
interface FlagGateAnyProps {
  flags: FlagKey[];
  children: ReactNode;
  fallback?: ReactNode;
}
```
**Module:** `/flags`
**Description:** Renders if ANY flag is enabled
**Key Props:** `flags`, `children`, `fallback`
**Use Case:** Alternative features

---

## Layouts

### `AdaptiveLayout`
```typescript
interface AdaptiveLayoutProps {
  children: ReactNode;
  breakpoints?: Breakpoints;
  strategy?: 'viewport' | 'container';
}
```
**Module:** `/layouts`
**Description:** Layout that adapts to viewport/container
**Key Props:** `children`, `breakpoints`, `strategy`
**Use Case:** Responsive layouts

### `AdaptiveGrid`
```typescript
interface AdaptiveGridProps {
  children: ReactNode;
  columns?: ResponsiveColumns;
  gap?: ResponsiveGap;
}
```
**Module:** `/layouts`
**Description:** Responsive grid layout
**Key Props:** `children`, `columns`, `gap`
**Use Case:** Grid layouts

### `MorphTransition`
```typescript
interface MorphTransitionProps {
  from: LayoutType;
  to: LayoutType;
  children: ReactNode;
  duration?: number;
}
```
**Module:** `/layouts`
**Description:** Morphing layout transition
**Key Props:** `from`, `to`, `children`, `duration`
**Use Case:** Smooth layout changes

### `ContextAwareBox`
```typescript
interface ContextAwareBoxProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}
```
**Module:** `/layouts`
**Description:** Box component aware of DOM context
**Key Props:** `children`, `className`, `style`
**Use Case:** Context-based styling

---

## Navigation

### `AppLink`
```typescript
interface AppLinkProps {
  to: string;
  children: ReactNode;
  prefetch?: boolean;
  className?: string;
}
```
**Module:** `/routing`
**Description:** Type-safe navigation link
**Key Props:** `to`, `children`, `prefetch`, `className`
**Use Case:** Internal navigation

**Example:**
```typescript
<AppLink to="/dashboard" prefetch>
  Dashboard
</AppLink>
```

### `AppNavLink`
```typescript
interface AppNavLinkProps {
  to: string;
  children: ReactNode;
  activeClassName?: string;
  exact?: boolean;
}
```
**Module:** `/routing`
**Description:** Navigation link with active state
**Key Props:** `to`, `children`, `activeClassName`, `exact`
**Use Case:** Navigation menus

---

## Real-time

### `StreamBoundary`
```typescript
interface StreamBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  priority?: StreamPriority;
}
```
**Module:** `/streaming`
**Description:** Streaming content boundary
**Key Props:** `children`, `fallback`, `priority`
**Use Case:** SSR streaming

### `CriticalStreamBoundary`
```typescript
interface CriticalStreamBoundaryProps {
  children: ReactNode;
}
```
**Module:** `/streaming`
**Description:** Critical content stream boundary
**Key Props:** `children`
**Use Case:** Critical content streaming

### `DeferredStreamBoundary`
```typescript
interface DeferredStreamBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  timeout?: number;
}
```
**Module:** `/streaming`
**Description:** Deferred content streaming
**Key Props:** `children`, `fallback`, `timeout`
**Use Case:** Deferred content loading

### `ConditionalStreamBoundary`
```typescript
interface ConditionalStreamBoundaryProps {
  condition: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}
```
**Module:** `/streaming`
**Description:** Conditional content streaming
**Key Props:** `condition`, `children`, `fallback`
**Use Case:** Conditional streaming

---

## Hydration

### `HydrationBoundary`
```typescript
interface HydrationBoundaryProps {
  children: ReactNode;
  priority?: HydrationPriority;
  id?: string;
}
```
**Module:** `/hydration`
**Description:** Progressive hydration boundary
**Key Props:** `children`, `priority`, `id`
**Use Case:** Progressive hydration

---

## Security

### `CSRFProtection`
```typescript
interface CSRFProtectionProps {
  children: ReactNode;
}
```
**Module:** `/security`
**Description:** CSRF protection wrapper
**Key Props:** `children`
**Use Case:** CSRF protection

---

## Module System

### `ModuleBoundary`
```typescript
interface ModuleBoundaryProps {
  moduleId: string;
  children: ReactNode;
  fallback?: ReactNode;
}
```
**Module:** `/vdom`
**Description:** Module isolation boundary
**Key Props:** `moduleId`, `children`, `fallback`
**Use Case:** Module isolation

### `ModuleSlot`
```typescript
interface ModuleSlotProps {
  slotId: string;
  fallback?: ReactNode;
}
```
**Module:** `/vdom`
**Description:** Slot for dynamic module loading
**Key Props:** `slotId`, `fallback`
**Use Case:** Dynamic module loading

---

## Loading & UX

### `LoadingIndicator`
```typescript
interface LoadingIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
}
```
**Module:** `/ux`
**Description:** Loading indicator component
**Key Props:** `size`, `message`
**Use Case:** Loading states

---

## Coordination

### `OrchestratedProviders`
```typescript
interface OrchestratedProvidersProps {
  children: ReactNode;
}
```
**Module:** `/coordination`
**Description:** Automatically orchestrates all providers
**Key Props:** `children`
**Use Case:** Provider orchestration

### `ContextBridgeProvider`
```typescript
interface ContextBridgeProviderProps {
  children: ReactNode;
}
```
**Module:** `/coordination`
**Description:** Provides context bridging
**Key Props:** `children`
**Use Case:** Cross-boundary context

### `BridgeSource`
```typescript
interface BridgeSourceProps {
  context: Context<any>;
  children: ReactNode;
}
```
**Module:** `/coordination`
**Description:** Sources context value for bridging
**Key Props:** `context`, `children`
**Use Case:** Context sourcing

### `BridgeConsumer`
```typescript
interface BridgeConsumerProps {
  context: Context<any>;
  children: (value: any) => ReactNode;
}
```
**Module:** `/coordination`
**Description:** Consumes bridged context
**Key Props:** `context`, `children`
**Use Case:** Context consumption

### `DefaultLoadingFallback`
```typescript
interface DefaultLoadingFallbackProps {}
```
**Module:** `/coordination`
**Description:** Default loading fallback UI
**Key Props:** None
**Use Case:** Default loading state

### `DefaultErrorFallback`
```typescript
interface DefaultErrorFallbackProps {
  error: Error;
}
```
**Module:** `/coordination`
**Description:** Default error fallback UI
**Key Props:** `error`
**Use Case:** Default error state

---

## Shared Components

### `GenericList`
```typescript
interface GenericListProps<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  keyExtractor: (item: T) => string;
  loading?: boolean;
  empty?: ReactNode;
}
```
**Module:** `/feature`
**Description:** Generic list view component
**Key Props:** `items`, `renderItem`, `keyExtractor`
**Use Case:** List rendering

### `GenericDetail`
```typescript
interface GenericDetailProps<T> {
  item: T;
  fields: FieldConfig[];
  actions?: ActionConfig[];
}
```
**Module:** `/feature`
**Description:** Generic detail view component
**Key Props:** `item`, `fields`, `actions`
**Use Case:** Detail views

### `StatsCard`
```typescript
interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: ReactNode;
}
```
**Module:** `/feature`
**Description:** Statistics card component
**Key Props:** `title`, `value`, `change`, `icon`
**Use Case:** Dashboard stats

### `ActionToolbar`
```typescript
interface ActionToolbarProps {
  actions: ActionConfig[];
  align?: 'left' | 'right' | 'center';
}
```
**Module:** `/feature`
**Description:** Action toolbar component
**Key Props:** `actions`, `align`
**Use Case:** Action buttons

### `FilterPanel`
```typescript
interface FilterPanelProps {
  filters: FilterConfig[];
  onFilterChange: (filters: any) => void;
}
```
**Module:** `/feature`
**Description:** Filter panel component
**Key Props:** `filters`, `onFilterChange`
**Use Case:** Data filtering

### `Pagination`
```typescript
interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}
```
**Module:** `/feature`
**Description:** Pagination component
**Key Props:** `page`, `totalPages`, `onPageChange`
**Use Case:** Paginated lists

### `SearchInput`
```typescript
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounce?: number;
}
```
**Module:** `/feature`
**Description:** Search input component
**Key Props:** `value`, `onChange`, `placeholder`, `debounce`
**Use Case:** Search functionality

---

**Total Components:** 60+
**Last Updated:** 2025-11-29
**Version:** 1.0.5
