/**
 * @file Performance Observatory Context
 * @description Context for performance monitoring (Fast Refresh compliant).
 */

import { createContext } from 'react';

/**
 * Performance metric
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Performance observatory context value
 */
export interface PerformanceObservatoryContextValue {
  metrics: PerformanceMetric[];
  recordMetric: (name: string, value: number, metadata?: Record<string, unknown>) => void;
  clearMetrics: () => void;
  getMetric: (name: string) => PerformanceMetric | undefined;
  getMetricsByName: (name: string) => PerformanceMetric[];
  isObserving: boolean;
  startObserving: () => void;
  stopObserving: () => void;
}

/**
 * Performance observatory context - extracted for Fast Refresh compliance
 */
export const PerformanceObservatoryContext = createContext<PerformanceObservatoryContextValue | null>(null);

PerformanceObservatoryContext.displayName = 'PerformanceObservatoryContext';
