/**
 * Pagination Utilities with Type Safety
 *
 * @module @missionfabric-js/enzyme-typescript/api/pagination
 * @description Type-safe pagination utilities for API responses
 *
 * @example
 * ```typescript
 * import { createPaginator, type PaginatedResponse } from '@missionfabric-js/enzyme-typescript/api';
 *
 * const paginator = createPaginator<User>({
 *   fetch: (page, size) => fetch(`/api/users?page=${page}&size=${size}`)
 * });
 *
 * const firstPage = await paginator.fetch(1);
 * const nextPage = await paginator.next();
 * ```
 */

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  /** Current page number (1-indexed) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total number of items */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Whether there is a previous page */
  hasPrev: boolean;
  /** Index of first item on page */
  startIndex: number;
  /** Index of last item on page */
  endIndex: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  /** Page data */
  data: T[];
  /** Pagination metadata */
  meta: PaginationMeta;
}

/**
 * Cursor-based pagination metadata
 */
export interface CursorPaginationMeta {
  /** Next cursor */
  nextCursor: string | null;
  /** Previous cursor */
  prevCursor: string | null;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Whether there is a previous page */
  hasPrev: boolean;
  /** Items per page */
  pageSize: number;
}

/**
 * Cursor-based paginated response
 */
export interface CursorPaginatedResponse<T> {
  /** Page data */
  data: T[];
  /** Cursor pagination metadata */
  meta: CursorPaginationMeta;
}

/**
 * Offset-based pagination parameters
 */
export interface OffsetPaginationParams {
  /** Offset (number of items to skip) */
  offset: number;
  /** Limit (number of items to return) */
  limit: number;
}

/**
 * Page-based pagination parameters
 */
export interface PagePaginationParams {
  /** Page number (1-indexed) */
  page: number;
  /** Page size */
  pageSize: number;
}

/**
 * Cursor-based pagination parameters
 */
export interface CursorPaginationParams {
  /** Cursor */
  cursor?: string;
  /** Page size */
  pageSize: number;
  /** Direction */
  direction?: 'forward' | 'backward';
}

/**
 * Calculate pagination metadata
 *
 * @example
 * ```typescript
 * const meta = calculatePaginationMeta(1, 20, 100);
 * // { page: 1, pageSize: 20, total: 100, totalPages: 5, ... }
 * ```
 */
export function calculatePaginationMeta(
  page: number,
  pageSize: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize - 1, total - 1);

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    startIndex,
    endIndex,
  };
}

/**
 * Convert page-based to offset-based pagination
 *
 * @example
 * ```typescript
 * const offset = pageToOffset(2, 20); // { offset: 20, limit: 20 }
 * ```
 */
export function pageToOffset(page: number, pageSize: number): OffsetPaginationParams {
  return {
    offset: (page - 1) * pageSize,
    limit: pageSize,
  };
}

/**
 * Convert offset-based to page-based pagination
 *
 * @example
 * ```typescript
 * const page = offsetToPage(40, 20); // { page: 3, pageSize: 20 }
 * ```
 */
export function offsetToPage(offset: number, limit: number): PagePaginationParams {
  return {
    page: Math.floor(offset / limit) + 1,
    pageSize: limit,
  };
}

/**
 * Paginator configuration
 */
export interface PaginatorConfig<T> {
  /** Fetch function */
  fetch: (page: number, pageSize: number) => Promise<PaginatedResponse<T>>;
  /** Initial page size */
  pageSize?: number;
  /** Initial page */
  initialPage?: number;
}

/**
 * Paginator state
 */
export interface PaginatorState {
  /** Current page */
  currentPage: number;
  /** Page size */
  pageSize: number;
  /** Whether currently loading */
  loading: boolean;
  /** Last error */
  error: Error | null;
}

/**
 * Paginator class for managing pagination state
 */
export class Paginator<T> {
  private config: Required<PaginatorConfig<T>>;
  private state: PaginatorState;
  private currentData: PaginatedResponse<T> | null = null;

  constructor(config: PaginatorConfig<T>) {
    this.config = {
      pageSize: config.pageSize ?? 20,
      initialPage: config.initialPage ?? 1,
      fetch: config.fetch,
    };

    this.state = {
      currentPage: this.config.initialPage,
      pageSize: this.config.pageSize,
      loading: false,
      error: null,
    };
  }

