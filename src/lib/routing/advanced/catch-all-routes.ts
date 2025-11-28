/**
 * @file Catch-All Routes Support
 * @description Implements advanced catch-all routing patterns with full type safety.
 * Supports both required and optional catch-all segments with segment parsing.
 *
 * @module @/lib/routing/advanced/catch-all-routes
 *
 * This module provides:
 * - Catch-all route definitions
 * - Segment parsing and extraction
 * - Type-safe catch-all params
 * - Priority ordering for catch-all routes
 * - Fallback handling
 *
 * @example
 * ```typescript
 * import { CatchAllRoute, createCatchAllRoute } from '@/lib/routing/advanced/catch-all-routes';
 *
 * const docsRoute = createCatchAllRoute({
 *   basePath: '/docs',
 *   paramName: 'slug',
 *   optional: false,
 *   component: DocsPage,
 * });
 *
 * const segments = docsRoute.parseSegments('/docs/getting-started/installation');
 * // ['getting-started', 'installation']
 * ```
 */

import type { ComponentType } from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * Catch-all route configuration
 */
export interface CatchAllRouteConfig<TProps = unknown> {
  /** Base path before the catch-all segment */
  readonly basePath: string;
  /** Parameter name for the catch-all segments */
  readonly paramName: string;
  /** Whether the catch-all is optional (can match basePath alone) */
  readonly optional: boolean;
  /** Component to render */
  readonly component: ComponentType<TProps & CatchAllRouteProps>;
  /** Loading component */
  readonly loading?: ComponentType;
  /** Error component */
  readonly error?: ComponentType<{ error: Error }>;
  /** Not found component (for failed lookups) */
  readonly notFound?: ComponentType;
  /** Segment validator */
  readonly validateSegment?: (segment: string) => boolean;
  /** Transform segments before passing to component */
  readonly transformSegments?: (segments: string[]) => string[];
  /** Maximum allowed segments */
  readonly maxSegments?: number;
  /** Minimum required segments (for optional catch-all) */
  readonly minSegments?: number;
  /** Allowed segment patterns (regex) */
  readonly allowedPatterns?: readonly RegExp[];
  /** Denied segment patterns (regex) */
  readonly deniedPatterns?: readonly RegExp[];
  /** Metadata for the route */
  readonly meta?: CatchAllRouteMeta;
  /** Feature flag for this route */
  readonly featureFlag?: string;
}

/**
 * Props passed to catch-all route component
 */
export interface CatchAllRouteProps {
  /** Array of captured path segments */
  readonly segments: readonly string[];
  /** Joined path from segments */
  readonly joinedPath: string;
  /** Number of segments */
  readonly depth: number;
  /** Whether this is the base path (empty segments) */
  readonly isBase: boolean;
  /** Full matched path */
  readonly fullPath: string;
  /** Original params object */
  readonly params: Record<string, string>;
}

/**
 * Catch-all route metadata
 */
export interface CatchAllRouteMeta {
  /** Route title template */
  readonly title?: string;
  /** Route description */
  readonly description?: string;
  /** Whether to index in sitemap */
  readonly indexable?: boolean;
  /** Custom metadata */
  readonly custom?: Record<string, unknown>;
}

/**
 * Catch-all match result
 */
export interface CatchAllMatch {
  /** Whether the path matches */
  readonly matches: boolean;
  /** Captured segments */
  readonly segments: readonly string[];
  /** Validation errors (if any) */
  readonly errors: readonly CatchAllError[];
  /** Match score for priority sorting */
  readonly score: number;
  /** Computed props for component */
  readonly props: CatchAllRouteProps | null;
}

/**
 * Catch-all validation error
 */
export interface CatchAllError {
  /** Error type */
  readonly type: 'invalid-segment' | 'too-many-segments' | 'too-few-segments' | 'pattern-violation';
  /** Error message */
  readonly message: string;
  /** Problematic segment (if applicable) */
  readonly segment?: string;
  /** Segment index (if applicable) */
  readonly index?: number;
}

/**
 * Registered catch-all route
 */
export interface RegisteredCatchAllRoute {
  /** Unique route ID */
  readonly id: string;
  /** Route configuration */
  readonly config: CatchAllRouteConfig;
  /** Compiled pattern for matching */
  readonly pattern: CatchAllPattern;
  /** Registration timestamp */
  readonly registeredAt: number;
}

/**
 * Compiled catch-all pattern
 */
