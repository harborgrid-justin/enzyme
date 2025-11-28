/**
 * @file Shared Utilities Index
 * @description Barrel export for all shared utilities. Import from this module
 * for convenient access to all standardized utilities.
 *
 * @module shared
 *
 * @example
 * ```ts
 * // Import specific utilities
 * import { sleep, withRetry, debounce } from '@/lib/shared';
 *
 * // Import from specific module
 * import { isString, isObject } from '@/lib/shared/type-utils';
 * ```
 */

// =============================================================================
// Async Utilities
// =============================================================================

export {
  // Sleep/delay
  sleep,

  // Retry
  withRetry,
  RetryPolicy,
  retryPolicies,
  type RetryConfig,

  // Timeout
  withTimeout,
  TimeoutError,

  // Debounce
  debounce,
  type DebounceOptions,
  type DebouncedFn,

  // Throttle
  throttle,
  type ThrottleOptions,
  type ThrottledFn,

  // Mutex and Semaphore
  Mutex,
  Semaphore,

  // Cancellation
  CancellationToken,

  // Promise utilities
  pMap,
  pSeries,
  withCleanup,
  safeAsync,
  safeSync,
} from './async-utils';

// =============================================================================
// Type Utilities
// =============================================================================

export {
  // Primitive guards
  isDefined,
  isNullish,
  isString,
  isNonEmptyString,
  isNumber,
  isFiniteNumber,
  isPositiveNumber,
  isNonNegativeNumber,
  isInteger,
  isBoolean,
  isSymbol,
  isBigInt,

  // Complex type guards
  isFunction,
  isObject,
  isPlainObject,
  isArray,
  isNonEmptyArray,
  isArrayOf,
  isDate,
  isDateString,
  isPromise,
  isError,
  isRegExp,
  isMap,
  isSet,
  isWeakMap,
  isWeakSet,

  // Format validators
  isEmail,
  isUrl,
  isUuid,
  isJsonString,
  isIsoDateString,

  // Object property guards
  hasKey,
  hasKeys,
  hasTypedKey,

  // Type narrowing
  assert,
  isOneOf,
  narrow,
  narrowOr,

  // Type guard factories
  createShapeGuard,
  createPartialShapeGuard,
  createUnionGuard,

  // JSON utilities
  safeJsonParse,
  safeJsonParseResult,

  // Type utility types
  type KeysOfType,
  type RequireKeys,
  type OptionalKeys,
  type DeepPartial,
  type DeepReadonly,
  type NonNullableArray,
  type Awaited,
  type ReturnTypeOf,
  type ParametersOf,
} from './type-utils';

// =============================================================================
// Error Utilities
// =============================================================================

export {
  // Error types
  type ErrorCategory,
  type ErrorSeverity,

  // Error classes
  AppError,
  NetworkError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ConflictError,

  // Error normalization
  normalizeError,

  // Error checking
  isRetryableError,
  isErrorCategory,
  isNetworkError,
  isValidationError,
  isAuthenticationError,
  isTimeoutError,

  // Error creation
  fromHttpResponse,

  // Result type
  type Result,
  success,
  failure,
  tryCatch,
  tryCatchSync,
  unwrap,
  unwrapOr,
  mapResult,
  flatMapResult,
} from './error-utils';

// =============================================================================
// Event Utilities
// =============================================================================

export {
  // Types
  type EventHandler,
  type SyncEventHandler,
  type AsyncEventHandler,
  type EventListenerOptions,
  type Unsubscribe,
  type AppEvents,
  type IEventEmitter,

  // Event emitter
  SimpleEventEmitter,

  // Event handler utilities
  dedupeHandler,
  batchHandler,
  filterHandler,
  mapHandler,
  combineHandlers,

  // DOM event utilities
  addEventListener,
  addDisposableEventListener,
  dispatchCustomEvent,
  onCustomEvent,
} from './event-utils';

// =============================================================================
// Storage Utilities
// =============================================================================

export {
  // Types
  type StorageItem,
  type StorageSetOptions,
  type StorageConfig,

  // Storage wrapper
  StorageWrapper,
  MemoryStorage,

  // Factory functions
  isLocalStorageAvailable,
  isSessionStorageAvailable,
  getLocalStorage,
  getSessionStorage,
  createLocalStorage,
  createSessionStorage,
  createMemoryStorage,

  // Convenience functions
  setLocal,
  getLocal,
  removeLocal,
  setSession,
  getSession,
  removeSession,

  // JSON helpers
  getJsonFromStorage,
  setJsonToStorage,

  // Storage events
  onStorageChange,
  watchStorageKey,
} from './storage-utils';

// =============================================================================
// Network Utilities
// =============================================================================

export {
  // Types
  type ConnectionType,
  type EffectiveType,
  type NetworkQuality,
  type NetworkInfo,
  type NetworkChangeCallback,

  // Network information
  getNetworkInfo,
  isOnline,
  meetsMinimumQuality,
  isSlowConnection,
  getQualityLabel,

  // Network monitoring
  onNetworkChange,
  onOnlineChange,

  // Prefetch utilities
  shouldAllowPrefetch,
  getLoadingStrategy,
  getRecommendedImageQuality,

  // Connection utilities
  pingEndpoint,
  measureRtt,
} from './network-utils';

// =============================================================================
// Validation Utilities
// =============================================================================

export {
  // Types
  type ValidationResult,
  type FieldValidationResult,
  type SchemaValidationResult,
  type Validator,
  type AsyncValidator,
  type FieldSchema,

  // Result helpers
  validResult,
  invalidResult,
  combineResults,

  // String validators
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validateLength,
  validatePattern,
  validateEmail,
  validateUrl,
  validatePhone,
  validateUuid,
  validateSlug,
  validateAlphanumeric,

  // Number validators
  validateNumberRange,
  validateMin,
  validateMax,
  validatePositive,
  validateNonNegative,
  validateInteger,

  // Array validators
  validateArrayNotEmpty,
  validateArrayLength,
  validateArrayItems,
  validateUnique,

  // Date validators
  validateFutureDate,
  validatePastDate,
  validateDateRange,
  validateAge,

  // Validator builder
  createValidator,

  // Schema validation
  validateSchema,

  // Sanitization
  sanitizeString,
  stripHtml,
  escapeHtml,
  normalizeEmail,
  normalizePhone,
  createSlug,
} from './validation-utils';
