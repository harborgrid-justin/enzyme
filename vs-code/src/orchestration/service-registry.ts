/**
 * ServiceRegistry - Manages service registration, lifecycle, and health
 */

import * as vscode from 'vscode';
import { EventBus } from './event-bus';

/**
 * Service health status
 */
export enum ServiceHealth {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

/**
 * Service state
 */
export enum ServiceState {
  STOPPED = 'stopped',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  FAILED = 'failed',
}

/**
 * Service metadata
 */
export interface ServiceMetadata {
  name: string;
  version: string;
  description?: string;
  dependencies?: string[];
  tags?: string[];
}

/**
 * Service metrics
 */
export interface ServiceMetrics {
  startCount: number;
  stopCount: number;
  restartCount: number;
  errorCount: number;
  lastStartTime?: number;
  lastStopTime?: number;
  lastErrorTime?: number;
  uptime: number;
}

/**
 * Service interface
 */
export interface IService {
  start(): Promise<void>;
  stop(): Promise<void>;
  restart?(): Promise<void>;
  healthCheck?(): Promise<ServiceHealth>;
  getMetrics?(): ServiceMetrics;
}

/**
 * Service registration
 */
export interface ServiceRegistration {
  metadata: ServiceMetadata;
  service: IService;
  state: ServiceState;
  health: ServiceHealth;
  metrics: ServiceMetrics;
}

/**
 * ServiceRegistry - Registry for managing services
 */
export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services: Map<string, ServiceRegistration> = new Map();
  private eventBus: EventBus;
  private eventEmitter: vscode.EventEmitter<{ name: string; state: ServiceState }>;

