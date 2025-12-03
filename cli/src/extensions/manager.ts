/**
 * @file Extension Manager
 * @description Prisma-inspired extension system with $extends API
 *
 * Implements patterns from:
 * - Prisma: Composition via $extends, type-safe extensions
 * - axios: Interceptor execution order
 * - socket.io: Middleware chains with async/await
 * - lodash: Composable pipelines
 */

import type {
  EnzymeExtension,
  GeneratorHooks,
  GeneratorHookContext,
  FileHookContext,
  FileExtension,
  CommandDefinition,
  TemplateHelper,
  TemplateFilter,
  ExtensionManager,
  ValidationResult,
} from './types.js';

// ============================================================================
// Extension Manager Implementation
// ============================================================================

/**
 * Extension Manager with Prisma-like composition
 */
export class EnzymeExtensionManager implements ExtensionManager {
  private extensions: Map<string, EnzymeExtension> = new Map();
  private middlewareChain: MiddlewareChain;

  constructor() {
    this.middlewareChain = new MiddlewareChain();
  }

  /**
   * Register an extension
   */
  register(extension: EnzymeExtension): void {
    if (this.extensions.has(extension.name)) {
      console.warn(`Extension "${extension.name}" is already registered. Replacing...`);
    }

    this.extensions.set(extension.name, extension);

    // Register middleware hooks
    if (extension.generator) {
      this.registerGeneratorMiddleware(extension);
    }

    if (extension.file) {
      this.registerFileMiddleware(extension);
    }

    console.debug?.(`✓ Registered extension: ${extension.name}${extension.version ? `@${extension.version}` : ''}`);
  }

  /**
   * Unregister an extension
   */
  unregister(name: string): boolean {
    if (!this.extensions.has(name)) {
      return false;
    }

    this.extensions.delete(name);
    this.middlewareChain.remove(name);
    return true;
  }

