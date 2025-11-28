# Shared Module

> Unified utilities, types, and helpers used across the library.

## Overview

The shared module contains consolidated utilities that are used across multiple library modules. This is the canonical location for event emitters, storage utilities, validation, and common types.

## Quick Start

```tsx
import {
  // Event utilities
  globalEventBus,
  createEventEmitter,

  // Storage utilities
  StorageManager,

  // Type utilities
  DeepPartial,
  Result,
  Brand,

  // Validation
  validateEmail,
  validateUrl,

  // Error handling
  AppError,
  createError
} from '@/lib/shared';

// Event bus usage
globalEventBus.emit('user:login', { userId: '123' });
globalEventBus.on('user:logout', () => cleanup());

// Storage usage
const storage = new StorageManager();
await storage.set('key', value, { ttl: 60000 });

// Type-safe results
function fetchUser(id: string): Result<User> {
  // Returns { ok: true, data: User } or { ok: false, error: AppError }
}
```

## Exports

### Event Utilities (`event-utils.ts`)
| Export | Description |
|--------|-------------|
| `UnifiedEventEmitter` | Base event emitter class |
| `globalEventBus` | Global event bus singleton |
| `createEventEmitter` | Factory for new emitters |
| `createScopedEmitter` | Namespaced emitter factory |

### Type Utilities (`type-utils.ts`)
| Export | Description |
|--------|-------------|
| `DeepPartial<T>` | Deep partial type |
| `DeepRequired<T>` | Deep required type |
| `Result<T, E>` | Result type for error handling |
| `Brand<T, B>` | Branded type utility |

### Storage Utilities (`StorageManager.ts`)
| Export | Description |
|--------|-------------|
| `StorageManager` | Unified storage with IndexedDB support |

### Validation (`validation-utils.ts`)
| Export | Description |
|--------|-------------|
| `validateEmail` | Email validation |
| `validateUrl` | URL validation |
| `validatePattern` | Pattern-based validation |

### Error Utilities (`error-utils.ts`)
| Export | Description |
|--------|-------------|
| `AppError` | Application error class |
| `createError` | Error factory |
| `isAppError` | Type guard |

## Migration Note

The following have been consolidated here:
- `utils/eventEmitter.ts` → `shared/event-utils.ts`
- `vdom/event-bus.ts` → `shared/event-utils.ts`
- `coordination/event-bus.ts` → `shared/event-utils.ts`

## See Also

- [Type Utils](./type-utils.ts)
- [Event Utils](./event-utils.ts)
- [Migration Guide](../MIGRATION_GUIDE.md)
