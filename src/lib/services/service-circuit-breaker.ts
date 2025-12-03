/**
 * @file Service-Level Circuit Breaker
 * @description Per-service circuit breakers with health monitoring
 *
 * This module provides circuit breaker patterns for external service calls,
 * preventing cascading failures and providing graceful degradation when
 * services are unhealthy.
 */

import {
  CircuitBreaker,
  type CircuitState,
  type CircuitBreakerConfig,
} from '../utils/resilience';
import { ErrorReporter } from '../monitoring/ErrorReporter';
import { globalEventBus } from '../shared/event-utils';
import {
  DEFAULT_TIMEOUT,
  MINUTE,
} from '@/lib/core/config/constants';

// ============================================================================
// Types
// ============================================================================

/**
 * Service health status
 */
export type ServiceHealth = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/**
 * Service configuration extending circuit breaker config
 */
export interface ServiceConfig extends CircuitBreakerConfig {
  /** Unique service name */
  name: string;
  /** Service base URL */
  baseUrl?: string;
  /** Health check endpoint (relative to baseUrl) */
  healthCheckEndpoint?: string;
  /** Health check interval in ms */
  healthCheckInterval?: number;
  /** Fallback function when circuit is open */
  fallback?: <T>() => T | Promise<T>;
  /** Whether to start health checks automatically */
  autoStartHealthChecks?: boolean;
  /** Custom health check function */
  customHealthCheck?: () => Promise<boolean>;
}

/**
 * Service status for monitoring
 */
export interface ServiceStatus {
  /** Service name */
  name: string;
  /** Current health status */
  health: ServiceHealth;
  /** Circuit breaker state */
  circuitState: CircuitState;
  /** Last health check time */
  lastCheck: Date | null;
  /** Last error message if any */
  lastError: string | null;
  /** Success rate (0-1) */
  successRate: number;
  /** Average response time in ms */
  avgResponseTime: number;
  /** Total request count */
  requestCount: number;
}

/**
 * Service state change event
 */
export interface ServiceStateChangeEvent {
  service: string;
  from: CircuitState;
  to: CircuitState;
  health: ServiceHealth;
}

// ============================================================================
// Extend Global Events
// ============================================================================

// declare module '../utils/eventEmitter' {
//   interface GlobalEvents {
//     'service:stateChange': ServiceStateChangeEvent;
//     'service:healthCheck': { service: string; healthy: boolean };
//     'service:error': { service: string; error: string };
//   }
// }

// ============================================================================
// Service Circuit Breaker
// ============================================================================

/**
 * Circuit breaker for a specific service with health monitoring
 *
 * @example
 * ```tsx
 * const apiBreaker = new ServiceCircuitBreaker({
 *   name: 'api',
 *   baseUrl: 'https://api.example.com',
 *   healthCheckEndpoint: '/health',
 *   failureThreshold: 5,
 *   resetTimeout: 30000,
 * });
 *
 * // Execute requests through the circuit breaker
 * const result = await apiBreaker.execute(() => fetch('/api/users'));
 * ```
 */
export class ServiceCircuitBreaker {
  private breaker: CircuitBreaker;
  private config: Required<
    Omit<ServiceConfig, 'onStateChange' | 'fallback' | 'customHealthCheck'>
  > & {
    fallback?: ServiceConfig['fallback'];
    customHealthCheck?: ServiceConfig['customHealthCheck'];
  };
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private metrics = {
    successCount: 0,
    failureCount: 0,
    totalResponseTime: 0,
    requestCount: 0,
    lastError: null as string | null,
    lastCheck: null as Date | null,
  };

