/**
 * Response Normalizer
 *
 * Normalizes diverse API responses into consistent formats.
 * Handles different API conventions, pagination styles, and error formats.
 *
 * @module api/advanced/response-normalizer
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Normalized response structure.
 */
export interface NormalizedResponse<T = unknown> {
  /** Response data */
  data: T;
  /** Pagination information */
  pagination?: NormalizedPagination;
  /** Response metadata */
  meta?: Record<string, unknown>;
  /** Links for HATEOAS */
  links?: NormalizedLinks;
  /** Included/embedded resources */
  included?: Record<string, unknown[]>;
}

/**
 * Normalized pagination structure.
 */
export interface NormalizedPagination {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Items per page */
  pageSize: number;
  /** Total number of items */
  totalItems: number;
  /** Whether there's a next page */
  hasNextPage: boolean;
  /** Whether there's a previous page */
  hasPrevPage: boolean;
  /** Cursor for cursor-based pagination */
  cursor?: string;
  /** Next cursor */
  nextCursor?: string;
  /** Previous cursor */
  prevCursor?: string;
}

/**
 * Normalized links structure.
 */
export interface NormalizedLinks {
  /** Link to self */
  self?: string;
  /** Link to first page */
  first?: string;
  /** Link to last page */
  last?: string;
  /** Link to next page */
  next?: string;
  /** Link to previous page */
  prev?: string;
  /** Additional links */
  [key: string]: string | undefined;
}

/**
 * Normalized error structure.
 */
export interface NormalizedError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Field that caused the error */
  field?: string;
  /** Detailed error description */
  details?: string;
  /** HTTP status code */
  status?: number;
  /** Additional error context */
  context?: Record<string, unknown>;
}

/**
 * Response format configuration.
 */
export interface ResponseFormatConfig {
  /** Path to data in response */
  dataPath?: string | string[];
  /** Path to pagination info */
  paginationPath?: string;
  /** Path to meta info */
  metaPath?: string;
  /** Path to links */
  linksPath?: string;
  /** Path to included resources */
  includedPath?: string;
  /** Pagination field mapping */
  paginationMapping?: {
    currentPage?: string;
    totalPages?: string;
    pageSize?: string;
    totalItems?: string;
    hasNext?: string;
    hasPrev?: string;
    cursor?: string;
    nextCursor?: string;
    prevCursor?: string;
  };
  /** Error field mapping */
  errorMapping?: {
    code?: string;
    message?: string;
    field?: string;
    details?: string;
  };
}

/**
 * Predefined API response formats.
 */
export type ResponseFormat =
  | 'standard'
  | 'json-api'
  | 'hal'
  | 'spring'
  | 'laravel'
  | 'django'
  | 'graphql'
  | 'custom';

// =============================================================================
// Format Configurations
// =============================================================================

/**
 * Standard format configuration.
 */
const STANDARD_FORMAT: ResponseFormatConfig = {
  dataPath: 'data',
  paginationPath: 'pagination',
  metaPath: 'meta',
  linksPath: 'links',
  paginationMapping: {
    currentPage: 'page',
    totalPages: 'totalPages',
    pageSize: 'pageSize',
    totalItems: 'total',
    hasNext: 'hasNext',
    hasPrev: 'hasPrev',
  },
};

/**
 * JSON:API format configuration.
 */
const JSON_API_FORMAT: ResponseFormatConfig = {
  dataPath: 'data',
  paginationPath: 'meta',
  metaPath: 'meta',
  linksPath: 'links',
  includedPath: 'included',
  paginationMapping: {
    currentPage: 'meta.page.number',
    totalPages: 'meta.page.totalPages',
    pageSize: 'meta.page.size',
    totalItems: 'meta.page.totalElements',
  },
};

/**
 * HAL format configuration.
 */
const HAL_FORMAT: ResponseFormatConfig = {
  dataPath: '_embedded',
  linksPath: '_links',
  metaPath: 'page',
  paginationMapping: {
    currentPage: 'page.number',
    totalPages: 'page.totalPages',
    pageSize: 'page.size',
    totalItems: 'page.totalElements',
  },
};

