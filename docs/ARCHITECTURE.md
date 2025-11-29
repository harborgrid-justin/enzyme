# Architecture Overview

> **Scope**: This document covers the Harbor React Framework's overall system architecture and design patterns.
> It provides a comprehensive understanding of the design decisions that power enterprise-grade React applications.

---

## Table of Contents

1. [Architecture Philosophy](#architecture-philosophy)
2. [High-Level Architecture](#high-level-architecture)
3. [Core Systems](#core-systems)
4. [Data Flow](#data-flow)
5. [Module Boundaries](#module-boundaries)
6. [Design Patterns](#design-patterns)
7. [Performance Architecture](#performance-architecture)
8. [Security Architecture](#security-architecture)
9. [Extensibility](#extensibility)

---

## Architecture Philosophy

Harbor React is built on five core architectural principles:

### 1. Separation of Concerns

Each system operates independently with well-defined interfaces:

```
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                          │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   Presentation  │   Business      │        Infrastructure       │
│   (UI/UX)       │   (Features)    │        (Services)           │
├─────────────────┼─────────────────┼─────────────────────────────┤
│ - Components    │ - Domain Logic  │ - API Clients               │
│ - Layouts       │ - State Mgmt    │ - Authentication            │
│ - Routing       │ - Validation    │ - Caching                   │
│ - Theming       │ - Workflows     │ - Storage                   │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

### 2. Progressive Enhancement

The framework works without JavaScript and enhances progressively:

```typescript
// Base HTML works immediately
// JavaScript enhances interactivity
// Advanced features (streaming, hydration) layer on top
```

### 3. Graceful Degradation

When advanced features aren't available, the system falls back gracefully:

```typescript
// If streaming fails -> standard React render
// If hydration fails -> full page hydration
// If prefetch fails -> on-demand loading
```

### 4. Observable by Default

Full telemetry integration for debugging and monitoring:

```typescript
import { PerformanceObservatory } from '@/lib/performance';

// Real-time Core Web Vitals
<PerformanceObservatory position="bottom-right" />
```

### 5. Tree-Shakeable

Unused features are removed at build time:

```typescript
// Only imported features are bundled
import { useAuth } from '@/lib/auth'; // Only auth code included
```

---

## High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                           HARBOR REACT FRAMEWORK                       │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        APPLICATION SHELL                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │  │
│  │  │   Providers │  │   Router    │  │   Layout    │               │  │
│  │  │   (Context) │  │   (Routes)  │  │   (Shell)   │               │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                   │
│  ┌─────────────────────────────────┼────────────────────────────────┐  │
│  │                    FEATURE MODULES                               │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │  │
│  │  │   Feature   │  │   Feature   │  │   Feature   │   ...         │  │
│  │  │   (Slice)   │  │   (Slice)   │  │   (Slice)   │               │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                   │
│  ┌─────────────────────────────────┼────────────────────────────────┐  │
│  │                    SHARED LIBRARY                                │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │  │
│  │  │  Auth  │ │ State  │ │Routing │ │Services│ │   UI   │          │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘          │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │  │
│  │  │Streaming│ │Hydrate │ │ VDOM  │ │  Perf  │ │ Theme  │          │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                   │
│  ┌─────────────────────────────────┼────────────────────────────────┐  │
│  │                    CONFIGURATION HUB                             │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │  │
│  │  │  Env   │ │ Routes │ │  API   │ │ Design │ │  Auth  │          │  │
│  │  │ Config │ │Registry│ │ Config │ │ Tokens │ │ Config │          │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Core Systems

### 1. Application Shell (`src/app/`)

The application shell provides the foundational structure:

```typescript
// src/app/RootProviders.tsx
export function RootProviders({ children }: PropsWithChildren) {
  return (
    <ErrorBoundary fallback={<AppErrorBoundary />}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <FeatureFlagProvider>
              {children}
            </FeatureFlagProvider>
          </AuthProvider>
        </ThemeProvider>
        <ReactQueryDevtools />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
```

### 2. Configuration Hub (`src/config/`)

Centralized configuration with type-safe access:

```typescript
// Single import for all configuration
import {
  env,           // Environment variables
  ROUTES,        // Route definitions
  API_CONFIG,    // API settings
  STORAGE_KEYS,  // Storage keys
  COLORS,        // Design tokens
} from '@/config';
```

**Architecture:**

```
src/config/
├── env.ts              # Runtime environment
├── env.schema.ts       # Zod validation
├── routes.registry.ts  # Route definitions
├── api.config.ts       # API endpoints
├── storage.config.ts   # Storage utilities
├── design-tokens.ts    # UI tokens
├── timing.constants.ts # Timing configuration
├── authConfig.ts       # Auth settings
├── featureFlagConfig.ts# Feature flags
└── index.ts            # Unified exports
```

### 3. Feature Modules (`src/features/`)

Vertical slice architecture for feature encapsulation:

```
src/features/[feature]/
├── components/         # UI components
│   ├── FeaturePage.tsx
│   ├── FeatureList.tsx
│   └── index.ts
├── hooks/              # React Query hooks
│   ├── queries.ts
│   ├── mutations.ts
│   └── index.ts
├── wiring/             # Data layer
│   ├── api.ts
│   ├── viewModel.ts
│   └── index.ts
├── config.ts           # Feature metadata
├── model.ts            # TypeScript types
├── feature.ts          # Registration entry
└── index.ts            # Public API
```

### 4. Shared Library (`src/lib/`)

Reusable utilities and infrastructure:

```
src/lib/
├── auth/           # Authentication system
├── hooks/          # Custom React hooks
├── performance/    # Performance monitoring
├── queries/        # TanStack Query setup
├── routing/        # Router utilities
├── services/       # HTTP clients
├── state/          # Zustand store
├── streaming/      # HTML streaming
├── vdom/           # Virtual DOM system
├── theme/          # Theming system
├── ui/             # UI component library
└── utils/          # General utilities
```

---

## Data Flow

### Request/Response Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                           DATA FLOW                                    │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  User   │───▶│  Component  │───▶│   Hook      │───▶│   Servic  │  │
│  │ Action  │    │  (UI)       │    │ (useQuery)  │    │ (API Client)│  │
│  └─────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                        │                  │                  │         │
│                        │                  │                  ▼         │
│                        │                  │           ┌─────────────┐  │
│                        │                  │           │   Server    │  │
│                        │                  │           │   (API)     │  │
│                        │                  │           └─────────────┘  │
│                        │                  │                  │         │
│                        ▼                  ▼                  ▼         │
│  ┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  View   │◀───│  Re-render  │◀───│   Cache     │◀───│  Response │  │
│  │ Update  │    │             │    │ (TanStack)  │    │             │  │
│  └─────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### State Management Flow

```typescript
// Server State (TanStack Query)
const { data, isLoading } = useQuery({
  queryKey: ['users', filters],
  queryFn: () => usersService.getUsers(filters),
});

// Client State (Zustand)
const theme = useGlobalStore((s) => s.preferences.theme);
const setTheme = useGlobalStore((s) => s.setTheme);

// Local State (React)
const [isOpen, setIsOpen] = useState(false);
```

### Multi-Tab Synchronization

```
┌──────────────┐     ┌──────────────────────┐     ┌──────────────┐
│    Tab 1     │     │  BroadcastChannel    │     │    Tab 2     │
│              │────▶│                      │────▶│              │
│  State: A    │     │  Sync: settings,     │     │  State: A    │
│              │◀────│  theme, locale       │◀────│              │
└──────────────┘     └──────────────────────┘     └──────────────┘
```

---

## Module Boundaries

### Dependency Rules

```
┌────────────────────────────────────────────────────────────────────────┐
│                      DEPENDENCY DIRECTION                              │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  OUTER LAYERS (can depend on inner)                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Routes / Pages                                                 │   │
│  │  ┌───────────────────────────────────────────────────────┐  │   │
│  │  │  Features                                             │   │   │
│  │  │  ┌─────────────────────────────────────────────────┐  │   │   │
│  │  │  │  Shared Library (lib/)                          │   │   │   │
│  │  │  │  ┌───────────────────────────────────────────┐  │   │   │   │
│  │  │  │  │  Configuration (config/)                  │   │   │   │   │
│  │  │  │  │  ┌─────────────────────────────────────┐  │   │   │   │   │
│  │  │  │  │  │  Types (types/)                     │  │   │   │   │   │
│  │  │  │  │  └─────────────────────────────────────┘  │   │   │   │   │
│  │  │  │  └───────────────────────────────────────────┘   │   │   │   │
│  │  │  └──────────────────────────────────────────────────┘   │   │   │
│  │  └───────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  INNER LAYERS (cannot depend on outer)                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Import Patterns

```typescript
// Correct: Import from public API
import { useOrders, Order } from '@/features/orders';

// Incorrect: Import from internals
import { ordersApi } from '@/features/orders/wiring/api'; // DON'T DO THIS

// Correct: Import shared utilities
import { useAuth } from '@/lib/auth';
import { env, ROUTES } from '@/config';
```

---

## Design Patterns

### 1. Provider Pattern

```typescript
// Composing providers
<ThemeProvider>
  <AuthProvider>
    <FeatureFlagProvider>
      <App />
    </FeatureFlagProvider>
  </AuthProvider>
</ThemeProvider>
```

### 2. Hook Factory Pattern

```typescript
// Query key factory
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (params?: Params) => [...orderKeys.lists(), params] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};
```

### 3. View Model Pattern

```typescript
// Combines data fetching with UI state
export function useOrdersViewModel() {
  const [filters, setFilters] = useState(defaultFilters);
  const ordersQuery = useOrders(filters);

  return {
    orders: ordersQuery.data ?? [],
    isLoading: ordersQuery.isLoading,
    filters,
    setFilters,
  };
}
```

### 4. Guard Pattern (Authentication)

```typescript
// Route protection
<RequireAuth>
  <RequireRole roles={['admin', 'manager']}>
    <RequirePermission permissions={['orders:create']}>
      <CreateOrderPage />
    </RequirePermission>
  </RequireRole>
</RequireAuth>
```

### 5. Feature Toggle Pattern

```typescript
// Runtime feature control
<FlagGate flag="new_dashboard" fallback={<LegacyDashboard />}>
  <NewDashboard />
</FlagGate>
```

---

## Performance Architecture

### Rendering Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      RENDERING PIPELINE                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. STREAMING                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Progressive HTML streaming with React 18 Suspense              │   │
│  │  - Stream shell immediately                                      │   │
│  │  - Defer heavy content                                           │   │
│  │  - Chunked transfer encoding                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                           │
│  2. HYDRATION                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Auto-prioritized selective hydration                            │   │
│  │  - Visible viewport first (IntersectionObserver)                 │   │
│  │  - User interaction triggers immediate hydration                 │   │
│  │  - Background hydration for offscreen                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                           │
│  3. UPDATES                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Virtual Modular DOM                                             │   │
│  │  - Module-level reconciliation                                   │   │
│  │  - Independent module hydration                                  │   │
│  │  - Memory-efficient DOM pooling                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Performance Targets

| Metric | Target | Description |
|--------|--------|-------------|
| LCP | < 2.0s | Largest Contentful Paint |
| INP | < 100ms | Interaction to Next Paint |
| CLS | < 0.05 | Cumulative Layout Shift |
| TTI | < 3.0s | Time to Interactive |
| Bundle | < 150KB | Initial JavaScript bundle |

### Optimization Strategies

```typescript
// 1. Code Splitting
const Dashboard = lazy(() => import('./Dashboard'));

// 2. Prefetching
const { prefetch } = usePredictivePrefetch();

// 3. Caching
const { data } = useQuery({
  queryKey: ['data'],
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// 4. Memoization
const MemoizedComponent = memo(ExpensiveComponent);
```

---

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Layer 1: Network Security                                       │   │
│  │  - HTTPS enforcement                                             │   │
│  │  - CSP headers                                                   │   │
│  │  - CORS configuration                                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Layer 2: Authentication                                         │   │
│  │  - JWT token management                                          │   │
│  │  - Secure token storage                                          │   │
│  │  - Automatic refresh                                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Layer 3: Authorization                                          │   │
│  │  - Role-based access control                                     │   │
│  │  - Permission guards                                             │   │
│  │  - Route protection                                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Layer 4: Input Validation                                       │   │
│  │  - Zod schema validation                                         │   │
│  │  - XSS prevention                                                │   │
│  │  - Sanitization                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Layer 5: Module Security                                        │   │
│  │  - Sandboxed module execution                                    │   │
│  │  - Content Security Policy integration                           │   │
│  │  - XSS prevention at module boundaries                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

See: [Security Guide](./SECURITY.md)

---

## Extensibility

### Adding New Systems

1. **Create module in `lib/`**:

```typescript
// lib/my-system/
├── index.ts          # Public exports
├── types.ts          # TypeScript types
├── MyProvider.tsx    # React provider
└── useMySystem.ts    # Custom hook
```

2. **Register in providers**:

```typescript
// app/RootProviders.tsx
<MySystemProvider>
  {children}
</MySystemProvider>
```

3. **Export from lib**:

```typescript
// lib/index.ts
export * from './my-system';
```

### Plugin Architecture

```typescript
interface HarborPlugin {
  name: string;
  version: string;
  init: (app: HarborApp) => void;
  destroy?: () => void;
}

// Register plugin
registerPlugin({
  name: 'analytics',
  version: '1.0.0',
  init: (app) => {
    app.on('navigation', trackPageView);
    app.on('error', trackError);
  },
});
```

---

## See Also

### Core Architecture
- [Streaming Guide](./STREAMING.md) - HTML streaming implementation
- [Hydration Guide](./HYDRATION.md) - Selective hydration system
- [VDOM Guide](./VDOM.md) - Virtual DOM partitioning
- [Layouts Guide](./LAYOUTS.md) - Adaptive layout system

### System Guides
- [API Documentation](./API.md) - Data fetching and HTTP client
- [State Management](./STATE.md) - Zustand + React Query patterns
- [Routing](../src/lib/docs/ROUTING.md) - Type-safe routing system
- [Authentication](../src/lib/docs/AUTHENTICATION.md) - Auth and authorization

### Deployment & Optimization
- [Performance Guide](./PERFORMANCE.md) - Optimization strategies
- [Security Guide](./SECURITY.md) - Security best practices
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
- [Environment Setup](./ENVIRONMENT.md) - Environment configuration

### Getting Started
- [Quick Start](./QUICKSTART.md) - Get started in 5 minutes
- [Documentation Index](./INDEX.md) - Complete documentation map

---

<p align="center">
  <strong>Harbor React Architecture</strong><br>
  Built for scale, performance, and maintainability
</p>
