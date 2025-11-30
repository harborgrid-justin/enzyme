# Selector Patterns

> Memoized selectors for optimal performance and referential stability

## Overview

Selectors are functions that extract and derive data from the store. The state module provides a comprehensive selector system with:

- **Primitive selectors** - Direct state access (no memoization needed)
- **Computed selectors** - Memoized derived state
- **Object selectors** - Stable object references with shallow equality
- **Parameterized selectors** - Dynamic selectors with LRU caching
- **Utility selectors** - Helper functions for common patterns

## Selector Strategy

### When to Use Each Type

**Primitive Selectors** - Select single values (strings, numbers, booleans)
```typescript
const locale = useStore(selectLocale);
```

**Object Selectors** - Select multiple values as an object
```typescript
const settings = useStore(selectDisplaySettings);
```

**Computed Selectors** - Derive state from dependencies
```typescript
const fullName = useStore(selectFullName);
```

**Parameterized Selectors** - Dynamic selections based on parameters
```typescript
const user = useStore(selectUserById('user-123'));
```

## Primitive Selectors

Primitive selectors select single values using reference equality (Object.is).

### UI State Selectors

```typescript
import {
  selectSidebarOpen,
  selectSidebarCollapsed,
  selectActiveModal,
  selectModalData,
  selectGlobalLoading,
  selectLoadingMessage,
  selectToasts,
  selectLayoutDensity,
  selectAnimationsEnabled,
  selectCommandPaletteOpen,
} from '@missionfabric-js/enzyme';

function Header() {
  const isLoading = useStore(selectGlobalLoading);
  const loadingMessage = useStore(selectLoadingMessage);

  return (
    <header>
      {isLoading && <Spinner message={loadingMessage} />}
    </header>
  );
}
```

### Session State Selectors

```typescript
import {
  selectSessionId,
  selectIsSessionActive,
  selectLastActivity,
  selectSessionStartedAt,
  selectSessionExpiresAt,
  selectActivityTimeoutMs,
  selectNavigationHistory,
  selectDeviceId,
  selectBrowserTabId,
} from '@missionfabric-js/enzyme';

function SessionInfo() {
  const sessionId = useStore(selectSessionId);
  const isActive = useStore(selectIsSessionActive);

  return (
    <div>
      <p>Session: {sessionId || 'None'}</p>
      <p>Status: {isActive ? 'Active' : 'Inactive'}</p>
    </div>
  );
}
```

### Settings State Selectors

```typescript
import {
  selectLocale,
  selectTimezone,
  selectDateFormat,
  selectTimeFormat,
  selectTheme,
  selectNotificationsEnabled,
  selectReducedMotion,
  selectHighContrast,
  selectFontSize,
} from '@missionfabric-js/enzyme';

function LocaleDisplay() {
  const locale = useStore(selectLocale);
  const timezone = useStore(selectTimezone);

  return (
    <div>
      <p>Locale: {locale}</p>
      <p>Timezone: {timezone}</p>
    </div>
  );
}
```

## Computed Selectors

Computed selectors derive state from dependencies and memoize results.

### Boolean Computed Selectors

```typescript
import {
  selectIsModalOpen,
  selectHasModalStack,
  selectHasToasts,
} from '@missionfabric-js/enzyme';

function App() {
  const hasModal = useStore(selectIsModalOpen);
  const hasStack = useStore(selectHasModalStack);

  return (
    <div>
      {hasModal && <ModalOverlay />}
      {hasStack && <BackButton />}
    </div>
  );
}
```

### Count Selectors

```typescript
import {
  selectToastCount,
  selectModalStackDepth,
  selectNavigationHistoryLength,
} from '@missionfabric-js/enzyme';

function NotificationBadge() {
  const count = useStore(selectToastCount);

  if (count === 0) return null;

  return <Badge count={count} />;
}
```

### Navigation Selectors

```typescript
import { selectLastVisitedPath } from '@missionfabric-js/enzyme';

function BackButton() {
  const lastPath = useStore(selectLastVisitedPath);

  if (!lastPath) return null;

  return (
    <button onClick={() => navigate(lastPath)}>
      Back to {lastPath}
    </button>
  );
}
```

