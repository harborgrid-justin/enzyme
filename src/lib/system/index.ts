/**
 * @file System Initialization
 * @description Enterprise-grade system initialization and configuration
 * for error handling, memory management, and monitoring
 */

import { memoryManager, type MemoryPressure } from '../utils/memoryManager';
import {
  performanceMonitor,
  webVitals,
  longTaskObserver,
} from '../utils/performanceMonitor';
import { globalEventBus } from '../shared/event-utils';
import { ErrorReporter } from '../monitoring/ErrorReporter';
import { logger, configureLogger, type LogLevel } from '../utils/logging';
import { globalRequestQueue } from '../services/requestQueue';
import { isDebugModeEnabled, isDevelopmentEnv } from '../flags/debugMode';

/**
 * System configuration options
 */
export interface SystemConfig {
  /** Environment (development, staging, production) */
  environment: 'development' | 'staging' | 'production';
  
  /** Enable debug mode */
  debug?: boolean;
  
  /** Log level */
  logLevel?: LogLevel;
  
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
    moderateThreshold?: number;
    criticalThreshold?: number;
    onPressure?: (level: MemoryPressure) => void;
  };
  
  /** Request queue configuration */
  requestQueue?: {
    enabled?: boolean;
    concurrency?: number;
    maxQueueSize?: number;
  };
}

/**
 * System status
 */
