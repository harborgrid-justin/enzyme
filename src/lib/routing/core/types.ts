/**
 * @file Route Type Utilities
 * @description Framework-agnostic TypeScript type utilities for type-safe routing.
 * These types enable compile-time parameter extraction and validation from route patterns.
 *
 * @module @/lib/routing/core/types
 *
 * @example
 * ```typescript
 * import type {
 *   ExtractRouteParams,
 *   RouteBuilder,
 *   TypedRouteRegistry,
 * } from '@/lib/routing/core/types';
 *
 * // Extract params from a route at compile time
 * type UserParams = ExtractRouteParams<'/users/:id/posts/:postId'>;
 * // Result: { id: string; postId: string }
 *
 * // Create a type-safe route builder
 * type UserRoute = RouteBuilder<'/users/:id'>;
 * // (params: { id: string }, query?: Record<string, string>) => string
 * ```
 */

// =============================================================================
// Route Parameter Extraction Types
// =============================================================================

/**
 * Extract required parameter names from a route path at type level
 *
 * @template TPath - A route path string literal type
 *
 * @example
 * ```typescript
 * type Params = ExtractRequiredParams<'/users/:id/posts/:postId'>;
 * // Result: { id: string; postId: string }
 *
 * type NoParams = ExtractRequiredParams<'/about'>;
 * // Result: Record<string, never>
 * ```
 */
export type ExtractRequiredParams<TPath extends string, Acc extends Record<string, string> = Record<string, never>> =
  TPath extends `${infer _Start}:${infer _Param}?/${infer Rest}`
    ? ExtractRequiredParams<`/${Rest}`, Acc>
    : TPath extends `${infer _Start}:${infer Param}/${infer Rest}`
      ? ExtractRequiredParams<`/${Rest}`, Acc & { [K in Param]: string }>
      : TPath extends `${infer _Start}:${infer _Param}?`
        ? Acc
        : TPath extends `${infer _Start}:${infer Param}`
          ? Acc & { [K in Param]: string }
          : Acc;

/**
 * Extract optional parameter names from a route path
 *
 * @template TPath - A route path string literal type
 *
 * @example
 * ```typescript
 * type Params = ExtractOptionalParams<'/search/:query?'>;
 * // Result: { query?: string }
 * ```
 */
export type ExtractOptionalParams<TPath extends string> =
  TPath extends `${infer _Start}:${infer Param}?/${infer Rest}`
    ? { [K in Param]?: string } & ExtractOptionalParams<`/${Rest}`>
    : TPath extends `${infer _Start}:${infer Param}?`
      ? { [K in Param]?: string }
      : Record<string, never>;

/**
 * Combined parameter type for a route - merges required and optional params
 *
 * @template TPath - A route path string literal type
 *
 * @example
 * ```typescript
 * type Params = ExtractRouteParams<'/users/:id/posts/:postId?'>;
 * // Result: { id: string; postId?: string }
 * ```
 */
export type ExtractRouteParams<TPath extends string> =
  ExtractRequiredParams<TPath> & ExtractOptionalParams<TPath>;

/**
 * Check if a path has any parameters
 *
 * @template TPath - A route path string literal type
 *
 * @example
 * ```typescript
 * type HasP = HasParams<'/users/:id'>; // true
 * type NoP = HasParams<'/about'>; // false
 * ```
 */
export type HasParams<TPath extends string> =
  keyof ExtractRouteParams<TPath> extends never ? false : true;

/**
 * Check if a route requires any parameters (has non-optional params)
 *
 * @template TPath - A route path string literal type
 *
 * @example
 * ```typescript
 * type Req = RequiresParams<'/users/:id'>; // true
 * type NoReq = RequiresParams<'/search/:query?'>; // false
 * ```
 */
export type RequiresParams<TPath extends string> =
  keyof ExtractRequiredParams<TPath> extends never ? false : true;

/**
 * Check if a route has only optional parameters
 *
 * @template TPath - A route path string literal type
 *
 * @example
 * ```typescript
 * type OnlyOpt = HasOnlyOptionalParams<'/search/:query?'>; // true
 * type HasReq = HasOnlyOptionalParams<'/users/:id'>; // false
 * ```
 */
