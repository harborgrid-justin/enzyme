/**
 * @file Extension Manager
 * @description Manages enzyme extensions with priority-based execution and error isolation
 *
 * Key patterns implemented:
 * - Prisma: Extension composition and type safety
 * - axios: Interceptor execution order with priority
 * - socket.io: Middleware chains with async/await
 * - Express: Error handling middleware
 *
 * @module lib/extensions/manager
 */

import type {
  EnzymeExtension,
  IExtensionManager,
  LifecycleHooks,
  InitContext,
  MountContext,
  UnmountContext,
  ErrorContext,
  BeforeOperationContext,
  AfterOperationContext,
  IExtensionEventEmitter,
  ExtensionEvent,
  ExtensionEventHandler,
} from './types.js';

// ============================================================================
// Extension Manager Implementation
// ============================================================================

/**
 * Extension manager with priority-based execution and error isolation
 *
 * @example
 * ```ts
 * const manager = new EnzymeExtensionManager();
 *
 * manager.register({
 *   name: 'logging',
 *   priority: ExtensionPriorities.HIGH,
 *   hooks: {
 *     beforeOperation: async (ctx) => {
 *       console.log(`[${ctx.operation}] Starting...`);
 *     },
 *   },
 * });
 *
 * await manager.executeHooks('beforeOperation', {
 *   operation: 'fetchUser',
 *   args: { userId: 123 },
 *   // ...
 * });
 * ```
 */
export class EnzymeExtensionManager implements IExtensionManager {
  private extensions: Map<string, EnzymeExtension> = new Map();
  private sortedExtensions: EnzymeExtension[] = [];
  private eventEmitter: ExtensionEventEmitter;
  private config: Record<string, unknown>;

  constructor(config: Record<string, unknown> = {}) {
    this.config = config;
    this.eventEmitter = new ExtensionEventEmitter();
  }

  /**
   * Get event emitter for inter-extension communication
   */
  get events(): IExtensionEventEmitter {
    return this.eventEmitter;
  }

  /**
   * Register an extension
   * Extensions are automatically sorted by priority after registration
   */
  register(extension: EnzymeExtension): void {
    if (!extension.name) {
      throw new TypeError('Extension name is required');
    }

    if (this.extensions.has(extension.name)) {
      console.warn(
        `Extension "${extension.name}" is already registered. Replacing with new version.`
      );
    }

    // Set default priority if not specified
    const extensionWithDefaults: EnzymeExtension = {
      priority: 0,
      ...extension,
    };

    this.extensions.set(extension.name, extensionWithDefaults);
    this.sortExtensionsByPriority();

    // Execute onInit hook if present
    if (extensionWithDefaults.hooks?.onInit) {
      const initContext: InitContext = {
        extensionName: extension.name,
        config: this.config,
        timestamp: Date.now(),
      };

      Promise.resolve(extensionWithDefaults.hooks.onInit(initContext)).catch((error) => {
        console.error(`Extension "${extension.name}" onInit hook failed:`, error);
        this.handleExtensionError(extension.name, 'onInit', error, async () => {
          await extensionWithDefaults.hooks!.onInit!(initContext);
        });
      });
    }

    console.debug?.(
      `Registered extension: ${extension.name}${extension.version ? `@${extension.version}` : ''} (priority: ${extensionWithDefaults.priority})`
    );
  }

  /**
   * Unregister an extension by name
   */
  unregister(name: string): boolean {
    if (!this.extensions.has(name)) {
      return false;
    }

    this.extensions.delete(name);
    this.sortExtensionsByPriority();

    console.debug?.(`Unregistered extension: ${name}`);
    return true;
  }

  /**
   * Get all registered extensions (sorted by priority)
   */
  getExtensions(): EnzymeExtension[] {
    return [...this.sortedExtensions];
  }

  /**
   * Get extension by name
   */
  getExtension(name: string): EnzymeExtension | undefined {
    return this.extensions.get(name);
  }

