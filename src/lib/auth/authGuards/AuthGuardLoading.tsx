import { memo, type ReactNode } from 'react';
import { Spinner } from '@/lib/ui/feedback/Spinner';

/**
 * Props for the AuthGuardLoading component.
 */
interface AuthGuardLoadingProps {
  /**
   * Optional custom loading content to display instead of the default spinner.
   * When provided, this completely replaces the default loading UI.
   */
  fallback?: ReactNode;

  /**
   * Optional CSS class name for the loading container.
   * @default 'auth-guard-loading'
   */
  className?: string;

  /**
   * Optional label for accessibility (screen readers).
   * @default 'Checking authentication...'
   */
  ariaLabel?: string;
}

/**
 * Shared loading component for authentication guards.
 *
 * This component provides a consistent loading experience across all auth guards
 * (RequireAuth, RequireRole, RequirePermission) while checking authentication
 * and authorization status.
 *
 * DESIGN RATIONALE:
 * - Eliminates code duplication across auth guard components
 * - Provides a single point of customization for loading states
 * - Ensures consistent UX during authentication checks
 * - Supports accessibility with proper ARIA attributes
 *
 * @example
 * ```tsx
 * // Default usage
 * <AuthGuardLoading />
 *
 * // With custom fallback
 * <AuthGuardLoading fallback={<CustomLoadingScreen />} />
 *
 * // With custom className
 * <AuthGuardLoading className="custom-loading-container" />
 * ```
 */
export const AuthGuardLoading = memo(function AuthGuardLoading({
  fallback,
  className = 'auth-guard-loading',
  ariaLabel = 'Checking authentication...',
}: AuthGuardLoadingProps) {
  // If a custom fallback is provided, render it directly
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default loading UI with spinner
  return (
    <div
      className={className}
      role="status"
      aria-label={ariaLabel}
      aria-busy="true"
    >
      <Spinner size="lg" />
    </div>
  );
});
