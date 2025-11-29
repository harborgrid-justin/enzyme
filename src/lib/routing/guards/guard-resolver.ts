/**
 * @file Guard Resolver
 * @description Resolves and executes route guards before navigation. Manages
 * the complete guard lifecycle including registration, execution, and result handling.
 *
 * @module @/lib/routing/guards/guard-resolver
 *
 * This module provides:
 * - Guard registration and management
 * - Guard execution ordering
 * - Result handling and aggregation
 * - Navigation blocking and redirects
 * - Guard lifecycle hooks
 *
 * @example
 * ```typescript
 * import { GuardResolver, createGuardResolver } from '@/lib/routing/guards/guard-resolver';
 *
 * const resolver = createGuardResolver();
 * resolver.register(authGuard);
 * resolver.register(roleGuard);
 *
 * const result = await resolver.resolve('/admin/users', context);
 * if (result.canProceed) {
 *   // Navigate to route
 * } else {
 *   // Handle redirect or denial
 * }
 * ```
 */

import {
  GuardResult,
  type GuardContext,
  type GuardResultObject,
  type GuardTiming,
  type RouteGuard,
  type GuardExecutionResult,
  createGuardContext,
} from './route-guard';

// =============================================================================
// Types
// =============================================================================

/**
 * Guard resolver configuration
 */
export interface GuardResolverConfig {
  /** Default timeout for guard execution (ms) */
  readonly defaultTimeout?: number;
  /** Execute guards in parallel when possible */
  readonly parallelExecution?: boolean;
  /** Stop on first denial */
  readonly stopOnDenial?: boolean;
  /** Global guards applied to all routes */
  readonly globalGuards?: readonly RouteGuard[];
  /** Hook called before guard execution */
  readonly onBeforeGuard?: (guard: RouteGuard, context: GuardContext) => void | Promise<void>;
  /** Hook called after guard execution */
  readonly onAfterGuard?: (
    guard: RouteGuard,
    result: GuardExecutionResult,
    context: GuardContext
  ) => void | Promise<void>;
  /** Hook called when navigation is blocked */
  readonly onNavigationBlocked?: (
    result: GuardResolutionResult,
    context: GuardContext
  ) => void | Promise<void>;
  /** Feature flag for resolver */
  readonly featureFlag?: string;
}

/**
 * Guard registration options
 */
export interface GuardRegistrationOptions {
  /** Routes to apply guard to */
  readonly routes?: readonly string[];
  /** Routes to exclude */
  readonly exclude?: readonly string[];
  /** Guard timing overrides */
  readonly timing?: GuardTiming;
  /** Priority override */
  readonly priority?: number;
}

/**
 * Guard resolution result
 */
export interface GuardResolutionResult {
  /** Whether navigation can proceed */
  readonly canProceed: boolean;
  /** Final result (allow, deny, or redirect) */
  readonly result: GuardResultObject;
  /** All executed guard results */
  readonly guardResults: readonly GuardExecutionResult[];
  /** Guards that passed */
  readonly passedGuards: readonly string[];
  /** Guards that failed */
  readonly failedGuards: readonly string[];
  /** Guards that were skipped */
  readonly skippedGuards: readonly string[];
  /** Total resolution time (ms) */
  readonly totalTimeMs: number;
  /** Redirect path (if applicable) */
  readonly redirectTo?: string;
  /** Denial reasons (if applicable) */
  readonly denialReasons: readonly string[];
}

/**
 * Registered guard with metadata
 */
export interface RegisteredGuard {
  /** Guard instance */
  readonly guard: RouteGuard;
  /** Registration options */
  readonly options: GuardRegistrationOptions;
  /** Registration ID */
  readonly id: string;
  /** Registration timestamp */
  readonly registeredAt: number;
}

/**
 * Navigation intent for guard resolution
 */
export interface NavigationIntent {
  /** Target path */
  readonly to: string;
  /** Source path (if navigating from another route) */
  readonly from?: string;
  /** Route parameters */
  readonly params?: Record<string, string>;
  /** Query parameters */
  readonly query?: Record<string, string>;
  /** Navigation state */
  readonly state?: unknown;
  /** Whether this is initial load */
  readonly isInitialLoad?: boolean;
  /** User context */
  readonly user?: GuardContext['user'];
  /** Feature flags */
  readonly features?: Record<string, boolean>;
}

