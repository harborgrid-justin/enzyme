/**
 * API Versioning
 *
 * Comprehensive API version management with support for multiple
 * versioning strategies and migration helpers.
 *
 * @module api/advanced/api-versioning
 */

// =============================================================================
// Types
// =============================================================================

/**
 * API versioning strategy.
 */
export type VersioningStrategy = 'url' | 'header' | 'query' | 'accept';

/**
 * Version format configuration.
 */
export interface VersionFormat {
  /** Version prefix (e.g., 'v') */
  prefix?: string;
  /** Version separator for header-based (e.g., '.') */
  separator?: string;
  /** Date format for date-based versioning */
  dateFormat?: string;
}

/**
 * Version compatibility status.
 */
export type VersionStatus = 'current' | 'supported' | 'deprecated' | 'unsupported';

/**
 * API version definition.
 */
export interface APIVersion {
  /** Version identifier */
  version: string;
  /** Semantic version number */
  semver?: string;
  /** Version status */
  status: VersionStatus;
  /** Release date */
  releasedAt?: string;
  /** Deprecation date */
  deprecatedAt?: string;
  /** Sunset date (when version will be removed) */
  sunsetAt?: string;
  /** Breaking changes in this version */
  breakingChanges?: string[];
  /** New features in this version */
  features?: string[];
  /** Migration notes */
  migrationNotes?: string;
  /** Changelog URL */
  changelogUrl?: string;
}

/**
 * Version manager configuration.
 */
export interface VersionManagerConfig {
  /** Versioning strategy */
  strategy: VersioningStrategy;
  /** Current/default version */
  currentVersion: string;
  /** Supported versions */
  supportedVersions: APIVersion[];
  /** Header name for header-based versioning */
  headerName?: string;
  /** Query parameter name for query-based versioning */
  queryParam?: string;
  /** Accept header media type prefix */
  acceptPrefix?: string;
  /** Version format configuration */
  format?: VersionFormat;
  /** Callback when using deprecated version */
  onDeprecatedVersion?: (version: string, info: APIVersion) => void;
  /** Callback when using unsupported version */
  onUnsupportedVersion?: (version: string) => void;
}

/**
 * Version transform function for request migration.
 */
export type VersionTransform<T = unknown> = (data: T, fromVersion: string, toVersion: string) => T;

/**
 * Response migration configuration.
 */
export interface ResponseMigration<T = unknown> {
  /** Source version */
  fromVersion: string;
  /** Target version */
  toVersion: string;
  /** Transform function */
  transform: VersionTransform<T>;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_HEADER_NAME = 'X-API-Version';
const DEFAULT_QUERY_PARAM = 'api-version';
const DEFAULT_ACCEPT_PREFIX = 'application/vnd.api';

// =============================================================================
// Version Manager Class
// =============================================================================

/**
 * API Version Manager for handling API versioning.
 *
 * @example
 * ```typescript
 * const versionManager = new VersionManager({
 *   strategy: 'header',
 *   currentVersion: 'v2',
 *   supportedVersions: [
 *     { version: 'v2', status: 'current' },
 *     { version: 'v1', status: 'deprecated', sunsetAt: '2024-12-31' },
 *   ],
 * });
 *
 * // Apply version to request
 * const headers = versionManager.getVersionHeaders('v2');
 * const url = versionManager.getVersionedUrl('/users', 'v2');
 *
 * // Check version status
 * if (versionManager.isDeprecated('v1')) {
 *   console.warn('Please upgrade to v2');
 * }
 * ```
 */
export class VersionManager {
  private config: VersionManagerConfig;
  private migrations: Map<string, ResponseMigration[]>;

  /**
   * Create a new version manager.
   *
   * @param config - Version manager configuration
   */
  constructor(config: VersionManagerConfig) {
    this.config = {
      headerName: DEFAULT_HEADER_NAME,
      queryParam: DEFAULT_QUERY_PARAM,
      acceptPrefix: DEFAULT_ACCEPT_PREFIX,
      format: { prefix: 'v', separator: '.' },
      ...config,
    };
    this.migrations = new Map();
  }

  // ===========================================================================
  // Version Headers & URLs
  // ===========================================================================

  /**
   * Get headers for the specified version.
   *
   * @param version - API version
   * @returns Headers object
   */
  getVersionHeaders(version?: string): Record<string, string> {
    const ver = version ?? this.config.currentVersion;
    this.checkVersion(ver);

    switch (this.config.strategy) {
      case 'header':
        return { [this.config.headerName!]: ver };

      case 'accept':
        return {
          Accept: `${this.config.acceptPrefix}.${ver}+json`,
        };

      case 'url':
      case 'query':
      default:
        return {};
    }
  }

