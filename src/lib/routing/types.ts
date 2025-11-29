/**
 * @file Route Auto-Discovery Type System
 * @description Type-safe route definitions with compile-time validation and template literal param extraction
 * @module @/lib/routing/types
 *
 * This module provides a comprehensive type system for React Router routes including:
 * - Template literal types for extracting route parameters at compile time
 * - Type-safe route builders that enforce correct parameter types
 * - Route validation types for detecting conflicts and issues
 * - Middleware and prefetch configuration types
 *
 * @example
 * ```typescript
 * import type { RouteParams, RouteBuilder } from '@/lib/routing/types';
 *
 * // Extract params from a route path at compile time
 * type UserParams = RouteParams<'/users/:id/posts/:postId'>;
 * // Result: { id: string; postId: string }
 *
 * // Create a type-safe route builder
 * const userRoute: RouteBuilder<'/users/:id'> = (params) => `/users/${params.id}`;
 * ```
 */

import type { RouteObject, LoaderFunction, ActionFunction } from 'react-router-dom';
import type { ComponentType, LazyExoticComponent, ReactNode } from 'react';
import type { ParsedRouteSegment } from './route-segment-types';
import type {
  ExtractRequiredParams,
  ExtractOptionalParams,
  RouteParams,
  HasParams,
  ParamsFor as _ParamsFor
} from './route-parameter-types';

// Re-export types for external use
export type { ParsedRouteSegment, RouteSegmentType } from './route-segment-types';
export type {
  ExtractRequiredParams,
  ExtractOptionalParams,
  RouteParams,
  HasParams,
  ParamsFor
} from './route-parameter-types';

// =============================================================================
// Route Builder Types
// =============================================================================

/**
 * Type-safe route builder function signature
 * - For routes without params: `() => TPath`
 * - For routes with params: `(params: RouteParams<TPath>, query?: QueryParams) => string`
 */
export type RouteBuilder<TPath extends string> =
  keyof RouteParams<TPath> extends never
    ? (query?: Record<string, string | undefined>) => TPath
    : (params: RouteParams<TPath>, query?: Record<string, string | undefined>) => string;

/**
 * Type-safe route registry with builders for all routes
 */
export type TypedRouteRegistry<TRoutes extends Record<string, string>> = {
  readonly [K in keyof TRoutes]: RouteBuilder<TRoutes[K]>;
};

// =============================================================================
// Route Metadata Types
// =============================================================================

/**
 * Route metadata for SEO, analytics, and display
 */
export interface RouteMetadata {
  /** Page title */
  readonly title?: string;
  /** Page description for SEO */
  readonly description?: string;
  /** SEO keywords */
  readonly keywords?: readonly string[];
  /** Canonical URL override */
  readonly canonical?: string;
  /** Robots directive */
  readonly robots?: 'index' | 'noindex' | 'follow' | 'nofollow';
  /** Analytics configuration */
  readonly analytics?: {
    readonly pageType: string;
    readonly section?: string;
    readonly category?: string;
  };
}

/**
 * Route access control configuration
 */
export interface RouteAccessConfig {
  /** Whether route is publicly accessible */
  readonly isPublic: boolean;
  /** Required roles for access */
  readonly requiredRoles?: readonly string[];
  /** Required permissions for access */
  readonly requiredPermissions?: readonly string[];
  /** Feature flag that must be enabled */
  readonly featureFlag?: string;
  /** Additional required feature flags */
  readonly requiredFlags?: readonly string[];
}

// =============================================================================
// Route Definition Types
// =============================================================================

/**
 * Complete route definition with full type safety
 */
export interface RouteDefinition<
  TPath extends string = string,
  TParams extends Record<string, string> = Record<string, string>,
  _TSearchParams extends Record<string, string | undefined> = Record<string, string | undefined>,
  _TLoaderData = unknown
> {
  /** Unique route identifier */
  readonly id: string;

  /** URL path pattern (e.g., '/users/:id') */
  readonly path: TPath;

  /** Human-readable name for debugging/navigation */
  readonly displayName: string;

  /** Source file path (for error messages) */
  readonly sourceFile: string;

  /** Extracted parameter names from path */
  readonly paramNames: ReadonlyArray<keyof TParams>;

  /** Layout to wrap this route (if any) */
  readonly layout?: string;

  /** Feature module this route belongs to */
  readonly feature?: string;

  /** Route metadata */
  readonly meta: RouteMetadata;

  /** Access control configuration */
  readonly access: RouteAccessConfig;

  /** Whether route has a loader function */
  readonly hasLoader: boolean;

  /** Whether route has an action function */
  readonly hasAction: boolean;
}

// =============================================================================
// Route Module Types
// =============================================================================

/**
 * Route module exports (what each route file can export)
 */
