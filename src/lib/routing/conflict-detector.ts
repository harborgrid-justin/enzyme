/**
 * @file Route Conflict Detection
 * @description Build-time detection of conflicting, ambiguous, and shadowed routes
 *
 * This module wraps the core conflict detection utilities to work with
 * the DiscoveredRoute type from the routing system.
 */

import type { DiscoveredRoute, RouteConflict } from './types';
import {
  detectConflicts as coreDetectConflicts,
  findNestedDynamicConflicts as coreFindNestedDynamicConflicts,
  findDeepNestingWarnings as coreFindDeepNestingWarnings,
  findIndexLayoutConflicts as coreFindIndexLayoutConflicts,
  calculateRouteSpecificity as coreCalculateRouteSpecificity,
  sortBySpecificity as coreSortBySpecificity,
  validateRoutes as coreValidateRoutes,
  areRoutesValid as coreAreRoutesValid,
  type RouteForConflictDetection,
  type ConflictDetectionResult as CoreConflictDetectionResult,
} from './core';

// =============================================================================
// Types
// =============================================================================

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

// =============================================================================
// Adapter: Convert DiscoveredRoute to RouteForConflictDetection
// =============================================================================

/**
 * Convert a DiscoveredRoute to the format expected by core conflict detection
 */
function toConflictRoute(route: DiscoveredRoute): RouteForConflictDetection {
  return {
    urlPath: route.urlPath,
    filePath: route.filePath,
    segments: route.segments,
    isLayout: route.isLayout,
    isIndex: route.isIndex,
    depth: route.depth,
  };
}

/**
 * Convert core conflict result to local type
 */
function fromCoreResult(result: CoreConflictDetectionResult): ConflictDetectionResult {
  return {
    hasErrors: result.hasErrors,
    hasWarnings: result.hasWarnings,
    conflicts: result.conflicts as readonly RouteConflict[],
    report: result.report,
  };
}

// =============================================================================
// Conflict Detection (delegating to core)
// =============================================================================

/**
 * Detect all route conflicts in a set of discovered routes
 * @see core/conflict-detector.ts for implementation details
 */
export function detectRouteConflicts(routes: readonly DiscoveredRoute[]): ConflictDetectionResult {
  const conflictRoutes = routes.map(toConflictRoute);
  const result = coreDetectConflicts(conflictRoutes);
  return fromCoreResult(result);
}

// =============================================================================
// Validation (delegating to core)
// =============================================================================

/**
 * Validate routes and throw on errors
 * @see core/conflict-detector.ts for implementation details
 *
 * @throws Error if route conflicts are detected
 */
export function validateRoutes(routes: readonly DiscoveredRoute[]): void {
  const conflictRoutes = routes.map(toConflictRoute);
  coreValidateRoutes(conflictRoutes);
}

/**
 * Check if routes are valid (without throwing)
 * @see core/conflict-detector.ts for implementation details
 */
export function areRoutesValid(routes: readonly DiscoveredRoute[]): boolean {
  const conflictRoutes = routes.map(toConflictRoute);
  return coreAreRoutesValid(conflictRoutes);
}

// =============================================================================
// Route Ordering (delegating to core)
// =============================================================================

/**
 * Calculate route specificity for proper ordering
 * @see core/conflict-detector.ts for implementation details
 *
 * Higher specificity = more specific route = should be matched first
 */
export function calculateRouteSpecificity(route: DiscoveredRoute): number {
  return coreCalculateRouteSpecificity(toConflictRoute(route));
}

/**
 * Sort routes by specificity (most specific first)
 * @see core/conflict-detector.ts for implementation details
 */
export function sortRoutesBySpecificity(routes: readonly DiscoveredRoute[]): DiscoveredRoute[] {
  // Sort using core, then map back to original routes
  const routesArray = [...routes];
  const conflictRoutes = routesArray.map((r, i) => ({ ...toConflictRoute(r), _originalIndex: i }));
  const sorted = coreSortBySpecificity(conflictRoutes);
  return sorted.map((cr) => {
    const idx = (cr as { _originalIndex: number })._originalIndex;
    const route = routesArray[idx];
    if (!route) throw new Error(`Invalid route index: ${idx}`);
    return route;
  });
}

// =============================================================================
// Advanced Conflict Detection (delegating to core)
// =============================================================================

/**
 * Detect nested dynamic route conflicts
 * @see core/conflict-detector.ts for implementation details
 */
export function findNestedDynamicConflicts(routes: readonly DiscoveredRoute[]): RouteConflict[] {
  const conflictRoutes = routes.map(toConflictRoute);
  return coreFindNestedDynamicConflicts(conflictRoutes) as RouteConflict[];
}

/**
 * Detect deep nesting issues (warning)
 * @see core/conflict-detector.ts for implementation details
 */
