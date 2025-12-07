/**
 * @file Route Conflict Detection Utilities
 * @description Framework-agnostic utilities for detecting route conflicts, ambiguities,
 * and potential issues in route configurations. Useful for build-time validation.
 *
 * @module @/lib/routing/core/conflict-detector
 *
 * @example
 * ```typescript
 * import {
 *   detectConflicts,
 *   findExactDuplicates,
 *   findDynamicShadows,
 *   sortBySpecificity,
 * } from '@/lib/routing/core/conflict-detector';
 *
 * const conflicts = detectConflicts(routes);
 * if (conflicts.hasErrors) {
 *   console.error(conflicts.report);
 * }
 * ```
 */

import type { ParsedRouteSegment } from './segment-parser';

// =============================================================================
// Types
// =============================================================================

/**
 * Represents a discovered route for conflict detection
 */
export interface RouteForConflictDetection {
  /** URL path pattern */
  readonly urlPath: string;
  /** Source file path (for error reporting) */
  readonly filePath: string;
  /** Parsed segments */
  readonly segments: readonly ParsedRouteSegment[];
  /** Whether this is a layout */
  readonly isLayout: boolean;
  /** Whether this is an index route */
  readonly isIndex: boolean;
  /** Nesting depth */
  readonly depth: number;
}

/**
 * Type of route conflict
 */
export type ConflictType = 'exact' | 'ambiguous' | 'shadow';

/**
 * Severity of a conflict
 */
export type ConflictSeverity = 'error' | 'warning';

/**
 * Route conflict information
 */
export interface RouteConflict {
  /** Type of conflict */
  readonly type: ConflictType;
  /** Conflicting path pattern */
  readonly path: string;
  /** Files involved in conflict */
  readonly files: readonly string[];
  /** Human-readable message */
  readonly message: string;
  /** Severity level */
  readonly severity: ConflictSeverity;
}

/**
 * Result of conflict detection analysis
 */
export interface ConflictDetectionResult {
  /** Whether any errors were detected */
  readonly hasErrors: boolean;
  /** Whether any warnings were detected */
  readonly hasWarnings: boolean;
  /** List of detected conflicts */
  readonly conflicts: readonly RouteConflict[];
  /** Human-readable report */
  readonly report: string;
}

/**
 * Options for conflict detection
 */
export interface ConflictDetectionOptions {
  /** Maximum nesting depth before warning */
  maxNestingDepth?: number;
  /** Check for nested dynamic conflicts */
  checkNestedDynamic?: boolean;
  /** Check for deep nesting warnings */
  checkDeepNesting?: boolean;
  /** Check for index-layout conflicts */
  checkIndexLayouts?: boolean;
}

// =============================================================================
// Main Detection Functions
// =============================================================================

/**
 * Detect all route conflicts in a set of routes
 *
 * @param routes - Routes to check for conflicts
 * @param options - Detection options
 * @returns Conflict detection result
 */
export function detectConflicts(
  routes: readonly RouteForConflictDetection[],
  options: ConflictDetectionOptions = {}
): ConflictDetectionResult {
  const {
    maxNestingDepth = 5,
    checkNestedDynamic = true,
    checkDeepNesting = true,
    checkIndexLayouts = true,
  } = options;

  const conflicts: RouteConflict[] = [];

  // Filter out layouts for most conflict detection
  const routeRoutes = routes.filter((r) => !r.isLayout);

  // Core conflict detection
  conflicts.push(...findExactDuplicates(routeRoutes));
  conflicts.push(...findDynamicShadows(routeRoutes));
  conflicts.push(...findAmbiguousRoutes(routeRoutes));
  conflicts.push(...findCatchAllConflicts(routeRoutes));

  // Advanced conflict detection
  if (checkNestedDynamic) {
    conflicts.push(...findNestedDynamicConflicts(routeRoutes));
  }

  if (checkDeepNesting) {
    conflicts.push(...findDeepNestingWarnings(routes, maxNestingDepth));
  }

  if (checkIndexLayouts) {
    conflicts.push(...findIndexLayoutConflicts(routes));
  }

  return {
    hasErrors: conflicts.some((c) => c.severity === 'error'),
    hasWarnings: conflicts.some((c) => c.severity === 'warning'),
    conflicts,
    report: generateConflictReport(conflicts),
  };
}