### Time-Based Selectors (Deprecated)

```typescript
import {
  selectSessionDuration,
  selectTimeUntilExpiry,
  selectIsSessionExpired,
} from '@missionfabric-js/enzyme';

// ⚠️ Deprecated: Use hooks instead
// These selectors use Date.now() which breaks memoization

// ✅ Use hooks instead:
import {
  useSessionDuration,
  useTimeUntilExpiry,
  useIsSessionExpired,
} from '@missionfabric-js/enzyme';
```

**Why deprecated:**

These selectors use `Date.now()` in the combiner function, which returns a new value on every call, defeating the purpose of memoization. Use the corresponding hooks instead for proper time-based calculations with intervals.

## Object Selectors

Object selectors return stable object references using shallow equality.

### Display Settings

```typescript
import { selectDisplaySettings } from '@missionfabric-js/enzyme';

function DateFormatter({ date }: { date: Date }) {
  const { locale, timezone, dateFormat, timeFormat } = useStore(
    selectDisplaySettings
  );

  const formatted = formatDate(date, {
    locale,
    timezone,
    pattern: dateFormat,
  });

  return <time>{formatted}</time>;
}
```

**Returns:**

```typescript
{
  locale: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  theme: 'light' | 'dark' | 'system';
}
```

### Accessibility Settings

```typescript
import { selectAccessibilitySettings } from '@missionfabric-js/enzyme';

function AnimatedElement() {
  const {
    reducedMotion,
    highContrast,
    fontSize,
    keyboardShortcutsEnabled,
    animationsEnabled,
  } = useStore(selectAccessibilitySettings);

  return (
    <div
      className={cn({
        'reduce-motion': reducedMotion,
        'high-contrast': highContrast,
        [`font-${fontSize}`]: true,
      })}
      data-animations={animationsEnabled && !reducedMotion}
    >
      Content
    </div>
  );
}
```

### Notification Settings

```typescript
import { selectNotificationSettings } from '@missionfabric-js/enzyme';

function NotificationManager() {
  const {
    notificationsEnabled,
    soundEnabled,
    desktopNotifications,
    emailNotifications,
  } = useStore(selectNotificationSettings);

  const notify = (message: string) => {
    if (!notificationsEnabled) return;

    if (soundEnabled) playSound();
    if (desktopNotifications) showDesktopNotification(message);
    if (emailNotifications) queueEmailNotification(message);
  };

  return <button onClick={() => notify('Hello!')}>Notify</button>;
}
```

### Privacy Settings

```typescript
import { selectPrivacySettings } from '@missionfabric-js/enzyme';

function Analytics() {
  const { analyticsEnabled, crashReportingEnabled } = useStore(
    selectPrivacySettings
  );

  useEffect(() => {
    if (analyticsEnabled) {
      initializeAnalytics();
    }
    if (crashReportingEnabled) {
      initializeSentry();
    }
  }, [analyticsEnabled, crashReportingEnabled]);

  return null;
}
```

### UI Preferences

```typescript
import { selectUIPreferences } from '@missionfabric-js/enzyme';

function Layout() {
  const {
    sidebarOpen,
    sidebarCollapsed,
    layoutDensity,
    animationsEnabled,
  } = useStore(selectUIPreferences);

  return (
    <div
      className={cn('layout', {
        'sidebar-open': sidebarOpen,
        'sidebar-collapsed': sidebarCollapsed,
        [`density-${layoutDensity}`]: true,
        'no-animations': !animationsEnabled,
      })}
    >
      <Sidebar />
      <Content />
    </div>
  );
}
```

### Session Info

