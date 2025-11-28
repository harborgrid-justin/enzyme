# Routing + State + Guards Integration Guide

> **Harbor React Framework** - Comprehensive integration patterns for routing, state management, and authentication guards.

## Table of Contents
- [Provider Composition](#provider-composition)
- [Route Guards + Auth](#route-guards--auth)
- [State-Driven Navigation](#state-driven-navigation)
- [Route Prefetching](#route-prefetching)
- [Deep Linking](#deep-linking)
- [Wizard Patterns](#wizard-patterns)
- [Navigation Blocking](#navigation-blocking)
- [Guard Composition Patterns](#guard-composition-patterns)

---

## Provider Composition

### Route + State + Auth Stack

```
┌────────────────────────────────────────────────────────────┐
│  BrowserRouter (or createBrowserRouter)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  AuthProvider (provides auth context)                │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  StoreProvider (Zustand state)                 │  │  │
│  │  │  ┌──────────────────────────────────────────┐  │  │  │
│  │  │  │  RouteRegistry (route metadata)          │  │  │  │
│  │  │  │  ┌────────────────────────────────────┐  │  │  │  │
│  │  │  │  │  Routes / Outlet                   │  │  │  │  │
│  │  │  │  └────────────────────────────────────┘  │  │  │  │
│  │  │  └──────────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

#### Example 1: Complete Router Setup

```tsx
// app/router.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { StoreProvider, useStore } from '@/lib/state';
import { RouteRegistry } from '@/lib/routing';
import { routes } from './routes';

const router = createBrowserRouter(routes);

export function AppRouter() {
  return (
    <AuthProvider>
      <StoreProvider>
        <RouteRegistry routes={routes}>
          <RouterProvider router={router} />
        </RouteRegistry>
      </StoreProvider>
    </AuthProvider>
  );
}
```

---

## Route Guards + Auth

### Example 2: Basic Auth Guard Wrapper

```tsx
import { RequireAuth } from '@/lib/auth/authGuards';
import { Outlet } from 'react-router-dom';

// Protected route layout
export function ProtectedLayout() {
  return (
    <RequireAuth fallback={<Navigate to="/login" replace />}>
      <div className="protected-layout">
        <Sidebar />
        <main>
          <Outlet />
        </main>
      </div>
    </RequireAuth>
  );
}

// Route configuration
export const routes = [
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'signup', element: <SignupPage /> }
    ]
  },
  {
    path: '/app',
    element: <ProtectedLayout />,
    children: [
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'settings', element: <Settings /> }
    ]
  }
];
```

### Example 3: Nested Role + Permission Guards

```tsx
import { RequireAuth, RequireRole, RequirePermission } from '@/lib/auth/authGuards';
import { Outlet } from 'react-router-dom';

// Admin section with layered guards
export function AdminLayout() {
  return (
    <RequireAuth fallback={<Navigate to="/login" />}>
      <RequireRole role="admin" fallback={<AccessDenied />}>
        <div className="admin-layout">
          <AdminSidebar />
          <Outlet />
        </div>
      </RequireRole>
    </RequireAuth>
  );
}

// Specific permission within admin
export function UserManagementPage() {
  return (
    <RequirePermission permission="users:manage" fallback={<NoPermission />}>
      <UserManagement />
    </RequirePermission>
  );
}

// Routes
export const adminRoutes = {
  path: '/admin',
  element: <AdminLayout />,
  children: [
    { path: 'dashboard', element: <AdminDashboard /> },
    { path: 'users', element: <UserManagementPage /> },
    {
      path: 'billing',
      element: (
        <RequirePermission permission="billing:view">
          <BillingPage />
        </RequirePermission>
      )
    }
  ]
};
```

### Example 4: Guard with State-Based Redirect

```tsx
import { RequireAuth } from '@/lib/auth/authGuards';
import { useStore } from '@/lib/state';
import { Navigate, useLocation } from 'react-router-dom';

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const onboardingComplete = useStore((s) => s.session?.onboardingComplete);
  const onboardingStep = useStore((s) => s.session?.onboardingStep ?? 0);

  return (
    <RequireAuth>
      {!onboardingComplete ? (
        <Navigate
          to={`/onboarding/step-${onboardingStep}`}
          state={{ from: location }}
          replace
        />
      ) : (
        children
      )}
    </RequireAuth>
  );
}

// Usage in routes
{
  path: '/app',
  element: (
    <OnboardingGuard>
      <AppLayout />
    </OnboardingGuard>
  ),
  children: [/* ... */]
}
```

### Example 5: Dynamic Permission Guard

```tsx
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/state';
import { useParams } from 'react-router-dom';

export function ResourceGuard({
  children,
  resourceType
}: {
  children: React.ReactNode;
  resourceType: 'project' | 'document' | 'team';
}) {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const resourcePermissions = useStore((s) => s.resourcePermissions);

  // Check user has access to this specific resource
  const hasAccess = useMemo(() => {
    const key = `${resourceType}:${id}`;
    const permissions = resourcePermissions[key];

    if (!permissions) return false;

    return permissions.users.includes(user?.id) ||
           permissions.roles.some((r) => user?.roles.includes(r));
  }, [resourceType, id, resourcePermissions, user]);

  if (!hasAccess) {
    return <ResourceAccessDenied resourceType={resourceType} />;
  }

  return <>{children}</>;
}

// Usage
{
  path: '/projects/:id',
  element: (
    <ResourceGuard resourceType="project">
      <ProjectPage />
    </ResourceGuard>
  )
}
```

---

## State-Driven Navigation

### Example 6: Redirect After Login

```tsx
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/state';
import { useNavigate, useLocation } from 'react-router-dom';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const setSession = useStore((s) => s.setSession);
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect destination from state
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, from, navigate]);

  const handleLogin = async (credentials: Credentials) => {
    const user = await login(credentials);

    // Update state with session info
    setSession({
      user,
      loginTime: Date.now(),
      returnPath: from
    });
  };

  return <LoginForm onSubmit={handleLogin} />;
}
```

### Example 7: Navigation History in State

```tsx
import { useStore } from '@/lib/state';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

