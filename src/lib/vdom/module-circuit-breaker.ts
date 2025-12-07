/**
 * @file Module Circuit Breaker
 * @description Circuit breaker for dynamic module loading to prevent
 * cascading failures when module servers/CDNs are unavailable
 */

import { CircuitBreaker, type CircuitState, CircuitOpenError } from '../utils/resilience';
import type { ModuleId } from './types';

/**
 * Module circuit breaker configuration
 */
export interface ModuleCircuitBreakerConfig {
  /** Failure threshold before opening circuit */
  failureThreshold?: number;
  /** Success threshold for half-open to close */
  successThreshold?: number;
  /** Time to wait before trying half-open (ms) */
  resetTimeout?: number;
  /** Time window for failure counting (ms) */
  failureWindow?: number;
  /** Callback on state change */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
  /** Callback when circuit opens */
  onCircuitOpen?: () => void;
  /** Callback when circuit recovers */
  onCircuitRecovery?: () => void;
}

/**
 * Module loading metrics
 */
export interface ModuleLoadingMetrics {
  totalAttempts: number;
  totalSuccesses: number;
  totalFailures: number;
  circuitOpenCount: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  circuitState: CircuitState;
  failedModules: Set<ModuleId>;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<Omit<ModuleCircuitBreakerConfig, 'onStateChange' | 'onCircuitOpen' | 'onCircuitRecovery'>> = {
  failureThreshold: 5,
  successThreshold: 2,
  resetTimeout: 60000, // 1 minute
  failureWindow: 60000, // 1 minute
};

/**
 * Module Circuit Breaker
 *
 * Provides circuit breaker protection for dynamic module loading.
 * When module loading fails repeatedly (e.g., CDN is down), the circuit
 * opens and immediately fails subsequent requests, preventing:
 * - Thundering herd on module servers
 * - UI hangs waiting for modules to load
 * - Cascading failures across the application
 *
 * @example
 * ```typescript
 * const breaker = getModuleCircuitBreaker();
 *
 * // Execute module load through circuit breaker
 * const component = await breaker.execute(() => import('./MyModule'));
 *
 * // Check if we can attempt to load modules
 * if (breaker.canLoadModules()) {
 *   await loadModule(moduleId);
 * } else {
 *   showOfflineFallback();
 * }
 * ```
 */
export class ModuleCircuitBreaker {
  private breaker: CircuitBreaker;
  private config: Required<Omit<ModuleCircuitBreakerConfig, 'onStateChange' | 'onCircuitOpen' | 'onCircuitRecovery'>> & {
    onStateChange?: ModuleCircuitBreakerConfig['onStateChange'];
    onCircuitOpen?: ModuleCircuitBreakerConfig['onCircuitOpen'];
    onCircuitRecovery?: ModuleCircuitBreakerConfig['onCircuitRecovery'];
  };

  private totalAttempts = 0;
  private totalSuccesses = 0;
  private totalFailures = 0;
  private circuitOpenCount = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private failedModules: Set<ModuleId> = new Set();