  private constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.eventEmitter = new vscode.EventEmitter();
  }

  /**
   * Create the service registry
   */
  public static create(eventBus: EventBus): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry(eventBus);
    }
    return ServiceRegistry.instance;
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      throw new Error('ServiceRegistry not created. Call create() first.');
    }
    return ServiceRegistry.instance;
  }

  /**
   * Register a service
   */
  public register(metadata: ServiceMetadata, service: IService): void {
    const registration: ServiceRegistration = {
      metadata,
      service,
      state: ServiceState.STOPPED,
      health: ServiceHealth.UNKNOWN,
      metrics: {
        startCount: 0,
        stopCount: 0,
        restartCount: 0,
        errorCount: 0,
        uptime: 0,
      },
    };

    this.services.set(metadata.name, registration);
  }

  /**
   * Unregister a service
   */
  public async unregister(name: string): Promise<void> {
    const registration = this.services.get(name);
    if (!registration) {
      return;
    }

    if (registration.state === ServiceState.RUNNING) {
      await this.stop(name);
    }

    this.services.delete(name);
  }

  /**
   * Start a service
   */
  public async start(name: string): Promise<void> {
    const registration = this.services.get(name);
    if (!registration) {
      throw new Error(`Service not found: ${name}`);
    }

    if (registration.state === ServiceState.RUNNING) {
      return;
    }

    try {
      // Check dependencies
      if (registration.metadata.dependencies) {
        for (const dep of registration.metadata.dependencies) {
          const depReg = this.services.get(dep);
          if (!depReg || depReg.state !== ServiceState.RUNNING) {
            throw new Error(`Dependency not running: ${dep}`);
          }
        }
      }

      this.setState(name, ServiceState.STARTING);
      registration.metrics.lastStartTime = Date.now();

      await registration.service.start();

      registration.metrics.startCount++;
      this.setState(name, ServiceState.RUNNING);

      // Perform health check
      await this.checkHealth(name);

    } catch (error) {
      registration.metrics.errorCount++;
      registration.metrics.lastErrorTime = Date.now();
      this.setState(name, ServiceState.FAILED);
      throw error;
    }
  }

  /**
   * Stop a service
   */
  public async stop(name: string): Promise<void> {
    const registration = this.services.get(name);
    if (!registration) {
      throw new Error(`Service not found: ${name}`);
    }

    if (registration.state !== ServiceState.RUNNING) {
      return;
    }

    try {
      this.setState(name, ServiceState.STOPPING);
      registration.metrics.lastStopTime = Date.now();

      // Update uptime
      if (registration.metrics.lastStartTime) {
        registration.metrics.uptime += Date.now() - registration.metrics.lastStartTime;
      }

      await registration.service.stop();

      registration.metrics.stopCount++;
      this.setState(name, ServiceState.STOPPED);

    } catch (error) {
      registration.metrics.errorCount++;
      registration.metrics.lastErrorTime = Date.now();
      this.setState(name, ServiceState.FAILED);
      throw error;
    }
  }

  /**
   * Restart a service
   */
  public async restart(name: string): Promise<void> {
    const registration = this.services.get(name);
    if (!registration) {
      throw new Error(`Service not found: ${name}`);
    }

    if (registration.service.restart) {
      try {
        this.setState(name, ServiceState.STOPPING);
        await registration.service.restart();
        registration.metrics.restartCount++;
        this.setState(name, ServiceState.RUNNING);
        await this.checkHealth(name);
      } catch (error) {
        registration.metrics.errorCount++;
        registration.metrics.lastErrorTime = Date.now();
        this.setState(name, ServiceState.FAILED);
        throw error;
      }
    } else {
      await this.stop(name);
      await this.start(name);
      registration.metrics.restartCount++;
    }
  }

  /**
   * Check service health
   */
  public async checkHealth(name: string): Promise<ServiceHealth> {
    const registration = this.services.get(name);
    if (!registration) {
      return ServiceHealth.UNKNOWN;
    }

    try {
      if (registration.service.healthCheck) {
        registration.health = await registration.service.healthCheck();
      } else {
        // Default health check based on state
        registration.health = registration.state === ServiceState.RUNNING
          ? ServiceHealth.HEALTHY
          : ServiceHealth.UNHEALTHY;
      }
    } catch (error) {
      registration.health = ServiceHealth.UNHEALTHY;
    }

    return registration.health;
  }

  /**
   * Get service state
   */
  public getState(name: string): ServiceState | undefined {
    return this.services.get(name)?.state;
  }

  /**
   * Get service health
   */
  public getHealth(name: string): ServiceHealth | undefined {
    return this.services.get(name)?.health;
  }

  /**
   * Get service metrics
   */
  public getMetrics(name: string): ServiceMetrics | undefined {
    const registration = this.services.get(name);
    if (!registration) {
      return undefined;
    }

    if (registration.service.getMetrics) {
      return registration.service.getMetrics();
    }

    return registration.metrics;
  }

  /**
   * Get service registration
   */
  public getRegistration(name: string): ServiceRegistration | undefined {
    return this.services.get(name);
  }

  /**
   * Get all service names
   */
  public getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Get all services
   */
  public getAllServices(): Map<string, ServiceRegistration> {
    return new Map(this.services);
  }

  /**
   * Start all services
   */
  public async startAll(): Promise<void> {
    const sorted = this.topologicalSort();
    for (const name of sorted) {
      await this.start(name);
    }
  }

  /**
   * Stop all services
   */
  public async stopAll(): Promise<void> {
    const sorted = this.topologicalSort().reverse();
    for (const name of sorted) {
      await this.stop(name);
    }
  }

  /**
   * Topological sort for dependency resolution
   */
  private topologicalSort(): string[] {
    const sorted: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (name: string) => {
      if (visited.has(name)) {
        return;
      }

      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected: ${name}`);
      }

      visiting.add(name);

      const registration = this.services.get(name);
      if (registration?.metadata.dependencies) {
        for (const dep of registration.metadata.dependencies) {
          visit(dep);
        }
      }

      visiting.delete(name);
      visited.add(name);
      sorted.push(name);
    };

    for (const name of this.services.keys()) {
      visit(name);
    }

    return sorted;
  }

  /**
   * Set service state
   */
  private setState(name: string, state: ServiceState): void {
    const registration = this.services.get(name);
    if (registration) {
      registration.state = state;
      this.eventEmitter.fire({ name, state });
    }
  }

  /**
   * Subscribe to state changes
   */
  public onStateChange(
    listener: (event: { name: string; state: ServiceState }) => void
  ): vscode.Disposable {
    return this.eventEmitter.event(listener);
  }

  /**
   * Dispose the registry
   */
  public async dispose(): Promise<void> {
    await this.stopAll();
    this.services.clear();
    this.eventEmitter.dispose();
  }
}
