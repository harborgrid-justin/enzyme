# State Module

> **Purpose:** Production-grade state management built on Zustand with TypeScript safety, DevTools integration, and
> cross-tab synchronization.

## Overview

The State module provides a modern, lightweight alternative to Redux for React applications. Built on Zustand, it offers
a simple yet powerful API for managing application state with minimal boilerplate.

This module goes beyond basic Zustand by adding immutable updates via Immer, persistence with localStorage, automatic
DevTools integration, type-safe selectors, and the ability to create feature-scoped stores that can be dynamically
registered. It also includes cross-tab synchronization via BroadcastChannel for consistent state across browser tabs.

Perfect for applications that need predictable state management without the ceremony of Redux, while maintaining type
safety and developer experience through comprehensive TypeScript support and Redux DevTools integration.

## Key Features

- Lightweight state management with Zustand
- Immutable updates using Immer (write mutable code, get immutable updates)
- Type-safe stores, slices, and selectors
- Automatic Redux DevTools integration
- localStorage persistence with hydration
- Memoized selectors for performance
- Slice-based architecture for code organization
- Feature store registration system
- Cross-tab state synchronization via BroadcastChannel
- No Provider wrapper required (stores are singletons)
- Middleware support (logging, persistence, etc.)
- Time-travel debugging via DevTools
- Store reset and hydration utilities

## Quick Start

```tsx
import { useStore } from '@/lib/state';

// Access state in any component
function Counter() {
  const count = useStore((state) => state.ui.count);
  const increment = useStore((state) => state.ui.increment);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
}

// Create a custom slice
import { createSlice } from '@/lib/state';

const todoSlice = createSlice({
  name: 'todos',
  initialState: {
    items: [],
    filter: 'all',
  },
  actions: (set, get) => ({
    addTodo: (text) => set((state) => {
      state.todos.items.push({ id: Date.now(), text, done: false });
    }),
    toggleTodo: (id) => set((state) => {
      const todo = state.todos.items.find(t => t.id === id);
      if (todo) todo.done = !todo.done;
    }),
    setFilter: (filter) => set((state) => {
      state.todos.filter = filter;
    }),
  }),
});
```

## Exports

### Core Store

- `useStore` - Primary hook for accessing global state
- `getStoreState()` - Get current state outside React
- `subscribeToStore()` - Subscribe to state changes
- `resetStore()` - Reset store to initial state
- `clearPersistedStore()` - Clear localStorage persistence

### Feature Stores

- `registerFeatureStore()` - Register a feature-scoped store
- `unregisterFeatureStore()` - Unregister feature store
- `getFeatureStore()` - Access feature store
- `getFeatureStoreNames()` - List registered stores
- `resetAllFeatureStores()` - Reset all feature stores

### Slices (Built-in)

- `sessionSlice` - User session data
- `settingsSlice` - Application settings
- `uiSlice` - UI state (modals, sidebars, etc.)

### Factories

- `createStore()` - Create custom Zustand store
- `createSlice()` - Create state slice with actions
- `createSelectors()` - Create memoized selectors
- `createFeatureStore()` - Create feature-scoped store
- `createAction()` - Create standalone action
- `combineSlices()` - Combine multiple slices

### Selectors

- `createSelector()` - Create memoized selector
- `createObjectSelector()` - Selector for object equality
- `createArraySelector()` - Selector for array equality
- `createParameterizedSelector()` - Selector with parameters
- `combineSelectors()` - Combine multiple selectors
- `pickSelector()` - Pick properties from state
- `omitSelector()` - Omit properties from state

### Synchronization

- `createBroadcastSync()` - Create cross-tab sync
- `useBroadcastSync` - Hook for sync management

### Types

- `StoreState` - Global store state type
- `StoreSelector<T>` - Selector function type
- `SliceCreator` - Slice factory function type
- `SliceActions` - Action definitions type
- `FeatureStoreConfig` - Feature store configuration

## Architecture

The State module follows a slice-based architecture similar to Redux Toolkit:

```
┌──────────────────────────────────────┐
│         Global Store (Zustand)        │
│  ┌────────────────────────────────┐  │
│  │      Session Slice             │  │
│  ├────────────────────────────────┤  │
│  │      Settings Slice            │  │
│  ├────────────────────────────────┤  │
│  │      UI Slice                  │  │
│  ├────────────────────────────────┤  │
│  │      Custom Slices...          │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
         ↓                    ↓
    Persistence          DevTools
   (localStorage)      (Redux Panel)
```

