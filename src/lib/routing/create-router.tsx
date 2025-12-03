/**
 * @file Unified Router Factory
 * @description Creates type-safe router with auto-discovery, prefetching, and feature integration
 */

/* eslint-disable react-refresh/only-export-components */

import {
  createBrowserRouter,
  type RouteObject,
  useRouteError,
  isRouteErrorResponse,
} from 'react-router-dom';
import React, { Suspense, type ReactNode, type ComponentType } from 'react';
import type { CreateRouterOptions, RouteModule } from './types';

// =============================================================================
// Default Fallback Components
// =============================================================================

/**
 * Default loading spinner component
 */
function DefaultLoading(): ReactNode {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e5e7eb',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/**
 * Default error fallback component
 */
function DefaultError(): ReactNode {
  const error = useRouteError();

  let errorMessage = 'An unexpected error occurred';
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    const errorData = error.data as { message?: string } | undefined;
    errorMessage = error.statusText ?? errorData?.message ?? errorMessage;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#fef2f2',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          marginBottom: '1.5rem',
          borderRadius: '50%',
          backgroundColor: '#fee2e2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#dc2626"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#dc2626',
          marginBottom: '0.5rem',
        }}
      >
        {errorStatus === 404 ? 'Page Not Found' : 'Something went wrong'}
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem', maxWidth: '400px' }}>{errorMessage}</p>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={() => window.history.back()}
          style={{
            padding: '0.625rem 1.25rem',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
          }}
        >
          Go Back
        </button>
        <button
          onClick={() => (window.location.href = '/')}
          style={{
            padding: '0.625rem 1.25rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
          }}
        >
          Go Home
        </button>
      </div>
    </div>
  );
}

/**
 * Default 404 Not Found component
 */
function DefaultNotFound(): ReactNode {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '8rem',
          fontWeight: 'bold',
          color: '#e5e7eb',
          lineHeight: 1,
        }}
      >
        404
      </div>
      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#111827',
          marginTop: '1rem',
        }}
      >
        Page not found
      </h1>
      <p style={{ color: '#6b7280', marginTop: '0.5rem', maxWidth: '400px' }}>
        Sorry, we couldn&apos;t find the page you&apos;re looking for.
      </p>
      <button
        onClick={() => (window.location.href = '/')}
        style={{
          marginTop: '1.5rem',
          padding: '0.625rem 1.25rem',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '0.375rem',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: '500',
        }}
      >
        Go Home
      </button>
    </div>
  );
}

// =============================================================================
// Suspense Wrapper
// =============================================================================

/**
 * Wrap a lazy component with Suspense
 */
function withSuspense(
  Component: React.LazyExoticComponent<ComponentType<unknown>>,
  fallback: ReactNode
): ReactNode {
  return (
    <Suspense fallback={fallback}>
      <Component />
    </Suspense>
  );
}

// =============================================================================
// Prefetching
// =============================================================================

interface PrefetchState {
  prefetched: Set<string>;
  timeouts: Map<string, ReturnType<typeof setTimeout>>;
}

const prefetchState: PrefetchState = {
  prefetched: new Set(),
  timeouts: new Map(),
};

/**
 * Set up route prefetching on link hover/focus
 */
function setupPrefetching(
  preloadMap: Record<string, () => Promise<unknown>>,
  options: {
    delay: number;
    onHover: boolean;
    onFocus: boolean;
  }
): () => void {
  const { delay, onHover, onFocus } = options;

  function handleInteraction(event: Event): void {
    const target = event.target as HTMLElement;
    const link = target.closest('a[href]');

    if (!link) return;

    const href = link.getAttribute('href');
    if (href == null || href === '' || href.startsWith('http') || href.startsWith('mailto:'))
      return;

    // Check if already prefetched
    if (prefetchState.prefetched.has(href)) return;

    // Find matching preload function
    const routeKey = Object.keys(preloadMap).find((key) => {
      // Simple path matching
      const pattern = key
        .replace(/BY_/g, ':')
        .replace(/_OPT/g, '?')
        .replace(/_/g, '/')
        .toLowerCase();
      return href === `/${pattern}` || href === pattern;
    });

    if (routeKey != null && routeKey !== '' && preloadMap[routeKey]) {
      // Cancel any existing timeout
      const existingTimeout = prefetchState.timeouts.get(href);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set up delayed prefetch
      const timeout = setTimeout(() => {
        const preloader = preloadMap[routeKey];
        if (preloader) {
          preloader()
            .then(() => {
              prefetchState.prefetched.add(href);
            })
            .catch(() => {
              // Ignore prefetch errors
            });
        }
      }, delay);

      prefetchState.timeouts.set(href, timeout);
    }
  }

  function handleLeave(event: Event): void {
    const target = event.target as HTMLElement;
    const link = target.closest('a[href]');

    if (!link) return;

    const href = link.getAttribute('href');
    if (href === null || href === undefined || href === '') return;

    // Cancel pending prefetch
    const timeout = prefetchState.timeouts.get(href);
    if (timeout) {
      clearTimeout(timeout);
      prefetchState.timeouts.delete(href);
    }
  }

  // Add event listeners
  if (onHover) {
    document.addEventListener('mouseover', handleInteraction);
    document.addEventListener('mouseout', handleLeave);
  }

  if (onFocus) {
    document.addEventListener('focusin', handleInteraction);
    document.addEventListener('focusout', handleLeave);
  }

  // Return cleanup function
  return () => {
    if (onHover) {
      document.removeEventListener('mouseover', handleInteraction);
      document.removeEventListener('mouseout', handleLeave);
    }
    if (onFocus) {
      document.removeEventListener('focusin', handleInteraction);
      document.removeEventListener('focusout', handleLeave);
    }

    // Clear all pending timeouts
    for (const timeout of prefetchState.timeouts.values()) {
      clearTimeout(timeout);
    }
    prefetchState.timeouts.clear();
  };
}

