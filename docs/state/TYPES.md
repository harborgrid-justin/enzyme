# State Type Definitions

> TypeScript types and interfaces for state management

## Overview

The state module provides comprehensive TypeScript types for:

- Store middleware and configuration
- Slice creation and composition
- Selector creation and memoization
- Feature stores and registration
- Persistence and hydration
- Synchronization

**File:** `/home/user/enzyme/src/lib/state/core/types.ts`

## Store Types

### StoreMiddleware

Type definition for the middleware stack.

```typescript
type StoreMiddleware = [
  ['zustand/immer', never],
  ['zustand/devtools', never],
  ['zustand/subscribeWithSelector', never],
  ['zustand/persist', unknown]
];
```

**Order:** immer → devtools → subscribeWithSelector → persist

### SliceCreator

Slice creator type with full middleware support.

```typescript
type SliceCreator<
  TSlice,
  TStore = TSlice,
  TMiddleware extends any[] = []
> = StateCreator<TStore, TMiddleware, [], TSlice>;
```

**Usage:**

```typescript
const mySlice: SliceCreator<MyState, AppState> = (set, get) => ({
  // ...
});
```

## Action Types

### NamedAction

Action with named type for DevTools.

```typescript
type NamedAction<T extends string, P = void> = P extends void
  ? { type: T }
  : { type: T; payload: P };
```

**Example:**

```typescript
type IncrementAction = NamedAction<'counter/increment'>;
type SetValueAction = NamedAction<'counter/setValue', number>;
```

### ActionCreator

Action creator function type.

```typescript
type ActionCreator<TPayload = void> = TPayload extends void
  ? () => void
  : (payload: TPayload) => void;
```

**Example:**

```typescript
const increment: ActionCreator = () => {
  // No payload
};

const setValue: ActionCreator<number> = (value) => {
  // With payload
};
```

## Selector Types

### Selector

Selector function type.

```typescript
type Selector<TState, TResult> = (state: TState) => TResult;
```

**Example:**

```typescript
const selectLocale: Selector<StoreState, string> = (state) => state.locale;
```

### EqualityFn

Equality function for selectors.

```typescript
type EqualityFn<T> = (a: T, b: T) => boolean;
```

**Built-in equality functions:**

```typescript
// Reference equality (default)
Object.is(a, b)

// Shallow equality
import { shallow } from 'zustand/shallow';
shallow(a, b)

// Custom
const customEquals: EqualityFn<MyType> = (a, b) => {
  return a.id === b.id && a.name === b.name;
};
```

### ParameterizedSelector

Parameterized selector (selector factory).

```typescript
type ParameterizedSelector<TState, TParam, TResult> = (
  param: TParam
) => Selector<TState, TResult>;
```

**Example:**

```typescript
const selectUserById: ParameterizedSelector<StoreState, string, User | undefined> =
  (id) => (state) => state.users.find(u => u.id === id);
```

## Slice Types

### SliceWithActions

Store slice with actions.

```typescript
interface SliceWithActions<TState, TActions> {
  state: TState;
  actions: TActions;
}
```

### SliceDefinition

Slice configuration.

```typescript
interface SliceDefinition<
  TState extends object,
  TActions extends Record<string, (...args: unknown[]) => void>
> {
  name: string;
  initialState: TState;
  actions: TActions;
}
```

## Hydration Types

### HydrationState

Hydration state for persisted stores.

```typescript
interface HydrationState {
  _hasHydrated: boolean;
  _setHasHydrated: (hydrated: boolean) => void;
}
```

**Usage:**

```typescript
const hasHydrated = useStore((s) => s._hasHydrated);
```

### ResetState

Reset capability for stores.

```typescript
interface ResetState {
  _reset: () => void;
}
```

**Usage:**

```typescript
useStore.getState()._reset();
```

### StoreUtilities

Combined store utilities.

```typescript
type StoreUtilities = HydrationState & ResetState;
```

## Feature Store Types

### FeatureStoreRegistry

Feature store registration interface.

```typescript
interface FeatureStoreRegistry {
  register: <T>(name: string, store: T) => void;
  unregister: (name: string) => void;
  getStore: <T>(name: string) => T | undefined;
  getAllStores: () => Map<string, unknown>;
  reset: () => void;
}
```

### FeatureStoreMeta

Feature store metadata.

```typescript
interface FeatureStoreMeta {
  name: string;
  version?: number;
  registeredAt: number;
}
```

### EnhancedStore

Store with enhanced capabilities.

