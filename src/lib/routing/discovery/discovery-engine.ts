/**
 * @file Route Discovery Engine
 * @description Main orchestrator for the route discovery system. Coordinates scanning,
 * path extraction, transformation, and validation into a unified discovery pipeline.
 *
 * @module @/lib/routing/discovery/discovery-engine
 *
 * This module provides:
 * - Unified discovery pipeline orchestration
 * - Configurable discovery strategies
 * - Event-driven discovery process
 * - Validation and conflict detection
 * - Code generation integration
 * - Caching and incremental updates
 *
 * @example
 * ```typescript
 * import { DiscoveryEngine, createDiscoveryEngine } from '@/lib/routing/discovery/discovery-engine';
 *
 * const engine = createDiscoveryEngine({
 *   rootDir: process.cwd(),
 *   scanPaths: ['src/routes', 'src/features'],
 * });
 *
 * const result = await engine.discover();
 * console.log(`Discovered ${result.routes.length} routes`);
 * ```
 */

import {
  type AutoScanner,
  createAutoScanner,
  type AutoScannerConfig,
  type ScanResult,
} from './auto-scanner';
import {
  type RouteTransformer,
  createRouteTransformer,
  type TransformerConfig,
  type TransformedRoute,
  type TransformResult,
} from './route-transformer';
import {
  validatePathPattern,
  type PathExtractorConfig,
} from './path-extractor';
import { splitPath } from '../core/path-utils';

// =============================================================================
// Types
// =============================================================================

/**
 * Discovery engine configuration
 */
export interface DiscoveryEngineConfig {
  /** Root directory for discovery */
  readonly rootDir: string;
  /** Scanner configuration */
  readonly scanner?: Partial<AutoScannerConfig>;
  /** Transformer configuration */
  readonly transformer?: Partial<TransformerConfig>;
  /** Path extractor configuration */
  readonly extractor?: Partial<PathExtractorConfig>;
  /** Enable validation during discovery */
  readonly validate?: boolean;
  /** Enable conflict detection */
  readonly detectConflicts?: boolean;
  /** Enable code generation */
  readonly generateCode?: boolean;
  /** Output directory for generated code */
  readonly outputDir?: string;
  /** Event handlers for discovery lifecycle */
  readonly handlers?: DiscoveryHandlers;
  /** Feature flag for discovery engine */
  readonly featureFlag?: string;
}

/**
 * Discovery lifecycle event handlers
 */
export interface DiscoveryHandlers {
  /** Called before scanning starts */
  readonly onScanStart?: () => void | Promise<void>;
  /** Called after scanning completes */
  readonly onScanComplete?: (result: ScanResult) => void | Promise<void>;
  /** Called before transformation starts */
  readonly onTransformStart?: () => void | Promise<void>;
  /** Called after transformation completes */
  readonly onTransformComplete?: (result: TransformResult) => void | Promise<void>;
  /** Called when a route is discovered */
  readonly onRouteDiscovered?: (route: TransformedRoute) => void | Promise<void>;
  /** Called when validation errors occur */
  readonly onValidationError?: (errors: readonly ValidationError[]) => void | Promise<void>;
  /** Called when conflicts are detected */
  readonly onConflict?: (conflicts: readonly RouteConflict[]) => void | Promise<void>;
  /** Called when discovery completes */
  readonly onComplete?: (result: DiscoveryResult) => void | Promise<void>;
  /** Called when an error occurs */
  readonly onError?: (error: Error) => void | Promise<void>;
}

/**
 * Validation error in discovered routes
 */
export interface ValidationError {
  /** Error type */
  readonly type: 'invalid-path' | 'invalid-segment' | 'missing-export' | 'invalid-param';
  /** Route that caused the error */
  readonly routeId: string;
  /** File path */
  readonly filePath: string;
  /** Error message */
  readonly message: string;
  /** Error details */
  readonly details?: Record<string, unknown>;
}

/**
 * Route conflict between discovered routes
 */
export interface RouteConflict {
  /** Conflict type */
  readonly type: 'exact-duplicate' | 'param-conflict' | 'catch-all-shadow' | 'ambiguous';
  /** Routes involved in conflict */
  readonly routes: readonly TransformedRoute[];
  /** Path pattern where conflict occurs */
  readonly path: string;
  /** Conflict severity */
  readonly severity: 'error' | 'warning';
  /** Conflict message */
  readonly message: string;
  /** Suggested resolution */
  readonly suggestion?: string;
}

