# Navigation Components

> Type-safe navigation components and hooks for React Router

## Overview

The navigation module provides type-safe components and hooks for navigating between routes. It builds on React Router's navigation APIs with enhanced type safety and additional features like prefetching and breadcrumbs.

## Features

- **Type-Safe Links**: Compile-time parameter validation
- **Prefetching**: Automatic route and data prefetching
- **Breadcrumbs**: Automatic breadcrumb generation
- **Navigation Hooks**: Programmatic navigation with type safety
- **Active Route Detection**: Highlight active navigation items
- **External Links**: Smart handling of external URLs

## Installation

```typescript
import {
  AppLink,
  useTypedNavigate,
  useBreadcrumbs,
  useActiveRoute,
  ExternalLink,
} from '@/lib/routing';
```

## AppLink Component

Type-safe link component with prefetching support.

### Basic Usage

```typescript
import { AppLink } from '@/lib/routing';

function Navigation() {
  return (
    <nav>
      <AppLink to="/">Home</AppLink>
      <AppLink to="/about">About</AppLink>
      <AppLink to="/users/:id" params={{ id: '123' }}>
        User Profile
      </AppLink>
    </nav>
  );
}
```

### With Query Parameters

```typescript
<AppLink
  to="/search"
  query={{ q: 'react', filter: 'recent' }}
>
  Search Results
</AppLink>
// Navigates to: /search?q=react&filter=recent
```

### With Prefetching

```typescript
<AppLink
  to="/users/:id"
  params={{ id: '123' }}
  prefetch={true}
  prefetchDelay={100}
>
  User Profile
</AppLink>
// Prefetches route and data on hover
```

### Active Link Styling

```typescript
<AppLink
  to="/dashboard"
  className="nav-link"
  activeClassName="active"
  activeStyle={{ fontWeight: 'bold' }}
>
  Dashboard
</AppLink>
```

### Props

```typescript
interface AppLinkProps<TPath extends string> {
  to: TPath;
  params?: RouteParams<TPath>;
  query?: Record<string, string | undefined>;
  hash?: string;
  state?: unknown;
  replace?: boolean;
  prefetch?: boolean;
  prefetchDelay?: number;
  className?: string;
  activeClassName?: string;
  style?: React.CSSProperties;
  activeStyle?: React.CSSProperties;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent) => void;
}
```

### Examples

```typescript
// Simple link
<AppLink to="/about">About Us</AppLink>

// Dynamic route with parameters
<AppLink
  to="/users/:id"
  params={{ id: user.id }}
>
  {user.name}
</AppLink>

// With query and hash
<AppLink
  to="/docs/:section"
  params={{ section: 'api' }}
  query={{ version: 'v2' }}
  hash="introduction"
>
  API Docs
</AppLink>
// Navigates to: /docs/api?version=v2#introduction

// Replace current history entry
<AppLink
  to="/login"
  replace={true}
>
  Login
</AppLink>

// With navigation state
<AppLink
  to="/checkout"
  state={{ from: 'cart', items: cartItems }}
>
  Proceed to Checkout
</AppLink>

// Conditional rendering
{isLoggedIn ? (
  <AppLink to="/dashboard">Dashboard</AppLink>
) : (
  <AppLink to="/login">Login</AppLink>
)}
```

## Navigation Hooks

### useTypedNavigate / useRouteNavigate

Type-safe programmatic navigation hooks. Both hooks provide the same functionality with slightly different APIs.

**Note**: `useTypedNavigate` and `useRouteNavigate` are aliases providing the same type-safe navigation capabilities. Use whichever fits your naming preference.

```typescript
import { useTypedNavigate } from '@/lib/routing';
// Or: import { useRouteNavigate } from '@/lib/routing';

function MyComponent() {
  const { navigateTo, goBack, goForward } = useTypedNavigate();

  const handleClick = () => {
    // Type-safe navigation
    navigateTo('/users/:id', { id: '123' }, { replace: false });
  };

  return (
    <div>
      <button onClick={handleClick}>View User</button>
      <button onClick={goBack}>Back</button>
      <button onClick={goForward}>Forward</button>
    </div>
  );
}
```

