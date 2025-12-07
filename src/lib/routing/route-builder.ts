/**
 * @file Type-Safe Route Builder
 * @description Factory functions for creating type-safe route path builders and route objects
 */

import type { RouteObject } from 'react-router-dom';
import {
  lazy,
  createElement,
  type ComponentType,
  type LazyExoticComponent,
  type ReactNode,
} from 'react';
import type {
  DiscoveredRoute,
  RouteDefinition,
  RouteMetadata,
  RouteAccessConfig,
  RouteModule,
  RouteParams,
} from './types';
import { extractParamNames, generateRouteId, generateDisplayName } from './scanner';
import {
  buildPath as coreBuildPath,
  matchPathPattern,
  parsePathParams,
  getLastSegment,
} from './core';

// =============================================================================
// Path Building (delegating to core)
// =============================================================================

/**
 * Build a parameterized path from a pattern and params
 * @see core/path-utils.ts for implementation details
 *
 * @example
 * buildRoutePath('/users/:id', { id: '123' }) // '/users/123'
 * buildRoutePath('/users/:id?', {}) // '/users'
 * buildRoutePath('/users/:id', { id: '123' }, { tab: 'settings' }) // '/users/123?tab=settings'
 */
export function buildRoutePath(
  pattern: string,
  params?: Record<string, string>,
  query?: Record<string, string | undefined>
): string {
  return coreBuildPath(pattern, params, query);
}

/**
 * Create a type-safe route builder function for a specific path pattern
 *
 * @example
 * const userRoute = createRouteBuilder('/users/:id');
 * userRoute({ id: '123' }) // '/users/123'
 *
 * const homeRoute = createRouteBuilder('/');
 * homeRoute() // '/'
 */
export function createRouteBuilder<TPath extends string>(
  path: TPath
): (params?: RouteParams<TPath>, query?: Record<string, string | undefined>) => string {
  const paramNames = extractParamNames(path);
  const requiredParams = paramNames.filter((p) => !path.includes(`:${p}?`));

  return (params?: RouteParams<TPath>, query?: Record<string, string | undefined>): string => {
    // Validate required params
    if (requiredParams.length > 0) {
      if (params === null || params === undefined) {
        throw new Error(`Route "${path}" requires parameters: ${requiredParams.join(', ')}`);
      }

      for (const param of requiredParams) {
        if (!(param in params) || (params as Record<string, string>)[param] === undefined) {
          throw new Error(`Route "${path}" requires parameter "${param}"`);
        }
      }
    }

    return buildRoutePath(path, params as Record<string, string>, query);
  };
}

/**
 * Create a typed route registry from a routes object
 *
 * @example
 * const routes = {
 *   home: '/',
 *   users: '/users',
 *   userDetail: '/users/:id',
 * } as const;
 *
 * const builders = createRouteBuilders(routes);
 * builders.home() // '/'
 * builders.userDetail({ id: '123' }) // '/users/123'
 */
export function createRouteBuilders<T extends Record<string, string>>(
  routes: T
): {
  [K in keyof T]: (
    params?: RouteParams<T[K]>,
    query?: Record<string, string | undefined>
  ) => string;
} {
  const builders = {} as {
    [K in keyof T]: (
      params?: RouteParams<T[K]>,
      query?: Record<string, string | undefined>
    ) => string;
  };

  for (const [key, path] of Object.entries(routes)) {
    builders[key as keyof T] = createRouteBuilder(path) as (
      params?: RouteParams<T[keyof T]>,
      query?: Record<string, string | undefined>
    ) => string;
  }

  return builders;
}

// =============================================================================
// Route Object Building
// =============================================================================

/**
 * Import function type for dynamic imports
 */
export type RouteImportFn = () => Promise<
  { default: ComponentType<unknown> } & Partial<RouteModule>
>;

/**
 * Create a lazy component with preload capability
 */