```typescript
import { selectSessionInfo } from '@missionfabric-js/enzyme';

function SessionDebug() {
  const {
    sessionId,
    isActive,
    startedAt,
    expiresAt,
    lastActivity,
    deviceId,
    browserTabId,
  } = useStore(selectSessionInfo);

  return (
    <dl>
      <dt>Session ID</dt>
      <dd>{sessionId}</dd>
      <dt>Active</dt>
      <dd>{isActive ? 'Yes' : 'No'}</dd>
      <dt>Started</dt>
      <dd>{startedAt ? new Date(startedAt).toISOString() : 'N/A'}</dd>
    </dl>
  );
}
```

### Loading State

```typescript
import { selectLoadingState } from '@missionfabric-js/enzyme';

function LoadingOverlay() {
  const { isLoading, message, progress } = useStore(selectLoadingState);

  if (!isLoading) return null;

  return (
    <div className="loading-overlay">
      <Spinner />
      {message && <p>{message}</p>}
      {progress !== null && <ProgressBar value={progress} />}
    </div>
  );
}
```

### Modal State

```typescript
import { selectModalState } from '@missionfabric-js/enzyme';

function ModalManager() {
  const { activeModal, modalData, stackDepth, hasStack } = useStore(
    selectModalState
  );

  return (
    <>
      {activeModal && (
        <Modal id={activeModal} data={modalData}>
          {hasStack && <BackButton />}
          <StackDepthIndicator depth={stackDepth} />
        </Modal>
      )}
    </>
  );
}
```

## Parameterized Selectors

Parameterized selectors create memoized selectors dynamically based on parameters.

### Feature Flag Selector

```typescript
import { selectFeatureFlag } from '@missionfabric-js/enzyme';

function FeatureGate({ flag, children }: { flag: string; children: React.ReactNode }) {
  const isEnabled = useStore(selectFeatureFlag(flag));

  if (!isEnabled) return null;

  return <>{children}</>;
}

// Usage
<FeatureGate flag="newDashboard">
  <NewDashboard />
</FeatureGate>
```

### Modal Open Selector

```typescript
import { selectIsSpecificModalOpen } from '@missionfabric-js/enzyme';

function SettingsModal() {
  const isOpen = useStore(selectIsSpecificModalOpen('settings'));

  if (!isOpen) return null;

  return <SettingsModalContent />;
}
```

### Toast by ID Selector

```typescript
import { selectToastById } from '@missionfabric-js/enzyme';

function ToastItem({ id }: { id: string }) {
  const toast = useStore(selectToastById(id));

  if (!toast) return null;

  return (
    <div className={`toast toast-${toast.type}`}>
      {toast.title && <h3>{toast.title}</h3>}
      <p>{toast.message}</p>
    </div>
  );
}
```

## Action Selectors

Action selectors return action functions. Use with shallow equality to prevent creating new objects.

```typescript
import { shallow } from 'zustand/shallow';
import {
  selectUIActions,
  selectSessionActions,
  selectSettingsActions,
} from '@missionfabric-js/enzyme';

function ToolbarActions() {
  const uiActions = useStore(selectUIActions, shallow);

  const {
    toggleSidebar,
    openModal,
    closeModal,
    addToast,
    setGlobalLoading,
  } = uiActions;

  return (
    <div>
      <button onClick={toggleSidebar}>Toggle</button>
      <button onClick={() => openModal('settings')}>Settings</button>
    </div>
  );
}
```

**Note:** Fixed bug in `selectSettingsActions` where `setNumberFormat` was incorrectly returning the value instead of the action function.

## Creating Custom Selectors

### Simple Computed Selector

```typescript
import { createSelector } from '@missionfabric-js/enzyme';

// Dependency selectors
const selectItems = (state: StoreState) => state.items;
const selectFilter = (state: StoreState) => state.filter;

// Memoized selector
const selectFilteredItems = createSelector(
  [selectItems, selectFilter],
  (items, filter) => items.filter(item => item.category === filter)
);

// Usage
const filteredItems = useStore(selectFilteredItems);
```

### Object Selector with Shallow Equality

```typescript
import { createObjectSelector } from '@missionfabric-js/enzyme';

const selectUserProfile = createObjectSelector((state: StoreState) => ({
  name: state.user.name,
  email: state.user.email,
  avatar: state.user.avatar,
  role: state.user.role,
}));

// Returns same reference when properties are equal
const profile = useStore(selectUserProfile);
```