// Track navigation in state
export function NavigationTracker() {
  const location = useLocation();
  const addToHistory = useStore((s) => s.addNavigationHistory);
  const navigationHistory = useStore((s) => s.navigationHistory);

  useEffect(() => {
    addToHistory({
      path: location.pathname,
      search: location.search,
      timestamp: Date.now()
    });
  }, [location.pathname, location.search]);

  return null;
}

// Use history for smart back navigation
export function SmartBackButton() {
  const navigate = useNavigate();
  const history = useStore((s) => s.navigationHistory);

  const handleBack = () => {
    // Find last meaningful navigation (skip repeated paths)
    const lastDifferent = history
      .slice(0, -1)
      .reverse()
      .find((h) => h.path !== history[history.length - 1]?.path);

    if (lastDifferent) {
      navigate(lastDifferent.path + lastDifferent.search);
    } else {
      navigate('/');
    }
  };

  return <button onClick={handleBack}>Back</button>;
}
```

### Example 8: Route-Synchronized State

```tsx
import { useStore } from '@/lib/state';
import { useSearchParams, useParams } from 'react-router-dom';
import { useEffect } from 'react';

// Sync URL params to state
export function useRouteStateSync() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useParams();

  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const setCurrentResource = useStore((s) => s.setCurrentResource);

  // URL → State
  useEffect(() => {
    const urlFilters = {
      search: searchParams.get('q') || '',
      status: searchParams.get('status') || 'all',
      page: parseInt(searchParams.get('page') || '1', 10)
    };
    setFilters(urlFilters);
  }, [searchParams]);

  // State → URL
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (filters.search) newParams.set('q', filters.search);
    if (filters.status !== 'all') newParams.set('status', filters.status);
    if (filters.page > 1) newParams.set('page', String(filters.page));

    setSearchParams(newParams, { replace: true });
  }, [filters]);

  // Sync resource ID
  useEffect(() => {
    if (params.id) {
      setCurrentResource(params.id);
    }
  }, [params.id]);
}
```

---

## Route Prefetching

### Example 9: Auth-Aware Prefetching

```tsx
import { usePrefetchRoute } from '@/lib/routing';
import { useAuth } from '@/lib/auth';

