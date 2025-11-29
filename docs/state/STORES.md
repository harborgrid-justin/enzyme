# Stores Documentation

> Global and feature stores for state management

## Global Store

The global store is the main application store that combines UI, Session, and Settings slices.

### Store Structure

```typescript
type StoreState = UISlice & SessionSlice & SettingsSlice & HydrationState;

interface HydrationState {
  _hasHydrated: boolean;
  _setHasHydrated: (hydrated: boolean) => void;
}
```

### Accessing the Store

```typescript
import { useStore } from '@missionfabric-js/enzyme';

// In React components
function MyComponent() {
  const locale = useStore((state) => state.locale);
  const setLocale = useStore((state) => state.setLocale);
}

// Outside React
import { getStoreState } from '@missionfabric-js/enzyme';

const currentLocale = getStoreState().locale;
```

### Store Slices

The global store is composed of three main slices:

**1. UI Slice** (`/home/user/enzyme/src/lib/state/slices/uiSlice.ts`)
- Sidebar state (open, collapsed)
- Modal state (active modal, data, stack)
- Loading state (global loading, message, progress)
- Toasts (notifications)
- Layout preferences (density, animations)
- Command palette

**2. Session Slice** (`/home/user/enzyme/src/lib/state/slices/sessionSlice.ts`)
- Session identification (ID, start time, expiry)
- Activity tracking (last activity, timeout)
- Navigation history
- Device/tab identification

**3. Settings Slice** (`/home/user/enzyme/src/lib/state/slices/settingsSlice.ts`)
- Locale & timezone
- Display preferences (date/time/number formats, theme)
- Notifications (enabled, sound, desktop, email)
- Accessibility (reduced motion, high contrast, font size)
- Feature flags
- Privacy settings (analytics, crash reporting)

See [SLICES.md](./SLICES.md) for detailed documentation.

## Persistence

### What Gets Persisted

The store uses a whitelist approach for security and performance:

```typescript
const persistedState = (state: StoreState): Partial<StoreState> => ({
  // UI preferences
  sidebarOpen: state.sidebarOpen,
  sidebarCollapsed: state.sidebarCollapsed,
  layoutDensity: state.layoutDensity,
  animationsEnabled: state.animationsEnabled,

  // All settings
  locale: state.locale,
  timezone: state.timezone,
  dateFormat: state.dateFormat,
  timeFormat: state.timeFormat,
  numberFormat: state.numberFormat,
  theme: state.theme,
  notificationsEnabled: state.notificationsEnabled,
  soundEnabled: state.soundEnabled,
  desktopNotifications: state.desktopNotifications,
  emailNotifications: state.emailNotifications,
  reducedMotion: state.reducedMotion,
  highContrast: state.highContrast,
  fontSize: state.fontSize,
  keyboardShortcutsEnabled: state.keyboardShortcutsEnabled,
  features: state.features,
  analyticsEnabled: state.analyticsEnabled,
  crashReportingEnabled: state.crashReportingEnabled,
});
```

**NOT persisted** (security & performance):
- Session data (re-validated on reload)
- Modal state (transient UI)
- Loading state (transient UI)
- Toasts (transient UI)

### Versioning & Migrations

Current version: **4**

```typescript
const STORE_VERSION = 4;

const migrations: Record<number, (state: unknown) => unknown> = {
  // Version 1 -> 2: Add layoutDensity
  2: (state: unknown) => ({
    ...(state as object),
    layoutDensity: 'comfortable',
  }),

  // Version 2 -> 3: Add keyboard shortcuts and animations
  3: (state: unknown) => ({
    ...(state as object),
    keyboardShortcutsEnabled: true,
    animationsEnabled: true,
  }),

  // Version 3 -> 4: Add theme and email notifications
  4: (state: unknown) => ({
    ...(state as object),
    theme: 'system',
    emailNotifications: true,
    analyticsEnabled: true,
    crashReportingEnabled: true,
  }),
};
```

**Adding a new migration:**

1. Increment `STORE_VERSION`
2. Add migration function for new version
3. Test migration with old state

```typescript
// In store.ts
const STORE_VERSION = 5; // Increment

const migrations: Record<number, (state: unknown) => unknown> = {
  // ... existing migrations

  // Version 4 -> 5: Add new setting
  5: (state: unknown) => ({
    ...(state as object),
    newSetting: 'default-value',
  }),
};
```

