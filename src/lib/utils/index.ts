/**
 * @file Utils Module Index
 * @description Central export for all utility functions
 */

// Logging utilities
export {
  logger,
  configureLogger,
  getLoggerConfig,
  logPerformance,
  measureAsync,
  type LogLevel,
  type LoggerConfig,
  type LogEntry,
} from './logging';

// Time utilities
export {
  parseDate,
  formatDate,
  formatTime,
  formatDateTime,
  formatRelative,
  formatDuration,
  isToday,
  isYesterday,
  isWithinDays,
  startOfDay,
  endOfDay,
  addTime,
  dateDiff,
  type FormatOptions,
} from './time';

// Type guards
export {
  isDefined,
  isNullish,
  isString,
  isNonEmptyString,
  isNumber,
  isFiniteNumber,
  isBoolean,
  isFunction,
  isObject,
  isArray,
  isNonEmptyArray,
  isDate,
  isDateString,
  isPromise,
  assert,
  isOneOf,
  hasKey,
  hasKeys,
  isError,
  isEmail,
  isUrl,
  isUuid,
  narrow,
  narrowOr,
  createShapeGuard,
  safeJsonParse,
} from './guardUtils';

// Type utilities
export {
  brand,
  ok,
  err,
  isOk,
  isErr,
  // type DeepPartial,
  type DeepRequired,
  type DeepReadonly,
  type PartialBy,
  type RequiredBy,
  type KeysOfType,
  type OmitByType,
  type PickByType,
  type Nullable,
  type Maybe,
  type NonNullableDeep,
  type UnionToIntersection,
  type StringLiteral,
  type Brand,
  type Id,
  type Awaited,
  type Fn,
  type AsyncFn,
  type Constructor,
  type InstanceOf,
  type Tuple,
  type Dictionary,
  type Entries,
  type ValueOf,
  type Flatten,
  type ElementOf,
  type PathKeys,
  type Mutable,
  type DeepMutable,
  type Exact,
  type JsonValue,
  type JsonObject,
  type CodedError,
  type Result,
} from './types';

// Memory management utilities
export {
  ResourcePool,
  WeakCache,
  MemoryMonitor,
  DisposableRegistry,
  LRUCache,
  memoryManager,
  createDisposable,
  type ResourcePoolConfig,
  type MemoryMonitorConfig,
  type MemoryPressure,
  type MemoryPressureCallback,
  type Disposable,
} from './memoryManager';

// Resilience utilities (retry, circuit breaker, bulkhead)
export {
  withRetry,
  RetryPolicy,
  CircuitBreaker,
  CircuitOpenError,
  Bulkhead,
  BulkheadFullError,
  withTimeout,
  TimeoutError,
  withFallback,
  compose,
  createResilientFn,
  retryPolicies,
  type RetryConfig,
  type CircuitBreakerConfig,
  type CircuitState,
} from './resilience';

// Performance monitoring utilities
export {
  PerformanceMonitor,
  WebVitalsCollector,
  LongTaskObserver,
  performanceMonitor,
  webVitals,
  longTaskObserver,
  resourceTiming,
  type PerformanceMetric,
  type MetricType,
  type HistogramData,
  type PerformanceMonitorConfig,
  type WebVitals,
} from './performanceMonitor';

// Async utilities (debounce, throttle, mutex, semaphore)
export {
  CancellationToken,
  defer,
  sleep,
  debounce,
  throttle,
  Mutex,
  Semaphore,
  pMap,
  pSeries,
  withCleanup,
  type Deferred,
} from '../shared/async-utils';

// Event emitter utilities
export {
  UnifiedEventEmitter as EventEmitter,
  createEventEmitter,
  globalEventBus,
  events,
  withEvents,
  createScopedEmitter,
  type EventHandler,
  type EventMiddleware,
  type EventListenerOptions as EventEmitterOptions,
  type AppEvents as GlobalEvents,
} from '../shared/event-utils';

// Error recovery utilities
export {
  ErrorRecovery,
  RecoveryBuilder,
  recover,
  withGracefulDegradation,
  withCircuitFallback,
  staleWhileRevalidate,
  autoRetry,
  safe,
  safeSync,
  type RecoveryStrategy,
  type RecoveryContext,
  type RecoveryResult,
  type RecoveryHandler,
  type RecoveryConfig,
} from './errorRecovery';

