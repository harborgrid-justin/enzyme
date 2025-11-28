/* @refresh reset */
/**
 * @file Feature Dependency Injection
 * @description Enables loose coupling between features via service contracts
 */

import {
  useContext,
  useMemo,
  useEffect,
  createContext,
  type ReactNode,
} from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Service contract definition
 * Defines a typed interface for a service that can be resolved at runtime
 */
export interface ServiceContract<T> {
  readonly id: symbol;
  readonly name: string;
  readonly defaultValue?: T;
}

/**
 * Service registration options
 */
export interface ServiceRegistrationOptions {
  /** Scope of the service instance */
  scope?: 'singleton' | 'transient';
  /** Tags for service discovery */
  tags?: string[];
}

/**
 * Internal service registration
 */
interface ServiceRegistration<T = unknown> {
  contract: ServiceContract<T>;
  implementation: T;
  scope: 'singleton' | 'transient';
  tags: string[];
}

// ============================================================================
// Feature DI Container
// ============================================================================

/**
 * Feature dependency injection container
 * Manages service registrations and resolution
 */
export class FeatureDIContainer {
  private services = new Map<symbol, ServiceRegistration>();
  private singletons = new Map<symbol, unknown>();
  private factoryFunctions = new Map<symbol, () => unknown>();

  /**
   * Register a service implementation
   */
  register<T>(
    contract: ServiceContract<T>,
    implementation: T,
    options: ServiceRegistrationOptions = {}
  ): this {
    const { scope = 'singleton', tags = [] } = options;

    this.services.set(contract.id, {
      contract: contract as ServiceContract<unknown>,
      implementation,
      scope,
      tags,
    });

    // Clear any existing singleton when re-registering
    this.singletons.delete(contract.id);

    return this;
  }

  /**
   * Register a factory function for lazy instantiation
   */
  registerFactory<T>(
    contract: ServiceContract<T>,
    factory: () => T,
    options: ServiceRegistrationOptions = {}
  ): this {
    this.factoryFunctions.set(contract.id, factory);
    return this.register(contract, undefined as T, options);
  }

  /**
   * Resolve a service
   */
  resolve<T>(contract: ServiceContract<T>): T {
    // Check for singleton first
    if (this.singletons.has(contract.id)) {
      return this.singletons.get(contract.id) as T;
    }

    const registration = this.services.get(contract.id);

    // Not registered - check for default value
    if (!registration) {
      if (contract.defaultValue !== undefined) {
        return contract.defaultValue;
      }
      throw new Error(
        `Service not registered: ${contract.name} (${String(contract.id)})`
      );
    }

    // Get or create instance
    let instance: T;

    // Check for factory function
    const factory = this.factoryFunctions.get(contract.id);
    if (factory && registration.implementation === undefined) {
      instance = factory() as T;
      // Update registration with created instance
      registration.implementation = instance;
    } else {
      instance = registration.implementation as T;
    }

    // Cache singleton
    if (registration.scope === 'singleton') {
      this.singletons.set(contract.id, instance);
    }

    return instance;
  }

  /**
   * Try to resolve a service, returning undefined if not found
   */
  tryResolve<T>(contract: ServiceContract<T>): T | undefined {
    try {
      return this.resolve(contract);
    } catch {
      return undefined;
    }
  }

  /**
   * Check if a service is registered
   */
  has<T>(contract: ServiceContract<T>): boolean {
    return this.services.has(contract.id) || contract.defaultValue !== undefined;
  }

  /**
   * Unregister a service
   */
  unregister<T>(contract: ServiceContract<T>): boolean {
    this.singletons.delete(contract.id);
    this.factoryFunctions.delete(contract.id);
    return this.services.delete(contract.id);
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.services.clear();
    this.singletons.clear();
    this.factoryFunctions.clear();
  }

  /**
   * Get all services with a specific tag
   */
  getByTag(tag: string): ServiceRegistration[] {
    return Array.from(this.services.values()).filter((reg) =>
      reg.tags.includes(tag)
    );
  }

  /**
   * Get all registered service contracts
   */
  getRegisteredContracts(): ServiceContract<unknown>[] {
    return Array.from(this.services.values()).map((reg) => reg.contract);
  }

  /**
   * Create a child container that inherits from this container
   */
  createChild(): FeatureDIContainer {
    const child = new FeatureDIContainer();

    // Copy registrations (but not singletons - child gets fresh instances)
    for (const [id, registration] of this.services) {
      child.services.set(id, { ...registration });
    }

    // Copy factory functions
    for (const [id, factory] of this.factoryFunctions) {
      child.factoryFunctions.set(id, factory);
    }

    return child;
  }
}

// ============================================================================
// Global Container
// ============================================================================

const globalContainer = new FeatureDIContainer();

/**
 * Get the global DI container
 */
export function getContainer(): FeatureDIContainer {
  return globalContainer;
}

/**
 * Register a service in the global container
 */
export function registerService<T>(
  contract: ServiceContract<T>,
  implementation: T,
  options?: ServiceRegistrationOptions
): void {
  globalContainer.register(contract, implementation, options);
}

// ============================================================================
// Service Contract Factory
// ============================================================================

/**
 * Create a typed service contract
 */
export function createServiceContract<T>(
  name: string,
  defaultValue?: T
): ServiceContract<T> {
  return {
    id: Symbol.for(`feature-service:${name}`),
    name,
    defaultValue,
  };
}

// ============================================================================
// React Integration
// ============================================================================

const DIContext = createContext<FeatureDIContainer>(globalContainer);

/**
 * DI Provider component
 */
export function FeatureDIProvider({
  container = globalContainer,
  children,
}: {
  container?: FeatureDIContainer;
  children: ReactNode;
}) {
  return <DIContext.Provider value={container}>{children}</DIContext.Provider>;
}