### Hydration

The store tracks hydration state to ensure persistence has loaded before reading values.

```typescript
import { waitForHydration, hasStoreHydrated } from '@missionfabric-js/enzyme';

// Async wait
async function initializeApp() {
  const hydrated = await waitForHydration();
  if (hydrated) {
    // Safe to read persisted values
    const locale = getStoreState().locale;
  } else {
    // Timeout occurred
    console.warn('Store hydration timed out');
  }
}

// Sync check
if (hasStoreHydrated()) {
  // Store is hydrated
}
```

**React Hook:**

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

## Store Utilities

### getStoreState

Get a snapshot of the current store state (for use outside React).

```typescript
import { getStoreState } from '@missionfabric-js/enzyme';

const currentLocale = getStoreState().locale;
const currentTheme = getStoreState().theme;
```

### subscribeToStore

Subscribe to store changes with selector (for use outside React).

```typescript
import { subscribeToStore } from '@missionfabric-js/enzyme';

const unsubscribe = subscribeToStore(
  (state) => state.locale,
  (newLocale, prevLocale) => {
    console.log('Locale changed:', prevLocale, '->', newLocale);
  }
);

// Cleanup
unsubscribe();
```

### resetStore

Reset store to initial state (useful for logout).

```typescript
import { resetStore } from '@missionfabric-js/enzyme';

// Reset UI and session, preserve settings
resetStore();

// Reset everything including settings
resetStore(true);
```

**What gets reset:**

```typescript
function resetStore(clearSettings = false): void {
  const state = useStore.getState();

  // End session
  state.endSession();

  // Reset UI state
  state.closeAllModals();
  state.clearToasts();
  state.setGlobalLoading(false);

  // Optionally reset settings
  if (clearSettings) {
    state.resetSettings();
  }
}
```

### clearPersistedStore

Clear persisted store data from localStorage.

```typescript
import { clearPersistedStore } from '@missionfabric-js/enzyme';

// Warning: This removes all persisted state
clearPersistedStore();
```

## Feature Store Registry

The global registry tracks all feature stores for debugging and cross-feature communication.

### registerFeatureStore

Register a feature store with the global registry.

```typescript
import { registerFeatureStore, createFeatureStore } from '@missionfabric-js/enzyme';

const useReportsStore = createFeatureStore(/*...*/);

// Auto-registered if register: true in config
// Or manually register:
registerFeatureStore('reports', useReportsStore);
```

### getFeatureStore

Get a feature store by name.

```typescript
import { getFeatureStore } from '@missionfabric-js/enzyme';

const reportsStore = getFeatureStore<ReportsStore>('reports');

if (reportsStore) {
  const reports = reportsStore.getState().reports;
}
```

### getFeatureStoreNames

Get all registered feature store names.

```typescript
import { getFeatureStoreNames } from '@missionfabric-js/enzyme';

const storeNames = getFeatureStoreNames();
// ['reports', 'tasks', 'analytics', ...]
```

### unregisterFeatureStore

Unregister a feature store from the global registry.

```typescript
import { unregisterFeatureStore } from '@missionfabric-js/enzyme';

unregisterFeatureStore('reports');
```

### resetAllFeatureStores

Reset all feature stores that have a reset method.

```typescript
import { resetAllFeatureStores } from '@missionfabric-js/enzyme';

// Reset all stores and clear registry
resetAllFeatureStores();

// Reset all stores but keep them registered
resetAllFeatureStores(false);
```

## Creating Feature Stores

Feature stores are isolated stores for specific features/modules.

### Basic Feature Store

```typescript
import { createFeatureStore } from '@missionfabric-js/enzyme';

interface NotesState {
  notes: Note[];
  selectedId: string | null;
}

interface NotesActions {
  addNote: (note: Note) => void;
  removeNote: (id: string) => void;
  selectNote: (id: string | null) => void;
}

export const useNotesStore = createFeatureStore<NotesState & NotesActions>(
  (set, get) => ({
    notes: [],
    selectedId: null,

    addNote: (note) => {
      set((state) => {
        state.notes.push(note);
      }, false, { type: 'notes/addNote' });
    },

    removeNote: (id) => {
      set((state) => {
        state.notes = state.notes.filter(n => n.id !== id);
        if (state.selectedId === id) {
          state.selectedId = null;
        }
      }, false, { type: 'notes/removeNote' });
    },

    selectNote: (id) => {
      set((state) => {
        state.selectedId = id;
      }, false, { type: 'notes/selectNote' });
    },
  }),
  {
    name: 'notes',
    register: true,
  }
);
```

