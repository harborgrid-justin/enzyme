/**
 * @fileoverview Performance feature flags for controlling monitoring and optimization.
 *
 * This module provides feature flag integration for the performance layer, enabling
 * dynamic control over monitoring, budgets, profiling, and optimization features.
 *
 * @module flags/integration/performance-flags
 *
 * @example
 * ```typescript
 * import {
 *   performanceFlags,
 *   usePerformanceFlagConfig,
 *   getFlaggedMonitoringConfig,
 * } from '@/lib/flags/integration/performance-flags';
 *
 * // Check performance feature flags
 * if (performanceFlags.isMonitoringEnabled()) {
 *   // Start performance monitoring
 * }
 *
 * // Use in component
 * function App() {
 *   const config = usePerformanceFlagConfig();
 *   // config.monitoringEnabled, config.profilingEnabled, etc.
 * }
 * ```
 */

import { useMemo } from 'react';
import {
  createLibraryIntegration,
  useLibraryFlags,
  integrationRegistry,
  type LibraryIntegration,
} from './library-integration';

// =============================================================================
// Types
// =============================================================================

/**
 * Performance flag keys
 */
export const PERFORMANCE_FLAG_KEYS = {
  /** Enable performance monitoring */
  PERF_MONITORING_ENABLED: 'perf-monitoring-enabled',
  /** Enable web vitals collection */
  PERF_VITALS_ENABLED: 'perf-vitals-enabled',
  /** Enable render profiling */
  PERF_PROFILING_ENABLED: 'perf-profiling-enabled',
  /** Enable memory monitoring */
  PERF_MEMORY_ENABLED: 'perf-memory-enabled',
  /** Enable network monitoring */
  PERF_NETWORK_ENABLED: 'perf-network-enabled',
  /** Enable budget enforcement */
  PERF_BUDGETS_ENABLED: 'perf-budgets-enabled',
  /** Enable long task detection */
  PERF_LONG_TASKS_ENABLED: 'perf-long-tasks-enabled',
  /** Enable prefetching */
  PERF_PREFETCH_ENABLED: 'perf-prefetch-enabled',
  /** Enable predictive prefetch */
  PERF_PREDICTIVE_ENABLED: 'perf-predictive-enabled',
  /** Enable code splitting */
  PERF_CODE_SPLITTING_ENABLED: 'perf-code-splitting-enabled',
  /** Enable RUM (Real User Monitoring) */
  PERF_RUM_ENABLED: 'perf-rum-enabled',
  /** Enable synthetic monitoring */
  PERF_SYNTHETIC_ENABLED: 'perf-synthetic-enabled',
  /** Enable resource hints */
  PERF_RESOURCE_HINTS_ENABLED: 'perf-resource-hints-enabled',
  /** Enable image optimization */
  PERF_IMAGE_OPT_ENABLED: 'perf-image-opt-enabled',
  /** Enable bundle analysis */
  PERF_BUNDLE_ANALYSIS_ENABLED: 'perf-bundle-analysis-enabled',
  /** Enable degradation mode */
  PERF_DEGRADATION_ENABLED: 'perf-degradation-enabled',
} as const;

export type PerformanceFlagKey = (typeof PERFORMANCE_FLAG_KEYS)[keyof typeof PERFORMANCE_FLAG_KEYS];

/**
 * Performance flag configuration
 */
export interface PerformanceFlagConfig {
  /** Enable monitoring */
  readonly monitoringEnabled: boolean;
  /** Enable vitals collection */
  readonly vitalsEnabled: boolean;
  /** Enable render profiling */
  readonly profilingEnabled: boolean;
  /** Enable memory monitoring */
  readonly memoryEnabled: boolean;
  /** Enable network monitoring */
  readonly networkEnabled: boolean;
  /** Enable budget enforcement */
  readonly budgetsEnabled: boolean;
  /** Enable long task detection */
  readonly longTasksEnabled: boolean;
  /** Enable prefetching */
  readonly prefetchEnabled: boolean;
  /** Enable predictive prefetch */
  readonly predictiveEnabled: boolean;
  /** Enable code splitting */
  readonly codeSplittingEnabled: boolean;
  /** Enable RUM */
  readonly rumEnabled: boolean;
  /** Enable synthetic monitoring */
  readonly syntheticEnabled: boolean;
  /** Enable resource hints */
  readonly resourceHintsEnabled: boolean;
  /** Enable image optimization */
  readonly imageOptEnabled: boolean;
  /** Enable bundle analysis */
  readonly bundleAnalysisEnabled: boolean;
  /** Enable degradation mode */
  readonly degradationEnabled: boolean;
  /** Index signature for Record<string, unknown> compatibility */
  [key: string]: unknown;
}

