# Hooks Migration Checklist

Use this checklist when migrating existing code to use Enzyme's custom hooks.

## Pre-Migration

- [ ] Review [Hooks README](/home/user/enzyme/docs/hooks/README.md)
- [ ] Review [Quick Reference](/home/user/enzyme/docs/hooks/QUICK_REFERENCE.md)
- [ ] Understand current code patterns
- [ ] Identify which hooks are applicable
- [ ] Set up testing environment

## Pattern Detection

### Check for Manual Mounted Tracking
```tsx
// OLD PATTERN - Search for:
const isMountedRef = useRef(false);
useEffect(() => {
  isMountedRef.current = true;
  return () => { isMountedRef.current = false; };
}, []);

// ✅ Migrate to:
import { useIsMounted } from '@missionfabric-js/enzyme/hooks';
const isMounted = useIsMounted();
```
- [ ] Search codebase for `isMountedRef` pattern
- [ ] Replace with `useIsMounted()`
- [ ] Update all `isMountedRef.current` to `isMounted()`

### Check for Callback Ref Pattern
```tsx
// OLD PATTERN - Search for:
const callbackRef = useRef(callback);
useEffect(() => {
  callbackRef.current = callback;
}, [callback]);

// ✅ Migrate to:
import { useLatestRef } from '@missionfabric-js/enzyme/hooks';
const callbackRef = useLatestRef(callback);
```
- [ ] Search for `useRef` + `useEffect` updating ref
- [ ] Replace with `useLatestRef()`
- [ ] Verify callback dependencies removed

### Check for Network API Access
```tsx
// OLD PATTERN - Search for:
const connection = navigator.connection;
const effectiveType = connection?.effectiveType;

// ✅ Migrate to:
import { getNetworkInfo } from '@missionfabric-js/enzyme/hooks';
const { effectiveType } = getNetworkInfo();
```
- [ ] Search for `navigator.connection`
- [ ] Replace with `getNetworkInfo()`
- [ ] Add fallback handling if needed

### Check for Manual Buffering
```tsx
// OLD PATTERN - Search for:
const buffer = useRef([]);
const flush = () => { /* manual flush logic */ };
// Complex timer and size management

// ✅ Migrate to:
import { useBuffer } from '@missionfabric-js/enzyme/hooks';
const { add, flush } = useBuffer({
  maxSize: 10,
  flushInterval: 5000,
  onFlush: sendData
});
```
- [ ] Search for manual buffer implementations
- [ ] Identify flush triggers (size, time)
- [ ] Replace with `useBuffer()` config
- [ ] Remove manual timer/size management

## Migration Steps

### 1. Update Imports
- [ ] Add Enzyme hook imports to files
- [ ] Remove any local duplicate implementations
- [ ] Update TypeScript types if needed

### 2. Replace Patterns
- [ ] Replace mounted state tracking
- [ ] Replace callback ref patterns
- [ ] Replace network checks
- [ ] Replace buffer implementations

### 3. Update Function Calls
- [ ] Change `isMountedRef.current` to `isMounted()`
- [ ] Change `callbackRef.current(args)` to `callbackRef.current(args)` (same, but from Enzyme)
- [ ] Update network quality checks
- [ ] Update buffer add/flush calls

### 4. Clean Up
- [ ] Remove duplicate implementations
- [ ] Remove unused imports
- [ ] Remove unused refs
- [ ] Remove manual cleanup code

### 5. Testing
- [ ] Run unit tests
- [ ] Test mounted state behavior
- [ ] Test async operations
- [ ] Test buffer flushing
- [ ] Test network-aware features
- [ ] Verify no memory leaks

## File-by-File Checklist

### For Each File:

- [ ] **Backup file** (git commit or copy)
- [ ] **Identify patterns** to migrate
- [ ] **Add imports** from Enzyme hooks
- [ ] **Replace code** with Enzyme hooks
- [ ] **Test changes** work correctly
- [ ] **Remove old code** that's no longer needed
- [ ] **Update tests** if needed
- [ ] **Run linter** to catch errors
- [ ] **Commit changes** with clear message

## Code Review Checklist

Before submitting PR:

### Correctness
- [ ] All imports are correct
- [ ] Function calls use correct syntax (`isMounted()` not `isMounted`)
- [ ] Refs accessed with `.current` where needed
- [ ] Buffer configuration matches old behavior
- [ ] Network checks have proper fallbacks