// =============================================================================
// Duplicate Detection
// =============================================================================

/**
 * Find routes with exactly the same URL path
 *
 * @param routes - Routes to check
 * @returns Array of duplicate conflicts
 */
export function findExactDuplicates(routes: readonly RouteForConflictDetection[]): RouteConflict[] {
  const conflicts: RouteConflict[] = [];
  const pathGroups = new Map<string, RouteForConflictDetection[]>();

  // Group routes by URL path
  for (const route of routes) {
    const existing = pathGroups.get(route.urlPath) ?? [];
    existing.push(route);
    pathGroups.set(route.urlPath, existing);
  }

  // Find groups with more than one route
  for (const [path, routeGroup] of pathGroups) {
    if (routeGroup.length > 1) {
      conflicts.push({
        type: 'exact',
        path,
        files: routeGroup.map((r) => r.filePath),
        message: `Duplicate route definition for "${path}". Only one route file should define this path.`,
        severity: 'error',
      });
    }
  }

  return conflicts;
}

// =============================================================================
// Shadow Detection
// =============================================================================

/**
 * Find static routes that would be shadowed by dynamic routes
 *
 * Example: `/users/new` would be matched by `/users/:id` before reaching the static route
 *
 * @param routes - Routes to check
 * @returns Array of shadow conflicts
 */
export function findDynamicShadows(routes: readonly RouteForConflictDetection[]): RouteConflict[] {
  const conflicts: RouteConflict[] = [];

  // Separate static and dynamic routes
  const staticRoutes = routes.filter(
    (r) => !r.segments.some((s) => s.type === 'dynamic' || s.type === 'catchAll')
  );

  const dynamicRoutes = routes.filter((r) => r.segments.some((s) => s.type === 'dynamic'));

  // Check each static route against dynamic routes
  for (const staticRoute of staticRoutes) {
    for (const dynamicRoute of dynamicRoutes) {
      if (wouldShadow(dynamicRoute.urlPath, staticRoute.urlPath)) {
        conflicts.push({
          type: 'shadow',
          path: staticRoute.urlPath,
          files: [dynamicRoute.filePath, staticRoute.filePath],
          message:
            `Static route "${staticRoute.urlPath}" may be shadowed by dynamic route "${dynamicRoute.urlPath}". ` +
            `Consider renaming to avoid confusion or ensure proper route ordering.`,
          severity: 'warning',
        });
      }
    }
  }

  return conflicts;
}

/**
 * Check if a dynamic route pattern would match a static path
 */
function wouldShadow(dynamicPath: string, staticPath: string): boolean {
  const dynamicParts = dynamicPath.split('/').filter(Boolean);
  const staticParts = staticPath.split('/').filter(Boolean);

  // Different lengths can't shadow (unless catch-all)
  if (dynamicParts.length !== staticParts.length) {
    return false;
  }

  // Check each segment
  for (let i = 0; i < dynamicParts.length; i++) {
    const dynamicPart = dynamicParts[i];
    const staticPart = staticParts[i];

    if (dynamicPart == null || staticPart == null) {
      continue;
    }

    // Dynamic segment matches anything
    if (dynamicPart.startsWith(':')) {
      continue;
    }

    // Static segments must match exactly
    if (dynamicPart !== staticPart) {
      return false;
    }
  }

  return true;
}

// =============================================================================
// Ambiguous Route Detection
// =============================================================================

/**
 * Find ambiguous dynamic routes at the same path level
 *
 * Example: `[id].tsx` and `[slug].tsx` in the same directory
 *
 * @param routes - Routes to check
 * @returns Array of ambiguous conflicts
 */
