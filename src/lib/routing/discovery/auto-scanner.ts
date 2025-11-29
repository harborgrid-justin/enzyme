/**
 * @file Automatic Route File Discovery Scanner
 * @description Enterprise-grade automatic route file discovery with glob pattern matching,
 * intelligent caching, and comprehensive file system analysis.
 *
 * @module @/lib/routing/discovery/auto-scanner
 *
 * This module provides:
 * - Glob pattern-based file discovery
 * - Intelligent caching with TTL and invalidation
 * - Multi-root directory scanning
 * - File extension filtering
 * - Ignore pattern support
 * - Detailed scan statistics
 *
 * @example
 * ```typescript
 * import { AutoScanner, createAutoScanner } from '@/lib/routing/discovery/auto-scanner';
 *
 * const scanner = createAutoScanner({
 *   roots: ['src/routes', 'src/features'],
 *   extensions: ['.tsx', '.ts'],
 *   ignore: ['**\/*.test.ts', '**\/__tests__/**'],
 * });
 *
 * const result = await scanner.scan();
 * console.log(`Found ${result.files.length} route files`);
 * ```
 */

// =============================================================================
// Types
// =============================================================================

/**
 * File type classification for discovered files
 */
export type RouteFileType =
  | 'page'
  | 'layout'
  | 'loading'
  | 'error'
  | 'not-found'
  | 'template'
  | 'default'
  | 'route'
  | 'middleware';

/**
 * Discovered file metadata
 */
export interface DiscoveredFile {
  /** Absolute file path */
  readonly absolutePath: string;
  /** Path relative to the scan root */
  readonly relativePath: string;
  /** File name without extension */
  readonly name: string;
  /** File extension (e.g., '.tsx') */
  readonly extension: string;
  /** Classified file type */
  readonly fileType: RouteFileType;
  /** Directory containing the file */
  readonly directory: string;
  /** Nesting depth from scan root */
  readonly depth: number;
  /** File modification timestamp */
  readonly modifiedAt: number;
  /** File size in bytes */
  readonly size: number;
}

/**
 * Glob pattern configuration for file matching
 */
export interface GlobPattern {
  /** Pattern string (supports ** and * wildcards) */
  readonly pattern: string;
  /** Whether this is an include or exclude pattern */
  readonly type: 'include' | 'exclude';
  /** Priority for pattern matching (higher = evaluated first) */
  readonly priority: number;
}

/**
 * Auto scanner configuration
 */
export interface AutoScannerConfig {
  /** Root directories to scan */
  readonly roots: readonly string[];
  /** File extensions to include */
  readonly extensions: readonly string[];
  /** Glob patterns for ignoring files/directories */
  readonly ignore: readonly string[];
  /** Additional glob patterns for including specific files */
  readonly include?: readonly string[];
  /** Enable deep scanning (follow symlinks) */
  readonly followSymlinks?: boolean;
  /** Maximum directory depth to scan */
  readonly maxDepth?: number;
  /** Enable caching of scan results */
  readonly cache?: boolean;
  /** Cache TTL in milliseconds */
  readonly cacheTTL?: number;
  /** Concurrency level for parallel scanning */
  readonly concurrency?: number;
  /** Custom file type classifier */
  readonly classifyFile?: (filename: string) => RouteFileType;
  /** Feature flag to enable/disable scanner */
  readonly featureFlag?: string;
}

/**
 * Scan result with comprehensive metadata
 */
export interface ScanResult {
  /** Discovered files */
  readonly files: readonly DiscoveredFile[];
  /** Scan statistics */
  readonly stats: ScanStatistics;
  /** Any errors encountered during scanning */
  readonly errors: readonly ScanError[];
  /** Whether result came from cache */
  readonly fromCache: boolean;
  /** Timestamp when scan completed */
  readonly scannedAt: number;
}

/**
 * Scan statistics for monitoring and debugging
 */
export interface ScanStatistics {
  /** Total files discovered */
  readonly totalFiles: number;
  /** Total directories scanned */
  readonly totalDirectories: number;
  /** Files ignored by patterns */
  readonly ignoredFiles: number;
  /** Scan duration in milliseconds */
  readonly durationMs: number;
  /** Breakdown by file type */
  readonly byFileType: Record<RouteFileType, number>;
  /** Breakdown by extension */
  readonly byExtension: Record<string, number>;
  /** Maximum depth reached */
  readonly maxDepthReached: number;
  /** Average file size */
  readonly avgFileSize: number;
}

