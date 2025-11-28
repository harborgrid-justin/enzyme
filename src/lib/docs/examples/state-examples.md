# State Management Examples

> 30+ practical state management examples using Zustand in the Harbor React Library.

## Table of Contents

- [Basic Store Setup](#basic-store-setup)
- [Store Slices](#store-slices)
- [Selectors and Performance](#selectors-and-performance)
- [Middleware](#middleware)
- [DevTools Integration](#devtools-integration)
- [Persistence](#persistence)
- [Async Actions](#async-actions)
- [State Normalization](#state-normalization)
- [Computed Values](#computed-values)
- [Advanced Patterns](#advanced-patterns)
- [Best Practices](#best-practices)
- [Anti-Patterns](#anti-patterns)

---

## Basic Store Setup

### Example 1: Simple Store
**Use Case:** Basic counter store with actions
**Difficulty:** ⭐ Basic

```tsx
import { create } from 'zustand';

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));

// Usage in component
function Counter() {
  const { count, increment, decrement, reset } = useCounterStore();

  return (
    <div>
      <h2>Count: {count}</h2>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

**Explanation:** Creates a simple Zustand store with state and actions. State updates are immutable and trigger re-renders.

**See Also:**
- [Example 2](#example-2-store-with-computed-properties)
- [Zustand Documentation](https://github.com/pmndrs/zustand)

---

### Example 2: Store with Computed Properties
**Use Case:** Derived state without manual updates
**Difficulty:** ⭐ Basic

```tsx
interface TodoState {
  todos: Todo[];
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  // Computed properties
  completedCount: () => number;
  activeCount: () => number;
  progress: () => number;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],

  addTodo: (text) =>
    set((state) => ({
      todos: [...state.todos, { id: nanoid(), text, completed: false }],
    })),

  toggleTodo: (id) =>
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      ),
    })),

  // Computed getters using get()
  completedCount: () => get().todos.filter((t) => t.completed).length,
  activeCount: () => get().todos.filter((t) => !t.completed).length,
  progress: () => {
    const total = get().todos.length;
    return total === 0 ? 0 : (get().completedCount() / total) * 100;
  },
}));
```

**Explanation:** Use `get()` to access current state for computed properties. These are functions that calculate values on-demand.

---

### Example 3: Multiple Independent Stores
**Use Case:** Separate stores for different concerns
**Difficulty:** ⭐ Basic

```tsx
// User store
export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));

// Theme store
export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'light',
  toggleTheme: () =>
    set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
}));

// Settings store
export const useSettingsStore = create<SettingsState>((set) => ({
  notifications: true,
  language: 'en',
  updateSettings: (settings) => set(settings),
}));

// Usage: Each component uses only what it needs
function Header() {
  const user = useUserStore((state) => state.user);
  const theme = useThemeStore((state) => state.theme);

  return <header data-theme={theme}>{user?.name}</header>;
}
```

**Explanation:** Separate stores prevent unnecessary re-renders and improve code organization by domain.

---

## Store Slices

### Example 4: Slice Pattern
**Use Case:** Modular store architecture for large apps
**Difficulty:** ⭐⭐ Intermediate

```tsx
// types.ts
export interface UserSlice {
  user: User | null;
  setUser: (user: User) => void;
  logout: () => void;
}

export interface CartSlice {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

// slices/userSlice.ts
export const createUserSlice: StateCreator<
  UserSlice & CartSlice,
  [],
  [],
  UserSlice
> = (set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
});

// slices/cartSlice.ts
export const createCartSlice: StateCreator<
  UserSlice & CartSlice,
  [],
  [],
  CartSlice
> = (set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
  clearCart: () => set({ items: [] }),
});

// store.ts
export const useAppStore = create<UserSlice & CartSlice>()((...a) => ({
  ...createUserSlice(...a),
  ...createCartSlice(...a),
}));
```

**Explanation:** Slices allow modular state management. Each slice is independently maintainable and testable.

**See Also:**
- [Example 5](#example-5-slice-with-cross-slice-actions)

---

### Example 5: Slice with Cross-Slice Actions
**Use Case:** Actions that use state/actions from multiple slices
**Difficulty:** ⭐⭐ Intermediate

```tsx
export const createOrderSlice: StateCreator<
  UserSlice & CartSlice & OrderSlice,
  [],
  [],
  OrderSlice
