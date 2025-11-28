# Code Splitting Examples

> **Module**: `@/lib/ui`, `@/lib/performance`
> **Key Concepts**: `React.lazy`, `Suspense`, Dynamic Imports

This guide provides comprehensive examples for implementing code splitting and lazy loading.

---

## Table of Contents

- [Basic Lazy Loading](#basic-lazy-loading)
- [Route-Based Splitting](#route-based-splitting)
- [Component-Level Splitting](#component-level-splitting)
- [Preloading Strategies](#preloading-strategies)
- [Error Boundaries](#error-boundaries)
- [Loading States](#loading-states)
- [Feature Flag Integration](#feature-flag-integration)

---

## Basic Lazy Loading

### Simple Component Lazy Loading

```tsx
import { lazy, Suspense } from 'react';

// Lazy load a heavy component
const HeavyChart = lazy(() => import('./HeavyChart'));

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<div>Loading chart...</div>}>
        <HeavyChart data={chartData} />
      </Suspense>
    </div>
  );
}
```

### Named Export Lazy Loading

```tsx
// When component is a named export
const DataTable = lazy(() =>
  import('./DataTable').then((module) => ({ default: module.DataTable }))
);

// Or using the library's pre-configured lazy export
import { LazyDataTable } from '@/lib/ui/data';

function UserList() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <LazyDataTable data={users} columns={columns} />
    </Suspense>
  );
}
```

### Using SuspenseDataTable Wrapper

```tsx
import { SuspenseDataTable } from '@/lib/ui/data';

// Pre-wrapped with Suspense and fallback
function ProductList({ products }) {
  return (
    <SuspenseDataTable
      data={products}
      columns={productColumns}
    />
  );
}
```

---

## Route-Based Splitting

### Lazy Route Components

```tsx
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Spinner } from '@/lib/ui/feedback';

// Lazy load route components
const HomePage = lazy(() => import('./pages/HomePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </Suspense>
  );
}

function PageLoader() {
  return (
    <div className="page-loader">
      <Spinner size="lg" />
      <p>Loading page...</p>
    </div>
  );
}
```

### Nested Route Splitting

```tsx
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminReports = lazy(() => import('./pages/admin/Reports'));

function AdminRoutes() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="users" element={
            <Suspense fallback={<TableSkeleton />}>
              <AdminUsers />
            </Suspense>
          } />
          <Route path="settings" element={
            <Suspense fallback={<FormSkeleton />}>
              <AdminSettings />
            </Suspense>
          } />
          <Route path="reports" element={
            <Suspense fallback={<ChartSkeleton />}>
              <AdminReports />
            </Suspense>
          } />
        </Route>
      </Routes>
    </Suspense>
  );
}
```

---

## Component-Level Splitting

### Conditional Loading

```tsx
import { lazy, Suspense, useState } from 'react';

const RichTextEditor = lazy(() => import('./RichTextEditor'));

function CommentBox() {
  const [showRichEditor, setShowRichEditor] = useState(false);

  return (
    <div>
      <button onClick={() => setShowRichEditor(!showRichEditor)}>
        {showRichEditor ? 'Simple Editor' : 'Rich Editor'}
      </button>

      {showRichEditor ? (
        <Suspense fallback={<EditorSkeleton />}>
          <RichTextEditor />
        </Suspense>
      ) : (
        <textarea placeholder="Write a comment..." />
      )}
    </div>
  );
}
```

### Modal Content Splitting

```tsx
const AdvancedSettings = lazy(() => import('./AdvancedSettings'));

function SettingsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <Modal onClose={onClose}>
      <Suspense fallback={<SettingsSkeleton />}>
        <AdvancedSettings />
      </Suspense>
    </Modal>
  );
}
```

### Tab Content Splitting

```tsx
const OverviewTab = lazy(() => import('./tabs/Overview'));
const AnalyticsTab = lazy(() => import('./tabs/Analytics'));
const SettingsTab = lazy(() => import('./tabs/Settings'));

function TabbedContent({ activeTab }) {
  const tabs = {
    overview: OverviewTab,
    analytics: AnalyticsTab,
    settings: SettingsTab,
  };

  const TabComponent = tabs[activeTab];

  return (
    <Suspense fallback={<TabSkeleton />}>
      <TabComponent />
    </Suspense>
  );
}
```

---

## Preloading Strategies

### Preload on Hover

```tsx
import { lazy, Suspense } from 'react';
import { usePrefetchRoute } from '@/lib/hooks';

const UserProfile = lazy(() => import('./UserProfile'));

// Create preloader
const preloadUserProfile = () => {
  import('./UserProfile');
};

function UserLink({ userId, userName }) {
  return (
    <Link
      to={`/users/${userId}`}
      onMouseEnter={preloadUserProfile}
      onFocus={preloadUserProfile}
    >
      {userName}
    </Link>
  );
}
```

### Intelligent Prefetching

```tsx
import { useSmartPrefetch } from '@/lib/hooks';

function NavigationLink({ to, children }) {
  const { prefetch, isSlowConnection } = useSmartPrefetch();

  const handleMouseEnter = () => {
    // Don't prefetch on slow connections
    if (!isSlowConnection) {
      prefetch(to);
    }
  };

  return (
    <Link to={to} onMouseEnter={handleMouseEnter}>
      {children}
    </Link>
  );
}
```

### Viewport-Based Preloading

```tsx
import { useEffect, useRef } from 'react';

const HeavySection = lazy(() => import('./HeavySection'));

function LazySection() {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Start loading when section is near viewport
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Load 200px before visible
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {shouldLoad ? (
        <Suspense fallback={<SectionSkeleton />}>
          <HeavySection />
        </Suspense>
      ) : (
        <SectionPlaceholder />
      )}
    </div>
  );
}
```

---

## Error Boundaries

### Lazy Loading with Error Boundary

```tsx
import { ErrorBoundary } from '@/lib/monitoring';

const ProblematicComponent = lazy(() => import('./ProblematicComponent'));

function SafeLazyLoad() {
  return (
    <ErrorBoundary
      fallback={<ErrorFallback message="Failed to load component" />}
      onError={(error) => console.error('Chunk load failed:', error)}
    >
      <Suspense fallback={<LoadingSpinner />}>
        <ProblematicComponent />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### Retry on Chunk Load Failure

```tsx
function lazyWithRetry<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries = 3
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      try {
        return await importFn();
      } catch (error) {
        lastError = error as Error;
        // Wait before retry with exponential backoff
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
      }
    }

    throw lastError;
  });
}

// Usage
const ReliableComponent = lazyWithRetry(() => import('./MyComponent'));
```

---

## Loading States

### Skeleton Fallbacks

```tsx
import { useSkeletonFactory } from '@/lib/ux/skeleton-factory';

function TableSkeleton() {
  const factory = useSkeletonFactory();

  return (
    <div style={{ padding: '1rem' }}>
      {factory.createTable({
        rows: 5,
        columns: 4,
        showHeader: true,
      })}
    </div>
  );
}

function CardSkeleton() {
  const factory = useSkeletonFactory();

  return factory.createCard({
    showImage: true,
    lines: 3,
  });
}
```

### Progressive Loading

```tsx
function ProgressiveImage({ src, alt }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="image-container">
      {!loaded && <ImageSkeleton />}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        style={{ display: loaded ? 'block' : 'none' }}
      />
    </div>
  );
}
```

### Minimum Loading Time

```tsx
function useMinLoadingTime(isLoading: boolean, minTime = 500) {
  const [showLoading, setShowLoading] = useState(isLoading);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      startTimeRef.current = Date.now();
      setShowLoading(true);
    } else if (startTimeRef.current) {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = minTime - elapsed;

      if (remaining > 0) {
        setTimeout(() => setShowLoading(false), remaining);
      } else {
        setShowLoading(false);
      }
    }
  }, [isLoading, minTime]);

  return showLoading;
}
```

---

## Feature Flag Integration

### Lazy Load Based on Feature Flag

```tsx
import { useFeatureFlag } from '@/lib/flags';

