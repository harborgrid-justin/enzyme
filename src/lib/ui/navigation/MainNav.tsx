/**
 * @file Main Navigation Component
 * @description Main navigation that respects auth + feature flags
 * Performance optimized: static styles extracted, dynamic styles memoized
 * Uses theme tokens for consistent styling
 */

import React, { useMemo, memo, useCallback, type CSSProperties } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useFeatureFlag } from '../../flags/useFeatureFlag';
import { AppLink } from '../../routing/linking';
import { type Role } from '../../auth/types';
import { colorTokens, tokens } from '../../theme/tokens';

/**
 * Navigation route definition
 */
export interface NavRoute {
  id: string;
  label: string;
  path: string;
  icon?: React.ReactNode;
  requiredRoles?: Role[];
  featureFlag?: string;
  children?: NavRoute[];
  badge?: string | number;
  external?: boolean;
}

/**
 * Main nav props
 */
export interface MainNavProps {
  /** Navigation routes */
  routes: NavRoute[];

  /** Current path for active state */
  currentPath?: string;

  /** Layout direction */
  direction?: 'horizontal' | 'vertical';

  /** Custom class name */
  className?: string;
}

// ============================================================================
// STATIC STYLES - Extracted outside component to prevent re-creation
// ============================================================================

const iconContainerStyle: CSSProperties = {
  flexShrink: 0,
};

const badgeStyle: CSSProperties = {
  marginLeft: 'auto',
  padding: '0.125rem 0.5rem',
  fontSize: tokens.fontSize.xs,
  backgroundColor: colorTokens.neutral[200],
  borderRadius: tokens.radius.full,
};

const externalIconStyle: CSSProperties = {
  marginLeft: '0.25rem',
};

// Screen reader only style for hidden text
const srOnlyStyle: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user has access to a route
 */
function hasRouteAccess(route: NavRoute, roles: Role[]): boolean {
  if (!route.requiredRoles || route.requiredRoles.length === 0) {
    return true;
  }
  return route.requiredRoles.some((role) => roles.includes(role));
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Props for NavItem component
 */
interface NavItemProps {
  route: NavRoute;
  isActive: boolean;
  direction: 'horizontal' | 'vertical';
  roles: Role[];
}

/**
 * Navigation item component - memoized for performance
 */
const NavItem = memo(
  ({ route, isActive, direction, roles }: NavItemProps): React.ReactElement | null => {
    // Check feature flag - always call with consistent pattern to avoid Rules of Hooks violation
    // Use sentinel value '__ALWAYS_ENABLED__' when no feature flag is specified
    const flagEnabled = useFeatureFlag(route.featureFlag ?? '__ALWAYS_ENABLED__');

    const isHorizontal = direction === 'horizontal';

    // Memoize link style based on direction and active state - MUST be before early returns
    const linkStyle = useMemo(
      (): CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.sm,
        padding: isHorizontal
          ? `${tokens.spacing.sm} ${tokens.spacing.md}`
          : `${tokens.spacing.md} ${tokens.spacing.md}`,
        color: isActive ? colorTokens.primary.default : colorTokens.text.secondary,
        textDecoration: 'none',
        borderRadius: tokens.radius.md,
        backgroundColor: isActive ? colorTokens.interactive.selected : 'transparent',
        fontWeight: isActive ? tokens.fontWeight.medium : tokens.fontWeight.normal,
        fontSize: tokens.fontSize.sm,
        whiteSpace: 'nowrap',
      }),
      [isHorizontal, isActive]
    );

    // Check visibility AFTER all hooks
    if (route.featureFlag !== undefined && route.featureFlag !== '' && !flagEnabled) {
      return null;
    }

    if (!hasRouteAccess(route, roles)) {
      return null;
    }

    const content = (
      <>
        {route.icon !== undefined && <span style={iconContainerStyle}>{route.icon}</span>}
        <span>{route.label}</span>
        {route.badge !== undefined && route.badge !== '' && (
          <span style={badgeStyle}>{route.badge}</span>
        )}
      </>
    );

    if (route.external === true) {
      return (
        <a
          href={route.path}
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
          aria-label={`${route.label} (opens in new tab)`}
        >
          {content}
          <svg
            width="12"
            height="12"
            viewBox="0 0 20 20"
            fill="currentColor"
            style={externalIconStyle}
            aria-hidden="true"
            focusable="false"
          >
            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
          </svg>
          <span style={srOnlyStyle}>(opens in new tab)</span>
        </a>
      );
    }

    return (
      <AppLink to={route.path} style={linkStyle}>
        {content}
      </AppLink>
    );
  }
);

NavItem.displayName = 'NavItem';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Main navigation component
 */
export function MainNav({
  routes,
  currentPath,
  direction = 'horizontal',
  className,
}: MainNavProps): React.ReactElement {
  const { roles, isAuthenticated } = useAuth();

  // Filter routes based on auth and flags - memoized
  const visibleRoutes = useMemo(() => {
    return routes.filter((route) => {
      // Public routes are always visible
      if (!route.requiredRoles || route.requiredRoles.length === 0) {
        return true;
      }
      // Require authentication for protected routes
      if (!isAuthenticated) {
        return false;
      }
      return hasRouteAccess(route, roles);
    });
  }, [routes, roles, isAuthenticated]);

  const isHorizontal = direction === 'horizontal';

  // Memoize nav style
  const navStyle = useMemo(
    (): CSSProperties => ({
      display: 'flex',
      flexDirection: isHorizontal ? 'row' : 'column',
      gap: isHorizontal ? '0.25rem' : '0.125rem',
    }),
    [isHorizontal]
  );

  // Memoize active state calculator
  const getIsActive = useCallback(
    (routePath: string): boolean => {
      return currentPath === routePath || (currentPath?.startsWith(`${routePath}/`) ?? false);
    },
    [currentPath]
  );

  return (
    <nav
      aria-label={isHorizontal ? 'Main navigation' : 'Sidebar navigation'}
      className={className}
      style={navStyle}
    >
      {visibleRoutes.map((route) => (
        <NavItem
          key={route.id}
          route={route}
          isActive={getIsActive(route.path)}
          direction={direction}
          roles={roles}
        />
      ))}
    </nav>
  );
}

MainNav.displayName = 'MainNav';
