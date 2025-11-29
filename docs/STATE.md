# State Management Guide

> **Master state management with Zustand and TanStack Query** - This guide covers the dual-state approach for server and client state, including multi-tab synchronization and persistence.

---

## Table of Contents

1. [Overview](#overview)
2. [Enterprise Features](#enterprise-features-v20)
3. [When to Use What](#when-to-use-what)
4. [TanStack Query](#tanstack-query)
5. [Zustand Store](#zustand-store)
6. [Feature-Level State](#feature-level-state)
7. [Patterns & Best Practices](#patterns--best-practices)
8. [DevTools](#devtools)
9. [Migration from Redux](#migration-from-redux)
10. [Related Documentation](#related-documentation)

---

## Overview

Harbor React uses a dual-state approach with enterprise enhancements:

| Type | Tool | Purpose |
|------|------|---------|
| **Server State** | TanStack Query | Remote data, caching, synchronization |
| **Client State** | Zustand | UI state, user preferences, local data |
| **Multi-Tab Sync** | BroadcastChannel | Real-time state sync across tabs |
| **Persistence** | Zustand Persist | Survive page reloads |

## Enterprise Features (v2.0)

### Multi-Tab State Synchronization

Sync state across browser tabs/windows in real-time:

```typescript
import { createBroadcastSync, useStore } from '@/lib/state';

// Initialize sync (typically in app bootstrap)
const sync = createBroadcastSync(useStore, {
  channelName: 'app-state-sync',
  syncKeys: ['settings', 'theme', 'locale'], // Keys to sync
  throttleMs: 100,                            // Debounce updates
  leaderElection: true,                       // Single source of truth
  conflictResolution: 'latest-wins',          // or 'leader-wins'
});

sync.start();

// Cleanup on unmount
sync.stop();
```

### Hydration Tracking

Wait for persisted state to load before rendering:

```typescript
import { waitForHydration, useHydration } from '@/lib/state';

// Async (outside React)
await waitForHydration();
doSomethingWithState();

// Hook (inside React)
function App() {
  const { hasHydrated, isHydrating } = useHydration();

  if (!hasHydrated) {
    return <LoadingScreen />;
  }

  return <MainApp />;
}
```

### Store Reset (Logout)

```typescript
import { resetStore, clearPersistedStore } from '@/lib/state';

// Reset to initial state (keeps settings)
resetStore();

// Full reset including settings
resetStore(true);

// Clear localStorage
clearPersistedStore();
```

## When to Use What

### Use TanStack Query for:
- API data (users, posts, reports)
- Data that needs caching
- Data shared across components
- Real-time synchronization
- Pagination and infinite scroll

### Use Zustand for:
- UI state (sidebar open, modal visibility)
- User preferences (theme, language)
- Form state (multi-step wizards)
- Temporary client-only data
- Cross-component UI coordination

---

## TanStack Query

### Setup

The query client is pre-configured in `lib/queries/queryClient.ts`:

```typescript
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queries';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### Query Key Factory

Use the built-in key factory for consistent cache keys:

```typescript
import { queryKeys } from '@/lib/queries';

// Dashboard queries
queryKeys.dashboard.all        // ['dashboard']
queryKeys.dashboard.stats()    // ['dashboard', 'stats']
queryKeys.dashboard.charts('week') // ['dashboard', 'charts', 'week']

// User queries
queryKeys.users.all            // ['users']
queryKeys.users.list({ role: 'admin' }) // ['users', 'list', { role: 'admin' }]
queryKeys.users.detail('123')  // ['users', 'detail', '123']

// Report queries
queryKeys.reports.all          // ['reports']
queryKeys.reports.list()       // ['reports', 'list']
queryKeys.reports.detail('456') // ['reports', 'detail', '456']
```

### Creating Queries

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries';

function useUsers(filters?: UserFilters) {
  return useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: () => userService.getUsers(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    meta: {
      errorMessage: 'Failed to load users',
    },
  });
}

function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => userService.getUser(id),
    enabled: !!id, // Only fetch when id exists
  });
}
```

### Mutations

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: userService.createUser,
    onSuccess: (newUser) => {
      // Invalidate list queries
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.users.lists() 
      });
      
      // Optionally set the new user in cache
      queryClient.setQueryData(
        queryKeys.users.detail(newUser.id),
        newUser
      );
    },
    onError: (error) => {
      console.error('Failed to create user:', error);
    },
  });
}

function useDeleteUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: userService.deleteUser,
    onMutate: async (userId) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.users.lists() 
      });
      
      // Snapshot previous value
      const previousUsers = queryClient.getQueryData(
        queryKeys.users.list()
      );
      
      // Optimistically remove from list
      queryClient.setQueryData(
        queryKeys.users.list(),
        (old: User[]) => old?.filter(u => u.id !== userId)
      );
      
      return { previousUsers };
    },
    onError: (err, userId, context) => {
      // Rollback on error
      queryClient.setQueryData(
        queryKeys.users.list(),
        context?.previousUsers
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.users.lists() 
      });
    },
  });
}
```

### Prefetching

```typescript
import { usePrefetchRoute } from '@/lib/hooks';

