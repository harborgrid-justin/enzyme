/**
 * @file Core Path Utilities
 * @description Framework-agnostic path building, parameter extraction, and pattern matching utilities.
 * This module provides reusable functions for working with URL paths and route patterns
 * that can be used in any JavaScript/TypeScript project.
 *
 * @module @/lib/routing/core/path-utils
 *
 * @example
 * ```typescript
 * import {
 *   buildPath,
 *   extractParamNames,
 *   matchPathPattern,
 *   parsePathParams,
 * } from '@/lib/routing/core/path-utils';
 *
 * // Build a path with parameters
 * buildPath('/users/:id', { id: '123' }); // '/users/123'
 *
 * // Extract parameter names from a pattern
 * extractParamNames('/users/:id/posts/:postId'); // ['id', 'postId']
 *
 * // Check if a path matches a pattern
 * matchPathPattern('/users/:id', '/users/123'); // true
 *
 * // Parse parameters from a matched path
 * parsePathParams('/users/:id', '/users/123'); // { id: '123' }
 * ```
 */

// =============================================================================
// Path Building
// =============================================================================

/**
 * Build a URL path from a pattern and parameters
 *
 * Supports:
 * - Required parameters: `:id`
 * - Optional parameters: `:id?`
 * - Query string parameters
 *
 * @param pattern - Route pattern with parameter placeholders
 * @param params - Object containing parameter values
 * @param query - Optional query string parameters
 * @returns The built URL path
 *
 * @example
 * ```typescript
 * buildPath('/users/:id', { id: '123' }); // '/users/123'
 * buildPath('/users/:id?', {}); // '/users'
 * buildPath('/users/:id', { id: '123' }, { tab: 'settings' }); // '/users/123?tab=settings'
 * ```
 */
export function buildPath(
  pattern: string,
  params?: Record<string, string | number | undefined>,
  query?: Record<string, string | number | undefined>
): string {
  let path = pattern;

  // Replace parameters
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        // Replace both required and optional params
        path = path.replace(`:${key}?`, encodeURIComponent(String(value)));
        path = path.replace(`:${key}`, encodeURIComponent(String(value)));
      }
    }
  }

  // Remove unfilled optional params
  path = path.replace(/\/:[^/]+\?/g, '');

  // Clean up any double slashes
  path = path.replace(/\/+/g, '/');

  // Add query string
  if (query && Object.keys(query).length > 0) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      path = `${path}?${queryString}`;
    }
  }

  return path;
}

/**
 * Build a query string from parameters
 *
 * @param query - Query parameters object
 * @returns Query string (without leading ?)
 *
 * @example
 * ```typescript
 * buildQueryString({ page: 1, sort: 'name' }); // 'page=1&sort=name'
 * buildQueryString({ filter: undefined, sort: 'name' }); // 'sort=name'
 * ```
 */
export function buildQueryString(
  query: Record<string, string | number | boolean | undefined>
): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  return searchParams.toString();
}

/**
 * Parse query string into parameters object
 *
 * @param queryString - Query string to parse (with or without leading ?)
 * @returns Parsed query parameters
 *
 * @example
 * ```typescript
 * parseQueryString('?page=1&sort=name'); // { page: '1', sort: 'name' }
 * parseQueryString('page=1&sort=name'); // { page: '1', sort: 'name' }
 * ```
 */