/**
 * Spring Data format configuration.
 */
const SPRING_FORMAT: ResponseFormatConfig = {
  dataPath: 'content',
  paginationPath: '',
  paginationMapping: {
    currentPage: 'number',
    totalPages: 'totalPages',
    pageSize: 'size',
    totalItems: 'totalElements',
    hasNext: 'last',
    hasPrev: 'first',
  },
};

/**
 * Laravel format configuration.
 */
const LARAVEL_FORMAT: ResponseFormatConfig = {
  dataPath: 'data',
  paginationPath: '',
  linksPath: 'links',
  metaPath: 'meta',
  paginationMapping: {
    currentPage: 'current_page',
    totalPages: 'last_page',
    pageSize: 'per_page',
    totalItems: 'total',
  },
};

/**
 * Django REST Framework format configuration.
 */
const DJANGO_FORMAT: ResponseFormatConfig = {
  dataPath: 'results',
  paginationPath: '',
  paginationMapping: {
    totalItems: 'count',
    nextCursor: 'next',
    prevCursor: 'previous',
  },
};

/**
 * GraphQL format configuration.
 */
const GRAPHQL_FORMAT: ResponseFormatConfig = {
  dataPath: 'data',
  errorMapping: {
    code: 'extensions.code',
    message: 'message',
    field: 'path',
  },
};

const FORMAT_CONFIGS: Record<ResponseFormat, ResponseFormatConfig> = {
  standard: STANDARD_FORMAT,
  'json-api': JSON_API_FORMAT,
  hal: HAL_FORMAT,
  spring: SPRING_FORMAT,
  laravel: LARAVEL_FORMAT,
  django: DJANGO_FORMAT,
  graphql: GRAPHQL_FORMAT,
  custom: {},
};

// =============================================================================
// Response Normalizer Class
// =============================================================================

/**
 * Response Normalizer for consistent API responses.
 *
 * @example
 * ```typescript
 * const normalizer = new ResponseNormalizer('json-api');
 *
 * // Normalize a JSON:API response
 * const normalized = normalizer.normalize(response);
 * console.log(normalized.data);
 * console.log(normalized.pagination);
 *
 * // Normalize errors
 * const errors = normalizer.normalizeErrors(errorResponse);
 * ```
 */
export class ResponseNormalizer {
  private config: ResponseFormatConfig;

  /**
   * Create a new response normalizer.
   *
   * @param format - Response format or custom config
   */
  constructor(format: ResponseFormat | ResponseFormatConfig = 'standard') {
    if (typeof format === 'string') {
      this.config = FORMAT_CONFIGS[format];
    } else {
      this.config = format;
    }
  }

  // ===========================================================================
  // Normalization Methods
  // ===========================================================================

  /**
   * Normalize a response to standard format.
   *
   * @param response - Raw API response
   * @returns Normalized response
   */
  normalize<T = unknown>(response: unknown): NormalizedResponse<T> {
    const data = this.extractData<T>(response);
    const pagination = this.extractPagination(response);
    const meta = this.extractMeta(response);
    const links = this.extractLinks(response);
    const included = this.extractIncluded(response);

    return {
      data,
      ...(pagination && { pagination }),
      ...(meta && { meta }),
      ...(links && { links }),
      ...(included && { included }),
    };
  }

  /**
   * Normalize error response.
   *
   * @param response - Error response
   * @returns Normalized errors
   */
  normalizeErrors(response: unknown): NormalizedError[] {
    const errors: NormalizedError[] = [];

    // Handle array of errors
    if (Array.isArray(response)) {
      return response.map(err => this.normalizeError(err));
    }

    // Handle single error
    if (this.isErrorObject(response)) {
      return [this.normalizeError(response)];
    }

    // Handle nested errors
    const errorsPath = ['errors', 'error', 'message'];
    for (const path of errorsPath) {
      const extracted = this.getNestedValue(response, path);
      if (extracted) {
        if (Array.isArray(extracted)) {
          return extracted.map(err => this.normalizeError(err));
        }
        return [this.normalizeError(extracted)];
      }
    }

    // Fallback to generic error
    return [
      {
        code: 'UNKNOWN_ERROR',
        message: String(response),
      },
    ];
  }

