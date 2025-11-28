/**
 * @file API Route File System Scanner
 * @description Discovers API routes from file system with convention-based parsing
 * and automatic endpoint inference. Supports RBAC group modifiers and nested resources.
 *
 * @module @/lib/api/auto/route-scanner
 *
 * Conventions:
 * - `/api/users/index.ts` -> GET /api/users (list), POST /api/users (create)
 * - `/api/users/[id].ts` -> GET/PUT/PATCH/DELETE /api/users/:id
 * - `/api/(auth)/protected.ts` -> Requires authentication
 * - `/api/(admin)/settings.ts` -> Requires admin role
 *
 * @example
 * ```typescript
 * import { scanApiRoutes, ApiRouteScanner } from '@/lib/api/auto/route-scanner';
 *
 * const routes = await scanApiRoutes('/src/api', {
 *   extensions: ['.ts'],
 *   ignorePatterns: ['**\/*.test.ts'],
 * });
 *
 * for (const route of routes) {
 *   console.log(route.urlPath, route.httpMethods, route.permissions);
 * }
 * ```
 */

import type { HttpMethod } from '../types';

// =============================================================================
// Types
// =============================================================================

/**
 * API route segment types for file-system convention
 */
export type ApiSegmentType =
  | 'static'      // users -> /users
  | 'dynamic'     // [id] -> /:id
  | 'catchAll'    // [...slug] -> /*
  | 'optional'    // [[id]] -> /:id?
  | 'group'       // (auth) -> no path, modifier only
  | 'private';    // _utils -> ignored

/**
 * Parsed API segment from filename or directory
 */
export interface ParsedApiSegment {
  /** Type of segment */
  readonly type: ApiSegmentType;
  /** Segment name for URL path */
  readonly name: string;
  /** Parameter name for dynamic segments */
  readonly paramName?: string;
  /** Whether this segment is optional */
  readonly isOptional: boolean;
  /** Original filename/dirname before parsing */
  readonly original: string;
  /** Group modifier details (for group type) */
  readonly groupModifier?: GroupModifier;
}

/**
 * Group modifier extracted from (name) folders
 */
export interface GroupModifier {
  /** Original group name */
  readonly name: string;
  /** Modifier type */
  readonly type: GroupModifierType;
  /** Associated value (e.g., role name for 'role' type) */
  readonly value?: string;
}

/**
 * Types of group modifiers
 */
export type GroupModifierType =
  | 'public'      // (public) - No auth required
  | 'auth'        // (auth) - Requires authentication
  | 'role'        // (admin), (manager) - Requires specific role
  | 'permission'  // (perm:users:read) - Requires specific permission
  | 'scope'       // (own), (team), (org) - Resource scope
  | 'custom';     // Custom modifier

/**
 * File type classification for API files
 */
export type ApiFileType =
  | 'collection'  // index.ts - list/create operations
  | 'resource'    // [id].ts - single resource operations
  | 'action'      // custom action (create.ts, delete.ts)
  | 'schema'      // _schema.ts - OpenAPI schema
  | 'middleware'  // _middleware.ts - Route middleware
  | 'access'      // _access.ts - Access control override
  | 'ignored';    // _* files or test files

/**
 * Scanned API route from file system
 */
export interface ScannedApiRoute {
  /** Absolute file path */
  readonly filePath: string;
  /** Path relative to scan root */
  readonly relativePath: string;
  /** Generated URL path (e.g., /api/users/:id) */
  readonly urlPath: string;
  /** Parsed path segments */
  readonly segments: readonly ParsedApiSegment[];
  /** Supported HTTP methods */
  readonly httpMethods: readonly HttpMethod[];
  /** File type classification */
  readonly fileType: ApiFileType;
  /** Extracted parameter names */
  readonly paramNames: readonly string[];
  /** Primary resource name */
  readonly resourceName: string;
  /** Parent resource names (for nested routes) */
  readonly parentResources: readonly string[];
  /** Group modifiers from parent folders */
  readonly groupModifiers: readonly GroupModifier[];
  /** Whether this route has a schema file */
  readonly hasSchema: boolean;
  /** Whether this route has middleware */
  readonly hasMiddleware: boolean;
  /** Whether this route has access override */
  readonly hasAccessOverride: boolean;
  /** Nesting depth */
  readonly depth: number;
}