  constructor(config: ServiceConfig) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 2,
      resetTimeout: config.resetTimeout ?? DEFAULT_TIMEOUT,
      failureWindow: config.failureWindow ?? MINUTE,
      healthCheckInterval: config.healthCheckInterval ?? MINUTE,
      autoStartHealthChecks: config.autoStartHealthChecks ?? false,
      name: config.name,
      baseUrl: config.baseUrl ?? '',
      healthCheckEndpoint: config.healthCheckEndpoint ?? '',
      fallback: config.fallback,
      customHealthCheck: config.customHealthCheck,
    };

    this.breaker = new CircuitBreaker({
      failureThreshold: this.config.failureThreshold,
      successThreshold: this.config.successThreshold,
      resetTimeout: this.config.resetTimeout,
      failureWindow: this.config.failureWindow,
      onStateChange: this.handleStateChange.bind(this),
    });

    if (this.config.autoStartHealthChecks) {
      this.startHealthChecks();
    }
  }

  /**
   * Execute a request through the circuit breaker
   *
   * @param fn - Async function to execute
   * @returns Result of the function
   * @throws Error if circuit is open and no fallback available
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    this.metrics.requestCount++;

    try {
      const result = await this.breaker.execute(fn);

      // Record success
      const responseTime = performance.now() - startTime;
      this.metrics.successCount++;
      this.metrics.totalResponseTime += responseTime;

      return result;
    } catch (error) {
      // Record failure
      this.metrics.failureCount++;
      this.metrics.lastError = error instanceof Error ? error.message : String(error);

      globalEventBus.emitSync('service:error', {
        service: this.config.name,
        error: new Error(this.metrics.lastError),
      });

      // Try fallback if circuit is open and fallback exists
      if (this.breaker.getState() === 'open' && this.config.fallback) {
        return this.config.fallback<T>();
      }

      throw error;
    }
  }

  /**
   * Execute with automatic retry on failure
   *
   * @param fn - Async function to execute
   * @param maxRetries - Maximum retry attempts
   * @param delay - Base delay between retries in ms
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.execute(fn);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry if circuit is open
        if (this.breaker.getState() === 'open') {
          throw lastError;
        }

        // Wait before retry with exponential backoff
        if (attempt < maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, delay * Math.pow(2, attempt))
          );
        }
      }
    }

    throw lastError ?? new Error('Max retries exceeded');
  }

  /**
   * Get service health based on circuit state and metrics
   */
  getHealth(): ServiceHealth {
    const state = this.breaker.getState();

    if (state === 'open') {
      return 'unhealthy';
    }

    if (state === 'half-open') {
      return 'degraded';
    }

    const successRate = this.getSuccessRate();
    if (successRate < 0.9 && this.metrics.requestCount > 10) {
      return 'degraded';
    }

    if (this.metrics.requestCount === 0) {
      return 'unknown';
    }

    return 'healthy';
  }

  /**
   * Get success rate (0-1)
   */
  getSuccessRate(): number {
    const total = this.metrics.successCount + this.metrics.failureCount;
    return total > 0 ? this.metrics.successCount / total : 1;
  }

  /**
   * Get average response time in ms
   */
  getAvgResponseTime(): number {
    return this.metrics.requestCount > 0
      ? this.metrics.totalResponseTime / this.metrics.requestCount
      : 0;
  }

  /**
   * Get complete service status
   */
  getStatus(): ServiceStatus {
    return {
      name: this.config.name,
      health: this.getHealth(),
      circuitState: this.breaker.getState(),
      lastCheck: this.metrics.lastCheck,
      lastError: this.metrics.lastError,
      successRate: this.getSuccessRate(),
      avgResponseTime: this.getAvgResponseTime(),
      requestCount: this.metrics.requestCount,
    };
  }

  /**
   * Get circuit breaker state
   */
  getState(): CircuitState {
    return this.breaker.getState();
  }

  /**
   * Check if circuit is allowing requests
   */
  isAvailable(): boolean {
    return this.breaker.getState() !== 'open';
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks(): void {
    if (this.healthCheckTimer) {
      return; // Already running
    }

    if (!this.config.healthCheckEndpoint && !this.config.customHealthCheck) {
      return; // No health check configured
    }

    this.healthCheckTimer = setInterval(
      () => void this.performHealthCheck(),
      this.config.healthCheckInterval
    );

    // Perform initial check
    void this.performHealthCheck();
  }

  /**
   * Stop periodic health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Perform a single health check
   *
   * Note: This method intentionally uses raw fetch() rather than apiClient because:
   * 1. Health checks are infrastructure-level, not application API calls
   * 2. The circuit breaker monitors services that apiClient itself depends on
   * 3. Using apiClient would create circular dependency/infinite loops
   *
   * @see {@link @/lib/api/api-client} for application API calls
   */
  async performHealthCheck(): Promise<boolean> {
    this.metrics.lastCheck = new Date();

    try {
      let isHealthy: boolean;

      if (this.config.customHealthCheck) {
        isHealthy = await this.config.customHealthCheck();
      } else if (this.config.healthCheckEndpoint) {
        const url = this.config.baseUrl
          ? `${this.config.baseUrl}${this.config.healthCheckEndpoint}`
          : this.config.healthCheckEndpoint;

        // Raw fetch is intentional - health checks must be independent of apiClient
        const response = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });

        isHealthy = response.ok;
      } else {
        return true; // No health check configured
      }

      if (isHealthy) {
        this.breaker.success();
      } else {
        this.breaker.failure();
      }

      globalEventBus.emitSync('service:healthCheck', {
        service: this.config.name,
        health: isHealthy,
      });

      return isHealthy;
    } catch (error) {
      this.metrics.lastError = error instanceof Error ? error.message : String(error);
      this.breaker.failure();

      globalEventBus.emitSync('service:healthCheck', {
        service: this.config.name,
        health: false,
      });

      return false;
    }
  }

  /**
   * Manually record a success (for external success tracking)
   */
  recordSuccess(): void {
    this.metrics.successCount++;
    this.breaker.success();
  }

  /**
   * Manually record a failure (for external failure tracking)
   */
  recordFailure(error?: string): void {
    this.metrics.failureCount++;
    if (error !== undefined) {
      this.metrics.lastError = error;
    }
    this.breaker.failure();
  }

  /**
   * Reset circuit breaker and metrics
   */
  reset(): void {
    this.breaker.reset();
    this.metrics = {
      successCount: 0,
      failureCount: 0,
      totalResponseTime: 0,
      requestCount: 0,
      lastError: null,
      lastCheck: null,
    };
  }

  /**
   * Dispose and cleanup resources
   */
  dispose(): void {
    this.stopHealthChecks();
  }

  /**
   * Handle circuit state change
   */
  private handleStateChange(from: CircuitState, to: CircuitState): void {
    const health = this.getHealth();

    globalEventBus.emitSync('service:stateChange', {
      service: this.config.name,
      from,
      to,
      health,
    });

    // Report significant state changes
    if (to === 'open') {
      ErrorReporter.reportWarning(`Service ${this.config.name} circuit opened`, {
        action: 'circuit_open',
        metadata: {
          service: this.config.name,
          successRate: this.getSuccessRate(),
          lastError: this.metrics.lastError,
        },
      });
    } else if (from === 'open' && to === 'closed') {
      ErrorReporter.reportInfo(`Service ${this.config.name} recovered`);
    }
  }
}

