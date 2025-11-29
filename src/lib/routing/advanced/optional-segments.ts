/**
 * @file Optional Route Segments Support
 * @description Implements optional route segment patterns for flexible URL matching.
 * Enables routes that can match with or without certain path segments.
 *
 * @module @/lib/routing/advanced/optional-segments
 *
 * This module provides:
 * - Optional segment definitions
 * - Default value handling
 * - Conditional segment rendering
 * - Type-safe optional params
 * - Segment presence detection
 *
 * @example
 * ```typescript
 * import { OptionalSegment, createOptionalSegment } from '@/lib/routing/advanced/optional-segments';
 *
 * // Route: /products/[[category]]/[[page]]
 * const segment = createOptionalSegment({
 *   name: 'category',
 *   defaultValue: 'all',
 *   validate: (v) => ['all', 'electronics', 'clothing'].includes(v),
 * });
 *
 * const value = segment.resolve('/products'); // 'all'
 * const value2 = segment.resolve('/products/electronics'); // 'electronics'
 * ```
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Optional segment configuration
 */
export interface OptionalSegmentConfig<T = string> {
  /** Segment parameter name */
  readonly name: string;
  /** Default value when segment is not present */
  readonly defaultValue: T;
  /** Validate segment value */
  readonly validate?: (value: string) => boolean;
  /** Transform segment value */
  readonly transform?: (value: string) => T;
  /** Allowed values (enum-style) */
  readonly allowedValues?: readonly T[];
  /** Position in the path (0-indexed from optional segments) */
  readonly position?: number;
  /** Description for documentation */
  readonly description?: string;
  /** Feature flag for this segment */
  readonly featureFlag?: string;
}

/**
 * Optional segment resolution result
 */
export interface OptionalSegmentResolution<T = string> {
  /** Whether segment was present in path */
  readonly present: boolean;
  /** Resolved value (actual or default) */
  readonly value: T;
  /** Raw string value (before transformation) */
  readonly rawValue: string | null;
  /** Validation result */
  readonly valid: boolean;
  /** Validation error (if any) */
  readonly error: string | null;
}

/**
 * Route with optional segments
 */
export interface OptionalSegmentRoute {
  /** Base path (static portion) */
  readonly basePath: string;
  /** Optional segments in order */
  readonly segments: readonly OptionalSegmentConfig[];
  /** Full pattern string */
  readonly pattern: string;
  /** Minimum path length (static + required) */
  readonly minLength: number;
  /** Maximum path length (static + all optional) */
  readonly maxLength: number;
}

/**
 * Match result for optional segment route
 */
export interface OptionalRouteMatch {
  /** Whether path matches the route */
  readonly matches: boolean;
  /** Resolved segment values */
  readonly values: Record<string, unknown>;
  /** Which segments were present */
  readonly presentSegments: readonly string[];
  /** Which segments used defaults */
  readonly defaultedSegments: readonly string[];
  /** Validation errors by segment */
  readonly errors: Record<string, string>;
  /** Match score for priority sorting */
  readonly score: number;
}

/**
 * Optional segment builder configuration
 */
export interface OptionalRouteBuilderConfig {
  /** Base path */
  readonly basePath: string;
  /** Segments to add */
  readonly segments: readonly OptionalSegmentConfig[];
  /** Strict mode (reject unknown segments) */
  readonly strict?: boolean;
}

// =============================================================================
// OptionalSegment Class
// =============================================================================

/**
 * Manages a single optional segment
 *
 * @example
 * ```typescript
 * const segment = new OptionalSegment({
 *   name: 'page',
 *   defaultValue: '1',
 *   transform: (v) => parseInt(v, 10),
 *   validate: (v) => /^\d+$/.test(v),
 * });
 *
 * const result = segment.resolve('5');
 * // { present: true, value: 5, rawValue: '5', valid: true, error: null }
 * ```
 */
export class OptionalSegment<T = string> {
  private readonly config: OptionalSegmentConfig<T>;

  constructor(config: OptionalSegmentConfig<T>) {
    this.config = config;
  }

  /**
   * Get segment name
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Get default value
   */
  getDefault(): T {
    return this.config.defaultValue;
  }

