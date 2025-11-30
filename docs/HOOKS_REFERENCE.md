# Hooks Reference

> **Complete reference for all custom hooks** - Authentication, state management, performance, and utility hooks.

---

## Table of Contents

1. [Authentication Hooks](#authentication-hooks)
2. [State Management Hooks](#state-management-hooks)
3. [Data Fetching Hooks](#data-fetching-hooks)
4. [Performance Hooks](#performance-hooks)
5. [UI Hooks](#ui-hooks)
6. [Utility Hooks](#utility-hooks)
7. [Feature Flag Hooks](#feature-flag-hooks)
8. [Theme Hooks](#theme-hooks)

---

## Authentication Hooks

### useAuth

Access authentication state and actions.

```typescript
import { useAuth } from '@/lib/auth';

function UserMenu() {
  const {
    user,           // Current user object
    isAuthenticated,// Boolean
    isLoading,      // Loading state
    error,          // Error object
    login,          // Login function
    logout,         // Logout function
    register,       // Register function
    refreshToken,   // Refresh token function
  } = useAuth();

  if (isLoading) return <Spinner />;

  if (!isAuthenticated) {
    return <LoginButton onClick={() => login(credentials)} />;
  }

  return <UserProfile user={user} onLogout={logout} />;
}
```

**Type Definition:**

```typescript
interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  refreshToken: () => Promise<void>;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  permissions: Permission[];
}
```

### usePermission

Check user permissions.

```typescript
import { usePermission } from '@/lib/auth';

function AdminPanel() {
  const canViewUsers = usePermission('users:view');
  const canCreateUsers = usePermission('users:create');

  if (!canViewUsers) return <AccessDenied />;

  return (
    <div>
      <UserList />
      {canCreateUsers && <CreateUserButton />}
    </div>
  );
}
```

### useRole

Check user roles.

```typescript
import { useRole } from '@/lib/auth';

function ManagerTools() {
  const isManager = useRole('manager');
  const isAdmin = useRole('admin');
  const isManagerOrAbove = useRole(['manager', 'admin']);

  return (
    <div>
      {isManager && <ManagerDashboard />}
      {isAdmin && <AdminSettings />}
    </div>
  );
}
```

---

## State Management Hooks

### useGlobalStore

Access Zustand global store.

```typescript
import { useGlobalStore } from '@/lib/state';

function Sidebar() {
  // Select specific state (optimized)
  const isOpen = useGlobalStore((s) => s.ui.sidebarOpen);
  const toggleSidebar = useGlobalStore((s) => s.toggleSidebar);

  return (
    <aside className={isOpen ? 'w-64' : 'w-16'}>
      <button onClick={toggleSidebar}>Toggle</button>
    </aside>
  );
}
```

**Available Selectors:**

```typescript
// UI State
useGlobalStore((s) => s.ui.sidebarOpen)
useGlobalStore((s) => s.ui.sidebarCollapsed)
useGlobalStore((s) => s.ui.activeModal)

// Preferences
useGlobalStore((s) => s.preferences.theme)
useGlobalStore((s) => s.preferences.language)
useGlobalStore((s) => s.preferences.notifications)

// Actions
useGlobalStore((s) => s.toggleSidebar)
useGlobalStore((s) => s.setSidebarCollapsed)
useGlobalStore((s) => s.openModal)
useGlobalStore((s) => s.closeModal)
useGlobalStore((s) => s.setTheme)
useGlobalStore((s) => s.setLanguage)
```

### useHydration

Track Zustand hydration status.

```typescript
import { useHydration } from '@/lib/state';

function App() {
  const { hasHydrated, isHydrating } = useHydration();

  if (!hasHydrated) {
    return <SplashScreen />;
  }

  return <AppContent />;
}
```

---

## Data Fetching Hooks

### TanStack Query Hooks

All data fetching uses TanStack Query. See [API Documentation](./API.md) for details.

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query example
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['products', filters],
  queryFn: () => fetchProducts(filters),
});

// Mutation example
const mutation = useMutation({
  mutationFn: createProduct,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
  },
});
```

### usePrefetchRoute

Prefetch route data on hover/focus.

```typescript
import { usePrefetchRoute } from '@/lib/hooks';

function ProductLink({ productId }) {
  const prefetch = usePrefetchRoute();

  return (
    <Link
      to={`/products/${productId}`}
      onMouseEnter={() => prefetch(`/products/${productId}`)}
    >
      View Product
    </Link>
  );
}
```

---

## Performance Hooks

### usePerformanceMonitor

Monitor component performance.

```typescript
import { usePerformanceMonitor } from '@/lib/hooks';

function Dashboard() {
  const {
    metrics,        // Current metrics
    startMeasure,   // Start measurement
    endMeasure,     // End measurement
    clearMeasures,  // Clear all measurements
  } = usePerformanceMonitor({
    trackMemory: true,
    trackRenderTime: true,
    warnThreshold: 100, // ms
  });

  const handleExpensiveOp = async () => {
    startMeasure('expensive-op');
    await performExpensiveOperation();
    endMeasure('expensive-op');
  };

  return <DashboardContent />;
}
```

**Type Definition:**

```typescript
interface UsePerformanceMonitorOptions {
  trackMemory?: boolean;
  trackRenderTime?: boolean;
  warnThreshold?: number;
  onThresholdExceeded?: (metric: string, duration: number) => void;
}

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  memoryUsage?: number;
  measures: Record<string, number>;
}
```

### usePredictivePrefetch

AI-driven route prefetching.

```typescript
import { usePredictivePrefetch } from '@/lib/performance';

function Navigation() {
  const {
    predictions,    // Predicted routes
    prefetchRoute,  // Manual prefetch
    isLearning,     // Learning status
  } = usePredictivePrefetch({
    confidenceThreshold: 0.7,
    maxPrefetches: 3,
    enableLearning: true,
  });

  return (
    <nav>
      {navItems.map((item) => (
        <PredictiveLink key={item.path} to={item.path}>
          {item.label}
        </PredictiveLink>
      ))}
    </nav>
  );
}
```

### useSmartPrefetch

Intelligent data prefetching based on user behavior.

```typescript
import { useSmartPrefetch } from '@/lib/hooks';

function ProductList() {
  const { registerPrefetch, isPrefetched } = useSmartPrefetch();

  return (
    <ul>
      {products.map((product) => (
        <li
          key={product.id}
          onMouseEnter={() =>
            registerPrefetch(`product-${product.id}`, () =>
              queryClient.prefetchQuery({
                queryKey: ['product', product.id],
                queryFn: () => fetchProduct(product.id),
              })
            )
          }
        >
          {product.name}
          {isPrefetched(`product-${product.id}`) && <PrefetchedIndicator />}
        </li>
      ))}
    </ul>
  );
}
```

---

## UI Hooks

### useDebouncedValue

Debounce a value with configurable delay.

```typescript
import { useDebouncedValue } from '@/lib/hooks';

function SearchInput() {
  const [value, setValue] = useState('');
  const debouncedValue = useDebouncedValue(value, 300);

  // Use debouncedValue for API calls
  const { data } = useQuery({
    queryKey: ['search', debouncedValue],
    queryFn: () => searchProducts(debouncedValue),
    enabled: debouncedValue.length > 2,
  });

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

### useNetworkStatus

Monitor network connectivity.

```typescript
import { useNetworkStatus } from '@/lib/hooks';

function App() {
  const { isOnline, isSlowConnection, effectiveType } = useNetworkStatus();

  if (!isOnline) {
    return <OfflineIndicator />;
  }

  if (isSlowConnection) {
    return <LowBandwidthMode />;
  }

  return <FullApp />;
}
```

**Type Definition:**

```typescript
interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | undefined;
  downlink: number | undefined;
  rtt: number | undefined;
}
```

### useErrorRecovery

Handle and recover from errors.

```typescript
import { useErrorRecovery } from '@/lib/hooks';

function DataComponent() {
  const {
    error,
    retry,
    isRetrying,
    retryCount,
    maxRetries,
    clearError,
  } = useErrorRecovery({
    maxRetries: 3,
    retryDelay: 1000,
    onMaxRetriesReached: () => {
      showErrorNotification('Failed after multiple attempts');
    },
  });

  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={retry}
        isRetrying={isRetrying}
        retryCount={retryCount}
        maxRetries={maxRetries}
      />
    );
  }

  return <DataContent />;
}
```

### useResourceCleanup

Manage resource cleanup.

```typescript
import { useResourceCleanup } from '@/lib/hooks';

function StreamingComponent() {
  const { registerCleanup, cleanup, cleanupAll } = useResourceCleanup();

  useEffect(() => {
    const subscription = dataStream.subscribe(handleData);
    registerCleanup('stream', () => subscription.unsubscribe());

    const timer = setInterval(poll, 5000);
    registerCleanup('timer', () => clearInterval(timer));

    return cleanupAll;
  }, []);

  return <StreamDisplay />;
}
```

---

## Utility Hooks

### useLatestRef

Keep a ref to the latest value (avoids stale closures).

```typescript
import { useLatestRef } from '@/lib/hooks/shared';

function CallbackComponent({ onUpdate }) {
  const onUpdateRef = useLatestRef(onUpdate);

  useEffect(() => {
    const interval = setInterval(() => {
      // Always calls the latest onUpdate
      onUpdateRef.current?.(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []); // No need to include onUpdate in deps

  return <div />;
}
```

### useIsMounted

Check if component is still mounted.

```typescript
import { useIsMounted } from '@/lib/hooks/shared';

function AsyncComponent() {
  const isMounted = useIsMounted();
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const result = await api.getData();
      // Only update state if still mounted
      if (isMounted()) {
        setData(result);
      }
    }
    fetchData();
  }, []);

  return <DataDisplay data={data} />;
}
```

### useBuffer

Buffer values before processing.

```typescript
import { useBuffer } from '@/lib/hooks/shared';

function RealTimeUpdates() {
  const { buffer, flush, add, clear, size } = useBuffer<Update>({
    maxSize: 100,
    flushInterval: 1000,
    onFlush: (items) => {
      batchProcessUpdates(items);
    },
  });

  useEffect(() => {
    const unsubscribe = eventSource.subscribe((update) => {
      add(update);
    });
    return unsubscribe;
  }, []);

  return <UpdateDisplay count={size} />;
}
```

### useAnalytics

Track analytics events.

```typescript
import { useAnalytics } from '@/lib/hooks';

function ProductPage({ product }) {
  const { trackEvent, trackPageView, setUserProperties } = useAnalytics();

  useEffect(() => {
    trackPageView({
      page: 'product',
      productId: product.id,
    });
  }, [product.id]);

  const handleAddToCart = () => {
    trackEvent('add_to_cart', {
      productId: product.id,
      price: product.price,
    });
    addToCart(product);
  };

  return <ProductContent onAddToCart={handleAddToCart} />;
}
```

---

## Feature Flag Hooks

### useFeatureFlag

Check feature flag status.

```typescript
import { useFeatureFlag } from '@/lib/flags';

function Dashboard() {
  const showNewDashboard = useFeatureFlag('new_dashboard');
  const enableBetaFeatures = useFeatureFlag('beta_features');

  if (showNewDashboard) {
    return <NewDashboard betaEnabled={enableBetaFeatures} />;
  }

  return <LegacyDashboard />;
}
```

### useFeatureFlags

Access multiple flags at once.

```typescript
import { useFeatureFlags } from '@/lib/flags';

function App() {
  const flags = useFeatureFlags();

  return (
    <div>
      {flags.new_dashboard && <NewDashboard />}
      {flags.dark_mode && <DarkModeToggle />}
      {flags.analytics_v2 && <AnalyticsV2 />}
    </div>
  );
}
```

---

## Theme Hooks

### useTheme

Access and control theme.

```typescript
import { useTheme } from '@/lib/hooks';

function ThemeToggle() {
  const {
    theme,          // 'light' | 'dark' | 'system'
    resolvedTheme,  // Actual theme ('light' | 'dark')
    setTheme,       // Set theme function
    toggleTheme,    // Toggle between light/dark
  } = useTheme();

  return (
    <button onClick={toggleTheme}>
      {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
}
```

### useThemeContext

Access full theme context.

```typescript
import { useThemeContext } from '@/lib/theme';

function ThemedComponent() {
  const { theme, colors, spacing, typography } = useThemeContext();

  return (
    <div
      style={{
        backgroundColor: colors.background,
        color: colors.text,
        padding: spacing.md,
      }}
    >
      Content
    </div>
  );
}
```

---

## Hook Composition Patterns

### Combining Hooks

```typescript
function useProductDetails(productId: string) {
  // Data fetching
  const { data: product, isLoading, error } = useProduct(productId);

  // Analytics
  const { trackEvent } = useAnalytics();

  // Permissions
  const canEdit = usePermission('products:update');
  const canDelete = usePermission('products:delete');

  // Actions
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const handleUpdate = useCallback(
    async (data: Partial<Product>) => {
      await updateMutation.mutateAsync({ id: productId, data });
      trackEvent('product_updated', { productId });
    },
    [productId, updateMutation, trackEvent]
  );

  const handleDelete = useCallback(async () => {
    await deleteMutation.mutateAsync(productId);
    trackEvent('product_deleted', { productId });
  }, [productId, deleteMutation, trackEvent]);

  return {
    product,
    isLoading,
    error,
    canEdit,
    canDelete,
    handleUpdate,
    handleDelete,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
```

---

## Related Documentation

### Hooks Documentation
- **[Hooks Overview](./hooks/README.md)** - Complete hooks module guide
- **[Hooks Quick Reference](./hooks/QUICK_REFERENCE.md)** - Quick API lookup
- **[Migration Checklist](./hooks/MIGRATION_CHECKLIST.md)** - Migration guide

### Module Documentation
- **[API Module](./api/README.md)** - API client and request hooks
- **[API Hooks](./api/HOOKS.md)** - Detailed API hooks documentation
- **[Queries Module](./queries/README.md)** - React Query integration
- **[State Management](./state/README.md)** - Global state hooks
- **[Performance](./performance/README.md)** - Performance monitoring hooks
- **[Realtime](./realtime/README.md)** - WebSocket and SSE hooks
- **[Shared Utilities](./shared/README.md)** - Shared hook utilities

### Reference
- **[Documentation Index](./INDEX.md)** - All documentation resources
- **[Architecture Guide](./ARCHITECTURE.md)** - System architecture

---

<p align="center">
  <strong>Hooks Reference</strong><br>
  Custom hooks for every use case
</p>