### Feature Store with Persistence

```typescript
export const useNotesStore = createFeatureStore<NotesState & NotesActions>(
  (set) => ({
    // ... state and actions
  }),
  {
    name: 'notes',
    persist: {
      key: 'app-notes', // Storage key (defaults to 'feature-notes')
      partialize: (state) => ({
        notes: state.notes, // Only persist notes, not selection
      }),
      version: 1,
    },
  }
);
```

### Lazy Feature Store

For code-split features that load on demand:

```typescript
import { createLazyFeatureStore } from '@missionfabric-js/enzyme';

export const notesStoreLazy = createLazyFeatureStore<NotesState & NotesActions>(
  (set) => ({
    // ... state and actions
  }),
  { name: 'notes' }
);

// Later, when feature is needed:
const store = notesStoreLazy.getStore();
const notes = store((s) => s.notes);
```

### Feature Store Hooks

Create typed hooks for better ergonomics:

```typescript
import { createFeatureStoreHooks } from '@missionfabric-js/enzyme';

export const {
  useStore: useNotes,
  useSelector: useNotesSelector,
  useActions: useNotesActions,
} = createFeatureStoreHooks(useNotesStore);

// Usage in components
function NotesList() {
  const notes = useNotesSelector((s) => s.notes);
  const { addNote, removeNote } = useNotesActions();

  return (
    <div>
      {notes.map(note => (
        <NoteItem
          key={note.id}
          note={note}
          onRemove={removeNote}
        />
      ))}
      <button onClick={() => addNote(newNote)}>Add Note</button>
    </div>
  );
}
```

## Advanced Patterns

### Optimistic Updates

```typescript
interface TasksState {
  tasks: Task[];
}

interface TasksActions {
  deleteTask: (id: string) => Promise<void>;
}

export const useTasksStore = createFeatureStore<TasksState & TasksActions>(
  (set, get) => ({
    tasks: [],

    deleteTask: async (id) => {
      // Capture current state for rollback
      const originalTasks = get().tasks;

      // Optimistic update
      set((state) => {
        state.tasks = state.tasks.filter(t => t.id !== id);
      }, false, { type: 'tasks/deleteTask/optimistic' });

      try {
        await api.deleteTask(id);
      } catch (error) {
        // Rollback on error
        set((state) => {
          state.tasks = originalTasks;
        }, false, { type: 'tasks/deleteTask/rollback' });
        throw error;
      }
    },
  }),
  { name: 'tasks' }
);
```

### Computed State

```typescript
interface CartState {
  items: CartItem[];
}

interface CartActions {
  addItem: (item: CartItem) => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = createFeatureStore<CartState & CartActions>(
  (set, get) => ({
    items: [],

    addItem: (item) => {
      set((state) => {
        state.items.push(item);
      }, false, { type: 'cart/addItem' });
    },

    // Computed values (getters)
    getTotal: () => {
      const { items } = get();
      return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    },

    getItemCount: () => {
      const { items } = get();
      return items.reduce((sum, item) => sum + item.quantity, 0);
    },
  }),
  { name: 'cart' }
);

// Usage
function CartTotal() {
  const getTotal = useCartStore((s) => s.getTotal);
  const total = getTotal();

  return <div>Total: ${total.toFixed(2)}</div>;
}
```

### Cross-Store Communication

```typescript
// Subscribe to another store
export const useNotificationsStore = createFeatureStore<NotificationsState & NotificationsActions>(
  (set, get) => {
    // Subscribe to tasks store
    const unsubscribe = useTasksStore.subscribe(
      (state) => state.tasks.length,
      (count, prevCount) => {
        if (count > prevCount) {
          get().addNotification({
            type: 'success',
            message: 'Task added successfully!',
          });
        }
      }
    );

    return {
      notifications: [],
      addNotification: (notification) => {
        set((state) => {
          state.notifications.push(notification);
        }, false, { type: 'notifications/add' });
      },
    };
  },
  { name: 'notifications' }
);
```