```typescript
type EnhancedStore<TState> = UseBoundStore<StoreApi<TState>> & {
  /** Feature name (for feature stores) */
  featureName?: string;
  /** Unregister from global registry */
  unregister?: () => void;
  /** Reset to initial state */
  reset?: () => void;
};
```

**Example:**

```typescript
const useTasksStore: EnhancedStore<TasksState & TasksActions> = createFeatureStore(/*...*/);

// Enhanced methods
useTasksStore.featureName; // 'tasks'
useTasksStore.unregister();
useTasksStore.reset?.();
```

## Listener Types

### ListenerEvent

Listener middleware event.

```typescript
interface ListenerEvent<TState> {
  type: string;
  payload?: unknown;
  prevState: TState;
  nextState: TState;
}
```

### ListenerCallback

Listener callback function.

```typescript
type ListenerCallback<TState> = (event: ListenerEvent<TState>) => void;
```

### ListenerConfig

Listener middleware configuration.

```typescript
interface ListenerConfig<TState> {
  /** Action types to listen for (empty = all) */
  actionTypes?: string[];
  /** State selector to watch */
  selector?: Selector<TState, unknown>;
  /** Callback function */
  callback: ListenerCallback<TState>;
}
```

## Persistence Types

### PersistConfig

Persistence configuration.

```typescript
interface PersistConfig<TState> {
  /** Storage key */
  key: string;
  /** State to persist (whitelist) */
  partialize?: (state: TState) => Partial<TState>;
  /** Storage version for migrations */
  version?: number;
  /** Migration functions */
  migrate?: (persistedState: unknown, version: number) => TState;
  /** Skip hydration (for manual hydration) */
  skipHydration?: boolean;
  /** Storage engine override */
  storage?: 'localStorage' | 'sessionStorage' | 'custom';
}
```

**Example:**

```typescript
const persistConfig: PersistConfig<MyState> = {
  key: 'my-store',
  partialize: (state) => ({ theme: state.theme, locale: state.locale }),
  version: 1,
  migrate: (persisted, version) => {
    if (version < 1) {
      return { ...(persisted as MyState), newField: 'default' };
    }
    return persisted as MyState;
  },
};
```

### MigrationFn

Migration function type.

```typescript
type MigrationFn<TState> = (
  persistedState: unknown,
  version: number
) => Partial<TState>;
```

**Example:**

```typescript
const migrations: Record<number, MigrationFn<MyState>> = {
  2: (state) => ({
    ...(state as MyState),
    newField: 'default',
  }),
};
```

## DevTools Types

### DevToolsConfig

DevTools configuration.

```typescript
interface DevToolsConfig {
  /** Store name in DevTools */
  name: string;
  /** Enable DevTools (default: development only) */
  enabled?: boolean;
  /** Anonymous action type for unnamed actions */
  anonymousActionType?: string;
  /** Enable trace (shows stack trace in DevTools) */
  trace?: boolean;
  /** Trace stack limit */
  traceLimit?: number;
}
```

**Example:**

```typescript
const devToolsConfig: DevToolsConfig = {
  name: 'MyStore',
  enabled: process.env.NODE_ENV === 'development',
  trace: true,
  traceLimit: 25,
};
```

## Store Configuration Types

### StoreConfig

Full store configuration.

```typescript
interface StoreConfig<TState> {
  /** Store name for DevTools */
  name: string;
  /** Persistence configuration */
  persist?: PersistConfig<TState>;
  /** DevTools configuration */
  devtools?: boolean | DevToolsConfig;
  /** Enable subscribeWithSelector */
  subscribeWithSelector?: boolean;
  /** Enable immer */
  immer?: boolean;
}
```

### FeatureStoreConfig

Feature store configuration.

```typescript
interface FeatureStoreConfig<TState> extends StoreConfig<TState> {
  /** Auto-register with global registry */
  register?: boolean;
  /** Lazy initialization */
  lazy?: boolean;
}
```

## Slice Factory Types

### SliceConfig

Configuration for creating a slice.

```typescript
interface SliceConfig<TState, TActions> {
  /** Slice name (used in DevTools action prefixes) */
  name: string;
  /** Initial state */
  initialState: TState;
  /** Action creators */
  actions: (set: SliceSetter<TState>, get: SliceGetter<TState>) => TActions;
}
```

### SliceSetter

Slice setter with automatic action naming.