/**
 * Error encountered during scanning
 */
export interface ScanError {
  /** Error type */
  readonly type: 'permission' | 'not-found' | 'symlink' | 'unknown';
  /** Path that caused the error */
  readonly path: string;
  /** Error message */
  readonly message: string;
  /** Original error (if available) */
  readonly originalError?: Error;
}

/**
 * Cache entry for scan results
 */
interface CacheEntry {
  readonly result: ScanResult;
  readonly expiresAt: number;
  readonly configHash: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default scanner configuration
 */
export const DEFAULT_SCANNER_CONFIG: AutoScannerConfig = {
  roots: ['src/routes', 'src/pages', 'src/app'],
  extensions: ['.tsx', '.ts', '.jsx', '.js'],
  ignore: [
    '**/*.test.{ts,tsx,js,jsx}',
    '**/*.spec.{ts,tsx,js,jsx}',
    '**/__tests__/**',
    '**/__mocks__/**',
    '**/*.stories.{ts,tsx,js,jsx}',
    '**/*.d.ts',
    '**/node_modules/**',
    '**/.git/**',
  ],
  followSymlinks: false,
  maxDepth: 20,
  cache: true,
  cacheTTL: 30000, // 30 seconds
  concurrency: 4,
};

/**
 * File naming conventions for type classification
 */
const FILE_TYPE_PATTERNS: ReadonlyArray<{ pattern: RegExp; type: RouteFileType }> = [
  { pattern: /^_layout\.(tsx?|jsx?)$/, type: 'layout' },
  { pattern: /^layout\.(tsx?|jsx?)$/, type: 'layout' },
  { pattern: /^_loading\.(tsx?|jsx?)$/, type: 'loading' },
  { pattern: /^loading\.(tsx?|jsx?)$/, type: 'loading' },
  { pattern: /^_error\.(tsx?|jsx?)$/, type: 'error' },
  { pattern: /^error\.(tsx?|jsx?)$/, type: 'error' },
  { pattern: /^_not-found\.(tsx?|jsx?)$/, type: 'not-found' },
  { pattern: /^not-found\.(tsx?|jsx?)$/, type: 'not-found' },
  { pattern: /^_template\.(tsx?|jsx?)$/, type: 'template' },
  { pattern: /^template\.(tsx?|jsx?)$/, type: 'template' },
  { pattern: /^_default\.(tsx?|jsx?)$/, type: 'default' },
  { pattern: /^default\.(tsx?|jsx?)$/, type: 'default' },
  { pattern: /^route\.(tsx?|jsx?)$/, type: 'route' },
  { pattern: /^_middleware\.(tsx?|jsx?)$/, type: 'middleware' },
  { pattern: /^middleware\.(tsx?|jsx?)$/, type: 'middleware' },
];

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Classify a file based on its name
 *
 * @param filename - The filename to classify
 * @returns The classified file type
 */
export function classifyFileType(filename: string): RouteFileType {
  for (const { pattern, type } of FILE_TYPE_PATTERNS) {
    if (pattern.test(filename)) {
      return type;
    }
  }
  return 'page';
}

/**
 * Convert a glob pattern to a RegExp
 *
 * @param pattern - Glob pattern string
 * @returns Compiled RegExp
 */
export function globToRegex(pattern: string): RegExp {
  const regexStr = pattern
    // Escape special regex characters (except * and ?)
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    // Convert ** to match any path
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    // Convert * to match anything except path separator
    .replace(/\*/g, '[^/]*')
    // Convert ? to match single character
    .replace(/\?/g, '.')
    // Restore globstar
    .replace(/\{\{GLOBSTAR\}\}/g, '.*')
    // Handle brace expansion {a,b,c}
    .replace(/\{([^}]+)\}/g, (_, group: string) => `(${group.split(',').join('|')})`);

  return new RegExp(`^${regexStr}$`);
}