export interface RouteModule {
  /** Default export: the route component */
  default: ComponentType<unknown>;

  /** Optional: route loader function for data fetching */
  loader?: LoaderFunction;

  /** Optional: route action function for mutations */
  action?: ActionFunction;

  /** Optional: route metadata */
  meta?: RouteMetadata;

  /** Optional: access control */
  access?: RouteAccessConfig;

  /** Optional: error boundary component */
  ErrorBoundary?: ComponentType<{ error: Error }>;

  /** Optional: pending/loading UI */
  PendingComponent?: ComponentType;

  /** Optional: route handle for useMatches */
  handle?: Record<string, unknown>;
}

/**
 * Lazy route module with preload capability
 */
export interface LazyRouteModule extends LazyExoticComponent<ComponentType<unknown>> {
  preload?: () => Promise<RouteModule>;
}

// =============================================================================
// Route Discovery Types
// =============================================================================

/**
 * Discovery result from file system scan
 */
export interface DiscoveredRoute {
  /** Absolute file path */
  readonly filePath: string;
  /** Path relative to scan root */
  readonly relativePath: string;
  /** Generated URL path */
  readonly urlPath: string;
  /** Parsed path segments */
  readonly segments: readonly ParsedRouteSegment[];
  /** Whether this is a layout file */
  readonly isLayout: boolean;
  /** Whether this is an index file */
  readonly isIndex: boolean;
  /** Parent layout file path (if any) */
  readonly parentLayout?: string;
  /** Nesting depth */
  readonly depth: number;
}

/**
 * Route conflict information
 */
export interface RouteConflict {
  /** Type of conflict */
  readonly type: 'exact' | 'ambiguous' | 'shadow';
  /** Conflicting path pattern */
  readonly path: string;
  /** Files involved in conflict */
  readonly files: readonly string[];
  /** Human-readable message */
  readonly message: string;
  /** Severity level */
  readonly severity: 'error' | 'warning';
}

// =============================================================================
// Discovery Configuration
// =============================================================================

/**
 * Route discovery configuration
 */
export interface DiscoveryConfig {
  /** Root directories to scan for routes */
  readonly scanPaths: readonly string[];

  /** File extensions to consider as routes */
  readonly extensions: readonly string[];

  /** Glob patterns to ignore */
  readonly ignorePatterns: readonly string[];

  /** Layout file naming convention (default: '_layout') */
  readonly layoutFileName: string;

  /** Enable parallel scanning for large codebases */
  readonly parallel: boolean;

  /** Cache discovery results */
  readonly cacheResults: boolean;
}

/**
 * Default discovery configuration
 */
export const DEFAULT_DISCOVERY_CONFIG: DiscoveryConfig = {
  scanPaths: ['src/routes', 'src/features'],
  extensions: ['.tsx', '.ts'],
  ignorePatterns: [
    '**/*.test.{ts,tsx}',
    '**/*.spec.{ts,tsx}',
    '**/__tests__/**',
    '**/*.stories.{ts,tsx}',
    '**/components/**',
    '**/hooks/**',
    '**/utils/**',
    '**/wiring/**',
    '**/types/**',
    '**/*.d.ts',
  ],
  layoutFileName: '_layout',
  parallel: true,
  cacheResults: true,
};

// =============================================================================
// Router Factory Types
// =============================================================================

/**
 * Router creation options
 */
export interface CreateRouterOptions {
  /** Enable feature route integration */
  includeFeatures?: boolean;

  /** Custom error element */
  errorElement?: ReactNode;

  /** Custom loading fallback */
  loadingFallback?: ReactNode;

  /** Base path for all routes */
  basename?: string;

  /** Enable route prefetching on hover */
  prefetchOnHover?: boolean;

  /** Enable route prefetching on focus */
  prefetchOnFocus?: boolean;

  /** Delay before prefetch triggers (ms) */
  prefetchDelay?: number;
}

/**
 * Extended RouteObject with additional properties
 */
export type ExtendedRouteObject = RouteObject & {
  /** Route metadata */
  meta?: RouteMetadata;
  /** Access control */
  access?: RouteAccessConfig;
  /** Preload function for prefetching */
  preload?: () => Promise<unknown>;
};

// =============================================================================
// Type Utilities
// =============================================================================

/**
 * Prettify a type for better IntelliSense display
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * Make specific keys optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Extract route path from route ID
 */
export type RoutePathFromId<
  TRegistry extends Record<string, string>,
  TId extends keyof TRegistry
> = TRegistry[TId];

// =============================================================================
// Advanced Type Utilities for Route Discovery
// =============================================================================