// Storage utilities
export {
  StorageManager,
  SessionStorageManager,
  CryptoStorage,
  StorageQuotaError,
  localStorageManager,
  sessionStorageManager,
  createMemoryStorage,
  setLocal,
  getLocal,
  removeLocal,
  setSession,
  getSession,
  removeSession,
  type StorageConfig,
  type StorageItem,
  type StorageStats,
  type MigrationFn,
} from './storage';

// Network status utilities
export {
  NetworkMonitor,
  NetworkAwareFetch,
  NetworkError,
  networkMonitor,
  networkAwareFetch,
  isOnline,
  isSlowConnection,
  getNetworkQuality,
  waitForOnline,
  isNetworkError,
  isOfflineError,
  getSuggestedAction,
  type NetworkStatus,
  type NetworkQuality,
  type ConnectionType,
  type EffectiveType,
  type NetworkMonitorConfig,
  type NetworkAwareFetchOptions,
} from './networkStatus';

// Worker utilities
export {
  TypedWorker,
  WorkerPool,
  TypedSharedWorker,
  workerRegistry,
  createInlineWorker,
  isTransferable,
  extractTransferables,
  type WorkerMessage,
  type WorkerResponse,
  type WorkerTask,
  type WorkerPoolConfig,
  type WorkerStatus,
  type WorkerInfo,
} from './workerUtils';

// State persistence utilities
export {
  StatePersister,
  SessionStatePersister,
  StateSnapshotManager,
  createStatePersister,
  createSessionPersister,
  createSnapshotManager,
  createZustandPersist,
  createReduxPersistStorage,
  createPHISafeTransform,
  type PersistConfig,
  type RehydrateResult,
  type ZustandPersistOptions,
  type StateSnapshot,
} from './statePersistence';

// Analytics utilities
export {
  AnalyticsManager,
  analytics,
  trackEvent,
  trackPageView,
  identifyUser,
  trackError,
  trackPerformance as trackPerformanceMetric,
  trackFeature,
  setAnalyticsConsent,
  resetAnalytics,
  type AnalyticsEvent,
  type AnalyticsEventType,
  type AnalyticsProvider,
  type AnalyticsConfig,
  type AnalyticsContext,
  type UserProperties,
  type ConsentCategories,
} from './analytics';
export { default as ConsoleAnalyticsProvider } from './analytics';

// Service Worker registration utilities
export {
  registerServiceWorker,
  unregisterServiceWorker,
  useServiceWorker,
  isServiceWorkerControlling,
  waitForServiceWorker,
  postMessageToSW,
  type ServiceWorkerConfig,
  type ServiceWorkerState,
  type ServiceWorkerController,
} from './registerSW';

// Cryptographic utilities (shared across security modules)
export {
  getRandomBytes,
  generateRandomHex,
  generateRandomBase64Url,
  bytesToHex,
  hexToBytes,
  bytesToBase64,
  base64ToBytes,
  bytesToBase64Url,
  base64UrlToBytes,
  constantTimeCompare,
  constantTimeCompareBytes,
  sha256,
  sha512,
  generateSecureToken,
  generateCSPNonce,
  deriveKey,
} from './crypto-utils';

// Safe operation utilities
export {
  // JSON parsing
  safeJSONParse,
  parseJSONSafe,
  parseJSONWithValidation,
  safeJSONStringify,
  JSONParseError,
  // Operation timeouts
  withOperationTimeout,
  withTimeoutFallback,
  withSyncTimeout,
  OperationTimeoutError,
  // Storage operations
  safeLocalStorageGet,
  safeLocalStorageSet,
  safeLocalStorageRemove,
  safeSessionStorageGet,
  safeSessionStorageSet,
  // Property access
  safeGet,
  // Function execution
  safeExecute,
  safeExecuteAsync,
  // Promise utilities
  safePromiseAll,
  safePromiseAllNamed,
  // Event handler safety
  createSafeHandler,
  createSafeReactHandler,
  // Types
  type SafeResult,
} from './safe-operations';