/**
 * Check if a path matches any of the given patterns
 *
 * @param path - Path to check
 * @param patterns - Patterns to match against
 * @returns True if path matches any pattern
 */
export function matchesPatterns(path: string, patterns: readonly string[]): boolean {
  for (const pattern of patterns) {
    const regex = globToRegex(pattern);
    if (regex.test(path)) {
      return true;
    }
  }
  return false;
}

/**
 * Generate a hash of the scanner configuration for cache keying
 *
 * @param config - Scanner configuration
 * @returns Configuration hash string
 */
function hashConfig(config: AutoScannerConfig): string {
  const normalized = {
    roots: [...config.roots].sort(),
    extensions: [...config.extensions].sort(),
    ignore: [...config.ignore].sort(),
    include: config.include ? [...config.include].sort() : [],
    maxDepth: config.maxDepth,
  };
  return JSON.stringify(normalized);
}

/**
 * Calculate path depth (number of directory levels)
 *
 * @param path - Path to analyze
 * @returns Depth count
 */
function getPathDepth(path: string): number {
  return path.split(/[/\\]/).filter(Boolean).length;
}

// =============================================================================
// AutoScanner Class
// =============================================================================

/**
 * Automatic route file scanner with caching and parallel scanning support
 *
 * @example
 * ```typescript
 * const scanner = new AutoScanner({
 *   roots: ['src/routes'],
 *   extensions: ['.tsx'],
 * });
 *
 * const result = await scanner.scan();
 * for (const file of result.files) {
 *   console.log(`${file.fileType}: ${file.relativePath}`);
 * }
 * ```
 */
export class AutoScanner {
  private readonly config: AutoScannerConfig;
  private cache: CacheEntry | null = null;
  private isScanning = false;
  private pendingScan: Promise<ScanResult> | null = null;

  /**
   * Create a new AutoScanner instance
   *
   * @param config - Scanner configuration (merged with defaults)
   */
  constructor(config: Partial<AutoScannerConfig> = {}) {
    this.config = {
      ...DEFAULT_SCANNER_CONFIG,
      ...config,
      roots: config.roots ?? DEFAULT_SCANNER_CONFIG.roots,
      extensions: config.extensions ?? DEFAULT_SCANNER_CONFIG.extensions,
      ignore: config.ignore ?? DEFAULT_SCANNER_CONFIG.ignore,
    };
  }

  /**
   * Get the current configuration
   */
  getConfig(): Readonly<AutoScannerConfig> {
    return this.config;
  }

  /**
   * Perform a file system scan
   *
   * @param forceRefresh - Skip cache and perform fresh scan
   * @returns Scan result with discovered files
   */
  async scan(forceRefresh = false): Promise<ScanResult> {
    // Check cache first
    if (forceRefresh !== true && this.config.cache === true && this.cache) {
      const configHash = hashConfig(this.config);
      if (this.cache.configHash === configHash && Date.now() < this.cache.expiresAt) {
        return { ...this.cache.result, fromCache: true };
      }
    }

    // Deduplicate concurrent scan requests
    if (this.isScanning && this.pendingScan) {
      return this.pendingScan;
    }

    this.isScanning = true;
    this.pendingScan = this.performScan();

    try {
      const result = await this.pendingScan;

      // Update cache
      if (this.config.cache) {
        this.cache = {
          result,
          expiresAt: Date.now() + (this.config.cacheTTL ?? 30000),
          configHash: hashConfig(this.config),
        };
      }

      return result;
    } finally {
      this.isScanning = false;
      this.pendingScan = null;
    }
  }