### API

```typescript
interface TypedNavigate {
  navigateTo<TPath extends string>(
    path: TPath,
    params?: RouteParams<TPath>,
    options?: NavigateOptions
  ): void;

  goBack(): void;
  goForward(): void;
  go(delta: number): void;
}

interface NavigateOptions {
  replace?: boolean;
  state?: unknown;
  preventScrollReset?: boolean;
  relative?: 'route' | 'path';
}
```

### Examples

```typescript
function UserActions({ userId }: { userId: string }) {
  const { navigateTo } = useTypedNavigate();

  const viewProfile = () => {
    navigateTo('/users/:id', { id: userId });
  };

  const editProfile = () => {
    navigateTo('/users/:id/edit', { id: userId }, {
      state: { from: 'profile' },
    });
  };

  const deleteUser = async () => {
    await deleteUserApi(userId);
    navigateTo('/users', {}, { replace: true });
  };

  return (
    <div>
      <button onClick={viewProfile}>View</button>
      <button onClick={editProfile}>Edit</button>
      <button onClick={deleteUser}>Delete</button>
    </div>
  );
}
```

### useActiveRoute

Detect if a route is currently active.

```typescript
import { useActiveRoute } from '@/lib/routing';

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  const isActive = useActiveRoute(to);

  return (
    <AppLink
      to={to}
      className={isActive ? 'nav-item active' : 'nav-item'}
    >
      {children}
    </AppLink>
  );
}

// With exact matching
function ExactNavItem({ to, children }: { to: string; children: React.ReactNode }) {
  const isActive = useActiveRoute(to, { exact: true });

  return (
    <AppLink
      to={to}
      className={isActive ? 'nav-item active' : 'nav-item'}
    >
      {children}
    </AppLink>
  );
}
```

## Breadcrumbs

Automatic breadcrumb generation from current route.

### useBreadcrumbs

```typescript
import { useBreadcrumbs } from '@/lib/routing';

function BreadcrumbNav() {
  const breadcrumbs = useBreadcrumbs();

  return (
    <nav aria-label="Breadcrumb">
      <ol className="breadcrumb">
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.path} className="breadcrumb-item">
            {index < breadcrumbs.length - 1 ? (
              <AppLink to={crumb.path}>{crumb.label}</AppLink>
            ) : (
              <span>{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

### Custom Breadcrumb Labels

```typescript
import { useBreadcrumbs } from '@/lib/routing';

// In your route component
export const handle = {
  breadcrumb: {
    label: 'User Profile',
    icon: UserIcon,
  },
};

// Usage
function BreadcrumbNav() {
  const breadcrumbs = useBreadcrumbs({
    excludeRoot: false,
    maxItems: 5,
  });

  return (
    <nav>
      {breadcrumbs.map((crumb) => (
        <div key={crumb.path}>
          {crumb.icon && <crumb.icon />}
          <AppLink to={crumb.path}>{crumb.label}</AppLink>
        </div>
      ))}
    </nav>
  );
}
```

### Dynamic Breadcrumbs

```typescript
// In route loader
export async function loader({ params }: LoaderFunctionArgs) {
  const user = await fetchUser(params.id);

  return {
    user,
    breadcrumb: user.name, // Dynamic breadcrumb
  };
}

// In route component
export const handle = {
  breadcrumb: (data: LoaderData) => data.user.name,
};
```

## External Links

Smart handling of external URLs.

### ExternalLink Component

```typescript
import { ExternalLink } from '@/lib/routing';

function Footer() {
  return (
    <footer>
      <ExternalLink href="https://example.com">
        Visit Our Website
      </ExternalLink>

      <ExternalLink
        href="https://twitter.com/example"
        icon={TwitterIcon}
        rel="noopener noreferrer"
      >
        Follow Us
      </ExternalLink>
    </footer>
  );
}
```

### Props

```typescript
interface ExternalLinkProps {
  href: string;
  children: React.ReactNode;
  icon?: React.ComponentType;
  showIcon?: boolean;
  target?: string;
  rel?: string;
  className?: string;
  onClick?: (event: React.MouseEvent) => void;
}
```

### isExternalUrl

```typescript
import { isExternalUrl } from '@/lib/routing';

