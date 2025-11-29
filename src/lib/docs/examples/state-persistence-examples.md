# State Persistence Examples

> **Module**: `@/lib/state`, `@/lib/utils/statePersistence`
> **Key Exports**: `useStore`, `waitForHydration`, `StatePersister`

This guide provides comprehensive examples for state persistence and hydration.

---

## Table of Contents

- [Basic Persistence](#basic-persistence)
- [Hydration Handling](#hydration-handling)
- [Selective Persistence](#selective-persistence)
- [Cross-Tab Sync](#cross-tab-sync)
- [Migration Strategies](#migration-strategies)
- [Encryption](#encryption)
- [SSR Considerations](#ssr-considerations)

---

## Basic Persistence

### Enabling Persistence on Store

```tsx
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useSettingsStore = create(
  persist(
    (set) => ({
      theme: 'light',
      language: 'en',
      notifications: true,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setNotifications: (enabled) => set({ notifications: enabled }),
    }),
    {
      name: 'settings-storage', // localStorage key
    }
  )
);
```

### Using the Global Store

```tsx
import { useStore, hasStoreHydrated } from '@/lib/state';

function SettingsPanel() {
  const theme = useStore((state) => state.settings.theme);
  const setTheme = useStore((state) => state.setTheme);

  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>
  );
}
```

---

## Hydration Handling

### Waiting for Hydration

```tsx
import { waitForHydration, hasStoreHydrated } from '@/lib/state';

async function initializeApp() {
  // Wait for store to hydrate from localStorage
  const hydrated = await waitForHydration(5000); // 5 second timeout

  if (!hydrated) {
    console.warn('Store hydration timed out, using defaults');
  }

  // Now safe to use persisted state
  const settings = useStore.getState().settings;
  applyTheme(settings.theme);
}
```

### Hydration-Aware Components

```tsx
import { useStore, useStoreHydrated } from '@/lib/state';

function UserGreeting() {
  const isHydrated = useStoreHydrated();
  const userName = useStore((state) => state.session.userName);

  // Show skeleton during hydration
  if (!isHydrated) {
    return <div className="skeleton">Loading...</div>;
  }

  return <h1>Welcome, {userName || 'Guest'}!</h1>;
}
```

### HydrationBoundary Component

```tsx
import { HydrationBoundary } from '@/lib/hydration';

function App() {
  return (
    <HydrationBoundary
      fallback={<AppSkeleton />}
      onHydrated={() => console.log('App hydrated!')}
    >
      <MainApp />
    </HydrationBoundary>
  );
}
```

---

## Selective Persistence

### Persisting Only Specific Fields

```tsx
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  // Persisted
  preferences: {
    theme: string;
    language: string;
  };
  // Not persisted
  currentSession: {
    lastActivity: number;
    activeTab: string;
  };
}

const useUserStore = create(
  persist<UserState>(
    (set) => ({
      preferences: { theme: 'light', language: 'en' },
      currentSession: { lastActivity: Date.now(), activeTab: 'home' },
      // ... actions
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({
        // Only persist preferences, not session
        preferences: state.preferences,
      }),
    }
  )
);
```

### Excluding Sensitive Data

```tsx
const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null, // Sensitive - don't persist
      refreshToken: null, // Sensitive - don't persist
      isAuthenticated: false,
      // ... actions
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // Only persist non-sensitive data
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        // token and refreshToken excluded
      }),
    }
  )
);
```

---

## Cross-Tab Sync

### Using BroadcastChannel

```tsx
import { createBroadcastSync } from '@/lib/state/sync/broadcast-sync';

const useCartStore = create(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
    }),
    {
      name: 'cart-storage',
    }
  )
);

// Enable cross-tab sync
createBroadcastSync(useCartStore, {
  channelName: 'cart-sync',
  syncFields: ['items'], // Only sync cart items
});
```

### Handling Sync Conflicts

```tsx
import { createBroadcastSync } from '@/lib/state/sync/broadcast-sync';

createBroadcastSync(useStore, {
  channelName: 'app-sync',
  conflictResolution: 'last-write-wins', // or 'merge'
  onConflict: (local, remote) => {
    console.log('Conflict detected:', { local, remote });
    // Custom resolution logic
    return remote; // Accept remote changes
  },
});
```

### Selective Field Sync

```tsx
createBroadcastSync(useStore, {
  channelName: 'settings-sync',
  syncFields: ['settings.theme', 'settings.language'],
  excludeFields: ['settings.privateNotes'],
});
```

---

## Migration Strategies

### Version-Based Migration

```tsx
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const CURRENT_VERSION = 3;

const useStore = create(
  persist(
    (set) => ({
      // Current state shape
      user: { name: '', email: '', preferences: {} },
    }),
    {
      name: 'app-storage',
      version: CURRENT_VERSION,
      migrate: (persistedState, version) => {
        if (version === 1) {
          // Migrate from v1 to v2
          return {
            ...persistedState,
            user: {
              ...persistedState.user,
              email: persistedState.userEmail || '', // Moved field
            },
          };
        }

        if (version === 2) {
          // Migrate from v2 to v3
          return {
            ...persistedState,
            user: {
              ...persistedState.user,
              preferences: persistedState.settings || {}, // Renamed field
            },
          };
        }

        return persistedState;
      },
    }
  )
);
```

### Safe Migration with Validation

```tsx
const migrate = (persistedState: unknown, version: number) => {
  try {
    let state = persistedState as Record<string, unknown>;

    // Run migrations in sequence
    for (let v = version; v < CURRENT_VERSION; v++) {
      const migrator = migrations[v];
      if (migrator) {
        state = migrator(state);
      }
    }

    // Validate final state
    if (!validateState(state)) {
      console.error('Invalid state after migration, resetting');
      return getDefaultState();
    }

    return state;
  } catch (error) {
    console.error('Migration failed:', error);
    return getDefaultState();
  }
};

const migrations: Record<number, (state: any) => any> = {
  1: (state) => ({
    ...state,
    // v1 -> v2 migration
  }),
  2: (state) => ({
    ...state,
    // v2 -> v3 migration
  }),
};
```

---

## Encryption

### Using SecureStorage

```tsx
import { getSecureStorage } from '@/lib/security/secure-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const secureStorage = getSecureStorage();

const useSecureStore = create(
  persist(
    (set) => ({
      sensitiveData: null,
      setSensitiveData: (data) => set({ sensitiveData: data }),
    }),
    {
      name: 'secure-storage',
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          const result = await secureStorage.getItem(name);
          return result.success ? result.data : null;
        },
        setItem: async (name, value) => {
          await secureStorage.setItem(name, value);
        },
        removeItem: async (name) => {
          await secureStorage.removeItem(name);
        },
      })),
    }
  )
);
```

### Custom Encryption Storage

```tsx
import { StatePersister } from '@/lib/utils/statePersistence';

const encryptedPersister = new StatePersister({
  key: 'encrypted-state',
  storage: localStorage,
  encrypt: async (data) => {
    // Use your encryption library
    return await encrypt(JSON.stringify(data), encryptionKey);
  },
  decrypt: async (encrypted) => {
    const decrypted = await decrypt(encrypted, encryptionKey);
    return JSON.parse(decrypted);
  },
});
```

---

## SSR Considerations

### Avoiding Hydration Mismatch

```tsx
import { useStore, useStoreHydrated } from '@/lib/state';

function ThemeProvider({ children }) {
  const isHydrated = useStoreHydrated();
  const theme = useStore((state) => state.settings.theme);

  // Use default on server, real value after hydration
  const activeTheme = isHydrated ? theme : 'light';

  return (
    <div data-theme={activeTheme}>
      {children}
    </div>
  );
}
```

### Server-Safe Initial State

```tsx
const useStore = create(
  persist(
    (set, get) => ({
      items: [],
      // Check for browser environment
      addItem: (item) => {
        if (typeof window === 'undefined') return;
        set((state) => ({ items: [...state.items, item] }));
      },
    }),
    {
      name: 'items-storage',
      // Skip hydration on server
      skipHydration: typeof window === 'undefined',
    }
  )
);
```

### Manual Hydration Control

```tsx
import { useStore } from '@/lib/state';

function App() {
  useEffect(() => {
    // Manually trigger hydration on client
    useStore.persist.rehydrate();
  }, []);

  return <MainApp />;
}
```

---

## Advanced Patterns

### Optimistic Persistence

```tsx
function useOptimisticPersist<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  const [value, setValue] = useState(initialValue);
  const [isPending, setIsPending] = useState(false);

  const persistValue = useCallback(async (newValue: T) => {
    // Optimistically update UI
    setValue(newValue);
    setIsPending(true);

    try {
      await localStorage.setItem(key, JSON.stringify(newValue));
    } catch (error) {
      // Rollback on failure
      setValue(value);
      console.error('Failed to persist:', error);
    } finally {
      setIsPending(false);
    }
  }, [key, value]);

  return [value, persistValue];
}
```

### Deferred Persistence

```tsx
import { useDebouncedCallback } from '@/lib/hooks';

function useDeferredPersist<T>(store: StoreApi<T>, delay = 1000) {
  const persist = useDebouncedCallback(
    () => {
      const state = store.getState();
      localStorage.setItem('store', JSON.stringify(state));
    },
    delay
  );

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      persist();
    });

    return unsubscribe;
  }, [store, persist]);
}
```

### Persistence with Compression

```tsx
import { compress, decompress } from 'lz-string';

const compressedStorage = {
  getItem: (name: string) => {
    const compressed = localStorage.getItem(name);
    if (!compressed) return null;
    return decompress(compressed);
  },
  setItem: (name: string, value: string) => {
    const compressed = compress(value);
    localStorage.setItem(name, compressed);
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name);
  },
};

const useStore = create(
  persist(
    (set) => ({ /* state */ }),
    {
      name: 'compressed-storage',
      storage: createJSONStorage(() => compressedStorage),
    }
  )
);
```

---

## See Also

- [State Management Examples](./state-examples.md)
- [Security Examples](./security-examples.md)
- [Hydration Examples](./hydration-examples.md)
