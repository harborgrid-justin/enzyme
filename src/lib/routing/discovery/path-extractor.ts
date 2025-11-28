/**
 * @file Path Extractor for Route Discovery
 * @description Extracts URL paths from file system structure using convention-based parsing.
 * Supports Next.js-style file naming conventions including dynamic routes, catch-all routes,
 * route groups, and parallel routes.
 *
 * @module @/lib/routing/discovery/path-extractor
 *
 * This module provides:
 * - File path to URL path conversion
 * - Dynamic segment extraction
 * - Route parameter parsing
 * - Path hierarchy analysis
 * - Convention-based naming support
 *
 * @example
 * ```typescript
 * import { extractPathFromFile, parseSegments } from '@/lib/routing/discovery/path-extractor';
 *
 * const urlPath = extractPathFromFile('users/[id]/posts/[postId]/page.tsx');
 * console.log(urlPath); // '/users/:id/posts/:postId'
 *
 * const segments = parseSegments('users/[id]/posts');
 * console.log(segments);
 * // [
 * //   { type: 'static', value: 'users', raw: 'users' },
 * //   { type: 'dynamic', value: 'id', raw: '[id]' },
 * //   { type: 'static', value: 'posts', raw: 'posts' },
 * // ]
 * ```
 */

// =============================================================================
// Core Utility Imports
// =============================================================================

import {
  parsePathParams as coreParsePathParams,
  getPatternSpecificity as coreGetPatternSpecificity,
  isChildPath as coreIsChildPath,
  normalizePath as coreNormalizePath,
} from '../core/path-utils';

// =============================================================================
// Types
// =============================================================================

/**
 * Types of path segments that can be extracted
 */
export type SegmentType =
  | 'static'           // Regular static segment (e.g., 'users')
  | 'dynamic'          // Dynamic parameter (e.g., [id])
  | 'optional'         // Optional parameter (e.g., [[id]])
  | 'catch-all'        // Catch-all parameter (e.g., [...slug])
  | 'optional-catch-all' // Optional catch-all (e.g., [[...slug]])
  | 'group'            // Route group (e.g., (auth))
  | 'parallel'         // Parallel route slot (e.g., @modal)
  | 'intercepting';    // Intercepting route (e.g., (.)photo)

/**
 * Parsed path segment with full metadata
 */
export interface ParsedSegment {
  /** Type of segment */
  readonly type: SegmentType;
  /** Extracted value (parameter name or static value) */
  readonly value: string;
  /** Original raw segment string */
  readonly raw: string;
  /** Whether segment is optional */
  readonly optional: boolean;
  /** Position in the path */
  readonly position: number;
  /** Constraint type (if any) */
  readonly constraint?: SegmentConstraint;
}

/**
 * Constraint that can be applied to dynamic segments
 */
export interface SegmentConstraint {
  /** Constraint type */
  readonly type: 'regex' | 'enum' | 'custom';
  /** Constraint pattern or values */
  readonly pattern: string | readonly string[];
  /** Validation function name */
  readonly validator?: string;
}

/**
 * Extracted path information
 */
export interface ExtractedPath {
  /** The URL path pattern */
  readonly urlPath: string;
  /** All segments parsed */
  readonly segments: readonly ParsedSegment[];
  /** Parameter names extracted */
  readonly params: readonly string[];
  /** Optional parameters */
  readonly optionalParams: readonly string[];
  /** Whether path has catch-all */
  readonly hasCatchAll: boolean;
  /** Whether path has optional catch-all */
  readonly hasOptionalCatchAll: boolean;
  /** Route groups this path belongs to */
  readonly groups: readonly string[];
  /** Parallel slots in this path */
  readonly parallelSlots: readonly string[];
  /** Nesting depth */
  readonly depth: number;
  /** Whether this is an index route */
  readonly isIndex: boolean;
  /** Whether this is a layout route */
  readonly isLayout: boolean;
}

/**
 * Path extraction configuration
 */
export interface PathExtractorConfig {
  /** File names that represent index routes */
  readonly indexFileNames: readonly string[];
  /** File names that represent layout routes */
  readonly layoutFileNames: readonly string[];
  /** Strip these extensions from file names */
  readonly stripExtensions: readonly string[];
  /** Segment naming convention */
  readonly convention: 'nextjs' | 'remix' | 'custom';
  /** Custom segment parser */
  readonly customParser?: (segment: string) => ParsedSegment | null;
  /** Feature flag for advanced features */
  readonly featureFlag?: string;
}