> = (set, get) => ({
  orders: [],

  // This action uses both cart and user slices
  createOrder: async () => {
    const { items, clearCart } = get();
    const { user } = get();

    if (!user) throw new Error('Must be logged in');
    if (items.length === 0) throw new Error('Cart is empty');

    const order = await api.createOrder({
      userId: user.id,
      items,
      total: items.reduce((sum, item) => sum + item.price, 0),
    });

    set((state) => ({ orders: [...state.orders, order] }));
    clearCart(); // Call action from cart slice

    return order;
  },
});
```

**Explanation:** Use `get()` to access state and actions from other slices, enabling cross-cutting concerns.

---

### Example 6: Typed Slice Helpers
**Use Case:** Type-safe slice creation with helpers
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { StateCreator } from 'zustand';

// Helper type for creating slices
type SliceCreator<T> = StateCreator<
  T,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  T
>;

// Define slices with helper
const createAuthSlice: SliceCreator<AuthSlice> = (set, get) => ({
  isAuthenticated: false,
  token: null,
  login: async (credentials) => {
    const { token } = await authApi.login(credentials);
    set({ isAuthenticated: true, token });
  },
  logout: () => set({ isAuthenticated: false, token: null }),
});

const createDataSlice: SliceCreator<DataSlice> = (set, get) => ({
  data: [],
  fetchData: async () => {
    const data = await api.fetch();
    set({ data });
  },
});

// Combine slices
export const useStore = create<AuthSlice & DataSlice>()(
  devtools(
    persist(
      (...a) => ({
        ...createAuthSlice(...a),
        ...createDataSlice(...a),
      }),
      { name: 'app-store' }
    )
  )
);
```

**Explanation:** Type helpers ensure type safety across middleware and slices.

---

## Selectors and Performance

### Example 7: Granular Selectors
**Use Case:** Prevent unnecessary re-renders
**Difficulty:** ⭐⭐ Intermediate

```tsx
// ❌ Bad: Component re-renders on ANY store change
function BadComponent() {
  const store = useStore();
  return <div>{store.user.name}</div>;
}

// ✅ Good: Only re-renders when user.name changes
function GoodComponent() {
  const userName = useStore((state) => state.user.name);
  return <div>{userName}</div>;
}

// ✅ Better: Custom selector hook
function useUserName() {
  return useStore((state) => state.user.name);
}

function BetterComponent() {
  const userName = useUserName();
  return <div>{userName}</div>;
}
```

**Explanation:** Granular selectors using selector functions prevent re-renders when unrelated state changes.

---

### Example 8: Shallow Equality Selectors
**Use Case:** Select multiple values efficiently
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { shallow } from 'zustand/shallow';

// Select multiple primitive values
function UserProfile() {
  const { name, email, avatar } = useStore(
    (state) => ({
      name: state.user.name,
      email: state.user.email,
      avatar: state.user.avatar,
    }),
    shallow // Prevent re-render if values haven't changed
  );

  return (
    <div>
      <img src={avatar} />
      <h2>{name}</h2>
      <p>{email}</p>
    </div>
  );
}