/**
 * Scanner configuration options
 */
export interface ApiScannerConfig {
  /** File extensions to consider as API routes */
  readonly extensions: readonly string[];
  /** Glob patterns to ignore */
  readonly ignorePatterns: readonly string[];
  /** Base URL prefix (default: /api) */
  readonly baseUrl: string;
  /** Enable parallel scanning */
  readonly parallel: boolean;
  /** Cache discovery results */
  readonly cacheResults: boolean;
  /** Custom file type classifier */
  readonly classifyFile?: (filename: string) => ApiFileType;
  /** Custom group modifier parser */
  readonly parseGroupModifier?: (name: string) => GroupModifier;
}

/**
 * Default scanner configuration
 */
export const DEFAULT_API_SCANNER_CONFIG: ApiScannerConfig = {
  extensions: ['.ts', '.tsx'],
  ignorePatterns: [
    '**/*.test.{ts,tsx}',
    '**/*.spec.{ts,tsx}',
    '**/__tests__/**',
    '**/*.stories.{ts,tsx}',
    '**/types/**',
    '**/*.d.ts',
  ],
  baseUrl: '/api',
  parallel: true,
  cacheResults: true,
};

// =============================================================================
// Group Modifier Patterns
// =============================================================================

/**
 * Known group modifier patterns
 */
const GROUP_MODIFIER_PATTERNS: Record<string, GroupModifierType> = {
  'public': 'public',
  'auth': 'auth',
  'authenticated': 'auth',
  'protected': 'auth',
  'admin': 'role',
  'manager': 'role',
  'moderator': 'role',
  'user': 'role',
  'owner': 'scope',
  'own': 'scope',
  'team': 'scope',
  'org': 'scope',
  'organization': 'scope',
  'global': 'scope',
};

/**
 * HTTP methods for different file types
 */
const FILE_TYPE_METHODS: Record<ApiFileType, readonly HttpMethod[]> = {
  collection: ['GET', 'POST'],
  resource: ['GET', 'PUT', 'PATCH', 'DELETE'],
  action: [], // Determined by filename
  schema: [],
  middleware: [],
  access: [],
  ignored: [],
};

/**
 * Action file name to HTTP method mapping
 */
const ACTION_FILE_METHODS: Record<string, readonly HttpMethod[]> = {
  'create': ['POST'],
  'update': ['PUT', 'PATCH'],
  'delete': ['DELETE'],
  'list': ['GET'],
  'get': ['GET'],
  'patch': ['PATCH'],
  'put': ['PUT'],
  'post': ['POST'],
  'search': ['GET', 'POST'],
  'export': ['GET', 'POST'],
  'import': ['POST'],
  'upload': ['POST'],
  'download': ['GET'],
  'batch': ['POST'],
  'bulk': ['POST'],
};

// =============================================================================
// Segment Parsing
// =============================================================================

/**
 * Parse a filename or directory name into an API segment
 */
