/**
 * @file Routing Module Exports
 * @description Unified exports for the routing system including auto-discovery,
 * type-safe builders, conflict detection, and router factory
 */

// =============================================================================
// Core Reusable Utilities (Framework-Agnostic)
// =============================================================================
export {
  // Path Building
  buildPath as coreBuildPath,
  buildQueryString,
  parseQueryString,

  // Parameter extraction
  extractParamNames as coreExtractParamNames,
  extractRequiredParams as coreExtractRequiredParams,
  extractOptionalParams as coreExtractOptionalParams,
  hasParams as coreHasParams,
  hasDynamicSegments as coreHasDynamicSegments,
  hasCatchAll,

  // Pattern matching
  matchPathPattern,
  parsePathParams,

  // Path utilities
  getStaticPrefix as coreGetStaticPrefix,
  normalizePath,
  joinPath,
  splitPath,
  getPathDepth,
  isChildPath,
  getParentPath as coreGetParentPath,
  getLastSegment,

  // Specificity
  getPatternSpecificity,
  comparePatternSpecificity,

  // Type System - Runtime helpers
  createBuilder,
  createRegistry,
  validateParams,

  // Segment Parsing
  DEFAULT_SEGMENT_PARSER_CONFIG,
  parseRouteSegment as coreParseRouteSegment,
  parseDirectoryPath as coreParseDirectoryPath,
  segmentsToUrlPath as coreSegmentsToUrlPath,
  isDynamicSegment as coreIsDynamicSegmentFn,
  isUrlSegment,
  extractSegmentParams,
  generateRouteId as coreGenerateRouteId,
  generateDisplayName as coreGenerateDisplayName,
  calculateSegmentDepth,
  hasLayoutSegment,
  isIndexRoute,

  // Conflict Detection
  detectConflicts,
  findExactDuplicates,
  findDynamicShadows,
  findAmbiguousRoutes,
  findCatchAllConflicts,
  findNestedDynamicConflicts as coreFindNestedDynamicConflicts,
  findDeepNestingWarnings as coreFindDeepNestingWarnings,
  findIndexLayoutConflicts as coreFindIndexLayoutConflicts,
  generateConflictReport,
  calculateRouteSpecificity as coreCalculateRouteSpecificity,
  sortBySpecificity,
  validateRoutes as coreValidateRoutes,
  areRoutesValid as coreAreRoutesValid,
} from './core';

export type {
  // Path Types
  ExtractRequiredParams as CoreExtractRequiredParams,
  ExtractOptionalParams as CoreExtractOptionalParams,
  ExtractRouteParams,
  HasParams as CoreHasParams,
  RequiresParams,
  HasOnlyOptionalParams,
  ParamsFor as CoreParamsFor,
  ExtractSegments as CoreExtractSegments,
  RouteDepth as CoreRouteDepth,
  IsChildRoute as CoreIsChildRoute,
  GetParentPath as CoreGetParentPath,
  IsDynamicSegment as CoreIsDynamicSegment,
  IsOptionalSegment as CoreIsOptionalSegment,
  IsCatchAllSegment as CoreIsCatchAllSegment,
  RouteBuilder as CoreRouteBuilder,
  TypedRouteRegistry as CoreTypedRouteRegistry,
  TypedLinkProps as CoreTypedLinkProps,
  TypedNavigate as CoreTypedNavigate,
  BuildPath,
  TypedRouteMap as CoreTypedRouteMap,
  InferRouteTypes as CoreInferRouteTypes,
  MergeRoutes as CoreMergeRoutes,
  Prettify,
  PartialBy,
  RoutePathFromId as CoreRoutePathFromId,
  ParamNames as CoreParamNames,
  ParamCount as CoreParamCount,

  // Segment Parser Types
  RouteSegmentType as CoreRouteSegmentType,
  ParsedRouteSegment as CoreParsedRouteSegment,
  SegmentParserConfig,

  // Conflict Detection Types
  RouteForConflictDetection,
  ConflictType,
  ConflictSeverity,
  RouteConflict as CoreRouteConflict,
  ConflictDetectionResult as CoreConflictDetectionResult,
  ConflictDetectionOptions,
} from './core';

