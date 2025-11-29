# UX Utilities

> Enhanced user experience utilities for loading states, skeleton screens, accessibility, error recovery, and progressive enhancement

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Core Features](#core-features)
  - [Skeleton Screens](#skeleton-screens)
  - [Loading States](#loading-states)
  - [Accessibility](#accessibility)
  - [Error Recovery](#error-recovery)
  - [Progressive Enhancement](#progressive-enhancement)
- [Documentation](#documentation)
- [Related Resources](#related-resources)

## Overview

The UX Utilities module provides a comprehensive suite of tools for creating exceptional user experiences. It includes skeleton screens for perceived performance, intelligent loading state management, accessibility enhancements, error recovery patterns, and progressive enhancement utilities.

## Quick Start

```typescript
import {
  // Skeleton screens
  createCardSkeleton,
  createListSkeleton,
  SkeletonFactory,

  // Loading states
  LoadingIndicator,
  ProgressiveLoader,
  ProgressBar,
  useLoadingState,

  // Accessibility
  announce,
  createFocusTrap,
  prefersReducedMotion,

  // Error recovery
  ErrorRecovery,
  OfflineRecovery,

  // Progressive enhancement
  ProgressiveEnhancementProvider,
  useCapability
} from '@missionfabric-js/enzyme/ux';
```

## Core Features

### Skeleton Screens

Dynamic skeleton screen generation with pre-built patterns and custom configurations.

**Key Capabilities:**
- Pre-built patterns (article, profile, card, list, table)
- Custom skeleton creation
- Animation variants (pulse, wave, shimmer, none)
- Responsive layouts
- Theme integration

**Example:**

```typescript
import { createCardSkeleton, createListSkeleton } from '@missionfabric-js/enzyme/ux';

function LoadingView() {
  return (
    <div>
      {createCardSkeleton({ hasImage: true, textLines: 3 })}
      {createListSkeleton({ items: 5, hasAvatar: true })}
    </div>
  );
}
```

**📖 Full Documentation:** [Skeleton Factory](/home/user/enzyme/docs/ux/SKELETON_FACTORY.md)

### Loading States

Intelligent loading state management with progressive indicators and timeout handling.

**Key Capabilities:**
- Progressive loading phases (spinner → skeleton → message)
- Minimum display time to prevent flash
- Timeout detection and handling
- Progress tracking (determinate and indeterminate)
- Screen reader announcements
- Context-based state management

**Example:**

```typescript
import { ProgressiveLoader } from '@missionfabric-js/enzyme/ux';

function DataView() {
  const { data, isLoading, error, refetch } = useQuery('data');

  return (
    <ProgressiveLoader
      loading={isLoading}
      error={error}
      spinnerPlaceholder={<Spinner />}
      skeletonPlaceholder={<DataSkeleton />}
      onRetry={refetch}
    >
      <DataDisplay data={data} />
    </ProgressiveLoader>
  );
}
```

**📖 Full Documentation:** [Loading States](/home/user/enzyme/docs/ux/LOADING_STATES.md)

### Accessibility

Comprehensive accessibility utilities for WCAG compliance.

**Key Capabilities:**
- Screen reader announcements
- Focus management and trapping
- Roving tabindex for keyboard navigation
- Skip links for keyboard users
- ARIA attribute helpers
- Reduced motion support
- Color contrast checking

**Example:**

```typescript
import { announce, createFocusTrap, prefersReducedMotion } from '@missionfabric-js/enzyme/ux';

// Screen reader announcements
announce('Data loaded successfully');

// Focus trap for modals
const trap = createFocusTrap({
  container: modalElement,
  escapeDeactivates: true,
  onEscape: closeModal
});
trap.activate();

// Respect motion preferences
const shouldAnimate = !prefersReducedMotion();
```

**📖 Full Documentation:** [Accessibility](/home/user/enzyme/docs/ux/ACCESSIBILITY.md)

## Error Recovery

### ErrorRecovery Component

Comprehensive error handling with recovery options.

```tsx
import { ErrorRecovery } from '@missionfabric-js/enzyme/ux';

function DataDisplay() {
  const { data, error, retry } = useQuery('data');

  return (
    <ErrorRecovery
      error={error}
      onRetry={retry}
      autoRetry
      maxAutoRetries={3}
      autoRetryDelay={5000}
      showTechnicalDetails
    >
      {data && <DataTable data={data} />}
    </ErrorRecovery>
  );
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `error` | `Error \| null` | - | Current error |
| `category` | `ErrorCategory` | Auto-detected | Error type |
| `message` | `string` | - | Custom error message |
| `onRetry` | `() => void \| Promise<void>` | - | Retry callback |
| `onReset` | `() => void` | - | Reset/dismiss callback |
| `onNavigate` | `(path: string) => void` | - | Navigation callback |
| `actions` | `RecoveryAction[]` | - | Custom actions |
| `autoRetry` | `boolean` | `false` | Enable auto-retry |
| `autoRetryDelay` | `number` | `5000` | Auto-retry delay (ms) |
| `maxAutoRetries` | `number` | `3` | Max auto-retry attempts |
| `showTechnicalDetails` | `boolean` | `isDev()` | Show error stack |
| `fullScreen` | `boolean` | `false` | Full-screen error |
| `compact` | `boolean` | `false` | Compact mode |

#### Error Categories

Errors are automatically classified:

- `network` - Connection errors
- `auth` - Authentication required
- `permission` - Access denied
- `notFound` - Resource not found (404)
- `timeout` - Request timeout
- `server` - Server errors (500+)
- `validation` - Input validation errors
- `unknown` - Uncategorized errors

### OfflineRecovery Component

Handle offline states gracefully.

```tsx
import { OfflineRecovery } from '@missionfabric-js/enzyme/ux';

function App() {
  return (
    <OfflineRecovery
      pendingActions={pendingSync.length}
      lastSync={lastSyncTime}
      onForceRetry={syncNow}
      offlineMessage="You're offline. Changes will sync when you're back online."
    >
      <YourApp />
    </OfflineRecovery>
  );
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `pendingActions` | `number` | - | Number of pending actions |
| `lastSync` | `number` | - | Last sync timestamp |
| `onForceRetry` | `() => void` | - | Force retry callback |
| `offlineMessage` | `string` | - | Custom offline message |
| `children` | `ReactNode` | - | Child content |

### DegradedState Component

Indicate partial feature availability.

```tsx
import { DegradedState } from '@missionfabric-js/enzyme/ux';

function App() {
  const unavailableFeatures = ['real-time-updates', 'notifications'];

  return (
    <DegradedState
      unavailableFeatures={unavailableFeatures}
      reason="Server maintenance in progress"
      estimatedRecoveryTime="2 hours"
      onDismiss={() => setDismissed(true)}
    >
      <YourApp />
    </DegradedState>
  );
}
```

### Error Classification Utilities

```tsx
import {
  classifyError,
  getUserMessage,
  getRecoverySuggestions,
  isRetryable
} from '@missionfabric-js/enzyme/ux';

const error = new Error('Network request failed');

const category = classifyError(error);
// => 'network'

const message = getUserMessage(category, error);
// => 'Unable to connect to the server. Please check your internet connection and try again.'

const suggestions = getRecoverySuggestions(category);
// => ['Check your internet connection', 'Try refreshing the page', ...]

const canRetry = isRetryable(category);
// => true
```

## Loading States

### LoadingProvider

Manage application-wide loading states.

```tsx
import { LoadingProvider } from '@missionfabric-js/enzyme/ux';

function App() {
  return (
    <LoadingProvider
      config={{
        minDisplayTime: 300,
        spinnerDelay: 100,
        skeletonDelay: 500,
        messageDelay: 2000,
        timeoutThreshold: 10000,
        announceChanges: true
      }}
      onTimeout={() => console.log('Loading timeout')}
    >
      <YourApp />
    </LoadingProvider>
  );
}
```

### LoadingIndicator Component

Simple loading indicator with delay and minimum display time.

```tsx
import { LoadingIndicator } from '@missionfabric-js/enzyme/ux';

function DataView() {
  const { isLoading } = useQuery('data');

  return (
    <div>
      <LoadingIndicator
        loading={isLoading}
        minDisplayTime={300}
        delay={100}
        message="Loading data..."
        size="md"
        overlay
      />
      <Content />
    </div>
  );
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `loading` | `boolean` | `false` | Loading state |
| `minDisplayTime` | `number` | `300` | Min display time (ms) |
| `delay` | `number` | `100` | Delay before showing (ms) |
| `message` | `string` | - | Loading message |
| `showSpinner` | `boolean` | `true` | Show spinner |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Spinner size |
| `overlay` | `boolean` | `false` | Overlay mode |
| `fullScreen` | `boolean` | `false` | Full-screen mode |

### ProgressiveLoader Component

Phased loading with progressive placeholders.

```tsx
import { ProgressiveLoader } from '@missionfabric-js/enzyme/ux';

function Page() {
  const { data, isLoading, error } = useQuery('page-data');

  return (
    <ProgressiveLoader
      loading={isLoading}
      error={error}
      initialPlaceholder={null}
      spinnerPlaceholder={<Spinner />}
      skeletonPlaceholder={<PageSkeleton />}
      timeoutMessage={<div>Taking longer than expected...</div>}
      errorFallback={(error, retry) => (
        <ErrorDisplay error={error} onRetry={retry} />
      )}
      onRetry={refetch}
    >
      <PageContent data={data} />
    </ProgressiveLoader>
  );
}
```

### ProgressBar Component

Progress indicator for determinate loading.

```tsx
import { ProgressBar } from '@missionfabric-js/enzyme/ux';

function Upload() {
  const [progress, setProgress] = useState(0);

  return (
    <div>
      <ProgressBar
        value={progress}
        showPercentage
        size="md"
        variant="primary"
        animated
        striped
        label="Uploading..."
      />
    </div>
  );
}
```

### Loading Hooks

#### useLoadingState

Manage loading state with automatic timing.

```tsx
import { useLoadingState } from '@missionfabric-js/enzyme/ux';

function AsyncOperation() {
  const {
    isLoading,
    phase,
    error,
    startLoading,
    stopLoading,
    setError,
    reset,
    wrapAsync
  } = useLoadingState();

  const handleClick = async () => {
    try {
      await wrapAsync(fetchData());
    } catch (err) {
      // Error handled automatically
    }
  };

  return (
    <div>
      {isLoading && <Spinner />}
      {phase === 'timeout' && <TimeoutMessage />}
      {error && <ErrorMessage error={error} />}
      <button onClick={handleClick}>Load Data</button>
    </div>
  );
}
```

## Progressive Enhancement

### ProgressiveEnhancementProvider

Detect browser capabilities and progressively enable features.

```tsx
import { ProgressiveEnhancementProvider } from '@missionfabric-js/enzyme/ux';

function App() {
  return (
    <ProgressiveEnhancementProvider
      features={[
        {
          id: 'webgl',
          name: 'WebGL Graphics',
          requires: ['webgl'],
          loader: () => import('./WebGLComponent')
        },
        {
          id: 'webp',
          name: 'WebP Images',
          requires: ['webP'],
          loader: () => import('./WebPImage'),
          fallbackLoader: () => import('./JpegImage')
        }
      ]}
      onCapabilitiesDetected={(caps) => console.log('Capabilities:', caps)}
    >
      <YourApp />
    </ProgressiveEnhancementProvider>
  );
}
```

### CapabilityGate Component

Conditionally render based on browser capabilities.

```tsx
import { CapabilityGate } from '@missionfabric-js/enzyme/ux';

function ImageGallery() {
  return (
    <>
      <CapabilityGate
        capability="webP"
        fallback={<JpegImage />}
      >
        <WebPImage />
      </CapabilityGate>

      <CapabilityGate
        capability="webgl"
        fallback={<CanvasVisualization />}
      >
        <WebGLVisualization />
      </CapabilityGate>
    </>
  );
}
```

### FeatureGate Component

Load and render features when available.

```tsx
import { FeatureGate } from '@missionfabric-js/enzyme/ux';

function AdvancedEditor() {
  return (
    <FeatureGate
      featureId="rich-editor"
      loading={<EditorSkeleton />}
      fallback={<BasicTextarea />}
      errorFallback={(error) => <div>Editor unavailable: {error.message}</div>}
    >
      {(EditorModule) => <EditorModule.default />}
    </FeatureGate>
  );
}
```

### Progressive Enhancement Hooks

```tsx
import {
  useCapability,
  useCapabilities,
  useProgressiveFeature
} from '@missionfabric-js/enzyme/ux';

function Component() {
  // Check single capability
  const hasWebP = useCapability('webP');

  // Check multiple capabilities
  const caps = useCapabilities();

  // Load feature on demand
  const { module, level, loading, error } = useProgressiveFeature('advanced-chart');

  return (
    <div>
      {hasWebP ? <WebPImage /> : <JpegImage />}
      {caps.webgl && <WebGLCanvas />}
      {module && <module.Chart />}
    </div>
  );
}
```

## Examples

### Complete Error Handling

```tsx
import { ErrorRecovery, OfflineRecovery } from '@missionfabric-js/enzyme/ux';

function DataDashboard() {
  const { data, error, isLoading, refetch } = useQuery('dashboard');
  const navigate = useNavigate();

  return (
    <OfflineRecovery pendingActions={0}>
      <ErrorRecovery
        error={error}
        onRetry={refetch}
        onNavigate={navigate}
        autoRetry
        maxAutoRetries={3}
        actions={[
          {
            id: 'refresh',
            label: 'Refresh Page',
            action: () => window.location.reload()
          },
          {
            id: 'support',
            label: 'Contact Support',
            action: () => navigate('/support')
          }
        ]}
      >
        {isLoading ? <DashboardSkeleton /> : <Dashboard data={data} />}
      </ErrorRecovery>
    </OfflineRecovery>
  );
}
```

### Progressive Loading Experience

```tsx
import { ProgressiveLoader, useLoadingState } from '@missionfabric-js/enzyme/ux';

function ProductPage({ productId }) {
  const { isLoading, error, wrapAsync } = useLoadingState();
  const [product, setProduct] = useState(null);

  useEffect(() => {
    wrapAsync(
      fetchProduct(productId).then(setProduct)
    );
  }, [productId, wrapAsync]);

  return (
    <ProgressiveLoader
      loading={isLoading}
      error={error}
      spinnerPlaceholder={<Spinner size="lg" />}
      skeletonPlaceholder={<ProductSkeleton />}
      timeoutMessage={
        <div>
          <p>This is taking longer than usual...</p>
          <p>Please wait or try refreshing the page.</p>
        </div>
      }
      errorFallback={(error, retry) => (
        <ErrorRecovery error={error} onRetry={retry} />
      )}
    >
      {product && <ProductDetails product={product} />}
    </ProgressiveLoader>
  );
}
```

### Feature Detection and Fallbacks

```tsx
import {
  ProgressiveEnhancementProvider,
  CapabilityGate,
  useCapability
} from '@missionfabric-js/enzyme/ux';

function ImageOptimized({ src, alt }) {
  const supportsWebP = useCapability('webP');
  const supportsAVIF = useCapability('avif');

  const imageSrc = supportsAVIF
    ? src.replace('.jpg', '.avif')
    : supportsWebP
    ? src.replace('.jpg', '.webp')
    : src;

  return <img src={imageSrc} alt={alt} />;
}

function App() {
  return (
    <ProgressiveEnhancementProvider>
      <CapabilityGate
        capability="serviceWorker"
        fallback={<div>Offline mode unavailable</div>}
      >
        <OfflineEnabledApp />
      </CapabilityGate>
    </ProgressiveEnhancementProvider>
  );
}
```

## Best Practices

1. **Always Handle Errors**: Use ErrorRecovery for async operations
2. **Show Loading States**: Provide feedback during async operations
3. **Minimum Display Time**: Prevent flash of loading content
4. **Progressive Enhancement**: Start with basic functionality, enhance when available
5. **Accessible**: Use ARIA attributes and screen reader announcements
6. **Offline Support**: Handle network issues gracefully

## Documentation

### Detailed Guides

- **[Skeleton Factory](/home/user/enzyme/docs/ux/SKELETON_FACTORY.md)** - Dynamic skeleton screen generation
- **[Loading States](/home/user/enzyme/docs/ux/LOADING_STATES.md)** - Intelligent loading state management
- **[Accessibility](/home/user/enzyme/docs/ux/ACCESSIBILITY.md)** - Comprehensive accessibility utilities

### Related Documentation

- **[UI Components](/home/user/enzyme/docs/ui/README.md)** - Accessible UI component library
- **[Theme System](/home/user/enzyme/docs/theme/README.md)** - Theming and design tokens
- **[Dark Mode](/home/user/enzyme/docs/theme/DARK_MODE.md)** - Dark mode implementation
- **[Feedback Components](/home/user/enzyme/docs/ui/FEEDBACK_COMPONENTS.md)** - Loading spinners and overlays

## Related Resources

### Internal

- [Advanced Features](../advanced/README.md) - Advanced UX patterns
- [Design System](../ui/README.md) - Complete design system
- [Performance](../performance/README.md) - Performance optimization

### External

- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) - Web accessibility standards
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) - ARIA patterns and examples
- [React Accessibility](https://react.dev/learn/accessibility) - React accessibility guide

---

**Version:** 3.0.0
**Last Updated:** 2025-11-29
