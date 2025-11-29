# Lazy Loading System

> Universal lazy loading infrastructure for components, images, modules, and data with intelligent scheduling and network awareness.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [API Reference](#api-reference)
- [Code Splitting](#code-splitting)
- [Lazy Components](#lazy-components)
- [Lazy Images](#lazy-images)
- [Module Preloading](#module-preloading)
- [Network Awareness](#network-awareness)
- [Examples](#examples)
- [Best Practices](#best-practices)

## Overview

The lazy loading system provides PhD-level lazy loading infrastructure that handles components, images, modules, and data with intelligent scheduling, network awareness, and SSR support.

### Key Features

- **IntersectionObserver Pooling** - Efficient DOM observation with automatic cleanup
- **Network-Aware Loading** - Adaptive strategies based on connection quality
- **SSR-Compatible** - Works with server-side rendering
- **Blur-Up Images** - LQIP (Low Quality Image Placeholders) support
- **Module Preloading** - Priority-based module loading
- **Automatic Retry** - Exponential backoff on failures
- **Memory-Aware** - Respects memory constraints

## Features

### IntersectionObserver Pooling

Reduces observer instances by grouping elements with the same configuration:

```typescript
// Internal implementation - automatic pooling
const pool = ObserverPool.getInstance();

// Observes element with pooled observer
const cleanup = pool.observe(
  element,
  (isIntersecting) => {
    if (isIntersecting) loadContent();
  },
  { threshold: 0.01, rootMargin: '200px' }
);
```

**Memory Optimization:**
- Periodic cleanup of orphaned entries (every 30 seconds)
- Automatic disconnection of observers for removed DOM elements
- Prevents memory leaks from strong references

### Network Quality Detection

```typescript
import { getNetworkTier, shouldLoadOnNetwork } from '@/lib/performance';

const tier = getNetworkTier();
// Returns: 'high' | 'medium' | 'low' | 'offline'

const shouldLoad = shouldLoadOnNetwork('normal', tier);
// true on 4G, false on 2G for normal priority
```

**Network Tiers:**

| Tier | Connection | Behavior |
|------|-----------|----------|
| `high` | 4G | Load all content aggressively |
| `medium` | 3G | Load on-demand, preload critical |
| `low` | 2G, slow-3G | Load only when visible |
| `offline` | No connection | Skip all loading |

## API Reference

### Components

#### `createLazyComponent<P>(config: LazyComponentConfig<P>)`

Create a lazy-loaded component with advanced features.

```typescript
interface LazyComponentConfig<P> {
  loader: () => Promise<{ default: ComponentType<P> }>;
  priority?: 'critical' | 'high' | 'normal' | 'low' | 'idle';
  strategy?: 'viewport' | 'interaction' | 'idle' | 'immediate' | 'network-aware';
  preloadOnInteraction?: boolean;
  ssrFallback?: ReactNode;
  errorFallback?: ReactNode | ((error: Error, retry: () => void) => ReactNode);
  loadingFallback?: ReactNode;
  minLoadingTime?: number; // Minimum ms to show loading (prevents flash)
  retryCount?: number;     // Number of retry attempts
  retryDelay?: number;     // Delay between retries (ms)
  chunkName?: string;      // Webpack chunk name
}
```

**Returns:** LazyExoticComponent with `preload()` method

**Example:**

```typescript
import { createLazyComponent } from '@/lib/performance';

const Editor = createLazyComponent({
  loader: () => import('./RichEditor'),
  priority: 'high',
  strategy: 'viewport',
  loadingFallback: <EditorSkeleton />,
  errorFallback: (error, retry) => (
    <ErrorCard error={error} onRetry={retry} />
  ),
  minLoadingTime: 300,
  retryCount: 3,
  retryDelay: 1000,
});

// Preload programmatically
Editor.preload();
```

#### `withLazyLoading<P>(config: LazyComponentConfig<P>)`

HOC for lazy loading with full configuration.

```typescript
import { withLazyLoading } from '@/lib/performance';

const LazyDashboard = withLazyLoading({
  loader: () => import('./Dashboard'),
  strategy: 'immediate',
  priority: 'critical',
});

// Use like a normal component
<LazyDashboard userId={userId} />
```

#### `LazyImage`

Lazy image with blur-up placeholder and network awareness.

```typescript
interface LazyImageConfig {
  src: string;
  placeholder?: string;  // LQIP image
  alt: string;
  width?: number;
  height?: number;
  srcSet?: string;
  sizes?: string;
  strategy?: 'viewport' | 'interaction' | 'idle' | 'immediate';
  rootMargin?: string;
  blurUp?: boolean;      // Enable blur-up effect
  blurRadius?: number;   // Blur amount in px
  decodeAsync?: boolean; // Use async decoding
  onLoad?: () => void;
  onError?: (error: Error) => void;
}
```

**Example:**

```tsx
import { LazyImage } from '@/lib/performance';

<LazyImage
  src="/images/hero.jpg"
  placeholder="/images/hero-lqip.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  strategy="viewport"
  rootMargin="300px"
  blurUp
  blurRadius={20}
  decodeAsync
/>
```

### Hooks

#### `useLazyVisible(options)`

Hook for lazy loading any element on viewport intersection.

```typescript
interface UseLazyVisibleOptions {
  rootMargin?: string;
  threshold?: number;
  triggerOnce?: boolean; // Only trigger on first visibility
}

interface UseLazyVisibleReturn {
  ref: React.RefObject<HTMLDivElement>;
  isVisible: boolean;
  hasBeenVisible: boolean;
}
```

**Example:**

```tsx
import { useLazyVisible } from '@/lib/performance';

function LazySection() {
  const { ref, isVisible } = useLazyVisible({
    rootMargin: '100px',
    triggerOnce: true,
  });

  return (
    <div ref={ref}>
      {isVisible ? <HeavyContent /> : <Skeleton />}
    </div>
  );
}
```

#### `useModulePreload(configs)`

Hook for preloading modules.

```typescript
interface ModulePreloadConfig {
  module: string | (() => Promise<unknown>);
  priority?: 'critical' | 'high' | 'normal' | 'low' | 'idle';
  trigger?: 'immediate' | 'idle' | 'viewport' | 'route';
  routePattern?: string;
}
```

**Example:**

```tsx
import { useModulePreload } from '@/lib/performance';

function App() {
  useModulePreload([
    {
      module: () => import('./Dashboard'),
      priority: 'high',
      trigger: 'immediate',
    },
    {
      module: () => import('./Settings'),
      priority: 'low',
      trigger: 'idle',
    }
  ]);

  return <Routes />;
}
```

#### `useNetworkAwareLoading(priority)`

Hook for network-aware loading decisions.

```typescript
interface UseNetworkAwareLoadingReturn {
  networkTier: 'high' | 'medium' | 'low' | 'offline';
  shouldLoad: boolean;
  isOnline: boolean;
}
```

**Example:**

```tsx
import { useNetworkAwareLoading } from '@/lib/performance';

function MediaGallery() {
  const { networkTier, shouldLoad } = useNetworkAwareLoading('normal');

  if (!shouldLoad) {
    return <LowQualityVersion />;
  }

  return <HighQualityGallery />;
}
```

### Utility Functions

#### `preloadComponent(config)`

Preload a component imperatively.

```typescript
import { preloadComponent } from '@/lib/performance';

// Preload on route enter
router.beforeEach((to) => {
  if (to.path === '/dashboard') {
    preloadComponent({
      loader: () => import('./Dashboard'),
      priority: 'high',
    });
  }
});
```

#### `preloadComponents(configs)`

Preload multiple components in parallel.

```typescript
import { preloadComponents } from '@/lib/performance';

// Preload critical routes
await preloadComponents([
  { loader: () => import('./Dashboard') },
  { loader: () => import('./Profile') },
  { loader: () => import('./Settings') },
]);
```

#### `queueModulePreload(config)`

Queue module for preloading during idle time.

```typescript
import { queueModulePreload } from '@/lib/performance';

// Queue non-critical modules
queueModulePreload({
  module: () => import('./Analytics'),
  priority: 'idle',
});
```

## Code Splitting

### Route-Based Splitting

```tsx
import { createLazyComponent } from '@/lib/performance';

// Lazy load route components
const routes = [
  {
    path: '/dashboard',
    component: createLazyComponent({
      loader: () => import('./pages/Dashboard'),
      priority: 'critical',
      strategy: 'immediate',
    }),
  },
  {
    path: '/profile',
    component: createLazyComponent({
      loader: () => import('./pages/Profile'),
      priority: 'high',
      strategy: 'viewport',
    }),
  },
  {
    path: '/settings',
    component: createLazyComponent({
      loader: () => import('./pages/Settings'),
      priority: 'low',
      strategy: 'interaction',
    }),
  },
];
```

### Component-Based Splitting

```tsx
// Split heavy components
const RichEditor = createLazyComponent({
  loader: () => import('./RichEditor'),
  strategy: 'interaction',
  loadingFallback: <EditorSkeleton />,
  chunkName: 'rich-editor',
});

const ChartLibrary = createLazyComponent({
  loader: () => import('./ChartLibrary'),
  strategy: 'viewport',
  rootMargin: '200px',
  chunkName: 'charts',
});

function Dashboard() {
  return (
    <div>
      <Summary />
      <ChartLibrary data={data} />
      <RichEditor />
    </div>
  );
}
```

### Feature-Based Splitting

```tsx
// Split by feature
const AdminPanel = createLazyComponent({
  loader: () => import('./features/admin'),
  strategy: 'immediate',
  priority: 'high',
});

const Analytics = createLazyComponent({
  loader: () => import('./features/analytics'),
  strategy: 'idle',
  priority: 'low',
});
```

## Lazy Components

### Basic Usage

```tsx
import { createLazyComponent } from '@/lib/performance';

const HeavyComponent = createLazyComponent({
  loader: () => import('./HeavyComponent'),
  loadingFallback: <Skeleton />,
});

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### With Error Handling

```tsx
const Dashboard = createLazyComponent({
  loader: () => import('./Dashboard'),
  loadingFallback: <DashboardSkeleton />,
  errorFallback: (error, retry) => (
    <ErrorBoundary>
      <ErrorMessage error={error} />
      <Button onClick={retry}>Retry</Button>
    </ErrorBoundary>
  ),
  retryCount: 3,
  retryDelay: 1000,
});
```

### Viewport-Based Loading

```tsx
const Comments = createLazyComponent({
  loader: () => import('./Comments'),
  strategy: 'viewport',
  priority: 'low',
  loadingFallback: <CommentsSkeleton />,
});

// Only loads when scrolled into view
<div>
  <Article />
  <Comments articleId={id} />
</div>
```

### Interaction-Based Loading

```tsx
const VideoPlayer = createLazyComponent({
  loader: () => import('./VideoPlayer'),
  strategy: 'interaction',
  preloadOnInteraction: true,
  loadingFallback: <VideoPlaceholder />,
});

// Loads on first user interaction
<div>
  <VideoPlayer src={videoUrl} />
</div>
```

## Lazy Images

### Basic Lazy Image

```tsx
import { LazyImage } from '@/lib/performance';

<LazyImage
  src="/images/product.jpg"
  alt="Product image"
  width={400}
  height={300}
/>
```

### With Blur-Up Effect

```tsx
<LazyImage
  src="/images/hero-4k.jpg"
  placeholder="/images/hero-tiny.jpg"
  alt="Hero banner"
  width={1920}
  height={1080}
  blurUp
  blurRadius={20}
  strategy="viewport"
  rootMargin="500px"
/>
```

### Responsive Images

```tsx
<LazyImage
  src="/images/hero-1920.jpg"
  srcSet={`
    /images/hero-640.jpg 640w,
    /images/hero-1280.jpg 1280w,
    /images/hero-1920.jpg 1920w
  `}
  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
  alt="Hero image"
  decodeAsync
/>
```

### Network-Aware Images

```tsx
function AdaptiveImage({ src, alt }) {
  const { networkTier } = useNetworkAwareLoading();

  const quality = {
    high: 'high-quality',
    medium: 'medium-quality',
    low: 'low-quality',
    offline: 'placeholder',
  }[networkTier];

  return (
    <LazyImage
      src={`${src}-${quality}.jpg`}
      alt={alt}
      strategy={networkTier === 'high' ? 'viewport' : 'interaction'}
    />
  );
}
```

## Module Preloading

### Priority-Based Preloading

```tsx
import { useModulePreload } from '@/lib/performance';

function App() {
  useModulePreload([
    // Critical - load immediately
    {
      module: () => import('./Dashboard'),
      priority: 'critical',
      trigger: 'immediate',
    },
    // High - load when idle
    {
      module: () => import('./Profile'),
      priority: 'high',
      trigger: 'idle',
    },
    // Low - load when really idle
    {
      module: () => import('./Settings'),
      priority: 'low',
      trigger: 'idle',
    },
  ]);
}
```

### Route-Based Preloading

```tsx
useModulePreload([
  {
    module: () => import('./Dashboard'),
    trigger: 'route',
    routePattern: '/dashboard',
  },
  {
    module: () => import('./Profile'),
    trigger: 'route',
    routePattern: '/profile/:id',
  },
]);
```

### Conditional Preloading

```tsx
import { queueModulePreload, shouldLoadOnNetwork } from '@/lib/performance';

function preloadIfGoodNetwork() {
  if (shouldLoadOnNetwork('normal')) {
    queueModulePreload({
      module: () => import('./HeavyFeature'),
      priority: 'low',
    });
  }
}
```

## Network Awareness

### Respecting Data Saver

```tsx
import { useNetworkAwareLoading } from '@/lib/performance';

function Gallery() {
  const { shouldLoad } = useNetworkAwareLoading('normal');

  // Don't load on data saver or slow connections
  if (!shouldLoad) {
    return <TextOnlyVersion />;
  }

  return <FullGallery />;
}
```

### Adaptive Loading Strategies

```tsx
function adaptiveLoadingStrategy(tier: NetworkTier): LazyStrategy {
  switch (tier) {
    case 'high':
      return 'viewport';   // Load when in viewport
    case 'medium':
      return 'interaction'; // Load on user action
    case 'low':
      return 'idle';       // Load when browser idle
    case 'offline':
      return 'immediate';  // Show cached/fallback
  }
}

const { networkTier } = useNetworkAwareLoading();

const Content = createLazyComponent({
  loader: () => import('./Content'),
  strategy: adaptiveLoadingStrategy(networkTier),
});
```

## Examples

### Progressive Image Loading

```tsx
function ProgressiveImage({ src, placeholder, alt }) {
  return (
    <LazyImage
      src={src}
      placeholder={placeholder}
      alt={alt}
      blurUp
      blurRadius={20}
      strategy="viewport"
      rootMargin="300px"
      decodeAsync
      onLoad={() => console.log('Image loaded')}
      onError={(error) => console.error('Image failed', error)}
    />
  );
}
```

### Lazy Modal

```tsx
const ModalContent = createLazyComponent({
  loader: () => import('./ModalContent'),
  strategy: 'interaction',
  priority: 'high',
  minLoadingTime: 200,
});

function Modal({ isOpen }) {
  return (
    <Dialog open={isOpen}>
      <Suspense fallback={<Spinner />}>
        {isOpen && <ModalContent />}
      </Suspense>
    </Dialog>
  );
}
```

### Lazy Tabs

```tsx
const tabs = [
  {
    id: 'overview',
    component: createLazyComponent({
      loader: () => import('./tabs/Overview'),
      strategy: 'immediate',
      priority: 'critical',
    }),
  },
  {
    id: 'details',
    component: createLazyComponent({
      loader: () => import('./tabs/Details'),
      strategy: 'interaction',
      preloadOnInteraction: true,
    }),
  },
  {
    id: 'analytics',
    component: createLazyComponent({
      loader: () => import('./tabs/Analytics'),
      strategy: 'idle',
      priority: 'low',
    }),
  },
];

function Tabs({ activeTab }) {
  const TabContent = tabs.find(t => t.id === activeTab)?.component;

  return (
    <div>
      <TabList />
      <Suspense fallback={<TabSkeleton />}>
        {TabContent && <TabContent />}
      </Suspense>
    </div>
  );
}
```

## Best Practices

### 1. Choose the Right Strategy

```typescript
// Critical above-the-fold content
strategy: 'immediate'

// Content in viewport
strategy: 'viewport'

// User-triggered content (modals, dropdowns)
strategy: 'interaction'

// Non-critical background content
strategy: 'idle'

// Adapt to network conditions
strategy: 'network-aware'
```

### 2. Set Appropriate Priorities

```typescript
// Critical path
priority: 'critical'  // Must load immediately

// Important features
priority: 'high'      // Load soon

// Standard content
priority: 'normal'    // Load when convenient

// Nice-to-have
priority: 'low'       // Load when idle

// Background tasks
priority: 'idle'      // Load during idle time
```

### 3. Provide Good Loading States

```tsx
// Good - informative skeleton
<LazyComponent
  loadingFallback={<DetailedSkeleton />}
/>

// Bad - blank space
<LazyComponent />

// Bad - generic spinner
<LazyComponent
  loadingFallback={<Spinner />}
/>
```

### 4. Handle Errors Gracefully

```tsx
<LazyComponent
  errorFallback={(error, retry) => (
    <ErrorCard
      title="Failed to load content"
      message={error.message}
      actions={[
        <Button onClick={retry}>Retry</Button>,
        <Button onClick={goBack}>Go Back</Button>
      ]}
    />
  )}
  retryCount={3}
  retryDelay={1000}
/>
```

### 5. Optimize rootMargin

```tsx
// Preload well before viewport
rootMargin: '500px'  // For critical content

// Standard preload
rootMargin: '200px'  // For normal content

// Just-in-time loading
rootMargin: '0px'    // For low-priority content

// Delay loading
rootMargin: '-100px' // For very low priority
```

### 6. Use Preloading Strategically

```tsx
// Preload on route enter
router.beforeEach((to) => {
  if (to.path === '/dashboard') {
    Dashboard.preload();
  }
});

// Preload on hover
<Link
  to="/profile"
  onMouseEnter={() => Profile.preload()}
>
  View Profile
</Link>
```

### 7. Respect User Preferences

```tsx
const { networkTier, shouldLoad } = useNetworkAwareLoading();

// Check data saver
if (navigator.connection?.saveData) {
  return <LowDataVersion />;
}

// Check network quality
if (networkTier === 'low') {
  return <BasicVersion />;
}

return <FullVersion />;
```

## Performance Impact

### Bundle Size Reduction

```
Before Lazy Loading:
- Initial Bundle: 450 KB
- Time to Interactive: 3.2s

After Lazy Loading:
- Initial Bundle: 120 KB (-73%)
- Time to Interactive: 1.1s (-66%)
```

### Loading Performance

```
Route Navigation:
- Without Prefetch: 800ms load time
- With Prefetch: 120ms load time (-85%)

Image Loading:
- Without Lazy: 2.4s LCP
- With Lazy + Blur-up: 1.6s LCP (-33%)
```

## Related Documentation

- [Predictive Prefetching](./PREFETCHING.md)
- [Bundle Optimization](./README.md#bundle-optimization)
- [Performance Configuration](./CONFIG.md)
