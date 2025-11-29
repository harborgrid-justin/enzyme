# Loading States

> Intelligent loading state management with progressive enhancement, timeout handling, and accessibility support

## Overview

The Loading States module provides comprehensive loading indicators and state management for asynchronous operations. It includes progressive loading phases, minimum display times, timeout handling, and integration with skeleton screens for an optimal user experience.

## Location

```
/home/user/enzyme/src/lib/ux/loading-states.tsx
```

## Key Features

- **Progressive Loading**: Phased indicators (spinner → skeleton → message)
- **Minimum Display Time**: Prevents loading flash for fast operations
- **Timeout Handling**: Alerts users when operations take too long
- **Loading Context**: Application-wide loading state management
- **Progress Tracking**: Determinate and indeterminate progress bars
- **Accessibility**: Screen reader announcements and ARIA attributes
- **Customizable**: Flexible configuration and styling

## Components

### LoadingProvider

Context provider for managing application-wide loading states.

```typescript
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
      onError={(error) => console.error('Loading error:', error)}
    >
      <YourApp />
    </LoadingProvider>
  );
}
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | App content |
| `config` | `Partial<LoadingConfig>` | See defaults | Loading configuration |
| `onTimeout` | `() => void` | - | Timeout callback |
| `onError` | `(error: Error) => void` | - | Error callback |

**Default Configuration:**

```typescript
{
  minDisplayTime: 300,        // Min ms to show loading
  spinnerDelay: 100,          // Delay before showing spinner
  skeletonDelay: 500,         // Delay before showing skeleton
  messageDelay: 2000,         // Delay before showing message
  timeoutThreshold: 10000,    // Timeout after 10 seconds
  announceChanges: true       // Screen reader announcements
}
```

### LoadingIndicator

Simple loading indicator with delay and minimum display time.

```typescript
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

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `loading` | `boolean` | `false` | Loading state |
| `minDisplayTime` | `number` | `300` | Min display time (ms) |
| `delay` | `number` | `100` | Delay before showing (ms) |
| `message` | `string` | - | Loading message |
| `showSpinner` | `boolean` | `true` | Show spinner |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Spinner size |
| `spinner` | `ReactNode` | - | Custom spinner component |
| `overlay` | `boolean` | `false` | Overlay mode |
| `fullScreen` | `boolean` | `false` | Full-screen mode |
| `className` | `string` | `''` | Additional classes |

**Sizes:**
- `sm` - Small spinner (0.875rem)
- `md` - Medium spinner (1rem)
- `lg` - Large spinner (1.25rem)

### ProgressiveLoader

Progressive loader with phased placeholders for optimal UX.

```typescript
import { ProgressiveLoader } from '@missionfabric-js/enzyme/ux';

function Page() {
  const { data, isLoading, error, refetch } = useQuery('page-data');

  return (
    <ProgressiveLoader
      loading={isLoading}
      error={error}
      initialPlaceholder={null}
      spinnerPlaceholder={<Spinner size="lg" />}
      skeletonPlaceholder={<PageSkeleton />}
      timeoutMessage={
        <div>
          <p>Taking longer than expected...</p>
          <button onClick={refetch}>Retry</button>
        </div>
      }
      errorFallback={(error, retry) => (
        <ErrorDisplay error={error} onRetry={retry} />
      )}
      onRetry={refetch}
      config={{
        spinnerDelay: 200,
        skeletonDelay: 1000,
        timeoutThreshold: 15000
      }}
    >
      <PageContent data={data} />
    </ProgressiveLoader>
  );
}
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `loading` | `boolean` | - | Loading state |
| `error` | `Error \| null` | - | Error state |
| `children` | `ReactNode` | - | Success component |
| `initialPlaceholder` | `ReactNode` | - | Initial (0-100ms) |
| `spinnerPlaceholder` | `ReactNode` | - | Spinner phase (100-500ms) |
| `skeletonPlaceholder` | `ReactNode` | - | Skeleton phase (500-2000ms) |
| `timeoutMessage` | `ReactNode` | - | Timeout message (10s+) |
| `errorFallback` | `(error, retry) => ReactNode` | - | Error component |
| `config` | `Partial<LoadingConfig>` | - | Config override |
| `onRetry` | `() => void` | - | Retry function |

**Loading Phases:**

1. **Initial (0-100ms)**: Nothing shown (for fast loads)
2. **Spinner (100-500ms)**: Simple spinner
3. **Skeleton (500-2000ms)**: Skeleton screen
4. **Message (2000ms+)**: Skeleton + "Still loading..." message
5. **Timeout (10000ms+)**: Timeout message with retry

### ProgressBar

Progress bar component for determinate loading states.

```typescript
import { ProgressBar } from '@missionfabric-js/enzyme/ux';