export function NavLink({ to, children, requiredRole }: NavLinkProps) {
  const prefetch = usePrefetchRoute();
  const { user } = useAuth();

  // Only prefetch if user has access
  const canAccess = !requiredRole || user?.roles.includes(requiredRole);

  const handleMouseEnter = () => {
    if (canAccess) {
      prefetch(to);
    }
  };

  return (
    <Link
      to={to}
      onMouseEnter={handleMouseEnter}
      aria-disabled={!canAccess}
    >
      {children}
    </Link>
  );
}
```

### Example 10: State-Based Prefetch Priority

```tsx
import { usePrefetchRoute, AppLink } from '@/lib/routing';
import { useStore } from '@/lib/state';
import { useEffect } from 'react';

export function SmartPrefetcher() {
  const prefetch = usePrefetchRoute();
  const recentlyViewed = useStore((s) => s.recentlyViewed);
  const userPreferences = useStore((s) => s.preferences);

  useEffect(() => {
    // Prefetch based on user behavior patterns
    const predictedRoutes = predictNextRoutes(recentlyViewed, userPreferences);

    predictedRoutes.forEach((route, index) => {
      // Stagger prefetches to avoid congestion
      setTimeout(() => prefetch(route), index * 100);
    });
  }, [recentlyViewed]);

  return null;
}

function predictNextRoutes(history: string[], prefs: Preferences): string[] {
  // Simple prediction based on common patterns
  const predictions: string[] = [];

  const lastPath = history[history.length - 1];

  if (lastPath?.includes('/projects')) {
    predictions.push('/projects/new', '/projects/recent');
  }

  if (prefs.favoriteSection) {
    predictions.push(`/${prefs.favoriteSection}`);
  }

  return predictions.slice(0, 3);
}
```

### Example 11: Prefetch with Loading State

```tsx
import { usePrefetchRoute } from '@/lib/routing';
import { useStore } from '@/lib/state';
import { useState } from 'react';

export function PrefetchableCard({
  href,
  children
}: {
  href: string;
  children: React.ReactNode;
}) {
  const prefetch = usePrefetchRoute();
  const setPrefetchStatus = useStore((s) => s.setPrefetchStatus);
  const [isPrefetched, setIsPrefetched] = useState(false);

  const handleMouseEnter = async () => {
    if (!isPrefetched) {
      setPrefetchStatus(href, 'loading');
      await prefetch(href);
      setPrefetchStatus(href, 'ready');
      setIsPrefetched(true);
    }
  };

  return (
    <Link to={href} onMouseEnter={handleMouseEnter}>
      {children}
      {isPrefetched && <span className="prefetched-indicator" />}
    </Link>
  );
}
```

---

## Deep Linking

### Example 12: Deep Link with State Restoration

```tsx
import { useStore } from '@/lib/state';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export function useDeepLinkState<T extends Record<string, unknown>>(
  stateKey: keyof StoreState,
  paramMapping: Record<keyof T, string>
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const stateValue = useStore((s) => s[stateKey]) as T;
  const setState = useStore((s) => s[`set${capitalize(stateKey as string)}`]);

  // Restore state from URL on mount
  useEffect(() => {
    const restored: Partial<T> = {};
    let hasParams = false;

    for (const [stateKey, paramKey] of Object.entries(paramMapping)) {
      const value = searchParams.get(paramKey);
      if (value !== null) {
        restored[stateKey as keyof T] = parseValue(value);
        hasParams = true;
      }
    }

    if (hasParams) {
      setState(restored);
    }
  }, []); // Only on mount

  // Sync state changes to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);

    for (const [stateKey, paramKey] of Object.entries(paramMapping)) {
      const value = stateValue[stateKey as keyof T];
      if (value !== undefined && value !== null && value !== '') {
        params.set(paramKey, String(value));
      } else {
        params.delete(paramKey);
      }
    }

    setSearchParams(params, { replace: true });
  }, [stateValue]);

  return { state: stateValue, setState };
}