// Select multiple actions (actions are stable, but good practice)
function TodoControls() {
  const { addTodo, clearCompleted, toggleAll } = useTodoStore(
    (state) => ({
      addTodo: state.addTodo,
      clearCompleted: state.clearCompleted,
      toggleAll: state.toggleAll,
    }),
    shallow
  );

  return (
    <div>
      <button onClick={() => addTodo('New task')}>Add</button>
      <button onClick={clearCompleted}>Clear</button>
      <button onClick={toggleAll}>Toggle All</button>
    </div>
  );
}
```

**Explanation:** Use `shallow` comparison for objects/arrays to prevent re-renders when content is the same.

---

### Example 9: Computed Selectors
**Use Case:** Memoized derived state
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { useMemo } from 'react';

// Store
export const useProductStore = create<ProductState>((set) => ({
  products: [],
  filters: { category: null, minPrice: 0, maxPrice: Infinity },
  setFilters: (filters) => set({ filters }),
}));

// Selector hook with memoization
export function useFilteredProducts() {
  const products = useProductStore((state) => state.products);
  const filters = useProductStore((state) => state.filters);

  return useMemo(() => {
    return products.filter((p) => {
      if (filters.category && p.category !== filters.category) return false;
      if (p.price < filters.minPrice || p.price > filters.maxPrice) return false;
      return true;
    });
  }, [products, filters]);
}

// Usage
function ProductList() {
  const filteredProducts = useFilteredProducts();

  return (
    <div>
      {filteredProducts.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

**Explanation:** Combine Zustand selectors with `useMemo` for expensive computed values.

---

### Example 10: Selector Factory Pattern
**Use Case:** Reusable parameterized selectors
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
// Selector factory
const selectTodoById = (id: string) => (state: TodoState) =>
  state.todos.find((todo) => todo.id === id);

const selectTodosByStatus = (completed: boolean) => (state: TodoState) =>
  state.todos.filter((todo) => todo.completed === completed);

// Usage
function TodoItem({ id }: { id: string }) {
  const todo = useTodoStore(selectTodoById(id));

  if (!todo) return null;

  return <div>{todo.text}</div>;
}

function CompletedTodos() {
  const completedTodos = useTodoStore(selectTodosByStatus(true));

  return (
    <ul>
      {completedTodos.map((todo) => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}
```

**Explanation:** Factory pattern creates reusable, parameterized selectors for common queries.

---

## Middleware

### Example 11: Logger Middleware
**Use Case:** Debug state changes in development
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { StateCreator, StoreMutatorIdentifier } from 'zustand';

type Logger = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  f: StateCreator<T, Mps, Mcs>,
  name?: string
) => StateCreator<T, Mps, Mcs>;

const logger: Logger = (f, name) => (set, get, store) => {
  const loggedSet: typeof set = (...args) => {
    console.log(`[${name || 'Store'}] Previous:`, get());
    set(...args);
    console.log(`[${name || 'Store'}] Next:`, get());
  };

  return f(loggedSet, get, store);
};

// Usage
export const useStore = create<State>()(
  logger(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
    }),
    'Counter'
  )
);
```

**Explanation:** Logger middleware logs state before and after each update for debugging.

---

### Example 12: Immer Middleware
**Use Case:** Mutable-style updates with immutability
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { immer } from 'zustand/middleware/immer';

interface State {
  user: {
    profile: {
      name: string;
      settings: {
        notifications: boolean;
      };
    };
  };
  updateNotifications: (enabled: boolean) => void;
}

export const useStore = create<State>()(
  immer((set) => ({
    user: {
      profile: {
        name: 'John',
        settings: {
          notifications: true,
        },
      },
    },

    // Without immer - manual immutable update
    updateNotifications: (enabled) =>
      set((state) => ({
        user: {
          ...state.user,
          profile: {
            ...state.user.profile,
            settings: {
              ...state.user.profile.settings,
              notifications: enabled,
            },
          },
        },
      })),

    // With immer - mutable-style update
    updateNotifications: (enabled) =>
      set((draft) => {
        draft.user.profile.settings.notifications = enabled;
      }),
  }))
);
```

**Explanation:** Immer middleware allows intuitive mutable-style updates while maintaining immutability.

---

## DevTools Integration

### Example 13: Basic DevTools
**Use Case:** Debug state with Redux DevTools
**Difficulty:** ⭐ Basic

```tsx
import { devtools } from 'zustand/middleware';

export const useStore = create<State>()(
  devtools(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 }), false, 'increment'),
      decrement: () => set((state) => ({ count: state.count - 1 }), false, 'decrement'),
    }),
    { name: 'CounterStore' }
  )
);
```

**Explanation:** DevTools middleware enables Redux DevTools integration with action names for debugging.

**See Also:**
- [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools)

---

### Example 14: DevTools with Action Types
**Use Case:** Better DevTools debugging with typed actions
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { devtools } from 'zustand/middleware';

const ActionTypes = {
  ADD_TODO: 'todos/add',
  TOGGLE_TODO: 'todos/toggle',
  DELETE_TODO: 'todos/delete',
  CLEAR_COMPLETED: 'todos/clearCompleted',
} as const;

