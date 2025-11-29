# @missionfabric-js/enzyme Documentation Hub

<div align="center">

![npm version](https://img.shields.io/badge/version-1.0.5-blue.svg)
![React 18](https://img.shields.io/badge/React-18.3-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![Build](https://img.shields.io/badge/Build-Passing-brightgreen.svg)

**Enterprise React Framework with Advanced Routing, State Management, and Performance Optimizations**

[Quick Start](#quick-start) • [API Reference](#api-reference) • [Guides](#guides) • [GitHub](https://github.com/harborgrid-justin/enzyme)

</div>

---

## Quick Navigation

<table>
<tr>
<td width="50%" valign="top">

### Getting Started
- [Installation](#installation)
- [Quick Start Guide](./QUICKSTART.md)
- [First Application](#creating-your-first-app)
- [Project Structure](#project-structure)
- [Configuration](./CONFIGURATION.md)

### Core Concepts
- [Architecture Overview](./ARCHITECTURE.md)
- [Feature-Based Design](./FEATURES.md)
- [Philosophy & Patterns](#philosophy)
- [Module System](#module-index)

### API Documentation
- [Complete API Reference](./ENZYME_API_DOCUMENTATION.md)
- [Module APIs](./MODULE_API_DOCUMENTATION.md)
- [System & Types](./SYSTEM_AND_TYPES_API_DOCUMENTATION.md)
- [Hooks Reference](./HOOKS_REFERENCE.md)
- [Components Reference](./COMPONENTS_REFERENCE.md)

</td>
<td width="50%" valign="top">

### Development Guides
- [State Management](./STATE.md)
- [Routing & Navigation](./AUTO_ROUTES.md)
- [Data Fetching](./API.md)
- [Performance](./PERFORMANCE.md)
- [Security](./SECURITY.md)
- [Testing](./TESTING.md)

### Advanced Topics
- [Streaming & Hydration](./HYDRATION.md)
- [Virtual Modular DOM](./VDOM.md)
- [Adaptive Layouts](./LAYOUTS.md)
- [Real-time Features](./STREAMING.md)
- [Feature Flags](./CONFIGURATION.md#feature-flags)

### Support & Resources
- [FAQ](./FAQ.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
- [Migration Guide](./MIGRATION.md)
- [Glossary](./GLOSSARY.md)
- [Navigation Reference](./NAVIGATION.md)

</td>
</tr>
</table>

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Philosophy](#philosophy)
4. [Module Index](#module-index)
5. [API Reference](#api-reference)
6. [How-To Guides](#how-to-guides)
7. [Advanced Topics](#advanced-topics)
8. [Migration & Troubleshooting](#migration--troubleshooting)
9. [Version Information](#version-information)
10. [Contributing & Support](#contributing--support)

---

## Installation

### Package Manager

```bash
# npm
npm install @missionfabric-js/enzyme

# yarn
yarn add @missionfabric-js/enzyme

# pnpm
pnpm add @missionfabric-js/enzyme
```

### Peer Dependencies

Enzyme requires the following peer dependencies:

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.26.2"
}
```

### System Requirements

| Requirement | Version |
|-------------|---------|
| Node.js | >= 20.0.0 |
| npm | >= 10.0.0 |
| TypeScript | >= 5.0.0 (recommended) |

---

## Quick Start

### Creating Your First App

```typescript
// 1. Import core modules
import { createApp } from '@missionfabric-js/enzyme/core';
import { createRouter } from '@missionfabric-js/enzyme/routing';
import { createStore } from '@missionfabric-js/enzyme/state';

// 2. Initialize your app
const app = createApp({
  name: 'my-app',
  version: '1.0.0',
});

// 3. Set up routing
const router = createRouter({
  routes: [
    { path: '/', component: HomePage },
    { path: '/about', component: AboutPage },
  ],
});

// 4. Configure state management
const store = createStore({
  initialState: {
    user: null,
    theme: 'light',
  },
});

// 5. Start your application
app.mount('#root');
```

### Using Modules

Enzyme provides modular imports for optimal tree-shaking:

```typescript
// Core functionality
import { EnzymeProvider, useEnzyme } from '@missionfabric-js/enzyme';

// Authentication
import { AuthProvider, useAuth } from '@missionfabric-js/enzyme/auth';

// Routing
import { RouterProvider, useRouter, Link } from '@missionfabric-js/enzyme/routing';

// State management
import { createStore, useStore } from '@missionfabric-js/enzyme/state';

// API utilities
import { createApiClient, useQuery } from '@missionfabric-js/enzyme/api';

// Performance monitoring
import { PerformanceMonitor, usePerformance } from '@missionfabric-js/enzyme/performance';

// UI components
import { Button, Card, Modal } from '@missionfabric-js/enzyme/ui';

// Feature flags
import { FeatureFlagProvider, useFeatureFlag } from '@missionfabric-js/enzyme/flags';

// Theming
import { ThemeProvider, useTheme } from '@missionfabric-js/enzyme/theme';

// And many more...
```

---

## Philosophy

### Core Principles

**1. Modular Architecture**
- Each module is independently importable
- Tree-shakable exports for minimal bundle size
- Zero-dependency between modules where possible

**2. Developer Experience**
- TypeScript-first with comprehensive type definitions
- Intuitive APIs that follow React conventions
- Clear error messages and debugging tools

**3. Enterprise-Grade**
- Production-ready performance optimizations
- Built-in security best practices
- Comprehensive monitoring and observability

**4. Plug-and-Play**
- Use what you need, ignore the rest
- Easy integration with existing React projects
- Compatible with popular React ecosystems

### Design Patterns

**Feature-Based Architecture**
```
features/
└── [feature-name]/
    ├── components/     # UI components
    ├── hooks/         # Custom hooks
    ├── services/      # API clients
    ├── types/         # TypeScript types
    └── index.ts       # Public API
```

**Configuration Hub**
```typescript
import { env, routes, api, theme } from '@missionfabric-js/enzyme/config';
```

**Provider Composition**
```typescript
<EnzymeProvider>
  <AuthProvider>
    <ThemeProvider>
      <RouterProvider>
        <App />
      </RouterProvider>
    </ThemeProvider>
  </AuthProvider>
</EnzymeProvider>
```

---

## Module Index

Enzyme exports 27 specialized modules, each designed for specific functionality:

### Core Modules

| Module | Import Path | Description |
|--------|-------------|-------------|
| **Core** | `@missionfabric-js/enzyme/core` | Application initialization, lifecycle management |
| **System** | `@missionfabric-js/enzyme/system` | System-level utilities and configuration |
| **Shared** | `@missionfabric-js/enzyme/shared` | Common utilities shared across modules |
| **Utils** | `@missionfabric-js/enzyme/utils` | Helper functions and utilities |

### State & Data Management

| Module | Import Path | Description |
|--------|-------------|-------------|
| **State** | `@missionfabric-js/enzyme/state` | Zustand-based global state management |
| **Data** | `@missionfabric-js/enzyme/data` | Data structures and transformations |
| **Queries** | `@missionfabric-js/enzyme/queries` | React Query integration and data fetching |
| **API** | `@missionfabric-js/enzyme/api` | HTTP client and API utilities |
| **Contexts** | `@missionfabric-js/enzyme/contexts` | React context providers and consumers |

### Routing & Navigation

| Module | Import Path | Description |
|--------|-------------|-------------|
| **Routing** | `@missionfabric-js/enzyme/routing` | File-system routing, guards, navigation |
| **Layouts** | `@missionfabric-js/enzyme/layouts` | Adaptive layout system |

### Authentication & Security

| Module | Import Path | Description |
|--------|-------------|-------------|
| **Auth** | `@missionfabric-js/enzyme/auth` | Authentication, authorization, RBAC |
| **Security** | `@missionfabric-js/enzyme/security` | Security utilities, sanitization, CSP |

### Performance & Optimization

| Module | Import Path | Description |
|--------|-------------|-------------|
| **Performance** | `@missionfabric-js/enzyme/performance` | Performance monitoring, Core Web Vitals |
| **Hydration** | `@missionfabric-js/enzyme/hydration` | Auto-prioritized hydration system |
| **Streaming** | `@missionfabric-js/enzyme/streaming` | Progressive HTML streaming |
| **VDOM** | `@missionfabric-js/enzyme/vdom` | Virtual modular DOM system |

### Real-time & Communication

| Module | Import Path | Description |
|--------|-------------|-------------|
| **Realtime** | `@missionfabric-js/enzyme/realtime` | WebSocket and SSE connections |
| **Coordination** | `@missionfabric-js/enzyme/coordination` | Multi-tab/window coordination |

### UI & User Experience

| Module | Import Path | Description |
|--------|-------------|-------------|
| **UI** | `@missionfabric-js/enzyme/ui` | Component library (Button, Card, Modal, etc.) |
| **UX** | `@missionfabric-js/enzyme/ux` | UX enhancements, progressive enhancement |
| **Theme** | `@missionfabric-js/enzyme/theme` | Dark/light mode, theming system |

### Feature Management

| Module | Import Path | Description |
|--------|-------------|-------------|
| **Feature** | `@missionfabric-js/enzyme/feature` | Feature factory and registry |
| **Flags** | `@missionfabric-js/enzyme/flags` | Feature flag management |

### Configuration & Monitoring

| Module | Import Path | Description |
|--------|-------------|-------------|
| **Config** | `@missionfabric-js/enzyme/config` | Configuration management |
| **Monitoring** | `@missionfabric-js/enzyme/monitoring` | Error tracking, logging, analytics |
| **Services** | `@missionfabric-js/enzyme/services` | Service layer abstractions |

### Custom Hooks

| Module | Import Path | Description |
|--------|-------------|-------------|
| **Hooks** | `@missionfabric-js/enzyme/hooks` | Collection of custom React hooks |

---

## API Reference

### Comprehensive Guides

1. **[Complete API Documentation](./ENZYME_API_DOCUMENTATION.md)** - All exports from the main package
2. **[Module API Documentation](./MODULE_API_DOCUMENTATION.md)** - Individual module APIs
3. **[System & Types API](./SYSTEM_AND_TYPES_API_DOCUMENTATION.md)** - System utilities and TypeScript types
4. **[Hooks Reference](./HOOKS_REFERENCE.md)** - Custom hooks documentation
5. **[Components Reference](./COMPONENTS_REFERENCE.md)** - UI component library

### Quick Reference by Module

#### Authentication (`/auth`)

```typescript
import {
  AuthProvider,      // Context provider
  useAuth,          // Authentication hook
  RequireAuth,      // Route guard component
  RequireRole,      // Role-based guard
  RequirePermission,// Permission-based guard
  withAuth,         // HOC for auth
  authService,      // Auth service API
} from '@missionfabric-js/enzyme/auth';
```

[Full Auth Documentation](./SECURITY.md#authentication)

#### Routing (`/routing`)

```typescript
import {
  RouterProvider,    // Router context provider
  useRouter,        // Router hook
  useParams,        // URL params hook
  useNavigate,      // Navigation hook
  Link,             // Navigation component
  RouteGuard,       // Generic guard
  createRouter,     // Router factory
} from '@missionfabric-js/enzyme/routing';
```

[Full Routing Documentation](./AUTO_ROUTES.md)

#### State Management (`/state`)

```typescript
import {
  createStore,      // Store factory
  useStore,         // Store hook
  createSlice,      // Slice creator
  persist,          // Persistence middleware
  devtools,         // Redux DevTools integration
} from '@missionfabric-js/enzyme/state';
```

[Full State Documentation](./STATE.md)

#### API Client (`/api`)

```typescript
import {
  createApiClient,  // API client factory
  useQuery,         // Query hook
  useMutation,      // Mutation hook
  QueryProvider,    // Query context provider
  queryClient,      // Global query client
} from '@missionfabric-js/enzyme/api';
```

[Full API Documentation](./API.md)

#### Performance (`/performance`)

```typescript
import {
  PerformanceMonitor,     // Performance monitoring component
  usePerformance,         // Performance metrics hook
  usePrefetch,           // Route prefetching
  useOptimizedRender,    // Render optimization
  measureWebVitals,      // Core Web Vitals
} from '@missionfabric-js/enzyme/performance';
```

[Full Performance Documentation](./PERFORMANCE.md)

#### UI Components (`/ui`)

```typescript
import {
  Button,           // Button component
  Card,             // Card component
  Modal,            // Modal dialog
  Table,            // Data table
  Form,             // Form component
  Input,            // Input component
  Select,           // Select dropdown
  Tabs,             // Tab navigation
} from '@missionfabric-js/enzyme/ui';
```

[Full UI Documentation](./COMPONENTS_REFERENCE.md)

---

## How-To Guides

### Common Tasks

#### Set Up Authentication

```typescript
import { AuthProvider, useAuth, RequireAuth } from '@missionfabric-js/enzyme/auth';

// 1. Wrap your app
<AuthProvider>
  <App />
</AuthProvider>

// 2. Use in components
function Profile() {
  const { user, logout } = useAuth();
  return <div>Hello {user?.name}</div>;
}

// 3. Protect routes
<RequireAuth>
  <ProtectedPage />
</RequireAuth>
```

[Complete Auth Guide](./SECURITY.md)

#### Configure Routing

```typescript
import { RouterProvider, createRouter } from '@missionfabric-js/enzyme/routing';

const router = createRouter({
  routes: [
    {
      path: '/',
      component: HomePage,
    },
    {
      path: '/dashboard',
      component: DashboardPage,
      guard: 'auth',  // Require authentication
    },
    {
      path: '/admin',
      component: AdminPage,
      guard: { role: 'admin' },  // Require role
    },
  ],
});

<RouterProvider router={router}>
  <App />
</RouterProvider>
```

[Complete Routing Guide](./AUTO_ROUTES.md)

#### Fetch Data with React Query

```typescript
import { useQuery, useMutation } from '@missionfabric-js/enzyme/queries';
import { createApiClient } from '@missionfabric-js/enzyme/api';

const api = createApiClient({ baseURL: '/api' });

// Query
function UserProfile({ userId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.get(`/users/${userId}`),
  });

  if (isLoading) return <Spinner />;
  return <div>{data.name}</div>;
}

// Mutation
function UpdateProfile() {
  const mutation = useMutation({
    mutationFn: (data) => api.put('/profile', data),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  return (
    <button onClick={() => mutation.mutate({ name: 'New Name' })}>
      Update
    </button>
  );
}
```

[Complete Data Fetching Guide](./API.md)

#### Manage Global State

```typescript
import { createStore, useStore } from '@missionfabric-js/enzyme/state';

// Create store
const useAppStore = createStore((set) => ({
  user: null,
  theme: 'light',
  setUser: (user) => set({ user }),
  toggleTheme: () => set((state) => ({
    theme: state.theme === 'light' ? 'dark' : 'light'
  })),
}));

// Use in components
function ThemeToggle() {
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);

  return <button onClick={toggleTheme}>{theme}</button>;
}
```

[Complete State Guide](./STATE.md)

#### Implement Feature Flags

```typescript
import { FeatureFlagProvider, useFeatureFlag } from '@missionfabric-js/enzyme/flags';

// 1. Wrap app
<FeatureFlagProvider flags={{ newFeature: true }}>
  <App />
</FeatureFlagProvider>

// 2. Use in components
function NewFeature() {
  const isEnabled = useFeatureFlag('newFeature');

  if (!isEnabled) return null;
  return <div>New Feature!</div>;
}

// 3. Or use component
import { FeatureFlag } from '@missionfabric-js/enzyme/flags';

<FeatureFlag flag="newFeature" fallback={<OldFeature />}>
  <NewFeature />
</FeatureFlag>
```

[Complete Feature Flags Guide](./CONFIGURATION.md#feature-flags)

#### Monitor Performance

```typescript
import {
  PerformanceMonitor,
  useWebVitals,
  reportWebVitals
} from '@missionfabric-js/enzyme/performance';

// 1. Add monitoring component
function App() {
  return (
    <>
      <PerformanceMonitor position="bottom-right" />
      <YourApp />
    </>
  );
}

// 2. Track custom metrics
function Dashboard() {
  useWebVitals((metric) => {
    console.log(metric.name, metric.value);
    // Send to analytics
  });

  return <div>Dashboard</div>;
}

// 3. Measure performance
reportWebVitals(console.log);
```

[Complete Performance Guide](./PERFORMANCE.md)

---

## Advanced Topics

### Streaming & Hydration

**Progressive HTML Streaming** allows you to stream HTML chunks to the client as they become ready:

```typescript
import { StreamingProvider, useStreaming } from '@missionfabric-js/enzyme/streaming';

<StreamingProvider>
  <App />
</StreamingProvider>
```

**Auto-Prioritized Hydration** intelligently hydrates components based on viewport visibility and user interaction:

```typescript
import { HydrationProvider, useHydration } from '@missionfabric-js/enzyme/hydration';

<HydrationProvider strategy="viewport">
  <App />
</HydrationProvider>
```

[Streaming Documentation](./STREAMING.md) | [Hydration Documentation](./HYDRATION.md)

### Virtual Modular DOM (VDOM)

Enzyme's VDOM system provides module isolation and efficient updates:

```typescript
import {
  VirtualModuleProvider,
  useVirtualModule,
  createModule
} from '@missionfabric-js/enzyme/vdom';

const myModule = createModule({
  id: 'my-module',
  isolate: true,
  lazy: true,
});

<VirtualModuleProvider module={myModule}>
  <ModuleContent />
</VirtualModuleProvider>
```

[VDOM Documentation](./VDOM.md)

### Adaptive Layouts

Context-aware layouts that adapt to content and user behavior:

```typescript
import { LayoutProvider, useLayout } from '@missionfabric-js/enzyme/layouts';

<LayoutProvider>
  <AdaptiveLayout>
    <Content />
  </AdaptiveLayout>
</LayoutProvider>
```

[Layouts Documentation](./LAYOUTS.md)

### Real-time Features

WebSocket and Server-Sent Events (SSE) integration:

```typescript
import {
  RealtimeProvider,
  useWebSocket,
  useSSE
} from '@missionfabric-js/enzyme/realtime';

function LiveData() {
  const { data, send } = useWebSocket('ws://api.example.com');
  const events = useSSE('https://api.example.com/events');

  return <div>{data}</div>;
}
```

[Real-time Documentation](./STREAMING.md#real-time-updates)

### Multi-Tab Coordination

Synchronize state across browser tabs and windows:

```typescript
import { useCoordination } from '@missionfabric-js/enzyme/coordination';

function App() {
  const { broadcast, subscribe } = useCoordination();

  useEffect(() => {
    const unsubscribe = subscribe('theme-change', (theme) => {
      setTheme(theme);
    });
    return unsubscribe;
  }, []);

  const changeTheme = (newTheme) => {
    broadcast('theme-change', newTheme);
    setTheme(newTheme);
  };
}
```

[Coordination Documentation](./STATE.md#multi-tab-sync)

---

## Migration & Troubleshooting

### Migration Guides

**Migrating from Other Frameworks**
- [From Next.js](./MIGRATION.md#from-nextjs)
- [From Create React App](./MIGRATION.md#from-create-react-app)
- [From Vite](./MIGRATION.md#from-vite)
- [From Gatsby](./MIGRATION.md#from-gatsby)

**Version Upgrades**
- [Upgrading to v2.x](./MIGRATION.md#upgrading-to-v2)
- [Breaking Changes](./MIGRATION.md#breaking-changes)
- [Deprecation Notices](./MIGRATION.md#deprecations)

### Troubleshooting

Common issues and solutions:

| Issue | Solution | Documentation |
|-------|----------|---------------|
| Authentication not working | Check token configuration | [Auth Guide](./SECURITY.md#troubleshooting) |
| Routes not loading | Verify route registry | [Routing Guide](./AUTO_ROUTES.md#troubleshooting) |
| Performance issues | Enable monitoring | [Performance Guide](./PERFORMANCE.md#debugging) |
| State not updating | Check store configuration | [State Guide](./STATE.md#troubleshooting) |
| Build errors | Verify TypeScript config | [FAQ](./FAQ.md#build-errors) |

[Complete Troubleshooting Guide](./TROUBLESHOOTING.md)

---

## Version Information

### Current Version: 1.0.5

**Released:** November 2024

**What's New in v1.0.5:**
- Enhanced TypeScript support with stricter types
- Performance improvements in routing module
- Bug fixes in authentication flow
- Updated peer dependencies

### Version History

| Version | Release Date | Highlights |
|---------|--------------|------------|
| 1.0.5 | Nov 2024 | Performance improvements, bug fixes |
| 1.0.0 | Oct 2024 | Initial stable release |

### Upgrade Path

```bash
# Check current version
npm list @missionfabric-js/enzyme

# Upgrade to latest
npm update @missionfabric-js/enzyme

# Install specific version
npm install @missionfabric-js/enzyme@1.0.5
```

### Breaking Changes

**v1.0.0 → v1.0.5**
- No breaking changes

**Pre-1.0 → v1.0.0**
- See [Migration Guide](./MIGRATION.md#to-v1)

### Deprecation Notices

No deprecations in the current version.

### Changelog

[View Full Changelog](https://github.com/harborgrid-justin/enzyme/releases)

---

## Contributing & Support

### Community & Support

**GitHub Resources**
- [Issues](https://github.com/harborgrid-justin/enzyme/issues) - Bug reports and feature requests
- [Discussions](https://github.com/harborgrid-justin/enzyme/discussions) - Questions and community help
- [Pull Requests](https://github.com/harborgrid-justin/enzyme/pulls) - Contribute to the project

**Documentation**
- [FAQ](./FAQ.md) - Frequently asked questions
- [Troubleshooting Guide](./TROUBLESHOOTING.md) - Common issues and solutions
- [Glossary](./GLOSSARY.md) - Terms and definitions

### Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
   - Follow existing code style
   - Add tests for new features
   - Update documentation
4. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
5. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request**

**Contribution Guidelines**
- Follow TypeScript best practices
- Maintain test coverage above 80%
- Update documentation for new features
- Use conventional commit messages

### Development Setup

```bash
# Clone the repository
git clone https://github.com/harborgrid-justin/enzyme.git
cd enzyme

# Install dependencies
npm install

# Run tests
npm test

# Build the package
npm run build

# Run linting
npm run lint
```

### License

MIT License - see [LICENSE](../LICENSE) for details.

Copyright (c) 2024 Defendr Team

---

## Additional Resources

### Quick Links

| Resource | Description |
|----------|-------------|
| [Getting Started](./GETTING_STARTED.md) | Comprehensive tutorial |
| [Quick Start](./QUICKSTART.md) | 10-minute setup guide |
| [Architecture](./ARCHITECTURE.md) | System design and patterns |
| [API Reference](./ENZYME_API_DOCUMENTATION.md) | Complete API documentation |
| [Examples](./integration/) | Code examples and recipes |

### External Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Router Docs](https://reactrouter.com)
- [TanStack Query Docs](https://tanstack.com/query)
- [Zustand Docs](https://zustand-demo.pmnd.rs/)

---

<div align="center">

**Built with care by the HarborGrid Team**

[GitHub](https://github.com/harborgrid-justin/enzyme) • [Issues](https://github.com/harborgrid-justin/enzyme/issues) • [Discussions](https://github.com/harborgrid-justin/enzyme/discussions)

</div>