// Usage
export function FilteredList() {
  const { state: filters, setState: setFilters } = useDeepLinkState('listFilters', {
    search: 'q',
    category: 'cat',
    sortBy: 'sort',
    page: 'p'
  });

  // URL will be: /list?q=searchterm&cat=electronics&sort=price&p=2
  return <List filters={filters} onFilterChange={setFilters} />;
}
```

### Example 13: Shareable View State

```tsx
import { useStore } from '@/lib/state';
import { useLocation } from 'react-router-dom';
import { useEffect, useMemo } from 'react';

export function useShareableState() {
  const location = useLocation();
  const viewState = useStore((s) => s.viewState);
  const setViewState = useStore((s) => s.setViewState);

  // Generate shareable URL
  const shareableUrl = useMemo(() => {
    const url = new URL(window.location.href);

    // Encode view state in URL
    const stateParam = btoa(JSON.stringify({
      filters: viewState.filters,
      sort: viewState.sort,
      view: viewState.view,
      selected: viewState.selectedIds
    }));

    url.searchParams.set('state', stateParam);
    return url.toString();
  }, [viewState]);

  // Restore from shared URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const stateParam = params.get('state');

    if (stateParam) {
      try {
        const decoded = JSON.parse(atob(stateParam));
        setViewState(decoded);
      } catch {
        console.warn('Invalid state parameter');
      }
    }
  }, []);

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(shareableUrl);
  };

  return { shareableUrl, copyShareLink };
}
```

---

## Wizard Patterns

### Example 14: Multi-Step Wizard with Route Persistence

```tsx
import { useStore } from '@/lib/state';
import { useNavigate, useParams, Outlet } from 'react-router-dom';
import { RequireAuth } from '@/lib/auth/authGuards';

// Wizard state slice
interface WizardState {
  currentStep: number;
  completedSteps: number[];
  data: Record<string, unknown>;
}

export function WizardLayout() {
  const { step } = useParams<{ step: string }>();
  const navigate = useNavigate();

  const wizardState = useStore((s) => s.wizard);
  const setWizardStep = useStore((s) => s.setWizardStep);
  const markStepComplete = useStore((s) => s.markWizardStepComplete);

  const currentStep = parseInt(step || '1', 10);
  const steps = ['info', 'details', 'review', 'confirm'];

  // Sync route to state
  useEffect(() => {
    setWizardStep(currentStep);
  }, [currentStep]);

  // Guard: prevent skipping steps
  useEffect(() => {
    const maxAllowed = Math.max(...wizardState.completedSteps, 0) + 1;
    if (currentStep > maxAllowed) {
      navigate(`/wizard/step/${maxAllowed}`, { replace: true });
    }
  }, [currentStep, wizardState.completedSteps]);

  const goToStep = (step: number) => {
    navigate(`/wizard/step/${step}`);
  };

  const completeCurrentStep = () => {
    markStepComplete(currentStep);
    if (currentStep < steps.length) {
      goToStep(currentStep + 1);
    }
  };

  return (
    <RequireAuth>
      <div className="wizard">
        <WizardProgress
          steps={steps}
          currentStep={currentStep}
          completedSteps={wizardState.completedSteps}
          onStepClick={goToStep}
        />

        <WizardContext.Provider value={{ completeCurrentStep, goToStep }}>
          <Outlet />
        </WizardContext.Provider>
      </div>
    </RequireAuth>
  );
}

// Routes
{
  path: '/wizard',
  element: <WizardLayout />,
  children: [
    { path: 'step/1', element: <WizardStep1 /> },
    { path: 'step/2', element: <WizardStep2 /> },
    { path: 'step/3', element: <WizardStep3 /> },
    { path: 'step/4', element: <WizardStep4 /> },
    { index: true, element: <Navigate to="step/1" replace /> }
  ]
}
```

### Example 15: Wizard with Auto-Save

```tsx
import { useStore } from '@/lib/state';
import { useNavigate, useBlocker } from 'react-router-dom';
import { useEffect, useRef } from 'react';