export interface CatchAllPattern {
  /** Base path regex */
  readonly baseRegex: RegExp;
  /** Full path regex */
  readonly fullRegex: RegExp;
  /** Static prefix length */
  readonly staticPrefixLength: number;
}

// =============================================================================
// CatchAllRoute Class
// =============================================================================

/**
 * Manages a single catch-all route
 *
 * @example
 * ```typescript
 * const route = new CatchAllRoute({
 *   basePath: '/blog',
 *   paramName: 'slug',
 *   optional: true,
 *   component: BlogPage,
 * });
 *
 * if (route.matches('/blog/2024/01/hello-world')) {
 *   const segments = route.parseSegments('/blog/2024/01/hello-world');
 *   // ['2024', '01', 'hello-world']
 * }
 * ```
 */
export class CatchAllRoute {
  private readonly config: CatchAllRouteConfig;
  private readonly pattern: CatchAllPattern;

  constructor(config: CatchAllRouteConfig) {
    this.config = {
      ...config,
      maxSegments: config.maxSegments ?? 50,
      minSegments: config.minSegments ?? 0,
    };
    this.pattern = this.compilePattern(config);
  }

  /**
   * Compile the route pattern into regex
   */
  private compilePattern(config: CatchAllRouteConfig): CatchAllPattern {
    const basePath = config.basePath.replace(/\/$/, '');
    const escapedBase = basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Base regex matches just the base path
    const baseRegex = new RegExp(`^${escapedBase}/?$`);

    // Full regex matches base path plus any number of segments
    const segmentPattern = config.optional ? '(/[^/]+)*' : '(/[^/]+)+';
    const fullRegex = new RegExp(`^${escapedBase}${segmentPattern}$`);

    return {
      baseRegex,
      fullRegex,
      staticPrefixLength: basePath.split('/').filter(Boolean).length,
    };
  }

  /**
   * Check if a path matches this catch-all route
   *
   * @param path - URL path to check
   * @returns True if path matches
   */
  matches(path: string): boolean {
    const normalizedPath = path.replace(/\/$/, '') || '/';

    if (this.config.optional && this.pattern.baseRegex.test(normalizedPath)) {
      return true;
    }

    return this.pattern.fullRegex.test(normalizedPath);
  }

  /**
   * Parse segments from a matched path
   *
   * @param path - URL path to parse
   * @returns Array of segments
   */
  parseSegments(path: string): string[] {
    const normalizedPath = path.replace(/\/$/, '') || '/';
    const basePath = this.config.basePath.replace(/\/$/, '');

    if (normalizedPath === basePath || normalizedPath === basePath + '/') {
      return [];
    }

    const remainder = normalizedPath.slice(basePath.length);
    const segments = remainder.split('/').filter(Boolean).map(decodeURIComponent);

    // Apply transformation if configured
    if (this.config.transformSegments) {
      return this.config.transformSegments(segments);
    }

    return segments;
  }

  /**
   * Match a path and return full match result
   *
   * @param path - URL path to match
   * @returns Match result with segments and validation
   */
  match(path: string): CatchAllMatch {
    const errors: CatchAllError[] = [];

    // Check if path matches pattern
    if (!this.matches(path)) {
      return {
        matches: false,
        segments: [],
        errors: [],
        score: 0,
        props: null,
      };
    }

    // Parse segments
    const segments = this.parseSegments(path);

    // Validate segment count
    if (this.config.maxSegments && segments.length > this.config.maxSegments) {
      errors.push({
        type: 'too-many-segments',
        message: `Too many segments: ${segments.length} (max: ${this.config.maxSegments})`,
      });
    }

    if (this.config.minSegments && segments.length < this.config.minSegments) {
      errors.push({
        type: 'too-few-segments',
        message: `Too few segments: ${segments.length} (min: ${this.config.minSegments})`,
      });
    }

    // Validate individual segments
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]!;

      // Custom validator
      if (this.config.validateSegment && !this.config.validateSegment(segment)) {
        errors.push({
          type: 'invalid-segment',
          message: `Invalid segment: "${segment}"`,
          segment,
          index: i,
        });
      }

      // Pattern validation
      if (this.config.deniedPatterns) {
        for (const pattern of this.config.deniedPatterns) {
          if (pattern.test(segment)) {
            errors.push({
              type: 'pattern-violation',
              message: `Segment "${segment}" matches denied pattern`,
              segment,
              index: i,
            });
          }
        }
      }

