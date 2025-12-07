/**
 * Dependency Injection Container
 * Provides service registration, singleton management, and dependency resolution
 */

import * as vscode from 'vscode';
import { LoggerService } from '../services/logger-service';
import { WorkspaceService } from '../services/workspace-service';
import { AnalysisService } from '../services/analysis-service';
import { EventBus } from './event-bus';

/**
 * Service lifecycle types
 */
export type ServiceLifecycle = 'singleton' | 'transient' | 'scoped';

/**
 * Service factory function
 */
export type ServiceFactory<T> = (container: Container) => T;

/**
 * Service descriptor
 */
export interface ServiceDescriptor<T = unknown> {
  name: string;
  factory: ServiceFactory<T>;
  lifecycle: ServiceLifecycle;
  instance?: T;
  dependencies?: string[];
}

/**
 * Dependency Injection Container
 */
export class Container {
  private static instance: Container;
  private services: Map<string, ServiceDescriptor> = new Map();
  private singletons: Map<string, unknown> = new Map();
  private context?: vscode.ExtensionContext;

  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  /**
   * Initialize the container with VS Code extension context
   */
  public initialize(context: vscode.ExtensionContext): void {
    this.context = context;
    this.registerDefaultServices();
  }

  /**
   * Register default services
   */
  private registerDefaultServices(): void {
    // Register EventBus
    this.registerSingleton('EventBus', () => EventBus.getInstance());

    // Register LoggerService
    this.registerSingleton('LoggerService', () => LoggerService.getInstance());

    // Register WorkspaceService
    this.registerSingleton('WorkspaceService', () => WorkspaceService.getInstance());

    // Register AnalysisService
    this.registerSingleton('AnalysisService', () => AnalysisService.getInstance());
  }

  /**
   * Register a singleton service
   */
  public registerSingleton<T>(
    name: string,
    factory: ServiceFactory<T>,
    dependencies?: string[]
  ): void {
    this.services.set(name, {
      name,
      factory,
      lifecycle: 'singleton',
      dependencies,
    });
  }

  /**
   * Register a transient service
   */
  public registerTransient<T>(
    name: string,
    factory: ServiceFactory<T>,
    dependencies?: string[]
  ): void {
    this.services.set(name, {
      name,
      factory,
      lifecycle: 'transient',
      dependencies,
    });
  }

  /**
   * Register a scoped service
   */
  public registerScoped<T>(
    name: string,
    factory: ServiceFactory<T>,
    dependencies?: string[]
  ): void {
    this.services.set(name, {
      name,
      factory,
      lifecycle: 'scoped',
      dependencies,
    });
  }

  /**
   * Register a service instance
   */
  public registerInstance<T>(name: string, instance: T): void {
    this.singletons.set(name, instance);
    this.services.set(name, {
      name,
      factory: () => instance,
      lifecycle: 'singleton',
      instance,
    });
  }

  /**
   * Resolve a service by name
   */
  public resolve<T>(name: string): T {
    const descriptor = this.services.get(name);
    if (!descriptor) {
      throw new Error(`Service not found: ${name}`);
    }

    // Check for singleton instance
    if (descriptor.lifecycle === 'singleton') {
      if (this.singletons.has(name)) {
        return this.singletons.get(name) as T;
      }

      const instance = descriptor.factory(this) as T;
      this.singletons.set(name, instance);
      return instance;
    }

    // Create transient instance
    return descriptor.factory(this) as T;
  }

  /**
   * Resolve multiple services
   */
  public resolveMany<T>(...names: string[]): T[] {
    return names.map(name => this.resolve<T>(name));
  }

  /**
   * Check if a service is registered
   */
  public has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Get all registered service names
   */
  public getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Get service descriptor
   */
  public getDescriptor(name: string): ServiceDescriptor | undefined {
    return this.services.get(name);
  }

  /**
   * Get extension context
   */
  public getContext(): vscode.ExtensionContext {
    if (!this.context) {
      throw new Error('Container not initialized. Call initialize() first.');
    }
    return this.context;
  }

  /**
   * Create a child container (for scoping)
   */
  public createChild(): Container {
    const child = new Container();
    child.context = this.context;
    // Copy service registrations
    this.services.forEach((descriptor, name) => {
      child.services.set(name, { ...descriptor });
    });
    return child;
  }

  /**
   * Clear all services
   */
  public clear(): void {
    this.services.clear();
    this.singletons.clear();
  }

  /**
   * Dispose all singleton services that implement dispose
   * FIXED: Now properly resets singleton instance to prevent memory leaks
   */
  public dispose(): void {
    this.singletons.forEach((instance) => {
      if (instance && typeof (instance as any).dispose === 'function') {
        (instance as any).dispose();
      }
    });
    this.clear();
    // Reset singleton instance
    if (Container.instance === this) {
      Container.instance = null as any;
    }
  }
}

/**
 * Decorator for service injection (TypeScript experimental decorators)
 */
export function inject(serviceName: string) {
  return function (target: any, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
      get: function () {
        const container = Container.getInstance();
        return container.resolve(serviceName);
      },
      enumerable: true,
      configurable: true,
    });
  };
}

/**
 * Helper function to get the container instance
 */
export function getContainer(): Container {
  return Container.getInstance();
}
