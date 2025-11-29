# Types Module

DOM extensions and browser API type definitions for Enzyme.

## Table of Contents

- [Overview](#overview)
- [DOM Extensions](#dom-extensions)
- [Network Information API](#network-information-api)
- [Performance API](#performance-api)
- [Storage API](#storage-api)
- [Usage Examples](#usage-examples)
- [Browser Support](#browser-support)
- [Related Documentation](#related-documentation)

## Overview

The types module provides TypeScript type definitions for non-standard browser APIs and DOM extensions used throughout the Enzyme library. These types enable type-safe usage of modern browser features while handling browser compatibility gracefully.

### Key Features

- **Extended Navigator Types**: Network Information, Device Memory, Storage APIs
- **Performance Types**: Memory usage and performance metrics
- **Type-Safe Access**: Full TypeScript support for browser APIs
- **SSR-Safe**: Types handle server-side rendering scenarios
- **Browser Compatibility**: Graceful degradation for unsupported APIs

## DOM Extensions

### `ExtendedNavigator`

Navigator interface with all optional browser extensions.

```typescript
import type { ExtendedNavigator } from '@missionfabric-js/enzyme/types';

function useExtendedNavigator() {
  const navigator = window.navigator as ExtendedNavigator;

  return {
    connection: navigator.connection,
    deviceMemory: navigator.deviceMemory,
    storage: navigator.storage
  };
}
```

**Extended Properties:**
```typescript
interface ExtendedNavigator extends Navigator {
  connection?: NetworkInformation;
  deviceMemory?: number; // GB
  storage?: StorageManager;
  getBattery?: () => Promise<BatteryManager>;
}
```

### `NavigatorWithConnection`

Navigator with Network Information API support.

```typescript
import type { NavigatorWithConnection } from '@missionfabric-js/enzyme/types';

function getConnectionType() {
  const nav = navigator as NavigatorWithConnection;

  if (!nav.connection) {
    return 'unknown';
  }

  return nav.connection.effectiveType;
}
```

### `NavigatorWithStorage`

Navigator with Storage Estimation API support.

```typescript
import type { NavigatorWithStorage } from '@missionfabric-js/enzyme/types';

async function getStorageEstimate() {
  const nav = navigator as NavigatorWithStorage;

  if (!nav.storage?.estimate) {
    return null;
  }

  const estimate = await nav.storage.estimate();
  return {
    usage: estimate.usage,
    quota: estimate.quota,
    usagePercent: (estimate.usage / estimate.quota) * 100
  };
}
```

### `NavigatorWithDeviceMemory`

Navigator with Device Memory API support.

```typescript
import type { NavigatorWithDeviceMemory } from '@missionfabric-js/enzyme/types';

function getDeviceMemory() {
  const nav = navigator as NavigatorWithDeviceMemory;

  // Returns device memory in GB (e.g., 4, 8, 16)
  return nav.deviceMemory ?? null;
}
```

## Network Information API

### `NetworkInformation`

Network connection information interface.

```typescript
interface NetworkInformation {
  // Connection type: '4g', '3g', '2g', 'slow-2g', 'unknown'
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';

  // Downlink speed in Mbps
  downlink?: number;

  // Round-trip time in milliseconds
  rtt?: number;

  // User's data saver preference
  saveData?: boolean;

  // Event handler for connection changes
  addEventListener?: (
    type: 'change',
    listener: (event: Event) => void
  ) => void;

  removeEventListener?: (
    type: 'change',
    listener: (event: Event) => void
  ) => void;
}
```

**Usage:**
```typescript
import type { NetworkInformation } from '@missionfabric-js/enzyme/types';

function useNetworkQuality() {
  const [quality, setQuality] = useState<string>('unknown');

  useEffect(() => {
    const nav = navigator as ExtendedNavigator;
    const connection = nav.connection;

    if (!connection) return;

    const updateQuality = () => {
      setQuality(connection.effectiveType || 'unknown');
    };

    updateQuality();
    connection.addEventListener?.('change', updateQuality);

    return () => {
      connection.removeEventListener?.('change', updateQuality);
    };
  }, []);

  return quality;
}
```

## Performance API

### `PerformanceMemory`

Memory usage information from Performance API.

```typescript
interface PerformanceMemory {
  // Total JS heap size in bytes
  totalJSHeapSize: number;

  // Used JS heap size in bytes
  usedJSHeapSize: number;

  // JS heap size limit in bytes
  jsHeapSizeLimit: number;
}
```

**Usage:**
```typescript
import type { PerformanceMemory } from '@missionfabric-js/enzyme/types';

function getMemoryUsage() {
  const performance = window.performance as Performance & {
    memory?: PerformanceMemory;
  };

  if (!performance.memory) {
    return null;
  }

  const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;

  return {
    used: usedJSHeapSize,
    limit: jsHeapSizeLimit,
    usagePercent: (usedJSHeapSize / jsHeapSizeLimit) * 100
  };
}
```

## Storage API

### `StorageEstimate`

Storage quota and usage information.

```typescript
interface StorageEstimate {
  // Current usage in bytes
  usage?: number;

  // Total quota in bytes
  quota?: number;
}
```

**Usage:**
```typescript
async function checkStorageQuota() {
  const nav = navigator as NavigatorWithStorage;

  if (!nav.storage?.estimate) {
    console.log('Storage API not supported');
    return;
  }

  const estimate = await nav.storage.estimate();

  console.log(`Using ${estimate.usage} bytes of ${estimate.quota} bytes`);
  console.log(`${((estimate.usage / estimate.quota) * 100).toFixed(2)}% used`);
}
```

## Usage Examples

### Type-Safe Network Detection

```typescript
import type { ExtendedNavigator, NetworkInformation } from '@missionfabric-js/enzyme/types';

function getNetworkQuality(): 'fast' | 'slow' | 'offline' {
  // Check online status
  if (!navigator.onLine) return 'offline';

  // Check Network Information API
  const nav = navigator as ExtendedNavigator;
  const connection = nav.connection;

  if (!connection) return 'fast'; // Assume fast if unsupported

  const slowTypes = ['slow-2g', '2g', '3g'];
  if (connection.effectiveType && slowTypes.includes(connection.effectiveType)) {
    return 'slow';
  }

  return 'fast';
}
```

### Adaptive Image Loading

```typescript
import type { NetworkInformation } from '@missionfabric-js/enzyme/types';

function getImageQuality(): 'high' | 'medium' | 'low' {
  const nav = navigator as ExtendedNavigator;
  const connection = nav.connection;

  if (!connection) return 'high';

  // Check data saver preference
  if (connection.saveData) return 'low';

  // Check connection quality
  switch (connection.effectiveType) {
    case '4g':
      return 'high';
    case '3g':
      return 'medium';
    case '2g':
    case 'slow-2g':
      return 'low';
    default:
      return 'medium';
  }
}

function ImageComponent({ src }: { src: string }) {
  const quality = getImageQuality();

  const imageSrc = {
    high: `${src}?quality=high`,
    medium: `${src}?quality=medium`,
    low: `${src}?quality=low`
  }[quality];

  return <img src={imageSrc} alt="" />;
}
```

### Memory-Aware Component

```typescript
import type { PerformanceMemory } from '@missionfabric-js/enzyme/types';

function useMemoryPressure() {
  const [pressure, setPressure] = useState<'low' | 'medium' | 'high'>('low');

  useEffect(() => {
    const checkMemory = () => {
      const perf = window.performance as Performance & {
        memory?: PerformanceMemory;
      };

      if (!perf.memory) return;

      const { usedJSHeapSize, jsHeapSizeLimit } = perf.memory;
      const usagePercent = (usedJSHeapSize / jsHeapSizeLimit) * 100;

      if (usagePercent > 90) {
        setPressure('high');
      } else if (usagePercent > 70) {
        setPressure('medium');
      } else {
        setPressure('low');
      }
    };

    const interval = setInterval(checkMemory, 5000);
    checkMemory();

    return () => clearInterval(interval);
  }, []);

  return pressure;
}
```

### Device Capability Detection

```typescript
import type { NavigatorWithDeviceMemory } from '@missionfabric-js/enzyme/types';

function getDeviceCapabilities() {
  const nav = navigator as NavigatorWithDeviceMemory;
  const deviceMemory = nav.deviceMemory;

  // Categorize device based on memory
  if (!deviceMemory) {
    return 'unknown';
  }

  if (deviceMemory <= 2) {
    return 'low-end';
  } else if (deviceMemory <= 4) {
    return 'mid-range';
  } else {
    return 'high-end';
  }
}

function AdaptiveFeatures() {
  const device = getDeviceCapabilities();

  const features = {
    'low-end': {
      animations: false,
      preloading: false,
      maxImages: 10
    },
    'mid-range': {
      animations: true,
      preloading: false,
      maxImages: 50
    },
    'high-end': {
      animations: true,
      preloading: true,
      maxImages: 100
    },
    'unknown': {
      animations: true,
      preloading: false,
      maxImages: 25
    }
  }[device];

  return features;
}
```

### Storage Quota Monitoring

```typescript
import type { NavigatorWithStorage } from '@missionfabric-js/enzyme/types';

async function useStorageMonitor() {
  const nav = navigator as NavigatorWithStorage;

  if (!nav.storage?.estimate) {
    console.warn('Storage API not supported');
    return null;
  }

  const estimate = await nav.storage.estimate();
  const usagePercent = ((estimate.usage ?? 0) / (estimate.quota ?? 1)) * 100;

  return {
    usage: estimate.usage,
    quota: estimate.quota,
    usagePercent,
    isNearLimit: usagePercent > 80
  };
}
```

## Browser Support

### Network Information API
- **Chrome**: 61+
- **Edge**: 79+
- **Firefox**: Not supported
- **Safari**: Not supported

### Device Memory API
- **Chrome**: 63+
- **Edge**: 79+
- **Firefox**: Not supported
- **Safari**: Not supported

### Storage API
- **Chrome**: 55+
- **Edge**: 79+
- **Firefox**: 57+
- **Safari**: 15.2+

### Performance Memory
- **Chrome**: Yes (non-standard)
- **Edge**: Yes
- **Firefox**: Not supported
- **Safari**: Not supported

### Best Practices for Browser Compatibility

1. **Always check for API support**:
```typescript
const nav = navigator as ExtendedNavigator;
if (!nav.connection) {
  // Fallback behavior
}
```

2. **Provide sensible defaults**:
```typescript
const connectionType = nav.connection?.effectiveType ?? 'unknown';
```

3. **Use progressive enhancement**:
```typescript
// Start with basic features, enhance if APIs available
const features = getBasicFeatures();
if (supportsAdvancedAPIs()) {
  Object.assign(features, getAdvancedFeatures());
}
```

4. **Test on multiple browsers**:
- Use feature detection, not browser detection
- Test graceful degradation paths
- Provide polyfills where appropriate

## Related Documentation

### Main Documentation
- [Documentation Index](/home/user/enzyme/docs/INDEX.md) - All documentation resources
- [Architecture Guide](/home/user/enzyme/docs/ARCHITECTURE.md) - System architecture
- [Library Overview](/home/user/enzyme/src/lib/README.md) - Getting started

### Related Modules
- [Shared Utilities](/home/user/enzyme/docs/shared/README.md) - Shared type utilities
- [Performance](/home/user/enzyme/docs/performance/README.md) - Performance monitoring
- [Hooks](/home/user/enzyme/docs/hooks/README.md) - Custom hooks using these types

### Integration Guides
- [Integration Patterns](/home/user/enzyme/docs/integration/README.md) - How modules work together

## API Reference

### DOM Extensions

| Export | Description |
|--------|-------------|
| `ExtendedNavigator` | Navigator with all optional extensions |
| `NavigatorWithConnection` | Network Information API |
| `NavigatorWithStorage` | Storage estimation API |
| `NavigatorWithDeviceMemory` | Device memory API |

### Network Types

| Export | Description |
|--------|-------------|
| `NetworkInformation` | Network connection info |

### Performance Types

| Export | Description |
|--------|-------------|
| `PerformanceMemory` | Memory usage info |

### Storage Types

| Export | Description |
|--------|-------------|
| `StorageEstimate` | Storage quota and usage |

## Contributing

When adding new type definitions:

1. **Follow TypeScript best practices** - Use proper type guards and optional chaining
2. **Add comprehensive JSDoc** - Document browser support and usage
3. **Include examples** - Show real-world usage with fallbacks
4. **Test across browsers** - Verify types work in supported environments
5. **Update this README** - Keep documentation current