  /**
   * Get versioned URL.
   *
   * @param path - API path
   * @param version - API version
   * @param baseUrl - Base URL
   * @returns Versioned URL
   */
  getVersionedUrl(path: string, version?: string, baseUrl = ''): string {
    const ver = version ?? this.config.currentVersion;
    this.checkVersion(ver);

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    switch (this.config.strategy) {
      case 'url':
        return `${baseUrl}/${ver}${normalizedPath}`;

      case 'query':
        const separator = path.includes('?') ? '&' : '?';
        return `${baseUrl}${normalizedPath}${separator}${this.config.queryParam}=${ver}`;

      case 'header':
      case 'accept':
      default:
        return `${baseUrl}${normalizedPath}`;
    }
  }

  /**
   * Extract version from request/response.
   *
   * @param headers - Response headers
   * @param url - Request URL
   * @returns Detected version or null
   */
  extractVersion(headers?: Record<string, string>, url?: string): string | null {
    // Check header
    if (headers && this.config.headerName) {
      const headerVersion = headers[this.config.headerName];
      if (headerVersion) return headerVersion;
    }

    // Check URL for path-based versioning
    if (url && this.config.strategy === 'url') {
      const match = url.match(/\/v(\d+(?:\.\d+)*)\//);
      if (match) return `v${match[1]}`;
    }

    // Check URL for query-based versioning
    if (url && this.config.strategy === 'query') {
      const urlObj = new URL(url, 'http://localhost');
      const queryVersion = urlObj.searchParams.get(this.config.queryParam!);
      if (queryVersion) return queryVersion;
    }

    return null;
  }

  // ===========================================================================
  // Version Status Checking
  // ===========================================================================

  /**
   * Get version information.
   *
   * @param version - Version to check
   * @returns Version info or undefined
   */
  getVersionInfo(version: string): APIVersion | undefined {
    return this.config.supportedVersions.find(v => v.version === version);
  }

  /**
   * Check if version is supported.
   *
   * @param version - Version to check
   * @returns Whether version is supported
   */
  isSupported(version: string): boolean {
    const info = this.getVersionInfo(version);
    return info !== undefined && info.status !== 'unsupported';
  }

  /**
   * Check if version is deprecated.
   *
   * @param version - Version to check
   * @returns Whether version is deprecated
   */
  isDeprecated(version: string): boolean {
    const info = this.getVersionInfo(version);
    return info?.status === 'deprecated';
  }

  /**
   * Check if version is current.
   *
   * @param version - Version to check
   * @returns Whether version is current
   */
  isCurrent(version: string): boolean {
    const info = this.getVersionInfo(version);
    return info?.status === 'current';
  }

  /**
   * Get the current version.
   */
  getCurrentVersion(): string {
    return this.config.currentVersion;
  }

  /**
   * Get all supported versions.
   */
  getSupportedVersions(): APIVersion[] {
    return this.config.supportedVersions.filter(v => v.status !== 'unsupported');
  }

  /**
   * Get deprecated versions.
   */
  getDeprecatedVersions(): APIVersion[] {
    return this.config.supportedVersions.filter(v => v.status === 'deprecated');
  }

  /**
   * Check version status and trigger callbacks.
   */
  private checkVersion(version: string): void {
    const info = this.getVersionInfo(version);

    if (!info) {
      this.config.onUnsupportedVersion?.(version);
      return;
    }

    if (info.status === 'deprecated') {
      this.config.onDeprecatedVersion?.(version, info);
    }

    if (info.status === 'unsupported') {
      this.config.onUnsupportedVersion?.(version);
    }
  }

  // ===========================================================================
  // Version Comparison
  // ===========================================================================

  /**
   * Compare two versions.
   *
   * @param a - First version
   * @param b - Second version
   * @returns Negative if a < b, positive if a > b, 0 if equal
   */
  compareVersions(a: string, b: string): number {
    const normalize = (v: string) => {
      const match = v.match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
      if (!match) return [0, 0, 0];
      return [
        parseInt(match[1] ?? '0', 10),
        parseInt(match[2] ?? '0', 10),
        parseInt(match[3] ?? '0', 10),
      ];
    };

    const aParts = normalize(a);
    const bParts = normalize(b);

    for (let i = 0; i < 3; i++) {
      if (aParts[i] !== bParts[i]) {
        return aParts[i] - bParts[i];
      }
    }

    return 0;
  }

  /**
   * Check if version is newer than another.
   */
  isNewerThan(version: string, other: string): boolean {
    return this.compareVersions(version, other) > 0;
  }

  /**
   * Check if version is older than another.
   */
  isOlderThan(version: string, other: string): boolean {
    return this.compareVersions(version, other) < 0;
  }

  /**
   * Get the latest version.
   */
  getLatestVersion(): string {
    const sorted = [...this.config.supportedVersions].sort((a, b) =>
      this.compareVersions(b.version, a.version)
    );
    return sorted[0]?.version ?? this.config.currentVersion;
  }

  // ===========================================================================
  // Response Migration
  // ===========================================================================

  /**
   * Register a response migration.
   *
   * @param migration - Migration configuration
   */
  registerMigration<T = unknown>(migration: ResponseMigration<T>): void {
    const key = `${migration.fromVersion}->${migration.toVersion}`;
    const existing = this.migrations.get(key) ?? [];
    existing.push(migration as ResponseMigration);
    this.migrations.set(key, existing);
  }

  /**
   * Migrate response data from one version to another.
   *
   * @param data - Response data
   * @param fromVersion - Source version
   * @param toVersion - Target version
   * @returns Migrated data
   */
  migrateResponse<T>(data: T, fromVersion: string, toVersion: string): T {
    if (fromVersion === toVersion) {
      return data;
    }

    // Find direct migration
    const key = `${fromVersion}->${toVersion}`;
    const migrations = this.migrations.get(key);

    if (migrations) {
      let result = data;
      for (const migration of migrations) {
        result = migration.transform(result, fromVersion, toVersion);
      }
      return result;
    }

    // Find migration path
    const path = this.findMigrationPath(fromVersion, toVersion);

    if (path.length === 0) {
      console.warn(`No migration path from ${fromVersion} to ${toVersion}`);
      return data;
    }

    let result = data;
    for (let i = 0; i < path.length - 1; i++) {
      result = this.migrateResponse(result, path[i], path[i + 1]);
    }

    return result;
  }

  /**
   * Find migration path between versions.
   */
  private findMigrationPath(from: string, to: string): string[] {
    const versions = this.config.supportedVersions.map(v => v.version);
    const fromIndex = versions.indexOf(from);
    const toIndex = versions.indexOf(to);

    if (fromIndex === -1 || toIndex === -1) {
      return [];
    }

    // Return path in order
    if (fromIndex < toIndex) {
      return versions.slice(fromIndex, toIndex + 1);
    } else {
      return versions.slice(toIndex, fromIndex + 1).reverse();
    }
  }

  // ===========================================================================
  // Sunset Checking
  // ===========================================================================

  /**
   * Get days until version sunset.
   *
   * @param version - Version to check
   * @returns Days until sunset, -1 if no sunset date, Infinity if already past
   */
  getDaysUntilSunset(version: string): number {
    const info = this.getVersionInfo(version);

    if (!info?.sunsetAt) {
      return -1;
    }

    const sunsetDate = new Date(info.sunsetAt);
    const today = new Date();
    const diffTime = sunsetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Check if version has sunset.
   */
  hasSunset(version: string): boolean {
    const days = this.getDaysUntilSunset(version);
    return days >= 0 && days <= 0;
  }

  /**
   * Get versions approaching sunset.
   *
   * @param daysThreshold - Days before sunset to warn
   * @returns Versions within threshold
   */
  getVersionsApproachingSunset(daysThreshold = 30): APIVersion[] {
    return this.config.supportedVersions.filter(v => {
      const days = this.getDaysUntilSunset(v.version);
      return days >= 0 && days <= daysThreshold;
    });
  }

  // ===========================================================================
  // Configuration Updates
  // ===========================================================================

  /**
   * Add a new version.
   */
  addVersion(version: APIVersion): void {
    const existing = this.config.supportedVersions.findIndex(
      v => v.version === version.version
    );

    if (existing >= 0) {
      this.config.supportedVersions[existing] = version;
    } else {
      this.config.supportedVersions.push(version);
    }
  }

  /**
   * Update version status.
   */
  updateVersionStatus(version: string, status: VersionStatus): void {
    const info = this.getVersionInfo(version);
    if (info) {
      info.status = status;
      if (status === 'deprecated' && !info.deprecatedAt) {
        info.deprecatedAt = new Date().toISOString();
      }
    }
  }

  /**
   * Set current version.
   */
  setCurrentVersion(version: string): void {
    if (!this.isSupported(version)) {
      throw new Error(`Version ${version} is not supported`);
    }

    // Update old current to supported
    const oldCurrent = this.config.supportedVersions.find(
      v => v.status === 'current'
    );
    if (oldCurrent) {
      oldCurrent.status = 'supported';
    }

    // Update new current
    const newCurrent = this.getVersionInfo(version);
    if (newCurrent) {
      newCurrent.status = 'current';
    }

    this.config.currentVersion = version;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new version manager.
 *
 * @param config - Configuration options
 * @returns VersionManager instance
 */
export function createVersionManager(config: VersionManagerConfig): VersionManager {
  return new VersionManager(config);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Parse semantic version string.
 */
export function parseSemver(version: string): {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
} | null {
  const match = version.match(
    /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-(.+))?$/
  );

  if (!match) return null;

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2] ?? '0', 10),
    patch: parseInt(match[3] ?? '0', 10),
    prerelease: match[4],
  };
}

/**
 * Format version string.
 */
export function formatVersion(
  major: number,
  minor?: number,
  patch?: number,
  options?: { prefix?: string }
): string {
  const prefix = options?.prefix ?? 'v';
  let version = `${prefix}${major}`;

  if (minor !== undefined) {
    version += `.${minor}`;
    if (patch !== undefined) {
      version += `.${patch}`;
    }
  }

  return version;
}
