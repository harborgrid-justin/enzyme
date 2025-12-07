/**
 * @file Route Registry
 * @description Single source of truth for ALL application routes.
 *
 * This replaces and consolidates:
 * - src/config/app.config.ts (ROUTES)
 * - src/lib/routing/routes.ts (routes)
 *
 * USAGE:
 * ```typescript
 * import { ROUTES, buildRoute, buildRouteWithQuery } from '@/config';
 *
 * // Static routes
 * <Link to={ROUTES.DASHBOARD} />
 *
 * // Dynamic routes
 * <Link to={buildRoute(ROUTES.REPORT_DETAIL, { id: '123' })} />
 *
 * // Routes with query params
 * <Link to={buildRouteWithQuery(ROUTES.REPORTS_LIST, { page: '2', search: 'test' })} />
 * ```
 */

// =============================================================================
// Route Path Definitions
// =============================================================================

/**
 * Static route paths (no parameters)
 */
const STATIC_ROUTES = {
  // ---------------------------------------------------------------------------
  // Public Routes
  // ---------------------------------------------------------------------------
  HOME: '/',
  LOGIN: '/login',
  LOGOUT: '/logout',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',

  // ---------------------------------------------------------------------------
  // Dashboard Routes
  // ---------------------------------------------------------------------------
  DASHBOARD: '/dashboard',
  DASHBOARD_OVERVIEW: '/dashboard/overview',
  DASHBOARD_ANALYTICS: '/dashboard/analytics',
  DASHBOARD_SETTINGS: '/dashboard/settings',

  // ---------------------------------------------------------------------------
  // Reports Routes
  // ---------------------------------------------------------------------------
  REPORTS: '/reports',
  REPORTS_LIST: '/reports/list',
  REPORT_CREATE: '/reports/create',

  // ---------------------------------------------------------------------------
  // Users Routes
  // ---------------------------------------------------------------------------
  USERS: '/users',
  USERS_LIST: '/users/list',
  USER_CREATE: '/users/create',
  USER_PROFILE: '/users/profile',

  // ---------------------------------------------------------------------------
  // Settings Routes
  // ---------------------------------------------------------------------------
  SETTINGS: '/settings',
  SETTINGS_GENERAL: '/settings/general',
  SETTINGS_NOTIFICATIONS: '/settings/notifications',
  SETTINGS_SECURITY: '/settings/security',

  // ---------------------------------------------------------------------------
  // Admin Routes
  // ---------------------------------------------------------------------------
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_ROLES: '/admin/roles',
  ADMIN_LOGS: '/admin/logs',

  // ---------------------------------------------------------------------------
  // Error Routes
  // ---------------------------------------------------------------------------
  NOT_FOUND: '/404',
  ERROR: '/error',
} as const;

/**
 * Dynamic route patterns (with :param placeholders)
 *
 * These patterns are used for:
 * 1. Router configuration (react-router-dom route definitions)
 * 2. Building actual URLs via buildRoute() function
 */
const DYNAMIC_ROUTE_PATTERNS = {
  /** Report detail view */
  REPORT_DETAIL: '/reports/:id',
  /** Report edit view */
  REPORT_EDIT: '/reports/:id/edit',
  /** User detail view */
  USER_DETAIL: '/users/:id',
  /** User edit view */
  USER_EDIT: '/users/:id/edit',
} as const;

// =============================================================================
// Route Parameter Types
// =============================================================================

/**
 * Route parameter type map
 *
 * Maps dynamic route patterns to their required parameters
 */
export interface RouteParams {
  '/reports/:id': { id: string };
  '/reports/:id/edit': { id: string };
  '/users/:id': { id: string };
  '/users/:id/edit': { id: string };
}

/**
 * Route query parameter type map
 *
 * Maps routes to their optional query parameters
 */
export interface RouteQueryParams {
  '/reports/list': {
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
  '/users/list': {
    page?: string;
    limit?: string;
    search?: string;
    role?: string;
    status?: string;
  };
  '/dashboard/analytics': {
    from?: string;
    to?: string;
    metric?: string;
    groupBy?: 'day' | 'week' | 'month';
  };
  '/admin/logs': {
    page?: string;
    limit?: string;
    level?: 'info' | 'warn' | 'error';
    from?: string;
    to?: string;
  };
}

// =============================================================================
// Route Building Utilities
// =============================================================================

/**
 * Build a dynamic route with parameters
 *
 * @param pattern - Route pattern with :param placeholders
 * @param params - Parameter values to substitute
 * @returns Fully resolved route path
 *
 * @example
 * ```typescript
 * buildRoute('/reports/:id', { id: '123' })
 * // Returns: '/reports/123'
 *
 * buildRoute('/users/:id/edit', { id: 'abc' })
 * // Returns: '/users/abc/edit'
 * ```
 */
export function buildRoute<T extends keyof RouteParams>(
  pattern: T,
  params: RouteParams[T]
): string {
  let result: string = pattern;

  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`:${key}`, encodeURIComponent(String(value)));
  }

  return result;
}

