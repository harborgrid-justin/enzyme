/**
 * @file Performance Module Index
 * @description Comprehensive exports for the performance monitoring and optimization system.
 *
 * This module provides a complete performance infrastructure including:
 *
 * 1. **Core Web Vitals Collection** - LCP, INP, CLS, FCP, TTFB tracking
 * 2. **Performance Observatory** - Real-time dashboard and monitoring
 * 3. **Performance Monitor** - Long tasks, memory, frame rate, resources
 * 4. **Performance Budgets** - Configurable limits with automatic degradation
 * 5. **Render Tracker** - Component render time and re-render detection
 * 6. **Network Performance** - Request timing, bandwidth, quality metrics
 * 7. **Predictive Prefetch** - AI-driven navigation prediction
 * 8. **Performance Hooks** - React hooks for performance awareness
 *
 * Core Web Vitals Targets:
 * - LCP: < 2500ms (Largest Contentful Paint)
 * - INP: < 200ms (Interaction to Next Paint)
 * - CLS: < 0.1 (Cumulative Layout Shift)
 * - FCP: < 1800ms (First Contentful Paint)
 * - TTFB: < 800ms (Time to First Byte)
 *
 * @example
 * ```typescript
 * import {
 *   // Initialization
 *   initPerformanceMonitoring,
 *   startPerformanceMonitoring,
 *
 *   // Core monitors
 *   PerformanceMonitor,
 *   PerformanceBudgetManager,
 *   RenderTracker,
 *   NetworkPerformanceAnalyzer,
 *
 *   // React integration
 *   PerformanceProvider,
 *   PerformanceObservatory,
 *   usePerformanceBudget,
 *   useRenderMetrics,
 *   useLongTaskDetector,
 *   useMemoryPressure,
 *   useNetworkQuality,
 * } from '@/lib/performance';
 * ```
 */

// ============================================================================
// Web Vitals Collection
// ============================================================================

export {
  // Core collector
  VitalsCollector,
  getVitalsCollector,
  initVitals,
  // Constants
  DEFAULT_BUDGETS,
  // Utilities
  formatMetricValue,
  getRatingColor,
  getMetricDescription,
  getMetricTarget,
  calculateRating,
  calculateOverallScore,
  ratingToScore,
  scoreToRating,
  // Types
  type VitalMetricName,
  type PerformanceRating,
  type VitalMetricEntry,
  type VitalsSnapshot,
  type PerformanceBudget,
  type BudgetViolation,
  type VitalsReporter,
  type BudgetViolationHandler,
  type VitalsCollectorConfig,
} from './vitals';

// ============================================================================
// Performance Observatory Dashboard
// ============================================================================

export {
  // Provider and Context
  PerformanceProvider,
  PerformanceObservatoryContext,
  usePerformanceObservatory,
  // Dashboard Component
  PerformanceObservatory,
  // Types
  type PerformanceProviderProps,
  type PerformanceObservatoryProps,
  type PerformanceObservatoryContextValue,
  type ResourceStats,
  type LongTaskEntry as ObservatoryLongTaskEntry,
} from './PerformanceObservatory';

// ============================================================================
// Enhanced Performance Monitor
// ============================================================================

export {
  // Core monitor class
  PerformanceMonitor,
  getPerformanceMonitor,
  startPerformanceMonitoring,
  stopPerformanceMonitoring,
  // Types
  type PerformanceEventType,
  type LongTaskAttribution,
  type FrameTimingEntry,
  type MemorySnapshot as MonitorMemorySnapshot,
  type SlowResourceEntry,
  type PerformanceMetrics,
  type PerformanceEventCallback,
  type PerformanceMonitorOptions,
} from './performance-monitor';

// ============================================================================
// Performance Budget System
// ============================================================================

export {
  // Budget manager class
  PerformanceBudgetManager,
  getBudgetManager,
  resetBudgetManager,
  // Utilities
  formatBudgetValue,
  // Constants
  // Types
  type BudgetThreshold,
  type DegradationStrategy,
  type ViolationSeverity,
  type BudgetViolationRecord,
  type BudgetMetricEntry,
  type BudgetTrend,
  type BudgetStatusSummary,
  type DegradationState,
  type BudgetManagerConfig,
} from './performance-budgets';

