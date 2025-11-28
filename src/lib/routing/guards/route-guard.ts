/**
 * @file Base Route Guard Interface and Types
 * @description Defines the core route guard interface and types for implementing
 * navigation guards. Inspired by Angular route guards with React adaptations.
 *
 * @module @/lib/routing/guards/route-guard
 *
 * This module provides:
 * - Base guard interface definition
 * - Guard result types
 * - Guard context structure
 * - Guard execution utilities
 * - Type-safe guard creation
 *
 * @example
 * ```typescript
 * import { RouteGuard, createGuard, GuardResult } from '@/lib/routing/guards/route-guard';
 *
 * const myGuard = createGuard({
 *   name: 'myGuard',
 *   canActivate: async (context) => {
 *     if (someCondition) {
 *       return GuardResult.allow();
 *     }
 *     return GuardResult.redirect('/login');
 *   },
 * });
 * ```
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Guard execution timing
 */
export type GuardTiming =
  | 'canActivate'      // Before route activation
  | 'canDeactivate'    // Before leaving route
  | 'canMatch'         // Before route matching
  | 'canLoad';         // Before lazy loading

/**
 * Guard result type
 */
export type GuardResultType =
  | 'allow'      // Allow navigation
  | 'deny'       // Block navigation
  | 'redirect'   // Redirect to another route
  | 'pending';   // Guard is still processing

/**
 * Guard result object
 */
export interface GuardResultObject {
  /** Result type */
  readonly type: GuardResultType;
  /** Redirect path (if type is 'redirect') */
  readonly redirectTo?: string;
  /** Redirect options */
  readonly redirectOptions?: RedirectOptions;
  /** Denial reason (if type is 'deny') */
  readonly reason?: string;
  /** Additional data */
  readonly data?: Record<string, unknown>;
}

/**
 * Redirect options
 */
export interface RedirectOptions {
  /** Replace current history entry */
  readonly replace?: boolean;
  /** State to pass to redirect target */
  readonly state?: unknown;
  /** Query parameters */
  readonly query?: Record<string, string>;
  /** Preserve current query parameters */
  readonly preserveQuery?: boolean;
}

/**
 * Guard context passed to guard functions
 */
export interface GuardContext {
  /** Target route path */
  readonly path: string;
  /** Route parameters */
  readonly params: Record<string, string>;
  /** Query parameters */
  readonly query: Record<string, string>;
  /** Current route (for canDeactivate) */
  readonly currentRoute?: string;
  /** Next route (for canDeactivate) */
  readonly nextRoute?: string;
  /** User context */
  readonly user?: GuardUser;
  /** Feature flags */
  readonly features?: Record<string, boolean>;
  /** Custom data from route or parent guards */
  readonly data: Record<string, unknown>;
  /** Navigation state */
  readonly state?: unknown;
  /** Whether this is initial load */
  readonly isInitialLoad: boolean;
  /** Parent route context (for nested routes) */
  readonly parent?: GuardContext;
}

/**
 * User context for guards
 */
export interface GuardUser {
  /** User ID */
  readonly id: string;
  /** Whether user is authenticated */
  readonly isAuthenticated: boolean;
  /** User roles */
  readonly roles: readonly string[];
  /** User permissions */
  readonly permissions: readonly string[];
  /** User metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Guard function signature
 */
export type GuardFunction = (
  context: GuardContext
) => GuardResultObject | Promise<GuardResultObject>;

/**
 * Guard configuration
 */
export interface GuardConfig {
  /** Unique guard name */
  readonly name: string;
  /** Guard description */
  readonly description?: string;
  /** Guard timing */
  readonly timing?: GuardTiming;
  /** Guard priority (lower = runs first) */
  readonly priority?: number;
  /** Whether guard is async */
  readonly async?: boolean;
  /** Timeout in milliseconds */
  readonly timeout?: number;
  /** Routes this guard applies to (glob patterns) */
  readonly routes?: readonly string[];
  /** Routes to exclude (glob patterns) */
  readonly exclude?: readonly string[];
  /** Whether guard is enabled */
  readonly enabled?: boolean;
  /** Feature flag for this guard */
  readonly featureFlag?: string;
  /** canActivate implementation */
  readonly canActivate?: GuardFunction;
  /** canDeactivate implementation */
  readonly canDeactivate?: GuardFunction;
  /** canMatch implementation */
  readonly canMatch?: GuardFunction;
  /** canLoad implementation */
  readonly canLoad?: GuardFunction;
}

/**
 * Route guard interface
 */
export interface RouteGuard extends GuardConfig {
  /** Execute the guard */
  execute: (timing: GuardTiming, context: GuardContext) => Promise<GuardResultObject>;
  /** Check if guard applies to a route */
  appliesTo: (path: string) => boolean;
}

/**
 * Guard execution result
 */
export interface GuardExecutionResult {
  /** Guard name */
  readonly guardName: string;
  /** Result from guard */
  readonly result: GuardResultObject;
  /** Execution duration (ms) */
  readonly durationMs: number;
  /** Whether guard timed out */
  readonly timedOut: boolean;
  /** Error if guard threw */
  readonly error?: Error;
}

// =============================================================================
// GuardResult Helper Class
// =============================================================================

/**
 * Helper class for creating guard results
 *
 * @example
 * ```typescript
 * // Allow navigation
 * return GuardResult.allow();
 *
 * // Deny with reason
 * return GuardResult.deny('Insufficient permissions');
 *
 * // Redirect
 * return GuardResult.redirect('/login', { replace: true });
 * ```
 */
export class GuardResult {
  /**
   * Allow navigation
   *
   * @param data - Optional data to pass along
   * @returns Allow result
   */
  static allow(data?: Record<string, unknown>): GuardResultObject {
    return {
      type: 'allow',
      data,
    };
  }

