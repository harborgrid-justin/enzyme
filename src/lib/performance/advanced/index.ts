/**
 * @file Advanced Performance Module
 * @description Enterprise-grade performance profiling, optimization, and analysis utilities.
 *
 * Provides deep performance insights and optimization tools for React applications,
 * including render optimization, memory management, bundle analysis, and idle scheduling.
 */

// ============================================================================
// Performance Profiler
// ============================================================================
export {
  // Class
  PerformanceProfiler,
  // Factory functions
  getPerformanceProfiler,
  resetPerformanceProfiler,
  createProfilerCallback,
  // Types
  type ProfilerConfig,
  type RenderTimingEntry,
  type LongTaskEntry,
  type LongTaskAttribution,
  type FrameRateSample,
  type MemorySample,
  type PerformanceMark,
  type PerformanceMeasure,
  type PerformanceSnapshot,
  type PerformanceSummary,
  type ProfilerEventType,
  type ProfilerEventListener,
} from './performance-profiler';

// ============================================================================
// Render Optimizer
// ============================================================================
export {
  // Class
  RenderBatchManager,
  // Utilities
  shallowEqual,
  deepEqual,
  createSelector,
  memoizeWithLRU,
  calculateVirtualListRange,
  createStableKeyGenerator,
  // Tracking
  configureRenderTracking,
  trackRender,
  getRenderInfo,
  getAllRenderInfo,
  clearRenderTracking,
  getSlowComponents,
  // Constants
  DEFAULT_BATCH_CONFIG,
  PRIORITY_VALUES,
  // Types
  type RenderPriority,
  type RenderBatchConfig,
  type RenderStats,
  type EqualityFn,
  type StateUpdater,
  type VirtualListConfig,
  type VirtualListRange,
  type RenderTrackingConfig,
  type ComponentRenderInfo,
} from './render-optimizer';

// ============================================================================
// Memory Optimizer
// ============================================================================
export {
  // Classes
  MemoryMonitor,
  ObjectPool,
  MemoryAwareCache,
  CleanupOrchestrator,
  WeakRefManager,
  MemoryLeakDetector,
  // Factory functions
  getMemoryMonitor,
  getCleanupOrchestrator,
  // Types
  type MemoryPressureLevel,
  type MemoryStats,
  type MemoryLeakSuspect,
  type ObjectPoolConfig,
  type CacheConfig,
  type CleanupCallback,
  type MemoryPressureCallback,
} from './memory-optimizer';

// ============================================================================
// Bundle Analyzer
// ============================================================================
export {
  // Class
  BundleAnalyzer,
  // Factory functions
  getBundleAnalyzer,
  resetBundleAnalyzer,
  createTrackedImport,
  // Utilities
  formatBytes,
  checkBundleBudget,
  // Types
  type ChunkInfo,
  type ModuleInfo,
  type BundleAnalysisReport,
  type BundleRecommendation,
  type ResourceTimingEntry,
  type DynamicImportEntry,
  type BundleAnalyzerConfig,
} from './bundle-analyzer';

// ============================================================================
// Critical Path Analyzer
// ============================================================================
export {
  // Class
  CriticalPathAnalyzer,
  // Factory functions
  getCriticalPathAnalyzer,
  // Utilities
  generateCriticalCSSHints,
  shouldPreload,
  // Types
  type CriticalityLevel,
  type ResourceType,
  type RenderBlockingResource,
  type CriticalResource,
  type ResourceRecommendation,
  type DOMAnalysis,
  type CriticalPathAnalysis,
  type CriticalPathOptimization,
  type CriticalPathAnalyzerConfig,
} from './critical-path-analyzer';