export function WizardStepWithAutoSave({ stepKey }: { stepKey: string }) {
  const navigate = useNavigate();

  const stepData = useStore((s) => s.wizard.data[stepKey] ?? {});
  const setStepData = useStore((s) => s.setWizardStepData);
  const isDirty = useStore((s) => s.wizard.isDirty);
  const setDirty = useStore((s) => s.setWizardDirty);

  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-save on changes
  const handleChange = (field: string, value: unknown) => {
    setStepData(stepKey, { ...stepData, [field]: value });
    setDirty(true);

    // Debounced save
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await saveToServer(stepKey, { ...stepData, [field]: value });
      setDirty(false);
    }, 1000);
  };

  // Block navigation if unsaved
  const blocker = useBlocker(isDirty);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const confirm = window.confirm('You have unsaved changes. Leave anyway?');
      if (confirm) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  // Cleanup
  useEffect(() => {
    return () => clearTimeout(saveTimeoutRef.current);
  }, []);

  return (
    <form>
      {/* Form fields using handleChange */}
      <input
        value={stepData.name ?? ''}
        onChange={(e) => handleChange('name', e.target.value)}
      />
      {isDirty && <span className="saving-indicator">Saving...</span>}
    </form>
  );
}
```

---

## Navigation Blocking

### Example 16: Unsaved Changes Guard

```tsx
import { useStore } from '@/lib/state';
import { useBlocker, useBeforeUnload } from 'react-router-dom';
import { useEffect, useCallback } from 'react';

export function useUnsavedChangesGuard() {
  const isDirty = useStore((s) => s.form.isDirty);
  const formData = useStore((s) => s.form.data);

  // Block React Router navigation
  const blocker = useBlocker(
    useCallback(() => isDirty, [isDirty])
  );

  // Handle blocked navigation
  useEffect(() => {
    if (blocker.state === 'blocked') {
      const shouldLeave = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      );

      if (shouldLeave) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  // Block browser back/refresh
  useBeforeUnload(
    useCallback(
      (e) => {
        if (isDirty) {
          e.preventDefault();
          e.returnValue = '';
        }
      },
      [isDirty]
    )
  );

  return { isDirty, formData };
}

// Usage
export function EditForm() {
  const { isDirty } = useUnsavedChangesGuard();

  return (
    <form>
      {/* form fields */}
      {isDirty && <p className="unsaved-warning">Unsaved changes</p>}
    </form>
  );
}
```

### Example 17: Conditional Navigation Based on Auth

```tsx
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/state';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

export function useAuthNavigationGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const setIntendedPath = useStore((s) => s.setIntendedPath);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Save current path for redirect after login
      setIntendedPath(location.pathname + location.search);
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, location]);

  return { isAuthenticated, isLoading };
}

// After successful login
export function usePostLoginRedirect() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const intendedPath = useStore((s) => s.intendedPath);
  const clearIntendedPath = useStore((s) => s.clearIntendedPath);

  useEffect(() => {
    if (isAuthenticated && intendedPath) {
      const path = intendedPath;
      clearIntendedPath();
      navigate(path, { replace: true });
    }
  }, [isAuthenticated, intendedPath]);
}
```

---

## Guard Composition Patterns

### Correct Nesting Order

```tsx
/**
 * Guard nesting order (outermost to innermost):
 *
 * 1. RequireAuth - Must be authenticated
 * 2. RequireRole - Must have specific role
 * 3. RequirePermission - Must have specific permission
 * 4. Custom Guards - Business logic guards
 * 5. Component - The actual content
 */

// Example: Full guard stack
export function AdminUserEditPage() {
  return (
    <RequireAuth fallback={<LoginRedirect />}>
      <RequireRole role="admin" fallback={<AccessDenied />}>
        <RequirePermission permission="users:edit" fallback={<NoPermission />}>
          <RequireActiveSubscription fallback={<UpgradePrompt />}>
            <UserEditForm />
          </RequireActiveSubscription>
        </RequirePermission>
      </RequireRole>
    </RequireAuth>
  );
}
```

### Example 18: Composable Guard Factory

```tsx
import { RequireAuth, RequireRole, RequirePermission } from '@/lib/auth/authGuards';

