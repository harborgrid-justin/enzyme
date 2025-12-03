import React, { memo, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../useAuth';
import { routes } from '@/lib/routing/routes';
import { AuthGuardLoading } from './AuthGuardLoading';
import type { Role } from '../types';

interface RequireRoleProps {
  children: ReactNode;
  /** Single role required */
  role?: Role;
  /** Any of these roles required */
  roles?: Role[];
  /** Redirect path if role check fails */
  redirectTo?: string;
  /** Component to show if access denied (not shown during loading) */
  fallback?: ReactNode;
}

/**
 * Guard component that requires a specific role.
 * Redirects if user doesn't have the required role.
 *
 * @example
 * ```tsx
 * // Single role
 * <RequireRole role="admin">
 *   <AdminPanel />
 * </RequireRole>
 *
 * // Multiple roles (any of)
 * <RequireRole roles={['admin', 'manager']}>
 *   <ManagementDashboard />
 * </RequireRole>
 *
 * // With access denied fallback
 * <RequireRole role="admin" fallback={<AccessDenied />}>
 *   <AdminPanel />
 * </RequireRole>
 * ```
 */
export const RequireRole = memo(
  ({ children, role, roles, redirectTo = routes.dashboard, fallback }: RequireRoleProps) => {
    const { isAuthenticated, isLoading, hasRole, hasAnyRole } = useAuth();

    if (isLoading) {
      return <AuthGuardLoading ariaLabel="Verifying role authorization..." />;
    }

    if (!isAuthenticated) {
      return <Navigate to={routes.login} replace />;
    }

    // Check single role - cast to any since Role and UserRole have compatible values
    if (role !== undefined && role !== null && !hasRole(role)) {
      if (fallback !== undefined && fallback !== null) return <>{fallback}</>;
      return <Navigate to={redirectTo} replace />;
    }

    // Check multiple roles
    if (roles !== undefined && roles !== null && !hasAnyRole(roles)) {
      if (fallback !== undefined && fallback !== null) return <>{fallback}</>;
      return <Navigate to={redirectTo} replace />;
    }

    return <>{children}</>;
  }
);

/**
 * HOC version of RequireRole
 */
// @refresh reset
// eslint-disable-next-line react-refresh/only-export-components
export function withRequireRole<P extends object>(
  Component: React.ComponentType<P>,
  roleConfig: { role?: Role; roles?: Role[]; redirectTo?: string }
): React.ComponentType<P> {
  return function WithRequireRole(props: P): React.ReactElement {
    return (
      <RequireRole {...roleConfig}>
        <Component {...props} />
      </RequireRole>
    );
  };
}
