/**
 * HealthMonitor - Monitors extension health and performs automatic recovery
 */

import * as vscode from 'vscode';
import { EventBus } from './event-bus';
import { LoggerService } from '../services/logger-service';
import { ServiceRegistry, ServiceHealth } from './service-registry';
import { ProviderRegistry } from './provider-registry';

/**
 * Health check result
 */
export interface HealthCheckResult {
  healthy: boolean;
  checks: Map<string, boolean>;
  errors: Error[];
  timestamp: number;
}

/**
 * Health metrics
 */
export interface HealthMetrics {
  memoryUsage: number;
  cpuUsage: number;
  errorRate: number;
  lastHealthCheck?: number;
  uptime: number;
}

/**
 * HealthMonitor - Monitors system health
 */
export class HealthMonitor {
  private static instance: HealthMonitor;
  private eventBus: EventBus;
  private logger: LoggerService;
  private serviceRegistry?: ServiceRegistry;
  private providerRegistry?: ProviderRegistry;
  private healthCheckInterval?: NodeJS.Timeout;
  private checkIntervalMs: number = 60000; // 1 minute
  private metrics: HealthMetrics;
  private startTime: number;
  private errorCount: number = 0;
  private totalChecks: number = 0;

  private constructor(eventBus: EventBus, logger: LoggerService) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.startTime = Date.now();
    this.metrics = {
      memoryUsage: 0,
      cpuUsage: 0,
      errorRate: 0,
      uptime: 0,
    };
  }

  /**
   * Create the health monitor
   */
  public static create(eventBus: EventBus, logger: LoggerService): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor(eventBus, logger);
    }
    return HealthMonitor.instance;
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      throw new Error('HealthMonitor not created. Call create() first.');
    }
    return HealthMonitor.instance;
  }

  /**
   * Set service registry
   */
  public setServiceRegistry(registry: ServiceRegistry): void {
    this.serviceRegistry = registry;
  }

  /**
   * Set provider registry
   */
  public setProviderRegistry(registry: ProviderRegistry): void {
    this.providerRegistry = registry;
  }

  /**
   * Start health monitoring
   */
  public start(): void {
    if (this.healthCheckInterval) {
      this.logger.warn('Health monitoring already started');
      return;
    }

    this.logger.info('Starting health monitoring');

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.checkIntervalMs);

    // Perform initial health check
    this.performHealthCheck();
  }

  /**
   * Stop health monitoring
   */
  public stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      this.logger.info('Health monitoring stopped');
    }
  }

  /**
   * Perform health check
   */
  public async performHealthCheck(): Promise<HealthCheckResult> {
    this.totalChecks++;
    const checks = new Map<string, boolean>();
    const errors: Error[] = [];
    let healthy = true;

    try {
      // Check services
      if (this.serviceRegistry) {
        const serviceNames = this.serviceRegistry.getServiceNames();
        for (const name of serviceNames) {
          try {
            const health = await this.serviceRegistry.checkHealth(name);
            const isHealthy = health === ServiceHealth.HEALTHY || health === ServiceHealth.DEGRADED;
            checks.set(`service:${name}`, isHealthy);
            if (!isHealthy) {
              healthy = false;
            }
          } catch (error) {
            checks.set(`service:${name}`, false);
            errors.push(error as Error);
            healthy = false;
          }
        }
      }

      // Check providers
      if (this.providerRegistry) {
        const stats = this.providerRegistry.getStatistics();
        checks.set('providers:enabled', stats.enabled > 0);
        checks.set('providers:errors', stats.errors === 0);

        if (stats.errors > 0) {
          healthy = false;
        }
      }

      // Update metrics
      this.updateMetrics();

      // Check memory usage
      const memoryCheck = this.metrics.memoryUsage < 500 * 1024 * 1024; // 500MB
      checks.set('memory:usage', memoryCheck);
      if (!memoryCheck) {
        healthy = false;
        this.logger.warn('High memory usage detected', {
          usage: this.metrics.memoryUsage,
        });
      }

      // Check error rate
      const errorRateCheck = this.metrics.errorRate < 0.1; // Less than 10% errors
      checks.set('errors:rate', errorRateCheck);
      if (!errorRateCheck) {
        healthy = false;
        this.logger.warn('High error rate detected', {
          rate: this.metrics.errorRate,
        });
      }

      const result: HealthCheckResult = {
        healthy,
        checks,
        errors,
        timestamp: Date.now(),
      };

      this.metrics.lastHealthCheck = result.timestamp;

      if (!healthy) {
        this.logger.warn('Health check failed', {
          failedChecks: Array.from(checks.entries())
            .filter(([_, passed]) => !passed)
            .map(([check]) => check),
        });

        // Attempt recovery if unhealthy
        await this.attemptRecovery(result);
      } else {
        this.logger.debug('Health check passed');
      }

      return result;

    } catch (error) {
      this.errorCount++;
      this.logger.error('Health check error', error);

      return {
        healthy: false,
        checks,
        errors: [error as Error],
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    // Update memory usage
    if (process.memoryUsage) {
      const usage = process.memoryUsage();
      this.metrics.memoryUsage = usage.heapUsed;
    }

    // Update error rate
    this.metrics.errorRate = this.totalChecks > 0 ? this.errorCount / this.totalChecks : 0;

    // Update uptime
    this.metrics.uptime = Date.now() - this.startTime;
  }

  /**
   * Attempt automatic recovery
   */
  private async attemptRecovery(result: HealthCheckResult): Promise<void> {
    this.logger.info('Attempting automatic recovery');

    // Restart failed services
    if (this.serviceRegistry) {
      for (const [check, passed] of result.checks) {
        if (!passed && check.startsWith('service:')) {
          const serviceName = check.replace('service:', '');
          try {
            this.logger.info(`Restarting service: ${serviceName}`);
            await this.serviceRegistry.restart(serviceName);
          } catch (error) {
            this.logger.error(`Failed to restart service: ${serviceName}`, error);
          }
        }
      }
    }

    // If memory is too high, suggest garbage collection
    if (!result.checks.get('memory:usage')) {
      if (global.gc) {
        this.logger.info('Triggering garbage collection');
        global.gc();
      }
    }
  }

  /**
   * Get current metrics
   */
  public getMetrics(): HealthMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get health dashboard data
   */
  public getDashboardData(): {
    healthy: boolean;
    metrics: HealthMetrics;
    services: Array<{ name: string; health: ServiceHealth }>;
    providers: {
      total: number;
      enabled: number;
      disabled: number;
      errors: number;
    };
  } {
    const services: Array<{ name: string; health: ServiceHealth }> = [];

    if (this.serviceRegistry) {
      const serviceNames = this.serviceRegistry.getServiceNames();
      for (const name of serviceNames) {
        const health = this.serviceRegistry.getHealth(name) || ServiceHealth.UNKNOWN;
        services.push({ name, health });
      }
    }

    const providers = this.providerRegistry?.getStatistics() || {
      total: 0,
      enabled: 0,
      disabled: 0,
      errors: 0,
      byType: {},
    };

    const healthy = this.metrics.errorRate < 0.1 && this.metrics.memoryUsage < 500 * 1024 * 1024;

    return {
      healthy,
      metrics: this.getMetrics(),
      services,
      providers: {
        total: providers.total,
        enabled: providers.enabled,
        disabled: providers.disabled,
        errors: providers.errors,
      },
    };
  }

  /**
   * Record error
   */
  public recordError(): void {
    this.errorCount++;
  }

  /**
   * Reset error count
   */
  public resetErrorCount(): void {
    this.errorCount = 0;
  }

  /**
   * Dispose the monitor
   */
  public dispose(): void {
    this.stop();
  }
}