export function createLazyRoute(
  importFn: RouteImportFn
): LazyExoticComponent<ComponentType<unknown>> & { preload: () => Promise<RouteModule> } {
  const LazyComponent = lazy(importFn) as LazyExoticComponent<ComponentType<unknown>> & {
    preload: () => Promise<RouteModule>;
  };

  LazyComponent.preload = async () => {
    const module = await importFn();
    return module as RouteModule;
  };

  return LazyComponent;
}

/**
 * Build a RouteObject from a discovered route
 */
export function buildRouteObject(
  route: DiscoveredRoute,
  importFn: RouteImportFn,
  options: {
    errorElement?: ReactNode;
    loadingElement?: ReactNode;
  } = {}
): RouteObject {
  // For React Router, we use the lazy() API for code splitting
  const baseRoute = {
    id: generateRouteId(route),
    lazy: async () => {
      const module = await importFn();
      return {
        Component: module.default,
        loader: module.loader,
        action: module.action,
        handle: module.handle,
        errorElement: module.ErrorBoundary
          ? createElement(module.ErrorBoundary, { error: new Error('Route error') })
          : options.errorElement,
      };
    },
  };

  // Set path or index
  if (route.isIndex) {
    return { ...baseRoute, index: true } as RouteObject;
  } else if (route.urlPath !== '/') {
    // Remove leading slash for nested routes
    const lastSegment = getLastSegment(route.urlPath);
    return { ...baseRoute, path: lastSegment || undefined } as RouteObject;
  }

  return baseRoute as RouteObject;
}

/**
 * Build a complete route tree from discovered routes
 */
export function buildRouteTree(
  routes: DiscoveredRoute[],
  importMap: Map<string, RouteImportFn>,
  options: {
    errorElement?: ReactNode;
    loadingElement?: ReactNode;
  } = {}
): RouteObject[] {
  const tree: RouteObject[] = [];
  const layoutMap = new Map<string, RouteObject>();
  const routesByPath = new Map<string, RouteObject>();

  // First pass: create all route objects
  for (const route of routes) {
    const importFn = importMap.get(route.filePath);
    if (!importFn) {
      console.warn(`No import function found for route: ${route.filePath}`);
      continue;
    }

    const routeObj = buildRouteObject(route, importFn, options);
    routesByPath.set(route.filePath, routeObj);

    if (route.isLayout) {
      layoutMap.set(route.filePath, routeObj);
      // Set the layout path
      const lastSegment = getLastSegment(route.urlPath);
      if (lastSegment) {
        routeObj.path = lastSegment;
      }
    }
  }

  // Second pass: build hierarchy
  for (const route of routes) {
    if (route.isLayout) continue;

    const routeObj = routesByPath.get(route.filePath);
    if (!routeObj) continue;

    // Find parent layout
    if (route.parentLayout != null) {
      const parentLayout = layoutMap.get(route.parentLayout);
      if (parentLayout) {
        parentLayout.children = parentLayout.children ?? [];
        parentLayout.children.push(routeObj);
        continue;
      }
    }

    // No parent layout - add to root
    tree.push(routeObj);
  }

  // Add root layouts to tree
  for (const route of routes) {
    if (!route.isLayout) continue;
    if (route.parentLayout != null) continue; // Nested layout already handled

    const layoutObj = layoutMap.get(route.filePath);
    if (layoutObj) {
      tree.push(layoutObj);
    }
  }

  return tree;
}

// =============================================================================
// Route Definition Building
// =============================================================================

/**
 * Create a RouteDefinition from a discovered route
 */
export function createRouteDefinition(
  route: DiscoveredRoute,
  meta?: RouteMetadata,
  access?: RouteAccessConfig
): RouteDefinition {
  const paramNames = extractParamNames(route.urlPath);

  return {
    id: generateRouteId(route),
    path: route.urlPath,
    displayName: generateDisplayName(route),
    sourceFile: route.filePath,
    paramNames: paramNames as readonly string[],
    layout: route.parentLayout,
    meta: meta ?? {},
    access: access ?? { isPublic: true },
    hasLoader: false, // Will be updated when module is loaded
    hasAction: false, // Will be updated when module is loaded
  };
}