function UserLink({ userId }: { userId: string }) {
  const prefetch = usePrefetchRoute();
  
  const handleHover = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.users.detail(userId),
      queryFn: () => userService.getUser(userId),
    });
  };
  
  return (
    <Link 
      to={`/users/${userId}`} 
      onMouseEnter={handleHover}
    >
      View User
    </Link>
  );
}
```

---

## Zustand Store

### Store Structure

The global store is in `lib/state/store.ts`:

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  activeModal: string | null;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: boolean;
}

interface GlobalState {
  ui: UIState;
  preferences: UserPreferences;
  
  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  setTheme: (theme: UserPreferences['theme']) => void;
  setLanguage: (language: string) => void;
}

export const useGlobalStore = create<GlobalState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        ui: {
          sidebarOpen: true,
          sidebarCollapsed: false,
          activeModal: null,
        },
        preferences: {
          theme: 'system',
          language: 'en',
          notifications: true,
        },
        
        // Actions
        toggleSidebar: () =>
          set((state) => ({
            ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen },
          })),
          
        setSidebarCollapsed: (collapsed) =>
          set((state) => ({
            ui: { ...state.ui, sidebarCollapsed: collapsed },
          })),
          
        openModal: (modalId) =>
          set((state) => ({
            ui: { ...state.ui, activeModal: modalId },
          })),
          
        closeModal: () =>
          set((state) => ({
            ui: { ...state.ui, activeModal: null },
          })),
          
        setTheme: (theme) =>
          set((state) => ({
            preferences: { ...state.preferences, theme },
          })),
          
        setLanguage: (language) =>
          set((state) => ({
            preferences: { ...state.preferences, language },
          })),
      }),
      {
        name: 'app-storage',
        partialize: (state) => ({
          preferences: state.preferences,
        }),
      }
    ),
    { name: 'GlobalStore' }
  )
);
```

### Using the Store

```typescript
import { useGlobalStore } from '@/lib/state';

function Sidebar() {
  // Select specific state
  const isOpen = useGlobalStore((s) => s.ui.sidebarOpen);
  const toggle = useGlobalStore((s) => s.toggleSidebar);
  
  return (
    <aside className={isOpen ? 'open' : 'closed'}>
      <button onClick={toggle}>Toggle</button>
    </aside>
  );
}
```

### Selectors

Create reusable selectors in `lib/state/selectors/`:

```typescript
// lib/state/selectors/ui.ts
import { useGlobalStore } from '../store';

export const selectSidebarOpen = (state: GlobalState) => state.ui.sidebarOpen;
export const selectActiveModal = (state: GlobalState) => state.ui.activeModal;
export const selectTheme = (state: GlobalState) => state.preferences.theme;

// Computed selectors
export const selectIsDarkMode = (state: GlobalState) => {
  const { theme } = state.preferences;
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return theme === 'dark';
};

// Usage
function ThemeToggle() {
  const theme = useGlobalStore(selectTheme);
  const setTheme = useGlobalStore((s) => s.setTheme);
  // ...
}
```

### Store Slices

For larger applications, split the store into slices:

```typescript
// lib/state/slices/uiSlice.ts
import { StateCreator } from 'zustand';

export interface UISlice {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
});

// lib/state/slices/preferencesSlice.ts
export interface PreferencesSlice {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: PreferencesSlice['theme']) => void;
}

export const createPreferencesSlice: StateCreator<PreferencesSlice> = (set) => ({
  theme: 'system',
  setTheme: (theme) => set({ theme }),
});

// lib/state/store.ts - Combine slices
import { create } from 'zustand';
import { createUISlice, UISlice } from './slices/uiSlice';
import { createPreferencesSlice, PreferencesSlice } from './slices/preferencesSlice';

type StoreState = UISlice & PreferencesSlice;

export const useStore = create<StoreState>()((...args) => ({
  ...createUISlice(...args),
  ...createPreferencesSlice(...args),
}));
```

---

## Feature-Level State

For feature-specific state, create local stores within features:

