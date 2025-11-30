/**
 * @file Realtime Circuit Breaker
 * @description Circuit breaker wrapper for WebSocket and SSE connections
 * to prevent connection storms and provide graceful degradation
 */

import { CircuitBreaker, type CircuitState, CircuitOpenError } from '../utils/resilience';

/**
 * Realtime circuit breaker configuration
 */
export interface RealtimeCircuitBreakerConfig {
  /** Failure threshold before opening circuit */
  failureThreshold?: number;
  /** Success threshold for half-open to close */
  successThreshold?: number;
  /** Time to wait before trying half-open (ms) */
  resetTimeout?: number;
  /** Time window for failure counting (ms) */
  failureWindow?: number;
  /** Connection timeout (ms) */
  connectionTimeout?: number;
  /** Whether to enable health checking */
  healthCheckEnabled?: boolean;
  /** Health check interval (ms) */
  healthCheckInterval?: number;
  /** Callback on state change */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
  /** Callback when circuit opens (for fallback logic) */
  onCircuitOpen?: () => void;
  /** Callback when circuit recovers */
  onCircuitRecovery?: () => void;
}

/**
 * Default configuration for realtime circuit breaker
 */
const DEFAULT_CONFIG: Required<Omit<RealtimeCircuitBreakerConfig, 'onStateChange' | 'onCircuitOpen' | 'onCircuitRecovery'>> = {
  failureThreshold: 3,
  successThreshold: 1,
  resetTimeout: 300000, // 5 minutes - longer for realtime connections
  failureWindow: 60000, // 1 minute
  connectionTimeout: 10000, // 10 seconds
  healthCheckEnabled: true,
  healthCheckInterval: 60000, // 1 minute
};

/**
 * Connection state
 */
export type RealtimeConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'circuit_open'
  | 'degraded';

/**
 * Connection metrics
 */
export interface RealtimeConnectionMetrics {
  consecutiveFailures: number;
  totalFailures: number;
  totalSuccesses: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  circuitState: CircuitState;
  connectionState: RealtimeConnectionState;
  averageReconnectTime: number;
}

/**
 * Realtime circuit breaker for WebSocket/SSE connections
 *
 * This class provides fault isolation for realtime connections:
 * - Prevents connection storms during outages
 * - Provides graceful degradation when services are unavailable
 * - Tracks connection health metrics
 * - Supports fallback to alternative transports
 */
export class RealtimeCircuitBreaker {
  private breaker: CircuitBreaker;
  private config: Required<Omit<RealtimeCircuitBreakerConfig, 'onStateChange' | 'onCircuitOpen' | 'onCircuitRecovery'>> & {
    onStateChange?: RealtimeCircuitBreakerConfig['onStateChange'];
    onCircuitOpen?: RealtimeCircuitBreakerConfig['onCircuitOpen'];
    onCircuitRecovery?: RealtimeCircuitBreakerConfig['onCircuitRecovery'];
  };
  private connectionState: RealtimeConnectionState = 'disconnected';
  private consecutiveFailures = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private reconnectTimes: number[] = [];
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private connectionStartTime: number | null = null;
  private disposed = false;

  constructor(config: RealtimeCircuitBreakerConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    this.breaker = new CircuitBreaker({
      failureThreshold: this.config.failureThreshold,
      successThreshold: this.config.successThreshold,
      resetTimeout: this.config.resetTimeout,
      failureWindow: this.config.failureWindow,
      onStateChange: (from, to) => {
        this.handleCircuitStateChange(from, to);
        this.config.onStateChange?.(from, to);
      },
    });
  }

  /**
   * Handle circuit state changes
   */
  private handleCircuitStateChange(from: CircuitState, to: CircuitState): void {
    if (to === 'open') {
      this.connectionState = 'circuit_open';
      this.config.onCircuitOpen?.();
      console.warn('[RealtimeCircuitBreaker] Circuit opened - stopping reconnection attempts');
    } else if (from === 'open' && to === 'half-open') {
      this.connectionState = 'reconnecting';
      console.info('[RealtimeCircuitBreaker] Circuit half-open - attempting recovery');
    } else if (to === 'closed' && from !== 'closed') {
      this.config.onCircuitRecovery?.();
      console.info('[RealtimeCircuitBreaker] Circuit recovered');
    }
  }

  /**
   * Get current circuit state
   */
  getCircuitState(): CircuitState {
    return this.breaker.getState();
  }

  /**
   * Get current connection state
   */
  getConnectionState(): RealtimeConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connection is allowed
   */
  canConnect(): boolean {
    const state = this.breaker.getState();
    return state !== 'open';
  }

  /**
   * Check if circuit is open
   */
  isCircuitOpen(): boolean {
    return this.breaker.getState() === 'open';
  }