  /**
   * Check if extension is registered
   */
  hasExtension(name: string): boolean {
    return this.extensions.has(name);
  }

  /**
   * Get extension count
   */
  get count(): number {
    return this.extensions.size;
  }

  /**
   * List all extension names
   */
  list(): string[] {
    return Array.from(this.extensions.keys());
  }

  /**
   * Clear all extensions
   */
  clear(): void {
    this.extensions.clear();
    this.sortedExtensions = [];
    console.debug?.('Cleared all extensions');
  }

  // ==========================================================================
  // Hook Execution
  // ==========================================================================

  /**
   * Execute lifecycle hooks with priority-based ordering
   * Higher priority extensions execute first
   * Errors are isolated per extension
   */
  async executeHooks<T = void>(
    hookName: keyof LifecycleHooks,
    context: unknown
  ): Promise<T | void> {
    const results: Array<T | void> = [];

    for (const extension of this.sortedExtensions) {
      const hook = extension.hooks?.[hookName];
      if (!hook) continue;

      try {
        const result = await this.executeHookSafely(
          extension.name,
          hookName,
          hook,
          context
        );
        if (result !== undefined) {
          results.push(result as T);
        }
      } catch (error) {
        // Error already handled in executeHookSafely
        // Continue with next extension
        console.error(
          `Extension "${extension.name}" ${hookName} hook failed (continuing with others):`,
          error
        );
      }
    }

    // Return first non-undefined result
    return results.find((r) => r !== undefined);
  }

  /**
   * Execute mount hooks (React lifecycle)
   */
  async executeMountHooks(
    component?: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    const context: MountContext = {
      extensionName: '',
      component,
      data,
      timestamp: Date.now(),
    };

    await this.executeHooks('onMount', context);
  }

  /**
   * Execute unmount hooks (React lifecycle)
   */
  async executeUnmountHooks(
    component?: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    const context: UnmountContext = {
      extensionName: '',
      component,
      data,
      timestamp: Date.now(),
    };

    await this.executeHooks('onUnmount', context);
  }

  /**
   * Execute beforeOperation hooks with cancellation support
   */
  async executeBeforeOperationHooks<TArgs = unknown>(
    operation: string,
    args: TArgs,
    metadata?: Record<string, unknown>
  ): Promise<{ args: TArgs; cancelled: boolean }> {
    let currentArgs = args;
    let cancelled = false;

    for (const extension of this.sortedExtensions) {
      const hook = extension.hooks?.beforeOperation;
      if (!hook) continue;

      const context: BeforeOperationContext<TArgs> = {
        extensionName: extension.name,
        operation,
        args: currentArgs,
        modify: (changes) => {
          currentArgs = { ...currentArgs, ...changes };
        },
        cancel: () => {
          cancelled = true;
        },
        metadata,
        timestamp: Date.now(),
      };

      try {
        await this.executeHookSafely(extension.name, 'beforeOperation', hook, context);

        if (cancelled) {
          console.debug?.(`Operation "${operation}" cancelled by extension "${extension.name}"`);
          break;
        }
      } catch (error) {
        console.error(
          `Extension "${extension.name}" beforeOperation hook failed:`,
          error
        );
      }
    }

    return { args: currentArgs, cancelled };
  }

  /**
   * Execute afterOperation hooks with result modification
   */
  async executeAfterOperationHooks<TArgs = unknown, TResult = unknown>(
    operation: string,
    args: TArgs,
    result: TResult,
    duration: number,
    metadata?: Record<string, unknown>
  ): Promise<TResult> {
    let currentResult = result;

    for (const extension of this.sortedExtensions) {
      const hook = extension.hooks?.afterOperation;
      if (!hook) continue;

      const context: AfterOperationContext<TArgs, TResult> = {
        extensionName: extension.name,
        operation,
        args,
        result: currentResult,
        modify: (changes) => {
          if (typeof currentResult === 'object' && currentResult !== null) {
            currentResult = { ...currentResult, ...changes };
          }
        },
        duration,
        metadata,
        timestamp: Date.now(),
      };

      try {
        await this.executeHookSafely(extension.name, 'afterOperation', hook, context);
      } catch (error) {
        console.error(
          `Extension "${extension.name}" afterOperation hook failed:`,
          error
        );
      }
    }

    return currentResult;
  }

