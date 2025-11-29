# Shared Utilities Module

Unified utilities, types, and helpers used across the Enzyme library.

## Table of Contents

- [Overview](#overview)
- [Event Utilities](#event-utilities)
- [Storage Utilities](#storage-utilities)
- [Type Utilities](#type-utilities)
- [Validation Utilities](#validation-utilities)
- [Error Utilities](#error-utilities)
- [Usage Examples](#usage-examples)
- [Migration Notes](#migration-notes)
- [Related Documentation](#related-documentation)

## Overview

The shared module contains consolidated utilities that are used across multiple library modules. This is the canonical location for event emitters, storage utilities, validation, and common types.

### Key Features

- **Unified Event System**: Single event bus for all modules
- **Advanced Storage**: IndexedDB-backed storage with TTL support
- **Type Utilities**: Advanced TypeScript utilities for type safety
- **Validation**: Common validation patterns
- **Error Handling**: Standardized error types and handlers

## Event Utilities

Centralized event system for cross-module communication.

### `UnifiedEventEmitter`

Base event emitter class with type-safe event handling.

```tsx
import { UnifiedEventEmitter } from '@missionfabric-js/enzyme/shared';

// Create a custom emitter
class MyEmitter extends UnifiedEventEmitter<{
  'user:login': { userId: string };
  'user:logout': void;
}> {}

const emitter = new MyEmitter();

// Subscribe to events
emitter.on('user:login', ({ userId }) => {
  console.log('User logged in:', userId);
});

// Emit events
emitter.emit('user:login', { userId: '123' });
```

### `globalEventBus`

Global event bus singleton for system-wide events.

```tsx
import { globalEventBus } from '@missionfabric-js/enzyme/shared';

// Subscribe to global events
globalEventBus.on('user:login', ({ userId }) => {
  console.log('User logged in globally:', userId);
});

// Emit global events
globalEventBus.emit('user:login', { userId: '123' });

// Clean up
const unsubscribe = globalEventBus.on('user:logout', cleanup);
unsubscribe(); // Remove listener
```

### `createEventEmitter()`

Factory for creating new event emitters.

```tsx
import { createEventEmitter } from '@missionfabric-js/enzyme/shared';

type MyEvents = {
  'data:update': { data: unknown };
  'data:error': { error: Error };
};

const emitter = createEventEmitter<MyEvents>();

emitter.on('data:update', ({ data }) => {
  console.log('Data updated:', data);
});

emitter.emit('data:update', { data: { foo: 'bar' } });
```

### `createScopedEmitter(scope)`

Creates a namespaced event emitter for module isolation.

```tsx
import { createScopedEmitter } from '@missionfabric-js/enzyme/shared';

const authEmitter = createScopedEmitter('auth');

// Events are automatically namespaced
authEmitter.on('login', handleLogin);
authEmitter.emit('login', { userId: '123' });

// Behind the scenes: 'auth:login' event
```

**Use Cases:**
- Module communication
- Cross-component events
- Plugin systems
- State synchronization

## Storage Utilities

Advanced client-side storage with IndexedDB support.

### `StorageManager`

Unified storage interface supporting multiple backends.

```tsx
import { StorageManager } from '@missionfabric-js/enzyme/shared';

const storage = new StorageManager({
  backend: 'indexeddb', // or 'localstorage'
  dbName: 'myapp',
  version: 1
});

// Set item with TTL
await storage.set('user:preferences', preferences, {
  ttl: 3600000 // 1 hour
});

// Get item
const preferences = await storage.get('user:preferences');

// Check if exists
const exists = await storage.has('user:preferences');

// Remove item
await storage.remove('user:preferences');

// Clear all
await storage.clear();

// Get all keys
const keys = await storage.keys();
```

#### Options

```typescript
interface StorageOptions {
  backend?: 'indexeddb' | 'localstorage' | 'memory';
  dbName?: string;
  version?: number;
  encryptionKey?: string; // For encrypted storage
}

interface SetOptions {
  ttl?: number; // Time to live in milliseconds
  encrypt?: boolean; // Encrypt this item
}
```

**Features:**
- TTL support for automatic expiration
- IndexedDB for large data storage
- Encryption support for sensitive data
- Fallback to localStorage/memory
- SSR-safe (memory backend on server)

**Use Cases:**
- User preferences storage
- Offline data caching
- Session state persistence
- Large dataset storage

## Type Utilities

Advanced TypeScript utilities for better type safety.

### `DeepPartial<T>`

Makes all properties optional recursively.

```typescript
import { DeepPartial } from '@missionfabric-js/enzyme/shared';

interface Config {
  api: {
    url: string;
    timeout: number;
  };
  features: {
    analytics: boolean;
  };
}

// All properties are optional, even nested
const partialConfig: DeepPartial<Config> = {
  api: {
    url: 'https://api.example.com'
    // timeout is optional
  }
  // features is optional
};
```

### `DeepRequired<T>`

Makes all properties required recursively.

```typescript
import { DeepRequired } from '@missionfabric-js/enzyme/shared';

interface PartialConfig {
  api?: {
    url?: string;
    timeout?: number;
  };
}

// All properties are required
const fullConfig: DeepRequired<PartialConfig> = {
  api: {
    url: 'https://api.example.com',
    timeout: 5000 // Required!
  }
};
```

### `Result<T, E>`

Type-safe result type for error handling.

```typescript
import { Result } from '@missionfabric-js/enzyme/shared';

function fetchUser(id: string): Result<User, Error> {
  try {
    const user = getUserFromAPI(id);
    return { ok: true, data: user };
  } catch (error) {
    return { ok: false, error: error as Error };
  }
}

// Usage
const result = fetchUser('123');

if (result.ok) {
  console.log('User:', result.data); // Type: User
} else {
  console.error('Error:', result.error); // Type: Error
}
```

### `Brand<T, B>`

Creates branded types for type safety.

```typescript
import { Brand } from '@missionfabric-js/enzyme/shared';

type UserId = Brand<string, 'UserId'>;
type ProductId = Brand<string, 'ProductId'>;

function getUser(id: UserId) {
  // ...
}

const userId = '123' as UserId;
const productId = '456' as ProductId;

getUser(userId); // ✅ OK
getUser(productId); // ❌ Type error
```

## Validation Utilities

Common validation functions for data validation.

### `validateEmail(email)`

Validates email addresses.

```tsx
import { validateEmail } from '@missionfabric-js/enzyme/shared';

const isValid = validateEmail('user@example.com'); // true
const isInvalid = validateEmail('not-an-email'); // false
```

### `validateUrl(url)`

Validates URLs.

```tsx
import { validateUrl } from '@missionfabric-js/enzyme/shared';

const isValid = validateUrl('https://example.com'); // true
const isInvalid = validateUrl('not a url'); // false

// With options
const isValidRelative = validateUrl('/path', { allowRelative: true }); // true
```

### `validatePattern(value, pattern)`

Validates against custom patterns.

```tsx
import { validatePattern } from '@missionfabric-js/enzyme/shared';

const isPhone = validatePattern('555-1234', /^\d{3}-\d{4}$/);
const isZipCode = validatePattern('12345', /^\d{5}$/);
```

**Use Cases:**
- Form validation
- Input sanitization
- Data integrity checks
- API request validation

## Error Utilities

Standardized error handling across the library.

### `AppError`

Base error class for application errors.

```tsx
import { AppError } from '@missionfabric-js/enzyme/shared';

throw new AppError('Failed to fetch data', {
  code: 'FETCH_ERROR',
  statusCode: 500,
  context: { url: '/api/users' }
});
```

### `createError(message, options)`

Factory function for creating errors.

```tsx
import { createError } from '@missionfabric-js/enzyme/shared';

const error = createError('Invalid input', {
  code: 'VALIDATION_ERROR',
  statusCode: 400,
  details: {
    field: 'email',
    message: 'Invalid email format'
  }
});
```

### `isAppError(error)`

Type guard for AppError instances.

```tsx
import { isAppError } from '@missionfabric-js/enzyme/shared';

try {
  // some operation
} catch (error) {
  if (isAppError(error)) {
    console.error('App error:', error.code, error.statusCode);
  } else {
    console.error('Unknown error:', error);
  }
}
```

**Features:**
- Structured error information
- Error codes and status codes
- Context data for debugging
- Type-safe error handling

## Usage Examples

### Cross-Module Communication

```tsx
import { globalEventBus } from '@missionfabric-js/enzyme/shared';

// Module A: Emit event
function login(userId: string) {
  globalEventBus.emit('user:login', { userId });
}

// Module B: Listen for event
useEffect(() => {
  const unsubscribe = globalEventBus.on('user:login', ({ userId }) => {
    console.log('User logged in:', userId);
    loadUserData(userId);
  });

  return unsubscribe;
}, []);
```

### Persistent State with TTL

```tsx
import { StorageManager } from '@missionfabric-js/enzyme/shared';

const storage = new StorageManager();

// Cache API response for 5 minutes
async function fetchData() {
  const cached = await storage.get('api:data');
  if (cached) return cached;

  const data = await api.get('/data');
  await storage.set('api:data', data, { ttl: 300000 });

  return data;
}
```

### Type-Safe Error Handling

```tsx
import { Result, createError } from '@missionfabric-js/enzyme/shared';

async function saveUser(user: User): Promise<Result<User, AppError>> {
  try {
    const saved = await api.post('/users', user);
    return { ok: true, data: saved };
  } catch (error) {
    return {
      ok: false,
      error: createError('Failed to save user', {
        code: 'SAVE_ERROR',
        context: { userId: user.id }
      })
    };
  }
}

// Usage
const result = await saveUser(user);
if (result.ok) {
  console.log('Saved:', result.data);
} else {
  console.error('Error:', result.error.code);
}
```

### Form Validation

```tsx
import { validateEmail, validateUrl } from '@missionfabric-js/enzyme/shared';

function validateForm(data: FormData) {
  const errors = [];

  if (!validateEmail(data.email)) {
    errors.push({ field: 'email', message: 'Invalid email' });
  }

  if (!validateUrl(data.website)) {
    errors.push({ field: 'website', message: 'Invalid URL' });
  }

  return errors.length === 0 ? null : errors;
}
```

## Migration Notes

The shared module consolidates utilities that were previously scattered across different modules:

### Consolidated from:
- `utils/eventEmitter.ts` → `shared/event-utils.ts`
- `vdom/event-bus.ts` → `shared/event-utils.ts`
- `coordination/event-bus.ts` → `shared/event-utils.ts`

### Migration Guide

**Before:**
```tsx
import { EventEmitter } from '@/lib/utils/eventEmitter';
import { EventBus } from '@/lib/vdom/event-bus';
```

**After:**
```tsx
import { UnifiedEventEmitter, globalEventBus } from '@missionfabric-js/enzyme/shared';
```

All event emitters now use the same unified implementation for consistency.

## Related Documentation

### Main Documentation
- [Documentation Index](/home/user/enzyme/docs/INDEX.md) - All documentation resources
- [Architecture Guide](/home/user/enzyme/docs/ARCHITECTURE.md) - System architecture
- [Library Overview](/home/user/enzyme/src/lib/README.md) - Getting started

### Related Modules
- [Hooks](/home/user/enzyme/docs/hooks/README.md) - Custom hooks that use shared utilities
- [State Management](/home/user/enzyme/docs/state/README.md) - State utilities
- [API](/home/user/enzyme/docs/api/README.md) - API client utilities
- [Types](/home/user/enzyme/docs/types/README.md) - Type definitions

### Integration Guides
- [Integration Patterns](/home/user/enzyme/docs/integration/README.md) - How modules work together

## API Reference

### Event Utilities

| Export | Type | Description |
|--------|------|-------------|
| `UnifiedEventEmitter` | Class | Base event emitter class |
| `globalEventBus` | Instance | Global event bus singleton |
| `createEventEmitter` | Function | Factory for new emitters |
| `createScopedEmitter` | Function | Namespaced emitter factory |

### Storage Utilities

| Export | Type | Description |
|--------|------|-------------|
| `StorageManager` | Class | Unified storage with IndexedDB support |

### Type Utilities

| Export | Type | Description |
|--------|------|-------------|
| `DeepPartial<T>` | Type | Deep partial type |
| `DeepRequired<T>` | Type | Deep required type |
| `Result<T, E>` | Type | Result type for error handling |
| `Brand<T, B>` | Type | Branded type utility |

### Validation Utilities

| Export | Type | Description |
|--------|------|-------------|
| `validateEmail` | Function | Email validation |
| `validateUrl` | Function | URL validation |
| `validatePattern` | Function | Pattern-based validation |

### Error Utilities

| Export | Type | Description |
|--------|------|-------------|
| `AppError` | Class | Application error class |
| `createError` | Function | Error factory |
| `isAppError` | Function | Type guard for AppError |

## Best Practices

1. **Use Global Event Bus Sparingly**: Prefer React context or props for component communication
2. **Set TTL on Cached Data**: Always set appropriate TTL for cached data
3. **Use Result Type**: Prefer Result type over throwing errors for expected failures
4. **Validate User Input**: Always validate data from external sources
5. **Use Branded Types**: Use branded types for IDs to prevent mixing different entity types

## Contributing

When adding new shared utilities:

1. **Ensure it's truly shared** - Used by 2+ modules
2. **Add comprehensive JSDoc** - Document all parameters and return values
3. **Include examples** - Show real-world usage
4. **Write tests** - Cover edge cases and error conditions
5. **Update this README** - Keep documentation current
