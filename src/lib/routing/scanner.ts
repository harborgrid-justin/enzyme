/**
 * @file Route File System Scanner
 * @description Discovers routes from file system with convention-based parsing and caching
 */

import type { Dirent } from 'fs';
import type {
  DiscoveredRoute,
  ParsedRouteSegment,
  DiscoveryConfig,
} from './types';

// =============================================================================
// Re-export core segment parsing utilities
// =============================================================================
import {
  parseRouteSegment as coreParseRouteSegment,
  parseDirectoryPath as coreParseDirectoryPath,
  segmentsToUrlPath as coreSegmentsToUrlPath,
  generateRouteId as coreGenerateRouteId,
  generateDisplayName as coreGenerateDisplayName,
  extractParamNames as coreExtractParamNames,
  hasDynamicSegments as coreHasDynamicSegments,
  getStaticPrefix as coreGetStaticPrefix,
} from './core';

/**
 * Parse a filename or directory name into a route segment
 * @see core/segment-parser.ts for implementation details
 */
export function parseRouteSegment(filename: string): ParsedRouteSegment {
  return coreParseRouteSegment(filename);
}

/**
 * Convert parsed segments to URL path
 * @see core/segment-parser.ts for implementation details
 */
export function segmentsToUrlPath(segments: readonly ParsedRouteSegment[]): string {
  return coreSegmentsToUrlPath(segments as ParsedRouteSegment[]);
}

/**
 * Parse a full directory path into route segments
 * @see core/segment-parser.ts for implementation details
 */
export function parseDirectoryPath(
  dirPath: string,
  filename: string
): readonly ParsedRouteSegment[] {
  return coreParseDirectoryPath(dirPath, filename);
}

// =============================================================================
// File System Scanning
// =============================================================================

/**
 * Check if a file should be ignored based on ignore patterns
 */
