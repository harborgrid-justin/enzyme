/**
 * @file Route Segment Parsing Utilities
 * @description Framework-agnostic utilities for parsing route segments from file paths
 * and directory structures. Used for file-system-based routing conventions.
 *
 * @module @/lib/routing/core/segment-parser
 *
 * @example
 * ```typescript
 * import {
 *   parseRouteSegment,
 *   parseDirectoryPath,
 *   segmentsToUrlPath,
 * } from '@/lib/routing/core/segment-parser';
 *
 * // Parse a filename into a route segment
 * parseRouteSegment('[id].tsx'); // { type: 'dynamic', name: ':id', paramName: 'id', ... }
 *
 * // Parse a directory path into segments
 * parseDirectoryPath('users/[id]', 'posts.tsx');
 * // [{ type: 'static', name: 'users' }, { type: 'dynamic', name: ':id' }, { type: 'static', name: 'posts' }]
 *
 * // Convert segments to URL path
 * segmentsToUrlPath(segments); // '/users/:id/posts'
 * ```
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Route segment types for file-system convention
 *
 * - static: `about.tsx` -> `/about`
 * - dynamic: `[id].tsx` -> `/:id`
 * - catchAll: `[[...slug]].tsx` -> `/*`
 * - optional: `[[id]].tsx` -> `/:id?`
 * - group: `(auth)/login.tsx` -> `/login` (group ignored in path)
 * - layout: `_layout.tsx` -> layout wrapper
 * - index: `index.tsx` -> `/`
 */
export type RouteSegmentType =
  | 'static'
  | 'dynamic'
  | 'catchAll'
  | 'optional'
  | 'group'
  | 'layout'
  | 'index';

/**
 * Parsed route segment from filename
 */
export interface ParsedRouteSegment {
  /** Type of segment */
  readonly type: RouteSegmentType;
  /** Segment name for URL path */
  readonly name: string;
  /** Parameter name for dynamic segments */
  readonly paramName?: string;
  /** Whether this segment is optional */
  readonly isOptional: boolean;
  /** Original filename before parsing */
  readonly originalFilename: string;
}

/**
 * Configuration for segment parsing
 */
export interface SegmentParserConfig {
  /** Extensions to strip from filenames (default: ['.tsx', '.ts', '.jsx', '.js']) */
  extensions?: readonly string[];
  /** Prefix for layout files (default: '_') */
  layoutPrefix?: string;
  /** Name for index files (default: 'index') */
  indexName?: string;
  /** Dynamic segment brackets (default: ['[', ']']) */
  dynamicBrackets?: readonly [string, string];
  /** Optional segment brackets (default: ['[[', ']]']) */
  optionalBrackets?: readonly [string, string];
  /** Catch-all prefix (default: '...') */
  catchAllPrefix?: string;
  /** Group segment brackets (default: ['(', ')']) */
  groupBrackets?: readonly [string, string];
}

/**
 * Default segment parser configuration
 */
export const DEFAULT_SEGMENT_PARSER_CONFIG: Required<SegmentParserConfig> = {
  extensions: ['.tsx', '.ts', '.jsx', '.js'],
  layoutPrefix: '_',
  indexName: 'index',
  dynamicBrackets: ['[', ']'],
  optionalBrackets: ['[[', ']]'],
  catchAllPrefix: '...',
  groupBrackets: ['(', ')'],
};

// =============================================================================
// Segment Parsing
// =============================================================================

/**
 * Parse a filename or directory name into a route segment
 *
 * Conventions:
 * - `_layout.tsx` -> layout wrapper
 * - `index.tsx` -> index route (/)
 * - `[id].tsx` -> dynamic segment (/:id)
 * - `[[id]].tsx` -> optional param (/:id?)
 * - `[[...slug]].tsx` -> catch-all (*)
 * - `(group)/` -> route group (ignored in URL)
 * - `about.tsx` -> static segment (/about)
 *
 * @param filename - The filename or directory name to parse
 * @param config - Optional parsing configuration
 * @returns Parsed route segment
 */
