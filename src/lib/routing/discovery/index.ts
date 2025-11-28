/**
 * @file Route Discovery Module Exports
 * @description Unified exports for the automatic route discovery system.
 *
 * @module @/lib/routing/discovery
 *
 * This module provides enterprise-grade automatic route discovery including:
 * - File system scanning with glob patterns
 * - Path extraction and parameter parsing
 * - Route transformation and code generation
 * - Watch mode for hot-reloading in development
 *
 * @example
 * ```typescript
 * import {
 *   DiscoveryEngine,
 *   createDiscoveryEngine,
 *   discoverRoutes,
 * } from '@/lib/routing/discovery';
 *
 * // Quick discovery
 * const result = await discoverRoutes(process.cwd());
 *
 * // Or with full control
 * const engine = createDiscoveryEngine({
 *   rootDir: process.cwd(),
 *   scanner: { roots: ['src/routes'] },
 * });
 * const routes = await engine.discover();
 * ```
 */

// =============================================================================
// Auto Scanner
// =============================================================================

export {
  // Classes
  AutoScanner,

  // Factory functions
  createAutoScanner,
  createNextJsAppScanner,
  createRemixScanner,

  // Singleton access
  getAutoScanner,
  resetAutoScanner,

  // Utility functions
  classifyFileType,
  globToRegex,
  matchesPatterns,

  // Constants
  DEFAULT_SCANNER_CONFIG,

  // Types
  type RouteFileType,
  type DiscoveredFile,
  type GlobPattern,
  type AutoScannerConfig,
  type ScanResult,
  type ScanStatistics,
  type ScanError,
} from './auto-scanner';

// =============================================================================
// Path Extractor
// =============================================================================

export {
  // Parsing functions
  parseSegment,
  parseSegments,
  segmentsToUrlPath,
  extractPathFromFile,
  extractParamsFromUrl,

  // Hierarchy functions
  buildPathTree,
  findCommonAncestor,
  isChildPath,
  getRelativePath,

  // Validation functions
  validatePathPattern,
  comparePathSpecificity,

  // Constants
  DEFAULT_EXTRACTOR_CONFIG,

  // Types
  type SegmentType,
  type ParsedSegment,
  type SegmentConstraint,
  type ExtractedPath,
  type PathExtractorConfig,
  type PathNode,
} from './path-extractor';

// =============================================================================
// Route Transformer
// =============================================================================

export {
  // Classes
  RouteTransformer,

  // Factory functions
  createRouteTransformer,
  transformRoutes,

  // Code generation
  generateRouteConfig,
  generateRouteTypes,

  // Constants
  DEFAULT_TRANSFORMER_CONFIG,

  // Types
  type TransformedRoute,
  type TransformedRouteMeta,
  type TransformerConfig,
  type RouteTreeNode,
  type TransformResult,
  type TransformStats,
  type TransformWarning,
} from './route-transformer';

// =============================================================================
// Discovery Engine
// =============================================================================

export {
  // Classes
  DiscoveryEngine,

  // Factory functions
  createDiscoveryEngine,
  discoverRoutes,

  // Singleton access
  getDiscoveryEngine,
  initDiscoveryEngine,
  resetDiscoveryEngine,

  // Constants
  DEFAULT_DISCOVERY_ENGINE_CONFIG,

  // Types
  type DiscoveryEngineConfig,
  type DiscoveryHandlers,
  type ValidationError,
  type RouteConflict,
  type DiscoveryResult,
  type GeneratedCode,
  type DiscoveryStats,
  type DiscoveryState,
  type DiscoveryEventType,
  type DiscoveryEvent,
  type DiscoveryEventListener,
} from './discovery-engine';

// =============================================================================
// Watch Mode
// =============================================================================

export {
  // Classes
  WatchMode,

  // Factory functions
  createWatchMode,
  createHMRUpdater,
  createVitePlugin,

  // Singleton access
  getWatchMode,
  initWatchMode,
  resetWatchMode,

  // Constants
  DEFAULT_WATCH_MODE_CONFIG,

  // Types
  type WatchModeConfig,
  type FileChangeEvent,
  type WatchModeState,
  type WatchModeStats,
  type HMRUpdateHandler,
  type VitePluginConfig,
} from './watch-mode';