/**
 * Complete discovery result
 */
export interface DiscoveryResult {
  /** Discovered and transformed routes */
  readonly routes: readonly TransformedRoute[];
  /** Route tree structure */
  readonly tree: TransformResult['tree'];
  /** Scan result */
  readonly scan: ScanResult;
  /** Transform result */
  readonly transform: TransformResult;
  /** Validation errors (if validation enabled) */
  readonly validationErrors: readonly ValidationError[];
  /** Route conflicts (if conflict detection enabled) */
  readonly conflicts: readonly RouteConflict[];
  /** Generated code (if code generation enabled) */
  readonly generatedCode?: GeneratedCode;
  /** Discovery statistics */
  readonly stats: DiscoveryStats;
  /** Discovery timestamp */
  readonly timestamp: number;
}

/**
 * Generated code from discovery
 */
export interface GeneratedCode {
  /** Route configuration code */
  readonly routeConfig: string;
  /** Type definitions */
  readonly typeDefinitions: string;
  /** Route manifest */
  readonly manifest: string;
}

/**
 * Discovery statistics
 */
export interface DiscoveryStats {
  /** Total discovery duration (ms) */
  readonly totalDurationMs: number;
  /** Scan duration (ms) */
  readonly scanDurationMs: number;
  /** Transform duration (ms) */
  readonly transformDurationMs: number;
  /** Validation duration (ms) */
  readonly validationDurationMs: number;
  /** Files scanned */
  readonly filesScanned: number;
  /** Routes discovered */
  readonly routesDiscovered: number;
  /** Validation errors count */
  readonly validationErrorCount: number;
  /** Conflicts count */
  readonly conflictCount: number;
}

/**
 * Discovery engine state
 */
export type DiscoveryState =
  | 'idle'
  | 'scanning'
  | 'transforming'
  | 'validating'
  | 'generating'
  | 'complete'
  | 'error';

/**
 * Discovery event types
 */
export type DiscoveryEventType =
  | 'state-change'
  | 'route-discovered'
  | 'validation-error'
  | 'conflict-detected'
  | 'complete'
  | 'error';

/**
 * Discovery event payload
 */
export interface DiscoveryEvent {
  readonly type: DiscoveryEventType;
  readonly timestamp: number;
  readonly data: unknown;
}

/**
 * Discovery event listener
 */
export type DiscoveryEventListener = (event: DiscoveryEvent) => void;

// =============================================================================
// Constants
// =============================================================================

/**
 * Default discovery engine configuration
 */
export const DEFAULT_DISCOVERY_ENGINE_CONFIG: Partial<DiscoveryEngineConfig> = {
  validate: true,
  detectConflicts: true,
  generateCode: false,
};

// =============================================================================
// DiscoveryEngine Class
// =============================================================================

/**
 * Main orchestrator for route discovery
 *
 * @example
 * ```typescript
 * const engine = new DiscoveryEngine({
 *   rootDir: process.cwd(),
 *   scanPaths: ['src/routes'],
 * });
 *
 * // Add event listener
 * engine.on('route-discovered', (event) => {
 *   console.log('Discovered:', event.data);
 * });
 *
 * // Run discovery
 * const result = await engine.discover();
 * ```
 */
export class DiscoveryEngine {
  private readonly config: DiscoveryEngineConfig;
  private readonly scanner: AutoScanner;
  private readonly transformer: RouteTransformer;
  private state: DiscoveryState = 'idle';
  private readonly listeners = new Map<DiscoveryEventType, Set<DiscoveryEventListener>>();
  private lastResult: DiscoveryResult | null = null;

  constructor(config: DiscoveryEngineConfig) {
    this.config = {
      ...DEFAULT_DISCOVERY_ENGINE_CONFIG,
      ...config,
    };

    // Initialize scanner with merged config
    this.scanner = createAutoScanner({
      roots: config.scanner?.roots ?? ['src/routes', 'src/pages'],
      ...config.scanner,
    });

    // Initialize transformer
    this.transformer = createRouteTransformer({
      basePath: config.rootDir,
      ...config.transformer,
    });
  }

