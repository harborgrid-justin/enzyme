/**
 * @file Enhanced Interceptors
 * @description Production-grade interceptor system with priority ordering,
 * distributed tracing, circuit breaker pattern, and error recovery.
 * Designed for microservices resilience.
 */

import { type HttpRequestConfig, type HttpResponse, HttpError } from './http';
import {
  DEFAULT_TIMEOUT,
  DEFAULT_RETRY_BASE_DELAY,
  DEFAULT_RETRY_MAX_DELAY,
  DEFAULT_SLOW_REQUEST_THRESHOLD,
} from '@/lib/core/config/constants';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Interceptor priority levels
 */
export enum InterceptorPriority {
  /** Execute first - critical operations like tracing */
  HIGHEST = 0,
  /** Execute early - auth, correlation */
  HIGH = 25,
  /** Default priority */
  NORMAL = 50,
  /** Execute later - logging, metrics */
  LOW = 75,
  /** Execute last - cleanup, timing */
  LOWEST = 100,
}

/**
 * Interceptor context for sharing state between interceptors
 */
export interface InterceptorContext {
  /** Distributed trace ID */
  traceId: string;
  /** Current span ID */
  spanId: string;
  /** Parent span ID for nested calls */
  parentSpanId?: string;
  /** Request start time */
  startTime: number;
  /** Shared metadata between interceptors */
  metadata: Map<string, unknown>;
  /** Tags for categorization */
  tags: string[];
  /** Retry attempt number */
  retryAttempt: number;
  /** Original request config (before modifications) */
  originalConfig: HttpRequestConfig;
}

/**
 * Request interceptor with context awareness
 */
export interface ContextualRequestInterceptor {
  /** Unique name for the interceptor */
  name: string;
  /** Execution priority (lower = earlier) */
  priority: number;
  /** Whether interceptor is enabled */
  enabled?: boolean;
  /** Intercept function */
  intercept: (config: HttpRequestConfig, context: InterceptorContext) => HttpRequestConfig | Promise<HttpRequestConfig>;
  /** Error callback */
  onError?: (error: Error, context: InterceptorContext) => void;
}

/**
 * Response interceptor with context awareness
 */
export interface ContextualResponseInterceptor<T = unknown> {
  /** Unique name for the interceptor */
  name: string;
  /** Execution priority (lower = earlier) */
  priority: number;
  /** Whether interceptor is enabled */
  enabled?: boolean;
  /** Intercept function */
  intercept: (
    response: HttpResponse<T>,
    context: InterceptorContext
  ) => HttpResponse<T> | Promise<HttpResponse<T>>;
  /** Error callback */
  onError?: (error: Error, context: InterceptorContext) => void;
}

/**
 * Error interceptor with recovery support
 */
export interface ContextualErrorInterceptor {
  /** Unique name for the interceptor */
  name: string;
  /** Execution priority (lower = earlier) */
  priority: number;
  /** Whether interceptor is enabled */
  enabled?: boolean;
  /** Intercept function - can return recovered response */
  intercept: (
    error: HttpError,
    context: InterceptorContext
  ) => HttpError | Promise<HttpError | HttpResponse>;
  /** Check if this interceptor can handle the error */
  canHandle?: (error: HttpError) => boolean;
}

// =============================================================================
// INTERCEPTOR CHAIN
// =============================================================================

/**
 * Interceptor chain manager with priority ordering
 */
export class InterceptorChain {
  private requestInterceptors: ContextualRequestInterceptor[] = [];
  private responseInterceptors: ContextualResponseInterceptor[] = [];
  private errorInterceptors: ContextualErrorInterceptor[] = [];