function SmartLink({ href, children }: { href: string; children: React.ReactNode }) {
  if (isExternalUrl(href)) {
    return <ExternalLink href={href}>{children}</ExternalLink>;
  }

  return <AppLink to={href}>{children}</AppLink>;
}
```

## Prefetching

Pre-load routes and data before navigation.

### Prefetch Handlers

```typescript
import { usePrefetchHandlers } from '@/lib/routing';

function UserCard({ userId }: { userId: string }) {
  const prefetchHandlers = usePrefetchHandlers(`/users/${userId}`, {
    delay: 100,
    prefetchData: true,
  });

  return (
    <div {...prefetchHandlers}>
      <h3>User {userId}</h3>
      <AppLink to={`/users/${userId}`}>View Profile</AppLink>
    </div>
  );
}
```

### Manual Prefetch

```typescript
import { prefetchRoute } from '@/lib/routing';

function ProductList() {
  const handleMouseEnter = (productId: string) => {
    prefetchRoute(`/products/${productId}`);
  };

  return (
    <div>
      {products.map(product => (
        <div
          key={product.id}
          onMouseEnter={() => handleMouseEnter(product.id)}
        >
          {product.name}
        </div>
      ))}
    </div>
  );
}
```

### Prefetch Options

```typescript
interface PrefetchOptions {
  delay?: number;
  prefetchData?: boolean;
  priority?: 'high' | 'low';
  cache?: boolean;
}

prefetchRoute('/users/123', {
  delay: 100,
  prefetchData: true,
  priority: 'high',
  cache: true,
});
```

## Navigation Guards

Protect routes with guards before navigation.

```typescript
import { useNavigationGuard } from '@/lib/routing';

function EditForm() {
  const [hasChanges, setHasChanges] = useState(false);

  useNavigationGuard(
    hasChanges,
    'You have unsaved changes. Are you sure you want to leave?'
  );

  return <form>{/* ... */}</form>;
}

// With custom handler
useNavigationGuard(hasChanges, (location) => {
  return window.confirm(
    `Leave ${location.pathname}? You have unsaved changes.`
  );
});
```

## Loading States

Handle loading states during navigation.

### useNavigation

```typescript
import { useNavigation } from 'react-router-dom';

function GlobalLoader() {
  const navigation = useNavigation();

  if (navigation.state === 'loading') {
    return <LoadingBar />;
  }

  return null;
}
```

### useTransition

```typescript
import { useTransition } from '@/lib/routing';

function Page() {
  const { isPending, isNavigating } = useTransition();

  return (
    <div className={isPending ? 'loading' : ''}>
      {isNavigating && <LoadingSpinner />}
      <Outlet />
    </div>
  );
}
```

## Navigation Utilities

### buildNavigationPath

Build a full navigation path with parameters.

```typescript
import { buildNavigationPath } from '@/lib/routing';

const path = buildNavigationPath(
  '/users/:id/posts/:postId',
  { id: '123', postId: '456' },
  { sort: 'recent' },
  'comments'
);
// => '/users/123/posts/456?sort=recent#comments'
```

### matchRoute

Check if current location matches a route pattern.

```typescript
import { matchRoute } from '@/lib/routing';

