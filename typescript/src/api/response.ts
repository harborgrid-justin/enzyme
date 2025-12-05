/**
 * API Response Type Utilities and Transformers
 *
 * @module @missionfabric-js/enzyme-typescript/api/response
 * @description Type-safe response handling and transformation utilities
 *
 * @example
 * ```typescript
 * import { ApiResponse, parseResponse, transformResponse } from '@missionfabric-js/enzyme-typescript/api';
 *
 * const response = await fetch('/api/users');
 * const result = await parseResponse<User[]>(response);
 *
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */

import { ApiError } from './error';

/**
 * Successful API response
 */
export interface ApiResponseSuccess<T> {
  /** Success flag */
  success: true;
  /** Response data */
  data: T;
  /** Response metadata */
  meta?: ResponseMetadata;
}

/**
 * Failed API response
 */
export interface ApiResponseError {
  /** Success flag */
  success: false;
  /** Error details */
  error: ApiError;
  /** Response metadata */
  meta?: ResponseMetadata;
}

/**
 * API response type (discriminated union)
 */
export type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseError;

/**
 * Response metadata
 */
export interface ResponseMetadata {
  /** HTTP status code */
  status: number;
  /** HTTP status text */
  statusText: string;
  /** Response headers */
  headers: Record<string, string>;
  /** Response URL */
  url: string;
  /** Request duration in milliseconds */
  duration?: number;
  /** Cache status */
  cached?: boolean;
  /** Request timestamp */
  timestamp: Date;
}

/**
 * Response transformer function
 */
export type ResponseTransformer<T, R = T> = (data: T, meta?: ResponseMetadata) => R | Promise<R>;

/**
 * Response parser options
 */
export interface ResponseParserOptions<T> {
  /** Expected response type */
  type?: 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData';
  /** Transform response data */
  transform?: ResponseTransformer<unknown, T>;
  /** Validate response data */
  validate?: (data: unknown) => data is T;
  /** Include metadata in response */
  includeMetadata?: boolean;
  /** Request start time for duration calculation */
  startTime?: number;
}

/**
 * Parse fetch Response into ApiResponse
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/users');
 * const result = await parseResponse<User[]>(response, {
 *   validate: (data): data is User[] => Array.isArray(data)
 * });
 * ```
 */
export async function parseResponse<T = unknown>(
  response: Response,
  options: ResponseParserOptions<T> = {}
): Promise<ApiResponse<T>> {
  const {
    type = 'json',
    transform,
    validate,
    includeMetadata = false,
    startTime,
  } = options;

  // Extract metadata
  const meta = includeMetadata ? extractMetadata(response, startTime) : undefined;

  // Handle error responses
  if (!response.ok) {
    const error = await ApiError.fromResponse(response);
    return { success: false, error, meta };
  }

  try {
    // Parse response body
    let data: unknown;

    switch (type) {
      case 'json':
        data = await response.json();
        break;
      case 'text':
        data = await response.text();
        break;
      case 'blob':
        data = await response.blob();
        break;
      case 'arrayBuffer':
        data = await response.arrayBuffer();
        break;
      case 'formData':
        data = await response.formData();
        break;
      default:
        data = await response.json();
    }

    // Validate data
    if (validate && !validate(data)) {
      const error = new ApiError('Response validation failed', {
        status: response.status,
        statusText: response.statusText,
        category: 'VALIDATION' as any,
        url: response.url,
        data,
      });
      return { success: false, error, meta };
    }

    // Transform data
    const transformedData = transform ? await transform(data, meta) : (data as T);

    return { success: true, data: transformedData, meta };
  } catch (error) {
    const apiError = new ApiError('Failed to parse response', {
      status: response.status,
      statusText: response.statusText,
      category: 'CLIENT' as any,
      url: response.url,
      cause: error instanceof Error ? error : undefined,
    });
    return { success: false, error: apiError, meta };
  }
}

/**
 * Extract response metadata
 */
function extractMetadata(response: Response, startTime?: number): ResponseMetadata {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    status: response.status,
    statusText: response.statusText,
    headers,
    url: response.url,
    duration: startTime ? Date.now() - startTime : undefined,
    timestamp: new Date(),
  };
}

/**
 * Type guard for successful response
 *
 * @example
 * ```typescript
 * const result = await parseResponse(response);
 * if (isSuccessResponse(result)) {
 *   console.log(result.data);
 * }
 * ```
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiResponseSuccess<T> {
  return response.success === true;
}

/**
 * Type guard for error response
 */
export function isErrorResponse<T>(
  response: ApiResponse<T>
): response is ApiResponseError {
  return response.success === false;
}

/**
 * Unwrap response data or throw error
 *
 * @example
 * ```typescript
 * const result = await parseResponse(response);
 * const data = unwrapResponse(result); // throws if error
 * ```
 */
export function unwrapResponse<T>(response: ApiResponse<T>): T {
  if (response.success) {
    return response.data;
  }
  throw response.error;
}

/**
 * Common response transformers
 */