### Middleware Pattern

```typescript
import { createFeatureStore } from '@missionfabric-js/enzyme';

// Logger middleware
function logger<T>(config: StateCreator<T>) {
  return (set, get, api) =>
    config(
      (...args) => {
        console.log('  applying', args);
        set(...args);
        console.log('  new state', get());
      },
      get,
      api
    );
}

// Use with feature store
export const useLoggingStore = createFeatureStore(
  logger((set) => ({
    count: 0,
    increment: () => set((s) => { s.count += 1 }),
  })),
  { name: 'logging' }
);
```

## Testing

### Testing Store Actions

```typescript
import { renderHook, act } from '@testing-library/react';
import { useNotesStore } from './notesStore';

describe('NotesStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useNotesStore.setState({ notes: [], selectedId: null });
  });

  it('should add a note', () => {
    const { result } = renderHook(() => useNotesStore());

    act(() => {
      result.current.addNote({ id: '1', title: 'Test Note' });
    });

    expect(result.current.notes).toHaveLength(1);
    expect(result.current.notes[0].title).toBe('Test Note');
  });

  it('should remove a note', () => {
    const { result } = renderHook(() => useNotesStore());

    act(() => {
      result.current.addNote({ id: '1', title: 'Test Note' });
      result.current.removeNote('1');
    });

    expect(result.current.notes).toHaveLength(0);
  });
});
```

### Testing with Mock Store

```typescript
import { create } from 'zustand';

// Create mock store for testing
const createMockStore = (initialState = {}) => {
  return create((set) => ({
    notes: [],
    selectedId: null,
    ...initialState,
    addNote: (note) => set((state) => ({ notes: [...state.notes, note] })),
  }));
};

describe('NotesList', () => {
  it('should render notes', () => {
    const mockStore = createMockStore({
      notes: [
        { id: '1', title: 'Note 1' },
        { id: '2', title: 'Note 2' },
      ],
    });

    render(<NotesList />, {
      wrapper: ({ children }) => (
        <StoreProvider value={mockStore}>
          {children}
        </StoreProvider>
      ),
    });

    expect(screen.getByText('Note 1')).toBeInTheDocument();
    expect(screen.getByText('Note 2')).toBeInTheDocument();
  });
});
```

## Debugging

### DevTools Integration

All stores automatically connect to Redux DevTools in development:

**Global Store:** `AppStore`
**Feature Stores:** `Feature/[name]`

### Access Stores in Console

```javascript
// Global store
window.__STORE__.getState()

// Feature stores (if debug mode enabled)
featureStoreRegistry.getStore('tasks').getState()
```

### Logging

Enable debug mode to log all state changes:

```typescript
import { isDebugModeEnabled } from '@/lib/flags/debug-mode';

if (isDebugModeEnabled()) {
  // Debug-specific code
}
```

## Performance

### Tips for Optimal Performance

1. **Partition your state** - Use feature stores for large features
2. **Use selectors** - Select only what you need
3. **Memoize derived state** - Use memoized selectors
4. **Persist wisely** - Only persist what's necessary

### Monitoring

Track store performance with DevTools:

- Time travel debugging
- Action history
- State snapshots
- Performance profiling

## Related Documentation

### State Management Core
- [Core Utilities](./CORE.md) - Store and slice factories
- [Slices](./SLICES.md) - UI, Session, Settings slices
- [Hooks](./HOOKS.md) - React hooks for state access
- [Selectors](./SELECTORS.md) - Memoized selector patterns
- [Types](./TYPES.md) - TypeScript type definitions
- [README](./README.md) - State management overview

### Persistence & Performance
- [Hydration Guide](../HYDRATION.md) - State hydration patterns and SSR
- [Performance Guide](../PERFORMANCE.md) - Store optimization strategies
- [Sync](./SYNC.md) - Multi-tab synchronization

### Advanced Topics
- [State Management Guide](../STATE.md) - Dual-state approach pattern
- [Architecture](../ARCHITECTURE.md) - System design patterns
- [Testing Guide](../TESTING.md) - Testing stores and components
- [Migration Guide](../MIGRATION.md) - Migrating from Redux
