/* eslint-disable react-refresh/only-export-components */
import React from 'react';
/**
 * @fileoverview Flag analytics bridge for connecting flags to monitoring systems.
 *
 * This module provides a bridge between the feature flag system and various
 * analytics/monitoring systems. It enables correlation tracking, impact
 * measurement, and exposure analytics across library features.
 *
 * @module flags/integration/flag-analytics-bridge
 *
 * @example
 * ```typescript
 * import {
 *   FlagAnalyticsBridge,
 *   createAnalyticsBridge,
 *   useFlagAnalytics,
 * } from '@/lib/flags/integration/flag-analytics-bridge';
 *
 * // Create a bridge
 * const bridge = createAnalyticsBridge({
 *   onExposure: (event) => analytics.track('feature_exposure', event),
 *   onEvaluation: (event) => analytics.track('flag_evaluation', event),
 *   onImpact: (metric) => analytics.track('feature_impact', metric),
 * });
 *
 * // Track exposure
 * bridge.trackExposure({
 *   flagKey: 'new-checkout',
 *   variant: 'enabled',
 *   userId: 'user-123',
 * });
 *
 * // Track performance correlation
 * bridge.trackPerformanceCorrelation({
 *   metricName: 'page_load_time',
 *   value: 1250,
 *   flagStates: { 'new-checkout': true, 'lazy-load': true },
 * });
 * ```
 */

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * Flag exposure event
 */
export interface FlagExposureEvent {
  /** Feature flag key */
  readonly flagKey: string;
  /** Variant shown */
  readonly variant: string;
  /** User identifier */
  readonly userId?: string;
  /** Session identifier */
  readonly sessionId?: string;
  /** Page/route where exposed */
  readonly page?: string;
  /** Component that rendered the flag */
  readonly component?: string;
  /** Timestamp of exposure */
  readonly timestamp: number;
  /** Additional context */
  readonly context?: Readonly<Record<string, unknown>>;
}

/**
 * Flag evaluation event
 */
export interface FlagEvaluationEvent {
  /** Feature flag key */
  readonly flagKey: string;
  /** Evaluated value */
  readonly value: boolean | string | number;
  /** Reason for the value */
  readonly reason: 'flag' | 'override' | 'default' | 'error';
  /** Evaluation duration (ms) */
  readonly durationMs?: number;
  /** User identifier */
  readonly userId?: string;
  /** Timestamp of evaluation */
  readonly timestamp: number;
  /** Additional context */
  readonly context?: Readonly<Record<string, unknown>>;
}

/**
 * Performance metric with flag correlation
 */
export interface CorrelatedMetric {
  /** Metric name */
  readonly metricName: string;
  /** Metric value */
  readonly value: number;
  /** Unit of measurement */
  readonly unit?: string;
  /** Active flag states at time of measurement */
  readonly flagStates: Readonly<Record<string, boolean>>;
  /** Page/route where measured */
  readonly page?: string;
  /** User identifier */
  readonly userId?: string;
  /** Timestamp of measurement */
  readonly timestamp: number;
  /** Additional context */
  readonly context?: Readonly<Record<string, unknown>>;
}

/**
 * Error event with flag context
 */
export interface CorrelatedError {
  /** Error message */
  readonly message: string;
  /** Error stack trace */
  readonly stack?: string;
  /** Error type/name */
  readonly type: string;
  /** Active flag states when error occurred */
  readonly flagStates: Readonly<Record<string, boolean>>;
  /** Component where error occurred */
  readonly component?: string;
  /** Page/route where error occurred */
  readonly page?: string;
  /** Timestamp of error */
  readonly timestamp: number;
  /** Additional context */
  readonly context?: Readonly<Record<string, unknown>>;
}

/**
 * Feature impact metric
 */