// =============================================================================
// Legacy Router (for backward compatibility)
// =============================================================================
export { routes, buildPath, buildPathWithQuery, parseQuery } from './routes';
export type { RoutePath, RouteParams, RouteQuery } from './routes';

// =============================================================================
// Linking Components & Navigation Hooks
// =============================================================================
export {
  AppLink,
  AppNavLink,
  appRoutes,
} from './linking';

export type {
  // AppLink types can be inferred from the component props
} from './linking';

// =============================================================================
// Legacy Linking (for backward compatibility)
// =============================================================================
export {
  useTabParam,
  useRouteInfo,
  useRouteNavigate,
  useQueryParams,
  useQueryParam,
} from './routingUtils';

// =============================================================================
// Legacy Loaders
// =============================================================================
export * from './loaders';

// =============================================================================
// New Type System
// =============================================================================
export type {
  // Segment types
  RouteSegmentType,
  ParsedRouteSegment,

  // Parameter extraction types
  ExtractRequiredParams,
  ExtractOptionalParams,
  RouteParams as TypedRouteParams,
  HasParams,
  ParamsFor,

  // Builder types
  RouteBuilder,
  TypedRouteRegistry,

  // Metadata types
  RouteMetadata,
  RouteAccessConfig,

  // Definition types
  RouteDefinition,
  RouteModule,
  LazyRouteModule,

  // Discovery types
  DiscoveredRoute,
  RouteConflict,
  DiscoveryConfig,

  // Router types
  CreateRouterOptions,
  ExtendedRouteObject,
} from './types';

export {
  scanRouteFiles,
  scanRouteFilesCached,
  clearRouteCache,
  invalidateCache,
} from './scanner';

// =============================================================================
// Conflict Detection
// =============================================================================
export type { ConflictDetectionResult } from './conflict-detector';

export {
  detectRouteConflicts,
  sortRoutesBySpecificity,
} from './conflict-detector';

// =============================================================================
// Route Builder
// =============================================================================
export type { RouteImportFn } from './route-builder';

export {
  buildRoutePath,
  createRouteBuilder,
  createRouteBuilders,
  createLazyRoute,
  buildRouteObject,
  buildRouteTree,
  createRouteDefinition,
  createRouteDefinitions,
  matchRoute,
  extractRouteParams,
  generateRouteTypeDefinitions,
  generateRouteRegistry,
} from './route-builder';

// =============================================================================
// Router Factory
// =============================================================================
export type { RouteConfig } from './createRouter';

export {
  createRouter,
  createSimpleRouter,
  DefaultLoading,
  DefaultError,
  DefaultNotFound,
  withSuspense,
  setupPrefetching,
} from './createRouter';

// =============================================================================
// Route Registry
// =============================================================================
export type { RegisteredRoute, RegistryEvent, RegistryListener } from './route-registry';

export {
  routeRegistry,
  RouteRegistry,
  useRouteRegistry,
  useTypedNavigate,
  usePrefetchHandlers,
  useRouteMetadata,
  useNavigationAnalytics,
} from './route-registry';

// =============================================================================
// Route Validation
// =============================================================================
export type {
  ValidationRule,
  ValidationRuleResult,
  ValidationOptions,
  AutoFixResult,
} from './route-validator';

export {
  validateRoute,
  validateAllRoutes,
  generateValidationReport,
  getAutoFixOperations,
  BUILT_IN_RULES,
} from './route-validator';

// =============================================================================
// Advanced Scanner Features
// =============================================================================
export type {
  ParallelScanOptions,
  ScanProgress,
  FileChangeEvent,
  IncrementalScanResult,
} from './scanner';