  // ==========================================================================
  // Extension Utilities
  // ==========================================================================

  /**
   * Get all component enhancers from extensions
   */
  getComponentEnhancers(): Map<string, Array<{ name: string; enhancer: Function }>> {
    const enhancers = new Map<string, Array<{ name: string; enhancer: Function }>>();

    for (const extension of this.sortedExtensions) {
      if (!extension.component?.enhancers) continue;

      for (const [enhancerName, enhancer] of Object.entries(
        extension.component.enhancers
      )) {
        if (!enhancers.has(enhancerName)) {
          enhancers.set(enhancerName, []);
        }
        enhancers.get(enhancerName)!.push({
          name: extension.name,
          enhancer,
        });
      }
    }

    return enhancers;
  }

  /**
   * Get all custom hooks from extensions
   */
  getComponentHooks(): Record<string, Function> {
    const hooks: Record<string, Function> = {};

    for (const extension of this.sortedExtensions) {
      if (!extension.component?.hooks) continue;

      Object.assign(hooks, extension.component.hooks);
    }

    return hooks;
  }

  /**
   * Get all state selectors from extensions
   */
  getStateSelectors(): Record<string, Function> {
    const selectors: Record<string, Function> = {};

    for (const extension of this.sortedExtensions) {
      if (!extension.state?.selectors) continue;

      Object.assign(selectors, extension.state.selectors);
    }

    return selectors;
  }

  /**
   * Get all state action creators from extensions
   */
  getStateActions(): Record<string, Function> {
    const actions: Record<string, Function> = {};

    for (const extension of this.sortedExtensions) {
      if (!extension.state?.actions) continue;

      Object.assign(actions, extension.state.actions);
    }

    return actions;
  }

  /**
   * Get combined initial state from all extensions
   */
  getCombinedInitialState(): Record<string, unknown> {
    const state: Record<string, unknown> = {};

    for (const extension of this.sortedExtensions) {
      if (!extension.state?.initialState) continue;

      Object.assign(state, extension.state.initialState);
    }

    return state;
  }

  /**
   * Get all API endpoints from extensions
   */
  getApiEndpoints(): Record<string, unknown> {
    const endpoints: Record<string, unknown> = {};

    for (const extension of this.sortedExtensions) {
      if (!extension.api?.endpoints) continue;

      Object.assign(endpoints, extension.api.endpoints);
    }

    return endpoints;
  }

  /**
   * Get all API interceptors from extensions
   */
  getApiInterceptors(): Array<{ name: string; interceptor: unknown }> {
    const interceptors: Array<{ name: string; interceptor: unknown }> = [];

    for (const extension of this.sortedExtensions) {
      if (!extension.api?.interceptors) continue;

      for (const interceptor of extension.api.interceptors) {
        interceptors.push({
          name: extension.name,
          interceptor,
        });
      }
    }

    return interceptors;
  }

  /**
   * Get all client methods from extensions
   */
  getClientMethods(): Record<string, Function> {
    const methods: Record<string, Function> = {};

    for (const extension of this.sortedExtensions) {
      if (!extension.client) continue;

      Object.assign(methods, extension.client);
    }

    return methods;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Sort extensions by priority (higher priority first)
   */
  private sortExtensionsByPriority(): void {
    this.sortedExtensions = Array.from(this.extensions.values()).sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    );
  }