export const transformers = {
  /**
   * Transform dates from ISO strings to Date objects
   */
  parseDates: <T extends Record<string, unknown>>(
    data: T,
    dateFields: string[]
  ): T => {
    const result = { ...data };
    for (const field of dateFields) {
      const value = result[field];
      if (typeof value === 'string') {
        result[field] = new Date(value) as any;
      }
    }
    return result;
  },

  /**
   * Transform snake_case to camelCase
   */
  toCamelCase: <T extends Record<string, unknown>>(data: T): T => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = value;
    }
    return result as T;
  },

  /**
   * Transform camelCase to snake_case
   */
  toSnakeCase: <T extends Record<string, unknown>>(data: T): T => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      result[snakeKey] = value;
    }
    return result as T;
  },

  /**
   * Extract nested data field
   */
  extractData: <T>(field: string = 'data') => {
    return (response: Record<string, unknown>): T => {
      return response[field] as T;
    };
  },

  /**
   * Compose multiple transformers
   */
  compose: <T>(...transformers: ResponseTransformer<any, any>[]): ResponseTransformer<T, any> => {
    return async (data: T, meta?: ResponseMetadata) => {
      let result = data;
      for (const transformer of transformers) {
        result = await transformer(result, meta);
      }
      return result;
    };
  },
};

/**
 * Standard API response envelope
 */
export interface ApiEnvelope<T> {
  /** Response data */
  data: T;
  /** Success indicator */
  success?: boolean;
  /** Error message */
  error?: string;
  /** Response message */
  message?: string;
  /** Response metadata */
  meta?: Record<string, unknown>;
}

/**
 * Parse enveloped API response
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/users');
 * const result = await parseEnvelopedResponse<User[]>(response);
 * ```
 */
export async function parseEnvelopedResponse<T>(
  response: Response,
  options: Omit<ResponseParserOptions<ApiEnvelope<T>>, 'transform'> = {}
): Promise<ApiResponse<T>> {
  const result = await parseResponse<ApiEnvelope<T>>(response, options);

  if (!result.success) {
    return result;
  }

  const envelope = result.data;

  // Check envelope success flag
  if (envelope.success === false || envelope.error) {
    const error = new ApiError(envelope.error || 'Request failed', {
      status: response.status,
      statusText: response.statusText,
      category: 'CLIENT' as any,
      url: response.url,
      data: envelope,
    });
    return { success: false, error, meta: result.meta };
  }

  return { success: true, data: envelope.data, meta: result.meta };
}

/**
 * Response validator builder
 */
export class ResponseValidator<T> {
  private validators: Array<(data: unknown) => boolean> = [];
  private errorMessages: string[] = [];

  /**
   * Require field to exist
   */
  requireField(field: string): this {
    this.validators.push((data: unknown) => {
      return typeof data === 'object' && data !== null && field in data;
    });
    this.errorMessages.push(`Missing required field: ${field}`);
    return this;
  }

  /**
   * Require field to be of type
   */
  requireType(field: string, type: string): this {
    this.validators.push((data: unknown) => {
      if (typeof data !== 'object' || data === null) return false;
      const value = (data as Record<string, unknown>)[field];
      return typeof value === type;
    });
    this.errorMessages.push(`Field ${field} must be of type ${type}`);
    return this;
  }

  /**
   * Require array
   */
  requireArray(field?: string): this {
    this.validators.push((data: unknown) => {
      const target = field && typeof data === 'object' && data !== null
        ? (data as Record<string, unknown>)[field]
        : data;
      return Array.isArray(target);
    });
    this.errorMessages.push(field ? `Field ${field} must be an array` : 'Data must be an array');
    return this;
  }

  /**
   * Custom validator
   */
  custom(validator: (data: unknown) => boolean, errorMessage: string): this {
    this.validators.push(validator);
    this.errorMessages.push(errorMessage);
    return this;
  }

  /**
   * Build validator function
   */
  build(): (data: unknown) => data is T {
    return (data: unknown): data is T => {
      return this.validators.every((validator) => validator(data));
    };
  }

  /**
   * Validate and throw on error
   */
  validate(data: unknown): asserts data is T {
    for (let i = 0; i < this.validators.length; i++) {
      if (!this.validators[i](data)) {
        throw new Error(this.errorMessages[i]);
      }
    }
  }
}

/**
 * Create response validator
 *
 * @example
 * ```typescript
 * const validator = createValidator<User>()
 *   .requireField('id')
 *   .requireField('email')
 *   .requireType('id', 'number')
 *   .requireType('email', 'string')
 *   .build();
 *
 * const result = await parseResponse(response, { validate: validator });
 * ```
 */
export function createValidator<T>(): ResponseValidator<T> {
  return new ResponseValidator<T>();
}

/**
 * Batch response type
 */
export interface BatchResponse<T> {
  /** Successful responses */
  successful: Array<{ index: number; data: T }>;
  /** Failed responses */
  failed: Array<{ index: number; error: ApiError }>;
  /** Total count */
  total: number;
  /** Success count */
  successCount: number;
  /** Failure count */
  failureCount: number;
}

/**
 * Parse multiple responses
 *
 * @example
 * ```typescript
 * const responses = await Promise.allSettled(requests);
 * const batch = parseBatchResponses(responses);
 * console.log(`${batch.successCount}/${batch.total} succeeded`);
 * ```
 */
export function parseBatchResponses<T>(
  results: Array<ApiResponse<T>>
): BatchResponse<T> {
  const successful: Array<{ index: number; data: T }> = [];
  const failed: Array<{ index: number; error: ApiError }> = [];

  results.forEach((result, index) => {
    if (result.success) {
      successful.push({ index, data: result.data });
    } else {
      failed.push({ index, error: result.error });
    }
  });

  return {
    successful,
    failed,
    total: results.length,
    successCount: successful.length,
    failureCount: failed.length,
  };
}
