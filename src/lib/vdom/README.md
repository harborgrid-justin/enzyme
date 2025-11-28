# VDOM Module

> Virtual DOM utilities and module federation support.

## Overview

The VDOM module provides virtual DOM pooling, module federation, and secure sandboxed component loading capabilities.

## Quick Start

```tsx
import { ModuleProvider, ModuleSlot, useModule } from '@/lib/vdom';

function App() {
  return (
    <ModuleProvider>
      <ModuleSlot
        moduleId="dashboard-widget"
        fallback={<WidgetSkeleton />}
      />
    </ModuleProvider>
  );
}

function DynamicModule() {
  const { module, isLoading, error } = useModule('remote-component');

  if (isLoading) return <Loading />;
  if (error) return <Error error={error} />;

  return <module.Component />;
}
```

## Exports

| Export | Type | Description |
|--------|------|-------------|
| `ModuleProvider` | Component | Context provider for module system |
| `ModuleSlot` | Component | Render slot for dynamic modules |
| `ModuleBoundary` | Component | Error boundary for modules |
| `useModule` | Hook | Load and access modules |
| `useSecureModule` | Hook | Sandboxed module loading |
| `useModuleState` | Hook | Module state management |

## See Also

- [Architecture](../docs/ARCHITECTURE.md)