export function parseQueryString(queryString: string): Record<string, string> {
  const cleanQuery = queryString.startsWith('?') ? queryString.slice(1) : queryString;
  const params = new URLSearchParams(cleanQuery);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

// =============================================================================
// Parameter Extraction
// =============================================================================

/**
 * Extract parameter names from a route pattern
 *
 * @param pattern - Route pattern with parameter placeholders
 * @returns Array of parameter names (without : prefix)
 *
 * @example
 * ```typescript
 * extractParamNames('/users/:id'); // ['id']
 * extractParamNames('/users/:id/posts/:postId'); // ['id', 'postId']
 * extractParamNames('/search/:query?'); // ['query']
 * ```
 */
export function extractParamNames(pattern: string): string[] {
  const matches = pattern.match(/:[^/?]+/g) ?? [];
  return matches.map((m) => m.slice(1).replace('?', ''));
}

/**
 * Extract required parameter names from a route pattern
 *
 * @param pattern - Route pattern with parameter placeholders
 * @returns Array of required parameter names
 *
 * @example
 * ```typescript
 * extractRequiredParams('/users/:id/:tab?'); // ['id']
 * ```
 */
export function extractRequiredParams(pattern: string): string[] {
  const allParams = extractParamNames(pattern);
  return allParams.filter((param) => !pattern.includes(`:${param}?`));
}

/**
 * Extract optional parameter names from a route pattern
 *
 * @param pattern - Route pattern with parameter placeholders
 * @returns Array of optional parameter names
 *
 * @example
 * ```typescript
 * extractOptionalParams('/users/:id/:tab?'); // ['tab']
 * ```
 */
export function extractOptionalParams(pattern: string): string[] {
  const matches = pattern.match(/:[^/]+\?/g) ?? [];
  return matches.map((m) => m.slice(1, -1));
}

/**
 * Check if a route pattern has any parameters
 *
 * @param pattern - Route pattern to check
 * @returns True if the pattern contains parameters
 *
 * @example
 * ```typescript
 * hasParams('/users/:id'); // true
 * hasParams('/about'); // false
 * ```
 */
export function hasParams(pattern: string): boolean {
  return /:/.test(pattern);
}

/**
 * Check if a route pattern has any dynamic segments
 * (alias for hasParams for clarity)
 *
 * @param pattern - Route pattern to check
 * @returns True if the pattern contains dynamic segments
 */
export function hasDynamicSegments(pattern: string): boolean {
  return hasParams(pattern);
}

/**
 * Check if a route pattern has a catch-all segment
 *
 * @param pattern - Route pattern to check
 * @returns True if the pattern contains a catch-all segment
 *
 * @example
 * ```typescript
 * hasCatchAll('/docs/*'); // true
 * hasCatchAll('/users/:id'); // false
 * ```
 */
export function hasCatchAll(pattern: string): boolean {
  return /\*/.test(pattern);
}

// =============================================================================
// Pattern Matching
// =============================================================================

/**
 * Check if a path matches a route pattern
 *
 * @param pattern - Route pattern with parameter placeholders
 * @param path - Actual path to match
 * @returns True if the path matches the pattern
 *
 * @example
 * ```typescript
 * matchPathPattern('/users/:id', '/users/123'); // true
 * matchPathPattern('/users/:id', '/posts/123'); // false
 * matchPathPattern('/docs/*', '/docs/getting-started/installation'); // true
 * ```
 */
export function matchPathPattern(pattern: string, path: string): boolean {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);

  // Handle catch-all
  if (pattern.includes('*')) {
    const catchAllIndex = patternParts.findIndex((p) => p === '*');
    if (catchAllIndex !== -1) {
      // Everything before catch-all must match
      for (let i = 0; i < catchAllIndex; i++) {
        const patternPart = patternParts[i];
        const pathPart = pathParts[i];
        if (patternPart !== undefined && patternPart !== '' && !matchSegment(patternPart, pathPart)) {
          return false;
        }
      }
      return true;
    }
  }

  // Different lengths (accounting for optional params)
  const optionalCount = patternParts.filter((p) => p.endsWith('?')).length;
  if (
    pathParts.length < patternParts.length - optionalCount ||
    pathParts.length > patternParts.length
  ) {
    return false;
  }

  // Check each segment
  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart == null) {
      continue;
    }

    // Optional param at end with no corresponding path part
    if (patternPart.endsWith('?') && pathPart === undefined) {
      continue;
    }

    if (!matchSegment(patternPart, pathPart)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a single path segment matches a pattern segment
 *
 * @param pattern - Pattern segment (may include : for params)
 * @param segment - Actual path segment
 * @returns True if the segment matches
 */
function matchSegment(pattern: string, segment: string | undefined): boolean {
  if (segment === undefined) return false;

  // Dynamic segment matches anything
  if (pattern.startsWith(':')) {
    return true;
  }

  // Static segment must match exactly
  return pattern === segment;
}

/**
 * Parse path parameters from a path using a pattern
 *
 * @param pattern - Route pattern with parameter placeholders
 * @param path - Actual path to parse
 * @returns Object containing parsed parameters, or null if no match
 *
 * @example
 * ```typescript
 * parsePathParams('/users/:id', '/users/123'); // { id: '123' }
 * parsePathParams('/users/:id/posts/:postId', '/users/123/posts/456'); // { id: '123', postId: '456' }
 * parsePathParams('/users/:id', '/posts/123'); // null
 * ```
 */
export function parsePathParams(
  pattern: string,
  path: string
): Record<string, string> | null {
  if (!matchPathPattern(pattern, path)) {
    return null;
  }

  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    const startsWithColon = patternPart?.startsWith(':') === true;
    if (startsWithColon && patternPart !== undefined) {
      const paramName = patternPart.slice(1).replace('?', '');
      if (pathPart !== undefined) {
        params[paramName] = decodeURIComponent(pathPart);
      }
    }
  }

  // Handle catch-all
  const catchAllIndex = patternParts.findIndex((p) => p === '*');
  if (catchAllIndex !== -1) {
    params['*'] = pathParts.slice(catchAllIndex).join('/');
  }

  return params;
}

// =============================================================================
// Path Utilities
// =============================================================================

/**
 * Get the static prefix of a path (before first dynamic segment)
 *
 * @param pattern - Route pattern
 * @returns Static prefix of the path
 *
 * @example
 * ```typescript
 * getStaticPrefix('/users/:id/posts'); // '/users'
 * getStaticPrefix('/about'); // '/about'
 * ```
 */