// ============================================================================
// Service Registry
// ============================================================================

/**
 * Registry for managing multiple service circuit breakers
 */
class ServiceRegistry {
  private services: Map<string, ServiceCircuitBreaker> = new Map();

  /**
   * Get registry size
   */
  get size(): number {
    return this.services.size;
  }

  /**
   * Register a new service
   *
   * @param config - Service configuration
   * @returns The created circuit breaker
   */
  register(config: ServiceConfig): ServiceCircuitBreaker {
    if (this.services.has(config.name)) {
      console.warn(
        `[ServiceRegistry] Service "${config.name}" already registered, replacing`
      );
      this.services.get(config.name)?.dispose();
    }

    const breaker = new ServiceCircuitBreaker(config);
    this.services.set(config.name, breaker);
    return breaker;
  }

  /**
   * Get a service circuit breaker by name
   */
  get(name: string): ServiceCircuitBreaker | undefined {
    return this.services.get(name);
  }

  /**
   * Get or create a service circuit breaker
   */
  getOrCreate(config: ServiceConfig): ServiceCircuitBreaker {
    const existing = this.services.get(config.name);
    if (existing) {
      return existing;
    }
    return this.register(config);
  }

  /**
   * Check if a service is registered
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Unregister a service
   */
  unregister(name: string): void {
    const service = this.services.get(name);
    if (service) {
      service.dispose();
      this.services.delete(name);
    }
  }

