/**
 * @file Route Transformer
 * @description Transforms discovered file paths into route configuration objects.
 * Handles conversion from file-system conventions to React Router compatible route definitions.
 *
 * @module @/lib/routing/discovery/route-transformer
 *
 * This module provides:
 * - File path to route config transformation
 * - Route tree building from flat file list
 * - Layout hierarchy resolution
 * - Lazy loading wrapper generation
 * - Route metadata enrichment
 *
 * @example
 * ```typescript
 * import { RouteTransformer, transformRoutes } from '@/lib/routing/discovery/route-transformer';
 *
 * const transformer = new RouteTransformer({
 *   basePath: 'src/routes',
 *   lazy: true,
 * });
 *
 * const routes = await transformer.transform(discoveredFiles);
 * ```
 */

import type { DiscoveredFile, RouteFileType } from './auto-scanner';
import { extractPathFromFile, type ExtractedPath } from './path-extractor';

// =============================================================================
// Types
// =============================================================================

/**
 * Transformed route configuration
 */
export interface TransformedRoute {
  /** Unique route identifier */
  readonly id: string;
  /** URL path pattern */
  readonly path: string;
  /** Original file path */
  readonly filePath: string;
  /** Whether route is lazy loaded */
  readonly lazy: boolean;
  /** Route import path for lazy loading */
  readonly importPath: string;
  /** Route component name */
  readonly componentName: string;
  /** Child routes */
  readonly children: readonly TransformedRoute[];
  /** Parent layout route ID (if any) */
  readonly layoutId: string | null;
  /** Route metadata */
  readonly meta: TransformedRouteMeta;
  /** Route type */
  readonly type: RouteFileType;
  /** Whether this is an index route */
  readonly index: boolean;
  /** Extracted path information */
  readonly extracted: ExtractedPath;
}

/**
 * Route metadata attached to transformed routes
 */
export interface TransformedRouteMeta {
  /** Page title template */
  readonly title?: string;
  /** SEO description */
  readonly description?: string;
  /** Whether route requires authentication */
  readonly requiresAuth?: boolean;
  /** Required roles */
  readonly roles?: readonly string[];
  /** Required permissions */
  readonly permissions?: readonly string[];
  /** Feature flag dependency */
  readonly featureFlag?: string;
  /** Route groups */
  readonly groups: readonly string[];
  /** Parallel slots */
  readonly parallelSlots: readonly string[];
  /** Custom metadata from file exports */
  readonly custom?: Record<string, unknown>;
}

/**
 * Route transformer configuration
 */
export interface TransformerConfig {
  /** Base path for route files */
  readonly basePath: string;
  /** Enable lazy loading for routes */
  readonly lazy: boolean;
  /** Custom import path resolver */
  readonly resolveImportPath?: (filePath: string) => string;
  /** Custom route ID generator */
  readonly generateId?: (filePath: string, extracted: ExtractedPath) => string;
  /** Custom component name generator */
  readonly generateComponentName?: (filePath: string) => string;
  /** Metadata extractor from file content */
  readonly extractMeta?: (filePath: string) => Promise<Partial<TransformedRouteMeta>>;
  /** Whether to include error boundaries */
  readonly includeErrorBoundaries?: boolean;
  /** Whether to include loading states */
  readonly includeLoadingStates?: boolean;
  /** Feature flag for transformer */
  readonly featureFlag?: string;
}

/**
 * Route tree node for hierarchical representation
 */
export interface RouteTreeNode {
  /** Route at this node */
  readonly route: TransformedRoute;
  /** Child nodes */
  readonly children: readonly RouteTreeNode[];
  /** Layout node (if this is wrapped by a layout) */
  readonly layout: RouteTreeNode | null;
  /** Parallel route slots */
  readonly slots: ReadonlyMap<string, RouteTreeNode>;
}

/**
 * Transformation result with statistics
 */
export interface TransformResult {
  /** Transformed routes as flat list */
  readonly routes: readonly TransformedRoute[];
  /** Routes organized as tree */
  readonly tree: readonly RouteTreeNode[];
  /** Transformation statistics */
  readonly stats: TransformStats;
  /** Any warnings during transformation */
  readonly warnings: readonly TransformWarning[];
}

/**
 * Transformation statistics
 */
export interface TransformStats {
  /** Total routes transformed */
  readonly totalRoutes: number;
  /** Number of lazy routes */
  readonly lazyRoutes: number;
  /** Number of layout routes */
  readonly layoutRoutes: number;
  /** Number of index routes */
  readonly indexRoutes: number;
  /** Maximum nesting depth */
  readonly maxDepth: number;
  /** Routes with parameters */
  readonly parametricRoutes: number;
  /** Transformation duration (ms) */
  readonly durationMs: number;
}

