# Core State Utilities

> Factory functions and utilities for creating type-safe stores, slices, and selectors

## Overview

The core module provides factory functions for creating Zustand stores with a production-grade middleware stack:

- `createAppStore` - Full-featured store with all middleware
- `createSimpleStore` - Store with Immer + DevTools (no persistence)
- `createMinimalStore` - Store with only Immer
- `createSlice` - Type-safe slices with automatic action naming
- `createSelector` - Memoized selectors for performance
- `createFeatureStore` - Isolated feature stores with registration

## Store Factories

### createAppStore

Create a store with the full middleware stack: Immer + DevTools + SubscribeWithSelector + Persist.

```typescript
import { createAppStore } from '@missionfabric-js/enzyme';

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

const useCounterStore = createAppStore<CounterState>(
  (set, get) => ({
    count: 0,

    increment: () => {
      set((state) => {
        state.count += 1;
      }, false, { type: 'counter/increment' });
    },

    decrement: () => {
      set((state) => {
        state.count -= 1;
      }, false, { type: 'counter/decrement' });
    },

    reset: () => {
      set((state) => {
        state.count = 0;
      }, false, { type: 'counter/reset' });
    },
  }),
  {
    name: 'CounterStore',
    persist: {
      key: 'counter-storage',
      partialize: (state) => ({ count: state.count }),
      version: 1,
    },
  }
);
```

**Configuration Options:**

```typescript
interface AppStoreConfig<TState> {
  /** Store name for DevTools */
  name: string;

  /** Persistence configuration */
  persist?: {
    /** Storage key */
    key: string;
    /** State to persist (whitelist) */
    partialize?: (state: TState) => Partial<TState>;
    /** Storage version for migrations */
    version?: number;
    /** Migration functions */
    migrate?: (persistedState: unknown, version: number) => TState;
    /** Skip hydration */
    skipHydration?: boolean;
  };

  /** Enable DevTools (default: true in dev) */
  devtools?: boolean;

  /** Custom DevTools options */
  devtoolsOptions?: {
    enabled?: boolean;
    anonymousActionType?: string;
    trace?: boolean;
    traceLimit?: number;
  };
}
```

**Features:**

- Automatic hydration state tracking (`_hasHydrated`, `_setHasHydrated`)
- Built-in reset capability (`_reset`)
- Type-safe with full TypeScript inference
- Versioned migrations for breaking changes

**Example with Migrations:**

```typescript
interface SettingsState {
  theme: 'light' | 'dark';
  language: string;
  // v2 added:
  fontSize?: 'small' | 'medium' | 'large';
}

const useSettingsStore = createAppStore<SettingsState>(
  (set) => ({
    theme: 'light',
    language: 'en',
    fontSize: 'medium',

    setTheme: (theme) => {
      set((state) => {
        state.theme = theme;
      }, false, { type: 'settings/setTheme' });
    },
  }),
  {
    name: 'Settings',
    persist: {
      key: 'app-settings',
      version: 2,
      migrate: (persistedState, version) => {
        if (version < 2) {
          // Migrate from v1 to v2: add fontSize
          return {
            ...(persistedState as SettingsState),
            fontSize: 'medium',
          };
        }
        return persistedState as SettingsState;
      },
    },
  }
);
```

### createSimpleStore

Create a store with Immer + DevTools (no persistence). Use for stores that don't need to persist.

```typescript
import { createSimpleStore } from '@missionfabric-js/enzyme';

interface UIState {
  isOpen: boolean;
  toggle: () => void;
}

const useUIStore = createSimpleStore<UIState>(
  (set) => ({
    isOpen: false,
    toggle: () => {
      set((state) => {
        state.isOpen = !state.isOpen;
      }, false, { type: 'toggle' });
    },
  }),
  'UIStore'
);
```

**Parameters:**

```typescript
function createSimpleStore<TState>(
  initializer: StateCreator<TState>,
  name: string,
  enableDevtools?: boolean
): UseBoundStore<StoreApi<TState>>
```

### createMinimalStore

Create a minimal store with only Immer. Use for simple local stores.

```typescript
import { createMinimalStore } from '@missionfabric-js/enzyme';

interface LocalState {
  items: string[];
  addItem: (item: string) => void;
}

const useLocalStore = createMinimalStore<LocalState>((set) => ({
  items: [],
  addItem: (item) => {
    set((state) => {
      state.items.push(item);
    });
  },
}));
```

## Slice Factory

### createSlice

Create type-safe slices with automatic action naming for DevTools.

