/**
 * @file Core Routing Utilities
 * @description Framework-agnostic, reusable routing utilities that can be used
 * in any JavaScript/TypeScript project. These utilities provide the foundation
 * for building type-safe routing systems.
 *
 * @module @/lib/routing/core
 *
 * ## Features
 *
 * - **Path Utilities**: Build, parse, and match URL paths with parameters
 * - **Type System**: Compile-time type extraction for route parameters
 * - **Segment Parsing**: Parse file-system routing conventions
 * - **Conflict Detection**: Build-time detection of route conflicts
 *
 * ## Usage
 *
 * ### Path Building
 * ```typescript
 * import { buildPath, extractParamNames, matchPathPattern } from '@/lib/routing/core';
 *
 * // Build a path with parameters
 * const path = buildPath('/users/:id', { id: '123' }); // '/users/123'
 *
 * // Extract parameter names
 * const params = extractParamNames('/users/:id'); // ['id']
 *
 * // Match a path against a pattern
 * const matches = matchPathPattern('/users/:id', '/users/123'); // true
 * ```
 *
 * ### Type-Safe Routing
 * ```typescript
 * import type { ExtractRouteParams, RouteBuilder } from '@/lib/routing/core';
 * import { createBuilder, createRegistry } from '@/lib/routing/core';
 *
 * // Define routes
 * const routes = {
 *   home: '/',
 *   users: '/users',
 *   userDetail: '/users/:id',
 * } as const;
 *
 * // Create type-safe builders
 * const registry = createRegistry(routes, buildPath);
 *
 * registry.userDetail({ id: '123' }); // Type-safe!
 * ```
 *
 * ### Segment Parsing
 * ```typescript
 * import { parseRouteSegment, parseDirectoryPath, segmentsToUrlPath } from '@/lib/routing/core';
 *
 * // Parse file-system routing conventions
 * const segment = parseRouteSegment('[id].tsx');
 * // { type: 'dynamic', name: ':id', paramName: 'id', ... }
 *
 * const segments = parseDirectoryPath('users/[id]', 'posts.tsx');
 * const urlPath = segmentsToUrlPath(segments); // '/users/:id/posts'
 * ```
 *
 * ### Conflict Detection
 * ```typescript
 * import { detectConflicts, validateRoutes } from '@/lib/routing/core';
 *
 * const result = detectConflicts(routes);
 * if (result.hasErrors) {
 *   console.error(result.report);
 * }
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Path Utilities
// =============================================================================

export {
  // Path building
  buildPath,
  buildQueryString,
  parseQueryString,

  // Parameter extraction
  extractParamNames,
  extractRequiredParams,
  extractOptionalParams,
  hasParams,
  hasDynamicSegments,
  hasCatchAll,

  // Pattern matching
  matchPathPattern,
  parsePathParams,

  // Path utilities
  getStaticPrefix,
  normalizePath,
  joinPath,
  splitPath,
  getPathDepth,
  isChildPath,
  getParentPath,
  getLastSegment,

  // Specificity
  getPatternSpecificity,
  comparePatternSpecificity,
} from './path-utils';

// =============================================================================
// Type System
// =============================================================================

export type {
  // Parameter extraction types
  ExtractRequiredParams,
  ExtractOptionalParams,
  ExtractRouteParams,
  HasParams,
  RequiresParams,
  HasOnlyOptionalParams,
  ParamsFor,

  // Segment types
  ExtractSegments,
  RouteDepth,
  IsChildRoute,
  GetParentPath,
  IsDynamicSegment,
  IsOptionalSegment,
  IsCatchAllSegment,

  // Builder types
  RouteBuilder,
  TypedRouteRegistry,

  // Navigation types
  TypedLinkProps,
  TypedNavigate,

  // Path building types
  BuildPath,

  // Map types
  TypedRouteMap,
  InferRouteTypes,
  MergeRoutes,

  // Utility types
  Prettify,
  PartialBy,
  RoutePathFromId,
  ParamNames,
  ParamCount,
} from './types';

export {
  // Runtime helpers
  createBuilder,
  createRegistry,
  validateParams,
} from './types';

// =============================================================================
// Segment Parsing
// =============================================================================

export type {
  RouteSegmentType,
  ParsedRouteSegment,
  SegmentParserConfig,
} from './segment-parser';

export {
  // Configuration
  DEFAULT_SEGMENT_PARSER_CONFIG,

  // Segment parsing
  parseRouteSegment,
  parseDirectoryPath,
  segmentsToUrlPath,

  // Segment utilities
  isDynamicSegment,
  isUrlSegment,
  extractSegmentParams,
  generateRouteId,
  generateDisplayName,
  calculateSegmentDepth,
  hasLayoutSegment,
  isIndexRoute,
} from './segment-parser';

// =============================================================================
// Conflict Detection
// =============================================================================

export type {
  RouteForConflictDetection,
  ConflictType,
  ConflictSeverity,
  RouteConflict,
  ConflictDetectionResult,
  ConflictDetectionOptions,
} from './conflict-detector';

export {
  // Main detection
  detectConflicts,

  // Specific detection
  findExactDuplicates,
  findDynamicShadows,
  findAmbiguousRoutes,
  findCatchAllConflicts,
  findNestedDynamicConflicts,
  findDeepNestingWarnings,
  findIndexLayoutConflicts,

  // Report generation
  generateConflictReport,

  // Specificity
  calculateRouteSpecificity,
  sortBySpecificity,

  // Validation
  validateRoutes,
  areRoutesValid,
} from './conflict-detector';