export const useTodoStore = create<TodoState>()(
  devtools(
    (set) => ({
      todos: [],

      addTodo: (text) =>
        set(
          (state) => ({
            todos: [...state.todos, { id: nanoid(), text, completed: false }],
          }),
          false,
          ActionTypes.ADD_TODO
        ),

      toggleTodo: (id) =>
        set(
          (state) => ({
            todos: state.todos.map((todo) =>
              todo.id === id ? { ...todo, completed: !todo.completed } : todo
            ),
          }),
          false,
          { type: ActionTypes.TOGGLE_TODO, id } // Can pass object with data
        ),

      deleteTodo: (id) =>
        set(
          (state) => ({ todos: state.todos.filter((todo) => todo.id !== id) }),
          false,
          ActionTypes.DELETE_TODO
        ),

      clearCompleted: () =>
        set(
          (state) => ({ todos: state.todos.filter((todo) => !todo.completed) }),
          false,
          ActionTypes.CLEAR_COMPLETED
        ),
    }),
    { name: 'TodoStore' }
  )
);
```

**Explanation:** Named action types make DevTools history readable and debuggable.

---

## Persistence

### Example 15: Local Storage Persistence
**Use Case:** Persist state across browser sessions
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { persist, createJSONStorage } from 'zustand/middleware';

export const useStore = create<State>()(
  persist(
    (set) => ({
      user: null,
      preferences: {
        theme: 'light',
        language: 'en',
      },
      setUser: (user) => set({ user }),
      updatePreferences: (prefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        })),
    }),
    {
      name: 'app-storage', // LocalStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

**Explanation:** Persist middleware automatically saves/loads state from localStorage.

---

### Example 16: Partial Persistence
**Use Case:** Only persist specific state properties
**Difficulty:** ⭐⭐ Intermediate

```tsx
export const useStore = create<State>()(
  persist(
    (set) => ({
      // Persisted
      preferences: { theme: 'light', language: 'en' },
      savedSearches: [],

      // Not persisted (temporary session state)
      isLoading: false,
      currentQuery: '',
      searchResults: [],

      setPreferences: (prefs) => set({ preferences: prefs }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        // Only persist these fields
        preferences: state.preferences,
        savedSearches: state.savedSearches,
      }),
    }
  )
);
```

**Explanation:** Use `partialize` to control which state properties are persisted.

---

### Example 17: Session Storage Persistence
**Use Case:** Persist state only for the session (tab)
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { persist, createJSONStorage } from 'zustand/middleware';

export const useFormStore = create<FormState>()(
  persist(
    (set) => ({
      formData: {},
      setFormData: (data) => set({ formData: data }),
      resetForm: () => set({ formData: {} }),
    }),
    {
      name: 'form-draft',
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage
    }
  )
);
```

**Explanation:** SessionStorage persists data only for the current tab session.

---

### Example 18: Custom Storage with Encryption
**Use Case:** Secure sensitive persisted data
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import { PersistStorage } from 'zustand/middleware';
import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.ENCRYPTION_KEY || 'default-key';

const encryptedStorage: PersistStorage<State> = {
  getItem: (name) => {
    const encrypted = localStorage.getItem(name);
    if (!encrypted) return null;

    try {
      const decrypted = CryptoJS.AES.decrypt(encrypted, SECRET_KEY).toString(
        CryptoJS.enc.Utf8
      );
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  },

  setItem: (name, value) => {
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(value),
      SECRET_KEY
    ).toString();
    localStorage.setItem(name, encrypted);
  },

  removeItem: (name) => {
    localStorage.removeItem(name);
  },
};

export const useSecureStore = create<State>()(
  persist(
    (set) => ({
      sensitiveData: null,
      setSensitiveData: (data) => set({ sensitiveData: data }),
    }),
    {
      name: 'secure-storage',
      storage: encryptedStorage,
    }
  )
);
```

**Explanation:** Custom storage implementation encrypts data before saving to localStorage.

---

## Async Actions

### Example 19: Basic Async Actions
**Use Case:** Fetch data and update store
**Difficulty:** ⭐⭐ Intermediate

```tsx
interface UserState {
  users: User[];
  isLoading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  isLoading: false,
  error: null,

  fetchUsers: async () => {
    set({ isLoading: true, error: null });

    try {
      const users = await api.getUsers();
      set({ users, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch users',
        isLoading: false,
      });
    }
  },
}));

