# Streaming Module

> Progressive streaming data handling with backpressure management.

## Overview

The streaming module provides React components and hooks for handling streaming data sources with proper backpressure, chunked responses, and progressive rendering.

## Quick Start

```tsx
import { StreamProvider, StreamBoundary, useStream } from '@/lib/streaming';

function App() {
  return (
    <StreamProvider>
      <StreamingContent />
    </StreamProvider>
  );
}

function StreamingContent() {
  const { state, isStreaming, start, pause, resume, abort } = useStream('content');

  return (
    <StreamBoundary
      boundaryId="content"
      fallback={<Loading />}
      onComplete={() => console.log('Stream complete')}
    >
      <DataDisplay />
    </StreamBoundary>
  );
}
```

## Exports

| Export | Type | Description |
|--------|------|-------------|
| `StreamProvider` | Component | Context provider for streaming system |
| `StreamBoundary` | Component | Boundary for streaming content |
| `useStream` | Hook | Control and monitor streams |
| `useStreamStatus` | Hook | Stream status monitoring |
| `useStreamPriority` | Hook | Priority management |
| `useDeferredStream` | Hook | Deferred stream loading |

## See Also

- [Architecture](../docs/ARCHITECTURE.md)
- [Performance](../docs/PERFORMANCE.md)
