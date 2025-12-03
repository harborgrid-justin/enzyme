/**
 * @file Extension Client
 * @description Enzyme client with Prisma-like $extends API for immutable extension composition
 *
 * Key patterns implemented:
 * - Prisma: Immutable $extends API with type-safe method merging
 * - Fluent API: Method chaining for extension composition
 * - Proxy Pattern: Dynamic method delegation to extensions
 *
 * @module lib/extensions/client
 */

import {
  EnzymeExtensionManager,
  createExtensionManager,
} from './manager.js';
import type {
  EnzymeExtension,
  LifecycleHooks,
  IExtensionEventEmitter,
} from './types.js';

// ============================================================================
// Extension Client Interface
// ============================================================================

/**
 * Configuration for enzyme extension client
 */
export interface EnzymeExtensionClientConfig {
  /** Enable debug logging */
  debug?: boolean;
  /** Custom configuration */
  [key: string]: unknown;
}

/**
 * Enzyme client with Prisma-like $extends method
 *
 * @example
 * ```ts
 * const client = createExtensionClient()
 *   .$extends(loggingExtension)
 *   .$extends(cacheExtension)
 *   .$extends(metricsExtension);
 *
 * // Extensions are immutable - each $extends returns a new client
 * const clientWithLogging = client.$extends(loggingExtension);
 * const clientWithAll = clientWithLogging.$extends(cacheExtension);
 *
 * // Use client methods (added by extensions)
 * await client.myCustomMethod();
 * ```
 */
export class EnzymeExtensionClient {
  private readonly manager: EnzymeExtensionManager;
  private readonly config: EnzymeExtensionClientConfig;

  constructor(
    config: EnzymeExtensionClientConfig = {},
    manager?: EnzymeExtensionManager
  ) {
    this.config = config;
    this.manager = manager ?? createExtensionManager(config);

    // Bind client methods from existing extensions
    this.bindClientMethods();
  }

  /**
   * Extend the client with an extension (Prisma pattern)
   * Returns a new client instance with the extension applied (immutable)
   *
   * @param extension - The extension to apply
   * @returns A new client with the extension registered
   *
   * @example
   * ```ts
   * const loggingExtension: EnzymeExtension = {
   *   name: 'logging',
   *   hooks: {
   *     beforeOperation: async (ctx) => {
   *       console.log(`[${ctx.operation}] Starting...`);
   *     },
   *   },
   *   client: {
   *     log: (message: string) => {
   *       console.log(`[CLIENT] ${message}`);
   *     },
   *   },
   * };
   *
   * const client = new EnzymeExtensionClient().$extends(loggingExtension);
   * client.log('Hello, world!'); // Uses extension method
   * ```
   */
  $extends(extension: EnzymeExtension): this {
    // Create a new client with copied extensions
    const newManager = createExtensionManager(this.config);

    // Copy existing extensions to new manager
    for (const ext of this.manager.getExtensions()) {
      newManager.register(ext);
    }

    // Register new extension
    newManager.register(extension);

    // Create new client instance
    const newClient = new (this.constructor as typeof EnzymeExtensionClient)(
      this.config,
      newManager
    );

    // Bind all client methods (including new ones)
    newClient.bindClientMethods();

    return newClient as this;
  }

  /**
   * Get the extension manager (for advanced use cases)
   *
   * @example
   * ```ts
   * const manager = client.$manager;
   * console.log(manager.count); // Number of registered extensions
   * ```
   */
  get $manager(): EnzymeExtensionManager {
    return this.manager;
  }

  /**
   * Get the event emitter for inter-extension communication
   *
   * @example
   * ```ts
   * client.$events.on('user:login', (event) => {
   *   console.log('User logged in:', event.payload);
   * });
   *
   * client.$events.emit('user:login', { userId: 123 });
   * ```
   */
  get $events(): IExtensionEventEmitter {
    return this.manager.events;
  }

  /**
   * Execute lifecycle hooks manually
   *
   * @example
   * ```ts
   * await client.$executeHooks('onMount', {
   *   component: 'MyComponent',
   *   // ...
   * });
   * ```
   */
  async $executeHooks<T = void>(
    hookName: keyof LifecycleHooks,
    context: unknown
  ): Promise<T | void> {
    return this.manager.executeHooks<T>(hookName, context);
  }

  /**
   * Execute beforeOperation hooks
   * Returns modified args and cancellation status
   *
   * @example
   * ```ts
   * const { args, cancelled } = await client.$beforeOperation('fetchUser', {
   *   userId: 123,
   * });
   *
   * if (!cancelled) {
   *   // Proceed with operation using modified args
   * }
   * ```
   */
  async $beforeOperation<TArgs = unknown>(
    operation: string,
    args: TArgs,
    metadata?: Record<string, unknown>
  ): Promise<{ args: TArgs; cancelled: boolean }> {
    return this.manager.executeBeforeOperationHooks(operation, args, metadata);
  }

  /**
   * Execute afterOperation hooks
   * Returns modified result
   *
   * @example
   * ```ts
   * const startTime = Date.now();
   * const result = await fetchUser(userId);
   * const duration = Date.now() - startTime;
   *
   * const modifiedResult = await client.$afterOperation(
   *   'fetchUser',
   *   { userId },
   *   result,
   *   duration
   * );
   * ```
   */
  async $afterOperation<TArgs = unknown, TResult = unknown>(
    operation: string,
    args: TArgs,
    result: TResult,
    duration: number,
    metadata?: Record<string, unknown>
  ): Promise<TResult> {
    return this.manager.executeAfterOperationHooks(
      operation,
      args,
      result,
      duration,
      metadata
    );
  }