export type HasOnlyOptionalParams<TPath extends string> =
  RequiresParams<TPath> extends false
    ? keyof ExtractOptionalParams<TPath> extends never
      ? false
      : true
    : false;

/**
 * Get the params type for a given path, with proper handling for parameterless routes
 *
 * @template TPath - A route path string literal type
 *
 * @example
 * ```typescript
 * type Params = ParamsFor<'/users/:id'>; // { id: string }
 * type NoParams = ParamsFor<'/about'>; // undefined
 * ```
 */
export type ParamsFor<TPath extends string> =
  keyof ExtractRouteParams<TPath> extends never
    ? undefined
    : ExtractRouteParams<TPath>;

// =============================================================================
// Route Segment Types
// =============================================================================

/**
 * Extract all segments from a route path as a tuple
 *
 * @template TPath - A route path string literal type
 *
 * @example
 * ```typescript
 * type Segs = ExtractSegments<'/users/:id/posts/:postId'>;
 * // Result: ['users', ':id', 'posts', ':postId']
 * ```
 */
export type ExtractSegments<TPath extends string> =
  TPath extends `/${infer Rest}`
    ? ExtractSegments<Rest>
    : TPath extends `${infer Segment}/${infer Rest}`
      ? [Segment, ...ExtractSegments<Rest>]
      : TPath extends ''
        ? []
        : [TPath];

/**
 * Get the depth (number of segments) of a route path
 *
 * @template TPath - A route path string literal type
 *
 * @example
 * ```typescript
 * type Depth = RouteDepth<'/users/:id/posts'>; // 3
 * ```
 */
export type RouteDepth<TPath extends string> = ExtractSegments<TPath>['length'];

/**
 * Check if a route path is a child of another
 *
 * @template TChild - The potential child path
 * @template TParent - The potential parent path
 *
 * @example
 * ```typescript
 * type IsChild = IsChildRoute<'/users/:id', '/users'>; // true
 * type NotChild = IsChildRoute<'/users', '/users/:id'>; // false
 * ```
 */
export type IsChildRoute<TChild extends string, TParent extends string> =
  TChild extends `${TParent}/${infer _Rest}` ? true : false;

/**
 * Get the parent path of a route
 *
 * @template TPath - A route path string literal type
 *
 * @example
 * ```typescript
 * type Parent = GetParentPath<'/users/:id/posts'>; // '/users/:id'
 * ```
 */
export type GetParentPath<TPath extends string> =
  TPath extends `${infer Parent}/${infer _Last}`
    ? Parent extends ''
      ? '/'
      : Parent
    : '/';

/**
 * Check if a path segment is dynamic
 *
 * @template TSegment - A path segment string
 */
export type IsDynamicSegment<TSegment extends string> =
  TSegment extends `:${infer _Param}` ? true : false;

/**
 * Check if a path segment is optional
 *
 * @template TSegment - A path segment string
 */
export type IsOptionalSegment<TSegment extends string> =
  TSegment extends `:${infer _Param}?` ? true : false;

/**
 * Check if a path segment is catch-all
 *
 * @template TSegment - A path segment string
 */
export type IsCatchAllSegment<TSegment extends string> =
  TSegment extends '*' ? true : false;

// =============================================================================
// Route Builder Types
// =============================================================================

/**
 * Type-safe route builder function signature
 *
 * - For routes without params: `(query?: QueryParams) => TPath`
 * - For routes with params: `(params: RouteParams<TPath>, query?: QueryParams) => string`
 *
 * @template TPath - A route path string literal type
 *
 * @example
 * ```typescript
 * type HomeBuilder = RouteBuilder<'/'>; // (query?: Record<string, string>) => '/'
 * type UserBuilder = RouteBuilder<'/users/:id'>; // (params: { id: string }, query?: ...) => string
 * ```
 */
export type RouteBuilder<TPath extends string> =
  keyof ExtractRouteParams<TPath> extends never
    ? (query?: Record<string, string | undefined>) => TPath
    : (
        params: ExtractRouteParams<TPath>,
        query?: Record<string, string | undefined>
      ) => string;

/**
 * Type-safe route registry with builders for all routes
 *
 * @template TRoutes - A record of route names to path patterns
 *
 * @example
 * ```typescript
 * const paths = {
 *   home: '/',
 *   users: '/users',
 *   userDetail: '/users/:id',
 * } as const;
 *
 * type Registry = TypedRouteRegistry<typeof paths>;
 * // { home: () => '/'; users: () => '/users'; userDetail: (params: { id: string }) => string }
 * ```
 */