  /**
   * Deny navigation
   *
   * @param reason - Reason for denial
   * @param data - Optional data
   * @returns Deny result
   */
  static deny(reason?: string, data?: Record<string, unknown>): GuardResultObject {
    return {
      type: 'deny',
      reason,
      data,
    };
  }

  /**
   * Redirect to another route
   *
   * @param path - Path to redirect to
   * @param options - Redirect options
   * @returns Redirect result
   */
  static redirect(path: string, options?: RedirectOptions): GuardResultObject {
    return {
      type: 'redirect',
      redirectTo: path,
      redirectOptions: options,
    };
  }

  /**
   * Pending result (guard is still processing)
   *
   * @returns Pending result
   */
  static pending(): GuardResultObject {
    return {
      type: 'pending',
    };
  }

  /**
   * Create result from boolean
   *
   * @param allowed - Whether navigation is allowed
   * @param denyReason - Reason if denied
   * @returns Result based on boolean
   */
  static fromBoolean(allowed: boolean, denyReason?: string): GuardResultObject {
    return allowed
      ? GuardResult.allow()
      : GuardResult.deny(denyReason ?? 'Access denied');
  }

  /**
   * Check if result allows navigation
   *
   * @param result - Result to check
   * @returns True if result allows navigation
   */
  static isAllowed(result: GuardResultObject): boolean {
    return result.type === 'allow';
  }

  /**
   * Check if result denies navigation
   *
   * @param result - Result to check
   * @returns True if result denies navigation
   */
  static isDenied(result: GuardResultObject): boolean {
    return result.type === 'deny';
  }

  /**
   * Check if result is a redirect
   *
   * @param result - Result to check
   * @returns True if result is a redirect
   */
  static isRedirect(result: GuardResultObject): boolean {
    return result.type === 'redirect';
  }
}

// =============================================================================
// BaseRouteGuard Class
// =============================================================================

/**
 * Base class for route guards
 *
 * @example
 * ```typescript
 * class MyGuard extends BaseRouteGuard {
 *   constructor() {
 *     super({
 *       name: 'myGuard',
 *       canActivate: async (ctx) => {
 *         return GuardResult.allow();
 *       },
 *     });
 *   }
 * }
 * ```
 */
export class BaseRouteGuard implements RouteGuard {
  readonly name: string;
  readonly description?: string;
  readonly timing?: GuardTiming;
  readonly priority: number;
  readonly async: boolean;
  readonly timeout: number;
  readonly routes?: readonly string[];
  readonly exclude?: readonly string[];
  readonly enabled: boolean;
  readonly featureFlag?: string;
  readonly canActivate?: GuardFunction;
  readonly canDeactivate?: GuardFunction;
  readonly canMatch?: GuardFunction;
  readonly canLoad?: GuardFunction;

  constructor(config: GuardConfig) {
    this.name = config.name;
    this.description = config.description;
    this.timing = config.timing;
    this.priority = config.priority ?? 100;
    this.async = config.async ?? true;
    this.timeout = config.timeout ?? 30000;
    this.routes = config.routes;
    this.exclude = config.exclude;
    this.enabled = config.enabled ?? true;
    this.featureFlag = config.featureFlag;
    this.canActivate = config.canActivate;
    this.canDeactivate = config.canDeactivate;
    this.canMatch = config.canMatch;
    this.canLoad = config.canLoad;
  }