export function parseApiSegment(name: string): ParsedApiSegment {
  const trimmed = name.trim();

  // Private/ignored segments (starting with _)
  if (trimmed.startsWith('_')) {
    return {
      type: 'private',
      name: '',
      isOptional: false,
      original: name,
    };
  }

  // Group segments (parentheses)
  const groupMatch = trimmed.match(/^\(([^)]+)\)$/);
  if (groupMatch && groupMatch[1]) {
    const groupName = groupMatch[1];
    return {
      type: 'group',
      name: '',
      isOptional: false,
      original: name,
      groupModifier: parseGroupModifier(groupName),
    };
  }

  // Catch-all segments [[...param]] or [...param]
  const catchAllMatch = trimmed.match(/^\[{1,2}\.\.\.([^\]]+)\]{1,2}$/);
  if (catchAllMatch && catchAllMatch[1]) {
    const isOptional = trimmed.startsWith('[[');
    return {
      type: 'catchAll',
      name: '*',
      paramName: catchAllMatch[1],
      isOptional,
      original: name,
    };
  }

  // Optional dynamic segments [[param]]
  const optionalMatch = trimmed.match(/^\[\[([^\]]+)\]\]$/);
  if (optionalMatch && optionalMatch[1]) {
    return {
      type: 'optional',
      name: `:${optionalMatch[1]}?`,
      paramName: optionalMatch[1],
      isOptional: true,
      original: name,
    };
  }

  // Dynamic segments [param]
  const dynamicMatch = trimmed.match(/^\[([^\]]+)\]$/);
  if (dynamicMatch && dynamicMatch[1]) {
    return {
      type: 'dynamic',
      name: `:${dynamicMatch[1]}`,
      paramName: dynamicMatch[1],
      isOptional: false,
      original: name,
    };
  }

  // Static segments
  return {
    type: 'static',
    name: trimmed,
    isOptional: false,
    original: name,
  };
}

/**
 * Parse a group modifier from a group name
 */
export function parseGroupModifier(name: string): GroupModifier {
  const lowerName = name.toLowerCase();

  // Check for permission pattern (perm:resource:action)
  if (lowerName.startsWith('perm:') || lowerName.startsWith('permission:')) {
    const permission = name.split(':').slice(1).join(':');
    return {
      name,
      type: 'permission',
      value: permission,
    };
  }

  // Check for role pattern (role:rolename)
  if (lowerName.startsWith('role:')) {
    const role = name.split(':')[1];
    return {
      name,
      type: 'role',
      value: role,
    };
  }

  // Check for scope pattern (scope:own|team|org)
  if (lowerName.startsWith('scope:')) {
    const scope = name.split(':')[1];
    return {
      name,
      type: 'scope',
      value: scope,
    };
  }

  // Check known patterns
  const modifierType = GROUP_MODIFIER_PATTERNS[lowerName];
  if (modifierType) {
    return {
      name,
      type: modifierType,
      value: modifierType === 'role' ? lowerName : undefined,
    };
  }

  // Default to custom modifier
  return {
    name,
    type: 'custom',
    value: name,
  };
}

/**
 * Classify a file based on its name
 */
export function classifyApiFile(filename: string): ApiFileType {
  const name = filename.replace(/\.(ts|tsx|js|jsx)$/, '').toLowerCase();

  // Private files
  if (name.startsWith('_')) {
    if (name === '_schema') return 'schema';
    if (name === '_middleware') return 'middleware';
    if (name === '_access') return 'access';
    return 'ignored';
  }

  // Test files
  if (name.includes('.test') || name.includes('.spec')) {
    return 'ignored';
  }

  // Index files (collection)
  if (name === 'index') {
    return 'collection';
  }

  // Dynamic segment files (resource)
  if (filename.match(/^\[[^\]]+\]\.(ts|tsx|js|jsx)$/)) {
    return 'resource';
  }

  // Action files
  const baseName = name.replace(/\[.*\]/, '');
  if (ACTION_FILE_METHODS[baseName]) {
    return 'action';
  }

  // Default to collection for other files
  return 'collection';
}

/**
 * Get HTTP methods for a file type and filename
 */
export function getHttpMethods(fileType: ApiFileType, filename: string): readonly HttpMethod[] {
  if (fileType === 'action') {
    const name = filename.replace(/\.(ts|tsx|js|jsx)$/, '').toLowerCase();
    return ACTION_FILE_METHODS[name] ?? ['GET', 'POST'];
  }

  return FILE_TYPE_METHODS[fileType];
}

/**
 * Parse a directory path into API segments
 */
export function parseDirectoryPath(dirPath: string): readonly ParsedApiSegment[] {
  if (!dirPath || dirPath === '.') {
    return [];
  }

  const parts = dirPath.split(/[/\\]/).filter(Boolean);
  return parts.map(parseApiSegment);
}

/**
 * Convert parsed segments to URL path
 */
