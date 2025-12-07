import React, { memo, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../useAuth';
import { routes } from '@/lib/routing/routes';
import { AuthGuardLoading } from './AuthGuardLoading';
import type { Permission } from '../types';

interface RequirePermissionProps {
  children: ReactNode;
  /** Single permission required */
  permission?: Permission;
  /** All of these permissions required */
  permissions?: Permission[];
  /** Any of these permissions required */
  anyPermission?: Permission[];
  /** Redirect path if permission check fails */
  redirectTo?: string;
  /** Component to show if access denied (not shown during loading) */
  fallback?: ReactNode;
}

/**
 * Guard component that requires specific permissions.
 * Redirects if user doesn't have the required permissions.
 *
 * @example
 * ```tsx
 * // Single permission
 * <RequirePermission permission="users:write">
 *   <UserEditor />
 * </RequirePermission>
 *
 * // All permissions required
 * <RequirePermission permissions={['reports:read', 'analytics:view']}>
 *   <AnalyticsDashboard />
 * </RequirePermission>
 *
 * // Any permission (OR logic)
 * <RequirePermission anyPermission={['admin:full', 'settings:manage']}>
 *   <SettingsPage />
 * </RequirePermission>
 *
 * // With access denied fallback
 * <RequirePermission permission="billing:manage" fallback={<UpgradePrompt />}>
 *   <BillingSettings />
 * </RequirePermission>
 * ```
 */
export const RequirePermission = memo(
  ({
    children,
    permission,
    permissions,
    anyPermission,
    redirectTo = routes.dashboard,
    fallback,
  }: RequirePermissionProps) => {
    const { isAuthenticated, isLoading, hasPermission, hasAnyPermission } = useAuth();

    if (isLoading) {
      return <AuthGuardLoading ariaLabel="Verifying permission authorization..." />;
    }

    if (!isAuthenticated) {
      return <Navigate to={routes.login} replace />;
    }

    // Check single permission
    if (permission !== undefined && permission !== null && !hasPermission(permission)) {
      if (fallback !== undefined && fallback !== null) return <>{fallback}</>;
      return <Navigate to={redirectTo} replace />;
    }

    // Check all permissions required
    if (permissions !== undefined && permissions !== null && !permissions.every(hasPermission)) {
      if (fallback !== undefined && fallback !== null) return <>{fallback}</>;
      return <Navigate to={redirectTo} replace />;
    }

    // Check any permission required
    if (anyPermission !== undefined && anyPermission !== null && !hasAnyPermission(anyPermission)) {
      if (fallback !== undefined && fallback !== null) return <>{fallback}</>;
      return <Navigate to={redirectTo} replace />;
    }

    return <>{children}</>;
  }
);

/**
 * HOC version of RequirePermission
 */
// @refresh reset
// eslint-disable-next-line react-refresh/only-export-components
export function withRequirePermission<P extends object>(
  Component: React.ComponentType<P>,
  permissionConfig: {
    permission?: Permission;
    permissions?: Permission[];
    anyPermission?: Permission[];
    redirectTo?: string;
  }
): React.ComponentType<P> {
  return function WithRequirePermission(props: P): React.ReactElement {
    return (
      <RequirePermission {...permissionConfig}>
        <Component {...props} />
      </RequirePermission>
    );
  };
}