export interface FeatureImpactMetric {
  /** Feature flag key */
  readonly flagKey: string;
  /** Metric name */
  readonly metricName: string;
  /** Value when flag is enabled */
  readonly enabledValue: number;
  /** Value when flag is disabled */
  readonly disabledValue: number;
  /** Percentage change */
  readonly percentageChange: number;
  /** Sample size for enabled variant */
  readonly enabledSampleSize: number;
  /** Sample size for disabled variant */
  readonly disabledSampleSize: number;
  /** Statistical significance (p-value) */
  readonly pValue?: number;
  /** Confidence interval */
  readonly confidenceInterval?: {
    lower: number;
    upper: number;
  };
  /** Time period of analysis */
  readonly period: {
    start: number;
    end: number;
  };
}

/**
 * Analytics destinations
 */
export interface AnalyticsDestination {
  /** Destination identifier */
  readonly id: string;
  /** Whether destination is enabled */
  readonly enabled: boolean;
  /** Send exposure event */
  sendExposure?(event: FlagExposureEvent): void | Promise<void>;
  /** Send evaluation event */
  sendEvaluation?(event: FlagEvaluationEvent): void | Promise<void>;
  /** Send correlated metric */
  sendMetric?(metric: CorrelatedMetric): void | Promise<void>;
  /** Send correlated error */
  sendError?(error: CorrelatedError): void | Promise<void>;
  /** Batch send events */
  flush?(): void | Promise<void>;
}

/**
 * Bridge configuration
 */
export interface FlagAnalyticsBridgeConfig {
  /** Destinations for analytics */
  readonly destinations?: readonly AnalyticsDestination[];
  /** Callback for exposure events */
  readonly onExposure?: (event: FlagExposureEvent) => void;
  /** Callback for evaluation events */
  readonly onEvaluation?: (event: FlagEvaluationEvent) => void;
  /** Callback for correlated metrics */
  readonly onMetric?: (metric: CorrelatedMetric) => void;
  /** Callback for correlated errors */
  readonly onError?: (error: CorrelatedError) => void;
  /** Callback for impact metrics */
  readonly onImpact?: (metric: FeatureImpactMetric) => void;
  /** Enable batching of events */
  readonly batchEnabled?: boolean;
  /** Batch size before flushing */
  readonly batchSize?: number;
  /** Batch flush interval (ms) */
  readonly batchInterval?: number;
  /** Sample rate for events (0-1) */
  readonly sampleRate?: number;
  /** Debug mode */
  readonly debug?: boolean;
  /** Get current user ID */
  readonly getUserId?: () => string | undefined;
  /** Get current session ID */
  readonly getSessionId?: () => string | undefined;
  /** Get current page/route */
  readonly getPage?: () => string | undefined;
  /** Get current flags */
  readonly getFlags?: () => Record<string, boolean>;
}

/**
 * Bridge interface
 */