function shouldIgnore(filePath: string, ignorePatterns: readonly string[]): boolean {
  for (const pattern of ignorePatterns) {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '{{GLOBSTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.')
      .replace(/\{\{GLOBSTAR\}\}/g, '.*')
      .replace(/\{([^}]+)\}/g, (_: string, group: string) => `(${group.split(',').join('|')})`);

    const regex = new RegExp(regexPattern);
    if (regex.test(filePath)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a file has a valid route extension
 */
function hasValidExtension(filename: string, extensions: readonly string[]): boolean {
  return extensions.some((ext) => filename.endsWith(ext));
}

/**
 * Build layout map from discovered routes
 */
function buildLayoutMap(
  routes: DiscoveredRoute[],
  _scanPath: string
): Map<string, string> {
  const layoutMap = new Map<string, string>();

  for (const route of routes) {
    if (route.isLayout) {
      // Get the directory containing the layout
      const layoutDir = route.relativePath.replace(/[/\\][^/\\]+$/, '');
      layoutMap.set(layoutDir || '.', route.filePath);
    }
  }

  return layoutMap;
}

/**
 * Find parent layout for a route
 */
function findParentLayout(
  routeRelativePath: string,
  layoutMap: Map<string, string>
): string | undefined {
  // Get the directory of the route
  let searchPath = routeRelativePath.replace(/[/\\][^/\\]+$/, '');

  // Walk up the directory tree looking for a layout
  while (searchPath) {
    if (layoutMap.has(searchPath)) {
      return layoutMap.get(searchPath);
    }
    // Move up one directory
    const parentPath = searchPath.replace(/[/\\][^/\\]+$/, '');
    if (parentPath === searchPath) break;
    searchPath = parentPath;
  }

  // Check root level
  if (layoutMap.has('.')) {
    return layoutMap.get('.');
  }

  return undefined;
}

/**
 * Scan a directory for route files (Node.js environment only - for build time)
 *
 * Note: This function uses dynamic imports for Node.js modules
 * and should only be called in build context (Vite plugin)
 */
export async function scanRouteFiles(
  rootDir: string,
  config: DiscoveryConfig
): Promise<DiscoveredRoute[]> {
  // Dynamic imports for Node.js modules (only available in build context)
  const { promises: fs } = await import('fs');
  const path = await import('path');

  const routes: DiscoveredRoute[] = [];

  for (const scanPath of config.scanPaths) {
    const fullScanPath = path.resolve(rootDir, scanPath);

    // Check if scan path exists
    try {
      await fs.access(fullScanPath);
    } catch {
      // Skip non-existent paths
      continue;
    }

    // Recursively scan directory
    const discoveredFiles = await scanDirectory(
      fullScanPath,
      fullScanPath,
      config,
      path,
      fs
    );

    routes.push(...discoveredFiles);
  }

  // Build layout map and assign parent layouts
  const layoutMap = buildLayoutMap(routes, rootDir);

  // Second pass: assign parent layouts
  for (const route of routes) {
    if (!route.isLayout) {
      const parentLayout = findParentLayout(route.relativePath, layoutMap);
      if (parentLayout !== undefined && parentLayout !== null) {
        // TypeScript doesn't allow direct mutation, so we create a new object
        Object.assign(route, { parentLayout });
      }
    }
  }

  // Sort routes for consistent ordering
  return routes.sort((a, b) => {
    // Layouts first
    if (a.isLayout && !b.isLayout) return -1;
    if (!a.isLayout && b.isLayout) return 1;

    // Then by depth
    if (a.depth !== b.depth) return a.depth - b.depth;

    // Then alphabetically by path
    return a.urlPath.localeCompare(b.urlPath);
  });
}

/**
 * Recursively scan a directory for route files
 */
async function scanDirectory(
  dirPath: string,
  basePath: string,
  config: DiscoveryConfig,
  path: typeof import('path'),
  fs: typeof import('fs').promises
): Promise<DiscoveredRoute[]> {
  const routes: DiscoveredRoute[] = [];

  let entries: Dirent[];
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return routes;
  }

  for (const entry of entries) {
    const entryName = typeof entry.name === 'string' ? entry.name : String(entry.name);
    const entryPath = path.join(dirPath, entryName);
    const relativePath = path.relative(basePath, entryPath);

    if (entry.isDirectory()) {
      // Skip ignored directories
      if (shouldIgnore(`${relativePath  }/`, config.ignorePatterns)) {
        continue;
      }

      // Recurse into subdirectory
      const subRoutes = await scanDirectory(entryPath, basePath, config, path, fs);
      routes.push(...subRoutes);
    } else if (entry.isFile()) {
      // Check if file has valid extension
      if (!hasValidExtension(entryName, config.extensions)) {
        continue;
      }

      // Skip ignored files
      if (shouldIgnore(relativePath, config.ignorePatterns)) {
        continue;
      }

      // Parse route from file
      const dirRelative = path.relative(basePath, dirPath);
      const parsedSegments = parseDirectoryPath(dirRelative, entryName);
      const segments: readonly ParsedRouteSegment[] = parsedSegments;

       
      const isLayout = Array.from(segments).some((s) => s.type === 'layout');
       
      const lastSegment = Array.from(segments)[segments.length - 1];
       
      const isIndex = lastSegment?.type === 'index';

      const route: DiscoveredRoute = {
        filePath: entryPath,
        relativePath,
        urlPath: segmentsToUrlPath(parsedSegments),
         
        segments,
        isLayout,
        isIndex,
         
        depth: Array.from(segments).filter((s) => s.type !== 'group').length,
      };

      routes.push(route);
    }
  }

  return routes;
}

// =============================================================================
// Route Cache
// =============================================================================

interface CacheEntry {
  routes: DiscoveredRoute[];
  timestamp: number;
}

const routeCache = new Map<string, CacheEntry>();

/**
 * Get cache key for a configuration
 */
function getCacheKey(rootDir: string, config: DiscoveryConfig): string {
  return `${rootDir}:${JSON.stringify(config.scanPaths)}:${JSON.stringify(config.extensions)}`;
}

/**
 * Scan routes with caching support
 */
export async function scanRouteFilesCached(
  rootDir: string,
  config: DiscoveryConfig,
  maxAge: number = 5000
): Promise<DiscoveredRoute[]> {
  if (!config.cacheResults) {
    return scanRouteFiles(rootDir, config);
  }

  const cacheKey = getCacheKey(rootDir, config);
  const cached = routeCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < maxAge) {
    return cached.routes;
  }

  const routes = await scanRouteFiles(rootDir, config);
  routeCache.set(cacheKey, { routes, timestamp: Date.now() });

  return routes;
}

/**
 * Clear the route cache
 */
export function clearRouteCache(): void {
  routeCache.clear();
}