  /**
   * Get all registered extensions
   */
  getExtensions(): EnzymeExtension[] {
    return Array.from(this.extensions.values());
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

  // ==========================================================================
  // Generator Hook Execution
  // ==========================================================================

  /**
   * Execute generator hooks in middleware chain order
   */
  async executeGeneratorHooks<T>(
    hookName: keyof GeneratorHooks,
    generator: string,
    context: GeneratorHookContext
  ): Promise<T | void> {
    const hooks = this.collectGeneratorHooks(hookName, generator);

    if (hooks.length === 0) {
      return;
    }

    // Execute hooks in order (axios interceptor pattern)
    for (const { hook, extensionName } of hooks) {
      try {
        const result = await hook(context);
        if (result !== undefined) {
          return result as T;
        }
      } catch (error) {
        console.error(`Extension "${extensionName}" ${hookName} hook failed:`, error);
        throw error;
      }
    }
  }

  /**
   * Execute validation hooks and collect results
   */
  async executeValidation(
    generator: string,
    context: GeneratorHookContext
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const extension of this.extensions.values()) {
      const hooks = extension.generator;
      if (!hooks) continue;

      // Check generator-specific validation
      const generatorHooks = hooks[generator as keyof typeof hooks] as GeneratorHooks | undefined;
      if (generatorHooks?.validate) {
        try {
          const result = await generatorHooks.validate(context);
          if (!result.valid) errors.push(...result.errors);
          warnings.push(...result.warnings);
        } catch (error) {
          errors.push(`Validation error in ${extension.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Check $allGenerators validation
      if (hooks.$allGenerators?.validate) {
        try {
          const result = await hooks.$allGenerators.validate(context);
          if (!result.valid) errors.push(...result.errors);
          warnings.push(...result.warnings);
        } catch (error) {
          errors.push(`Validation error in ${extension.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Collect all hooks for a specific generator and hook type
   */
  private collectGeneratorHooks(
    hookName: keyof GeneratorHooks,
    generator: string
  ): Array<{ hook: GeneratorHooks[keyof GeneratorHooks]; extensionName: string }> {
    const hooks: Array<{ hook: any; extensionName: string }> = [];

    for (const extension of this.extensions.values()) {
      const generatorExt = extension.generator;
      if (!generatorExt) continue;

      // Check generator-specific hooks
      const generatorHooks = generatorExt[generator as keyof typeof generatorExt] as GeneratorHooks | undefined;
      if (generatorHooks && generatorHooks[hookName]) {
        hooks.push({
          hook: generatorHooks[hookName],
          extensionName: extension.name,
        });
      }

      // Check $allGenerators hooks
      if (generatorExt.$allGenerators?.[hookName]) {
        hooks.push({
          hook: generatorExt.$allGenerators[hookName],
          extensionName: extension.name,
        });
      }

      // Check $allOperations (applies to all)
      if (generatorExt.$allGenerators?.$allOperations && hookName === 'beforeGenerate') {
        hooks.push({
          hook: generatorExt.$allGenerators.$allOperations,
          extensionName: extension.name,
        });
      }
    }

    return hooks;
  }

  // ==========================================================================
  // File Hook Execution
  // ==========================================================================

  /**
   * Execute file hooks
   */
  async executeFileHooks(
    hookName: keyof FileExtension,
    context: FileHookContext
  ): Promise<void> {
    for (const extension of this.extensions.values()) {
      const fileExt = extension.file;
      if (!fileExt) continue;

      const hook = fileExt[hookName];
      if (hook && typeof hook === 'function') {
        try {
          await (hook as (ctx: FileHookContext) => Promise<void>)(context);
        } catch (error) {
          console.error(`Extension "${extension.name}" ${hookName} hook failed:`, error);

          // Try error hook if available
          if (fileExt.onError && hookName !== 'onError') {
            await fileExt.onError({
              path: context.path,
              error: error instanceof Error ? error : new Error(String(error)),
              retry: async () => {
                await (hook as (ctx: FileHookContext) => Promise<void>)(context);
              },
            });
          } else {
            throw error;
          }
        }
      }
    }
  }

  // ==========================================================================
  // Command Extensions
  // ==========================================================================

  /**
   * Get all custom commands from extensions
   */
  getCommands(): Map<string, CommandDefinition> {
    const commands = new Map<string, CommandDefinition>();

    for (const extension of this.extensions.values()) {
      if (!extension.command) continue;

      for (const [name, definition] of Object.entries(extension.command)) {
        if (commands.has(name)) {
          console.warn(`Command "${name}" already exists. Extension "${extension.name}" is overriding it.`);
        }
        commands.set(name, definition);
      }
    }

    return commands;
  }

  // ==========================================================================
  // Template Extensions
  // ==========================================================================

  /**
   * Get all template helpers from extensions
   */
  getTemplateHelpers(): Record<string, TemplateHelper> {
    const helpers: Record<string, TemplateHelper> = {};

    for (const extension of this.extensions.values()) {
      if (!extension.template?.helpers) continue;

      Object.assign(helpers, extension.template.helpers);
    }

    return helpers;
  }

  /**
   * Get all template filters from extensions
   */
  getTemplateFilters(): Record<string, TemplateFilter> {
    const filters: Record<string, TemplateFilter> = {};

    for (const extension of this.extensions.values()) {
      if (!extension.template?.filters) continue;

      Object.assign(filters, extension.template.filters);
    }

    return filters;
  }

  /**
   * Get all template partials from extensions
   */
  getTemplatePartials(): Record<string, string> {
    const partials: Record<string, string> = {};

    for (const extension of this.extensions.values()) {
      if (!extension.template?.partials) continue;

      Object.assign(partials, extension.template.partials);
    }

    return partials;
  }

  // ==========================================================================
  // Client Extensions
  // ==========================================================================

  /**
   * Get all client methods from extensions
   */
  getClientMethods(): Record<string, (...args: unknown[]) => unknown> {
    const methods: Record<string, (...args: unknown[]) => unknown> = {};

    for (const extension of this.extensions.values()) {
      if (!extension.client) continue;

      Object.assign(methods, extension.client);
    }

    return methods;
  }

  // ==========================================================================
  // Result Extensions
  // ==========================================================================

  /**
   * Apply result transformations
   */
  applyResultExtensions(
    generator: string,
    result: Record<string, unknown>
  ): Record<string, unknown> {
    const enhanced = { ...result };

    for (const extension of this.extensions.values()) {
      if (!extension.result) continue;

      const resultExt = extension.result[generator];
      if (!resultExt) continue;

      for (const [fieldName, definition] of Object.entries(resultExt)) {
        // Check if all dependencies are available
        const depsAvailable = definition.needs.every(
          (dep) => enhanced[dep] !== undefined
        );

        if (depsAvailable) {
          try {
            enhanced[fieldName] = definition.compute(enhanced);
          } catch (error) {
            console.error(
              `Failed to compute ${fieldName} in extension "${extension.name}":`,
              error
            );
          }
        }
      }
    }

    return enhanced;
  }

  // ==========================================================================
  // Middleware Registration
  // ==========================================================================

  private registerGeneratorMiddleware(extension: EnzymeExtension): void {
    if (!extension.generator) return;

    const generators = ['component', 'page', 'hook', 'service', 'slice', 'module', 'route'];

    for (const gen of generators) {
      const hooks = extension.generator[gen as keyof typeof extension.generator] as GeneratorHooks | undefined;
      if (hooks) {
        if (hooks.beforeGenerate) {
          this.middlewareChain.add(extension.name, `${gen}:beforeGenerate`, hooks.beforeGenerate);
        }
        if (hooks.afterGenerate) {
          this.middlewareChain.add(extension.name, `${gen}:afterGenerate`, hooks.afterGenerate);
        }
      }
    }
  }

  private registerFileMiddleware(extension: EnzymeExtension): void {
    if (!extension.file) return;

    const hooks = extension.file;
    if (hooks.beforeWrite) {
      this.middlewareChain.add(extension.name, 'file:beforeWrite', hooks.beforeWrite);
    }
    if (hooks.afterWrite) {
      this.middlewareChain.add(extension.name, 'file:afterWrite', hooks.afterWrite);
    }
  }

  /**
   * Clear all extensions
   */
  clear(): void {
    this.extensions.clear();
    this.middlewareChain.clear();
  }
}

// ============================================================================
// Middleware Chain (Socket.io/Express pattern)
// ============================================================================

type MiddlewareFunction = (...args: unknown[]) => Promise<unknown> | unknown;

/**
 * Middleware chain for ordered hook execution
 */
class MiddlewareChain {
  private chains: Map<string, Array<{ name: string; fn: MiddlewareFunction }>> = new Map();

  /**
   * Add middleware to a chain
   */
  add(extensionName: string, chainName: string, fn: MiddlewareFunction): void {
    if (!this.chains.has(chainName)) {
      this.chains.set(chainName, []);
    }

    this.chains.get(chainName)!.push({ name: extensionName, fn });
  }

  /**
   * Remove all middleware from an extension
   */
  remove(extensionName: string): void {
    for (const [chainName, middlewares] of this.chains) {
      this.chains.set(
        chainName,
        middlewares.filter((m) => m.name !== extensionName)
      );
    }
  }

  /**
   * Execute middleware chain
   */
  async execute(chainName: string, context: unknown): Promise<void> {
    const middlewares = this.chains.get(chainName) || [];

    for (const { name, fn } of middlewares) {
      try {
        await fn(context);
      } catch (error) {
        console.error(`Middleware "${name}" in chain "${chainName}" failed:`, error);
        throw error;
      }
    }
  }

  /**
   * Clear all chains
   */
  clear(): void {
    this.chains.clear();
  }
}

// ============================================================================
// Enzyme Client with $extends API
// ============================================================================

/**
 * Enzyme Client with Prisma-like $extends method
 */
export class EnzymeClient {
  private extensionManager: EnzymeExtensionManager;
  private config: Record<string, unknown>;

  constructor(config: Record<string, unknown> = {}) {
    this.extensionManager = new EnzymeExtensionManager();
    this.config = config;
  }

  /**
   * Extend the client with an extension (Prisma pattern)
   *
   * @example
   * const enzyme = new EnzymeClient()
   *   .$extends(loggingExtension)
   *   .$extends(validationExtension)
   *   .$extends(formattingExtension)
   */
  $extends(extension: EnzymeExtension): EnzymeClient {
    // Create a new client with the extension (immutable pattern)
    const newClient = new EnzymeClient(this.config);

    // Copy existing extensions
    for (const ext of this.extensionManager.getExtensions()) {
      newClient.extensionManager.register(ext);
    }

    // Add new extension
    newClient.extensionManager.register(extension);

    // Add client methods from extension
    if (extension.client) {
      for (const [name, method] of Object.entries(extension.client)) {
        (newClient as any)[name] = method.bind(newClient);
      }
    }

    return newClient;
  }

  /**
   * Get the extension manager
   */
  get extensions(): EnzymeExtensionManager {
    return this.extensionManager;
  }

  /**
   * Execute generator hooks
   */
  async executeHooks<T>(
    hookName: keyof GeneratorHooks,
    generator: string,
    context: GeneratorHookContext
  ): Promise<T | void> {
    return this.extensionManager.executeGeneratorHooks<T>(hookName, generator, context);
  }

  /**
   * Execute file hooks
   */
  async executeFileHooks(
    hookName: keyof FileExtension,
    context: FileHookContext
  ): Promise<void> {
    return this.extensionManager.executeFileHooks(hookName, context);
  }

  /**
   * Apply result extensions
   */
  applyResultExtensions(
    generator: string,
    result: Record<string, unknown>
  ): Record<string, unknown> {
    return this.extensionManager.applyResultExtensions(generator, result);
  }

  /**
   * Validate using extension validators
   */
  async validate(generator: string, context: GeneratorHookContext): Promise<ValidationResult> {
    return this.extensionManager.executeValidation(generator, context);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new extension manager
 */
export function createExtensionManager(): EnzymeExtensionManager {
  return new EnzymeExtensionManager();
}

/**
 * Create a new Enzyme client
 */
export function createEnzymeClient(config?: Record<string, unknown>): EnzymeClient {
  return new EnzymeClient(config);
}

/**
 * Define an extension with type inference (exported for convenience)
 */
export function defineExtension<T extends EnzymeExtension>(extension: T): T {
  return extension;
}
