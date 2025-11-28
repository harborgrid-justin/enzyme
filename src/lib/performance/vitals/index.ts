/**
 * @file Vitals Module Index
 * @description Sub-path exports for Web Vitals collection and reporting.
 *
 * This module provides Core Web Vitals tracking, performance budgets,
 * and analytics integration.
 *
 * @example
 * ```typescript
 * import {
 *   VitalsCollector,
 *   getVitalsCollector,
 *   initVitals,
 *   DEFAULT_BUDGETS,
 * } from '@/lib/performance/vitals';
 * ```
 */

// Re-export everything from the vitals module
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
} from '../vitals';