export function parseRouteSegment(
  filename: string,
  config: SegmentParserConfig = {}
): ParsedRouteSegment {
  const cfg = { ...DEFAULT_SEGMENT_PARSER_CONFIG, ...config };

  // Remove file extension if present
  let nameWithoutExt = filename;
  for (const ext of cfg.extensions) {
    if (filename.endsWith(ext)) {
      nameWithoutExt = filename.slice(0, -ext.length);
      break;
    }
  }

  // Layout files: _layout.tsx
  if (nameWithoutExt.startsWith(cfg.layoutPrefix)) {
    return {
      type: 'layout',
      name: nameWithoutExt.slice(cfg.layoutPrefix.length),
      isOptional: false,
      originalFilename: filename,
    };
  }

  // Index files: index.tsx
  if (nameWithoutExt === cfg.indexName) {
    return {
      type: 'index',
      name: '',
      isOptional: false,
      originalFilename: filename,
    };
  }

  const [optOpen, optClose] = cfg.optionalBrackets;
  const [dynOpen, dynClose] = cfg.dynamicBrackets;
  const [grpOpen, grpClose] = cfg.groupBrackets;

  // Catch-all routes: [[...slug]].tsx
  const catchAllPattern = new RegExp(
    `^\\${optOpen}\\${cfg.catchAllPrefix}([\\w-]+)\\${optClose}$`
  );
  const catchAllMatch = nameWithoutExt.match(catchAllPattern);
  const catchAllParam = catchAllMatch?.[1];
  if (catchAllParam !== undefined && catchAllParam !== '') {
    return {
      type: 'catchAll',
      name: '*',
      paramName: catchAllParam,
      isOptional: false,
      originalFilename: filename,
    };
  }

  // Optional dynamic routes: [[id]].tsx
  const optionalPattern = new RegExp(
    `^\\${optOpen}([\\w-]+)\\${optClose}$`
  );
  const optionalMatch = nameWithoutExt.match(optionalPattern);
  const optionalParam = optionalMatch?.[1];
  if (optionalParam !== undefined && optionalParam !== '') {
    return {
      type: 'optional',
      name: `:${optionalParam}?`,
      paramName: optionalParam,
      isOptional: true,
      originalFilename: filename,
    };
  }

  // Dynamic routes: [id].tsx
  const dynamicPattern = new RegExp(
    `^\\${dynOpen}([\\w-]+)\\${dynClose}$`
  );
  const dynamicMatch = nameWithoutExt.match(dynamicPattern);
  const dynamicParam = dynamicMatch?.[1];
  if (dynamicParam !== undefined && dynamicParam !== '') {
    return {
      type: 'dynamic',
      name: `:${dynamicParam}`,
      paramName: dynamicParam,
      isOptional: false,
      originalFilename: filename,
    };
  }

  // Route groups: (auth)/
  const groupPattern = new RegExp(
    `^\\${grpOpen}([\\w-]+)\\${grpClose}$`
  );
  const groupMatch = nameWithoutExt.match(groupPattern);
  if (groupMatch) {
    return {
      type: 'group',
      name: '', // Groups don't appear in URL
      isOptional: false,
      originalFilename: filename,
    };
  }

  // Static routes: about.tsx
  return {
    type: 'static',
    name: nameWithoutExt,
    isOptional: false,
    originalFilename: filename,
  };
}

/**
 * Parse a full directory path into route segments
 *
 * @param dirPath - Directory path (relative to routes root)
 * @param filename - The filename within the directory
 * @param config - Optional parsing configuration
 * @returns Array of parsed route segments
 *
 * @example
 * ```typescript
 * parseDirectoryPath('users/[id]', 'posts.tsx');
 * // Returns segments for: /users/:id/posts
 * ```
 */
export function parseDirectoryPath(
  dirPath: string,
  filename: string,
  config: SegmentParserConfig = {}
): readonly ParsedRouteSegment[] {
  const segments: ParsedRouteSegment[] = [];

  // Parse directory segments
  if (dirPath && dirPath !== '.') {
    const dirParts = dirPath.split(/[/\\]/).filter(Boolean);
    for (const part of dirParts) {
      segments.push(parseRouteSegment(part, config));
    }
  }

  // Parse filename segment
  segments.push(parseRouteSegment(filename, config));

  return segments;
}

/**
 * Convert parsed segments to URL path
 *
 * @param segments - Array of parsed route segments
 * @returns URL path string
 *
 * @example
 * ```typescript
 * const segments = parseDirectoryPath('users/[id]', 'posts.tsx');
 * segmentsToUrlPath(segments); // '/users/:id/posts'
 * ```
 */