```typescript
type SliceSetter<TState> = {
  /**
   * Update state with an updater function (Immer-style)
   * @param updater - Function that mutates draft state
   * @param actionName - Optional action name for DevTools
   */
  (updater: (state: Draft<TState>) => void, actionName?: string): void;
  /**
   * Update state with partial state
   * @param partial - Partial state to merge
   * @param actionName - Optional action name for DevTools
   */
  (partial: Partial<TState>, actionName?: string): void;
};
```

### SliceGetter

Slice getter that returns only slice state.

```typescript
type SliceGetter<TState> = () => TState;
```

### Slice Utility Types

```typescript
/** Extract state type from a slice config */
type SliceState<T> = T extends SliceConfig<infer S, unknown> ? S : never;

/** Extract actions type from a slice config */
type SliceActions<T> = T extends SliceConfig<unknown, infer A> ? A : never;

/** Extract full slice type (state + actions) from a slice config */
type SliceType<T> = T extends SliceConfig<infer S, infer A> ? S & A : never;
```

**Example:**

```typescript
const counterSlice = createSlice({
  name: 'counter',
  initialState: { count: 0 },
  actions: (set) => ({
    increment: () => set((s) => { s.count += 1 }, 'increment'),
  }),
});

type CounterState = SliceState<typeof counterSlice>; // { count: number }
type CounterActions = SliceActions<typeof counterSlice>; // { increment: () => void }
type Counter = SliceType<typeof counterSlice>; // { count: number; increment: () => void }
```

## Sync Types

### SyncMessageType

Sync message types.

```typescript
type SyncMessageType =
  | 'STATE_UPDATE'
  | 'STATE_REQUEST'
  | 'STATE_RESPONSE'
  | 'LEADER_ELECTION'
  | 'LEADER_ANNOUNCE'
  | 'TAB_PING'
  | 'TAB_PONG'
  | 'HEARTBEAT';
```

### SyncMessage

Sync message structure.

```typescript
interface SyncMessage<TState = unknown> {
  type: SyncMessageType;
  tabId: string;
  timestamp: number;
  payload?: {
    state?: Partial<TState>;
    keys?: string[];
    leaderId?: string;
    priority?: number;
  };
}
```

### ConflictStrategy

Conflict resolution strategy.

```typescript
type ConflictStrategy = 'last-write-wins' | 'first-write-wins' | 'merge' | 'custom';
```

### BroadcastSyncConfig

Sync configuration.

```typescript
interface BroadcastSyncConfig<TState> {
  /** BroadcastChannel name (should be unique per app) */
  channelName: string;

  /** State keys to synchronize (empty = sync all) */
  syncKeys?: (keyof TState)[];

  /** Keys to never sync (e.g., sensitive data) */
  excludeKeys?: (keyof TState)[];

  /** Throttle sync messages (ms) */
  throttleMs?: number;

  /** Debounce sync messages (ms) */
  debounceMs?: number;

  /** Conflict resolution strategy */
  conflictStrategy?: ConflictStrategy;

  /** Custom conflict resolver */
  customResolver?: (local: Partial<TState>, remote: Partial<TState>) => Partial<TState>;

  /** Enable leader election */
  enableLeaderElection?: boolean;

  /** Leader heartbeat interval (ms) */
  leaderHeartbeatMs?: number;

  /** Log sync events to console (dev only) */
  debug?: boolean;

  /** Callback when sync state changes */
  onSyncStateChange?: (state: 'connected' | 'disconnected' | 'leader' | 'follower') => void;

  /** Callback when remote update received */
  onRemoteUpdate?: (keys: string[], source: string) => void;

  /** Filter function to determine if a state change should be synced */
  shouldSync?: (prevState: TState, nextState: TState) => boolean;
}
```

### BroadcastSyncInstance

Sync instance interface.

```typescript
interface BroadcastSyncInstance<TState> {
  /** Start synchronization */
  start: () => void;
  /** Stop synchronization */
  stop: () => void;
  /** Check if sync is active */
  isActive: () => boolean;
  /** Check if this tab is the leader */
  isLeader: () => boolean;
  /** Get current tab ID */
  getTabId: () => string;
  /** Request full state from other tabs */
  requestState: () => void;
  /** Broadcast current state to other tabs */
  broadcastState: (keys?: (keyof TState)[]) => void;
  /** Get connected tab count (approximate) */
  getConnectedTabs: () => number;
  /** Force this tab to become leader */
  forceLeader: () => void;
}
```

## Usage Examples

### Typed Store

```typescript
import type { StoreState, StoreSelector } from '@missionfabric-js/enzyme';

// Selector with type inference
const selectLocale: StoreSelector<string> = (state: StoreState) => state.locale;

// Component usage
const locale = useStore(selectLocale);
```

