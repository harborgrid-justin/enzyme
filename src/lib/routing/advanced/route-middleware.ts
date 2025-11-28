/**
 * @file Per-Route Middleware Chain
 * @description Implements middleware chain patterns for route-level processing.
 * Enables authentication, logging, analytics, and other cross-cutting concerns.
 *
 * @module @/lib/routing/advanced/route-middleware
 *
 * This module provides:
 * - Middleware chain definitions
 * - Execution order control
 * - Async middleware support
 * - Error handling in chains
 * - Middleware composition
 *
 * @example
 * ```typescript
 * import { MiddlewareChain, createMiddleware } from '@/lib/routing/advanced/route-middleware';
 *
 * const chain = new MiddlewareChain()
 *   .use(loggingMiddleware)
 *   .use(authMiddleware)
 *   .use(analyticsMiddleware);
 *
 * await chain.execute(context);
 * ```
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Middleware function signature
 */
export type MiddlewareFunction<TContext = MiddlewareContext> = (
  context: TContext,
  next: NextFunction
) => void | Promise<void>;

/**
 * Next function to continue chain execution
 */
export type NextFunction = () => void | Promise<void>;

/**
 * Middleware context
 */
export interface MiddlewareContext {
  /** Current route path */
  readonly path: string;
  /** Route parameters */
  readonly params: Record<string, string>;
  /** Query parameters */
  readonly query: Record<string, string>;
  /** Request headers (if available) */
  readonly headers?: Record<string, string>;
  /** User context (if authenticated) */
  readonly user?: MiddlewareUser;
  /** Request timestamp */
  readonly timestamp: number;
  /** Unique request ID */
  readonly requestId: string;
  /** Custom data store */
  data: Record<string, unknown>;
  /** Response controls */
  response: MiddlewareResponse;
}

/**
 * User context in middleware
 */
export interface MiddlewareUser {
  /** User ID */
  readonly id: string;
  /** User roles */
  readonly roles: readonly string[];
  /** User permissions */
  readonly permissions: readonly string[];
  /** Session data */
  readonly session?: Record<string, unknown>;
}

/**
 * Response controls in middleware
 */
export interface MiddlewareResponse {
  /** Redirect to another path */
  redirect: (path: string, options?: { status?: number }) => void;
  /** Send error response */
  error: (status: number, message: string) => void;
  /** Set response header */
  setHeader: (name: string, value: string) => void;
  /** Whether response has been sent */
  readonly sent: boolean;
  /** Response status code */
  readonly status: number | null;
  /** Response headers */
  readonly headers: Record<string, string>;
  /** Redirect target (if redirected) */
  readonly redirectTarget: string | null;
  /** Error message (if error) */
  readonly errorMessage: string | null;
}

/**
 * Middleware configuration
 */
export interface MiddlewareConfig {
  /** Middleware name (for debugging) */
  readonly name: string;
  /** Middleware function */
  readonly handler: MiddlewareFunction;
  /** Priority (lower = runs first) */
  readonly priority?: number;
  /** Routes to apply to (glob patterns) */
  readonly routes?: readonly string[];
  /** Routes to exclude (glob patterns) */
  readonly exclude?: readonly string[];
  /** Whether middleware is enabled */
  readonly enabled?: boolean;
  /** Timeout in ms */
  readonly timeout?: number;
  /** Feature flag for this middleware */
  readonly featureFlag?: string;
}

/**
 * Registered middleware
 */
export interface RegisteredMiddleware extends MiddlewareConfig {
  /** Unique middleware ID */
  readonly id: string;
  /** Registration timestamp */
  readonly registeredAt: number;
}

/**
 * Chain execution result
 */