export interface SystemStatus {
  initialized: boolean;
  environment: string;
  uptime: number;
  memory: {
    usedHeap: number;
    totalHeap: number;
    pressure: MemoryPressure;
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

/**
 * System manager class
 */
class SystemManager {
  private config: SystemConfig | null = null;
  private initTime: number = 0;
  private errorCount = 0;
  private hourlyErrors: number[] = [];
  private cleanupFns: Array<() => void> = [];
  private _initialized = false;

  /**
   * Check if system is initialized
   */
  get initialized(): boolean {
    return this._initialized;
  }

  /**
   * Initialize the system
   */
  initialize(config: SystemConfig): void {
    if (this._initialized) {
      logger.warn('[System] Already initialized, skipping');
      return;
    }

    this.config = config;
    this.initTime = Date.now();
    this._initialized = true;

    logger.info('[System] Initializing...', { environment: config.environment });

    // Configure logging
    this.setupLogging(config);

    // Setup error reporting
    this.setupErrorReporting(config);

    // Setup performance monitoring
    this.setupPerformanceMonitoring(config);

    // Setup memory monitoring
    this.setupMemoryMonitoring(config);

    // Setup request queue
    this.setupRequestQueue(config);

    // Setup global error handlers
    this.setupGlobalErrorHandlers();

    // Setup event handlers
    this.setupEventHandlers();

    logger.info('[System] Initialization complete');
  }

  /**
   * Configure logging
   */
  private setupLogging(config: SystemConfig): void {
    configureLogger({
      level: config.logLevel ?? (config.debug ? 'debug' : 'info'),
      console: true,
      timestamp: true,
      caller: config.debug,
    });
  }

  /**
   * Setup error reporting
   */
  private setupErrorReporting(config: SystemConfig): void {
    if (config.errorReporting?.enabled === false) {
      return;
    }

    ErrorReporter.init({
      dsn: config.errorReporting?.dsn,
      environment: config.environment,
      sampleRate: config.errorReporting?.sampleRate,
      beforeSend: (event) => {
        // Increment error counts
        this.errorCount++;
        this.hourlyErrors.push(Date.now());
        return event;
      },
    });

    logger.debug('[System] Error reporting configured');
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(config: SystemConfig): void {
    if (config.performance?.enabled === false) {
      return;
    }

    // Configure performance monitor
    if (config.performance?.reporter !== undefined) {
      performanceMonitor.dispose();
      // Create new instance with custom reporter would be done here
    }

    // Start web vitals collection
    if (config.performance?.collectWebVitals !== false) {
      webVitals.start();
      this.cleanupFns.push(() => webVitals.stop());

      // Report web vitals to performance monitor
      webVitals.subscribe((vitals) => {
        Object.entries(vitals).forEach(([name, value]) => {
          if (value !== undefined && typeof value === 'number') {
            performanceMonitor.gauge(`web_vitals.${name}`, value);
          }
        });
      });
    }

    // Start long task observation
    if (config.performance?.collectLongTasks !== false) {
      longTaskObserver.start();
      this.cleanupFns.push(() => longTaskObserver.stop());

      // Report long tasks
      longTaskObserver.subscribe((task) => {
        performanceMonitor.timing('long_task', task.duration, {
          attribution: task.attribution,
        });

        // Emit performance event if task is very long
        if (task.duration > 100) {
          globalEventBus.emitSync('performance:slowOperation', {
            operation: `long_task:${task.attribution}`,
            duration: task.duration,
          });
        }
      });
    }

    logger.debug('[System] Performance monitoring configured');
  }

  /**
   * Setup memory monitoring
   */
  private setupMemoryMonitoring(config: SystemConfig): void {
    if (config.memory?.enabled === false) {
      return;
    }

    // Configure and start memory monitoring
    const {monitor} = memoryManager;
    
    if (config.memory?.onPressure) {
      const unsubscribe = monitor.onPressureChange(config.memory.onPressure);
      this.cleanupFns.push(unsubscribe);
    }

    // Default pressure handler
    const unsubscribe = monitor.onPressureChange((pressure) => {
      if (pressure !== 'none') {
        globalEventBus.emitSync('performance:memoryPressure', {
          level: pressure,
        });

        if (pressure === 'critical') {
          logger.warn('[System] Critical memory pressure detected');
          // Trigger emergency cleanup
          this.emergencyCleanup();
        }
      }
    });
    this.cleanupFns.push(unsubscribe);

    memoryManager.startMonitoring();
    this.cleanupFns.push(() => memoryManager.stopMonitoring());

    logger.debug('[System] Memory monitoring configured');
  }

  /**
   * Setup request queue
   */
  private setupRequestQueue(config: SystemConfig): void {
    if (config.requestQueue?.enabled === false) {
      return;
    }

    // The global request queue is already initialized
    // Additional configuration could be done here if needed

    logger.debug('[System] Request queue configured');
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    // Unhandled promise rejections
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      ErrorReporter.reportError(event.reason, {
        action: 'unhandled_rejection',
      });

      globalEventBus.emitSync('error:global', {
        error: event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason)),
        context: 'unhandled_rejection',
      });
    };

    window.addEventListener('unhandledrejection', onUnhandledRejection);
    this.cleanupFns.push(() =>
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    );

    // Global errors
    const onError = (event: ErrorEvent) => {
      ErrorReporter.reportError(event.error ?? event.message, {
        action: 'global_error',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });

      globalEventBus.emitSync('error:global', {
        error: event.error ?? new Error(event.message),
        context: 'global_error',
      });
    };

    window.addEventListener('error', onError);
    this.cleanupFns.push(() => window.removeEventListener('error', onError));

    logger.debug('[System] Global error handlers configured');
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Handle auth events
    const authLogout = globalEventBus.on('auth:logout', ({ reason }) => {
      logger.info('[System] User logged out', { reason });
      // Clear sensitive data
      this.clearSensitiveData();
    });
    this.cleanupFns.push(authLogout);

    const authSessionExpired = globalEventBus.on('auth:sessionExpired', ({ userId }) => {
      logger.warn('[System] Session expired', { userId });
    });
    this.cleanupFns.push(authSessionExpired);

    // Handle data invalidation
    const dataInvalidate = globalEventBus.on('data:invalidate', ({ keys }) => {
      logger.debug('[System] Data invalidated', { keys });
    });
    this.cleanupFns.push(dataInvalidate);

    logger.debug('[System] Event handlers configured');
  }

  /**
   * Emergency cleanup when memory pressure is critical
   */
  private emergencyCleanup(): void {
    logger.warn('[System] Running emergency cleanup');

    // Clear caches
    globalRequestQueue.clear();

    // Suggest GC
    memoryManager.monitor.suggestGC();

    // Emit notification
    globalEventBus.emitSync('ui:notification', {
      type: 'warning',
      message: 'Memory usage is high. Some data may be cleared.',
    });
  }

  /**
   * Clear sensitive data
   */
  private clearSensitiveData(): void {
    // Clear request queue
    globalRequestQueue.clear();

    logger.debug('[System] Sensitive data cleared');
  }

