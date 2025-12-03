/**
 * @file Authentication Guard
 * @description Route guard for authentication checks. Protects routes that require
 * users to be logged in and handles redirect to login page.
 *
 * @module @/lib/routing/guards/auth-guard
 *
 * This module provides:
 * - Authentication state checking
 * - Login redirect handling
 * - Return URL preservation
 * - Session validation
 * - Token refresh integration
 *
 * @example
 * ```typescript
 * import { createAuthGuard, AuthGuard } from '@/lib/routing/guards/auth-guard';
 *
 * const authGuard = createAuthGuard({
 *   loginPath: '/login',
 *   isAuthenticated: () => Boolean(getCurrentUser()),
 *   returnUrlParam: 'returnTo',
 * });
 * ```
 */

import {
  BaseRouteGuard,
  GuardResult,
  type GuardContext,
  type GuardResultObject,
} from './route-guard';

// =============================================================================
// Types
// =============================================================================

/**
 * Authentication guard configuration
 */
export interface AuthGuardConfig {
  /** Guard name */
  readonly name?: string;
  /** Path to redirect unauthenticated users */
  readonly loginPath?: string;
  /** Query parameter name for return URL */
  readonly returnUrlParam?: string;
  /** Check if user is authenticated */
  readonly isAuthenticated?: (context: GuardContext) => boolean | Promise<boolean>;
  /** Custom authentication check with full context */
  readonly checkAuth?: (context: GuardContext) => GuardResultObject | Promise<GuardResultObject>;
  /** Public paths that don't require authentication */
  readonly publicPaths?: readonly string[];
  /** Path patterns that require authentication */
  readonly protectedPaths?: readonly string[];
  /** Whether to preserve query params in return URL */
  readonly preserveQuery?: boolean;
  /** Custom redirect builder */
  readonly buildRedirect?: (context: GuardContext) => string;
  /** Session validation function */
  readonly validateSession?: (context: GuardContext) => boolean | Promise<boolean>;
  /** Token refresh function */
  readonly refreshToken?: () => Promise<boolean>;
  /** Minimum session time before refresh (ms) */
  readonly refreshThreshold?: number;
  /** Guard priority */
  readonly priority?: number;
  /** Guard timeout */
  readonly timeout?: number;
  /** Feature flag */
  readonly featureFlag?: string;
}

/**
 * Authentication state
 */
export interface AuthState {
  /** Whether user is authenticated */
  readonly isAuthenticated: boolean;
  /** Session expiry timestamp */
  readonly expiresAt?: number;
  /** Whether session needs refresh */
  readonly needsRefresh: boolean;
  /** Authentication error (if any) */
  readonly error?: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default authentication guard configuration
 */
export const DEFAULT_AUTH_CONFIG: AuthGuardConfig = {
  name: 'auth',
  loginPath: '/login',
  returnUrlParam: 'returnTo',
  publicPaths: ['/login', '/register', '/forgot-password', '/reset-password'],
  preserveQuery: true,
  priority: 10,
  timeout: 10000,
  refreshThreshold: 5 * 60 * 1000, // 5 minutes
};

// =============================================================================
// AuthGuard Class
// =============================================================================

/**
 * Authentication route guard
 *
 * @example
 * ```typescript
 * const guard = new AuthGuard({
 *   loginPath: '/auth/login',
 *   isAuthenticated: (ctx) => ctx.user?.isAuthenticated ?? false,
 * });
 *
 * // Add to route
 * const result = await guard.execute('canActivate', context);
 * ```
 */
export class AuthGuard extends BaseRouteGuard {
  private readonly authConfig: AuthGuardConfig;

  constructor(config: AuthGuardConfig = {}) {
    const mergedConfig = { ...DEFAULT_AUTH_CONFIG, ...config };

    super({
      name: mergedConfig.name ?? 'auth',
      description: 'Authentication guard - checks if user is logged in',
      priority: mergedConfig.priority,
      timeout: mergedConfig.timeout,
      exclude: mergedConfig.publicPaths,
      routes: mergedConfig.protectedPaths,
      featureFlag: mergedConfig.featureFlag,
      canActivate: async (context) => this.checkAuthentication(context),
      canLoad: async (context) => this.checkAuthentication(context),
    });

    this.authConfig = mergedConfig;
  }