### Integration Points

- **Auth Module**: Session slice stores user data
- **Theme Module**: Settings slice stores theme preference
- **Routing Module**: UI slice tracks navigation state
- **Feature Modules**: Feature stores for isolated state

## Common Patterns

### Pattern 1: Using Global Store

```tsx
import { useStore } from '@/lib/state';

function UserProfile() {
  // Select specific data (component only re-renders when this changes)
  const user = useStore((state) => state.session.user);
  const setUser = useStore((state) => state.session.setUser);

  return (
    <div>
      <h1>{user?.name}</h1>
      <button onClick={() => setUser({ ...user, name: 'New Name' })}>
        Update Name
      </button>
    </div>
  );
}

// Multiple selections
function Dashboard() {
  const { user, isLoading } = useStore((state) => ({
    user: state.session.user,
    isLoading: state.session.isLoading,
  }));

  if (isLoading) return <div>Loading...</div>;
  return <div>Welcome, {user.name}</div>;
}
```

### Pattern 2: Creating Custom Slices

```tsx
import { createSlice } from '@/lib/state';

// Define your slice
export const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [],
    total: 0,
  },
  actions: (set, get) => ({
    addItem: (product) => set((state) => {
      // Immer allows mutating syntax
      state.cart.items.push({
        ...product,
        quantity: 1,
      });
      state.cart.total += product.price;
    }),

    removeItem: (productId) => set((state) => {
      const index = state.cart.items.findIndex(item => item.id === productId);
      if (index !== -1) {
        const item = state.cart.items[index];
        state.cart.total -= item.price * item.quantity;
        state.cart.items.splice(index, 1);
      }
    }),

    updateQuantity: (productId, quantity) => set((state) => {
      const item = state.cart.items.find(item => item.id === productId);
      if (item) {
        state.cart.total += (quantity - item.quantity) * item.price;
        item.quantity = quantity;
      }
    }),

    clearCart: () => set((state) => {
      state.cart.items = [];
      state.cart.total = 0;
    }),
  }),
});

// Use in components
function ShoppingCart() {
  const items = useStore((state) => state.cart.items);
  const total = useStore((state) => state.cart.total);
  const removeItem = useStore((state) => state.cart.removeItem);

  return (
    <div>
      {items.map(item => (
        <div key={item.id}>
          {item.name} - ${item.price} x {item.quantity}
          <button onClick={() => removeItem(item.id)}>Remove</button>
        </div>
      ))}
      <div>Total: ${total}</div>
    </div>
  );
}
```

### Pattern 3: Memoized Selectors

```tsx
import { createSelector, useStore } from '@/lib/state';

// Create memoized selector (only recomputes when dependencies change)
const selectFilteredTodos = createSelector(
  (state) => state.todos.items,
  (state) => state.todos.filter,
  (items, filter) => {
    switch (filter) {
      case 'active':
        return items.filter(todo => !todo.done);
      case 'completed':
        return items.filter(todo => todo.done);
      default:
        return items;
    }
  }
);

function TodoList() {
  const todos = useStore(selectFilteredTodos);

  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}
```

### Pattern 4: Feature Stores

```tsx
import { createFeatureStore, registerFeatureStore } from '@/lib/state';

// Create isolated feature store
const notificationStore = createFeatureStore({
  name: 'notifications',
  initialState: {
    items: [],
    unreadCount: 0,
  },
  actions: (set) => ({
    addNotification: (notification) => set((state) => {
      state.items.push({ ...notification, id: Date.now() });
      state.unreadCount++;
    }),
    markAsRead: (id) => set((state) => {
      const notification = state.items.find(n => n.id === id);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount--;
      }
    }),
    clearAll: () => set((state) => {
      state.items = [];
      state.unreadCount = 0;
    }),
  }),
});

// Register the store
registerFeatureStore('notifications', notificationStore);

// Use in components
function NotificationBell() {
  const unreadCount = notificationStore.use((state) => state.unreadCount);

  return (
    <button>
      Notifications {unreadCount > 0 && `(${unreadCount})`}
    </button>
  );
}
```

### Pattern 5: Cross-Tab Synchronization