export interface FlagAnalyticsBridge {
  /** Track flag exposure */
  trackExposure(event: Omit<FlagExposureEvent, 'timestamp'>): void;
  /** Track flag evaluation */
  trackEvaluation(event: Omit<FlagEvaluationEvent, 'timestamp'>): void;
  /** Track correlated performance metric */
  trackPerformanceCorrelation(
    metric: Omit<CorrelatedMetric, 'timestamp' | 'flagStates'>
  ): void;
  /** Track correlated error */
  trackCorrelatedError(error: Omit<CorrelatedError, 'timestamp' | 'flagStates'>): void;
  /** Record impact metric */
  recordImpactMetric(metric: FeatureImpactMetric): void;
  /** Add analytics destination */
  addDestination(destination: AnalyticsDestination): void;
  /** Remove analytics destination */
  removeDestination(destinationId: string): void;
  /** Flush pending events */
  flush(): Promise<void>;
  /** Get exposure count for a flag */
  getExposureCount(flagKey: string): number;
  /** Get evaluation count for a flag */
  getEvaluationCount(flagKey: string): number;
  /** Get all tracked metrics */
  getMetrics(): CorrelatedMetric[];
  /** Get impact summary for a flag */
  getImpactSummary(flagKey: string): FeatureImpactMetric[];
  /** Reset all tracking data */
  reset(): void;
  /** Enable/disable the bridge */
  setEnabled(enabled: boolean): void;
  /** Check if bridge is enabled */
  isEnabled(): boolean;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Create an analytics bridge
 */
export function createAnalyticsBridge(
  config: FlagAnalyticsBridgeConfig = {}
): FlagAnalyticsBridge {
  const {
    destinations = [],
    onExposure,
    onEvaluation,
    onMetric,
    onError,
    onImpact,
    batchEnabled = true,
    batchSize = 50,
    batchInterval = 5000,
    sampleRate = 1,
    debug = false,
    getUserId,
    getSessionId,
    getPage,
    getFlags,
  } = config;

  // State
  let enabled = true;
  const registeredDestinations = new Map<string, AnalyticsDestination>();
  const exposureCounts = new Map<string, number>();
  const evaluationCounts = new Map<string, number>();
  const metricsBuffer: CorrelatedMetric[] = [];
  const impactMetrics = new Map<string, FeatureImpactMetric[]>();

  // Batching
  const exposureBatch: FlagExposureEvent[] = [];
  const evaluationBatch: FlagEvaluationEvent[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  // Initialize destinations
  for (const dest of destinations) {
    registeredDestinations.set(dest.id, dest);
  }

  const log = (...args: unknown[]): void => {
    if (debug) {
      console.info('[FlagAnalyticsBridge]', ...args);
    }
  };

  const shouldSample = (): boolean => {
    return Math.random() < sampleRate;
  };

  const scheduleFlush = (): void => {
    if (!batchEnabled || flushTimer) return;

    flushTimer = setTimeout(() => {
      flushTimer = null;
      void bridge.flush();
    }, batchInterval);
  };

  const sendToDestinations = async <T,>(
    eventType: 'exposure' | 'evaluation' | 'metric' | 'error',
    event: T
  ): Promise<void> => {
    const promises: Promise<void>[] = [];

    for (const dest of registeredDestinations.values()) {
      if (!dest.enabled) continue;

      try {
        let promise: void | Promise<void>;

        switch (eventType) {
          case 'exposure':
            promise = dest.sendExposure?.(event as FlagExposureEvent);
            break;
          case 'evaluation':
            promise = dest.sendEvaluation?.(event as FlagEvaluationEvent);
            break;
          case 'metric':
            promise = dest.sendMetric?.(event as CorrelatedMetric);
            break;
          case 'error':
            promise = dest.sendError?.(event as CorrelatedError);
            break;
        }

        if (promise instanceof Promise) {
          promises.push(promise);
        }
      } catch (err) {
        log(`Error sending ${eventType} to ${dest.id}:`, err);
      }
    }

    await Promise.allSettled(promises);
  };

  const bridge: FlagAnalyticsBridge = {
    trackExposure(event) {
      if (!enabled || !shouldSample()) return;

      const fullEvent: FlagExposureEvent = {
        ...event,
        userId: event.userId ?? getUserId?.(),
        sessionId: event.sessionId ?? getSessionId?.(),
        page: event.page ?? getPage?.(),
        timestamp: Date.now(),
      };

      log('Exposure:', fullEvent);

      // Update counts
      exposureCounts.set(event.flagKey, (exposureCounts.get(event.flagKey) ?? 0) + 1);

      // Callback
      onExposure?.(fullEvent);

      if (batchEnabled) {
        exposureBatch.push(fullEvent);
        if (exposureBatch.length >= batchSize) {
          void this.flush();
        } else {
          scheduleFlush();
        }
      } else {
        void sendToDestinations('exposure', fullEvent);
      }
    },

    trackEvaluation(event) {
      if (!enabled || !shouldSample()) return;

      const fullEvent: FlagEvaluationEvent = {
        ...event,
        userId: event.userId ?? getUserId?.(),
        timestamp: Date.now(),
      };

      log('Evaluation:', fullEvent);

      // Update counts
      evaluationCounts.set(event.flagKey, (evaluationCounts.get(event.flagKey) ?? 0) + 1);

      // Callback
      onEvaluation?.(fullEvent);

      if (batchEnabled) {
        evaluationBatch.push(fullEvent);
        if (evaluationBatch.length >= batchSize) {
          void this.flush();
        } else {
          scheduleFlush();
        }
      } else {
        void sendToDestinations('evaluation', fullEvent);
      }
    },

    trackPerformanceCorrelation(metric) {
      if (!enabled || !shouldSample()) return;

      const fullMetric: CorrelatedMetric = {
        ...metric,
        flagStates: getFlags?.() ?? {},
        userId: metric.userId ?? getUserId?.(),
        page: metric.page ?? getPage?.(),
        timestamp: Date.now(),
      };

      log('Performance Correlation:', fullMetric);

      metricsBuffer.push(fullMetric);

      // Callback
      onMetric?.(fullMetric);

      void sendToDestinations('metric', fullMetric);
    },

    trackCorrelatedError(error) {
      if (!enabled) return;

      const fullError: CorrelatedError = {
        ...error,
        flagStates: getFlags?.() ?? {},
        page: error.page ?? getPage?.(),
        timestamp: Date.now(),
      };

      log('Correlated Error:', fullError);

      // Callback
      onError?.(fullError);

      void sendToDestinations('error', fullError);
    },

    recordImpactMetric(metric) {
      const existing = impactMetrics.get(metric.flagKey) ?? [];
      existing.push(metric);
      impactMetrics.set(metric.flagKey, existing);

      log('Impact Metric:', metric);

      onImpact?.(metric);
    },

    addDestination(destination) {
      registeredDestinations.set(destination.id, destination);
      log('Added destination:', destination.id);
    },

    removeDestination(destinationId) {
      registeredDestinations.delete(destinationId);
      log('Removed destination:', destinationId);
    },

    async flush(): Promise<void> {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }

      const exposures = [...exposureBatch];
      const evaluations = [...evaluationBatch];

      exposureBatch.length = 0;
      evaluationBatch.length = 0;

      log(`Flushing ${exposures.length} exposures, ${evaluations.length} evaluations`);

      const promises: Promise<void>[] = [];

      for (const exposure of exposures) {
        promises.push(sendToDestinations('exposure', exposure));
      }

      for (const evaluation of evaluations) {
        promises.push(sendToDestinations('evaluation', evaluation));
      }

      // Also flush destinations
      for (const dest of registeredDestinations.values()) {
        if (dest.enabled && dest.flush) {
          const result = dest.flush();
          if (result instanceof Promise) {
            promises.push(result);
          }
        }
      }

      await Promise.allSettled(promises);
    },

    getExposureCount(flagKey: string): number {
      return exposureCounts.get(flagKey) ?? 0;
    },

    getEvaluationCount(flagKey: string): number {
      return evaluationCounts.get(flagKey) ?? 0;
    },

    getMetrics(): CorrelatedMetric[] {
      return [...metricsBuffer];
    },

    getImpactSummary(flagKey: string): FeatureImpactMetric[] {
      return impactMetrics.get(flagKey) ?? [];
    },

    reset(): void {
      exposureCounts.clear();
      evaluationCounts.clear();
      metricsBuffer.length = 0;
      impactMetrics.clear();
      exposureBatch.length = 0;
      evaluationBatch.length = 0;

      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }

      log('Reset');
    },

    setEnabled(value: boolean): void {
      enabled = value;
      log('Enabled:', enabled);
    },

    isEnabled(): boolean {
      return enabled;
    },
  };