  constructor(config: ModuleCircuitBreakerConfig = {}) {
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
        this.handleStateChange(from, to);
        this.config.onStateChange?.(from, to);
      },
    });
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.breaker.getState();
  }

  /**
   * Check if module loading is allowed
   */
  canLoadModules(): boolean {
    return this.breaker.getState() !== 'open';
  }

  /**
   * Execute a module load through the circuit breaker
   *
   * @param loader - The module loading function
   * @param moduleId - Optional module ID for tracking
   * @returns The loaded module
   * @throws CircuitOpenError if circuit is open
   */
  async execute<T>(
    loader: () => Promise<T>,
    moduleId?: ModuleId
  ): Promise<T> {
    this.totalAttempts++;

    const state = this.breaker.getState();

    if (state === 'open') {
      throw new ModuleCircuitOpenError(
        'Module loading circuit is open - too many recent failures',
        moduleId
      );
    }

    try {
      const result = await this.breaker.execute(loader);
      this.recordSuccess(moduleId);
      return result;
    } catch (error) {
      this.recordFailure(moduleId);
      throw error;
    }
  }

  /**
   * Execute module load with fallback
   *
   * @param loader - The module loading function
   * @param fallback - Fallback value if circuit is open or load fails
   * @param moduleId - Optional module ID for tracking
   * @returns The loaded module or fallback
   */
  async executeWithFallback<T>(
    loader: () => Promise<T>,
    fallback: T,
    moduleId?: ModuleId
  ): Promise<T> {
    try {
      return await this.execute(loader, moduleId);
    } catch {
      return fallback;
    }
  }

  /**
   * Get loading metrics
   */
  getMetrics(): ModuleLoadingMetrics {
    return {
      totalAttempts: this.totalAttempts,
      totalSuccesses: this.totalSuccesses,
      totalFailures: this.totalFailures,
      circuitOpenCount: this.circuitOpenCount,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime) : null,
      lastSuccessTime: this.lastSuccessTime ? new Date(this.lastSuccessTime) : null,
      circuitState: this.breaker.getState(),
      failedModules: new Set(this.failedModules),
    };
  }

  /**
   * Force reset the circuit
   */
  reset(): void {
    this.breaker.reset();
    this.failedModules.clear();
    console.info('[ModuleCircuitBreaker] Circuit manually reset');
  }

  /**
   * Handle circuit state changes
   */
  private handleStateChange(from: CircuitState, to: CircuitState): void {
    if (to === 'open') {
      this.circuitOpenCount++;
      console.warn('[ModuleCircuitBreaker] Circuit opened - module loading disabled');
      console.warn(`[ModuleCircuitBreaker] Failed modules: ${Array.from(this.failedModules).join(', ')}`);
      this.config.onCircuitOpen?.();
    } else if (from === 'open' && (to === 'half-open' || to === 'closed')) {
      console.info('[ModuleCircuitBreaker] Circuit recovering - attempting module loads');
    } else if (to === 'closed' && from !== 'closed') {
      this.failedModules.clear();
      console.info('[ModuleCircuitBreaker] Circuit recovered - module loading enabled');
      this.config.onCircuitRecovery?.();
    }
  }

  /**
   * Record a successful module load
   */
  private recordSuccess(moduleId?: ModuleId): void {
    this.totalSuccesses++;
    this.lastSuccessTime = Date.now();

    if (moduleId) {
      this.failedModules.delete(moduleId);
    }
  }

  /**
   * Record a failed module load
   */
  private recordFailure(moduleId?: ModuleId): void {
    this.totalFailures++;
    this.lastFailureTime = Date.now();

    if (moduleId) {
      this.failedModules.add(moduleId);
    }
  }
}

/**
 * Error thrown when module circuit is open
 */
export class ModuleCircuitOpenError extends CircuitOpenError {
  readonly moduleId?: ModuleId;

  constructor(message: string, moduleId?: ModuleId) {
    super(message);
    this.name = 'ModuleCircuitOpenError';
    this.moduleId = moduleId;
  }
}

// ============================================================================
// Global Instance
// ============================================================================

/**
 * Global module circuit breaker instance
 */
let globalModuleCircuitBreaker: ModuleCircuitBreaker | null = null;

/**
 * Get or create the global module circuit breaker
 */
export function getModuleCircuitBreaker(
  config?: ModuleCircuitBreakerConfig
): ModuleCircuitBreaker {
  globalModuleCircuitBreaker ??= new ModuleCircuitBreaker(config);
  return globalModuleCircuitBreaker;
}

/**
 * Reset the global module circuit breaker
 */
export function resetModuleCircuitBreaker(): void {
  globalModuleCircuitBreaker?.reset();
}

/**
 * Replace the global module circuit breaker (for testing)
 */
export function setModuleCircuitBreaker(breaker: ModuleCircuitBreaker | null): void {
  globalModuleCircuitBreaker = breaker;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Wrap a dynamic import with circuit breaker protection
 *
 * @example
 * ```typescript
 * const MyComponent = await withModuleCircuitBreaker(
 *   () => import('./MyComponent'),
 *   'MyComponent'
 * );
 * ```
 */
export async function withModuleCircuitBreaker<T>(
  loader: () => Promise<T>,
  moduleId?: ModuleId
): Promise<T> {
  const breaker = getModuleCircuitBreaker();
  return breaker.execute(loader, moduleId);
}

/**
 * Wrap a dynamic import with circuit breaker and fallback
 *
 * @example
 * ```typescript
 * const MyComponent = await withModuleCircuitBreakerFallback(
 *   () => import('./MyComponent'),
 *   FallbackComponent,
 *   'MyComponent'
 * );
 * ```
 */
export async function withModuleCircuitBreakerFallback<T>(
  loader: () => Promise<T>,
  fallback: T,
  moduleId?: ModuleId
): Promise<T> {
  const breaker = getModuleCircuitBreaker();
  return breaker.executeWithFallback(loader, fallback, moduleId);
}

/**
 * Check if module loading is currently available
 */
export function canLoadModules(): boolean {
  const breaker = getModuleCircuitBreaker();
  return breaker.canLoadModules();
}

/**
 * Get module loading circuit state
 */
export function getModuleCircuitState(): CircuitState {
  const breaker = getModuleCircuitBreaker();
  return breaker.getState();
}