```typescript
import { createSlice } from '@missionfabric-js/enzyme';

export const counterSlice = createSlice({
  name: 'counter',
  initialState: {
    count: 0,
    step: 1,
  },
  actions: (set, get) => ({
    increment: () => {
      set((state) => {
        state.count += state.step;
      }, 'increment');
    },

    decrement: () => {
      set((state) => {
        state.count -= state.step;
      }, 'decrement');
    },

    setStep: (step: number) => {
      set((state) => {
        state.step = step;
      }, 'setStep');
    },

    reset: () => {
      set(() => ({
        count: 0,
        step: 1,
      }), 'reset');
    },

    // Getters
    getCount: () => get().count,
  }),
});
```

**Slice Configuration:**

```typescript
interface SliceConfig<TState, TActions> {
  /** Slice name (used in DevTools action prefixes) */
  name: string;

  /** Initial state */
  initialState: TState;

  /** Action creators */
  actions: (
    set: SliceSetter<TState>,
    get: SliceGetter<TState>
  ) => TActions;
}
```

**Features:**

- Automatic action naming: `sliceName/actionName`
- Immer-compatible state updates
- Slice-scoped getter (only returns slice state)
- Full TypeScript inference

**Combining Slices:**

```typescript
import { create } from 'zustand';
import { combineSlices } from '@missionfabric-js/enzyme';

const useStore = create(
  combineSlices(
    counterSlice,
    uiSlice,
    settingsSlice
  )
);
```

### createAction

Create standalone action creators (for use outside createSlice):

```typescript
import { createAction } from '@missionfabric-js/enzyme';

const increment = createAction<number>(
  'counter/increment',
  (set) => (amount) => {
    set((state) => {
      state.count += amount;
    });
  }
);
```

## Selector Factories

### createSelector

Create a memoized selector that only recomputes when dependencies change.

```typescript
import { createSelector } from '@missionfabric-js/enzyme';

// Dependency selectors
const selectFirstName = (state: State) => state.firstName;
const selectLastName = (state: State) => state.lastName;

// Memoized derived selector
const selectFullName = createSelector(
  [selectFirstName, selectLastName],
  (first, last) => `${first} ${last}`
);

// Usage
const fullName = useStore(selectFullName);
```

**With Custom Equality:**

```typescript
import { shallow } from 'zustand/shallow';

const selectFilteredItems = createSelector(
  [selectItems, selectFilter],
  (items, filter) => items.filter(item => item.category === filter),
  shallow // Use shallow equality for array comparison
);
```

**How it works:**

1. Checks if dependencies changed (reference equality)
2. If unchanged, returns cached result
3. If changed, recomputes result
4. Checks if result changed (custom equality function)
5. Returns previous result reference if equal (referential stability)

### createObjectSelector

Create a selector that returns a stable object reference using shallow equality.

```typescript
import { createObjectSelector } from '@missionfabric-js/enzyme';

const selectUserInfo = createObjectSelector((state: State) => ({
  name: state.user.name,
  email: state.user.email,
  avatar: state.user.avatar,
}));

// Returns same reference if properties are equal
const userInfo = useStore(selectUserInfo);
```

**Use Cases:**

- Selecting multiple primitive values as an object
- Preventing unnecessary re-renders when object content is the same
- Optimizing React.memo dependencies

### createArraySelector

Create a selector that returns a stable array reference.

```typescript
import { createArraySelector } from '@missionfabric-js/enzyme';

const selectActiveItems = createArraySelector((state: State) =>
  state.items.filter(item => item.active)
);

// Returns same reference if array elements are the same
const activeItems = useStore(selectActiveItems);
```

**Comparison Strategy:**

- Checks array length
- Compares element references (not deep equality)
- Returns previous array if all elements are identical

### createParameterizedSelector

Create a selector factory that memoizes selectors per parameter value.

```typescript
import { createParameterizedSelector } from '@missionfabric-js/enzyme';

const selectUserById = createParameterizedSelector(
  (id: string) => (state: State) =>
    state.users.find(user => user.id === id)
);

// Each ID gets its own memoized selector
const user1 = useStore(selectUserById('user-1'));
const user2 = useStore(selectUserById('user-2'));
```

**Features:**

- LRU cache eviction (default: 100 entries)
- Prevents memory leaks from unbounded parameter growth
- Perfect for dynamic selectors

**With Custom Cache Size:**

```typescript
const selectItemById = createParameterizedSelector(
  (id: string) => (state: State) => state.items[id],
  50 // Max 50 cached selectors
);
```

### createBoundedParameterizedSelector

Alias for `createParameterizedSelector` with explicit cache limit.

```typescript
import { createBoundedParameterizedSelector } from '@missionfabric-js/enzyme';

const selectPostById = createBoundedParameterizedSelector(
  (id: string) => (state: State) => state.posts[id],
  100 // Explicitly set cache limit
);
```