export function segmentsToUrlPath(
  segments: readonly ParsedApiSegment[],
  baseUrl: string = '/api'
): string {
  const pathParts = segments
    .filter((s) => s.type !== 'group' && s.type !== 'private' && s.name)
    .map((s) => s.name);

  const path = pathParts.join('/');
  return path ? `${baseUrl}/${path}` : baseUrl;
}

/**
 * Extract parameter names from segments
 */
export function extractParamNames(segments: readonly ParsedApiSegment[]): readonly string[] {
  return segments
    .filter((s) => s.paramName)
    .map((s) => s.paramName as string);
}

/**
 * Extract resource name from path segments
 */
export function extractResourceName(segments: readonly ParsedApiSegment[]): string {
  // Find the last static segment before any dynamic segment
  const staticSegments = segments.filter((s) => s.type === 'static');
  const lastStatic = staticSegments[staticSegments.length - 1];
  return lastStatic?.name ?? 'resource';
}

/**
 * Extract parent resource names from nested path
 */
export function extractParentResources(segments: readonly ParsedApiSegment[]): readonly string[] {
  const resources: string[] = [];
  let lastWasStatic = false;

  for (const segment of segments) {
    if (segment.type === 'static') {
      if (lastWasStatic && resources.length > 0) {
        // Skip consecutive static segments (e.g., /api/v1/users)
        continue;
      }
      resources.push(segment.name);
      lastWasStatic = true;
    } else if (segment.type === 'dynamic') {
      lastWasStatic = false;
    }
  }

  // Remove the last resource (it's the current resource, not parent)
  return resources.slice(0, -1);
}

/**
 * Extract group modifiers from segments
 */
export function extractGroupModifiers(
  segments: readonly ParsedApiSegment[]
): readonly GroupModifier[] {
  return segments
    .filter((s) => s.type === 'group' && s.groupModifier)
    .map((s) => s.groupModifier as GroupModifier);
}

// =============================================================================
// File System Scanning
// =============================================================================

/**
 * Check if a file should be ignored based on patterns
 */