### Array Selector

```typescript
import { createArraySelector } from '@missionfabric-js/enzyme';

const selectActiveUsers = createArraySelector((state: StoreState) =>
  state.users.filter(user => user.active)
);

// Returns same reference when array elements are the same
const activeUsers = useStore(selectActiveUsers);
```

### Parameterized Selector

```typescript
import { createParameterizedSelector } from '@missionfabric-js/enzyme';

const selectItemById = createParameterizedSelector(
  (id: string) => (state: StoreState) =>
    state.items.find(item => item.id === id)
);

// Each ID gets its own memoized selector
const item1 = useStore(selectItemById('item-1'));
const item2 = useStore(selectItemById('item-2'));
```

### Combining Selectors

```typescript
import { combineSelectors } from '@missionfabric-js/enzyme';

const selectUserDetails = combineSelectors({
  name: selectUserName,
  email: selectUserEmail,
  avatar: selectUserAvatar,
  settings: selectUserSettings,
});

// Returns stable reference when values don't change
const userDetails = useStore(selectUserDetails);
```

### Pick Selector

```typescript
import { pickSelector } from '@missionfabric-js/enzyme';

const selectUIState = pickSelector<StoreState>()(
  'sidebarOpen',
  'activeModal',
  'globalLoading',
  'toasts'
);

const uiState = useStore(selectUIState);
// { sidebarOpen: true, activeModal: 'settings', ... }
```

### Omit Selector

```typescript
import { omitSelector } from '@missionfabric-js/enzyme';

const selectPublicState = omitSelector<StoreState>()(
  '_hasHydrated',
  '_setHasHydrated',
  'password',
  'apiKey'
);

const publicState = useStore(selectPublicState);
```

## Selector Utilities

The `selectorUtils` object provides helper functions for common selector patterns.

### With Default Value

```typescript
import { selectorUtils } from '@missionfabric-js/enzyme';

const selectUserOrGuest = selectorUtils.withDefault(
  (state) => state.user,
  { name: 'Guest', email: '' }
);

const user = useStore(selectUserOrGuest);
// Never null/undefined, always has a value
```

### Predicate Selector

```typescript
import { selectorUtils } from '@missionfabric-js/enzyme';

const selectHasItems = selectorUtils.predicate(
  (state) => state.items,
  (items) => items.length > 0
);

const hasItems = useStore(selectHasItems); // boolean
```

### Map Selector

```typescript
import { selectorUtils } from '@missionfabric-js/enzyme';

const selectItemIds = selectorUtils.map(
  (state) => state.items,
  (items) => items.map(item => item.id)
);

const itemIds = useStore(selectItemIds);
```

### Filter Selector

```typescript
import { selectorUtils } from '@missionfabric-js/enzyme';

const selectActiveItems = selectorUtils.filter(
  (state) => state.items,
  (item) => item.active
);

const activeItems = useStore(selectActiveItems);
```

### Find Selector

```typescript
import { selectorUtils } from '@missionfabric-js/enzyme';

const selectFirstActive = selectorUtils.find(
  (state) => state.items,
  (item) => item.active
);

const firstActive = useStore(selectFirstActive); // Item | undefined
```

## Best Practices

### 1. Use Primitive Selectors for Single Values

```typescript
// ✅ Good - Reference equality, no memoization needed
const locale = useStore(selectLocale);

// ❌ Bad - Unnecessary memoization overhead
const locale = useStore(createSelector(
  [(s) => s.locale],
  (locale) => locale
));
```

### 2. Use Object Selectors for Multiple Values

```typescript
// ✅ Good - Stable reference with shallow equality
const settings = useStore(selectDisplaySettings);

// ❌ Bad - Creates new object on every render
const settings = useStore((s) => ({
  locale: s.locale,
  timezone: s.timezone,
}));
```

### 3. Avoid Computation in Inline Selectors