// Usage
function UserList() {
  const { users, isLoading, error, fetchUsers } = useUserStore();

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error} />;

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

**Explanation:** Async actions manage loading and error states alongside data fetching.

---

### Example 20: Optimistic Updates
**Use Case:** Update UI immediately, rollback on error
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
interface TodoState {
  todos: Todo[];
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<void>;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],

  updateTodo: async (id, updates) => {
    // Save current state for rollback
    const previousTodos = get().todos;

    // Optimistic update
    set({
      todos: previousTodos.map((todo) =>
        todo.id === id ? { ...todo, ...updates } : todo
      ),
    });

    try {
      // Send to server
      await api.updateTodo(id, updates);
    } catch (error) {
      // Rollback on error
      set({ todos: previousTodos });
      toast.error('Failed to update todo');
      throw error;
    }
  },
}));
```

**Explanation:** Optimistic updates improve perceived performance by updating UI before server confirms.

---

### Example 21: Request Deduplication
**Use Case:** Prevent duplicate simultaneous requests
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
interface DataState {
  data: Data | null;
  isLoading: boolean;
  fetchData: () => Promise<void>;
}

// Track in-flight requests
const inflightRequests = new Map<string, Promise<any>>();

export const useDataStore = create<DataState>((set) => ({
  data: null,
  isLoading: false,

  fetchData: async () => {
    const key = 'fetchData';

    // Return existing promise if request is in-flight
    if (inflightRequests.has(key)) {
      return inflightRequests.get(key);
    }

    set({ isLoading: true });

    const promise = api
      .fetchData()
      .then((data) => {
        set({ data, isLoading: false });
        inflightRequests.delete(key);
      })
      .catch((error) => {
        set({ isLoading: false });
        inflightRequests.delete(key);
        throw error;
      });

    inflightRequests.set(key, promise);
    return promise;
  },
}));
```

**Explanation:** Deduplication prevents multiple simultaneous requests for the same data.

---

## State Normalization

### Example 22: Normalized Entity Store
**Use Case:** Efficient lookup and update of entities
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
interface NormalizedState {
  users: {
    byId: Record<string, User>;
    allIds: string[];
  };
  posts: {
    byId: Record<string, Post>;
    allIds: string[];
  };
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
}

export const useNormalizedStore = create<NormalizedState>((set) => ({
  users: {
    byId: {},
    allIds: [],
  },
  posts: {
    byId: {},
    allIds: [],
  },

  addUser: (user) =>
    set((state) => ({
      users: {
        byId: { ...state.users.byId, [user.id]: user },
        allIds: [...state.users.allIds, user.id],
      },
    })),

  updateUser: (id, updates) =>
    set((state) => ({
      users: {
        ...state.users,
        byId: {
          ...state.users.byId,
          [id]: { ...state.users.byId[id], ...updates },
        },
      },
    })),

  deleteUser: (id) =>
    set((state) => ({
      users: {
        byId: Object.fromEntries(
          Object.entries(state.users.byId).filter(([key]) => key !== id)
        ),
        allIds: state.users.allIds.filter((userId) => userId !== id),
      },
    })),
}));

// Selector for all users as array
export const useAllUsers = () =>
  useNormalizedStore((state) =>
    state.users.allIds.map((id) => state.users.byId[id])
  );

// Selector for single user
export const useUser = (id: string) =>
  useNormalizedStore((state) => state.users.byId[id]);