  /**
   * Normalize a single error.
   */
  private normalizeError(error: unknown): NormalizedError {
    if (typeof error === 'string') {
      return { code: 'ERROR', message: error };
    }

    if (!this.isObject(error)) {
      return { code: 'ERROR', message: String(error) };
    }

    const mapping = this.config.errorMapping ?? {};

    return {
      code:
        this.getNestedValue(error, mapping.code ?? 'code') ??
        this.getNestedValue(error, 'status') ??
        'ERROR',
      message:
        this.getNestedValue(error, mapping.message ?? 'message') ??
        this.getNestedValue(error, 'error') ??
        'Unknown error',
      field: this.getNestedValue(error, mapping.field ?? 'field'),
      details: this.getNestedValue(error, mapping.details ?? 'details'),
      status: this.getNestedValue(error, 'status'),
      context: this.extractErrorContext(error),
    };
  }

  // ===========================================================================
  // Extraction Methods
  // ===========================================================================

  /**
   * Extract data from response.
   */
  private extractData<T>(response: unknown): T {
    const paths = this.config.dataPath;

    if (!paths) {
      return response as T;
    }

    const pathArray = Array.isArray(paths) ? paths : [paths];

    for (const path of pathArray) {
      const data = this.getNestedValue(response, path);
      if (data !== undefined) {
        return data as T;
      }
    }

    return response as T;
  }

  /**
   * Extract pagination from response.
   */
  private extractPagination(response: unknown): NormalizedPagination | undefined {
    const mapping = this.config.paginationMapping;
    if (!mapping) return undefined;

    const paginationSource = this.config.paginationPath
      ? this.getNestedValue(response, this.config.paginationPath) ?? response
      : response;

    const currentPage = this.getNestedValue(
      paginationSource,
      mapping.currentPage ?? 'currentPage'
    );
    const totalItems = this.getNestedValue(
      paginationSource,
      mapping.totalItems ?? 'total'
    );

    // If no pagination info found, return undefined
    if (currentPage === undefined && totalItems === undefined) {
      return undefined;
    }

    const pageSize =
      this.getNestedValue(paginationSource, mapping.pageSize ?? 'pageSize') ?? 20;
    const totalPages =
      this.getNestedValue(paginationSource, mapping.totalPages ?? 'totalPages') ??
      (totalItems ? Math.ceil(totalItems / pageSize) : 1);

    let hasNextPage: boolean;
    let hasPrevPage: boolean;

    if (mapping.hasNext) {
      const hasNextValue = this.getNestedValue(paginationSource, mapping.hasNext);
      // Handle Spring's 'last' field (inverted)
      hasNextPage = mapping.hasNext === 'last' ? !hasNextValue : !!hasNextValue;
    } else {
      hasNextPage = (currentPage ?? 1) < totalPages;
    }

    if (mapping.hasPrev) {
      const hasPrevValue = this.getNestedValue(paginationSource, mapping.hasPrev);
      // Handle Spring's 'first' field (inverted)
      hasPrevPage = mapping.hasPrev === 'first' ? !hasPrevValue : !!hasPrevValue;
    } else {
      hasPrevPage = (currentPage ?? 1) > 1;
    }

    return {
      currentPage: currentPage ?? 1,
      totalPages: totalPages ?? 1,
      pageSize: pageSize ?? 20,
      totalItems: totalItems ?? 0,
      hasNextPage,
      hasPrevPage,
      cursor: this.getNestedValue(paginationSource, mapping.cursor ?? 'cursor'),
      nextCursor: this.getNestedValue(
        paginationSource,
        mapping.nextCursor ?? 'nextCursor'
      ),
      prevCursor: this.getNestedValue(
        paginationSource,
        mapping.prevCursor ?? 'prevCursor'
      ),
    };
  }