function Upload() {
  const [progress, setProgress] = useState(0);

  return (
    <div>
      <h3>Uploading file...</h3>
      <ProgressBar
        value={progress}
        showPercentage
        size="md"
        variant="primary"
        animated
        striped
        label="Upload progress"
      />
    </div>
  );
}
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | - | Progress value (0-100) |
| `showPercentage` | `boolean` | `false` | Show percentage text |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Bar size |
| `variant` | `'primary' \| 'success' \| 'warning' \| 'error'` | `'primary'` | Color variant |
| `animated` | `boolean` | `false` | Animated progress |
| `striped` | `boolean` | `false` | Striped pattern |
| `indeterminate` | `boolean` | `false` | Indeterminate state |
| `label` | `string` | `'Progress'` | ARIA label |
| `className` | `string` | `''` | Additional classes |

**Sizes:**
- `sm` - 0.25rem height
- `md` - 0.5rem height
- `lg` - 1rem height

**Variants:**
- `primary` - Blue (#3b82f6)
- `success` - Green (#22c55e)
- `warning` - Orange (#f59e0b)
- `error` - Red (#ef4444)

**Indeterminate Mode:**

```typescript
<ProgressBar
  value={0}
  indeterminate
  variant="primary"
  label="Processing..."
/>
```

## Hooks

### useLoading

Access loading context from LoadingProvider.

```typescript
import { useLoading } from '@missionfabric-js/enzyme/ux';

function Component() {
  const {
    state,
    phase,
    message,
    progress,
    error,
    startLoading,
    stopLoading,
    setProgress,
    setError,
    reset
  } = useLoading();

  const handleSubmit = async () => {
    startLoading('Saving...');
    try {
      await saveData();
      stopLoading();
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div>
      {state === 'loading' && <p>Phase: {phase}</p>}
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}
```

**Returns:**

```typescript
{
  state: 'idle' | 'loading' | 'success' | 'error' | 'timeout',
  phase: 'initial' | 'spinner' | 'skeleton' | 'message' | 'timeout',
  message: string | null,
  progress: number | null,
  error: Error | null,
  startLoading: (message?: string) => void,
  stopLoading: () => void,
  setProgress: (progress: number) => void,
  setError: (error: Error) => void,
  reset: () => void
}
```

### useLoadingState

Standalone loading state management without provider.

```typescript
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
  } = useLoadingState({
    minDisplayTime: 300,
    timeoutThreshold: 5000
  });

  const handleClick = async () => {
    try {
      const result = await wrapAsync(fetchData());
      console.log(result);
    } catch (err) {
      // Error handled automatically
    }
  };

  return (
    <div>
      {isLoading && <Spinner />}
      {phase === 'timeout' && <TimeoutMessage />}
      {error && <ErrorMessage error={error} onRetry={reset} />}
      <button onClick={handleClick}>Load Data</button>
    </div>
  );
}
```

**Returns:**

```typescript
{
  isLoading: boolean,
  phase: LoadingPhase,
  error: Error | null,
  startLoading: () => void,
  stopLoading: () => void,
  setError: (error: Error) => void,
  reset: () => void,
  wrapAsync: <T>(promise: Promise<T>) => Promise<T>
}
```

## Loading States

### State Types

```typescript
type LoadingState =
  | 'idle'      // No loading
  | 'loading'   // Currently loading
  | 'success'   // Completed successfully
  | 'error'     // Failed with error
  | 'timeout';  // Timed out
```

### Phase Types

```typescript
type LoadingPhase =
  | 'initial'   // 0-100ms: Nothing shown
  | 'spinner'   // 100-500ms: Spinner
  | 'skeleton'  // 500-2000ms: Skeleton screen
  | 'message'   // 2000ms+: Message + skeleton
  | 'timeout';  // 10000ms+: Timeout alert
```

## Patterns

### Pattern 1: Simple Loading

```typescript
function SimpleList() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div>
      <LoadingIndicator loading={isLoading} message="Loading items..." />
      {!isLoading && <ItemList />}
    </div>
  );
}
```

### Pattern 2: Progressive Loading

```typescript
function ProgressiveList() {
  const { data, isLoading, error } = useQuery('items');

  return (
    <ProgressiveLoader
      loading={isLoading}
      error={error}
      spinnerPlaceholder={<Spinner />}
      skeletonPlaceholder={<ListSkeleton items={5} />}
    >
      <ItemList data={data} />
    </ProgressiveLoader>
  );
}
```

### Pattern 3: With Progress Tracking

```typescript
function FileUpload() {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setIsUploading(true);

    await uploadFile(file, (percent) => {
      setProgress(percent);
    });

    setIsUploading(false);
  };

  return (
    <div>
      {isUploading && (
        <ProgressBar
          value={progress}
          showPercentage
          variant="primary"
          label="Uploading file"
        />
      )}
      <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
    </div>
  );
}
```

### Pattern 4: Overlay Loading

```typescript
function EditableContent() {
  const [isSaving, setIsSaving] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <LoadingIndicator
        loading={isSaving}
        overlay
        message="Saving changes..."
      />
      <Editor />
    </div>
  );
}
```

### Pattern 5: Full Page Loading

```typescript
function App() {
  const { isInitializing } = useAppInit();

  if (isInitializing) {
    return (
      <LoadingIndicator
        loading
        fullScreen
        message="Initializing application..."
        size="lg"
      />
    );
  }

  return <MainApp />;
}
```

### Pattern 6: Context-based Loading

```typescript
function Dashboard() {
  const { startLoading, stopLoading } = useLoading();

  const refreshData = async () => {
    startLoading('Refreshing dashboard...');
    try {
      await fetchDashboardData();
      stopLoading();
    } catch (error) {
      setError(error);
    }
  };

  return (
    <div>
      <button onClick={refreshData}>Refresh</button>
      <DashboardContent />
    </div>
  );
}
```

## Accessibility

### Screen Reader Announcements

Loading states automatically announce to screen readers when `announceChanges` is enabled:

```typescript
<LoadingProvider config={{ announceChanges: true }}>
  {/* "Loading started" announcement */}
  {/* "Loading complete" announcement */}
  {/* "Error: ..." announcement */}
</LoadingProvider>
```

### ARIA Attributes

All loading components include proper ARIA attributes:

```typescript
<LoadingIndicator
  loading={true}
  // Automatically adds:
  // role="status"
  // aria-live="polite"
  // aria-busy="true"
/>

<ProgressBar
  value={50}
  label="Upload progress"
  // Automatically adds:
  // role="progressbar"
  // aria-valuenow={50}
  // aria-valuemin={0}
  // aria-valuemax={100}
  // aria-label="Upload progress"
/>
```

### Reduced Motion

Respects user's motion preferences:

```typescript
import { prefersReducedMotion } from '@missionfabric-js/enzyme/ux';

<ProgressBar
  value={progress}
  animated={!prefersReducedMotion()}
  striped={!prefersReducedMotion()}
/>
```

## Best Practices

### 1. Use Progressive Loading for Slow Operations

```typescript
// Good: Shows skeleton for slow loads
<ProgressiveLoader
  loading={isLoading}
  skeletonPlaceholder={<ContentSkeleton />}
>
  <Content />
</ProgressiveLoader>

// Avoid: Just spinner for everything
<div>{isLoading ? <Spinner /> : <Content />}</div>
```

### 2. Set Appropriate Delays

```typescript
// Good: Delays prevent flash on fast loads
<LoadingIndicator loading={isLoading} delay={200} />

// Avoid: No delay causes jarring flash
<LoadingIndicator loading={isLoading} />
```

### 3. Provide Contextual Messages

```typescript
// Good: Specific messages
startLoading('Saving your changes...');
startLoading('Uploading 3 files...');

// Avoid: Generic messages
startLoading('Loading...');
```

### 4. Handle Timeouts

```typescript
// Good: Timeout handling
<LoadingProvider
  config={{ timeoutThreshold: 10000 }}
  onTimeout={() => showTimeoutMessage()}
>

// Avoid: No timeout handling
```

### 5. Use Minimum Display Time

```typescript
// Good: Prevents flash
const config = {
  minDisplayTime: 300  // Show for at least 300ms
};

// Avoid: Immediate hide causes flash
```

## Performance

- **Minimal Bundle**: ~5KB gzipped
- **Memoized Callbacks**: Stable function references
- **Timer Management**: Automatic cleanup
- **Progressive Enhancement**: Lazy load expensive placeholders
- **CSS Animations**: Hardware-accelerated

## Styling

### CSS Classes

```css
.loading-indicator { /* Base container */ }
.loading-indicator--sm { /* Small size */ }
.loading-indicator--md { /* Medium size */ }
.loading-indicator--lg { /* Large size */ }
.loading-indicator--overlay { /* Overlay mode */ }
.loading-indicator--fullscreen { /* Full screen */ }

.progress-bar { /* Progress bar container */ }
.progress-bar__fill { /* Progress fill */ }
.progress-bar--primary { /* Primary color */ }
.progress-bar--success { /* Success color */ }
.progress-bar--warning { /* Warning color */ }
.progress-bar--error { /* Error color */ }
.progress-bar--indeterminate { /* Indeterminate animation */ }
```

### Custom Styling

```typescript
<LoadingIndicator
  loading={isLoading}
  className="my-custom-loader"
  spinner={<CustomSpinner />}
/>
```

## Integration with Other Systems

### With React Query

```typescript
import { useQuery } from '@tanstack/react-query';
import { ProgressiveLoader } from '@missionfabric-js/enzyme/ux';

function DataDisplay() {
  const { data, isLoading, error, refetch } = useQuery('data', fetchData);

  return (
    <ProgressiveLoader
      loading={isLoading}
      error={error}
      onRetry={refetch}
      skeletonPlaceholder={<DataSkeleton />}
    >
      <DataTable data={data} />
    </ProgressiveLoader>
  );
}
```

### With Form Submissions

```typescript
import { useForm } from 'react-hook-form';
import { useLoadingState } from '@missionfabric-js/enzyme/ux';

function ContactForm() {
  const { register, handleSubmit } = useForm();
  const { isLoading, wrapAsync } = useLoadingState();

  const onSubmit = (data) => {
    wrapAsync(submitForm(data));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      <button disabled={isLoading}>
        {isLoading ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

### With Suspense

```typescript
import { Suspense } from 'react';
import { createListSkeleton } from '@missionfabric-js/enzyme/ux';

function App() {
  return (
    <Suspense fallback={createListSkeleton({ items: 5 })}>
      <AsyncComponent />
    </Suspense>
  );
}
```

## See Also

- [Skeleton Factory](/home/user/enzyme/docs/ux/SKELETON_FACTORY.md) - Skeleton screen generation
- [Accessibility](/home/user/enzyme/docs/ux/ACCESSIBILITY.md) - Accessibility features
- [Spinner Component](/home/user/enzyme/docs/ui/FEEDBACK_COMPONENTS.md#spinner) - Spinner component
- [Error Recovery](/home/user/enzyme/docs/ux/README.md#error-recovery) - Error handling

---

**Version:** 3.0.0
**Last Updated:** 2025-11-29