```

**Explanation:** Normalized structure enables O(1) lookups and efficient updates.

---

### Example 23: Entity Adapter Pattern
**Use Case:** Reusable entity management
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
function createEntityAdapter<T extends { id: string }>() {
  return {
    addOne: (state: { byId: Record<string, T>; allIds: string[] }, entity: T) => ({
      byId: { ...state.byId, [entity.id]: entity },
      allIds: state.allIds.includes(entity.id)
        ? state.allIds
        : [...state.allIds, entity.id],
    }),

    addMany: (state: { byId: Record<string, T>; allIds: string[] }, entities: T[]) => {
      const byId = { ...state.byId };
      const allIds = [...state.allIds];

      entities.forEach((entity) => {
        byId[entity.id] = entity;
        if (!allIds.includes(entity.id)) {
          allIds.push(entity.id);
        }
      });

      return { byId, allIds };
    },

    updateOne: (
      state: { byId: Record<string, T>; allIds: string[] },
      id: string,
      updates: Partial<T>
    ) => ({
      ...state,
      byId: {
        ...state.byId,
        [id]: { ...state.byId[id], ...updates },
      },
    }),

    removeOne: (state: { byId: Record<string, T>; allIds: string[] }, id: string) => {
      const { [id]: removed, ...byId } = state.byId;
      return {
        byId,
        allIds: state.allIds.filter((entityId) => entityId !== id),
      };
    },
  };
}

// Usage
const userAdapter = createEntityAdapter<User>();

interface State {
  users: { byId: Record<string, User>; allIds: string[] };
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
}

export const useStore = create<State>((set) => ({
  users: { byId: {}, allIds: [] },

  addUser: (user) =>
    set((state) => ({
      users: userAdapter.addOne(state.users, user),
    })),

  updateUser: (id, updates) =>
    set((state) => ({
      users: userAdapter.updateOne(state.users, id, updates),
    })),
}));
```

**Explanation:** Entity adapter provides reusable CRUD operations for normalized state.

---

## Computed Values

### Example 24: Memoized Selectors with Reselect
**Use Case:** Expensive computed values
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import { createSelector } from 'reselect';

// Base selectors
const selectProducts = (state: State) => state.products;
const selectFilters = (state: State) => state.filters;
const selectSortBy = (state: State) => state.sortBy;