// ============================================================================
// Render Performance Tracker
// ============================================================================

export {
  // Tracker class
  RenderTracker,
  getRenderTracker,
  trackRender,
  trackInteraction,
  // HOC
  withRenderTracking,
  // Types
  type RenderPhase,
  type RenderReason,
  type RenderEntry,
  type ComponentRenderStats,
  type RenderWaterfallEntry,
  type RenderInteraction,
  type RenderTrackerConfig,
} from './render-tracker';

// ============================================================================
// Network Performance
// ============================================================================

export {
  // Analyzer class
  NetworkPerformanceAnalyzer,
  getNetworkAnalyzer,
  // Convenience functions
  getNetworkQuality as getNetworkQualityMetrics,
  isSlowConnection,
  isDataSaverEnabled,
  getAdaptiveLoadingStrategy,
  // Types
  type ConnectionType,
  type EffectiveConnectionType,
  type RequestTiming,
  type ServerTimingEntry,
  type NetworkQuality,
  type BandwidthMeasurement,
  type RequestPriority,
  type PriorityRecommendation,
  type NetworkStats,
  type NetworkAnalyzerConfig,
} from './network-performance';

// ============================================================================
// Predictive Prefetching (FEATURE 3)
// ============================================================================

export {
  // Engine
  PredictivePrefetchEngine,
  getPredictivePrefetchEngine,
  // React Integration
  createNavigationListener,
  // Types
  type NavigationEvent,
  type PrefetchableRoute,
  type RoutePrediction,
  type PredictivePrefetchConfig,
  type UsePredictivePrefetchOptions,
} from './PredictivePrefetch';

// React hook for predictive prefetch
export {
  usePredictivePrefetch,
  PredictiveLink,
  type UsePredictivePrefetchReturn,
  type PredictiveLinkProps,
} from './usePredictivePrefetch';

// ============================================================================
// Performance Hooks
// ============================================================================

export {
  // Budget hooks
  usePerformanceBudget,
  useBudgetStatus,
  useDegradedMode,
  useBudgetConditional,

  // Render hooks
  useRenderMetrics,
  useRenderPhaseMetrics,
  useRenderProfiler,
  useWastedRenderDetector,

  // Long task hooks
  useLongTaskDetector,
  useDeferredRender,
  useBlockingTimeTracker,
  useYieldToMain,

  // Memory hooks
  useMemoryPressure,
  useMemoryCleanup,
  useMemoryAwareCache,
  useComponentMemoryImpact,

  // Network hooks
  useNetworkQuality,
  useAdaptiveImageQuality,
  useNetworkConditional,
  useNetworkAwareLazyLoad,
  useRequestPerformance,
  useNetworkStatusIndicator,
  usePreconnect,

  // Composite hooks
  usePerformanceAwareness,
  useAdaptiveRender,

  // Types
  type UsePerformanceBudgetOptions,
  type UsePerformanceBudgetReturn,
  type BudgetStatus,
  type UseRenderMetricsOptions,
  type UseRenderMetricsReturn,
  type RenderMetrics,
  type UseLongTaskDetectorOptions,
  type UseLongTaskDetectorReturn,
  type LongTaskStats,
  type UseMemoryPressureOptions,
  type UseMemoryPressureReturn,
  type MemoryPressureLevel,
  type MemoryTrend,
  type UseNetworkQualityOptions,
  type UseNetworkQualityReturn,
  type AdaptiveLoadingStrategy,
} from './hooks';

// ============================================================================
// Quick Start Utilities
// ============================================================================

/**
 * Initialize performance monitoring with sensible defaults.
 * Call this once at app startup.
 *
 * @example
 * ```tsx
 * // In main.tsx or App.tsx
 * import { initPerformanceMonitoring } from '@/lib/performance';
 *
 * const cleanup = await initPerformanceMonitoring({
 *   debug: import.meta.env.DEV,
 *   reportToAnalytics: import.meta.env.PROD,
 * });
 * ```
 */
