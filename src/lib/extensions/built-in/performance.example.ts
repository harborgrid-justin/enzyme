/**
 * @file Performance Extension Usage Examples
 * @description Comprehensive examples of using the performance monitoring extension
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { performanceExtension } from './performance';
import type { PerformanceExtensionConfig } from './performance';

// ============================================================================
// Example 1: Basic Setup
// ============================================================================

/**
 * Basic setup with default configuration
 */
export function example1_BasicSetup() {
  // Assuming Enzyme client exists
  const enzyme = {} as any; // Replace with actual Enzyme client

  // Apply extension
  enzyme.$extends(performanceExtension);

  // Start monitoring (auto-starts by default)
  console.log('Performance monitoring active');
}

// ============================================================================
// Example 2: Production Configuration
// ============================================================================

/**
 * Production-ready configuration with sampling
 */
export function example2_ProductionConfig() {
  const enzyme = {} as any;
  enzyme.$extends(performanceExtension);

  // Configure for production
  const config: PerformanceExtensionConfig = {
    enableVitals: true,
    enableRenderTracking: false, // Disable in production
    enableMemoryMonitoring: true,
    enableLongTaskDetection: true,
    enableNetworkMetrics: true,
    sampleRate: 0.05, // 5% sampling
    analyticsEndpoint: 'https://analytics.example.com/vitals',
    debug: false,
    autoStart: true,
  };

  enzyme.$startPerformanceMonitoring(config);
}

// ============================================================================
// Example 3: Component Render Tracking
// ============================================================================

/**
 * Track React component renders
 */
export function example3_RenderTracking() {
  const enzyme = {} as any;
  enzyme.$extends(performanceExtension);

  // In a React component
  function MyComponent() {
    // Track render
    const stopTracking = enzyme.$trackRender('MyComponent', 'update');

    // Cleanup on unmount
    // useEffect(() => stopTracking, []);

    return null; // JSX
  }

  // Track mount phase
  function AnotherComponent() {
    const stopTracking = enzyme.$trackRender('AnotherComponent', 'mount');
    // useEffect(() => stopTracking, []);
    return null;
  }
}

// ============================================================================
// Example 4: Async Operation Measurement
// ============================================================================

/**
 * Measure async operations
 */
export async function example4_AsyncMeasurement() {
  const enzyme = {} as any;
  enzyme.$extends(performanceExtension);

  // Measure API call
  const userData = await enzyme.$measureOperation('fetchUserData', async () => {
    const response = await fetch('/api/users/123');
    return response.json();
  });

  // Measure computation
  const result = await enzyme.$measureOperation('complexCalculation', async () => {
    // Simulate expensive operation
    let sum = 0;
    for (let i = 0; i < 1000000; i++) {
      sum += Math.sqrt(i);
    }
    return sum;
  });

  // Measure database query
  const records = await enzyme.$measureOperation('databaseQuery', async () => {
    // Simulated database query
    return [];
  });

  console.log('Operations measured:', { userData, result, records });
}

// ============================================================================
// Example 5: Performance Budgets
// ============================================================================

/**
 * Set and enforce performance budgets
 */
export function example5_PerformanceBudgets() {
  const enzyme = {} as any;
  enzyme.$extends(performanceExtension);

  // Set comprehensive budgets
  enzyme.$setPerformanceBudget({
    // Core Web Vitals
    'LCP': {
      warning: 2000,
      critical: 2500,
      unit: 'ms',
      description: 'Largest Contentful Paint',
    },
    'INP': {
      warning: 200,
      critical: 500,
      unit: 'ms',
      description: 'Interaction to Next Paint',
    },
    'CLS': {
      warning: 0.1,
      critical: 0.25,
      unit: 'score',
      description: 'Cumulative Layout Shift',
    },
    'FCP': {
      warning: 1800,
      critical: 3000,
      unit: 'ms',
      description: 'First Contentful Paint',
    },
    'TTFB': {
      warning: 800,
      critical: 1800,
      unit: 'ms',
      description: 'Time to First Byte',
    },

    // Bundle sizes
    'bundle.initial': {
      warning: 150000, // 150KB
      critical: 200000, // 200KB
      unit: 'bytes',
      description: 'Initial bundle size',
    },
    'bundle.async': {
      warning: 50000,
      critical: 100000,
      unit: 'bytes',
      description: 'Async chunk size',
    },
    'bundle.vendor': {
      warning: 150000,
      critical: 200000,
      unit: 'bytes',
      description: 'Vendor bundle size',
    },

    // Runtime budgets
    'runtime.fps': {
      warning: 50,
      critical: 30,
      unit: 'fps',
      description: 'Frames per second',
    },
    'runtime.jsPerFrame': {
      warning: 10,
      critical: 16,
      unit: 'ms',
      description: 'JS execution per frame',
    },

    // Memory budgets
    'memory.heapUsage': {
      warning: 70,
      critical: 90,
      unit: 'percent',
      description: 'JS heap usage percentage',
    },
  });

  console.log('Performance budgets configured');
}

