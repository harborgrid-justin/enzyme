/**
 * @file Dependency Injection Container
 * @module coordination/dependency-injector
 * @description PhD-level IoC container with lifecycle management and type safety.
 *
 * Implements a sophisticated dependency injection system with:
 * - Type-safe service registration and resolution
 * - Singleton, scoped, and transient lifetimes
 * - Factory functions with dependency injection
 * - Hierarchical containers with inheritance
 * - Lifecycle ordering for initialization
 * - Circular dependency detection
 * - Lazy instantiation
 *
 * @author Agent 5 - PhD TypeScript Architect
 * @version 1.0.0
 */

import {
  type ServiceId,
  type ServiceLifecycle,
  type ServiceContract,
  type ServiceRegistrationOptions,
  type ServiceFactory,
  type DependencyContainer,
  createServiceId,
} from './types';

// ============================================================================
// Internal Types
// ============================================================================

/**
 * Internal service entry with resolution metadata.
 */
interface ServiceEntry<T = unknown> {
  /** Service contract */
  contract: ServiceContract<T>;
  /** Implementation or factory */
  implementation: T | ServiceFactory<T>;
  /** Registration options */
  options: ServiceRegistrationOptions;
  /** Whether implementation is a factory */
  isFactory: boolean;
  /** Resolved singleton instance */
  instance?: T;
  /** Whether currently resolving (for circular detection) */
  isResolving: boolean;
  /** Resolution order for lifecycle management */
  resolutionOrder: number;
}

/**
 * Resolution context for tracking dependencies.
 */
interface ResolutionContext {
  /** Services currently being resolved */
  resolving: Set<ServiceId>;
  /** Scoped instances for this resolution */
  scopedInstances: Map<ServiceId, unknown>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Lifecycle phase order for initialization.
 */
const LIFECYCLE_ORDER: Record<ServiceLifecycle, number> = {
  bootstrap: 0,
  core: 1,
  feature: 2,
  ui: 3,
  lazy: 4,
};

/**
 * Sorts services by lifecycle phase.
 */
function sortByLifecycle(a: ServiceEntry, b: ServiceEntry): number {
  const aOrder = LIFECYCLE_ORDER[a.options.lifecycle ?? 'feature'];
  const bOrder = LIFECYCLE_ORDER[b.options.lifecycle ?? 'feature'];
  return aOrder - bOrder;
}

// ============================================================================
// DependencyInjectorImpl Class
// ============================================================================

/**
 * Implementation of the dependency injection container.
 *
 * @example
 * ```typescript
 * // Define a service contract
 * const LoggerContract = createServiceContract<Logger>('logger');
 *
 * // Create container and register
 * const container = new DependencyInjectorImpl();
 * container.register(LoggerContract, new ConsoleLogger());
 *
 * // Resolve service
 * const logger = container.resolve(LoggerContract);
 * logger.info('Hello, world!');
 * ```
 *
 * @example With factories
 * ```typescript
 * // Register a factory
 * container.register(
 *   DatabaseContract,
 *   (c) => new Database(c.resolve(ConfigContract)),
 *   { scope: 'singleton', lifecycle: 'bootstrap' }
 * );
 * ```
 */
export class DependencyInjectorImpl implements DependencyContainer {
  /** Service registry */
  private readonly services: Map<ServiceId, ServiceEntry> = new Map();

  /** Parent container for hierarchical resolution */
  private readonly parent: DependencyInjectorImpl | null;

  /** Resolution counter for ordering */
  private resolutionCounter = 0;

  /** Disposed flag */
  private disposed = false;