export async function initPerformanceMonitoring(options: {
  debug?: boolean;
  reportToAnalytics?: boolean;
  analyticsEndpoint?: string;
  sampleRate?: number;
  onVitalMetric?: (metric: import('./vitals').VitalMetricEntry) => void;
  onBudgetViolation?: (violation: import('./performance-budgets').BudgetViolationRecord) => void;
  onLongTask?: (task: import('./performance-monitor').LongTaskEntry) => void;
  onMemoryPressure?: (pressure: 'warning' | 'critical') => void;
} = {}): Promise<() => void> {
  const {
    debug = false,
    reportToAnalytics = false,
    analyticsEndpoint,
    sampleRate = 1,
    onVitalMetric,
    onBudgetViolation,
    onLongTask,
    onMemoryPressure,
  } = options;

  // Import functions dynamically to avoid circular dependency issues
  const { initVitals } = await import('./vitals');
  const { getPredictivePrefetchEngine } = await import('./PredictivePrefetch');
  const { getPerformanceMonitor } = await import('./performance-monitor');
  const { getBudgetManager } = await import('./performance-budgets');
  const { getNetworkAnalyzer } = await import('./network-performance');
  const { getRenderTracker } = await import('./render-tracker');

  // Initialize vitals collection
  const vitalsCleanup = initVitals({
    debug,
    reportToAnalytics,
    analyticsEndpoint,
    sampleRate,
    onMetric: (metric) => {
      onVitalMetric?.(metric);
    },
  });

  // Initialize predictive prefetch
  const prefetchEngine = getPredictivePrefetchEngine({
    debug,
    enableLearning: true,
  });

  // Initialize performance monitor
  const monitor = getPerformanceMonitor({
    debug,
    autoStart: true,
  });

  // Subscribe to long tasks
  if (onLongTask) {
    monitor.on('longTask', onLongTask);
  }

  // Subscribe to memory pressure
  if (onMemoryPressure) {
    monitor.on<{ pressure: 'normal' | 'warning' | 'critical' }>('memoryPressure', (snapshot) => {
      if (snapshot.pressure !== 'normal') {
        onMemoryPressure(snapshot.pressure);
      }
    });
  }

  // Budget manager available via getBudgetManager if needed
  getBudgetManager({
    debug,
    onViolation: (violation) => {
      onBudgetViolation?.(violation);
    },
  });

  // Initialize network analyzer
  const networkAnalyzer = getNetworkAnalyzer({
    debug,
    autoMonitor: true,
  });

  // Initialize render tracker
  const renderTracker = getRenderTracker({
    debug,
  });

  // Return combined cleanup
  return () => {
    vitalsCleanup();
    prefetchEngine.clearPatterns();
    monitor.stop();
    networkAnalyzer.stopMonitoring();
    renderTracker.disable();
  };
}

// ============================================================================
// Re-export from hooks for convenience
// ============================================================================