// Create reusable guard compositions
function createGuardedRoute(
  component: React.ComponentType,
  options: {
    requireAuth?: boolean;
    roles?: string[];
    permissions?: string[];
    customGuard?: React.ComponentType<{ children: React.ReactNode }>;
  }
) {
  const { requireAuth = true, roles, permissions, customGuard: CustomGuard } = options;

  let element = <component />;

  // Apply guards from innermost to outermost
  if (CustomGuard) {
    element = <CustomGuard>{element}</CustomGuard>;
  }

  if (permissions?.length) {
    element = permissions.reduceRight(
      (acc, permission) => (
        <RequirePermission permission={permission}>{acc}</RequirePermission>
      ),
      element
    );
  }

  if (roles?.length) {
    element = (
      <RequireRole role={roles} matchMode="any">
        {element}
      </RequireRole>
    );
  }

  if (requireAuth) {
    element = <RequireAuth>{element}</RequireAuth>;
  }

  return element;
}

// Usage
const routes = [
  {
    path: '/admin/users',
    element: createGuardedRoute(UserManagement, {
      roles: ['admin', 'super-admin'],
      permissions: ['users:read', 'users:write']
    })
  },
  {
    path: '/billing',
    element: createGuardedRoute(BillingPage, {
      roles: ['admin', 'billing-admin'],
      permissions: ['billing:view'],
      customGuard: RequireActiveSubscription
    })
  }
];
```

### Example 19: Guard with Loading Coordination

```tsx
import { RequireAuth, AuthGuardLoading } from '@/lib/auth/authGuards';
import { useStore } from '@/lib/state';
import { Suspense } from 'react';

export function CoordinatedGuard({
  children,
  loadingComponent = <AuthGuardLoading />
}: {
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
}) {
  const isStoreHydrated = useStore((s) => s.isHydrated);

  // Wait for both auth and store to be ready
  if (!isStoreHydrated) {
    return <>{loadingComponent}</>;
  }

  return (
    <RequireAuth
      fallback={<Navigate to="/login" />}
      loadingFallback={loadingComponent}
    >
      <Suspense fallback={loadingComponent}>
        {children}
      </Suspense>
    </RequireAuth>
  );
}
```

### Example 20: Route-Level Guard Configuration

```tsx
// Define guards in route metadata
interface RouteConfig {
  path: string;
  element: React.ReactElement;
  meta?: {
    requireAuth?: boolean;
    roles?: string[];
    permissions?: string[];
    title?: string;
  };
}

// Apply guards based on metadata
function applyRouteGuards(routes: RouteConfig[]): RouteObject[] {
  return routes.map((route) => {
    let element = route.element;

    if (route.meta?.permissions) {
      for (const permission of route.meta.permissions.reverse()) {
        element = (
          <RequirePermission permission={permission}>
            {element}
          </RequirePermission>
        );
      }
    }

    if (route.meta?.roles) {
      element = (
        <RequireRole role={route.meta.roles} matchMode="any">
          {element}
        </RequireRole>
      );
    }

    if (route.meta?.requireAuth !== false) {
      element = <RequireAuth>{element}</RequireAuth>;
    }

    return {
      path: route.path,
      element
    };
  });
}

// Usage
const routeConfigs: RouteConfig[] = [
  {
    path: '/dashboard',
    element: <Dashboard />,
    meta: { title: 'Dashboard' }
  },
  {
    path: '/admin',
    element: <AdminPanel />,
    meta: { roles: ['admin'], permissions: ['admin:access'] }
  },
  {
    path: '/public',
    element: <PublicPage />,
    meta: { requireAuth: false }
  }
];

const routes = applyRouteGuards(routeConfigs);
```

---

## Quick Reference

| Pattern | Routing | State | Guards | Use Case |
|---------|---------|-------|--------|----------|
| Protected Route | Layout | - | RequireAuth | Auth-only pages |
| Role-Based | Layout | user.roles | RequireRole | Admin sections |
| Deep Link | searchParams | filters | - | Shareable URLs |
| Wizard | params | wizard | RequireAuth | Multi-step forms |
| Prefetch | Link | recentlyViewed | - | Performance |
| Block Nav | useBlocker | isDirty | - | Unsaved changes |

---

*Last updated: 2024 | Harbor React Framework v2.0*
