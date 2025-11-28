# Best Practices Guide

> **Scope**: This document covers best practices for developing with the Harbor React Library.
> For architecture patterns, see [Architecture Guide](./ARCHITECTURE.md).

## Table of Contents

- [Component Best Practices](#component-best-practices)
- [Hook Best Practices](#hook-best-practices)
- [State Management Best Practices](#state-management-best-practices)
- [Performance Best Practices](#performance-best-practices)
- [Security Best Practices](#security-best-practices)
- [Testing Best Practices](#testing-best-practices)
- [TypeScript Best Practices](#typescript-best-practices)
- [Error Handling Best Practices](#error-handling-best-practices)
- [Accessibility Best Practices](#accessibility-best-practices)
- [API Design Best Practices](#api-design-best-practices)
- [Code Organization Best Practices](#code-organization-best-practices)
- [Documentation Best Practices](#documentation-best-practices)
- [Git Workflow Best Practices](#git-workflow-best-practices)
- [Review Checklist](#review-checklist)
- [When to Use X vs Y](#when-to-use-x-vs-y)

---

## Component Best Practices

### Keep Components Small and Focused

✅ **DO**: Single Responsibility Principle
```typescript
// Good: Focused component with single responsibility
interface UserAvatarProps {
  userId: string;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
}

export function UserAvatar({ userId, size = 'md', showStatus }: UserAvatarProps) {
  const user = useUser(userId);

  return (
    <div className={`avatar avatar-${size}`}>
      <img src={user.avatarUrl} alt={user.name} />
      {showStatus && <StatusIndicator status={user.status} />}
    </div>
  );
}
```

❌ **DON'T**: God components with multiple responsibilities
```typescript
// Bad: Too many responsibilities
function UserProfile() {
  // Handles user data
  // Handles posts
  // Handles comments
  // Handles notifications
  // Handles settings
  // 500+ lines of code

  return <div>...</div>;
}
```

### Use Composition Over Prop Drilling

✅ **DO**: Component composition
```typescript
// Good: Composition pattern
export function Card({ children }: { children: React.ReactNode }) {
  return <div className="card">{children}</div>;
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="card-header">{children}</div>;
}

export function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="card-body">{children}</div>;
}

// Usage
<Card>
  <CardHeader>
    <h2>Title</h2>
  </CardHeader>
  <CardBody>
    <p>Content</p>
  </CardBody>
</Card>
```

❌ **DON'T**: Deep prop drilling
```typescript
// Bad: Props passed through many levels
<Layout headerTitle={title} headerSubtitle={subtitle} headerActions={actions}>
  <Content title={title} subtitle={subtitle}>
    <Section title={title}>
      <Item title={title} />
    </Section>
  </Content>
</Layout>
```

### Prefer Named Exports

✅ **DO**: Named exports for discoverability
```typescript
// components/Button.tsx
export function Button({ children, ...props }: ButtonProps) {
  return <button {...props}>{children}</button>;
}

export function PrimaryButton(props: ButtonProps) {
  return <Button variant="primary" {...props} />;
}

export function SecondaryButton(props: ButtonProps) {
  return <Button variant="secondary" {...props} />;
}
```

❌ **DON'T**: Default exports (harder to refactor)
```typescript
// Bad: Default export
export default function Button() {
  // ...
}

// Harder to find in IDE, harder to refactor
```

### Extract Complex Logic to Hooks

✅ **DO**: Custom hooks for business logic
```typescript
// Good: Extract complex logic
function useUserProfile(userId: string) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchUserProfile(userId)
      .then(setProfile)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [userId]);

  return { profile, loading, error };
}

function UserProfileCard({ userId }: { userId: string }) {
  const { profile, loading, error } = useUserProfile(userId);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!profile) return null;

  return <div>{profile.name}</div>;
}
```

❌ **DON'T**: Complex logic in components
```typescript
// Bad: Too much logic in component
function UserProfileCard({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [cache, setCache] = useState(new Map());

  useEffect(() => {
    // 50+ lines of complex logic
  }, [userId, retryCount]);

  // More complex logic...

  return <div>...</div>;
}
```

### Use Memo for Expensive Computations

✅ **DO**: Memoize expensive calculations
```typescript
function DataTable({ data }: { data: DataItem[] }) {
  // Good: Memoize expensive computation
  const sortedData = useMemo(() => {
    return data.slice().sort((a, b) => a.value - b.value);
  }, [data]);

  const statistics = useMemo(() => {
    return calculateComplexStatistics(sortedData);
  }, [sortedData]);

  return <table>...</table>;
}
```

❌ **DON'T**: Recalculate on every render
```typescript
function DataTable({ data }: { data: DataItem[] }) {
  // Bad: Recalculates on every render
  const sortedData = data.slice().sort((a, b) => a.value - b.value);
  const statistics = calculateComplexStatistics(sortedData);

  return <table>...</table>;
}
```

### Use Callback for Event Handlers

✅ **DO**: Memoize callbacks
```typescript
function Form({ onSubmit }: { onSubmit: (data: FormData) => void }) {
  const [value, setValue] = useState('');

  // Good: Memoized callback
  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    onSubmit({ value });
  }, [value, onSubmit]);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  return (
    <form onSubmit={handleSubmit}>
      <input value={value} onChange={handleChange} />
    </form>
  );
}
```

### Avoid Inline Object/Array Props

✅ **DO**: Stable references
```typescript
// Good: Stable reference
const styles = { padding: 16, margin: 8 };

function Component() {
  return <Child style={styles} />;
}
```

❌ **DON'T**: New objects on every render
```typescript
// Bad: New object every render
function Component() {
  return <Child style={{ padding: 16, margin: 8 }} />;
}
```

---

## Hook Best Practices

### Follow Rules of Hooks

✅ **DO**: Call hooks at top level
```typescript
function useData(id: string) {
  // Good: All hooks at top level
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const cache = useRef(new Map());

  useEffect(() => {
    // Effect logic
  }, [id]);

  return { data, loading };
}
```

❌ **DON'T**: Conditional hooks
```typescript
function useData(id: string, shouldFetch: boolean) {
  // Bad: Conditional hook
  if (shouldFetch) {
    const data = useState(null); // Error!
  }

  return data;
}
```

### Create Custom Hooks for Reusable Logic

✅ **DO**: Extract reusable logic
```typescript
// Good: Reusable hook
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
}
```

### Use useCallback for Function Dependencies

✅ **DO**: Stable function references
```typescript
function SearchComponent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  // Good: Memoized function
  const search = useCallback(async (searchQuery: string) => {
    const data = await searchAPI(searchQuery);
    setResults(data);
  }, []);

  useEffect(() => {
    if (query) {
      search(query);
    }
  }, [query, search]); // Stable dependency

  return <div>...</div>;
}
```

### Use useRef for Values That Don't Trigger Renders

✅ **DO**: useRef for non-render values
```typescript
function Timer() {
  const [count, setCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  // Good: useRef for interval ID (doesn't need to trigger render)
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCount((c) => c + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return <div>Count: {count}</div>;
}
```

### Use Latest Ref Pattern

✅ **DO**: Use useLatestRef for callbacks
```typescript
import { useLatestRef } from '@/lib/hooks/shared';

function Component({ onEvent }: { onEvent: () => void }) {
  // Good: Always uses latest callback
  const onEventRef = useLatestRef(onEvent);

  useEffect(() => {
    const handler = () => {
      onEventRef.current();
    };

    window.addEventListener('event', handler);
    return () => window.removeEventListener('event', handler);
  }, []); // Empty deps, but always uses latest callback

  return <div>...</div>;
}
```

### Use Mounted State for Async Operations

✅ **DO**: Check if mounted before setting state
```typescript
import { useIsMounted } from '@/lib/hooks/shared';

function Component() {
  const [data, setData] = useState(null);
  const isMounted = useIsMounted();

  useEffect(() => {
    fetchData().then((result) => {
      // Good: Only set state if still mounted
      if (isMounted()) {
        setData(result);
      }
    });
  }, [isMounted]);

  return <div>{data}</div>;
}
```

---

## State Management Best Practices

### Use Functional Updates with Immer

✅ **DO**: Functional setState for Immer compatibility
```typescript
// Good: Functional update
useStore.setState((state) => {
  state.count += 1;
  state.items.push(newItem);
});
```

❌ **DON'T**: Direct object updates
```typescript
// Bad: Breaks Immer middleware
useStore.setState({
  count: store.count + 1,
  items: [...store.items, newItem],
});
```

### Use Selectors for Performance

✅ **DO**: Granular selectors
```typescript
// Good: Component only re-renders when user changes
function UserDisplay({ userId }: { userId: string }) {
  const user = useStore((state) => state.users[userId]);
  return <div>{user.name}</div>;
}
```

❌ **DON'T**: Select entire store
```typescript
// Bad: Re-renders on any store change
function UserDisplay({ userId }: { userId: string }) {
  const store = useStore();
  const user = store.users[userId];
  return <div>{user.name}</div>;
}
```

### Use Shallow Comparison for Objects

✅ **DO**: Shallow equality for object selectors
```typescript
import { shallow } from 'zustand/shallow';

function Component() {
  // Good: Only re-renders when user or settings change
  const { user, settings } = useStore(
    (state) => ({ user: state.user, settings: state.settings }),
    shallow
  );

  return <div>...</div>;
}
```

### Don't Store Derived State

✅ **DO**: Compute derived values
```typescript
// Good: Derive values in selectors
const useFilteredItems = () => {
  return useStore((state) => {
    const items = state.items;
    const filter = state.filter;
    return items.filter((item) => item.category === filter);
  });
};
```

❌ **DON'T**: Store derived state
```typescript
// Bad: Redundant state that can be derived
interface State {
  items: Item[];
  filter: string;
  filteredItems: Item[]; // Redundant!
}
```

### Use Slices for Large Stores

✅ **DO**: Organize store into slices
```typescript
// slices/userSlice.ts
export interface UserSlice {
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

export const createUserSlice: StateCreator<UserSlice> = (set) => ({
  user: null,
  login: async (credentials) => {
    const user = await authenticate(credentials);
    set((state) => {
      state.user = user;
    });
  },
  logout: () => {
    set((state) => {
      state.user = null;
    });
  },
});
```

### Use Feature Stores for Large Features

✅ **DO**: Separate stores for large features
```typescript
// features/reports/store.ts
interface ReportsState {
  reports: Report[];
  filters: ReportFilters;
  loadReports: () => Promise<void>;
  updateFilters: (filters: Partial<ReportFilters>) => void;
}

export const useReportsStore = create<ReportsState>()(
  immer(
    devtools((set) => ({
      reports: [],
      filters: {},
      loadReports: async () => {
        const reports = await fetchReports();
        set((state) => {
          state.reports = reports;
        });
      },
      updateFilters: (filters) => {
        set((state) => {
          Object.assign(state.filters, filters);
        });
      },
    }))
  )
);

// Register with global registry
registerFeatureStore('reports', useReportsStore);
```

---

## Performance Best Practices

### Use React.memo for Pure Components

✅ **DO**: Memoize pure components
```typescript
// Good: Prevents re-renders when props haven't changed
export const ExpensiveComponent = React.memo(function ExpensiveComponent({
  data,
  onAction,
}: ExpensiveComponentProps) {
  // Expensive rendering logic
  return <div>...</div>;
});
```

### Code Split Large Features

✅ **DO**: Lazy load routes and features
```typescript
// Good: Code splitting
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </Suspense>
  );
}
```

### Virtualize Long Lists

✅ **DO**: Use virtualization for long lists
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function LongList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} style={{ height: 400, overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualItem.size,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {items[virtualItem.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Debounce Expensive Operations

✅ **DO**: Debounce search and filters
```typescript
import { useDeferredValue, useMemo } from 'react';

function SearchResults({ query }: { query: string }) {
  // Good: Defer expensive filtering
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    return performExpensiveSearch(deferredQuery);
  }, [deferredQuery]);

  return <ResultsList results={results} />;
}
```

### Optimize Images

✅ **DO**: Use next-gen formats and lazy loading
```typescript
function OptimizedImage({ src, alt }: ImageProps) {
  return (
    <picture>
      <source srcSet={`${src}.webp`} type="image/webp" />
      <source srcSet={`${src}.avif`} type="image/avif" />
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
      />
    </picture>
  );
}
```

### Use Web Workers for Heavy Computation

✅ **DO**: Offload heavy work to workers
```typescript
// worker.ts
self.onmessage = (e: MessageEvent) => {
  const result = performHeavyComputation(e.data);
  self.postMessage(result);
};

// Component.tsx
function DataProcessor() {
  const [result, setResult] = useState(null);

  useEffect(() => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url));

    worker.onmessage = (e) => {
      setResult(e.data);
    };

    worker.postMessage(data);

    return () => worker.terminate();
  }, [data]);

  return <div>{result}</div>;
}
```

---

## Security Best Practices

### Always Use Environment Helpers

✅ **DO**: Use centralized environment helpers
```typescript
import { isDev, isProd, getEnvVar } from '@/lib/core/config/env-helper';

// Good: Centralized environment detection
if (isDev()) {
  console.log('Development mode');
}

const apiUrl = getEnvVar('API_URL');
```

❌ **DON'T**: Direct environment access
```typescript
// Bad: Direct access
if (process.env.NODE_ENV === 'development') {
  console.log('Development mode');
}
```

### Never Store Sensitive Data in State

✅ **DO**: Exclude sensitive data from persistence
```typescript
// store.ts
const persistedState = (state: StoreState): Partial<StoreState> => ({
  // Good: Only persist UI preferences
  theme: state.theme,
  sidebarOpen: state.sidebarOpen,

  // DON'T persist:
  // - JWT tokens
  // - User credentials
  // - API keys
  // - Session data
});
```

### Use CSRF Protection for Mutations

✅ **DO**: CSRF tokens on all mutations
```typescript
import { apiClient } from '@/lib/api';

// Good: apiClient automatically adds CSRF tokens
async function updateUser(userId: string, data: UserUpdate) {
  return apiClient.put(`/users/${userId}`, data);
}
```

### Sanitize User Input

✅ **DO**: Sanitize and validate input
```typescript
import DOMPurify from 'dompurify';

function UserContent({ html }: { html: string }) {
  // Good: Sanitize HTML
  const sanitized = useMemo(() => {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
      ALLOWED_ATTR: [],
    });
  }, [html]);

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

❌ **DON'T**: Render unsanitized content
```typescript
// Bad: XSS vulnerability
function UserContent({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

### Use Content Security Policy

✅ **DO**: Configure CSP headers
```typescript
// security.config.ts
export const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", process.env.API_URL],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
  },
};
```

### Implement Rate Limiting

✅ **DO**: Rate limit API calls
```typescript
import { RateLimiter } from '@/lib/api/advanced/rate-limiter';

const limiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000, // 1 minute
});

export async function apiCall(endpoint: string) {
  await limiter.checkLimit('api');
  return fetch(endpoint);
}
```

---

## Testing Best Practices

### Write Tests First (TDD)

✅ **DO**: Test-driven development
```typescript
// Good: Write test first
describe('useCounter', () => {
  it('should increment count', () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });
});

// Then implement
function useCounter() {
  const [count, setCount] = useState(0);
  const increment = () => setCount((c) => c + 1);
  return { count, increment };
}
```

### Test Behavior, Not Implementation

✅ **DO**: Test user-facing behavior
```typescript
// Good: Test what the user sees
test('submits form with valid data', async () => {
  render(<ContactForm />);

  await userEvent.type(screen.getByLabelText(/name/i), 'John Doe');
  await userEvent.type(screen.getByLabelText(/email/i), 'john@example.com');
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));

  expect(screen.getByText(/thank you/i)).toBeInTheDocument();
});
```

❌ **DON'T**: Test implementation details
```typescript
// Bad: Testing internal state
test('sets isSubmitting to true', () => {
  const { result } = renderHook(() => useForm());

  act(() => {
    result.current.submit();
  });

  expect(result.current.isSubmitting).toBe(true);
});
```

### Mock External Dependencies

✅ **DO**: Mock API calls and external services
```typescript
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: '1', name: 'John' },
      { id: '2', name: 'Jane' },
    ]);
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('displays users', async () => {
  render(<UserList />);

  expect(await screen.findByText('John')).toBeInTheDocument();
  expect(await screen.findByText('Jane')).toBeInTheDocument();
});
```

### Test Error States

✅ **DO**: Test error handling
```typescript
test('displays error message on failure', async () => {
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    })
  );

  render(<UserList />);

  expect(await screen.findByText(/error loading users/i)).toBeInTheDocument();
});
```

### Use Testing Library Queries Correctly

✅ **DO**: Follow query priority
```typescript
// Priority order:
// 1. getByRole (most accessible)
const button = screen.getByRole('button', { name: /submit/i });

// 2. getByLabelText (forms)
const input = screen.getByLabelText(/email/i);

// 3. getByPlaceholderText (if no label)
const search = screen.getByPlaceholderText(/search/i);

// 4. getByText (non-interactive)
const heading = screen.getByText(/welcome/i);

// 5. getByTestId (last resort)
const custom = screen.getByTestId('custom-element');
```

---

## TypeScript Best Practices

### Use Strict Mode

✅ **DO**: Enable strict TypeScript
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Define Precise Types

✅ **DO**: Specific types over any
```typescript
// Good: Precise types
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: Date;
}

function getUser(id: string): Promise<User> {
  // ...
}
```

❌ **DON'T**: Use any
```typescript
// Bad: Loses type safety
function getUser(id: string): Promise<any> {
  // ...
}
```

### Use Type Guards

✅ **DO**: Type guards for runtime checks
```typescript
// Good: Type guard
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    typeof value.id === 'string' &&
    typeof value.name === 'string'
  );
}

function processData(data: unknown) {
  if (isUser(data)) {
    // TypeScript knows data is User here
    console.log(data.name);
  }
}
```

### Use Discriminated Unions

✅ **DO**: Discriminated unions for state
```typescript
// Good: Type-safe state machine
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function DataDisplay({ state }: { state: RequestState<User> }) {
  switch (state.status) {
    case 'idle':
      return <div>Click to load</div>;
    case 'loading':
      return <Spinner />;
    case 'success':
      return <div>{state.data.name}</div>; // data available
    case 'error':
      return <div>{state.error.message}</div>; // error available
  }
}
```

### Avoid Type Assertions

✅ **DO**: Proper typing
```typescript
// Good: Let TypeScript infer
const users = data.filter((item): item is User => isUser(item));
```

❌ **DON'T**: Force types with assertions
```typescript
// Bad: Bypasses type checking
const users = data as User[];
```

### Use Utility Types

✅ **DO**: Leverage built-in utilities
```typescript
// Good: Utility types
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

// Pick specific fields
type PublicUser = Pick<User, 'id' | 'name' | 'email'>;

// Omit sensitive fields
type SafeUser = Omit<User, 'password'>;

// Make all fields optional
type PartialUser = Partial<User>;

// Make all fields readonly
type ImmutableUser = Readonly<User>;
```

---

## Error Handling Best Practices

### Use Error Boundaries

✅ **DO**: Catch rendering errors
```typescript
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

### Handle Async Errors

✅ **DO**: Try-catch for async operations
```typescript
async function loadUserData(userId: string) {
  try {
    const user = await apiClient.get(`/users/${userId}`);
    return { data: user, error: null };
  } catch (error) {
    console.error('Failed to load user:', error);
    return { data: null, error };
  }
}
```

### Provide User-Friendly Errors

✅ **DO**: Translate errors for users
```typescript
function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect. Please check your internet connection.';
      case 'UNAUTHORIZED':
        return 'Your session has expired. Please log in again.';
      case 'NOT_FOUND':
        return 'The requested item could not be found.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  return 'Something went wrong. Please try again.';
}
```

### Use Result Types

✅ **DO**: Result type pattern
```typescript
type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

async function fetchUser(id: string): Promise<Result<User>> {
  try {
    const user = await apiClient.get(`/users/${id}`);
    return { success: true, value: user };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

// Usage
const result = await fetchUser('123');
if (result.success) {
  console.log(result.value.name); // Type-safe access
} else {
  console.error(result.error.message);
}
```

---

## Accessibility Best Practices

### Use Semantic HTML

✅ **DO**: Semantic elements
```typescript
// Good: Semantic HTML
function Article({ title, content }: ArticleProps) {
  return (
    <article>
      <header>
        <h1>{title}</h1>
      </header>
      <main>
        <p>{content}</p>
      </main>
      <footer>
        <time dateTime="2024-01-01">January 1, 2024</time>
      </footer>
    </article>
  );
}
```

❌ **DON'T**: Generic divs for everything
```typescript
// Bad: Div soup
function Article({ title, content }: ArticleProps) {
  return (
    <div>
      <div>
        <div>{title}</div>
      </div>
      <div>
        <div>{content}</div>
      </div>
    </div>
  );
}
```

### Provide ARIA Labels

✅ **DO**: Descriptive labels
```typescript
function SearchBar() {
  return (
    <form role="search">
      <label htmlFor="search-input">Search</label>
      <input
        id="search-input"
        type="search"
        aria-label="Search articles"
        placeholder="Search..."
      />
      <button type="submit" aria-label="Submit search">
        <SearchIcon />
      </button>
    </form>
  );
}
```

### Manage Focus

✅ **DO**: Focus management
```typescript
function Modal({ isOpen, onClose, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Save previously focused element
      const previouslyFocused = document.activeElement as HTMLElement;

      // Focus modal
      modalRef.current.focus();

      return () => {
        // Restore focus on close
        previouslyFocused?.focus();
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      {children}
    </div>
  );
}
```

### Support Keyboard Navigation

✅ **DO**: Keyboard accessible
```typescript
function Dropdown({ items, onSelect }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, items.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        onSelect(items[focusedIndex]);
        setIsOpen(false);
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  return (
    <div role="combobox" aria-expanded={isOpen} onKeyDown={handleKeyDown}>
      {/* Dropdown content */}
    </div>
  );
}
```

### Provide Text Alternatives

✅ **DO**: Alt text for images
```typescript
function Avatar({ user }: { user: User }) {
  return (
    <img
      src={user.avatarUrl}
      alt={`${user.name}'s profile picture`}
      loading="lazy"
    />
  );
}
```

---

## API Design Best Practices

### Use Consistent Naming

✅ **DO**: Consistent conventions
```typescript
// Good: Consistent naming
export interface ApiClient {
  getUser(id: string): Promise<User>;
  getUsers(filters?: UserFilters): Promise<User[]>;
  createUser(data: CreateUserData): Promise<User>;
  updateUser(id: string, data: UpdateUserData): Promise<User>;
  deleteUser(id: string): Promise<void>;
}
```

### Return Consistent Response Types

✅ **DO**: Consistent response format
```typescript
interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: number;
    requestId: string;
  };
}

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    timestamp: number;
    requestId: string;
  };
}
```

### Use Proper HTTP Methods

✅ **DO**: RESTful conventions
```typescript
// Good: Proper HTTP methods
const api = {
  // GET - Read data (idempotent)
  getUsers: () => fetch('/api/users'),

  // POST - Create new resource
  createUser: (data) => fetch('/api/users', { method: 'POST', body: JSON.stringify(data) }),

  // PUT - Replace resource (idempotent)
  updateUser: (id, data) => fetch(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // PATCH - Partial update
  patchUser: (id, data) => fetch(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // DELETE - Remove resource (idempotent)
  deleteUser: (id) => fetch(`/api/users/${id}`, { method: 'DELETE' }),
};
```

### Version Your APIs

✅ **DO**: API versioning
```typescript
// Good: Versioned API
const API_V1 = '/api/v1';
const API_V2 = '/api/v2';

export const apiClient = {
  v1: {
    getUsers: () => fetch(`${API_V1}/users`),
  },
  v2: {
    getUsers: (filters) => fetch(`${API_V2}/users`, {
      method: 'POST',
      body: JSON.stringify({ filters }),
    }),
  },
};
```

---

## Code Organization Best Practices

### Follow Feature-Based Structure

✅ **DO**: Organize by feature
```
src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   └── RegisterForm.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── store/
│   │   │   └── authStore.ts
│   │   └── utils/
│   │       └── validation.ts
│   ├── users/
│   └── reports/
└── shared/
    ├── components/
    ├── hooks/
    └── utils/
```

### Use Barrel Exports

✅ **DO**: Index files for clean imports
```typescript
// components/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { Select } from './Select';
export { Modal } from './Modal';

// Usage
import { Button, Input, Modal } from '@/components';
```

### Separate Business Logic from UI

✅ **DO**: Decouple logic
```typescript
// Good: Separated concerns

// hooks/useUserData.ts
export function useUserData(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId)
      .then(setUser)
      .finally(() => setLoading(false));
  }, [userId]);

  return { user, loading };
}

// components/UserProfile.tsx
export function UserProfile({ userId }: { userId: string }) {
  const { user, loading } = useUserData(userId);

  if (loading) return <Spinner />;
  if (!user) return <NotFound />;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

### Use Absolute Imports

✅ **DO**: Path aliases
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/hooks/*": ["src/hooks/*"],
      "@/lib/*": ["src/lib/*"]
    }
  }
}

// Good: Absolute imports
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';
```

❌ **DON'T**: Relative imports
```typescript
// Bad: Relative imports
import { Button } from '../../../components/Button';
import { useAuth } from '../../hooks/useAuth';
```

---

## Documentation Best Practices

### Write Clear JSDoc Comments

✅ **DO**: Comprehensive documentation
```typescript
/**
 * Fetches user data from the API with caching support
 *
 * @param userId - The unique identifier of the user
 * @param options - Optional configuration
 * @param options.cache - Whether to use cached data (default: true)
 * @param options.refresh - Force refresh even if cached (default: false)
 *
 * @returns Promise resolving to the user data
 *
 * @throws {NotFoundError} When user doesn't exist
 * @throws {NetworkError} When network request fails
 *
 * @example
 * ```typescript
 * const user = await fetchUser('123');
 * console.log(user.name);
 * ```
 *
 * @see {@link User} for the return type structure
 */
export async function fetchUser(
  userId: string,
  options: FetchUserOptions = {}
): Promise<User> {
  // Implementation
}
```

### Document Complex Logic

✅ **DO**: Explain why, not what
```typescript
// Good: Explains reasoning
// We use a debounce here because rapid filter changes can cause
// performance issues with large datasets. The 300ms delay provides
// a good balance between responsiveness and performance.
const debouncedSearch = useMemo(
  () => debounce(performSearch, 300),
  []
);
```

### Maintain a Changelog

✅ **DO**: Document changes
```markdown
# Changelog

## [2.0.0] - 2024-01-15

### Breaking Changes
- Removed deprecated `useOldAuth` hook
- Changed API response format for `/users` endpoint

### Added
- New `useAuth` hook with improved error handling
- Support for OAuth2 authentication
- Rate limiting for API calls

### Fixed
- Memory leak in `useWebSocket` hook
- Race condition in form submission
```

### Write README Files

✅ **DO**: README for each major module
```markdown
# Authentication Module

## Overview
Handles user authentication, session management, and authorization.

## Features
- JWT-based authentication
- Refresh token rotation
- RBAC integration
- CSRF protection

## Usage
\`\`\`typescript
import { useAuth } from '@/features/auth';

function MyComponent() {
  const { user, login, logout } = useAuth();
  // ...
}
\`\`\`

## API Reference
See [API.md](./API.md) for detailed API documentation.
```

---

## Git Workflow Best Practices

### Write Meaningful Commit Messages

✅ **DO**: Descriptive commits
```bash
# Good: Clear, actionable message
git commit -m "feat(auth): add password reset functionality

- Add forgot password form
- Implement email sending service
- Add reset token validation
- Update auth API with reset endpoint

Closes #123"
```

❌ **DON'T**: Vague messages
```bash
# Bad: Unclear what changed
git commit -m "fix stuff"
git commit -m "updates"
git commit -m "wip"
```

### Use Conventional Commits

✅ **DO**: Conventional commit format
```bash
# Format: <type>(<scope>): <subject>

# Types:
feat:     # New feature
fix:      # Bug fix
docs:     # Documentation only
style:    # Formatting, missing semi colons, etc
refactor: # Code change that neither fixes a bug nor adds a feature
perf:     # Performance improvement
test:     # Adding tests
chore:    # Maintenance

# Examples:
git commit -m "feat(api): add user search endpoint"
git commit -m "fix(auth): prevent token refresh race condition"
git commit -m "docs(readme): update installation instructions"
git commit -m "perf(list): virtualize long lists for better performance"
```

### Keep Commits Atomic

✅ **DO**: One logical change per commit
```bash
# Good: Separate commits
git commit -m "feat(api): add user endpoint"
git commit -m "test(api): add tests for user endpoint"
git commit -m "docs(api): document user endpoint"
```

❌ **DON'T**: Multiple unrelated changes
```bash
# Bad: Too many changes
git commit -m "add user endpoint, fix login bug, update docs, refactor store"
```

### Use Feature Branches

✅ **DO**: Branch naming conventions
```bash
# Format: <type>/<ticket>-<description>

# Examples:
git checkout -b feature/USER-123-add-search
git checkout -b fix/USER-456-login-bug
git checkout -b refactor/USER-789-api-client
git checkout -b docs/USER-101-api-guide
```

### Review Before Pushing

✅ **DO**: Pre-push checklist
```bash
# 1. Review your changes
git diff

# 2. Run tests
npm test

# 3. Run linter
npm run lint

# 4. Build
npm run build

# 5. Check for sensitive data
git diff --cached | grep -i "password\|token\|secret\|key"

# 6. Push
git push origin feature/my-branch
```

---

## Review Checklist

### Code Quality
- [ ] Code follows project style guide
- [ ] No console.log or debugging code
- [ ] No commented-out code
- [ ] Proper error handling
- [ ] No magic numbers or strings
- [ ] Functions are small and focused
- [ ] Complex logic is commented

### TypeScript
- [ ] No `any` types
- [ ] Proper type definitions
- [ ] Type guards where needed
- [ ] No type assertions (unless necessary)
- [ ] Interfaces over types where appropriate

### Performance
- [ ] No unnecessary re-renders
- [ ] Proper use of useMemo/useCallback
- [ ] Lists are virtualized if long
- [ ] Images are optimized
- [ ] No memory leaks
- [ ] Async operations are debounced/throttled

### Security
- [ ] No sensitive data in client code
- [ ] Input is validated and sanitized
- [ ] CSRF protection for mutations
- [ ] XSS prevention measures
- [ ] Using environment helpers
- [ ] Proper authentication checks

### Accessibility
- [ ] Semantic HTML elements
- [ ] ARIA labels where needed
- [ ] Keyboard navigation works
- [ ] Focus management is correct
- [ ] Color contrast is sufficient
- [ ] Screen reader tested

### Testing
- [ ] Unit tests for business logic
- [ ] Component tests for UI
- [ ] Integration tests for flows
- [ ] Edge cases covered
- [ ] Error states tested
- [ ] Tests are not brittle
- [ ] Coverage meets requirements

### Documentation
- [ ] JSDoc comments for public APIs
- [ ] README updated if needed
- [ ] Complex logic explained
- [ ] Breaking changes documented
- [ ] Examples provided

---

## When to Use X vs Y

### useState vs useReducer

**Use useState when:**
- Simple state (primitives, simple objects)
- Independent state updates
- No complex state transitions

**Use useReducer when:**
- Complex state logic
- Multiple related state values
- State transitions follow patterns
- Need to dispatch actions from deep components

### useEffect vs useLayoutEffect

**Use useEffect when:**
- Data fetching
- Subscriptions
- Most side effects
- DOM measurements (non-critical)

**Use useLayoutEffect when:**
- DOM measurements needed before paint
- Synchronous DOM updates
- Preventing flash of unstyled content
- Tooltip positioning

### Props vs Context

**Use Props when:**
- Data used by immediate children
- Explicit data flow preferred
- Component reusability important
- Performance critical

**Use Context when:**
- Global/shared state (theme, auth)
- Deep component trees
- Avoiding prop drilling
- Optional configuration

### Controlled vs Uncontrolled Components

**Use Controlled when:**
- Need to validate on every change
- Need to modify input before display
- Dynamic defaults
- Multiple inputs interact

**Use Uncontrolled when:**
- Simple forms
- Don't need instant validation
- Performance critical
- Integrating with non-React code

### Client State vs Server State

**Use Client State (Zustand) for:**
- UI state (modals, sidebar)
- User preferences
- Form state (temporary)
- Client-only data

**Use Server State (React Query) for:**
- API data
- Cached data
- Background updates
- Optimistic updates

### Memoization vs Not

**Use React.memo when:**
- Pure component
- Expensive rendering
- Re-renders frequently
- Props change infrequently

**Don't use React.memo when:**
- Props change frequently
- Component is already fast
- Premature optimization
- Props are primitives

### Keys: Index vs ID

**Use ID as key when:**
- Items have unique IDs
- List can be reordered
- Items can be added/removed
- Default choice

**Use Index as key when:**
- Static lists (never changes)
- No unique IDs available
- Items never reordered
- Last resort only

---

## See Also

- [Architecture Guide](./ARCHITECTURE.md) - System architecture patterns
- [Testing Guide](./TESTING.md) - Comprehensive testing strategies
- [Security Guide](./SECURITY.md) - Security best practices
- [Performance Guide](./PERFORMANCE.md) - Performance optimization
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions

---

## Contributing

Found a best practice we're missing? Please contribute!

1. Add your suggestion with examples
2. Explain the reasoning
3. Include both DO and DON'T examples
4. Submit a pull request

---

**Last Updated**: 2025-11-27
**Version**: 1.0.0
