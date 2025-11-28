/**
 * @file Advanced Routing Module Exports
 * @description Unified exports for advanced routing patterns including parallel routes,
 * intercepting routes, route groups, catch-all routes, optional segments, and middleware.
 *
 * @module @/lib/routing/advanced
 *
 * This module provides enterprise-grade routing patterns inspired by:
 * - Next.js App Router (parallel routes, intercepting routes, route groups)
 * - Remix (nested routing, middleware)
 * - Angular (route guards, resolvers)
 * - TanStack Router (type-safe patterns)
 *
 * @example
 * ```typescript
 * import {
 *   ParallelRoutes,
 *   InterceptingRouteManager,
 *   RouteGroupManager,
 *   CatchAllRoute,
 *   OptionalSegmentRouteBuilder,
 *   MiddlewareChain,
 * } from '@/lib/routing/advanced';
 * ```
 */

// =============================================================================
// Parallel Routes
// =============================================================================

export {
  // Classes
  ParallelRoutes,

  // Factory functions
  createParallelRoutes,
  createSlot,

  // Utility functions
  isSlotSegment,
  extractSlotName,
  createSlotPath,
  mergeSlotStates,
  sortSlotsByPriority,

  // Type guards
  isParallelRouteSlot,
  isSlotMatch,

  // Constants
  SLOT_PREFIX,
  DEFAULT_SLOT_NAME,

  // Types
  type ParallelRouteSlot,
  type ParallelRoutesConfig,
  type SlotRenderState,
  type ParallelRoutesContext,
  type SlotMatch,
  type ParallelRouteResolution,
} from './parallel-routes';

// =============================================================================
// Intercepting Routes
// =============================================================================

export {
  // Enums
  InterceptionLevel,

  // Classes
  InterceptingRouteManager,

  // Factory functions
  createInterceptingRoute,
  createInterceptionContext,

  // Singleton access
  getInterceptionManager,
  resetInterceptionManager,

  // Utility functions
  parseInterceptionLevel,
  getInterceptionNotation,
  hasInterceptionMarker,
  extractInterceptionFromPattern,
  buildInterceptedPath,

  // Type guards
  isInterceptionContext,
  isInterceptionLevel,

  // Types
  type InterceptingRouteConfig,
  type InterceptedRouteProps,
  type InterceptionContext,
  type NavigationTrigger,
  type InterceptionResolution,
  type RegisteredInterceptor,
  type InterceptionManagerState,
} from './intercepting-routes';

// =============================================================================
// Route Groups
// =============================================================================

export {
  // Classes
  RouteGroupManager,

  // Factory functions
  createRouteGroup,
  createGroupedRoute,

  // Singleton access
  getRouteGroupManager,
  resetRouteGroupManager,

  // Utility functions
  isGroupSegment,
  extractGroupName,
  createGroupSegment,
  extractGroupsFromPath,
  stripGroupsFromPath,

  // Type guards
  isRouteGroup,
  isGroupedRoute,

  // Types
  type RouteGroupConfig,
  type RouteGroupGuard,
  type RouteGroupMiddleware,
  type RouteGroupContext,
  type RouteGroupUser,
  type RouteGroupMeta,
  type RouteGroupSEO,
  type RouteGroup,
  type GroupedRoute,
  type GroupResolution,
} from './route-groups';

// =============================================================================
// Catch-All Routes
// =============================================================================

export {
  // Classes
  CatchAllRoute,
  CatchAllRouteManager,

  // Factory functions
  createCatchAllRoute,
  createDocsCatchAll,
  createBlogCatchAll,

  // Singleton access
  getCatchAllManager,
  resetCatchAllManager,

  // Utility functions
  isCatchAllPattern,
  extractBasePath,
  isOptionalCatchAll,
  normalizeSegments,
  joinSegments,
  splitPath,

  // Type guards
  isCatchAllRouteProps,
  isCatchAllMatch,

  // Types
  type CatchAllRouteConfig,
  type CatchAllRouteProps,
  type CatchAllRouteMeta,
  type CatchAllMatch,
  type CatchAllError,
  type RegisteredCatchAllRoute,
  type CatchAllPattern,
} from './catch-all-routes';

// =============================================================================
// Optional Segments
// =============================================================================

export {
  // Classes
  OptionalSegment,
  OptionalSegmentRouteBuilder,
  OptionalSegmentManager,

  // Factory functions
  createOptionalSegment,
  createOptionalRoute,
  createPaginationSegment,
  createCategorySegment,
  createSortSegment,

  // Singleton access
  getOptionalSegmentManager,
  resetOptionalSegmentManager,

  // Utility functions
  hasOptionalSegments,
  extractOptionalSegmentNames,
  normalizeOptionalPattern,
  buildAllPossiblePaths,

  // Type guards
  isOptionalSegmentResolution,
  isOptionalRouteMatch,

  // Types
  type OptionalSegmentConfig,
  type OptionalSegmentResolution,
  type OptionalSegmentRoute,
  type OptionalRouteMatch,
  type OptionalRouteBuilderConfig,
} from './optional-segments';

// =============================================================================
// Route Middleware
// =============================================================================

export {
  // Classes
  MiddlewareChain,

  // Factory functions
  createMiddleware,
  createMiddlewareChain,
  createMiddlewareContext,

  // Built-in middleware factories
  createLoggingMiddleware,
  createAuthMiddleware,
  createRoleMiddleware,
  createRateLimitMiddleware,
  createAnalyticsMiddleware,

  // Singleton access
  getMiddlewareChain,
  resetMiddlewareChain,

  // Composition utilities
  compose,
  parallel,
  conditional,

  // Type guards
  isMiddlewareContext,
  isChainExecutionResult,

  // Types
  type MiddlewareFunction,
  type NextFunction,
  type MiddlewareContext,
  type MiddlewareUser,
  type MiddlewareResponse,
  type MiddlewareConfig,
  type RegisteredMiddleware,
  type ChainExecutionResult,
  type ChainExecutionOptions,
} from './route-middleware';