/**
 * Monitoring configuration with flag overrides
 */
export interface FlaggedMonitoringConfig {
  /** Whether monitoring is active */
  readonly active: boolean;
  /** Sampling rate (0-1) */
  readonly sampleRate: number;
  /** Features to monitor */
  readonly features: {
    vitals: boolean;
    memory: boolean;
    network: boolean;
    longTasks: boolean;
    renders: boolean;
  };
  /** Budget configuration */
  readonly budgets: {
    enabled: boolean;
    enforceOnViolation: boolean;
  };
}

/**
 * Optimization configuration with flag overrides
 */
export interface FlaggedOptimizationConfig {
  /** Whether optimization is active */
  readonly active: boolean;
  /** Prefetch configuration */
  readonly prefetch: {
    enabled: boolean;
    predictive: boolean;
    maxItems: number;
  };
  /** Code splitting configuration */
  readonly codeSplitting: {
    enabled: boolean;
    threshold: number;
  };
  /** Image optimization */
  readonly images: {
    enabled: boolean;
    lazy: boolean;
    responsive: boolean;
  };
}

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default performance flag configuration
 */
export const DEFAULT_PERFORMANCE_FLAG_CONFIG: PerformanceFlagConfig = {
  monitoringEnabled: true,
  vitalsEnabled: true,
  profilingEnabled: false,
  memoryEnabled: true,
  networkEnabled: true,
  budgetsEnabled: false,
  longTasksEnabled: true,
  prefetchEnabled: true,
  predictiveEnabled: false,
  codeSplittingEnabled: true,
  rumEnabled: false,
  syntheticEnabled: false,
  resourceHintsEnabled: true,
  imageOptEnabled: true,
  bundleAnalysisEnabled: false,
  degradationEnabled: false,
};

// =============================================================================
// Library Integration
// =============================================================================

/**
 * Create performance flag integration
 */
export function createPerformanceFlagIntegration(): LibraryIntegration<PerformanceFlagConfig> {
  return createLibraryIntegration<PerformanceFlagConfig>({
    libraryId: 'performance',
    defaultConfig: DEFAULT_PERFORMANCE_FLAG_CONFIG,
    flagMappings: {
      [PERFORMANCE_FLAG_KEYS.PERF_MONITORING_ENABLED]: 'monitoringEnabled',
      [PERFORMANCE_FLAG_KEYS.PERF_VITALS_ENABLED]: 'vitalsEnabled',
      [PERFORMANCE_FLAG_KEYS.PERF_PROFILING_ENABLED]: 'profilingEnabled',
      [PERFORMANCE_FLAG_KEYS.PERF_MEMORY_ENABLED]: 'memoryEnabled',
      [PERFORMANCE_FLAG_KEYS.PERF_NETWORK_ENABLED]: 'networkEnabled',
      [PERFORMANCE_FLAG_KEYS.PERF_BUDGETS_ENABLED]: 'budgetsEnabled',
      [PERFORMANCE_FLAG_KEYS.PERF_LONG_TASKS_ENABLED]: 'longTasksEnabled',
      [PERFORMANCE_FLAG_KEYS.PERF_PREFETCH_ENABLED]: 'prefetchEnabled',
      [PERFORMANCE_FLAG_KEYS.PERF_PREDICTIVE_ENABLED]: 'predictiveEnabled',
      [PERFORMANCE_FLAG_KEYS.PERF_CODE_SPLITTING_ENABLED]: 'codeSplittingEnabled',
      [PERFORMANCE_FLAG_KEYS.PERF_RUM_ENABLED]: 'rumEnabled',
      [PERFORMANCE_FLAG_KEYS.PERF_SYNTHETIC_ENABLED]: 'syntheticEnabled',
      [PERFORMANCE_FLAG_KEYS.PERF_RESOURCE_HINTS_ENABLED]: 'resourceHintsEnabled',
      [PERFORMANCE_FLAG_KEYS.PERF_IMAGE_OPT_ENABLED]: 'imageOptEnabled',
      [PERFORMANCE_FLAG_KEYS.PERF_BUNDLE_ANALYSIS_ENABLED]: 'bundleAnalysisEnabled',
      [PERFORMANCE_FLAG_KEYS.PERF_DEGRADATION_ENABLED]: 'degradationEnabled',
    },
    onConfigChange: (config, changedFlags) => {
      console.info('[Performance Flags] Config changed:', changedFlags, config);
    },
  });
}