export interface ChainExecutionResult {
  /** Whether chain completed successfully */
  readonly success: boolean;
  /** Execution duration (ms) */
  readonly durationMs: number;
  /** Middleware that failed (if any) */
  readonly failedMiddleware: string | null;
  /** Error that occurred (if any) */
  readonly error: Error | null;
  /** Final response state */
  readonly response: Pick<MiddlewareResponse, 'sent' | 'status' | 'redirectTarget' | 'errorMessage'>;
  /** Middleware execution order */
  readonly executionOrder: readonly string[];
}

/**
 * Chain execution options
 */
export interface ChainExecutionOptions {
  /** Abort signal for cancellation */
  readonly signal?: AbortSignal;
  /** Skip specific middleware by name */
  readonly skip?: readonly string[];
  /** Only run specific middleware by name */
  readonly only?: readonly string[];
  /** Override timeout */
  readonly timeout?: number;
}

// =============================================================================
// Response Helper
// =============================================================================

/**
 * Create a middleware response object
 */
function createMiddlewareResponse(): MiddlewareResponse {
  let sent = false;
  let status: number | null = null;
  let redirectTarget: string | null = null;
  let errorMessage: string | null = null;
  const headers: Record<string, string> = {};

  return {
    redirect(path: string, options?: { status?: number }) {
      if (!sent) {
        sent = true;
        status = options?.status ?? 302;
        redirectTarget = path;
      }
    },
    error(statusCode: number, message: string) {
      if (!sent) {
        sent = true;
        status = statusCode;
        errorMessage = message;
      }
    },
    setHeader(name: string, value: string) {
      if (!sent) {
        headers[name] = value;
      }
    },
    get sent() { return sent; },
    get status() { return status; },
    get headers() { return { ...headers }; },
    get redirectTarget() { return redirectTarget; },
    get errorMessage() { return errorMessage; },
  };
}

/**
 * Create a middleware context
 */