  return bridge;
}

// =============================================================================
// Global Bridge
// =============================================================================

let globalBridge: FlagAnalyticsBridge | null = null;

/**
 * Get the global analytics bridge
 */
export function getAnalyticsBridge(): FlagAnalyticsBridge {
  globalBridge ??= createAnalyticsBridge();
  return globalBridge;
}

/**
 * Initialize the global analytics bridge
 */
export function initAnalyticsBridge(config: FlagAnalyticsBridgeConfig): FlagAnalyticsBridge {
  globalBridge = createAnalyticsBridge(config);
  return globalBridge;
}

/**
 * Reset the global analytics bridge
 */
export function resetAnalyticsBridge(): void {
  globalBridge?.reset();
  globalBridge = null;
}

// =============================================================================
// React Integration
// =============================================================================

/**
 * Context value for flag analytics
 */
export interface FlagAnalyticsContextValue {
  /** Track exposure */
  trackExposure(flagKey: string, variant: string, context?: Record<string, unknown>): void;
  /** Track evaluation */
  trackEvaluation(
    flagKey: string,
    value: boolean | string | number,
    reason: 'flag' | 'override' | 'default' | 'error'
  ): void;
  /** Track performance metric */
  trackMetric(metricName: string, value: number, unit?: string): void;
  /** Track error */
  trackError(error: Error, component?: string): void;
  /** Get exposure count */
  getExposureCount(flagKey: string): number;
  /** Flush analytics */
  flush(): Promise<void>;
}