  /**
   * Extract meta information from response.
   */
  private extractMeta(response: unknown): Record<string, unknown> | undefined {
    if (!this.config.metaPath) return undefined;

    const meta = this.getNestedValue(response, this.config.metaPath);

    if (meta && this.isObject(meta)) {
      // Filter out pagination fields that are handled separately
      const { page, number, size, totalElements, totalPages, ...rest } = meta as Record<
        string,
        unknown
      >;
      return Object.keys(rest).length > 0 ? rest : undefined;
    }

    return undefined;
  }

  /**
   * Extract links from response.
   */
  private extractLinks(response: unknown): NormalizedLinks | undefined {
    if (!this.config.linksPath) return undefined;

    const links = this.getNestedValue(response, this.config.linksPath);

    if (!links || !this.isObject(links)) return undefined;

    // Normalize HAL links
    const normalizedLinks: NormalizedLinks = {};

    for (const [key, value] of Object.entries(links)) {
      if (typeof value === 'string') {
        normalizedLinks[key] = value;
      } else if (this.isObject(value) && 'href' in value) {
        normalizedLinks[key] = (value as { href: string }).href;
      }
    }

    return Object.keys(normalizedLinks).length > 0 ? normalizedLinks : undefined;
  }

  /**
   * Extract included/embedded resources.
   */
  private extractIncluded(
    response: unknown
  ): Record<string, unknown[]> | undefined {
    if (!this.config.includedPath) return undefined;

    const included = this.getNestedValue(response, this.config.includedPath);

    if (!included) return undefined;

    // Handle JSON:API included format (array of resources)
    if (Array.isArray(included)) {
      const grouped: Record<string, unknown[]> = {};

      for (const item of included) {
        if (this.isObject(item) && 'type' in item) {
          const type = (item as { type: string }).type;
          if (!grouped[type]) grouped[type] = [];
          grouped[type].push(item);
        }
      }

      return Object.keys(grouped).length > 0 ? grouped : undefined;
    }

    // Handle HAL _embedded format (object with arrays)
    if (this.isObject(included)) {
      return included as Record<string, unknown[]>;
    }

    return undefined;
  }

  /**
   * Extract additional context from error.
   */
  private extractErrorContext(error: Record<string, unknown>): Record<string, unknown> | undefined {
    const contextFields = [
      'extensions',
      'context',
      'metadata',
      'trace',
      'stack',
    ];
    const context: Record<string, unknown> = {};

    for (const field of contextFields) {
      const value = error[field];
      if (value !== undefined) {
        context[field] = value;
      }
    }

    return Object.keys(context).length > 0 ? context : undefined;
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Get nested value from object using dot notation.
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    if (!path || !this.isObject(obj)) return undefined;

    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
      if (!this.isObject(current)) return undefined;
      current = (current as Record<string, unknown>)[key];
    }

    return current;
  }

  /**
   * Check if value is a plain object.
   */
  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  /**
   * Check if value is an error object.
   */
  private isErrorObject(value: unknown): boolean {
    if (!this.isObject(value)) return false;
    return 'message' in value || 'error' in value || 'code' in value;
  }

  /**
   * Update configuration.
   */
  setConfig(config: Partial<ResponseFormatConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration.
   */
  getConfig(): ResponseFormatConfig {
    return { ...this.config };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new response normalizer.
 *
 * @param format - Response format or custom config
 * @returns ResponseNormalizer instance
 */
export function createResponseNormalizer(
  format: ResponseFormat | ResponseFormatConfig = 'standard'
): ResponseNormalizer {
  return new ResponseNormalizer(format);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Quick normalize function for one-off use.
 */
export function normalizeResponse<T = unknown>(
  response: unknown,
  format: ResponseFormat = 'standard'
): NormalizedResponse<T> {
  const normalizer = new ResponseNormalizer(format);
  return normalizer.normalize<T>(response);
}

/**
 * Quick normalize errors function.
 */
export function normalizeErrors(
  response: unknown,
  format: ResponseFormat = 'standard'
): NormalizedError[] {
  const normalizer = new ResponseNormalizer(format);
  return normalizer.normalizeErrors(response);
}
