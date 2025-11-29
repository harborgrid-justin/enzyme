/**
 * @file Service Layer Facade
 * @description Unified initialization and configuration for all service layer components.
 * Provides a single entry point for setting up circuit breakers, offline queue,
 * interceptors, and other enterprise patterns.
 *
 * @example
 * ```tsx
 * import { initializeServiceLayer, serviceLayer } from '@/lib/services';
 *
 * // Initialize during app bootstrap
 * await initializeServiceLayer({
 *   apiBaseUrl: 'https://api.example.com',
 *   enableOfflineQueue: true,
 *   enableCircuitBreakers: true,
 *   telemetry: {
 *     onSpan: (span) => sendToAPM(span),
 *     onMetric: (metric) => sendToMetrics(metric),
 *   },
 * });
 *
 * // Use throughout the app
 * const users = await serviceLayer.api.get('/users');
 * ```
 */

import { httpClient, type HttpClientConfig } from './http';
import { serviceRegistry, setupDefaultServices, type ServiceConfig } from './service-circuit-breaker';
import { offlineQueue, type OfflineQueueOptions } from './persistent-offline-queue';
import {
  enhancedInterceptorChain,
  createTracingInterceptors,
  createCircuitBreakerInterceptor,
  createTimingInterceptor,
  createCorrelationInterceptor,
  type CircuitBreakerConfig,
  type TimingConfig,
  type TraceSpan,
} from './enhanced-interceptors';
import { createVersionedApi, type ApiVersion, VersioningStrategy } from './api-versioning';
import { globalDeduplicator } from './data-loader-batching';
import { globalMutationQueue } from './optimistic-mutations';
import { globalEventBus } from '../shared/event-utils';
import { networkMonitor } from '../utils/networkStatus';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Telemetry configuration
 */
export interface TelemetryConfig {
  /** Callback for trace spans */
  onSpan?: (span: TraceSpan) => void;
  /** Callback for metrics */
  onMetric?: (metric: ServiceMetric) => void;
  /** Callback for errors */
  onError?: (error: ServiceError) => void;
  /** Service name for tracing */
  serviceName?: string;
  /** Sampling rate (0-1) */
  samplingRate?: number;
}

/**
 * Service metric data
 */
export interface ServiceMetric {
  name: string;
  value: number;
  unit: string;
  tags: Record<string, string>;
  timestamp: number;
}

/**
 * Service error data
 */
export interface ServiceError {
  message: string;
  code: string;
  stack?: string;
  context: Record<string, unknown>;
  timestamp: number;
}

/**
 * Service layer configuration
 */
export interface ServiceLayerConfig {
  /** Base URL for API requests */
  apiBaseUrl: string;
  /** Auth service URL (if different from API) */
  authBaseUrl?: string;
  /** Current API version */
  apiVersion?: ApiVersion;
  /** Minimum supported API version */
  minApiVersion?: ApiVersion;
  /** API versioning strategy */
  versioningStrategy?: VersioningStrategy;

  // Feature flags
  /** Enable offline queue (default: true) */
  enableOfflineQueue?: boolean;
  /** Enable circuit breakers (default: true) */
  enableCircuitBreakers?: boolean;
  /** Enable request deduplication (default: true) */
  enableDeduplication?: boolean;
  /** Enable distributed tracing (default: true) */
  enableTracing?: boolean;
  /** Enable request timing (default: true) */
  enableTiming?: boolean;
  /** Enable correlation IDs (default: true) */
  enableCorrelation?: boolean;

  // Telemetry
  /** Telemetry configuration */
  telemetry?: TelemetryConfig;

  // Circuit breaker settings
  /** Circuit breaker configuration */
  circuitBreaker?: CircuitBreakerConfig;

  // Offline queue settings
  /** Offline queue configuration */
  offlineQueue?: OfflineQueueOptions;

  // Timing settings
  /** Timing configuration */
  timing?: TimingConfig;