  /**
   * Get status for all registered services
   */
  getAllStatuses(): ServiceStatus[] {
    return Array.from(this.services.values()).map((s) => s.getStatus());
  }

  /**
   * Get overall system health based on all services
   */
  getOverallHealth(): ServiceHealth {
    const statuses = this.getAllStatuses();

    if (statuses.length === 0) {
      return 'unknown';
    }

    const unhealthyCount = statuses.filter((s) => s.health === 'unhealthy').length;
    const degradedCount = statuses.filter((s) => s.health === 'degraded').length;

    if (unhealthyCount > 0) {
      return 'unhealthy';
    }
    if (degradedCount > 0) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Get names of all unhealthy services
   */
  getUnhealthyServices(): string[] {
    return this.getAllStatuses()
      .filter((s) => s.health === 'unhealthy' || s.health === 'degraded')
      .map((s) => s.name);
  }

  /**
   * Start health checks for all services
   */
  startAllHealthChecks(): void {
    this.services.forEach((s) => s.startHealthChecks());
  }

  /**
   * Stop health checks for all services
   */
  stopAllHealthChecks(): void {
    this.services.forEach((s) => s.stopHealthChecks());
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.services.forEach((s) => s.reset());
  }

  /**
   * Dispose all services and cleanup
   */
  dispose(): void {
    this.services.forEach((s) => s.dispose());
    this.services.clear();
  }

  /**
   * Get all service names
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }
}

/**
 * Global service registry instance
 */
export const serviceRegistry = new ServiceRegistry();

// ============================================================================
// Setup Helpers
// ============================================================================

/**
 * Setup default services with common configuration
 *
 * @param apiBaseUrl - Base URL for API services
 * @param options - Additional configuration options
 */
export function setupDefaultServices(
  apiBaseUrl: string,
  options?: {
    authBaseUrl?: string;
    healthCheckInterval?: number;
    autoStart?: boolean;
  }
): void {
  const { authBaseUrl, healthCheckInterval = MINUTE, autoStart = true } = options ?? {};

  // Main API service
  serviceRegistry.register({
    name: 'api',
    baseUrl: apiBaseUrl,
    healthCheckEndpoint: '/health',
    healthCheckInterval,
    failureThreshold: 5,
    resetTimeout: DEFAULT_TIMEOUT,
    autoStartHealthChecks: autoStart,
  });

  // Auth service (may be separate)
  serviceRegistry.register({
    name: 'auth',
    baseUrl: authBaseUrl ?? apiBaseUrl,
    healthCheckEndpoint: '/auth/health',
    healthCheckInterval,
    failureThreshold: 3,
    resetTimeout: MINUTE,
    autoStartHealthChecks: autoStart,
  });
}

/**
 * Create a wrapped fetch function that uses the service circuit breaker
 *
 * @param serviceName - Name of the service to use
 * @returns Wrapped fetch function
 */
export function createServiceFetch(
  serviceName: string
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const service = serviceRegistry.get(serviceName);

    if (!service) {
      // If service not registered, just use regular fetch
      return fetch(input, init);
    }

    return service.execute(async () => fetch(input, init));
  };
}