  /**
   * Get authentication state for a context
   */
  async getAuthState(context: GuardContext): Promise<AuthState> {
    const isAuthenticated = await this.checkAuthStatus(context);

    let expiresAt: number | undefined;
    let needsRefresh = false;

    if (isAuthenticated && context.user?.metadata?.['expiresAt'] != null) {
      expiresAt = context.user.metadata['expiresAt'] as number;
      const threshold = this.authConfig.refreshThreshold ?? 0;
      needsRefresh = (expiresAt - Date.now()) < threshold;
    }

    return {
      isAuthenticated,
      expiresAt,
      needsRefresh,
    };
  }

  /**
   * Check if a specific path requires authentication
   */
  requiresAuth(path: string): boolean {
    return !this.isPublicPath(path);
  }

  /**
   * Get public paths configuration
   */
  getPublicPaths(): readonly string[] {
    return this.authConfig.publicPaths ?? [];
  }

  /**
   * Get login path
   */
  getLoginPath(): string {
    return this.authConfig.loginPath ?? '/login';
  }

  /**
   * Check authentication status
   */
  private async checkAuthentication(context: GuardContext): Promise<GuardResultObject> {
    // Use custom check if provided
    if (this.authConfig.checkAuth !== undefined && this.authConfig.checkAuth !== null) {
      return this.authConfig.checkAuth(context);
    }

    // Check if path is public
    if (this.isPublicPath(context.path)) {
      return GuardResult.allow();
    }

    // Check authentication status
    const isAuthenticated = await this.checkAuthStatus(context);

    if (!isAuthenticated) {
      return this.buildLoginRedirect(context);
    }

    // Check session validity
    if (this.authConfig.validateSession !== undefined && this.authConfig.validateSession !== null) {
      const isValid = await this.authConfig.validateSession(context);
      if (isValid !== true) {
        return this.buildLoginRedirect(context, 'Session expired');
      }
    }

    // Check if token needs refresh
    await this.checkTokenRefresh(context);

    return GuardResult.allow();
  }

  /**
   * Check if user is authenticated
   */
  private async checkAuthStatus(context: GuardContext): Promise<boolean> {
    // Use custom isAuthenticated function if provided
    if (this.authConfig.isAuthenticated !== undefined && this.authConfig.isAuthenticated !== null) {
      return this.authConfig.isAuthenticated(context);
    }

    // Default: check context.user
    return context.user?.isAuthenticated ?? false;
  }

