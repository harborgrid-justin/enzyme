# Troubleshooting Guide

> **Common issues and solutions** for the Harbor React Framework. If you don't find your issue here, check the [FAQ](./FAQ.md) or [open an issue](https://github.com/harborgrid-justin/white-cross/issues).

---

## Table of Contents

- [Installation Issues](#installation-issues)
- [Development Server Issues](#development-server-issues)
- [Build Issues](#build-issues)
- [Runtime Errors](#runtime-errors)
- [TypeScript Errors](#typescript-errors)
- [Authentication Issues](#authentication-issues)
- [Routing Issues](#routing-issues)
- [State Management Issues](#state-management-issues)
- [API & Network Issues](#api--network-issues)
- [Performance Issues](#performance-issues)
- [Testing Issues](#testing-issues)
- [Deployment Issues](#deployment-issues)
- [Debugging Strategies](#debugging-strategies)
- [Getting Help](#getting-help)

---

## Installation Issues

### Issue: `npm install` fails with dependency conflicts

**Symptoms:**
```
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Causes:**
- Peer dependency conflicts
- Lock file out of sync
- npm cache corruption

**Solutions:**

1. **Try with legacy peer deps:**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Clear npm cache:**
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Use correct Node version:**
   ```bash
   node --version  # Should be 20+
   nvm use 20      # If using nvm
   ```

---

### Issue: Module not found errors after installation

**Symptoms:**
```
Error: Cannot find module '@/lib/auth'
```

**Causes:**
- TypeScript path aliases not configured
- IDE not using workspace TypeScript

**Solutions:**

1. **Verify tsconfig.json:**
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }
   ```

2. **Restart TypeScript server in VSCode:**
   - Cmd/Ctrl + Shift + P
   - "TypeScript: Restart TS Server"

3. **Check vite.config.ts:**
   ```typescript
   resolve: {
     alias: {
       '@': path.resolve(__dirname, './src'),
     },
   }
   ```

---

## Development Server Issues

### Issue: Dev server won't start or crashes immediately

**Symptoms:**
```
Error: EADDRINUSE: address already in use :::3000
```

**Causes:**
- Port already in use
- Process not properly terminated

**Solutions:**

1. **Kill process on port 3000:**
   ```bash
   # macOS/Linux
   lsof -ti:3000 | xargs kill -9

   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

2. **Use different port:**
   ```bash
   PORT=3001 npm run dev
   ```

3. **Check for multiple dev servers:**
   ```bash
   ps aux | grep vite
   ```

---

### Issue: Hot reload not working

**Symptoms:**
- Changes don't reflect in browser
- Need to manually refresh

**Causes:**
- Too many files watched
- File watcher limit reached
- WSL/Docker configuration

**Solutions:**

1. **Increase file watcher limit (Linux):**
   ```bash
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

2. **Check Vite config:**
   ```typescript
   server: {
     watch: {
       usePolling: true, // For Docker/WSL
     },
   }
   ```

3. **Clear Vite cache:**
   ```bash
   rm -rf node_modules/.vite
   ```

---

## Build Issues

### Issue: Build fails with TypeScript errors

**Symptoms:**
```
error TS2307: Cannot find module 'X' or its corresponding type declarations
```

**Causes:**
- Missing type definitions
- Incorrect imports
- Type errors in code

**Solutions:**

1. **Run type check only:**
   ```bash
   npm run type-check
   ```

2. **Install missing types:**
   ```bash
   npm install --save-dev @types/node @types/react @types/react-dom
   ```

3. **Check import paths:**
   ```typescript
   // ❌ Wrong
   import { Button } from 'Button';

   // ✅ Correct
   import { Button } from '@/lib/ui/Button';
   ```

---

### Issue: Build succeeds but app doesn't work

**Symptoms:**
- Production build loads but features don't work
- White screen in production

**Causes:**
- Environment variables not set
- Base URL incorrect
- Missing assets

**Solutions:**

1. **Check environment variables:**
   ```bash
   # Build with specific env
   npm run build -- --mode production

   # Verify .env.production exists
   ls -la .env*
   ```

2. **Check base URL in vite.config:**
   ```typescript
   export default defineConfig({
     base: '/', // or '/app/' for subdirectory
   });
   ```

3. **Test production build locally:**
   ```bash
   npm run build
   npm run preview
   ```

---

## Runtime Errors

### Issue: "Uncaught TypeError: Cannot read property 'X' of undefined"

**Symptoms:**
- App crashes with undefined property access
- Component fails to render

**Causes:**
- Missing null checks
- Async data not loaded
- Props not passed correctly

**Solutions:**

1. **Add null checks:**
   ```typescript
   // ❌ Wrong
   const name = user.profile.name;

   // ✅ Correct
   const name = user?.profile?.name ?? 'Unknown';
   ```

2. **Check loading states:**
   ```typescript
   if (isLoading) return <Loading />;
   if (!data) return <NoData />;
   return <Display data={data} />;
   ```

3. **Use error boundaries:**
   ```tsx
   <ErrorBoundary fallback={<ErrorFallback />}>
     <MyComponent />
   </ErrorBoundary>
   ```

---

### Issue: "Hydration mismatch" errors in console

**Symptoms:**
```
Warning: Expected server HTML to contain a matching <div> in <div>
```

**Causes:**
- Server/client rendering differs
- Using browser APIs during render
- Date/time/random values in JSX

**Solutions:**

1. **Move client-only code to useEffect:**
   ```typescript
   // ❌ Wrong
   const time = Date.now();

   // ✅ Correct
   const [time, setTime] = useState<number | null>(null);
   useEffect(() => {
     setTime(Date.now());
   }, []);
   ```

2. **Use client-only wrapper:**
   ```typescript
   import dynamic from 'next/dynamic';

   const ClientOnly = dynamic(() => import('./ClientOnly'), {
     ssr: false,
   });
   ```

---

## TypeScript Errors

### Issue: "Type 'X' is not assignable to type 'Y'"

**Symptoms:**
- TypeScript compilation fails
- IDE shows type errors

**Causes:**
- Incorrect types
- Missing type definitions
- Type inference issues

**Solutions:**

1. **Check type definitions:**
   ```typescript
   // Define proper types
   interface User {
     id: string;
     email: string;
     role: 'admin' | 'user';
   }

   const user: User = {
     id: '1',
     email: 'test@example.com',
     role: 'admin',
   };
   ```

2. **Use type guards:**
   ```typescript
   function isUser(value: unknown): value is User {
     return (
       typeof value === 'object' &&
       value !== null &&
       'id' in value
     );
   }
   ```

3. **Explicit type casting (last resort):**
   ```typescript
   const user = data as User;
   ```

---

### Issue: "Property 'X' does not exist on type 'never'"

**Symptoms:**
- TypeScript error on valid property
- Type narrowing issue

**Causes:**
- Incorrect type narrowing
- Union type not handled

**Solutions:**

1. **Use type guards:**
   ```typescript
   if ('property' in obj) {
     // TypeScript knows obj has property
     obj.property;
   }
   ```

2. **Add discriminant:**
   ```typescript
   type Result =
     | { type: 'success'; data: Data }
     | { type: 'error'; error: Error };

   if (result.type === 'success') {
     result.data; // TypeScript knows this is success
   }
   ```

---

## Authentication Issues

### Issue: User gets logged out unexpectedly

**Symptoms:**
- User redirected to login
- Session lost on refresh

**Causes:**
- Token expired
- Token not persisted
- Token refresh failed

**Solutions:**

1. **Check token expiration:**
   ```typescript
   // Enable token refresh
   const authConfig = {
     tokenRefresh: {
       enabled: true,
       refreshBeforeExpiry: 5 * 60 * 1000, // 5 min
     },
   };
   ```

2. **Verify token storage:**
   ```typescript
   // Check localStorage
   console.log(localStorage.getItem('auth_token'));

   // Use persistent storage
   <AuthProvider config={{ tokenStorage: 'secure' }}>
   ```

3. **Check auth state:**
   ```typescript
   const { user, isAuthenticated, error } = useAuth();
   console.log({ user, isAuthenticated, error });
   ```

---

### Issue: "401 Unauthorized" on API calls

**Symptoms:**
- API returns 401
- Authenticated routes fail

**Causes:**
- Token not sent in headers
- Token format incorrect
- Backend not accepting token

**Solutions:**

1. **Verify token in request:**
   ```typescript
   // Check axios interceptor
   http.interceptors.request.use((config) => {
     const token = getAccessToken();
     console.log('Token:', token); // Debug
     if (token) {
       config.headers.Authorization = `Bearer ${token}`;
     }
     return config;
   });
   ```

2. **Check token format:**
   ```typescript
   // Ensure Bearer prefix
   headers: {
     'Authorization': `Bearer ${token}`, // Not just token
   }
   ```

3. **Test with curl:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" https://api.example.com/endpoint
   ```

---

## Routing Issues

### Issue: Routes not found (404)

**Symptoms:**
- Page shows 404
- Route exists but doesn't work

**Causes:**
- Route file in wrong location
- Route not registered
- Dynamic route not matched

**Solutions:**

1. **Check file location:**
   ```
   src/routes/root/
   ├── Home.tsx        → /
   ├── about/
   │   └── About.tsx   → /about (not /about/about)
   ```

2. **Check route registry:**
   ```typescript
   import { getRoutes } from '@/lib/routing';
   console.log(getRoutes());
   ```

3. **Test route pattern:**
   ```typescript
   // Dynamic routes need brackets
   [id].tsx     → /users/:id ✅
   id.tsx       → /users/id ❌
   ```

---

### Issue: Navigation doesn't work

**Symptoms:**
- Links don't navigate
- Browser back button doesn't work

**Causes:**
- Using anchor tags instead of Link
- History not configured
- Route guards blocking

**Solutions:**

1. **Use React Router Link:**
   ```tsx
   // ❌ Wrong
   <a href="/dashboard">Dashboard</a>

   // ✅ Correct
   <Link to="/dashboard">Dashboard</Link>
   ```

2. **Check route guards:**
   ```typescript
   // Guard might be rejecting
   <RequireAuth>
     <Dashboard />
   </RequireAuth>
   ```

3. **Programmatic navigation:**
   ```typescript
   const navigate = useNavigate();
   navigate('/dashboard');
   ```

---

## State Management Issues

### Issue: State updates not reflecting

**Symptoms:**
- State changes but UI doesn't update
- stale data displayed

**Causes:**
- State mutation instead of update
- Stale closure
- Missing dependencies

**Solutions:**

1. **Use immutable updates:**
   ```typescript
   // ❌ Wrong - mutating state
   state.items.push(newItem);

   // ✅ Correct - immutable update
   setState(prev => ({
     ...prev,
     items: [...prev.items, newItem],
   }));
   ```

2. **Check useEffect dependencies:**
   ```typescript
   useEffect(() => {
     fetchData(id);
   }, [id]); // Don't forget dependencies
   ```

3. **Use Zustand selectors:**
   ```typescript
   // ❌ Might cause stale closure
   const state = useStore();

   // ✅ Use selector
   const items = useStore(s => s.items);
   ```

---

### Issue: React Query data not updating

**Symptoms:**
- Cache shows stale data
- Mutations don't reflect

**Causes:**
- Cache not invalidated
- Stale time too long
- Query key not updated

**Solutions:**

1. **Invalidate queries:**
   ```typescript
   const mutation = useMutation({
     mutationFn: createItem,
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['items'] });
     },
   });
   ```

2. **Check stale time:**
   ```typescript
   useQuery({
     queryKey: ['items'],
     queryFn: fetchItems,
     staleTime: 5 * 60 * 1000, // 5 min
   });
   ```

3. **Use dynamic query keys:**
   ```typescript
   // Include all variables in key
   useQuery({
     queryKey: ['items', filter, sort],
     queryFn: () => fetchItems({ filter, sort }),
   });
   ```

---

## API & Network Issues

### Issue: CORS errors in development

**Symptoms:**
```
Access to fetch blocked by CORS policy
```

**Causes:**
- Backend not configured for CORS
- Preflight request failing
- Incorrect headers

**Solutions:**

1. **Configure proxy in vite.config:**
   ```typescript
   export default defineConfig({
     server: {
       proxy: {
         '/api': {
           target: 'http://localhost:3001',
           changeOrigin: true,
         },
       },
     },
   });
   ```

2. **Backend CORS config:**
   ```typescript
   // Express example
   app.use(cors({
     origin: 'http://localhost:3000',
     credentials: true,
   }));
   ```

3. **Check headers:**
   ```typescript
   headers: {
     'Content-Type': 'application/json',
     // Don't set Content-Type for FormData
   }
   ```

---

### Issue: API timeouts

**Symptoms:**
- Requests take too long
- Timeout errors

**Causes:**
- Backend slow
- Network issues
- Timeout too short

**Solutions:**

1. **Increase timeout:**
   ```typescript
   const http = axios.create({
     timeout: 30000, // 30 seconds
   });
   ```

2. **Add loading states:**
   ```typescript
   const { data, isLoading } = useQuery({
     queryKey: ['data'],
     queryFn: fetchData,
     retry: 3,
   });
   ```

3. **Implement request abortion:**
   ```typescript
   useEffect(() => {
     const controller = new AbortController();

     fetch(url, { signal: controller.signal });

     return () => controller.abort();
   }, []);
   ```

---

## Performance Issues

### Issue: Slow initial load

**Symptoms:**
- First page load takes > 3 seconds
- Large bundle size

**Causes:**
- Bundle not optimized
- Too much code in main chunk
- No code splitting

**Solutions:**

1. **Analyze bundle:**
   ```bash
   npm run build -- --analyze
   ```

2. **Enable code splitting:**
   ```typescript
   const Dashboard = lazy(() => import('./Dashboard'));

   <Suspense fallback={<Loading />}>
     <Dashboard />
   </Suspense>
   ```

3. **Optimize images:**
   ```tsx
   <img
     src="/image.jpg"
     loading="lazy"
     decoding="async"
   />
   ```

---

### Issue: Memory leaks

**Symptoms:**
- App slows down over time
- Browser tab uses lots of memory

**Causes:**
- Event listeners not cleaned up
- Subscriptions not unsubscribed
- Timers not cleared

**Solutions:**

1. **Cleanup in useEffect:**
   ```typescript
   useEffect(() => {
     const subscription = stream.subscribe(handler);

     return () => subscription.unsubscribe();
   }, []);
   ```

2. **Clear timers:**
   ```typescript
   useEffect(() => {
     const timer = setInterval(update, 1000);

     return () => clearInterval(timer);
   }, []);
   ```

3. **Use React Query for subscriptions:**
   ```typescript
   // Automatic cleanup
   useQuery({
     queryKey: ['data'],
     queryFn: fetchData,
   });
   ```

---

## Testing Issues

### Issue: Tests failing unexpectedly

**Symptoms:**
- Tests pass locally, fail in CI
- Flaky tests

**Causes:**
- Async timing issues
- Environment differences
- Missing test setup

**Solutions:**

1. **Wait for async:**
   ```typescript
   // Use waitFor
   await waitFor(() => {
     expect(screen.getByText('Data')).toBeInTheDocument();
   });
   ```

2. **Mock timers:**
   ```typescript
   jest.useFakeTimers();
   act(() => {
     jest.advanceTimersByTime(1000);
   });
   ```

3. **Check test environment:**
   ```typescript
   // In test setup
   process.env.NODE_ENV = 'test';
   ```

---

## Deployment Issues

### Issue: App works locally but not in production

**Symptoms:**
- Production build shows errors
- Features don't work

**Causes:**
- Environment variables not set
- API URLs incorrect
- Assets not found

**Solutions:**

1. **Check environment:**
   ```bash
   # Verify .env.production
   cat .env.production

   # Build with production env
   npm run build -- --mode production
   ```

2. **Test production build locally:**
   ```bash
   npm run build
   npm run preview
   # Open http://localhost:4173
   ```

3. **Check console for errors:**
   - Open browser DevTools
   - Look for 404s or CORS errors
   - Check network tab

---

## Debugging Strategies

### Enable Debug Mode

```typescript
// In .env.local
VITE_DEBUG=true
VITE_LOG_LEVEL=debug
```

### React DevTools

1. Install React DevTools extension
2. Inspect component props and state
3. Check component hierarchy
4. Profile performance

### Network Debugging

```typescript
// Log all requests
http.interceptors.request.use((config) => {
  console.log('Request:', config);
  return config;
});

// Log all responses
http.interceptors.response.use((response) => {
  console.log('Response:', response);
  return response;
});
```

### Performance Observatory

```tsx
import { PerformanceObservatory } from '@/lib/performance';

<PerformanceObservatory position="bottom-right" />
```

### Source Maps

Ensure source maps are enabled:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    sourcemap: true,
  },
});
```

---

## Getting Help

### Before Asking for Help

1. **Check the docs:**
   - [FAQ](./FAQ.md)
   - [Documentation Index](./INDEX.md)
   - [Examples](../src/lib/docs/examples/)

2. **Search existing issues:**
   - [GitHub Issues](https://github.com/harborgrid-justin/white-cross/issues)

3. **Create minimal reproduction:**
   - Isolate the problem
   - Remove unrelated code
   - Share code snippet or repo

### Where to Get Help

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - Questions and community help
- **Stack Overflow** - Tag with `harbor-react`

### Information to Include

When asking for help, include:

1. **Environment:**
   - Node version: `node --version`
   - npm version: `npm --version`
   - OS: macOS/Windows/Linux

2. **Error message:**
   - Full error text
   - Stack trace
   - Console logs

3. **Code:**
   - Minimal reproduction
   - Relevant code snippets
   - Configuration files

4. **What you tried:**
   - Steps to reproduce
   - Solutions attempted
   - Expected vs actual behavior

---

## See Also

- [FAQ](./FAQ.md) - Frequently asked questions
- [Documentation Index](./INDEX.md) - All documentation
- [Examples](../src/lib/docs/examples/) - Code examples
- [GitHub Issues](https://github.com/harborgrid-justin/white-cross/issues) - Report bugs

---

<p align="center">
  <strong>Troubleshooting Guide</strong><br>
  Solutions to common issues
</p>
