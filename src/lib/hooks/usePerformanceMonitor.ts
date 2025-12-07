/**
 * @file Performance Monitoring Hook
 * @description Enterprise-grade performance monitoring with Web Vitals and custom metrics
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';
import { useBuffer } from './shared/useBuffer';

interface PerformanceMetrics {
  CLS?: number; // Cumulative Layout Shift
  FCP?: number; // First Contentful Paint
  INP?: number; // Interaction to Next Paint (replaced FID)
  LCP?: number; // Largest Contentful Paint
  TTFB?: number; // Time to First Byte
  customMetrics: Map<string, number>;
  resourceTimings: PerformanceResourceTiming[];
  longTasks: PerformanceEntry[];
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

interface PerformanceThresholds {
  CLS?: number;
  FCP?: number;
  INP?: number;
  LCP?: number;
  TTFB?: number;
  memoryUsage?: number;
}

interface UsePerformanceMonitorOptions {
  enableWebVitals?: boolean;
  enableResourceTiming?: boolean;
  enableLongTaskDetection?: boolean;
  enableMemoryMonitoring?: boolean;
  sampleRate?: number; // 0-1, for sampling metrics collection
  thresholds?: PerformanceThresholds;
  onMetricUpdate?: (metric: Partial<PerformanceMetrics>) => void;
  onThresholdExceeded?: (metricName: string, value: number, threshold: number) => void;
  reportingEndpoint?: string;
  batchSize?: number;
  flushInterval?: number;
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  CLS: 0.1,
  FCP: 1800,
  INP: 200,
  LCP: 2500,
  TTFB: 800,
  memoryUsage: 0.9, // 90% of heap limit
};

export function usePerformanceMonitor(options: UsePerformanceMonitorOptions = {}): {
  metrics: PerformanceMetrics;
  trackMetric: (name: string, value: number) => void;
  markNavigationTiming: (name: string) => (() => void) | undefined;
  getResourceStats: () => {
    totalResources: number;
    totalSize: number;
    totalDuration: number;
    byType: Record<string, { count: number; size: number; duration: number }>;
    slowResources: PerformanceResourceTiming[];
  };
  flushMetrics: () => void;
} {
  const {
    enableWebVitals = true,
    enableResourceTiming = true,
    enableLongTaskDetection = true,
    enableMemoryMonitoring = true,
    sampleRate = 1,
    thresholds = DEFAULT_THRESHOLDS,
    onMetricUpdate,
    onThresholdExceeded,
    reportingEndpoint,
    batchSize = 10,
    flushInterval = 30000, // 30 seconds
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    customMetrics: new Map(),
    resourceTimings: [],
    longTasks: [],
  });

  const observersRef = useRef<{ disconnect: () => void }[]>([]);

  // Send metrics to reporting endpoint
  const sendMetrics = useCallback(
    async (metricsToSend: Partial<PerformanceMetrics>[]): Promise<void> => {
      if (reportingEndpoint == null || metricsToSend.length === 0) return;

      try {
        await fetch(reportingEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metrics: metricsToSend,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
          }),
          keepalive: true, // Ensure request completes even if page unloads
        });
      } catch (error) {
        console.error('Failed to send performance metrics:', error);
      }
    },
    [reportingEndpoint]
  );

  // Use shared buffer for metrics batching
  const metricsBuffer = useBuffer<Partial<PerformanceMetrics>>({
    maxSize: batchSize,
    flushInterval,
    onFlush: sendMetrics,
    flushOnUnmount: true,
  });

  // Check if we should collect metrics based on sample rate
  const shouldCollect = useCallback(() => {
    return Math.random() < sampleRate;
  }, [sampleRate]);

  // Check and report threshold violations
  const checkThreshold = useCallback(
    (metricName: string, value: number) => {
      const threshold = thresholds[metricName as keyof PerformanceThresholds];
      if (threshold != null && value > threshold) {
        onThresholdExceeded?.(metricName, value, threshold);

        // Log critical performance issues
        console.warn(
          `Performance threshold exceeded: ${metricName} = ${value}ms (threshold: ${threshold}ms)`
        );
      }
    },
    [thresholds, onThresholdExceeded]
  );

  // Track custom metric
  const trackMetric = useCallback(
    (name: string, value: number) => {
      if (!shouldCollect()) return;

      setMetrics((prev) => {
        const newMetrics = { ...prev };
        newMetrics.customMetrics.set(name, value);
        return newMetrics;
      });

      const metric = { customMetrics: new Map([[name, value]]) };
      onMetricUpdate?.(metric);
      metricsBuffer.add(metric);
      checkThreshold(name, value);
    },
    [shouldCollect, onMetricUpdate, metricsBuffer, checkThreshold]
  );

  // Mark navigation timing
  const markNavigationTiming = useCallback(
    (name: string) => {
      if (!shouldCollect()) return;

      performance.mark(name);
      return () => {
        performance.measure(name, name);
        const [measure] = performance.getEntriesByName(name, 'measure');
        if (measure != null) {
          trackMetric(`navigation.${name}`, measure.duration);
        }
      };
    },
    [shouldCollect, trackMetric]
  );

  // Get resource load statistics
  const getResourceStats = useCallback((): {
    totalResources: number;
    totalSize: number;
    totalDuration: number;
    byType: Record<string, { count: number; size: number; duration: number }>;
    slowResources: PerformanceResourceTiming[];
  } => {
    const resources = performance.getEntriesByType(
      'resource'
    ) as unknown as PerformanceResourceTiming[];

    const stats = {
      totalResources: resources.length,
      totalSize: 0,
      totalDuration: 0,
      byType: {} as Record<string, { count: number; size: number; duration: number }>,
      slowResources: [] as PerformanceResourceTiming[],
    };

    resources.forEach((resource: PerformanceResourceTiming) => {
      const type = resource.initiatorType ?? 'other';

      stats.byType[type] ??= { count: 0, size: 0, duration: 0 };

      stats.byType[type].count++;
      stats.byType[type].size += resource.transferSize || 0;
      stats.byType[type].duration += resource.duration;

      stats.totalSize += resource.transferSize || 0;
      stats.totalDuration += resource.duration;

      // Track slow resources (> 1 second)
      if (resource.duration > 1000) {
        stats.slowResources.push(resource);
      }
    });

    return stats;
  }, []);

  // Setup Web Vitals monitoring
  useEffect(() => {
    if (!enableWebVitals || !shouldCollect()) return;

    const handleMetric = (metric: Metric): void => {
      const value = Math.round(metric.value);

      setMetrics((prev) => ({
        ...prev,
        [metric.name]: value,
      }));

      const update = { [metric.name]: value };
      onMetricUpdate?.(update);
      metricsBuffer.add(update);
      checkThreshold(metric.name, value);
    };

    // Register Web Vitals observers
    // Note: FID was deprecated in web-vitals v4 and replaced by INP
    onCLS(handleMetric);
    onFCP(handleMetric);
    onINP(handleMetric);
    onLCP(handleMetric);
    onTTFB(handleMetric);
  }, [enableWebVitals, shouldCollect, onMetricUpdate, metricsBuffer, checkThreshold]);

  // Setup resource timing monitoring
  useEffect(() => {
    if (!enableResourceTiming || !shouldCollect()) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceResourceTiming[];

      setMetrics((prev) => ({
        ...prev,
        resourceTimings: [...prev.resourceTimings, ...entries],
      }));

      // Track slow resources
      entries.forEach((entry) => {
        if (entry.duration > 1000) {
          console.warn(`Slow resource detected: ${entry.name} (${Math.round(entry.duration)}ms)`);
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['resource'] });
      observersRef.current.push(observer);
    } catch (error) {
      console.error('Failed to setup resource timing observer:', error);
    }

    return () => observer.disconnect();
  }, [enableResourceTiming, shouldCollect]);

  // Setup long task detection
  useEffect(() => {
    if (!enableLongTaskDetection || !shouldCollect() || !('PerformanceObserver' in window)) {
      return;
    }

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();

      setMetrics((prev) => ({
        ...prev,
        longTasks: [...prev.longTasks, ...entries],
      }));

      entries.forEach((entry) => {
        console.warn(`Long task detected: ${Math.round(entry.duration)}ms`);
        trackMetric('longTask', entry.duration);
      });
    });

    try {
      observer.observe({ entryTypes: ['longtask'] });
      observersRef.current.push(observer);
    } catch (error) {
      console.error('Failed to setup long task observer:', error);
    }

    return () => observer.disconnect();
  }, [enableLongTaskDetection, shouldCollect, trackMetric]);

  // Setup memory monitoring
  useEffect(() => {
    if (!enableMemoryMonitoring || !shouldCollect()) return;

    const checkMemory = (): void => {
      interface PerformanceMemory {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      }

      interface PerformanceWithMemory extends Performance {
        memory?: PerformanceMemory;
      }

      const perf = performance as PerformanceWithMemory;
      if (perf.memory != null) {
        const usage = {
          usedJSHeapSize: perf.memory.usedJSHeapSize,
          totalJSHeapSize: perf.memory.totalJSHeapSize,
          jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
        };

        setMetrics((prev) => ({
          ...prev,
          memoryUsage: usage,
        }));

        // Check memory threshold
        const usageRatio = usage.usedJSHeapSize / usage.jsHeapSizeLimit;
        if (thresholds.memoryUsage != null && usageRatio > thresholds.memoryUsage) {
          onThresholdExceeded?.('memoryUsage', usageRatio * 100, thresholds.memoryUsage * 100);
        }
      }
    };

    const interval = setInterval(checkMemory, 10000); // Check every 10 seconds
    checkMemory(); // Initial check

    return () => clearInterval(interval);
  }, [enableMemoryMonitoring, shouldCollect, thresholds.memoryUsage, onThresholdExceeded]);

  // Cleanup observers on unmount
  useEffect(() => {
    return () => {
      // Cleanup observers
      observersRef.current.forEach((observer) => observer.disconnect());
      observersRef.current = [];
    };
  }, []);

  return {
    metrics,
    trackMetric,
    markNavigationTiming,
    getResourceStats,
    flushMetrics: metricsBuffer.flush,
  };
}

// Export types for external use
export type { PerformanceMetrics, PerformanceThresholds, UsePerformanceMonitorOptions };