### combineSelectors

Combine multiple selectors into one with shallow equality.

```typescript
import { combineSelectors } from '@missionfabric-js/enzyme';

const selectUserProfile = combineSelectors({
  name: selectUserName,
  email: selectUserEmail,
  avatar: selectUserAvatar,
  settings: selectUserSettings,
});

// Returns stable reference when values don't change
const profile = useStore(selectUserProfile);
```

### pickSelector

Create a selector that picks specific keys from state.

```typescript
import { pickSelector } from '@missionfabric-js/enzyme';

const selectUIState = pickSelector<StoreState>()(
  'sidebarOpen',
  'activeModal',
  'globalLoading'
);

const uiState = useStore(selectUIState);
// { sidebarOpen: true, activeModal: 'settings', globalLoading: false }
```

### omitSelector

Create a selector that omits specific keys from state.

```typescript
import { omitSelector } from '@missionfabric-js/enzyme';

const selectPublicState = omitSelector<StoreState>()(
  '_hasHydrated',
  '_reset',
  'password'
);

const publicState = useStore(selectPublicState);
```

## Selector Utilities

### selectorUtils

Collection of utility functions for working with selectors.

```typescript
import { selectorUtils } from '@missionfabric-js/enzyme';

// Identity selector (passthrough)
const value = selectorUtils.identity(someValue);

// Selector with default value
const selectUserOrDefault = selectorUtils.withDefault(
  (state) => state.user,
  { name: 'Guest', email: '' }
);

// Boolean predicate selector
const selectHasItems = selectorUtils.predicate(
  (state) => state.items,
  (items) => items.length > 0
);

// Map selector
const selectItemIds = selectorUtils.map(
  (state) => state.items,
  (items) => items.map(item => item.id)
);

// Filter selector
const selectActiveItems = selectorUtils.filter(
  (state) => state.items,
  (item) => item.active
);

// Find selector
const selectFirstActiveItem = selectorUtils.find(
  (state) => state.items,
  (item) => item.active
);
```

## Feature Store Factory

### createFeatureStore

Create an isolated feature store with optional persistence and auto-registration.

```typescript
import { createFeatureStore } from '@missionfabric-js/enzyme';

interface TasksState {
  tasks: Task[];
  selectedId: string | null;
}

interface TasksActions {
  addTask: (task: Task) => void;
  removeTask: (id: string) => void;
  selectTask: (id: string | null) => void;
}

const useTasksStore = createFeatureStore<TasksState & TasksActions>(
  (set, get) => ({
    tasks: [],
    selectedId: null,

    addTask: (task) => {
      set((state) => {
        state.tasks.push(task);
      }, false, { type: 'tasks/addTask' });
    },

    removeTask: (id) => {
      set((state) => {
        state.tasks = state.tasks.filter(t => t.id !== id);
      }, false, { type: 'tasks/removeTask' });
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
      partialize: (state) => ({
        tasks: state.tasks,
      }),
      version: 1,
    },
    register: true,
  }
);
```

**Configuration:**

```typescript
interface CreateFeatureStoreConfig<TState> {
  /** Feature name (used in DevTools and registry) */
  name: string;

  /** Persist to storage */
  persist?: {
    /** Storage key (defaults to `feature-${name}`) */
    key?: string;
    /** State to persist (whitelist) */
    partialize?: (state: TState) => Partial<TState>;
    /** Storage version for migrations */
    version?: number;
  };

  /** Register with global store registry (default: true) */
  register?: boolean;

  /** Enable DevTools (default: development only) */
  devtools?: boolean;
}
```

**Enhanced Store Methods:**

```typescript
// Feature name
useTasksStore.featureName; // 'tasks'

// Unregister from global registry
useTasksStore.unregister();
```

### createLazyFeatureStore

Create a feature store that's only instantiated when first accessed (for code-split features).

```typescript
import { createLazyFeatureStore } from '@missionfabric-js/enzyme';

const tasksStoreLazy = createLazyFeatureStore<TasksState & TasksActions>(
  (set) => ({
    // ... same as createFeatureStore
  }),
  { name: 'tasks' }
);

// Later, when feature is needed:
const store = tasksStoreLazy.getStore();
const tasks = store((s) => s.tasks);

// Check if initialized
if (tasksStoreLazy.isInitialized()) {
  // Store has been created
}

// Cleanup
tasksStoreLazy.destroy();
```

**API:**

```typescript
interface LazyFeatureStore<TState> {
  /** Get or create the store */
  getStore: () => EnhancedStore<TState>;

  /** Check if store is initialized */
  isInitialized: () => boolean;

  /** Destroy the store and clean up */
  destroy: () => void;

  /** Feature name */
  featureName: string;
}
```