/**
 * Invalidate cache for a specific root directory
 */
export function invalidateCache(rootDir: string): void {
  for (const key of routeCache.keys()) {
    if (key.startsWith(rootDir)) {
      routeCache.delete(key);
    }
  }
}

// =============================================================================
// Utility Functions (delegating to core)
// =============================================================================

/**
 * Extract parameter names from a URL path pattern
 * @see core/path-utils.ts for implementation details
 */
export function extractParamNames(path: string): string[] {
  return coreExtractParamNames(path);
}

/**
 * Check if a path has dynamic segments
 * @see core/path-utils.ts for implementation details
 */
export function hasDynamicSegments(path: string): boolean {
  return coreHasDynamicSegments(path);
}

/**
 * Get the static prefix of a path (before first dynamic segment)
 * @see core/path-utils.ts for implementation details
 */
export function getStaticPrefix(path: string): string {
  return coreGetStaticPrefix(path);
}

/**
 * Generate a route ID from a discovered route
 * @see core/segment-parser.ts for implementation details
 */
export function generateRouteId(route: DiscoveredRoute): string {
  return coreGenerateRouteId(route.segments, route.urlPath);
}

/**
 * Generate a display name from a discovered route
 * @see core/segment-parser.ts for implementation details
 */
export function generateDisplayName(route: DiscoveredRoute): string {
  return coreGenerateDisplayName(route.segments);
}

// =============================================================================
// Parallel Scanning (for large codebases)
// =============================================================================

/**
 * Options for parallel scanning
 */
export interface ParallelScanOptions {
  /** Maximum concurrent directory scans */
  maxConcurrency?: number;
  /** Timeout per directory scan (ms) */
  scanTimeout?: number;
  /** Enable progress reporting */
  onProgress?: (progress: ScanProgress) => void;
}

/**
 * Scan progress information
 */
export interface ScanProgress {
  /** Total directories found */
  totalDirs: number;
  /** Directories scanned */
  scannedDirs: number;
  /** Routes discovered so far */
  routesFound: number;
  /** Current directory being scanned */
  currentDir: string;
  /** Elapsed time (ms) */
  elapsedMs: number;
}

/**
 * Scan route files with parallel processing for large codebases
 */