/**
 * Guard resolver state
 */
export interface GuardResolverState {
  /** All registered guards */
  readonly guards: readonly RegisteredGuard[];
  /** Currently resolving */
  readonly isResolving: boolean;
  /** Last resolution result */
  readonly lastResult: GuardResolutionResult | null;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default resolver configuration
 */
export const DEFAULT_RESOLVER_CONFIG: GuardResolverConfig = {
  defaultTimeout: 30000,
  parallelExecution: false,
  stopOnDenial: true,
};

// =============================================================================
// GuardResolver Class
// =============================================================================

/**
 * Resolves route guards before navigation
 *
 * @example
 * ```typescript
 * const resolver = new GuardResolver();
 *
 * // Register guards
 * resolver.register(authGuard);
 * resolver.register(adminGuard, { routes: ['/admin/**'] });
 *
 * // Resolve before navigation
 * const result = await resolver.resolve({
 *   to: '/admin/dashboard',
 *   user: currentUser,
 * });
 *
 * if (result.canProceed) {
 *   router.navigate(result.result.data?.path ?? intent.to);
 * } else if (result.redirectTo) {
 *   router.navigate(result.redirectTo);
 * }
 * ```
 */
export class GuardResolver {
  private readonly config: GuardResolverConfig;
  private guards: Map<string, RegisteredGuard> = new Map();
  private globalGuards: RouteGuard[] = [];
  private idCounter = 0;
  private isResolving = false;
  private lastResult: GuardResolutionResult | null = null;

  constructor(config: GuardResolverConfig = {}) {
    this.config = { ...DEFAULT_RESOLVER_CONFIG, ...config };

    // Register global guards
    if (config.globalGuards) {
      for (const guard of config.globalGuards) {
        this.globalGuards.push(guard);
      }
    }
  }

  /**
   * Register a guard
   *
   * @param guard - Guard to register
   * @param options - Registration options
   * @returns Registration ID
   */
  register(guard: RouteGuard, options: GuardRegistrationOptions = {}): string {
    const id = `guard_${++this.idCounter}_${guard.name}`;

    const registered: RegisteredGuard = {
      guard,
      options,
      id,
      registeredAt: Date.now(),
    };

    this.guards.set(id, registered);
    return id;
  }

  /**
   * Unregister a guard
   *
   * @param id - Registration ID
   * @returns True if guard was found and removed
   */
  unregister(id: string): boolean {
    return this.guards.delete(id);
  }

  /**
   * Unregister a guard by name
   *
   * @param name - Guard name
   * @returns Number of guards removed
   */
  unregisterByName(name: string): number {
    let count = 0;
    for (const [id, registered] of this.guards) {
      if (registered.guard.name === name) {
        this.guards.delete(id);
        count++;
      }
    }
    return count;
  }

  /**
   * Resolve guards for a navigation intent
   *
   * @param intent - Navigation intent
   * @returns Resolution result
   */
  async resolve(intent: NavigationIntent): Promise<GuardResolutionResult> {
    this.isResolving = true;

    try {
      // Build context
      const context = createGuardContext({
        path: intent.to,
        params: intent.params ?? {},
        query: intent.query ?? {},
        currentRoute: intent.from,
        nextRoute: intent.to,
        user: intent.user,
        features: intent.features,
        state: intent.state,
        isInitialLoad: intent.isInitialLoad ?? false,
      });

      // Get applicable guards
      const applicableGuards = this.getApplicableGuards(intent.to);

      // Sort by priority
      const sortedGuards = [...applicableGuards].sort(
        (a, b) => (a.guard.priority ?? 100) - (b.guard.priority ?? 100)
      );

      // Execute guards
      const result = await this.executeGuards(sortedGuards, 'canActivate', context);

      this.lastResult = result;

      // Call blocked hook if navigation is blocked
      if (!result.canProceed && this.config.onNavigationBlocked) {
        await this.config.onNavigationBlocked(result, context);
      }

      return result;
    } finally {
      this.isResolving = false;
    }
  }

