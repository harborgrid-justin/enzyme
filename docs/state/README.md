# State Management

> Enterprise-grade Zustand-based state management with production middleware stack

## Overview

The `@missionfabric-js/enzyme` state management system is built on [Zustand](https://github.com/pmndrs/zustand) and provides a complete, production-ready state management solution with:

- **Immer** for immutable updates with mutable syntax
- **DevTools** integration with named actions
- **Persistence** with versioned migrations
- **Multi-tab sync** via BroadcastChannel API
- **Memoized selectors** for optimal performance
- **Type-safe slices** with automatic action naming
- **Feature stores** for modular architecture

## Quick Start

### Basic Usage

```typescript
import { useStore } from '@missionfabric-js/enzyme';

function MyComponent() {
  // Select primitive state (reference equality)
  const locale = useStore((state) => state.locale);

  // Select actions (stable references)
  const setLocale = useStore((state) => state.setLocale);

  // Update state
  const handleChange = () => {
    setLocale('fr-FR');
  };

  return <div>{locale}</div>;
}
```

### Using Convenience Hooks

```typescript
import { useSidebar, useModal, useLoading } from '@missionfabric-js/enzyme';

function Navigation() {
  const { isOpen, toggle, setCollapsed } = useSidebar();
  const { open: openModal } = useModal();
  const { start: startLoading, stop: stopLoading } = useLoading();

  return (
    <nav>
      <button onClick={toggle}>Toggle Sidebar</button>
      <button onClick={() => openModal('settings')}>Settings</button>
    </nav>
  );
}
```

### Using Memoized Selectors

```typescript
import { useStore, selectDisplaySettings } from '@missionfabric-js/enzyme';

function SettingsPanel() {
  // Memoized object selector - stable reference
  const displaySettings = useStore(selectDisplaySettings);

  return (
    <div>
      <p>Locale: {displaySettings.locale}</p>
      <p>Timezone: {displaySettings.timezone}</p>
      <p>Theme: {displaySettings.theme}</p>
    </div>
  );
}
```

## Architecture

### Global Store

The global store combines three main slices:

```typescript
type StoreState = UISlice & SessionSlice & SettingsSlice & HydrationState;
```

**UI Slice** - Sidebar, modals, loading, toasts, layout
**Session Slice** - Client-side session tracking, navigation history
**Settings Slice** - User preferences, locale, accessibility, feature flags

### Middleware Stack

Applied from inside-out:

1. **Immer** - Write "mutating" logic that produces immutable updates
2. **DevTools** - Redux DevTools integration with named actions
3. **SubscribeWithSelector** - Granular subscriptions for performance
4. **Persist** - localStorage persistence with version migrations

### Store Pattern

```
┌─────────────────────────────────────────┐
│          Application Code               │
│   Components, Hooks, Utilities          │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         useStore Hook                   │
│   Select state with memoization         │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│       Zustand Store (Global)            │
│  ┌─────────────────────────────────┐   │
│  │  UI Slice                       │   │
│  │  - Sidebar, Modals, Toasts      │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Session Slice                  │   │
│  │  - Session, Activity, History   │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Settings Slice                 │   │
│  │  - Preferences, Locale, A11y    │   │
│  └─────────────────────────────────┘   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│      Middleware Stack                   │
│  Immer → DevTools → Subscribe → Persist │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         localStorage                    │
│   Persisted user preferences            │
└─────────────────────────────────────────┘
```

## Global vs Local State

### When to Use Global State

Use the global store for:

- **User preferences** - Settings that persist across sessions
- **UI state** - Sidebar, modals, toasts that are accessed globally
- **Session data** - Client-side session tracking
- **Feature flags** - Application-wide feature toggles

### When to Use Feature Stores

Create feature stores for:

- **Large feature modules** - Isolated state for major features
- **Code splitting** - Lazy-loaded features with their own state
- **Team boundaries** - Different teams managing different stores
- **Testing isolation** - Easier to test in isolation

```typescript
import { createFeatureStore } from '@missionfabric-js/enzyme';

interface TasksState {
  tasks: Task[];
  selectedId: string | null;
}

interface TasksActions {
  addTask: (task: Task) => void;
  selectTask: (id: string | null) => void;
}

export const useTasksStore = createFeatureStore<TasksState & TasksActions>(
  (set) => ({
    tasks: [],
    selectedId: null,

    addTask: (task) => {
      set((state) => {
        state.tasks.push(task);
      }, false, { type: 'tasks/addTask' });
    },

    selectTask: (id) => {
      set((state) => {
        state.selectedId = id;
      }, false, { type: 'tasks/selectTask' });
    },
  }),
  {
    name: 'tasks',
    persist: {
      partialize: (state) => ({ tasks: state.tasks }),
    },
  }
);
```

### When to Use Local State

Use React's `useState` for:

- **Component-only state** - Form inputs, UI toggles
- **Transient state** - Hover states, animation triggers
- **Derived state** - Computations from props/global state

## Performance Best Practices

### 1. Select Only What You Need

```typescript
// ❌ Bad - Subscribes to entire state
const state = useStore((s) => s);

// ✅ Good - Subscribes to single value
const locale = useStore((s) => s.locale);
```

### 2. Use Memoized Selectors for Objects

```typescript
// ❌ Bad - Creates new object on every render
const settings = useStore((s) => ({
  locale: s.locale,
  timezone: s.timezone,
}));

// ✅ Good - Uses memoized selector
const settings = useStore(selectDisplaySettings);
```

### 3. Use Action Selectors for Stable References

```typescript
// ❌ Bad - Recreates object on every render
const actions = useStore((s) => ({
  toggle: s.toggleSidebar,
  open: s.setSidebarOpen,
}));

// ✅ Good - Uses convenience hook
const { toggle, setOpen } = useSidebar();
```

### 4. Use Parameterized Selectors for Dynamic Data

```typescript
import { selectFeatureFlag } from '@missionfabric-js/enzyme';

// ✅ Memoized per parameter
const isEnabled = useStore(selectFeatureFlag('newDashboard'));
```

## State Persistence

### What Gets Persisted

The store uses a **whitelist approach** for security and performance:

```typescript
// ✅ Persisted (User Preferences)
- UI preferences (sidebar, density, animations)
- Settings (locale, timezone, theme)
- Notifications (enabled states)
- Accessibility (reduced motion, high contrast)

// ❌ Not Persisted (Security & Performance)
- Session data (re-validated on reload)
- Modal state (transient UI)
- Loading state (transient UI)
- Toasts (transient UI)
```

### Version Migrations

Increment `STORE_VERSION` when making breaking changes:

```typescript
const STORE_VERSION = 4;

const migrations: Record<number, (state: unknown) => unknown> = {
  // Version 3 -> 4: Add theme and email notifications
  4: (state: unknown) => ({
    ...(state as object),
    theme: 'system',
    emailNotifications: true,
  }),
};
```

### Hydration

Wait for hydration before reading persisted values:

```typescript
import { waitForHydration } from '@missionfabric-js/enzyme';

async function initializeApp() {
  await waitForHydration();
  // Store is now hydrated, safe to read persisted values
  const locale = useStore.getState().locale;
}
```

Or use the hydration hook:

```typescript
import { useHydration } from '@missionfabric-js/enzyme';

function App() {
  const { hasHydrated, isHydrating } = useHydration();

  if (isHydrating) {
    return <LoadingScreen />;
  }

  return <MainApp />;
}
```

## Multi-Tab Synchronization

Synchronize state across browser tabs using BroadcastChannel:

```typescript
import { createBroadcastSync, useStore } from '@missionfabric-js/enzyme';

const sync = createBroadcastSync(useStore, {
  channelName: 'app-state-sync',
  syncKeys: ['locale', 'theme', 'settings'],
  throttleMs: 100,
  debug: process.env.NODE_ENV === 'development',
});

// Start syncing
sync.start();

// Check if this tab is the leader
if (sync.isLeader()) {
  console.log('This tab coordinates multi-tab operations');
}
```

See [SYNC.md](./SYNC.md) for complete documentation.

## Debugging

### DevTools Integration

The store automatically connects to Redux DevTools in development:

```typescript
// Actions are automatically named
ui/toggleSidebar
ui/openModal
session/initSession
settings/setLocale
```

### Access Store in Console

In development mode, the store is exposed on `window`:

```javascript
// In browser console
window.__STORE__.getState()
window.__STORE__.setState({ locale: 'fr-FR' })
```

### Debug Mode Flag

Check if debug mode is enabled:

```typescript
import { isDebugModeEnabled } from '@/lib/flags/debugMode';

if (isDebugModeEnabled()) {
  console.log('Debug mode active');
}
```

## Migration from Redux

### Key Differences

| Redux | Zustand (Enzyme) |
|-------|------------------|
| Actions & reducers | Direct state updates |
| `mapStateToProps` | Selectors |
| `connect` HOC | Hooks |
| Immutability helpers | Immer (write mutating code) |
| Multiple stores | Single store + feature stores |

### Migration Example

**Redux:**
```typescript
// Actions
const setLocale = (locale: string) => ({
  type: 'SET_LOCALE',
  payload: locale,
});

// Reducer
function settingsReducer(state = initialState, action) {
  switch (action.type) {
    case 'SET_LOCALE':
      return { ...state, locale: action.payload };
    default:
      return state;
  }
}

// Component
const mapStateToProps = (state) => ({
  locale: state.settings.locale,
});

const mapDispatchToProps = {
  setLocale,
};

export default connect(mapStateToProps, mapDispatchToProps)(MyComponent);
```

**Zustand (Enzyme):**
```typescript
// Store (slice pattern)
export const settingsSlice = createSlice({
  name: 'settings',
  initialState: { locale: 'en-US' },
  actions: (set) => ({
    setLocale: (locale: string) => {
      set((state) => {
        state.locale = locale;
      }, 'setLocale');
    },
  }),
});

// Component
function MyComponent() {
  const locale = useStore((s) => s.locale);
  const setLocale = useStore((s) => s.setLocale);

  return <div>{locale}</div>;
}
```

## API Reference

### Store Exports

```typescript
// Main store hook
export const useStore: UseBoundStore<StoreApi<StoreState>>;

// Store utilities
export function getStoreState(): StoreState;
export function subscribeToStore<T>(
  selector: StoreSelector<T>,
  callback: (value: T, prevValue: T) => void
): () => void;
export function hasStoreHydrated(): boolean;
export function waitForHydration(timeoutMs?: number): Promise<boolean>;
export function resetStore(clearSettings?: boolean): void;
export function clearPersistedStore(): void;

// Feature store registry
export function registerFeatureStore(name: string, store: FeatureStore): void;
export function unregisterFeatureStore(name: string): void;
export function getFeatureStore<T>(name: string): T | undefined;
export function getFeatureStoreNames(): string[];
export function resetAllFeatureStores(clearRegistry?: boolean): void;
```

## Documentation

- [Core Utilities](./CORE.md) - Store factories, slice creation, selector utilities
- [Stores](./STORES.md) - Global store, feature stores, persistence
- [Hooks](./HOOKS.md) - React hooks for state access
- [Selectors](./SELECTORS.md) - Memoized selectors and patterns
- [Slices](./SLICES.md) - UI, Session, Settings slice documentation
- [Synchronization](./SYNC.md) - Multi-tab sync with BroadcastChannel
- [Types](./TYPES.md) - TypeScript type definitions

## Examples

### Complete Feature Store Example

```typescript
// stores/reports.ts
import { createFeatureStore } from '@missionfabric-js/enzyme';

interface Report {
  id: string;
  name: string;
  data: unknown;
}

interface ReportsState {
  reports: Report[];
  selectedId: string | null;
  isLoading: boolean;
}

interface ReportsActions {
  fetchReports: () => Promise<void>;
  selectReport: (id: string | null) => void;
  deleteReport: (id: string) => Promise<void>;
}

export const useReportsStore = createFeatureStore<ReportsState & ReportsActions>(
  (set, get) => ({
    // Initial state
    reports: [],
    selectedId: null,
    isLoading: false,

    // Actions
    fetchReports: async () => {
      set((state) => {
        state.isLoading = true;
      }, false, { type: 'reports/fetchReports/pending' });

      try {
        const response = await fetch('/api/reports');
        const reports = await response.json();

        set((state) => {
          state.reports = reports;
          state.isLoading = false;
        }, false, { type: 'reports/fetchReports/fulfilled' });
      } catch (error) {
        set((state) => {
          state.isLoading = false;
        }, false, { type: 'reports/fetchReports/rejected' });
      }
    },

    selectReport: (id) => {
      set((state) => {
        state.selectedId = id;
      }, false, { type: 'reports/selectReport' });
    },

    deleteReport: async (id) => {
      const originalReports = get().reports;

      // Optimistic update
      set((state) => {
        state.reports = state.reports.filter(r => r.id !== id);
        if (state.selectedId === id) {
          state.selectedId = null;
        }
      }, false, { type: 'reports/deleteReport/optimistic' });

      try {
        await fetch(`/api/reports/${id}`, { method: 'DELETE' });
      } catch (error) {
        // Rollback on error
        set((state) => {
          state.reports = originalReports;
        }, false, { type: 'reports/deleteReport/rollback' });
        throw error;
      }
    },
  }),
  {
    name: 'reports',
    register: true,
    persist: {
      partialize: (state) => ({
        selectedId: state.selectedId,
      }),
    },
  }
);

// Create typed hooks
export const {
  useStore: useReports,
  useSelector: useReportsSelector,
  useActions: useReportsActions,
} = createFeatureStoreHooks(useReportsStore);
```

### Usage in Components

```typescript
// components/ReportsList.tsx
import { useReports, useReportsActions } from '@/stores/reports';

export function ReportsList() {
  const reports = useReports((s) => s.reports);
  const isLoading = useReports((s) => s.isLoading);
  const { fetchReports, selectReport } = useReportsActions();

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (isLoading) return <Spinner />;

  return (
    <ul>
      {reports.map(report => (
        <li key={report.id} onClick={() => selectReport(report.id)}>
          {report.name}
        </li>
      ))}
    </ul>
  );
}
```

## Related Modules

- **[Data Management](../data/README.md)** - Data validation, normalization, sync
- **[Queries](../queries/README.md)** - React Query integration
- **[Forms](../forms/README.md)** - Form state management

## Resources

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Immer Documentation](https://immerjs.github.io/immer/)
- [Redux DevTools](https://github.com/reduxjs/redux-devtools)