### createFeatureStoreHooks

Create typed hooks for a feature store.

```typescript
import { createFeatureStoreHooks } from '@missionfabric-js/enzyme';

const {
  useStore: useTasks,
  useSelector: useTasksSelector,
  useActions: useTasksActions,
} = createFeatureStoreHooks(useTasksStore);

// Usage in components
function TasksList() {
  const tasks = useTasksSelector((s) => s.tasks);
  const { addTask, removeTask } = useTasksActions();

  return (
    <div>
      {tasks.map(task => (
        <TaskItem key={task.id} task={task} onRemove={removeTask} />
      ))}
    </div>
  );
}
```

### subscribeToFeatureStore

Subscribe to feature store changes outside React.

```typescript
import { subscribeToFeatureStore } from '@missionfabric-js/enzyme';

const unsubscribe = subscribeToFeatureStore(
  useTasksStore,
  (state) => state.tasks.length,
  (count, prevCount) => {
    console.log(`Task count changed: ${prevCount} -> ${count}`);
  }
);

// Cleanup
unsubscribe();
```

### featureStoreRegistry

Global registry for feature stores.

```typescript
import { featureStoreRegistry } from '@missionfabric-js/enzyme';

// Register manually
featureStoreRegistry.register('tasks', useTasksStore, 1);

// Get store by name
const store = featureStoreRegistry.getStore<TasksStore>('tasks');

// Check if registered
if (featureStoreRegistry.has('tasks')) {
  // ...
}

// Get all store names
const names = featureStoreRegistry.getNames(); // ['tasks', 'reports', ...]

// Get metadata
const meta = featureStoreRegistry.getMetadata('tasks');
// { version: 1, registeredAt: 1234567890 }

// Reset all stores
featureStoreRegistry.resetAll();

// Clear registry
featureStoreRegistry.clear();

// Unregister
featureStoreRegistry.unregister('tasks');
```

## Store Utilities

### waitForHydration

Wait for store hydration to complete.

```typescript
import { waitForHydration } from '@missionfabric-js/enzyme';

// With a specific store
await waitForHydration(useMyStore);

// Store is now hydrated, safe to read persisted values
const theme = useMyStore.getState().theme;
```

### createStoreReset

Create a reset function for a store.

```typescript
import { createStoreReset } from '@missionfabric-js/enzyme';

const resetStore = createStoreReset(useMyStore);

// Reset to initial state
resetStore();
```

## TypeScript Utilities

### Type Extraction

```typescript
import type {
  SliceState,
  SliceActions,
  SliceType,
} from '@missionfabric-js/enzyme';

// Extract state type
type CounterState = SliceState<typeof counterSlice>;

// Extract actions type
type CounterActions = SliceActions<typeof counterSlice>;

// Extract full slice type (state + actions)
type Counter = SliceType<typeof counterSlice>;
```

## Best Practices

### 1. Use createSlice for Organized State

```typescript
// ✅ Good - Organized, named actions
export const userSlice = createSlice({
  name: 'user',
  initialState: { name: '', email: '' },
  actions: (set) => ({
    setName: (name) => set((s) => { s.name = name }, 'setName'),
    setEmail: (email) => set((s) => { s.email = email }, 'setEmail'),
  }),
});

// ❌ Bad - Anonymous actions
export const userSlice = (set) => ({
  name: '',
  email: '',
  setName: (name) => set({ name }),
  setEmail: (email) => set({ email }),
});
```

### 2. Use Memoized Selectors for Derived State

```typescript
// ✅ Good - Memoized, only recomputes when deps change
const selectFullName = createSelector(
  [selectFirstName, selectLastName],
  (first, last) => `${first} ${last}`
);

// ❌ Bad - Recomputes on every render
const selectFullName = (state) => `${state.firstName} ${state.lastName}`;
```

### 3. Use Feature Stores for Large Features

```typescript
// ✅ Good - Isolated, testable, code-split friendly
const useReportsStore = createFeatureStore(/*...*/);

// ❌ Bad - Everything in global store
const useStore = create((set) => ({
  // ... 1000 lines of state and actions
}));
```

### 4. Partition State in persist Config

```typescript
// ✅ Good - Only persist what's needed
persist: {
  partialize: (state) => ({
    theme: state.theme,
    locale: state.locale,
  }),
}

// ❌ Bad - Persist everything (security risk, performance cost)
persist: {
  // No partialize, persists all state
}
```

## Related Documentation

- [Stores](./STORES.md) - Global store structure and usage
- [Slices](./SLICES.md) - Built-in UI, Session, Settings slices
- [Selectors](./SELECTORS.md) - Selector patterns and examples
- [Types](./TYPES.md) - TypeScript type definitions