  /**
   * Resolve guards for deactivation (leaving a route)
   *
   * @param intent - Navigation intent (from = current route)
   * @returns Resolution result
   */
  async resolveDeactivation(intent: NavigationIntent): Promise<GuardResolutionResult> {
    if (intent.from === null || intent.from === undefined || intent.from === '') {
      return {
        canProceed: true,
        result: GuardResult.allow(),
        guardResults: [],
        passedGuards: [],
        failedGuards: [],
        skippedGuards: [],
        totalTimeMs: 0,
        denialReasons: [],
      };
    }

    this.isResolving = true;

    try {
      const context = createGuardContext({
        path: intent.from,
        params: intent.params ?? {},
        query: intent.query ?? {},
        currentRoute: intent.from,
        nextRoute: intent.to,
        user: intent.user,
        features: intent.features,
        state: intent.state,
        isInitialLoad: false,
      });

      // Get guards for the route being left
      const applicableGuards = this.getApplicableGuards(intent.from);

      // Execute canDeactivate
      const result = await this.executeGuards(applicableGuards, 'canDeactivate', context);

      return result;
    } finally {
      this.isResolving = false;
    }
  }

  /**
   * Get guards applicable to a path
   */
  private getApplicableGuards(path: string): RegisteredGuard[] {
    const applicable: RegisteredGuard[] = [];

    // Add global guards first
    for (const guard of this.globalGuards) {
      if (guard.appliesTo(path)) {
        applicable.push({
          guard,
          options: {},
          id: `global_${guard.name}`,
          registeredAt: 0,
        });
      }
    }

    // Add registered guards
    for (const registered of this.guards.values()) {
      if (this.guardAppliesToPath(registered, path)) {
        applicable.push(registered);
      }
    }

    return applicable;
  }

  /**
   * Check if a registered guard applies to a path
   */
  private guardAppliesToPath(registered: RegisteredGuard, path: string): boolean {
    const { guard, options } = registered;

    // Check exclusions first
    if (options.exclude) {
      for (const pattern of options.exclude) {
        if (this.matchPattern(pattern, path)) {
          return false;
        }
      }
    }

    // Check inclusions
    if (options.routes && options.routes.length > 0) {
      for (const pattern of options.routes) {
        if (this.matchPattern(pattern, path)) {
          return true;
        }
      }
      return false;
    }

    // Fall back to guard's own appliesTo
    return guard.appliesTo(path);
  }

  /**
   * Match a glob pattern
   */
  private matchPattern(pattern: string, path: string): boolean {
    const regexStr = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '{{GLOBSTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/\{\{GLOBSTAR\}\}/g, '.*');

    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(path);
  }

  /**
   * Execute guards with timing
   */
  private async executeGuards(
    guards: readonly RegisteredGuard[],
    timing: GuardTiming,
    context: GuardContext
  ): Promise<GuardResolutionResult> {
    const startTime = Date.now();
    const guardResults: GuardExecutionResult[] = [];
    const passedGuards: string[] = [];
    const failedGuards: string[] = [];
    const skippedGuards: string[] = [];
    const denialReasons: string[] = [];
    let finalResult: GuardResultObject = GuardResult.allow();

    if (this.config.parallelExecution === true) {
      // Parallel execution
      const promises = guards.map(async (registered) => {
        return this.executeSingleGuard(registered.guard, timing, context);
      });

      const results = await Promise.all(promises);

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result === undefined) continue;
        const guardInfo = guards[i];
        if (guardInfo === undefined) continue;
        const {guard} = guardInfo;

        guardResults.push(result);

        if (result.result.type === 'allow') {
          passedGuards.push(guard.name);
        } else {
          failedGuards.push(guard.name);
          if (result.result.reason !== undefined && result.result.reason !== null && result.result.reason !== '') {
            denialReasons.push(result.result.reason);
          }
          if (finalResult.type === 'allow') {
            finalResult = result.result;
          }
        }
      }
    } else {
      // Sequential execution
      for (const registered of guards) {
        const result = await this.executeSingleGuard(registered.guard, timing, context);
        guardResults.push(result);

        if (result.result.type === 'allow') {
          passedGuards.push(registered.guard.name);
        } else {
          failedGuards.push(registered.guard.name);
          if (result.result.reason !== undefined && result.result.reason !== null && result.result.reason !== '') {
            denialReasons.push(result.result.reason);
          }

          // Update final result
          if (finalResult.type === 'allow') {
            finalResult = result.result;
          }

          // Stop on denial if configured
          if (this.config.stopOnDenial === true) {
            // Mark remaining guards as skipped
            const remaining = guards.slice(guards.indexOf(registered) + 1);
            for (const r of remaining) {
              skippedGuards.push(r.guard.name);
            }
            break;
          }
        }
      }
    }

