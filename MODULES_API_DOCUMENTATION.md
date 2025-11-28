# @missionfabric-js/enzyme - API Documentation

Complete API reference for the @missionfabric-js/enzyme framework modules.

**Version:** 1.0.0
**Modules Documented:** shared, state, streaming, theme

---

## Table of Contents

1. [Shared Utilities](#shared-utilities)
   - [Async Utilities](#async-utilities)
   - [Type Utilities](#type-utilities)
   - [Error Utilities](#error-utilities)
     - [UnifiedErrorHandler](#unifiederrorhandler-healthcare-compliant)
   - [Event Utilities](#event-utilities)
   - [Network Utilities](#network-utilities)
   - [Storage Utilities](#storage-utilities)
     - [StorageManager](#storagemanager-healthcare-compliant)
   - [Validation Utilities](#validation-utilities)
2. [State Management](#state-management)
   - [Main Store](#main-store)
   - [Store Hooks](#store-hooks)
   - [Store Factories](#store-factories)
   - [Selectors](#selectors)
   - [Feature Stores](#feature-stores)
   - [Multi-Tab State Synchronization](#multi-tab-state-synchronization)
     - [BroadcastSync](#createbroadcastsync)
3. [Streaming Engine](#streaming-engine)
   - [Core Components](#core-components)
   - [Stream Priorities](#stream-priorities)
   - [Stream States](#stream-states)
   - [Hooks](#hooks)
4. [Theme System](#theme-system)
   - [ThemeProvider](#themeprovider)
   - [Design Tokens](#design-tokens)
   - [Color Tokens](#color-tokens)
   - [Color Palettes](#color-palettes)

---

## Shared Utilities

The shared module (`@/lib/shared`) provides enterprise-grade utility functions for common operations with type safety, error handling, and performance optimization.

### Async Utilities

#### `sleep(ms: number, signal?: AbortSignal): Promise<void>`

Delay execution for a specified duration with optional abort signal support.

**Parameters:**
- `ms` (number): Duration in milliseconds
- `signal` (AbortSignal, optional): AbortSignal for cancellation

**Returns:** `Promise<void>`

**Throws:** Error if aborted

**Example:**
```typescript
// Simple delay
await sleep(1000);

// With abort signal
const controller = new AbortController();
setTimeout(() => controller.abort(), 500);
await sleep(1000, controller.signal); // throws after 500ms
```

---

#### `withRetry<T>(fn: () => Promise<T>, config?: RetryConfig): Promise<T>`

Execute an async function with retry logic and exponential backoff.

**Parameters:**
- `fn` (() => Promise<T>): Async function to execute
- `config` (RetryConfig, optional): Retry configuration

**RetryConfig Interface:**
```typescript
interface RetryConfig {
  maxAttempts?: number;        // default: 3
  initialDelayMs?: number;     // default: 1000
  maxDelayMs?: number;         // default: 30000
  backoffMultiplier?: number;  // default: 2
  jitter?: boolean;            // default: true
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
  signal?: AbortSignal;
}
```

**Returns:** `Promise<T>` - Result of the function

**Throws:** Last error if all retries fail

**Example:**
```typescript
const result = await withRetry(
  () => fetchData(),
  {
    maxAttempts: 5,
    initialDelayMs: 500,
    shouldRetry: (error) => error instanceof NetworkError,
    onRetry: (error, attempt) => console.log(`Retry ${attempt}...`),
  }
);
```

---

#### `RetryPolicy`

Fluent retry policy builder for configuring retry behavior.

**Methods:**
- `attempts(max: number): RetryPolicy` - Set maximum retry attempts
- `delays(initialMs: number, maxMs?: number): RetryPolicy` - Set initial and maximum delay
- `backoff(multiplier: number): RetryPolicy` - Set backoff multiplier
- `withJitter(enabled?: boolean): RetryPolicy` - Enable/disable jitter
- `retryIf(predicate): RetryPolicy` - Set retry condition predicate
- `onRetry(callback): RetryPolicy` - Set retry callback
- `execute<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T>` - Execute with this policy

**Example:**
```typescript
const policy = new RetryPolicy()
  .attempts(5)
  .delays(500, 10000)
  .backoff(2)
  .withJitter()
  .retryIf((error) => error instanceof NetworkError);

const result = await policy.execute(() => fetchData());
```

**Predefined Policies:**
```typescript
retryPolicies.none       // No retry - execute once
retryPolicies.quick      // 3 attempts, 100ms start, for fast operations
retryPolicies.standard   // 3 attempts, 1s start, for typical API calls
retryPolicies.extended   // 5 attempts, 2s start, for critical operations
retryPolicies.network    // Retries on network-related errors
```

---

#### `withTimeout<T>(fn: () => Promise<T>, timeoutMs: number, errorMessage?: string): Promise<T>`

Execute a function with a timeout limit.

**Parameters:**
- `fn` (() => Promise<T>): Async function to execute
- `timeoutMs` (number): Timeout in milliseconds
- `errorMessage` (string, optional): Custom error message

**Returns:** `Promise<T>` - Result of the function

**Throws:** `TimeoutError` if operation exceeds timeout

**Example:**
```typescript
const result = await withTimeout(
  () => fetchData(),
  5000,
  'Data fetch timed out'
);
```

---

#### `debounce<Args, R>(fn: Function, options: DebounceOptions | number): DebouncedFn<Args, R>`

Create a debounced function that delays execution until after the specified delay has elapsed since the last call.

**Parameters:**
- `fn` (Function): Function to debounce
- `options` (DebounceOptions | number): Debounce options or delay in milliseconds

**DebounceOptions Interface:**
```typescript
interface DebounceOptions {
  delayMs: number;
  maxWaitMs?: number;
  leading?: boolean;   // default: false
  trailing?: boolean;  // default: true
}
```

**Returns:** `DebouncedFn<Args, R>` with methods:
- `cancel()`: Cancel pending execution
- `flush()`: Execute immediately and return result
- `pending()`: Check if there's a pending execution

**Example:**
```typescript
const debouncedSearch = debounce(
  (query: string) => searchApi(query),
  { delayMs: 300, maxWaitMs: 1000 }
);

// These calls will be debounced
debouncedSearch('h');
debouncedSearch('he');
debouncedSearch('hel');
const result = await debouncedSearch('hello'); // Only this executes
```

---

#### `throttle<Args, R>(fn: Function, options: ThrottleOptions | number): ThrottledFn<Args, R>`

Create a throttled function that only executes at most once per interval.

**Parameters:**
- `fn` (Function): Function to throttle
- `options` (ThrottleOptions | number): Throttle options or interval in milliseconds

**ThrottleOptions Interface:**
```typescript
interface ThrottleOptions {
  intervalMs: number;
  leading?: boolean;   // default: true
  trailing?: boolean;  // default: true
}
```

**Returns:** `ThrottledFn<Args, R>` with methods:
- `cancel()`: Cancel pending trailing execution
- `flush()`: Execute immediately with last arguments

**Example:**
```typescript
const throttledScroll = throttle(
  (event: ScrollEvent) => handleScroll(event),
  { intervalMs: 100 }
);

window.addEventListener('scroll', throttledScroll);
```

---

#### `Mutex`

Mutex for exclusive access to a resource.

**Methods:**
- `acquire(): Promise<() => void>` - Acquire the lock, returns a release function
- `runExclusive<T>(fn: () => Promise<T>): Promise<T>` - Execute a function with exclusive lock
- `isLocked(): boolean` - Check if the mutex is currently locked
- `getQueueLength(): number` - Get the number of waiting acquires

**Example:**
```typescript
const mutex = new Mutex();

// Manual lock/unlock
const release = await mutex.acquire();
try {
  await criticalOperation();
} finally {
  release();
}

// Or use runExclusive
const result = await mutex.runExclusive(async () => {
  return await criticalOperation();
});
```

---

#### `Semaphore`

Semaphore for limiting concurrent access to a resource.

**Constructor:**
- `new Semaphore(permits: number)` - Create semaphore with specified permits

**Methods:**
- `acquire(): Promise<() => void>` - Acquire a permit, returns a release function
- `runWithPermit<T>(fn: () => Promise<T>): Promise<T>` - Execute a function with a permit
- `availablePermits(): number` - Get available permits
- `getQueueLength(): number` - Get the number of waiting acquires
- `getMaxPermits(): number` - Get max permits configured

**Example:**
```typescript
// Allow max 5 concurrent operations
const semaphore = new Semaphore(5);

const results = await Promise.all(
  urls.map(url =>
    semaphore.runWithPermit(() => fetch(url))
  )
);
```

---

#### `CancellationToken`

Cancellation token for aborting async operations.

**Properties:**
- `signal` (AbortSignal): Get the abort signal
- `isCancelled` (boolean): Check if cancelled

**Methods:**
- `cancel(reason?: string | Error): void` - Cancel the token with an optional reason
- `getCancellationReason(): Error | undefined` - Get cancellation reason
- `throwIfCancelled(): void` - Throw if cancelled
- `onCancel(callback: (reason?: Error) => void): () => void` - Register callback for cancellation

**Example:**
```typescript
const token = new CancellationToken();

// Start operation
fetchWithCancellation(url, token.signal);

// Cancel after 5 seconds
setTimeout(() => token.cancel('Timeout'), 5000);
```

---

#### `pMap<T, R>(items: T[], mapper: Function, concurrency?: number): Promise<R[]>`

Map over items with controlled concurrency.

**Parameters:**
- `items` (T[]): Items to process
- `mapper` ((item: T, index: number) => Promise<R>): Async mapper function
- `concurrency` (number, default: 5): Max concurrent operations

**Returns:** `Promise<R[]>` - Array of results in same order as input

**Example:**
```typescript
const results = await pMap(
  urls,
  async (url) => fetch(url).then(r => r.json()),
  3 // Max 3 concurrent requests
);
```

---

#### `pSeries<T, R>(items: T[], mapper: Function): Promise<R[]>`

Execute async functions sequentially.

**Parameters:**
- `items` (T[]): Items to process
- `mapper` ((item: T, index: number) => Promise<R>): Async mapper function

**Returns:** `Promise<R[]>` - Array of results in same order as input

**Example:**
```typescript
const results = await pSeries(
  items,
  async (item, index) => processItem(item)
);
```

---

### Type Utilities

#### Primitive Type Guards

```typescript
isDefined<T>(value: T | null | undefined): value is T
isNullish(value: unknown): value is null | undefined
isString(value: unknown): value is string
isNonEmptyString(value: unknown): value is string
isNumber(value: unknown): value is number
isFiniteNumber(value: unknown): value is number
isPositiveNumber(value: unknown): value is number
isNonNegativeNumber(value: unknown): value is number
isInteger(value: unknown): value is number
isBoolean(value: unknown): value is boolean
isSymbol(value: unknown): value is symbol
isBigInt(value: unknown): value is bigint
```

**Example:**
```typescript
const items = [1, null, 2, undefined, 3];
const defined = items.filter(isDefined); // [1, 2, 3]

if (isNonEmptyString(value)) {
  // value is guaranteed to be a non-empty string
  console.log(value.toUpperCase());
}
```

---

#### Complex Type Guards

```typescript
isFunction(value: unknown): value is (...args: unknown[]) => unknown
isObject(value: unknown): value is Record<string, unknown>
isPlainObject(value: unknown): value is Record<string, unknown>
isArray<T>(value: unknown): value is T[]
isNonEmptyArray<T>(value: unknown): value is [T, ...T[]]
isArrayOf<T>(value: unknown, guard: TypeGuard<T>): value is T[]
isDate(value: unknown): value is Date
isDateString(value: unknown): value is string
isPromise<T>(value: unknown): value is Promise<T>
isError(value: unknown): value is Error
isRegExp(value: unknown): value is RegExp
isMap<K, V>(value: unknown): value is Map<K, V>
isSet<T>(value: unknown): value is Set<T>
```

**Example:**
```typescript
const maybeStrings: unknown = ['a', 'b', 'c'];
if (isArrayOf(maybeStrings, isString)) {
  // maybeStrings is string[]
  console.log(maybeStrings.map(s => s.toUpperCase()));
}
```

---

#### Format Validators

```typescript
isEmail(value: unknown): value is string
isUrl(value: unknown): value is string
isUuid(value: unknown): value is string
isJsonString(value: unknown): value is string
isIsoDateString(value: unknown): value is string
```

**Example:**
```typescript
if (isEmail(input)) {
  // input is a valid email string
  sendEmail(input);
}
```

---

#### Object Property Guards

```typescript
hasKey<K extends string>(obj: unknown, key: K): obj is Record<K, unknown>
hasKeys<K extends string>(obj: unknown, keys: readonly K[]): obj is Record<K, unknown>
hasTypedKey<K, T>(obj: unknown, key: K, guard: TypeGuard<T>): obj is Record<K, T>
```

**Example:**
```typescript
const obj: unknown = { name: 'John' };
if (hasKey(obj, 'name')) {
  // obj.name is unknown but accessible
  console.log(obj.name);
}

if (hasTypedKey(obj, 'count', isNumber)) {
  // obj.count is number
  const doubled = obj.count * 2;
}
```

---

#### Type Narrowing Utilities

```typescript
assert<T>(value: unknown, guard: TypeGuard<T>, message?: string): asserts value is T
isOneOf<T>(value: unknown, allowedValues: readonly T[]): value is T
narrow<T>(value: unknown, guard: TypeGuard<T>): T | undefined
narrowOr<T>(value: unknown, guard: TypeGuard<T>, defaultValue: T): T
```

**Example:**
```typescript
function processUser(data: unknown) {
  assert(data, isObject, 'Expected object');
  // data is Record<string, unknown>

  const name = narrow(data.name, isString);
  const age = narrowOr(data.age, isNumber, 0);
}

const status: unknown = 'active';
if (isOneOf(status, ['active', 'inactive', 'pending'] as const)) {
  // status is 'active' | 'inactive' | 'pending'
}
```

---

#### Type Guard Factories

```typescript
createShapeGuard<T>(shape: ShapeDefinition<T>): (value: unknown) => value is T
createPartialShapeGuard<T>(shape: ShapeDefinition<T>): (value: unknown) => value is Partial<T>
createUnionGuard<T>(...guards: TypeGuard[]): (value: unknown) => value is T
```

**Example:**
```typescript
interface User {
  name: string;
  age: number;
}

const isUser = createShapeGuard<User>({
  name: isString,
  age: isNumber,
});

if (isUser(data)) {
  // data is User
  console.log(data.name, data.age);
}

const isStringOrNumber = createUnionGuard(isString, isNumber);
```

---

#### JSON Utilities

```typescript
safeJsonParse<T>(json: string, guard: TypeGuard<T>): T | undefined
safeJsonParseResult<T>(json: string, guard: TypeGuard<T>): [T, null] | [null, Error]
```

**Example:**
```typescript
const user = safeJsonParse(jsonString, isUser);
if (user) {
  // user is User
  console.log(user.name);
}

const [data, error] = safeJsonParseResult(jsonString, isUser);
if (error) {
  console.error('Parse failed:', error);
} else {
  console.log('Success:', data);
}
```

---

### Error Utilities

#### Error Classes

All error classes extend `AppError` with standardized properties:

```typescript
class AppError extends Error {
  readonly category: ErrorCategory;
  readonly severity: ErrorSeverity;
  readonly code?: string;
  readonly statusCode?: number;
  readonly metadata?: Record<string, unknown>;
  readonly timestamp: number;
  readonly isRetryable: boolean;
}
```

**Error Categories:**
```typescript
type ErrorCategory =
  | 'network'
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'not_found'
  | 'conflict'
  | 'rate_limit'
  | 'timeout'
  | 'server'
  | 'client'
  | 'unknown';
```

**Error Severity:**
```typescript
type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
```

---

#### Specific Error Classes

```typescript
new NetworkError(message: string, options?)
new ValidationError(message: string, fields: Record<string, string[]>, options?)
new AuthenticationError(message?: string, options?)
new AuthorizationError(message?: string, options?)
new NotFoundError(message?: string, resource?: string, options?)
new RateLimitError(message?: string, retryAfterMs?: number, options?)
new TimeoutError(message: string, timeoutMs: number, options?)
new ConflictError(message?: string, options?)
```

**Example:**
```typescript
throw new ValidationError('Invalid input', {
  email: ['Email is required', 'Email must be valid'],
  password: ['Password must be at least 8 characters'],
});

throw new NetworkError('Failed to fetch data', {
  statusCode: 503,
  metadata: { endpoint: '/api/users' }
});
```

---

#### Error Normalization

```typescript
normalizeError(error: unknown): AppError
```

Convert any error into an AppError instance with proper categorization.

**Example:**
```typescript
try {
  await fetchData();
} catch (error) {
  const appError = normalizeError(error);
  console.log(appError.category, appError.message);
}
```

---

#### Error Checking Functions

```typescript
isRetryableError(error: unknown): boolean
isErrorCategory(error: unknown, category: ErrorCategory): boolean
isNetworkError(error: unknown): error is NetworkError
isValidationError(error: unknown): error is ValidationError
isAuthenticationError(error: unknown): error is AuthenticationError
isTimeoutError(error: unknown): error is TimeoutError
```

**Example:**
```typescript
try {
  await fetchData();
} catch (error) {
  if (isRetryableError(error)) {
    // Retry the operation
    await retry(() => fetchData());
  }

  if (isValidationError(error)) {
    // Show field-level errors
    error.fields.forEach((field, errors) => {
      showFieldErrors(field, errors);
    });
  }
}
```

---

#### Result Type Pattern

```typescript
type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };

success<T>(data: T): Result<T, never>
failure<E>(error: E): Result<never, E>
tryCatch<T>(fn: () => Promise<T>): Promise<Result<T, AppError>>
tryCatchSync<T>(fn: () => T): Result<T, AppError>
unwrap<T>(result: Result<T>): T
unwrapOr<T>(result: Result<T>, defaultValue: T): T
mapResult<T, U>(result: Result<T>, fn: (data: T) => U): Result<U>
flatMapResult<T, U>(result: Result<T>, fn: (data: T) => Result<U>): Result<U>
```

**Example:**
```typescript
const result = await tryCatch(() => fetchData());
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error.message);
}

// Function composition
const final = flatMapResult(
  await tryCatch(() => fetchUser(id)),
  (user) => tryCatch(() => fetchOrders(user.id))
);
```

---

#### HTTP Error Factory

```typescript
fromHttpResponse(
  response: { status: number; statusText: string },
  body?: { message?: string; error?: string; errors?: Record<string, string[]> }
): AppError
```

Create appropriate error from HTTP response.

**Example:**
```typescript
const response = await fetch('/api/users');
if (!response.ok) {
  const body = await response.json();
  throw fromHttpResponse(response, body);
}
```

---

#### UnifiedErrorHandler (Healthcare-Compliant)

Enterprise error handler with HIPAA-compliant audit logging, PHI sanitization, and consistent error messaging.

**Features:**
- Automatic error categorization and severity calculation
- PHI pattern detection and sanitization
- HIPAA-compliant audit trail logging
- Batch error reporting with sampling
- User-safe error messages (no technical details or PHI exposed)
- Session tracking and error context

**Class Methods:**
```typescript
class UnifiedErrorHandler {
  // Get singleton instance
  static getInstance(config?: Partial<UnifiedErrorHandlerConfig>): UnifiedErrorHandler

  // Handle generic error with auto-categorization
  handle(error: Error | string, context?: Partial<ErrorContext>): StructuredError

  // Specific error handlers
  validation(message: string, code?: string): StructuredError
  network(message: string, metadata?: Record<string, unknown>): StructuredError
  unauthorized(message?: string): StructuredError
  forbidden(message?: string): StructuredError
  notFound(resource: string): StructuredError
  rateLimited(retryAfter?: number): StructuredError

  // Utility methods
  sanitizeMessage(message: string): string
  flush(): Promise<void>
}
```

**Configuration:**
```typescript
interface UnifiedErrorHandlerConfig {
  enableReporting: boolean;              // default: true
  enableAuditLogging: boolean;           // default: true (required for healthcare)
  includeStackTracesForUsers: boolean;   // default: false (security)
  enableDetailedLogging: boolean;        // default: true in dev, false in prod
  reportingEndpoint: string;             // default: '/api/errors'
  auditEndpoint: string;                 // default: '/api/audit/errors'
  sampleRate: number;                    // default: 1 (100%)
  maxBufferSize: number;                 // default: 10
  maxBatchSize: number;                  // default: 5
}
```

**Error Categories:**
```typescript
enum ErrorCategory {
  Validation = 'VALIDATION',
  NotFound = 'NOT_FOUND',
  Unauthorized = 'UNAUTHORIZED',
  Forbidden = 'FORBIDDEN',
  Network = 'NETWORK',
  Timeout = 'TIMEOUT',
  RateLimit = 'RATE_LIMIT',
  BadGateway = 'BAD_GATEWAY',
  ServiceUnavailable = 'SERVICE_UNAVAILABLE',
  InternalServer = 'INTERNAL_SERVER',
  Assertion = 'ASSERTION',
  Runtime = 'RUNTIME',
  Unknown = 'UNKNOWN',
}
```

**Error Severity:**
```typescript
enum ErrorSeverity {
  Info = 'INFO',
  Warning = 'WARNING',
  Error = 'ERROR',
  Critical = 'CRITICAL',
}
```

**Example:**
```typescript
import { getErrorHandler } from '@/lib/shared/UnifiedErrorHandler';

const handler = getErrorHandler();

// Generic error handling with auto-categorization
try {
  await fetchUserData();
} catch (error) {
  const structured = handler.handle(error, {
    userAction: 'fetch_user',
    route: '/dashboard',
    tags: { userId: '123' }
  });

  // Show user-safe message (no PHI, no technical details)
  toast.error(structured.userMessage);

  // Error is automatically logged to audit trail
  // and batched for reporting
}

// Specific error types
handler.validation('Email is invalid', 'INVALID_EMAIL');
handler.network('Failed to connect', { endpoint: '/api/users', retryable: true });
handler.unauthorized('Session expired');
handler.notFound('User');
handler.rateLimited(5000);

// PHI sanitization
const sanitized = handler.sanitizeMessage(
  'Patient MRN: AB123456 email: patient@example.com'
); // -> 'Patient MRN: [MRN] email: [EMAIL]'

// Force flush buffered errors
await handler.flush();
```

**PHI Patterns Detected:**
- Medical Record Numbers (MRN)
- Social Security Numbers (SSN)
- Dates of Birth (DOB)
- Email addresses
- Phone numbers
- Credit card numbers

**Structured Error Object:**
```typescript
interface StructuredError {
  id: string;                           // Unique error ID
  category: ErrorCategory;              // Auto-categorized
  severity: ErrorSeverity;              // Auto-calculated
  userMessage: string;                  // Safe for display (sanitized)
  internalMessage: string;              // Full message for logs
  code?: string;                        // Error code
  originalError?: Error;                // Original error object
  context: ErrorContext;                // Full context
  stackTrace?: string;                  // Stack trace
  metadata?: Record<string, unknown>;   // Additional data
}
```

**React Hook:**
```typescript
import { useErrorHandler } from '@/lib/shared/UnifiedErrorHandler';

function MyComponent() {
  const handler = useErrorHandler();

  const handleSubmit = async () => {
    try {
      await submitForm();
    } catch (error) {
      const structured = handler.handle(error, {
        userAction: 'submit_form',
        route: '/forms/user-info'
      });
      toast.error(structured.userMessage);
    }
  };

  return <button onClick={handleSubmit}>Submit</button>;
}
```

---

### Event Utilities

#### UnifiedEventEmitter

Type-safe event emitter with priority, middleware, and advanced features.

**Creation:**
```typescript
const emitter = new UnifiedEventEmitter<EventMap>(options?);

// Or use factory
const emitter = createEventEmitter<EventMap>(options?);
```

**Configuration:**
```typescript
interface UnifiedEventEmitterOptions {
  maxListeners?: number;          // default: 10
  debug?: boolean;                // default: false
  onError?: (error: Error, event: string) => void;
  enableMiddleware?: boolean;     // default: true
  enableDeduplication?: boolean;  // default: false
  enablePersistence?: boolean;    // default: false
  enableStatistics?: boolean;     // default: false
  enableDeadLetters?: boolean;    // default: false
  deduplicationWindow?: number;   // default: 1000
  maxPersistedEvents?: number;    // default: 100
  maxDeadLetters?: number;        // default: 50
  maxRetries?: number;            // default: 3
  retryDelayMs?: number;          // default: 1000
}
```

**Core Methods:**
```typescript
on<K>(event: K, handler: EventHandler<Events[K]>, options?: EventListenerOptions): Unsubscribe
once<K>(event: K, handler: EventHandler<Events[K]>, options?): Unsubscribe
off<K>(event: K, handler: EventHandler<Events[K]>): void
emit<K>(event: K, data: Events[K]): Promise<void>
emitSync<K>(event: K, data: Events[K]): void
removeAllListeners<K>(event?: K): void
listenerCount<K>(event: K): number
eventNames(): (keyof Events)[]
```

**Event Listener Options:**
```typescript
interface EventListenerOptions {
  once?: boolean;
  priority?: number;              // higher executes first
  signal?: AbortSignal;
  debounce?: number;
  throttle?: number;
  sourceFilter?: string | RegExp | string[];
  targetFilter?: string;
  transform?: (data: unknown) => unknown;
  filter?: (data: unknown) => boolean;
}
```

**Example:**
```typescript
interface MyEvents {
  'user:created': { id: string; name: string };
  'user:deleted': { id: string };
}

const emitter = new UnifiedEventEmitter<MyEvents>();

// Subscribe
emitter.on('user:created', (data) => {
  console.log(`User ${data.name} created`);
});

// Subscribe with priority
emitter.on('user:created', handler, { priority: 10 });

// Subscribe with debounce
emitter.on('user:created', handler, { debounce: 300 });

// Emit
await emitter.emit('user:created', { id: '1', name: 'John' });
```

---

#### Advanced Features

**Wait for Event:**
```typescript
waitFor<K>(event: K, options?: {
  timeout?: number;
  filter?: (data: Events[K]) => boolean;
}): Promise<Events[K]>
```

**Example:**
```typescript
const user = await emitter.waitFor('user:created', {
  timeout: 5000,
  filter: (data) => data.id === '123'
});
```

**Middleware:**
```typescript
use<K>(event: K, middleware: EventMiddleware<Events[K]>): Unsubscribe
```

**Example:**
```typescript
emitter.use('user:created', async (data, next) => {
  console.log('Before:', data);
  await next(data);
  console.log('After');
});
```

**Request-Response Pattern:**
```typescript
request<TReq, TRes>(
  requestEvent: TReq,
  responseEvent: TRes,
  payload: Events[TReq],
  timeout?: number
): Promise<Events[TRes]>
```

**Example:**
```typescript
const response = await emitter.request(
  'user:fetch',
  'user:fetched',
  { id: '123' },
  5000
);
```

**Statistics:**
```typescript
getStats(): EventBusStats
resetStats(): void
```

**History and Replay:**
```typescript
getHistory(): ReadonlyArray<EventWithMetadata<unknown>>
replay(filter?: (event: EventWithMetadata<unknown>) => boolean): void
clearHistory(): void
```

---

#### Event Handler Utilities

```typescript
dedupeHandler<T>(handler: EventHandler<T>, keyFn: (data: T) => string, windowMs: number): EventHandler<T>
batchHandler<T>(handler: (events: T[]) => void | Promise<void>, intervalMs: number): EventHandler<T>
filterHandler<T>(handler: EventHandler<T>, predicate: (data: T) => boolean): EventHandler<T>
mapHandler<T, U>(handler: EventHandler<U>, transform: (data: T) => U): EventHandler<T>
combineHandlers<T>(...handlers: EventHandler<T>[]): EventHandler<T>
```

**Example:**
```typescript
const handler = dedupeHandler(
  (data) => console.log(data),
  (data) => data.id,
  1000 // 1 second window
);

const batchedHandler = batchHandler(
  (events) => console.log(`Received ${events.length} events`),
  500 // Batch every 500ms
);
```

---

#### DOM Event Utilities

```typescript
addEventListener<K>(
  target: EventTarget,
  event: K,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions
): Unsubscribe

addDisposableEventListener(
  target: EventTarget,
  event: string,
  handler: EventListener,
  signal: AbortSignal,
  options?: Omit<AddEventListenerOptions, 'signal'>
): void

dispatchCustomEvent<T>(
  target: EventTarget,
  eventName: string,
  detail: T,
  options?: Omit<CustomEventInit<T>, 'detail'>
): boolean

onCustomEvent<T>(
  target: EventTarget,
  eventName: string,
  handler: (detail: T) => void,
  options?: boolean | AddEventListenerOptions
): Unsubscribe
```

**Example:**
```typescript
// Auto-cleanup event listener
const unsubscribe = addEventListener(
  window,
  'resize',
  () => console.log('Resized')
);
// Later: unsubscribe();

// Custom events
dispatchCustomEvent(element, 'custom:action', { id: 123 });
onCustomEvent<{ id: number }>(element, 'custom:action', (detail) => {
  console.log(detail.id);
});
```

---

### Network Utilities

#### `getNetworkInfo(): NetworkInfo`

Get current network information with quality assessment.

**Returns:**
```typescript
interface NetworkInfo {
  online: boolean;
  type: ConnectionType;         // 'wifi' | '4g' | '3g' | '2g' | etc.
  effectiveType: EffectiveType; // 'slow-2g' | '2g' | '3g' | '4g'
  downlinkMbps: number;
  rttMs: number;
  saveData: boolean;
  quality: NetworkQuality;      // 'excellent' | 'good' | 'fair' | 'poor' | 'offline'
  timestamp: number;
}
```

**Example:**
```typescript
const network = getNetworkInfo();
if (network.quality === 'poor') {
  // Show low-quality content
  loadLowQualityImages();
}
```

---

#### Network Status Checks

```typescript
isOnline(): boolean
meetsMinimumQuality(minimum: EffectiveType): boolean
isSlowConnection(thresholds?: { maxDownlinkMbps?: number; maxRttMs?: number }): boolean
getQualityLabel(quality?: NetworkQuality): string
```

**Example:**
```typescript
if (isSlowConnection({ maxDownlinkMbps: 1.5 })) {
  // Disable auto-play videos
  disableAutoplay();
}

if (meetsMinimumQuality('3g')) {
  // Prefetch next page
  prefetchNextPage();
}
```

---

#### Network Change Monitoring

```typescript
onNetworkChange(callback: (info: NetworkInfo) => void): () => void
onOnlineChange(callback: (online: boolean) => void): () => void
```

**Example:**
```typescript
const unsubscribe = onNetworkChange((network) => {
  console.log('Network changed:', network.quality);
  updateUIBasedOnNetwork(network);
});

// Later: unsubscribe();
```

---

#### Prefetch Decision Utilities

```typescript
shouldAllowPrefetch(options?: {
  minQuality?: EffectiveType;
  respectDataSaver?: boolean;
  requireOnline?: boolean;
}): boolean

getLoadingStrategy(): 'eager' | 'lazy' | 'none'
getRecommendedImageQuality(): 'high' | 'medium' | 'low'
```

**Example:**
```typescript
if (shouldAllowPrefetch({ minQuality: '3g', respectDataSaver: true })) {
  prefetchNextPage();
}

const strategy = getLoadingStrategy();
if (strategy === 'eager') {
  loadAllImages();
}
```

---

#### Connection Testing

```typescript
pingEndpoint(url: string, timeoutMs?: number): Promise<boolean>
measureRtt(url: string, samples?: number): Promise<number | null>
```

**Example:**
```typescript
const isReachable = await pingEndpoint('https://api.example.com');
const avgRtt = await measureRtt('https://api.example.com', 3);
console.log(`Average RTT: ${avgRtt}ms`);
```

---

### Storage Utilities

#### StorageWrapper

Type-safe storage wrapper with TTL support.

**Creation:**
```typescript
const storage = new StorageWrapper(localStorage, config?);

// Or use factories
const local = createLocalStorage({ prefix: 'app' });
const session = createSessionStorage({ prefix: 'app' });
const memory = createMemoryStorage();
```

**Configuration:**
```typescript
interface StorageConfig {
  prefix?: string;        // Prefix for all keys
  defaultTtlMs?: number;  // Default TTL in milliseconds
  version?: number;       // Storage version
}
```

**Methods:**
```typescript
set<T>(key: string, value: T, options?: StorageSetOptions): boolean
get<T>(key: string, defaultValue?: T): T | undefined
remove(key: string): void
has(key: string): boolean
keys(): string[]
clear(): void
cleanup(): number
getStats(): { itemCount: number; totalSize: number; expiredCount: number }
```

**StorageSetOptions:**
```typescript
interface StorageSetOptions {
  ttlMs?: number;       // Time-to-live in milliseconds (0 = no expiration)
  version?: number;     // Version number for migrations
}
```

**Example:**
```typescript
const storage = new StorageWrapper(localStorage, { prefix: 'app' });

// Set with TTL
storage.set('user', { name: 'John' }, { ttlMs: 3600000 }); // 1 hour

// Get with type
const user = storage.get<User>('user');

// Check expiration
const stats = storage.getStats();
console.log(`${stats.expiredCount} expired items`);

// Cleanup expired items
const removed = storage.cleanup();
```

---

#### Convenience Functions

```typescript
// localStorage shortcuts
setLocal<T>(key: string, value: T, options?: StorageSetOptions): boolean
getLocal<T>(key: string, defaultValue?: T): T | undefined
removeLocal(key: string): void

// sessionStorage shortcuts
setSession<T>(key: string, value: T, options?: StorageSetOptions): boolean
getSession<T>(key: string, defaultValue?: T): T | undefined
removeSession(key: string): void
```

**Example:**
```typescript
setLocal('theme', 'dark');
const theme = getLocal<string>('theme', 'light');
removeLocal('theme');
```

---

#### Storage Events

```typescript
onStorageChange(
  callback: (event: StorageEvent) => void,
  options?: { key?: string; storage?: Storage }
): () => void

watchStorageKey<T>(
  key: string,
  callback: (newValue: T | null, oldValue: T | null) => void,
  options?: { storage?: Storage }
): () => void
```

**Example:**
```typescript
const unsubscribe = watchStorageKey<string>(
  'theme',
  (newValue, oldValue) => {
    console.log(`Theme changed from ${oldValue} to ${newValue}`);
  }
);
```

---

#### StorageManager (Healthcare-Compliant)

Enterprise storage manager with PHI protection and encryption support.

**Methods:**
```typescript
setItem<T>(key: string, value: T, options?: StorageOptions): void
getItem<T>(key: string, options?: StorageOptions): T | undefined
removeItem(key: string, options?: StorageOptions): void
hasItem(key: string): boolean
setSessionItem<T>(key: string, value: T, options?: StorageOptions): void
getSessionItem<T>(key: string, options?: StorageOptions): T | undefined
setMemoryItem<T>(key: string, value: T, options?: StorageOptions): void
getMemoryItem<T>(key: string): T | undefined
setItemAsync<T>(key: string, value: T, options?: StorageOptions): Promise<void>
getItemAsync<T>(key: string, options?: StorageOptions): Promise<T | undefined>
clearLocalStorage(): void
clearSessionStorage(): void
clearAll(): Promise<void>
```

**StorageOptions:**
```typescript
interface StorageOptions {
  ttl?: number;                        // Time to live in ms
  containsPHI?: boolean;               // Mark as Protected Health Information
  encryption?: EncryptionAlgorithm;    // 'none' | 'AES-GCM'
  throwOnError?: boolean;              // Default: true
}
```

**Example:**
```typescript
const storage = StorageManager.getInstance();

// Store with healthcare compliance
storage.setItem('patientId', 'PAT-12345', {
  containsPHI: true,
  encryption: EncryptionAlgorithm.AES_GCM,
  ttl: 24 * 60 * 60 * 1000, // 24 hours
});

// Async IndexedDB storage
await storage.setItemAsync('largeData', complexObject);
```

---

### Validation Utilities

#### String Validators

```typescript
validateRequired(value: unknown, fieldName?: string): ValidationResult
validateMinLength(value: string, minLength: number, fieldName?: string): ValidationResult
validateMaxLength(value: string, maxLength: number, fieldName?: string): ValidationResult
validateLength(value: string, min: number, max: number, fieldName?: string): ValidationResult
validatePattern(value: string, pattern: RegExp, message: string): ValidationResult
validateEmail(value: string, fieldName?: string): ValidationResult
validateUrl(value: string, fieldName?: string): ValidationResult
validatePhone(value: string, fieldName?: string): ValidationResult
validateUuid(value: string, fieldName?: string): ValidationResult
validateSlug(value: string, fieldName?: string): ValidationResult
validateAlphanumeric(value: string, fieldName?: string): ValidationResult
```

**ValidationResult:**
```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

**Example:**
```typescript
const emailResult = validateEmail(input, 'Email');
if (!emailResult.valid) {
  console.error(emailResult.errors);
}

const slugResult = validateSlug(title, 'URL Slug');
```

---

#### Number Validators

```typescript
validateNumberRange(value: number, min: number, max: number, fieldName?: string): ValidationResult
validateMin(value: number, min: number, fieldName?: string): ValidationResult
validateMax(value: number, max: number, fieldName?: string): ValidationResult
validatePositive(value: number, fieldName?: string): ValidationResult
validateNonNegative(value: number, fieldName?: string): ValidationResult
validateInteger(value: number, fieldName?: string): ValidationResult
```

**Example:**
```typescript
const ageResult = validateNumberRange(age, 0, 120, 'Age');
const countResult = validatePositive(count, 'Count');
```

---

#### Array Validators

```typescript
validateArrayNotEmpty(value: unknown[], fieldName?: string): ValidationResult
validateArrayLength(value: unknown[], min: number, max: number, fieldName?: string): ValidationResult
validateArrayItems<T>(value: T[], itemValidator: Function, fieldName?: string): ValidationResult
validateUnique<T>(value: T[], keyFn?: Function, fieldName?: string): ValidationResult
```

**Example:**
```typescript
const itemsResult = validateArrayItems(
  items,
  (item, index) => validateRequired(item.name, `Item ${index} name`),
  'Items'
);

const uniqueResult = validateUnique(
  users,
  (user) => user.email,
  'Users'
);
```

---

#### Date Validators

```typescript
validateFutureDate(value: Date, fieldName?: string): ValidationResult
validatePastDate(value: Date, fieldName?: string): ValidationResult
validateDateRange(value: Date, min: Date, max: Date, fieldName?: string): ValidationResult
validateAge(birthDate: Date, minAge: number, maxAge?: number, fieldName?: string): ValidationResult
```

**Example:**
```typescript
const dobResult = validateAge(birthDate, 18, 100, 'Age');
const eventDateResult = validateFutureDate(eventDate, 'Event Date');
```

---

#### Validator Builder

```typescript
createValidator<T>(): ValidatorBuilder<T>
```

**Example:**
```typescript
const validateUsername = createValidator<string>()
  .add((v) => validateRequired(v, 'Username'))
  .add((v) => validateMinLength(v, 3, 'Username'))
  .add((v) => validateMaxLength(v, 20, 'Username'))
  .add((v) => validateAlphanumeric(v, 'Username'))
  .build();

const result = validateUsername('john123');
```

---

#### Schema Validation

```typescript
validateSchema(
  data: Record<string, unknown>,
  schema: Record<string, FieldSchema>
): SchemaValidationResult
```

**FieldSchema:**
```typescript
interface FieldSchema<T = unknown> {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';
  validators?: Validator<T>[];
  schema?: Record<string, FieldSchema>;  // For nested objects
  items?: FieldSchema;                   // For arrays
}
```

**Example:**
```typescript
const schema: Record<string, FieldSchema> = {
  name: { required: true, type: 'string' },
  email: {
    required: true,
    type: 'string',
    validators: [(v) => validateEmail(v as string)]
  },
  age: {
    type: 'number',
    validators: [(v) => validateMin(v as number, 0)]
  },
};

const result = validateSchema(formData, schema);
if (!result.valid) {
  console.error(result.errors);
}
```

---

#### Sanitization Functions

```typescript
sanitizeString(value: string): string
stripHtml(value: string): string
escapeHtml(value: string): string
normalizeEmail(email: string): string
normalizePhone(phone: string): string
createSlug(value: string): string
```

**Example:**
```typescript
const clean = sanitizeString("  hello   world  "); // "hello world"
const safe = escapeHtml("<script>alert('xss')</script>");
const email = normalizeEmail("User@Example.COM"); // "user@example.com"
const slug = createSlug("Hello World!"); // "hello-world"
```

---

## State Management

The state module (`@/lib/state`) provides a production-grade state management system built on Zustand with Immer, DevTools, persistence, and type safety.

### Main Store

#### `useStore`

Main store hook with full middleware stack.

**Example:**
```typescript
import { useStore } from '@/lib/state';

function MyComponent() {
  // Select single value
  const locale = useStore((state) => state.locale);

  // Select multiple values with shallow equality
  const { sidebarOpen, activeModal } = useStore(
    (state) => ({
      sidebarOpen: state.sidebarOpen,
      activeModal: state.activeModal,
    }),
    shallow
  );

  // Select action
  const toggleSidebar = useStore((state) => state.toggleSidebar);
}
```

---

#### Store Utilities

```typescript
getStoreState(): StoreState
subscribeToStore<T>(selector: StoreSelector<T>, callback: Function): () => void
hasStoreHydrated(): boolean
waitForHydration(timeoutMs?: number): Promise<boolean>
resetStore(clearSettings?: boolean): void
clearPersistedStore(): void
```

**Example:**
```typescript
// Outside React components
const currentLocale = getStoreState().locale;

const unsubscribe = subscribeToStore(
  (state) => state.locale,
  (newLocale, prevLocale) => {
    console.log('Locale changed:', prevLocale, '->', newLocale);
  }
);

// Wait for hydration before rendering
const hydrated = await waitForHydration();
if (hydrated) {
  // Store is now hydrated
}
```

---

### Store Hooks

#### Basic Hooks

```typescript
useStoreState<T>(selector: StoreSelector<T>, equalityFn?): T
useShallowState<T>(selector: StoreSelector<T>): T
useStoreAction<T>(selector: StoreSelector<T>): T
```

**Example:**
```typescript
const count = useStoreState((state) => state.count);
const settings = useShallowState((state) => ({
  locale: state.locale,
  timezone: state.timezone,
}));
const toggleSidebar = useStoreAction((state) => state.toggleSidebar);
```

---

#### Slice Hooks

```typescript
useUIState(): UIState
useUIActions(): UIActions
useSessionState(): SessionState
useSessionActions(): SessionActions
useSettingsState(): SettingsState
useSettingsActions(): SettingsActions
```

**Example:**
```typescript
const { sidebarOpen, activeModal } = useUIState();
const { toggleSidebar, openModal } = useUIActions();

const { locale, timezone } = useSettingsState();
const { setLocale, setTimezone } = useSettingsActions();
```

---

#### Convenience Hooks

```typescript
useSidebar(): {
  isOpen: boolean;
  isCollapsed: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  setCollapsed: (collapsed: boolean) => void;
}

useModal<T>(): {
  activeModal: string | null;
  data: T | null;
  isOpen: boolean;
  open: (id: string, data?: Record<string, unknown>) => void;
  close: () => void;
}

useIsModalOpen(modalId: string): boolean

useLoading(): {
  isLoading: boolean;
  message: string | null;
  start: (message?: string) => void;
  stop: () => void;
}
```

**Example:**
```typescript
const sidebar = useSidebar();
sidebar.toggle();

const modal = useModal<{ userId: string }>();
modal.open('user-details', { userId: '123' });
if (modal.data) {
  console.log(modal.data.userId);
}

const loading = useLoading();
loading.start('Fetching data...');
```

---

#### Advanced Hooks

```typescript
useStoreSubscription<T>(
  selector: StoreSelector<T>,
  callback: (value: T, prevValue: T) => void,
  options?: { fireImmediately?: boolean }
): void

useDebouncedState<T>(selector: StoreSelector<T>, delay?: number): T
usePreviousState<T>(selector: StoreSelector<T>): T | undefined
useStateChange<T>(selector: StoreSelector<T>): {
  value: T;
  initialValue: T;
  hasChanged: boolean;
  changeCount: number;
}
```

**Example:**
```typescript
// Subscribe to changes
useStoreSubscription(
  (state) => state.locale,
  (newLocale, oldLocale) => {
    console.log(`Locale changed from ${oldLocale} to ${newLocale}`);
  }
);

// Debounced search
const debouncedSearch = useDebouncedState(
  (state) => state.searchQuery,
  300
);

// Track changes
const { value, hasChanged, changeCount } = useStateChange(
  (state) => state.count
);
```

---

### Store Factories

#### `createAppStore`

Create a type-safe Zustand store with full middleware stack.

**Signature:**
```typescript
createAppStore<TState>(
  initializer: StateCreator<TState>,
  config: AppStoreConfig<TState>
)
```

**Configuration:**
```typescript
interface AppStoreConfig<TState> {
  name: string;
  persist?: {
    key: string;
    partialize?: (state: TState) => Partial<TState>;
    version?: number;
    migrate?: (persistedState: unknown, version: number) => TState;
    skipHydration?: boolean;
  };
  devtools?: boolean;
  devtoolsOptions?: {
    enabled?: boolean;
    anonymousActionType?: string;
    trace?: boolean;
    traceLimit?: number;
  };
}
```

**Example:**
```typescript
const useStore = createAppStore(
  (set, get) => ({
    count: 0,
    increment: () => set((state) => { state.count += 1 }, false, { type: 'increment' }),
  }),
  {
    name: 'CounterStore',
    persist: {
      key: 'counter',
      partialize: (state) => ({ count: state.count }),
    }
  }
);
```

---

#### `createSlice`

Create a type-safe slice with automatic action naming.

**Example:**
```typescript
export const counterSlice = createSlice({
  name: 'counter',
  initialState: { count: 0 },
  actions: (set, get) => ({
    increment: () => {
      set((state) => { state.count += 1 }, 'increment');
    },
    decrement: () => {
      set((state) => { state.count -= 1 }, 'decrement');
    },
    incrementBy: (amount: number) => {
      set((state) => { state.count += amount }, 'incrementBy');
    },
    getCount: () => get().count,
  }),
});
```

---

### Selectors

#### `createSelector`

Create a memoized selector that only recomputes when dependencies change.

**Signature:**
```typescript
createSelector<TState, TDeps, TResult>(
  dependencySelectors: Selector[],
  combiner: (...deps: TDeps) => TResult,
  equalityFn?: EqualityFn<TResult>
): Selector<TState, TResult>
```

**Example:**
```typescript
const selectFullName = createSelector(
  [selectFirstName, selectLastName],
  (first, last) => `${first} ${last}`
);

const selectFilteredItems = createSelector(
  [selectItems, selectFilter],
  (items, filter) => items.filter(item => item.includes(filter)),
  shallow
);
```

---

#### `createObjectSelector`

Create a selector that returns a stable object reference.

**Example:**
```typescript
const selectDisplaySettings = createObjectSelector((state) => ({
  locale: state.locale,
  timezone: state.timezone,
  dateFormat: state.dateFormat,
}));
```

---

#### `createArraySelector`

Create a selector that returns a stable array reference.

**Example:**
```typescript
const selectActiveItems = createArraySelector((state) =>
  state.items.filter(item => item.active)
);
```

---

#### `createParameterizedSelector`

Create a parameterized selector (selector factory) with LRU cache.

**Example:**
```typescript
const selectItemById = createParameterizedSelector(
  (id: string) => (state) => state.items.find(item => item.id === id)
);

// In component:
const item = useStore(selectItemById('123'));
```

---

#### `combineSelectors`

Combine multiple selectors into one with shallow equality.

**Example:**
```typescript
const selectUserProfile = combineSelectors({
  name: selectUserName,
  email: selectUserEmail,
  avatar: selectUserAvatar,
});

// In component:
const { name, email, avatar } = useStore(selectUserProfile, shallow);
```

---

### Feature Stores

#### `createFeatureStore`

Create a feature-scoped store with auto-registration.

**Example:**
```typescript
interface TasksState {
  tasks: Task[];
  selectedId: string | null;
}

interface TasksActions {
  addTask: (task: Task) => void;
  selectTask: (id: string | null) => void;
}

export const useTasksStore = createFeatureStore<TasksState & TasksActions>(
  (set) => ({
    tasks: [],
    selectedId: null,
    addTask: (task) => {
      set((state) => { state.tasks.push(task) }, false, { type: 'tasks/addTask' });
    },
    selectTask: (id) => {
      set((state) => { state.selectedId = id }, false, { type: 'tasks/selectTask' });
    },
  }),
  {
    name: 'tasks',
    persist: {
      partialize: (s) => ({ tasks: s.tasks })
    }
  }
);
```

---

#### `createLazyFeatureStore`

Create a lazy feature store (only created when first accessed).

**Example:**
```typescript
export const tasksStoreLazy = createLazyFeatureStore<TasksState & TasksActions>(
  (set) => ({
    tasks: [],
    addTask: (task) => set((state) => { state.tasks.push(task) }),
  }),
  { name: 'tasks' }
);

// Later, when feature is needed:
const store = tasksStoreLazy.getStore();
const tasks = store((s) => s.tasks);
```

---

#### Feature Store Utilities

```typescript
createFeatureStoreHooks(useStore): {
  useStore: EnhancedStore<TState>;
  useSelector: <T>(selector) => T;
  useActions: <TActions>() => TActions;
}

subscribeToFeatureStore<TState, TSlice>(
  store: EnhancedStore<TState>,
  selector: (state: TState) => TSlice,
  callback: (value: TSlice, prevValue: TSlice) => void
): () => void
```

**Example:**
```typescript
const { useStore, useSelector, useActions } = createFeatureStoreHooks(useTasksStore);

// In component:
const tasks = useSelector((s) => s.tasks);
const { addTask } = useActions();
```

---

### Multi-Tab State Synchronization

#### `createBroadcastSync`

Create a multi-tab state synchronization instance using the BroadcastChannel API.

**Features:**
- Real-time state synchronization across browser tabs/windows
- Selective state sync (only sync configured keys)
- Leader election for coordinated operations
- Conflict resolution with configurable strategies
- Throttled/debounced sync to prevent excessive messaging
- Graceful degradation for unsupported browsers
- DevTools integration for debugging

**Function Signature:**
```typescript
createBroadcastSync<TState>(
  store: UseBoundStore<StoreApi<TState>>,
  config: BroadcastSyncConfig<TState>
): BroadcastSyncInstance<TState>
```

**Configuration:**
```typescript
interface BroadcastSyncConfig<TState> {
  channelName: string;                    // Unique channel name per app
  syncKeys?: (keyof TState)[];            // Keys to sync (empty = sync all)
  excludeKeys?: (keyof TState)[];         // Keys to never sync
  throttleMs?: number;                    // Throttle sync messages
  debounceMs?: number;                    // Debounce sync messages
  conflictStrategy?: ConflictStrategy;    // 'last-write-wins' | 'first-write-wins' | 'merge' | 'custom'
  customResolver?: (local, remote) => Partial<TState>;
  enableLeaderElection?: boolean;         // Enable leader election
  leaderHeartbeatMs?: number;             // Leader heartbeat interval
  debug?: boolean;                        // Log sync events (dev only)
  onSyncStateChange?: (state) => void;    // Sync state change callback
  onRemoteUpdate?: (keys, source) => void; // Remote update callback
  shouldSync?: (prev, next) => boolean;   // Filter sync conditions
}
```

**Message Types:**
```typescript
type SyncMessageType =
  | 'STATE_UPDATE'      // State changed in one tab
  | 'STATE_REQUEST'     // Request full state from other tabs
  | 'STATE_RESPONSE'    // Response with full state
  | 'LEADER_ELECTION'   // Initiate leader election
  | 'LEADER_ANNOUNCE'   // Announce new leader
  | 'TAB_PING'          // Ping other tabs
  | 'TAB_PONG'          // Pong response
  | 'HEARTBEAT';        // Leader heartbeat
```

**Conflict Strategies:**
```typescript
type ConflictStrategy =
  | 'last-write-wins'   // Most recent write wins (default)
  | 'first-write-wins'  // First write wins
  | 'merge'             // Merge strategies (shallow merge)
  | 'custom';           // Use customResolver function
```

**Instance Methods:**
```typescript
interface BroadcastSyncInstance<TState> {
  start(): void;                          // Start synchronization
  stop(): void;                           // Stop synchronization
  isActive(): boolean;                    // Check if sync is active
  isLeader(): boolean;                    // Check if this tab is the leader
  getTabId(): string;                     // Get current tab ID
  requestState(): void;                   // Request full state from other tabs
  broadcastState(keys?): void;            // Broadcast state to other tabs
  getConnectedTabs(): number;             // Get connected tab count (approximate)
  forceLeader(): void;                    // Force this tab to become leader
}
```

**Example:**
```typescript
import { createBroadcastSync } from '@/lib/state/sync';
import { useStore } from '@/lib/state';

// Create sync instance
const sync = createBroadcastSync(useStore, {
  channelName: 'app-state-sync',

  // Only sync specific keys
  syncKeys: ['settings', 'theme', 'locale', 'sidebarOpen'],

  // Never sync sensitive data
  excludeKeys: ['authToken', 'sessionId'],

  // Throttle to prevent excessive messages
  throttleMs: 100,

  // Use last-write-wins for conflicts
  conflictStrategy: 'last-write-wins',

  // Enable leader election
  enableLeaderElection: true,
  leaderHeartbeatMs: 5000,

  // Debug in development
  debug: process.env.NODE_ENV === 'development',

  // Callbacks
  onSyncStateChange: (state) => {
    console.log('Sync state:', state);
  },

  onRemoteUpdate: (keys, sourceTabId) => {
    console.log(`Keys ${keys.join(', ')} updated from ${sourceTabId}`);
  },
});

// Start sync
sync.start();

// Check if this tab is the leader
if (sync.isLeader()) {
  console.log('This tab is the leader');
}

// Manually broadcast state
sync.broadcastState(['theme']);

// Request state from other tabs
sync.requestState();

// Stop sync (e.g., on component unmount)
sync.stop();
```

**React Hook:**
```typescript
useBroadcastSync<TState>(
  store: UseBoundStore<StoreApi<TState>>,
  config: BroadcastSyncConfig<TState>
): BroadcastSyncInstance<TState>
```

**React Example:**
```typescript
import { useBroadcastSync } from '@/lib/state/sync';
import { useStore } from '@/lib/state';

function App() {
  const sync = useBroadcastSync(useStore, {
    channelName: 'my-app-sync',
    syncKeys: ['theme', 'locale', 'settings'],
    throttleMs: 100,
    debug: true,
  });

  useEffect(() => {
    sync.start();
    return () => sync.stop();
  }, [sync]);

  return (
    <div>
      {sync.isLeader() && <div>This tab is the leader</div>}
      {/* App content */}
    </div>
  );
}
```

**Custom Conflict Resolution:**
```typescript
const sync = createBroadcastSync(useStore, {
  channelName: 'app-sync',
  conflictStrategy: 'custom',
  customResolver: (localState, remoteState) => {
    // Merge arrays, use most recent scalar values
    return {
      ...localState,
      ...remoteState,
      // Keep local arrays, append new remote items
      notifications: [
        ...localState.notifications,
        ...remoteState.notifications.filter(
          n => !localState.notifications.find(ln => ln.id === n.id)
        )
      ],
    };
  },
});
```

**Leader Election Example:**
```typescript
const sync = createBroadcastSync(useStore, {
  channelName: 'app-sync',
  enableLeaderElection: true,
  onSyncStateChange: (state) => {
    if (state === 'leader') {
      // This tab is now the leader
      // Start coordinated operations (e.g., polling, WebSocket)
      startBackgroundJobs();
    } else if (state === 'follower') {
      // This tab is a follower
      // Stop coordinated operations to avoid duplicates
      stopBackgroundJobs();
    }
  },
});
```

**Use Cases:**
- Sync user preferences across tabs (theme, language, layout)
- Coordinate WebSocket connections (only leader maintains connection)
- Share real-time notifications across tabs
- Sync UI state (sidebar open/closed, active modals)
- Coordinate background jobs to prevent duplication
- Share authentication state changes

**Browser Compatibility:**
- Supported: Chrome, Firefox, Safari 15.4+, Edge
- Graceful degradation: Falls back to silent no-op if BroadcastChannel unavailable
- Check support: `typeof BroadcastChannel !== 'undefined'`

---

## Streaming Engine

The streaming module (`@/lib/streaming`) provides a Dynamic HTML Streaming Engine for progressive content delivery with priority-based streaming, React Suspense integration, and server-side rendering support.

### Core Components

#### `StreamProvider`

Context provider for streaming configuration.

**Props:**
```typescript
interface StreamProviderProps {
  children: ReactNode;
  config?: Partial<EngineConfig>;
  debug?: boolean;
  enableMetrics?: boolean;
  onError?: (error: StreamError) => void;
  onMetricsUpdate?: (metrics: StreamMetrics) => void;
}
```

**Example:**
```tsx
function App() {
  return (
    <StreamProvider config={{ debug: true }}>
      <YourApp />
    </StreamProvider>
  );
}
```

---

#### `StreamBoundary`

Component for defining streaming boundaries.

**Props:**
```typescript
interface StreamBoundaryProps {
  id?: string;
  children: ReactNode;
  priority?: StreamPriority | `${StreamPriority}`;
  deferMs?: number;
  timeoutMs?: number;
  placeholder?: ReactNode;
  fallback?: ReactNode;
  ssr?: boolean;
  onStreamStart?: () => void;
  onStreamComplete?: () => void;
  onStreamError?: (error: StreamError) => void;
  className?: string;
  testId?: string;
}
```

**Example:**
```tsx
<StreamBoundary
  id="hero"
  priority="high"
  placeholder={<HeroSkeleton />}
  deferMs={100}
>
  <HeroSection />
</StreamBoundary>
```

---

#### Specialized Boundaries

```tsx
// Critical content (immediate streaming)
<CriticalStreamBoundary id="nav">
  <Navigation />
</CriticalStreamBoundary>

// Deferred content (low priority)
<DeferredStreamBoundary id="footer" deferMs={2000}>
  <Footer />
</DeferredStreamBoundary>

// Conditional streaming
<ConditionalStreamBoundary
  id="promo"
  condition={showPromo}
  priority="normal"
>
  <PromoSection />
</ConditionalStreamBoundary>
```

---

### Stream Priorities

```typescript
enum StreamPriority {
  Critical = 'critical',  // Above-the-fold content
  High = 'high',         // Primary content
  Normal = 'normal',     // Standard content
  Low = 'low',          // Below-the-fold content
}
```

**Priority Values:**
```typescript
const PRIORITY_VALUES = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};
```

---

### Stream States

```typescript
enum StreamState {
  Idle = 'idle',
  Pending = 'pending',
  Streaming = 'streaming',
  Paused = 'paused',
  Completed = 'completed',
  Error = 'error',
  Aborted = 'aborted',
}
```

**Data Flow:**
```
┌──────┐     ┌─────────┐     ┌───────────┐     ┌───────────┐
│ Idle │────▶│ Pending │────▶│ Streaming │────▶│ Completed │
└──────┘     └─────────┘     └───────────┘     └───────────┘
                  │                │
                  │                │
                  ▼                ▼
             ┌────────┐       ┌─────────┐
             │ Paused │       │  Error  │
             └────────┘       └─────────┘
                  │
                  │
                  ▼
             ┌─────────┐
             │ Aborted │
             └─────────┘
```

---

### Hooks

#### `useStream`

Core stream hook for lifecycle management.

**Signature:**
```typescript
useStream(boundaryId: string, options?: UseStreamOptions): UseStreamResult
```

**Returns:**
```typescript
interface UseStreamResult {
  state: StreamState;
  isStreaming: boolean;
  isComplete: boolean;
  hasError: boolean;
  error: StreamError | null;
  progress: number | null;
  start: () => void;
  pause: () => void;
  resume: () => void;
  abort: (reason?: string) => void;
  reset: () => void;
}
```

**Example:**
```tsx
function MyComponent() {
  const stream = useStream('my-boundary');

  return (
    <div>
      <p>State: {stream.state}</p>
      <p>Progress: {stream.progress}%</p>
      {stream.hasError && <Error error={stream.error} />}
      <button onClick={stream.pause}>Pause</button>
      <button onClick={stream.resume}>Resume</button>
    </div>
  );
}
```

---

#### `useStreamStatus`

Monitor stream status with extended details.

**Returns:**
```typescript
interface UseStreamStatusResult {
  state: StreamState;
  statusMessage: string;
  isRegistered: boolean;
  elapsedTime: number | null;
  estimatedTimeRemaining: number | null;
  bytesTransferred: number;
  chunksReceived: number;
}
```

**Example:**
```tsx
const status = useStreamStatus('my-boundary');
console.log(status.statusMessage);
console.log(`Elapsed: ${status.elapsedTime}ms`);
```

---

#### `useStreamPriority`

Manage stream priority dynamically.

**Returns:**
```typescript
interface UseStreamPriorityResult {
  priority: StreamPriority;
  setPriority: (priority: StreamPriority) => void;
  escalate: () => void;
  deescalate: () => void;
}
```

**Example:**
```tsx
const { priority, setPriority, escalate } = useStreamPriority('my-boundary');

// Change priority based on user interaction
const handleClick = () => {
  escalate(); // Bump to higher priority
};
```

---

#### `useDeferredStream`

Defer streaming based on conditions.

**Options:**
```typescript
interface UseDeferredStreamOptions {
  deferUntilVisible?: boolean;
  deferUntilIdle?: boolean;
  deferUntilEvent?: string;
  maxDeferMs?: number;
  visibilityThreshold?: number;
}
```

**Returns:**
```typescript
interface UseDeferredStreamResult {
  isDeferred: boolean;
  triggerNow: () => void;
  ref: React.RefObject<HTMLElement>;
  deferReason: DeferReason | null;
}
```

**Example:**
```tsx
function LazyComponent() {
  const { isDeferred, ref, triggerNow } = useDeferredStream({
    deferUntilVisible: true,
    visibilityThreshold: 0.5
  });

  return (
    <div ref={ref}>
      {isDeferred ? <Placeholder /> : <Content />}
      <button onClick={triggerNow}>Load Now</button>
    </div>
  );
}
```

---

#### Specialized Hooks

```typescript
useCriticalPriority(boundaryId: string): void
useDeferredPriority(boundaryId: string): void
useDeferUntilVisible(boundaryId: string, threshold?: number): void
useDeferUntilIdle(boundaryId: string): void
useDeferUntilEvent(boundaryId: string, eventName: string): void
```

**Example:**
```tsx
// Automatically set to critical priority
useCriticalPriority('navigation');

// Defer until element is visible
useDeferUntilVisible('footer', 0.25);

// Defer until browser is idle
useDeferUntilIdle('analytics');
```

---

### Engine Configuration

```typescript
interface EngineConfig {
  maxConcurrentStreams: number;      // default: 6
  bufferSize: number;                // default: 65536 (64KB)
  highWaterMark: number;             // default: 16384 (16KB)
  backpressureStrategy: BackpressureStrategy;
  debug: boolean;                    // default: false
  enableMetrics: boolean;            // default: true
  chunkTransformer?: ChunkTransformer;
  globalTimeoutMs: number;           // default: 60000 (1 minute)
  enableRetry: boolean;              // default: true
  maxRetries: number;                // default: 3
  retryDelayMs: number;              // default: 1000
}
```

**Backpressure Strategies:**
```typescript
enum BackpressureStrategy {
  Pause = 'pause',   // Pause source until buffer drains
  Drop = 'drop',     // Drop new chunks (lossy)
  Buffer = 'buffer', // Dynamically expand buffer
  Error = 'error',   // Throw error
}
```

---

### Server Integration

#### `createStreamingMiddleware`

Express/Next.js middleware for server-side streaming.

**Example:**
```typescript
import { createStreamingMiddleware } from '@/lib/streaming/server';

const streamingMiddleware = createStreamingMiddleware({
  compress: true,
  enableEarlyHints: true,
  timeoutMs: 30000,
});

app.use(streamingMiddleware);
```

---

#### Server Utilities

```typescript
createServerStreamContext(res: Response): ServerStreamContext
createStreamingHeaders(): Record<string, string>
createEarlyHints(resources: PreloadResource[]): string
serializeStreamState(state: StreamBoundaryData): SerializedStreamState
deserializeStreamState(serialized: SerializedStreamState): StreamBoundaryData
createHydrationScript(state: SerializedStreamState): string
```

**Example:**
```typescript
// In server-side render
const context = createServerStreamContext(res);
context.write(chunk);
context.flush();
context.end();

// Serialize state for hydration
const serialized = serializeStreamState(boundaryData);
const script = createHydrationScript(serialized);
```

---

### Metrics and Monitoring

```typescript
interface StreamMetrics {
  activeStreams: number;
  completedStreams: number;
  failedStreams: number;
  totalBytesTransferred: number;
  bufferUtilization: number;
  averageChunkLatency: number;
  averageTimeToFirstChunk: number;
  streamsByPriority: Record<StreamPriority, number>;
  backpressureEvents: number;
  retryAttempts: number;
  lastUpdated: number;
  boundaryMetrics: Map<string, BoundaryMetrics>;
}
```

**Access Metrics:**
```tsx
const { getMetrics } = useStreamContext();
const metrics = getMetrics();

console.log(`Active streams: ${metrics.activeStreams}`);
console.log(`Buffer utilization: ${metrics.bufferUtilization * 100}%`);
```

---

## Theme System

The theme module (`@/lib/theme`) provides a comprehensive theming system with design tokens, light/dark mode support, and type-safe theme configuration.

### ThemeProvider

**Props:**
```typescript
interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
  storageKey?: string;
}
```

**Example:**
```tsx
import { ThemeProvider } from '@/lib/theme';

function App() {
  return (
    <ThemeProvider defaultMode="system">
      <YourApp />
    </ThemeProvider>
  );
}
```

---

### useThemeContext

Access theme configuration and controls.

**Returns:**
```typescript
interface ThemeContextValue {
  mode: ThemeMode;                    // 'light' | 'dark' | 'system'
  resolvedMode: ResolvedTheme;        // 'light' | 'dark'
  setMode: (mode: ThemeMode) => void;
  theme: ThemeConfig;
}
```

**Example:**
```tsx
import { useThemeContext } from '@/lib/theme';

function ThemeToggle() {
  const { mode, setMode, resolvedMode } = useThemeContext();

  return (
    <div>
      <p>Current mode: {mode}</p>
      <p>Resolved to: {resolvedMode}</p>
      <button onClick={() => setMode('light')}>Light</button>
      <button onClick={() => setMode('dark')}>Dark</button>
      <button onClick={() => setMode('system')}>System</button>
    </div>
  );
}
```

---

### Design Tokens

#### Spacing

```typescript
tokens.spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
}
```

#### Border Radius

```typescript
tokens.radius = {
  none: '0',
  sm: '0.125rem',  // 2px
  md: '0.25rem',   // 4px
  lg: '0.5rem',    // 8px
  xl: '1rem',      // 16px
  full: '9999px',
}
```

#### Font Sizes

```typescript
tokens.fontSize = {
  xs: '0.75rem',     // 12px
  sm: '0.875rem',    // 14px
  base: '1rem',      // 16px
  lg: '1.125rem',    // 18px
  xl: '1.25rem',     // 20px
  '2xl': '1.5rem',   // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem',  // 36px
}
```

#### Shadows

```typescript
tokens.shadow = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
}
```

#### Z-Index

```typescript
tokens.zIndex = {
  base: '0',
  dropdown: '100',
  sticky: '200',
  modal: '300',
  popover: '400',
  tooltip: '500',
  toast: '600',
}
```

---

### Color Tokens

#### Primary Colors

```typescript
colorTokens.primary = {
  default: 'var(--color-primary-500, #3b82f6)',
  hover: 'var(--color-primary-600, #2563eb)',
  active: 'var(--color-primary-700, #1d4ed8)',
  light: 'var(--color-primary-100, #dbeafe)',
  lighter: 'var(--color-primary-50, #eff6ff)',
}
```

#### Semantic Colors

```typescript
colorTokens.success = {
  default: 'var(--color-success-500, #22c55e)',
  hover: 'var(--color-success-600, #16a34a)',
  light: 'var(--color-success-100, #dcfce7)',
  lighter: 'var(--color-success-50, #f0fdf4)',
}

colorTokens.error = {
  default: 'var(--color-error-500, #ef4444)',
  hover: 'var(--color-error-600, #dc2626)',
  light: 'var(--color-error-100, #fee2e2)',
  lighter: 'var(--color-error-50, #fef2f2)',
}
```

#### Background & Text

```typescript
colorTokens.background = {
  primary: 'var(--color-bg-primary, #ffffff)',
  secondary: 'var(--color-bg-secondary, #f8fafc)',
  tertiary: 'var(--color-bg-tertiary, #f1f5f9)',
  muted: 'var(--color-bg-muted, #f9fafb)',
  inverse: 'var(--color-bg-inverse, #0f172a)',
}

colorTokens.text = {
  primary: 'var(--color-text-primary, #0f172a)',
  secondary: 'var(--color-text-secondary, #475569)',
  tertiary: 'var(--color-text-tertiary, #5c6b7f)',
  muted: 'var(--color-text-muted, #6b7280)',
  inverse: 'var(--color-text-inverse, #ffffff)',
}
```

---

### Usage Example

```tsx
import { tokens, colorTokens } from '@/lib/theme';

const styles = {
  button: {
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    borderRadius: tokens.radius.md,
    fontSize: tokens.fontSize.base,
    backgroundColor: colorTokens.primary.default,
    color: colorTokens.text.inverse,
    boxShadow: tokens.shadow.sm,
  },

  card: {
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.lg,
    backgroundColor: colorTokens.background.secondary,
    boxShadow: tokens.shadow.md,
  }
};
```

---

### Color Palettes

#### Light Palette

```typescript
import { lightPalette } from '@/lib/theme';

// Access palette colors
const primaryColor = lightPalette.primary[500];
const backgroundColor = lightPalette.background.primary;
const textColor = lightPalette.text.primary;
```

#### Dark Palette

```typescript
import { darkPalette } from '@/lib/theme';

// Access palette colors
const primaryColor = darkPalette.primary[500];
const backgroundColor = darkPalette.background.primary;
const textColor = darkPalette.text.primary;
```

---

## Complete Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      @missionfabric-js/enzyme                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │    Shared    │  │    State     │  │  Streaming   │         │
│  │  Utilities   │  │  Management  │  │    Engine    │         │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤         │
│  │ • Async      │  │ • Zustand    │  │ • Priority   │         │
│  │ • Type Guards│  │ • Immer      │  │ • Suspense   │         │
│  │ • Errors     │  │ • Persist    │  │ • SSR        │         │
│  │ • Events     │  │ • DevTools   │  │ • Metrics    │         │
│  │ • Network    │  │ • Selectors  │  │ • Backpress  │         │
│  │ • Storage    │  │ • Slices     │  │              │         │
│  │ • Validation │  │ • Hooks      │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌──────────────┐                                              │
│  │    Theme     │                                              │
│  │   System     │                                              │
│  ├──────────────┤                                              │
│  │ • Tokens     │                                              │
│  │ • Palettes   │                                              │
│  │ • Provider   │                                              │
│  │ • Modes      │                                              │
│  └──────────────┘                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## License

Copyright © 2025 Defendr/Enzyme Framework

---

**End of Documentation**