// ============================================================================
// Example 6: Get and Monitor Metrics
// ============================================================================

/**
 * Access current performance metrics
 */
export function example6_MonitorMetrics() {
  const enzyme = {} as any;
  enzyme.$extends(performanceExtension);

  // Get all metrics
  const metrics = enzyme.$getMetrics();

  // Check vitals
  if (metrics.vitals) {
    console.log('LCP:', metrics.vitals.LCP?.value, 'ms');
    console.log('INP:', metrics.vitals.INP?.value, 'ms');
    console.log('CLS:', metrics.vitals.CLS?.value);
    console.log('Overall Score:', metrics.vitals.score);
    console.log('Rating:', metrics.vitals.rating);
  }

  // Check performance
  if (metrics.performance) {
    console.log('Long Tasks:', metrics.performance.longTaskCount);
    console.log('Critical Long Tasks:', metrics.performance.criticalLongTaskCount);
    console.log('Frame Drops:', metrics.performance.frameDrops);
    console.log('Average FPS:', metrics.performance.averageFps);
    console.log('Memory Pressure:', metrics.performance.currentMemoryPressure);
  }

  // Check budgets
  const criticalBudgets = metrics.budgets.filter((b) => b.status === 'critical');
  const warningBudgets = metrics.budgets.filter((b) => b.status === 'warning');

  console.log('Critical Budget Violations:', criticalBudgets.length);
  console.log('Warning Budget Violations:', warningBudgets.length);

  // Check recent renders
  const slowRenders = metrics.renders.filter((r) => r.duration && r.duration > 16);
  console.log('Slow Renders:', slowRenders.length);

  // Check operations
  const failedOperations = metrics.operations.filter((o) => !o.success);
  console.log('Failed Operations:', failedOperations.length);
}

// ============================================================================
// Example 7: Generate Performance Report
// ============================================================================

/**
 * Generate and export performance report
 */
export function example7_GenerateReport() {
  const enzyme = {} as any;
  enzyme.$extends(performanceExtension);

  // Generate comprehensive report
  const report = enzyme.$getPerformanceReport();

  console.log('=== Performance Report ===');
  console.log('Generated:', new Date(report.timestamp));
  console.log('URL:', report.url);
  console.log('Session Duration:', report.sessionDuration, 'ms');
  console.log('Health Score:', report.healthScore, '/100');

  // Vitals summary
  if (report.vitals) {
    console.log('\n=== Web Vitals ===');
    console.log('LCP:', report.vitals.LCP?.value, 'ms', `(${report.vitals.LCP?.rating})`);
    console.log('INP:', report.vitals.INP?.value, 'ms', `(${report.vitals.INP?.rating})`);
    console.log('CLS:', report.vitals.CLS?.value, `(${report.vitals.CLS?.rating})`);
  }

  // Budget status
  console.log('\n=== Budget Status ===');
  report.budgetStatus.forEach((budget) => {
    console.log(`${budget.budgetName}:`, budget.status, '-', budget.currentValue);
  });

  // Violations
  if (report.violations.length > 0) {
    console.log('\n=== Recent Violations ===');
    report.violations.slice(-5).forEach((violation) => {
      console.log(
        `[${violation.severity.toUpperCase()}]`,
        violation.budgetName,
        ':',
        violation.value,
        '(budget:',
        violation.threshold + ')'
      );
    });
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    console.log('\n=== Recommendations ===');
    report.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
  }

  // Network quality
  if (report.networkQuality) {
    console.log('\n=== Network Quality ===');
    console.log('Type:', report.networkQuality.effectiveType);
    console.log('Downlink:', report.networkQuality.downlink, 'Mbps');
    console.log('RTT:', report.networkQuality.rtt, 'ms');
  }

  // Export to JSON
  const json = enzyme.$exportReport();
  console.log('\nExported JSON length:', json.length, 'characters');

  return report;
}

