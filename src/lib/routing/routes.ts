/**
 * Strongly typed route patterns (pathnames, params, query definitions).
 */

/**
 * Route path definitions
 */
export const routes = {
  // Root routes
  home: '/',
  login: '/login',
  logout: '/logout',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',

  // Dashboard routes
  dashboard: '/dashboard',
  dashboardOverview: '/dashboard/overview',
  dashboardAnalytics: '/dashboard/analytics',
  dashboardSettings: '/dashboard/settings',

  // Reports routes
  reports: '/reports',
  reportsList: '/reports/list',
  reportDetail: '/reports/:id',
  reportCreate: '/reports/create',
  reportEdit: '/reports/:id/edit',

  // Users routes
  users: '/users',
  usersList: '/users/list',
  userDetail: '/users/:id',
  userCreate: '/users/create',
  userEdit: '/users/:id/edit',
  userProfile: '/users/profile',

  // Settings routes
  settings: '/settings',
  settingsGeneral: '/settings/general',
  settingsNotifications: '/settings/notifications',
  settingsSecurity: '/settings/security',

  // Admin routes
  admin: '/admin',
  adminUsers: '/admin/users',
  adminRoles: '/admin/roles',
  adminLogs: '/admin/logs',

  // Error routes
  notFound: '/404',
  error: '/error',
} as const;

export type RoutePath = (typeof routes)[keyof typeof routes];

/**
 * Route parameter types
 */
export interface RouteParams {
  '/reports/:id': { id: string };
  '/reports/:id/edit': { id: string };
  '/users/:id': { id: string };
  '/users/:id/edit': { id: string };
}

/**
 * Route query parameter types
 */
export interface RouteQuery {
  '/reports/list': { page?: string; limit?: string; search?: string; status?: string };
  '/users/list': { page?: string; limit?: string; search?: string; role?: string };
  '/dashboard/analytics': { from?: string; to?: string; metric?: string };
}

/**
 * Build a route path with parameters
 *
 * @deprecated Use `buildRoutePath` from `./route-builder` instead.
 * This function is maintained for backward compatibility only.
 *
 * @example
 * ```typescript
 * // Instead of:
 * import { buildPath } from './routes';
 * buildPath('/users/:id', { id: '123' });
 *
 * // Use:
 * import { buildRoutePath } from './route-builder';
 * buildRoutePath('/users/:id', { id: '123' });
 * ```
 */
export function buildPath<T extends keyof RouteParams>(path: T, params: RouteParams[T]): string {
  // Inline implementation to avoid circular dependency and require()
  let result = path as string;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`:${key}`, encodeURIComponent(value));
  }
  return result;
}

/**
 * Build a route path with query parameters
 */
export function buildPathWithQuery<T extends keyof RouteQuery>(
  path: T,
  query?: Partial<RouteQuery[T]>
): string {
  if (!query || Object.keys(query).length === 0) {
    return path;
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      const stringValue =
        typeof value === 'object'
          ? JSON.stringify(value)
          : String(value as string | number | boolean);
      searchParams.set(key, stringValue);
    }
  }

  return `${path}?${searchParams.toString()}`;
}

/**
 * Parse query parameters from a URL
 */
export function parseQuery<T extends keyof RouteQuery>(search: string): Partial<RouteQuery[T]> {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};

  params.forEach((value, key) => {
    result[key] = value;
  });

  return result as Partial<RouteQuery[T]>;
}