  /**
   * Perform the actual scan operation
   */
  private async performScan(): Promise<ScanResult> {
    const startTime = Date.now();
    const files: DiscoveredFile[] = [];
    const errors: ScanError[] = [];
    let totalDirectories = 0;
    let ignoredFiles = 0;
    let maxDepthReached = 0;
    let totalSize = 0;
    const byFileType: Record<RouteFileType, number> = {
      page: 0,
      layout: 0,
      loading: 0,
      error: 0,
      'not-found': 0,
      template: 0,
      default: 0,
      route: 0,
      middleware: 0,
    };
    const byExtension: Record<string, number> = {};

    // Dynamic imports for Node.js fs module (build-time only)
    const { promises: fs } = await import('fs');
    const path = await import('path');

    // Scan each root directory
    for (const root of this.config.roots) {
      try {
        await fs.access(root);
      } catch {
        // Root doesn't exist, skip
        continue;
      }

      const queue: Array<{ dir: string; depth: number }> = [{ dir: root, depth: 0 }];
      const visited = new Set<string>();

      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) continue;

        const { dir, depth } = item;

        // Check max depth
        if (this.config.maxDepth !== undefined && depth > this.config.maxDepth) {
          continue;
        }

        // Skip if already visited (handles symlink cycles)
        const realPath = await fs.realpath(dir).catch(() => dir);
        if (visited.has(realPath)) {
          continue;
        }
        visited.add(realPath);

        totalDirectories++;
        if (depth > maxDepthReached) {
          maxDepthReached = depth;
        }

        let entries: Array<{
          name: string;
          isFile: () => boolean;
          isDirectory: () => boolean;
          isSymbolicLink?: () => boolean;
        }>;
        try {
          const rawEntries = await fs.readdir(dir, { withFileTypes: true });
          entries = rawEntries as Array<{
            name: string;
            isFile: () => boolean;
            isDirectory: () => boolean;
            isSymbolicLink?: () => boolean;
          }>;
        } catch (err) {
          errors.push({
            type: 'permission',
            path: dir,
            message: `Cannot read directory: ${(err as Error).message}`,
            originalError: err as Error,
          });
          continue;
        }

        for (const entry of entries) {
          const entryName = typeof entry.name === 'string' ? entry.name : String(entry.name);
          const entryPath = path.join(dir, entryName);
          const relativePath = path.relative(root, entryPath);

          if (entry.isDirectory()) {
            // Check ignore patterns for directory
            if (matchesPatterns(`${relativePath  }/`, this.config.ignore)) {
              continue;
            }

            // Handle symlinks
            if (entry.isSymbolicLink?.() && !this.config.followSymlinks) {
              continue;
            }

            queue.push({ dir: entryPath, depth: depth + 1 });
          } else if (entry.isFile()) {
            // Check extension
            const ext = path.extname(entryName);
            if (!this.config.extensions.includes(ext)) {
              ignoredFiles++;
              continue;
            }

            // Check ignore patterns
            if (matchesPatterns(relativePath, this.config.ignore)) {
              ignoredFiles++;
              continue;
            }

            // Check include patterns (if specified)
            if (this.config.include && this.config.include.length > 0) {
              if (!matchesPatterns(relativePath, this.config.include)) {
                ignoredFiles++;
                continue;
              }
            }

            // Get file stats
            let stats: Awaited<ReturnType<typeof fs.stat>>;
            try {
              stats = await fs.stat(entryPath);
            } catch (err) {
              errors.push({
                type: 'permission',
                path: entryPath,
                message: `Cannot stat file: ${(err as Error).message}`,
                originalError: err as Error,
              });
              continue;
            }

            // Classify file type
            const entryNameStr = entryName.toString();
            const fileType = this.config.classifyFile
              ? this.config.classifyFile(entryNameStr)
              : classifyFileType(entryNameStr);

            const file: DiscoveredFile = {
              absolutePath: entryPath,
              relativePath,
              name: path.basename(entryNameStr, ext),
              extension: ext,
              fileType,
              directory: path.dirname(relativePath),
              depth: getPathDepth(relativePath),
              modifiedAt: stats.mtimeMs,
              size: stats.size,
            };

            files.push(file);
            totalSize += stats.size;
            byFileType[fileType]++;
            byExtension[ext] = (byExtension[ext] ?? 0) + 1;
          }
        }
      }
    }

    const durationMs = Date.now() - startTime;

    return {
      files: Object.freeze(files.sort((a, b) => a.relativePath.localeCompare(b.relativePath))),
      stats: {
        totalFiles: files.length,
        totalDirectories,
        ignoredFiles,
        durationMs,
        byFileType,
        byExtension,
        maxDepthReached,
        avgFileSize: files.length > 0 ? totalSize / files.length : 0,
      },
      errors: Object.freeze(errors),
      fromCache: false,
      scannedAt: Date.now(),
    };
  }

  /**
   * Clear the scan cache
   */
  clearCache(): void {
    this.cache = null;
  }

  /**
   * Check if a file matches the scanner configuration
   *
   * @param filePath - File path to check
   * @returns True if file would be included in scan
   */
  matchesFile(filePath: string): boolean {
    const path = filePath.replace(/\\/g, '/');

    // Check extension
    const ext = `.${  path.split('.').pop()}`;
    if (!this.config.extensions.includes(ext)) {
      return false;
    }

    // Check ignore patterns
    if (matchesPatterns(path, this.config.ignore)) {
      return false;
    }

    // Check include patterns
    if (this.config.include && this.config.include.length > 0) {
      if (!matchesPatterns(path, this.config.include)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get files by type from last scan (requires prior scan)
   *
   * @param type - File type to filter by
   * @returns Files of the specified type, or empty array if no scan performed
   */
  getFilesByType(type: RouteFileType): readonly DiscoveredFile[] {
    if (!this.cache) {
      return [];
    }
    return this.cache.result.files.filter(f => f.fileType === type);
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new AutoScanner instance with configuration
 *
 * @param config - Scanner configuration
 * @returns Configured AutoScanner instance
 *
 * @example
 * ```typescript
 * const scanner = createAutoScanner({
 *   roots: ['src/routes'],
 *   extensions: ['.tsx'],
 *   ignore: ['**\/*.test.tsx'],
 * });
 * ```
 */
export function createAutoScanner(config: Partial<AutoScannerConfig> = {}): AutoScanner {
  return new AutoScanner(config);
}

/**
 * Create a scanner with Next.js App Router conventions
 *
 * @param appDir - App directory path (default: 'src/app')
 * @returns Configured scanner for Next.js App Router
 */
export function createNextJsAppScanner(appDir = 'src/app'): AutoScanner {
  return new AutoScanner({
    roots: [appDir],
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
    ignore: [
      '**/*.test.{ts,tsx,js,jsx}',
      '**/*.spec.{ts,tsx,js,jsx}',
      '**/__tests__/**',
      '**/components/**',
      '**/hooks/**',
      '**/utils/**',
      '**/lib/**',
      '**/api/**/*.{ts,js}', // API routes handled separately
    ],
    classifyFile: (filename) => {
      if (/^page\.(tsx?|jsx?)$/.test(filename)) return 'page';
      if (/^layout\.(tsx?|jsx?)$/.test(filename)) return 'layout';
      if (/^loading\.(tsx?|jsx?)$/.test(filename)) return 'loading';
      if (/^error\.(tsx?|jsx?)$/.test(filename)) return 'error';
      if (/^not-found\.(tsx?|jsx?)$/.test(filename)) return 'not-found';
      if (/^template\.(tsx?|jsx?)$/.test(filename)) return 'template';
      if (/^default\.(tsx?|jsx?)$/.test(filename)) return 'default';
      if (/^route\.(tsx?|jsx?)$/.test(filename)) return 'route';
      return 'page';
    },
  });
}

/**
 * Create a scanner with Remix conventions
 *
 * @param routesDir - Routes directory path (default: 'app/routes')
 * @returns Configured scanner for Remix
 */
export function createRemixScanner(routesDir = 'app/routes'): AutoScanner {
  return new AutoScanner({
    roots: [routesDir],
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
    ignore: [
      '**/*.test.{ts,tsx,js,jsx}',
      '**/*.spec.{ts,tsx,js,jsx}',
      '**/__tests__/**',
    ],
    classifyFile: (filename) => {
      // Remix uses file-based routing with specific conventions
      if (filename.startsWith('_index')) return 'page';
      if (filename.startsWith('_')) return 'layout';
      return 'page';
    },
  });
}

// =============================================================================
// Singleton Instance
// =============================================================================

let defaultScanner: AutoScanner | null = null;

/**
 * Get the default AutoScanner instance
 *
 * @returns Default scanner instance
 */
export function getAutoScanner(): AutoScanner {
  defaultScanner ??= new AutoScanner();
  return defaultScanner;
}

/**
 * Reset the default scanner (useful for testing)
 */
export function resetAutoScanner(): void {
  defaultScanner = null;
}