/**
 * Hook to get the DI container
 */
export function useDIContainer(): FeatureDIContainer {
  return useContext(DIContext);
}

/**
 * Hook to resolve a service
 */
export function useService<T>(contract: ServiceContract<T>): T {
  const container = useDIContainer();
  return useMemo(() => container.resolve(contract), [container, contract]);
}

/**
 * Hook to try to resolve a service (returns undefined if not found)
 */
export function useTryService<T>(contract: ServiceContract<T>): T | undefined {
  const container = useDIContainer();
  return useMemo(() => container.tryResolve(contract), [container, contract]);
}

/**
 * Hook to check if a service exists
 */
export function useHasService<T>(contract: ServiceContract<T>): boolean {
  const container = useDIContainer();
  return container.has(contract);
}

/**
 * Hook to get all services with a specific tag
 */
export function useServicesByTag<T>(tag: string): T[] {
  const container = useDIContainer();
  return useMemo(() => {
    const registrations = container.getByTag(tag);
    return registrations.map(
      (reg) => container.resolve(reg.contract) as T
    );
  }, [container, tag]);
}

// ============================================================================
// Common Service Contracts
// ============================================================================

/**
 * Analytics service contract
 */
export interface AnalyticsService {
  track(event: string, properties?: Record<string, unknown>): void;
  identify(userId: string, traits?: Record<string, unknown>): void;
  page(name: string, properties?: Record<string, unknown>): void;
  reset(): void;
}

export const AnalyticsContract = createServiceContract<AnalyticsService>(
  'analytics',
  {
    track: () => {},
    identify: () => {},
    page: () => {},
    reset: () => {},
  }
);

/**
 * Notification service contract
 */
export interface NotificationService {
  success(message: string, options?: NotificationOptions): void;
  error(message: string, options?: NotificationOptions): void;
  warning(message: string, options?: NotificationOptions): void;
  info(message: string, options?: NotificationOptions): void;
  dismiss(id?: string): void;
}

interface NotificationOptions {
  duration?: number;
  title?: string;
  action?: { label: string; onClick: () => void };
}

export const NotificationContract = createServiceContract<NotificationService>(
  'notification',
  {
    success: (msg) => console.log('[Success]', msg),
    error: (msg) => console.error('[Error]', msg),
    warning: (msg) => console.warn('[Warning]', msg),
    info: (msg) => console.info('[Info]', msg),
    dismiss: () => {},
  }
);

/**
 * Navigation service contract
 */
export interface NavigationService {
  navigate(path: string, options?: { replace?: boolean }): void;
  goBack(): void;
  goForward(): void;
  replace(path: string): void;
  getCurrentPath(): string;
}

export const NavigationContract = createServiceContract<NavigationService>(
  'navigation'
);

/**
 * Storage service contract
 */
export interface StorageService {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
}

export const StorageContract = createServiceContract<StorageService>(
  'storage',
  {
    get: (key) => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch {
        return null;
      }
    },
    set: (key, value) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    remove: (key) => {
      localStorage.removeItem(key);
    },
    clear: () => {
      localStorage.clear();
    },
  }
);

// ============================================================================
// Feature-to-Feature Communication
// ============================================================================

/**
 * Event handler type
 */
type EventHandler<T = unknown> = (payload: T) => void;

/**
 * Cross-feature event bus contract
 */
export interface FeatureEventBus {
  emit<T>(event: string, payload?: T): void;
  on<T>(event: string, handler: EventHandler<T>): () => void;
  once<T>(event: string, handler: EventHandler<T>): () => void;
  off(event: string, handler: EventHandler): void;
  offAll(event?: string): void;
}

export const FeatureEventBusContract = createServiceContract<FeatureEventBus>(
  'featureEventBus'
);

/**
 * Simple event bus implementation
 */
export class SimpleFeatureEventBus implements FeatureEventBus {
  private listeners = new Map<string, Set<EventHandler>>();
  private onceListeners = new Map<string, Set<EventHandler>>();

  emit<T>(event: string, payload?: T): void {
    // Regular listeners
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(payload));
    }

    // Once listeners
    const onceHandlers = this.onceListeners.get(event);
    if (onceHandlers) {
      onceHandlers.forEach((handler) => {
        handler(payload);
        this.off(event, handler);
      });
      this.onceListeners.delete(event);
    }
  }

  on<T>(event: string, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => this.off(event, handler as EventHandler);
  }

  once<T>(event: string, handler: EventHandler<T>): () => void {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }
    this.onceListeners.get(event)!.add(handler as EventHandler);

    return () => {
      const handlers = this.onceListeners.get(event);
      if (handlers) {
        handlers.delete(handler as EventHandler);
      }
    };
  }

  off(event: string, handler: EventHandler): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  offAll(event?: string): void {
    if (event) {
      this.listeners.delete(event);
      this.onceListeners.delete(event);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
    }
  }
}

/**
 * Hook to use the feature event bus
 */
export function useFeatureEventBus(): FeatureEventBus {
  return useService(FeatureEventBusContract);
}

/**
 * Hook to subscribe to feature events
 * Automatically unsubscribes on unmount
 */
export function useFeatureEvent<T>(
  event: string,
  handler: EventHandler<T>
): void {
  const eventBus = useFeatureEventBus();

  useEffect(() => {
    const unsubscribe = eventBus.on(event, handler);
    return unsubscribe;
  }, [eventBus, event, handler]);
}

// ============================================================================
// Default Event Bus Registration
// ============================================================================

// Register the default event bus
registerService(FeatureEventBusContract, new SimpleFeatureEventBus());