  /**
   * Resolve a segment value
   *
   * @param value - Raw segment value or undefined
   * @returns Resolution result
   */
  resolve(value: string | undefined | null): OptionalSegmentResolution<T> {
    // Not present - use default
    if (value === undefined || value === null || value === '') {
      return {
        present: false,
        value: this.config.defaultValue,
        rawValue: null,
        valid: true,
        error: null,
      };
    }

    // Validate
    if (this.config.validate && !this.config.validate(value)) {
      return {
        present: true,
        value: this.config.defaultValue,
        rawValue: value,
        valid: false,
        error: `Invalid value for segment "${this.config.name}": ${value}`,
      };
    }

    // Check allowed values
    if (this.config.allowedValues && this.config.allowedValues.length > 0) {
      const transformed = this.config.transform ? this.config.transform(value) : (value as unknown as T);
      if (!this.config.allowedValues.includes(transformed)) {
        return {
          present: true,
          value: this.config.defaultValue,
          rawValue: value,
          valid: false,
          error: `Value "${value}" not in allowed values for "${this.config.name}"`,
        };
      }
    }

    // Transform
    const transformedValue = this.config.transform
      ? this.config.transform(value)
      : (value as unknown as T);

    return {
      present: true,
      value: transformedValue,
      rawValue: value,
      valid: true,
      error: null,
    };
  }

  /**
   * Get the pattern string for this segment
   */
  getPatternString(): string {
    return `[[${this.config.name}]]`;
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<OptionalSegmentConfig<T>> {
    return this.config;
  }
}

// =============================================================================
// OptionalSegmentRoute Class
// =============================================================================

/**
 * Manages a route with optional segments
 *
 * @example
 * ```typescript
 * const route = new OptionalSegmentRouteBuilder({
 *   basePath: '/products',
 *   segments: [
 *     { name: 'category', defaultValue: 'all' },
 *     { name: 'page', defaultValue: '1', transform: (v) => parseInt(v, 10) },
 *   ],
 * });
 *
 * const match = route.match('/products/electronics/2');
 * // { matches: true, values: { category: 'electronics', page: 2 }, ... }
 * ```
 */
export class OptionalSegmentRouteBuilder {
  private readonly config: OptionalRouteBuilderConfig;
  private readonly segments: Map<string, OptionalSegment>;
  private readonly orderedSegments: OptionalSegment[];
  private readonly pattern: RegExp;

  constructor(config: OptionalRouteBuilderConfig) {
    this.config = {
      ...config,
      strict: config.strict ?? false,
    };
    this.segments = new Map();
    this.orderedSegments = [];

    // Initialize segments
    for (const segConfig of config.segments) {
      const segment = new OptionalSegment(segConfig);
      this.segments.set(segConfig.name, segment);
      this.orderedSegments.push(segment);
    }

    // Build pattern
    this.pattern = this.buildPattern();
  }

  /**
   * Build regex pattern for matching
   */
  private buildPattern(): RegExp {
    const basePath = this.config.basePath.replace(/\/$/, '');
    const escapedBase = basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Each optional segment can be present or not
    const segmentPatterns = this.orderedSegments
      .map(() => '(?:/([^/]+))?');

    const fullPattern = `^${escapedBase}${segmentPatterns.join('')}/?$`;
    return new RegExp(fullPattern);
  }

  /**
   * Match a path against this route
   *
   * @param path - URL path to match
   * @returns Match result
   */
  match(path: string): OptionalRouteMatch {
    const normalizedPath = path.replace(/\/$/, '') || '/';
    const match = normalizedPath.match(this.pattern);

    if (!match) {
      return {
        matches: false,
        values: {},
        presentSegments: [],
        defaultedSegments: [],
        errors: {},
        score: 0,
      };
    }

    const values: Record<string, unknown> = {};
    const presentSegments: string[] = [];
    const defaultedSegments: string[] = [];
    const errors: Record<string, string> = {};

    // Resolve each segment
    for (let i = 0; i < this.orderedSegments.length; i++) {
      const segment = this.orderedSegments[i];
      if (!segment) continue;
      const rawValue = match[i + 1]; // +1 because match[0] is full match

      const resolution = segment.resolve(rawValue);
      values[segment.getName()] = resolution.value;

      if (resolution.present) {
        presentSegments.push(segment.getName());
      } else {
        defaultedSegments.push(segment.getName());
      }

      if (!resolution.valid && resolution.error) {
        errors[segment.getName()] = resolution.error;
      }
    }

    // Calculate score (more present segments = higher score)
    const score = presentSegments.length * 10 + this.config.basePath.split('/').length;

    return {
      matches: Object.keys(errors).length === 0,
      values,
      presentSegments,
      defaultedSegments,
      errors,
      score,
    };
  }