// Note: usePerformanceMonitor is in lib/hooks but we provide a convenience import
export { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
export type {
  PerformanceMetrics as UsePerformanceMonitorMetrics,
  PerformanceThresholds,
  UsePerformanceMonitorOptions,
} from '../hooks/usePerformanceMonitor';

// ============================================================================
// Performance Utilities
// ============================================================================

export {
  // Memory utilities
  isMemoryApiSupported,
  getPerformanceMemory,
  calculateMemoryUsagePercent,
  getMemoryPressureLevel,
  // Types
  type PerformanceMemoryInfo,
  type PerformanceWithMemory,
} from './utils';

// ============================================================================
// Configuration Re-exports
// ============================================================================

// Re-export performance configuration for convenience
export {
  performanceConfig,
  getPerformanceConfig,
  meetsVitalThreshold,
  getNetworkTier,
  calculateBudgetUsage,
  formatBytes,
  formatDuration,
  VITAL_THRESHOLDS,
  BUNDLE_BUDGET,
  RUNTIME_BUDGET,
  LONG_TASK_CONFIG,
  MEMORY_CONFIG,
  NETWORK_TIERS,
  RENDER_CONFIG,
  MONITORING_CONFIG,
  type PerformanceConfig,
  type VitalMetricThreshold,
  type BundleBudget,
  type RuntimeBudget,
  type LongTaskConfig,
  type MemoryConfig,
  type NetworkTierConfig,
  type RenderConfig,
  type MonitoringConfig,
} from '../../config/performance.config';

// ============================================================================
// Advanced Performance Module
// ============================================================================

export {
  // Performance Profiler
  PerformanceProfiler,
  getPerformanceProfiler,
  resetPerformanceProfiler,
  createProfilerCallback,
  // Render Optimizer
  RenderBatchManager,
  shallowEqual,
  deepEqual,
  createSelector,
  memoizeWithLRU,
  calculateVirtualListRange,
  createStableKeyGenerator,
  configureRenderTracking,
  getRenderInfo,
  getAllRenderInfo,
  clearRenderTracking,
  getSlowComponents,
  // Memory Optimizer
  MemoryMonitor,
  ObjectPool,
  MemoryAwareCache,
  CleanupOrchestrator,
  WeakRefManager,
  MemoryLeakDetector,
  getMemoryMonitor,
  getCleanupOrchestrator,
  // Bundle Analyzer
  BundleAnalyzer,
  getBundleAnalyzer,
  resetBundleAnalyzer,
  createTrackedImport,
  checkBundleBudget,
  // Critical Path Analyzer
  CriticalPathAnalyzer,
  getCriticalPathAnalyzer,
  generateCriticalCSSHints,
  shouldPreload,
  // Idle Scheduler
  IdleScheduler,
  getIdleScheduler,
  resetIdleScheduler,
  runWhenIdle,
  deferToIdle,
  createYieldingIterator,
  processInIdleChunks,
  debounceToIdle,
  // Unified initialization
  initAdvancedPerformance,
  // Types
  type ProfilerConfig,
  type RenderTimingEntry,
  type FrameRateSample,
  type MemorySample,
  type PerformanceMark,
  type PerformanceMeasure,
  type PerformanceSnapshot,
  type PerformanceSummary,
  type ProfilerEventType,
  type ProfilerEventListener,
  type RenderPriority,
  type RenderBatchConfig,
  type RenderStats,
  type EqualityFn,
  type StateUpdater,
  type VirtualListConfig,
  type VirtualListRange,
  type RenderTrackingConfig,
  type ComponentRenderInfo,
  type MemoryStats,
  type MemoryLeakSuspect,
  type ObjectPoolConfig,
  type CacheConfig,
  type CleanupCallback,
  type MemoryPressureCallback,
  type ChunkInfo,
  type ModuleInfo,
  type BundleAnalysisReport,
  type BundleRecommendation,
  type ResourceTimingEntry,
  type DynamicImportEntry,
  type BundleAnalyzerConfig,
  type CriticalityLevel,
  type ResourceType,
  type RenderBlockingResource,
  type CriticalResource,
  type ResourceRecommendation,
  type DOMAnalysis,
  type CriticalPathAnalysis,
  type CriticalPathOptimization,
  type CriticalPathAnalyzerConfig,
  type IdleTaskPriority,
  type IdleTaskStatus,
  type IdleTask,
  type IdleSchedulerConfig,
  type SchedulerStats,
  type IdleDeadline,
  type AdvancedPerformanceConfig,
} from './advanced';

// ============================================================================
// Prefetch Module
// ============================================================================

export {
  // Intelligent Prefetch
  IntelligentPrefetchEngine,
  getIntelligentPrefetchEngine,
  resetIntelligentPrefetchEngine,
  // Prefetch Strategies
  PrefetchStrategy,
  ViewportPrefetchStrategy,
  HoverPrefetchStrategy,
  IdlePrefetchStrategy,
  SequentialPrefetchStrategy,
  ConditionalPrefetchStrategy,
  StrategyComposer,
  createViewportStrategy,
  createHoverStrategy,
  createIdleStrategy,
  createSequentialStrategy,
  createConditionalStrategy,
  // Prefetch Queue
  PrefetchQueue,
  getPrefetchQueue,
  resetPrefetchQueue,
  // Route Prefetch
  RoutePrefetchManager,
  getRoutePrefetchManager,
  resetRoutePrefetchManager,
  prefetchRoute,
  registerPrefetchRoutes,
  createRouteLinkHandlers,
  // Data Prefetch
  DataPrefetchManager,
  getDataPrefetchManager,
  resetDataPrefetchManager,
  prefetchData,
  prefetchGraphQL,
  getCachedData,
  invalidateData,
  invalidateDataByTag,
  // Asset Prefetch
  AssetPrefetchManager,
  getAssetPrefetchManager,
  resetAssetPrefetchManager,
  prefetchImage,
  prefetchImages,
  prefetchFont,
  dnsPrefetch,
  preconnect,
  preloadAsset,
  // Unified initialization
  initPrefetchSystem,
  // Types
  type PrefetchCandidate,
  type PredictionResult,
  type PredictionFactor,
  type BehaviorMetrics,
  type IntelligentPrefetchConfig,
  type PrefetchStrategyType,
  type PrefetchTarget,
  type StrategyContext,
  type StrategyResult,
  type BaseStrategyConfig,
  type ViewportStrategyConfig,
  type HoverStrategyConfig,
  type IdleStrategyConfig,
  type SequentialStrategyConfig,
  type ConditionalStrategyConfig,
  type PrefetchPriority,
  type PrefetchStatus,
  type PrefetchItem,
  type PrefetchQueueConfig,
  type QueueStats,
  type QueueEventType,
  type QueueEventListener,
  type RoutePrefetchConfig,
  type RoutePrefetchResult,
  type LinkPrefetchHandlers,
  type DataPrefetchConfig,
  type PrefetchRequestOptions,
  type PrefetchResult,
  type GraphQLPrefetchOptions,
  type AssetType,
  type Asset,
  type ResponsiveImage,
  type FontAsset,
  type AssetPrefetchConfig,
  type AssetPrefetchResult,
  type PrefetchSystemConfig,
  type PrefetchSystem,
} from './prefetch';

// ============================================================================
// Monitoring Module
// ============================================================================

export {
  // Enhanced Vitals Collector
  EnhancedVitalsCollector,
  getEnhancedVitalsCollector,
  resetEnhancedVitalsCollector,
  DEFAULT_THRESHOLDS,
  // Performance Reporter
  PerformanceReporter,
  getPerformanceReporter,
  resetPerformanceReporter,
  // Regression Detector
  RegressionDetector,
  getRegressionDetector,
  resetRegressionDetector,
  recordPerformanceSample,
  analyzePerformanceTrend,
  getRegressionSummary,
  // Budget Enforcer
  BudgetEnforcer,
  getBudgetEnforcer,
  resetBudgetEnforcer,
  checkBudget as checkMonitoringBudget,
  enforceBudget,
  getComplianceReport,
  isPerformanceDegraded,
  isDegradationActive,
  DEFAULT_VITALS_BUDGETS,
  DEFAULT_BUNDLE_BUDGETS,
  DEFAULT_RUNTIME_BUDGETS,
  // Real User Monitoring
  RealUserMonitoring,
  getRUM,
  initRUM,
  resetRUM,
  trackPageView,
  trackCustomEvent,
  trackRUMError,
  setRUMUserId,
  getRUMSessionSummary,
  // Unified initialization
  initMonitoringSystem,
  quickStartMonitoring,
  // Types
  type MetricName as MonitoringMetricName,
  type MetricRating,
  type CollectedMetric,
  type MetricAttribution,
  type MetricThresholds,
  type VitalsCollectionConfig,
  type MetricCallback,
  type ReportFormat,
  type ReportDestination,
  type ReportMetric,
  type PerformanceReport as MonitoringPerformanceReport,
  type ReportSummary,
  type ReportContext,
  type PerformanceReporterConfig,
  type AlertRule,
  type RegressionSeverity,
  type RegressionStatus,
  type MetricSample,
  type MetricBaseline,
  type RegressionEvent,
  type TrendAnalysis,
  type AnomalyResult,
  type RegressionDetectorConfig,
  type DetectorSummary,
  type BudgetCategory,
  type BudgetSeverity,
  type EnforcementMode,
  type DegradationAction,
  type BudgetDefinition,
  type EnforcementResult,
  type BudgetComplianceReport,
  type ComplianceReport,
  type BudgetEnforcerConfig,
  type SessionStatus,
  type RUMEventType,
  type UserSession,
  type DeviceInfo,
  type UTMParams,
  type PageViewEvent,
  type InteractionEvent,
  type ErrorEvent as RUMErrorEvent,
  type ResourceEvent,
  type RageClickEvent,
  type FormAbandonmentEvent,
  type RUMEvent,
  type RUMConfig,
  type SessionSummary,
  type MonitoringSystemConfig,
  type MonitoringSystem,
} from './monitoring';

// ============================================================================
// Agent 7 PhD-Level Performance Additions
// ============================================================================

// Universal Lazy Loading System
export {
  // Classes and Singletons
  ObserverPool,
  ModulePreloader,
  // Factory Functions
  createLazyComponent,
  withLazyLoading,
  // Components
  LazyImage,
  // Hooks
  useLazyVisible,
  useModulePreload,
  useNetworkAwareLoading,
  // Utilities
  preloadComponent,
  preloadComponents,
  queueModulePreload,
  shouldLoadOnNetwork,
  resetObserverPool,
  resetModulePreloader,
  // Types
  type NetworkTier,
  type LoadingPriority as LazyLoadingPriority,
  type LazyStrategy,
  type LazyComponentConfig,
  type LazyImageConfig,
  type ModulePreloadConfig,
} from './lazy-everything';

// Intelligent Render Scheduler
export {
  // Class
  RenderScheduler,
  // Factory Functions
  getRenderScheduler,
  resetRenderScheduler,
  // Scheduling Functions
  scheduleWork,
  cancelWork,
  yieldToMain,
  runInChunks,
  // Hooks (renamed to avoid conflicts)
  useOptimizedRender as useScheduledRender,
  useScheduledWork,
  useRenderBudget,
  // Types
  type TaskStatus,
  type ScheduledTask,
  type FrameBudgetConfig,
  type RenderSchedulerConfig,
} from './render-scheduler';

// Memory Guardian System
export {
  // Class
  MemoryGuardian,
  // Factory Functions
  getMemoryGuardian,
  resetMemoryGuardian,
  // Utilities
  triggerMemoryCleanup,
  checkMemory,
  // Hooks
  useMemoryGuard,
  useTrackedSubscription,
  useCleanupHandler,
  useMemoryPressureAwareness,
  // Types
  type CleanupHandler,
  type ComponentMemoryBudget,
  type TrackedSubscription,
  type MemoryGuardianConfig,
} from './memory-guardian';

// Runtime Bundle Optimizer
export {
  // Class
  BundleOptimizer,
  // Factory Functions
  getBundleOptimizer,
  resetBundleOptimizer,
  // Detection Functions
  detectDeviceCapabilities,
  detectNetworkConditions,
  // Utilities
  loadPolyfills,
  getOptimalModule,
  formatBundleSize,
  // Hooks
  useBundleOptimizer,
  useConditionalLoad,
  // Types
  type DeviceTier,
  type DeviceCapabilities,
  type NetworkConditions,
  type LoadingStrategy,
  type PolyfillConfig,
  type ModuleAlternative,
  type BundleOptimizerConfig,
} from './bundle-optimizer';

// Critical CSS System
export {
  // Class
  CriticalCSSExtractor,
  // Factory Functions
  getCriticalCSSExtractor,
  resetCriticalCSSExtractor,
  // Utilities
  extractAndInjectCriticalCSS,
  injectCriticalCSS,
  loadCSSAsync,
  preloadFont,
  applyContainment,
  // Hooks
  useCriticalCSS,
  useCSSContainment,
  useDeferredCSS,
  // Types
  type CriticalCSSConfig,
  type CSSRuleType,
  type AnalyzedCSSRule,
  type CriticalCSSResult,
  type FontResource,
  type ContainmentOptions,
} from './critical-css';

// Optimized Hooks (from hooks/useOptimizedHooks.ts)
export {
  useLazyFeature,
  useProgressiveLoad,
  clearFeatureCache,
  preloadFeature,
  type LazyFeatureStatus,
  type ProgressiveLoadPhase,
  type UseOptimizedRenderOptions,
  type UseOptimizedRenderReturn,
  type UseLazyFeatureOptions,
  type UseLazyFeatureReturn,
  type UseProgressiveLoadOptions,
  type UseProgressiveLoadReturn,
} from './hooks/useOptimizedHooks';