export function findAmbiguousRoutes(routes: readonly RouteForConflictDetection[]): RouteConflict[] {
  const conflicts: RouteConflict[] = [];

  // Group routes by their "normalized" path (dynamic segments replaced)
  const normalizedGroups = new Map<string, RouteForConflictDetection[]>();

  for (const route of routes) {
    const normalized = normalizePathPattern(route.urlPath);
    const existing = normalizedGroups.get(normalized) ?? [];
    existing.push(route);
    normalizedGroups.set(normalized, existing);
  }

  // Find groups with multiple different dynamic param names
  for (const [, routeGroup] of normalizedGroups) {
    if (routeGroup.length <= 1) continue;

    // Check if they have different param names at the same position
    const paramSignatures = routeGroup.map((r) => getParamSignature(r.urlPath));
    const uniqueSignatures = new Set(paramSignatures);

    const [firstRoute] = routeGroup;
    if (uniqueSignatures.size > 1 && firstRoute) {
      conflicts.push({
        type: 'ambiguous',
        path: firstRoute.urlPath,
        files: routeGroup.map((r) => r.filePath),
        message:
          `Ambiguous dynamic routes with different parameter names: ${routeGroup.map((r) => r.filePath).join(', ')}. ` +
          `These routes are indistinguishable at runtime.`,
        severity: 'error',
      });
    }
  }

  return conflicts;
}

/**
 * Normalize a path pattern by replacing dynamic segments with placeholders
 */
function normalizePathPattern(path: string): string {
  return path
    .replace(/:[^/?]+\?/g, ':optional')
    .replace(/:[^/]+/g, ':param')
    .replace(/\*/g, ':catchall');
}

/**
 * Get a signature of parameter names in a path
 */
function getParamSignature(path: string): string {
  const params = path.match(/:[^/?]+/g) ?? [];
  return params.join(',');
}

// =============================================================================
// Catch-All Conflict Detection
// =============================================================================

/**
 * Find catch-all routes that conflict with each other
 *
 * @param routes - Routes to check
 * @returns Array of catch-all conflicts
 */
export function findCatchAllConflicts(
  routes: readonly RouteForConflictDetection[]
): RouteConflict[] {
  const conflicts: RouteConflict[] = [];

  const catchAllRoutes = routes.filter((r) => r.segments.some((s) => s.type === 'catchAll'));

  // Multiple catch-all routes at the same path prefix is an error
  const catchAllByPrefix = new Map<string, RouteForConflictDetection[]>();

  for (const route of catchAllRoutes) {
    const prefix = route.urlPath.replace(/\/\*$/, '');
    const existing = catchAllByPrefix.get(prefix) ?? [];
    existing.push(route);
    catchAllByPrefix.set(prefix, existing);
  }

  for (const [prefix, routeGroup] of catchAllByPrefix) {
    if (routeGroup.length > 1) {
      conflicts.push({
        type: 'exact',
        path: `${prefix}/*`,
        files: routeGroup.map((r) => r.filePath),
        message: `Multiple catch-all routes at "${prefix}/*". Only one catch-all route is allowed per path prefix.`,
        severity: 'error',
      });
    }
  }

  return conflicts;
}

// =============================================================================
// Advanced Conflict Detection
// =============================================================================

/**
 * Detect nested dynamic route conflicts
 *
 * Example: /users/:id/posts/:postId vs /users/:userId/comments/:commentId
 *
 * @param routes - Routes to check
 * @returns Array of nested dynamic conflicts
 */