// ============================================================================
// Idle Scheduler
// ============================================================================
export {
  // Class
  IdleScheduler,
  // Factory functions
  getIdleScheduler,
  resetIdleScheduler,
  // Utilities
  runWhenIdle,
  deferToIdle,
  createYieldingIterator,
  processInIdleChunks,
  debounceToIdle,
  // Types
  type IdleTaskPriority,
  type IdleTaskStatus,
  type IdleTask,
  type IdleSchedulerConfig,
  type SchedulerStats,
  type IdleDeadline,
} from './idle-scheduler';

// ============================================================================
// Convenience Initialization
// ============================================================================

import { getPerformanceProfiler, type ProfilerConfig } from './performance-profiler';
import { getBundleAnalyzer, type BundleAnalyzerConfig } from './bundle-analyzer';
import { getCriticalPathAnalyzer, type CriticalPathAnalyzerConfig } from './critical-path-analyzer';
import { getIdleScheduler, type IdleSchedulerConfig } from './idle-scheduler';
import { getMemoryMonitor } from './memory-optimizer';

/**
 * Advanced performance initialization options
 */
export interface AdvancedPerformanceConfig {
  /** Enable performance profiling */
  enableProfiling?: boolean;
  /** Enable bundle analysis */
  enableBundleAnalysis?: boolean;
  /** Enable critical path analysis */
  enableCriticalPathAnalysis?: boolean;
  /** Enable idle scheduling */
  enableIdleScheduling?: boolean;
  /** Enable memory monitoring */
  enableMemoryMonitoring?: boolean;
  /** Profiler configuration */
  profilerConfig?: Partial<ProfilerConfig>;
  /** Bundle analyzer configuration */
  bundleAnalyzerConfig?: Partial<BundleAnalyzerConfig>;
  /** Critical path analyzer configuration */
  criticalPathConfig?: Partial<CriticalPathAnalyzerConfig>;
  /** Idle scheduler configuration */
  idleSchedulerConfig?: Partial<IdleSchedulerConfig>;
  /** Memory monitoring interval in ms */
  memoryMonitorInterval?: number;
}

/**
 * Initialize all advanced performance tools
 */
export function initAdvancedPerformance(
  config: AdvancedPerformanceConfig = {}
): {
  profiler: ReturnType<typeof getPerformanceProfiler> | null;
  bundleAnalyzer: ReturnType<typeof getBundleAnalyzer> | null;
  criticalPathAnalyzer: ReturnType<typeof getCriticalPathAnalyzer> | null;
  idleScheduler: ReturnType<typeof getIdleScheduler> | null;
  memoryMonitor: ReturnType<typeof getMemoryMonitor> | null;
  cleanup: () => void;
} {
  const {
    enableProfiling = true,
    enableBundleAnalysis = true,
    enableCriticalPathAnalysis = true,
    enableIdleScheduling = true,
    enableMemoryMonitoring = true,
    profilerConfig,
    bundleAnalyzerConfig,
    criticalPathConfig,
    idleSchedulerConfig,
    memoryMonitorInterval = 5000,
  } = config;

  const profiler = enableProfiling
    ? getPerformanceProfiler(profilerConfig)
    : null;
  const bundleAnalyzer = enableBundleAnalysis
    ? getBundleAnalyzer(bundleAnalyzerConfig)
    : null;
  const criticalPathAnalyzer = enableCriticalPathAnalysis
    ? getCriticalPathAnalyzer(criticalPathConfig)
    : null;
  const idleScheduler = enableIdleScheduling
    ? getIdleScheduler(idleSchedulerConfig)
    : null;
  const memoryMonitor = enableMemoryMonitoring ? getMemoryMonitor() : null;

  // Start services
  profiler?.start();
  bundleAnalyzer?.start();
  idleScheduler?.start();
  memoryMonitor?.start(memoryMonitorInterval);

  const cleanup = (): void => {
    profiler?.stop();
    bundleAnalyzer?.stop();
    idleScheduler?.stop();
    memoryMonitor?.stop();
  };

  return {
    profiler,
    bundleAnalyzer,
    criticalPathAnalyzer,
    idleScheduler,
    memoryMonitor,
    cleanup,
  };
}