export function getStaticPrefix(pattern: string): string {
  const firstDynamic = pattern.indexOf(':');
  if (firstDynamic === -1) return pattern;
  return pattern.slice(0, firstDynamic).replace(/\/$/, '');
}

/**
 * Normalize a path by removing trailing slashes and ensuring leading slash
 *
 * @param path - Path to normalize
 * @returns Normalized path
 *
 * @example
 * ```typescript
 * normalizePath('users/123/'); // '/users/123'
 * normalizePath('/users/123/'); // '/users/123'
 * ```
 */
export function normalizePath(path: string): string {
  let normalized = path;

  // Ensure leading slash
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  // Remove trailing slash (except for root)
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  // Remove double slashes
  normalized = normalized.replace(/\/+/g, '/');

  return normalized;
}

/**
 * Join path segments into a single path
 *
 * @param segments - Path segments to join
 * @returns Joined path
 *
 * @example
 * ```typescript
 * joinPath('/users', '123', 'posts'); // '/users/123/posts'
 * joinPath('users/', '/123/', '/posts'); // '/users/123/posts'
 * ```
 */
export function joinPath(...segments: string[]): string {
  const joined = segments
    .map((s) => s.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
  return `/${joined}`;
}

/**
 * Split a path into segments
 *
 * @param path - Path to split
 * @returns Array of path segments
 *
 * @example
 * ```typescript
 * splitPath('/users/123/posts'); // ['users', '123', 'posts']
 * ```
 */
export function splitPath(path: string): string[] {
  return path.split('/').filter(Boolean);
}

/**
 * Get the depth (number of segments) of a path
 *
 * @param path - Path to measure
 * @returns Number of path segments
 *
 * @example
 * ```typescript
 * getPathDepth('/users/123/posts'); // 3
 * getPathDepth('/'); // 0
 * ```
 */
export function getPathDepth(path: string): number {
  return splitPath(path).length;
}

/**
 * Check if a path is a child of another path
 *
 * @param childPath - Potential child path
 * @param parentPath - Potential parent path
 * @returns True if childPath is a child of parentPath
 *
 * @example
 * ```typescript
 * isChildPath('/users/123', '/users'); // true
 * isChildPath('/posts/123', '/users'); // false
 * ```
 */
export function isChildPath(childPath: string, parentPath: string): boolean {
  const normalizedChild = normalizePath(childPath);
  const normalizedParent = normalizePath(parentPath);

  if (normalizedParent === '/') {
    return normalizedChild !== '/';
  }

  return normalizedChild.startsWith(`${normalizedParent}/`);
}

/**
 * Get the parent path of a given path
 *
 * @param path - Path to get parent of
 * @returns Parent path
 *
 * @example
 * ```typescript
 * getParentPath('/users/123/posts'); // '/users/123'
 * getParentPath('/users'); // '/'
 * ```
 */
export function getParentPath(path: string): string {
  const segments = splitPath(path);
  if (segments.length <= 1) return '/';
  return `/${segments.slice(0, -1).join('/')}`;
}

/**
 * Get the last segment of a path
 *
 * @param path - Path to get last segment of
 * @returns Last path segment
 *
 * @example
 * ```typescript
 * getLastSegment('/users/123/posts'); // 'posts'
 * getLastSegment('/users'); // 'users'
 * ```
 */
export function getLastSegment(path: string): string {
  const segments = splitPath(path);
  const lastSegment = segments[segments.length - 1];
  return lastSegment !== undefined && lastSegment !== '' ? lastSegment : '';
}

// =============================================================================
// Route Specificity
// =============================================================================

/**
 * Calculate the specificity score of a route pattern
 *
 * Higher specificity = more specific route = should be matched first
 *
 * @param pattern - Route pattern to calculate specificity for
 * @returns Specificity score
 *
 * @example
 * ```typescript
 * getPatternSpecificity('/users/new'); // Higher
 * getPatternSpecificity('/users/:id'); // Lower
 * getPatternSpecificity('/users/*'); // Lowest
 * ```
 */
export function getPatternSpecificity(pattern: string): number {
  const segments = splitPath(pattern);
  let specificity = 0;

  for (const segment of segments) {
    if (segment === '*') {
      specificity += 10;
    } else if (segment.endsWith('?')) {
      specificity += 30;
    } else if (segment.startsWith(':')) {
      specificity += 50;
    } else {
      specificity += 100;
    }
  }

  return specificity;
}

/**
 * Compare two route patterns by specificity
 *
 * @param a - First pattern
 * @param b - Second pattern
 * @returns Negative if a is more specific, positive if b is more specific
 *
 * @example
 * ```typescript
 * ['/users/:id', '/users/new'].sort(comparePatternSpecificity);
 * // ['/users/new', '/users/:id']
 * ```
 */
export function comparePatternSpecificity(a: string, b: string): number {
  return getPatternSpecificity(b) - getPatternSpecificity(a);
}