// Initialize and register the performance integration
const performanceIntegration = createPerformanceFlagIntegration();
integrationRegistry.register(performanceIntegration);

// =============================================================================
// Performance Flag Helpers
// =============================================================================

/**
 * Performance flags helper class
 */
class PerformanceFlagsHelper {
  setFlagGetter(getter: (flagKey: string) => boolean): void {
    this.getFlag = getter;
  }

  isMonitoringEnabled(): boolean {
    return this.getFlag(PERFORMANCE_FLAG_KEYS.PERF_MONITORING_ENABLED);
  }

  isVitalsEnabled(): boolean {
    return this.getFlag(PERFORMANCE_FLAG_KEYS.PERF_VITALS_ENABLED);
  }

  isProfilingEnabled(): boolean {
    return this.getFlag(PERFORMANCE_FLAG_KEYS.PERF_PROFILING_ENABLED);
  }

  isMemoryEnabled(): boolean {
    return this.getFlag(PERFORMANCE_FLAG_KEYS.PERF_MEMORY_ENABLED);
  }

  isNetworkEnabled(): boolean {
    return this.getFlag(PERFORMANCE_FLAG_KEYS.PERF_NETWORK_ENABLED);
  }

  isBudgetsEnabled(): boolean {
    return this.getFlag(PERFORMANCE_FLAG_KEYS.PERF_BUDGETS_ENABLED);
  }

  isLongTasksEnabled(): boolean {
    return this.getFlag(PERFORMANCE_FLAG_KEYS.PERF_LONG_TASKS_ENABLED);
  }

  isPrefetchEnabled(): boolean {
    return this.getFlag(PERFORMANCE_FLAG_KEYS.PERF_PREFETCH_ENABLED);
  }

  isPredictiveEnabled(): boolean {
    return this.getFlag(PERFORMANCE_FLAG_KEYS.PERF_PREDICTIVE_ENABLED);
  }

  isCodeSplittingEnabled(): boolean {
    return this.getFlag(PERFORMANCE_FLAG_KEYS.PERF_CODE_SPLITTING_ENABLED);
  }

  isRumEnabled(): boolean {
    return this.getFlag(PERFORMANCE_FLAG_KEYS.PERF_RUM_ENABLED);
  }

  isSyntheticEnabled(): boolean {
    return this.getFlag(PERFORMANCE_FLAG_KEYS.PERF_SYNTHETIC_ENABLED);
  }

  isResourceHintsEnabled(): boolean {
    return this.getFlag(PERFORMANCE_FLAG_KEYS.PERF_RESOURCE_HINTS_ENABLED);
  }

  isImageOptEnabled(): boolean {
    return this.getFlag(PERFORMANCE_FLAG_KEYS.PERF_IMAGE_OPT_ENABLED);
  }

  isBundleAnalysisEnabled(): boolean {
    return this.getFlag(PERFORMANCE_FLAG_KEYS.PERF_BUNDLE_ANALYSIS_ENABLED);
  }

  isDegradationEnabled(): boolean {
    return this.getFlag(PERFORMANCE_FLAG_KEYS.PERF_DEGRADATION_ENABLED);
  }

