/**
 * @file Performance Hooks Barrel Export
 * @description Centralized exports for all performance-related React hooks.
 *
 * This module provides a comprehensive set of hooks for monitoring and optimizing
 * React application performance, including:
 *
 * - Budget awareness and enforcement
 * - Render metrics and optimization
 * - Long task detection
 * - Memory pressure monitoring
 * - Network quality adaptation
 *
 * @example
 * ```typescript
 * import {
 *   usePerformanceBudget,
 *   useRenderMetrics,
 *   useLongTaskDetector,
 *   useMemoryPressure,
 *   useNetworkQuality,
 * } from '@/lib/performance/hooks';
 * ```
 */

// ============================================================================
// Performance Budget Hooks
// ============================================================================

export {
  usePerformanceBudget,
  useBudgetStatus,
  useDegradedMode,
  useBudgetConditional,
  type UsePerformanceBudgetOptions,
  type UsePerformanceBudgetReturn,
  type BudgetStatus,
} from './usePerformanceBudget';

// ============================================================================
// Render Metrics Hooks
// ============================================================================

export {
  useRenderMetrics,
  useRenderPhaseMetrics,
  useRenderProfiler,
  useWastedRenderDetector,
  type UseRenderMetricsOptions,
  type UseRenderMetricsReturn,
  type RenderMetrics,
} from './useRenderMetrics';

// ============================================================================
// Long Task Detection Hooks
// ============================================================================

export {
  useLongTaskDetector,
  useDeferredRender,
  useBlockingTimeTracker,
  useYieldToMain,
  type UseLongTaskDetectorOptions,
  type UseLongTaskDetectorReturn,
  type LongTaskStats,
} from './useLongTaskDetector';

// ============================================================================
// Memory Pressure Hooks
// ============================================================================

export {
  useMemoryPressure,
  useMemoryCleanup,
  useMemoryAwareCache,
  useComponentMemoryImpact,
  type UseMemoryPressureOptions,
  type UseMemoryPressureReturn,
  type MemoryPressureLevel,
  type MemorySnapshot,
  type MemoryTrend,
} from './useMemoryPressure';

// ============================================================================
// Network Quality Hooks
// ============================================================================

export {
  useNetworkQuality,
  useAdaptiveImageQuality,
  useNetworkConditional,
  useNetworkAwareLazyLoad,
  useRequestPerformance,
  useNetworkStatusIndicator,
  usePreconnect,
  type UseNetworkQualityOptions,
  type UseNetworkQualityReturn,
  type AdaptiveLoadingStrategy,
} from './useNetworkQuality';

// ============================================================================
// Composite Hooks
// ============================================================================

/**
 * Combined performance awareness hook
 *
 * Provides a unified interface for all performance metrics, useful for
 * components that need comprehensive performance awareness.
 *
 * @example
 * ```tsx
 * function PerformanceAwareComponent() {
 *   const perf = usePerformanceAwareness();
 *
 *   if (perf.shouldReduceComplexity) {
 *     return <SimplifiedVersion />;
 *   }
 *
 *   return <FullVersion />;
 * }
 * ```
 */
export function usePerformanceAwareness(): {
  /** Should reduce rendering complexity */
  shouldReduceComplexity: boolean;
  /** Should defer non-critical work */
  shouldDefer: boolean;
  /** Is system under pressure */
  isUnderPressure: boolean;
  /** Overall health score (0-100) */
  healthScore: number;
  /** Current constraints */
  constraints: {
    memory: 'normal' | 'warning' | 'critical';
    network: 'fast' | 'moderate' | 'slow';
    mainThread: 'free' | 'busy' | 'blocked';
  };
} {
  const { pressure: memoryPressure, shouldReduceMemory } = useMemoryPressure();
  const { isBlocked, isHighBlocking } = useLongTaskDetector();
  const { isSlowConnection, score: networkScore } = useNetworkQuality();
  const { hasViolations, healthScore: budgetHealth } = usePerformanceBudget();

  const shouldReduceComplexity =
    shouldReduceMemory ||
    isHighBlocking ||
    isSlowConnection ||
    hasViolations;

  const shouldDefer =
    isBlocked ||
    memoryPressure === 'critical';

  const isUnderPressure =
    memoryPressure !== 'normal' ||
    isHighBlocking ||
    hasViolations;

  let memoryScore = 0;
  if (memoryPressure === 'normal') {
    memoryScore = 100;
  } else if (memoryPressure === 'warning') {
    memoryScore = 50;
  }
  const healthScore = Math.round((budgetHealth + networkScore + memoryScore) / 3);

  const memoryConstraint = memoryPressure;
  let networkConstraint: 'fast' | 'moderate' | 'slow';
  if (networkScore >= 70) {
    networkConstraint = 'fast';
  } else if (networkScore >= 40) {
    networkConstraint = 'moderate';
  } else {
    networkConstraint = 'slow';
  }
  let mainThreadConstraint: 'free' | 'busy' | 'blocked';
  if (isBlocked) {
    mainThreadConstraint = 'blocked';
  } else if (isHighBlocking) {
    mainThreadConstraint = 'busy';
  } else {
    mainThreadConstraint = 'free';
  }

  return {
    shouldReduceComplexity,
    shouldDefer,
    isUnderPressure,
    healthScore,
    constraints: {
      memory: memoryConstraint,
      network: networkConstraint,
      mainThread: mainThreadConstraint,
    },
  };
}

/**
 * Hook for adaptive component rendering
 *
 * Returns the appropriate version of content based on current performance constraints.
 *
 * @example
 * ```tsx
 * function AdaptiveList({ items }) {
 *   const renderItem = useAdaptiveRender(
 *     (item) => <RichListItem item={item} />,      // Full
 *     (item) => <SimpleListItem item={item} />,   // Reduced
 *     (item) => <SkeletonItem />                  // Minimal
 *   );
 *
 *   return items.map(renderItem);
 * }
 * ```
 */
export function useAdaptiveRender<T, R>(
  fullRender: (item: T) => R,
  reducedRender: (item: T) => R,
  minimalRender: (item: T) => R
): (item: T) => R {
  const { constraints } = usePerformanceAwareness();

  if (
    constraints.memory === 'critical' ||
    constraints.mainThread === 'blocked' ||
    constraints.network === 'slow'
  ) {
    return minimalRender;
  }

  if (
    constraints.memory === 'warning' ||
    constraints.mainThread === 'busy' ||
    constraints.network === 'moderate'
  ) {
    return reducedRender;
  }

  return fullRender;
}

// ============================================================================
// Optimized Performance Hooks (Agent 7 PhD-Level Additions)
// ============================================================================

export {
  // Hooks
  useOptimizedRender,
  useLazyFeature,
  useProgressiveLoad,
  // Utilities
  clearFeatureCache,
  preloadFeature,
  // Types
  type RenderPriority,
  type LazyFeatureStatus,
  type ProgressiveLoadPhase,
  type NetworkQuality as ProgressiveNetworkQuality,
  type UseOptimizedRenderOptions,
  type UseOptimizedRenderReturn,
  type UseLazyFeatureOptions,
  type UseLazyFeatureReturn,
  type UseProgressiveLoadOptions,
  type UseProgressiveLoadReturn,
} from './useOptimizedHooks';

// Import hooks for composite hook implementation
import { useMemoryPressure } from './useMemoryPressure';
import { useLongTaskDetector } from './useLongTaskDetector';
import { useNetworkQuality } from './useNetworkQuality';
import { usePerformanceBudget } from './usePerformanceBudget';