export function findNestedDynamicConflicts(
  routes: readonly RouteForConflictDetection[]
): RouteConflict[] {
  const conflicts: RouteConflict[] = [];
  const dynamicRoutes = routes.filter(
    (r) => r.segments.filter((s) => s.type === 'dynamic').length >= 2
  );

  // Group by static prefix before first dynamic segment
  const groupedByPrefix = new Map<string, RouteForConflictDetection[]>();

  for (const route of dynamicRoutes) {
    const staticPrefix = getStaticPathPrefix(route.urlPath);
    const existing = groupedByPrefix.get(staticPrefix) ?? [];
    existing.push(route);
    groupedByPrefix.set(staticPrefix, existing);
  }

  // Check each group for nested conflicts
  for (const [prefix, routeGroup] of groupedByPrefix) {
    if (routeGroup.length <= 1) continue;

    // Check if routes have same structure but different param names
    const structures = routeGroup.map((r) => getRouteStructure(r.urlPath));
    const uniqueStructures = new Set(structures);

    // Same structure with different param names
    if (uniqueStructures.size === 1 && routeGroup.length > 1) {
      const paramSignatures = routeGroup.map((r) => getParamNames(r.urlPath).join(','));
      const uniqueParams = new Set(paramSignatures);

      if (uniqueParams.size > 1) {
        conflicts.push({
          type: 'ambiguous',
          path: prefix,
          files: routeGroup.map((r) => r.filePath),
          message:
            `Nested dynamic routes under "${prefix}" have conflicting parameter names. ` +
            `Routes: ${routeGroup.map((r) => r.urlPath).join(', ')}. ` +
            `This may cause confusion and runtime issues.`,
          severity: 'warning',
        });
      }
    }
  }

  return conflicts;
}

/**
 * Get the static prefix of a path (before first dynamic segment)
 */
function getStaticPathPrefix(path: string): string {
  const parts = path.split('/').filter(Boolean);
  const staticParts: string[] = [];

  for (const part of parts) {
    if (part.startsWith(':') || part === '*') break;
    staticParts.push(part);
  }

  return `/${staticParts.join('/')}`;
}

/**
 * Get route structure (static/dynamic pattern)
 */
function getRouteStructure(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith(':')) return ':param';
      if (part === '*') return '*';
      return 'static';
    })
    .join('/');
}

/**
 * Get parameter names from path
 */
function getParamNames(path: string): string[] {
  const matches = path.match(/:[^/?]+/g) ?? [];
  return matches.map((m) => m.slice(1).replace('?', ''));
}

/**
 * Detect deep nesting issues (warning)
 *
 * @param routes - Routes to check
 * @param maxDepth - Maximum allowed depth
 * @returns Array of deep nesting conflicts
 */
export function findDeepNestingWarnings(
  routes: readonly RouteForConflictDetection[],
  maxDepth: number = 5
): RouteConflict[] {
  const conflicts: RouteConflict[] = [];

  for (const route of routes) {
    if (route.depth > maxDepth) {
      conflicts.push({
        type: 'shadow', // Using shadow as a proxy for warning type
        path: route.urlPath,
        files: [route.filePath],
        message:
          `Route "${route.urlPath}" has ${route.depth} levels of nesting, ` +
          `exceeding the recommended maximum of ${maxDepth}. ` +
          `Consider flattening your route structure for better maintainability.`,
        severity: 'warning',
      });
    }
  }

  return conflicts;
}

/**
 * Detect index route conflicts
 *
 * Example: index.tsx and _layout.tsx both trying to render at same path
 *
 * @param routes - Routes to check
 * @returns Array of index-layout conflicts
 */
export function findIndexLayoutConflicts(
  routes: readonly RouteForConflictDetection[]
): RouteConflict[] {
  const conflicts: RouteConflict[] = [];

  const indexRoutes = routes.filter((r) => r.isIndex);
  const layoutRoutes = routes.filter((r) => r.isLayout);

  // Check for index routes without a layout
  for (const index of indexRoutes) {
    const hasLayout = layoutRoutes.some((layout) =>
      index.filePath.startsWith(layout.filePath.replace(/[/\\][^/\\]+$/, ''))
    );

    if (!hasLayout && index.depth > 1) {
      conflicts.push({
        type: 'shadow',
        path: index.urlPath,
        files: [index.filePath],
        message:
          `Index route at "${index.urlPath}" has no parent layout. ` +
          `Consider adding a _layout.tsx file for consistent page structure.`,
        severity: 'warning',
      });
    }
  }

  return conflicts;
}