  /**
   * Get current discovery state
   */
  getState(): DiscoveryState {
    return this.state;
  }

  /**
   * Get last discovery result
   */
  getLastResult(): DiscoveryResult | null {
    return this.lastResult;
  }

  /**
   * Add event listener
   */
  on(type: DiscoveryEventType, listener: DiscoveryEventListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    const listenersSet = this.listeners.get(type);
    if (listenersSet) {
      listenersSet.add(listener);
    }

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }

  /**
   * Remove event listener
   */
  off(type: DiscoveryEventType, listener: DiscoveryEventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  /**
   * Emit an event
   */
  private emit(type: DiscoveryEventType, data: unknown): void {
    const event: DiscoveryEvent = {
      type,
      timestamp: Date.now(),
      data,
    };

    const listeners = this.listeners.get(type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error('Discovery event listener error:', error);
        }
      }
    }
  }

  /**
   * Update state and emit state change event
   */
  private setState(newState: DiscoveryState): void {
    const oldState = this.state;
    this.state = newState;
    this.emit('state-change', { oldState, newState });
  }

  /**
   * Run the discovery process
   *
   * @param forceRefresh - Skip cache and perform fresh discovery
   * @returns Discovery result
   */
  async discover(forceRefresh = false): Promise<DiscoveryResult> {
    const startTime = Date.now();
    const validationErrors: ValidationError[] = [];
    const conflicts: RouteConflict[] = [];

    try {
      // Phase 1: Scanning
      this.setState('scanning');
      await this.config.handlers?.onScanStart?.();

      const scanResult = await this.scanner.scan(forceRefresh);
      await this.config.handlers?.onScanComplete?.(scanResult);

      const scanDurationMs = Date.now() - startTime;

      // Phase 2: Transformation
      this.setState('transforming');
      const transformStartTime = Date.now();
      await this.config.handlers?.onTransformStart?.();

      const transformResult = await this.transformer.transform(scanResult.files);
      await this.config.handlers?.onTransformComplete?.(transformResult);

      // Emit route discovered events
      for (const route of transformResult.routes) {
        this.emit('route-discovered', route);
        await this.config.handlers?.onRouteDiscovered?.(route);
      }

      const transformDurationMs = Date.now() - transformStartTime;

      // Phase 3: Validation
      let validationDurationMs = 0;
      if (this.config.validate === true) {
        this.setState('validating');
        const validationStartTime = Date.now();

        const errors = this.validateRoutes(transformResult.routes);
        validationErrors.push(...errors);

        if (errors.length > 0) {
          this.emit('validation-error', errors);
          await this.config.handlers?.onValidationError?.(errors);
        }

        validationDurationMs = Date.now() - validationStartTime;
      }

      // Phase 4: Conflict Detection
      if (this.config.detectConflicts === true) {
        const detectedConflicts = this.detectConflicts(transformResult.routes);
        conflicts.push(...detectedConflicts);

        for (const conflict of detectedConflicts) {
          this.emit('conflict-detected', conflict);
          await this.config.handlers?.onConflict?.([conflict]);
        }
      }

      // Phase 5: Code Generation
      let generatedCode: GeneratedCode | undefined;
      if (this.config.generateCode === true) {
        this.setState('generating');
        generatedCode = this.generateCode(transformResult.routes);
      }

      // Build result
      const result: DiscoveryResult = {
        routes: transformResult.routes,
        tree: transformResult.tree,
        scan: scanResult,
        transform: transformResult,
        validationErrors: Object.freeze(validationErrors),
        conflicts: Object.freeze(conflicts),
        generatedCode,
        stats: {
          totalDurationMs: Date.now() - startTime,
          scanDurationMs,
          transformDurationMs,
          validationDurationMs,
          filesScanned: scanResult.stats.totalFiles,
          routesDiscovered: transformResult.routes.length,
          validationErrorCount: validationErrors.length,
          conflictCount: conflicts.length,
        },
        timestamp: Date.now(),
      };

      this.setState('complete');
      this.lastResult = result;

      this.emit('complete', result);
      await this.config.handlers?.onComplete?.(result);

      return result;
    } catch (error) {
      this.setState('error');
      this.emit('error', error);
      await this.config.handlers?.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Validate discovered routes
   */
  private validateRoutes(routes: readonly TransformedRoute[]): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const route of routes) {
      // Validate path pattern
      const pathValidation = validatePathPattern(route.path);
      if (!pathValidation.isValid) {
        for (const error of pathValidation.errors) {
          errors.push({
            type: 'invalid-path',
            routeId: route.id,
            filePath: route.filePath,
            message: error,
          });
        }
      }

      // Validate segments
      for (const segment of route.extracted.segments) {
        if (segment.type === 'dynamic' && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(segment.value)) {
          errors.push({
            type: 'invalid-param',
            routeId: route.id,
            filePath: route.filePath,
            message: `Invalid parameter name: ${segment.value}`,
            details: { segment: segment.raw },
          });
        }
      }
    }

    return errors;
  }

  /**
   * Detect conflicts between routes
   */
  private detectConflicts(routes: readonly TransformedRoute[]): RouteConflict[] {
    const conflicts: RouteConflict[] = [];
    const pathMap = new Map<string, TransformedRoute[]>();

    // Group routes by path
    for (const route of routes) {
      if (route.type === 'layout') continue; // Layouts don't conflict

      const existing = pathMap.get(route.path) ?? [];
      existing.push(route);
      pathMap.set(route.path, existing);
    }

    // Check for exact duplicates
    for (const [path, routeGroup] of pathMap) {
      if (routeGroup.length > 1) {
        conflicts.push({
          type: 'exact-duplicate',
          routes: routeGroup,
          path,
          severity: 'error',
          message: `Multiple routes with path "${path}"`,
          suggestion: 'Remove duplicate route files or rename them',
        });
      }
    }

    // Check for parameter conflicts
    const paramRoutes = routes.filter(r => r.extracted.params.length > 0);
    for (let i = 0; i < paramRoutes.length; i++) {
      for (let j = i + 1; j < paramRoutes.length; j++) {
        const routeA = paramRoutes[i];
        const routeB = paramRoutes[j];

        if (routeA !== undefined && routeB !== undefined && this.doRoutesConflict(routeA, routeB)) {
          conflicts.push({
            type: 'param-conflict',
            routes: [routeA, routeB],
            path: routeA.path,
            severity: 'warning',
            message: `Potential conflict between "${routeA.path}" and "${routeB.path}"`,
            suggestion: 'Ensure routes have distinct static prefixes',
          });
        }
      }
    }

    // Check for catch-all shadowing
    const catchAllRoutes = routes.filter(r => r.extracted.hasCatchAll);
    for (const catchAll of catchAllRoutes) {
      const shadowed = routes.filter(r =>
        r.id !== catchAll.id &&
        r.path.startsWith(catchAll.path.replace('*', ''))
      );

      if (shadowed.length > 0) {
        conflicts.push({
          type: 'catch-all-shadow',
          routes: [catchAll, ...shadowed],
          path: catchAll.path,
          severity: 'warning',
          message: `Catch-all route "${catchAll.path}" may shadow ${shadowed.length} other routes`,
          suggestion: 'Ensure catch-all route is processed last',
        });
      }
    }

    return conflicts;
  }

  /**
   * Check if two routes conflict
   *
   * Uses core splitPath utility for path segmentation.
   */
  private doRoutesConflict(a: TransformedRoute, b: TransformedRoute): boolean {
    const segmentsA = splitPath(a.path);
    const segmentsB = splitPath(b.path);

    // Different lengths = no conflict
    if (segmentsA.length !== segmentsB.length) return false;

    // Check each segment
    for (let i = 0; i < segmentsA.length; i++) {
      const segA = segmentsA[i] ?? '';
      const segB = segmentsB[i] ?? '';

      const isDynamicA = segA.startsWith(':');
      const isDynamicB = segB.startsWith(':');

      // Both static and different = no conflict
      if (!isDynamicA && !isDynamicB && segA !== segB) return false;
    }

    // All segments either match or are dynamic = potential conflict
    return true;
  }

  /**
   * Generate code from discovered routes
   */
  private generateCode(routes: readonly TransformedRoute[]): GeneratedCode {
    // Route configuration
    const imports: string[] = [
      "import { lazy } from 'react';",
      "import type { RouteObject } from 'react-router-dom';",
    ];

    const lazyImports = routes
      .filter(r => r.lazy)
      .map(r => `const ${r.componentName} = lazy(() => import('${r.importPath}'));`);

    const routeObjects = routes
      .filter(r => r.type === 'page' || r.type === 'route')
      .map(r => `  {
    id: '${r.id}',
    path: '${r.path}',
    element: <${r.componentName} />,
    ${r.index ? 'index: true,' : ''}
  }`);

    const routeConfig = `${imports.join('\n')}

${lazyImports.join('\n')}

export const routes: RouteObject[] = [
${routeObjects.join(',\n')}
];`;

    // Type definitions
    const routeIds = routes.map(r => `  | '${r.id}'`).join('\n');
    const routePaths = routes.map(r => `  | '${r.path}'`).join('\n');

    const paramTypes = routes
      .filter(r => r.extracted.params.length > 0)
      .map(r => {
        const params = r.extracted.params
          .map(p => `    ${p}${r.extracted.optionalParams.includes(p) ? '?' : ''}: string;`)
          .join('\n');
        return `  '${r.path}': {\n${params}\n  };`;
      })
      .join('\n');

    const typeDefinitions = `// Auto-generated route types
// DO NOT EDIT - This file is generated by the route discovery engine

export type RouteId =
${routeIds || '  never'};

export type RoutePath =
${routePaths || '  never'};

export interface RouteParams {
${paramTypes || '  // No parametric routes'}
}

export type RouteParamsFor<T extends RoutePath> = T extends keyof RouteParams
  ? RouteParams[T]
  : Record<string, never>;
`;

    // Route manifest
    const manifestEntries = routes.map(r => ({
      id: r.id,
      path: r.path,
      type: r.type,
      index: r.index,
      params: r.extracted.params,
      groups: r.meta.groups,
    }));

    const manifest = JSON.stringify(
      {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        routes: manifestEntries,
      },
      null,
      2
    );

    return {
      routeConfig,
      typeDefinitions,
      manifest,
    };
  }

  /**
   * Clear scanner cache
   */
  clearCache(): void {
    this.scanner.clearCache();
    this.lastResult = null;
  }

  /**
   * Get scanner instance for advanced usage
   */
  getScanner(): AutoScanner {
    return this.scanner;
  }

  /**
   * Get transformer instance for advanced usage
   */
  getTransformer(): RouteTransformer {
    return this.transformer;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new DiscoveryEngine instance
 *
 * @param config - Engine configuration
 * @returns Configured DiscoveryEngine
 */
export function createDiscoveryEngine(config: DiscoveryEngineConfig): DiscoveryEngine {
  return new DiscoveryEngine(config);
}

/**
 * Run a one-shot discovery (convenience function)
 *
 * @param rootDir - Root directory to scan
 * @param options - Discovery options
 * @returns Discovery result
 */
export async function discoverRoutes(
  rootDir: string,
  options: Partial<Omit<DiscoveryEngineConfig, 'rootDir'>> = {}
): Promise<DiscoveryResult> {
  const engine = new DiscoveryEngine({
    rootDir,
    ...options,
  });
  return engine.discover();
}

// =============================================================================
// Singleton Instance
// =============================================================================

let defaultEngine: DiscoveryEngine | null = null;

/**
 * Get or create the default discovery engine
 *
 * @param config - Configuration for default engine (only used on first call)
 * @returns Default discovery engine instance
 */
export function getDiscoveryEngine(
  config?: DiscoveryEngineConfig
): DiscoveryEngine {
  if (!defaultEngine && config) {
    defaultEngine = new DiscoveryEngine(config);
  }
  if (!defaultEngine) {
    throw new Error('Discovery engine not initialized. Call with config first.');
  }
  return defaultEngine;
}

/**
 * Initialize the default discovery engine
 *
 * @param config - Engine configuration
 */
export function initDiscoveryEngine(config: DiscoveryEngineConfig): void {
  defaultEngine = new DiscoveryEngine(config);
}

/**
 * Reset the default discovery engine
 */
export function resetDiscoveryEngine(): void {
  defaultEngine = null;
}