  /**
   * Execute a hook safely with error handling
   */
  private async executeHookSafely<T>(
    extensionName: string,
    hookName: string,
    hook: Function,
    context: unknown
  ): Promise<T | void> {
    try {
      const result = await Promise.resolve(hook(context));
      return result as T;
    } catch (error) {
      await this.handleExtensionError(
        extensionName,
        hookName,
        error instanceof Error ? error : new Error(String(error)),
        async () => {
          await hook(context);
        }
      );
      throw error;
    }
  }

  /**
   * Handle extension errors with error hook
   */
  private async handleExtensionError(
    extensionName: string,
    hookName: string,
    error: Error,
    retry: () => Promise<void>
  ): Promise<void> {
    const extension = this.extensions.get(extensionName);
    if (!extension?.hooks?.onError) {
      return;
    }

    const errorContext: ErrorContext = {
      extensionName,
      hookName,
      error,
      operation: hookName,
      retry,
      timestamp: Date.now(),
    };

    try {
      await extension.hooks.onError(errorContext);
    } catch (errorHandlerError) {
      console.error(
        `Extension "${extensionName}" error hook failed while handling error in ${hookName}:`,
        errorHandlerError
      );
    }
  }
}

// ============================================================================
// Extension Event Emitter
// ============================================================================

/**
 * Event emitter for inter-extension communication
 */
class ExtensionEventEmitter implements IExtensionEventEmitter {
  private handlers: Map<string, Set<ExtensionEventHandler>> = new Map();

  /**
   * Emit an event to all registered handlers
   */
  emit<T>(type: string, payload: T, metadata?: Record<string, unknown>): void {
    const handlers = this.handlers.get(type);
    if (!handlers || handlers.size === 0) {
      return;
    }

    const event: ExtensionEvent<T> = {
      type,
      payload,
      source: 'enzyme-core',
      timestamp: Date.now(),
      metadata,
    };

    for (const handler of handlers) {
      Promise.resolve(handler(event)).catch((error) => {
        console.error(`Event handler for "${type}" failed:`, error);
      });
    }
  }

  /**
   * Subscribe to events
   * Returns unsubscribe function
   */
  on<T>(type: string, handler: ExtensionEventHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }

    this.handlers.get(type)!.add(handler as ExtensionEventHandler);

    return () => {
      this.off(type, handler);
    };
  }

  /**
   * Subscribe to events (once)
   * Handler is automatically removed after first execution
   */
  once<T>(type: string, handler: ExtensionEventHandler<T>): () => void {
    const onceHandler: ExtensionEventHandler<T> = async (event) => {
      this.off(type, onceHandler);
      await handler(event);
    };

    return this.on(type, onceHandler);
  }

  /**
   * Unsubscribe from events
   */
  off<T>(type: string, handler: ExtensionEventHandler<T>): void {
    const handlers = this.handlers.get(type);
    if (!handlers) {
      return;
    }

    handlers.delete(handler as ExtensionEventHandler);

    if (handlers.size === 0) {
      this.handlers.delete(type);
    }
  }

  /**
   * Clear all handlers for a specific event type
   */
  clear(type?: string): void {
    if (type) {
      this.handlers.delete(type);
    } else {
      this.handlers.clear();
    }
  }

  /**
   * Get handler count for an event type
   */
  getHandlerCount(type: string): number {
    return this.handlers.get(type)?.size ?? 0;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new extension manager
 *
 * @example
 * ```ts
 * const manager = createExtensionManager({ debug: true });
 * ```
 */
export function createExtensionManager(
  config?: Record<string, unknown>
): EnzymeExtensionManager {
  return new EnzymeExtensionManager(config);
}

/**
 * Create a pre-configured extension manager with common extensions
 */
export function createDefaultExtensionManager(
  config?: Record<string, unknown>
): EnzymeExtensionManager {
  const manager = new EnzymeExtensionManager(config);

  // Built-in extensions can be registered here
  // Example: manager.register(loggingExtension);

  return manager;
}
