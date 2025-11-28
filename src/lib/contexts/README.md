# Contexts Module

> Shared React contexts for cross-cutting concerns.

## Overview

The contexts module provides shared React contexts used across the library for hydration, error boundaries, and other cross-cutting concerns.

## Quick Start

```tsx
import {
  HydrationContext,
  ErrorBoundaryContext,
  useHydrationContext
} from '@/lib/contexts';

function HydrationAwareComponent() {
  const hydration = useHydrationContext();

  if (!hydration?.isHydrated) {
    return <Skeleton />;
  }

  return <InteractiveContent />;
}
```

## Exports

| Export | Type | Description |
|--------|------|-------------|
| `HydrationContext` | Context | Hydration state context |
| `ErrorBoundaryContext` | Context | Error boundary context |
| `useHydrationContext` | Hook | Access hydration context |
| `useErrorBoundaryContext` | Hook | Access error boundary context |

## See Also

- [Hydration](../hydration/README.md)
- [Monitoring](../monitoring/)
