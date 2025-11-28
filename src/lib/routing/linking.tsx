import type { FocusEvent, MouseEvent } from 'react';
import { forwardRef, useCallback } from 'react';
import { Link, NavLink, type LinkProps, type NavLinkProps } from 'react-router-dom';
import { buildRoutePath } from './route-builder';
import { routeRegistry } from './route-registry';

// Re-export appRoutes from the separate file for backward compatibility
export { appRoutes } from './app-routes';

/**
 * Next.js-style <AppLink> component using typed routes.
 */

type AppLinkProps = Omit<LinkProps, 'to'> & {
  /** Route path or dynamic route key */
  to: string;
  /** Parameters for dynamic routes */
  params?: Record<string, string>;
  /** Query parameters */
  query?: Record<string, string | undefined>;
  /** Prefetch on hover */
  prefetch?: boolean;
};

export const AppLink = forwardRef<HTMLAnchorElement, AppLinkProps>(
  ({ to, params, query, prefetch = false, onMouseEnter, onFocus, ...props }, ref) => {
    // Build the final path using canonical buildRoutePath
    const path = buildRoutePath(to, params, query);

    // Prefetch handler - triggers route component preloading
    const triggerPrefetch = useCallback(() => {
      if (prefetch) {
        // Use route registry to prefetch the route component
        routeRegistry.prefetchByPath(to).catch((error: unknown) => {
          // Silently handle prefetch errors - they shouldn't break the UI
          console.warn('[AppLink] Prefetch failed:', error);
        });
      }
    }, [prefetch, to]);

    const handleMouseEnter = (e: MouseEvent<HTMLAnchorElement>): void => {
      triggerPrefetch();
      onMouseEnter?.(e);
    };

    const handleFocus = (e: FocusEvent<HTMLAnchorElement>): void => {
      triggerPrefetch();
      onFocus?.(e);
    };

    return (
      <Link
        ref={ref}
        to={path}
        onMouseEnter={handleMouseEnter}
        onFocus={handleFocus}
        {...props}
      />
    );
  }
);

AppLink.displayName = 'AppLink';

/**
 * Next.js-style <AppNavLink> component using typed routes.
 * Includes active state styling.
 */

type AppNavLinkProps = Omit<NavLinkProps, 'to'> & {
  /** Route path or dynamic route key */
  to: string;
  /** Parameters for dynamic routes */
  params?: Record<string, string>;
  /** Query parameters */
  query?: Record<string, string | undefined>;
  /** Active class name */
  activeClassName?: string;
};

export const AppNavLink = forwardRef<HTMLAnchorElement, AppNavLinkProps>(
  ({ to, params, query, activeClassName = 'active', className, ...props }, ref) => {
    // Build the final path using canonical buildRoutePath
    const path = buildRoutePath(to, params, query);

    return (
      <NavLink
        ref={ref}
        to={path}
        className={({ isActive }) => {
          const baseClass = typeof className === 'function'
            ? className({ isActive, isPending: false, isTransitioning: false })
            : className;
          return isActive ? `${baseClass ?? ''} ${activeClassName}`.trim() : baseClass ?? '';
        }}
        {...props}
      />
    );
  }
);

AppNavLink.displayName = 'AppNavLink';
