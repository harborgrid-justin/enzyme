# Coordination Module

> Cross-cutting concerns coordination and dependency injection.

## Overview

The coordination module handles provider orchestration, hook composition, state coordination, and context bridging
across the application.

## Quick Start

```tsx
import {
  useComposedHooks,
  useContextBridge,
  StateCoordinator
} from '@/lib/coordination';

// Compose multiple hooks
function Dashboard() {
  const { auth, theme, notifications } = useComposedHooks({
    auth: useAuth,
    theme: useTheme,
    notifications: useNotifications,
  });

  return <DashboardView {...{ auth, theme, notifications }} />;
}
```

## Exports

| Export                 | Type      | Description                       |
|------------------------|-----------|-----------------------------------|
| `useComposedHooks`     | Hook      | Compose multiple hooks            |
| `useContextBridge`     | Hook      | Bridge contexts across boundaries |
| `StateCoordinator`     | Class     | Coordinate state across slices    |
| `ProviderOrchestrator` | Component | Orchestrate provider nesting      |

## Important

Event bus functionality has been consolidated into `@/lib/shared/event-utils`. Import from there instead.

## See Also

- [Architecture](../docs/ARCHITECTURE.md)
- [State Management](../docs/STATE_MANAGEMENT.md)
