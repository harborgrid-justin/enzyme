# Hooks Quick Reference

Quick reference guide for Enzyme custom hooks.

## Import Syntax

```tsx
// Import individual hooks
import { useIsMounted, useBuffer, getNetworkInfo } from '@missionfabric-js/enzyme/hooks';

// Or import from specific modules
import { useAuth } from '@missionfabric-js/enzyme/auth';
import { useApiRequest } from '@missionfabric-js/enzyme/api';
```

## Common Patterns

### 1. Prevent Updates After Unmount

```tsx
import { useIsMounted } from '@missionfabric-js/enzyme/hooks';

function Component() {
  const isMounted = useIsMounted();

  const fetchData = async () => {
    const data = await api.get('/data');
    if (isMounted()) {  // Safe to update
      setData(data);
    }
  };
}
```

### 2. Stable Callbacks with Latest Values

```tsx
import { useLatestCallback } from '@missionfabric-js/enzyme/hooks';

function Form({ onSubmit }) {
  const [values, setValues] = useState({});

  // Never recreated, always uses latest values and onSubmit
  const handleSubmit = useLatestCallback(() => {
    onSubmit(values);
  });

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### 3. Batch Events

```tsx
import { useBuffer } from '@missionfabric-js/enzyme/hooks';

function Analytics() {
  const { add } = useBuffer({
    maxSize: 10,
    flushInterval: 5000,
    onFlush: (events) => sendToServer(events)
  });

  const trackClick = () => add({ type: 'click', timestamp: Date.now() });
}
```

### 4. Network-Aware Loading

```tsx
import { getNetworkInfo, isSlowConnection } from '@missionfabric-js/enzyme/hooks';

function ImageLoader() {
  const useLowQuality = isSlowConnection();

  return <img src={useLowQuality ? thumbUrl : fullUrl} />;
}
```

### 5. Adaptive Prefetching

```tsx
import { shouldAllowPrefetch } from '@missionfabric-js/enzyme/hooks';

function Link({ to, children }) {
  const handleHover = () => {
    if (shouldAllowPrefetch({ minConnectionQuality: '3g' })) {
      prefetchRoute(to);
    }
  };

  return <a onMouseEnter={handleHover}>{children}</a>;
}
```

## API Quick Reference

| Utility | Purpose | Returns |
|---------|---------|---------|
| `useIsMounted()` | Track mounted state | `() => boolean` |
| `useMountedState()` | Mounted state + guard | `{ isMounted, ifMounted }` |
| `useLatestRef(value)` | Latest value ref | `MutableRefObject<T>` |
| `useLatestCallback(fn)` | Stable callback | `T` (callback type) |
| `useBuffer(options)` | Batch data | `{ add, flush, clear, size }` |
| `getNetworkInfo()` | Network API data | `NetworkInformation` |
| `isSlowConnection()` | Slow check | `boolean` |
| `shouldAllowPrefetch()` | Prefetch decision | `boolean` |

## When to Use What

### useIsMounted
- ✅ Async operations (fetch, timers)
- ✅ WebSocket handlers
- ❌ Synchronous renders

### useLatestRef
- ✅ Debounced callbacks
- ✅ Event handlers in loops
- ❌ Values needed in JSX

### useBuffer
- ✅ Analytics batching
- ✅ Performance metrics
- ❌ Single operations

### Network Utils
- ✅ Adaptive loading
- ✅ Prefetch logic
- ❌ Critical features

## Common Gotchas

### ❌ Don't do this:
```tsx
const isMounted = useIsMounted();
if (isMounted) { ... }  // isMounted is a function!
```

### ✅ Do this:
```tsx
const isMounted = useIsMounted();
if (isMounted()) { ... }  // Call the function
```

---

### ❌ Don't do this:
```tsx
const latestRef = useLatestRef(value);
console.log(latestRef);  // Logs ref object
```

### ✅ Do this:
```tsx
const latestRef = useLatestRef(value);
console.log(latestRef.current);  // Access .current
```

---

### ❌ Don't do this:
```tsx
const { add } = useBuffer({ onFlush: flushFn });
// flushFn defined after useBuffer
```

### ✅ Do this:
```tsx
const flushFn = useCallback(...);
const { add } = useBuffer({ onFlush: flushFn });
```

## Performance Tips

1. **useIsMounted** - Very cheap, use liberally
2. **useLatestRef** - No re-renders, perfect for callbacks
3. **useBuffer** - Memory grows with buffer, set max size
4. **Network Utils** - Cache results when checking frequently

## Module-Specific Hooks

### Authentication
```tsx
import { useAuth, useHasRole, useHasPermission } from '@missionfabric-js/enzyme/auth';

const { user, isAuthenticated } = useAuth();
const isAdmin = useHasRole('admin');
const canEdit = useHasPermission('users:write');
```

### API Requests
```tsx
import { useApiRequest, useApiMutation } from '@missionfabric-js/enzyme/api';

const { data, isLoading } = useApiRequest({ url: '/api/users' });
const mutation = useApiMutation({ url: '/api/users', method: 'POST' });
```

### State Management
```tsx
import { useStore, useSelector } from '@missionfabric-js/enzyme/state';

const state = useStore(store);
const value = useSelector(store, selector);
```

### Performance
```tsx
import { usePerformanceMetrics, useMemoryPressure } from '@missionfabric-js/enzyme/performance';

const metrics = usePerformanceMetrics();
const { level } = useMemoryPressure();
```

### Routing
```tsx
import { useTypedNavigate, usePrefetchHandlers } from '@missionfabric-js/enzyme/routing';

const navigate = useTypedNavigate();
const handlers = usePrefetchHandlers('/dashboard');
```

## Related Documentation

### Hooks Documentation
- **[Hooks Overview](./README.md)** - Complete hooks module guide
- **[Migration Checklist](./MIGRATION_CHECKLIST.md)** - Migrate from manual implementations
- **[Hooks Reference](../HOOKS_REFERENCE.md)** - Complete hooks API reference

### Integration with Other Modules
- **[API Module](../api/README.md)** - API request hooks (useApiRequest, useApiMutation)
- **[API Hooks](../api/HOOKS.md)** - Detailed API hooks documentation
- **[State Management](../state/README.md)** - State hooks (useStore, useSelector)
- **[Performance](../performance/README.md)** - Performance monitoring hooks
- **[Queries Module](../queries/README.md)** - React Query integration hooks
- **[Shared Utilities](../shared/README.md)** - Shared hook utilities

### Reference
- **[Documentation Index](../INDEX.md)** - All documentation resources
- **[Performance Guide](../PERFORMANCE.md)** - Performance optimization