  getAllFlags(): Record<PerformanceFlagKey, boolean> {
    return {
      [PERFORMANCE_FLAG_KEYS.PERF_MONITORING_ENABLED]: this.isMonitoringEnabled(),
      [PERFORMANCE_FLAG_KEYS.PERF_VITALS_ENABLED]: this.isVitalsEnabled(),
      [PERFORMANCE_FLAG_KEYS.PERF_PROFILING_ENABLED]: this.isProfilingEnabled(),
      [PERFORMANCE_FLAG_KEYS.PERF_MEMORY_ENABLED]: this.isMemoryEnabled(),
      [PERFORMANCE_FLAG_KEYS.PERF_NETWORK_ENABLED]: this.isNetworkEnabled(),
      [PERFORMANCE_FLAG_KEYS.PERF_BUDGETS_ENABLED]: this.isBudgetsEnabled(),
      [PERFORMANCE_FLAG_KEYS.PERF_LONG_TASKS_ENABLED]: this.isLongTasksEnabled(),
      [PERFORMANCE_FLAG_KEYS.PERF_PREFETCH_ENABLED]: this.isPrefetchEnabled(),
      [PERFORMANCE_FLAG_KEYS.PERF_PREDICTIVE_ENABLED]: this.isPredictiveEnabled(),
      [PERFORMANCE_FLAG_KEYS.PERF_CODE_SPLITTING_ENABLED]: this.isCodeSplittingEnabled(),
      [PERFORMANCE_FLAG_KEYS.PERF_RUM_ENABLED]: this.isRumEnabled(),
      [PERFORMANCE_FLAG_KEYS.PERF_SYNTHETIC_ENABLED]: this.isSyntheticEnabled(),
      [PERFORMANCE_FLAG_KEYS.PERF_RESOURCE_HINTS_ENABLED]: this.isResourceHintsEnabled(),
      [PERFORMANCE_FLAG_KEYS.PERF_IMAGE_OPT_ENABLED]: this.isImageOptEnabled(),
      [PERFORMANCE_FLAG_KEYS.PERF_BUNDLE_ANALYSIS_ENABLED]: this.isBundleAnalysisEnabled(),
      [PERFORMANCE_FLAG_KEYS.PERF_DEGRADATION_ENABLED]: this.isDegradationEnabled(),
    };
  }

  private getFlag: (flagKey: string) => boolean = () => false;
}

/**
 * Global performance flags helper instance
 */
export const performanceFlags = new PerformanceFlagsHelper();

// =============================================================================
// React Hooks
// =============================================================================

/**
 * Hook to get performance flag configuration
 */
export function usePerformanceFlagConfig(): PerformanceFlagConfig {
  const config = useLibraryFlags<PerformanceFlagConfig>('performance');
  return config ?? DEFAULT_PERFORMANCE_FLAG_CONFIG;
}

/**
 * Hook to check a specific performance flag
 */
export function usePerformanceFlag(flagKey: PerformanceFlagKey): boolean {
  const config = usePerformanceFlagConfig();

  return useMemo(() => {
    switch (flagKey) {
      case PERFORMANCE_FLAG_KEYS.PERF_MONITORING_ENABLED:
        return config.monitoringEnabled;
      case PERFORMANCE_FLAG_KEYS.PERF_VITALS_ENABLED:
        return config.vitalsEnabled;
      case PERFORMANCE_FLAG_KEYS.PERF_PROFILING_ENABLED:
        return config.profilingEnabled;
      case PERFORMANCE_FLAG_KEYS.PERF_MEMORY_ENABLED:
        return config.memoryEnabled;
      case PERFORMANCE_FLAG_KEYS.PERF_NETWORK_ENABLED:
        return config.networkEnabled;
      case PERFORMANCE_FLAG_KEYS.PERF_BUDGETS_ENABLED:
        return config.budgetsEnabled;
      case PERFORMANCE_FLAG_KEYS.PERF_LONG_TASKS_ENABLED:
        return config.longTasksEnabled;
      case PERFORMANCE_FLAG_KEYS.PERF_PREFETCH_ENABLED:
        return config.prefetchEnabled;
      case PERFORMANCE_FLAG_KEYS.PERF_PREDICTIVE_ENABLED:
        return config.predictiveEnabled;
      case PERFORMANCE_FLAG_KEYS.PERF_CODE_SPLITTING_ENABLED:
        return config.codeSplittingEnabled;
      case PERFORMANCE_FLAG_KEYS.PERF_RUM_ENABLED:
        return config.rumEnabled;
      case PERFORMANCE_FLAG_KEYS.PERF_SYNTHETIC_ENABLED:
        return config.syntheticEnabled;
      case PERFORMANCE_FLAG_KEYS.PERF_RESOURCE_HINTS_ENABLED:
        return config.resourceHintsEnabled;
      case PERFORMANCE_FLAG_KEYS.PERF_IMAGE_OPT_ENABLED:
        return config.imageOptEnabled;
      case PERFORMANCE_FLAG_KEYS.PERF_BUNDLE_ANALYSIS_ENABLED:
        return config.bundleAnalysisEnabled;
      case PERFORMANCE_FLAG_KEYS.PERF_DEGRADATION_ENABLED:
        return config.degradationEnabled;
      default:
        return false;
    }
  }, [config, flagKey]);
}