  /**
   * Add request interceptor with priority ordering
   */
  addRequestInterceptor(interceptor: ContextualRequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    this.requestInterceptors.sort((a, b) => a.priority - b.priority);

    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index !== -1) {
        this.requestInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * Add response interceptor with priority ordering
   */
  addResponseInterceptor(interceptor: ContextualResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    this.responseInterceptors.sort((a, b) => a.priority - b.priority);

    return () => {
      const index = this.responseInterceptors.indexOf(interceptor);
      if (index !== -1) {
        this.responseInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * Add error interceptor with priority ordering
   */
  addErrorInterceptor(interceptor: ContextualErrorInterceptor): () => void {
    this.errorInterceptors.push(interceptor);
    this.errorInterceptors.sort((a, b) => a.priority - b.priority);

    return () => {
      const index = this.errorInterceptors.indexOf(interceptor);
      if (index !== -1) {
        this.errorInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * Create new interceptor context
   */
  createContext(config: HttpRequestConfig, parentContext?: Partial<InterceptorContext>): InterceptorContext {
    const context: InterceptorContext = {
      traceId: parentContext?.traceId ?? crypto.randomUUID(),
      spanId: crypto.randomUUID(),
      startTime: performance.now(),
      metadata: new Map(parentContext?.metadata ?? []),
      tags: [...(parentContext?.tags ?? [])],
      retryAttempt: parentContext?.retryAttempt ?? 0,
      originalConfig: { ...config },
    };

    if (parentContext?.spanId !== undefined) {
      context.parentSpanId = parentContext.spanId;
    }

    return context;
  }

  /**
   * Execute request interceptor chain
   */
  async executeRequestChain(
    config: HttpRequestConfig,
    context: InterceptorContext
  ): Promise<HttpRequestConfig> {
    let processedConfig = { ...config };

    for (const interceptor of this.requestInterceptors) {
      if (interceptor.enabled === false) continue;

      try {
        processedConfig = await interceptor.intercept(processedConfig, context);
      } catch (error) {
        interceptor.onError?.(error as Error, context);
        throw error;
      }
    }

    return processedConfig;
  }

  /**
   * Execute response interceptor chain
   */
  async executeResponseChain<T>(
    response: HttpResponse<T>,
    context: InterceptorContext
  ): Promise<HttpResponse<T>> {
    let processedResponse = response;

    for (const interceptor of this.responseInterceptors) {
      if (interceptor.enabled === false) continue;

      try {
        processedResponse = (await interceptor.intercept(processedResponse, context)) as HttpResponse<T>;
      } catch (error) {
        interceptor.onError?.(error as Error, context);
        throw error;
      }
    }

    return processedResponse;
  }

  /**
   * Execute error interceptor chain with recovery support
   */
  async executeErrorChain(
    error: HttpError,
    context: InterceptorContext
  ): Promise<HttpError | HttpResponse> {
    let processedError: HttpError | HttpResponse = error;

    for (const interceptor of this.errorInterceptors) {
      if (interceptor.enabled === false) continue;

      if (processedError instanceof HttpError) {
        // Check if interceptor can handle this error
        if (interceptor.canHandle && !interceptor.canHandle(processedError)) {
          continue;
        }

        try {
          processedError = await interceptor.intercept(processedError, context);

          // If we got a response back, the error was recovered
          if (!(processedError instanceof HttpError)) {
            return processedError;
          }
        } catch {
          // Interceptor threw, continue with original error
          continue;
        }
      }
    }

    return processedError;
  }

  /**
   * Get all registered interceptors
   */
  getInterceptors(): {
    request: ContextualRequestInterceptor[];
    response: ContextualResponseInterceptor[];
    error: ContextualErrorInterceptor[];
  } {
    return {
      request: [...this.requestInterceptors],
      response: [...this.responseInterceptors],
      error: [...this.errorInterceptors],
    };
  }

  /**
   * Remove interceptor by name
   */
  removeByName(name: string): void {
    this.requestInterceptors = this.requestInterceptors.filter((i) => i.name !== name);
    this.responseInterceptors = this.responseInterceptors.filter((i) => i.name !== name);
    this.errorInterceptors = this.errorInterceptors.filter((i) => i.name !== name);
  }

  /**
   * Clear all interceptors
   */
  clear(): void {
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.errorInterceptors = [];
  }
}

// =============================================================================
// CIRCUIT BREAKER
// =============================================================================

/**
 * Circuit breaker state
 */
export interface CircuitBreakerState {
  /** Number of consecutive failures */
  failures: number;
  /** Last failure timestamp */
  lastFailure: number;
  /** Current circuit state */
  state: 'closed' | 'open' | 'half-open';
  /** Next attempt timestamp (when open) */
  nextAttempt: number;
  /** Successful requests in half-open state */
  halfOpenSuccesses: number;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold?: number;
  /** Time to wait before attempting recovery (ms) */
  resetTimeout?: number;
  /** Number of successful requests needed to close circuit */
  halfOpenSuccessThreshold?: number;
  /** Which HTTP status codes are considered failures */
  failureStatuses?: number[];
  /** Key extractor for service identification */
  getServiceKey?: (config: HttpRequestConfig) => string;
  /** Callback when circuit opens */
  onOpen?: (serviceKey: string, state: CircuitBreakerState) => void;
  /** Callback when circuit closes */
  onClose?: (serviceKey: string) => void;
  /** Callback when circuit enters half-open */
  onHalfOpen?: (serviceKey: string) => void;
}

/**
 * Circuit breaker error
 */
export class CircuitBreakerError extends Error {
  readonly isCircuitBreakerError = true;
  readonly serviceKey: string;
  readonly retryAfterMs: number;
  readonly state: CircuitBreakerState;

  constructor(serviceKey: string, state: CircuitBreakerState) {
    super(`Circuit breaker open for ${serviceKey}`);
    this.name = 'CircuitBreakerError';
    this.serviceKey = serviceKey;
    this.retryAfterMs = Math.max(0, state.nextAttempt - Date.now());
    this.state = state;
  }
}

/**
 * Create circuit breaker interceptor
 */
export function createCircuitBreakerInterceptor(
  config: CircuitBreakerConfig = {}
): {
  request: ContextualRequestInterceptor;
  error: ContextualErrorInterceptor;
  response: ContextualResponseInterceptor;
  getState: (serviceKey: string) => CircuitBreakerState | undefined;
  reset: (serviceKey: string) => void;
  resetAll: () => void;
} {
  const {
    failureThreshold = 5,
    resetTimeout = DEFAULT_TIMEOUT,
    halfOpenSuccessThreshold = 3,
    failureStatuses = [500, 502, 503, 504, 0],
    getServiceKey = (c) => {
      try {
        return new URL(c.url, 'http://localhost').hostname;
      } catch {
        return 'default';
      }
    },
    onOpen,
    onClose,
    onHalfOpen,
  } = config;

  const circuitStates = new Map<string, CircuitBreakerState>();

  function getState(key: string): CircuitBreakerState {
    if (!circuitStates.has(key)) {
      circuitStates.set(key, {
        failures: 0,
        lastFailure: 0,
        state: 'closed',
        nextAttempt: 0,
        halfOpenSuccesses: 0,
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return circuitStates.get(key)!;
  }

  function recordSuccess(key: string): void {
    const state = getState(key);

    if (state.state === 'half-open') {
      state.halfOpenSuccesses++;

      if (state.halfOpenSuccesses >= halfOpenSuccessThreshold) {
        state.state = 'closed';
        state.failures = 0;
        state.halfOpenSuccesses = 0;
        onClose?.(key);
      }
    } else if (state.state === 'closed' && state.failures > 0) {
      // Reset failure count on success in closed state
      state.failures = 0;
    }
  }

  function recordFailure(key: string): void {
    const state = getState(key);
    const now = Date.now();

    state.failures++;
    state.lastFailure = now;

    if (state.state === 'half-open') {
      // Failure in half-open state re-opens circuit
      state.state = 'open';
      state.nextAttempt = now + resetTimeout;
      state.halfOpenSuccesses = 0;
      onOpen?.(key, state);
    } else if (state.failures >= failureThreshold) {
      state.state = 'open';
      state.nextAttempt = now + resetTimeout;
      onOpen?.(key, state);
    }
  }

  const requestInterceptor: ContextualRequestInterceptor = {
    name: 'circuitBreaker',
    priority: InterceptorPriority.HIGH,
    intercept: (config, context) => {
      const key = getServiceKey(config);
      const state = getState(key);
      const now = Date.now();

      // Check circuit state
      if (state.state === 'open') {
        if (now >= state.nextAttempt) {
          // Transition to half-open
          state.state = 'half-open';
          state.halfOpenSuccesses = 0;
          onHalfOpen?.(key);
        } else {
          // Circuit is open, reject immediately
          throw new CircuitBreakerError(key, state);
        }
      }

      // Store service key in context for response/error handling
      context.metadata.set('circuitBreaker:serviceKey', key);

      return config;
    },
  };

  const responseInterceptor: ContextualResponseInterceptor = {
    name: 'circuitBreaker',
    priority: InterceptorPriority.LOW,
    intercept: (response, context) => {
      const key = context.metadata.get('circuitBreaker:serviceKey') as string;
      if (key) {
        recordSuccess(key);
      }
      return response;
    },
  };

  const errorInterceptor: ContextualErrorInterceptor = {
    name: 'circuitBreaker',
    priority: InterceptorPriority.HIGH,
    canHandle: (error) => failureStatuses.includes(error.status),
    intercept: (error, context) => {
      const key = context.metadata.get('circuitBreaker:serviceKey') as string;
      if (key) {
        recordFailure(key);
      }
      return error;
    },
  };

  return {
    request: requestInterceptor,
    response: responseInterceptor,
    error: errorInterceptor,
    getState: (key) => circuitStates.get(key),
    reset: (key) => circuitStates.delete(key),
    resetAll: () => circuitStates.clear(),
  };
}

// =============================================================================
// DISTRIBUTED TRACING
// =============================================================================

/**
 * Tracing configuration
 */
export interface TracingConfig {
  /** Service name for tracing */
  serviceName?: string;
  /** Header names for trace propagation */
  headers?: {
    traceId?: string;
    spanId?: string;
    parentSpanId?: string;
    sampled?: string;
  };
  /** Sampling rate (0-1) */
  samplingRate?: number;
  /** Callback for trace spans */
  onSpan?: (span: TraceSpan) => void;
}

/**
 * Trace span data
 */
export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'ok' | 'error';
  tags: Record<string, string | number | boolean>;
  logs: Array<{ timestamp: number; message: string; data?: unknown }>;
}

/**
 * Create distributed tracing interceptors
 */
export function createTracingInterceptors(config: TracingConfig = {}): {
  request: ContextualRequestInterceptor;
  response: ContextualResponseInterceptor;
  error: ContextualErrorInterceptor;
} {
  const {
    serviceName = 'frontend',
    headers = {
      traceId: 'X-Trace-ID',
      spanId: 'X-Span-ID',
      parentSpanId: 'X-Parent-Span-ID',
      sampled: 'X-B3-Sampled',
    },
    samplingRate = 1.0,
    onSpan,
  } = config;

  const activeSpans = new Map<string, TraceSpan>();

  function shouldSample(): boolean {
    return Math.random() < samplingRate;
  }

  function createSpan(context: InterceptorContext, config: HttpRequestConfig): TraceSpan {
    const span: TraceSpan = {
      traceId: context.traceId,
      spanId: context.spanId,
      operationName: `${config.method ?? 'GET'} ${config.url}`,
      serviceName,
      startTime: context.startTime,
      status: 'ok',
      tags: {
        'http.method': config.method ?? 'GET',
        'http.url': config.url,
        component: 'http-client',
      },
      logs: [],
    };

    if (context.parentSpanId !== undefined) {
      span.parentSpanId = context.parentSpanId;
    }

    return span;
  }

  const requestInterceptor: ContextualRequestInterceptor = {
    name: 'tracing',
    priority: InterceptorPriority.HIGHEST,
    intercept: (config, context) => {
      // Check if we should sample this request
      const sampled = shouldSample();
      context.metadata.set('tracing:sampled', sampled);

      if (!sampled) {
        return config;
      }

      // Create and store span
      const span = createSpan(context, config);
      activeSpans.set(context.spanId, span);

      // Add trace headers
      return {
        ...config,
        headers: {
          ...config.headers,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          [headers.traceId!]: context.traceId,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          [headers.spanId!]: context.spanId,
          ...(context.parentSpanId !== null && context.parentSpanId !== undefined && context.parentSpanId !== '' ? {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            [headers.parentSpanId!]: context.parentSpanId
          } : {}),
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          [headers.sampled!]: '1',
        },
      };
    },
  };

  const responseInterceptor: ContextualResponseInterceptor = {
    name: 'tracing',
    priority: InterceptorPriority.LOWEST,
    intercept: (response, context) => {
      const sampled = context.metadata.get('tracing:sampled');
      if (sampled !== true) return response;

      const span = activeSpans.get(context.spanId);
      if (span) {
        span.endTime = performance.now();
        span.duration = span.endTime - span.startTime;
        span.status = 'ok';
        span.tags['http.status_code'] = response.status;

        onSpan?.(span);
        activeSpans.delete(context.spanId);
      }

      return response;
    },
  };

  const errorInterceptor: ContextualErrorInterceptor = {
    name: 'tracing',
    priority: InterceptorPriority.LOWEST,
    intercept: (error, context) => {
      const sampled = context.metadata.get('tracing:sampled');
      if (sampled !== true) return error;

      const span = activeSpans.get(context.spanId);
      if (span) {
        span.endTime = performance.now();
        span.duration = span.endTime - span.startTime;
        span.status = 'error';
        span.tags['http.status_code'] = error.status;
        span.tags['error'] = true;
        span.logs.push({
          timestamp: performance.now(),
          message: error.message,
          data: { status: error.status, statusText: error.statusText },
        });

        onSpan?.(span);
        activeSpans.delete(context.spanId);
      }

      return error;
    },
  };

  return {
    request: requestInterceptor,
    response: responseInterceptor,
    error: errorInterceptor,
  };
}

// =============================================================================
// CORRELATION & REQUEST ID
// =============================================================================

/**
 * Create correlation ID interceptor
 */
export function createCorrelationInterceptor(
  headerName = 'X-Correlation-ID'
): ContextualRequestInterceptor {
  return {
    name: 'correlation',
    priority: InterceptorPriority.HIGHEST + 1,
    intercept: (config, context) => {
      const correlationId = crypto.randomUUID();
      context.metadata.set('correlationId', correlationId);

      return {
        ...config,
        headers: {
          ...config.headers,
          [headerName]: correlationId,
        },
      };
    },
  };
}

// =============================================================================
// TIMING & PERFORMANCE
// =============================================================================

/**
 * Timing configuration
 */
export interface TimingConfig {
  /** Threshold for slow request warning (ms) */
  slowThreshold?: number;
  /** Callback for timing data */
  onTiming?: (data: TimingData) => void;
  /** Log slow requests */
  logSlowRequests?: boolean;
}

/**
 * Timing data
 */
export interface TimingData {
  url: string;
  method: string;
  duration: number;
  status: number;
  traceId: string;
  isSlow: boolean;
}

/**
 * Create timing interceptor
 */
export function createTimingInterceptor(config: TimingConfig = {}): ContextualResponseInterceptor {
  const { slowThreshold = DEFAULT_SLOW_REQUEST_THRESHOLD * 3, onTiming, logSlowRequests = true } = config;

  return {
    name: 'timing',
    priority: InterceptorPriority.LOWEST,
    intercept: (response, context) => {
      const duration = performance.now() - context.startTime;
      const isSlow = duration > slowThreshold;

      const timingData: TimingData = {
        url: response.config.url,
        method: response.config.method ?? 'GET',
        duration,
        status: response.status,
        traceId: context.traceId,
        isSlow,
      };

      if (isSlow && logSlowRequests) {
        console.warn(
          `[Slow Request] ${timingData.method} ${timingData.url} took ${duration.toFixed(2)}ms`,
          { traceId: context.traceId }
        );
      }

      onTiming?.(timingData);

      return response;
    },
  };
}

// =============================================================================
// RETRY WITH BACKOFF
// =============================================================================

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Base delay between retries (ms) */
  baseDelay?: number;
  /** Maximum delay between retries (ms) */
  maxDelay?: number;
  /** Exponential backoff factor */
  backoffFactor?: number;
  /** Add jitter to delay */
  jitter?: boolean;
  /** Which status codes should trigger retry */
  retryStatuses?: number[];
  /** Retry on network errors */
  retryOnNetworkError?: boolean;
  /** Callback on retry */
  onRetry?: (error: HttpError, attempt: number, delay: number) => void;
}

/**
 * Create retry interceptor with exponential backoff
 */
export function createRetryInterceptor(
  config: RetryConfig = {},
  httpClientFn: (config: HttpRequestConfig) => Promise<HttpResponse>
): ContextualErrorInterceptor {
  const {
    maxRetries = 3,
    baseDelay = DEFAULT_RETRY_BASE_DELAY,
    maxDelay = DEFAULT_RETRY_MAX_DELAY,
    backoffFactor = 2,
    jitter = true,
    retryStatuses = [500, 502, 503, 504, 429],
    retryOnNetworkError = true,
    onRetry,
  } = config;

  function calculateDelay(attempt: number): number {
    let delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay);

    if (jitter) {
      // Add random jitter (+/- 25%)
      const jitterRange = delay * 0.25;
      delay = delay + (Math.random() * jitterRange * 2 - jitterRange);
    }

    return Math.floor(delay);
  }

  function shouldRetry(error: HttpError): boolean {
    if (retryOnNetworkError && error.status === 0) {
      return true;
    }
    return retryStatuses.includes(error.status);
  }

  return {
    name: 'retry',
    priority: InterceptorPriority.NORMAL,
    canHandle: shouldRetry,
    intercept: async (error, context) => {
      const attempt = context.retryAttempt;

      if (attempt >= maxRetries) {
        return error;
      }

      // Check Retry-After header for 429 responses
      let delay = calculateDelay(attempt);
      if (error.status === 429) {
        const retryAfter = error.config.headers?.['Retry-After'];
        if (retryAfter !== null && retryAfter !== undefined && retryAfter !== '') {
          const parsed = parseInt(retryAfter, 10);
          if (!isNaN(parsed)) {
            delay = parsed * 1000;
          }
        }
      }

      onRetry?.(error, attempt + 1, delay);

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Increment retry attempt in context
      context.retryAttempt = attempt + 1;

      // Retry the request
      try {
        return await httpClientFn(context.originalConfig);
      } catch (retryError) {
        if (retryError instanceof HttpError) {
          return retryError;
        }
        throw retryError;
      }
    },
  };
}

// =============================================================================
// FACTORY & DEFAULTS
// =============================================================================

/**
 * Create a fully configured interceptor chain
 */
export function createEnhancedInterceptorChain(config?: {
  tracing?: TracingConfig | false;
  circuitBreaker?: CircuitBreakerConfig | false;
  timing?: TimingConfig | false;
  enableCorrelation?: boolean;
}): InterceptorChain {
  const chain = new InterceptorChain();

  // Add tracing
  if (config?.tracing !== false) {
    const tracing = createTracingInterceptors(typeof config?.tracing === 'object' ? config.tracing : {});
    chain.addRequestInterceptor(tracing.request);
    chain.addResponseInterceptor(tracing.response);
    chain.addErrorInterceptor(tracing.error);
  }

  // Add correlation
  if (config?.enableCorrelation !== false) {
    chain.addRequestInterceptor(createCorrelationInterceptor());
  }

  // Add circuit breaker
  if (config?.circuitBreaker !== false) {
    const breaker = createCircuitBreakerInterceptor(typeof config?.circuitBreaker === 'object' ? config.circuitBreaker : {});
    chain.addRequestInterceptor(breaker.request);
    chain.addResponseInterceptor(breaker.response);
    chain.addErrorInterceptor(breaker.error);
  }

  // Add timing
  if (config?.timing !== false) {
    chain.addResponseInterceptor(createTimingInterceptor(typeof config?.timing === 'object' ? config.timing : {}));
  }

  return chain;
}

/**
 * Default interceptor chain instance
 */
export const enhancedInterceptorChain = createEnhancedInterceptorChain();