  /**
   * Fetch page
   */
  async fetch(page?: number): Promise<PaginatedResponse<T>> {
    const targetPage = page ?? this.state.currentPage;

    this.state.loading = true;
    this.state.error = null;

    try {
      const result = await this.config.fetch(targetPage, this.state.pageSize);
      this.currentData = result;
      this.state.currentPage = targetPage;
      return result;
    } catch (error) {
      this.state.error = error instanceof Error ? error : new Error('Fetch failed');
      throw error;
    } finally {
      this.state.loading = false;
    }
  }

  /**
   * Go to next page
   */
  async next(): Promise<PaginatedResponse<T> | null> {
    if (!this.currentData?.meta.hasNext) {
      return null;
    }
    return this.fetch(this.state.currentPage + 1);
  }

  /**
   * Go to previous page
   */
  async prev(): Promise<PaginatedResponse<T> | null> {
    if (!this.currentData?.meta.hasPrev) {
      return null;
    }
    return this.fetch(this.state.currentPage - 1);
  }

  /**
   * Go to first page
   */
  async first(): Promise<PaginatedResponse<T>> {
    return this.fetch(1);
  }

  /**
   * Go to last page
   */
  async last(): Promise<PaginatedResponse<T>> {
    if (!this.currentData) {
      throw new Error('Must fetch at least one page first');
    }
    return this.fetch(this.currentData.meta.totalPages);
  }

  /**
   * Set page size
   */
  setPageSize(pageSize: number): void {
    this.state.pageSize = pageSize;
  }

  /**
   * Get current state
   */
  getState(): Readonly<PaginatorState> {
    return { ...this.state };
  }

  /**
   * Get current data
   */
  getData(): Readonly<PaginatedResponse<T>> | null {
    return this.currentData ? { ...this.currentData } : null;
  }

  /**
   * Reset paginator
   */
  reset(): void {
    this.state.currentPage = this.config.initialPage;
    this.state.pageSize = this.config.pageSize;
    this.state.error = null;
    this.currentData = null;
  }

  /**
   * Fetch all pages
   */
  async *fetchAll(): AsyncIterableIterator<T[]> {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await this.fetch(page);
      yield result.data;
      hasMore = result.meta.hasNext;
      page++;
    }
  }

  /**
   * Collect all items from all pages
   */
  async collectAll(): Promise<T[]> {
    const items: T[] = [];
    for await (const page of this.fetchAll()) {
      items.push(...page);
    }
    return items;
  }
}

/**
 * Create paginator instance
 *
 * @example
 * ```typescript
 * const paginator = createPaginator<User>({
 *   fetch: async (page, pageSize) => {
 *     const response = await fetch(`/api/users?page=${page}&size=${pageSize}`);
 *     return response.json();
 *   },
 *   pageSize: 20
 * });
 *
 * const firstPage = await paginator.fetch();
 * const nextPage = await paginator.next();
 * ```
 */
export function createPaginator<T>(config: PaginatorConfig<T>): Paginator<T> {
  return new Paginator<T>(config);
}

/**
 * Cursor paginator configuration
 */
export interface CursorPaginatorConfig<T> {
  /** Fetch function */
  fetch: (cursor: string | undefined, pageSize: number) => Promise<CursorPaginatedResponse<T>>;
  /** Initial page size */
  pageSize?: number;
}

/**
 * Cursor-based paginator
 */
export class CursorPaginator<T> {
  private config: Required<CursorPaginatorConfig<T>>;
  private currentData: CursorPaginatedResponse<T> | null = null;
  private pageSize: number;
  private loading: boolean = false;
  private error: Error | null = null;

  constructor(config: CursorPaginatorConfig<T>) {
    this.config = {
      pageSize: config.pageSize ?? 20,
      fetch: config.fetch,
    };
    this.pageSize = this.config.pageSize;
  }