/**
 * Warning generated during transformation
 */
export interface TransformWarning {
  /** Warning type */
  readonly type: 'missing-layout' | 'orphan-route' | 'duplicate-path' | 'deep-nesting' | 'naming';
  /** File path that caused warning */
  readonly filePath: string;
  /** Warning message */
  readonly message: string;
  /** Suggested fix */
  readonly suggestion?: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default transformer configuration
 */
export const DEFAULT_TRANSFORMER_CONFIG: TransformerConfig = {
  basePath: 'src/routes',
  lazy: true,
  includeErrorBoundaries: true,
  includeLoadingStates: true,
};

/**
 * Maximum recommended nesting depth
 */
const MAX_RECOMMENDED_DEPTH = 5;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a route ID from file path
 *
 * @param _filePath - File path (unused, kept for signature compatibility)
 * @param extracted - Extracted path information
 * @returns Unique route ID
 */
function defaultGenerateId(_filePath: string, extracted: ExtractedPath): string {
  // Create ID from URL path
  const {urlPath} = extracted;
  if (urlPath === '/') return 'INDEX';

  return urlPath
    .replace(/^\//, '')
    .replace(/\//g, '_')
    .replace(/:/g, 'BY_')
    .replace(/\?/g, '_OPT')
    .replace(/\*/g, 'CATCH_ALL')
    .toUpperCase();
}

/**
 * Generate a component name from file path
 *
 * @param filePath - File path
 * @returns PascalCase component name
 */
function defaultGenerateComponentName(filePath: string): string {
  const parts = filePath
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean);

  // Get the last meaningful segment
  let name = parts.pop() ?? 'Route';

  // Remove extension
  name = name.replace(/\.(tsx?|jsx?)$/, '');

  // Skip common names
  const commonNames = ['page', 'index', 'layout', '_layout', '_index'];
  if (name !== null && name !== undefined && name !== '' && commonNames.includes(name)) {
    name = parts.pop() ?? 'Route';
  }

  // Convert to PascalCase
  return `${name
    .replace(/[[\]()@.]/g, '')
    .replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^(\w)/, (_, c) => c.toUpperCase())
     }Route`;
}

/**
 * Default import path resolver
 *
 * @param filePath - File path
 * @param basePath - Base path for routes
 * @returns Import path string
 */
function defaultResolveImportPath(filePath: string, basePath: string): string {
  // Normalize paths
  const normalized = filePath.replace(/\\/g, '/');
  const base = basePath.replace(/\\/g, '/');

  // Make relative to base
  if (normalized.startsWith(base)) {
    const relative = normalized.slice(base.length).replace(/^\//, '');
    return `@/routes/${relative.replace(/\.(tsx?|jsx?)$/, '')}`;
  }

  // Fall back to absolute-ish import
  return `@/${normalized.replace(/\.(tsx?|jsx?)$/, '')}`;
}

/**
 * Sort routes by specificity for proper matching
 *
 * @param routes - Routes to sort
 * @returns Sorted routes (most specific first)
 */
function sortRoutesBySpecificity(routes: TransformedRoute[]): TransformedRoute[] {
  return [...routes].sort((a, b) => {
    // Index routes last within same parent
    if (a.index && !b.index) return 1;
    if (!a.index && b.index) return -1;

    // Catch-all routes last
    if (a.extracted.hasCatchAll && !b.extracted.hasCatchAll) return 1;
    if (!a.extracted.hasCatchAll && b.extracted.hasCatchAll) return -1;

    // More static segments = more specific
    const staticA = a.extracted.segments.filter(s => s.type === 'static').length;
    const staticB = b.extracted.segments.filter(s => s.type === 'static').length;
    if (staticA !== staticB) return staticB - staticA;

    // Fewer dynamic segments = more specific
    const dynamicA = a.extracted.params.length;
    const dynamicB = b.extracted.params.length;
    if (dynamicA !== dynamicB) return dynamicA - dynamicB;

    // Alphabetical as tiebreaker
    return a.path.localeCompare(b.path);
  });
}

// =============================================================================
// RouteTransformer Class
// =============================================================================

/**
 * Transforms discovered files into route configurations
 *
 * @example
 * ```typescript
 * const transformer = new RouteTransformer({
 *   basePath: 'src/routes',
 *   lazy: true,
 * });
 *
 * const result = await transformer.transform(files);
 * console.log(`Transformed ${result.stats.totalRoutes} routes`);
 * ```
 */
export class RouteTransformer {
  private readonly config: TransformerConfig;

  constructor(config: Partial<TransformerConfig> = {}) {
    this.config = {
      ...DEFAULT_TRANSFORMER_CONFIG,
      ...config,
    };
  }

  /**
   * Transform discovered files into route configurations
   *
   * @param files - Discovered files from scanner
   * @returns Transformation result
   */
  async transform(files: readonly DiscoveredFile[]): Promise<TransformResult> {
    const startTime = Date.now();
    const warnings: TransformWarning[] = [];
    const routes: TransformedRoute[] = [];
    const layoutMap = new Map<string, TransformedRoute>();

    // First pass: transform all files
    for (const file of files) {
      const route = await this.transformFile(file);
      routes.push(route);

      // Track layouts
      if (file.fileType === 'layout') {
        const layoutPath = file.directory || '/';
        layoutMap.set(layoutPath, route);
      }
    }

    // Second pass: assign layouts and check for warnings
    for (const route of routes) {
      if (route.type !== 'layout') {
        // Find parent layout
        const parentLayout = this.findParentLayout(route, layoutMap);
        if (parentLayout) {
          // Use Object.assign since we need to modify the readonly property
          (route as { layoutId: string | null }).layoutId = parentLayout.id;
        }
      }

      // Check for warnings
      if (route.extracted.depth > MAX_RECOMMENDED_DEPTH) {
        warnings.push({
          type: 'deep-nesting',
          filePath: route.filePath,
          message: `Route has ${route.extracted.depth} levels of nesting (max recommended: ${MAX_RECOMMENDED_DEPTH})`,
          suggestion: 'Consider flattening the route structure or using route groups',
        });
      }
    }

    // Check for duplicate paths
    const pathMap = new Map<string, TransformedRoute[]>();
    for (const route of routes) {
      if (route.type === 'page' || route.type === 'route') {
        const existing = pathMap.get(route.path) || [];
        existing.push(route);
        pathMap.set(route.path, existing);
      }
    }

    for (const [path, duplicates] of pathMap) {
      if (duplicates.length > 1) {
        for (const route of duplicates) {
          warnings.push({
            type: 'duplicate-path',
            filePath: route.filePath,
            message: `Multiple routes match path "${path}"`,
            suggestion: 'Ensure each path has a unique route file',
          });
        }
      }
    }

    // Build tree structure
    const tree = this.buildRouteTree(routes);

    // Calculate stats
    const stats: TransformStats = {
      totalRoutes: routes.length,
      lazyRoutes: routes.filter(r => r.lazy).length,
      layoutRoutes: routes.filter(r => r.type === 'layout').length,
      indexRoutes: routes.filter(r => r.index).length,
      maxDepth: Math.max(0, ...routes.map(r => r.extracted.depth)),
      parametricRoutes: routes.filter(r => r.extracted.params.length > 0).length,
      durationMs: Date.now() - startTime,
    };

    // Sort routes for proper matching order
    const sortedRoutes = sortRoutesBySpecificity(routes);

    return {
      routes: Object.freeze(sortedRoutes),
      tree: Object.freeze(tree),
      stats,
      warnings: Object.freeze(warnings),
    };
  }

  /**
   * Transform a single file into a route
   */
  private async transformFile(file: DiscoveredFile): Promise<TransformedRoute> {
    const extracted = extractPathFromFile(file.relativePath);

    // Generate ID
    const id = this.config.generateId
      ? this.config.generateId(file.absolutePath, extracted)
      : defaultGenerateId(file.absolutePath, extracted);

    // Generate component name
    const componentName = this.config.generateComponentName
      ? this.config.generateComponentName(file.absolutePath)
      : defaultGenerateComponentName(file.relativePath);

    // Resolve import path
    const importPath = this.config.resolveImportPath
      ? this.config.resolveImportPath(file.absolutePath)
      : defaultResolveImportPath(file.relativePath, this.config.basePath);

    // Extract metadata
    let customMeta: Partial<TransformedRouteMeta> = {};
    if (this.config.extractMeta) {
      try {
        customMeta = await this.config.extractMeta(file.absolutePath);
      } catch {
        // Ignore metadata extraction errors
      }
    }

    const meta: TransformedRouteMeta = {
      ...customMeta,
      groups: extracted.groups,
      parallelSlots: extracted.parallelSlots,
    };

    return {
      id,
      path: extracted.urlPath,
      filePath: file.absolutePath,
      lazy: this.config.lazy,
      importPath,
      componentName,
      children: [],
      layoutId: null,
      meta,
      type: file.fileType,
      index: extracted.isIndex,
      extracted,
    };
  }

  /**
   * Find the parent layout for a route
   */
  private findParentLayout(
    route: TransformedRoute,
    layoutMap: Map<string, TransformedRoute>
  ): TransformedRoute | null {
    // Get directory of route file
    const routeDir = route.filePath
      .replace(/\\/g, '/')
      .replace(/\/[^/]+$/, '');

    // Walk up directory tree looking for layout
    let searchDir = routeDir;
    while (searchDir) {
      const layout = layoutMap.get(searchDir);
      if (layout && layout.id !== route.id) {
        return layout;
      }

      // Move up one directory
      const parent = searchDir.replace(/\/[^/]+$/, '');
      if (parent === searchDir) break;
      searchDir = parent;
    }

    // Check root layout
    return layoutMap.get('/') ?? layoutMap.get('') ?? null;
  }

  /**
   * Build hierarchical route tree
   */
  private buildRouteTree(routes: readonly TransformedRoute[]): readonly RouteTreeNode[] {
    const layoutRoutes = routes.filter(r => r.type === 'layout');
    const pageRoutes = routes.filter(r => r.type !== 'layout');
    const nodeMap = new Map<string, RouteTreeNode & { children: RouteTreeNode[] }>();

    // Create nodes for all layouts
    for (const layout of layoutRoutes) {
      nodeMap.set(layout.id, {
        route: layout,
        children: [],
        layout: null,
        slots: new Map(),
      });
    }

    // Create nodes for pages and attach to layouts
    const rootNodes: RouteTreeNode[] = [];

    for (const page of pageRoutes) {
      const node: RouteTreeNode & { children: RouteTreeNode[] } = {
        route: page,
        children: [],
        layout: page.layoutId ? (nodeMap.get(page.layoutId) ?? null) : null,
        slots: new Map(),
      };

      if (page.layoutId) {
        const layoutNode = nodeMap.get(page.layoutId);
        if (layoutNode) {
          layoutNode.children.push(node);
        } else {
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    }

    // Add layout nodes without parents to root
    for (const layoutNode of nodeMap.values()) {
      if (!layoutNode.route.layoutId) {
        rootNodes.push(layoutNode);
      }
    }

    return rootNodes;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new RouteTransformer instance
 *
 * @param config - Transformer configuration
 * @returns Configured RouteTransformer
 */
export function createRouteTransformer(
  config: Partial<TransformerConfig> = {}
): RouteTransformer {
  return new RouteTransformer(config);
}

/**
 * Transform discovered files into route configurations (convenience function)
 *
 * @param files - Discovered files
 * @param config - Transformer configuration
 * @returns Transformation result
 */
export async function transformRoutes(
  files: readonly DiscoveredFile[],
  config: Partial<TransformerConfig> = {}
): Promise<TransformResult> {
  const transformer = new RouteTransformer(config);
  return transformer.transform(files);
}

// =============================================================================
// Code Generation Functions
// =============================================================================

/**
 * Generate route configuration code
 *
 * @param routes - Transformed routes
 * @returns Generated TypeScript code
 */
export function generateRouteConfig(routes: readonly TransformedRoute[]): string {
  const imports: string[] = [];
  const routeConfigs: string[] = [];

  for (const route of routes) {
    if (route.lazy) {
      imports.push(`const ${route.componentName} = lazy(() => import('${route.importPath}'));`);
    } else {
      imports.push(`import { default as ${route.componentName} } from '${route.importPath}';`);
    }

    routeConfigs.push(`  {
    id: '${route.id}',
    path: '${route.path}',
    element: <${route.componentName} />,
    ${route.index ? 'index: true,' : ''}
    ${route.children.length > 0 ? `children: [/* nested routes */],` : ''}
  }`);
  }

  return `// Auto-generated route configuration
import { lazy } from 'react';

${imports.join('\n')}

export const routes = [
${routeConfigs.join(',\n')}
];
`;
}

/**
 * Generate route type definitions
 *
 * @param routes - Transformed routes
 * @returns Generated TypeScript type definitions
 */
export function generateRouteTypes(routes: readonly TransformedRoute[]): string {
  const routeIds = routes.map(r => `'${r.id}'`).join(' | ');
  const routePaths = routes.map(r => `'${r.path}'`).join(' | ');

  const paramTypes: string[] = [];
  for (const route of routes) {
    if (route.extracted.params.length > 0) {
      const params = route.extracted.params
        .map(p => {
          const isOptional = route.extracted.optionalParams.includes(p);
          return `${p}${isOptional ? '?' : ''}: string`;
        })
        .join('; ');
      paramTypes.push(`  '${route.path}': { ${params} };`);
    }
  }

  return `// Auto-generated route types

export type RouteId = ${routeIds || 'never'};

export type RoutePath = ${routePaths || 'never'};

export interface RouteParams {
${paramTypes.join('\n') || '  // No parametric routes'}
}

export type RouteParamsFor<T extends RoutePath> = T extends keyof RouteParams
  ? RouteParams[T]
  : Record<string, never>;
`;
}