/**
 * Hook to get flagged monitoring configuration
 */
export function useFlaggedMonitoringConfig(options: {
  defaultSampleRate?: number;
} = {}): FlaggedMonitoringConfig {
  const config = usePerformanceFlagConfig();
  const { defaultSampleRate = 1 } = options;

  return useMemo(() => ({
    active: config.monitoringEnabled,
    sampleRate: config.monitoringEnabled ? defaultSampleRate : 0,
    features: {
      vitals: config.vitalsEnabled,
      memory: config.memoryEnabled,
      network: config.networkEnabled,
      longTasks: config.longTasksEnabled,
      renders: config.profilingEnabled,
    },
    budgets: {
      enabled: config.budgetsEnabled,
      enforceOnViolation: config.degradationEnabled,
    },
  }), [config, defaultSampleRate]);
}

/**
 * Hook to get flagged optimization configuration
 */
export function useFlaggedOptimizationConfig(options: {
  maxPrefetchItems?: number;
  codeSplitThreshold?: number;
} = {}): FlaggedOptimizationConfig {
  const config = usePerformanceFlagConfig();
  const { maxPrefetchItems = 10, codeSplitThreshold = 50000 } = options;

  return useMemo(() => ({
    active: config.prefetchEnabled || config.codeSplittingEnabled || config.imageOptEnabled,
    prefetch: {
      enabled: config.prefetchEnabled,
      predictive: config.predictiveEnabled,
      maxItems: maxPrefetchItems,
    },
    codeSplitting: {
      enabled: config.codeSplittingEnabled,
      threshold: codeSplitThreshold,
    },
    images: {
      enabled: config.imageOptEnabled,
      lazy: true,
      responsive: true,
    },
  }), [config, maxPrefetchItems, codeSplitThreshold]);
}

// =============================================================================
// Configuration Factories
// =============================================================================

/**
 * Get monitoring configuration based on flags
 */
export function getFlaggedMonitoringConfig(
  getFlag: (flagKey: string) => boolean,
  options: { defaultSampleRate?: number } = {}
): FlaggedMonitoringConfig {
  const { defaultSampleRate = 1 } = options;
  const isActive = getFlag(PERFORMANCE_FLAG_KEYS.PERF_MONITORING_ENABLED);

  return {
    active: isActive,
    sampleRate: isActive ? defaultSampleRate : 0,
    features: {
      vitals: getFlag(PERFORMANCE_FLAG_KEYS.PERF_VITALS_ENABLED),
      memory: getFlag(PERFORMANCE_FLAG_KEYS.PERF_MEMORY_ENABLED),
      network: getFlag(PERFORMANCE_FLAG_KEYS.PERF_NETWORK_ENABLED),
      longTasks: getFlag(PERFORMANCE_FLAG_KEYS.PERF_LONG_TASKS_ENABLED),
      renders: getFlag(PERFORMANCE_FLAG_KEYS.PERF_PROFILING_ENABLED),
    },
    budgets: {
      enabled: getFlag(PERFORMANCE_FLAG_KEYS.PERF_BUDGETS_ENABLED),
      enforceOnViolation: getFlag(PERFORMANCE_FLAG_KEYS.PERF_DEGRADATION_ENABLED),
    },
  };
}

/**
 * Get optimization configuration based on flags
 */
