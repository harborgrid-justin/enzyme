/**
 * @file Hydration Hooks Index
 * @description Barrel export for all hydration-related React hooks.
 *
 * This module exports hooks for:
 * - Accessing the hydration system (useHydration)
 * - Tracking boundary status (useHydrationStatus)
 * - Controlling priority (useHydrationPriority)
 * - Manual hydration control (useDeferredHydration)
 * - Performance metrics (useHydrationMetrics)
 *
 * @module hydration/hooks
 */

// ============================================================================
// Core Hydration Hook
// ============================================================================

export {
  useHydration,
  useHasHydrationContext,
  type UseHydrationReturn,
  type UseHydrationOptions,
} from './useHydration';

// ============================================================================
// Status Tracking Hooks
// ============================================================================

export {
  useHydrationStatus,
  useIsHydrated,
  useWaitForHydration,
  type UseHydrationStatusReturn,
  type UseHydrationStatusOptions,
} from './useHydrationStatus';

// ============================================================================
// Priority Control Hooks
// ============================================================================

export {
  useHydrationPriority,
  useAdaptiveHydrationPriority,
  PRIORITY_ORDER,
  PRIORITY_TO_LEVEL,
  LEVEL_TO_PRIORITY,
  type UseHydrationPriorityReturn,
  type UseHydrationPriorityOptions,
  type PriorityLevel,
} from './useHydrationPriority';

// ============================================================================
// Deferred Hydration Hooks
// ============================================================================

export {
  useDeferredHydration,
  useSimpleDeferredHydration,
  useIdleHydration,
  type UseDeferredHydrationReturn,
  type DeferredHydrationConfig,
  type DeferredHydrationContainerProps,
} from './useDeferredHydration';

// ============================================================================
// Metrics Hooks
// ============================================================================

export {
  useHydrationMetrics,
  useHydrationMetricValue,
  useHydrationProgress,
  useIsHydrationComplete,
  useTimeToFullHydration,
  useHydrationMetricsDebug,
  type UseHydrationMetricsReturn,
  type UseHydrationMetricsOptions,
} from './useHydrationMetrics';