/**
 * Path hierarchy node
 */
export interface PathNode {
  /** Segment at this level */
  readonly segment: ParsedSegment;
  /** Full path to this node */
  readonly path: string;
  /** Parent node (if any) */
  readonly parent: PathNode | null;
  /** Child nodes */
  readonly children: readonly PathNode[];
  /** Associated files */
  readonly files: readonly string[];
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default path extractor configuration
 */
export const DEFAULT_EXTRACTOR_CONFIG: PathExtractorConfig = {
  indexFileNames: ['index', 'page', '_index'],
  layoutFileNames: ['layout', '_layout', 'root'],
  stripExtensions: ['.tsx', '.ts', '.jsx', '.js'],
  convention: 'nextjs',
};

/**
 * Segment parsing patterns for Next.js convention
 */
const NEXTJS_PATTERNS = {
  // Dynamic segment: [param]
  dynamic: /^\[([a-zA-Z_][a-zA-Z0-9_]*)\]$/,
  // Optional segment: [[param]]
  optional: /^\[\[([a-zA-Z_][a-zA-Z0-9_]*)\]\]$/,
  // Catch-all: [...param]
  catchAll: /^\[\.\.\.([a-zA-Z_][a-zA-Z0-9_]*)\]$/,
  // Optional catch-all: [[...param]]
  optionalCatchAll: /^\[\[\.\.\.([a-zA-Z_][a-zA-Z0-9_]*)\]\]$/,
  // Route group: (groupName)
  group: /^\(([a-zA-Z_][a-zA-Z0-9_-]*)\)$/,
  // Parallel route: @slotName
  parallel: /^@([a-zA-Z_][a-zA-Z0-9_]*)$/,
  // Intercepting route: (.)segment, (..)segment, (...)segment
  intercepting: /^\((\.{1,3})\)(.+)$/,
} as const;

/**
 * Segment parsing patterns for Remix convention
 */
const REMIX_PATTERNS = {
  // Dynamic segment: $param
  dynamic: /^\$([a-zA-Z_][a-zA-Z0-9_]*)$/,
  // Optional segment: ($param)
  optional: /^\(\$([a-zA-Z_][a-zA-Z0-9_]*)\)$/,
  // Catch-all: $ or $.tsx
  catchAll: /^\$$/,
  // Pathless layout: _index or __layout
  pathless: /^_/,
} as const;

// =============================================================================
// Segment Parsing Functions
// =============================================================================

/**
 * Parse a single path segment into a ParsedSegment
 *
 * @param segment - Raw segment string
 * @param position - Position in the path
 * @param config - Extractor configuration
 * @returns Parsed segment or null if invalid
 *
 * @example
 * ```typescript
 * parseSegment('[id]', 0);
 * // { type: 'dynamic', value: 'id', raw: '[id]', optional: false, position: 0 }
 *
 * parseSegment('[[...slug]]', 1);
 * // { type: 'optional-catch-all', value: 'slug', raw: '[[...slug]]', optional: true, position: 1 }
 * ```
 */
export function parseSegment(
  segment: string,
  position: number,
  config: PathExtractorConfig = DEFAULT_EXTRACTOR_CONFIG
): ParsedSegment | null {
  if (!segment || segment.trim() === '') {
    return null;
  }

  // Try custom parser first
  if (config.customParser) {
    const custom = config.customParser(segment);
    if (custom) {
      return { ...custom, position };
    }
  }

  const patterns = config.convention === 'remix' ? REMIX_PATTERNS : NEXTJS_PATTERNS;

  // Check for optional catch-all first (most specific)
  if ('optionalCatchAll' in patterns) {
    const optionalCatchAllMatch = segment.match(patterns.optionalCatchAll);
    if (optionalCatchAllMatch?.[1]) {
      return {
        type: 'optional-catch-all',
        value: optionalCatchAllMatch[1],
        raw: segment,
        optional: true,
        position,
      };
    }
  }

  // Check for catch-all
  const catchAllMatch = segment.match(patterns.catchAll);
  if (catchAllMatch) {
    const value = config.convention === 'remix' ? '*' : catchAllMatch[1] || '*';
    return {
      type: 'catch-all',
      value,
      raw: segment,
      optional: false,
      position,
    };
  }

  // Check for optional dynamic
  if ('optional' in patterns) {
    const optionalMatch = segment.match(patterns.optional);
    if (optionalMatch?.[1]) {
      return {
        type: 'optional',
        value: optionalMatch[1],
        raw: segment,
        optional: true,
        position,
      };
    }
  }

  // Check for dynamic
  const dynamicMatch = segment.match(patterns.dynamic);
  if (dynamicMatch?.[1]) {
    return {
      type: 'dynamic',
      value: dynamicMatch[1],
      raw: segment,
      optional: false,
      position,
    };
  }

  // Next.js specific patterns
  if (config.convention === 'nextjs') {
    // Check for route group
    const groupMatch = segment.match(NEXTJS_PATTERNS.group);
    if (groupMatch?.[1]) {
      return {
        type: 'group',
        value: groupMatch[1],
        raw: segment,
        optional: false,
        position,
      };
    }

    // Check for parallel route
    const parallelMatch = segment.match(NEXTJS_PATTERNS.parallel);
    if (parallelMatch?.[1]) {
      return {
        type: 'parallel',
        value: parallelMatch[1],
        raw: segment,
        optional: false,
        position,
      };
    }

    // Check for intercepting route
    const interceptingMatch = segment.match(NEXTJS_PATTERNS.intercepting);
    if (interceptingMatch?.[1] && interceptingMatch[2]) {
      return {
        type: 'intercepting',
        value: interceptingMatch[2],
        raw: segment,
        optional: false,
        position,
        constraint: {
          type: 'custom',
          pattern: interceptingMatch[1], // The dots indicating interception level
        },
      };
    }
  }

  // Static segment
  return {
    type: 'static',
    value: segment,
    raw: segment,
    optional: false,
    position,
  };
}

/**
 * Parse all segments from a path string
 *
 * @param path - File path to parse (e.g., 'users/[id]/posts')
 * @param config - Extractor configuration
 * @returns Array of parsed segments
 *
 * @example
 * ```typescript
 * const segments = parseSegments('users/[id]/posts/[[...slug]]');
 * // Returns 4 segments: static, dynamic, static, optional-catch-all
 * ```
 */
export function parseSegments(
  path: string,
  config: PathExtractorConfig = DEFAULT_EXTRACTOR_CONFIG
): readonly ParsedSegment[] {
  // Normalize path separators and split
  const normalizedPath = path.replace(/\\/g, '/');
  const parts = normalizedPath.split('/').filter(Boolean);

  const segments: ParsedSegment[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    // Strip file extension from last segment
    let segmentName = part;
    if (i === parts.length - 1) {
      for (const ext of config.stripExtensions) {
        if (segmentName.endsWith(ext)) {
          segmentName = segmentName.slice(0, -ext.length);
          break;
        }
      }
    }

    // Skip index/layout file names (they don't contribute to URL path)
    if (i === parts.length - 1) {
      if (config.indexFileNames.includes(segmentName) ||
          config.layoutFileNames.includes(segmentName)) {
        continue;
      }
    }

    const segment = parseSegment(segmentName, i, config);
    if (segment) {
      segments.push(segment);
    }
  }

  return Object.freeze(segments);
}

// =============================================================================
// Path Extraction Functions
// =============================================================================

/**
 * Convert parsed segments to a URL path pattern
 *
 * @param segments - Parsed segments
 * @returns URL path string (e.g., '/users/:id/posts')
 */
export function segmentsToUrlPath(segments: readonly ParsedSegment[]): string {
  const parts: string[] = [];

  for (const segment of segments) {
    switch (segment.type) {
      case 'static':
        parts.push(segment.value);
        break;
      case 'dynamic':
        parts.push(`:${segment.value}`);
        break;
      case 'optional':
        parts.push(`:${segment.value}?`);
        break;
      case 'catch-all':
        parts.push('*');
        break;
      case 'optional-catch-all':
        parts.push('*?');
        break;
      case 'group':
        // Route groups don't appear in URL
        break;
      case 'parallel':
        // Parallel slots don't appear in URL
        break;
      case 'intercepting':
        parts.push(segment.value);
        break;
    }
  }

  return `/${  parts.join('/')}`;
}

/**
 * Extract full path information from a file path
 *
 * @param filePath - File path relative to routes directory
 * @param config - Extractor configuration
 * @returns Extracted path information
 *
 * @example
 * ```typescript
 * const extracted = extractPathFromFile('users/[id]/posts/[postId]/page.tsx');
 * console.log(extracted.urlPath);       // '/users/:id/posts/:postId'
 * console.log(extracted.params);        // ['id', 'postId']
 * console.log(extracted.isIndex);       // true (page.tsx is index)
 * ```
 */
export function extractPathFromFile(
  filePath: string,
  config: PathExtractorConfig = DEFAULT_EXTRACTOR_CONFIG
): ExtractedPath {
  const segments = parseSegments(filePath, config);
  const urlPath = segmentsToUrlPath(segments);

  // Extract parameter information
  const params: string[] = [];
  const optionalParams: string[] = [];
  const groups: string[] = [];
  const parallelSlots: string[] = [];
  let hasCatchAll = false;
  let hasOptionalCatchAll = false;

  for (const segment of segments) {
    switch (segment.type) {
      case 'dynamic':
        params.push(segment.value);
        break;
      case 'optional':
        params.push(segment.value);
        optionalParams.push(segment.value);
        break;
      case 'catch-all':
        params.push(segment.value);
        hasCatchAll = true;
        break;
      case 'optional-catch-all':
        params.push(segment.value);
        optionalParams.push(segment.value);
        hasOptionalCatchAll = true;
        break;
      case 'group':
        groups.push(segment.value);
        break;
      case 'parallel':
        parallelSlots.push(segment.value);
        break;
    }
  }

  // Determine if this is an index or layout route
  const normalizedPath = filePath.replace(/\\/g, '/');
  const fileName = normalizedPath.split('/').pop() || '';
  const baseFileName = config.stripExtensions.reduce(
    (name, ext) => name.endsWith(ext) ? name.slice(0, -ext.length) : name,
    fileName
  );

  const isIndex = config.indexFileNames.includes(baseFileName);
  const isLayout = config.layoutFileNames.includes(baseFileName);

  return {
    urlPath,
    segments,
    params: Object.freeze(params),
    optionalParams: Object.freeze(optionalParams),
    hasCatchAll,
    hasOptionalCatchAll,
    groups: Object.freeze(groups),
    parallelSlots: Object.freeze(parallelSlots),
    depth: segments.filter(s => s.type !== 'group' && s.type !== 'parallel').length,
    isIndex,
    isLayout,
  };
}

/**
 * Extract parameters from a URL given a path pattern
 *
 * Delegates to core path utilities for the actual extraction.
 *
 * @param pattern - URL pattern (e.g., '/users/:id/posts/:postId')
 * @param url - Actual URL to extract from (e.g., '/users/123/posts/456')
 * @returns Extracted parameters or null if no match
 *
 * @example
 * ```typescript
 * const params = extractParamsFromUrl('/users/:id', '/users/123');
 * console.log(params); // { id: '123' }
 * ```
 */
export function extractParamsFromUrl(
  pattern: string,
  url: string
): Record<string, string> | null {
  // Delegate to core path utilities
  return coreParsePathParams(pattern, url);
}

// =============================================================================
// Path Hierarchy Functions
// =============================================================================

/**
 * Build a path hierarchy tree from multiple file paths
 *
 * @param filePaths - Array of file paths
 * @param config - Extractor configuration
 * @returns Root nodes of the path hierarchy
 *
 * @example
 * ```typescript
 * const tree = buildPathTree([
 *   'users/page.tsx',
 *   'users/[id]/page.tsx',
 *   'users/[id]/posts/page.tsx',
 * ]);
 * // Returns hierarchical tree structure
 * ```
 */
export function buildPathTree(
  filePaths: readonly string[],
  config: PathExtractorConfig = DEFAULT_EXTRACTOR_CONFIG
): readonly PathNode[] {
  const nodeMap = new Map<string, PathNode & { children: PathNode[]; files: string[] }>();
  const rootNodes: (PathNode & { children: PathNode[]; files: string[] })[] = [];

  for (const filePath of filePaths) {
    const segments = parseSegments(filePath, config);
    let currentPath = '';
    let parentNode: (PathNode & { children: PathNode[]; files: string[] }) | null = null;

    for (const segment of segments) {
      // Skip groups and parallel slots for hierarchy
      if (segment.type === 'group' || segment.type === 'parallel') {
        continue;
      }

      currentPath = currentPath ? `${currentPath}/${segment.raw}` : segment.raw;

      let node = nodeMap.get(currentPath);
      if (!node) {
        node = {
          segment,
          path: currentPath,
          parent: parentNode,
          children: [],
          files: [],
        };
        nodeMap.set(currentPath, node);

        if (parentNode) {
          parentNode.children.push(node);
        } else {
          rootNodes.push(node);
        }
      }

      parentNode = node;
    }

    // Add file to the leaf node
    if (parentNode) {
      parentNode.files.push(filePath);
    }
  }

  // Freeze the tree structure
  const freezeNode = (node: PathNode): PathNode => ({
    ...node,
    children: Object.freeze(Array.from(node.children).map(freezeNode)),
    files: Object.freeze([...node.files]),
  });

  return Object.freeze(rootNodes.map(freezeNode));
}

/**
 * Find the common ancestor path for multiple paths
 *
 * @param paths - Array of URL paths
 * @returns Common ancestor path or '/' if none
 */
export function findCommonAncestor(paths: readonly string[]): string {
  if (paths.length === 0) return '/';
  if (paths.length === 1) return paths[0] ?? '/';

  const splitPaths = paths.map(p => p.split('/').filter(Boolean));
  const firstPath = splitPaths[0];
  if (!firstPath) return '/';

  const commonParts: string[] = [];

  for (let i = 0; i < firstPath.length; i++) {
    const part = firstPath[i];
    if (splitPaths.every(p => p[i] === part)) {
      commonParts.push(part!);
    } else {
      break;
    }
  }

  return `/${  commonParts.join('/')}`;
}

/**
 * Check if one path is a child of another
 *
 * Delegates to core path utilities.
 *
 * @param childPath - Potential child path
 * @param parentPath - Potential parent path
 * @returns True if childPath is nested under parentPath
 */
export function isChildPath(childPath: string, parentPath: string): boolean {
  // Delegate to core path utilities
  return coreIsChildPath(childPath, parentPath);
}

/**
 * Get the relative path from parent to child
 *
 * @param childPath - Child path
 * @param parentPath - Parent path
 * @returns Relative path or null if not a child
 */
export function getRelativePath(childPath: string, parentPath: string): string | null {
  if (!isChildPath(childPath, parentPath)) {
    return null;
  }

  const normalizedParent = parentPath === '/' ? '' : coreNormalizePath(parentPath);
  return childPath.slice(normalizedParent.length);
}

// =============================================================================
// Path Validation Functions
// =============================================================================

/**
 * Validate that a path pattern is well-formed
 *
 * @param pattern - URL path pattern to validate
 * @returns Validation result with any errors
 */
export function validatePathPattern(pattern: string): {
  readonly isValid: boolean;
  readonly errors: readonly string[];
} {
  const errors: string[] = [];

  // Check for empty pattern
  if (!pattern || pattern.trim() === '') {
    errors.push('Path pattern cannot be empty');
    return { isValid: false, errors: Object.freeze(errors) };
  }

  // Must start with /
  if (!pattern.startsWith('/')) {
    errors.push('Path pattern must start with /');
  }

  // Check for double slashes
  if (/\/\//.test(pattern)) {
    errors.push('Path pattern cannot contain double slashes');
  }

  // Check for valid parameter names
  const paramMatches = pattern.match(/:[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
  const paramNames = new Set<string>();
  for (const param of paramMatches) {
    const name = param.slice(1).replace('?', '');
    if (paramNames.has(name)) {
      errors.push(`Duplicate parameter name: ${name}`);
    }
    paramNames.add(name);
  }

  // Check catch-all position (must be last)
  const catchAllIndex = pattern.indexOf('*');
  if (catchAllIndex !== -1 && catchAllIndex !== pattern.length - 1) {
    const afterCatchAll = pattern.slice(catchAllIndex + 1);
    if (afterCatchAll && afterCatchAll !== '?' && afterCatchAll !== '/') {
      errors.push('Catch-all (*) must be at the end of the path');
    }
  }

  return {
    isValid: errors.length === 0,
    errors: Object.freeze(errors),
  };
}

/**
 * Compare two path patterns for specificity (more specific = higher)
 *
 * Delegates to core path utilities for specificity calculation.
 *
 * @param a - First path pattern
 * @param b - Second path pattern
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
export function comparePathSpecificity(a: string, b: string): number {
  // Use core specificity calculation
  const specificityA = coreGetPatternSpecificity(a);
  const specificityB = coreGetPatternSpecificity(b);
  return specificityA - specificityB;
}