export function createMiddlewareContext(
  options: Partial<Omit<MiddlewareContext, 'response' | 'data'>> & {
    path: string;
  }
): MiddlewareContext {
  return {
    path: options.path,
    params: options.params ?? {},
    query: options.query ?? {},
    headers: options.headers,
    user: options.user,
    timestamp: options.timestamp ?? Date.now(),
    requestId: options.requestId ?? generateRequestId(),
    data: {},
    response: createMiddlewareResponse(),
  };
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

// =============================================================================
// MiddlewareChain Class
// =============================================================================

/**
 * Manages a chain of middleware
 *
 * @example
 * ```typescript
 * const chain = new MiddlewareChain();
 *
 * chain
 *   .use(async (ctx, next) => {
 *     console.log('Before:', ctx.path);
 *     await next();
 *     console.log('After:', ctx.path);
 *   })
 *   .use(authMiddleware, { name: 'auth', priority: 1 });
 *
 * const result = await chain.execute(context);
 * ```
 */
export class MiddlewareChain {
  private middleware: RegisteredMiddleware[] = [];
  private idCounter = 0;
  private defaultTimeout = 30000;

  /**
   * Add middleware to the chain
   *
   * @param handler - Middleware function or config
   * @param options - Middleware options
   * @returns Chain for fluent API
   */
  use(
    handler: MiddlewareFunction | MiddlewareConfig,
    options?: Partial<Omit<MiddlewareConfig, 'handler'>>
  ): this {
    const id = `mw_${++this.idCounter}`;
    const config: MiddlewareConfig = typeof handler === 'function'
      ? { name: options?.name ?? `middleware_${id}`, handler, ...options }
      : handler;

    const registered: RegisteredMiddleware = {
      ...config,
      id,
      priority: config.priority ?? 100,
      enabled: config.enabled ?? true,
      registeredAt: Date.now(),
    };

    this.middleware.push(registered);

    // Keep sorted by priority
    this.middleware.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));

    return this;
  }

  /**
   * Remove middleware from the chain
   *
   * @param nameOrId - Middleware name or ID
   * @returns True if middleware was found and removed
   */
  remove(nameOrId: string): boolean {
    const index = this.middleware.findIndex(m => m.name === nameOrId || m.id === nameOrId);
    if (index !== -1) {
      this.middleware.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Execute the middleware chain
   *
   * @param context - Middleware context
   * @param options - Execution options
   * @returns Execution result
   */
  async execute(
    context: MiddlewareContext,
    options: ChainExecutionOptions = {}
  ): Promise<ChainExecutionResult> {
    const startTime = Date.now();
    const executionOrder: string[] = [];
    let failedMiddleware: string | null = null;
    let error: Error | null = null;

    // Filter middleware based on options and route matching
    const applicableMiddleware = this.middleware.filter(mw => {
      if (!mw.enabled) return false;
      if (options.skip?.includes(mw.name)) return false;
      if (options.only && !options.only.includes(mw.name)) return false;
      if (!this.matchesRoute(mw, context.path)) return false;
      return true;
    });

    // Build execution chain
    let index = 0;

    const executeNext = async (): Promise<void> => {
      // Check if response was sent (short-circuit)
      if (context.response.sent) {
        return;
      }

      // Check abort signal
      if (options.signal?.aborted) {
        throw new Error('Middleware chain aborted');
      }

      if (index >= applicableMiddleware.length) {
        return;
      }

      const current = applicableMiddleware[index++]!;
      executionOrder.push(current.name);

      const timeout = options.timeout ?? current.timeout ?? this.defaultTimeout;

      try {
        await this.executeWithTimeout(
          () => current.handler(context, executeNext),
          timeout,
          current.name
        );
      } catch (err) {
        failedMiddleware = current.name;
        throw err;
      }
    };

    try {
      await executeNext();
    } catch (err) {
      error = err as Error;
    }

    return {
      success: error === null && !context.response.errorMessage,
      durationMs: Date.now() - startTime,
      failedMiddleware,
      error,
      response: {
        sent: context.response.sent,
        status: context.response.status,
        redirectTarget: context.response.redirectTarget,
        errorMessage: context.response.errorMessage,
      },
      executionOrder: Object.freeze(executionOrder),
    };
  }

  /**
   * Execute a function with timeout
   */
  private async executeWithTimeout(
    fn: () => void | Promise<void>,
    timeout: number,
    name: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Middleware "${name}" timed out after ${timeout}ms`));
      }, timeout);

      Promise.resolve(fn())
        .then(() => {
          clearTimeout(timer);
          resolve();
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  /**
   * Check if middleware should run for a route
   */
  private matchesRoute(middleware: RegisteredMiddleware, path: string): boolean {
    // Check exclude patterns first
    if (middleware.exclude) {
      for (const pattern of middleware.exclude) {
        if (this.globMatch(pattern, path)) {
          return false;
        }
      }
    }

    // Check include patterns
    if (middleware.routes && middleware.routes.length > 0) {
      for (const pattern of middleware.routes) {
        if (this.globMatch(pattern, path)) {
          return true;
        }
      }
      return false;
    }

    return true;
  }

  /**
   * Simple glob pattern matching
   */
  private globMatch(pattern: string, path: string): boolean {
    const regexStr = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '{{GLOBSTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/\{\{GLOBSTAR\}\}/g, '.*');

    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(path);
  }

  /**
   * Get all registered middleware
   */
  getMiddleware(): readonly RegisteredMiddleware[] {
    return [...this.middleware];
  }

  /**
   * Get middleware by name
   */
  getByName(name: string): RegisteredMiddleware | undefined {
    return this.middleware.find(m => m.name === name);
  }

  /**
   * Set default timeout
   */
  setDefaultTimeout(timeout: number): this {
    this.defaultTimeout = timeout;
    return this;
  }

  /**
   * Clear all middleware
   */
  clear(): this {
    this.middleware = [];
    return this;
  }

  /**
   * Clone the chain
   */
  clone(): MiddlewareChain {
    const chain = new MiddlewareChain();
    chain.middleware = [...this.middleware];
    chain.defaultTimeout = this.defaultTimeout;
    return chain;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a middleware configuration
 *
 * @param config - Middleware configuration
 * @returns Validated configuration
 */
export function createMiddleware(config: MiddlewareConfig): MiddlewareConfig {
  return {
    ...config,
    priority: config.priority ?? 100,
    enabled: config.enabled ?? true,
    timeout: config.timeout ?? 30000,
    routes: config.routes ?? [],
    exclude: config.exclude ?? [],
  };
}

/**
 * Create a new middleware chain
 *
 * @returns Empty MiddlewareChain
 */
export function createMiddlewareChain(): MiddlewareChain {
  return new MiddlewareChain();
}

// =============================================================================
// Built-in Middleware Factories
// =============================================================================

/**
 * Create a logging middleware
 *
 * @param options - Logging options
 * @returns Logging middleware
 */
export function createLoggingMiddleware(options: {
  logger?: (message: string, data?: Record<string, unknown>) => void;
  logRequest?: boolean;
  logResponse?: boolean;
} = {}): MiddlewareConfig {
  const logger = options.logger ?? console.log;

  return createMiddleware({
    name: 'logging',
    priority: 0, // Run first
    handler: async (ctx, next) => {
      const start = Date.now();

      if (options.logRequest !== false) {
        logger(`[Request] ${ctx.path}`, {
          requestId: ctx.requestId,
          params: ctx.params,
          query: ctx.query,
        });
      }

      await next();

      if (options.logResponse !== false) {
        logger(`[Response] ${ctx.path}`, {
          requestId: ctx.requestId,
          duration: Date.now() - start,
          status: ctx.response.status,
          redirect: ctx.response.redirectTarget,
        });
      }
    },
  });
}

/**
 * Create an authentication check middleware
 *
 * @param options - Auth options
 * @returns Auth middleware
 */
export function createAuthMiddleware(options: {
  loginPath?: string;
  isPublic?: (path: string) => boolean;
} = {}): MiddlewareConfig {
  const loginPath = options.loginPath ?? '/login';
  const isPublic = options.isPublic ?? (() => false);

  return createMiddleware({
    name: 'auth',
    priority: 10,
    handler: async (ctx, next) => {
      if (isPublic(ctx.path)) {
        await next();
        return;
      }

      if (!ctx.user) {
        ctx.response.redirect(loginPath, { status: 302 });
        return;
      }

      await next();
    },
  });
}

/**
 * Create a role check middleware
 *
 * @param requiredRoles - Required roles
 * @returns Role middleware
 */
export function createRoleMiddleware(requiredRoles: readonly string[]): MiddlewareConfig {
  return createMiddleware({
    name: 'role-check',
    priority: 20,
    handler: async (ctx, next) => {
      if (!ctx.user) {
        ctx.response.error(401, 'Unauthorized');
        return;
      }

      const hasRole = requiredRoles.some(role => ctx.user!.roles.includes(role));
      if (!hasRole) {
        ctx.response.error(403, 'Forbidden');
        return;
      }

      await next();
    },
  });
}

/**
 * Create a rate limiting middleware
 *
 * @param options - Rate limit options
 * @returns Rate limit middleware
 */
export function createRateLimitMiddleware(options: {
  maxRequests: number;
  windowMs: number;
  keyFn?: (ctx: MiddlewareContext) => string;
} = { maxRequests: 100, windowMs: 60000 }): MiddlewareConfig {
  const requests = new Map<string, { count: number; resetAt: number }>();
  const keyFn = options.keyFn ?? ((ctx) => ctx.user?.id ?? ctx.requestId);

  return createMiddleware({
    name: 'rate-limit',
    priority: 5,
    handler: async (ctx, next) => {
      const key = keyFn(ctx);
      const now = Date.now();

      let record = requests.get(key);
      if (!record || now > record.resetAt) {
        record = { count: 0, resetAt: now + options.windowMs };
        requests.set(key, record);
      }

      record.count++;

      ctx.response.setHeader('X-RateLimit-Limit', String(options.maxRequests));
      ctx.response.setHeader('X-RateLimit-Remaining', String(Math.max(0, options.maxRequests - record.count)));
      ctx.response.setHeader('X-RateLimit-Reset', String(record.resetAt));

      if (record.count > options.maxRequests) {
        ctx.response.error(429, 'Too Many Requests');
        return;
      }

      await next();
    },
  });
}

/**
 * Create an analytics middleware
 *
 * @param options - Analytics options
 * @returns Analytics middleware
 */
export function createAnalyticsMiddleware(options: {
  trackFn: (event: { path: string; timestamp: number; userId?: string; data?: Record<string, unknown> }) => void;
} = { trackFn: () => {} }): MiddlewareConfig {
  return createMiddleware({
    name: 'analytics',
    priority: 999, // Run last
    handler: async (ctx, next) => {
      await next();

      // Only track successful navigations
      if (!ctx.response.errorMessage) {
        options.trackFn({
          path: ctx.path,
          timestamp: ctx.timestamp,
          userId: ctx.user?.id,
          data: ctx.data,
        });
      }
    },
  });
}

// =============================================================================
// Singleton Instance
// =============================================================================

let defaultChain: MiddlewareChain | null = null;

/**
 * Get the default middleware chain
 */
export function getMiddlewareChain(): MiddlewareChain {
  if (!defaultChain) {
    defaultChain = new MiddlewareChain();
  }
  return defaultChain;
}

/**
 * Reset the default middleware chain
 */
export function resetMiddlewareChain(): void {
  defaultChain?.clear();
  defaultChain = null;
}

// =============================================================================
// Composition Utilities
// =============================================================================

/**
 * Compose multiple middleware into one
 *
 * @param middleware - Middleware functions to compose
 * @returns Composed middleware function
 */
export function compose(...middleware: MiddlewareFunction[]): MiddlewareFunction {
  return async (ctx, next) => {
    let index = 0;

    const dispatch = async (): Promise<void> => {
      if (index >= middleware.length) {
        return next();
      }

      const mw = middleware[index++]!;
      await mw(ctx, dispatch);
    };

    await dispatch();
  };
}

/**
 * Run middleware in parallel (all must complete before next)
 *
 * @param middleware - Middleware functions to run in parallel
 * @returns Parallel middleware function
 */
export function parallel(...middleware: MiddlewareFunction[]): MiddlewareFunction {
  return async (ctx, next) => {
    // Create shared next tracking
    let nextCalled = false;
    const sharedNext = async () => {
      if (!nextCalled) {
        nextCalled = true;
        await next();
      }
    };

    // Run all middleware in parallel
    await Promise.all(middleware.map(mw => mw(ctx, sharedNext)));
  };
}

/**
 * Conditionally run middleware
 *
 * @param condition - Condition function
 * @param middleware - Middleware to run if condition is true
 * @returns Conditional middleware
 */
export function conditional(
  condition: (ctx: MiddlewareContext) => boolean,
  middleware: MiddlewareFunction
): MiddlewareFunction {
  return async (ctx, next) => {
    if (condition(ctx)) {
      await middleware(ctx, next);
    } else {
      await next();
    }
  };
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for MiddlewareContext
 */
export function isMiddlewareContext(value: unknown): value is MiddlewareContext {
  return (
    typeof value === 'object' &&
    value !== null &&
    'path' in value &&
    'params' in value &&
    'response' in value &&
    'requestId' in value
  );
}

/**
 * Type guard for ChainExecutionResult
 */
export function isChainExecutionResult(value: unknown): value is ChainExecutionResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    'durationMs' in value &&
    'executionOrder' in value
  );
}