const NewDashboard = lazy(() => import('./NewDashboard'));
const LegacyDashboard = lazy(() => import('./LegacyDashboard'));

function Dashboard() {
  const useNewDashboard = useFeatureFlag('new-dashboard');

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      {useNewDashboard ? <NewDashboard /> : <LegacyDashboard />}
    </Suspense>
  );
}
```

### Conditional Feature Loading

```tsx
import { FlagGate } from '@/lib/flags';

const AdvancedAnalytics = lazy(() => import('./AdvancedAnalytics'));

function AnalyticsPage() {
  return (
    <div>
      <BasicAnalytics />

      <FlagGate flagKey="advanced-analytics">
        <Suspense fallback={<AnalyticsSkeleton />}>
          <AdvancedAnalytics />
        </Suspense>
      </FlagGate>
    </div>
  );
}
```

---

## Best Practices

### 1. Split by Route First

```tsx
// Most impactful - split at route boundaries
const routes = {
  home: lazy(() => import('./pages/Home')),
  dashboard: lazy(() => import('./pages/Dashboard')),
  settings: lazy(() => import('./pages/Settings')),
};
```

### 2. Split Heavy Components

```tsx
// Large components that aren't immediately visible
const components = {
  DataTable: lazy(() => import('./components/DataTable')),
  Chart: lazy(() => import('./components/Chart')),
  RichTextEditor: lazy(() => import('./components/RichTextEditor')),
  PDFViewer: lazy(() => import('./components/PDFViewer')),
};
```

### 3. Don't Over-Split

```tsx
// Bad - too granular
const Button = lazy(() => import('./Button')); // Too small!

// Good - split meaningful boundaries
const SettingsForm = lazy(() => import('./SettingsForm'));
```

### 4. Use Suspense Boundaries Strategically

```tsx
function App() {
  return (
    // One boundary per major section
    <Layout>
      <Suspense fallback={<NavSkeleton />}>
        <Navigation />
      </Suspense>

      <Suspense fallback={<MainSkeleton />}>
        <MainContent />
      </Suspense>

      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>
    </Layout>
  );
}
```

---

## See Also

- [Performance Examples](./performance-examples.md)
- [Feature Flags Examples](./feature-flag-advanced-examples.md)
- [Hydration Examples](./hydration-examples.md)