/**
 * Extract all segments from a route path
 *
 * @example
 * ExtractSegments<'/users/:id/posts/:postId'> = ['users', ':id', 'posts', ':postId']
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
 * Count the depth of a route path
 *
 * @example
 * RouteDepth<'/users/:id/posts'> = 3
 */
export type RouteDepth<TPath extends string> = ExtractSegments<TPath>['length'];

/**
 * Check if a route path is a child of another
 *
 * @example
 * IsChildRoute<'/users/:id', '/users'> = true
 * IsChildRoute<'/users', '/users/:id'> = false
 */
export type IsChildRoute<TChild extends string, TParent extends string> =
  TChild extends `${TParent}/${infer _Rest}` ? true : false;

/**
 * Get the parent path of a route
 *
 * @example
 * GetParentPath<'/users/:id/posts'> = '/users/:id'
 */
export type GetParentPath<TPath extends string> =
  TPath extends `${infer Parent}/${infer _Last}`
    ? Parent extends ''
      ? '/'
      : Parent
    : '/';

/**
 * Check if a path segment is dynamic
 */
export type IsDynamicSegment<TSegment extends string> =
  TSegment extends `:${infer _Param}` ? true : false;

/**
 * Check if a path segment is optional
 */
export type IsOptionalSegment<TSegment extends string> =
  TSegment extends `:${infer _Param}?` ? true : false;

/**
 * Check if a path segment is catch-all
 */
export type IsCatchAllSegment<TSegment extends string> =
  TSegment extends '*' ? true : false;

/**
 * Get all static segments from a path
 */
export type StaticSegments<TPath extends string> = {
  [K in keyof ExtractSegments<TPath>]: K extends number ? 
    (ExtractSegments<TPath>[K] extends string ? 
      (IsDynamicSegment<ExtractSegments<TPath>[K]> extends true
        ? never
        : ExtractSegments<TPath>[K]) : never) : never;
}[number];

/**
 * Get all dynamic segments from a path
 */
export type DynamicSegments<TPath extends string> = {
  [K in keyof ExtractSegments<TPath>]: K extends number ? 
    (ExtractSegments<TPath>[K] extends string ? 
      (IsDynamicSegment<ExtractSegments<TPath>[K]> extends true
        ? ExtractSegments<TPath>[K]
        : never) : never) : never;
}[number];

// =============================================================================
// Route Validation Types
// =============================================================================

/**
 * Validation result for a route
 */
export interface RouteValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly RouteValidationError[];
  readonly warnings: readonly RouteValidationWarning[];
  readonly suggestions: readonly RouteFixSuggestion[];
}

/**
 * Route validation error
 */
export interface RouteValidationError {
  readonly code: RouteErrorCode;
  readonly message: string;
  readonly filePath: string;
  readonly line?: number;
  readonly column?: number;
}

/**
 * Route validation warning
 */
export interface RouteValidationWarning {
  readonly code: RouteWarningCode;
  readonly message: string;
  readonly filePath: string;
  readonly suggestion?: string;
}

/**
 * Suggestion for fixing a route issue
 */
export interface RouteFixSuggestion {
  readonly description: string;
  readonly oldValue: string;
  readonly newValue: string;
  readonly autoFixable: boolean;
}

/**
 * Error codes for route validation
 */
export type RouteErrorCode =
  | 'DUPLICATE_PATH'
  | 'INVALID_SEGMENT_NAME'
  | 'MISSING_DEFAULT_EXPORT'
  | 'CONFLICTING_PARAMS'
  | 'INVALID_LAYOUT_STRUCTURE'
  | 'CIRCULAR_LAYOUT_REFERENCE'
  | 'CATCH_ALL_NOT_LAST'
  | 'AMBIGUOUS_DYNAMIC_ROUTES';

/**
 * Warning codes for route validation
 */
export type RouteWarningCode =
  | 'STATIC_SHADOWED_BY_DYNAMIC'
  | 'DEEP_NESTING'
  | 'UNUSED_LAYOUT'
  | 'MISSING_ERROR_BOUNDARY'
  | 'MISSING_LOADER'
  | 'REDUNDANT_INDEX_ROUTE'
  | 'INCONSISTENT_NAMING';

// =============================================================================
// Route Middleware Types
// =============================================================================

/**
 * Route middleware function signature
 */
export type RouteMiddleware<TContext = unknown, TResult = void> = (
  context: RouteMiddlewareContext<TContext>
) => TResult | Promise<TResult>;

/**
 * Context passed to route middleware
 */
export interface RouteMiddlewareContext<TContext = unknown> {
  /** Current route path */
  readonly path: string;
  /** Route parameters */
  readonly params: Record<string, string>;
  /** Query parameters */
  readonly query: Record<string, string>;
  /** Custom context data */
  readonly data: TContext;
  /** Navigate to a different route */
  readonly redirect: (path: string) => never;
  /** Continue to next middleware */
  readonly next: () => void;
}

