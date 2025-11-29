/**
 * @file API Versioning
 * @description Comprehensive API versioning with multiple strategies,
 * version negotiation, deprecation warnings, transformers, and migration support.
 * Designed for seamless API evolution in microservices.
 *
 * **MIGRATION NOTICE**: This module is transitioning from `httpClient` to `apiClient`
 * from `@/lib/api`. The `httpClient` import is maintained for backward compatibility
 * but new code should use `apiClient` directly.
 *
 * @see {@link @/lib/api} for the recommended API client
 */

/**
 * @deprecated Use `apiClient` from `@/lib/api` instead.
 * This import is maintained for backward compatibility with existing versioning code.
 */
import { type HttpRequestConfig } from './http';
import { apiClient } from '@/lib/api';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * API version format
 */
export type ApiVersion = `v${number}` | `v${number}.${number}` | `v${number}.${number}.${number}`;

/**
 * Versioning strategies
 */
export enum VersioningStrategy {
  /** URL path versioning: /v1/users */
  URL_PATH = 'url-path',
  /** Accept header versioning: Accept: application/vnd.api+json; version=1 */
  ACCEPT_HEADER = 'accept-header',
  /** Query parameter: /users?version=1 */
  QUERY_PARAM = 'query-param',
  /** Custom header: X-API-Version: 1 */
  CUSTOM_HEADER = 'custom-header',
  /** Media type versioning: application/vnd.api.v1+json */
  MEDIA_TYPE = 'media-type',
}

/**
 * Version deprecation info
 */
export interface VersionDeprecation {
  /** Sunset date (ISO 8601) */
  sunsetDate: string;
  /** Migration guide URL */
  migrationGuide?: string;
  /** Replacement version */
  replacementVersion?: ApiVersion;
  /** Additional warning message */
  message?: string;
}

/**
 * Version transformer for request/response adaptation
 */
export interface VersionTransformer {
  /** Transform request to target version format */
  transformRequest?: (config: HttpRequestConfig) => HttpRequestConfig;
  /** Transform response from target version format */
  transformResponse?: <T>(data: T, originalVersion: ApiVersion) => T;
  /** Map endpoint paths for version differences */
  mapEndpoint?: (path: string) => string;
  /** Transform request body */
  transformBody?: (body: unknown) => unknown;
  /** Transform response data shape */
  transformData?: <T>(data: T) => T;
}

/**
 * Version configuration
 */
export interface VersionConfig {
  /** Current/default version */
  current: ApiVersion;
  /** Minimum supported version */
  minimum: ApiVersion;
  /** Deprecated versions with sunset info */
  deprecated: Map<ApiVersion, VersionDeprecation>;
  /** Version-specific transformers */
  transformers: Map<ApiVersion, VersionTransformer>;
  /** Supported versions */
  supported: ApiVersion[];
}

/**
 * Version negotiation result
 */
export interface VersionNegotiationResult {
  /** Requested version */
  requestedVersion: ApiVersion;
  /** Actually negotiated version */
  negotiatedVersion: ApiVersion;
  /** Whether version is deprecated */
  isDeprecated: boolean;
  /** Deprecation info if applicable */
  deprecation?: VersionDeprecation | undefined;
  /** Whether version is supported */
  isSupported: boolean;
}

/**
 * Versioned API client configuration
 */
export interface VersionedApiClientConfig {
  /** Base URL for API */
  baseUrl: string;
  /** Versioning strategy */
  strategy: VersioningStrategy;
  /** Version configuration */
  versionConfig: VersionConfig;
  /** Custom header name for CUSTOM_HEADER strategy */
  headerName?: string;
  /** Media type template for MEDIA_TYPE strategy */
  mediaTypeTemplate?: string;
  /** Callback for deprecation warnings */
  onDeprecationWarning?: (info: VersionNegotiationResult) => void;
  /** Callback for version mismatch */
  onVersionMismatch?: (requested: ApiVersion, actual: ApiVersion) => void;
  /** Callback for unsupported version */
  onUnsupportedVersion?: (version: ApiVersion, minimum: ApiVersion) => void;
  /** Default request timeout */
  timeout?: number;
  /** Default headers */
  defaultHeaders?: Record<string, string>;
}