```typescript
// ✅ Good - Memoized computation
const filteredItems = useStore(selectFilteredItems);

// ❌ Bad - Recomputes on every render
const filteredItems = useStore((s) =>
  s.items.filter(item => item.active)
);
```

### 4. Use Parameterized Selectors for Dynamic Data

```typescript
// ✅ Good - Memoized per parameter
const user = useStore(selectUserById(userId));

// ❌ Bad - Creates new selector on every render
const user = useStore((s) =>
  s.users.find(u => u.id === userId)
);
```

### 5. Name Selectors Descriptively

```typescript
// ✅ Good - Clear intent
const selectActiveUserCount = createSelector(/*...*/);
const selectHasUnreadMessages = createSelector(/*...*/);

// ❌ Bad - Unclear purpose
const selector1 = createSelector(/*...*/);
const getData = createSelector(/*...*/);
```

## Performance Considerations

### Selector Overhead

**Primitive selectors:** No overhead (direct access)
**Memoized selectors:** Small overhead (dependency checking)
**Object selectors:** Small overhead (shallow comparison)
**Parameterized selectors:** Small overhead (LRU cache lookup)

### When to Optimize

Optimize selectors when:

- Selecting large data structures (arrays, objects)
- Performing expensive computations
- Selector is used in many components
- Profiling shows re-render issues

### When NOT to Optimize

Don't optimize when:

- Selecting primitive values (already optimal)
- Computation is trivial (< 1ms)
- Selector is used rarely
- Premature optimization

## Testing Selectors

### Unit Testing

```typescript
import { selectFilteredItems } from './selectors';

describe('selectFilteredItems', () => {
  it('should filter items by category', () => {
    const state = {
      items: [
        { id: '1', category: 'A' },
        { id: '2', category: 'B' },
        { id: '3', category: 'A' },
      ],
      filter: 'A',
    };

    const result = selectFilteredItems(state);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('3');
  });

  it('should memoize results', () => {
    const state = { items: [/*...*/], filter: 'A' };

    const result1 = selectFilteredItems(state);
    const result2 = selectFilteredItems(state);

    expect(result1).toBe(result2); // Same reference
  });
});
```

### Integration Testing

```typescript
import { renderHook } from '@testing-library/react';
import { useStore } from './store';
import { selectUserById } from './selectors';

describe('selectUserById', () => {
  it('should select user by ID', () => {
    const { result } = renderHook(() =>
      useStore(selectUserById('user-1'))
    );

    expect(result.current).toEqual({
      id: 'user-1',
      name: 'John Doe',
    });
  });
});
```

## Related Documentation

### State Management
- [README.md](./README.md) - State management overview
- [CORE.md](./CORE.md) - Store and slice factories
- [STORES.md](./STORES.md) - Store patterns
- [SLICES.md](./SLICES.md) - Slice creation
- [HOOKS.md](./HOOKS.md) - React hooks
- [SYNC.md](./SYNC.md) - Multi-tab synchronization
- [TYPES.md](./TYPES.md) - Type definitions

### Data & Queries
- [API Hooks](../api/HOOKS.md) - API hooks with selectors
- [Query Patterns](../api/README.md) - Data fetching strategies
- [React Hooks](../hooks/README.md) - Hook patterns and best practices

### Configuration & Routing
- [Config Hooks](../config/HOOKS.md) - Configuration value selectors
- [Config Registry](../config/REGISTRY.md) - Config value access patterns
- [Routing](../routing/README.md) - Route-based selectors

### State Management
- [Hooks](./HOOKS.md) - React hooks for state access
- [Core](./CORE.md) - Selector factory functions
- [Stores](./STORES.md) - Store architecture
- [Types](./TYPES.md) - TypeScript type definitions
- [README](./README.md) - State management overview

### Performance & Optimization
- [Performance Guide](../PERFORMANCE.md) - Selector optimization strategies
- [Architecture](../ARCHITECTURE.md) - System design and memoization patterns

### Advanced Topics
- [Slices](./SLICES.md) - Slice-specific selectors
- [Sync](./SYNC.md) - Multi-tab synchronization