export {
  scanRouteFilesParallel,
  applyIncrementalChanges,
  calculateDiscoveryStats,
  buildLayoutTree,
} from './scanner';

// =============================================================================
// Advanced Conflict Detection
// =============================================================================
export {
  detectAllConflicts,
  generateFixSuggestions,
} from './conflict-detector';

// =============================================================================
// Advanced Type Utilities
// =============================================================================
export type {
  // Route segment analysis
  ExtractSegments,
  RouteDepth,
  IsChildRoute,
  GetParentPath,
  IsDynamicSegment,
  IsOptionalSegment,
  IsCatchAllSegment,
  StaticSegments,
  DynamicSegments,

  // Validation types
  RouteValidationResult,
  RouteValidationError,
  RouteValidationWarning,
  RouteFixSuggestion,
  RouteErrorCode,
  RouteWarningCode,

  // Middleware types
  RouteMiddleware,
  RouteMiddlewareContext,

  // Prefetch types
  PrefetchStrategy,
  PrefetchPriority,
  RoutePrefetchConfig,

  // Navigation types
  TypedNavigationOptions,
  NavigationResult,

  // Analytics types
  RouteAnalyticsEvent,
  RoutePerformanceMetrics,

  // Discovery result types
  RouteDiscoveryResult,
  RouteLayoutTree,
  RouteLayoutNode,
  RouteDiscoveryStats,
} from './types';

export { DEFAULT_PREFETCH_CONFIG } from './types';

// =============================================================================
// Advanced Discovery Types (from types.ts)
// =============================================================================
export type {
  // Advanced Discovery
  AdvancedDiscoveryConfig,

  // Parallel Routes
  ParallelRouteSlotDefinition,
  ParallelRoutesDefinition,

  // Intercepting Routes
  InterceptionLevelType,
  InterceptingRouteDefinition,

  // Route Guards
  RouteGuardResult,
  RouteGuardContext,
  RouteGuardUser,
  RouteGuardFunction,
  RouteGuardConfig,

  // Route Middleware (advanced)
  RouteMiddlewareFunction,
  RouteMiddlewareContext as AdvancedMiddlewareContext,
  RouteMiddlewareConfig,

  // Route Groups
  RouteGroupDefinition,
  RouteGroupMetadata,

  // Catch-All Routes
  CatchAllRouteDefinition,
  CatchAllRouteComponentProps,

  // Optional Segments
  OptionalSegmentDefinition,
  OptionalSegmentRouteDefinition,

  // Discovery Events
  RouteDiscoveryEventType,
  RouteDiscoveryEvent,
  RouteDiscoveryEventListener,
} from './types';

// =============================================================================
// Discovery Module
// =============================================================================
export {
  // Auto Scanner
  AutoScanner,
  createAutoScanner,
  getAutoScanner,
  resetAutoScanner,
  DEFAULT_SCANNER_CONFIG,
  type AutoScannerConfig,
  type ScanResult,

  // Path Extractor
  DEFAULT_EXTRACTOR_CONFIG,
  type PathExtractorConfig,
  type ExtractedPath,
  type SegmentType as PathSegmentType,

  // Route Transformer
  RouteTransformer,
  createRouteTransformer,
  transformRoutes,
  DEFAULT_TRANSFORMER_CONFIG,
  type TransformerConfig,
  type TransformedRoute,

  // Discovery Engine
  DiscoveryEngine,
  createDiscoveryEngine,
  getDiscoveryEngine,
  initDiscoveryEngine,
  resetDiscoveryEngine,
  type DiscoveryResult,

  // Watch Mode
  WatchMode,
  createWatchMode,
  getWatchMode,
  initWatchMode,
  resetWatchMode,
  DEFAULT_WATCH_MODE_CONFIG,
} from './discovery';

