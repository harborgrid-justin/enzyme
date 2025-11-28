/**
 * @file Route Validation Utilities
 * @description Comprehensive route file validation with auto-fix suggestions
 */

import type {
  DiscoveredRoute,
  RouteValidationResult,
  RouteValidationError,
  RouteValidationWarning,
  RouteFixSuggestion,
  RouteErrorCode,
  RouteWarningCode,
} from './types';
import { detectAllConflicts, generateFixSuggestions } from './conflict-detector';
import { splitPath } from './core/path-utils';

// =============================================================================
// Validation Rules
// =============================================================================

/**
 * Validation rule configuration
 */
export interface ValidationRule {
  /** Rule ID */
  readonly id: string;
  /** Rule name */
  readonly name: string;
  /** Rule description */
  readonly description: string;
  /** Severity level */
  readonly severity: 'error' | 'warning';
  /** Whether the rule is enabled by default */
  readonly enabledByDefault: boolean;
  /** Validation function */
  readonly validate: (
    route: DiscoveredRoute,
    allRoutes: readonly DiscoveredRoute[]
  ) => ValidationRuleResult | null;
}

/**
 * Result of a validation rule check
 */
export interface ValidationRuleResult {
  readonly passed: boolean;
  readonly message?: string;
  readonly suggestion?: RouteFixSuggestion;
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Maximum allowed nesting depth */
  maxNestingDepth?: number;
  /** Require loader functions for data routes */
  requireLoaders?: boolean;
  /** Require error boundaries */
  requireErrorBoundaries?: boolean;
  /** Check for consistent naming */
  checkNamingConventions?: boolean;
  /** List of disabled rules */
  disabledRules?: readonly string[];
}

// =============================================================================
// Built-in Validation Rules
// =============================================================================

/**
 * Check for valid route segment naming
 */
const validSegmentNamingRule: ValidationRule = {
  id: 'valid-segment-naming',
  name: 'Valid Segment Naming',
  description: 'Route segments should use valid naming conventions',
  severity: 'error',
  enabledByDefault: true,
  validate(route) {
    for (const segment of route.segments) {
      // Check for invalid characters in static segments
      if (segment.type === 'static') {
        if (!/^[a-z0-9-]+$/i.test(segment.name)) {
          return {
            passed: false,
            message: `Invalid segment name "${segment.name}" in route "${route.urlPath}". Use only alphanumeric characters and hyphens.`,
            suggestion: {
              description: 'Rename segment to use valid characters',
              oldValue: segment.name,
              newValue: segment.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
              autoFixable: true,
            },
          };
        }
      }

      // Check for valid dynamic parameter names
      if (segment.type === 'dynamic' || segment.type === 'optional') {
        if ((segment.paramName != null) && !/^[a-z][a-zA-Z0-9]*$/.test(segment.paramName)) {
          return {
            passed: false,
            message: `Invalid parameter name "${segment.paramName}" in route "${route.urlPath}". Use camelCase naming.`,
            suggestion: {
              description: 'Rename parameter to use camelCase',
              oldValue: segment.paramName,
              newValue: toCamelCase(segment.paramName),
              autoFixable: true,
            },
          };
        }
      }
    }

    return { passed: true };
  },
};

/**
 * Check for catch-all route placement
 */
const catchAllPlacementRule: ValidationRule = {
  id: 'catch-all-placement',
  name: 'Catch-All Placement',
  description: 'Catch-all routes should be at the end of the path',
  severity: 'error',
  enabledByDefault: true,
  validate(route) {
    const catchAllIndex = route.segments.findIndex((s) => s.type === 'catchAll');

    if (catchAllIndex !== -1 && catchAllIndex !== route.segments.length - 1) {
      return {
        passed: false,
        message: `Catch-all segment in "${route.urlPath}" must be the last segment.`,
      };
    }

    return { passed: true };
  },
};

/**
 * Check for reasonable nesting depth
 */
const nestingDepthRule: ValidationRule = {
  id: 'nesting-depth',
  name: 'Nesting Depth',
  description: 'Routes should not be too deeply nested',
  severity: 'warning',
  enabledByDefault: true,
  validate(route) {
    const maxDepth = 5; // Can be configured

    if (route.depth > maxDepth) {
      return {
        passed: false,
        message: `Route "${route.urlPath}" has ${route.depth} levels of nesting. Consider flattening to improve maintainability.`,
        suggestion: {
          description: 'Consider restructuring to reduce nesting',
          oldValue: route.urlPath,
          newValue: flattenPath(route.urlPath),
          autoFixable: false,
        },
      };
    }

    return { passed: true };
  },
};

/**
 * Check for consistent file naming
 */