function shouldIgnore(filePath: string, ignorePatterns: readonly string[]): boolean {
  for (const pattern of ignorePatterns) {
    const regexPattern = pattern
      .replace(/\*\*/g, '{{GLOBSTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.')
      .replace(/\{\{GLOBSTAR\}\}/g, '.*')
      .replace(/\{([^}]+)\}/g, (_, group) => `(${group.split(',').join('|')})`);

    const regex = new RegExp(regexPattern);
    if (regex.test(filePath)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a file has a valid API extension
 */
function hasValidExtension(filename: string, extensions: readonly string[]): boolean {
  return extensions.some((ext) => filename.endsWith(ext));
}

/**
 * Scan API routes from file system
 *
 * @param rootDir - Root directory to scan
 * @param config - Scanner configuration
 * @returns Array of scanned API routes
 */
export async function scanApiRoutes(
  rootDir: string,
  config: Partial<ApiScannerConfig> = {}
): Promise<ScannedApiRoute[]> {
  const mergedConfig: ApiScannerConfig = {
    ...DEFAULT_API_SCANNER_CONFIG,
    ...config,
  };

  // Dynamic imports for Node.js modules
  const { promises: fs } = await import('fs');
  const path = await import('path');

  const routes: ScannedApiRoute[] = [];
  const schemaFiles = new Set<string>();
  const middlewareFiles = new Set<string>();
  const accessFiles = new Set<string>();

  // First pass: collect metadata files
  async function collectMetadataFiles(dirPath: string): Promise<void> {
    let entries: Awaited<ReturnType<typeof fs.readdir>>;
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const entryName = typeof entry.name === 'string' ? entry.name : String(entry.name);
      const entryPath = path.join(dirPath, entryName);

      if (entry.isDirectory()) {
        await collectMetadataFiles(entryPath);
      } else if (entry.isFile()) {
        const baseName = entryName.replace(/\.(ts|tsx|js|jsx)$/, '').toLowerCase();
        if (baseName === '_schema') {
          schemaFiles.add(path.dirname(entryPath));
        } else if (baseName === '_middleware') {
          middlewareFiles.add(path.dirname(entryPath));
        } else if (baseName === '_access') {
          accessFiles.add(path.dirname(entryPath));
        }
      }
    }
  }

  // Second pass: scan routes
  async function scanDirectory(
    dirPath: string,
    basePath: string,
    parentSegments: ParsedApiSegment[] = []
  ): Promise<void> {
    let entries: Awaited<ReturnType<typeof fs.readdir>>;
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
        if (shouldIgnore(`${relativePath}/`, mergedConfig.ignorePatterns)) {
          continue;
        }

        // Parse directory segment
        const segment = parseApiSegment(entryName);
        if (segment.type === 'private' && !['_schema', '_middleware', '_access'].includes(entryName.toLowerCase())) {
          continue; // Skip private directories
        }

        // Recurse into subdirectory
        await scanDirectory(entryPath, basePath, [...parentSegments, segment]);
      } else if (entry.isFile()) {
        // Check extension
        if (!hasValidExtension(entryName, mergedConfig.extensions)) {
          continue;
        }

        // Skip ignored files
        if (shouldIgnore(relativePath, mergedConfig.ignorePatterns)) {
          continue;
        }

        // Classify file
        const fileType = mergedConfig.classifyFile
          ? mergedConfig.classifyFile(entryName)
          : classifyApiFile(entryName);

        // Skip non-route files
        if (fileType === 'schema' || fileType === 'middleware' || fileType === 'access' || fileType === 'ignored') {
          continue;
        }

        // Parse file segment
        const fileSegment = parseApiSegment(entryName.replace(/\.(ts|tsx|js|jsx)$/, ''));
        const allSegments = fileType === 'collection'
          ? parentSegments // index.ts doesn't add to path
          : [...parentSegments, fileSegment];

        // Build route
        const urlPath = segmentsToUrlPath(allSegments, mergedConfig.baseUrl);
        const httpMethods = getHttpMethods(fileType, entryName);
        const paramNames = extractParamNames(allSegments);
        const resourceName = extractResourceName(allSegments);
        const parentResources = extractParentResources(allSegments);
        const groupModifiers = extractGroupModifiers(allSegments);
        const routeDir = path.dirname(entryPath);

        const route: ScannedApiRoute = {
          filePath: entryPath,
          relativePath,
          urlPath,
          segments: allSegments,
          httpMethods,
          fileType,
          paramNames,
          resourceName,
          parentResources,
          groupModifiers,
          hasSchema: schemaFiles.has(routeDir),
          hasMiddleware: middlewareFiles.has(routeDir),
          hasAccessOverride: accessFiles.has(routeDir),
          depth: allSegments.filter((s) => s.type !== 'group').length,
        };

        routes.push(route);
      }
    }
  }

  // Collect metadata first
  await collectMetadataFiles(rootDir);

  // Then scan routes
  await scanDirectory(rootDir, rootDir);

  // Sort routes for consistent ordering
  return routes.sort((a, b) => {
    // Sort by depth first
    if (a.depth !== b.depth) return a.depth - b.depth;
    // Then by URL path
    return a.urlPath.localeCompare(b.urlPath);
  });
}

// =============================================================================
// Scanner Cache
// =============================================================================

interface ApiScannerCacheEntry {
  routes: ScannedApiRoute[];
  timestamp: number;
}

const scannerCache = new Map<string, ApiScannerCacheEntry>();

/**
 * Get cache key for configuration
 */
function getCacheKey(rootDir: string, config: ApiScannerConfig): string {
  return `${rootDir}:${JSON.stringify({
    extensions: config.extensions,
    ignorePatterns: config.ignorePatterns,
    baseUrl: config.baseUrl,
  })}`;
}

/**
 * Scan API routes with caching
 */