/**
 * Middleware chain configuration
 */
export interface MiddlewareChain<TContext = unknown> {
  readonly middlewares: readonly RouteMiddleware<TContext>[];
  readonly fallback?: (error: Error) => void;
}

// =============================================================================
// Route Prefetch Configuration Types
// =============================================================================

/**
 * Prefetch strategy for a route
 */
export type PrefetchStrategy =
  | 'hover'
  | 'viewport'
  | 'idle'
  | 'mount'
  | 'none';

/**
 * Prefetch priority level
 */
export type PrefetchPriority = 'high' | 'medium' | 'low';

/**
 * Route prefetch configuration
 */
export interface RoutePrefetchConfig {
  /** Strategy for triggering prefetch */
  readonly strategy: PrefetchStrategy;
  /** Priority level */
  readonly priority: PrefetchPriority;
  /** Delay before prefetching (ms) */
  readonly delay?: number;
  /** Whether to prefetch data in addition to code */
  readonly includeData?: boolean;
  /** Custom query keys to prefetch */
  readonly queryKeys?: readonly unknown[][];
  /** Network conditions to respect */
  readonly networkConditions?: {
    /** Minimum connection quality */
    readonly minQuality?: '4g' | '3g' | '2g';
    /** Respect data saver mode */
    readonly respectDataSaver?: boolean;
  };
}

/**
 * Default prefetch configuration
 */
export const DEFAULT_PREFETCH_CONFIG: RoutePrefetchConfig = {
  strategy: 'hover',
  priority: 'medium',
  delay: 100,
  includeData: false,
  networkConditions: {
    minQuality: '3g',
    respectDataSaver: true,
  },
};

// =============================================================================
// Route Navigation Types
// =============================================================================

/**
 * Type-safe navigation options
 */
export interface TypedNavigationOptions {
  /** Replace current history entry */
  readonly replace?: boolean;
  /** State to pass to route */
  readonly state?: unknown;
  /** Prevent scroll restoration */
  readonly preventScrollReset?: boolean;
  /** Relative navigation base */
  readonly relative?: 'route' | 'path';
  /** Scroll to element after navigation */
  readonly scrollToId?: string;
}

/**
 * Navigation result
 */
export interface NavigationResult {
  readonly success: boolean;
  readonly path: string;
  readonly error?: Error;
}

// =============================================================================
// Route Analytics Types
// =============================================================================

/**
 * Route analytics event
 */