  /**
   * Get system status
   */
  getStatus(): SystemStatus {
    const memoryInfo = memoryManager.monitor.getMemoryInfo();
    const queueStats = globalRequestQueue.getStats();
    const vitals = webVitals.getVitals();
    const longTaskStats = longTaskObserver.getStats();

    // Clean hourly errors
    const hourAgo = Date.now() - 3600000;
    this.hourlyErrors = this.hourlyErrors.filter((t) => t > hourAgo);

    return {
      initialized: this._initialized,
      environment: this.config?.environment ?? 'unknown',
      uptime: Date.now() - this.initTime,
      memory: memoryInfo
        ? {
            usedHeap: memoryInfo.usedHeap,
            totalHeap: memoryInfo.totalHeap,
            pressure: memoryInfo.pressure,
          }
        : null,
      performance: {
        webVitals: vitals as Record<string, number>,
        longTaskCount: longTaskStats.count,
      },
      requestQueue: {
        queued: queueStats.queued,
        processing: queueStats.processing,
      },
      errors: {
        total: this.errorCount,
        lastHour: this.hourlyErrors.length,
      },
    };
  }

  /**
   * Shutdown the system
   */
  shutdown(): void {
    logger.info('[System] Shutting down...');

    // Run cleanup functions
    for (const cleanup of this.cleanupFns) {
      try {
        cleanup();
      } catch (error) {
        logger.error('[System] Cleanup error', { error });
      }
    }
    this.cleanupFns = [];

    // Dispose memory manager
    memoryManager.dispose();

    // Dispose performance monitor
    performanceMonitor.dispose();

    // Clear request queue
    globalRequestQueue.clear();

    this._initialized = false;
    this.config = null;

    logger.info('[System] Shutdown complete');
  }

  /**
   * Health check
   */
  healthCheck(): {
    healthy: boolean;
    checks: Record<string, { status: 'pass' | 'warn' | 'fail'; message?: string }>;
  } {
    const checks: Record<string, { status: 'pass' | 'warn' | 'fail'; message?: string }> = {};

    // Check initialization
    checks.initialized = {
      status: this._initialized ? 'pass' : 'fail',
      message: this._initialized ? undefined : 'System not initialized',
    };

    // Check memory
    const memoryInfo = memoryManager.monitor.getMemoryInfo();
    if (memoryInfo) {
      checks.memory = {
        status:
          memoryInfo.pressure === 'none'
            ? 'pass'
            : memoryInfo.pressure === 'moderate'
            ? 'warn'
            : 'fail',
        message:
          memoryInfo.pressure !== 'none'
            ? `Memory pressure: ${memoryInfo.pressure}`
            : undefined,
      };
    }

    // Check error rate
    const hourlyErrorRate = this.hourlyErrors.length;
    checks.errorRate = {
      status: hourlyErrorRate < 10 ? 'pass' : hourlyErrorRate < 50 ? 'warn' : 'fail',
      message: hourlyErrorRate >= 10 ? `${hourlyErrorRate} errors in last hour` : undefined,
    };

    // Check request queue
    const queueStats = globalRequestQueue.getStats();
    checks.requestQueue = {
      status: queueStats.queued < 50 ? 'pass' : queueStats.queued < 100 ? 'warn' : 'fail',
      message: queueStats.queued >= 50 ? `${queueStats.queued} requests queued` : undefined,
    };

    const healthy = Object.values(checks).every((c) => c.status !== 'fail');

    return { healthy, checks };
  }
}

/**
 * Global system manager instance
 */
export const systemManager = new SystemManager();

/**
 * Initialize the system with default configuration
 */
export function initializeSystem(config: SystemConfig): void {
  systemManager.initialize(config);
}

/**
 * Get system status
 */
export function getSystemStatus(): SystemStatus {
  return systemManager.getStatus();
}

/**
 * Perform system health check
 */
export function systemHealthCheck(): ReturnType<SystemManager['healthCheck']> {
  return systemManager.healthCheck();
}

/**
 * Shutdown the system
 */
export function shutdownSystem(): void {
  systemManager.shutdown();
}

/**
 * Default system configuration
 * Uses feature flag utilities for debug mode detection
 */
export const defaultSystemConfig: SystemConfig = {
  environment: process.env['NODE_ENV'] === 'production'
    ? 'production'
    : process.env['NODE_ENV'] === 'test'
    ? 'staging'
    : 'development',
  debug: isDebugModeEnabled(),
  logLevel: isDebugModeEnabled() ? 'debug' : 'info',
  errorReporting: {
    enabled: true,
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
  requestQueue: {
    enabled: true,
    concurrency: 5,
    maxQueueSize: 100,
  },
};
