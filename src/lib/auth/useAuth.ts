import { useAuthContext } from './AuthProvider';
import type { Role, Permission } from './types';

/**
 * Hook exposing { user, roles, login, logout, hasRole }.
 */
export function useAuth(): ReturnType<typeof useAuthContext> & {
  roles: Role[];
  permissions: Permission[];
  displayName: string;
  email: string;
  avatarUrl: string | undefined;
  isAdmin: boolean;
  isManager: boolean;
} {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    register,
    refreshToken,
    refreshSession,
    hasRole,
    hasAnyRole,
    hasPermission,
    hasAnyPermission,
  } = useAuthContext();

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    roles: user?.roles ?? [],
    permissions: user?.permissions ?? [],

    // Actions
    login,
    logout,
    register,
    refreshToken,
    refreshSession,

    // Permission helpers
    hasRole,
    hasAnyRole,
    hasPermission,
    hasAnyPermission,

    // Convenience getters
    get displayName() {
      return user?.displayName ?? '';
    },
    get email() {
      return user?.email ?? '';
    },
    get avatarUrl() {
      return user?.avatarUrl;
    },
    get isAdmin() {
      return hasRole('admin');
    },
    get isManager() {
      return hasAnyRole(['admin', 'manager']);
    },
  };
}

/**
 * Hook to check if the current user has a specific role
 */
export function useHasRole(role: Role): boolean {
  const { hasRole } = useAuth();
  return hasRole(role);
}

/**
 * Hook to check if the current user has a specific permission
 */
export function useHasPermission(permission: Permission): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}