    const canProceed = failedGuards.length === 0;
    const redirectTo = finalResult.type === 'redirect' ? finalResult.redirectTo : undefined;

    return {
      canProceed,
      result: canProceed ? GuardResult.allow() : finalResult,
      guardResults: Object.freeze(guardResults),
      passedGuards: Object.freeze(passedGuards),
      failedGuards: Object.freeze(failedGuards),
      skippedGuards: Object.freeze(skippedGuards),
      totalTimeMs: Date.now() - startTime,
      redirectTo,
      denialReasons: Object.freeze(denialReasons),
    };
  }

  /**
   * Execute a single guard
   */
  private async executeSingleGuard(
    guard: RouteGuard,
    timing: GuardTiming,
    context: GuardContext
  ): Promise<GuardExecutionResult> {
    const startTime = Date.now();

    // Before hook
    if (this.config.onBeforeGuard) {
      await this.config.onBeforeGuard(guard, context);
    }

    try {
      const timeout = this.config.defaultTimeout ?? 30000;

      const result = await Promise.race([
        guard.execute(timing, context),
        new Promise<GuardResultObject>((_, reject) =>
          setTimeout(() => reject(new Error('Guard timeout')), timeout)
        ),
      ]);

      const execResult: GuardExecutionResult = {
        guardName: guard.name,
        result,
        durationMs: Date.now() - startTime,
        timedOut: false,
      };

      // After hook
      if (this.config.onAfterGuard) {
        await this.config.onAfterGuard(guard, execResult, context);
      }

      return execResult;
    } catch (error) {
      const isTimeout = (error as Error).message === 'Guard timeout';

      const execResult: GuardExecutionResult = {
        guardName: guard.name,
        result: GuardResult.deny(isTimeout ? 'Guard timed out' : (error as Error).message),
        durationMs: Date.now() - startTime,
        timedOut: isTimeout,
        error: error as Error,
      };

      if (this.config.onAfterGuard) {
        await this.config.onAfterGuard(guard, execResult, context);
      }

      return execResult;
    }
  }

  /**
   * Get resolver state
   */
  getState(): GuardResolverState {
    return {
      guards: Array.from(this.guards.values()),
      isResolving: this.isResolving,
      lastResult: this.lastResult,
    };
  }

  /**
   * Get all registered guards
   */
  getGuards(): readonly RegisteredGuard[] {
    return Array.from(this.guards.values());
  }

  /**
   * Get a specific guard by ID
   */
  getGuard(id: string): RegisteredGuard | undefined {
    return this.guards.get(id);
  }

  /**
   * Clear all guards
   */
  clearAll(): void {
    this.guards.clear();
    this.globalGuards = [];
    this.lastResult = null;
  }

  /**
   * Check if currently resolving
   */
  getIsResolving(): boolean {
    return this.isResolving;
  }

  /**
   * Get last resolution result
   */
  getLastResult(): GuardResolutionResult | null {
    return this.lastResult;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a guard resolver
 *
 * @param config - Resolver configuration
 * @returns GuardResolver instance
 */
export function createGuardResolver(config: GuardResolverConfig = {}): GuardResolver {
  return new GuardResolver(config);
}

// =============================================================================
// Singleton Instance
// =============================================================================

let defaultResolver: GuardResolver | null = null;

/**
 * Get the default guard resolver
 */
export function getGuardResolver(): GuardResolver {
  defaultResolver ??= new GuardResolver();
  return defaultResolver;
}

/**
 * Initialize the default guard resolver
 *
 * @param config - Resolver configuration
 */
export function initGuardResolver(config: GuardResolverConfig = {}): void {
  defaultResolver = new GuardResolver(config);
}

/**
 * Reset the default guard resolver
 */
export function resetGuardResolver(): void {
  defaultResolver?.clearAll();
  defaultResolver = null;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for GuardResolutionResult
 */
export function isGuardResolutionResult(value: unknown): value is GuardResolutionResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'canProceed' in value &&
    'result' in value &&
    'guardResults' in value &&
    'passedGuards' in value
  );
}

/**
 * Type guard for NavigationIntent
 */
export function isNavigationIntent(value: unknown): value is NavigationIntent {
  return (
    typeof value === 'object' &&
    value !== null &&
    'to' in value &&
    typeof (value as NavigationIntent).to === 'string'
  );
}