export function getFlaggedOptimizationConfig(
  getFlag: (flagKey: string) => boolean,
  options: { maxPrefetchItems?: number; codeSplitThreshold?: number } = {}
): FlaggedOptimizationConfig {
  const { maxPrefetchItems = 10, codeSplitThreshold = 50000 } = options;

  const prefetchEnabled = getFlag(PERFORMANCE_FLAG_KEYS.PERF_PREFETCH_ENABLED);
  const codeSplittingEnabled = getFlag(PERFORMANCE_FLAG_KEYS.PERF_CODE_SPLITTING_ENABLED);
  const imageOptEnabled = getFlag(PERFORMANCE_FLAG_KEYS.PERF_IMAGE_OPT_ENABLED);

  return {
    active: prefetchEnabled || codeSplittingEnabled || imageOptEnabled,
    prefetch: {
      enabled: prefetchEnabled,
      predictive: getFlag(PERFORMANCE_FLAG_KEYS.PERF_PREDICTIVE_ENABLED),
      maxItems: maxPrefetchItems,
    },
    codeSplitting: {
      enabled: codeSplittingEnabled,
      threshold: codeSplitThreshold,
    },
    images: {
      enabled: imageOptEnabled,
      lazy: true,
      responsive: true,
    },
  };
}

// =============================================================================
// Performance Degradation Utilities
// =============================================================================

/**
 * Degradation level based on performance flags and budget violations
 */
export type DegradationLevel = 'none' | 'light' | 'moderate' | 'heavy';

/**
 * Get degradation configuration based on flags
 */
export function getDegradationConfig(
  getFlag: (flagKey: string) => boolean,
  budgetViolations: number = 0
): {
  level: DegradationLevel;
  disableAnimations: boolean;
  disableImages: boolean;
  disablePrefetch: boolean;
  reduceQuality: boolean;
} {
  const degradationEnabled = getFlag(PERFORMANCE_FLAG_KEYS.PERF_DEGRADATION_ENABLED);

  if (!degradationEnabled) {
    return {
      level: 'none',
      disableAnimations: false,
      disableImages: false,
      disablePrefetch: false,
      reduceQuality: false,
    };
  }

  // Progressive degradation based on violations
  if (budgetViolations >= 5) {
    return {
      level: 'heavy',
      disableAnimations: true,
      disableImages: true,
      disablePrefetch: true,
      reduceQuality: true,
    };
  } else if (budgetViolations >= 3) {
    return {
      level: 'moderate',
      disableAnimations: true,
      disableImages: false,
      disablePrefetch: true,
      reduceQuality: true,
    };
  } else if (budgetViolations >= 1) {
    return {
      level: 'light',
      disableAnimations: false,
      disableImages: false,
      disablePrefetch: true,
      reduceQuality: false,
    };
  }

  return {
    level: 'none',
    disableAnimations: false,
    disableImages: false,
    disablePrefetch: false,
    reduceQuality: false,
  };
}

/**
 * Hook for performance degradation
 */
export function usePerformanceDegradation(budgetViolations: number = 0): {
  level: DegradationLevel;
  disableAnimations: boolean;
  disableImages: boolean;
  disablePrefetch: boolean;
  reduceQuality: boolean;
} {
  const config = usePerformanceFlagConfig();

  return useMemo(() => {
    if (!config.degradationEnabled) {
      return {
        level: 'none',
        disableAnimations: false,
        disableImages: false,
        disablePrefetch: false,
        reduceQuality: false,
      };
    }

    if (budgetViolations >= 5) {
      return {
        level: 'heavy',
        disableAnimations: true,
        disableImages: true,
        disablePrefetch: true,
        reduceQuality: true,
      };
    } else if (budgetViolations >= 3) {
      return {
        level: 'moderate',
        disableAnimations: true,
        disableImages: false,
        disablePrefetch: true,
        reduceQuality: true,
      };
    } else if (budgetViolations >= 1) {
      return {
        level: 'light',
        disableAnimations: false,
        disableImages: false,
        disablePrefetch: true,
        reduceQuality: false,
      };
    }

    return {
      level: 'none',
      disableAnimations: false,
      disableImages: false,
      disablePrefetch: false,
      reduceQuality: false,
    };
  }, [config.degradationEnabled, budgetViolations]);
}

// =============================================================================
// Exports
// =============================================================================

export { performanceIntegration };
