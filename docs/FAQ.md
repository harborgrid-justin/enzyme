# Frequently Asked Questions (FAQ)

> **Common questions and answers** about the Harbor React Framework. If you don't find your answer here, check the [Troubleshooting Guide](./TROUBLESHOOTING.md) or open an issue.

---

## Table of Contents

- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Development](#development)
- [Authentication & Security](#authentication--security)
- [Routing & Navigation](#routing--navigation)
- [State Management](#state-management)
- [Performance](#performance)
- [Deployment](#deployment)
- [Common Errors](#common-errors)
- [Architecture & Patterns](#architecture--patterns)

---

## Installation & Setup

### Q: What are the minimum requirements to use Harbor React?

**A:** You need:
- Node.js 20+ (LTS recommended)
- npm 10+ or pnpm 8+
- Modern browser with ES2020+ support
- TypeScript knowledge (recommended)

See: [Getting Started](./GETTING_STARTED.md)

---

### Q: How do I create a new project from the template?

**A:** Use degit to clone the template:

```bash
npx degit harborgrid-justin/white-cross/reuse/templates/react my-app
cd my-app
npm install
npm run dev
```

See: [Quick Start](./QUICKSTART.md)

---

### Q: Can I use this template with JavaScript instead of TypeScript?

**A:** While the template is built with TypeScript, you can technically use JavaScript. However, we strongly recommend TypeScript for:
- Better IDE support
- Type safety in routes and API calls
- Catching errors at build time
- Self-documenting code

---

### Q: Which package manager should I use?

**A:** We support npm, pnpm, and yarn. Our recommendation:
- **npm** - Default, works everywhere
- **pnpm** - Faster, more efficient disk usage
- **yarn** - Good alternative to npm

The template is tested with all three.

---

## Configuration

### Q: Where do I configure API endpoints?

**A:** Set the `VITE_API_BASE_URL` in your `.env.local` file:

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

See: [Configuration Guide](./CONFIGURATION.md) | [Environment Setup](./ENVIRONMENT.md)

---

### Q: How do I enable/disable features?

**A:** Use feature flags in your environment file:

```env
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ENABLE_DEBUG_MODE=false
```

See: [Feature Flags Documentation](../src/lib/docs/FEATURE-FLAGS.md)

---

### Q: Can I use a different port than 3000?

**A:** Yes, set the `PORT` environment variable:

```bash
PORT=4000 npm run dev
```

Or update `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    port: 4000,
  },
});
```

---

## Development

### Q: How do I add a new route?

**A:** Create a file in `src/routes/root/`. The file name determines the route:

```
src/routes/root/
├── Home.tsx          → /
├── about/
│   └── About.tsx     → /about
└── users/
    ├── [id].tsx      → /users/:id
    └── Users.tsx     → /users
```

See: [Auto-Routes Guide](./AUTO_ROUTES.md) | [Routing Guide](../src/lib/docs/ROUTING.md)

---

### Q: What's the difference between lib/ and features/?

**A:**
- **`src/lib/`** - Shared library code (auth, routing, hooks, UI components)
- **`src/features/`** - Business features (reports, dashboards, specific modules)

`lib/` is framework-level, `features/` is application-level.

See: [Architecture Overview](./ARCHITECTURE.md) | [Features Guide](./FEATURES.md)

---

### Q: How do I create a new feature module?

**A:** Use this structure:

```bash
mkdir -p src/features/my-feature/{components,hooks,wiring}
```

Then create:
- `config.ts` - Feature metadata
- `model.ts` - TypeScript types
- `hooks/` - React Query hooks
- `wiring/` - API client + view models
- `components/` - UI components
- `index.ts` - Public API exports

See: [Features Guide](./FEATURES.md)

---

### Q: Why are my hot reloads slow?

**A:** Common causes:
1. Too many dependencies - Check bundle size
2. Complex computations without memoization
3. Large state objects - Split into smaller slices
4. Missing React.memo on expensive components

See: [Performance Guide](./PERFORMANCE.md)

---

## Authentication & Security

### Q: How do I protect a route?

**A:** Wrap routes with `RequireAuth`:

```tsx
import { RequireAuth } from '@/lib/auth';

<Route element={<RequireAuth />}>
  <Route path="/dashboard" element={<Dashboard />} />
</Route>
```

See: [Authentication Guide](../src/lib/docs/AUTHENTICATION.md)

---

### Q: How do I implement role-based access control?

**A:** Use `RequireRole` or `RequirePermission`:

```tsx
import { RequireRole } from '@/lib/auth';

// By role
<RequireRole roles={['admin', 'manager']}>
  <AdminPanel />
</RequireRole>

// By permission
<RequirePermission permissions={['reports:create']}>
  <CreateReportButton />
</RequirePermission>
```

See: [RBAC Guide](../src/lib/docs/RBAC.md)

---

### Q: Where are auth tokens stored?

**A:** By default, in `localStorage` with encryption. You can configure:

```typescript
<AuthProvider config={{ tokenStorage: 'secure' }}>
```

Options: `'secure'` (encrypted localStorage), `'memory'` (session only), `'cookie'` (httpOnly)

See: [Authentication Guide](../src/lib/docs/AUTHENTICATION.md)

---

### Q: How do I implement SSO?

**A:** Configure SSO providers in auth config:

```typescript
const authConfig = {
  sso: {
    enabled: true,
    providers: ['google', 'microsoft', 'saml'],
  },
};
```

See: [Authentication Examples](../src/lib/docs/examples/auth-examples.md)

---

## Routing & Navigation

### Q: How do I navigate programmatically?

**A:** Use the `useNavigate` hook:

```typescript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/dashboard');
```

See: [Routing Guide](../src/lib/docs/ROUTING.md)

---

### Q: How do I pass state between routes?

**A:** Use the `state` option in navigate:

```typescript
navigate('/user/123', {
  state: { from: 'dashboard', action: 'view' }
});

// In destination component
const location = useLocation();
const state = location.state;
```

---

### Q: Can I prefetch routes?

**A:** Yes! Use predictive prefetching:

```typescript
import { usePredictivePrefetch } from '@/lib/performance';

const { prefetchHandlers } = usePredictivePrefetch();

<Link to="/dashboard" {...prefetchHandlers}>
  Dashboard
</Link>
```

See: [Performance Guide](./PERFORMANCE.md)

---

## State Management

### Q: When should I use Zustand vs React Query?

**A:**
- **Zustand** - Client-side state (UI state, user preferences, app settings)
- **React Query** - Server state (API data, cache, mutations)

Example:
- Zustand: sidebar open/closed, theme, selected items
- React Query: user data, reports list, API calls

See: [State Management Guide](./STATE.md)

---

### Q: How do I persist state across page reloads?

**A:** Use Zustand middleware:

```typescript
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set) => ({
      // your state
    }),
    { name: 'app-storage' }
  )
);
```

See: [State Examples](../src/lib/docs/examples/state-examples.md)

---

### Q: How do I sync state across browser tabs?

**A:** Enable BroadcastChannel sync:

```typescript
import { createBroadcastSync } from '@/lib/state/sync';

const sync = createBroadcastSync(useStore, {
  syncKeys: ['theme', 'settings'],
});
sync.start();
```

See: [State Management Guide](./STATE.md)

---

## Performance

### Q: How do I monitor performance?

**A:** Use the Performance Observatory:

```tsx
import { PerformanceObservatory } from '@/lib/performance';

<PerformanceObservatory position="bottom-right" />
```

Shows real-time Core Web Vitals (LCP, INP, CLS, FCP, TTFB).

See: [Performance Guide](./PERFORMANCE.md)

---

### Q: How do I reduce bundle size?

**A:** Best practices:
1. Use dynamic imports for routes
2. Enable code splitting in Vite config
3. Tree-shake unused exports
4. Analyze bundle with `npm run build -- --analyze`
5. Lazy load heavy components

See: [Performance Guide](./PERFORMANCE.md)

---

### Q: Why is my first load slow?

**A:** Common issues:
1. **Too much JavaScript** - Enable code splitting
2. **No caching** - Configure service worker
3. **Large images** - Use optimized images
4. **Synchronous rendering** - Use streaming/hydration

See: [Performance Guide](./PERFORMANCE.md) | [Streaming Guide](./STREAMING.md)

---

## Deployment

### Q: How do I deploy to production?

**A:** Build and deploy the `dist/` folder:

```bash
npm run build
```

Deploy to:
- Netlify, Vercel, or any static host
- AWS S3 + CloudFront
- Docker container
- Traditional web server

See: [Deployment Guide](./DEPLOYMENT.md)

---

### Q: Do I need a server for this template?

**A:** No! Harbor React is a client-side framework. You only need:
1. A backend API (optional, for data)
2. Static file hosting (required, for the app)

The template generates static HTML/CSS/JS that runs in the browser.

---

### Q: How do I handle environment-specific configs?

**A:** Use environment files:

```
.env.local         → Local development
.env.staging       → Staging environment
.env.production    → Production
```

Build with: `npm run build -- --mode staging`

See: [Environment Setup](./ENVIRONMENT.md)

---

## Common Errors

### Q: "Cannot find module '@/lib/...'"

**A:** Path aliases might not be configured. Check:
1. `tsconfig.json` has `"paths": { "@/*": ["./src/*"] }`
2. `vite.config.ts` has alias configured
3. Your IDE is using the workspace TypeScript version

---

### Q: "Hydration mismatch" errors

**A:** Server and client HTML don't match. Common causes:
1. Using Date.now() or Math.random() in render
2. Browser extensions modifying HTML
3. Conditional rendering based on window/document

Solution: Use `useEffect` for client-only code.

See: [Hydration Guide](./HYDRATION.md)

---

### Q: "401 Unauthorized" on API calls

**A:** Check:
1. Token is being sent in headers
2. Token hasn't expired
3. API endpoint is correct
4. CORS is configured on backend

See: [API Documentation](./API.md)

---

## Architecture & Patterns

### Q: Why use this instead of Next.js?

**A:** Choose Harbor React when you need:
- Full control over rendering (CSR only)
- Faster development builds (Vite vs Webpack)
- Simpler deployment (static hosting)
- No vendor lock-in (standard React)
- Lightweight runtime (smaller bundle)

Choose Next.js when you need:
- SSR/SSG for SEO
- API routes in the same repo
- Image optimization service
- Vercel deployment

See: [README comparison table](../README.md)

---

### Q: What's the difference between streaming and hydration?

**A:**
- **Streaming** - Progressively send HTML to browser in chunks
- **Hydration** - Make static HTML interactive by attaching React

They work together: Stream HTML fast, then hydrate critical parts first.

See: [Streaming Guide](./STREAMING.md) | [Hydration Guide](./HYDRATION.md)

---

### Q: How is this different from Create React App?

**A:** Key differences:
- **Build Tool**: Vite (faster) vs Webpack (CRA)
- **Features**: Enterprise features built-in
- **Routing**: File-system routing vs manual
- **Architecture**: Opinionated structure vs basic setup
- **Maintenance**: Actively maintained (Vite) vs deprecated (CRA)

---

## Still Have Questions?

- **Check the docs**: [Documentation Index](./INDEX.md)
- **See examples**: [Examples Directory](../src/lib/docs/examples/)
- **Read troubleshooting**: [Troubleshooting Guide](./TROUBLESHOOTING.md)
- **Open an issue**: [GitHub Issues](https://github.com/harborgrid-justin/white-cross/issues)
- **Start a discussion**: [GitHub Discussions](https://github.com/harborgrid-justin/white-cross/discussions)

---

## See Also

### Core Resources
- [Troubleshooting Guide](./TROUBLESHOOTING.md) - Common issues and solutions
- [Documentation Index](./INDEX.md) - All documentation
- [Quick Start](./QUICKSTART.md) - Get started quickly
- [Examples](../src/lib/docs/examples/) - Code examples

### Module Documentation
- [API Module](./api/README.md) - API questions answered
- [Auth Module](./auth/README.md) - Authentication FAQ
- [State Module](./state/README.md) - State management FAQ
- [Routing Module](./routing/README.md) - Routing FAQ
- [UI Module](./ui/README.md) - UI component FAQ
- [Config Module](./config/README.md) - Configuration FAQ
- [Security Module](./security/README.md) - Security FAQ
- [Performance Module](./performance/README.md) - Performance FAQ
- [Theme Module](./theme/README.md) - Theming FAQ
- [Hooks Module](./hooks/README.md) - Hooks FAQ

---

<p align="center">
  <strong>Harbor React FAQ</strong><br>
  Quick answers to common questions
</p>