  /**
   * Execute mount hooks (React lifecycle)
   *
   * @example
   * ```ts
   * useEffect(() => {
   *   client.$mount('MyComponent');
   *   return () => client.$unmount('MyComponent');
   * }, []);
   * ```
   */
  async $mount(component?: string, data?: Record<string, unknown>): Promise<void> {
    await this.manager.executeMountHooks(component, data);
  }

  /**
   * Execute unmount hooks (React lifecycle)
   */
  async $unmount(component?: string, data?: Record<string, unknown>): Promise<void> {
    await this.manager.executeUnmountHooks(component, data);
  }

  /**
   * Get list of registered extension names
   *
   * @example
   * ```ts
   * const extensions = client.$list();
   * console.log(`Registered extensions: ${extensions.join(', ')}`);
   * ```
   */
  $list(): string[] {
    return this.manager.list();
  }

  /**
   * Get extension by name
   *
   * @example
   * ```ts
   * const extension = client.$get('logging');
   * if (extension) {
   *   console.log('Logging extension version:', extension.version);
   * }
   * ```
   */
  $get(name: string): EnzymeExtension | undefined {
    return this.manager.getExtension(name);
  }

  /**
   * Check if extension is registered
   *
   * @example
   * ```ts
   * if (client.$has('analytics')) {
   *   // Analytics extension is available
   * }
   * ```
   */
  $has(name: string): boolean {
    return this.manager.hasExtension(name);
  }

  /**
   * Get count of registered extensions
   *
   * @example
   * ```ts
   * console.log(`${client.$count} extensions registered`);
   * ```
   */
  get $count(): number {
    return this.manager.count;
  }

  /**
   * Wrap an async operation with before/after hooks
   *
   * @example
   * ```ts
   * const fetchUser = async (userId: number) => {
   *   return client.$wrap('fetchUser', { userId }, async (args) => {
   *     const response = await fetch(`/api/users/${args.userId}`);
   *     return response.json();
   *   });
   * };
   * ```
   */
  async $wrap<TArgs extends Record<string, unknown>, TResult>(
    operation: string,
    args: TArgs,
    fn: (args: TArgs) => Promise<TResult>,
    metadata?: Record<string, unknown>
  ): Promise<TResult> {
    // Execute beforeOperation hooks
    const { args: modifiedArgs, cancelled } = await this.$beforeOperation(
      operation,
      args,
      metadata
    );

    if (cancelled) {
      throw new Error(`Operation "${operation}" was cancelled by an extension`);
    }

    // Execute the operation
    const startTime = Date.now();
    let result: TResult;

    try {
      result = await fn(modifiedArgs);
    } catch (error) {
      // Re-throw but allow afterOperation hooks to run
      throw error;
    } finally {
      const duration = Date.now() - startTime;

      // Execute afterOperation hooks
      if (result!) {
        result = await this.$afterOperation(
          operation,
          modifiedArgs,
          result,
          duration,
          metadata
        );
      }
    }

    return result;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Bind client methods from all registered extensions
   * This makes extension methods available directly on the client
   */
  private bindClientMethods(): void {
    const clientMethods = this.manager.getClientMethods();

    for (const [methodName, method] of Object.entries(clientMethods)) {
      // Skip if method name conflicts with built-in client methods
      if (methodName.startsWith('$') || methodName in this) {
        console.warn(
          `Cannot bind extension method "${methodName}": conflicts with built-in method`
        );
        continue;
      }

      // Bind method to client
      (this as any)[methodName] = method.bind(this);
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new enzyme extension client
 *
 * @param config - Optional client configuration
 * @returns A new extension client
 *
 * @example
 * ```ts
 * const client = createExtensionClient({ debug: true });
 * ```
 */
export function createExtensionClient(
  config?: EnzymeExtensionClientConfig
): EnzymeExtensionClient {
  return new EnzymeExtensionClient(config);
}

/**
 * Create a pre-configured enzyme client with extensions
 *
 * @param extensions - Extensions to register
 * @param config - Optional client configuration
 * @returns A new extension client with extensions applied
 *
 * @example
 * ```ts
 * const client = createClientWithExtensions(
 *   [loggingExtension, cacheExtension],
 *   { debug: true }
 * );
 * ```
 */
export function createClientWithExtensions(
  extensions: EnzymeExtension[],
  config?: EnzymeExtensionClientConfig
): EnzymeExtensionClient {
  let client = new EnzymeExtensionClient(config);

  for (const extension of extensions) {
    client = client.$extends(extension);
  }

  return client;
}

/**
 * Define an extension with the fluent builder API
 *
 * @example
 * ```ts
 * import { defineExtension } from '@/lib/extensions';
 *
 * const myExtension = defineExtension({
 *   name: 'my-extension',
 *   version: '1.0.0',
 *   hooks: {
 *     onInit: async (ctx) => {
 *       console.log('Extension initialized!');
 *     },
 *   },
 *   client: {
 *     myMethod: () => {
 *       console.log('Custom method from extension');
 *     },
 *   },
 * });
 *
 * const client = createExtensionClient().$extends(myExtension);
 * client.myMethod(); // "Custom method from extension"
 * ```
 */
export function defineExtension<T extends EnzymeExtension>(extension: T): T {
  if (!extension.name) {
    throw new TypeError('Extension name is required');
  }
  return extension;
}
