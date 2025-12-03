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

import type { ApiResponse, ApiError } from './types';

// Re-export extracted utilities
export { normalizeError, isApiError, type ErrorNormalizationConfig } from './error-normalizer';

export {
  extractCacheHints,
  buildCacheInfo,
  generateCacheControl,
  type CacheHints,
} from './cache-hints';

export { streamResponse } from './stream-handler';

export {
  extractPagination,
  createPaginatedResponse,
  mergePaginatedResponses,
  type PaginationConfig,
} from './pagination-helpers';

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
export function parseResponse<T>(response: ApiResponse, config: ResponseParserConfig<T> = {}): T {
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
          config.validationErrorMessage ??
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
): (response: ApiResponse) => T {
  return (response) => parseResponse<T>(response, config);
}

/**
 * Create validation error helper
 */
function createValidationError(message: string, cause?: unknown): ApiError {
  const error = new Error(message) as ApiError;
  error.name = 'ApiError';
  error.status = 422;
  error.code = 'VALIDATION_ERROR';
  error.message = message;
  error.category = 'validation';
  error.severity = 'warning';
  error.cause = cause instanceof Error ? cause : undefined;
  error.retryable = false;
  error.timestamp = Date.now();
  return error;
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
export function createTransformPipeline<T, U = T>(
  fn?: ResponseTransformer<T, U>
): {
  pipe: <V>(nextFn: ResponseTransformer<U, V>) => {
    pipe: <W>(
      nextFn: ResponseTransformer<V, W>
    ) => ReturnType<typeof createTransformPipeline<T, W>>;
    execute: (data: T) => V;
  };
  execute: (data: T) => U;
} {
  const transform = fn ?? ((data: T) => data as unknown as U);

  return {
    pipe: <V>(nextFn: ResponseTransformer<U, V>) => {
      const combined = (data: T): V => nextFn(transform(data));
      return createTransformPipeline(combined);
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
      const result: Record<string, unknown> = { ...data };
      for (const field of fields) {
        if (field in result && typeof result[field] === 'string') {
          result[field] = new Date(result[field]);
        }
      }
      return result as T;
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