export type TypedRouteRegistry<TRoutes extends Record<string, string>> = {
  readonly [K in keyof TRoutes]: RouteBuilder<TRoutes[K]>;
};

// =============================================================================
// Navigation Types
// =============================================================================

/**
 * Create typed link props for a route
 *
 * @template TPath - A route path string literal type
 *
 * @example
 * ```typescript
 * type UserLinkProps = TypedLinkProps<'/users/:id'>;
 * // { to: '/users/:id'; params: { id: string }; query?: Record<string, string> }
 * ```
 */
export type TypedLinkProps<TPath extends string> =
  RequiresParams<TPath> extends true
    ? {
        readonly to: TPath;
        readonly params: ExtractRouteParams<TPath>;
        readonly query?: Record<string, string | undefined>;
      }
    : HasOnlyOptionalParams<TPath> extends true
      ? {
          readonly to: TPath;
          readonly params?: ExtractRouteParams<TPath>;
          readonly query?: Record<string, string | undefined>;
        }
      : {
          readonly to: TPath;
          readonly query?: Record<string, string | undefined>;
        };

/**
 * Type-safe navigation function type
 *
 * @template TPath - A route path string literal type
 *
 * @example
 * ```typescript
 * type NavigateToUser = TypedNavigate<'/users/:id'>;
 * const navigate: NavigateToUser = (params) => { ... };
 * navigate({ id: '123' }); // Type-safe!
 * ```
 */
export type TypedNavigate<TPath extends string, TOptions = unknown> =
  RequiresParams<TPath> extends true
    ? (params: ExtractRouteParams<TPath>, options?: TOptions) => void
    : HasOnlyOptionalParams<TPath> extends true
      ? (params?: ExtractRouteParams<TPath>, options?: TOptions) => void
      : (options?: TOptions) => void;

// =============================================================================
// Path Building Types
// =============================================================================

/**
 * Build a URL path type from a pattern and params
 *
 * @template TPath - The route pattern
 * @template TParams - The parameters to substitute
 *
 * @example
 * ```typescript
 * type URL = BuildPath<'/users/:id', { id: '123' }>;
 * // Result: '/users/123'
 * ```
 */
export type BuildPath<
  TPath extends string,
  TParams extends Record<string, string>
> = TPath extends `${infer Start}:${infer Param}/${infer Rest}`
  ? `${Start}${TParams[Extract<Param, keyof TParams>]}/${BuildPath<`/${Rest}`, TParams>}`
  : TPath extends `${infer Start}:${infer Param}`
    ? `${Start}${TParams[Extract<Param, keyof TParams>]}`
    : TPath;

// =============================================================================
// Route Map Types
// =============================================================================

/**
 * Create a complete type-safe route map from paths
 *
 * @template TPaths - A record of route names to path patterns
 *
 * @example
 * ```typescript
 * const routes = {
 *   home: '/',
 *   user: '/users/:id',
 *   post: '/posts/:postId',
 * } as const;
 *
 * type RouteMap = TypedRouteMap<typeof routes>;
 * // Each entry has: path, params type, hasParams, requiresParams
 * ```
 */
export type TypedRouteMap<TPaths extends Record<string, string>> = {
  readonly [K in keyof TPaths]: {
    readonly path: TPaths[K];
    readonly params: ExtractRouteParams<TPaths[K]>;
    readonly hasParams: HasParams<TPaths[K]>;
    readonly requiresParams: RequiresParams<TPaths[K]>;
  };
};

/**
 * Infer route types from a route configuration object
 *
 * @template TConfig - A route configuration object
 */
export type InferRouteTypes<TConfig extends Record<string, { path: string }>> = {
  [K in keyof TConfig]: {
    path: TConfig[K]['path'];
    params: ExtractRouteParams<TConfig[K]['path']>;
    builder: RouteBuilder<TConfig[K]['path']>;
  };
};

/**
 * Merge multiple route configurations into one
 *
 * @template TRoutes - An array of route configuration types
 */
