# Layouts Module

> Responsive layout components and adaptive layouts.

## Overview

The layouts module provides responsive layout primitives, adaptive containers, and layout templates that adjust based on viewport and device capabilities.

## Quick Start

```tsx
import {
  AppLayout,
  SidebarLayout,
  ResponsiveContainer,
  useLayoutContext
} from '@/lib/layouts';

function App() {
  return (
    <AppLayout
      header={<Header />}
      sidebar={<Sidebar />}
      footer={<Footer />}
    >
      <MainContent />
    </AppLayout>
  );
}

function MainContent() {
  const { isMobile, sidebarCollapsed } = useLayoutContext();

  return (
    <ResponsiveContainer
      mobile={<MobileView />}
      desktop={<DesktopView />}
    />
  );
}
```

## Exports

| Export | Type | Description |
|--------|------|-------------|
| `AppLayout` | Component | Main application layout |
| `SidebarLayout` | Component | Sidebar-based layout |
| `ResponsiveContainer` | Component | Viewport-aware container |
| `useLayoutContext` | Hook | Access layout state |

## See Also

- [UI Components](../ui/README.md)
- [Architecture](../docs/ARCHITECTURE.md)