export async function scanRouteFilesParallel(
  rootDir: string,
  config: DiscoveryConfig,
  options: ParallelScanOptions = {}
): Promise<DiscoveredRoute[]> {
  const {
    maxConcurrency = 4,
    scanTimeout = 30000,
    onProgress,
  } = options;

  const startTime = Date.now();

  // Dynamic imports for Node.js modules
  const { promises: fs } = await import('fs');
  const path = await import('path');

  const routes: DiscoveredRoute[] = [];
  const dirQueue: Array<{ dirPath: string; basePath: string }> = [];
  const inProgress = new Set<string>();
  let scannedDirs = 0;
  let totalDirs = 0;

  // Initialize queue with scan paths
  for (const scanPath of config.scanPaths) {
    const fullScanPath = path.resolve(rootDir, scanPath);
    try {
      await fs.access(fullScanPath);
      dirQueue.push({ dirPath: fullScanPath, basePath: fullScanPath });
      totalDirs++;
    } catch {
      // Skip non-existent paths
    }
  }

  // Process directory and add subdirectories to queue
  async function processDirectory(dirPath: string, basePath: string): Promise<void> {
    let entries: Dirent[];
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const entryName = typeof entry.name === 'string' ? entry.name : String(entry.name);
      const entryPath = path.join(dirPath, entryName);
      const relativePath = path.relative(basePath, entryPath);

      if (entry.isDirectory()) {
        // Skip ignored directories
        if (shouldIgnore(`${relativePath  }/`, config.ignorePatterns)) {
          continue;
        }

        // Add to queue for parallel processing
        dirQueue.push({ dirPath: entryPath, basePath });
        totalDirs++;
      } else if (entry.isFile()) {
        // Check if file has valid extension
        if (!hasValidExtension(entryName, config.extensions)) {
          continue;
        }

        // Skip ignored files
        if (shouldIgnore(relativePath, config.ignorePatterns)) {
          continue;
        }

        // Parse route from file
        const dirRelative = path.relative(basePath, dirPath);
        const parsedSegments = parseDirectoryPath(dirRelative, entryName);
        const segments: readonly ParsedRouteSegment[] = parsedSegments;

         
        const isLayout = Array.from(segments).some((s) => s.type === 'layout');
         
        const lastSegment = Array.from(segments)[segments.length - 1];
         
        const isIndex = lastSegment?.type === 'index';

        const route: DiscoveredRoute = {
          filePath: entryPath,
          relativePath,
          urlPath: segmentsToUrlPath(parsedSegments),
           
          segments,
          isLayout,
          isIndex,
           
          depth: Array.from(segments).filter((s) => s.type !== 'group').length,
        };

        routes.push(route);
      }
    }
  }

  // Process queue with concurrency control
  async function processQueue(): Promise<void> {
    while (dirQueue.length > 0 || inProgress.size > 0) {
      // Fill up to max concurrency
      while (dirQueue.length > 0 && inProgress.size < maxConcurrency) {
        const item = dirQueue.shift();
        if (item) {
          inProgress.add(item.dirPath);
          processDirectory(item.dirPath, item.basePath).then(() => {
            inProgress.delete(item.dirPath);
            scannedDirs++;
          }).catch(() => {
            inProgress.delete(item.dirPath);
            scannedDirs++;
          });
        }
      }

      // Wait a tick for progress
      await new Promise((resolve) => setTimeout(resolve, 1));

      // Report progress
      if (onProgress) {
        onProgress({
          totalDirs,
          scannedDirs,
          routesFound: routes.length,
          currentDir: Array.from(inProgress)[0] ?? '',
          elapsedMs: Date.now() - startTime,
        });
      }

      // Check timeout
      if (Date.now() - startTime > scanTimeout) {
        throw new Error(`Route scanning timed out after ${scanTimeout}ms`);
      }
    }
  }

  await processQueue();

  // Build layout map and assign parent layouts
  const layoutMap = buildLayoutMap(routes, rootDir);

  // Second pass: assign parent layouts
  for (const route of routes) {
    if (!route.isLayout) {
      const parentLayout = findParentLayout(route.relativePath, layoutMap);
      if (parentLayout !== undefined && parentLayout !== null) {
        Object.assign(route, { parentLayout });
      }
    }
  }

  // Sort routes for consistent ordering
  return routes.sort((a, b) => {
    if (a.isLayout && !b.isLayout) return -1;
    if (!a.isLayout && b.isLayout) return 1;
    if (a.depth !== b.depth) return a.depth - b.depth;
    return a.urlPath.localeCompare(b.urlPath);
  });
}

// =============================================================================
// Incremental Scanning
// =============================================================================

/**
 * File change event for incremental scanning
 */
export interface FileChangeEvent {
  type: 'add' | 'unlink' | 'change';
  filePath: string;
}

/**
 * Result of incremental scan
 */
export interface IncrementalScanResult {
  /** Routes added */
  added: DiscoveredRoute[];
  /** Routes removed */
  removed: DiscoveredRoute[];
  /** Routes modified */
  modified: DiscoveredRoute[];
  /** Whether a full rescan is needed */
  requiresFullRescan: boolean;
}

/**
 * Apply incremental file changes to cached routes
 */