### Performance
- [ ] No unnecessary re-renders introduced
- [ ] Callback deps properly optimized
- [ ] Buffer sizes are reasonable
- [ ] Network checks not called too frequently

### Testing
- [ ] All tests pass
- [ ] New tests added if needed
- [ ] Edge cases covered
- [ ] Unmount behavior verified

### Documentation
- [ ] Code comments updated
- [ ] JSDoc updated if public API
- [ ] README updated if needed
- [ ] Migration notes in PR description

## Common Migration Patterns

### Pattern 1: Async Data Fetching
```tsx
// BEFORE
const isMountedRef = useRef(false);
useEffect(() => {
  isMountedRef.current = true;
  return () => { isMountedRef.current = false; };
}, []);

const fetchData = async () => {
  const data = await api.get('/data');
  if (isMountedRef.current) {
    setData(data);
  }
};

// AFTER
import { useIsMounted } from '@missionfabric-js/enzyme/hooks';

const isMounted = useIsMounted();

const fetchData = async () => {
  const data = await api.get('/data');
  if (isMounted()) {
    setData(data);
  }
};
```

### Pattern 2: Debounced Callback
```tsx
// BEFORE
const onSearchRef = useRef(onSearch);
useEffect(() => {
  onSearchRef.current = onSearch;
}, [onSearch]);

useEffect(() => {
  const timer = setTimeout(() => {
    onSearchRef.current(query);
  }, 300);
  return () => clearTimeout(timer);
}, [query]);

// AFTER
import { useLatestRef } from '@missionfabric-js/enzyme/hooks';

const onSearchRef = useLatestRef(onSearch);

useEffect(() => {
  const timer = setTimeout(() => {
    onSearchRef.current(query);
  }, 300);
  return () => clearTimeout(timer);
}, [query]); // onSearch no longer in deps!
```

### Pattern 3: Event Batching
```tsx
// BEFORE
const buffer = useRef([]);
const timerRef = useRef();

const add = (event) => {
  buffer.current.push(event);

  if (buffer.current.length >= 10) {
    flush();
  }

  if (!timerRef.current) {
    timerRef.current = setTimeout(flush, 5000);
  }
};

const flush = () => {
  sendEvents(buffer.current);
  buffer.current = [];
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
};

useEffect(() => {
  return () => {
    flush();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };
}, []);

// AFTER
import { useBuffer } from '@missionfabric-js/enzyme/hooks';

const { add } = useBuffer({
  maxSize: 10,
  flushInterval: 5000,
  onFlush: sendEvents
});
```

### Pattern 4: Network-Aware Features
```tsx
// BEFORE
const getConnection = () => {
  if (typeof navigator === 'undefined') return null;
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection;
};

const connection = getConnection();
const isSlowNetwork = connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g';

// AFTER
import { isSlowConnection } from '@missionfabric-js/enzyme/hooks';

const isSlowNetwork = isSlowConnection();
```

## Rollback Plan

If issues arise:

1. **Keep git history** - Each migration should be a separate commit
2. **Revert specific files** - Can rollback individual changes
3. **Feature flags** - Use flags to toggle new vs old implementation
4. **Gradual rollout** - Migrate less critical code first

## Success Criteria

Migration is complete when:

- [ ] All identified patterns migrated
- [ ] All tests passing
- [ ] No console warnings
- [ ] No memory leaks detected
- [ ] Performance metrics unchanged or improved
- [ ] Code review approved
- [ ] Documentation updated

## Related Documentation

### Hooks Documentation
- **[Hooks Overview](./README.md)** - Complete hooks module guide
- **[Quick Reference](./QUICK_REFERENCE.md)** - Quick API lookup for all hooks
- **[Hooks Reference](../HOOKS_REFERENCE.md)** - Complete hooks API reference

### Migration Resources
- **[State Management](../state/README.md)** - State hooks migration
- **[API Module](../api/README.md)** - API hooks migration
- **[Performance](../performance/README.md)** - Performance hooks migration

### Reference
- **[Documentation Index](../INDEX.md)** - All documentation resources
- **[Library Overview](../../src/lib/README.md)** - Library overview and setup