export type MergeRoutes<TRoutes extends readonly Record<string, string>[]> =
  TRoutes extends readonly [infer First, ...infer Rest]
    ? First extends Record<string, string>
      ? Rest extends readonly Record<string, string>[]
        ? First & MergeRoutes<Rest>
        : First
      : never
    : object;

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Prettify a type for better IntelliSense display
 *
 * @template T - Type to prettify
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
};

/**
 * Make specific keys optional
 *
 * @template T - The type to modify
 * @template K - The keys to make optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Extract route path from a route ID in a registry
 *
 * @template TRegistry - The route registry
 * @template TId - The route ID
 */
export type RoutePathFromId<
  TRegistry extends Record<string, string>,
  TId extends keyof TRegistry
> = TRegistry[TId];

// =============================================================================
// Helper Types (Internal)
// =============================================================================

/**
 * Extract all parameter names as a union type
 * @internal
 */
export type ParamNames<TPath extends string> = keyof ExtractRouteParams<TPath>;

/**
 * Count the number of parameters in a route
 * @internal
 */
type TupleFromUnion<T, L = LastOfUnion<T>> = [T] extends [never]
  ? []
  : [...TupleFromUnion<Exclude<T, L>>, L];

type LastOfUnion<T> = UnionToIntersection<
  T extends unknown ? (t: T) => T : never
> extends (t: infer L) => unknown
  ? L
  : never;

type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

/**
 * Get the number of parameters in a route
 * @internal
 */
export type ParamCount<TPath extends string> =
  keyof ExtractRouteParams<TPath> extends never
    ? 0
    : TupleFromUnion<keyof ExtractRouteParams<TPath>>['length'];

// =============================================================================
// Runtime Helpers
// =============================================================================

/**
 * Create a type-safe route builder function
 *
 * @param path - Route pattern
 * @param buildPathFn - Function to build the path
 * @returns Type-safe route builder
 *
 * @example
 * ```typescript
 * import { buildPath } from './path-utils';
 *
 * const userRoute = createBuilder('/users/:id', buildPath);
 * userRoute({ id: '123' }); // '/users/123'
 * ```
 */
export function createBuilder<TPath extends string>(
  path: TPath,
  buildPathFn: (pattern: string, params?: Record<string, string>, query?: Record<string, string | undefined>) => string
): RouteBuilder<TPath> {
  return ((
    params?: ExtractRouteParams<TPath>,
    query?: Record<string, string | undefined>
  ) => buildPathFn(path, params as Record<string, string>, query)) as RouteBuilder<TPath>;
}

/**
 * Create a typed route registry from a routes object
 *
 * @param routes - Object containing route patterns
 * @param buildPathFn - Function to build paths
 * @returns Typed route registry with builder functions
 *
 * @example
 * ```typescript
 * import { buildPath } from './path-utils';
 *
 * const routes = {
 *   home: '/',
 *   users: '/users',
 *   userDetail: '/users/:id',
 * } as const;
 *
 * const registry = createRegistry(routes, buildPath);
 * registry.userDetail({ id: '123' }); // '/users/123'
 * ```
 */
export function createRegistry<T extends Record<string, string>>(
  routes: T,
  buildPathFn: (pattern: string, params?: Record<string, string>, query?: Record<string, string | undefined>) => string
): TypedRouteRegistry<T> {
  const registry = {} as TypedRouteRegistry<T>;

  for (const [key, path] of Object.entries(routes)) {
    (registry as Record<string, unknown>)[key] = createBuilder(path, buildPathFn);
  }

  return registry;
}

/**
 * Validate that provided params match the expected route params at runtime
 *
 * @param path - The route path pattern
 * @param params - The params to validate
 * @param extractParamNamesFn - Function to extract param names from pattern
 * @returns True if params are valid
 */
export function validateParams<TPath extends string>(
  path: TPath,
  params: Record<string, unknown>,
  extractParamNamesFn: (pattern: string) => string[]
): params is ExtractRouteParams<TPath> {
  const expectedParams = extractParamNamesFn(path);
  const providedParams = Object.keys(params);

  // Check all required params are provided
  const requiredParams = expectedParams.filter((p) => !path.includes(`:${p}?`));
  for (const required of requiredParams) {
    if (!providedParams.includes(required)) {
      return false;
    }
  }

  return true;
}