      if (this.config.allowedPatterns && this.config.allowedPatterns.length > 0) {
        const matchesAllowed = this.config.allowedPatterns.some(p => p.test(segment));
        if (!matchesAllowed) {
          errors.push({
            type: 'pattern-violation',
            message: `Segment "${segment}" does not match any allowed pattern`,
            segment,
            index: i,
          });
        }
      }
    }

    // Build props
    const joinedPath = segments.join('/');
    const props: CatchAllRouteProps = {
      segments: Object.freeze(segments),
      joinedPath,
      depth: segments.length,
      isBase: segments.length === 0,
      fullPath: path,
      params: { [this.config.paramName]: joinedPath },
    };

    // Calculate match score (more static prefix = higher score)
    const score = this.pattern.staticPrefixLength * 10 + (this.config.optional ? 0 : 5);

    return {
      matches: errors.length === 0,
      segments: Object.freeze(segments),
      errors: Object.freeze(errors),
      score,
      props: errors.length === 0 ? props : null,
    };
  }

  /**
   * Get the route pattern string
   *
   * @returns Pattern string (e.g., '/docs/*' or '/docs/*?')
   */
  getPatternString(): string {
    const base = this.config.basePath.replace(/\/$/, '');
    const suffix = this.config.optional ? '/*?' : '/*';
    return base + suffix;
  }

  /**
   * Get the URL path for given segments
   *
   * @param segments - Segments to join
   * @returns Full URL path
   */
  buildPath(segments: readonly string[]): string {
    const base = this.config.basePath.replace(/\/$/, '');
    if (segments.length === 0) {
      return base || '/';
    }
    return `${base}/${segments.map(encodeURIComponent).join('/')}`;
  }

  /**
   * Get route configuration
   */
  getConfig(): Readonly<CatchAllRouteConfig> {
    return this.config;
  }

  /**
   * Get component for rendering
   */
  getComponent(): ComponentType<unknown> {
    return this.config.component as ComponentType<unknown>;
  }
}

// =============================================================================
// CatchAllRouteManager Class
// =============================================================================

/**
 * Manages multiple catch-all routes with priority ordering
 */
export class CatchAllRouteManager {
  private routes: Map<string, RegisteredCatchAllRoute> = new Map();
  private idCounter = 0;

  /**
   * Register a catch-all route
   *
   * @param config - Route configuration
   * @returns Route ID
   */
  register(config: CatchAllRouteConfig): string {
    const id = `catchall_${++this.idCounter}`;
    new CatchAllRoute(config);

    const registered: RegisteredCatchAllRoute = {
      id,
      config,
      pattern: {
        baseRegex: new RegExp(`^${config.basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$`),
        fullRegex: new RegExp(`^${config.basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/[^/]+)*$`),
        staticPrefixLength: config.basePath.split('/').filter(Boolean).length,
      },
      registeredAt: Date.now(),
    };

    this.routes.set(id, registered);
    return id;
  }

  /**
   * Unregister a catch-all route
   *
   * @param id - Route ID
   * @returns True if route was found and removed
   */
  unregister(id: string): boolean {
    return this.routes.delete(id);
  }

  /**
   * Find the best matching catch-all route for a path
   *
   * @param path - URL path
   * @returns Best match or null
   */
  findBestMatch(path: string): {
    route: RegisteredCatchAllRoute;
    match: CatchAllMatch;
  } | null {
    const matches: Array<{ route: RegisteredCatchAllRoute; match: CatchAllMatch }> = [];

    for (const registered of this.routes.values()) {
      const route = new CatchAllRoute(registered.config);
      const match = route.match(path);

      if (match.matches) {
        matches.push({ route: registered, match });
      }
    }

    if (matches.length === 0) {
      return null;
    }

    // Sort by score (descending) - higher score = more specific
    matches.sort((a, b) => b.match.score - a.match.score);

    return matches[0]!;
  }

  /**
   * Get all registered routes
   */
  getAllRoutes(): readonly RegisteredCatchAllRoute[] {
    return Array.from(this.routes.values());
  }

  /**
   * Get a specific route
   *
   * @param id - Route ID
   */
  getRoute(id: string): RegisteredCatchAllRoute | undefined {
    return this.routes.get(id);
  }