// ============================================================================
// Example 8: Timeline Markers
// ============================================================================

/**
 * Add timeline markers for important events
 */
export function example8_TimelineMarkers() {
  const enzyme = {} as any;
  enzyme.$extends(performanceExtension);

  // Mark application lifecycle events
  enzyme.$markTimeline('app-init');

  // Simulate app initialization
  setTimeout(() => {
    enzyme.$markTimeline('config-loaded');
  }, 100);

  setTimeout(() => {
    enzyme.$markTimeline('auth-complete');
  }, 200);

  setTimeout(() => {
    enzyme.$markTimeline('app-ready');
  }, 300);

  // Mark user interactions
  function handleUserClick() {
    enzyme.$markTimeline('user-clicked-button');
  }

  // Mark data loading
  async function loadData() {
    enzyme.$markTimeline('data-fetch-start');
    // Simulate fetch
    await new Promise((resolve) => setTimeout(resolve, 500));
    enzyme.$markTimeline('data-fetch-complete');
  }
}

// ============================================================================
// Example 9: Bundle Size Tracking
// ============================================================================

/**
 * Track JavaScript bundle sizes
 */
export function example9_BundleSizeTracking() {
  const enzyme = {} as any;
  enzyme.$extends(performanceExtension);

  // Track initial bundle
  enzyme.$trackBundleSize('main', 156789, 'initial', 52341);

  // Track vendor bundle
  enzyme.$trackBundleSize('vendor', 234567, 'vendor', 78234);

  // Track async chunks
  enzyme.$trackBundleSize('dashboard', 45678, 'async', 12345);
  enzyme.$trackBundleSize('settings', 23456, 'async', 7890);
  enzyme.$trackBundleSize('reports', 67890, 'async', 23456);

  console.log('Bundle sizes tracked');
}

// ============================================================================
// Example 10: Network-Aware Performance
// ============================================================================

/**
 * Adapt behavior based on network quality
 */
export function example10_NetworkAwarePerformance() {
  const enzyme = {} as any;
  enzyme.$extends(performanceExtension);

  const networkQuality = enzyme.$getNetworkQuality();

  if (networkQuality) {
    // Adapt based on connection type
    switch (networkQuality.effectiveType) {
      case 'slow-2g':
      case '2g':
        console.log('Slow connection - loading minimal assets');
        // Load text-only version
        break;

      case '3g':
        console.log('Moderate connection - loading standard assets');
        // Load standard quality images
        break;

      case '4g':
        console.log('Fast connection - loading high-quality assets');
        // Load high-quality images and videos
        break;

      default:
        console.log('Unknown connection - using default');
    }

    // Check for data saver mode
    if (networkQuality.saveData) {
      console.log('Data saver enabled - reducing bandwidth usage');
      // Disable auto-play videos
      // Use smaller images
      // Reduce polling frequency
    }

    // Adapt based on RTT
    if (networkQuality.rtt > 300) {
      console.log('High latency - reducing real-time features');
      // Reduce WebSocket frequency
      // Increase local caching
    }
  }
}

// ============================================================================
// Example 11: Periodic Monitoring
// ============================================================================

/**
 * Set up periodic performance monitoring
 */
export function example11_PeriodicMonitoring() {
  const enzyme = {} as any;
  enzyme.$extends(performanceExtension);

  // Monitor every minute
  const intervalId = setInterval(() => {
    const report = enzyme.$getPerformanceReport();

    // Log key metrics
    console.log('Performance Check:', {
      timestamp: new Date(report.timestamp),
      healthScore: report.healthScore,
      violations: report.violations.length,
      memoryPressure: report.performance?.currentMemoryPressure,
    });

    // Send to analytics
    if (report.healthScore < 70) {
      console.warn('Performance degradation detected!');
      // Send alert
    }
  }, 60000); // Every minute

  // Cleanup
  return () => clearInterval(intervalId);
}