### Typed Slice

```typescript
import type { SliceConfig } from '@missionfabric-js/enzyme';

interface CounterState {
  count: number;
}

interface CounterActions {
  increment: () => void;
  decrement: () => void;
}

const counterSliceConfig: SliceConfig<CounterState, CounterActions> = {
  name: 'counter',
  initialState: { count: 0 },
  actions: (set) => ({
    increment: () => set((s) => { s.count += 1 }, 'increment'),
    decrement: () => set((s) => { s.count -= 1 }, 'decrement'),
  }),
};
```

### Typed Feature Store

```typescript
import type { CreateFeatureStoreConfig, EnhancedStore } from '@missionfabric-js/enzyme';

interface TasksState {
  tasks: Task[];
}

interface TasksActions {
  addTask: (task: Task) => void;
}

const config: CreateFeatureStoreConfig<TasksState> = {
  name: 'tasks',
  persist: {
    partialize: (state) => ({ tasks: state.tasks }),
  },
};

const useTasksStore: EnhancedStore<TasksState & TasksActions> = createFeatureStore(/*...*/);
```

### Typed Selector

```typescript
import type { Selector, ParameterizedSelector } from '@missionfabric-js/enzyme';

// Simple selector
const selectTheme: Selector<StoreState, string> = (state) => state.theme;

// Parameterized selector
const selectUserById: ParameterizedSelector<StoreState, string, User | undefined> =
  (id) => (state) => state.users.find(u => u.id === id);
```

## Type Utilities

### Type Inference

TypeScript automatically infers types from slice configurations:

```typescript
const mySlice = createSlice({
  name: 'example',
  initialState: { count: 0, name: '' },
  actions: (set) => ({
    increment: () => set((s) => { s.count += 1 }),
    setName: (name: string) => set((s) => { s.name = name }),
  }),
});

// Types are automatically inferred:
type State = { count: number; name: string };
type Actions = {
  increment: () => void;
  setName: (name: string) => void;
};
```

### Type Extraction

```typescript
import type { SliceState, SliceActions, SliceType } from '@missionfabric-js/enzyme';

type MyState = SliceState<typeof mySlice>;
type MyActions = SliceActions<typeof mySlice>;
type MySlice = SliceType<typeof mySlice>;
```

### Generic Constraints

```typescript
// Ensure state is an object
function createTypedStore<TState extends object>(
  initialState: TState
) {
  return createSimpleStore((set) => ({
    ...initialState,
    reset: () => set(initialState),
  }), 'TypedStore');
}
```

## Best Practices

### 1. Export Types from Slices

```typescript
// slices/counter.ts
export interface CounterState {
  count: number;
}

export interface CounterActions {
  increment: () => void;
}

export type CounterSlice = CounterState & CounterActions;

export const counterSlice = createSlice<CounterState, CounterActions>(/*...*/);
```

### 2. Use Type Aliases for Complex Types

```typescript
// types.ts
export type StoreSelector<T> = (state: StoreState) => T;
export type StoreAction<T extends (...args: any[]) => any> = T;
```

### 3. Leverage Type Inference

```typescript
// ✅ Good - Types inferred
const selectLocale = (state: StoreState) => state.locale;

// ❌ Unnecessary - Explicit typing not needed
const selectLocale: Selector<StoreState, string> = (state: StoreState) => state.locale;
```

### 4. Use Generics for Reusable Code

```typescript
function createBoundSelector<TState, TResult>(
  selector: Selector<TState, TResult>,
  store: UseBoundStore<StoreApi<TState>>
): () => TResult {
  return () => store(selector);
}
```

## Related Documentation

### State Management Core
- [Core](./CORE.md) - Store and slice factories
- [Stores](./STORES.md) - Store architecture
- [Hooks](./HOOKS.md) - React hooks
- [Selectors](./SELECTORS.md) - Selector patterns
- [Slices](./SLICES.md) - Slice documentation
- [Sync](./SYNC.md) - Multi-tab synchronization
- [README](./README.md) - State management overview

### TypeScript Resources
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) - Official TypeScript docs
- [Zustand TypeScript Guide](https://github.com/pmndrs/zustand#typescript) - Zustand with TypeScript
- [Immer TypeScript](https://immerjs.github.io/immer/typescript) - Immer type definitions

### Best Practices
- [Architecture](../ARCHITECTURE.md) - System design with TypeScript
- [Testing Guide](../TESTING.md) - Testing typed stores
