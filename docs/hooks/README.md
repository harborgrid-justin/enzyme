# Custom Hooks Reference

Comprehensive guide to all custom hooks provided by Enzyme for React applications.

## Table of Contents

- [Overview](#overview)
- [Shared Hook Utilities](#shared-hook-utilities)
- [State Management Hooks](#state-management-hooks)
- [Performance Hooks](#performance-hooks)
- [Network Hooks](#network-hooks)
- [Buffer and Batching Hooks](#buffer-and-batching-hooks)
- [Best Practices](#best-practices)
- [Related Documentation](#related-documentation)

## Overview

Enzyme provides a comprehensive set of custom React hooks designed for enterprise-grade applications. These hooks handle common patterns like mounted state tracking, stable callbacks, network-aware features, and data batching.

### Design Principles

1. **Composable**: Hooks can be combined to create complex behaviors
2. **Type-Safe**: Full TypeScript support with strict typing
3. **Performance-Optimized**: Minimal re-renders and memory footprint
4. **SSR-Compatible**: Works in server-side rendering environments
5. **Well-Tested**: Comprehensive test coverage

## Shared Hook Utilities

Foundational utilities used across multiple hooks in the application. These provide patterns for common React development needs.

### Mounted State Tracking

#### `useIsMounted()`

Tracks whether a component is currently mounted. Essential for preventing memory leaks and "Can't perform a React state update on an unmounted component" warnings.

**Returns:** `() => boolean` - Function that returns true if component is mounted

**Example:**
```tsx
import { useIsMounted } from '@missionfabric-js/enzyme/hooks';

function DataFetcher() {
  const isMounted = useIsMounted();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData().then(result => {
      if (isMounted()) {
        setData(result);
      }
    });
  }, [isMounted]);

  return <div>{data}</div>;
}
```

**Use Cases:**
- Async operations (data fetching, timers)
- Event handlers with delayed callbacks
- WebSocket/SSE message handlers
- Animation callbacks

#### `useMountedState()`

Provides both a check function and a guard wrapper for mounted state.

**Returns:** `{ isMounted: () => boolean, ifMounted: <T>(fn: () => T) => T | undefined }`

**Example:**
```tsx
import { useMountedState } from '@missionfabric-js/enzyme/hooks';

function AsyncComponent() {
  const { isMounted, ifMounted } = useMountedState();
  const [value, setValue] = useState(0);

  const updateValue = async () => {
    const result = await fetchValue();

    // Option 1: Direct check
    if (isMounted()) {
      setValue(result);
    }

    // Option 2: Guard wrapper
    ifMounted(() => setValue(result));
  };

  return <button onClick={updateValue}>Update</button>;
}
```

### Latest Value Refs

#### `useLatestRef<T>(value: T)`

Maintains a ref that always points to the latest value. Useful for accessing latest props/state in callbacks without recreating the callback.

**Parameters:**
- `value: T` - The value to keep updated in the ref

**Returns:** `MutableRefObject<T>` - Ref object containing the latest value

**Example:**
```tsx
import { useLatestRef } from '@missionfabric-js/enzyme/hooks';

function SearchInput({ onSearch }: { onSearch: (query: string) => void }) {
  const onSearchRef = useLatestRef(onSearch);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      // Always calls the latest onSearch callback
      onSearchRef.current(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]); // onSearch not in deps - no callback recreation

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
```

**Use Cases:**
- Debounced/throttled callbacks
- Event handlers in loops
- Effect cleanup functions
- Callbacks passed to child components

#### `useLatestCallback<T>(callback: T)`

Creates a stable callback reference that always uses latest values without recreating.

**Example:**
```tsx
import { useLatestCallback } from '@missionfabric-js/enzyme/hooks';

function Counter({ onIncrement }: { onIncrement: (n: number) => void }) {
  const [count, setCount] = useState(0);

  // Callback never recreated, but always uses latest count and onIncrement
  const handleClick = useLatestCallback(() => {
    const newCount = count + 1;
    setCount(newCount);
    onIncrement(newCount);
  });

  return <button onClick={handleClick}>Count: {count}</button>;
}
```

#### `useLatestRefs<T>(values: T)`

Provides refs for multiple values at once.

**Example:**
```tsx
import { useLatestRefs } from '@missionfabric-js/enzyme/hooks';

function Component({ userId, onSave }) {
  const [data, setData] = useState(null);
  const refs = useLatestRefs({ userId, onSave, data });

  useEffect(() => {
    const timer = setInterval(() => {
      // Access latest values without re-running effect
      console.log('Current user:', refs.current.userId);
      console.log('Current data:', refs.current.data);
    }, 1000);

    return () => clearInterval(timer);
  }, []); // No dependencies needed!

  return <div>{data}</div>;
}
```

## Network Hooks

Shared utilities for network information and quality detection. These functions work in both browser and SSR environments.

### `getNetworkInfo()`

Gets current network information from the browser's Network Information API.

**Returns:** `NetworkInformation`
```typescript
interface NetworkInformation {
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  downlink?: number;      // Mbps
  rtt?: number;           // milliseconds
  saveData?: boolean;     // User's data saver preference
}
```

**Example:**
```tsx
import { getNetworkInfo } from '@missionfabric-js/enzyme/hooks';

function NetworkIndicator() {
  const [network, setNetwork] = useState(getNetworkInfo());

  useEffect(() => {
    const interval = setInterval(() => {
      setNetwork(getNetworkInfo());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      Connection: {network.effectiveType}
      Speed: {network.downlink} Mbps
      RTT: {network.rtt}ms
    </div>
  );
}
```

### `meetsMinimumQuality(current, minimum)`

Checks if current connection meets minimum quality requirement.

**Parameters:**
- `current: ConnectionType` - Current connection type
- `minimum: ConnectionType` - Minimum required connection type

**Returns:** `boolean`

**Example:**
```tsx
import { getNetworkInfo, meetsMinimumQuality } from '@missionfabric-js/enzyme/hooks';

function VideoPlayer() {
  const network = getNetworkInfo();
  const canPlayHD = meetsMinimumQuality(network.effectiveType, '3g');

  return (
    <video src={canPlayHD ? 'hd-video.mp4' : 'sd-video.mp4'} />
  );
}
```

### `shouldAllowPrefetch(options)`

Determines if prefetching should proceed based on network conditions.

**Parameters:**
```typescript
{
  respectDataSaver?: boolean;      // Default: true
  minConnectionQuality?: ConnectionType; // Default: '2g'
}
```

**Returns:** `boolean`

**Example:**
```tsx
import { shouldAllowPrefetch } from '@missionfabric-js/enzyme/hooks';

function RouteLink({ to, children }) {
  const handleMouseEnter = () => {
    if (shouldAllowPrefetch({ minConnectionQuality: '3g' })) {
      prefetchRoute(to);
    }
  };

  return (
    <a href={to} onMouseEnter={handleMouseEnter}>
      {children}
    </a>
  );
}
```

### `isSlowConnection(threshold?)`

Checks if the connection is considered slow.

**Parameters:**
```typescript
{
  maxDownlink?: number;  // Default: 1.5 Mbps
  maxRtt?: number;       // Default: 300ms
}
```

**Returns:** `boolean`

**Example:**
```tsx
import { isSlowConnection } from '@missionfabric-js/enzyme/hooks';

function ImageGallery({ images }) {
  const useLowQuality = isSlowConnection();

  return (
    <div>
      {images.map(img => (
        <img
          key={img.id}
          src={useLowQuality ? img.thumbnail : img.fullSize}
          alt={img.alt}
        />
      ))}
    </div>
  );
}
```

## Buffer and Batching Hooks

Hooks for accumulating items and flushing based on size or time constraints.

### `useBuffer<T>(options)`

Generic buffering hook for accumulating items and flushing based on size or time.

**Parameters:**
```typescript
{
  maxSize?: number;          // Default: 10
  flushInterval?: number;    // Default: 5000ms
  onFlush?: (items: T[]) => void | Promise<void>;
  flushOnUnmount?: boolean;  // Default: true
  shouldFlush?: (buffer: T[]) => boolean;
}
```

**Returns:**
```typescript
{
  add: (item: T) => void;
  addMany: (items: T[]) => void;
  flush: () => void;
  clear: () => void;
  size: () => number;
  peek: () => readonly T[];
}
```

**Example:**
```tsx
import { useBuffer } from '@missionfabric-js/enzyme/hooks';

function AnalyticsTracker() {
  const { add, flush } = useBuffer({
    maxSize: 10,
    flushInterval: 5000,
    onFlush: async (events) => {
      await fetch('/api/analytics', {
        method: 'POST',
        body: JSON.stringify(events)
      });
    }
  });

  const trackClick = (event) => {
    add({
      type: 'click',
      target: event.target.id,
      timestamp: Date.now()
    });
  };

  return (
    <div>
      <button onClick={trackClick}>Track Me</button>
      <button onClick={flush}>Send Now</button>
    </div>
  );
}
```

**Use Cases:**
- Analytics event batching
- Performance metrics collection
- Log aggregation
- Bulk database operations
- Real-time data aggregation

### `useTimeWindowBuffer<T>(options)`

Flushes buffer at regular intervals regardless of size. Useful for time-series data.

**Example:**
```tsx
import { useTimeWindowBuffer } from '@missionfabric-js/enzyme/hooks';

function MetricsCollector() {
  const { add } = useTimeWindowBuffer({
    windowSize: 1000, // 1 second windows
    onFlush: (metrics) => {
      console.log(`${metrics.length} metrics in window`);
      sendMetrics(metrics);
    }
  });

  useEffect(() => {
    const interval = setInterval(() => {
      add({
        cpu: getCPUUsage(),
        memory: getMemoryUsage(),
        timestamp: Date.now()
      });
    }, 100);

    return () => clearInterval(interval);
  }, [add]);

  return <div>Collecting metrics...</div>;
}
```

### `useBatchBuffer<T>(options)`

Flushes only when buffer reaches max size (no time-based flushing).

**Example:**
```tsx
import { useBatchBuffer } from '@missionfabric-js/enzyme/hooks';

function BulkUploader() {
  const [pending, setPending] = useState(0);

  const { add, size } = useBatchBuffer({
    batchSize: 100,
    onFlush: async (batch) => {
      await bulkInsertRecords(batch);
      setPending(0);
    }
  });

  const handleFileSelect = (files) => {
    files.forEach(file => add(file));
    setPending(size());
  };

  return (
    <div>
      <input type="file" multiple onChange={handleFileSelect} />
      <p>Pending: {pending} (uploads every 100 files)</p>
    </div>
  );
}
```

## State Management Hooks

See [State Management Documentation](/home/user/enzyme/docs/state/README.md) for detailed information on state hooks.

## Performance Hooks

See [Performance Documentation](/home/user/enzyme/docs/performance/README.md) for detailed information on performance monitoring hooks.

## Best Practices

### When to Use Each Hook

**useIsMounted / useMountedState:**
- ✅ Async operations (fetch, timers, animations)
- ✅ Event handlers with async callbacks
- ✅ WebSocket/SSE message handlers
- ❌ Synchronous renders (unnecessary overhead)
- ❌ Already using React Query/SWR (handles this internally)

**useLatestRef / useLatestCallback:**
- ✅ Debounced/throttled callbacks
- ✅ Event handlers in loops
- ✅ Effect cleanup functions
- ✅ Callbacks passed to child components
- ❌ Simple event handlers (use inline instead)
- ❌ Values needed in JSX (use state instead)

**Network Utilities:**
- ✅ Adaptive loading (images, videos, data)
- ✅ Prefetch logic
- ✅ Progressive enhancement
- ❌ Critical application logic (always have fallbacks)
- ❌ SSR (check for browser environment first)

**Buffer Hooks:**
- ✅ Analytics/telemetry
- ✅ Batch API calls
- ✅ Debouncing multiple rapid updates
- ✅ Performance metrics collection
- ❌ Single operations (unnecessary complexity)
- ❌ Real-time requirements (adds latency)

### Performance Considerations

1. **Mounted State Tracking:**
   - Minimal overhead (single ref + effect)
   - Safe to use in most components
   - Consider cleanup order in complex components

2. **Latest Refs:**
   - Very lightweight (ref updates don't trigger renders)
   - Prefer over recreating callbacks in deps
   - Don't overuse - sometimes recreating is clearer

3. **Network Utilities:**
   - API check is fast but not free
   - Cache results when possible
   - Provide fallbacks for unsupported browsers

4. **Buffers:**
   - Memory grows with buffer size
   - Choose appropriate flush intervals
   - Consider max buffer size limits
   - Clean up on unmount (automatic)

### Testing Hooks

All hooks are designed to be testable:

```tsx
import { renderHook, act } from '@testing-library/react';
import { useIsMounted, useBuffer } from '@missionfabric-js/enzyme/hooks';

describe('useIsMounted', () => {
  it('returns true when mounted', () => {
    const { result } = renderHook(() => useIsMounted());
    expect(result.current()).toBe(true);
  });

  it('returns false after unmount', () => {
    const { result, unmount } = renderHook(() => useIsMounted());
    unmount();
    expect(result.current()).toBe(false);
  });
});

describe('useBuffer', () => {
  it('flushes when max size reached', () => {
    const onFlush = jest.fn();
    const { result } = renderHook(() =>
      useBuffer({ maxSize: 3, flushInterval: 0, onFlush })
    );

    act(() => {
      result.current.add(1);
      result.current.add(2);
      result.current.add(3);
    });

    expect(onFlush).toHaveBeenCalledWith([1, 2, 3]);
  });
});
```

## Related Documentation

### Main Documentation
- [Documentation Index](/home/user/enzyme/docs/INDEX.md) - All documentation resources
- [Library Overview](/home/user/enzyme/src/lib/README.md) - Library overview and getting started
- [Architecture Guide](/home/user/enzyme/docs/ARCHITECTURE.md) - System architecture
- [Performance Guide](/home/user/enzyme/docs/PERFORMANCE.md) - Performance monitoring

### Hook References
- [Quick Reference](/home/user/enzyme/docs/hooks/QUICK_REFERENCE.md) - Quick API lookup
- [Migration Checklist](/home/user/enzyme/docs/hooks/MIGRATION_CHECKLIST.md) - Migration guide from manual implementations

### Related Modules
- [State Management](/home/user/enzyme/docs/state/README.md) - State hooks
- [API](/home/user/enzyme/docs/api/README.md) - API request hooks
- [Performance](/home/user/enzyme/docs/performance/README.md) - Performance monitoring hooks
- [Shared Utilities](/home/user/enzyme/docs/shared/README.md) - Shared utility functions

### Integration Guides
- [Integration Patterns](/home/user/enzyme/docs/integration/README.md) - How modules work together

## Contributing

When adding new hooks:

1. **Ensure it's truly reusable** - Used by 2+ features
2. **Add comprehensive JSDoc** - Document all parameters and return values
3. **Include examples** - Show real-world usage
4. **Write tests** - Cover edge cases and unmount behavior
5. **Update this README** - Keep documentation current