  /**
   * Execute a connection attempt through the circuit breaker
   */
  async connect<T>(
    connectionFactory: () => Promise<T>,
    options: { timeout?: number } = {}
  ): Promise<T> {
    if (this.disposed) {
      throw new Error('Circuit breaker has been disposed');
    }

    const state = this.breaker.getState();

    if (state === 'open') {
      this.connectionState = 'circuit_open';
      throw new CircuitOpenError('Realtime circuit breaker is open - connection blocked');
    }

    this.connectionState = 'connecting';
    this.connectionStartTime = Date.now();
    const timeout = options.timeout ?? this.config.connectionTimeout;

    try {
      const result = await this.withConnectionTimeout(connectionFactory, timeout);
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Record a successful connection
   */
  recordSuccess(): void {
    this.breaker.success();
    this.consecutiveFailures = 0;
    this.totalSuccesses++;
    this.lastSuccessTime = Date.now();
    this.connectionState = 'connected';

    // Track reconnect time
    if (this.connectionStartTime !== null) {
      const reconnectTime = Date.now() - this.connectionStartTime;
      this.reconnectTimes.push(reconnectTime);
      // Keep only last 10 reconnect times
      if (this.reconnectTimes.length > 10) {
        this.reconnectTimes.shift();
      }
    }
  }

  /**
   * Record a connection failure
   */
  recordFailure(): void {
    this.breaker.failure();
    this.consecutiveFailures++;
    this.totalFailures++;
    this.lastFailureTime = Date.now();

    // Update connection state based on circuit state
    const circuitState = this.breaker.getState();
    if (circuitState === 'open') {
      this.connectionState = 'circuit_open';
    } else {
      this.connectionState = 'reconnecting';
    }
  }

  /**
   * Record a disconnect event (not necessarily a failure)
   */
  recordDisconnect(): void {
    if (this.connectionState === 'connected') {
      this.connectionState = 'disconnected';
    }
  }

  /**
   * Apply timeout to connection factory
   */
  private async withConnectionTimeout<T>(
    connectionFactory: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new ConnectionTimeoutError(`Connection timed out after ${timeout}ms`));
      }, timeout);

      connectionFactory()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Get connection metrics
   */
  getMetrics(): RealtimeConnectionMetrics {
    const averageReconnectTime = this.reconnectTimes.length > 0
      ? this.reconnectTimes.reduce((a, b) => a + b, 0) / this.reconnectTimes.length
      : 0;

    return {
      consecutiveFailures: this.consecutiveFailures,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      lastFailureTime: this.lastFailureTime !== null ? new Date(this.lastFailureTime) : null,
      lastSuccessTime: this.lastSuccessTime !== null ? new Date(this.lastSuccessTime) : null,
      circuitState: this.breaker.getState(),
      connectionState: this.connectionState,
      averageReconnectTime,
    };
  }

  /**
   * Start health checking (for monitoring purposes)
   */
  startHealthCheck(checkFn: () => Promise<boolean>): void {
    if (!this.config.healthCheckEnabled || this.healthCheckTimer !== null) {
      return;
    }

    this.healthCheckTimer = setInterval(async () => {
      if (this.disposed) {
        this.stopHealthCheck();
        return;
      }

      try {
        const isHealthy = await checkFn();
        if (isHealthy) {
          // Health check success in open state can trigger half-open
          if (this.breaker.getState() === 'open') {
            console.info('[RealtimeCircuitBreaker] Health check passed - circuit may recover');
          }
        } else {
          // Health check failure while connected indicates degradation
          if (this.connectionState === 'connected') {
            this.connectionState = 'degraded';
          }
        }
      } catch {
        // Health check errors are logged but don't affect circuit state
        console.warn('[RealtimeCircuitBreaker] Health check failed');
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Stop health checking
   */
  stopHealthCheck(): void {
    if (this.healthCheckTimer !== null) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Force reset the circuit breaker
   */
  reset(): void {
    this.breaker.reset();
    this.consecutiveFailures = 0;
    this.connectionState = 'disconnected';
    console.info('[RealtimeCircuitBreaker] Circuit manually reset');
  }

  /**
   * Dispose the circuit breaker
   */
  dispose(): void {
    this.disposed = true;
    this.stopHealthCheck();
    this.connectionState = 'disconnected';
  }
}

/**
 * Connection timeout error
 */
export class ConnectionTimeoutError extends Error {
  readonly isConnectionTimeout = true;

  constructor(message = 'Connection timed out') {
    super(message);
    this.name = 'ConnectionTimeoutError';
  }
}

/**
 * Create a WebSocket-specific circuit breaker
 */
export function createWebSocketCircuitBreaker(
  config?: RealtimeCircuitBreakerConfig
): RealtimeCircuitBreaker {
  return new RealtimeCircuitBreaker({
    failureThreshold: 3,
    successThreshold: 1,
    resetTimeout: 300000, // 5 minutes
    connectionTimeout: 10000,
    ...config,
  });
}

/**
 * Create an SSE-specific circuit breaker
 */
export function createSSECircuitBreaker(
  config?: RealtimeCircuitBreakerConfig
): RealtimeCircuitBreaker {
  return new RealtimeCircuitBreaker({
    failureThreshold: 3,
    successThreshold: 1,
    resetTimeout: 300000, // 5 minutes
    connectionTimeout: 15000, // SSE connections may take longer
    ...config,
  });
}

/**
 * Global realtime circuit breaker registry
 */
const circuitBreakerRegistry = new Map<string, RealtimeCircuitBreaker>();

/**
 * Get or create a named circuit breaker
 */
export function getRealtimeCircuitBreaker(
  name: string,
  config?: RealtimeCircuitBreakerConfig
): RealtimeCircuitBreaker {
  let breaker = circuitBreakerRegistry.get(name);

  if (breaker === undefined) {
    breaker = new RealtimeCircuitBreaker(config);
    circuitBreakerRegistry.set(name, breaker);
  }

  return breaker;
}

/**
 * Reset all circuit breakers
 */
export function resetAllRealtimeCircuitBreakers(): void {
  circuitBreakerRegistry.forEach((breaker) => {
    breaker.reset();
  });
}

/**
 * Get all circuit breaker metrics
 */
export function getAllRealtimeCircuitBreakerMetrics(): Record<string, RealtimeConnectionMetrics> {
  const metrics: Record<string, RealtimeConnectionMetrics> = {};

  circuitBreakerRegistry.forEach((breaker, name) => {
    metrics[name] = breaker.getMetrics();
  });

  return metrics;
}

/**
 * Dispose all circuit breakers
 */
export function disposeAllRealtimeCircuitBreakers(): void {
  circuitBreakerRegistry.forEach((breaker) => {
    breaker.dispose();
  });
  circuitBreakerRegistry.clear();
}