  /**
   * Execute the guard for a specific timing
   */
  async execute(timing: GuardTiming, context: GuardContext): Promise<GuardResultObject> {
    if (!this.enabled) {
      return GuardResult.allow();
    }

    if (!this.appliesTo(context.path)) {
      return GuardResult.allow();
    }

    const handler = this.getHandler(timing);
    if (!handler) {
      return GuardResult.allow();
    }

    try {
      const result = await this.executeWithTimeout(handler, context);
      return result;
    } catch (error) {
      console.error(`Guard "${this.name}" threw an error:`, error);
      return GuardResult.deny(`Guard error: ${(error as Error).message}`);
    }
  }

  /**
   * Get the handler for a timing
   */
  private getHandler(timing: GuardTiming): GuardFunction | undefined {
    switch (timing) {
      case 'canActivate':
        return this.canActivate;
      case 'canDeactivate':
        return this.canDeactivate;
      case 'canMatch':
        return this.canMatch;
      case 'canLoad':
        return this.canLoad;
      default:
        return undefined;
    }
  }

  /**
   * Execute handler with timeout
   */
  private async executeWithTimeout(
    handler: GuardFunction,
    context: GuardContext
  ): Promise<GuardResultObject> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Guard "${this.name}" timed out after ${this.timeout}ms`));
      }, this.timeout);

      Promise.resolve(handler(context))
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Check if guard applies to a route
   */
  appliesTo(path: string): boolean {
    // Check exclusions first
    if (this.exclude) {
      for (const pattern of this.exclude) {
        if (this.matchPattern(pattern, path)) {
          return false;
        }
      }
    }

    // Check inclusions
    if (this.routes && this.routes.length > 0) {
      for (const pattern of this.routes) {
        if (this.matchPattern(pattern, path)) {
          return true;
        }
      }
      return false;
    }

    // No route restrictions = applies to all
    return true;
  }

  /**
   * Match a glob pattern against a path
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
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a route guard
 *
 * @param config - Guard configuration
 * @returns Route guard instance
 */
export function createGuard(config: GuardConfig): RouteGuard {
  return new BaseRouteGuard(config);
}

/**
 * Create a guard context
 *
 * @param options - Context options
 * @returns Guard context
 */
export function createGuardContext(
  options: Partial<GuardContext> & { path: string }
): GuardContext {
  return {
    path: options.path,
    params: options.params ?? {},
    query: options.query ?? {},
    currentRoute: options.currentRoute,
    nextRoute: options.nextRoute,
    user: options.user,
    features: options.features,
    data: options.data ?? {},
    state: options.state,
    isInitialLoad: options.isInitialLoad ?? false,
    parent: options.parent,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Merge guard results (returns first non-allow result)
 *
 * @param results - Array of guard results
 * @returns Merged result
 */
export function mergeGuardResults(results: readonly GuardResultObject[]): GuardResultObject {
  for (const result of results) {
    if (result.type !== 'allow') {
      return result;
    }
  }
  return GuardResult.allow();
}

/**
 * Check if all results allow navigation
 *
 * @param results - Array of guard results
 * @returns True if all allow
 */
export function allResultsAllow(results: readonly GuardResultObject[]): boolean {
  return results.every(r => r.type === 'allow');
}

/**
 * Get the first redirect result
 *
 * @param results - Array of guard results
 * @returns First redirect result or undefined
 */
export function getFirstRedirect(results: readonly GuardResultObject[]): GuardResultObject | undefined {
  return results.find(r => r.type === 'redirect');
}

/**
 * Get all denial reasons
 *
 * @param results - Array of guard results
 * @returns Array of denial reasons
 */
export function getDenialReasons(results: readonly GuardResultObject[]): string[] {
  return results
    .filter(r => r.type === 'deny' && r.reason)
    .map(r => r.reason!);
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for GuardResultObject
 */
export function isGuardResult(value: unknown): value is GuardResultObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    ['allow', 'deny', 'redirect', 'pending'].includes((value as GuardResultObject).type)
  );
}

/**
 * Type guard for RouteGuard
 */
export function isRouteGuard(value: unknown): value is RouteGuard {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'execute' in value &&
    'appliesTo' in value
  );
}

/**
 * Type guard for GuardContext
 */
export function isGuardContext(value: unknown): value is GuardContext {
  return (
    typeof value === 'object' &&
    value !== null &&
    'path' in value &&
    'params' in value &&
    'data' in value
  );
}
