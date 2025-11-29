# Troubleshooting Guide

Common issues and solutions for @missionfabric-js/enzyme.

## Table of Contents

- [Build Errors](#build-errors)
- [Runtime Errors](#runtime-errors)
- [Type Errors](#type-errors)
- [Performance Issues](#performance-issues)
- [Configuration Problems](#configuration-problems)
- [Integration Issues](#integration-issues)
- [Development Issues](#development-issues)

---

## Build Errors

### Module not found errors

**Problem:**
```
Module not found: Can't resolve '@missionfabric-js/enzyme/xyz'
```

**Solutions:**
1. Check that the import path is correct:
   ```typescript
   // Correct
   import { useAuth } from '@missionfabric-js/enzyme/auth';

   // Incorrect
   import { useAuth } from '@missionfabric-js/enzyme/lib/auth';
   ```

2. Verify the module is exported in package.json:
   ```json
   {
     "exports": {
       "./auth": {
         "types": "./dist/lib/auth/index.d.ts",
         "import": "./dist/lib/auth/index.mjs"
       }
     }
   }
   ```

3. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### TypeScript compilation errors

**Problem:**
```
TS2307: Cannot find module '@missionfabric-js/enzyme' or its corresponding type declarations
```

**Solutions:**
1. Ensure enzyme is installed as a dependency:
   ```bash
   npm install @missionfabric-js/enzyme
   ```

2. Check TypeScript configuration includes node_modules:
   ```json
   {
     "compilerOptions": {
       "moduleResolution": "bundler",
       "types": ["node"]
     }
   }
   ```

3. Restart TypeScript server in your IDE

### Vite build errors

**Problem:**
```
Error: Could not resolve entry module
```

**Solutions:**
1. Ensure entry point exists in vite.config.ts:
   ```typescript
   export default defineConfig({
     build: {
       lib: {
         entry: './src/index.ts',
       },
     },
   });
   ```

2. Check that all imports are valid
3. Clear Vite cache:
   ```bash
   rm -rf node_modules/.vite
   ```

---

## Runtime Errors

### "Cannot read property of undefined"

**Problem:**
```
TypeError: Cannot read property 'user' of undefined
```

**Solutions:**
1. Check that providers are wrapping your components:
   ```typescript
   // Correct
   <AuthProvider>
     <App />
   </AuthProvider>

   // Incorrect - useAuth() will fail
   <App />
   ```

2. Use optional chaining:
   ```typescript
   const user = useAuth()?.user;
   ```

3. Add loading states:
   ```typescript
   const { user, isLoading } = useAuth();

   if (isLoading) return <Spinner />;
   if (!user) return <Login />;
   ```

### "Hook called outside of component"

**Problem:**
```
Error: Invalid hook call. Hooks can only be called inside of the body of a function component
```

**Solutions:**
1. Only call hooks at the top level of function components:
   ```typescript
   // Correct
   function MyComponent() {
     const auth = useAuth();
     return <div>{auth.user?.name}</div>;
   }

   // Incorrect
   function handleClick() {
     const auth = useAuth(); // ❌ Can't call hooks in event handlers
   }
   ```

2. Don't call hooks conditionally:
   ```typescript
   // Correct
   const data = useApiRequest({ ... });
   if (condition) {
     // use data
   }

   // Incorrect
   if (condition) {
     const data = useApiRequest({ ... }); // ❌
   }
   ```

### "Maximum update depth exceeded"

**Problem:**
```
Error: Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate
```

**Solutions:**
1. Add dependencies to useEffect:
   ```typescript
   // Incorrect
   useEffect(() => {
     setCount(count + 1); // ❌ Infinite loop
   });

   // Correct
   useEffect(() => {
     setCount(count + 1);
   }, []); // Empty deps = run once
   ```

2. Use functional state updates:
   ```typescript
   // Correct
   setCount((prev) => prev + 1);
   ```

3. Check for circular dependencies in state updates

### Network errors

**Problem:**
```
NetworkError: Failed to fetch
```

**Solutions:**
1. Check CORS configuration on server:
   ```javascript
   // Express.js example
   app.use(cors({
     origin: 'http://localhost:5173',
     credentials: true,
   }));
   ```

2. Verify API URL is correct:
   ```typescript
   const apiClient = createApiClient({
     baseURL: import.meta.env.VITE_API_URL,
   });
   ```

3. Check network tab in DevTools for actual error

4. Use error recovery:
   ```typescript
   const { data, error, retry } = useAsyncWithRecovery(
     () => fetch('/api/data'),
     { maxRetries: 3 }
   );
   ```

---

## Type Errors

### Generic type errors

**Problem:**
```
TS2345: Argument of type 'string' is not assignable to parameter of type 'User'
```

**Solutions:**
1. Provide explicit type parameters:
   ```typescript
   // Correct
   const { data } = useApiRequest<User>({
     url: '/users/1',
     queryKey: ['users', '1'],
   });

   // Data is typed as User
   ```

2. Use type assertions carefully:
   ```typescript
   const user = data as User; // Use sparingly
   ```

3. Define proper interfaces:
   ```typescript
   interface User {
     id: string;
     name: string;
     email: string;
   }
   ```

### Strict null checks

**Problem:**
```
TS2531: Object is possibly 'null'
```

**Solutions:**
1. Use optional chaining:
   ```typescript
   const name = user?.name;
   ```

2. Use nullish coalescing:
   ```typescript
   const name = user?.name ?? 'Anonymous';
   ```

3. Add type guards:
   ```typescript
   if (!user) return null;
   return <div>{user.name}</div>;
   ```

---

## Performance Issues

### Slow page loads

**Problem:**
Pages take a long time to load

**Solutions:**
1. Enable code splitting:
   ```typescript
   const Dashboard = lazy(() => import('./Dashboard'));
   ```

2. Implement prefetching:
   ```typescript
   const { onMouseEnter } = usePrefetchOnHover('/dashboard');
   ```

3. Check bundle size:
   ```bash
   npm run build
   # Check dist/ folder sizes
   ```

4. Use Performance Observatory:
   ```typescript
   const { vitals, violations } = usePerformanceObservatory();
   console.log('Performance issues:', violations);
   ```

### Memory leaks

**Problem:**
Browser memory usage keeps increasing

**Solutions:**
1. Clean up subscriptions:
   ```typescript
   useEffect(() => {
     const subscription = stream.subscribe(handler);

     return () => {
       subscription.unsubscribe(); // Cleanup
     };
   }, []);
   ```

2. Use cleanup hooks:
   ```typescript
   const controller = useAbortController();

   useEffect(() => {
     fetch('/api/data', { signal: controller.signal });
   }, []);
   // Auto-cleanup on unmount
   ```

3. Check for detached DOM nodes in DevTools Memory profiler

### Excessive re-renders

**Problem:**
Components re-render too often

**Solutions:**
1. Use React.memo:
   ```typescript
   const ExpensiveComponent = React.memo(({ data }) => {
     // Component logic
   });
   ```

2. Use useCallback:
   ```typescript
   const handleClick = useCallback(() => {
     // Handler logic
   }, [/* dependencies */]);
   ```

3. Use useMemo:
   ```typescript
   const expensiveValue = useMemo(() => {
     return computeExpensiveValue(data);
   }, [data]);
   ```

4. Check React DevTools Profiler

---

## Configuration Problems

### Environment variables not loading

**Problem:**
```
undefined is not a valid API URL
```

**Solutions:**
1. Ensure .env file exists and is named correctly:
   ```bash
   # .env.local
   VITE_API_URL=http://localhost:3000
   ```

2. Prefix variables with VITE_:
   ```bash
   # Correct
   VITE_API_URL=...

   # Incorrect
   API_URL=...  # Won't be loaded
   ```

3. Restart dev server after changing .env

4. Use requireEnvVar for required variables:
   ```typescript
   const apiUrl = requireEnvVar('VITE_API_URL');
   ```

### Feature flags not working

**Problem:**
Feature flags always return false

**Solutions:**
1. Ensure FeatureFlagProvider is wrapping app:
   ```typescript
   <FeatureFlagProvider flags={flags}>
     <App />
   </FeatureFlagProvider>
   ```

2. Check flag key matches exactly:
   ```typescript
   // Correct
   useFeatureFlag('new-dashboard')

   // Incorrect
   useFeatureFlag('newDashboard') // Different key
   ```

3. Verify flags object structure:
   ```typescript
   const flags = {
     'new-dashboard': true,
     'dark-mode': false,
   };
   ```

---

## Integration Issues

### React Query cache not updating

**Problem:**
Query data doesn't update after mutation

**Solutions:**
1. Invalidate queries after mutation:
   ```typescript
   const { mutate } = useApiMutation({
     onSuccess: () => {
       queryClient.invalidateQueries(['users']);
     },
   });
   ```

2. Use optimistic updates:
   ```typescript
   const { mutate } = useApiMutation({
     onMutate: async (newData) => {
       await queryClient.cancelQueries(['users']);
       const previous = queryClient.getQueryData(['users']);

       queryClient.setQueryData(['users'], (old) =>
         [...old, newData]
       );

       return { previous };
     },
   });
   ```

### Authentication state not persisting

**Problem:**
User is logged out after page refresh

**Solutions:**
1. Enable state persistence:
   ```typescript
   const store = createAppStore((set) => ({
     // State
   }), {
     persist: {
       name: 'app-storage',
     },
   });
   ```

2. Use secure storage for tokens:
   ```typescript
   const storage = createSecureLocalStorage('auth-tokens');
   storage.set('tokens', JSON.stringify(tokens));
   ```

3. Implement token refresh:
   ```typescript
   useEffect(() => {
     const refreshInterval = setInterval(() => {
       refreshAccessToken();
     }, 14 * 60 * 1000); // Refresh every 14 minutes

     return () => clearInterval(refreshInterval);
   }, []);
   ```

### WebSocket connection issues

**Problem:**
WebSocket disconnects frequently

**Solutions:**
1. Enable automatic reconnection:
   ```typescript
   const client = createWebSocketClient(url, {
     reconnect: true,
     reconnectInterval: 5000,
     maxReconnectAttempts: 10,
   });
   ```

2. Implement heartbeat:
   ```typescript
   useEffect(() => {
     const interval = setInterval(() => {
       client.send({ type: 'ping' });
     }, 30000);

     return () => clearInterval(interval);
   }, []);
   ```

3. Handle connection state:
   ```typescript
   const { isConnected } = useRealtimeConnection();

   useEffect(() => {
     if (!isConnected) {
       showNotification('Reconnecting...');
     }
   }, [isConnected]);
   ```

---

## Development Issues

### Hot reload not working

**Problem:**
Changes don't reflect without manual refresh

**Solutions:**
1. Check Vite configuration:
   ```typescript
   export default defineConfig({
     server: {
       hmr: {
         overlay: true,
       },
     },
   });
   ```

2. Ensure files are in src/ directory

3. Restart dev server

4. Check for syntax errors in console

### ESLint errors

**Problem:**
```
'React' must be in scope when using JSX
```

**Solutions:**
1. Modern React doesn't require React import:
   ```typescript
   // Correct (React 17+)
   function Component() {
     return <div>Hello</div>;
   }
   ```

2. Update ESLint config:
   ```json
   {
     "extends": [
       "plugin:react/recommended",
       "plugin:react/jsx-runtime"
     ]
   }
   ```

### Test failures

**Problem:**
Tests fail with "not wrapped in act()"

**Solutions:**
1. Use waitFor:
   ```typescript
   import { waitFor } from '@testing-library/react';

   await waitFor(() => {
     expect(screen.getByText('Loaded')).toBeInTheDocument();
   });
   ```

2. Use renderHook for hooks:
   ```typescript
   import { renderHook } from '@testing-library/react';

   const { result } = renderHook(() => useMyHook());
   ```

3. Wrap async actions in act:
   ```typescript
   import { act } from '@testing-library/react';

   await act(async () => {
     await someAsyncFunction();
   });
   ```

---

## Getting More Help

If your issue isn't covered here:

1. Check the [FAQ](../FAQ.md)
2. Search [GitHub Issues](https://github.com/harborgrid-justin/enzyme/issues)
3. Ask in [GitHub Discussions](https://github.com/harborgrid-justin/enzyme/discussions)
4. Review [Examples](../GETTING_STARTED.md#examples)

---

**Last Updated:** 2025-11-29
**Version:** 1.0.5