  /**
   * Fetch page by cursor
   */
  async fetch(cursor?: string): Promise<CursorPaginatedResponse<T>> {
    this.loading = true;
    this.error = null;

    try {
      const result = await this.config.fetch(cursor, this.pageSize);
      this.currentData = result;
      return result;
    } catch (error) {
      this.error = error instanceof Error ? error : new Error('Fetch failed');
      throw error;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Fetch next page
   */
  async next(): Promise<CursorPaginatedResponse<T> | null> {
    if (!this.currentData?.meta.hasNext || !this.currentData.meta.nextCursor) {
      return null;
    }
    return this.fetch(this.currentData.meta.nextCursor);
  }

  /**
   * Fetch previous page
   */
  async prev(): Promise<CursorPaginatedResponse<T> | null> {
    if (!this.currentData?.meta.hasPrev || !this.currentData.meta.prevCursor) {
      return null;
    }
    return this.fetch(this.currentData.meta.prevCursor);
  }

  /**
   * Fetch first page
   */
  async first(): Promise<CursorPaginatedResponse<T>> {
    return this.fetch(undefined);
  }

  /**
   * Get current data
   */
  getData(): Readonly<CursorPaginatedResponse<T>> | null {
    return this.currentData ? { ...this.currentData } : null;
  }

  /**
   * Check if loading
   */
  isLoading(): boolean {
    return this.loading;
  }

  /**
   * Get error
   */
  getError(): Error | null {
    return this.error;
  }

  /**
   * Reset paginator
   */
  reset(): void {
    this.currentData = null;
    this.error = null;
  }

  /**
   * Fetch all pages
   */
  async *fetchAll(): AsyncIterableIterator<T[]> {
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const result = await this.fetch(cursor);
      yield result.data;
      hasMore = result.meta.hasNext;
      cursor = result.meta.nextCursor ?? undefined;
    }
  }

  /**
   * Collect all items
   */
  async collectAll(): Promise<T[]> {
    const items: T[] = [];
    for await (const page of this.fetchAll()) {
      items.push(...page);
    }
    return items;
  }
}

/**
 * Create cursor-based paginator
 *
 * @example
 * ```typescript
 * const paginator = createCursorPaginator<User>({
 *   fetch: async (cursor, pageSize) => {
 *     const url = cursor
 *       ? `/api/users?cursor=${cursor}&size=${pageSize}`
 *       : `/api/users?size=${pageSize}`;
 *     const response = await fetch(url);
 *     return response.json();
 *   }
 * });
 *
 * const firstPage = await paginator.first();
 * const nextPage = await paginator.next();
 * ```
 */
export function createCursorPaginator<T>(config: CursorPaginatorConfig<T>): CursorPaginator<T> {
  return new CursorPaginator<T>(config);
}

/**
 * Infinite scroll helper
 *
 * @example
 * ```typescript
 * const scroller = createInfiniteScroller<User>({
 *   fetch: (page) => fetch(`/api/users?page=${page}`).then(r => r.json())
 * });
 *
 * await scroller.loadMore();
 * const allItems = scroller.getItems();
 * ```
 */
export function createInfiniteScroller<T>(config: PaginatorConfig<T>) {
  const paginator = createPaginator(config);
  const items: T[] = [];

  return {
    /**
     * Load more items
     */
    async loadMore(): Promise<boolean> {
      const data = paginator.getData();
      const page = data ? data.meta.page + 1 : 1;

      const result = await paginator.fetch(page);
      items.push(...result.data);

      return result.meta.hasNext;
    },

    /**
     * Get all loaded items
     */
    getItems(): Readonly<T[]> {
      return [...items];
    },

    /**
     * Check if has more
     */
    hasMore(): boolean {
      const data = paginator.getData();
      return data?.meta.hasNext ?? true;
    },

    /**
     * Check if loading
     */
    isLoading(): boolean {
      return paginator.getState().loading;
    },

    /**
     * Reset scroller
     */
    reset(): void {
      items.length = 0;
      paginator.reset();
    },

    /**
     * Get current state
     */
    getState() {
      return {
        items: [...items],
        hasMore: this.hasMore(),
        loading: this.isLoading(),
        ...paginator.getState(),
      };
    },
  };
}

/**
 * Parse pagination from headers (RFC 8288 Link header)
 *
 * @example
 * ```typescript
 * const headers = new Headers({
 *   'Link': '<https://api.example.com/users?page=2>; rel="next"'
 * });
 * const links = parseLinkHeader(headers);
 * // { next: 'https://api.example.com/users?page=2' }
 * ```
 */
export function parseLinkHeader(headers: Headers): Record<string, string> {
  const linkHeader = headers.get('Link');
  if (!linkHeader) return {};

  const links: Record<string, string> = {};
  const parts = linkHeader.split(',');

  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) {
      const [, url, rel] = match;
      links[rel] = url.trim();
    }
  }

  return links;
}

/**
 * Parse total count from headers
 *
 * @example
 * ```typescript
 * const headers = new Headers({ 'X-Total-Count': '100' });
 * const total = parseTotalCount(headers); // 100
 * ```
 */
export function parseTotalCount(headers: Headers, headerName: string = 'X-Total-Count'): number | null {
  const value = headers.get(headerName);
  return value ? parseInt(value, 10) : null;
}
