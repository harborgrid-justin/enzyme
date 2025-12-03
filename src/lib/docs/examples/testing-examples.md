# Testing Examples

> 35+ practical testing examples for the Harbor React Library covering unit tests, integration tests, and E2E testing.

## Table of Contents

- [Component Testing Basics](#component-testing-basics)
- [Hook Testing](#hook-testing)
- [Testing with React Query](#testing-with-react-query)
- [Testing State Management](#testing-state-management)
- [Testing Routing](#testing-routing)
- [Testing Authentication](#testing-authentication)
- [Testing Forms](#testing-forms)
- [Async Testing](#async-testing)
- [Testing Error Boundaries](#testing-error-boundaries)
- [Mocking](#mocking)
- [Integration Tests](#integration-tests)
- [E2E Testing with Playwright](#e2e-testing-with-playwright)
- [Best Practices](#best-practices)
- [Anti-Patterns](#anti-patterns)

---

## Component Testing Basics

### Example 1: Simple Component Test

**Use Case:** Test basic rendering and props
**Difficulty:** ⭐ Basic

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('renders with variant', () => {
    render(<Button variant="primary">Submit</Button>);

    const button = screen.getByRole('button', { name: /submit/i });
    expect(button).toHaveClass('btn-primary');
  });

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

**Explanation:** Basic component tests verify rendering, props application, and DOM attributes.

**See Also:**

- [Example 2](#example-2-testing-user-interactions)
- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)

---

### Example 2: Testing User Interactions

**Use Case:** Test click handlers and user events
**Difficulty:** ⭐ Basic

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Counter } from './Counter';

describe('Counter', () => {
  it('increments count on button click', async () => {
    const user = userEvent.setup();
    render(<Counter />);

    const button = screen.getByRole('button', { name: /increment/i });
    expect(screen.getByText(/count: 0/i)).toBeInTheDocument();

    await user.click(button);
    expect(screen.getByText(/count: 1/i)).toBeInTheDocument();

    await user.click(button);
    expect(screen.getByText(/count: 2/i)).toBeInTheDocument();
  });

  it('calls onClick handler', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Click</Button>);

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

**Explanation:** Use `userEvent` for realistic user interactions like clicks, typing, and keyboard events.

---

### Example 3: Testing Conditional Rendering

**Use Case:** Verify components show/hide based on state
**Difficulty:** ⭐ Basic

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Modal', () => {
  it('is hidden by default', () => {
    render(<Modal />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows when open prop is true', () => {
    render(<Modal open />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('hides when close button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(<Modal open onClose={handleClose} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(handleClose).toHaveBeenCalled();
  });
});
```

**Explanation:** Use `queryBy` for elements that may not exist. Test both presence and absence.

---

### Example 4: Testing Lists

**Use Case:** Verify list rendering and filtering
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { render, screen, within } from '@testing-library/react';

const mockUsers = [
  { id: 1, name: 'Alice', active: true },
  { id: 2, name: 'Bob', active: false },
  { id: 3, name: 'Charlie', active: true },
];

describe('UserList', () => {
  it('renders all users', () => {
    render(<UserList users={mockUsers} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('filters active users', () => {
    render(<UserList users={mockUsers} filter="active" />);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('shows empty state when no users', () => {
    render(<UserList users={[]} />);

    expect(screen.getByText(/no users found/i)).toBeInTheDocument();
  });
});
```

**Explanation:** Test list rendering, filtering logic, and empty states.

---

## Hook Testing

### Example 5: Testing Custom Hooks

**Use Case:** Test hook logic in isolation
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('initializes with default value', () => {
    const { result } = renderHook(() => useCounter());

    expect(result.current.count).toBe(0);
  });

  it('initializes with custom value', () => {
    const { result } = renderHook(() => useCounter(10));

    expect(result.current.count).toBe(10);
  });

  it('increments count', () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('decrements count', () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(4);
  });
});
```

**Explanation:** Use `renderHook` to test hooks in isolation. Wrap state updates in `act()`.

---

### Example 6: Testing Hooks with Dependencies

**Use Case:** Test hook updates when deps change
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { renderHook } from '@testing-library/react';
import { useEffect, useState } from 'react';

function useFetch(url: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      });
  }, [url]);

  return { data, loading };
}

describe('useFetch', () => {
  it('refetches when URL changes', async () => {
    const { result, rerender } = renderHook(
      ({ url }) => useFetch(url),
      { initialProps: { url: '/api/users' } }
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Change URL
    rerender({ url: '/api/posts' });

    expect(result.current.loading).toBe(true);
  });
});
```

**Explanation:** Use `rerender` to test hook behavior when props/deps change.

---

## Testing with React Query

### Example 7: Testing Query Hooks

**Use Case:** Test components using React Query
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }, // Disable retries in tests
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('UserProfile', () => {
  it('shows loading state', () => {
    render(<UserProfile userId="1" />, { wrapper: createWrapper() });

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('displays user data when loaded', async () => {
    server.use(
      rest.get('/api/users/1', (req, res, ctx) => {
        return res(ctx.json({ id: '1', name: 'John Doe' }));
      })
    );

    render(<UserProfile userId="1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('shows error state on failure', async () => {
    server.use(
      rest.get('/api/users/1', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    render(<UserProfile userId="1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

**Explanation:** Wrap components with QueryClientProvider. Use MSW for API mocking.

---

### Example 8: Testing Mutations

**Use Case:** Test mutation hooks and optimistic updates
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { rest } from 'msw';

const createQueryWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useUpdateUser', () => {
  it('updates user successfully', async () => {
    server.use(
      rest.patch('/api/users/1', async (req, res, ctx) => {
        const body = await req.json();
        return res(ctx.json({ id: '1', ...body }));
      })
    );

    const { result } = renderHook(() => useUpdateUser(), {
      wrapper: createQueryWrapper(),
    });

    act(() => {
      result.current.mutate({ id: '1', name: 'Jane Doe' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ id: '1', name: 'Jane Doe' });
  });

  it('handles mutation errors', async () => {
    server.use(
      rest.patch('/api/users/1', (req, res, ctx) => {
        return res(ctx.status(400), ctx.json({ error: 'Validation failed' }));
      })
    );

    const { result } = renderHook(() => useUpdateUser(), {
      wrapper: createQueryWrapper(),
    });

    act(() => {
      result.current.mutate({ id: '1', name: '' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
```

**Explanation:** Test mutations including success, error, and loading states.

---

## Testing State Management

### Example 9: Testing Zustand Stores

**Use Case:** Test store actions and state
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { renderHook, act } from '@testing-library/react';
import { create } from 'zustand';

describe('useCounterStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { getState, setState } = useCounterStore;
    setState({ count: 0 });
  });

  it('increments count', () => {
    const { result } = renderHook(() => useCounterStore());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('resets count', () => {
    const { result } = renderHook(() => useCounterStore());

    act(() => {
      result.current.increment();
      result.current.increment();
      result.current.reset();
    });

    expect(result.current.count).toBe(0);
  });
});
```

**Explanation:** Reset Zustand store state before each test for isolation.

---

### Example 10: Testing Store Slices

**Use Case:** Test individual store slices
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { createUserSlice } from './slices/userSlice';

describe('userSlice', () => {
  it('sets user', () => {
    const set = vi.fn();
    const get = vi.fn();
    const slice = createUserSlice(set, get, { setState: set, getState: get });

    const user = { id: '1', name: 'John' };
    slice.setUser(user);

    expect(set).toHaveBeenCalledWith({ user });
  });

  it('clears user on logout', () => {
    const set = vi.fn();
    const get = vi.fn();
    const slice = createUserSlice(set, get, { setState: set, getState: get });

    slice.logout();

    expect(set).toHaveBeenCalledWith({ user: null });
  });
});
```

**Explanation:** Test slice creators directly by mocking `set` and `get`.

---

## Testing Routing

### Example 11: Testing Navigation

**Use Case:** Test programmatic navigation
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

describe('Navigation', () => {
  it('navigates to user page on click', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    await user.click(screen.getByText(/view profile/i));

    expect(screen.getByText(/user profile/i)).toBeInTheDocument();
  });
});
```

**Explanation:** Use `MemoryRouter` for testing routing without browser history.

---

### Example 12: Testing Protected Routes

**Use Case:** Test authentication guards
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

describe('Protected Routes', () => {
  it('redirects to login when not authenticated', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>,
      { wrapper: createAuthWrapper({ isAuthenticated: false }) }
    );

    expect(screen.getByText(/login/i)).toBeInTheDocument();
  });

  it('shows dashboard when authenticated', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>,
      { wrapper: createAuthWrapper({ isAuthenticated: true }) }
    );

    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
  });
});
```

**Explanation:** Test route guards by mocking authentication state.

---

## Testing Authentication

### Example 13: Testing Login Flow

**Use Case:** Complete login interaction test
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('LoginForm', () => {
  it('logs in user successfully', async () => {
    const user = userEvent.setup();
    const handleLogin = vi.fn().mockResolvedValue({ success: true });

    render(<LoginForm onLogin={handleLogin} />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(handleLogin).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
    });
  });

  it('shows validation errors', async () => {
    const user = userEvent.setup();

    render(<LoginForm />);

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });

  it('disables button while loading', async () => {
    const user = userEvent.setup();
    const handleLogin = vi.fn(() => new Promise(() => {})); // Never resolves

    render(<LoginForm onLogin={handleLogin} />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

**Explanation:** Test complete user flows including validation and loading states.

---

## Testing Forms

### Example 14: Testing Form Validation

**Use Case:** Validate form inputs
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('RegistrationForm', () => {
  it('validates email format', async () => {
    const user = userEvent.setup();

    render(<RegistrationForm />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');
    await user.tab(); // Trigger blur

    expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
  });

  it('validates password strength', async () => {
    const user = userEvent.setup();

    render(<RegistrationForm />);

    await user.type(screen.getByLabelText(/password/i), '123');
    await user.tab();

    expect(screen.getByText(/password must be at least 8 characters/i))
      .toBeInTheDocument();
  });

  it('validates password confirmation match', async () => {
    const user = userEvent.setup();

    render(<RegistrationForm />);

    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'different');
    await user.tab();

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });
});
```

**Explanation:** Test validation rules, error messages, and user feedback.

---

### Example 15: Testing Form Submission

**Use Case:** Test successful and failed submissions
**Difficulty:** ⭐⭐ Intermediate

```tsx
describe('ContactForm', () => {
  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(<ContactForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/message/i), 'Hello there');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello there',
      });
    });
  });

  it('shows server error on submission failure', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn().mockRejectedValue(new Error('Server error'));

    render(<ContactForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText(/name/i), 'John');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument();
    });
  });
});
```

**Explanation:** Test both success and error paths for form submission.

---

## Async Testing

### Example 16: Testing Loading States

**Use Case:** Verify loading indicators
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { render, screen, waitFor } from '@testing-library/react';

describe('UserList', () => {
  it('shows loading spinner initially', () => {
    server.use(
      rest.get('/api/users', async (req, res, ctx) => {
        await delay(1000);
        return res(ctx.json([]));
      })
    );

    render(<UserList />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('hides loading spinner after data loads', async () => {
    server.use(
      rest.get('/api/users', (req, res, ctx) => {
        return res(ctx.json([{ id: 1, name: 'John' }]));
      })
    );

    render(<UserList />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });
});
```

**Explanation:** Test loading states with delayed responses.

---

### Example 17: Testing Debounced Functions

**Use Case:** Test debounced search input
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('SearchInput', () => {
  it('debounces search requests', async () => {
    const user = userEvent.setup();
    const handleSearch = vi.fn();

    render(<SearchInput onSearch={handleSearch} debounceMs={300} />);

    const input = screen.getByRole('textbox');

    // Type quickly
    await user.type(input, 'test');

    // Should not call immediately
    expect(handleSearch).not.toHaveBeenCalled();

    // Should call after debounce delay
    await waitFor(
      () => {
        expect(handleSearch).toHaveBeenCalledWith('test');
      },
      { timeout: 500 }
    );

    // Should only call once despite 4 keystrokes
    expect(handleSearch).toHaveBeenCalledTimes(1);
  });
});
```

**Explanation:** Use `waitFor` with timeout to test debounced behavior.

---

### Example 18: Testing Race Conditions

**Use Case:** Ensure correct data with rapid updates
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
describe('UserProfile', () => {
  it('shows data for latest user ID', async () => {
    const { rerender } = render(<UserProfile userId="1" />);

    // Start loading user 1
    await waitFor(() => {
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    // Quickly change to user 2 (simulate race condition)
    rerender(<UserProfile userId="2" />);

    // Should show user 2 data, not user 1
    await waitFor(() => {
      expect(screen.getByText(/user 2/i)).toBeInTheDocument();
      expect(screen.queryByText(/user 1/i)).not.toBeInTheDocument();
    });
  });
});
```

**Explanation:** Test that components handle rapid prop changes correctly.

---

## Testing Error Boundaries

### Example 19: Testing Error Boundary

**Use Case:** Verify error boundary catches errors
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { render, screen } from '@testing-library/react';

const ThrowError = () => {
  throw new Error('Test error');
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('catches errors and shows fallback UI', () => {
    render(
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary fallback={<div>Error</div>}>
        <div>Success</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.queryByText('Error')).not.toBeInTheDocument();
  });
});
```

**Explanation:** Test error boundaries by throwing errors in child components.

---

## Mocking

### Example 20: Mocking API Calls with MSW

**Use Case:** Mock HTTP requests
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/users', (req, res, ctx) => {
    return res(
      ctx.json([
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Jane Smith' },
      ])
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('UserList', () => {
  it('fetches and displays users', async () => {
    render(<UserList />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('handles API errors', async () => {
    server.use(
      rest.get('/api/users', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    render(<UserList />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

**Explanation:** MSW intercepts HTTP requests at network level for realistic mocking.

---

### Example 21: Mocking Modules

**Use Case:** Mock external dependencies
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { vi } from 'vitest';

// Mock the entire module
vi.mock('./api/userService', () => ({
  fetchUsers: vi.fn(),
  createUser: vi.fn(),
}));

import { fetchUsers } from './api/userService';

describe('UserManager', () => {
  it('loads users on mount', async () => {
    const mockUsers = [{ id: 1, name: 'John' }];
    vi.mocked(fetchUsers).mockResolvedValue(mockUsers);

    render(<UserManager />);

    await waitFor(() => {
      expect(fetchUsers).toHaveBeenCalled();
      expect(screen.getByText('John')).toBeInTheDocument();
    });
  });
});
```

**Explanation:** Use `vi.mock` to replace entire modules with test doubles.

---

### Example 22: Mocking Timers

**Use Case:** Test time-dependent code
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { vi } from 'vitest';

describe('AutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('auto-saves after 5 seconds', () => {
    const handleSave = vi.fn();
    render(<Editor onSave={handleSave} autoSaveDelay={5000} />);

    expect(handleSave).not.toHaveBeenCalled();

    // Fast-forward 5 seconds
    vi.advanceTimersByTime(5000);

    expect(handleSave).toHaveBeenCalled();
  });
});
```

**Explanation:** Fake timers allow fast-forwarding time in tests.

---

### Example 23: Mocking Date

**Use Case:** Test date-dependent logic
**Difficulty:** ⭐⭐ Intermediate

```tsx
describe('DateDisplay', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays current date', () => {
    render(<DateDisplay />);

    expect(screen.getByText(/january 15, 2024/i)).toBeInTheDocument();
  });

  it('shows if date is in the past', () => {
    render(<DateDisplay date="2024-01-10" />);

    expect(screen.getByText(/5 days ago/i)).toBeInTheDocument();
  });
});
```

**Explanation:** Mock system time for consistent date-based tests.

---

## Integration Tests

### Example 24: Full User Flow Test

**Use Case:** Test complete feature workflow
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
describe('Todo App Integration', () => {
  it('completes full todo workflow', async () => {
    const user = userEvent.setup();

    render(<TodoApp />);

    // Add a todo
    const input = screen.getByPlaceholderText(/add todo/i);
    await user.type(input, 'Buy groceries');
    await user.keyboard('{Enter}');

    // Verify todo appears
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();

    // Mark as complete
    const checkbox = screen.getByRole('checkbox', { name: /buy groceries/i });
    await user.click(checkbox);

    // Verify completed state
    expect(checkbox).toBeChecked();
    expect(screen.getByText('Buy groceries')).toHaveStyle({
      textDecoration: 'line-through',
    });

    // Delete todo
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    // Verify todo removed
    expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument();
  });
});
```

**Explanation:** Integration tests verify multiple components working together.

---

### Example 25: Multi-Step Form Test

**Use Case:** Test wizard/multi-step forms
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
describe('Registration Wizard', () => {
  it('completes registration process', async () => {
    const user = userEvent.setup();
    const handleComplete = vi.fn();

    render(<RegistrationWizard onComplete={handleComplete} />);

    // Step 1: Account Info
    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 2: Profile Info
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 3: Review
    expect(screen.getByText(/user@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/john doe/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /submit/i }));

    // Verify completion
    await waitFor(() => {
      expect(handleComplete).toHaveBeenCalledWith({
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });
    });
  });
});
```

**Explanation:** Test multi-step processes from start to finish.

---

## E2E Testing with Playwright

### Example 26: Basic E2E Test

**Use Case:** End-to-end browser test
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('user can log in successfully', async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    // Fill login form
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL('**/dashboard');

    // Verify logged in
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toContainText('user@example.com');
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    // Error message should appear
    await expect(page.locator('.error-message')).toContainText('Invalid credentials');
  });
});
```

**Explanation:** Playwright tests run in real browsers for true E2E validation.

---

### Example 27: Testing Forms E2E

**Use Case:** Complete form interaction
**Difficulty:** ⭐⭐ Intermediate

```tsx
test('create new post', async ({ page }) => {
  await page.goto('http://localhost:3000/posts/new');

  // Fill form
  await page.fill('input[name="title"]', 'My New Post');
  await page.fill('textarea[name="content"]', 'This is the post content.');
  await page.selectOption('select[name="category"]', 'technology');

  // Upload image
  await page.setInputFiles('input[type="file"]', './test-image.jpg');

  // Submit
  await page.click('button[type="submit"]');

  // Verify redirect and success
  await page.waitForURL('**/posts/*');
  await expect(page.locator('h1')).toContainText('My New Post');
  await expect(page.locator('.post-content')).toContainText('This is the post content.');
});
```

**Explanation:** Test complex forms including file uploads.

---

### Example 28: Testing Navigation E2E

**Use Case:** Multi-page navigation flow
**Difficulty:** ⭐⭐ Intermediate

```tsx
test('navigate through app', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Home page
  await expect(page).toHaveTitle(/home/i);

  // Navigate to products
  await page.click('a[href="/products"]');
  await expect(page).toHaveURL(/.*products/);
  await expect(page.locator('h1')).toContainText('Products');

  // Click first product
  await page.click('.product-card:first-child');
  await expect(page.locator('.product-detail')).toBeVisible();

  // Go back
  await page.goBack();
  await expect(page.locator('h1')).toContainText('Products');
});
```

**Explanation:** Test navigation flows and browser history.

---

### Example 29: Testing Authentication E2E

**Use Case:** Full auth flow with persistence
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
test.describe('Authentication E2E', () => {
  test('persists session across page reloads', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');

    // Reload page
    await page.reload();

    // Should still be logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('logout clears session', async ({ page }) => {
    // Assume already logged in via beforeEach
    await page.goto('http://localhost:3000/dashboard');

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('button:has-text("Logout")');

    // Should redirect to login
    await page.waitForURL('**/login');

    // Try to access protected page
    await page.goto('http://localhost:3000/dashboard');

    // Should redirect back to login
    await expect(page).toHaveURL(/.*login/);
  });
});
```

**Explanation:** Test auth persistence and session management.

---

### Example 30: Mobile Testing

**Use Case:** Test responsive behavior
**Difficulty:** ⭐⭐ Intermediate

```tsx
test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('shows mobile menu', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Desktop menu should be hidden
    await expect(page.locator('nav.desktop-menu')).not.toBeVisible();

    // Mobile menu button should be visible
    const menuButton = page.locator('button[aria-label="Menu"]');
    await expect(menuButton).toBeVisible();

    // Open menu
    await menuButton.click();

    // Mobile menu should appear
    await expect(page.locator('nav.mobile-menu')).toBeVisible();
  });
});
```

**Explanation:** Test responsive designs with different viewports.

---

### Example 31: Visual Regression Testing

**Use Case:** Detect visual changes
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
test('homepage visual regression', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Take screenshot and compare
  await expect(page).toHaveScreenshot('homepage.png', {
    fullPage: true,
    animations: 'disabled',
  });
});

test('modal visual regression', async ({ page }) => {
  await page.goto('http://localhost:3000');

  await page.click('button:has-text("Open Modal")');

  const modal = page.locator('[role="dialog"]');
  await expect(modal).toBeVisible();

  // Screenshot just the modal
  await expect(modal).toHaveScreenshot('modal.png');
});
```

**Explanation:** Visual regression tests catch unintended UI changes.

---

### Example 32: Performance Testing

**Use Case:** Measure page performance
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
test('page loads within performance budget', async ({ page }) => {
  const navigationPromise = page.goto('http://localhost:3000');

  // Wait for load event
  await page.waitForLoadState('load');

  // Get performance metrics
  const performanceTiming = JSON.parse(
    await page.evaluate(() => JSON.stringify(window.performance.timing))
  );

  const loadTime = performanceTiming.loadEventEnd - performanceTiming.navigationStart;

  // Assert load time under 3 seconds
  expect(loadTime).toBeLessThan(3000);

  // Check specific metrics
  const paintEntries = await page.evaluate(() => {
    return JSON.stringify(performance.getEntriesByType('paint'));
  });

  console.log('Paint metrics:', paintEntries);
});
```

**Explanation:** Test performance metrics to ensure fast page loads.

---

### Example 33: Testing WebSocket Connections

**Use Case:** Test real-time features
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
test('receives real-time updates', async ({ page }) => {
  await page.goto('http://localhost:3000/chat');

  // Wait for WebSocket connection
  await page.waitForFunction(() => {
    return (window as any).wsConnected === true;
  });

  // Send message
  await page.fill('input[name="message"]', 'Hello World');
  await page.click('button:has-text("Send")');

  // Message should appear
  await expect(page.locator('.message:last-child')).toContainText('Hello World');

  // Simulate message from another user (via test WebSocket)
  await page.evaluate(() => {
    (window as any).receiveMessage({
      user: 'Other User',
      text: 'Hi there!',
    });
  });

  // New message should appear
  await expect(page.locator('.message:last-child')).toContainText('Hi there!');
});
```

**Explanation:** Test WebSocket connections and real-time data flows.

---

### Example 34: Accessibility Testing

**Use Case:** Verify accessibility standards
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage has no accessibility violations', async ({ page }) => {
  await page.goto('http://localhost:3000');

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});

test('modal is keyboard accessible', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Tab to open button
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');

  // Open modal with Enter
  await page.keyboard.press('Enter');

  // Modal should be visible
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  // Focus should be trapped in modal
  await page.keyboard.press('Tab');
  const focusedElement = await page.locator(':focus');

  // Verify focus is within modal
  const isInModal = await focusedElement.evaluate((el) => {
    return el.closest('[role="dialog"]') !== null;
  });

  expect(isInModal).toBe(true);

  // Close with Escape
  await page.keyboard.press('Escape');
  await expect(page.locator('[role="dialog"]')).not.toBeVisible();
});
```

**Explanation:** Test accessibility with axe-core and keyboard navigation.

---

### Example 35: Testing File Downloads

**Use Case:** Verify file download functionality
**Difficulty:** ⭐⭐ Intermediate

```tsx
test('downloads report file', async ({ page }) => {
  await page.goto('http://localhost:3000/reports');

  // Start waiting for download before clicking
  const downloadPromise = page.waitForEvent('download');

  await page.click('button:has-text("Download Report")');

  const download = await downloadPromise;

  // Verify filename
  expect(download.suggestedFilename()).toBe('report.pdf');

  // Save and verify file exists
  const path = await download.path();
  expect(path).toBeTruthy();

  // Optionally verify file size
  const fs = require('fs');
  const stats = fs.statSync(path);
  expect(stats.size).toBeGreaterThan(0);
});
```

**Explanation:** Test file downloads and verify downloaded content.

---

## Best Practices

### Testing Strategy

- ✅ **DO** write tests alongside code (TDD when beneficial)
- ✅ **DO** test user behavior, not implementation
- ✅ **DO** use descriptive test names
- ✅ **DO** follow AAA pattern (Arrange, Act, Assert)
- ❌ **DON'T** test implementation details
- ❌ **DON'T** write tests that depend on each other

### Test Organization

- ✅ **DO** group related tests with `describe`
- ✅ **DO** use `beforeEach`/`afterEach` for setup/cleanup
- ✅ **DO** keep tests focused and simple
- ✅ **DO** isolate tests from each other
- ❌ **DON'T** share state between tests
- ❌ **DON'T** write overly complex tests

### Queries and Assertions

- ✅ **DO** use semantic queries (`getByRole`, `getByLabelText`)
- ✅ **DO** use `waitFor` for async assertions
- ✅ **DO** test loading and error states
- ✅ **DO** prefer `userEvent` over `fireEvent`
- ❌ **DON'T** use `getByTestId` as first choice
- ❌ **DON'T** rely on implementation details (CSS classes, etc.)

### Mocking

- ✅ **DO** use MSW for API mocking
- ✅ **DO** mock external services
- ✅ **DO** reset mocks between tests
- ✅ **DO** mock at appropriate boundaries
- ❌ **DON'T** over-mock (reduces test value)
- ❌ **DON'T** forget to restore mocks

### E2E Tests

- ✅ **DO** test critical user journeys
- ✅ **DO** run E2E tests in CI/CD
- ✅ **DO** use page object pattern for complex flows
- ✅ **DO** test on multiple browsers
- ❌ **DON'T** rely solely on E2E tests (slow, brittle)
- ❌ **DON'T** test every edge case with E2E

---

## Anti-Patterns

### ❌ Testing Implementation Details

```tsx
// BAD - Testing internal state
expect(component.state.count).toBe(1);

// GOOD - Testing visible behavior
expect(screen.getByText('Count: 1')).toBeInTheDocument();
```

### ❌ Using Test IDs Unnecessarily

```tsx
// BAD
<button data-testid="submit-button">Submit</button>
screen.getByTestId('submit-button');

// GOOD
<button type="submit">Submit</button>
screen.getByRole('button', { name: /submit/i });
```

### ❌ Not Cleaning Up

```tsx
// BAD - Timers leak to other tests
test('auto saves', () => {
  vi.useFakeTimers();
  // ... test
  // Missing: vi.restoreAllMocks()
});

// GOOD
afterEach(() => {
  vi.restoreAllMocks();
});
```

### ❌ Shared Test State

```tsx
// BAD
let user;
beforeEach(() => {
  user = { id: 1 }; // Shared reference
});

test('test 1', () => {
  user.name = 'John'; // Mutates shared state
});

// GOOD
const createUser = () => ({ id: 1 }); // Factory function

test('test 1', () => {
  const user = createUser(); // Fresh instance
});
```

---

## See Also

- [Testing Library Documentation](https://testing-library.com/) - Comprehensive testing guides
- [Vitest Documentation](https://vitest.dev/) - Test runner docs
- [Playwright Documentation](https://playwright.dev/) - E2E testing guide
- [MSW Documentation](https://mswjs.io/) - API mocking library
- [Testing Guide](../TESTING.md) - Complete testing documentation
- [Documentation Index](../INDEX.md) - All documentation resources