```tsx
import { useBroadcastSync } from '@/lib/state';

function App() {
  // Sync specific state across tabs
  useBroadcastSync({
    channelName: 'app-state',
    syncKeys: ['session.user', 'settings.theme'],
    onSync: (message) => {
      console.log('State synced from another tab:', message);
    },
  });

  return <YourApp />;
}

// Now when user logs in on one tab, all tabs update automatically
```

## Configuration

### Store Configuration

```tsx
import { createAppStore } from '@/lib/state';

const store = createAppStore({
  // Enable persistence
  persist: {
    name: 'app-storage',
    partialize: (state) => ({
      session: state.session,
      settings: state.settings,
    }),
  },

  // DevTools options
  devtools: {
    name: 'MyApp Store',
    enabled: import.meta.env.DEV,
  },

  // Initial state
  initialState: {
    session: {
      user: null,
      isAuthenticated: false,
    },
  },
});
```

### Slice Configuration

```tsx
import { createSlice } from '@/lib/state';

const mySlice = createSlice({
  name: 'myFeature',

  // Initial state
  initialState: {
    data: [],
    isLoading: false,
    error: null,
  },

  // Actions with access to set and get
  actions: (set, get) => ({
    fetchData: async () => {
      set((state) => { state.myFeature.isLoading = true; });

      try {
        const data = await api.getData();
        set((state) => {
          state.myFeature.data = data;
          state.myFeature.isLoading = false;
        });
      } catch (error) {
        set((state) => {
          state.myFeature.error = error.message;
          state.myFeature.isLoading = false;
        });
      }
    },
  }),

  // Computed values (selectors)
  selectors: {
    selectValidItems: (state) =>
      state.myFeature.data.filter(item => item.isValid),
  },
});
```

## Testing

### Testing Components with State

```tsx
import { renderHook, act } from '@testing-library/react';
import { useStore, resetStore } from '@/lib/state';

describe('Counter', () => {
  beforeEach(() => {
    resetStore(); // Reset to initial state before each test
  });

  it('increments count', () => {
    const { result } = renderHook(() => useStore((state) => ({
      count: state.ui.count,
      increment: state.ui.increment,
    })));

    expect(result.current.count).toBe(0);

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });
});
```

### Testing Slices

```tsx
import { createSlice } from '@/lib/state';

describe('todoSlice', () => {
  it('adds todo', () => {
    const { initialState, actions } = todoSlice;
    const state = { todos: initialState };

    const newState = actions.addTodo(state, 'Buy milk');

    expect(newState.todos.items).toHaveLength(1);
    expect(newState.todos.items[0].text).toBe('Buy milk');
  });
});
```

## Performance Considerations

1. **Selector Granularity**: Select only what you need to minimize re-renders
2. **Memoized Selectors**: Use `createSelector` for expensive computations
3. **Shallow Equality**: Zustand uses shallow equality by default
4. **Bundle Size**: Core ~3KB, Immer ~14KB, Persist ~2KB gzipped
5. **Memory**: State kept in memory, persistence to localStorage is async
6. **Broadcast Sync**: Uses structured cloning, avoid syncing large objects

## Troubleshooting

### Issue: Component Re-renders Too Often

**Solution:** Make selectors more specific:

```tsx
// Bad - selects entire object, re-renders on any change
const state = useStore((state) => state.todos);

// Good - only re-renders when items change
const items = useStore((state) => state.todos.items);
```

### Issue: State Not Persisting

**Solution:** Ensure persistence is enabled and key is unique:

```tsx
createAppStore({
  persist: {
    name: 'unique-storage-key',
    partialize: (state) => ({ session: state.session }),
  },
});
```

### Issue: DevTools Not Showing Actions

**Solution:** Ensure actions are named in slice creator:

```tsx
createSlice({
  name: 'mySlice', // This name appears in DevTools
  actions: (set) => ({
    myAction: () => set(...), // Action name shown
  }),
});
```

### Issue: Cross-Tab Sync Not Working

**Solution:** Ensure same channel name and browser supports BroadcastChannel:

```tsx
// Check support
if ('BroadcastChannel' in window) {
  useBroadcastSync({ channelName: 'app-state' });
}
```

## See Also

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Immer Documentation](https://immerjs.github.io/immer/)
- [State Slices](./slices/README.md)
- [Feature Stores](./core/createFeatureStore.ts)
- [Auth Module](../auth/README.md) - Session state
- [Theme Module](../theme/README.md) - Theme state

---

**Version:** 3.0.0
**Last Updated:** 2025-11-27
