import type { RoutePath } from '@/lib/routing/routes';
import type { RouteAuthConfig, Role, Permission } from './types';

/**
 * Mapping of routes to required roles/permissions.
 */
export const routeMetadata: Partial<Record<RoutePath, RouteAuthConfig>> = {
  // Public routes
  '/': {
    requireAuth: false,
  },
  '/login': {
    requireAuth: false,
  },
  '/register': {
    requireAuth: false,
  },
  '/forgot-password': {
    requireAuth: false,
  },

  // Protected routes - any authenticated user
  '/dashboard': {
    requireAuth: true,
  },
  '/dashboard/overview': {
    requireAuth: true,
  },
  '/dashboard/settings': {
    requireAuth: true,
  },

  // Protected routes - specific roles
  '/dashboard/analytics': {
    requireAuth: true,
    allowedRoles: ['admin', 'manager'],
  },

  // Reports
  '/reports': {
    requireAuth: true,
    requiredPermissions: ['view:reports'],
  },
  '/reports/list': {
    requireAuth: true,
    requiredPermissions: ['view:reports'],
  },
  '/reports/create': {
    requireAuth: true,
    requiredPermissions: ['create:reports'],
  },

  // Users
  '/users': {
    requireAuth: true,
    requiredPermissions: ['view:users'],
  },
  '/users/list': {
    requireAuth: true,
    requiredPermissions: ['view:users'],
  },
  '/users/create': {
    requireAuth: true,
    requiredPermissions: ['create:users'],
  },
  '/users/profile': {
    requireAuth: true,
  },

  // Settings
  '/settings': {
    requireAuth: true,
  },
  '/settings/general': {
    requireAuth: true,
  },
  '/settings/notifications': {
    requireAuth: true,
  },
  '/settings/security': {
    requireAuth: true,
  },

  // Admin routes
  '/admin': {
    requireAuth: true,
    minRole: 'admin',
    requiredPermissions: ['admin:access'],
    redirectTo: '/dashboard',
  },
  '/admin/users': {
    requireAuth: true,
    minRole: 'admin',
    requiredPermissions: ['admin:access'],
  },
  '/admin/roles': {
    requireAuth: true,
    minRole: 'admin',
    requiredPermissions: ['admin:access'],
  },
  '/admin/logs': {
    requireAuth: true,
    minRole: 'admin',
    requiredPermissions: ['admin:access'],
  },
};

/**
 * Get the auth configuration for a route
 */
export function getRouteAuthConfig(path: string): RouteAuthConfig {
  // Try exact match first
  const exactMatch = routeMetadata[path as RoutePath];
  if (exactMatch !== undefined && exactMatch !== null) return exactMatch;

  // Try to find a matching pattern
  for (const [routePath, config] of Object.entries(routeMetadata)) {
    if (matchRoutePath(path, routePath)) {
      return config;
    }
  }

  // Default to requiring auth
  return { requireAuth: true };
}

/**
 * Match a path against a route pattern
 */
function matchRoutePath(path: string, pattern: string): boolean {
  const pathParts = path.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);

  if (pathParts.length !== patternParts.length) {
    // Check if pattern could be a prefix
    if (patternParts.length < pathParts.length) {
      return patternParts.every((part, i) => {
        if (part.startsWith(':')) return true;
        return part === pathParts[i];
      });
    }
    return false;
  }

  return patternParts.every((part, i) => {
    if (part.startsWith(':')) return true;
    return part === pathParts[i];
  });
}

/**
 * Check if a user can access a route
 */
export function canAccessRoute(
  routeConfig: RouteAuthConfig,
  user: { roles: Role[]; permissions: Permission[] } | null
): boolean {
  // Route doesn't require auth
  if (!routeConfig.requireAuth) return true;

  // No user, can't access protected routes
  if (user === undefined || user === null) return false;

  // Check minimum role
  if (routeConfig.minRole !== undefined && routeConfig.minRole !== null) {
    const roleHierarchy: Role[] = ['guest', 'user', 'manager', 'admin'];
    const minRoleIndex = roleHierarchy.indexOf(routeConfig.minRole);
    const hasMinRole = user.roles.some((role) => roleHierarchy.indexOf(role) >= minRoleIndex);
    if (!hasMinRole) return false;
  }

  // Check allowed roles
  if (
    routeConfig.allowedRoles !== undefined &&
    routeConfig.allowedRoles !== null &&
    routeConfig.allowedRoles.length > 0
  ) {
    const hasAllowedRole = routeConfig.allowedRoles.some((role) => user.roles.includes(role));
    if (!hasAllowedRole) return false;
  }

  // Check required permissions
  if (
    routeConfig.requiredPermissions !== undefined &&
    routeConfig.requiredPermissions !== null &&
    routeConfig.requiredPermissions.length > 0
  ) {
    const hasAllPermissions = routeConfig.requiredPermissions.every((perm) =>
      user.permissions.includes(perm)
    );
    if (!hasAllPermissions) return false;
  }

  return true;
}