/**
 * Create route definitions for all discovered routes
 */
export function createRouteDefinitions(routes: DiscoveredRoute[]): RouteDefinition[] {
  return routes.filter((r) => !r.isLayout).map((r) => createRouteDefinition(r));
}

// =============================================================================
// Route Matching Utilities (delegating to core)
// =============================================================================

/**
 * Check if a path matches a route pattern
 * @see core/path-utils.ts for implementation details
 */
export function matchRoute(pattern: string, path: string): boolean {
  return matchPathPattern(pattern, path);
}

/**
 * Extract parameters from a path using a pattern
 * @see core/path-utils.ts for implementation details
 */
export function extractRouteParams(pattern: string, path: string): Record<string, string> | null {
  return parsePathParams(pattern, path);
}

// =============================================================================
// Type Generators (for build-time code generation)
// =============================================================================

/**
 * Generate TypeScript type definitions for routes
 */
export function generateRouteTypeDefinitions(routes: DiscoveredRoute[]): string {
  const lines: string[] = [
    '/**',
    ' * @file Auto-Generated Route Types',
    ' * @description DO NOT EDIT - Generated by route discovery',
    ` * @generated ${new Date().toISOString()}`,
    ' */',
    '',
    '// Route path constants',
    'export const ROUTE_PATHS = {',
  ];

  const nonLayoutRoutes = routes.filter((r) => !r.isLayout);

  for (const route of nonLayoutRoutes) {
    const id = generateRouteId(route);
    lines.push(`  ${id}: '${route.urlPath}' as const,`);
  }

  lines.push('} as const;');
  lines.push('');
  lines.push('export type RoutePath = typeof ROUTE_PATHS[keyof typeof ROUTE_PATHS];');
  lines.push('');

  // Generate RouteParams interface
  lines.push('// Route parameter types');
  lines.push('export interface RouteParams {');

  for (const route of nonLayoutRoutes) {
    const paramNames = extractParamNames(route.urlPath);
    if (paramNames.length > 0) {
      const paramType = paramNames.map((p) => `${p}: string`).join('; ');
      lines.push(`  '${route.urlPath}': { ${paramType} };`);
    }
  }

  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate route registry code
 */
export function generateRouteRegistry(routes: DiscoveredRoute[], rootDir: string): string {
  const lines: string[] = [
    '/**',
    ' * @file Auto-Generated Route Registry',
    ' * @description DO NOT EDIT - Generated by route discovery',
    ` * @generated ${new Date().toISOString()}`,
    ' */',
    '',
    "import { lazy } from 'react';",
    '',
    '// Lazy-loaded route components',
    'export const routeComponents = {',
  ];

  const nonLayoutRoutes = routes.filter((r) => !r.isLayout);

  for (const route of nonLayoutRoutes) {
    const id = generateRouteId(route);
    const importPath = route.filePath
      .replace(rootDir, '')
      .replace(/^\/src\//, '@/')
      .replace(/\.tsx?$/, '');

    lines.push(`  ${id}: lazy(() => import('${importPath}')),`);
  }

  lines.push('} as const;');
  lines.push('');

  // Generate preload functions
  lines.push('// Route preloading');
  lines.push('export const preloadRoute = {');

  for (const route of nonLayoutRoutes) {
    const id = generateRouteId(route);
    const importPath = route.filePath
      .replace(rootDir, '')
      .replace(/^\/src\//, '@/')
      .replace(/\.tsx?$/, '');

    lines.push(`  ${id}: () => import('${importPath}'),`);
  }

  lines.push('} as const;');
  lines.push('');

  return lines.join('\n');
}
