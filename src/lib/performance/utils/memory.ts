/**
 * @file Memory Utility Functions
 * @description Shared memory API utilities for performance monitoring.
 *
 * This module provides cross-browser compatible helpers for accessing
 * the Performance Memory API (Chrome/Chromium only) with graceful degradation.
 *
 * @example
 * ```typescript
 * import { isMemoryApiSupported, getPerformanceMemory } from '@/lib/performance/utils/memory';
 *
 * if (isMemoryApiSupported()) {
 *   const memory = getPerformanceMemory();
 *   console.log(`Heap usage: ${memory?.usedJSHeapSize}`);
 * }
 * ```
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Performance memory information
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory
 */
export interface PerformanceMemoryInfo {
  /** The total allocated heap size, in bytes */
  readonly usedJSHeapSize: number;
  /** The current size of the JS heap including free space not occupied by any JS objects */
  readonly totalJSHeapSize: number;
  /** The maximum size of the heap, in bytes, that is available to the context */
  readonly jsHeapSizeLimit: number;
}

/**
 * Extended Performance interface with memory property (Chrome only)
 */
interface PerformanceWithMemory extends Performance {
  memory?: PerformanceMemoryInfo;
}

// ============================================================================
// Memory API Detection
// ============================================================================

/**
 * Check if the Memory API is supported in the current browser.
 *
 * The Memory API (performance.memory) is a non-standard API only available
 * in Chrome/Chromium-based browsers.
 *
 * @returns true if performance.memory is available
 *
 * @example
 * ```typescript
 * if (isMemoryApiSupported()) {
 *   // Safe to use memory monitoring features
 *   startMemoryMonitoring();
 * } else {
 *   console.log('Memory API not supported in this browser');
 * }
 * ```
 */
export function isMemoryApiSupported(): boolean {
  return typeof performance !== 'undefined' && 'memory' in performance;
}

// ============================================================================
// Memory Data Access
// ============================================================================

/**
 * Get the current performance memory information.
 *
 * Returns null if the Memory API is not supported.
 *
 * @returns PerformanceMemoryInfo object or null if unavailable
 *
 * @example
 * ```typescript
 * const memory = getPerformanceMemory();
 * if (memory) {
 *   const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
 *   console.log(`Memory usage: ${usagePercent.toFixed(1)}%`);
 * }
 * ```
 */
export function getPerformanceMemory(): PerformanceMemoryInfo | null {
  if (!isMemoryApiSupported()) {
    return null;
  }

  const perfWithMemory = performance as PerformanceWithMemory;
  return perfWithMemory.memory ?? null;
}

/**
 * Calculate memory usage percentage from performance memory info.
 *
 * @param memory - Performance memory info object
 * @returns Usage percentage (0-100) or null if memory is null
 *
 * @example
 * ```typescript
 * const memory = getPerformanceMemory();
 * const usage = calculateMemoryUsagePercent(memory);
 * if (usage !== null && usage > 80) {
 *   console.warn('High memory usage detected');
 * }
 * ```
 */
export function calculateMemoryUsagePercent(memory: PerformanceMemoryInfo | null): number | null {
  if (!memory) {
    return null;
  }
  return (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
}

/**
 * Determine memory pressure level based on usage percentage.
 *
 * @param usagePercent - Memory usage as percentage (0-100)
 * @param warningThreshold - Threshold for warning level (0-1, default 0.7)
 * @param criticalThreshold - Threshold for critical level (0-1, default 0.9)
 * @returns Memory pressure level
 *
 * @example
 * ```typescript
 * const memory = getPerformanceMemory();
 * const usage = calculateMemoryUsagePercent(memory);
 * if (usage !== null) {
 *   const pressure = getMemoryPressureLevel(usage);
 *   if (pressure === 'critical') {
 *     triggerEmergencyCleanup();
 *   }
 * }
 * ```
 */
export function getMemoryPressureLevel(
  usagePercent: number,
  warningThreshold: number = 0.7,
  criticalThreshold: number = 0.9
): 'normal' | 'warning' | 'critical' {
  const usage = usagePercent / 100;
  if (usage >= criticalThreshold) return 'critical';
  if (usage >= warningThreshold) return 'warning';
  return 'normal';
}

// ============================================================================
// Exports
// ============================================================================

export type { PerformanceWithMemory };