  /**
   * Build a path from segment values
   *
   * @param values - Segment values
   * @param options - Build options
   * @returns Built path
   */
  buildPath(
    values: Partial<Record<string, unknown>>,
    options: { includeDefaults?: boolean } = {}
  ): string {
    const parts = [this.config.basePath.replace(/\/$/, '')];

    for (const segment of this.orderedSegments) {
      const value = values[segment.getName()];
      const defaultValue = segment.getDefault();

      if (value !== undefined && value !== null) {
        // Include non-default values
        if (value !== defaultValue || options.includeDefaults === true) {
          const stringValue = typeof value === 'object'
            ? JSON.stringify(value)
            : String(value as string | number | boolean);
          parts.push(stringValue);
        } else {
          // Stop at first default (unless includeDefaults)
          break;
        }
      } else {
        // Stop at first missing value
        break;
      }
    }

    return parts.join('/') || '/';
  }

  /**
   * Get pattern string for display
   */
  getPatternString(): string {
    const basePath = this.config.basePath.replace(/\/$/, '');
    const segmentPatterns = this.orderedSegments
      .map(s => s.getPatternString())
      .join('/');

    return `${basePath}/${segmentPatterns}`;
  }

  /**
   * Get segment by name
   *
   * @param name - Segment name
   */
  getSegment(name: string): OptionalSegment | undefined {
    return this.segments.get(name);
  }

  /**
   * Get all segments
   */
  getAllSegments(): readonly OptionalSegment[] {
    return this.orderedSegments;
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<OptionalRouteBuilderConfig> {
    return this.config;
  }
}

// =============================================================================
// OptionalSegmentManager Class
// =============================================================================

/**
 * Manages multiple optional segment routes
 */
export class OptionalSegmentManager {
  private routes: Map<string, OptionalSegmentRouteBuilder> = new Map();
  private idCounter = 0;

  /**
   * Register a route with optional segments
   *
   * @param config - Route configuration
   * @returns Route ID
   */
  register(config: OptionalRouteBuilderConfig): string {
    const id = `optional_${++this.idCounter}`;
    const route = new OptionalSegmentRouteBuilder(config);
    this.routes.set(id, route);
    return id;
  }

  /**
   * Unregister a route
   *
   * @param id - Route ID
   * @returns True if route was found and removed
   */
  unregister(id: string): boolean {
    return this.routes.delete(id);
  }

  /**
   * Find best matching route for a path
   *
   * @param path - URL path
   * @returns Best match or null
   */
  findBestMatch(path: string): {
    route: OptionalSegmentRouteBuilder;
    match: OptionalRouteMatch;
    id: string;
  } | null {
    const matches: Array<{
      route: OptionalSegmentRouteBuilder;
      match: OptionalRouteMatch;
      id: string;
    }> = [];

    for (const [id, route] of this.routes) {
      const match = route.match(path);
      if (match.matches) {
        matches.push({ route, match, id });
      }
    }

    if (matches.length === 0) {
      return null;
    }

    // Sort by score (descending)
    matches.sort((a, b) => b.match.score - a.match.score);

    return matches[0]!;
  }

  /**
   * Get all registered routes
   */
  getAllRoutes(): readonly { id: string; route: OptionalSegmentRouteBuilder }[] {
    return Array.from(this.routes.entries()).map(([id, route]) => ({ id, route }));
  }