export interface RouteAnalyticsEvent {
  readonly eventType: 'navigation' | 'prefetch' | 'error';
  readonly path: string;
  readonly timestamp: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Route performance metrics
 */
export interface RoutePerformanceMetrics {
  /** Time to first byte */
  readonly ttfb: number;
  /** Time to interactive */
  readonly tti: number;
  /** Largest contentful paint */
  readonly lcp: number;
  /** Cumulative layout shift */
  readonly cls: number;
  /** First input delay */
  readonly fid: number;
}

// =============================================================================
// Route Discovery Result Types
// =============================================================================

/**
 * Complete discovery result with all metadata
 */
export interface RouteDiscoveryResult {
  /** All discovered routes */
  readonly routes: readonly DiscoveredRoute[];
  /** Layout hierarchy */
  readonly layoutTree: RouteLayoutTree;
  /** Conflict detection results */
  readonly conflicts: {
    readonly hasErrors: boolean;
    readonly hasWarnings: boolean;
    readonly items: readonly RouteConflict[];
  };
  /** Discovery statistics */
  readonly stats: RouteDiscoveryStats;
  /** Generated type definitions */
  readonly generatedTypes?: string;
}

/**
 * Layout tree structure
 */
export interface RouteLayoutTree {
  readonly root: RouteLayoutNode | null;
  readonly orphanedLayouts: readonly string[];
}

/**
 * Node in the layout tree
 */
export interface RouteLayoutNode {
  readonly layoutPath: string;
  readonly children: readonly RouteLayoutNode[];
  readonly routes: readonly DiscoveredRoute[];
}

/**
 * Discovery statistics
 */
export interface RouteDiscoveryStats {
  /** Total routes discovered */
  readonly totalRoutes: number;
  /** Number of layouts */
  readonly layoutCount: number;
  /** Number of dynamic routes */
  readonly dynamicRouteCount: number;
  /** Maximum route depth */
  readonly maxDepth: number;
  /** Scan duration in ms */
  readonly scanDurationMs: number;
  /** Files scanned */
  readonly filesScanned: number;
  /** Files ignored */
  readonly filesIgnored: number;
}

// =============================================================================
// ADVANCED CONDITIONAL TYPE HELPERS
// =============================================================================

/**
 * Extract all parameter names as a union type
 *
 * @template TPath - A route path string
 *
 * @example
 * ```typescript
 * type Params = ParamNames<'/users/:id/posts/:postId'>;
 * // Result: 'id' | 'postId'
 * ```
 */
export type ParamNames<TPath extends string> = keyof RouteParams<TPath>;

/**
 * Check if a route requires any parameters
 *
 * @template TPath - A route path string
 *
 * @example
 * ```typescript
 * type NeedsParams = RequiresParams<'/users/:id'>; // true
 * type NoParams = RequiresParams<'/about'>; // false
 * ```
 */
export type RequiresParams<TPath extends string> =
  keyof ExtractRequiredParams<TPath> extends never ? false : true;

/**
 * Check if a route has only optional parameters
 *
 * @template TPath - A route path string
 *
 * @example
 * ```typescript
 * type OnlyOptional = HasOnlyOptionalParams<'/search/:query?'>; // true
 * type HasRequired = HasOnlyOptionalParams<'/users/:id'>; // false
 * ```
 */
export type HasOnlyOptionalParams<TPath extends string> =
  RequiresParams<TPath> extends false
    ? keyof ExtractOptionalParams<TPath> extends never
      ? false
      : true
    : false;

/**
 * Get the number of parameters in a route
 *
 * @template TPath - A route path string
 * @returns A numeric literal type
 */
export type ParamCount<TPath extends string> =
  keyof RouteParams<TPath> extends never
    ? 0
    : TupleFromUnion<keyof RouteParams<TPath>>['length'];

/**
 * Convert a union type to a tuple (for counting)
 * @internal
 */
type TupleFromUnion<T, L = LastOfUnion<T>> = [T] extends [never]
  ? []
  : [...TupleFromUnion<Exclude<T, L>>, L];

/**
 * Get the last element of a union type
 * @internal
 */
type LastOfUnion<T> = UnionToIntersection<
  T extends unknown ? (t: T) => T : never
> extends (t: infer L) => unknown
  ? L
  : never;

/**
 * Convert a union to an intersection
 * @internal
 */
type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

/**
 * Create a typed link props object for a route
 *
 * @template TPath - The route path
 *
 * @example
 * ```typescript
 * type UserLinkProps = TypedLinkProps<'/users/:id'>;
 * // { to: '/users/:id'; params: { id: string }; query?: Record<string, string> }
 * ```
 */
export type TypedLinkProps<TPath extends string> = RequiresParams<TPath> extends true
  ? {
      readonly to: TPath;
      readonly params: RouteParams<TPath>;
      readonly query?: Record<string, string | undefined>;
    }
  : HasOnlyOptionalParams<TPath> extends true
    ? {
        readonly to: TPath;
        readonly params?: RouteParams<TPath>;
        readonly query?: Record<string, string | undefined>;
      }
    : {
        readonly to: TPath;
        readonly query?: Record<string, string | undefined>;
      };

/**
 * Create a type-safe navigation function type
 *
 * @template TPath - The route path
 *
 * @example
 * ```typescript
 * type NavigateToUser = TypedNavigate<'/users/:id'>;
 * const navigate: NavigateToUser = (params) => { ... };
 * navigate({ id: '123' }); // Type-safe!
 * ```
 */
export type TypedNavigate<TPath extends string> = RequiresParams<TPath> extends true
  ? (params: RouteParams<TPath>, options?: TypedNavigationOptions) => void
  : HasOnlyOptionalParams<TPath> extends true
    ? (params?: RouteParams<TPath>, options?: TypedNavigationOptions) => void
    : (options?: TypedNavigationOptions) => void;

/**
 * Validate that a path string matches the expected route pattern
 *
 * @template TPath - The route pattern
 * @template TActual - The actual path string to validate
 *
 * @example
 * ```typescript
 * type Valid = ValidatePath<'/users/:id', '/users/123'>; // true
 * type Invalid = ValidatePath<'/users/:id', '/posts/123'>; // false
 * ```
 */
export type ValidatePath<TPath extends string, TActual extends string> =
  TActual extends TPath ? true : false;

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
  ? `${Start}${TParams[Param & keyof TParams]}/${BuildPath<`/${Rest}`, TParams>}`
  : TPath extends `${infer Start}:${infer Param}`
    ? `${Start}${TParams[Param & keyof TParams]}`
    : TPath;

/**
 * Extract query param types from a search params schema
 *
 * @template TSchema - A Zod schema or object type
 */
export type QueryParamsFromSchema<TSchema> = TSchema extends { parse: (data: unknown) => infer R }
  ? R extends Record<string, unknown>
    ? R
    : never
  : TSchema extends Record<string, unknown>
    ? TSchema
    : never;

/**
 * Create a complete route definition with all metadata
 *
 * @template TPath - The route path pattern
 * @template TMeta - Optional metadata type
 *
 * @example
 * ```typescript
 * const userRoute: CompleteRouteDefinition<'/users/:id', { title: string }> = {
 *   path: '/users/:id',
 *   params: ['id'],
 *   meta: { title: 'User Profile' },
 *   component: UserPage,
 * };
 * ```
 */
export type CompleteRouteDefinition<
  TPath extends string,
  TMeta extends Record<string, unknown> = Record<string, unknown>
> = {
  readonly path: TPath;
  readonly params: ReadonlyArray<ParamNames<TPath>>;
  readonly meta?: TMeta;
  readonly component: ComponentType<unknown>;
  readonly loader?: LoaderFunction;
  readonly action?: ActionFunction;
  readonly errorElement?: ReactNode;
};

/**
 * Infer route types from a route configuration object
 *
 * @template TConfig - A route configuration object
 */
export type InferRouteTypes<TConfig extends Record<string, { path: string }>> = {
  [K in keyof TConfig]: {
    path: TConfig[K]['path'];
    params: RouteParams<TConfig[K]['path']>;
    builder: RouteBuilder<TConfig[K]['path']>;
  };
};

/**
 * Create a type-safe route map from paths
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
 * // RouteMap.user.params = { id: string }
 * ```
 */
export type TypedRouteMap<TPaths extends Record<string, string>> = {
  readonly [K in keyof TPaths]: {
    readonly path: TPaths[K];
    readonly params: RouteParams<TPaths[K]>;
    readonly hasParams: HasParams<TPaths[K]>;
    readonly requiresParams: RequiresParams<TPaths[K]>;
  };
};

/**
 * Merge multiple route configurations
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
    : Record<string, never>;

// =============================================================================
// ROUTE PATH BUILDER UTILITIES
// =============================================================================

/**
 * Create a route path builder function with full type safety
 *
 * @deprecated Use `createRouteBuilder` from `./route-builder` instead.
 * This function has been removed to consolidate path building logic
 * and eliminate circular dependencies.
 *
 * @example
 * ```typescript
 * // Instead of:
 * import { createPathBuilder } from './types';
 * const userPath = createPathBuilder('/users/:id');
 *
 * // Use:
 * import { createRouteBuilder } from './route-builder';
 * const userPath = createRouteBuilder('/users/:id');
 * ```
 */
// REMOVED: Re-export caused circular dependency (route-builder → scanner → types → route-builder)
// Import directly from './route-builder' instead

/**
 * Validate that provided params match the expected route params
 *
 * @param path - The route path pattern
 * @param params - The params to validate
 * @returns True if params are valid
 *
 * @example
 * ```typescript
 * validateRouteParams('/users/:id', { id: '123' }); // true
 * validateRouteParams('/users/:id', { userId: '123' }); // false
 * ```
 */
export function validateRouteParams<TPath extends string>(
  path: TPath,
  params: Record<string, unknown>
): params is RouteParams<TPath> {
  const expectedParams = (path.match(/:([a-zA-Z0-9_]+)\??/g) ?? []).map((p) => p.slice(1));
  const providedParams = Object.keys(params);

  // Check all required params are provided
  const requiredParams = expectedParams.filter((p) => !p.endsWith('?'));
  for (const required of requiredParams) {
    if (!providedParams.includes(required)) {
      return false;
    }
  }

  return true;
}

/**
 * Extract parameter names from a route path
 *
 * @deprecated Use `extractParamNames` from `./scanner` instead.
 * Re-export removed to eliminate circular dependencies.
 *
 * @example
 * ```typescript
 * // Instead of:
 * import { extractParamNames } from './types';
 *
 * // Use:
 * import { extractParamNames } from './scanner';
 * ```
 */
// REMOVED: Re-export caused circular dependency (scanner → types → scanner)
// Import directly from './scanner' instead

/**
 * Check if a path matches a route pattern
 *
 * @param pattern - The route pattern
 * @param path - The actual path to check
 * @returns True if the path matches the pattern
 *
 * @example
 * ```typescript
 * matchesPattern('/users/:id', '/users/123'); // true
 * matchesPattern('/users/:id', '/posts/123'); // false
 * ```
 */
export function matchesPattern(pattern: string, path: string): boolean {
  const regexPattern = pattern
    .replace(/:[^/?]+\?/g, '([^/]*)?') // Optional params
    .replace(/:[^/]+/g, '([^/]+)') // Required params
    .replace(/\//g, '\\/');

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

/**
 * Parse route params from a path given a pattern
 *
 * @param pattern - The route pattern
 * @param path - The actual path to parse
 * @returns The parsed parameters or null if no match
 *
 * @example
 * ```typescript
 * parseRouteParams('/users/:id', '/users/123');
 * // { id: '123' }
 * ```
 */
export function parseRouteParams<TPath extends string>(
  pattern: TPath,
  path: string
): RouteParams<TPath> | null {
  const paramNames = (pattern.match(/:([a-zA-Z0-9_]+)\??/g) ?? []).map((p) => p.slice(1));
  const regexPattern = pattern
    .replace(/:[^/?]+\?/g, '([^/]*)?')
    .replace(/:[^/]+/g, '([^/]+)')
    .replace(/\//g, '\\/');

  const regex = new RegExp(`^${regexPattern}$`);
  const match = path.match(regex);

  if (!match) {
    return null;
  }

  const params: Record<string, string> = {};
  for (let i = 0; i < paramNames.length; i++) {
    const value = match[i + 1];
    const name = paramNames[i];
    if (value !== undefined && value !== '' && name !== undefined && name !== '') {
      params[name] = decodeURIComponent(value);
    }
  }

  return params as RouteParams<TPath>;
}

// =============================================================================
// ADVANCED DISCOVERY TYPES
// =============================================================================

/**
 * Extended discovery configuration for advanced scanning
 */
export interface AdvancedDiscoveryConfig extends DiscoveryConfig {
  /** Enable watch mode for hot reloading */
  readonly watchMode?: boolean;
  /** Debounce delay for file changes (ms) */
  readonly debounceMs?: number;
  /** Enable code generation */
  readonly generateCode?: boolean;
  /** Output directory for generated code */
  readonly outputDir?: string;
  /** Custom file type classifier */
  readonly classifyFile?: (filename: string) => string;
}

// =============================================================================
// PARALLEL ROUTES TYPES
// =============================================================================

/**
 * Parallel route slot definition
 */
export interface ParallelRouteSlotDefinition {
  /** Slot name (e.g., '@modal', '@sidebar') */
  readonly name: string;
  /** Component to render in slot */
  readonly component: ComponentType<unknown>;
  /** Loading fallback */
  readonly loading?: ComponentType;
  /** Error fallback */
  readonly error?: ComponentType<{ error: Error }>;
  /** Default when slot is inactive */
  readonly default?: ComponentType;
}

/**
 * Parallel routes configuration
 */
export interface ParallelRoutesDefinition {
  /** Named slots */
  readonly slots: Record<string, ParallelRouteSlotDefinition>;
  /** Layout wrapping all slots */
  readonly layout?: ComponentType<{ children: ReactNode }>;
}

// =============================================================================
// INTERCEPTING ROUTES TYPES
// =============================================================================

/**
 * Interception level for route interception
 */
export type InterceptionLevelType = '.' | '..' | '...' | '....';

/**
 * Intercepting route definition
 */
export interface InterceptingRouteDefinition {
  /** Route pattern to intercept */
  readonly pattern: string;
  /** Interception level */
  readonly level: InterceptionLevelType;
  /** Component for intercepted view */
  readonly interceptComponent: ComponentType<unknown>;
  /** Component for full page view */
  readonly fullComponent: ComponentType<unknown>;
  /** Allowed origin paths */
  readonly allowedOrigins?: readonly string[];
}

// =============================================================================
// ROUTE GUARD TYPES
// =============================================================================

/**
 * Guard execution timing
 */
export type GuardTimingType = 'canActivate' | 'canDeactivate' | 'canMatch' | 'canLoad';

/**
 * Guard result type
 */
export type GuardResultType = 'allow' | 'deny' | 'redirect' | 'pending';

/**
 * Route guard result
 */
export interface RouteGuardResult {
  /** Result type */
  readonly type: GuardResultType;
  /** Redirect path (if redirect) */
  readonly redirectTo?: string;
  /** Denial reason (if deny) */
  readonly reason?: string;
  /** Additional data */
  readonly data?: Record<string, unknown>;
}

/**
 * Guard context passed to guard functions
 */
export interface RouteGuardContext {
  /** Target path */
  readonly path: string;
  /** Route parameters */
  readonly params: Record<string, string>;
  /** Query parameters */
  readonly query: Record<string, string>;
  /** Current user */
  readonly user?: RouteGuardUser;
  /** Feature flags */
  readonly features?: Record<string, boolean>;
  /** Custom data */
  readonly data: Record<string, unknown>;
}

/**
 * User context for guards
 */
export interface RouteGuardUser {
  /** User ID */
  readonly id: string;
  /** Is authenticated */
  readonly isAuthenticated: boolean;
  /** User roles */
  readonly roles: readonly string[];
  /** User permissions */
  readonly permissions: readonly string[];
}

/**
 * Route guard function type
 */
export type RouteGuardFunction = (
  context: RouteGuardContext
) => RouteGuardResult | Promise<RouteGuardResult>;

/**
 * Route guard configuration
 */
export interface RouteGuardConfig {
  /** Guard name */
  readonly name: string;
  /** Guard priority (lower = first) */
  readonly priority?: number;
  /** Routes to apply to */
  readonly routes?: readonly string[];
  /** Routes to exclude */
  readonly exclude?: readonly string[];
  /** Guard implementation */
  readonly canActivate?: RouteGuardFunction;
  /** Deactivation guard */
  readonly canDeactivate?: RouteGuardFunction;
}

// =============================================================================
// ROUTE MIDDLEWARE TYPES
// =============================================================================

/**
 * Route middleware function type
 */
export type RouteMiddlewareFunction = (
  context: RouteMiddlewareContext,
  next: () => void | Promise<void>
) => void | Promise<void>;

/**
 * Route middleware configuration
 */
export interface RouteMiddlewareConfig {
  /** Middleware name */
  readonly name: string;
  /** Middleware function */
  readonly handler: RouteMiddlewareFunction;
  /** Priority (lower = first) */
  readonly priority?: number;
  /** Routes to apply to */
  readonly routes?: readonly string[];
  /** Routes to exclude */
  readonly exclude?: readonly string[];
}

// =============================================================================
// ROUTE GROUP TYPES
// =============================================================================

/**
 * Route group configuration
 */
export interface RouteGroupDefinition {
  /** Group name */
  readonly name: string;
  /** Display name */
  readonly displayName?: string;
  /** Group layout component */
  readonly layout?: ComponentType<{ children: ReactNode }>;
  /** Guards for all routes in group */
  readonly guards?: readonly RouteGuardConfig[];
  /** Middleware for all routes in group */
  readonly middleware?: readonly RouteMiddlewareConfig[];
  /** Group metadata */
  readonly meta?: RouteGroupMetadata;
  /** Parent group */
  readonly parent?: string;
}

/**
 * Route group metadata
 */
export interface RouteGroupMetadata {
  /** Requires authentication */
  readonly requiresAuth?: boolean;
  /** Required roles */
  readonly roles?: readonly string[];
  /** Required permissions */
  readonly permissions?: readonly string[];
  /** Feature flag dependency */
  readonly featureFlag?: string;
}

// =============================================================================
// CATCH-ALL ROUTE TYPES
// =============================================================================

/**
 * Catch-all route configuration
 */
export interface CatchAllRouteDefinition {
  /** Base path */
  readonly basePath: string;
  /** Parameter name for segments */
  readonly paramName: string;
  /** Whether optional (can match base path alone) */
  readonly optional: boolean;
  /** Component to render */
  readonly component: ComponentType<CatchAllRouteComponentProps>;
  /** Maximum segments allowed */
  readonly maxSegments?: number;
  /** Segment validator */
  readonly validateSegment?: (segment: string) => boolean;
}

/**
 * Props passed to catch-all route component
 */
export interface CatchAllRouteComponentProps {
  /** Captured segments */
  readonly segments: readonly string[];
  /** Joined path */
  readonly joinedPath: string;
  /** Segment count */
  readonly depth: number;
  /** Is base path (no segments) */
  readonly isBase: boolean;
}

// =============================================================================
// OPTIONAL SEGMENT TYPES
// =============================================================================

/**
 * Optional segment configuration
 */
export interface OptionalSegmentDefinition<T = string> {
  /** Segment name */
  readonly name: string;
  /** Default value */
  readonly defaultValue: T;
  /** Validator */
  readonly validate?: (value: string) => boolean;
  /** Transformer */
  readonly transform?: (value: string) => T;
  /** Allowed values */
  readonly allowedValues?: readonly T[];
}

/**
 * Route with optional segments
 */
export interface OptionalSegmentRouteDefinition {
  /** Base path */
  readonly basePath: string;
  /** Optional segments */
  readonly segments: readonly OptionalSegmentDefinition[];
  /** Component */
  readonly component: ComponentType<unknown>;
}

// =============================================================================
// DISCOVERY EVENT TYPES
// =============================================================================

/**
 * Discovery event type
 */
export type RouteDiscoveryEventType =
  | 'scan-start'
  | 'scan-complete'
  | 'route-found'
  | 'route-changed'
  | 'route-removed'
  | 'error';

/**
 * Discovery event
 */
export interface RouteDiscoveryEvent {
  /** Event type */
  readonly type: RouteDiscoveryEventType;
  /** Event timestamp */
  readonly timestamp: number;
  /** Event data */
  readonly data?: unknown;
}

/**
 * Discovery event listener
 */
export type RouteDiscoveryEventListener = (event: RouteDiscoveryEvent) => void;
