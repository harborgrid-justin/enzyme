/**
 * @file Services Resilience Module
 * @description Circuit breaker, offline queue, and enhanced interceptor exports.
 *
 * @example
 * ```typescript
 * import {
 *   ServiceCircuitBreaker,
 *   PersistentOfflineQueue,
 *   InterceptorChain,
 * } from '@/lib/services/resilience';
 * ```
 */

// Service Circuit Breaker
export {
  ServiceCircuitBreaker,
  serviceRegistry,
  setupDefaultServices,
  createServiceFetch,
  type ServiceHealth,
  type ServiceConfig,
  type ServiceStatus,
  type ServiceStateChangeEvent,
} from '../service-circuit-breaker';

// Persistent Offline Queue
export {
  PersistentOfflineQueue,
  offlineQueue,
  type QueueItemStatus,
  type QueuedRequest,
  type OfflineQueueOptions,
  type EnqueueOptions,
  type QueueStats,
} from '../persistent-offline-queue';

// Enhanced Interceptors
export {
  InterceptorChain,
  enhancedInterceptorChain,
  createEnhancedInterceptorChain,
  InterceptorPriority,
  createCircuitBreakerInterceptor,
  CircuitBreakerError,
  createTracingInterceptors,
  createCorrelationInterceptor,
  type InterceptorContext,
  type ContextualRequestInterceptor,
  type ContextualResponseInterceptor,
  type ContextualErrorInterceptor,
  type CircuitBreakerState,
  type CircuitBreakerConfig,
  type TracingConfig,
  type TraceSpan,
  type TimingConfig,
  type TimingData,
  type RetryConfig,
} from '../enhanced-interceptors';
