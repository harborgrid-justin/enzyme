# Testing Guide

> **Scope**: This document covers testing strategies for the Harbor React Template.
> It includes unit, integration, and E2E testing patterns with Vitest, React Testing Library, and Playwright.

---

## Table of Contents

- [Overview](#overview)
- [Test Setup](#test-setup)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [E2E Testing](#e2e-testing)
- [Testing Patterns](#testing-patterns)
- [Mocking Strategies](#mocking-strategies)
- [Coverage Requirements](#coverage-requirements)

## Overview

The Harbor React Template uses a multi-layered testing strategy:

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit Tests | Vitest + React Testing Library | Component and hook isolation |
| Integration Tests | Vitest + MSW | API integration and data flow |
| E2E Tests | Playwright | Full user journey validation |

## Test Setup

### Installation

Dependencies are included in the template. Ensure they're installed:

```bash
npm install
```

### Configuration Files

- `vitest.config.ts` - Unit/integration test configuration
- `playwright.config.ts` - E2E test configuration
- `src/test/setup.ts` - Test environment setup

### Running Tests

```bash
# Unit and integration tests
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage report
npm run test:ui            # Vitest UI

# E2E tests
npm run test:e2e           # Run Playwright tests
npm run test:e2e:ui        # With Playwright UI
npm run test:e2e:debug     # Debug mode
```

## Unit Testing

### Component Testing

```tsx
import { render, screen, fireEvent } from '@/test/utils';
import { Button } from '@/lib/ui';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    await fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Hook Testing

```tsx
import { renderHook, act } from '@testing-library/react';
import { useCounter } from '@/hooks/useCounter';

describe('useCounter', () => {
  it('initializes with default value', () => {
    const { result } = renderHook(() => useCounter(0));
    expect(result.current.count).toBe(0);
  });

  it('increments count', () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });
});
```

### Testing with Providers

```tsx
import { render } from '@/test/utils';
import { ThemeProvider } from '@/lib/theme';
import { MyComponent } from './MyComponent';

// Custom render with providers
const customRender = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {ui}
    </ThemeProvider>
  );
};

describe('MyComponent', () => {
  it('renders with theme context', () => {
    customRender(<MyComponent />);
    // assertions...
  });
});
```

## Integration Testing

### API Integration with MSW

```tsx
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { render, screen, waitFor } from '@/test/utils';
import { UserList } from './UserList';

describe('UserList', () => {
  it('displays users from API', async () => {
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.json([
          { id: 1, name: 'John Doe' },
          { id: 2, name: 'Jane Smith' },
        ]);
      })
    );

    render(<UserList />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.json(
          { error: 'Server error' },
          { status: 500 }
        );
      })
    );

    render(<UserList />);

    await waitFor(() => {
      expect(screen.getByText(/error loading users/i)).toBeInTheDocument();
    });
  });
});
```

### State Management Testing

```tsx
import { renderHook, act } from '@testing-library/react';
import { useStore } from '@/lib/state';

describe('Store', () => {
  beforeEach(() => {
    // Reset store state between tests
    useStore.setState({ count: 0 });
  });

  it('updates state correctly', () => {
    const { result } = renderHook(() =>
      useStore((state) => ({
        count: state.count,
        increment: state.increment,
      }))
    );

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });
});
```

## E2E Testing

### Page Object Pattern

```typescript
// src/test/e2e/pages/LoginPage.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: /sign in/i });
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

### E2E Test Example

```typescript
// src/test/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

test.describe('Authentication', () => {
  test('successful login redirects to dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.login('user@example.com', 'password123');

    await expect(page).toHaveURL('/dashboard');
    await expect(dashboardPage.welcomeMessage).toBeVisible();
  });

  test('invalid credentials show error', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login('invalid@example.com', 'wrongpassword');

    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });
});
```

## Testing Patterns

### Testing Async Operations

```tsx
import { render, screen, waitFor } from '@/test/utils';

test('async data loading', async () => {
  render(<AsyncComponent />);

  // Wait for loading state to disappear
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  // Assert final state
  expect(screen.getByText('Data loaded')).toBeInTheDocument();
});
```

### Testing Error Boundaries

```tsx
import { render, screen } from '@/test/utils';
import { ErrorBoundary } from '@/lib/monitoring';

const ThrowError = () => {
  throw new Error('Test error');
};

test('error boundary catches errors', () => {
  // Suppress console.error for this test
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  render(
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(screen.getByText('Something went wrong')).toBeInTheDocument();

  consoleSpy.mockRestore();
});
```

### Testing Accessibility

```tsx
import { render } from '@/test/utils';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('component has no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Mocking Strategies

### Mocking Modules

```tsx
// Mock entire module
vi.mock('@/lib/api', () => ({
  fetchUsers: vi.fn().mockResolvedValue([]),
}));

// Mock specific export
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual('@/lib/auth');
  return {
    ...actual,
    useAuth: () => ({ isAuthenticated: true, user: mockUser }),
  };
});
```

### Mocking Environment

```tsx
// Mock environment variables
vi.stubEnv('VITE_API_URL', 'https://test-api.example.com');

// Mock window methods
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});
```

### MSW Handlers

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'John Doe' },
    ]);
  }),

  http.post('/api/login', async ({ request }) => {
    const body = await request.json();
    if (body.email === 'valid@example.com') {
      return HttpResponse.json({ token: 'mock-token' });
    }
    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }),
];
```

## Coverage Requirements

### Minimum Coverage Thresholds

| Metric | Threshold |
|--------|-----------|
| Statements | 80% |
| Branches | 75% |
| Functions | 80% |
| Lines | 80% |

### Viewing Coverage

```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory:
- `coverage/lcov-report/index.html` - HTML report
- `coverage/lcov.info` - LCOV format for CI

### CI Integration

```yaml
# Example GitHub Actions workflow
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
    - run: npm ci
    - run: npm run test:coverage
    - uses: codecov/codecov-action@v3
      with:
        files: ./coverage/lcov.info
```

## Best Practices

1. **Test behavior, not implementation** - Focus on what users see and do
2. **Use semantic queries** - Prefer `getByRole`, `getByLabelText` over `getByTestId`
3. **Avoid testing framework internals** - Don't test React or library code
4. **Keep tests isolated** - Each test should be independent
5. **Use realistic data** - Test with data that resembles production
6. **Test error states** - Don't just test the happy path
7. **Maintain test readability** - Tests are documentation

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - System architecture overview
- [Components Reference](./COMPONENTS_REFERENCE.md) - Component API documentation
- [Hooks Reference](./HOOKS_REFERENCE.md) - Custom hooks documentation
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment and CI/CD
- [Environment Setup](./ENVIRONMENT.md) - Environment configuration
- [API Documentation](./API.md) - API layer and data fetching