// =============================================================================
// ERRORS
// =============================================================================

/**
 * Version not supported error
 */
export class VersionNotSupportedError extends Error {
  readonly isVersionError = true;
  readonly requestedVersion: ApiVersion;
  readonly minimumVersion: ApiVersion;
  readonly supportedVersions: ApiVersion[];

  constructor(requested: ApiVersion, minimum: ApiVersion, supported: ApiVersion[]) {
    super(`API version ${requested} is not supported. Minimum: ${minimum}, Supported: ${supported.join(', ')}`);
    this.name = 'VersionNotSupportedError';
    this.requestedVersion = requested;
    this.minimumVersion = minimum;
    this.supportedVersions = supported;
  }
}

/**
 * Version deprecated error (when using sunset version)
 */
export class VersionDeprecatedError extends Error {
  readonly isVersionError = true;
  readonly version: ApiVersion;
  readonly deprecation: VersionDeprecation;

  constructor(version: ApiVersion, deprecation: VersionDeprecation) {
    super(`API version ${version} is deprecated and will be removed on ${deprecation.sunsetDate}`);
    this.name = 'VersionDeprecatedError';
    this.version = version;
    this.deprecation = deprecation;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Parse version string to comparable components
 */
export function parseVersion(version: ApiVersion): { major: number; minor: number; patch: number } {
  const match = version.match(/^v(\d+)(?:\.(\d+))?(?:\.(\d+))?$/);
  if (!match) {
    return { major: 0, minor: 0, patch: 0 };
  }
  return {
    major: parseInt(match[1] ?? '0', 10),
    minor: parseInt(match[2] ?? '0', 10),
    patch: parseInt(match[3] ?? '0', 10),
  };
}

/**
 * Convert version to numeric value for comparison
 */
export function versionToNumber(version: ApiVersion): number {
  const { major, minor, patch } = parseVersion(version);
  return major * 1000000 + minor * 1000 + patch;
}

/**
 * Compare two versions
 * Returns: negative if a < b, 0 if equal, positive if a > b
 */
export function compareVersions(a: ApiVersion, b: ApiVersion): number {
  return versionToNumber(a) - versionToNumber(b);
}

/**
 * Check if version is within range
 */
export function isVersionInRange(version: ApiVersion, min: ApiVersion, max?: ApiVersion): boolean {
  const v = versionToNumber(version);
  const minV = versionToNumber(min);
  const maxV = (max !== null && max !== undefined) ? versionToNumber(max) : Infinity;
  return v >= minV && v <= maxV;
}

/**
 * Get latest version from array
 */
export function getLatestVersion(versions: ApiVersion[]): ApiVersion | undefined {
  if (versions.length === 0) return undefined;
  return versions.reduce((latest, current) => (compareVersions(current, latest) > 0 ? current : latest));
}

// =============================================================================
// VERSIONED API CLIENT
// =============================================================================

/**
 * Versioned API client with full version management
 */
export class VersionedApiClient {
  private config: VersionedApiClientConfig;
  private currentVersion: ApiVersion;
  private deprecationWarned: Set<ApiVersion> = new Set();

  constructor(config: VersionedApiClientConfig) {
    this.config = config;
    this.currentVersion = config.versionConfig.current;
  }

  /**
   * Get current version
   */
  getVersion(): ApiVersion {
    return this.currentVersion;
  }

  /**
   * Get all supported versions
   */
  getSupportedVersions(): ApiVersion[] {
    return [...this.config.versionConfig.supported];
  }

  /**
   * Check if version is supported
   */
  isVersionSupported(version: ApiVersion): boolean {
    return (
      compareVersions(version, this.config.versionConfig.minimum) >= 0 &&
      this.config.versionConfig.supported.includes(version)
    );
  }

  /**
   * Set target version with validation
   */
  setVersion(version: ApiVersion): VersionNegotiationResult {
    const { versionConfig } = this.config;

    // Check if version is supported
    if (compareVersions(version, versionConfig.minimum) < 0) {
      this.config.onUnsupportedVersion?.(version, versionConfig.minimum);
      throw new VersionNotSupportedError(version, versionConfig.minimum, versionConfig.supported);
    }

    // Check deprecation status
    const deprecation = versionConfig.deprecated.get(version);
    const isDeprecated = !!deprecation;

    // Check if sunset date has passed
    if (deprecation) {
      const sunsetDate = new Date(deprecation.sunsetDate);
      if (sunsetDate < new Date()) {
        throw new VersionDeprecatedError(version, deprecation);
      }
    }

    const result: VersionNegotiationResult = {
      requestedVersion: version,
      negotiatedVersion: version,
      isDeprecated,
      deprecation,
      isSupported: this.isVersionSupported(version),
    };

    // Warn about deprecation (once per version)
    if (isDeprecated && !this.deprecationWarned.has(version)) {
      this.deprecationWarned.add(version);
      this.config.onDeprecationWarning?.(result);

      console.warn(
        `[API Version] Version ${version} is deprecated. ` +
          `Will be removed on ${deprecation?.sunsetDate}. ${
          (deprecation?.migrationGuide !== null && deprecation?.migrationGuide !== undefined && deprecation?.migrationGuide !== '') ? `See ${deprecation.migrationGuide} for migration guide.` : ''}`
      );
    }

    this.currentVersion = version;
    return result;
  }

  /**
   * Build versioned URL
   */
  private buildUrl(path: string): string {
    const { strategy, baseUrl } = this.config;
    const transformer = this.config.versionConfig.transformers.get(this.currentVersion);

    // Apply endpoint mapping if available
    const mappedPath = transformer?.mapEndpoint?.(path) ?? path;

    switch (strategy) {
      case VersioningStrategy.URL_PATH:
        return `${baseUrl}/${this.currentVersion}${mappedPath}`;

      case VersioningStrategy.QUERY_PARAM: {
        const separator = mappedPath.includes('?') ? '&' : '?';
        return `${baseUrl}${mappedPath}${separator}version=${this.currentVersion}`;
      }

      default:
        return `${baseUrl}${mappedPath}`;
    }
  }

  /**
   * Build versioned headers
   */
  private buildHeaders(): Record<string, string> {
    const { strategy, headerName = 'X-API-Version', mediaTypeTemplate = 'application/vnd.api.{version}+json' } =
      this.config;

    const versionNumber = this.currentVersion.slice(1); // Remove 'v' prefix

    switch (strategy) {
      case VersioningStrategy.ACCEPT_HEADER:
        return {
          Accept: `application/vnd.api+json; version=${versionNumber}`,
        };

      case VersioningStrategy.CUSTOM_HEADER:
        return {
          [headerName]: this.currentVersion,
        };

      case VersioningStrategy.MEDIA_TYPE:
        return {
          Accept: mediaTypeTemplate.replace('{version}', this.currentVersion),
          'Content-Type': mediaTypeTemplate.replace('{version}', this.currentVersion),
        };

      default:
        return {};
    }
  }

  /**
   * Execute versioned request using apiClient
   * @throws {ApiError} When the request fails
   */
  async request<T>(config: HttpRequestConfig): Promise<T> {
    const transformer = this.config.versionConfig.transformers.get(this.currentVersion);

    // Transform request for version
    let processedConfig: HttpRequestConfig = {
      ...config,
      url: this.buildUrl(config.url),
      headers: {
        ...this.buildHeaders(),
        ...this.config.defaultHeaders,
        ...config.headers,
      },
      ...((): { timeout?: number } => {
        if (config.timeout !== undefined) {
          return { timeout: config.timeout };
        } else if (this.config.timeout !== undefined) {
          return { timeout: this.config.timeout };
        } else {
          return {};
        }
      })(),
    };

    // Apply body transformation
    if (transformer?.transformBody !== null && transformer?.transformBody !== undefined && typeof transformer.transformBody === 'function' && config.body !== null && config.body !== undefined) {
      processedConfig.body = transformer.transformBody(config.body);
    }

    // Apply request transformation
    if (transformer?.transformRequest) {
      processedConfig = transformer.transformRequest(processedConfig);
    }

    // Execute request using apiClient
    const response = await apiClient.request<T>({
      url: processedConfig.url,
      method: processedConfig.method ?? 'GET',
      headers: processedConfig.headers,
      body: processedConfig.body,
      timeout: processedConfig.timeout,
      signal: processedConfig.signal,
    });

    // Check for version mismatch in response
    const responseVersion = response.headers['x-api-version'] as ApiVersion | undefined;
    if (responseVersion !== null && responseVersion !== undefined && responseVersion !== this.currentVersion) {
      this.config.onVersionMismatch?.(this.currentVersion, responseVersion);
    }

    // Transform response for version
    let {data} = response;
    if (transformer?.transformResponse) {
      data = transformer.transformResponse(data, this.currentVersion);
    }
    if (transformer?.transformData) {
      data = transformer.transformData(data);
    }

    return data;
  }

  /**
   * GET request using apiClient
   * @throws {ApiError} When the request fails
   */
  async get<T>(path: string, config?: Partial<HttpRequestConfig>): Promise<T> {
    return this.request({ ...config, url: path, method: 'GET' });
  }

  /**
   * POST request using apiClient
   * @throws {ApiError} When the request fails
   */
  async post<T>(path: string, body?: unknown, config?: Partial<HttpRequestConfig>): Promise<T> {
    return this.request({ ...config, url: path, method: 'POST', body });
  }

  /**
   * PUT request using apiClient
   * @throws {ApiError} When the request fails
   */
  async put<T>(path: string, body?: unknown, config?: Partial<HttpRequestConfig>): Promise<T> {
    return this.request({ ...config, url: path, method: 'PUT', body });
  }

  /**
   * PATCH request using apiClient
   * @throws {ApiError} When the request fails
   */
  async patch<T>(path: string, body?: unknown, config?: Partial<HttpRequestConfig>): Promise<T> {
    return this.request({ ...config, url: path, method: 'PATCH', body });
  }

  /**
   * DELETE request using apiClient
   * @throws {ApiError} When the request fails
   */
  async delete<T>(path: string, config?: Partial<HttpRequestConfig>): Promise<T> {
    return this.request({ ...config, url: path, method: 'DELETE' });
  }

  /**
   * Create a version-specific client
   */
  withVersion(version: ApiVersion): VersionedApiClient {
    const client = new VersionedApiClient(this.config);
    client.setVersion(version);
    return client;
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a versioned API client with sensible defaults
 */
export function createVersionedApi(config: {
  baseUrl: string;
  currentVersion?: ApiVersion;
  minimumVersion?: ApiVersion;
  supportedVersions?: ApiVersion[];
  strategy?: VersioningStrategy;
  deprecated?: Record<ApiVersion, VersionDeprecation>;
  transformers?: Record<ApiVersion, VersionTransformer>;
  onDeprecationWarning?: (info: VersionNegotiationResult) => void;
}): VersionedApiClient {
  const {
    baseUrl,
    currentVersion = 'v1',
    minimumVersion = 'v1',
    supportedVersions = [currentVersion],
    strategy = VersioningStrategy.URL_PATH,
    deprecated = {},
    transformers = {},
    onDeprecationWarning,
  } = config;

  return new VersionedApiClient({
    baseUrl,
    strategy,
    versionConfig: {
      current: currentVersion,
      minimum: minimumVersion,
      supported: supportedVersions,
      deprecated: new Map(Object.entries(deprecated) as [ApiVersion, VersionDeprecation][]),
      transformers: new Map(Object.entries(transformers) as [ApiVersion, VersionTransformer][]),
    },
    onDeprecationWarning: onDeprecationWarning ?? ((info): void => {
      console.warn('[API Deprecation]', info);
    }),
  });
}

// =============================================================================
// VERSION TRANSFORMER HELPERS
// =============================================================================

/**
 * Create a field renaming transformer
 */
export function createFieldRenamingTransformer(
  requestMappings: Record<string, string>,
  responseMappings: Record<string, string>
): VersionTransformer {
  function renameFields<T>(obj: T, mappings: Record<string, string>): T {
    if (typeof obj !== 'object' || obj === null) return obj;

    if (Array.isArray(obj)) {
      const mapped: unknown[] = obj.map((item: unknown) => renameFields(item, mappings));
      return mapped as T;
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const newKey = mappings[key] ?? key;
      result[newKey] = typeof value === 'object' ? renameFields(value, mappings) as unknown : value;
    }
    return result as T;
  }

  return {
    transformBody: (body) => renameFields(body, requestMappings),
    transformData: <T>(data: T) => renameFields(data, responseMappings),
  };
}

/**
 * Create an endpoint mapping transformer
 */
export function createEndpointMappingTransformer(mappings: Record<string, string>): VersionTransformer {
  return {
    mapEndpoint: (path) => {
      for (const [pattern, replacement] of Object.entries(mappings)) {
        if (path.startsWith(pattern)) {
          return path.replace(pattern, replacement);
        }
        // Support regex patterns
        const regex = new RegExp(pattern);
        if (regex.test(path)) {
          return path.replace(regex, replacement);
        }
      }
      return path;
    },
  };
}

/**
 * Compose multiple transformers
 */
export function composeTransformers(...transformers: VersionTransformer[]): VersionTransformer {
  return {
    transformRequest: (config) => {
      let result = config;
      for (const transformer of transformers) {
        if (transformer.transformRequest) {
          result = transformer.transformRequest(result);
        }
      }
      return result;
    },
    transformResponse: <T>(data: T, version: ApiVersion) => {
      let result = data;
      for (const transformer of transformers) {
        if (transformer.transformResponse) {
          result = transformer.transformResponse(result, version);
        }
      }
      return result;
    },
    mapEndpoint: (path) => {
      let result = path;
      for (const transformer of transformers) {
        if (transformer.mapEndpoint) {
          result = transformer.mapEndpoint(result);
        }
      }
      return result;
    },
    transformBody: (body) => {
      let result = body;
      for (const transformer of transformers) {
        if (transformer.transformBody) {
          result = transformer.transformBody(result);
        }
      }
      return result;
    },
    transformData: <T>(data: T) => {
      let result = data;
      for (const transformer of transformers) {
        if (transformer.transformData) {
          result = transformer.transformData(result);
        }
      }
      return result;
    },
  };
}

// =============================================================================
// EXAMPLE USAGE
// =============================================================================

/**
 * Example: Create versioned API with v1 to v2 migration
 */
export const exampleVersionedApi = createVersionedApi({
  baseUrl: '/api',
  currentVersion: 'v2',
  minimumVersion: 'v1',
  supportedVersions: ['v1', 'v2'],
  strategy: VersioningStrategy.URL_PATH,
  deprecated: {
    v1: {
      sunsetDate: '2025-06-01',
      migrationGuide: 'https://docs.example.com/migrate-v1-to-v2',
      replacementVersion: 'v2',
      message: 'Please migrate to v2 for improved performance and new features.',
    },
  },
  transformers: {
    v1: composeTransformers(
      // Field renaming: v1 uses 'username', v2 uses 'name'
      createFieldRenamingTransformer({ name: 'username' }, { username: 'name' }),
      // Endpoint mapping: v1 uses /user/:id, v2 uses /users/:id
      createEndpointMappingTransformer({
        '/users/': '/user/',
      })
    ),
  },
});

// Usage:
// const api = createVersionedApi({ baseUrl: '/api', currentVersion: 'v2' });
// const users = await api.get('/users');
// api.setVersion('v1'); // Switch to v1 with automatic transformations
// const oldUsers = await api.get('/users'); // Automatically transformed
