/**
 * @file Pagination Helpers
 * @description Utilities for extracting and managing pagination metadata from API responses.
 * Supports both cursor-based and offset-based pagination patterns.
 */

import type { ApiResponse, PaginatedResponse, PaginationMeta } from './types';

/**
 * Pagination extraction configuration
 */
export interface PaginationConfig {
  /** Response field containing items array */
  itemsField?: string;
  /** Response field containing total count */
  totalField?: string;
  /** Response field containing page number */
  pageField?: string;
  /** Response field containing page size */
  pageSizeField?: string;
  /** Response field containing next cursor */
  nextCursorField?: string;
  /** Response field containing previous cursor */
  prevCursorField?: string;
  /** Header containing total count */
  totalHeader?: string;
  /** Header containing link relations */
  linkHeader?: string;
}

/**
 * Default pagination config
 */
const DEFAULT_PAGINATION_CONFIG: PaginationConfig = {
  itemsField: 'items',
  totalField: 'total',
  pageField: 'page',
  pageSizeField: 'pageSize',
  nextCursorField: 'nextCursor',
  prevCursorField: 'prevCursor',
  totalHeader: 'x-total-count',
  linkHeader: 'link',
};

/**
 * Extract pagination metadata from response
 *
 * @param response - API response
 * @param config - Extraction configuration
 * @returns Extracted pagination metadata
 *
 * @example
 * ```typescript
 * const pagination = extractPagination(response);
 * console.log(pagination.total); // Total items
 * console.log(pagination.hasMore); // More pages available
 * ```
 */
export function extractPagination<T>(
  response: ApiResponse,
  config: PaginationConfig = {}
): PaginatedResponse<T> {
  const opts = { ...DEFAULT_PAGINATION_CONFIG, ...config };
  const data = response.data as Record<string, unknown>;

  // Extract items
  let items: T[] = [];
  if (Array.isArray(data)) {
    items = data as T[];
  } else if (
    typeof data === 'object' &&
    data !== null &&
    opts.itemsField !== null &&
    opts.itemsField !== undefined &&
    opts.itemsField !== '' &&
    opts.itemsField in data
  ) {
    items = (data[opts.itemsField] as T[]) ?? [];
  }

  // Extract metadata from response body
  const total = getNestedValue<number>(data, opts.totalField) ?? items.length;
  const page = getNestedValue<number>(data, opts.pageField) ?? 1;
  const pageSize = getNestedValue<number>(data, opts.pageSizeField) ?? items.length;
  const nextCursor = getNestedValue<string>(data, opts.nextCursorField);
  const prevCursor = getNestedValue<string>(data, opts.prevCursorField);

  // Try headers if not found in body
  const headerTotal =
    opts.totalHeader !== null && opts.totalHeader !== undefined && opts.totalHeader !== ''
      ? response.headers[opts.totalHeader]
      : undefined;
  const finalTotal =
    total ??
    (headerTotal !== null && headerTotal !== undefined && headerTotal !== ''
      ? parseInt(headerTotal, 10)
      : items.length);

  // Parse Link header for cursor info
  const linkHeader =
    opts.linkHeader !== null && opts.linkHeader !== undefined && opts.linkHeader !== ''
      ? response.headers[opts.linkHeader]
      : undefined;
  const links =
    linkHeader !== null && linkHeader !== undefined && linkHeader !== ''
      ? parseLinkHeader(linkHeader)
      : {};

  const totalPages = Math.ceil(finalTotal / pageSize);
  const hasMore =
    nextCursor !== null && nextCursor !== undefined && nextCursor !== '' ? true : page < totalPages;

  return {
    items,
    pagination: {
      total: finalTotal,
      page,
      pageSize,
      totalPages,
      hasMore,
      nextCursor: nextCursor ?? links.next,
      prevCursor: prevCursor ?? links.prev,
    },
  };
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue<T>(obj: unknown, path?: string): T | undefined {
  if (
    path === null ||
    path === undefined ||
    path === '' ||
    obj === null ||
    obj === undefined ||
    typeof obj !== 'object'
  ) {
    return undefined;
  }

  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current as T;
}

/**
 * Parse Link header for pagination URLs
 */
function parseLinkHeader(header: string): Record<string, string> {
  const links: Record<string, string> = {};

  const parts = header.split(',');
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) {
      const [, url, rel] = match;
      // Extract cursor from URL if present
      if (url === null || url === undefined || url === '') continue;
      const urlParams = new URLSearchParams(url.split('?')[1] ?? '');
      const cursor = urlParams.get('cursor') ?? urlParams.get('after') ?? url;
      if (rel !== null && rel !== undefined && rel !== '') links[rel] = cursor;
    }
  }

  return links;
}

/**
 * Create a paginated response wrapper
 *
 * @example
 * ```typescript
 * const paginated = createPaginatedResponse(users, {
 *   total: 100,
 *   page: 1,
 *   pageSize: 20,
 * });
 * ```
 */
export function createPaginatedResponse<T>(
  items: T[],
  meta: Partial<PaginationMeta>
): PaginatedResponse<T> {
  const total = meta.total ?? items.length;
  const pageSize = meta.pageSize ?? items.length;
  const page = meta.page ?? 1;
  const totalPages = Math.ceil(total / pageSize);

  return {
    items,
    pagination: {
      total,
      page,
      pageSize,
      totalPages,
      hasMore: meta.hasMore ?? page < totalPages,
      nextCursor: meta.nextCursor,
      prevCursor: meta.prevCursor,
    },
  };
}

/**
 * Merge paginated responses (for infinite scroll)
 *
 * @example
 * ```typescript
 * const combined = mergePaginatedResponses(page1, page2, page3);
 * ```
 */
export function mergePaginatedResponses<T>(
  ...responses: PaginatedResponse<T>[]
): PaginatedResponse<T> {
  if (responses.length === 0) {
    return createPaginatedResponse([], { total: 0 });
  }

  const items = responses.flatMap((r) => r.items);
  const lastResponse = responses[responses.length - 1];

  return {
    items,
    pagination: {
      page: responses.length,
      pageSize: Math.ceil(items.length / responses.length),
      total: lastResponse?.pagination?.total ?? items.length,
      totalPages: lastResponse?.pagination?.totalPages ?? 1,
      hasMore: lastResponse?.pagination?.hasMore ?? false,
      nextCursor: lastResponse?.pagination?.nextCursor,
      prevCursor: lastResponse?.pagination?.prevCursor,
    },
  };
}
