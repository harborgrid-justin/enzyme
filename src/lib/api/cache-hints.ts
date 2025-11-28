/**
 * @file Cache Hints
 * @description Cache hint extraction and management utilities for API responses.
 * Handles parsing of Cache-Control headers and generation of cache metadata.
 */

import type { CacheInfo, ResponseHeaders } from './types';

/**
 * Cache hint extraction result
 */
export interface CacheHints {
  /** Whether response is cacheable */
  cacheable: boolean;
  /** Time-to-live in seconds */
  maxAge?: number;
  /** Stale-while-revalidate window in seconds */
  staleWhileRevalidate?: number;
  /** Entity tag for validation */
  etag?: string;
  /** Last modified timestamp */
  lastModified?: Date;
  /** Whether must revalidate before serving stale */
  mustRevalidate: boolean;
  /** Whether response is private (user-specific) */
  isPrivate: boolean;
  /** Whether response should not be stored */
  noStore: boolean;
  /** Whether response should not be cached */
  noCache: boolean;
}

/**
 * Extract cache hints from response headers
 *
 * @param headers - Response headers
 * @returns Parsed cache hints
 *
 * @example
 * ```typescript
 * const hints = extractCacheHints(response.headers);
 * if (hints.cacheable && hints.maxAge) {
 *   cache.set(key, data, hints.maxAge * 1000);
 * }
 * ```
 */
export function extractCacheHints(headers: ResponseHeaders): CacheHints {
  const cacheControl = headers['cache-control'] ?? '';
  const { etag, 'last-modified': lastModified } = headers;

  // Parse Cache-Control directives
  const directives = parseCacheControlHeader(cacheControl);

  const hints: CacheHints = {
    cacheable: !directives['no-store'] && !directives['no-cache'],
    maxAge: (directives['max-age'] != null && directives['max-age'] !== '') ? parseInt(directives['max-age'], 10) : undefined,
    staleWhileRevalidate: (directives['stale-while-revalidate'] != null && directives['stale-while-revalidate'] !== '')
      ? parseInt(directives['stale-while-revalidate'], 10)
      : undefined,
    etag,
    lastModified: (lastModified != null && lastModified !== '') ? new Date(lastModified) : undefined,
    mustRevalidate: 'must-revalidate' in directives,
    isPrivate: 'private' in directives,
    noStore: 'no-store' in directives,
    noCache: 'no-cache' in directives,
  };

  return hints;
}

/**
 * Parse Cache-Control header into directives
 */
function parseCacheControlHeader(header: string): Record<string, string> {
  const directives: Record<string, string> = {};

  if (!header) return directives;

  const parts = header.split(',').map((p) => p.trim());

  for (const part of parts) {
    const [key, value] = part.split('=').map((s) => s.trim());
    if (key) directives[key.toLowerCase()] = value ?? 'true';
  }

  return directives;
}

/**
 * Build cache info from response
 */
export function buildCacheInfo(
  headers: ResponseHeaders,
  fromCache = false,
  age?: number
): CacheInfo {
  const hints = extractCacheHints(headers);

  return {
    fromCache,
    hitType: fromCache ? 'memory' : undefined,
    age,
    expiresAt: hints.maxAge ? Date.now() + hints.maxAge * 1000 : undefined,
    etag: hints.etag,
  };
}

/**
 * Generate Cache-Control header value
 *
 * @example
 * ```typescript
 * const cacheControl = generateCacheControl({
 *   maxAge: 3600,
 *   isPrivate: true,
 *   staleWhileRevalidate: 60,
 * });
 * // Returns: 'private, max-age=3600, stale-while-revalidate=60'
 * ```
 */
export function generateCacheControl(hints: Partial<CacheHints>): string {
  const directives: string[] = [];

  if (hints.noStore) {
    return 'no-store';
  }

  if (hints.noCache) {
    directives.push('no-cache');
  }

  if (hints.isPrivate) {
    directives.push('private');
  } else {
    directives.push('public');
  }

  if (hints.maxAge !== undefined) {
    directives.push(`max-age=${hints.maxAge}`);
  }

  if (hints.staleWhileRevalidate !== undefined) {
    directives.push(`stale-while-revalidate=${hints.staleWhileRevalidate}`);
  }

  if (hints.mustRevalidate) {
    directives.push('must-revalidate');
  }

  return directives.join(', ');
}