// =============================================================================
// Report Generation
// =============================================================================

/**
 * Generate a human-readable conflict report
 *
 * @param conflicts - Array of conflicts
 * @returns Formatted report string
 */
export function generateConflictReport(conflicts: readonly RouteConflict[]): string {
  if (conflicts.length === 0) {
    return 'No route conflicts detected.';
  }

  const lines: string[] = ['', '='.repeat(70), '  ROUTE CONFLICT REPORT', '='.repeat(70), ''];

  const errors = conflicts.filter((c) => c.severity === 'error');
  const warnings = conflicts.filter((c) => c.severity === 'warning');

  if (errors.length > 0) {
    lines.push(`ERRORS (${errors.length}):`);
    lines.push('-'.repeat(50));
    lines.push('');

    for (const error of errors) {
      lines.push(`  [${error.type.toUpperCase()}] ${error.message}`);
      lines.push('');
      lines.push('  Files involved:');
      for (const file of error.files) {
        lines.push(`    - ${file}`);
      }
      lines.push('');
    }
  }

  if (warnings.length > 0) {
    lines.push(`WARNINGS (${warnings.length}):`);
    lines.push('-'.repeat(50));
    lines.push('');

    for (const warning of warnings) {
      lines.push(`  [${warning.type.toUpperCase()}] ${warning.message}`);
      lines.push('');
      lines.push('  Files involved:');
      for (const file of warning.files) {
        lines.push(`    - ${file}`);
      }
      lines.push('');
    }
  }

  lines.push('='.repeat(70));
  lines.push('');

  return lines.join('\n');
}

// =============================================================================
// Route Specificity
// =============================================================================

/**
 * Calculate route specificity for proper ordering
 *
 * Higher specificity = more specific route = should be matched first
 *
 * @param route - Route to calculate specificity for
 * @returns Specificity score
 */
export function calculateRouteSpecificity(route: RouteForConflictDetection): number {
  let specificity = 0;

  for (const segment of route.segments) {
    switch (segment.type) {
      case 'static':
        specificity += 100;
        break;
      case 'index':
        specificity += 90;
        break;
      case 'dynamic':
        specificity += 50;
        break;
      case 'optional':
        specificity += 30;
        break;
      case 'catchAll':
        specificity += 10;
        break;
      case 'group':
      case 'layout':
        // These don't affect specificity
        break;
    }
  }

  return specificity;
}

/**
 * Sort routes by specificity (most specific first)
 *
 * @param routes - Routes to sort
 * @returns Sorted routes array
 */
export function sortBySpecificity<T extends RouteForConflictDetection>(routes: readonly T[]): T[] {
  return [...routes].sort((a, b) => {
    const specA = calculateRouteSpecificity(a);
    const specB = calculateRouteSpecificity(b);

    // Higher specificity first
    if (specA !== specB) {
      return specB - specA;
    }

    // Same specificity: shorter path first
    if (a.depth !== b.depth) {
      return a.depth - b.depth;
    }

    // Same depth: alphabetical
    return a.urlPath.localeCompare(b.urlPath);
  });
}

// =============================================================================
// Validation Utilities
// =============================================================================

/**
 * Validate routes and throw on errors
 *
 * @param routes - Routes to validate
 * @throws Error if route conflicts are detected
 */
export function validateRoutes(routes: readonly RouteForConflictDetection[]): void {
  const result = detectConflicts(routes);

  if (result.hasErrors) {
    throw new Error(
      `Route conflict detection failed with ${result.conflicts.filter((c) => c.severity === 'error').length} error(s). ` +
        `See console for details.`
    );
  }
}

/**
 * Check if routes are valid (without throwing)
 *
 * @param routes - Routes to validate
 * @returns True if no errors found
 */
export function areRoutesValid(routes: readonly RouteForConflictDetection[]): boolean {
  const result = detectConflicts(routes);
  return !result.hasErrors;
}