// ============================================================================
// Example 12: Development vs Production
// ============================================================================

/**
 * Different configurations for development and production
 */
export function example12_EnvironmentSpecific() {
  const enzyme = {} as any;
  enzyme.$extends(performanceExtension);

  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    // Development configuration
    enzyme.$startPerformanceMonitoring({
      enableVitals: true,
      enableRenderTracking: true, // Track all renders
      enableMemoryMonitoring: true,
      enableLongTaskDetection: true,
      enableNetworkMetrics: true,
      sampleRate: 1.0, // Track everything
      debug: true, // Enable debug logging
      autoStart: true,
    });

    console.log('Development mode: Full performance monitoring enabled');
  } else {
    // Production configuration
    enzyme.$startPerformanceMonitoring({
      enableVitals: true,
      enableRenderTracking: false, // Disable in production
      enableMemoryMonitoring: true,
      enableLongTaskDetection: true,
      enableNetworkMetrics: true,
      sampleRate: 0.05, // 5% sampling
      analyticsEndpoint: 'https://analytics.example.com/vitals',
      debug: false, // No debug logging
      autoStart: true,
    });

    console.log('Production mode: Sampled performance monitoring enabled');
  }
}

// ============================================================================
// Example 13: Integration with Analytics
// ============================================================================

/**
 * Send performance data to analytics
 */
export async function example13_AnalyticsIntegration() {
  const enzyme = {} as any;
  enzyme.$extends(performanceExtension);

  // Periodic reporting to analytics
  setInterval(() => {
    const report = enzyme.$getPerformanceReport();

    // Send to your analytics service
    const analyticsData = {
      event: 'performance_snapshot',
      properties: {
        healthScore: report.healthScore,
        sessionDuration: report.sessionDuration,
        lcp: report.vitals?.LCP?.value,
        inp: report.vitals?.INP?.value,
        cls: report.vitals?.CLS?.value,
        fcp: report.vitals?.FCP?.value,
        ttfb: report.vitals?.TTFB?.value,
        longTasks: report.performance?.longTaskCount,
        memoryPressure: report.performance?.currentMemoryPressure,
        budgetViolations: report.violations.length,
        networkType: report.networkQuality?.effectiveType,
      },
    };

    // Send to analytics (example)
    // analytics.track(analyticsData);
    console.log('Analytics data:', analyticsData);
  }, 5 * 60 * 1000); // Every 5 minutes
}

// ============================================================================
// Example 14: Custom Budget Thresholds
// ============================================================================

/**
 * Create custom performance budgets for your app
 */
export function example14_CustomBudgets() {
  const enzyme = {} as any;
  enzyme.$extends(performanceExtension);

  // Set custom budgets for your specific needs
  enzyme.$setPerformanceBudget({
    // Custom API response time budget
    'operation.fetchUserData': {
      warning: 500,
      critical: 1000,
      unit: 'ms',
      description: 'User data fetch time',
    },

    // Custom render time budget
    'component.Dashboard': {
      warning: 100,
      critical: 200,
      unit: 'ms',
      description: 'Dashboard render time',
    },

    // Custom memory budget
    'memory.componentCache': {
      warning: 50000000, // 50MB
      critical: 100000000, // 100MB
      unit: 'bytes',
      description: 'Component cache size',
    },
  });

  console.log('Custom budgets configured');
}

// ============================================================================
// Export all examples
// ============================================================================

export const examples = {
  example1_BasicSetup,
  example2_ProductionConfig,
  example3_RenderTracking,
  example4_AsyncMeasurement,
  example5_PerformanceBudgets,
  example6_MonitorMetrics,
  example7_GenerateReport,
  example8_TimelineMarkers,
  example9_BundleSizeTracking,
  example10_NetworkAwarePerformance,
  example11_PeriodicMonitoring,
  example12_EnvironmentSpecific,
  example13_AnalyticsIntegration,
  example14_CustomBudgets,
};
