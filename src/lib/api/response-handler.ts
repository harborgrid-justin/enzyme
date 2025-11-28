/**
 * @file Response Handler
 * @description Comprehensive response handling utilities for API responses including
 * typed parsing, error normalization, caching hints, streaming support, and pagination.
 *
 * This module provides:
 * - Type-safe response parsing with validation
 * - Error normalization from various API error formats
 * - Response caching hint extraction and management
 * - Streaming response handling (SSE, NDJSON)
 * - Pagination helpers for cursor and offset-based APIs
 * - Response transformation pipelines
 *
 * @example
 * ```typescript
 * import {
 *   parseResponse,
 *   normalizeError,
 *   extractCacheHints,
 *   streamResponse,
 *   paginateResponse,
 * } from '@/lib/api';
 *
 * // Parse and validate response
 * const user = await parseResponse<User>(response, userSchema);
 *
 * // Handle streaming data
 * const stream = streamResponse<Message>(response, { sse: true });
 * stream.subscribe((event) => console.log(event.data));
 * ```
 */

import type {
  ApiResponse,
  ApiError,
  ErrorCategory,
  ErrorSeverity,
  PaginatedResponse,
  PaginationMeta,
  CacheInfo,
  ResponseHeaders,
  StreamController,
  StreamEvent,
  StreamEventType,
  StreamOptions,
  FieldError,
  ServerErrorResponse,
} from './types';

// =============================================================================
// RESPONSE PARSING
// =============================================================================

/**
 * Response parser configuration
 */
export interface ResponseParserConfig<T> {
  /** Schema validator (e.g., Zod schema) */
  schema?: { parse: (data: unknown) => T };
  /** Transform function applied after parsing */
  transform?: (data: T) => T;
  /** Default value if response is empty */
  defaultValue?: T;
  /** Whether to throw on validation errors */
  throwOnValidationError?: boolean;
  /** Custom error message for validation failures */
  validationErrorMessage?: string;
}

/**
 * Parse and optionally validate an API response
 *
 * @typeParam T - Expected response data type
 * @param response - Raw API response
 * @param config - Parser configuration
 * @returns Parsed and validated data
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 *
 * const userSchema = z.object({
 *   id: z.string(),
 *   name: z.string(),
 *   email: z.string().email(),
 * });
 *
 * const user = parseResponse<User>(response, {
 *   schema: userSchema,
 *   transform: (u) => ({ ...u, displayName: u.name.toUpperCase() }),
 * });
 * ```
 */