  // Custom services
  /** Additional services to register */
  services?: ServiceConfig[];

  // HTTP client settings
  /** HTTP client configuration */
  httpClient?: HttpClientConfig;

  // Event handlers
  /** Called when service layer is initialized */
  onInitialized?: () => void;
  /** Called when a service becomes unhealthy */
  onServiceUnhealthy?: (serviceName: string) => void;
  /** Called when a service recovers */
  onServiceRecovered?: (serviceName: string) => void;
  /** Called when offline mode is entered */
  onOfflineMode?: () => void;
  /** Called when online mode is restored */
  onOnlineMode?: () => void;
}

/**
 * Service layer status
 */
export interface ServiceLayerStatus {
  initialized: boolean;
  online: boolean;
  services: {
    name: string;
    health: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    circuitState: 'closed' | 'open' | 'half-open';
  }[];
  offlineQueue: {
    enabled: boolean;
    pending: number;
    processing: boolean;
  };
  metrics: {
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
  };
}

// =============================================================================
// SERVICE LAYER CLASS
// =============================================================================

/**
 * Service Layer Facade
 *
 * Provides unified initialization and access to all service layer components.
 */
class ServiceLayerFacade {
  private config: ServiceLayerConfig | null = null;
  private _initialized = false;
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    totalResponseTime: 0,
  };
  private cleanupFunctions: Array<() => void> = [];

  /**
   * Check if service layer is initialized
   */
  get initialized(): boolean {
    return this._initialized;
  }

  /**
   * Get current configuration
   */
  getConfig(): ServiceLayerConfig | null {
    return this.config;
  }

  /**
   * Initialize the service layer
   */
  async initialize(config: ServiceLayerConfig): Promise<void> {
    if (this._initialized) {
      console.warn('[ServiceLayer] Already initialized. Call dispose() first to reinitialize.');
      return;
    }

    this.config = {
      // Defaults
      apiVersion: 'v1',
      minApiVersion: 'v1',
      versioningStrategy: VersioningStrategy.URL_PATH,
      enableOfflineQueue: true,
      enableCircuitBreakers: true,
      enableDeduplication: true,
      enableTracing: true,
      enableTiming: true,
      enableCorrelation: true,
      ...config,
    };

    try {
      // 1. Setup circuit breakers
      if (this.config.enableCircuitBreakers === true) {
        this.setupCircuitBreakers();
      }

      // 2. Setup enhanced interceptors
      this.setupInterceptors();

      // 3. Initialize offline queue
      if (this.config.enableOfflineQueue === true) {
        await this.setupOfflineQueue();
      }

      // 4. Setup event listeners
      this.setupEventListeners();

      // 5. Setup telemetry
      if (this.config.telemetry !== undefined) {
        this.setupTelemetry();
      }

      this._initialized = true;
      this.config.onInitialized?.();

      console.info('[ServiceLayer] Initialized successfully', {
        apiBaseUrl: this.config.apiBaseUrl,
        apiVersion: this.config.apiVersion,
        features: {
          offlineQueue: this.config.enableOfflineQueue,
          circuitBreakers: this.config.enableCircuitBreakers,
          tracing: this.config.enableTracing,
        },
      });
    } catch (error) {
      console.error('[ServiceLayer] Initialization failed', error);
      throw error;
    }
  }

  /**
   * Setup circuit breakers for services
   */
  private setupCircuitBreakers(): void {
    if (!this.config) return;

    // Setup default API and Auth services
    setupDefaultServices(this.config.apiBaseUrl, {
      authBaseUrl: this.config.authBaseUrl,
      healthCheckInterval: 60000,
      autoStart: true,
    });

    // Register additional custom services
    if (this.config.services !== undefined) {
      for (const service of this.config.services) {
        serviceRegistry.register(service);
      }
    }
  }

  /**
   * Setup enhanced interceptors
   */
  private setupInterceptors(): void {
    if (!this.config) return;

    // Add tracing interceptors
    if (this.config.enableTracing === true) {
      const tracing = createTracingInterceptors({
        serviceName: this.config.telemetry?.serviceName ?? 'frontend',
        samplingRate: this.config.telemetry?.samplingRate ?? 1.0,
        onSpan: this.config.telemetry?.onSpan,
      });
      enhancedInterceptorChain.addRequestInterceptor(tracing.request);
      enhancedInterceptorChain.addResponseInterceptor(tracing.response);
      enhancedInterceptorChain.addErrorInterceptor(tracing.error);
    }

    // Add correlation interceptor
    if (this.config.enableCorrelation === true) {
      enhancedInterceptorChain.addRequestInterceptor(createCorrelationInterceptor());
    }

    // Add circuit breaker interceptors
    if (this.config.enableCircuitBreakers === true) {
      const breaker = createCircuitBreakerInterceptor(this.config.circuitBreaker);
      enhancedInterceptorChain.addRequestInterceptor(breaker.request);
      enhancedInterceptorChain.addResponseInterceptor(breaker.response);
      enhancedInterceptorChain.addErrorInterceptor(breaker.error);
    }

    // Add timing interceptor
    if (this.config.enableTiming === true) {
      enhancedInterceptorChain.addResponseInterceptor(
        createTimingInterceptor({
          ...this.config.timing,
          onTiming: (data) => {
            // Track metrics
            this.metrics.totalRequests++;
            this.metrics.totalResponseTime += data.duration;
            if (data.status < 400) {
              this.metrics.successfulRequests++;
            }

            // Emit metric
            this.config?.telemetry?.onMetric?.({
              name: 'http.request.duration',
              value: data.duration,
              unit: 'ms',
              tags: {
                method: data.method,
                status: String(data.status),
                slow: String(data.isSlow),
              },
              timestamp: Date.now(),
            });

            this.config?.timing?.onTiming?.(data);
          },
        })
      );
    }

    // Add metrics interceptor
    this.cleanupFunctions.push(
      httpClient.addResponseInterceptor((response) => {
        this.metrics.totalRequests++;
        this.metrics.successfulRequests++;
        return response;
      })
    );

    this.cleanupFunctions.push(
      httpClient.addErrorInterceptor((error) => {
        this.metrics.totalRequests++;
        return error;
      })
    );
  }

  /**
   * Setup offline queue
   */
  private async setupOfflineQueue(): Promise<void> {
    if (!this.config) return;

    await offlineQueue.init();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.config) return;

    // Listen for service state changes
    const unsubStateChange = globalEventBus.on('service:stateChange', (event) => {
      if (event.to === 'open') {
        this.config?.onServiceUnhealthy?.(event.service);
        this.config?.telemetry?.onError?.({
          message: `Service ${event.service} circuit opened`,
          code: 'CIRCUIT_OPEN',
          context: { service: event.service, health: event.health },
          timestamp: Date.now(),
        });
      } else if (event.from === 'open' && event.to === 'closed') {
        this.config?.onServiceRecovered?.(event.service);
      }
    });
    this.cleanupFunctions.push(unsubStateChange);

    // Listen for network status changes
    const unsubNetwork = networkMonitor.onStatusChange((status) => {
      if (status.online) {
        this.config?.onOnlineMode?.();
      } else {
        this.config?.onOfflineMode?.();
      }
    });
    this.cleanupFunctions.push(unsubNetwork);
  }

  /**
   * Setup telemetry integration
   */
  private setupTelemetry(): void {
    if (!this.config?.telemetry) return;

    // Listen for offline queue events
    const unsubEnqueued = globalEventBus.on('offlineQueue:enqueued', ({ url }) => {
      this.config?.telemetry?.onMetric?.({
        name: 'offline_queue.enqueued',
        value: 1,
        unit: 'count',
        tags: { url },
        timestamp: Date.now(),
      });
    });
    this.cleanupFunctions.push(unsubEnqueued);

    const unsubCompleted = globalEventBus.on('offlineQueue:completed', ({ url }) => {
      this.config?.telemetry?.onMetric?.({
        name: 'offline_queue.completed',
        value: 1,
        unit: 'count',
        tags: { url },
        timestamp: Date.now(),
      });
    });
    this.cleanupFunctions.push(unsubCompleted);

    const unsubFailed = globalEventBus.on('offlineQueue:failed', ({ id, url, error }) => {
      this.config?.telemetry?.onError?.({
        message: `Offline request failed: ${error}`,
        code: 'OFFLINE_QUEUE_FAILED',
        context: { id, url },
        timestamp: Date.now(),
      });
    });
    this.cleanupFunctions.push(unsubFailed);
  }

  /**
   * Get current service layer status
   */
  async getStatus(): Promise<ServiceLayerStatus> {
    const serviceStatuses = serviceRegistry.getAllStatuses();
    const queueStats = this.config?.enableOfflineQueue === true ? await offlineQueue.getStats() : { pending: 0 };

    return {
      initialized: this._initialized,
      online: networkMonitor.isOnline(),
      services: serviceStatuses.map((s) => ({
        name: s.name,
        health: s.health,
        circuitState: s.circuitState,
      })),
      offlineQueue: {
        enabled: this.config?.enableOfflineQueue === true,
        pending: queueStats.pending,
        processing: offlineQueue.isQueueProcessing(),
      },
      metrics: {
        totalRequests: this.metrics.totalRequests,
        successRate:
          this.metrics.totalRequests > 0
            ? this.metrics.successfulRequests / this.metrics.totalRequests
            : 1,
        avgResponseTime:
          this.metrics.totalRequests > 0
            ? this.metrics.totalResponseTime / this.metrics.totalRequests
            : 0,
      },
    };
  }

  /**
   * Get versioned API client
   */
  getVersionedApi(version?: ApiVersion): ReturnType<typeof createVersionedApi> {
    if (!this.config) {
      throw new Error('[ServiceLayer] Not initialized. Call initialize() first.');
    }

    return createVersionedApi({
      baseUrl: this.config.apiBaseUrl,
      currentVersion: version ?? this.config.apiVersion,
      minimumVersion: this.config.minApiVersion,
      strategy: this.config.versioningStrategy,
    });
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      totalResponseTime: 0,
    };
  }

  /**
   * Force process offline queue
   */
  async processOfflineQueue(): Promise<void> {
    if (this.config?.enableOfflineQueue !== true) {
      console.warn('[ServiceLayer] Offline queue is not enabled');
      return;
    }
    await offlineQueue.forceProcess();
  }

  /**
   * Reset all circuit breakers
   */
  resetCircuitBreakers(): void {
    serviceRegistry.resetAll();
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    // Run all cleanup functions
    for (const cleanup of this.cleanupFunctions) {
      try {
        cleanup();
      } catch (error) {
        console.error('[ServiceLayer] Cleanup error', error);
      }
    }
    this.cleanupFunctions = [];

    // Dispose services
    serviceRegistry.dispose();
    offlineQueue.dispose();
    globalMutationQueue.destroy();
    globalDeduplicator.clear();
    enhancedInterceptorChain.clear();

    // Reset state
    this.config = null;
    this._initialized = false;
    this.resetMetrics();

    console.info('[ServiceLayer] Disposed');
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Global service layer instance
 */
export const serviceLayer = new ServiceLayerFacade();

/**
 * Initialize the service layer (convenience function)
 */
export async function initializeServiceLayer(config: ServiceLayerConfig): Promise<void> {
  await serviceLayer.initialize(config);
}

/**
 * Get service layer status (convenience function)
 */
export async function getServiceLayerStatus(): Promise<ServiceLayerStatus> {
  return serviceLayer.getStatus();
}

/**
 * Dispose service layer (convenience function)
 */
export function disposeServiceLayer(): void {
  serviceLayer.dispose();
}