export function findDeepNestingWarnings(
  routes: readonly DiscoveredRoute[],
  maxDepth: number = 5
): RouteConflict[] {
  const conflictRoutes = routes.map(toConflictRoute);
  return coreFindDeepNestingWarnings(conflictRoutes, maxDepth) as RouteConflict[];
}

/**
 * Detect index route conflicts
 * @see core/conflict-detector.ts for implementation details
 */
export function findIndexLayoutConflicts(routes: readonly DiscoveredRoute[]): RouteConflict[] {
  const conflictRoutes = routes.map(toConflictRoute);
  return coreFindIndexLayoutConflicts(conflictRoutes) as RouteConflict[];
}

// =============================================================================
// Auto-Fix Suggestions
// =============================================================================

import type { RouteFixSuggestion } from './types';

/**
 * Generate fix suggestions for detected conflicts
 */
export function generateFixSuggestions(conflicts: readonly RouteConflict[]): RouteFixSuggestion[] {
  const suggestions: RouteFixSuggestion[] = [];

  for (const conflict of conflicts) {
    switch (conflict.type) {
      case 'exact':
        suggestions.push(...generateDuplicateFixes(conflict));
        break;
      case 'ambiguous':
        suggestions.push(...generateAmbiguousFixes(conflict));
        break;
      case 'shadow':
        suggestions.push(...generateShadowFixes(conflict));
        break;
    }
  }

  return suggestions;
}

/**
 * Generate fixes for duplicate route conflicts
 */
function generateDuplicateFixes(conflict: RouteConflict): RouteFixSuggestion[] {
  const suggestions: RouteFixSuggestion[] = [];

  if (conflict.files.length >= 2 && conflict.files[0] != null) {
    // Suggest keeping the first file and removing duplicates
    for (let i = 1; i < conflict.files.length; i++) {
      const file = conflict.files[i];
      if (file != null) {
        suggestions.push({
          description: `Remove duplicate route file: ${file}`,
          oldValue: file,
          newValue: '',
          autoFixable: false, // Deletion requires manual confirmation
        });
      }
    }

    // Suggest consolidating into one file
    suggestions.push({
      description: `Consolidate duplicate routes into ${conflict.files[0]}`,
      oldValue: conflict.files.slice(1).join(', '),
      newValue: conflict.files[0],
      autoFixable: false,
    });
  }

  return suggestions;
}

/**
 * Generate fixes for ambiguous route conflicts
 */
function generateAmbiguousFixes(conflict: RouteConflict): RouteFixSuggestion[] {
  const suggestions: RouteFixSuggestion[] = [];

  if (conflict.files.length >= 2) {
    // Extract param names from files
    const paramPatterns = conflict.files
      .map((file) => {
        const match = file.match(/\[([^\]]+)\]/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    if (paramPatterns.length > 0) {
      const [preferredParam] = paramPatterns;

      suggestions.push({
        description: `Standardize parameter names to use "${preferredParam}" across all conflicting routes`,
        oldValue: paramPatterns.slice(1).join(', '),
        newValue: preferredParam ?? '',
        autoFixable: true,
      });
    }
  }

  return suggestions;
}

/**
 * Generate fixes for shadow conflicts
 */
function generateShadowFixes(conflict: RouteConflict): RouteFixSuggestion[] {
  const suggestions: RouteFixSuggestion[] = [];

  if (conflict.files.length >= 2) {
    const staticFile = conflict.files.find((f) => !f.includes('['));
    const dynamicFile = conflict.files.find((f) => f.includes('['));

    if (staticFile != null && dynamicFile != null) {
      // Suggest renaming the static route to avoid shadowing
      const staticNameMatch = staticFile
        .split('/')
        .pop()
        ?.replace(/\.(tsx?|jsx?)$/, '');
      const staticName = staticNameMatch ?? '';
      const newName = `_${staticName}`;

      suggestions.push({
        description: `Rename static route file to use underscore prefix for explicit ordering`,
        oldValue: staticFile,
        newValue: staticFile.replace(staticName, newName),
        autoFixable: true,
      });

      // Suggest adding route priority
      suggestions.push({
        description: `Add explicit route ordering by ensuring static routes are defined before dynamic routes`,
        oldValue: `${staticFile} after ${dynamicFile}`,
        newValue: `${staticFile} before ${dynamicFile}`,
        autoFixable: false,
      });
    }
  }

  return suggestions;
}

// =============================================================================
// Comprehensive Conflict Detection (delegating to core)
// =============================================================================

/**
 * Run all conflict detection patterns
 * @see core/conflict-detector.ts for implementation details
 */
export function detectAllConflicts(
  routes: readonly DiscoveredRoute[],
  options: {
    maxNestingDepth?: number;
    checkNestedDynamic?: boolean;
    checkDeepNesting?: boolean;
    checkIndexLayouts?: boolean;
  } = {}
): ConflictDetectionResult {
  const conflictRoutes = routes.map(toConflictRoute);
  const result = coreDetectConflicts(conflictRoutes, options);
  return fromCoreResult(result);
}
