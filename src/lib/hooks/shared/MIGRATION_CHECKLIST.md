# Migration Checklist

Use this checklist when migrating existing code to use the new shared utilities.

## Pre-Migration

- [ ] Review [Shared Utilities README](./README.md)
- [ ] Review [Quick Reference](./QUICK_REFERENCE.md)
- [ ] Understand current code patterns
- [ ] Identify which utilities are applicable
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
import { useIsMounted } from '@/lib/hooks/shared';
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
import { useLatestRef } from '@/lib/hooks/shared';
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
import { getNetworkInfo } from '@/lib/hooks/shared';
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
import { useBuffer } from '@/lib/hooks/shared';
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
- [ ] Add shared utility imports to files
- [ ] Remove any local duplicate implementations
- [ ] Update TypeScript types if needed

### 2. Replace Patterns
- [ ] Replace mounted state tracking
- [ ] Replace callback ref patterns  
- [ ] Replace network checks
- [ ] Replace buffer implementations

### 3. Update Function Calls
- [ ] Change `isMountedRef.current` to `isMounted()`
- [ ] Change `callbackRef.current(args)` to `callbackRef.current(args)` (same, but from shared)
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
- [ ] **Add imports** from shared utilities
- [ ] **Replace code** with shared utilities
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
import { useIsMounted } from '@/lib/hooks/shared';

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
import { useLatestRef } from '@/lib/hooks/shared';

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
import { useBuffer } from '@/lib/hooks/shared';

const { add } = useBuffer({
  maxSize: 10,
  flushInterval: 5000,
  onFlush: sendEvents
});
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

## Support

Questions? See:
- [Shared Utilities README](./README.md)
- [Quick Reference](./QUICK_REFERENCE.md)
- [Documentation Index](../../docs/INDEX.md) - All documentation resources
- [README](../../README.md) - Library overview
