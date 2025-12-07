# Types Module

> DOM extensions and browser API type definitions.

## Overview

The types module provides TypeScript type definitions for non-standard browser APIs and DOM extensions used throughout
the library.

## Quick Start

```tsx
import type {
  ExtendedNavigator,
  NavigatorWithConnection,
  NetworkInformation,
  PerformanceMemory
} from '@/lib/types';

function useNetworkInfo() {
  const navigator = window.navigator as ExtendedNavigator;
  const connection = navigator.connection;

  return {
    effectiveType: connection?.effectiveType,
    downlink: connection?.downlink,
    saveData: connection?.saveData,
  };
}
```

## Exports

### DOM Extensions (`dom.ts`)

| Type                        | Description                            |
|-----------------------------|----------------------------------------|
| `ExtendedNavigator`         | Navigator with all optional extensions |
| `NavigatorWithConnection`   | Network Information API                |
| `NavigatorWithStorage`      | Storage estimation API                 |
| `NavigatorWithDeviceMemory` | Device memory API                      |
| `NetworkInformation`        | Network connection info                |
| `PerformanceMemory`         | Memory usage info                      |

## Usage Pattern

```typescript
// Type-safe network detection
function getNetworkQuality(): 'fast' | 'slow' | 'offline' {
  const nav = navigator as ExtendedNavigator;

  if (!navigator.onLine) return 'offline';

  const connection = nav.connection;
  if (!connection) return 'fast'; // Assume fast if unsupported

  const slowTypes = ['slow-2g', '2g', '3g'];
  if (slowTypes.includes(connection.effectiveType)) return 'slow';

  return 'fast';
}
```

## See Also

- [Shared Type Utils](../shared/type-utils.ts)
- [Performance Module](../performance/README.md)
