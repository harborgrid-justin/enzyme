# @missionfabric-js/enzyme - System & Types API Documentation

**Version:** 1.0.0
**License:** MIT

---

## Table of Contents

1. [Overview](#overview)
2. [System Module](#system-module)
   - [SystemManager Class](#systemmanager-class)
   - [Initialization Functions](#initialization-functions)
   - [System Configuration](#system-configuration)
   - [Data Flow Diagram](#data-flow-diagram)
3. [Types Module](#types-module)
   - [API Types](#api-types)
   - [Branded Types](#branded-types)
   - [Utility Types](#utility-types)
   - [React Types](#react-types)
   - [Async Types](#async-types)
   - [Type Guards](#type-guards)
4. [Main Exports](#main-exports)
5. [Usage Examples](#usage-examples)

---

## Overview

The `@missionfabric-js/enzyme` framework is an enterprise-grade React framework providing:

- **System Management**: Centralized initialization, monitoring, and lifecycle management
- **Type Safety**: Comprehensive TypeScript types for enhanced type safety
- **Performance Monitoring**: Built-in Core Web Vitals tracking and long task observation
- **Error Management**: Global error handling and reporting
- **Memory Management**: Automatic memory pressure detection and cleanup

---

## System Module

**Import Path:** `@missionfabric-js/enzyme/lib/system` or `import { system } from '@missionfabric-js/enzyme'`

The System module provides enterprise-grade system initialization, monitoring, and lifecycle management.

### SystemManager Class

The core singleton class that manages the entire system lifecycle.

#### Properties

##### `systemManager.initialized`

```typescript
get initialized(): boolean
```

**Description:** Check if the system has been initialized.

**Returns:** `boolean` - True if system is initialized, false otherwise.

**Example:**
```typescript
import { systemManager } from '@missionfabric-js/enzyme/lib/system';

if (systemManager.initialized) {
  console.log('System is ready');
}
```

---

#### Methods

##### `systemManager.initialize()`

```typescript
initialize(config: SystemConfig): void
```

**Description:** Initialize the system with the provided configuration. Sets up logging, error reporting, performance monitoring, memory monitoring, request queue, and global error handlers.

**Parameters:**
- `config: SystemConfig` - System configuration object (see [SystemConfig](#systemconfig))

**Returns:** `void`

**Side Effects:**
- Configures logger with specified log level
- Initializes error reporting (if enabled)
- Starts performance monitoring (Web Vitals, long tasks)
- Starts memory monitoring
- Sets up global error handlers for unhandled errors and promise rejections
- Subscribes to application events (auth, data, etc.)

**Example:**
```typescript
import { systemManager } from '@missionfabric-js/enzyme/lib/system';

systemManager.initialize({
  environment: 'production',
  debug: false,
  logLevel: 'info',
  errorReporting: {
    enabled: true,
    dsn: 'https://your-sentry-dsn',
    sampleRate: 1.0,
  },
  performance: {
    enabled: true,
    collectWebVitals: true,
    collectLongTasks: true,
  },
  memory: {
    enabled: true,
    moderateThreshold: 0.7,
    criticalThreshold: 0.9,
  },
});
```

---

##### `systemManager.getStatus()`

```typescript
getStatus(): SystemStatus
```

**Description:** Get the current status of the system including uptime, memory usage, performance metrics, and error counts.

**Returns:** `SystemStatus` - Object containing system status information

**Example:**
```typescript
const status = systemManager.getStatus();

console.log('System Status:', {
  uptime: `${Math.floor(status.uptime / 1000)}s`,
  memory: status.memory?.pressure,
  errors: status.errors.lastHour,
  queuedRequests: status.requestQueue.queued,
});
```

---

##### `systemManager.healthCheck()`

```typescript
healthCheck(): {
  healthy: boolean;
  checks: Record<string, {
    status: 'pass' | 'warn' | 'fail';
    message?: string
  }>;
}
```

**Description:** Perform a comprehensive health check of all system components.

**Returns:** Object with overall health status and individual component checks

**Health Checks Include:**
- System initialization status
- Memory pressure level
- Error rate (last hour)
- Request queue size

**Example:**
```typescript
const health = systemManager.healthCheck();

if (!health.healthy) {
  console.error('System health check failed:');
  Object.entries(health.checks).forEach(([component, check]) => {
    if (check.status === 'fail') {
      console.error(`- ${component}: ${check.message}`);
    }
  });
}
```

---

##### `systemManager.shutdown()`

```typescript
shutdown(): void
```

**Description:** Gracefully shutdown the system, cleaning up all resources, stopping monitors, and clearing queues.

**Returns:** `void`

**Cleanup Actions:**
- Runs all registered cleanup functions
- Disposes memory manager
- Disposes performance monitor
- Clears request queue
- Resets initialization state

**Example:**
```typescript
// Call during app teardown
window.addEventListener('beforeunload', () => {
  systemManager.shutdown();
});
```

---

### Initialization Functions

These are convenience functions that delegate to the SystemManager instance.

##### `initializeSystem()`

```typescript
function initializeSystem(config: SystemConfig): void
```

**Description:** Initialize the system with the provided configuration. This is the recommended way to initialize the system.

**Parameters:**
- `config: SystemConfig` - System configuration object

**Returns:** `void`

**Example:**
```typescript
import { initializeSystem, defaultSystemConfig } from '@missionfabric-js/enzyme/lib/system';

// Use default configuration
initializeSystem(defaultSystemConfig);

// Or customize
initializeSystem({
  ...defaultSystemConfig,
  environment: 'production',
  logLevel: 'warn',
});
```

---

##### `getSystemStatus()`

```typescript
function getSystemStatus(): SystemStatus
```

**Description:** Get the current system status.

**Returns:** `SystemStatus` - System status object

**Example:**
```typescript
import { getSystemStatus } from '@missionfabric-js/enzyme/lib/system';

const status = getSystemStatus();
console.log(`System uptime: ${status.uptime}ms`);
```

---

##### `systemHealthCheck()`

```typescript
function systemHealthCheck(): {
  healthy: boolean;
  checks: Record<string, {
    status: 'pass' | 'warn' | 'fail';
    message?: string
  }>;
}
```

**Description:** Perform a system health check.

**Returns:** Health check result object

**Example:**
```typescript
import { systemHealthCheck } from '@missionfabric-js/enzyme/lib/system';

// Use in health check endpoint
app.get('/health', (req, res) => {
  const health = systemHealthCheck();
  res.status(health.healthy ? 200 : 503).json(health);
});
```

---

##### `shutdownSystem()`

```typescript
function shutdownSystem(): void
```

**Description:** Shutdown the system gracefully.

**Returns:** `void`

**Example:**
```typescript
import { shutdownSystem } from '@missionfabric-js/enzyme/lib/system';

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  shutdownSystem();
  process.exit(0);
});
```

---

### System Configuration

#### `SystemConfig`

```typescript
interface SystemConfig {
  /** Environment (development, staging, production) */
  environment: 'development' | 'staging' | 'production';

  /** Enable debug mode */
  debug?: boolean;

  /** Log level */
  logLevel?: LogLevel; // 'debug' | 'info' | 'warn' | 'error'

  /** Error reporting configuration */
  errorReporting?: {
    enabled?: boolean;
    dsn?: string;
    sampleRate?: number;
  };

  /** Performance monitoring configuration */
  performance?: {
    enabled?: boolean;
    sampleRate?: number;
    collectWebVitals?: boolean;
    collectLongTasks?: boolean;
    reporter?: (metrics: unknown[]) => void;
  };

  /** Memory monitoring configuration */
  memory?: {
    enabled?: boolean;
    moderateThreshold?: number; // 0-1 (0.7 = 70%)
    criticalThreshold?: number; // 0-1 (0.9 = 90%)
    onPressure?: (level: MemoryPressure) => void;
  };

  /** Request queue configuration */
  requestQueue?: {
    enabled?: boolean;
    concurrency?: number;
    maxQueueSize?: number;
  };
}
```

**Description:** Configuration object for system initialization.

**Field Details:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `environment` | `string` | Required | Runtime environment |
| `debug` | `boolean` | `false` | Enable debug mode with verbose logging |
| `logLevel` | `LogLevel` | `'info'` | Minimum log level to output |
| `errorReporting.enabled` | `boolean` | `true` | Enable error reporting to external service |
| `errorReporting.dsn` | `string` | - | Sentry DSN or error reporting endpoint |
| `errorReporting.sampleRate` | `number` | `1.0` | Percentage of errors to report (0-1) |
| `performance.enabled` | `boolean` | `true` | Enable performance monitoring |
| `performance.collectWebVitals` | `boolean` | `true` | Collect Core Web Vitals (LCP, FID, CLS) |
| `performance.collectLongTasks` | `boolean` | `true` | Monitor tasks longer than 50ms |
| `memory.enabled` | `boolean` | `true` | Enable memory monitoring |
| `memory.moderateThreshold` | `number` | `0.7` | Threshold for moderate memory pressure |
| `memory.criticalThreshold` | `number` | `0.9` | Threshold for critical memory pressure |
| `requestQueue.enabled` | `boolean` | `true` | Enable request queue management |
| `requestQueue.concurrency` | `number` | `5` | Max concurrent requests |
| `requestQueue.maxQueueSize` | `number` | `100` | Max queued requests |

---

#### `SystemStatus`

```typescript
interface SystemStatus {
  initialized: boolean;
  environment: string;
  uptime: number;
  memory: {
    usedHeap: number;
    totalHeap: number;
    pressure: MemoryPressure; // 'none' | 'moderate' | 'critical'
  } | null;
  performance: {
    webVitals: Record<string, number>;
    longTaskCount: number;
  };
  requestQueue: {
    queued: number;
    processing: number;
  };
  errors: {
    total: number;
    lastHour: number;
  };
}
```

**Description:** Current system status snapshot.

---

#### `defaultSystemConfig`

```typescript
const defaultSystemConfig: SystemConfig
```

**Description:** Default system configuration with sensible defaults based on environment.

**Default Values:**
- `environment`: Auto-detected from `process.env.NODE_ENV`
- `debug`: Enabled if debug mode flag is set
- `logLevel`: `'debug'` in debug mode, `'info'` otherwise
- All monitoring features enabled
- Memory thresholds: 70% moderate, 90% critical
- Request concurrency: 5

**Example:**
```typescript
import { initializeSystem, defaultSystemConfig } from '@missionfabric-js/enzyme/lib/system';

// Use defaults
initializeSystem(defaultSystemConfig);

// Override specific settings
initializeSystem({
  ...defaultSystemConfig,
  performance: {
    ...defaultSystemConfig.performance,
    collectLongTasks: false,
  },
});
```

---

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application Entry Point                      │
│                    initializeSystem(config)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       System Manager                              │
│                    (Singleton Instance)                           │
└──┬──────────┬──────────┬──────────┬──────────┬──────────────┬───┘
   │          │          │          │          │              │
   ▼          ▼          ▼          ▼          ▼              ▼
┌──────┐ ┌────────┐ ┌─────────┐ ┌──────┐ ┌──────────┐ ┌──────────┐
│Logger│ │  Error │ │ Perf    │ │Memory│ │Request   │ │Global    │
│      │ │Reporter│ │ Monitor │ │Manager│ │Queue     │ │Handlers  │
└──┬───┘ └───┬────┘ └────┬────┘ └───┬──┘ └────┬─────┘ └────┬─────┘
   │         │           │          │         │            │
   │         │           │          │         │            │
   ▼         ▼           ▼          ▼         ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Global Event Bus                              │
│                  (Event Coordination)                             │
└─────────────────────────────────────────────────────────────────┘
   │         │           │          │         │            │
   ▼         ▼           ▼          ▼         ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Application Components                          │
│      Auth   •   Data Layer   •   UI   •   Business Logic         │
└─────────────────────────────────────────────────────────────────┘

Event Flow:
──────────
error:global ────────────▶ Error Reporter ────▶ External Service
performance:slowOperation ▶ Performance Monitor ▶ Metrics Aggregation
performance:memoryPressure ▶ Emergency Cleanup ─▶ Free Resources
auth:logout ─────────────▶ Clear Sensitive Data ▶ Security Cleanup
data:invalidate ─────────▶ Cache Invalidation ──▶ Refresh Data

Monitoring Loop:
───────────────
Web Vitals Observer ──┐
Long Task Observer ───┼──▶ Performance Monitor ──▶ Report Metrics
Memory Monitor ───────┘
```

---

## Types Module

**Import Path:** `@missionfabric-js/enzyme/types` or `import type { ... } from '@missionfabric-js/enzyme'`

The Types module provides comprehensive TypeScript type definitions for type-safe development.

### API Types

Types for API request/response handling with full type safety.

#### `ApiResponse<T>`

```typescript
interface ApiResponse<T> {
  readonly data: T;
  readonly success: true;
  readonly message?: string;
  readonly meta?: ApiResponseMeta;
  readonly cache?: CacheControl;
  readonly rateLimit?: RateLimitInfo;
}
```

**Description:** Standard API success response wrapper for consistent response handling.

**Type Parameters:**
- `T` - The type of the response data

**Example:**
```typescript
import type { ApiResponse } from '@missionfabric-js/enzyme/types';

interface User {
  id: string;
  name: string;
  email: string;
}

async function fetchUser(id: string): Promise<ApiResponse<User>> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

const userResponse = await fetchUser('123');
console.log(userResponse.data.name); // Type-safe!
```

---

#### `PaginatedResponse<T>`

```typescript
interface PaginatedResponse<T> extends ApiResponse<readonly T[]> {
  readonly data: readonly T[];
  readonly meta: ApiResponseMeta & {
    readonly pagination: PaginationMeta;
  };
}
```

**Description:** Paginated API response with pagination metadata.

**Type Parameters:**
- `T` - The type of items in the list

**Example:**
```typescript
import type { PaginatedResponse } from '@missionfabric-js/enzyme/types';

async function fetchUsers(page: number): Promise<PaginatedResponse<User>> {
  const response = await fetch(`/api/users?page=${page}`);
  return response.json();
}

const response = await fetchUsers(1);
console.log(`Page ${response.meta.pagination.page} of ${response.meta.pagination.totalPages}`);
response.data.forEach(user => console.log(user.name));

// Check if there's a next page
if (response.meta.pagination.hasNext) {
  await fetchUsers(response.meta.pagination.page + 1);
}
```

---

#### `ApiError`

```typescript
interface ApiError {
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly stack?: string;
  readonly traceId?: string;
  readonly helpUrl?: string;
  readonly errors?: readonly ApiError[];
}
```

**Description:** Structured API error details for comprehensive error handling.

**Example:**
```typescript
import type { ApiError, ApiErrorResponse } from '@missionfabric-js/enzyme/types';
import { isApiErrorResponse } from '@missionfabric-js/enzyme/types';

try {
  await api.post('/users', userData);
} catch (error) {
  if (isApiErrorResponse(error)) {
    console.error(`Error ${error.error.code}: ${error.error.message}`);
    if (error.error.helpUrl) {
      console.log(`See: ${error.error.helpUrl}`);
    }
  }
}
```

---

#### `PaginationMeta`

```typescript
interface PaginationMeta {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
  readonly hasPrev: boolean;
  readonly offset?: number;
  readonly nextCursor?: string;
  readonly prevCursor?: string;
}
```

**Description:** Complete pagination state for UI components.

**Example:**
```typescript
function Pagination({ meta }: { meta: PaginationMeta }) {
  return (
    <div>
      <button disabled={!meta.hasPrev}>Previous</button>
      <span>Page {meta.page} of {meta.totalPages}</span>
      <button disabled={!meta.hasNext}>Next</button>
      <span>Total: {meta.total} items</span>
    </div>
  );
}
```

---

#### `ListQueryParams`

```typescript
interface ListQueryParams extends PaginationParams, SortParams, FilterParams {
  readonly fields?: readonly string[];
  readonly include?: readonly string[];
}
```

**Description:** Combined query parameters for list endpoints with pagination, sorting, and filtering.

**Example:**
```typescript
import type { ListQueryParams } from '@missionfabric-js/enzyme/types';

const queryParams: ListQueryParams = {
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  search: 'john',
  filter: { status: 'active' },
  fields: ['id', 'name', 'email'],
  include: ['profile', 'organization'],
};

const response = await api.get('/users', { params: queryParams });
```

---

#### `HttpStatusCode`

```typescript
type HttpStatusCode =
  | 200 | 201 | 202 | 204  // Success
  | 301 | 302 | 304 | 307 | 308  // Redirection
  | 400 | 401 | 403 | 404 | 405 | 408 | 409 | 422 | 429  // Client Errors
  | 500 | 501 | 502 | 503 | 504;  // Server Errors
```

**Description:** Type-safe HTTP status codes.

**Example:**
```typescript
function handleResponse(status: HttpStatusCode) {
  switch (status) {
    case 200: return 'OK';
    case 201: return 'Created';
    case 404: return 'Not Found';
    case 500: return 'Server Error';
    default: return 'Unknown';
  }
}
```

---

#### `ValidationErrorResponse`

```typescript
interface ValidationErrorResponse extends Omit<ApiErrorResponse, 'error'> {
  readonly success: false;
  readonly error: ApiError & {
    readonly code: 'VALIDATION_ERROR';
    readonly validationErrors: readonly ValidationError[];
  };
}

interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly rule?: string;
  readonly expected?: unknown;
  readonly actual?: unknown;
}
```

**Description:** Validation error response with field-level errors for form validation.

**Example:**
```typescript
import { isValidationErrorResponse } from '@missionfabric-js/enzyme/types';

try {
  await api.post('/users', formData);
} catch (error) {
  if (isValidationErrorResponse(error)) {
    error.error.validationErrors.forEach(({ field, message }) => {
      setFieldError(field, message);
    });
  }
}
```

---

### Branded Types

Branded types provide nominal typing for enhanced type safety, preventing accidental type confusion.

#### `Branded<T, Brand>`

```typescript
type Branded<T, Brand extends string> = T & {
  readonly [__brand]: Brand
};
```

**Description:** Creates a nominal type that is incompatible with its base type, preventing accidental misuse.

**Type Parameters:**
- `T` - The base type to brand
- `Brand` - A unique brand identifier

**Example:**
```typescript
type UserId = Branded<string, 'UserId'>;
type PostId = Branded<string, 'PostId'>;

const userId: UserId = 'user_123' as UserId;
const postId: PostId = 'post_456' as PostId;

// Compile error - prevents mixing up IDs:
// const invalid: UserId = postId;

function getUser(id: UserId) {
  // Implementation
}

// This is safe:
getUser(userId);

// This would error:
// getUser(postId);
```

---

#### Built-in Branded Types

```typescript
type UserId = Branded<string, 'UserId'>;
type OrganizationId = Branded<string, 'OrganizationId'>;
type SessionId = Branded<string, 'SessionId'>;
type ApiKey = Branded<string, 'ApiKey'>;
type AccessToken = Branded<string, 'AccessToken'>;
type RefreshToken = Branded<string, 'RefreshToken'>;
type Email = Branded<string, 'Email'>;
type UUID = Branded<string, 'UUID'>;
type ISODateString = Branded<string, 'ISODateString'>;
type URLString = Branded<string, 'URLString'>;
type PositiveInteger = Branded<number, 'PositiveInteger'>;
type Percentage = Branded<number, 'Percentage'>;
```

**Example:**
```typescript
import type { Email, UUID } from '@missionfabric-js/enzyme/types';
import { createEmail, createUUID } from '@missionfabric-js/enzyme/types';

// Create with validation
const userEmail = createEmail('user@example.com'); // Email
const userId = createUUID('550e8400-e29b-41d4-a716-446655440000'); // UUID

// These throw errors:
// createEmail('invalid-email'); // Error: Invalid email format
// createUUID('not-a-uuid'); // Error: Invalid UUID format
```

---

#### Branded Type Factories

##### `createUserId()`

```typescript
function createUserId(id: string): UserId
```

**Description:** Create a branded UserId from a string.

**Parameters:**
- `id: string` - Raw string identifier

**Returns:** `UserId` - Branded user identifier

---

##### `createUUID()`

```typescript
function createUUID(id: string): UUID
```

**Description:** Create a branded UUID with validation.

**Parameters:**
- `id: string` - Raw UUID string

**Returns:** `UUID` - Branded UUID

**Throws:** `Error` if the string is not a valid UUID format

---

##### `createEmail()`

```typescript
function createEmail(email: string): Email
```

**Description:** Create a branded Email with validation.

**Parameters:**
- `email: string` - Raw email string

**Returns:** `Email` - Branded email

**Throws:** `Error` if the string is not a valid email format

---

##### `createISODateString()`

```typescript
function createISODateString(date: Date | string): ISODateString
```

**Description:** Create a branded ISO date string from a Date object or string.

**Parameters:**
- `date: Date | string` - Date to convert

**Returns:** `ISODateString` - Branded ISO 8601 date string

---

### Utility Types

Comprehensive TypeScript utility types for common patterns.

#### `DeepPartial<T>`

```typescript
type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;
```

**Description:** Makes all properties optional recursively, including nested objects.

**Example:**
```typescript
interface User {
  name: string;
  profile: {
    bio: string;
    avatar: string;
  };
}

type PartialUser = DeepPartial<User>;
// { name?: string; profile?: { bio?: string; avatar?: string } }

const update: PartialUser = {
  profile: { bio: 'New bio' } // avatar is optional
};
```

---

#### `DeepRequired<T>`

```typescript
type DeepRequired<T> = T extends object
  ? { [P in keyof T]-?: DeepRequired<T[P]> }
  : T;
```

**Description:** Makes all properties required recursively.

**Example:**
```typescript
interface Config {
  api?: {
    url?: string;
    timeout?: number;
  };
}

type RequiredConfig = DeepRequired<Config>;
// { api: { url: string; timeout: number } }
```

---

#### `DeepReadonly<T>`

```typescript
type DeepReadonly<T> = T extends object
  ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
  : T;
```

**Description:** Makes all properties readonly recursively, ensuring complete immutability.

**Example:**
```typescript
const config: DeepReadonly<Config> = loadConfig();
// config.api.url = 'new'; // Error: Cannot assign to readonly property
```

---

#### `Prettify<T>`

```typescript
type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
```

**Description:** Flattens intersected types for better IntelliSense display.

**Example:**
```typescript
type Base = { a: string };
type Extended = { b: number };
type Merged = Base & Extended; // Shows as intersection
type Pretty = Prettify<Merged>; // Shows as { a: string; b: number }
```

---

#### `PartialBy<T, K>`

```typescript
type PartialBy<T, K extends keyof T> = Prettify<
  Omit<T, K> & Partial<Pick<T, K>>
>;
```

**Description:** Make specific keys optional while keeping others required.

**Example:**
```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

type CreateUser = PartialBy<User, 'id'>;
// { id?: string; name: string; email: string }

const newUser: CreateUser = {
  name: 'John',
  email: 'john@example.com'
  // id is optional
};
```

---

#### `RequiredBy<T, K>`

```typescript
type RequiredBy<T, K extends keyof T> = Prettify<
  Omit<T, K> & Required<Pick<T, K>>
>;
```

**Description:** Make specific keys required while keeping others as-is.

**Example:**
```typescript
interface Config {
  host?: string;
  port?: number;
  timeout?: number;
}

type RequiredConfig = RequiredBy<Config, 'host' | 'port'>;
// { host: string; port: number; timeout?: number }
```

---

#### `Merge<T, U>`

```typescript
type Merge<T, U> = Prettify<Omit<T, keyof U> & U>;
```

**Description:** Merge two types, with the second type taking precedence.

**Example:**
```typescript
type Base = { a: string; b: number };
type Override = { b: string; c: boolean };
type Merged = Merge<Base, Override>;
// { a: string; b: string; c: boolean }
```

---

#### `KeysOfType<T, V>`

```typescript
type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];
```

**Description:** Extract keys of a type that match a specific value type.

**Example:**
```typescript
interface User {
  id: string;
  name: string;
  age: number;
  active: boolean;
}

type StringKeys = KeysOfType<User, string>; // 'id' | 'name'
type NumberKeys = KeysOfType<User, number>; // 'age'
```

---

#### `PickByType<T, V>`

```typescript
type PickByType<T, V> = Pick<T, KeysOfType<T, V>>;
```

**Description:** Pick properties of a specific type.

**Example:**
```typescript
interface User {
  id: string;
  name: string;
  age: number;
}

type StringProps = PickByType<User, string>;
// { id: string; name: string }
```

---

#### `AsyncReturnType<T>`

```typescript
type AsyncReturnType<T extends (...args: unknown[]) => unknown> =
  ReturnType<T> extends Promise<infer R> ? R : ReturnType<T>;
```

**Description:** Extract return type from a function, unwrapping Promise if async.

**Example:**
```typescript
async function fetchUser(): Promise<User> {
  // Implementation
}

type UserType = AsyncReturnType<typeof fetchUser>; // User (not Promise<User>)
```

---

### React Types

React-specific utility types for component development.

#### `PropsOf<T>`

```typescript
type PropsOf<T extends React.ComponentType<never>> =
  T extends React.ComponentType<infer P> ? P : never;
```

**Description:** Extract props type from a React component.

**Example:**
```typescript
import type { PropsOf } from '@missionfabric-js/enzyme/types';

function Button(props: { label: string; onClick: () => void }) {
  return <button onClick={props.onClick}>{props.label}</button>;
}

type ButtonProps = PropsOf<typeof Button>;
// { label: string; onClick: () => void }
```

---

#### `PolymorphicProps<E, P>`

```typescript
type PolymorphicProps<
  E extends React.ElementType,
  P extends object = object,
> = Omit<P & React.ComponentPropsWithRef<E>, keyof P | 'as'> &
  PolymorphicAs<E>;
```

**Description:** Props for polymorphic components that support the "as" prop.

**Example:**
```typescript
import type { PolymorphicProps } from '@missionfabric-js/enzyme/types';

type ButtonProps<E extends React.ElementType = 'button'> = PolymorphicProps<
  E,
  { variant: 'primary' | 'secondary' }
>;

function Button<E extends React.ElementType = 'button'>({
  as,
  variant,
  ...props
}: ButtonProps<E>) {
  const Component = as || 'button';
  return <Component {...props} className={`btn-${variant}`} />;
}

// Usage:
<Button variant="primary">Click me</Button>
<Button as="a" href="/link" variant="secondary">Link Button</Button>
```

---

#### `ChildrenProps`

```typescript
interface ChildrenProps {
  readonly children: React.ReactNode;
}
```

**Description:** Props interface requiring children.

---

#### `OptionalChildrenProps`

```typescript
interface OptionalChildrenProps {
  readonly children?: React.ReactNode;
}
```

**Description:** Props interface with optional children.

---

### Async Types

Types for asynchronous operations and data fetching.

#### `AsyncState<T, E>`

```typescript
type AsyncState<T, E = Error> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'error'; readonly error: E };
```

**Description:** Discriminated union for async operation state.

**Example:**
```typescript
import type { AsyncState } from '@missionfabric-js/enzyme/types';

function UserProfile({ userId }: { userId: string }) {
  const [state, setState] = useState<AsyncState<User>>({
    status: 'idle'
  });

  useEffect(() => {
    setState({ status: 'loading' });
    fetchUser(userId)
      .then(data => setState({ status: 'success', data }))
      .catch(error => setState({ status: 'error', error }));
  }, [userId]);

  switch (state.status) {
    case 'idle':
    case 'loading':
      return <Spinner />;
    case 'success':
      return <div>{state.data.name}</div>;
    case 'error':
      return <div>Error: {state.error.message}</div>;
  }
}
```

---

#### `Resource<T>`

```typescript
interface Resource<T> {
  readonly data: T | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly isSuccess: boolean;
}
```

**Description:** Resource state for data fetching (similar to React Query).

**Example:**
```typescript
function useUserResource(id: string): Resource<User> {
  const [resource, setResource] = useState<Resource<User>>({
    data: undefined,
    isLoading: true,
    isError: false,
    error: null,
    isSuccess: false,
  });

  // Fetch implementation...

  return resource;
}
```

---

### Type Guards

Runtime type checking utilities.

#### `isDefined<T>()`

```typescript
function isDefined<T>(value: T | null | undefined): value is T
```

**Description:** Check if value is defined (not null or undefined).

**Parameters:**
- `value: T | null | undefined` - Value to check

**Returns:** `boolean` - Type predicate

**Example:**
```typescript
import { isDefined } from '@missionfabric-js/enzyme/types';

const users: (User | null)[] = [user1, null, user2];
const definedUsers = users.filter(isDefined); // User[]
```

---

#### `isNonEmptyString()`

```typescript
function isNonEmptyString(value: unknown): value is string
```

**Description:** Check if value is a non-empty string.

**Example:**
```typescript
import { isNonEmptyString } from '@missionfabric-js/enzyme/types';

function processInput(input: unknown) {
  if (isNonEmptyString(input)) {
    console.log(input.toUpperCase()); // Type-safe
  }
}
```

---

#### `isPlainObject()`

```typescript
function isPlainObject(value: unknown): value is Record<string, unknown>
```

**Description:** Check if value is a plain object (not array, null, etc.).

**Example:**
```typescript
import { isPlainObject } from '@missionfabric-js/enzyme/types';

function merge(a: unknown, b: unknown) {
  if (isPlainObject(a) && isPlainObject(b)) {
    return { ...a, ...b }; // Type-safe
  }
  throw new Error('Both arguments must be objects');
}
```

---

#### `assertNever()`

```typescript
function assertNever(value: never, message?: string): never
```

**Description:** Assert that a value is never (for exhaustive switch checks).

**Parameters:**
- `value: never` - The value that should be never
- `message?: string` - Optional error message

**Throws:** `Error` - Always throws

**Example:**
```typescript
import { assertNever } from '@missionfabric-js/enzyme/types';

type Status = 'pending' | 'complete' | 'failed';

function handleStatus(status: Status) {
  switch (status) {
    case 'pending':
      return 'Processing...';
    case 'complete':
      return 'Done!';
    case 'failed':
      return 'Error!';
    default:
      assertNever(status); // Ensures all cases are handled
  }
}
```

---

#### `isApiErrorResponse()`

```typescript
function isApiErrorResponse(response: unknown): response is ApiErrorResponse
```

**Description:** Type guard to check if a response is an API error response.

**Example:**
```typescript
import { isApiErrorResponse } from '@missionfabric-js/enzyme/types';

try {
  const response = await api.get('/users/123');
  if (isApiErrorResponse(response)) {
    console.error(response.error.message);
  } else {
    console.log(response.data);
  }
} catch (error) {
  if (isApiErrorResponse(error)) {
    handleApiError(error.error);
  }
}
```

---

#### `isValidationErrorResponse()`

```typescript
function isValidationErrorResponse(
  response: ApiErrorResponse
): response is ValidationErrorResponse
```

**Description:** Type guard to check if an error is a validation error with field-level errors.

**Example:**
```typescript
import { isValidationErrorResponse } from '@missionfabric-js/enzyme/types';

try {
  await api.post('/users', formData);
} catch (error) {
  if (isApiErrorResponse(error) && isValidationErrorResponse(error)) {
    error.error.validationErrors.forEach(({ field, message }) => {
      console.error(`${field}: ${message}`);
    });
  }
}
```

---

#### `isPaginatedResponse<T>()`

```typescript
function isPaginatedResponse<T>(
  response: ApiResponse<readonly T[]> | ApiResponse<T>
): response is PaginatedResponse<T>
```

**Description:** Type guard to check if response has pagination metadata.

**Example:**
```typescript
import { isPaginatedResponse } from '@missionfabric-js/enzyme/types';

const response = await api.get('/users');
if (isPaginatedResponse(response)) {
  console.log(`Total pages: ${response.meta.pagination.totalPages}`);
}
```

---

## Main Exports

**Import Path:** `@missionfabric-js/enzyme`

The main package exports essential components and utilities, with full module namespaces available.

### Direct Exports

```typescript
// Core essentials
export {
  AuthProvider,
  useAuth,
  FeatureFlagProvider,
  useFeatureFlag,
  FlagGate,
  ErrorBoundary,
  GlobalErrorBoundary,
  PerformanceProvider,
  initPerformanceMonitoring,
  createQueryKeyFactory,
} from './lib';

// API & Data
export { apiClient, ApiClient } from './lib/api';
export { authService } from './lib/auth';
export { useStore, getStoreState, resetStore } from './lib/state';

// Routing
export { routes, buildPath, createRouter, useRouteNavigate } from './lib/routing';

// Configuration
export { useConfig, ConfigProvider } from './lib/config';

// Contexts
export { ThemeContext, AuthContext } from './lib/contexts';
```

### Module Namespaces

All modules are available via namespaces for organized imports:

```typescript
import {
  system,
  types,
  api,
  auth,
  hooks,
  monitoring,
  // ... all other modules
} from '@missionfabric-js/enzyme';

// Use namespaced imports:
system.initializeSystem(config);
const status = system.getSystemStatus();
```

**Available Namespaces:**
- `api` - API client and utilities
- `auth` - Authentication and authorization
- `config` - Configuration management
- `contexts` - React contexts
- `coordination` - Cross-component coordination
- `core` - Core utilities
- `data` - Data management
- `feature` - Feature management
- `flags` - Feature flags
- `hooks` - Custom React hooks
- `hydration` - SSR hydration utilities
- `layouts` - Layout components
- `monitoring` - Error and performance monitoring
- `performance` - Performance utilities
- `queries` - Query management
- `realtime` - Real-time data sync
- `routing` - Routing utilities
- `security` - Security utilities
- `services` - Service layer
- `shared` - Shared utilities
- `state` - State management
- `streaming` - Data streaming
- `system` - System management
- `theme` - Theming utilities
- `ui` - UI components
- `utils` - General utilities
- `ux` - UX utilities
- `vdom` - Virtual DOM utilities

---

## Usage Examples

### Complete Application Setup

```typescript
import {
  initializeSystem,
  defaultSystemConfig
} from '@missionfabric-js/enzyme/lib/system';
import type { SystemConfig } from '@missionfabric-js/enzyme/lib/system';

// Initialize system on app startup
const appConfig: SystemConfig = {
  ...defaultSystemConfig,
  environment: import.meta.env.PROD ? 'production' : 'development',
  errorReporting: {
    enabled: import.meta.env.PROD,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    sampleRate: 0.5,
  },
  performance: {
    enabled: true,
    collectWebVitals: true,
    collectLongTasks: true,
    reporter: (metrics) => {
      // Send to analytics service
      analytics.track('performance', metrics);
    },
  },
  memory: {
    enabled: true,
    onPressure: (level) => {
      if (level === 'critical') {
        // Notify user
        toast.warning('High memory usage detected. Some data may be cleared.');
      }
    },
  },
};

initializeSystem(appConfig);
```

---

### Health Check Endpoint

```typescript
import { systemHealthCheck } from '@missionfabric-js/enzyme/lib/system';

// Express endpoint
app.get('/api/health', (req, res) => {
  const health = systemHealthCheck();

  const statusCode = health.healthy ? 200 : 503;

  res.status(statusCode).json({
    status: health.healthy ? 'healthy' : 'unhealthy',
    checks: health.checks,
    timestamp: new Date().toISOString(),
  });
});
```

---

### Type-Safe API Client

```typescript
import type {
  ApiResponse,
  PaginatedResponse,
  ListQueryParams
} from '@missionfabric-js/enzyme/types';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

class UserService {
  async getUser(id: string): Promise<ApiResponse<User>> {
    const response = await fetch(`/api/users/${id}`);
    return response.json();
  }

  async listUsers(
    params?: ListQueryParams
  ): Promise<PaginatedResponse<User>> {
    const queryString = new URLSearchParams(
      params as Record<string, string>
    ).toString();

    const response = await fetch(`/api/users?${queryString}`);
    return response.json();
  }

  async createUser(
    data: Omit<User, 'id'>
  ): Promise<ApiResponse<User>> {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  }
}
```

---

### Advanced Type Usage

```typescript
import type {
  DeepPartial,
  PartialBy,
  AsyncState,
  Branded,
} from '@missionfabric-js/enzyme/types';

// Branded IDs prevent mixing
type UserId = Branded<string, 'UserId'>;
type PostId = Branded<string, 'PostId'>;

interface Post {
  id: PostId;
  title: string;
  content: string;
  authorId: UserId;
  metadata: {
    views: number;
    likes: number;
    tags: string[];
  };
}

// Create post without ID
type CreatePostInput = PartialBy<Post, 'id'>;

// Partial update
type UpdatePostInput = DeepPartial<Post>;

// Async state management
function usePost(id: PostId) {
  const [state, setState] = useState<AsyncState<Post>>({
    status: 'idle'
  });

  useEffect(() => {
    setState({ status: 'loading' });

    fetchPost(id)
      .then(data => setState({ status: 'success', data }))
      .catch(error => setState({ status: 'error', error }));
  }, [id]);

  return state;
}

// Usage
function PostView({ postId }: { postId: PostId }) {
  const postState = usePost(postId);

  switch (postState.status) {
    case 'loading':
      return <Spinner />;
    case 'success':
      return <PostContent post={postState.data} />;
    case 'error':
      return <ErrorMessage error={postState.error} />;
    default:
      return null;
  }
}
```

---

### Form Validation with Type Guards

```typescript
import {
  isValidationErrorResponse,
  isApiErrorResponse
} from '@missionfabric-js/enzyme/types';
import type { ValidationErrorResponse } from '@missionfabric-js/enzyme/types';

interface FormState {
  values: Record<string, string>;
  errors: Record<string, string>;
}

async function handleSubmit(
  formData: FormState['values']
): Promise<void> {
  try {
    const response = await api.post('/users', formData);

    if (response.success) {
      toast.success('User created successfully!');
      router.push('/users');
    }
  } catch (error) {
    if (isApiErrorResponse(error)) {
      if (isValidationErrorResponse(error)) {
        // Handle field-level validation errors
        const fieldErrors: Record<string, string> = {};

        error.error.validationErrors.forEach(({ field, message }) => {
          fieldErrors[field] = message;
        });

        setFormState(prev => ({
          ...prev,
          errors: fieldErrors,
        }));
      } else {
        // Handle general API error
        toast.error(error.error.message);
      }
    } else {
      // Handle network error
      toast.error('Network error. Please try again.');
    }
  }
}
```

---

### Monitoring Dashboard

```typescript
import { getSystemStatus } from '@missionfabric-js/enzyme/lib/system';
import type { SystemStatus } from '@missionfabric-js/enzyme/lib/system';

function SystemDashboard() {
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getSystemStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!status) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      <h1>System Status</h1>

      <Section title="General">
        <Metric label="Environment" value={status.environment} />
        <Metric
          label="Uptime"
          value={`${Math.floor(status.uptime / 1000)}s`}
        />
      </Section>

      {status.memory && (
        <Section title="Memory">
          <Metric
            label="Used Heap"
            value={`${(status.memory.usedHeap / 1024 / 1024).toFixed(2)} MB`}
          />
          <Metric
            label="Total Heap"
            value={`${(status.memory.totalHeap / 1024 / 1024).toFixed(2)} MB`}
          />
          <Badge
            variant={
              status.memory.pressure === 'critical' ? 'error' :
              status.memory.pressure === 'moderate' ? 'warning' :
              'success'
            }
          >
            {status.memory.pressure}
          </Badge>
        </Section>
      )}

      <Section title="Performance">
        <Metric
          label="Long Tasks"
          value={status.performance.longTaskCount}
        />
        {Object.entries(status.performance.webVitals).map(([name, value]) => (
          <Metric key={name} label={name} value={value.toFixed(2)} />
        ))}
      </Section>

      <Section title="Errors">
        <Metric label="Total" value={status.errors.total} />
        <Metric label="Last Hour" value={status.errors.lastHour} />
      </Section>

      <Section title="Request Queue">
        <Metric label="Queued" value={status.requestQueue.queued} />
        <Metric label="Processing" value={status.requestQueue.processing} />
      </Section>
    </div>
  );
}
```

---

## Best Practices

### 1. System Initialization

Always initialize the system at the root of your application, before any components are rendered:

```typescript
// main.tsx
import { initializeSystem, defaultSystemConfig } from '@missionfabric-js/enzyme/lib/system';

initializeSystem(defaultSystemConfig);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

### 2. Use Branded Types for IDs

Prevent ID mixing bugs by using branded types:

```typescript
import type { UserId, PostId } from '@missionfabric-js/enzyme/types';

// ✅ Good - type-safe
function getPost(userId: UserId, postId: PostId) { }

// ❌ Bad - easy to mix up
function getPost(userId: string, postId: string) { }
```

---

### 3. Leverage Type Guards

Use type guards for runtime type checking:

```typescript
import { isApiErrorResponse, isValidationErrorResponse } from '@missionfabric-js/enzyme/types';

// ✅ Good - type-safe error handling
if (isApiErrorResponse(error) && isValidationErrorResponse(error)) {
  handleValidationErrors(error.error.validationErrors);
}

// ❌ Bad - unsafe casting
const validationError = error as ValidationErrorResponse;
```

---

### 4. Monitor System Health

Implement health checks for production monitoring:

```typescript
import { systemHealthCheck } from '@missionfabric-js/enzyme/lib/system';

// Periodic health checks
setInterval(() => {
  const health = systemHealthCheck();
  if (!health.healthy) {
    alerting.sendAlert('System unhealthy', health.checks);
  }
}, 60000); // Every minute
```

---

### 5. Handle Memory Pressure

Respond to memory pressure events:

```typescript
const config: SystemConfig = {
  ...defaultSystemConfig,
  memory: {
    enabled: true,
    onPressure: (level) => {
      if (level === 'moderate') {
        // Clear non-critical caches
        clearPreviewCache();
      } else if (level === 'critical') {
        // Aggressive cleanup
        clearAllCaches();
        closeNonEssentialConnections();
      }
    },
  },
};
```

---

## Conclusion

This documentation covers the System and Types modules of the @missionfabric-js/enzyme framework. For additional modules (auth, routing, state management, etc.), refer to their respective documentation files.

**Key Takeaways:**

1. **System Module** provides centralized initialization and monitoring
2. **Types Module** offers comprehensive TypeScript utilities for type safety
3. **Branded Types** prevent common ID and string confusion bugs
4. **Type Guards** enable safe runtime type checking
5. **Health Monitoring** ensures production reliability

For more information, visit the [official documentation](https://github.com/your-org/enzyme) or file an issue on GitHub.