export function segmentsToUrlPath(segments: readonly ParsedRouteSegment[]): string {
  const pathParts = segments
    .filter((s) => s.type !== 'layout' && s.type !== 'group')
    .map((s) => s.name)
    .filter(Boolean);

  return `/${pathParts.join('/')}`;
}

// =============================================================================
// Segment Utilities
// =============================================================================

/**
 * Check if a segment is dynamic (has a parameter)
 *
 * @param segment - The parsed segment to check
 * @returns True if the segment is dynamic
 */
export function isDynamicSegment(segment: ParsedRouteSegment): boolean {
  return segment.type === 'dynamic' || segment.type === 'optional' || segment.type === 'catchAll';
}

/**
 * Check if a segment contributes to the URL path
 *
 * @param segment - The parsed segment to check
 * @returns True if the segment appears in the URL
 */
export function isUrlSegment(segment: ParsedRouteSegment): boolean {
  return segment.type !== 'layout' && segment.type !== 'group';
}

/**
 * Extract all parameter names from segments
 *
 * @param segments - Array of parsed route segments
 * @returns Array of parameter names
 */
export function extractSegmentParams(segments: readonly ParsedRouteSegment[]): string[] {
  return segments
    .filter((s) => s.paramName !== undefined)
    .map((s) => s.paramName as string);
}

/**
 * Generate a route ID from segments
 *
 * @param segments - Array of parsed route segments
 * @param urlPath - Optional URL path (will be calculated if not provided)
 * @returns Route ID string
 *
 * @example
 * ```typescript
 * generateRouteId(segments, '/users/:id'); // 'USERS_BY_ID'
 * ```
 */
export function generateRouteId(
  segments: readonly ParsedRouteSegment[],
  urlPath?: string
): string {
  const path = urlPath ?? segmentsToUrlPath(segments);

  if (path === '/') return 'INDEX';

  return path
    .replace(/^\//, '')
    .replace(/\//g, '_')
    .replace(/:/g, 'BY_')
    .replace(/\?/g, '_OPT')
    .replace(/\*/g, 'CATCH_ALL')
    .toUpperCase();
}

/**
 * Generate a human-readable display name from segments
 *
 * @param segments - Array of parsed route segments
 * @returns Display name string
 *
 * @example
 * ```typescript
 * generateDisplayName(segments); // 'User Detail'
 * ```
 */
export function generateDisplayName(segments: readonly ParsedRouteSegment[]): string {
  const lastSegment = segments[segments.length - 1];

  if (!lastSegment) {
    return 'Home';
  }

  if (lastSegment.type === 'index') {
    const parentSegment = segments[segments.length - 2];
    const parentName = parentSegment?.name;
    if (parentName !== undefined && parentName !== '') {
      return capitalize(parentName);
    }
    return 'Home';
  }

  if (lastSegment.type === 'dynamic') {
    return `${capitalize(lastSegment.paramName ?? 'Detail')} Detail`;
  }

  if (lastSegment.type === 'catchAll') {
    return 'Catch All';
  }

  return capitalize(lastSegment.name);
}

/**
 * Capitalize a string and convert hyphens to spaces
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
}

// =============================================================================
// Path Depth Calculation
// =============================================================================

/**
 * Calculate the depth of segments (excluding groups)
 *
 * @param segments - Array of parsed route segments
 * @returns Depth count
 */
export function calculateSegmentDepth(segments: readonly ParsedRouteSegment[]): number {
  return segments.filter((s) => s.type !== 'group').length;
}

/**
 * Check if segments contain a layout
 *
 * @param segments - Array of parsed route segments
 * @returns True if any segment is a layout
 */
export function hasLayoutSegment(segments: readonly ParsedRouteSegment[]): boolean {
  return segments.some((s) => s.type === 'layout');
}

/**
 * Check if segments represent an index route
 *
 * @param segments - Array of parsed route segments
 * @returns True if the last segment is an index
 */
export function isIndexRoute(segments: readonly ParsedRouteSegment[]): boolean {
  const lastSegment = segments[segments.length - 1];
  return lastSegment?.type === 'index';
}