const FlagAnalyticsContext = createContext<FlagAnalyticsContextValue | null>(null);

/**
 * Props for FlagAnalyticsProvider
 */
export interface FlagAnalyticsProviderProps {
  readonly children: ReactNode;
  /** Analytics bridge instance */
  readonly bridge?: FlagAnalyticsBridge;
  /** Bridge configuration */
  readonly config?: FlagAnalyticsBridgeConfig;
  /** Get current flags */
  readonly getFlags?: () => Record<string, boolean>;
}

/**
 * Provider component for flag analytics
 */
export function FlagAnalyticsProvider({
  children,
  bridge: providedBridge,
  config,
  getFlags,
}: FlagAnalyticsProviderProps): React.JSX.Element {
  const bridge = useMemo(() => {
    if (providedBridge) return providedBridge;
    if (config) return createAnalyticsBridge({ ...config, getFlags });
    return getAnalyticsBridge();
  }, [providedBridge, config, getFlags]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      void bridge.flush();
    };
  }, [bridge]);

  const trackExposure = useCallback(
    (flagKey: string, variant: string, context?: Record<string, unknown>) => {
      bridge.trackExposure({ flagKey, variant, context });
    },
    [bridge]
  );

  const trackEvaluation = useCallback(
    (
      flagKey: string,
      value: boolean | string | number,
      reason: 'flag' | 'override' | 'default' | 'error'
    ) => {
      bridge.trackEvaluation({ flagKey, value, reason });
    },
    [bridge]
  );

  const trackMetric = useCallback(
    (metricName: string, value: number, unit?: string) => {
      bridge.trackPerformanceCorrelation({ metricName, value, unit });
    },
    [bridge]
  );

  const trackError = useCallback(
    (error: Error, component?: string) => {
      bridge.trackCorrelatedError({
        message: error.message,
        stack: error.stack,
        type: error.name,
        component,
      });
    },
    [bridge]
  );

  const getExposureCount = useCallback(
    (flagKey: string): number => {
      return bridge.getExposureCount(flagKey);
    },
    [bridge]
  );

  const flush = useCallback(async () => {
    await bridge.flush();
  }, [bridge]);

  const contextValue = useMemo<FlagAnalyticsContextValue>(
    () => ({
      trackExposure,
      trackEvaluation,
      trackMetric,
      trackError,
      getExposureCount,
      flush,
    }),
    [trackExposure, trackEvaluation, trackMetric, trackError, getExposureCount, flush]
  );

  return (
    <FlagAnalyticsContext.Provider value={contextValue}>
      {children}
    </FlagAnalyticsContext.Provider>
  );
}

/**
 * Hook to access flag analytics
 */
export function useFlagAnalytics(): FlagAnalyticsContextValue {
  const context = useContext(FlagAnalyticsContext);
  if (!context) {
    throw new Error('useFlagAnalytics must be used within a FlagAnalyticsProvider');
  }
  return context;
}

/**
 * Hook to automatically track exposure when a flag is used
 */
