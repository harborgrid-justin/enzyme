# State Management Guide

> **Scope**: This document covers state management patterns using Zustand with Immer, DevTools, and persistence.
> For general best practices, see [Best Practices Guide](./BEST_PRACTICES.md).

## Table of Contents

- [State Management Philosophy](#state-management-philosophy)
- [Zustand Overview](#zustand-overview)
- [Store Creation Patterns](#store-creation-patterns)
- [Slice Patterns](#slice-patterns)
- [Selectors and Optimization](#selectors-and-optimization)
- [Middleware Stack](#middleware-stack)
- [Async Actions](#async-actions)
- [State Normalization](#state-normalization)
- [Computed Values](#computed-values)
- [Testing State](#testing-state)
- [Migration from Redux](#migration-from-redux)
- [Common Patterns](#common-patterns)
- [Performance Optimization](#performance-optimization)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## State Management Philosophy

### When to Use Global State

✅ **Use global state for:**
- User authentication and session
- UI preferences (theme, sidebar state)
- Application settings
- Shared data across many components
- Data that needs persistence

❌ **Don't use global state for:**
- Component-local UI state
- Form state (use local state)
- Derived/computed values
- Server data (use React Query)
- Temporary UI state (modals, dropdowns)

### State Categories

```
┌─────────────────────────────────────────────────┐
│                 Client State                     │
├─────────────────────────────────────────────────┤
│                                                  │
│  UI State          │  Application State          │
│  - Modals          │  - User preferences         │
│  - Sidebar         │  - Settings                 │
│  - Tooltips        │  - Feature flags            │
│  - Dropdowns       │  - Session data             │
│                                                  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                 Server State                     │
│            (Use React Query/SWR)                 │
├─────────────────────────────────────────────────┤
│                                                  │
│  - API data        │  - Cached responses         │
│  - User data       │  - Background updates       │
│  - Lists           │  - Optimistic updates       │
│  - Details         │  - Pagination state         │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## Zustand Overview

### Why Zustand?

- **Simple**: No boilerplate, just functions
- **TypeScript**: First-class TypeScript support
- **Performance**: Fine-grained subscriptions
- **DevTools**: Redux DevTools integration
- **Flexible**: Works with or without React
- **Small**: ~1KB gzipped

### Basic Store

```typescript
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
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
}
```

### Store with Immer

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface TodoState {
  todos: Array<{ id: string; text: string; done: boolean }>;
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
}

export const useTodoStore = create<TodoState>()(
  immer((set) => ({
    todos: [],

    addTodo: (text) =>
      set((state) => {
        // Mutate state directly with Immer
        state.todos.push({
          id: crypto.randomUUID(),
          text,
          done: false,
        });
      }),

    toggleTodo: (id) =>
      set((state) => {
        const todo = state.todos.find((t) => t.id === id);
        if (todo) {
          todo.done = !todo.done;
        }
      }),

    removeTodo: (id) =>
      set((state) => {
        const index = state.todos.findIndex((t) => t.id === id);
        if (index !== -1) {
          state.todos.splice(index, 1);
        }
      }),
  }))
);
```

---

## Store Creation Patterns

### Basic Store Creation

```typescript
// stores/counterStore.ts
import { create } from 'zustand';

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
}

export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));
```

### Store with Get

```typescript
interface CartState {
  items: CartItem[];
  total: number;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  calculateTotal: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  total: 0,

  addItem: (item) => {
    set((state) => ({ items: [...state.items, item] }));
    get().calculateTotal(); // Access current state
  },

  removeItem: (id) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));
    get().calculateTotal();
  },

  calculateTotal: () => {
    const items = get().items;
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    set({ total });
  },
}));
```

### Store with Initial State

```typescript
interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: string) => void;
  toggleNotifications: () => void;
  reset: () => void;
}

const initialState = {
  theme: 'system' as const,
  language: 'en',
  notifications: true,
};

export const usePreferencesStore = create<UserPreferences>((set) => ({
  ...initialState,

  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => set({ language }),
  toggleNotifications: () =>
    set((state) => ({ notifications: !state.notifications })),
  reset: () => set(initialState),
}));
```

---

## Slice Patterns

### Creating Slices

```typescript
// slices/userSlice.ts
import { StateCreator } from 'zustand';

export interface UserSlice {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const createUserSlice: StateCreator<UserSlice> = (set) => ({
  user: null,
  isAuthenticated: false,

  login: (user) =>
    set({
      user,
      isAuthenticated: true,
    }),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
    }),
});
```

```typescript
// slices/uiSlice.ts
import { StateCreator } from 'zustand';

export interface UISlice {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
  sidebarOpen: true,
  theme: 'light',

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setTheme: (theme) => set({ theme }),
});
```

### Combining Slices

```typescript
// store.ts
import { create } from 'zustand';
import { createUserSlice, UserSlice } from './slices/userSlice';
import { createUISlice, UISlice } from './slices/uiSlice';

type StoreState = UserSlice & UISlice;

export const useStore = create<StoreState>()((...args) => ({
  ...createUserSlice(...args),
  ...createUISlice(...args),
}));
```

### Slices with Cross-Slice Actions

```typescript
// slices/notificationSlice.ts
export interface NotificationSlice {
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const createNotificationSlice: StateCreator<
  StoreState,
  [],
  [],
  NotificationSlice
> = (set, get) => ({
  notifications: [],

  addNotification: (notification) =>
    set((state) => ({
      notifications: [...state.notifications, notification],
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearAll: () => {
    // Can access other slices
    const { isAuthenticated } = get();
    if (isAuthenticated) {
      set({ notifications: [] });
    }
  },
});
```

---

## Selectors and Optimization

### Basic Selectors

```typescript
function UserProfile() {
  // ❌ Bad: Entire store subscription
  const store = useStore();
  const user = store.user;

  // ✅ Good: Specific selector
  const user = useStore((state) => state.user);

  return <div>{user?.name}</div>;
}
```

### Multiple Values with Shallow

```typescript
import { shallow } from 'zustand/shallow';

function UserInfo() {
  // ❌ Bad: Multiple subscriptions
  const name = useStore((state) => state.user?.name);
  const email = useStore((state) => state.user?.email);

  // ✅ Good: Single subscription with shallow comparison
  const { name, email } = useStore(
    (state) => ({
      name: state.user?.name,
      email: state.user?.email,
    }),
    shallow
  );

  return (
    <div>
      <p>{name}</p>
      <p>{email}</p>
    </div>
  );
}
```

### Derived Selectors

```typescript
// Create reusable selectors
const selectUser = (state: StoreState) => state.user;
const selectIsAuthenticated = (state: StoreState) => state.isAuthenticated;
const selectUserRole = (state: StoreState) => state.user?.role;

// Computed selector
const selectIsAdmin = (state: StoreState) =>
  state.user?.role === 'admin';

// Usage
function AdminPanel() {
  const isAdmin = useStore(selectIsAdmin);

  if (!isAdmin) return null;

  return <div>Admin Panel</div>;
}
```

### Selector with Parameters

```typescript
// Create selector factory
const selectTodoById = (id: string) => (state: StoreState) =>
  state.todos.find((todo) => todo.id === id);

// Usage
function TodoItem({ id }: { id: string }) {
  const todo = useStore(selectTodoById(id));

  return <div>{todo?.text}</div>;
}

// Or with useCallback
function TodoItem({ id }: { id: string }) {
  const selectTodo = useCallback(
    (state: StoreState) => state.todos.find((t) => t.id === id),
    [id]
  );

  const todo = useStore(selectTodo);

  return <div>{todo?.text}</div>;
}
```

### Memoized Selectors

```typescript
import { useMemo } from 'react';

function FilteredTodoList({ filter }: { filter: string }) {
  // Memoize selector to prevent unnecessary recalculations
  const selectFilteredTodos = useMemo(
    () => (state: StoreState) =>
      state.todos.filter((todo) =>
        filter === 'all'
          ? true
          : filter === 'done'
            ? todo.done
            : !todo.done
      ),
    [filter]
  );

  const todos = useStore(selectFilteredTodos);

  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}
```

---

## Middleware Stack

### Immer Middleware

```typescript
import { immer } from 'zustand/middleware/immer';

export const useStore = create<StoreState>()(
  immer((set) => ({
    user: null,
    todos: [],

    addTodo: (text) =>
      set((state) => {
        // Direct mutation with Immer
        state.todos.push({
          id: crypto.randomUUID(),
          text,
          done: false,
        });
      }),

    updateTodo: (id, updates) =>
      set((state) => {
        const todo = state.todos.find((t) => t.id === id);
        if (todo) {
          Object.assign(todo, updates);
        }
      }),
  }))
);
```

### DevTools Middleware

```typescript
import { devtools } from 'zustand/middleware';
import { isDev } from '@/lib/core/config/env-helper';

export const useStore = create<StoreState>()(
  devtools(
    immer((set) => ({
      // Store implementation
    })),
    {
      name: 'AppStore',
      enabled: isDev(), // Only in development
      trace: true,
      traceLimit: 25,
    }
  )
);
```

### Persist Middleware

```typescript
import { persist } from 'zustand/middleware';

const STORE_VERSION = 1;

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      // Store implementation
    }),
    {
      name: 'app-storage',
      version: STORE_VERSION,

      // Only persist specific fields
      partialize: (state) => ({
        theme: state.theme,
        preferences: state.preferences,
        // Don't persist: user, session, temporary UI state
      }),

      // Migrate old versions
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Migration from v0 to v1
          return {
            ...persistedState,
            theme: persistedState.theme || 'light',
          };
        }
        return persistedState;
      },

      // Rehydration callback
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate:', error);
        } else {
          console.log('Rehydration complete');
        }
      },
    }
  )
);
```

### SubscribeWithSelector Middleware

```typescript
import { subscribeWithSelector } from 'zustand/middleware';

export const useStore = create<StoreState>()(
  subscribeWithSelector((set) => ({
    // Store implementation
  }))
);

// Subscribe to specific value changes
useStore.subscribe(
  (state) => state.theme,
  (theme, prevTheme) => {
    console.log('Theme changed:', prevTheme, '->', theme);
    // Apply theme to document
    document.documentElement.className = theme;
  }
);
```

### Complete Middleware Stack

```typescript
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type FullMiddleware = [
  ['zustand/immer', never],
  ['zustand/devtools', never],
  ['zustand/subscribeWithSelector', never],
  ['zustand/persist', unknown]
];

export const useStore = create<StoreState, FullMiddleware>()(
  immer(
    devtools(
      subscribeWithSelector(
        persist(
          (set, get) => ({
            // Store implementation
          }),
          {
            name: 'app-store',
            version: 1,
          }
        )
      ),
      {
        name: 'AppStore',
        enabled: isDev(),
      }
    )
  )
);
```

---

## Async Actions

### Basic Async Action

```typescript
interface UserState {
  user: User | null;
  loading: boolean;
  error: Error | null;
  fetchUser: (id: string) => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  loading: false,
  error: null,

  fetchUser: async (id) => {
    set({ loading: true, error: null });

    try {
      const user = await apiClient.get(`/users/${id}`);
      set({ user, loading: false });
    } catch (error) {
      set({ error: error as Error, loading: false });
    }
  },
}));
```

### Async with Abort

```typescript
interface DataState {
  data: Data | null;
  loading: boolean;
  abortController: AbortController | null;
  fetchData: (query: string) => Promise<void>;
  cancelFetch: () => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  data: null,
  loading: false,
  abortController: null,

  fetchData: async (query) => {
    // Cancel previous request
    get().cancelFetch();

    const controller = new AbortController();
    set({ loading: true, abortController: controller });

    try {
      const data = await apiClient.get('/data', {
        params: { query },
        signal: controller.signal,
      });
      set({ data, loading: false });
    } catch (error) {
      if (error.name !== 'AbortError') {
        set({ loading: false });
      }
    }
  },

  cancelFetch: () => {
    const controller = get().abortController;
    if (controller) {
      controller.abort();
      set({ abortController: null });
    }
  },
}));
```

### Optimistic Updates

```typescript
interface TodoState {
  todos: Todo[];
  addTodo: (text: string) => Promise<void>;
  removeTodo: (id: string) => Promise<void>;
}

export const useTodoStore = create<TodoState>()(
  immer((set, get) => ({
    todos: [],

    addTodo: async (text) => {
      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticTodo = { id: tempId, text, done: false };

      set((state) => {
        state.todos.push(optimisticTodo);
      });

      try {
        // Save to server
        const savedTodo = await apiClient.post('/todos', { text });

        // Replace temp with real data
        set((state) => {
          const index = state.todos.findIndex((t) => t.id === tempId);
          if (index !== -1) {
            state.todos[index] = savedTodo;
          }
        });
      } catch (error) {
        // Rollback on error
        set((state) => {
          state.todos = state.todos.filter((t) => t.id !== tempId);
        });
        throw error;
      }
    },

    removeTodo: async (id) => {
      // Save current state for rollback
      const previousTodos = get().todos;

      // Optimistic update
      set((state) => {
        state.todos = state.todos.filter((t) => t.id !== id);
      });

      try {
        await apiClient.delete(`/todos/${id}`);
      } catch (error) {
        // Rollback
        set({ todos: previousTodos });
        throw error;
      }
    },
  }))
);
```

### Request Deduplication

```typescript
interface DataState {
  cache: Map<string, { data: any; timestamp: number }>;
  pendingRequests: Map<string, Promise<any>>;
  fetchData: (url: string) => Promise<any>;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useDataStore = create<DataState>((set, get) => ({
  cache: new Map(),
  pendingRequests: new Map(),

  fetchData: async (url) => {
    const state = get();

    // Check cache
    const cached = state.cache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    // Check if request already in flight
    const pending = state.pendingRequests.get(url);
    if (pending) {
      return pending;
    }

    // Create new request
    const request = apiClient.get(url).then((data) => {
      // Update cache
      set((state) => {
        state.cache.set(url, { data, timestamp: Date.now() });
        state.pendingRequests.delete(url);
      });
      return data;
    });

    // Track pending request
    set((state) => {
      state.pendingRequests.set(url, request);
    });

    return request;
  },
}));
```

---

## State Normalization

### Normalized State Structure

```typescript
interface NormalizedState {
  users: {
    byId: Record<string, User>;
    allIds: string[];
  };
  posts: {
    byId: Record<string, Post>;
    allIds: string[];
  };
  comments: {
    byId: Record<string, Comment>;
    allIds: string[];
  };
}

export const useStore = create<NormalizedState>()(
  immer((set) => ({
    users: { byId: {}, allIds: [] },
    posts: { byId: {}, allIds: [] },
    comments: { byId: {}, allIds: [] },

    addUser: (user) =>
      set((state) => {
        state.users.byId[user.id] = user;
        if (!state.users.allIds.includes(user.id)) {
          state.users.allIds.push(user.id);
        }
      }),

    removeUser: (id) =>
      set((state) => {
        delete state.users.byId[id];
        state.users.allIds = state.users.allIds.filter((uid) => uid !== id);
      }),
  }))
);
```

### Denormalization Selectors

```typescript
// Select user with posts
const selectUserWithPosts = (userId: string) => (state: NormalizedState) => {
  const user = state.users.byId[userId];
  if (!user) return null;

  const posts = user.postIds?.map((postId) => state.posts.byId[postId]);

  return {
    ...user,
    posts,
  };
};

// Select post with author and comments
const selectPostWithDetails = (postId: string) => (state: NormalizedState) => {
  const post = state.posts.byId[postId];
  if (!post) return null;

  return {
    ...post,
    author: state.users.byId[post.authorId],
    comments: post.commentIds?.map((id) => state.comments.byId[id]),
  };
};
```

---

## Computed Values

### Derived State with Selectors

```typescript
// Store only source data
interface CartState {
  items: CartItem[];
}

// Derive computed values
const selectItemCount = (state: CartState) =>
  state.items.reduce((sum, item) => sum + item.quantity, 0);

const selectTotal = (state: CartState) =>
  state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

const selectSubtotal = (state: CartState) =>
  state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

const selectTax = (state: CartState) =>
  selectSubtotal(state) * 0.1;

const selectShipping = (state: CartState) =>
  selectSubtotal(state) > 50 ? 0 : 5.99;

const selectGrandTotal = (state: CartState) =>
  selectSubtotal(state) + selectTax(state) + selectShipping(state);
```

### Computed State with useMemo

```typescript
function CartSummary() {
  const items = useStore((state) => state.items);

  const summary = useMemo(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const tax = subtotal * 0.1;
    const shipping = subtotal > 50 ? 0 : 5.99;
    const total = subtotal + tax + shipping;

    return { itemCount, subtotal, tax, shipping, total };
  }, [items]);

  return (
    <div>
      <p>Items: {summary.itemCount}</p>
      <p>Subtotal: ${summary.subtotal.toFixed(2)}</p>
      <p>Tax: ${summary.tax.toFixed(2)}</p>
      <p>Shipping: ${summary.shipping.toFixed(2)}</p>
      <p>Total: ${summary.total.toFixed(2)}</p>
    </div>
  );
}
```

---

## Testing State

### Testing Store Actions

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCounterStore } from './counterStore';

describe('counterStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useCounterStore.setState({ count: 0 });
  });

  it('increments count', () => {
    const { result } = renderHook(() => useCounterStore());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('decrements count', () => {
    useCounterStore.setState({ count: 5 });

    const { result } = renderHook(() => useCounterStore());

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(4);
  });
});
```

### Testing Async Actions

```typescript
import { waitFor } from '@testing-library/react';
import { apiClient } from '@/lib/api';

vi.mock('@/lib/api');

describe('userStore', () => {
  it('fetches user successfully', async () => {
    const mockUser = { id: '1', name: 'John Doe' };
    vi.mocked(apiClient.get).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useUserStore());

    act(() => {
      result.current.fetchUser('1');
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.error).toBeNull();
  });

  it('handles fetch errors', async () => {
    const error = new Error('Failed to fetch');
    vi.mocked(apiClient.get).mockRejectedValue(error);

    const { result } = renderHook(() => useUserStore());

    act(() => {
      result.current.fetchUser('1');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.error).toEqual(error);
  });
});
```

### Testing with Mock Store

```typescript
// Create mock store for testing
import { create } from 'zustand';

export function createMockStore<T>(initialState: T) {
  return create<T>(() => initialState);
}

// In test
const mockStore = createMockStore({
  user: { id: '1', name: 'Test User' },
  isAuthenticated: true,
});

// Mock the actual store
vi.mock('@/lib/state/store', () => ({
  useStore: mockStore,
}));

test('component uses store', () => {
  render(<UserProfile />);
  expect(screen.getByText('Test User')).toBeInTheDocument();
});
```

---

## Migration from Redux

### Redux vs Zustand Comparison

```typescript
// Redux
const initialState = { count: 0 };

function counterReducer(state = initialState, action) {
  switch (action.type) {
    case 'INCREMENT':
      return { count: state.count + 1 };
    case 'DECREMENT':
      return { count: state.count - 1 };
    default:
      return state;
  }
}

const store = createStore(counterReducer);

// Zustand
const useCounterStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));
```

### Migration Steps

1. **Identify Redux Slices**
   ```typescript
   // Redux slice
   const userSlice = createSlice({
     name: 'user',
     initialState,
     reducers: {
       setUser: (state, action) => {
         state.user = action.payload;
       },
     },
   });
   ```

2. **Convert to Zustand**
   ```typescript
   // Zustand equivalent
   const useUserStore = create((set) => ({
     user: null,
     setUser: (user) => set({ user }),
   }));
   ```

3. **Update Components**
   ```typescript
   // Redux
   const user = useSelector((state) => state.user.user);
   const dispatch = useDispatch();
   dispatch(setUser(newUser));

   // Zustand
   const user = useUserStore((state) => state.user);
   const setUser = useUserStore((state) => state.setUser);
   setUser(newUser);
   ```

### Redux Toolkit to Zustand

```typescript
// Redux Toolkit
const todosSlice = createSlice({
  name: 'todos',
  initialState: [],
  reducers: {
    addTodo: (state, action) => {
      state.push(action.payload);
    },
    removeTodo: (state, action) => {
      return state.filter((todo) => todo.id !== action.payload);
    },
  },
});

// Zustand with Immer (similar API)
const useTodoStore = create(
  immer((set) => ({
    todos: [],
    addTodo: (todo) =>
      set((state) => {
        state.todos.push(todo);
      }),
    removeTodo: (id) =>
      set((state) => {
        state.todos = state.todos.filter((t) => t.id !== id);
      }),
  }))
);
```

---

## Common Patterns

### Loading States

```typescript
interface LoadingState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  fetch: () => Promise<void>;
}

function createLoadingState<T>(
  fetcher: () => Promise<T>
): LoadingState<T> {
  return {
    data: null,
    loading: false,
    error: null,

    fetch: async () => {
      set({ loading: true, error: null });
      try {
        const data = await fetcher();
        set({ data, loading: false });
      } catch (error) {
        set({ error: error as Error, loading: false });
      }
    },
  };
}
```

### Pagination State

```typescript
interface PaginationState<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  loading: boolean;
  fetchPage: (page: number) => Promise<void>;
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;
}

export const usePaginatedStore = create<PaginationState<Item>>((set, get) => ({
  items: [],
  page: 1,
  pageSize: 20,
  total: 0,
  loading: false,

  fetchPage: async (page) => {
    set({ loading: true });
    const response = await apiClient.get('/items', {
      params: { page, pageSize: get().pageSize },
    });
    set({
      items: response.items,
      page: response.page,
      total: response.total,
      loading: false,
    });
  },

  nextPage: async () => {
    const { page, total, pageSize } = get();
    if (page * pageSize < total) {
      await get().fetchPage(page + 1);
    }
  },

  prevPage: async () => {
    const { page } = get();
    if (page > 1) {
      await get().fetchPage(page - 1);
    }
  },
}));
```

### Undo/Redo Pattern

```typescript
interface UndoableState<T> {
  present: T;
  past: T[];
  future: T[];
  set: (state: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

function createUndoableState<T>(initialState: T): UndoableState<T> {
  return {
    present: initialState,
    past: [],
    future: [],

    set: (newState) =>
      set((state) => ({
        past: [...state.past, state.present],
        present: newState,
        future: [],
      })),

    undo: () =>
      set((state) => {
        if (state.past.length === 0) return state;
        const previous = state.past[state.past.length - 1];
        return {
          past: state.past.slice(0, -1),
          present: previous,
          future: [state.present, ...state.future],
        };
      }),

    redo: () =>
      set((state) => {
        if (state.future.length === 0) return state;
        const next = state.future[0];
        return {
          past: [...state.past, state.present],
          present: next,
          future: state.future.slice(1),
        };
      }),

    get canUndo() {
      return get().past.length > 0;
    },

    get canRedo() {
      return get().future.length > 0;
    },
  };
}
```

---

## Performance Optimization

### Optimize Selectors

```typescript
// ❌ Bad: New object every render
function Component() {
  const data = useStore((state) => ({
    user: state.user,
    settings: state.settings,
  }));
}

// ✅ Good: Shallow comparison
import { shallow } from 'zustand/shallow';

function Component() {
  const data = useStore(
    (state) => ({
      user: state.user,
      settings: state.settings,
    }),
    shallow
  );
}

// ✅ Better: Separate subscriptions
function Component() {
  const user = useStore((state) => state.user);
  const settings = useStore((state) => state.settings);
}
```

### Batch Updates

```typescript
// ❌ Bad: Multiple set calls
function updateUser(user: User) {
  useStore.setState({ user });
  useStore.setState({ lastUpdated: Date.now() });
  useStore.setState({ isModified: true });
}

// ✅ Good: Single set call
function updateUser(user: User) {
  useStore.setState({
    user,
    lastUpdated: Date.now(),
    isModified: true,
  });
}

// ✅ Good: Immer batch
useStore.setState((state) => {
  state.user = user;
  state.lastUpdated = Date.now();
  state.isModified = true;
});
```

### Avoid Unnecessary Renders

```typescript
// ❌ Bad: Inline object prop
<UserCard user={{ name: 'John', email: 'john@example.com' }} />

// ✅ Good: Stable reference
const user = useStore((state) => state.user);
<UserCard user={user} />

// ✅ Good: Memoized component
const MemoizedUserCard = React.memo(UserCard);
```

---

## Best Practices

### 1. Use Functional Updates with Immer

```typescript
// ✅ Always use functional form with Immer
useStore.setState((state) => {
  state.count += 1;
});

// ❌ Don't use object form with Immer middleware
useStore.setState({ count: useStore.getState().count + 1 });
```

### 2. Don't Store Derived State

```typescript
// ❌ Bad
interface CartState {
  items: CartItem[];
  total: number; // Derived!
  itemCount: number; // Derived!
}

// ✅ Good
interface CartState {
  items: CartItem[];
}

const selectTotal = (state: CartState) =>
  state.items.reduce((sum, item) => sum + item.price, 0);
```

### 3. Use Selectors for Performance

```typescript
// ✅ Good: Fine-grained subscription
const userName = useStore((state) => state.user?.name);

// ❌ Bad: Over-subscribing
const store = useStore();
const userName = store.user?.name;
```

### 4. Keep Actions Simple

```typescript
// ✅ Good: Simple, focused actions
const addItem = (item) => set((state) => {
  state.items.push(item);
});

// ❌ Bad: Complex, multi-purpose actions
const doEverything = (data) => set((state) => {
  // 50 lines of complex logic
});
```

---

## Troubleshooting

### Store Not Persisting

```typescript
// Check persistence config
console.log(localStorage.getItem('app-store'));

// Verify partialize includes the field
partialize: (state) => ({
  theme: state.theme, // Make sure field is included
});
```

### Stale State in Callbacks

```typescript
// ❌ Bad: Captures stale state
const onClick = () => {
  console.log(count); // Stale!
};

// ✅ Good: Get fresh state
const onClick = () => {
  const count = useStore.getState().count;
  console.log(count); // Fresh!
};
```

### Immer Not Working

```typescript
// Make sure Immer middleware is applied
const useStore = create<State>()(
  immer((set) => ({ // ← immer wrapper required
    // Store implementation
  }))
);
```

---

## See Also

- [Best Practices](./BEST_PRACTICES.md) - General best practices
- [Architecture](./ARCHITECTURE.md) - System architecture
- [API Reference](./API.md) - Complete API documentation
- [Zustand Documentation](https://github.com/pmndrs/zustand) - Official docs

---

**Last Updated**: 2025-11-27
**Version**: 1.0.0