export async function scanApiRoutesCached(
  rootDir: string,
  config: Partial<ApiScannerConfig> = {},
  maxAge: number = 5000
): Promise<ScannedApiRoute[]> {
  const mergedConfig: ApiScannerConfig = {
    ...DEFAULT_API_SCANNER_CONFIG,
    ...config,
  };

  if (!mergedConfig.cacheResults) {
    return scanApiRoutes(rootDir, mergedConfig);
  }

  const cacheKey = getCacheKey(rootDir, mergedConfig);
  const cached = scannerCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < maxAge) {
    return cached.routes;
  }

  const routes = await scanApiRoutes(rootDir, mergedConfig);
  scannerCache.set(cacheKey, { routes, timestamp: Date.now() });

  return routes;
}

/**
 * Clear scanner cache
 */
export function clearApiScannerCache(): void {
  scannerCache.clear();
}

/**
 * Invalidate cache for specific directory
 */
export function invalidateApiScannerCache(rootDir: string): void {
  for (const key of scannerCache.keys()) {
    if (key.startsWith(rootDir)) {
      scannerCache.delete(key);
    }
  }
}

// =============================================================================
// Scanner Statistics
// =============================================================================

/**
 * Scanner statistics
 */
export interface ApiScannerStats {
  /** Total routes discovered */
  readonly totalRoutes: number;
  /** Routes by HTTP method */
  readonly routesByMethod: Record<HttpMethod, number>;
  /** Routes by file type */
  readonly routesByFileType: Record<ApiFileType, number>;
  /** Routes with schema files */
  readonly routesWithSchema: number;
  /** Routes with middleware */
  readonly routesWithMiddleware: number;
  /** Routes with access override */
  readonly routesWithAccessOverride: number;
  /** Maximum depth */
  readonly maxDepth: number;
  /** Unique resources */
  readonly uniqueResources: readonly string[];
  /** Group modifiers used */
  readonly groupModifiers: readonly string[];
}

/**
 * Calculate statistics for scanned routes
 */
export function calculateApiScannerStats(routes: ScannedApiRoute[]): ApiScannerStats {
  const routesByMethod: Record<HttpMethod, number> = {
    GET: 0,
    POST: 0,
    PUT: 0,
    PATCH: 0,
    DELETE: 0,
    HEAD: 0,
    OPTIONS: 0,
  };

  const routesByFileType: Record<ApiFileType, number> = {
    collection: 0,
    resource: 0,
    action: 0,
    schema: 0,
    middleware: 0,
    access: 0,
    ignored: 0,
  };

  const resources = new Set<string>();
  const modifiers = new Set<string>();
  let maxDepth = 0;
  let routesWithSchema = 0;
  let routesWithMiddleware = 0;
  let routesWithAccessOverride = 0;

  for (const route of routes) {
    // Count methods
    for (const method of route.httpMethods) {
      routesByMethod[method]++;
    }

    // Count file types
    routesByFileType[route.fileType]++;

    // Track resources
    resources.add(route.resourceName);
    route.parentResources.forEach((r) => resources.add(r));

    // Track modifiers
    route.groupModifiers.forEach((m) => modifiers.add(m.name));

    // Track depth
    if (route.depth > maxDepth) {
      maxDepth = route.depth;
    }

    // Track metadata
    if (route.hasSchema) routesWithSchema++;
    if (route.hasMiddleware) routesWithMiddleware++;
    if (route.hasAccessOverride) routesWithAccessOverride++;
  }

  return {
    totalRoutes: routes.length,
    routesByMethod,
    routesByFileType,
    routesWithSchema,
    routesWithMiddleware,
    routesWithAccessOverride,
    maxDepth,
    uniqueResources: Array.from(resources).sort(),
    groupModifiers: Array.from(modifiers).sort(),
  };
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for ScannedApiRoute
 */
export function isScannedApiRoute(value: unknown): value is ScannedApiRoute {
  return (
    typeof value === 'object' &&
    value !== null &&
    'filePath' in value &&
    'urlPath' in value &&
    'httpMethods' in value &&
    'fileType' in value
  );
}

/**
 * Type guard for GroupModifier
 */
export function isGroupModifier(value: unknown): value is GroupModifier {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'type' in value
  );
}
