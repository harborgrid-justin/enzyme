/**
 * @file Performance Utilities Index
 * @description Re-exports all shared performance utility functions.
 *
 * This module serves as the public API for performance utilities,
 * providing a single import point for memory monitoring helpers
 * and other performance-related utilities.
 *
 * @example
 * ```typescript
 * import {
 *   isMemoryApiSupported,
 *   getPerformanceMemory,
 *   calculateMemoryUsagePercent,
 *   getMemoryPressureLevel,
 * } from '@/lib/performance/utils';
 * ```
 */

// ============================================================================
// Memory Utilities
// ============================================================================

export {
  isMemoryApiSupported,
  getPerformanceMemory,
  calculateMemoryUsagePercent,
  getMemoryPressureLevel,
  type PerformanceMemoryInfo,
  type PerformanceWithMemory,
} from './memory';

// ============================================================================
// Re-export formatBytes from config (canonical source)
// ============================================================================

export { formatBytes } from '../../../config/performance.config';
