import { memo, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../useAuth';
import { routes } from '@/lib/routing/routes';
import { AuthGuardLoading } from './AuthGuardLoading';

interface RequireAuthProps {
  children: ReactNode;
  /** Redirect path for unauthenticated users */
  redirectTo?: string;
  /** Custom loading state while checking auth */
  fallback?: ReactNode;
}

/**
 * Guard component that requires authentication.
 * Redirects to login if not authenticated.
 *
 * @example
 * ```tsx
 * <RequireAuth>
 *   <ProtectedPage />
 * </RequireAuth>
 *
 * // With custom redirect
 * <RequireAuth redirectTo="/signin">
 *   <ProtectedPage />
 * </RequireAuth>
 *
 * // With custom loading
 * <RequireAuth fallback={<CustomLoader />}>
 *   <ProtectedPage />
 * </RequireAuth>
 * ```
 */
export const RequireAuth = memo(({
  children,
  redirectTo = routes.login,
  fallback
}: RequireAuthProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthGuardLoading fallback={fallback} ariaLabel="Verifying authentication..." />;
  }

  if (!isAuthenticated) {
    // Redirect to login, preserving the intended destination
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
});
