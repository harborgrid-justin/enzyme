# UX Utilities

Enhanced user experience utilities for error recovery, loading states, and progressive enhancement.

## Table of Contents

- [Overview](#overview)
- [Error Recovery](#error-recovery)
- [Loading States](#loading-states)
- [Progressive Enhancement](#progressive-enhancement)
- [Examples](#examples)

## Overview

The UX Utilities module provides robust, user-friendly components and hooks for handling errors, loading states, and progressive feature availability.

### Key Features

- **Intelligent Error Recovery**: Automatic retry with exponential backoff
- **Progressive Loading**: Phased loading indicators
- **Offline Support**: Graceful degradation when offline
- **Accessibility**: ARIA attributes and screen reader support
- **Customizable**: Flexible styling and behavior

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

## API Reference

See the [Advanced Features Overview](../advanced/README.md) for complete API documentation.