// =============================================================================
// Router Factory
// =============================================================================

/**
 * Route configuration for creating the router
 */
export interface RouteConfig {
  /** Route path pattern */
  path: string;
  /** Dynamic import function for the route component */
  importFn: () => Promise<RouteModule>;
  /** Whether this is an index route */
  index?: boolean;
  /** Whether this is a layout route */
  isLayout?: boolean;
  /** Child routes */
  children?: RouteConfig[];
}

/**
 * Create a router from route configurations
 */
export function createRouter(
  routes: RouteConfig[],
  options: CreateRouterOptions = {}
): ReturnType<typeof createBrowserRouter> {
  const {
    errorElement,
    loadingFallback = <DefaultLoading />,
    basename,
    prefetchOnHover = true,
    prefetchOnFocus = false,
    prefetchDelay = 100,
  } = options;

  // Build route objects
  const routeObjects = buildRouteObjects(routes, {
    errorElement: errorElement ?? <DefaultError />,
    loadingFallback,
  });

  // Add catch-all 404 route
  routeObjects.push({
    path: '*',
    element: <DefaultNotFound />,
  });

  // Create browser router
  const router = createBrowserRouter(routeObjects, { basename });

  // Set up prefetching if enabled
  if ((prefetchOnHover || prefetchOnFocus) && typeof window !== 'undefined') {
    const preloadMap = buildPreloadMap(routes);
    setupPrefetching(preloadMap, {
      delay: prefetchDelay,
      onHover: prefetchOnHover,
      onFocus: prefetchOnFocus,
    });
  }

  return router;
}

/**
 * Build RouteObject array from route configurations
 */
function buildRouteObjects(
  routes: RouteConfig[],
  options: {
    errorElement: ReactNode;
    loadingFallback: ReactNode;
  }
): RouteObject[] {
  return routes.map((route) => {
    const routeObj: RouteObject = {
      errorElement: options.errorElement,
    };

    if (route.index === true) {
      (routeObj as RouteObject & { index?: boolean }).index = true;
    } else if (route.path !== undefined && route.path !== null) {
      // Remove leading slash for nested routes
      const cleanPath = route.path.replace(/^\//, '');
      routeObj.path = cleanPath || undefined;
    }

    // Use React Router's lazy loading
    routeObj.lazy = async () => {
      const module = await route.importFn();
      return {
        Component: module.default,
        loader: module.loader,
        action: module.action,
        handle: module.handle,
      };
    };

    // Build children recursively
    if (route.children && route.children.length > 0) {
      routeObj.children = buildRouteObjects(route.children, options);
    }

    return routeObj;
  });
}

/**
 * Build preload map from route configurations
 */
function buildPreloadMap(
  routes: RouteConfig[],
  prefix: string = ''
): Record<string, () => Promise<unknown>> {
  const preloadMap: Record<string, () => Promise<unknown>> = {};

  for (const route of routes) {
    const fullPath = prefix + (route.path || '');
    const key = generatePreloadKey(fullPath);

    preloadMap[key] = route.importFn;

    if (route.children) {
      const childMap = buildPreloadMap(route.children, `${fullPath}/`);
      Object.assign(preloadMap, childMap);
    }
  }

  return preloadMap;
}

/**
 * Generate a preload key from a path
 */
function generatePreloadKey(path: string): string {
  return (
    path
      .replace(/^\//, '')
      .replace(/\//g, '_')
      .replace(/:/g, 'BY_')
      .replace(/\?/g, '_OPT')
      .toUpperCase() || 'INDEX'
  );
}

// =============================================================================
// Simple Router Factory (for manual route definition)
// =============================================================================

/**
 * Create a simple router from manual route definitions
 *
 * This is a simpler alternative to the full auto-discovery system
 * for projects that prefer explicit route configuration.
 */
export function createSimpleRouter(
  routeTree: RouteObject[],
  options: Omit<CreateRouterOptions, 'includeFeatures'> = {}
): ReturnType<typeof createBrowserRouter> {
  const { errorElement = <DefaultError />, basename } = options;

  // Wrap routes with error element
  const wrappedRoutes = routeTree.map((route) => ({
    ...route,
    errorElement: route.errorElement ?? errorElement,
  }));

  return createBrowserRouter(wrappedRoutes, { basename });
}

// =============================================================================
// Exports
// =============================================================================

export { DefaultLoading, DefaultError, DefaultNotFound, withSuspense, setupPrefetching };