  /**
   * Clear all routes
   */
  clearAll(): void {
    this.routes.clear();
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a catch-all route configuration
 *
 * @param config - Route configuration
 * @returns CatchAllRoute instance
 */
export function createCatchAllRoute(config: CatchAllRouteConfig): CatchAllRoute {
  return new CatchAllRoute(config);
}

/**
 * Create a catch-all route for documentation sites
 *
 * @param options - Configuration options
 * @returns Configured CatchAllRoute
 */
export function createDocsCatchAll(options: {
  basePath?: string;
  component: ComponentType<CatchAllRouteProps>;
  notFound?: ComponentType;
  maxDepth?: number;
}): CatchAllRoute {
  return new CatchAllRoute({
    basePath: options.basePath ?? '/docs',
    paramName: 'slug',
    optional: true,
    component: options.component,
    notFound: options.notFound,
    maxSegments: options.maxDepth ?? 10,
    validateSegment: (segment) => /^[a-z0-9-]+$/.test(segment),
    meta: {
      indexable: true,
    },
  });
}

/**
 * Create a catch-all route for blog posts
 *
 * @param options - Configuration options
 * @returns Configured CatchAllRoute
 */
export function createBlogCatchAll(options: {
  basePath?: string;
  component: ComponentType<CatchAllRouteProps>;
}): CatchAllRoute {
  return new CatchAllRoute({
    basePath: options.basePath ?? '/blog',
    paramName: 'slug',
    optional: true,
    component: options.component,
    minSegments: 0,
    maxSegments: 5,
    allowedPatterns: [
      /^\d{4}$/,           // Year: 2024
      /^\d{2}$/,           // Month: 01
      /^[a-z0-9-]+$/,      // Slug
    ],
    meta: {
      indexable: true,
    },
  });
}

// =============================================================================
// Singleton Instance
// =============================================================================

let defaultManager: CatchAllRouteManager | null = null;

/**
 * Get the default catch-all route manager
 */
export function getCatchAllManager(): CatchAllRouteManager {
  if (!defaultManager) {
    defaultManager = new CatchAllRouteManager();
  }
  return defaultManager;
}

/**
 * Reset the default catch-all route manager
 */
export function resetCatchAllManager(): void {
  defaultManager?.clearAll();
  defaultManager = null;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a path pattern is a catch-all
 *
 * @param pattern - Route pattern
 * @returns True if pattern is a catch-all
 */
export function isCatchAllPattern(pattern: string): boolean {
  return pattern.includes('*') || pattern.includes('[...]') || pattern.includes('[[...') ;
}

/**
 * Extract base path from catch-all pattern
 *
 * @param pattern - Route pattern with catch-all
 * @returns Base path without catch-all
 */
export function extractBasePath(pattern: string): string {
  return pattern
    .replace(/\/?\*\??$/, '')
    .replace(/\/?\[\.\.\.[^\]]+\]$/, '')
    .replace(/\/?\[\[\.\.\.[^\]]+\]\]$/, '')
    || '/';
}

/**
 * Check if catch-all is optional
 *
 * @param pattern - Route pattern
 * @returns True if catch-all is optional
 */
export function isOptionalCatchAll(pattern: string): boolean {
  return pattern.includes('*?') || pattern.includes('[[...');
}

/**
 * Normalize path segments for comparison
 *
 * @param segments - Array of segments
 * @returns Normalized segments
 */
export function normalizeSegments(segments: readonly string[]): string[] {
  return segments
    .map(s => s.toLowerCase().trim())
    .filter(Boolean);
}

/**
 * Join segments into a path
 *
 * @param segments - Array of segments
 * @returns Joined path
 */
export function joinSegments(segments: readonly string[]): string {
  return '/' + segments.join('/');
}

/**
 * Split a path into segments
 *
 * @param path - URL path
 * @returns Array of segments
 */
export function splitPath(path: string): string[] {
  return path.split('/').filter(Boolean);
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for CatchAllRouteProps
 */
export function isCatchAllRouteProps(value: unknown): value is CatchAllRouteProps {
  return (
    typeof value === 'object' &&
    value !== null &&
    'segments' in value &&
    'joinedPath' in value &&
    'depth' in value &&
    'isBase' in value
  );
}

/**
 * Type guard for CatchAllMatch
 */
export function isCatchAllMatch(value: unknown): value is CatchAllMatch {
  return (
    typeof value === 'object' &&
    value !== null &&
    'matches' in value &&
    'segments' in value &&
    'score' in value
  );
}