export function parseResponse<T>(
  response: ApiResponse<unknown>,
  config: ResponseParserConfig<T> = {}
): T {
  let data = response.data as T;

  // Handle empty responses
  if (data === null || data === undefined) {
    if (config.defaultValue !== undefined) {
      return config.defaultValue;
    }
    // Return empty data as-is for void responses
    return data;
  }

  // Validate with schema if provided
  if (config.schema) {
    try {
      data = config.schema.parse(data);
    } catch (error) {
      if (config.throwOnValidationError !== false) {
        const message =
          config.validationErrorMessage ||
          `Response validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        throw createValidationError(message, error);
      }
      // Return raw data if validation fails and throwing is disabled
      console.warn('[ResponseHandler] Validation failed:', error);
    }
  }

  // Apply transformation
  if (config.transform) {
    data = config.transform(data);
  }

  return data;
}

/**
 * Create a response parser for a specific type
 *
 * @example
 * ```typescript
 * const parseUser = createResponseParser<User>({
 *   schema: userSchema,
 * });
 *
 * const user = parseUser(response);
 * ```
 */
export function createResponseParser<T>(
  config: ResponseParserConfig<T>
): (response: ApiResponse<unknown>) => T {
  return (response) => parseResponse<T>(response, config);
}

// =============================================================================
// ERROR NORMALIZATION
// =============================================================================

/**
 * Error normalization configuration
 */
export interface ErrorNormalizationConfig {
  /** Map custom error codes to categories */
  codeMapping?: Record<string, ErrorCategory>;
  /** Extract field errors from response */
  extractFieldErrors?: (response: unknown) => FieldError[] | undefined;
  /** Custom message generator */
  generateMessage?: (status: number, response: unknown) => string;
  /** Include response body in error */
  includeResponseBody?: boolean;
}

/**
 * Default error code to category mapping
 */
const DEFAULT_CODE_MAPPING: Record<string, ErrorCategory> = {
  UNAUTHENTICATED: 'authentication',
  UNAUTHORIZED: 'authorization',
  FORBIDDEN: 'authorization',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  VALIDATION_ERROR: 'validation',
  INVALID_INPUT: 'validation',
  RATE_LIMITED: 'rate_limit',
  TIMEOUT: 'timeout',
  INTERNAL_ERROR: 'server',
  SERVICE_UNAVAILABLE: 'server',
};

/**
 * Normalize various error formats into a consistent ApiError
 *
 * @param error - Error from API or network
 * @param config - Normalization configuration
 * @returns Normalized ApiError
 *
 * @example
 * ```typescript
 * try {
 *   await apiClient.get('/users');
 * } catch (error) {
 *   const normalizedError = normalizeError(error);
 *   console.log(normalizedError.category); // 'authentication', 'validation', etc.
 *   console.log(normalizedError.fieldErrors); // Field-level errors
 * }
 * ```
 */
export function normalizeError(
  error: unknown,
  config: ErrorNormalizationConfig = {}
): ApiError {
  // Already an ApiError
  if (isApiError(error)) {
    return error;
  }

  // Network error
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return createNetworkError(error.message, error);
  }

  // Abort error
  if (error instanceof DOMException && error.name === 'AbortError') {
    return createAbortError();
  }

  // HTTP error response
  if (isErrorResponse(error)) {
    return normalizeHttpError(error, config);
  }

  // Generic Error
  if (error instanceof Error) {
    return createUnknownError(error.message, error);
  }

  // String error
  if (typeof error === 'string') {
    return createUnknownError(error);
  }

  // Fallback
  return createUnknownError('An unexpected error occurred');
}

/**
 * Normalize HTTP error response
 */
function normalizeHttpError(
  error: { status: number; response?: unknown; message?: string },
  config: ErrorNormalizationConfig
): ApiError {
  const { status, response, message: errorMessage } = error;
  const category = getErrorCategory(status);
  const severity = getErrorSeverity(category);

  let message = errorMessage || `HTTP ${status}`;
  let code = `HTTP_${status}`;
  let fieldErrors: FieldError[] | undefined;

  // Parse response body
  if (response && typeof response === 'object') {
    const serverError = response as ServerErrorResponse;

    // Extract message
    if (serverError.message) {
      message = serverError.message;
    } else if (serverError.error) {
      message =
        typeof serverError.error === 'string'
          ? serverError.error
          : serverError.error.message || message;
    }

    // Extract code
    if (serverError.code) {
      code = serverError.code;
    } else if (
      serverError.error &&
      typeof serverError.error === 'object' &&
      serverError.error.code
    ) {
      code = serverError.error.code;
    }

    // Extract field errors
    if (config.extractFieldErrors) {
      fieldErrors = config.extractFieldErrors(response);
    } else if (serverError.errors && Array.isArray(serverError.errors)) {
      fieldErrors = serverError.errors.map((e) => ({
        field: e.field,
        message: e.message,
      }));
    }

    // Custom message generation
    if (config.generateMessage) {
      message = config.generateMessage(status, response);
    }
  }

  // Map code to category
  const codeMapping = { ...DEFAULT_CODE_MAPPING, ...config.codeMapping };
  const mappedCategory = codeMapping[code] || category;

  return createApiError({
    status,
    code,
    message,
    category: mappedCategory,
    severity,
    fieldErrors,
    response: config.includeResponseBody ? response : undefined,
    retryable: isRetryableStatus(status),
  });
}

/**
 * Get error category from HTTP status
 */
function getErrorCategory(status: number): ErrorCategory {
  if (status === 401) return 'authentication';
  if (status === 403) return 'authorization';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 422 || status === 400) return 'validation';
  if (status === 429) return 'rate_limit';
  if (status === 408) return 'timeout';
  if (status >= 500) return 'server';
  return 'unknown';
}

/**
 * Get error severity from category
 */
function getErrorSeverity(category: ErrorCategory): ErrorSeverity {
  switch (category) {
    case 'authentication':
    case 'authorization':
    case 'server':
      return 'error';
    case 'validation':
    case 'conflict':
    case 'not_found':
      return 'warning';
    case 'rate_limit':
    case 'timeout':
      return 'info';
    default:
      return 'error';
  }
}

/**
 * Check if status is retryable
 */
function isRetryableStatus(status: number): boolean {
  return [408, 429, 500, 502, 503, 504].includes(status);
}

/**
 * Type guard for API errors
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'name' in error &&
    (error as ApiError).name === 'ApiError'
  );
}

/**
 * Type guard for error responses
 */
function isErrorResponse(
  error: unknown
): error is { status: number; response?: unknown; message?: string } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
  );
}

/**
 * Create API error factory functions
 */
function createApiError(params: {
  status: number;
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  fieldErrors?: FieldError[];
  response?: unknown;
  cause?: Error;
  retryable: boolean;
}): ApiError {
  const error = new Error(params.message) as ApiError;
  error.name = 'ApiError';
  error.status = params.status;
  error.code = params.code;
  error.message = params.message;
  error.category = params.category;
  error.severity = params.severity;
  error.fieldErrors = params.fieldErrors;
  error.response = params.response;
  error.cause = params.cause;
  error.retryable = params.retryable;
  error.timestamp = Date.now();
  return error;
}

function createNetworkError(message: string, cause?: Error): ApiError {
  return createApiError({
    status: 0,
    code: 'NETWORK_ERROR',
    message: message || 'Network error occurred',
    category: 'network',
    severity: 'error',
    cause,
    retryable: true,
  });
}

function createAbortError(): ApiError {
  return createApiError({
    status: 0,
    code: 'ABORTED',
    message: 'Request was aborted',
    category: 'cancelled',
    severity: 'info',
    retryable: false,
  });
}

function createValidationError(message: string, cause?: unknown): ApiError {
  return createApiError({
    status: 422,
    code: 'VALIDATION_ERROR',
    message,
    category: 'validation',
    severity: 'warning',
    cause: cause instanceof Error ? cause : undefined,
    retryable: false,
  });
}

function createUnknownError(message: string, cause?: Error): ApiError {
  return createApiError({
    status: 0,
    code: 'UNKNOWN_ERROR',
    message,
    category: 'unknown',
    severity: 'error',
    cause,
    retryable: false,
  });
}

// =============================================================================
// CACHE HINTS
// =============================================================================

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
  const cacheControl = headers['cache-control'] || '';
  const etag = headers['etag'];
  const lastModified = headers['last-modified'];

  // Parse Cache-Control directives
  const directives = parseCacheControlHeader(cacheControl);

  const hints: CacheHints = {
    cacheable: !directives['no-store'] && !directives['no-cache'],
    maxAge: directives['max-age'] ? parseInt(directives['max-age'], 10) : undefined,
    staleWhileRevalidate: directives['stale-while-revalidate']
      ? parseInt(directives['stale-while-revalidate'], 10)
      : undefined,
    etag,
    lastModified: lastModified ? new Date(lastModified) : undefined,
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
    directives[key.toLowerCase()] = value || 'true';
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

// =============================================================================
// STREAMING RESPONSES
// =============================================================================

/**
 * Default stream options
 */
const DEFAULT_STREAM_OPTIONS: StreamOptions = {
  ndjson: false,
  sse: false,
  bufferSize: 1000,
  inactivityTimeout: 30000,
};

/**
 * Create a stream controller for handling streaming responses
 *
 * @typeParam T - Type of streamed data items
 * @param response - Response with readable body stream
 * @param options - Stream handling options
 * @returns Stream controller for subscribing to events
 *
 * @example
 * ```typescript
 * // NDJSON streaming
 * const stream = streamResponse<Message>(response, { ndjson: true });
 *
 * const unsubscribe = stream.subscribe((event) => {
 *   if (event.type === 'data') {
 *     console.log('Received:', event.data);
 *   }
 * });
 *
 * // Later: cleanup
 * unsubscribe();
 * stream.abort();
 * ```
 */
export function streamResponse<T>(
  response: Response | { body: ReadableStream<Uint8Array> | null },
  options: StreamOptions = {}
): StreamController<T> {
  const opts = { ...DEFAULT_STREAM_OPTIONS, ...options };
  const subscribers: Set<(event: StreamEvent<T>) => void> = new Set();
  const dataBuffer: T[] = [];
  let isActive = true;
  let abortController: AbortController | null = new AbortController();
  let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

  // Get the body stream
  const body = response.body;
  if (!body) {
    throw new Error('Response body is not a readable stream');
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // Emit event to all subscribers
  const emit = (event: StreamEvent<T>) => {
    for (const subscriber of subscribers) {
      subscriber(event);
    }
  };

  // Reset inactivity timer
  const resetInactivityTimer = () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    if (opts.inactivityTimeout && opts.inactivityTimeout > 0) {
      inactivityTimer = setTimeout(() => {
        emit({
          type: 'error',
          error: new Error('Stream inactivity timeout'),
          timestamp: Date.now(),
        });
        cleanup();
      }, opts.inactivityTimeout);
    }
  };

  // Parse incoming data
  const parseData = (text: string): void => {
    buffer += text;

    if (opts.sse) {
      // Parse Server-Sent Events
      parseSSE(buffer, (data, remainder) => {
        buffer = remainder;
        if (data) {
          addData(data as T);
        }
      });
    } else if (opts.ndjson) {
      // Parse NDJSON (newline-delimited JSON)
      parseNDJSON(buffer, (data, remainder) => {
        buffer = remainder;
        if (data) {
          addData(data as T);
        }
      });
    } else if (opts.parser) {
      // Custom parser
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          const data = opts.parser(line);
          if (data) {
            addData(data as T);
          }
        }
      }
    } else {
      // Raw text
      addData(text as unknown as T);
      buffer = '';
    }
  };

  // Add data to buffer and emit
  const addData = (data: T) => {
    // Limit buffer size
    if (opts.bufferSize && dataBuffer.length >= opts.bufferSize) {
      dataBuffer.shift();
    }
    dataBuffer.push(data);

    emit({
      type: 'data',
      data,
      timestamp: Date.now(),
    });

    resetInactivityTimer();
  };

  // Cleanup resources
  const cleanup = () => {
    isActive = false;
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }
    if (abortController) {
      abortController = null;
    }
  };

  // Start reading
  const read = async () => {
    try {
      resetInactivityTimer();

      while (isActive) {
        const { done, value } = await reader.read();

        if (done) {
          // Handle remaining buffer
          if (buffer.trim()) {
            parseData('');
          }

          emit({ type: 'end', timestamp: Date.now() });
          cleanup();
          break;
        }

        const text = decoder.decode(value, { stream: true });
        parseData(text);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        emit({ type: 'abort', timestamp: Date.now() });
      } else {
        emit({
          type: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
          timestamp: Date.now(),
        });
      }
      cleanup();
    }
  };

  // Start reading in background
  read();

  return {
    subscribe: (callback: (event: StreamEvent<T>) => void) => {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
    abort: () => {
      if (abortController) {
        reader.cancel();
        emit({ type: 'abort', timestamp: Date.now() });
        cleanup();
      }
    },
    isActive: () => isActive,
    getData: () => [...dataBuffer],
  };
}

/**
 * Parse Server-Sent Events format
 */
function parseSSE(
  buffer: string,
  callback: (data: unknown | null, remainder: string) => void
): void {
  const events = buffer.split('\n\n');
  const remainder = events.pop() || '';

  for (const event of events) {
    if (!event.trim()) continue;

    const lines = event.split('\n');
    let data = '';
    let eventType = 'message';

    for (const line of lines) {
      if (line.startsWith('data:')) {
        data += line.slice(5).trim();
      } else if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      }
    }

    if (data) {
      try {
        callback({ type: eventType, data: JSON.parse(data) }, '');
      } catch {
        callback({ type: eventType, data }, '');
      }
    }
  }

  callback(null, remainder);
}

/**
 * Parse NDJSON format
 */
function parseNDJSON(
  buffer: string,
  callback: (data: unknown | null, remainder: string) => void
): void {
  const lines = buffer.split('\n');
  const remainder = lines.pop() || '';

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const data = JSON.parse(line);
      callback(data, '');
    } catch {
      // Skip invalid JSON lines
      console.warn('[StreamResponse] Invalid JSON line:', line);
    }
  }

  callback(null, remainder);
}

// =============================================================================
// PAGINATION HELPERS
// =============================================================================

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
  response: ApiResponse<unknown>,
  config: PaginationConfig = {}
): PaginatedResponse<T> {
  const opts = { ...DEFAULT_PAGINATION_CONFIG, ...config };
  const data = response.data as Record<string, unknown>;

  // Extract items
  let items: T[] = [];
  if (Array.isArray(data)) {
    items = data as T[];
  } else if (data && opts.itemsField && opts.itemsField in data) {
    items = (data[opts.itemsField] as T[]) || [];
  }

  // Extract metadata from response body
  const total = getNestedValue<number>(data, opts.totalField) || items.length;
  const page = getNestedValue<number>(data, opts.pageField) || 1;
  const pageSize = getNestedValue<number>(data, opts.pageSizeField) || items.length;
  const nextCursor = getNestedValue<string>(data, opts.nextCursorField);
  const prevCursor = getNestedValue<string>(data, opts.prevCursorField);

  // Try headers if not found in body
  const headerTotal = opts.totalHeader ? response.headers[opts.totalHeader] : undefined;
  const finalTotal = total || (headerTotal ? parseInt(headerTotal, 10) : items.length);

  // Parse Link header for cursor info
  const linkHeader = opts.linkHeader ? response.headers[opts.linkHeader] : undefined;
  const links = linkHeader ? parseLinkHeader(linkHeader) : {};

  const totalPages = Math.ceil(finalTotal / pageSize);
  const hasMore = nextCursor ? true : page < totalPages;

  return {
    items,
    pagination: {
      total: finalTotal,
      page,
      pageSize,
      totalPages,
      hasMore,
      nextCursor: nextCursor || links.next,
      prevCursor: prevCursor || links.prev,
    },
  };
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue<T>(obj: unknown, path?: string): T | undefined {
  if (!path || !obj || typeof obj !== 'object') {
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
      const urlParams = new URLSearchParams(url.split('?')[1] || '');
      const cursor = urlParams.get('cursor') || urlParams.get('after') || url;
      links[rel] = cursor;
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
  const total = meta.total || items.length;
  const pageSize = meta.pageSize || items.length;
  const page = meta.page || 1;
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
      ...lastResponse.pagination,
      page: responses.length,
      pageSize: Math.ceil(items.length / responses.length),
    },
  };
}

// =============================================================================
// RESPONSE TRANSFORMERS
// =============================================================================

/**
 * Response transformer function type
 */
export type ResponseTransformer<TInput, TOutput> = (data: TInput) => TOutput;

/**
 * Create a transformation pipeline for responses
 *
 * @example
 * ```typescript
 * const pipeline = createTransformPipeline(
 *   (data: ApiUser[]) => data.map(normalizeUser),
 *   (users) => users.filter(u => u.active),
 *   (users) => users.sort((a, b) => a.name.localeCompare(b.name)),
 * );
 *
 * const users = pipeline(response.data);
 * ```
 */
export function createTransformPipeline<T>(): {
  pipe: <U>(fn: ResponseTransformer<T, U>) => ReturnType<typeof createTransformPipeline<U>>;
  execute: (data: T) => T;
};
export function createTransformPipeline<T, U>(
  fn: ResponseTransformer<T, U>
): {
  pipe: <V>(fn: ResponseTransformer<U, V>) => ReturnType<typeof createTransformPipeline<U, V>>;
  execute: (data: T) => U;
};
export function createTransformPipeline<T, U>(
  fn?: ResponseTransformer<T, U>
): {
  pipe: <V>(nextFn: ResponseTransformer<U, V>) => ReturnType<typeof createTransformPipeline<U, V>>;
  execute: (data: T) => U;
} {
  const transform = fn || ((data: T) => data as unknown as U);

  return {
    pipe: <V>(nextFn: ResponseTransformer<U, V>) => {
      const combined = (data: T) => nextFn(transform(data));
      return createTransformPipeline(combined) as unknown as ReturnType<typeof createTransformPipeline<U, V>>;
    },
    execute: (data: T) => transform(data),
  };
}

/**
 * Common transformers
 */
export const transformers = {
  /**
   * Normalize dates in response (ISO string to Date)
   */
  normalizeDates: <T extends Record<string, unknown>>(
    fields: string[]
  ): ResponseTransformer<T, T> => {
    return (data: T) => {
      const result = { ...data };
      for (const field of fields) {
        if (field in result && typeof result[field] === 'string') {
          result[field] = new Date(result[field] as string) as T[string & keyof T];
        }
      }
      return result;
    };
  },

  /**
   * Rename fields in response
   */
  renameFields: <T extends Record<string, unknown>>(
    mapping: Record<string, string>
  ): ResponseTransformer<T, T> => {
    return (data: T) => {
      const result = { ...data };
      for (const [from, to] of Object.entries(mapping)) {
        if (from in result) {
          result[to as keyof T] = result[from as keyof T];
          delete result[from as keyof T];
        }
      }
      return result;
    };
  },

  /**
   * Pick specific fields from response
   */
  pickFields: <T extends Record<string, unknown>, K extends keyof T>(
    fields: K[]
  ): ResponseTransformer<T, Pick<T, K>> => {
    return (data: T) => {
      const result = {} as Pick<T, K>;
      for (const field of fields) {
        if (field in data) {
          result[field] = data[field];
        }
      }
      return result;
    };
  },

  /**
   * Omit specific fields from response
   */
  omitFields: <T extends Record<string, unknown>, K extends keyof T>(
    fields: K[]
  ): ResponseTransformer<T, Omit<T, K>> => {
    return (data: T) => {
      const result = { ...data };
      for (const field of fields) {
        delete result[field];
      }
      return result as Omit<T, K>;
    };
  },

  /**
   * Apply default values to missing fields
   */
  withDefaults: <T extends Record<string, unknown>>(
    defaults: Partial<T>
  ): ResponseTransformer<T, T> => {
    return (data: T) => ({ ...defaults, ...data });
  },
};
