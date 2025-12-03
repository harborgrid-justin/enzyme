// =============================================================================
// Route Builder Types
// =============================================================================

import type { RouteParams } from './route-parameter-types';

/**
 * Type-safe route builder function signature
 * - For routes without params: `() => TPath`
 * - For routes with params: `(params: RouteParams<TPath>, query?: QueryParams) => string`
 */
export type RouteBuilder<TPath extends string> = keyof RouteParams<TPath> extends never
  ? (query?: Record<string, string | undefined>) => TPath
  : (params: RouteParams<TPath>, query?: Record<string, string | undefined>) => string;

/**
 * Type-safe route registry with builders for all routes
 */
export type TypedRouteRegistry<TRoutes extends Record<string, string>> = {
  readonly [K in keyof TRoutes]: RouteBuilder<TRoutes[K]>;
};