const fileNamingConventionRule: ValidationRule = {
  id: 'file-naming-convention',
  name: 'File Naming Convention',
  description: 'Route files should follow consistent naming conventions',
  severity: 'warning',
  enabledByDefault: true,
  validate(route) {
    const filename = route.filePath.split('/').pop() ?? '';

    // Check for PascalCase for page components
    if (!route.isLayout && !route.isIndex) {
      const nameWithoutExt = filename.replace(/\.(tsx?|jsx?)$/, '');

      // Skip dynamic segments
      if (nameWithoutExt.startsWith('[')) {
        return { passed: true };
      }

      // Check if PascalCase
      if (!/^[A-Z][a-zA-Z0-9]*$/.test(nameWithoutExt)) {
        return {
          passed: false,
          message: `Route file "${filename}" should use PascalCase naming (e.g., "${toPascalCase(nameWithoutExt)}.tsx").`,
          suggestion: {
            description: 'Rename file to use PascalCase',
            oldValue: filename,
            newValue: `${toPascalCase(nameWithoutExt)}.tsx`,
            autoFixable: true,
          },
        };
      }
    }

    return { passed: true };
  },
};

/**
 * Check for orphaned layouts
 */
const orphanedLayoutRule: ValidationRule = {
  id: 'orphaned-layout',
  name: 'Orphaned Layout',
  description: 'Layouts should have at least one child route',
  severity: 'warning',
  enabledByDefault: true,
  validate(route, allRoutes) {
    if (!route.isLayout) return { passed: true };

    const hasChildren = allRoutes.some(
      (r) => !r.isLayout && r.parentLayout === route.filePath
    );

    if (!hasChildren) {
      return {
        passed: false,
        message: `Layout "${route.filePath}" has no child routes. Consider removing or adding routes.`,
      };
    }

    return { passed: true };
  },
};

/**
 * Check for duplicate path segments
 */
const duplicateSegmentsRule: ValidationRule = {
  id: 'duplicate-segments',
  name: 'Duplicate Segments',
  description: 'Avoid repeating the same segment in a path',
  severity: 'warning',
  enabledByDefault: true,
  validate(route) {
    const staticSegments = route.segments
      .filter((s) => s.type === 'static')
      .map((s) => s.name);

    const seen = new Set<string>();
    for (const segment of staticSegments) {
      if (seen.has(segment)) {
        return {
          passed: false,
          message: `Route "${route.urlPath}" has duplicate segment "${segment}". This may cause confusion.`,
        };
      }
      seen.add(segment);
    }

    return { passed: true };
  },
};

/**
 * All built-in validation rules
 */
export const BUILT_IN_RULES: readonly ValidationRule[] = [
  validSegmentNamingRule,
  catchAllPlacementRule,
  nestingDepthRule,
  fileNamingConventionRule,
  orphanedLayoutRule,
  duplicateSegmentsRule,
];

// =============================================================================
// Validation Engine
// =============================================================================

/**
 * Validate a single route against all rules
 */
