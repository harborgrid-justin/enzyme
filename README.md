# @missionfabric-js/enzyme

> **A powerful React framework for building enterprise applications** — Advanced routing, state management, and performance optimizations in a lightweight, modular package.

[![React 18](https://img.shields.io/badge/React-18.3-blue)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Installation

```bash
npm install @missionfabric-js/enzyme
# or
yarn add @missionfabric-js/enzyme
# or
pnpm add @missionfabric-js/enzyme
```

## Why Enzyme?

| Feature | @missionfabric-js/enzyme | Next.js |
|---------|-------------|---------|
| **Build Tool** | Vite (lightning fast) | Webpack/Turbopack |
| **Rendering** | Client-side (CSR) | SSR/SSG/CSR |
| **Bundle Size** | Minimal, optimized | Heavier runtime |
| **Learning Curve** | Standard React patterns | Next.js-specific APIs |
| **Deployment** | Any static host | Vercel-optimized |
| **Full Control** | ✅ Complete | ❌ Framework opinions |
| **Auto-Routing** | ✅ File-system based | ✅ Built-in |
| **Multi-Tab Sync** | ✅ BroadcastChannel | ❌ Manual |
| **Performance Observatory** | ✅ Built-in | ❌ External tools |

**Choose @missionfabric-js/enzyme when you need:**
- Full control over routing and data fetching
- Lightning-fast development builds
- Simple deployment to any hosting provider
- Standard React patterns without framework lock-in
- Enterprise features without the complexity

---

## 🌟 Enterprise Features (v2.0)

### 1. Smart Route Discovery Engine
Zero-config file-system routing with build-time conflict detection:
```
src/routes/
├── root/
│   ├── _layout.tsx          → Layout wrapper
│   ├── Home.tsx              → /
│   ├── dashboard/
│   │   ├── [id].tsx          → /dashboard/:id (dynamic)
│   │   └── [[slug]].tsx      → /dashboard/:slug? (optional)
│   └── [...catchAll].tsx     → /* (catch-all)
```

### 2. Enterprise Config Hub
Single source of truth for all configuration:
```typescript
import {
  ROUTES, TIMING, COLORS, API_CONFIG,
  STORAGE_KEYS, initializeConfig
} from '@/config';

// Runtime validation with clear errors
initializeConfig(); // Throws on misconfiguration
```

### 3. Predictive Prefetching
AI-driven route prefetching using Markov chains:
```typescript
import { usePredictivePrefetch } from '@/lib/performance';

// Automatically learns navigation patterns and prefetches likely routes
const { prefetchHandlers } = usePredictivePrefetch();
```

### 4. Real-time Collaboration State
Multi-tab/window state synchronization via BroadcastChannel:
```typescript
import { createBroadcastSync } from '@/lib/state/sync';

const sync = createBroadcastSync(useStore, {
  syncKeys: ['settings', 'theme'],
  leaderElection: true,
});
sync.start(); // State syncs across all tabs instantly
```

### 5. Performance Observatory
Built-in performance monitoring dashboard:
```typescript
import { PerformanceObservatory } from '@/lib/performance';

// Shows real-time Core Web Vitals (LCP, INP, CLS, FCP, TTFB)
<PerformanceObservatory position="bottom-right" />
```

---

## 🚀 Quick Start

### Create a New Project

```bash
# Clone the template
npx degit harborgrid-justin/white-cross/reuse/templates/react my-app
cd my-app

# Install dependencies
npm install

# Start development server
npm run dev
```

Your app is now running at **http://localhost:3000** 🎉

### One-Minute Setup

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env .env.local

# 3. Run
npm run dev
```

---

## 📁 Project Structure

```
src/
├── app/                    # 🏠 Application shell
│   ├── RootProviders.tsx   # Global provider composition
│   ├── AppShell.tsx        # Layout wrapper (header, nav, footer)
│   ├── AppErrorBoundary.tsx # Top-level error boundary
│   └── AppSuspenseBoundary.tsx
│
├── config/                 # ⚙️ Configuration
│   ├── env.ts              # Environment variables (typed)
│   ├── authConfig.ts       # Roles, permissions, hierarchy
│   └── featureFlagConfig.ts # Feature flags
│
├── features/               # 📦 Feature modules (vertical slices)
│   └── [feature]/          # Self-contained feature
│       ├── components/     # UI components
│       ├── hooks/          # React Query hooks
│       ├── wiring/         # API client + view models
│       ├── config.ts       # Feature metadata
│       ├── model.ts        # Domain types
│       └── index.ts        # Public API
│
├── lib/                    # 🛠️ Shared library
│   ├── auth/               # Authentication + guards
│   ├── feature/            # Feature factory + registry
│   ├── flags/              # Feature flag system
│   ├── hooks/              # Common hooks
│   ├── monitoring/         # Error tracking
│   ├── queries/            # React Query setup
│   ├── routing/            # Router + route definitions
│   ├── services/           # HTTP client + cache
│   ├── state/              # Zustand store
│   ├── streams/            # WebSocket + SSE
│   ├── theme/              # Dark/light mode
│   ├── ui/                 # UI component library
│   ├── utils/              # Utilities
│   └── system/             # System initialization
│
├── routes/                 # 📍 Route components
│   ├── root/               # Main app routes
│   │   ├── dashboard/      # Dashboard pages
│   │   ├── RootLayout.tsx  # Main layout
│   │   └── Home.tsx        # Landing page
│   └── auth/               # Auth routes
│       ├── Login.tsx
│       └── Logout.tsx
│
├── types/                  # 📝 TypeScript types
└── main.tsx               # Application entry
```

---

## 📖 Core Concepts

### 1. Feature-Based Architecture

Each feature is a **self-contained vertical slice** with its own API, state, and UI:

```typescript
// features/reports/index.ts
export { reportsFeature } from './feature';
export { useReports, useReport } from './hooks';
export { ReportsList, CreateReportForm } from './components';
export type { Report, ReportStatus } from './model';
```

**Register features dynamically:**

```typescript
// main.tsx or app setup
import { registerFeature, initializeFeatures } from '@/lib/feature';
import { reportsFeature } from '@/features/reports';
import { usersFeature } from '@/features/users';

initializeFeatures([reportsFeature, usersFeature]);

// Generate routes automatically
import { getFeatureRoutes } from '@/lib/feature';
const featureRoutes = getFeatureRoutes();
```

### 2. Type-Safe Routing

Routes are **strongly typed** with params and query validation:

```typescript
// lib/routing/routes.ts
export const routes = {
  home: '/',
  dashboard: '/dashboard',
  reports: '/reports',
  reportDetail: '/reports/:id',
} as const;

// Build paths with type safety
import { buildPath } from '@/lib/routing';

const url = buildPath('/reports/:id', { id: '123' });
// → '/reports/123'
```

### 3. Data Fetching (TanStack Query)

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries';

// Fetch data
const { data, isLoading, error } = useQuery({
  queryKey: queryKeys.reports.list({ status: 'active' }),
  queryFn: () => reportsService.getReports({ status: 'active' }),
});

// Mutations with cache invalidation
const createReport = useMutation({
  mutationFn: reportsService.createReport,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
  },
});
```

### 4. State Management (Zustand)

```typescript
import { useGlobalStore } from '@/lib/state';

// Access state
const sidebarOpen = useGlobalStore((s) => s.ui.sidebarOpen);
const toggleSidebar = useGlobalStore((s) => s.toggleSidebar);

// Type-safe selectors
import { selectCurrentUser, selectIsAuthenticated } from '@/lib/state/selectors';
```

### 5. Authentication & Authorization

```typescript
import { useAuth, RequireRole, RequirePermission } from '@/lib/auth';

// Hook-based
const { user, isAuthenticated, login, logout } = useAuth();

// Component guards
<RequireRole roles={['admin', 'manager']}>
  <AdminPanel />
</RequireRole>

<RequirePermission permissions={['reports:create']}>
  <CreateButton />
</RequirePermission>
```

### 6. Feature Flags

```typescript
import { useFeatureFlag, FlagGate, withFeatureFlag } from '@/lib/flags';

// Hook
const showNewDashboard = useFeatureFlag('new_dashboard');

// Component gate
<FlagGate flag="beta_features" fallback={<LegacyView />}>
  <NewView />
</FlagGate>

// HOC
const EnhancedComponent = withFeatureFlag('enhanced_mode')(MyComponent);
```

### 7. Theming

```typescript
import { useTheme, ThemeProvider } from '@/lib/theme';

const { theme, setTheme, resolvedTheme, toggleTheme } = useTheme();

// Switch themes
setTheme('dark');    // Dark mode
setTheme('light');   // Light mode
setTheme('system');  // Follow OS preference
```

### 8. Real-Time Updates

```typescript
import { useStream, StreamProvider } from '@/lib/streams';

// Subscribe to real-time updates
const { subscribe, send, isConnected } = useStream();

useEffect(() => {
  const unsubscribe = subscribe('notifications', (data) => {
    console.log('New notification:', data);
  });
  return unsubscribe;
}, []);
```

---

## ⚙️ Configuration

### Environment Variables

Create `.env.local` for local overrides:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api
VITE_API_TIMEOUT=30000

# Real-time
VITE_WS_URL=ws://localhost:3001/ws
VITE_SSE_URL=http://localhost:3001/events

# Feature Flags
VITE_FEATURE_FLAGS_ENABLED=true
VITE_FEATURE_FLAGS_SOURCE=local  # or 'remote'

# Auth
VITE_AUTH_TOKEN_KEY=auth_token
VITE_AUTH_REFRESH_INTERVAL=300000

# Monitoring
VITE_SENTRY_DSN=
VITE_ENABLE_ERROR_REPORTING=false

# Environment
VITE_APP_ENV=development
VITE_APP_VERSION=1.0.0
```

### Path Aliases

Pre-configured in `tsconfig.json` and `vite.config.ts`:

```typescript
import { Button } from '@/lib/ui';         // src/lib/ui
import { useAuth } from '@/lib/auth';      // src/lib/auth
import { routes } from '@/lib/routing';    // src/lib/routing
import { reportsFeature } from '@/features'; // src/features
import { env } from '@/config';            // src/config
```

---

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (http://localhost:3000) |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript type checking |
| `npm run test` | Run Vitest tests |
| `npm run test:coverage` | Tests with coverage report |

---

## 📦 Key Dependencies

| Package | Purpose |
|---------|---------|
| **react** ^18.3 | UI library |
| **react-router-dom** ^6.26 | Client-side routing |
| **@tanstack/react-query** ^5.59 | Data fetching & caching |
| **zustand** ^4.5 | Lightweight state management |
| **vite** ^5.4 | Build tool & dev server |
| **typescript** ^5.6 | Type safety |
| **tailwindcss** ^3.4 | Utility-first CSS |
| **clsx** ^2.1 | Conditional classnames |

---

## 🧪 Testing

```bash
# Run all tests
npm run test

# Watch mode
npm run test -- --watch

# UI mode
npm run test -- --ui

# Coverage report
npm run test:coverage
```

**Testing patterns:**

```typescript
// Component test example
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReportsList } from './ReportsList';

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

test('renders reports', async () => {
  render(<ReportsList />, { wrapper });
  expect(await screen.findByText('Reports')).toBeInTheDocument();
});
```

---

## 🚢 Deployment

### Static Hosting (Recommended)

```bash
# Build production bundle
npm run build

# Output in dist/
# Deploy to any static host:
# - Netlify
# - Vercel
# - AWS S3 + CloudFront
# - Azure Static Web Apps
# - GitHub Pages
```

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Environment-Specific Builds

```bash
# Development
npm run build -- --mode development

# Staging
npm run build -- --mode staging

# Production
npm run build -- --mode production
```

---

## 📚 Creating a New Feature

1. **Generate feature structure:**

```bash
mkdir -p src/features/myfeature/{components,hooks,wiring}
```

2. **Create feature files:**

```typescript
// features/myfeature/config.ts
export const myFeatureConfig = {
  metadata: {
    id: 'myfeature',
    name: 'My Feature',
    icon: 'star',
    order: 10,
  },
  access: {
    requireAuth: true,
    allowedRoles: ['user', 'admin'],
  },
};

// features/myfeature/model.ts
export interface MyItem {
  id: string;
  name: string;
  createdAt: Date;
}

// features/myfeature/feature.ts
import { lazy } from 'react';
import { myFeatureConfig } from './config';

export const myFeature = {
  config: myFeatureConfig,
  component: lazy(() => import('./components/MyFeaturePage')),
};

// features/myfeature/index.ts
export * from './feature';
export * from './config';
export * from './model';
```

3. **Register the feature:**

```typescript
// features/index.ts
export * from './reports';
export * from './myfeature';  // Add export
```

---

## 🤝 Contributing

1. Follow the feature-based architecture
2. Add TypeScript types for all exports
3. Include unit tests for new features
4. Update documentation as needed

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🔗 Documentation

### Getting Started
- [Documentation Index](docs/INDEX.md) - Complete documentation map
- [Quick Start Guide](docs/QUICKSTART.md) - Get productive in minutes
- [Getting Started](docs/GETTING_STARTED.md) - Comprehensive introduction

### Architecture & Concepts
- [Architecture Overview](docs/ARCHITECTURE.md) - System design and patterns
- [Feature Architecture](docs/FEATURES.md) - Vertical slice feature modules
- [State Management](docs/STATE.md) - Zustand + TanStack Query patterns

### Core Systems
- [Streaming Guide](docs/STREAMING.md) - Dynamic HTML streaming
- [Hydration Guide](docs/HYDRATION.md) - Auto-prioritized hydration
- [Layouts Guide](docs/LAYOUTS.md) - Adaptive & context-aware layouts
- [VDOM Guide](docs/VDOM.md) - Virtual modular DOM

### Developer Guides
- [Configuration Guide](docs/CONFIGURATION.md) - Configuration system
- [Performance Guide](docs/PERFORMANCE.md) - Optimization strategies
- [Security Guide](docs/SECURITY.md) - Authentication & authorization
- [API Documentation](docs/API.md) - Data fetching patterns
- [Testing Guide](docs/TESTING.md) - Testing strategies

### Reference
- [Hooks Reference](docs/HOOKS_REFERENCE.md) - Custom hooks API
- [Components Reference](docs/COMPONENTS_REFERENCE.md) - UI components
- [Config Reference](docs/CONFIG_REFERENCE.md) - Configuration options

### Additional Topics
- [Auto-Route System](docs/AUTO_ROUTES.md) - File-system routing
- [Design System](docs/DESIGN_SYSTEM.md) - Design tokens & styling
- [Migration Guide](docs/MIGRATION.md) - From Next.js, CRA, or Vite

---

---

## See Also

### Getting Started
- [Documentation Index](docs/INDEX.md) - Complete documentation map
- [Quick Start Guide](docs/QUICKSTART.md) - Get productive in minutes
- [Getting Started](docs/GETTING_STARTED.md) - Comprehensive introduction

### Core Documentation
- [Architecture Overview](docs/ARCHITECTURE.md) - System design and architectural patterns
- [API Documentation](docs/API.md) - Data fetching and HTTP client patterns
- [Configuration Guide](docs/CONFIGURATION.md) - Environment and app configuration

### Security & Authentication
- [Security Guide](docs/SECURITY.md) - Security best practices
- [Authentication Guide](src/lib/docs/AUTHENTICATION.md) - Auth system and SSO integration
- [Routing Guide](src/lib/docs/ROUTING.md) - Type-safe routing and navigation

### Development
- [Testing Guide](docs/TESTING.md) - Unit, integration, and E2E testing
- [Performance Guide](docs/PERFORMANCE.md) - Optimization strategies
- [Migration Guide](docs/MIGRATION.md) - From Next.js, CRA, or Vite

---

<p align="center">
  <strong>Built with care by the HarborGrid Team</strong>
</p>
