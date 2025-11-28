# Shared Hook Utilities - Quick Reference

## Import Syntax

```tsx
// Import individual utilities
import { useIsMounted, useBuffer, getNetworkInfo } from '@/lib/hooks/shared';

// Or import from main hooks index
import { useIsMounted, useBuffer } from '@/lib/hooks';
```

## Common Patterns

### 1. Prevent Updates After Unmount

```tsx
import { useIsMounted } from '@/lib/hooks/shared';

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
import { useLatestCallback } from '@/lib/hooks/shared';

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
import { useBuffer } from '@/lib/hooks/shared';

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
import { getNetworkInfo, isSlowConnection } from '@/lib/hooks/shared';

function ImageLoader() {
  const useLowQuality = isSlowConnection();
  
  return <img src={useLowQuality ? thumbUrl : fullUrl} />;
}
```

### 5. Adaptive Prefetching

```tsx
import { shouldAllowPrefetch } from '@/lib/hooks/shared';

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

## See Also

- [Full Documentation](./README.md)
- [Migration Checklist](./MIGRATION_CHECKLIST.md)
- [Documentation Index](../../docs/INDEX.md) - All documentation resources
- [Performance Guide](../../docs/PERFORMANCE.md) - Performance optimization