export function validateRoute(
  route: DiscoveredRoute,
  allRoutes: readonly DiscoveredRoute[],
  rules: readonly ValidationRule[] = BUILT_IN_RULES,
  options: ValidationOptions = {}
): RouteValidationResult {
  const errors: RouteValidationError[] = [];
  const warnings: RouteValidationWarning[] = [];
  const suggestions: RouteFixSuggestion[] = [];

  const disabledRules = new Set(options.disabledRules ?? []);

  for (const rule of rules) {
    if (disabledRules.has(rule.id)) continue;
    if (!rule.enabledByDefault && !isRuleExplicitlyEnabled(rule.id, options)) continue;

    const result = rule.validate(route, allRoutes);

    if (result && !result.passed) {
      if (rule.severity === 'error') {
        errors.push({
          code: rule.id as RouteErrorCode,
          message: result.message ?? `Rule "${rule.name}" failed`,
          filePath: route.filePath,
        });
      } else {
        warnings.push({
          code: rule.id as RouteWarningCode,
          message: result.message ?? `Rule "${rule.name}" warning`,
          filePath: route.filePath,
          suggestion: result.suggestion?.description,
        });
      }

      if (result.suggestion) {
        suggestions.push(result.suggestion);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * Validate all routes
 */
export function validateAllRoutes(
  routes: readonly DiscoveredRoute[],
  options: ValidationOptions = {}
): RouteValidationResult {
  const allErrors: RouteValidationError[] = [];
  const allWarnings: RouteValidationWarning[] = [];
  const allSuggestions: RouteFixSuggestion[] = [];

  // Validate each route individually
  for (const route of routes) {
    const result = validateRoute(route, routes, BUILT_IN_RULES, options);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
    allSuggestions.push(...result.suggestions);
  }

  // Run conflict detection
  const conflictResult = detectAllConflicts(routes, {
    maxNestingDepth: options.maxNestingDepth,
    checkNestedDynamic: true,
    checkDeepNesting: true,
    checkIndexLayouts: true,
  });

  // Convert conflicts to errors/warnings
  for (const conflict of conflictResult.conflicts) {
    if (conflict.severity === 'error') {
      allErrors.push({
        code: conflict.type.toUpperCase() as RouteErrorCode,
        message: conflict.message,
        filePath: conflict.files[0] ?? '',
      });
    } else {
      allWarnings.push({
        code: conflict.type.toUpperCase() as RouteWarningCode,
        message: conflict.message,
        filePath: conflict.files[0] ?? '',
      });
    }
  }

  // Generate fix suggestions for conflicts
  const conflictSuggestions = generateFixSuggestions(conflictResult.conflicts);
  allSuggestions.push(...conflictSuggestions);

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    suggestions: allSuggestions,
  };
}

/**
 * Generate a validation report
 */
export function generateValidationReport(result: RouteValidationResult): string {
  const lines: string[] = [
    '',
    '='.repeat(70),
    '  ROUTE VALIDATION REPORT',
    '='.repeat(70),
    '',
  ];

  if (result.isValid && result.warnings.length === 0) {
    lines.push('All routes passed validation.');
    lines.push('');
    return lines.join('\n');
  }

  if (result.errors.length > 0) {
    lines.push(`ERRORS (${result.errors.length}):`);
    lines.push('-'.repeat(50));
    lines.push('');

    for (const error of result.errors) {
      lines.push(`  [${error.code}] ${error.message}`);
      lines.push(`  File: ${error.filePath}`);
      if (error.line != null) {
        lines.push(`  Line: ${error.line}${(error.column != null) ? `:${error.column}` : ''}`);
      }
      lines.push('');
    }
  }

  if (result.warnings.length > 0) {
    lines.push(`WARNINGS (${result.warnings.length}):`);
    lines.push('-'.repeat(50));
    lines.push('');

    for (const warning of result.warnings) {
      lines.push(`  [${warning.code}] ${warning.message}`);
      lines.push(`  File: ${warning.filePath}`);
      if (warning.suggestion != null) {
        lines.push(`  Suggestion: ${warning.suggestion}`);
      }
      lines.push('');
    }
  }

  if (result.suggestions.length > 0) {
    lines.push('FIX SUGGESTIONS:');
    lines.push('-'.repeat(50));
    lines.push('');

    for (const suggestion of result.suggestions) {
      lines.push(`  ${suggestion.description}`);
      if (suggestion.oldValue && suggestion.newValue) {
        lines.push(`    Change: "${suggestion.oldValue}" -> "${suggestion.newValue}"`);
      }
      lines.push(`    Auto-fixable: ${suggestion.autoFixable ? 'Yes' : 'No'}`);
      lines.push('');
    }
  }

  lines.push('='.repeat(70));
  lines.push('');

  return lines.join('\n');
}

// =============================================================================
// Auto-Fix Utilities
// =============================================================================

/**
 * Auto-fix result
 */
export interface AutoFixResult {
  readonly applied: readonly RouteFixSuggestion[];
  readonly skipped: readonly RouteFixSuggestion[];
  readonly errors: readonly { suggestion: RouteFixSuggestion; error: Error }[];
}

/**
 * Apply auto-fixable suggestions
 * Note: This returns the fix operations to be performed, actual file operations
 * should be done by the caller (Vite plugin or CLI)
 */
export function getAutoFixOperations(
  suggestions: readonly RouteFixSuggestion[]
): {
  fileRenames: Array<{ oldPath: string; newPath: string }>;
  contentChanges: Array<{ filePath: string; search: string; replace: string }>;
} {
  const fileRenames: Array<{ oldPath: string; newPath: string }> = [];
  const contentChanges: Array<{ filePath: string; search: string; replace: string }> = [];

  for (const suggestion of suggestions) {
    if (!suggestion.autoFixable) continue;

    // Detect file rename suggestions
    if (
      suggestion.oldValue.includes('/') &&
      suggestion.newValue.includes('/') &&
      suggestion.oldValue !== suggestion.newValue
    ) {
      fileRenames.push({
        oldPath: suggestion.oldValue,
        newPath: suggestion.newValue,
      });
    }
    // Detect content changes
    else if (suggestion.oldValue && suggestion.newValue) {
      contentChanges.push({
        filePath: '', // Will be determined by caller
        search: suggestion.oldValue,
        replace: suggestion.newValue,
      });
    }
  }

  return { fileRenames, contentChanges };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert string to camelCase
 */
function toCamelCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_: string, char: string) => char.toUpperCase())
    .replace(/^(.)/, (_: string, char: string) => char.toLowerCase());
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_: string, char: string) => char.toUpperCase())
    .replace(/^(.)/, (_: string, char: string) => char.toUpperCase());
}

/**
 * Flatten a deep path
 */
function flattenPath(path: string): string {
  const parts = splitPath(path);
  if (parts.length <= 3) return path;

  // Keep first and last two segments
  return `/${parts[0]}/${parts.slice(-2).join('/')}`;
}

/**
 * Check if a rule is explicitly enabled in options
 */
function isRuleExplicitlyEnabled(
  _ruleId: string,
  _options: ValidationOptions
): boolean {
  // Could be extended to support explicit rule enabling
  return false;
}

// =============================================================================
// Exports
// =============================================================================

// Exports moved to avoid conflicts within routing module