  /**
   * Check if path is public
   */
  private isPublicPath(path: string): boolean {
    const publicPaths = this.authConfig.publicPaths ?? [];

    for (const publicPath of publicPaths) {
      // Exact match
      if (path === publicPath) {
        return true;
      }

      // Glob match
      if (publicPath.includes('*')) {
        const regexStr = publicPath
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*\*/g, '.*')
          .replace(/\*/g, '[^/]*');

        const regex = new RegExp(`^${regexStr}$`);
        if (regex.test(path)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Build redirect to login page
   */
  private buildLoginRedirect(context: GuardContext, reason?: string): GuardResultObject {
    // Use custom redirect builder if provided
    if (this.authConfig.buildRedirect !== undefined && this.authConfig.buildRedirect !== null) {
      const redirectPath = this.authConfig.buildRedirect(context);
      return GuardResult.redirect(redirectPath);
    }

    // Build default redirect with return URL
    let loginPath = this.authConfig.loginPath ?? '/login';
    const returnUrlParam = this.authConfig.returnUrlParam ?? 'returnTo';

    // Build return URL
    let returnUrl = context.path;
    if ((this.authConfig.preserveQuery ?? false) && Object.keys(context.query).length > 0) {
      const queryString = new URLSearchParams(context.query).toString();
      returnUrl = `${context.path}?${queryString}`;
    }

    // Append return URL to login path
    loginPath = `${loginPath}?${returnUrlParam}=${encodeURIComponent(returnUrl)}`;

    return GuardResult.redirect(loginPath, {
      replace: true,
      state: { reason },
    });
  }

  /**
   * Check if token needs refresh
   */
  private async checkTokenRefresh(context: GuardContext): Promise<void> {
    if (!this.authConfig.refreshToken || (this.authConfig.refreshThreshold == null)) {
      return;
    }

    // Check if session is about to expire
    const {user} = context;
    if (user?.metadata?.['expiresAt'] == null) {
      return;
    }

    const expiresAt = user.metadata['expiresAt'] as number;
    const timeUntilExpiry = expiresAt - Date.now();

    if (timeUntilExpiry < this.authConfig.refreshThreshold) {
      try {
        await this.authConfig.refreshToken();
      } catch (error) {
        console.warn('Token refresh failed:', error);
      }
    }
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create an authentication guard
 *
 * @param config - Guard configuration
 * @returns AuthGuard instance
 */
export function createAuthGuard(config: AuthGuardConfig = {}): AuthGuard {
  return new AuthGuard(config);
}

/**
 * Create a simple auth guard from an authentication check function
 *
 * @param isAuthenticated - Function to check authentication
 * @param options - Additional options
 * @returns AuthGuard instance
 */
export function createSimpleAuthGuard(
  isAuthenticated: (context: GuardContext) => boolean | Promise<boolean>,
  options: Partial<AuthGuardConfig> = {}
): AuthGuard {
  return new AuthGuard({
    ...options,
    isAuthenticated,
  });
}

/**
 * Create an auth guard with token-based authentication
 *
 * @param options - Configuration options
 * @returns AuthGuard instance
 */
export function createTokenAuthGuard(options: {
  getToken: () => string | null;
  validateToken?: (token: string) => boolean | Promise<boolean>;
  refreshToken?: () => Promise<string | null>;
  loginPath?: string;
}): AuthGuard {
  return new AuthGuard({
    loginPath: options.loginPath ?? '/login',
    isAuthenticated: async () => {
      const token = options.getToken();
      if (token == null) return false;

      if (options.validateToken) {
        return options.validateToken(token);
      }

      return true;
    },
    refreshToken: options.refreshToken
      ? async () => {
          const newToken = await options.refreshToken?.();
          return newToken !== null;
        }
      : undefined,
  });
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Build a return URL for login redirect
 *
 * @param currentPath - Current path
 * @param query - Current query params
 * @param preserveQuery - Whether to preserve query params
 * @returns Encoded return URL
 */
export function buildReturnUrl(
  currentPath: string,
  query?: Record<string, string>,
  preserveQuery = true
): string {
  let returnUrl = currentPath;

  if (preserveQuery && query && Object.keys(query).length > 0) {
    const queryString = new URLSearchParams(query).toString();
    returnUrl = `${currentPath}?${queryString}`;
  }

  return encodeURIComponent(returnUrl);
}

/**
 * Parse return URL from query parameters
 *
 * @param query - Query parameters
 * @param paramName - Parameter name for return URL
 * @returns Decoded return URL or undefined
 */
export function parseReturnUrl(
  query: Record<string, string>,
  paramName = 'returnTo'
): string | undefined {
  const returnUrl = query[paramName];
  if (returnUrl == null) return undefined;

  try {
    return decodeURIComponent(returnUrl);
  } catch {
    return undefined;
  }
}

/**
 * Check if a path requires authentication based on patterns
 *
 * @param path - Path to check
 * @param publicPaths - Public path patterns
 * @returns True if path requires authentication
 */
export function pathRequiresAuth(
  path: string,
  publicPaths: readonly string[]
): boolean {
  for (const publicPath of publicPaths) {
    if (path === publicPath) return false;

    if (publicPath.includes('*')) {
      const regexStr = publicPath
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*');

      const regex = new RegExp(`^${regexStr}$`);
      if (regex.test(path)) return false;
    }
  }

  return true;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for AuthGuard
 */
export function isAuthGuard(value: unknown): value is AuthGuard {
  return value instanceof AuthGuard;
}

/**
 * Type guard for AuthState
 */
export function isAuthState(value: unknown): value is AuthState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'isAuthenticated' in value &&
    'needsRefresh' in value
  );
}