// =============================================================================
// Advanced Routing Module
// =============================================================================
export {
  // Parallel Routes
  ParallelRoutes,
  createParallelRoutes,
  type ParallelRoutesConfig,
  parallel,

  // Intercepting Routes
  InterceptingRouteManager,
  createInterceptingRoute,
  type InterceptingRouteConfig,
  type InterceptionLevel,
  type InterceptionContext,

  // Route Groups
  RouteGroupManager,
  getRouteGroupManager,
  resetRouteGroupManager,
  createRouteGroup,
  type GroupedRoute,

  // Catch-All Routes
  CatchAllRouteManager,
  createCatchAllRoute,
  isCatchAllPattern,

  // Optional Segments
  OptionalSegmentManager,
  getOptionalSegmentManager,
  resetOptionalSegmentManager,
  createOptionalSegment,
  type OptionalSegment,

  // Route Middleware
  createMiddlewareChain,
  getMiddlewareChain,
  resetMiddlewareChain,
  createMiddleware,
  type MiddlewareConfig,
  type MiddlewareFunction,
  type MiddlewareContext,
  type MiddlewareUser,
} from './advanced';

// =============================================================================
// Guards Module
// =============================================================================
export {
  parseReturnUrl,
  pathRequiresAuth,
  isAuthGuard,
  isAuthState,
  DEFAULT_AUTH_CONFIG,
  type AuthGuardConfig,
  type AuthState,

  // Role-Based Guard
  RoleGuard,
  createRoleGuard,
  requireRole,
  requireAnyRole,
  requireAllRoles,
  excludeRoles,
  createAdminGuard,
  hasRole,
  hasAnyRole,
  hasAllRoles,
  getMissingRoles,
  isRoleGuard,
  isRoleCheckResult,
  DEFAULT_ROLE_CONFIG,
  type RoleMatchStrategy,
  type RoleGuardConfig,
  type RoleCheckResult,

  // Permission-Based Guard
  PermissionGuard,
  createPermissionGuard,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireResourcePermission,
  parsePermission,
  buildPermission,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getMissingPermissions,
  isPermissionGuard,
  isPermissionCheckResult,
  isStructuredPermission,
  DEFAULT_PERMISSION_CONFIG,
  PermissionActions,
  type PermissionMatchStrategy,
  type Permission,
  type StructuredPermission,
  type PermissionGuardConfig,
  type PermissionCheckResult,

  // Feature Flag Guard
  FeatureGuard,
  createFeatureGuard,
  requireFeature,
  requireAnyFeature,
  requireAllFeatures,
  deprecatedFeature,
  betaFeature,
  createStaticFlagProvider,
  createLocalStorageFlagProvider,
  createUrlFlagProvider,
  combineFlagProviders,
  isFeatureGuard,
  isFeatureFlagCheckResult,
  DEFAULT_FEATURE_CONFIG,
  type FeatureFlagMatchStrategy,
  type FeatureFlagState,
  type FeatureFlagProvider,
  type FeatureGuardConfig,
  type FeatureFlagCheckResult,

  // Composite Guard
  CompositeGuard,
  createCompositeGuard,
  allGuards,
  anyGuard,
  sequentialGuards,
  parallelGuards,
  combineGuards,
  isCompositeGuard,
  isCompositeExecutionResult,
  DEFAULT_COMPOSITE_CONFIG,
  type CompositeStrategy,
  type CompositeGuardConfig,
  type CompositeExecutionResult,

  // Guard Resolver
  GuardResolver,
  createGuardResolver,
  getGuardResolver,
  initGuardResolver,
  resetGuardResolver,
  isGuardResolutionResult,
  isNavigationIntent,
  DEFAULT_RESOLVER_CONFIG,
  type GuardResolverConfig,
  type GuardRegistrationOptions,
  type GuardResolutionResult,
  type RegisteredGuard,
  type NavigationIntent,
  type GuardResolverState,
} from './guards';