export function useTrackedFeatureFlag(
  flagKey: string,
  isEnabled: boolean,
  options: {
    trackOnMount?: boolean;
    trackOnChange?: boolean;
    context?: Record<string, unknown>;
  } = {}
): void {
  const { trackOnMount = true, trackOnChange = true, context } = options;
  const analytics = useFlagAnalytics();
  const [prevValue, setPrevValue] = useState(isEnabled);

  // Track on mount
  useEffect(() => {
    if (trackOnMount) {
      analytics.trackExposure(flagKey, isEnabled ? 'enabled' : 'disabled', context);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track on change
  useEffect(() => {
    if (trackOnChange && prevValue !== isEnabled) {
      analytics.trackExposure(flagKey, isEnabled ? 'enabled' : 'disabled', context);
      setPrevValue(isEnabled);
    }
  }, [isEnabled, prevValue, flagKey, analytics, trackOnChange, context]);
}

// =============================================================================
// Pre-built Destinations
// =============================================================================

/**
 * Create a console analytics destination (for debugging)
 */
export function createConsoleDestination(
  prefix = '[Analytics]'
): AnalyticsDestination {
  return {
    id: 'console',
    enabled: true,
    sendExposure(event) {
      console.info(prefix, 'Exposure:', event);
    },
    sendEvaluation(event) {
      console.info(prefix, 'Evaluation:', event);
    },
    sendMetric(metric) {
      console.info(prefix, 'Metric:', metric);
    },
    sendError(error) {
      console.error(prefix, 'Error:', error);
    },
  };
}

/**
 * Create a localStorage analytics destination (for offline storage)
 */
export function createLocalStorageDestination(
  key = 'flag_analytics'
): AnalyticsDestination {
  let events: unknown[] = [];

  try {
    const stored = localStorage.getItem(key);
    if (stored != null && stored !== '') {
      events = JSON.parse(stored) as unknown[];
    }
  } catch {
    events = [];
  }

  const save = (): void => {
    try {
      localStorage.setItem(key, JSON.stringify(events.slice(-1000)));
    } catch {
      // Storage full, clear old events
      events = events.slice(-500);
      localStorage.setItem(key, JSON.stringify(events));
    }
  };

  return {
    id: 'localStorage',
    enabled: true,
    sendExposure(event) {
      events.push({ type: 'exposure', data: event });
      save();
    },
    sendEvaluation(event) {
      events.push({ type: 'evaluation', data: event });
      save();
    },
    sendMetric(metric) {
      events.push({ type: 'metric', data: metric });
      save();
    },
    sendError(error) {
      events.push({ type: 'error', data: error });
      save();
    },
    flush() {
      save();
    },
  };
}

/**
 * Create an HTTP endpoint analytics destination
 *
 * Note: This function intentionally uses raw fetch() rather than apiClient because:
 * 1. Analytics destinations should be independent of the main API client
 * 2. Analytics endpoints may be third-party services on different domains
 * 3. Avoids circular dependencies between analytics and API layers
 *
 * @see {@link @/lib/api/api-client} for application API calls
 */
export function createHttpDestination(config: {
  endpoint: string;
  method?: 'POST' | 'PUT';
  headers?: Record<string, string>;
  batchEvents?: boolean;
}): AnalyticsDestination {
  const { endpoint, method = 'POST', headers = {}, batchEvents = true } = config;

  let batch: unknown[] = [];

  const send = async (events: unknown[]): Promise<void> => {
    try {
      // Raw fetch is intentional - analytics should be independent of apiClient
      await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(batchEvents ? events : events[0]),
      });
    } catch (error) {
      console.error('[HttpDestination] Failed to send:', error);
    }
  };

  const queueEvent = (event: unknown): void => {
    if (batchEvents) {
      batch.push(event);
    } else {
      void send([event]);
    }
  };

  return {
    id: 'http',
    enabled: true,
    sendExposure(event) {
      queueEvent({ type: 'exposure', data: event });
    },
    sendEvaluation(event) {
      queueEvent({ type: 'evaluation', data: event });
    },
    sendMetric(metric) {
      queueEvent({ type: 'metric', data: metric });
    },
    sendError(error) {
      queueEvent({ type: 'error', data: error });
    },
    async flush() {
      if (batch.length > 0) {
        const toSend = [...batch];
        batch = [];
        await send(toSend);
      }
    },
  };
}