  /**
   * Get a specific route
   */
  getRoute(id: string): OptionalSegmentRouteBuilder | undefined {
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
 * Create an optional segment configuration
 *
 * @param config - Segment configuration
 * @returns OptionalSegment instance
 */
export function createOptionalSegment<T = string>(
  config: OptionalSegmentConfig<T>
): OptionalSegment<T> {
  return new OptionalSegment(config);
}

/**
 * Create a route with optional segments
 *
 * @param config - Route configuration
 * @returns OptionalSegmentRouteBuilder instance
 */
export function createOptionalRoute(
  config: OptionalRouteBuilderConfig
): OptionalSegmentRouteBuilder {
  return new OptionalSegmentRouteBuilder(config);
}

/**
 * Create a pagination optional segment
 *
 * @param options - Options
 * @returns Configured OptionalSegment for pagination
 */
export function createPaginationSegment(options: {
  name?: string;
  defaultPage?: number;
  maxPage?: number;
} = {}): OptionalSegment<number> {
  const maxPage = options.maxPage ?? 1000;

  return new OptionalSegment({
    name: options.name ?? 'page',
    defaultValue: options.defaultPage ?? 1,
    transform: (v) => parseInt(v, 10),
    validate: (v) => {
      const num = parseInt(v, 10);
      return !isNaN(num) && num >= 1 && num <= maxPage;
    },
    description: `Page number (1-${maxPage})`,
  });
}

/**
 * Create a category filter optional segment
 *
 * @param categories - Allowed categories
 * @param defaultCategory - Default category
 * @returns Configured OptionalSegment for categories
 */
export function createCategorySegment(
  categories: readonly string[],
  defaultCategory: string
): OptionalSegment<string> {
  return new OptionalSegment({
    name: 'category',
    defaultValue: defaultCategory,
    allowedValues: categories,
    description: `Category filter (${categories.join(', ')})`,
  });
}

/**
 * Create a sort order optional segment
 *
 * @param options - Sort options
 * @returns Configured OptionalSegment for sorting
 */
export function createSortSegment(options: {
  allowedValues?: readonly string[];
  defaultValue?: string;
} = {}): OptionalSegment<string> {
  return new OptionalSegment({
    name: 'sort',
    defaultValue: options.defaultValue ?? 'default',
    allowedValues: options.allowedValues ?? ['default', 'newest', 'oldest', 'popular', 'price-asc', 'price-desc'],
    description: 'Sort order',
  });
}

// =============================================================================
// Singleton Instance
// =============================================================================

let defaultManager: OptionalSegmentManager | null = null;

/**
 * Get the default optional segment manager
 */
export function getOptionalSegmentManager(): OptionalSegmentManager {
  defaultManager ??= new OptionalSegmentManager();
  return defaultManager;
}

/**
 * Reset the default optional segment manager
 */
export function resetOptionalSegmentManager(): void {
  defaultManager?.clearAll();
  defaultManager = null;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a pattern contains optional segments
 *
 * @param pattern - Route pattern
 * @returns True if pattern has optional segments
 */
export function hasOptionalSegments(pattern: string): boolean {
  return /\[\[[^\]]+\]\]/.test(pattern);
}

/**
 * Extract optional segment names from a pattern
 *
 * @param pattern - Route pattern
 * @returns Array of optional segment names
 */
export function extractOptionalSegmentNames(pattern: string): string[] {
  const matches = pattern.match(/\[\[([^\]]+)\]\]/g) ?? [];
  return matches.map(m => m.slice(2, -2)); // Remove [[ and ]]
}

/**
 * Convert pattern with optional segments to regex-friendly pattern
 *
 * @param pattern - Route pattern with optional segments
 * @returns Pattern suitable for regex
 */
export function normalizeOptionalPattern(pattern: string): string {
  return pattern.replace(/\[\[([^\]]+)\]\]/g, '(?:([^/]+))?');
}

/**
 * Build all possible paths for a route with optional segments
 *
 * @param basePath - Base path
 * @param segments - Optional segment configs
 * @returns Array of all possible path combinations
 */
export function buildAllPossiblePaths(
  basePath: string,
  segments: readonly OptionalSegmentConfig[]
): string[] {
  const paths: string[] = [basePath.replace(/\/$/, '')];

  // Generate all combinations
  const generateCombinations = (index: number, currentPath: string): void => {
    if (index >= segments.length) return;

    const segment = segments[index]!;
    const defaultValue = String(segment.defaultValue);

    // Path with this segment's default
    const pathWithSegment = `${currentPath}/${defaultValue}`;
    paths.push(pathWithSegment);

    // Continue with remaining segments
    generateCombinations(index + 1, pathWithSegment);
  };

  generateCombinations(0, basePath.replace(/\/$/, ''));

  return paths;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for OptionalSegmentResolution
 */
export function isOptionalSegmentResolution<T>(
  value: unknown
): value is OptionalSegmentResolution<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'present' in value &&
    'value' in value &&
    'valid' in value
  );
}

/**
 * Type guard for OptionalRouteMatch
 */
export function isOptionalRouteMatch(value: unknown): value is OptionalRouteMatch {
  return (
    typeof value === 'object' &&
    value !== null &&
    'matches' in value &&
    'values' in value &&
    'presentSegments' in value
  );
}