  /**
   * Creates a new dependency injector.
   * @param parent - Optional parent container
   */
  constructor(parent: DependencyInjectorImpl | null = null) {
    this.parent = parent;
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Registers a service implementation.
   * @template T - Service type
   * @param contract - Service contract
   * @param implementation - Implementation or factory
   * @param options - Registration options
   */
  register<T>(
    contract: ServiceContract<T>,
    implementation: T | ServiceFactory<T>,
    options: ServiceRegistrationOptions = {}
  ): void {
    this.ensureNotDisposed();

    const isFactory = typeof implementation === 'function';

    // Check for conditional registration
    if (options.condition && !options.condition()) {
      return;
    }

    // Validate dependencies exist if specified
    if (options.dependencies) {
      for (const depId of options.dependencies) {
        if (!this.hasById(depId)) {
          console.warn(
            `[DI] Service ${contract.name} depends on unregistered service: ${depId}`
          );
        }
      }
    }

    const entry: ServiceEntry<T> = {
      contract,
      implementation,
      options: {
        scope: 'singleton',
        lifecycle: 'feature',
        ...options,
      },
      isFactory,
      isResolving: false,
      resolutionOrder: -1,
    };

    this.services.set(contract.id, entry as ServiceEntry);
  }

  /**
   * Registers a factory function.
   * @template T - Service type
   * @param contract - Service contract
   * @param factory - Factory function
   * @param options - Registration options
   */
  registerFactory<T>(
    contract: ServiceContract<T>,
    factory: ServiceFactory<T>,
    options: ServiceRegistrationOptions = {}
  ): void {
    this.register(contract, factory, options);
  }

  /**
   * Resolves a service.
   * @template T - Service type
   * @param contract - Service contract
   * @returns Resolved service instance
   * @throws Error if service not found or circular dependency detected
   */
  resolve<T>(contract: ServiceContract<T>): T {
    return this.resolveWithContext(contract, {
      resolving: new Set(),
      scopedInstances: new Map(),
    });
  }

  /**
   * Tries to resolve a service, returning undefined if not found.
   * @template T - Service type
   * @param contract - Service contract
   * @returns Resolved service or undefined
   */
  tryResolve<T>(contract: ServiceContract<T>): T | undefined {
    try {
      return this.resolve(contract);
    } catch {
      return contract.defaultValue;
    }
  }

  /**
   * Checks if a service is registered.
   * @param contract - Service contract
   * @returns True if registered
   */
  has(contract: ServiceContract<unknown>): boolean {
    return this.hasById(contract.id);
  }

  /**
   * Checks if a service ID is registered.
   * @param id - Service ID
   * @returns True if registered
   */
  hasById(id: ServiceId): boolean {
    if (this.services.has(id)) return true;
    if (this.parent) return this.parent.hasById(id);
    return false;
  }

  /**
   * Unregisters a service.
   * @param contract - Service contract
   * @returns True if service was unregistered
   */
  unregister(contract: ServiceContract<unknown>): boolean {
    this.ensureNotDisposed();
    return this.services.delete(contract.id);
  }

  /**
   * Gets all services with a specific tag.
   * @template T - Service type
   * @param tag - Tag to search for
   * @returns Array of matching services
   */
  getByTag<T>(tag: string): T[] {
    const results: T[] = [];
    const context: ResolutionContext = {
      resolving: new Set(),
      scopedInstances: new Map(),
    };

    for (const entry of this.services.values()) {
      if (entry.options.tags?.includes(tag) === true) {
        try {
          const instance = this.resolveEntry(entry, context);
          results.push(instance as T);
        } catch {
          // Skip services that fail to resolve
        }
      }
    }

    // Include parent services
    if (this.parent) {
      results.push(...this.parent.getByTag<T>(tag));
    }

    return results;
  }

  /**
   * Gets all registered service contracts.
   * @returns Array of service contracts
   */
  getRegisteredContracts(): ServiceContract<unknown>[] {
    const contracts: ServiceContract<unknown>[] = [];
    for (const entry of this.services.values()) {
      contracts.push(entry.contract);
    }
    return contracts;
  }

  /**
   * Gets services by lifecycle phase.
   * @param lifecycle - Lifecycle phase
   * @returns Array of service contracts
   */
  getByLifecycle(lifecycle: ServiceLifecycle): ServiceContract<unknown>[] {
    const contracts: ServiceContract<unknown>[] = [];
    for (const entry of this.services.values()) {
      if (entry.options.lifecycle === lifecycle) {
        contracts.push(entry.contract);
      }
    }
    return contracts;
  }

  /**
   * Creates a child container.
   * @returns Child container
   */
  createChild(): DependencyContainer {
    return new DependencyInjectorImpl(this);
  }

  /**
   * Creates a scoped container for request-scoped services.
   * @returns Scoped container
   */
  createScope(): DependencyContainer {
    return new DependencyInjectorImpl(this);
  }

  /**
   * Initializes all services in lifecycle order.
   * @returns Promise that resolves when all services are initialized
   */
  async initializeAll(): Promise<void> {
    this.ensureNotDisposed();

    // Sort services by lifecycle
    const entries = Array.from(this.services.values()).sort(sortByLifecycle);

    const context: ResolutionContext = {
      resolving: new Set(),
      scopedInstances: new Map(),
    };

    // Initialize in order
    for (const entry of entries) {
      if (entry.options.scope === 'singleton' && entry.instance == null) {
        await this.resolveEntryAsync(entry, context);
      }
    }
  }

  /**
   * Disposes the container and all disposable services.
   */
  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;

    // Get all singleton instances in reverse resolution order
    const entries = Array.from(this.services.values())
      .filter((e) => e.instance !== undefined)
      .sort((a, b) => b.resolutionOrder - a.resolutionOrder);

    // Dispose in reverse order
    for (const entry of entries) {
      const instance = entry.instance as { dispose?: () => void | Promise<void> };
      if (instance != null && typeof instance.dispose === 'function') {
        try {
          await instance.dispose();
        } catch (error) {
          console.error(`[DI] Error disposing service ${entry.contract.name}:`, error);
        }
      }
    }

    this.services.clear();
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Ensures container is not disposed.
   */
  private ensureNotDisposed(): void {
    if (this.disposed) {
      throw new Error('Container has been disposed');
    }
  }

  /**
   * Resolves a service with context.
   * @template T - Service type
   * @param contract - Service contract
   * @param context - Resolution context
   * @returns Resolved service
   */
  private resolveWithContext<T>(
    contract: ServiceContract<T>,
    context: ResolutionContext
  ): T {
    this.ensureNotDisposed();

    // Check for existing scoped instance
    if (context.scopedInstances.has(contract.id)) {
      return context.scopedInstances.get(contract.id) as T;
    }

    // Find service entry
    const entry = this.services.get(contract.id) as ServiceEntry<T> | undefined;

    if (!entry) {
      // Try parent container
      if (this.parent) {
        return this.parent.resolveWithContext(contract, context);
      }

      // Check for default value
      if (contract.defaultValue !== undefined) {
        return contract.defaultValue;
      }

      throw new Error(
        `Service not registered: ${contract.name} (${String(contract.id)})`
      );
    }

    return this.resolveEntry(entry, context);
  }

  /**
   * Resolves a service entry.
   * @template T - Service type
   * @param entry - Service entry
   * @param context - Resolution context
   * @returns Resolved service
   */
  private resolveEntry<T>(entry: ServiceEntry<T>, context: ResolutionContext): T {
    // Return existing singleton
    if (entry.options.scope === 'singleton' && entry.instance !== undefined) {
      return entry.instance;
    }

    // Detect circular dependency
    if (context.resolving.has(entry.contract.id)) {
      throw new Error(
        `Circular dependency detected for service: ${entry.contract.name}`
      );
    }

    // Mark as resolving
    context.resolving.add(entry.contract.id);
    entry.isResolving = true;

    try {
      let instance: T;

      if (entry.isFactory) {
        // Resolve via factory
        const factory = entry.implementation as ServiceFactory<T>;
        const result = factory(this);

        // Handle async factories
        if (result instanceof Promise) {
          throw new Error(
            `Async factory used in sync resolve for: ${entry.contract.name}. Use resolveAsync instead.`
          );
        }

        instance = result;
      } else {
        // Direct implementation
        instance = entry.implementation as T;
      }

      // Store based on scope
      switch (entry.options.scope) {
        case 'singleton':
          entry.instance = instance;
          entry.resolutionOrder = this.resolutionCounter++;
          break;
        case 'scoped':
          context.scopedInstances.set(entry.contract.id, instance);
          break;
        case 'transient':
        default:
          // No caching for transient
          break;
      }

      return instance;
    } finally {
      context.resolving.delete(entry.contract.id);
      entry.isResolving = false;
    }
  }

  /**
   * Resolves a service entry asynchronously.
   * @template T - Service type
   * @param entry - Service entry
   * @param context - Resolution context
   * @returns Promise resolving to service
   */
  private async resolveEntryAsync<T>(
    entry: ServiceEntry<T>,
    context: ResolutionContext
  ): Promise<T> {
    // Return existing singleton
    if (entry.options.scope === 'singleton' && entry.instance !== undefined) {
      return entry.instance;
    }

    // Detect circular dependency
    if (context.resolving.has(entry.contract.id)) {
      throw new Error(
        `Circular dependency detected for service: ${entry.contract.name}`
      );
    }

    // Mark as resolving
    context.resolving.add(entry.contract.id);
    entry.isResolving = true;

    try {
      let instance: T;

      if (entry.isFactory) {
        // Resolve via factory
        const factory = entry.implementation as ServiceFactory<T>;
        instance = await factory(this);
      } else {
        // Direct implementation
        instance = entry.implementation as T;
      }

      // Store based on scope
      switch (entry.options.scope) {
        case 'singleton':
          entry.instance = instance;
          entry.resolutionOrder = this.resolutionCounter++;
          break;
        case 'scoped':
          context.scopedInstances.set(entry.contract.id, instance);
          break;
        case 'transient':
        default:
          // No caching for transient
          break;
      }

      return instance;
    } finally {
      context.resolving.delete(entry.contract.id);
      entry.isResolving = false;
    }
  }
}

// ============================================================================
// Service Contract Factory
// ============================================================================

/**
 * Creates a typed service contract.
 * @template T - Service interface type
 * @param name - Service name
 * @param defaultValue - Optional default implementation
 * @param lifecycle - Service lifecycle phase
 * @returns Service contract
 *
 * @example
 * ```typescript
 * interface Logger {
 *   info(message: string): void;
 *   error(message: string, error?: Error): void;
 * }
 *
 * const LoggerContract = createServiceContract<Logger>('logger', {
 *   info: (msg) => console.log(msg),
 *   error: (msg, err) => console.error(msg, err),
 * });
 * ```
 */
export function createServiceContract<T>(
  name: string,
  defaultValue?: T,
  lifecycle?: ServiceLifecycle
): ServiceContract<T> {
  return {
    id: createServiceId(name),
    name,
    version: '1.0.0',
    defaultValue,
    lifecycle,
  };
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Global dependency injection container.
 */
let globalContainer: DependencyInjectorImpl | null = null;

/**
 * Gets the global dependency container.
 * @returns Global container instance
 */
export function getGlobalContainer(): DependencyInjectorImpl {
  globalContainer ??= new DependencyInjectorImpl();
  return globalContainer;
}

/**
 * Sets the global dependency container.
 * @param container - Container instance
 */
export function setGlobalContainer(container: DependencyInjectorImpl): void {
  if (globalContainer) {
    void globalContainer.dispose().catch(console.error);
  }
  globalContainer = container;
}

/**
 * Resets the global dependency container.
 */
export function resetGlobalContainer(): void {
  if (globalContainer) {
    void globalContainer.dispose().catch(console.error);
    globalContainer = null;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Registers a service in the global container.
 */
export function registerService<T>(
  contract: ServiceContract<T>,
  implementation: T | ServiceFactory<T>,
  options?: ServiceRegistrationOptions
): void {
  getGlobalContainer().register(contract, implementation, options);
}

/**
 * Resolves a service from the global container.
 */
export function resolveService<T>(contract: ServiceContract<T>): T {
  return getGlobalContainer().resolve(contract);
}

/**
 * Tries to resolve a service from the global container.
 */
export function tryResolveService<T>(contract: ServiceContract<T>): T | undefined {
  return getGlobalContainer().tryResolve(contract);
}

// ============================================================================
// Pre-defined Service Contracts
// ============================================================================

/**
 * Logger service contract.
 */
export interface ILogger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, error?: Error, data?: unknown): void;
}

export const LoggerContract = createServiceContract<ILogger>(
  'coordination:logger',
  {
    debug: (msg, data) => console.info(msg, data),
    info: (msg, data) => console.info(msg, data),
    warn: (msg, data) => console.warn(msg, data),
    error: (msg, err, data) => console.error(msg, err, data),
  },
  'bootstrap'
);

/**
 * Configuration service contract.
 */
export interface IConfigService {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  has(key: string): boolean;
  getAll(): Record<string, unknown>;
}

export const ConfigContract = createServiceContract<IConfigService>(
  'coordination:config',
  undefined,
  'bootstrap'
);

/**
 * Telemetry service contract.
 */
export interface ITelemetryService {
  trackEvent(name: string, properties?: Record<string, unknown>): void;
  trackMetric(name: string, value: number, properties?: Record<string, unknown>): void;
  trackException(error: Error, properties?: Record<string, unknown>): void;
  flush(): Promise<void>;
}

export const TelemetryContract = createServiceContract<ITelemetryService>(
  'coordination:telemetry',
  {
    trackEvent: () => {},
    trackMetric: () => {},
    trackException: () => {},
    flush: async () => {},
  },
  'bootstrap'
);