export function applyIncrementalChanges(
  cachedRoutes: DiscoveredRoute[],
  changes: FileChangeEvent[],
  config: DiscoveryConfig
): IncrementalScanResult {
  const result: IncrementalScanResult = {
    added: [],
    removed: [],
    modified: [],
    requiresFullRescan: false,
  };

  const routesByPath = new Map(cachedRoutes.map((r) => [r.filePath, r]));

  for (const change of changes) {
    // Check if file is in a scanned path
    const isInScanPath = config.scanPaths.some((sp) =>
      change.filePath.includes(sp)
    );

    if (!isInScanPath) continue;

    // Check extension
    if (!hasValidExtension(change.filePath, config.extensions)) {
      continue;
    }

    switch (change.type) {
      case 'add': {
        // Parse the new route
        const basePath = config.scanPaths.find((sp) =>
          change.filePath.includes(sp)
        );
        if (basePath === undefined || basePath === null) break;

        const relativePath = change.filePath.split(basePath)[1]?.replace(/^[/\\]/, '') ?? '';
        const filename = change.filePath.split(/[/\\]/).pop() ?? '';
        const dirRelative = relativePath.replace(/[/\\][^/\\]+$/, '');

        const parsedSegments = parseDirectoryPath(dirRelative, filename);
        const segments: readonly ParsedRouteSegment[] = parsedSegments;
         
        const isLayout = Array.from(segments).some((s) => s.type === 'layout');
         
        const lastSegment = Array.from(segments)[segments.length - 1];
         
        const isIndex = lastSegment?.type === 'index';

        const route: DiscoveredRoute = {
          filePath: change.filePath,
          relativePath,
          urlPath: segmentsToUrlPath(parsedSegments),
           
          segments,
          isLayout,
          isIndex,
           
          depth: Array.from(segments).filter((s) => s.type !== 'group').length,
        };

        result.added.push(route);

        // Layout changes require full rescan for parent assignment
        if (isLayout) {
          result.requiresFullRescan = true;
        }
        break;
      }

      case 'unlink': {
        const existingRoute = routesByPath.get(change.filePath);
        if (existingRoute) {
          result.removed.push(existingRoute);

          // Layout removal requires full rescan
          if (existingRoute.isLayout) {
            result.requiresFullRescan = true;
          }
        }
        break;
      }

      case 'change': {
        const existingRoute = routesByPath.get(change.filePath);
        if (existingRoute) {
          result.modified.push(existingRoute);
        }
        break;
      }
    }
  }

  return result;
}

// =============================================================================
// Route Discovery Statistics
// =============================================================================

/**
 * Calculate discovery statistics for routes
 */
export function calculateDiscoveryStats(
  routes: DiscoveredRoute[],
  scanDurationMs: number,
  filesScanned: number,
  filesIgnored: number
): import('./types').RouteDiscoveryStats {
  const layouts = routes.filter((r) => r.isLayout);
  const dynamicRoutes = routes.filter((r) =>
    r.segments.some((s) => s.type === 'dynamic' || s.type === 'catchAll')
  );

  let maxDepth = 0;
  for (const route of routes) {
    if (route.depth > maxDepth) {
      maxDepth = route.depth;
    }
  }

  return {
    totalRoutes: routes.length,
    layoutCount: layouts.length,
    dynamicRouteCount: dynamicRoutes.length,
    maxDepth,
    scanDurationMs,
    filesScanned,
    filesIgnored,
  };
}

// =============================================================================
// Layout Tree Building
// =============================================================================

/**
 * Build a layout tree from discovered routes
 */
export function buildLayoutTree(
  routes: DiscoveredRoute[]
): import('./types').RouteLayoutTree {
  const layouts = routes.filter((r) => r.isLayout);
  const nonLayouts = routes.filter((r) => !r.isLayout);

  if (layouts.length === 0) {
    return {
      root: null,
      orphanedLayouts: [],
    };
  }

  // Sort layouts by depth (shallowest first)
  const sortedLayouts = [...layouts].sort((a, b) => a.depth - b.depth);

  // Build tree structure
  const layoutNodes = new Map<string, import('./types').RouteLayoutNode>();
  const orphanedLayouts: string[] = [];

  for (const layout of sortedLayouts) {
    const node: import('./types').RouteLayoutNode = {
      layoutPath: layout.filePath,
      children: [],
      routes: nonLayouts.filter((r) => r.parentLayout === layout.filePath),
    };
    layoutNodes.set(layout.filePath, node);
  }

  // Connect children to parents
  for (const layout of sortedLayouts) {
    if (layout.parentLayout !== undefined && layout.parentLayout !== null) {
      const parentNode = layoutNodes.get(layout.parentLayout);
      const currentNode = layoutNodes.get(layout.filePath);

      if (parentNode && currentNode) {
        (parentNode.children as import('./types').RouteLayoutNode[]).push(currentNode);
      } else if (currentNode) {
        orphanedLayouts.push(layout.filePath);
      }
    }
  }

  // Find root layouts (no parent)
  const rootLayouts = sortedLayouts.filter((l) => l.parentLayout === undefined || l.parentLayout === null);

  if (rootLayouts.length === 0) {
    return {
      root: null,
      orphanedLayouts: layouts.map((l) => l.filePath),
    };
  }

  // If multiple root layouts, create a virtual root
  const [firstRootLayout] = rootLayouts;
  const rootNode = firstRootLayout ? (layoutNodes.get(firstRootLayout.filePath) ?? null) : null;

  return {
    root: rootNode,
    orphanedLayouts,
  };
}