/**
 * Build a route with query parameters
 *
 * @param path - Base route path
 * @param query - Optional query parameters
 * @returns Route path with query string
 *
 * @example
 * ```typescript
 * buildRouteWithQuery('/reports/list', { page: '1', search: 'test' })
 * // Returns: '/reports/list?page=1&search=test'
 *
 * buildRouteWithQuery('/reports/list', {})
 * // Returns: '/reports/list'
 * ```
 */
export function buildRouteWithQuery<T extends keyof RouteQueryParams>(
  path: T,
  query?: Partial<RouteQueryParams[T]>
): string {
  if (!query || Object.keys(query).length === 0) {
    return path;
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      // Handle different value types properly
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      searchParams.set(key, stringValue);
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${path}?${queryString}` : path;
}

/**
 * Build a dynamic route with both path params and query params
 *
 * @example
 * ```typescript
 * buildFullRoute('/reports/:id', { id: '123' }, { tab: 'details' })
 * // Returns: '/reports/123?tab=details'
 * ```
 */
export function buildFullRoute<
  P extends keyof RouteParams,
  Q extends Record<string, string | undefined>,
>(pattern: P, params: RouteParams[P], query?: Q): string {
  const basePath = buildRoute(pattern, params);

  if (!query || Object.keys(query).length === 0) {
    return basePath;
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

/**
 * Parse query parameters from URL search string
 *
 * @param search - URL search string (with or without leading '?')
 * @returns Parsed query parameters as object
 *
 * @example
 * ```typescript
 * parseRouteQuery('?page=1&search=test')
 * // Returns: { page: '1', search: 'test' }
 * ```
 */
export function parseRouteQuery<T extends keyof RouteQueryParams>(
  search: string
): Partial<RouteQueryParams[T]> {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};

  params.forEach((value, key) => {
    result[key] = value;
  });

  return result as Partial<RouteQueryParams[T]>;
}

/**
 * Check if a path matches a route pattern
 *
 * @param path - Actual path to check
 * @param pattern - Route pattern to match against
 * @returns True if path matches pattern
 *
 * @example
 * ```typescript
 * matchesRoute('/reports/123', '/reports/:id') // true
 * matchesRoute('/reports/123/edit', '/reports/:id') // false
 * matchesRoute('/dashboard', '/dashboard') // true
 * ```
 */
export function matchesRoute(path: string, pattern: string): boolean {
  const pathParts = path.split('/');
  const patternParts = pattern.split('/');

  if (pathParts.length !== patternParts.length) {
    return false;
  }

  return patternParts.every((part, i) => {
    if (part.startsWith(':')) {
      return true; // Dynamic segment matches anything
    }
    return part === pathParts[i];
  });
}

/**
 * Extract parameters from a path using a route pattern
 *
 * @param path - Actual path
 * @param pattern - Route pattern with :param placeholders
 * @returns Extracted parameters or null if no match
 *
 * @example
 * ```typescript
 * extractParams('/reports/123', '/reports/:id')
 * // Returns: { id: '123' }
 *
 * extractParams('/users/abc/edit', '/users/:id/edit')
 * // Returns: { id: 'abc' }
 * ```
 */
export function extractParams(path: string, pattern: string): Record<string, string> | null {
  const pathParts = path.split('/');
  const patternParts = pattern.split('/');

  if (pathParts.length !== patternParts.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart == null || patternPart === '' || pathPart == null || pathPart === '') {
      return null;
    }

    if (patternPart.startsWith(':')) {
      const paramName = patternPart.slice(1);
      params[paramName] = decodeURIComponent(pathPart);
    } else if (patternPart !== pathPart) {
      return null;
    }
  }

  return params;
}

// =============================================================================
// Route Metadata
// =============================================================================

/**
 * Route authentication requirements
 */
export type RouteAuthRequirement =
  | 'none' // No auth required (public)
  | 'authenticated' // Must be logged in
  | 'unauthenticated' // Must NOT be logged in (login page)
  | 'admin'; // Must have admin role

/**
 * Route metadata for navigation, breadcrumbs, SEO
 */
export interface RouteMetadata {
  /** Page title (for document.title and SEO) */
  title: string;
  /** Meta description for SEO */
  description?: string;
  /** Icon name for navigation (from your icon library) */
  icon?: string;
  /** Authentication requirement */
  auth: RouteAuthRequirement;
  /** Breadcrumb label (if different from title) */
  breadcrumb?: string;
  /** Parent route for breadcrumb hierarchy */
  parent?: string;
  /** Whether to show in main navigation */
  showInNav?: boolean;
  /** Navigation order (lower = higher priority) */
  navOrder?: number;
  /** Whether this route requires specific permissions */
  permissions?: string[];
}

/**
 * Route metadata registry
 *
 * Contains metadata for all routes including titles, auth requirements,
 * and navigation configuration.
 */
export const ROUTE_METADATA: Partial<Record<string, RouteMetadata>> = {
  // Public routes
  [STATIC_ROUTES.HOME]: {
    title: 'Home',
    description: 'Welcome to the Enterprise Platform',
    auth: 'none',
    showInNav: false,
  },
  [STATIC_ROUTES.LOGIN]: {
    title: 'Sign In',
    description: 'Sign in to your account',
    auth: 'unauthenticated',
    showInNav: false,
  },
  [STATIC_ROUTES.LOGOUT]: {
    title: 'Sign Out',
    auth: 'authenticated',
    showInNav: false,
  },
  [STATIC_ROUTES.REGISTER]: {
    title: 'Create Account',
    description: 'Create a new account',
    auth: 'unauthenticated',
    showInNav: false,
  },
  [STATIC_ROUTES.FORGOT_PASSWORD]: {
    title: 'Forgot Password',
    description: 'Reset your password',
    auth: 'unauthenticated',
    showInNav: false,
  },

  // Dashboard routes
  [STATIC_ROUTES.DASHBOARD]: {
    title: 'Dashboard',
    description: 'View your dashboard and key metrics',
    icon: 'LayoutDashboard',
    auth: 'authenticated',
    showInNav: true,
    navOrder: 1,
  },
  [STATIC_ROUTES.DASHBOARD_OVERVIEW]: {
    title: 'Overview',
    auth: 'authenticated',
    breadcrumb: 'Overview',
    parent: STATIC_ROUTES.DASHBOARD,
  },
  [STATIC_ROUTES.DASHBOARD_ANALYTICS]: {
    title: 'Analytics',
    auth: 'authenticated',
    breadcrumb: 'Analytics',
    parent: STATIC_ROUTES.DASHBOARD,
  },

  // Reports routes
  [STATIC_ROUTES.REPORTS]: {
    title: 'Reports',
    description: 'View and manage reports',
    icon: 'FileText',
    auth: 'authenticated',
    breadcrumb: 'Reports',
    showInNav: true,
    navOrder: 2,
    permissions: ['view:reports'],
  },
  [STATIC_ROUTES.REPORTS_LIST]: {
    title: 'All Reports',
    auth: 'authenticated',
    breadcrumb: 'All Reports',
    parent: STATIC_ROUTES.REPORTS,
  },
  [STATIC_ROUTES.REPORT_CREATE]: {
    title: 'Create Report',
    auth: 'authenticated',
    breadcrumb: 'Create',
    parent: STATIC_ROUTES.REPORTS,
    permissions: ['create:reports'],
  },

  // Users routes
  [STATIC_ROUTES.USERS]: {
    title: 'Users',
    description: 'Manage users and team members',
    icon: 'Users',
    auth: 'authenticated',
    breadcrumb: 'Users',
    showInNav: true,
    navOrder: 3,
    permissions: ['view:users'],
  },
  [STATIC_ROUTES.USERS_LIST]: {
    title: 'All Users',
    auth: 'authenticated',
    breadcrumb: 'All Users',
    parent: STATIC_ROUTES.USERS,
  },
  [STATIC_ROUTES.USER_PROFILE]: {
    title: 'Profile',
    auth: 'authenticated',
    breadcrumb: 'Profile',
    parent: STATIC_ROUTES.USERS,
  },

  // Settings routes
  [STATIC_ROUTES.SETTINGS]: {
    title: 'Settings',
    description: 'Manage your account settings',
    icon: 'Settings',
    auth: 'authenticated',
    breadcrumb: 'Settings',
    showInNav: true,
    navOrder: 4,
  },
  [STATIC_ROUTES.SETTINGS_GENERAL]: {
    title: 'General Settings',
    auth: 'authenticated',
    breadcrumb: 'General',
    parent: STATIC_ROUTES.SETTINGS,
  },
  [STATIC_ROUTES.SETTINGS_NOTIFICATIONS]: {
    title: 'Notification Settings',
    auth: 'authenticated',
    breadcrumb: 'Notifications',
    parent: STATIC_ROUTES.SETTINGS,
  },
  [STATIC_ROUTES.SETTINGS_SECURITY]: {
    title: 'Security Settings',
    auth: 'authenticated',
    breadcrumb: 'Security',
    parent: STATIC_ROUTES.SETTINGS,
  },

  // Admin routes
  [STATIC_ROUTES.ADMIN]: {
    title: 'Admin',
    description: 'System administration',
    icon: 'Shield',
    auth: 'admin',
    breadcrumb: 'Admin',
    showInNav: true,
    navOrder: 5,
    permissions: ['admin:access'],
  },
  [STATIC_ROUTES.ADMIN_USERS]: {
    title: 'User Management',
    auth: 'admin',
    breadcrumb: 'Users',
    parent: STATIC_ROUTES.ADMIN,
  },
  [STATIC_ROUTES.ADMIN_ROLES]: {
    title: 'Role Management',
    auth: 'admin',
    breadcrumb: 'Roles',
    parent: STATIC_ROUTES.ADMIN,
  },
  [STATIC_ROUTES.ADMIN_LOGS]: {
    title: 'System Logs',
    auth: 'admin',
    breadcrumb: 'Logs',
    parent: STATIC_ROUTES.ADMIN,
  },

  // Error routes
  [STATIC_ROUTES.NOT_FOUND]: {
    title: 'Page Not Found',
    auth: 'none',
    showInNav: false,
  },
  [STATIC_ROUTES.ERROR]: {
    title: 'Error',
    auth: 'none',
    showInNav: false,
  },
};

/**
 * Get metadata for a route
 *
 * @param path - Route path
 * @returns Route metadata or undefined
 */
export function getRouteMetadata(path: string): RouteMetadata | undefined {
  // First check static routes
  const staticMeta = ROUTE_METADATA[path];
  if (staticMeta) {
    return staticMeta;
  }

  // Check dynamic routes by pattern matching
  for (const [pattern, meta] of Object.entries(ROUTE_METADATA)) {
    if (matchesRoute(path, pattern)) {
      return meta;
    }
  }

  return undefined;
}

/**
 * Get navigation items (routes with showInNav: true)
 */
export function getNavItems(): Array<{
  path: string;
  title: string;
  icon?: string;
  order: number;
}> {
  return Object.entries(ROUTE_METADATA)
    .filter((entry): entry is [string, RouteMetadata] => entry[1]?.showInNav === true)
    .map(([path, meta]) => ({
      path,
      title: meta.title,
      ...(meta.icon !== undefined && { icon: meta.icon }),
      order: meta.navOrder ?? 999,
    }))
    .sort((a, b) => a.order - b.order);
}

/**
 * Build breadcrumb trail for a route
 *
 * @param path - Current route path
 * @returns Array of breadcrumb items from root to current
 */
export function buildBreadcrumbs(path: string): Array<{ path: string; label: string }> {
  const breadcrumbs: Array<{ path: string; label: string }> = [];
  let currentPath: string | undefined = path;

  while (currentPath !== undefined && currentPath !== '') {
    const meta: RouteMetadata | undefined = ROUTE_METADATA[currentPath];
    if (meta) {
      breadcrumbs.unshift({
        path: currentPath,
        label: meta.breadcrumb ?? meta.title,
      });
      currentPath = meta.parent;
    } else {
      break;
    }
  }

  return breadcrumbs;
}

// =============================================================================
// Exports
// =============================================================================

/**
 * All route paths - use this for navigation and routing
 *
 * Contains both static routes and dynamic route patterns.
 * For dynamic routes, use buildRoute() to create the actual URL.
 */
export const ROUTES = {
  ...STATIC_ROUTES,
  ...DYNAMIC_ROUTE_PATTERNS,
} as const;

/**
 * Type for any valid route path
 */
export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

/**
 * Type for static routes only (no parameters)
 */
export type StaticRoute = (typeof STATIC_ROUTES)[keyof typeof STATIC_ROUTES];

/**
 * Type for dynamic route patterns (with :param placeholders)
 */
export type DynamicRoute = (typeof DYNAMIC_ROUTE_PATTERNS)[keyof typeof DYNAMIC_ROUTE_PATTERNS];

/**
 * Check if a route is a dynamic pattern
 */
export function isDynamicRoute(route: string): route is DynamicRoute {
  return route.includes(':');
}

/**
 * Check if a route is a static path
 */
export function isStaticRoute(route: string): route is StaticRoute {
  return !route.includes(':');
}
