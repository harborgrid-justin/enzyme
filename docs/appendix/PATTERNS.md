# Common Patterns

Documented patterns and best practices for common tasks in @missionfabric-js/enzyme.

## Table of Contents

- [Authentication Patterns](#authentication-patterns)
- [Data Fetching Patterns](#data-fetching-patterns)
- [State Management Patterns](#state-management-patterns)
- [Error Handling Patterns](#error-handling-patterns)
- [Performance Optimization](#performance-optimization)
- [Real-time Data Patterns](#real-time-data-patterns)
- [Form Handling Patterns](#form-handling-patterns)
- [Testing Patterns](#testing-patterns)

---

## Authentication Patterns

### Basic Authentication Flow

```typescript
import { AuthProvider, useAuth } from '@missionfabric-js/enzyme';

// App setup
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes />
      </Router>
    </AuthProvider>
  );
}

// Login component
function LoginPage() {
  const { login, isLoading } = useAuth();
  const [credentials, setCredentials] = useState({ email: '', password: '' });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(credentials);
      // Redirect handled by AuthProvider
    } catch (error) {
      // Show error
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### Protected Routes

```typescript
import { RequireAuth, RequireRole } from '@missionfabric-js/enzyme';

function Routes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth fallback={<Navigate to="/login" />}>
              <Dashboard />
            </RequireAuth>
          }
        />

        {/* Role-based routes */}
        <Route
          path="/admin"
          element={
            <RequireRole role="admin" fallback={<AccessDenied />}>
              <AdminPanel />
            </RequireRole>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

### RBAC Permission Checks

```typescript
import { useRBAC } from '@missionfabric-js/enzyme';

function DocumentActions({ documentId }: { documentId: string }) {
  const { can } = useRBAC();

  return (
    <div>
      {can('read', 'documents') && (
        <Button onClick={() => viewDocument(documentId)}>View</Button>
      )}

      {can('update', 'documents') && (
        <Button onClick={() => editDocument(documentId)}>Edit</Button>
      )}

      {can('delete', 'documents') && (
        <Button onClick={() => deleteDocument(documentId)}>Delete</Button>
      )}
    </div>
  );
}
```

---

## Data Fetching Patterns

### Basic API Request

```typescript
import { useApiRequest } from '@missionfabric-js/enzyme';

function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error, refetch } = useApiRequest<User>({
    url: `/users/${userId}`,
    queryKey: ['users', userId],
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return null;

  return (
    <div>
      <h1>{data.name}</h1>
      <p>{data.email}</p>
      <Button onClick={refetch}>Refresh</Button>
    </div>
  );
}
```

### Mutations with Optimistic Updates

```typescript
import { useApiMutation, useQueryClient } from '@missionfabric-js/enzyme';

function TodoItem({ todo }: { todo: Todo }) {
  const queryClient = useQueryClient();

  const { mutate: toggleTodo } = useApiMutation({
    url: `/todos/${todo.id}`,
    method: 'PATCH',

    // Optimistic update
    onMutate: async (newData) => {
      await queryClient.cancelQueries(['todos']);

      const previousTodos = queryClient.getQueryData(['todos']);

      queryClient.setQueryData(['todos'], (old: Todo[]) =>
        old.map((t) => (t.id === todo.id ? { ...t, ...newData } : t))
      );

      return { previousTodos };
    },

    // Rollback on error
    onError: (err, newData, context) => {
      queryClient.setQueryData(['todos'], context?.previousTodos);
    },

    // Refetch on success
    onSuccess: () => {
      queryClient.invalidateQueries(['todos']);
    },
  });

  return (
    <div>
      <Checkbox
        checked={todo.completed}
        onChange={() => toggleTodo({ completed: !todo.completed })}
      />
      {todo.title}
    </div>
  );
}
```

### Parallel Requests

```typescript
import { useApiRequest } from '@missionfabric-js/enzyme';

function Dashboard() {
  const { data: stats } = useApiRequest({
    url: '/stats',
    queryKey: ['stats'],
  });

  const { data: recentActivity } = useApiRequest({
    url: '/activity/recent',
    queryKey: ['activity', 'recent'],
  });

  const { data: notifications } = useApiRequest({
    url: '/notifications',
    queryKey: ['notifications'],
  });

  // All requests run in parallel
  return (
    <div>
      <StatsCard data={stats} />
      <ActivityFeed data={recentActivity} />
      <NotificationPanel data={notifications} />
    </div>
  );
}
```

### Dependent Requests

```typescript
function UserPosts({ userId }: { userId: string }) {
  const { data: user } = useApiRequest({
    url: `/users/${userId}`,
    queryKey: ['users', userId],
  });

  const { data: posts } = useApiRequest({
    url: `/users/${userId}/posts`,
    queryKey: ['users', userId, 'posts'],
    enabled: !!user, // Only fetch when user exists
  });

  return <PostList posts={posts} author={user} />;
}
```

---

## State Management Patterns

### Global State with Zustand

```typescript
import { createAppStore } from '@missionfabric-js/enzyme';

interface AppState {
  count: number;
  increment: () => void;
  decrement: () => void;
}

const useStore = createAppStore<AppState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));

// Usage in components
function Counter() {
  const { count, increment, decrement } = useStore();

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  );
}
```

### Feature-Specific Stores

```typescript
import { registerFeatureStore } from '@missionfabric-js/enzyme';

// Create feature store
const useProductStore = createAppStore((set) => ({
  products: [],
  selectedProduct: null,
  setProducts: (products) => set({ products }),
  selectProduct: (id) => set((state) => ({
    selectedProduct: state.products.find((p) => p.id === id),
  })),
}));

// Register with enzyme
registerFeatureStore('products', useProductStore);

// Use in components
function ProductList() {
  const { products, selectProduct } = useProductStore();

  return (
    <div>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onClick={() => selectProduct(product.id)}
        />
      ))}
    </div>
  );
}
```

### Normalized State

```typescript
import { normalize, denormalize, schema } from '@missionfabric-js/enzyme';

// Define schemas
const userSchema = schema.entity('users');
const postSchema = schema.entity('posts', {
  author: userSchema,
});

// Normalize API response
const { data: posts } = await apiClient.get('/posts');
const { entities, result } = normalize(posts, [postSchema]);

// Store in normalized format
set({ entities, postIds: result });

// Denormalize for use
const denormalizedPosts = denormalize(result, [postSchema], entities);
```

---

## Error Handling Patterns

### Component-Level Error Boundaries

```typescript
import { ErrorBoundary } from '@missionfabric-js/enzyme';

function UserDashboard() {
  return (
    <ErrorBoundary
      fallback={(error) => (
        <div>
          <h2>Dashboard Error</h2>
          <p>{error.message}</p>
          <Button onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>
      )}
      onError={(error, errorInfo) => {
        console.error('Dashboard error:', error, errorInfo);
      }}
    >
      <Dashboard />
    </ErrorBoundary>
  );
}
```

### Async Error Recovery

```typescript
import { useAsyncWithRecovery } from '@missionfabric-js/enzyme';

function DataLoader() {
  const { data, error, retry, isRetrying } = useAsyncWithRecovery(
    async () => {
      const response = await fetch('/api/data');
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    {
      maxRetries: 3,
      retryDelay: 1000,
      onError: (error) => {
        console.error('Fetch failed:', error);
      },
    }
  );

  if (error) {
    return (
      <div>
        <p>Error: {error.message}</p>
        <Button onClick={retry} disabled={isRetrying}>
          {isRetrying ? 'Retrying...' : 'Retry'}
        </Button>
      </div>
    );
  }

  return <DataDisplay data={data} />;
}
```

### Global Error Handling

```typescript
import { initErrorReporter, reportError } from '@missionfabric-js/enzyme';

// Initialize error reporter
initErrorReporter({
  endpoint: '/api/errors',
  beforeSend: (error) => {
    // Filter out certain errors
    if (error.message.includes('ResizeObserver')) {
      return null;
    }
    return error;
  },
});

// Report errors manually
try {
  await riskyOperation();
} catch (error) {
  reportError(error, {
    context: 'user-action',
    userId: user.id,
  });
  showErrorToast('Operation failed');
}
```

---

## Performance Optimization

### Code Splitting by Route

```typescript
import { lazy, Suspense } from 'react';
import { createLazyFeaturePage } from '@missionfabric-js/enzyme';

// Lazy load route components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Reports = lazy(() => import('./pages/Reports'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </Suspense>
  );
}
```

### Prefetching on Hover

```typescript
import { usePrefetchOnHover } from '@missionfabric-js/enzyme';

function NavigationLink({ to, children }: { to: string; children: ReactNode }) {
  const { onMouseEnter } = usePrefetchOnHover(to);

  return (
    <Link to={to} onMouseEnter={onMouseEnter}>
      {children}
    </Link>
  );
}
```

### Performance Monitoring

```typescript
import {
  PerformanceProvider,
  usePerformanceBudget
} from '@missionfabric-js/enzyme';

function App() {
  return (
    <PerformanceProvider
      budget={{
        FCP: 1800,  // First Contentful Paint
        LCP: 2500,  // Largest Contentful Paint
        FID: 100,   // First Input Delay
        CLS: 0.1,   // Cumulative Layout Shift
      }}
    >
      <MyApp />
    </PerformanceProvider>
  );
}

function PerformanceWarning() {
  const { isViolating, violations } = usePerformanceBudget();

  if (!isViolating || process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="performance-warning">
      Performance budget exceeded:
      {violations.map((v) => (
        <div key={v.metric}>
          {v.metric}: {v.value} (budget: {v.budget})
        </div>
      ))}
    </div>
  );
}
```

### Virtual Scrolling for Large Lists

```typescript
import { FixedSizeList } from 'react-window';

function LargeList({ items }: { items: Item[] }) {
  const Row = ({ index, style }: { index: number; style: CSSProperties }) => (
    <div style={style}>
      <ItemCard item={items[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={100}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

---

## Real-time Data Patterns

### WebSocket Connection

```typescript
import {
  RealtimeProvider,
  useRealtimeStream
} from '@missionfabric-js/enzyme';

function App() {
  return (
    <RealtimeProvider url="wss://api.example.com">
      <Dashboard />
    </RealtimeProvider>
  );
}

function LiveNotifications() {
  const { data, isConnected } = useRealtimeStream<Notification>('notifications');

  return (
    <div>
      <StatusIndicator connected={isConnected} />
      {data && <NotificationToast notification={data} />}
    </div>
  );
}
```

### Realtime Cache Updates

```typescript
import {
  useRealtimeStream,
  useQueryClient
} from '@missionfabric-js/enzyme';

function RealtimeSync() {
  const queryClient = useQueryClient();

  useRealtimeStream('todos', {
    onMessage: (update: TodoUpdate) => {
      // Update query cache in real-time
      queryClient.setQueryData(['todos'], (old: Todo[]) => {
        if (update.type === 'create') {
          return [...old, update.todo];
        }
        if (update.type === 'update') {
          return old.map((t) =>
            t.id === update.todo.id ? update.todo : t
          );
        }
        if (update.type === 'delete') {
          return old.filter((t) => t.id !== update.todo.id);
        }
        return old;
      });
    },
  });

  return null;
}
```

---

## Form Handling Patterns

### Form with Validation

```typescript
import { useFormValidation, rules } from '@missionfabric-js/enzyme';

function ContactForm() {
  const { errors, validate, register } = useFormValidation({
    name: [rules.required('Name is required')],
    email: [
      rules.required('Email is required'),
      rules.email('Invalid email'),
    ],
    message: [
      rules.required('Message is required'),
      rules.min(10, 'Message must be at least 10 characters'),
    ],
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Submit form
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        {...register('name')}
        error={errors.name}
      />
      <Input
        {...register('email')}
        type="email"
        error={errors.email}
      />
      <Textarea
        {...register('message')}
        error={errors.message}
      />
      <Button type="submit">Submit</Button>
    </form>
  );
}
```

### Form with Debounced Validation

```typescript
import {
  useDebouncedValue,
  useDataValidation
} from '@missionfabric-js/enzyme';

function UsernameInput() {
  const [username, setUsername] = useState('');
  const debouncedUsername = useDebouncedValue(username, 500);

  const { isValid, errors } = useDataValidation(
    v.string().min(3).max(20),
    debouncedUsername
  );

  return (
    <div>
      <Input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        error={!isValid ? errors[0]?.message : undefined}
      />
      {isValid && <CheckIcon />}
    </div>
  );
}
```

---

## Testing Patterns

### Component Testing

```typescript
import { render, screen } from '@testing-library/react';
import { FeatureTestWrapper } from '@missionfabric-js/enzyme/feature';

describe('UserProfile', () => {
  it('displays user information', async () => {
    const mockUser = { id: '1', name: 'John Doe', email: 'john@example.com' };

    render(
      <FeatureTestWrapper
        queryData={[['users', '1'], mockUser]}
      >
        <UserProfile userId="1" />
      </FeatureTestWrapper>
    );

    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });
});
```

### Hook Testing

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useApiRequest } from '@missionfabric-js/enzyme';

describe('useApiRequest', () => {
  it('fetches data successfully', async () => {
    const { result } = renderHook(() =>
      useApiRequest({ url: '/users/1', queryKey: ['users', '1'] })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({ id: '1', name: 'John Doe' });
  });
});
```

---

**Last Updated:** 2025-11-29
**Version:** 1.0.5