// Memoized computed selector
const selectFilteredAndSortedProducts = createSelector(
  [selectProducts, selectFilters, selectSortBy],
  (products, filters, sortBy) => {
    console.log('Computing filtered products...'); // Only logs when dependencies change

    let filtered = products.filter((p) => {
      if (filters.category && p.category !== filters.category) return false;
      if (p.price < filters.minPrice || p.price > filters.maxPrice) return false;
      if (filters.inStock && !p.inStock) return false;
      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

    return filtered;
  }
);

// Usage
function ProductList() {
  const products = useProductStore(selectFilteredAndSortedProducts);

  return (
    <div>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

**Explanation:** Reselect memoizes expensive computations, only recalculating when dependencies change.

---

### Example 25: Computed Properties with Getters
**Use Case:** Derived state without storing duplicates
**Difficulty:** ⭐⭐ Intermediate

```tsx
interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  // Computed getters
  getSubtotal: () => number;
  getTax: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (item) =>
    set((state) => ({ items: [...state.items, item] })),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),

  // Computed values - calculated on demand
  getSubtotal: () =>
    get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

  getTax: () => get().getSubtotal() * 0.1, // 10% tax

  getTotal: () => get().getSubtotal() + get().getTax(),

  getItemCount: () =>
    get().items.reduce((count, item) => count + item.quantity, 0),
}));

// Usage
function CartSummary() {
  const { getSubtotal, getTax, getTotal, getItemCount } = useCartStore();

  return (
    <div>
      <p>Items: {getItemCount()}</p>
      <p>Subtotal: ${getSubtotal().toFixed(2)}</p>
      <p>Tax: ${getTax().toFixed(2)}</p>
      <p>Total: ${getTotal().toFixed(2)}</p>
    </div>
  );
}
```

**Explanation:** Getter functions compute derived state on-demand without storing redundant data.

---

## Advanced Patterns

### Example 26: Store Reset
**Use Case:** Reset store to initial state
**Difficulty:** ⭐⭐ Intermediate

```tsx
const initialState = {
  user: null,
  cart: [],
  preferences: { theme: 'light' },
};

interface State {
  user: User | null;
  cart: CartItem[];
  preferences: Preferences;
  setUser: (user: User) => void;
  addToCart: (item: CartItem) => void;
  reset: () => void;
}

export const useStore = create<State>((set) => ({
  ...initialState,

  setUser: (user) => set({ user }),
  addToCart: (item) => set((state) => ({ cart: [...state.cart, item] })),

  // Reset to initial state
  reset: () => set(initialState),
}));

// Usage: Reset on logout
function LogoutButton() {
  const { reset } = useStore();

  const handleLogout = () => {
    reset();
    // Navigate to login
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

**Explanation:** Store reset is useful for cleanup on logout or navigation.

---

### Example 27: Subscriptions Outside React
**Use Case:** Listen to store changes outside components
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

// Subscribe outside React components
const unsubscribe = useUserStore.subscribe(
  (state) => state.user,
  (user, prevUser) => {
    if (user && !prevUser) {
      // User logged in
      analytics.identify(user.id);
      console.log('User logged in:', user);
    } else if (!user && prevUser) {
      // User logged out
      analytics.reset();
      console.log('User logged out');
    }
  }
);

// Subscribe to entire state
useUserStore.subscribe((state) => {
  console.log('State changed:', state);
});

// Cleanup when needed
unsubscribe();
```

**Explanation:** Store subscriptions enable side effects outside React components.

---

### Example 28: Time Travel / Undo-Redo
**Use Case:** Implement undo/redo functionality
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

interface UndoableState {
  history: HistoryState<TodoState>;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
}

const initialTodoState: TodoState = { todos: [] };

export const useUndoableStore = create<UndoableState>((set, get) => ({
  history: {
    past: [],
    present: initialTodoState,
    future: [],
  },

  canUndo: () => get().history.past.length > 0,
  canRedo: () => get().history.future.length > 0,

  undo: () => {
    if (!get().canUndo()) return;

    set((state) => {
      const previous = state.history.past[state.history.past.length - 1];
      const newPast = state.history.past.slice(0, -1);

      return {
        history: {
          past: newPast,
          present: previous,
          future: [state.history.present, ...state.history.future],
        },
      };
    });
  },

  redo: () => {
    if (!get().canRedo()) return;

    set((state) => {
      const next = state.history.future[0];
      const newFuture = state.history.future.slice(1);

      return {
        history: {
          past: [...state.history.past, state.history.present],
          present: next,
          future: newFuture,
        },
      };
    });
  },

  // Helper to update state with history
  _updateWithHistory: (updater: (state: TodoState) => TodoState) => {
    set((state) => {
      const newPresent = updater(state.history.present);

      return {
        history: {
          past: [...state.history.past, state.history.present],
          present: newPresent,
          future: [], // Clear future on new action
        },
      };
    });
  },

  addTodo: (text) =>
    get()._updateWithHistory((state) => ({
      todos: [...state.todos, { id: nanoid(), text, completed: false }],
    })),

  toggleTodo: (id) =>
    get()._updateWithHistory((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      ),
    })),
}));

// Usage
function TodoApp() {
  const { history, undo, redo, canUndo, canRedo } = useUndoableStore();

  return (
    <div>
      <button onClick={undo} disabled={!canUndo()}>
        Undo
      </button>
      <button onClick={redo} disabled={!canRedo()}>
        Redo
      </button>
      <TodoList todos={history.present.todos} />
    </div>
  );
}
```

**Explanation:** Undo/redo maintains history of state changes for time travel debugging or user features.

---

### Example 29: Transient Updates (No Re-render)
**Use Case:** Update state without triggering React re-renders
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
interface MouseState {
  x: number;
  y: number;
  setMousePosition: (x: number, y: number) => void;
}

export const useMouseStore = create<MouseState>((set) => ({
  x: 0,
  y: 0,
  setMousePosition: (x, y) => set({ x, y }),
}));

// Component that updates frequently but doesn't need to re-render
function MouseTracker() {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Update store without subscribing (no re-render)
      useMouseStore.setState({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return null; // This component never re-renders
}

// Separate component that reads mouse position
function MouseDisplay() {
  const { x, y } = useMouseStore();

  return (
    <div>
      Mouse: {x}, {y}
    </div>
  );
}
```

**Explanation:** Direct `setState` calls update store without triggering re-renders, useful for high-frequency updates.

---

### Example 30: Store Context Pattern
**Use Case:** Multiple store instances for testing or isolation
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import { createContext, useContext, useRef } from 'react';
import { createStore, useStore as useZustandStore } from 'zustand';

type StoreState = {
  count: number;
  increment: () => void;
};

const createCounterStore = () =>
  createStore<StoreState>((set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
  }));

type CounterStore = ReturnType<typeof createCounterStore>;

const StoreContext = createContext<CounterStore | null>(null);

// Provider
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<CounterStore>();

  if (!storeRef.current) {
    storeRef.current = createCounterStore();
  }

  return (
    <StoreContext.Provider value={storeRef.current}>
      {children}
    </StoreContext.Provider>
  );
}