```typescript
// features/orders/state/ordersStore.ts
import { create } from 'zustand';

interface OrdersState {
  selectedIds: Set<string>;
  viewMode: 'list' | 'grid';
  
  selectOrder: (id: string) => void;
  deselectOrder: (id: string) => void;
  clearSelection: () => void;
  setViewMode: (mode: OrdersState['viewMode']) => void;
}

export const useOrdersStore = create<OrdersState>((set) => ({
  selectedIds: new Set(),
  viewMode: 'list',
  
  selectOrder: (id) =>
    set((state) => ({
      selectedIds: new Set([...state.selectedIds, id]),
    })),
    
  deselectOrder: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedIds);
      newSet.delete(id);
      return { selectedIds: newSet };
    }),
    
  clearSelection: () => set({ selectedIds: new Set() }),
  
  setViewMode: (viewMode) => set({ viewMode }),
}));
```

---

## Patterns & Best Practices

### 1. Avoid Prop Drilling

Use stores for deeply nested state:

```typescript
// ❌ Prop drilling
<App user={user}>
  <Layout user={user}>
    <Sidebar user={user}>
      <UserMenu user={user} />
    </Sidebar>
  </Layout>
</App>

// ✅ Use store
function UserMenu() {
  const user = useAuthStore((s) => s.user);
  return <div>{user.name}</div>;
}
```

### 2. Colocate Related State

Keep state close to where it's used:

```typescript
// Feature-level state stays in the feature
// features/orders/state/ordersStore.ts

// Global UI state in lib/state
// lib/state/store.ts
```

### 3. Use Selectors for Performance

```typescript
// ❌ Re-renders on any state change
const state = useGlobalStore();

// ✅ Re-renders only when sidebar changes
const sidebarOpen = useGlobalStore((s) => s.ui.sidebarOpen);

// ✅ Memoized computed selector
const selectUserFullName = useCallback(
  (state) => `${state.user.firstName} ${state.user.lastName}`,
  []
);
```

### 4. Keep Actions in Store

```typescript
// ❌ Actions outside store
const setSidebarOpen = (open: boolean) => {
  useGlobalStore.setState({ ui: { sidebarOpen: open } });
};

// ✅ Actions defined in store
const toggleSidebar = useGlobalStore((s) => s.toggleSidebar);
```

### 5. Type Your State

```typescript
interface State {
  count: number;
  increment: () => void;
  setCount: (count: number) => void;
}

const useStore = create<State>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
  setCount: (count) => set({ count }),
}));
```

---

## DevTools

### React Query DevTools

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### Zustand DevTools

Zustand integrates with Redux DevTools automatically when using the `devtools` middleware:

```typescript
import { devtools } from 'zustand/middleware';

const useStore = create(
  devtools(
    (set) => ({ ... }),
    { name: 'MyStore' }
  )
);
```

---

## Migration from Redux

### Redux → Zustand

```typescript
// Redux
const userSlice = createSlice({
  name: 'user',
  initialState: { name: '' },
  reducers: {
    setName: (state, action) => {
      state.name = action.payload;
    },
  },
});

// Zustand
const useUserStore = create((set) => ({
  name: '',
  setName: (name) => set({ name }),
}));
```

### Redux Thunk -> React Query

```typescript
// Redux Thunk
const fetchUsers = createAsyncThunk('users/fetch', async () => {
  const response = await api.getUsers();
  return response.data;
});

// React Query
const useUsers = () => useQuery({
  queryKey: ['users'],
  queryFn: api.getUsers,
});
```

---

## Related Documentation

### Comprehensive State Management Docs
- [State Module Documentation](./state/README.md) - **Complete state management system guide**
  - [Core Utilities](./state/CORE.md) - Store factories, slice creation, selectors
  - [Stores](./state/STORES.md) - Global store, feature stores, persistence
  - [Slices](./state/SLICES.md) - UI, Session, Settings slices
  - [Hooks](./state/HOOKS.md) - React hooks for state access
  - [Selectors](./state/SELECTORS.md) - Memoized selector patterns
  - [Synchronization](./state/SYNC.md) - Multi-tab sync with BroadcastChannel
  - [Types](./state/TYPES.md) - TypeScript type definitions

### Core Concepts
- [Architecture Overview](./ARCHITECTURE.md) - System design and data flow
- [Feature Architecture](./FEATURES.md) - Feature-level state patterns
- [API Documentation](./API.md) - Data fetching and caching strategies

### Hooks & Components
- [Hooks Reference](./HOOKS_REFERENCE.md) - General React hooks
- [Components Reference](./COMPONENTS_REFERENCE.md) - State-aware components

### Performance
- [Performance Guide](./PERFORMANCE.md) - State optimization strategies
- [Hydration Guide](./HYDRATION.md) - State hydration patterns

### Migration
- [Migration Guide](./MIGRATION.md) - State migration from other frameworks

---

<p align="center">
  <strong>State Management Guide</strong><br>
  Zustand + TanStack Query patterns
</p>