const match = matchRoute('/users/:id', location.pathname);
if (match) {
  console.log('User ID:', match.params.id);
}
```

## Examples

### Navigation Menu

```typescript
function NavigationMenu() {
  const { navigateTo } = useTypedNavigate();
  const isActive = useActiveRoute;

  const menuItems = [
    { path: '/', label: 'Home' },
    { path: '/about', label: 'About' },
    { path: '/contact', label: 'Contact' },
  ];

  return (
    <nav>
      {menuItems.map(item => (
        <AppLink
          key={item.path}
          to={item.path}
          className={isActive(item.path) ? 'active' : ''}
          prefetch={true}
        >
          {item.label}
        </AppLink>
      ))}
    </nav>
  );
}
```

### Breadcrumb Navigation

```typescript
function PageHeader() {
  const breadcrumbs = useBreadcrumbs();

  return (
    <header>
      <nav aria-label="Breadcrumb">
        <ol className="breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <li key={crumb.path}>
              {index < breadcrumbs.length - 1 ? (
                <>
                  <AppLink to={crumb.path}>{crumb.label}</AppLink>
                  <span className="separator">/</span>
                </>
              ) : (
                <span className="current">{crumb.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </header>
  );
}
```

### Multi-Step Form Navigation

```typescript
function MultiStepForm() {
  const { navigateTo } = useTypedNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});

  const nextStep = () => {
    if (step < 3) {
      setStep(step + 1);
      navigateTo(`/form/step-${step + 1}`, {}, {
        state: { formData },
      });
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
      navigateTo(`/form/step-${step - 1}`, {}, {
        state: { formData },
      });
    }
  };

  return (
    <div>
      <StepIndicator current={step} total={3} />
      <FormStep step={step} data={formData} onChange={setFormData} />
      <div>
        <button onClick={prevStep} disabled={step === 1}>
          Previous
        </button>
        <button onClick={nextStep} disabled={step === 3}>
          Next
        </button>
      </div>
    </div>
  );
}
```

### Conditional Navigation

```typescript
function ProtectedAction() {
  const { navigateTo } = useTypedNavigate();
  const { user } = useAuth();

  const handleAction = async () => {
    if (!user) {
      navigateTo('/login', {}, {
        state: { returnUrl: location.pathname },
      });
      return;
    }

    if (!user.hasPermission('edit')) {
      navigateTo('/unauthorized');
      return;
    }

    // Proceed with action
    await performAction();
    navigateTo('/success');
  };

  return <button onClick={handleAction}>Edit</button>;
}
```

## Best Practices

### Type Safety

```typescript
// Define route paths as const
const ROUTES = {
  home: '/',
  userDetail: '/users/:id',
  userEdit: '/users/:id/edit',
} as const;

// Use with AppLink
<AppLink to={ROUTES.userDetail} params={{ id: '123' }}>
  User
</AppLink>
```

### Performance

```typescript
// Enable prefetching for better UX
<AppLink to="/dashboard" prefetch={true}>
  Dashboard
</AppLink>

// Prefetch critical routes on mount
useEffect(() => {
  prefetchRoute('/dashboard');
}, []);
```

### Accessibility

```typescript
// Use semantic HTML
<nav aria-label="Main navigation">
  <AppLink to="/">Home</AppLink>
  <AppLink to="/about">About</AppLink>
</nav>

// Indicate current page
<AppLink
  to="/dashboard"
  aria-current={isActive('/dashboard') ? 'page' : undefined}
>
  Dashboard
</AppLink>
```

### Error Handling

```typescript
function SafeNavigation() {
  const { navigateTo } = useTypedNavigate();

  const handleNavigate = () => {
    try {
      navigateTo('/users/:id', { id: userId });
    } catch (error) {
      console.error('Navigation failed:', error);
      // Show error message
    }
  };

  return <button onClick={handleNavigate}>Navigate</button>;
}
```

## Related Documentation

### Routing System
- [README.md](./README.md) - Routing overview
- [CORE.md](./CORE.md) - Core routing utilities
- [GUARDS.md](./GUARDS.md) - Route guards
- [LOADERS.md](./LOADERS.md) - Data loaders
- [ADVANCED.md](./ADVANCED.md) - Advanced patterns
- [TYPES.md](./TYPES.md) - Type definitions

### State & Auth
- [State System](../state/README.md) - Navigation with state
- [State Hooks](../state/HOOKS.md) - State hooks for navigation
- [Auth Guards](../auth/GUARDS.md) - Protected navigation
- [Auth System](../auth/README.md) - Auth integration

### Integration
- [Routing Integration](../integration/ROUTING_STATE_GUARDS.md) - Navigation patterns