// Hook to use context store
export function useStore<T>(selector: (state: StoreState) => T): T {
  const store = useContext(StoreContext);
  if (!store) throw new Error('Missing StoreProvider');
  return useZustandStore(store, selector);
}

// Usage
function App() {
  return (
    <StoreProvider>
      <Counter />
    </StoreProvider>
  );
}

function Counter() {
  const count = useStore((state) => state.count);
  const increment = useStore((state) => state.increment);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
}
```

**Explanation:** Store context pattern enables multiple isolated store instances, useful for testing or multi-tenant apps.

---

## Best Practices

### State Organization
- ✅ **DO** separate stores by domain/feature
- ✅ **DO** use slices for large stores
- ✅ **DO** normalize nested data structures
- ✅ **DO** keep actions with related state
- ❌ **DON'T** create one giant global store
- ❌ **DON'T** mix unrelated concerns in one store

### Performance
- ✅ **DO** use granular selectors
- ✅ **DO** use `shallow` for multiple values
- ✅ **DO** memoize expensive computations
- ✅ **DO** use transient updates for high-frequency changes
- ❌ **DON'T** select entire store in components
- ❌ **DON'T** create new objects/arrays in selectors

### TypeScript
- ✅ **DO** define explicit store interfaces
- ✅ **DO** type your selectors
- ✅ **DO** use const assertions for action types
- ❌ **DON'T** use `any` types
- ❌ **DON'T** skip type definitions for middleware

### Async Operations
- ✅ **DO** track loading and error states
- ✅ **DO** handle errors gracefully
- ✅ **DO** consider optimistic updates for better UX
- ✅ **DO** deduplicate simultaneous requests
- ❌ **DON'T** forget to set loading states
- ❌ **DON'T** leave async operations without error handling

### Persistence
- ✅ **DO** use `partialize` for sensitive data
- ✅ **DO** version your persisted state
- ✅ **DO** encrypt sensitive data
- ❌ **DON'T** persist everything blindly
- ❌ **DON'T** store tokens in localStorage without encryption

---

## Anti-Patterns

### ❌ Mutating State Directly
```tsx
// BAD
const useStore = create((set, get) => ({
  items: [],
  addItem: (item) => {
    get().items.push(item); // Mutation!
    set({ items: get().items });
  },
}));

// GOOD
const useStore = create((set) => ({
  items: [],
  addItem: (item) =>
    set((state) => ({ items: [...state.items, item] })),
}));
```

### ❌ Storing Derived State
```tsx
// BAD
const useStore = create((set) => ({
  items: [],
  itemCount: 0, // Redundant!
  addItem: (item) =>
    set((state) => ({
      items: [...state.items, item],
      itemCount: state.items.length + 1,
    })),
}));

// GOOD
const useStore = create((set, get) => ({
  items: [],
  getItemCount: () => get().items.length,
}));
```

### ❌ Overusing Global State
```tsx
// BAD - Everything in global store
const useStore = create((set) => ({
  modalOpen: false,
  tooltipVisible: false,
  formData: {},
  // ... tons of UI state
}));

// GOOD - Local state for UI, global for shared data
function Modal() {
  const [open, setOpen] = useState(false); // Local UI state
  return ...;
}
```

### ❌ Circular Dependencies
```tsx
// BAD - Slices referencing each other in creation
const createUserSlice = (set, get) => ({
  updateUser: () => {
    get().clearCart(); // References cart slice during creation
  },
});

// GOOD - Reference in actions, not during creation
const createUserSlice = (set, get) => ({
  updateUser: () => {
    const { clearCart } = get();
    clearCart();
  },
});
```

---

## See Also

- [Zustand Documentation](https://github.com/pmndrs/zustand) - Official Zustand docs
- [State Management Guide](../STATE-MANAGEMENT.md) - Comprehensive state management documentation
- [Performance Optimization](../PERFORMANCE.md) - Performance best practices
- [Testing Examples](./testing-examples.md) - Testing stores and state
- [Documentation Index](../INDEX.md) - All documentation resources
