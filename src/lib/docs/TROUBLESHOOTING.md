# Troubleshooting Guide

> **Scope**: This document covers common issues, error messages, and debugging techniques for the Harbor React Library.
> For best practices, see [Best Practices Guide](./BEST_PRACTICES.md).

## Table of Contents

- [Build Errors](#build-errors)
- [Runtime Errors](#runtime-errors)
- [Performance Issues](#performance-issues)
- [TypeScript Errors](#typescript-errors)
- [Hydration Errors](#hydration-errors)
- [State Synchronization Issues](#state-synchronization-issues)
- [API Integration Problems](#api-integration-problems)
- [Authentication Failures](#authentication-failures)
- [Routing Issues](#routing-issues)
- [Feature Flag Problems](#feature-flag-problems)
- [Configuration Errors](#configuration-errors)
- [Testing Failures](#testing-failures)
- [Deployment Issues](#deployment-issues)
- [Debug Techniques](#debug-techniques)
- [How to Get Help](#how-to-get-help)

---

## Build Errors

### Error: "Cannot find module '@/lib/...'"

**Symptoms:**

```
Error: Cannot find module '@/lib/api/api-client'
or its corresponding type declarations.
```

**Cause:** TypeScript path mapping not configured correctly.

**Solution:**

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/lib/*": ["src/lib/*"]
    }
  }
}
```

For Vite:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/lib': path.resolve(__dirname, './src/lib'),
    },
  },
});
```

---

### Error: "Module not found: Can't resolve 'zustand'"

**Symptoms:**

```
Module not found: Error: Can't resolve 'zustand'
```

**Cause:** Missing dependency.

**Solution:**

```bash
# Install missing dependencies
npm install zustand immer

# Or with yarn
yarn add zustand immer

# Verify installation
npm list zustand
```

---

### Error: "Duplicate identifier 'useStore'"

**Symptoms:**

```
error TS2300: Duplicate identifier 'useStore'
```

**Cause:** Multiple store definitions or naming collision.

**Solution:**

```typescript
// Use namespaced imports
import { useStore as useGlobalStore } from '@/lib/state/store';
import { useStore as useReportsStore } from '@/features/reports/store';

// Or rename exports
export { useStore as useAppStore } from '@/lib/state/store';
```

---

### Error: "The inferred type cannot be named without a reference"

**Symptoms:**

```
error TS2742: The inferred type of 'useStore' cannot be named
without a reference to 'node_modules/zustand/...'. This is likely
not portable. A type annotation is necessary.
```

**Cause:** Missing type export from Zustand store.

**Solution:**

```typescript
// store.ts - Add explicit type exports
import { create } from 'zustand';

export interface StoreState {
  count: number;
  increment: () => void;
}

export const useStore = create<StoreState>()((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

---

### Error: "Uncaught SyntaxError: Cannot use import statement outside a module"

**Symptoms:**

```
Uncaught SyntaxError: Cannot use import statement outside a module
```

**Cause:** Module not properly configured.

**Solution:**

```json
// package.json
{
  "type": "module"
}

// Or in vite.config.ts
export default defineConfig({
  build: {
    target: 'esnext'
  }
});
```

---

### Error: "process is not defined"

**Symptoms:**

```
ReferenceError: process is not defined
```

**Cause:** Accessing Node.js process object in browser code.

**Solution:**

```typescript
// ❌ Don't use process directly
if (process.env.NODE_ENV === 'development') {
  // ...
}

// ✅ Use environment helpers
import { isDev } from '@/lib/core/config/env-helper';

if (isDev()) {
  // ...
}

// Or configure Vite to inject it
// vite.config.ts
export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
});
```

---

### Error: "React Hook called conditionally"

**Symptoms:**

```
Error: React Hook "useState" is called conditionally.
React Hooks must be called in the exact same order in every
component render.
```

**Cause:** Hook called inside conditional or loop.

**Solution:**

```typescript
// ❌ Bad: Conditional hook
function Component({ shouldFetch }: { shouldFetch: boolean }) {
  if (shouldFetch) {
    const data = useState(null); // Error!
  }
}

// ✅ Good: Hook at top level
function Component({ shouldFetch }: { shouldFetch: boolean }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (shouldFetch) {
      fetchData().then(setData);
    }
  }, [shouldFetch]);
}
```

---

## Runtime Errors

### Error: "Cannot read properties of undefined"

**Symptoms:**

```
TypeError: Cannot read properties of undefined (reading 'name')
```

**Cause:** Accessing property on null/undefined value.

**Solution:**

```typescript
// ❌ Bad: No null check
function UserName({ user }: { user: User }) {
  return <div>{ user.name } < /div>; /
  / Error if user is null
}

// ✅ Good: Optional chaining and null checks
function UserName({ user }: { user: User | null }) {
  if (!user) return null;
  return <div>{ user.name } < /div>;
}

// Or use optional chaining
function UserName({ user }: { user?: User }) {
  return <div>{ user?.name ?? 'Unknown'
}
  </div>;
}
```

---

### Error: "Maximum update depth exceeded"

**Symptoms:**

```
Error: Maximum update depth exceeded. This can happen when a
component repeatedly calls setState inside componentWillUpdate or
componentDidUpdate. React limits the number of nested updates to
prevent infinite loops.
```

**Cause:** setState called during render or in effect without dependencies.

**Solution:**

```typescript
// ❌ Bad: setState in render
function Component() {
  const [count, setCount] = useState(0);
  setCount(count + 1); // Infinite loop!
  return <div>{ count } < /div>;
}

// ❌ Bad: Missing dependency
function Component() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(count + 1); // Infinite loop!
  }); // Missing deps

  return <div>{ count } < /div>;
}

// ✅ Good: Proper effect dependencies
function Component() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Run once on mount
    setCount(1);
  }, []); // Empty deps

  return <div>{ count } < /div>;
}
```

---

### Error: "Can't perform a React state update on an unmounted component"

**Symptoms:**

```
Warning: Can't perform a React state update on an unmounted
component. This is a no-op, but it indicates a memory leak in
your application.
```

**Cause:** setState called after component unmounted.

**Solution:**

```typescript
// ❌ Bad: No cleanup
function Component() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData().then(setData); // May run after unmount
  }, []);

  return <div>{ data } < /div>;
}

// ✅ Good: Check if mounted
import { useIsMounted } from '@/lib/hooks/shared';

function Component() {
  const [data, setData] = useState(null);
  const isMounted = useIsMounted();

  useEffect(() => {
    fetchData().then((result) => {
      if (isMounted()) {
        setData(result);
      }
    });
  }, [isMounted]);

  return <div>{ data } < /div>;
}

// ✅ Better: Use abort controller
function Component() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchData({ signal: controller.signal })
      .then(setData)
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error(error);
        }
      });

    return () => controller.abort();
  }, []);

  return <div>{ data } < /div>;
}
```

---

### Error: "Objects are not valid as a React child"

**Symptoms:**

```
Error: Objects are not valid as a React child (found: object with
keys {name, email}). If you meant to render a collection of
children, use an array instead.
```

**Cause:** Trying to render an object directly.

**Solution:**

```typescript
// ❌ Bad: Rendering object
function Component({ user }: { user: User }) {
  return <div>{ user } < /div>; /
  / Error!
}

// ✅ Good: Render object properties
function Component({ user }: { user: User }) {
  return (
    <div>
      <p>Name
:
  {
    user.name
  }
  </p>
  < p > Email
:
  {
    user.email
  }
  </p>
  < /div>
)
  ;
}

// Or serialize for debugging
function Component({ user }: { user: User }) {
  return <pre>{ JSON.stringify(user, null, 2) } < /pre>;
}
```

---

### Error: "Invalid hook call"

**Symptoms:**

```
Error: Invalid hook call. Hooks can only be called inside of the
body of a function component.
```

**Cause:** Hook called outside of React component or custom hook.

**Solution:**

```typescript
// ❌ Bad: Hook in regular function
function fetchUserData(id: string) {
  const [data, setData] = useState(null); // Error!
  // ...
}

// ✅ Good: Hook in custom hook
function useUserData(id: string) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchUser(id).then(setData);
  }, [id]);

  return data;
}

// ✅ Good: Use in component
function UserComponent({ id }: { id: string }) {
  const data = useUserData(id);
  return <div>{ data?.name
}
  </div>;
}
```

---

## Performance Issues

### Symptom: Slow Rendering / Janky Scrolling

**Cause:** Too many re-renders or expensive computations.

**Debug:**

```typescript
// Add React DevTools Profiler
import { Profiler } from 'react';

function onRenderCallback(
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number,
) {
  console.log(`${id} (${phase}): ${actualDuration}ms`);
}

<Profiler id = "UserList"
onRender = { onRenderCallback } >
  <UserList / >
  </Profiler>
```

**Solution:**

```typescript
// 1. Memoize expensive computations
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.value - b.value);
}, [items]);

// 2. Memoize components
const MemoizedRow = React.memo(Row);

// 3. Use virtualization for long lists
import { useVirtualizer } from '@tanstack/react-virtual';

// 4. Debounce frequent updates
const deferredQuery = useDeferredValue(query);
```

---

### Symptom: Memory Leak

**Cause:** Missing cleanup or retained references.

**Debug:**

```typescript
// Check for memory leaks in DevTools
// 1. Take heap snapshot
// 2. Perform action
// 3. Take another snapshot
// 4. Compare snapshots
```

**Solution:**

```typescript
// ✅ Always cleanup subscriptions
useEffect(() => {
  const subscription = eventBus.subscribe('event', handler);

  return () => {
    subscription.unsubscribe();
  };
}, []);

// ✅ Cleanup timers
useEffect(() => {
  const timer = setTimeout(() => {
    // ...
  }, 1000);

  return () => clearTimeout(timer);
}, []);

// ✅ Abort fetch requests
useEffect(() => {
  const controller = new AbortController();

  fetch('/api/data', { signal: controller.signal });

  return () => controller.abort();
}, []);
```

---

### Symptom: Bundle Size Too Large

**Cause:** Importing entire libraries or no code splitting.

**Debug:**

```bash
# Analyze bundle
npm run build
npx vite-bundle-visualizer

# Check what's in the bundle
du -sh dist/*
```

**Solution:**

```typescript
// ❌ Bad: Import entire library
import _ from 'lodash';

// ✅ Good: Import specific functions
import debounce from 'lodash/debounce';

// ✅ Good: Code split routes
const Dashboard = lazy(() => import('./pages/Dashboard'));

// ✅ Good: Dynamic imports
const module = await import('./heavy-module');
```

---

## TypeScript Errors

### Error: "Type 'X' is not assignable to type 'Y'"

**Symptoms:**

```
error TS2322: Type 'string | undefined' is not assignable to
type 'string'.
```

**Cause:** Type mismatch, often from optional properties.

**Solution:**

```typescript
// ❌ Bad: No type guard
function greet(name: string | undefined) {
  return `Hello, ${name.toUpperCase()}`; // Error!
}

// ✅ Good: Type guard
function greet(name: string | undefined) {
  if (!name) return 'Hello, Guest';
  return `Hello, ${name.toUpperCase()}`;
}

// ✅ Good: Non-null assertion (if you're sure)
function greet(name: string | undefined) {
  return `Hello, ${name!.toUpperCase()}`;
}

// ✅ Best: Optional chaining with default
function greet(name?: string) {
  return `Hello, ${name?.toUpperCase() ?? 'Guest'}`;
}
```

---

### Error: "Property does not exist on type"

**Symptoms:**

```
error TS2339: Property 'role' does not exist on type 'User'.
```

**Cause:** Accessing property not defined in type.

**Solution:**

```typescript
// ❌ Bad: Missing property in type
interface User {
  id: string;
  name: string;
}

const user: User = { id: '1', name: 'John', role: 'admin' }; // Error!

// ✅ Good: Add property to type
interface User {
  id: string;
  name: string;
  role: string;
}

// ✅ Good: Use type guard
function hasRole(user: unknown): user is User & { role: string } {
  return typeof user === 'object' && user !== null && 'role' in user;
}

if (hasRole(user)) {
  console.log(user.role); // OK
}
```

---

### Error: "Argument of type 'X' is not assignable to parameter of type 'never'"

**Symptoms:**

```
error TS2345: Argument of type 'string' is not assignable to
parameter of type 'never'.
```

**Cause:** TypeScript inferred type as never (impossible type).

**Solution:**

```typescript
// ❌ Bad: TypeScript infers never
const items = []; // Type: never[]
items.push('hello'); // Error!

// ✅ Good: Explicit type
const items: string[] = [];
items.push('hello'); // OK

// ✅ Good: Initial value
const items = ['initial'];
items.push('hello'); // OK
```

---

### Error: "Cannot find name 'X'"

**Symptoms:**

```
error TS2304: Cannot find name 'process'.
```

**Cause:** Missing type definitions or incorrect environment.

**Solution:**

```bash
# Install type definitions
npm install --save-dev @types/node

# Or add to tsconfig.json
{
  "compilerOptions": {
    "types": ["node", "vite/client"]
  }
}
```

```typescript
// For Vite environment variables
// env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_TITLE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

---

## Hydration Errors

### Error: "Hydration failed because the initial UI does not match"

**Symptoms:**

```
Error: Hydration failed because the initial UI does not match
what was rendered on the server.
```

**Cause:** Client and server render different content.

**Solution:**

```typescript
// ❌ Bad: Different content on server/client
function Component() {
  return <div>{new Date().toISOString()}</div>; // Different each render!
}

// ✅ Good: Consistent rendering
function Component() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return <div>{new Date().toISOString()}</div>;
}

// ✅ Good: Use suppressHydrationWarning for expected differences
function Component() {
  return (
    <time suppressHydrationWarning>
      {new Date().toISOString()}
    </time>
  );
}
```

---

### Error: "Text content does not match server-rendered HTML"

**Cause:** Mismatch between server and client text.

**Solution:**

```typescript
// ❌ Bad: Random values
function Component() {
  return <div>{Math.random()}</div>;
}

// ✅ Good: Client-only rendering for dynamic content
function Component() {
  const [value, setValue] = useState<number | null>(null);

  useEffect(() => {
    setValue(Math.random());
  }, []);

  if (value === null) {
    return <div>0</div>; // Match SSR
  }

  return <div>{value}</div>;
}
```

---

### Symptom: Store Hydration Not Complete

**Cause:** Accessing persisted store before hydration.

**Solution:**

```typescript
import { hasStoreHydrated, waitForHydration } from '@/lib/state/store';

// ✅ Good: Wait for hydration
function Component() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    waitForHydration().then(() => setHydrated(true));
  }, []);

  const theme = useStore((state) => state.theme);

  if (!hydrated) {
    return <div>Loading
  ...
    </div>;
  }

  return <div className = { theme } > Content < /div>;
}

// ✅ Better: Use hydration hook
function useHydrated() {
  return useStore((state) => state._hasHydrated);
}

function Component() {
  const hydrated = useHydrated();
  const theme = useStore((state) => state.theme);

  if (!hydrated) {
    return <div>Loading
  ...
    </div>;
  }

  return <div className = { theme } > Content < /div>;
}
```

---

## State Synchronization Issues

### Symptom: State Not Updating

**Cause:** Mutating state directly or wrong setState usage.

**Solution:**

```typescript
// ❌ Bad: Direct mutation
const [items, setItems] = useState([1, 2, 3]);
items.push(4); // Doesn't trigger re-render!

// ✅ Good: Functional update
setItems((prev) => [...prev, 4]);

// For Zustand with Immer
useStore.setState((state) => {
  state.items.push(4); // Immer handles immutability
});
```

---

### Symptom: Stale Closure

**Cause:** Function captures old state value.

**Solution:**

```typescript
// ❌ Bad: Captures stale count
function Component() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount(count + 1); // Always uses initial count!
    }, 1000);

    return () => clearInterval(timer);
  }, []); // Empty deps

  return <div>{ count } < /div>;
}

// ✅ Good: Functional update
function Component() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((c) => c + 1); // Uses current count
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return <div>{ count } < /div>;
}

// ✅ Good: Include in dependencies
function Component() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount(count + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [count]); // Recreates timer with new count

  return <div>{ count } < /div>;
}
```

---

### Symptom: Store Not Persisting

**Cause:** Persistence not configured or blocked by browser.

**Debug:**

```typescript
// Check if localStorage is available
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
  console.log('localStorage available');
} catch (e) {
  console.error('localStorage blocked:', e);
}

// Check store hydration
import { hasStoreHydrated } from '@/lib/state/store';

console.log('Store hydrated:', hasStoreHydrated());
```

**Solution:**

```typescript
// Check privacy mode
if (typeof localStorage === 'undefined') {
  console.warn('localStorage not available (private mode?)');
}

// Verify persistence config
const useStore = create<StoreState>()(
  persist(
    storeCreator,
    {
      name: 'app-store', // Check this key in DevTools
      version: 1,
      partialize: (state) => ({
        // Only these fields are persisted
        theme: state.theme,
        // ...
      }),
    }
  )
);
```

---

## API Integration Problems

### Error: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Symptoms:**

```
Access to fetch at 'https://api.example.com/users' from origin
'http://localhost:3000' has been blocked by CORS policy
```

**Cause:** Server not configured to allow cross-origin requests.

**Solution:**

```typescript
// Development: Use proxy
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://api.example.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});

// Production: Server must set CORS headers
// Backend (Express example)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://yourdomain.com');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});
```

---

### Error: "401 Unauthorized"

**Symptoms:**

```
Error: Request failed with status code 401
```

**Cause:** Missing or invalid authentication token.

**Solution:**

```typescript
// Check token in store
import { useStore } from '@/lib/state/store';

const token = useStore((state) => state.session?.accessToken);
console.log('Token:', token);

// Check if token is expired
import { isTokenExpired } from '@/lib/auth/utils';

if (token && isTokenExpired(token)) {
  console.log('Token expired, refreshing...');
  await refreshToken();
}

// Verify apiClient includes token
import { apiClient } from '@/lib/api';

// The apiClient should automatically include auth header
// Check interceptors are configured
```

---

### Error: "CSRF token mismatch"

**Symptoms:**

```
Error: CSRF validation failed: token mismatch
```

**Cause:** CSRF token not included or invalid.

**Solution:**

```typescript
import { CSRFProtection } from '@/lib/security/csrf-protection';

// Check if CSRF is initialized
console.log('CSRF initialized:', CSRFProtection.isInitialized());

// Get current token
const token = await CSRFProtection.getToken();
console.log('CSRF token:', token);

// Verify apiClient includes CSRF
// It should automatically add X-CSRF-Token header

// For forms, add hidden input
function MyForm() {
  const inputProps = CSRFProtection.getFormInputProps();

  return (
    <form>
      <input { ...inputProps }
  />
  {/* other fields */
  }
  </form>
)
  ;
}
```

---

### Symptom: API Calls Not Working

**Debug:**

```typescript
// 1. Check network tab in DevTools
// - Is request being sent?
// - What's the URL?
// - What headers are included?
// - What's the response?

// 2. Log API calls
import { apiClient } from '@/lib/api';

// Add request interceptor
apiClient.interceptors.request.use((config) => {
  console.log('API Request:', config.method, config.url);
  return config;
});

// Add response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.data);
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.status, error.message);
    throw error;
  }
);

// 3. Check base URL
console.log('API Base URL:', import.meta.env.VITE_API_URL);
```

---

## Authentication Failures

### Error: "Token refresh failed"

**Symptoms:**
User gets logged out unexpectedly or sees authentication errors.

**Debug:**

```typescript
import { useStore } from '@/lib/state/store';

const session = useStore((state) => state.session);
console.log('Session:', {
  accessToken: session?.accessToken,
  refreshToken: session?.refreshToken,
  expiresAt: session?.expiresAt,
  isExpired: session ? Date.now() > session.expiresAt : null,
});
```

**Solution:**

```typescript
// Check refresh token endpoint
import { refreshAccessToken } from '@/lib/auth/refresh';

try {
  const newTokens = await refreshAccessToken(refreshToken);
  console.log('Token refreshed successfully');
} catch (error) {
  console.error('Refresh failed:', error);
  // Redirect to login
  window.location.href = '/login';
}

// Verify refresh logic in apiClient
// Should automatically refresh on 401 responses
```

---

### Symptom: "Session expired" loop

**Cause:** Refresh token endpoint returning 401.

**Solution:**

```typescript
// Prevent infinite refresh loop
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

async function refreshToken() {
  if (isRefreshing) {
    // Wait for ongoing refresh
    return new Promise((resolve) => {
      refreshSubscribers.push((token: string) => {
        resolve(token);
      });
    });
  }

  isRefreshing = true;

  try {
    const newToken = await api.post('/auth/refresh');

    // Notify subscribers
    refreshSubscribers.forEach((callback) => callback(newToken));
    refreshSubscribers = [];

    return newToken;
  } finally {
    isRefreshing = false;
  }
}
```

---

## Routing Issues

### Symptom: "404 Not Found" on page refresh

**Cause:** Server not configured for SPA routing.

**Solution:**

```nginx
# Nginx configuration
location / {
  try_files $uri $uri/ /index.html;
}

# Apache .htaccess
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

### Symptom: Route not matching

**Debug:**

```typescript
// Check route configuration
import { useLocation, useParams } from 'react-router-dom';

function DebugRoute() {
  const location = useLocation();
  const params = useParams();

  return (
    <pre>
      { JSON.stringify({ location, params }, null, 2) }
    < /pre>
  );
}
```

**Solution:**

```typescript
// Check route order (more specific first)
<Routes>
  <Route path = "/users/:id/edit"
element = { < EditUser / >
}
/>
< Route
path = "/users/:id"
element = { < ViewUser / >
}
/>
< Route
path = "/users"
element = { < ListUsers / >
}
/>
< /Routes>

// Check for typos in paths
// /user vs /users
// /product vs /products
```

---

## Feature Flag Problems

### Symptom: Feature flag not working

**Debug:**

```typescript
import { useFeatureFlag } from '@/lib/flags';

function Component() {
  const isEnabled = useFeatureFlag('myFeature');
  const allFlags = useStore((state) => state.features);

  console.log('Feature enabled:', isEnabled);
  console.log('All flags:', allFlags);

  return <div>Feature
:
  {
    isEnabled ? 'ON' : 'OFF'
  }
  </div>;
}
```

**Solution:**

```typescript
// Check flag is registered
import { registerFeatureFlag } from '@/lib/flags';

registerFeatureFlag({
  key: 'myFeature',
  name: 'My Feature',
  defaultValue: false,
  description: 'Enables my new feature',
});

// Check flag is set in config or store
useStore.setState((state) => {
  state.features.myFeature = true;
});
```

---

## Configuration Errors

### Error: "Environment variable not defined"

**Symptoms:**

```
TypeError: Cannot read properties of undefined (reading 'VITE_API_URL')
```

**Solution:**

```bash
# Create .env file
echo "VITE_API_URL=http://localhost:3000/api" > .env

# Or .env.local for local overrides
echo "VITE_API_URL=http://localhost:8080/api" > .env.local

# Restart dev server after creating .env
npm run dev
```

```typescript
// Use environment helpers
import { getEnvVar } from '@/lib/core/config/env-helper';

const apiUrl = getEnvVar('API_URL'); // Automatically prefixes VITE_
```

---

### Symptom: Config not loaded

**Debug:**

```typescript
import { getAppConfig } from '@/lib/core/config';

const config = getAppConfig();
console.log('Config:', config);

// Check environment
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  VITE_API_URL: import.meta.env.VITE_API_URL,
});
```

---

## Testing Failures

### Error: "ReferenceError: window is not defined"

**Symptoms:**
Tests fail with window/document not defined.

**Solution:**

```typescript
// jest.config.js
export default {
  testEnvironment: 'jsdom',
};

// Or for Vitest
// vite.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
  },
});
```

---

### Error: "Cannot find module '@/...' from test file"

**Solution:**

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

// Or jest.config.js
export default {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

---

### Symptom: "Act" warnings in tests

**Symptoms:**

```
Warning: An update to Component inside a test was not wrapped in act(...)
```

**Solution:**

```typescript
import { act, renderHook } from '@testing-library/react';

// ✅ Wrap state updates in act
test('updates state', async () => {
  const { result } = renderHook(() => useCounter());

  await act(async () => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});

// ✅ Use async utilities
test('loads data', async () => {
  render(<UserList / >);

  // waitFor automatically wraps in act
  await waitFor(() => {
    expect(screen.getByText('John')).toBeInTheDocument();
  });
});
```

---

## Deployment Issues

### Error: "Failed to load module script"

**Symptoms:**

```
Failed to load module script: Expected a JavaScript module script
but the server responded with a MIME type of "text/html"
```

**Cause:** Server not serving files with correct MIME types.

**Solution:**

```nginx
# Nginx
location ~* \.js$ {
  types { application/javascript js; }
}

location ~* \.css$ {
  types { text/css css; }
}
```

---

### Symptom: Build succeeds but app is blank

**Debug:**

```bash
# Check console for errors
# Check network tab for 404s

# Verify base URL in vite.config.ts
export default defineConfig({
  base: '/my-app/', // For subdirectory deployment
});

# Check public path
console.log('Base URL:', import.meta.env.BASE_URL);
```

---

### Symptom: Environment variables not working in production

**Cause:** .env files not included in build or wrong prefix.

**Solution:**

```bash
# Only VITE_ prefixed vars are exposed to client
VITE_API_URL=https://api.prod.com  # ✅ Exposed
API_URL=https://api.prod.com        # ❌ Not exposed

# For secrets, use build-time injection
# Or server-side configuration
```

---

## Debug Techniques

### Enable Debug Mode

```typescript
// Enable all library debug logs
import { enableDebugMode } from '@/lib/flags/debug-mode';

if (import.meta.env.DEV) {
  enableDebugMode();
}

// Access store in console
window.__STORE__ // Available in debug mode
```

### React DevTools

```typescript
// Install React DevTools browser extension

// Use profiler to find slow components
import { Profiler } from 'react';

<Profiler id = "MyComponent"
onRender = { onRenderCallback } >
  <MyComponent / >
  </Profiler>

// Use highlight updates to see re-renders
// Settings > Highlight updates when components render
```

### Network Debugging

```typescript
// Log all API calls
import { apiClient } from '@/lib/api';

apiClient.interceptors.request.use((config) => {
  console.log('→', config.method?.toUpperCase(), config.url, config.data);
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    console.log('←', response.status, response.config.url, response.data);
    return response;
  },
  (error) => {
    console.error('✗', error.config?.url, error.message);
    throw error;
  }
);
```

### State Debugging

```typescript
// Log store changes
import { useStore } from '@/lib/state/store';

useStore.subscribe((state, prevState) => {
  console.log('Store changed:', { state, prevState });
});

// Log specific slice changes
useStore.subscribe(
  (state) => state.user,
  (user, prevUser) => {
    console.log('User changed:', { user, prevUser });
  }
);
```

### Performance Profiling

```typescript
// Measure performance
performance.mark('start');
// ... code to measure ...
performance.mark('end');
performance.measure('operation', 'start', 'end');

const measure = performance.getEntriesByName('operation')[0];
console.log('Duration:', measure.duration);

// Use React DevTools Profiler
// Record -> Perform action -> Stop
// Analyze flame graph and ranked chart
```

---

## How to Get Help

### Before Asking for Help

1. **Search existing issues** on GitHub
2. **Check documentation** for the feature/API
3. **Reproduce in isolation** - Create minimal reproduction
4. **Check browser console** for error messages
5. **Review recent changes** - What changed since it worked?

### Creating a Good Bug Report

```markdown
## Bug Report

**Description:**
Clear description of the issue

**Steps to Reproduce:**

1. Go to /users
2. Click "Edit" button
3. See error

**Expected Behavior:**
Should show edit form

**Actual Behavior:**
Shows error: "Cannot read properties of undefined"

**Environment:**

- Browser: Chrome 120
- OS: macOS 14
- Node: 20.10.0
- Package Version: 2.1.0

**Code:**
\`\`\`typescript
// Minimal reproduction
function EditUser({ id }: { id: string }) {
const user = useUser(id);
return <div>{user.name}</div>; // Error here
}
\`\`\`

**Additional Context:**

- This started after upgrading from 2.0.0 to 2.1.0
- Works fine in development, only fails in production
- Error happens for all users, not specific IDs
```

### Getting Help Channels

1. **GitHub Issues**: For bugs and feature requests
2. **Discussions**: For questions and best practices
3. **Discord**: For real-time help (if available)
4. **Stack Overflow**: Use tags: `harbor-react`, `react`, `typescript`

### Useful Commands for Debugging

```bash
# Check versions
npm list react react-dom zustand

# Clear all caches
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npx tsc --noEmit

# Check for linting errors
npm run lint

# Run tests
npm test

# Build for production
npm run build

# Analyze bundle
npm run build && npx vite-bundle-visualizer
```

---

## See Also

- [Best Practices](./BEST_PRACTICES.md) - Prevent issues before they happen
- [Testing Guide](./TESTING.md) - Write tests to catch issues early
- [Architecture](./ARCHITECTURE.md) - Understand system design
- [API Reference](./API.md) - Complete API documentation

---

**Last Updated**: 2025-11-27
**Version**: 1.0.0
