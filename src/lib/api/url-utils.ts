import type { QueryParams } from './types';
import type { QuerySerializationOptions } from './query-utils';
import { serializeQueryParams } from './query-utils';

/**
 * Build a complete URL with path parameters and query string
 *
 * @example
 * ```typescript
 * buildUrl('/users/:id/posts', { id: '123' }, { page: 1 })
 * // Returns: '/users/123/posts?page=1'
 * ```
 */
export function buildUrl(
  path: string,
  pathParams?: Record<string, string | number>,
  queryParams?: QueryParams,
  options?: Partial<QuerySerializationOptions>
): string {
  let url = path;

  // Substitute path parameters
  if (pathParams) {
    for (const [key, value] of Object.entries(pathParams)) {
      url = url.replace(`:${key}`, encodeURIComponent(String(value)));
    }
  }

  // Add query string
  if (queryParams && Object.keys(queryParams).length > 0) {
    const queryString = serializeQueryParams(queryParams, options);
    if (queryString) {
      url = `${url}?${queryString}`;
    }
  }

  return url;
}

/**
 * Join URL segments safely
 *
 * @example
 * ```typescript
 * joinUrl('https://api.example.com/', '/v1/', 'users')
 * // Returns: 'https://api.example.com/v1/users'
 * ```
 */
export function joinUrl(...segments: string[]): string {
  return segments
    .map((segment, index) => {
      // Remove trailing slashes except for first segment
      if (index > 0) {
        segment = segment.replace(/^\/+/, '');
      }
      // Remove leading slashes except for last segment
      if (index < segments.length - 1) {
        segment = segment.replace(/\/+$/, '');
      }
      return segment;
    })
    .filter(Boolean)
    .join('/');
}
