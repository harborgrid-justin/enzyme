/**
 * @file useApiHealth Hook
 * @description React hook for monitoring API health and connectivity status
 * with automatic health checks, circuit breaker patterns, and status notifications.
 *
 * @example
 * ```typescript
 * import { useApiHealth } from '@/lib/api';
 *
 * function ApiStatusIndicator() {
 *   const { status, latency, lastCheck, checkNow } = useApiHealth({
 *     endpoint: '/health',
 *     interval: 30000,
 *   });
 *
 *   return (
 *     <div>
 *       <StatusBadge status={status} />
 *       <span>Latency: {latency}ms</span>
 *       <button onClick={checkNow}>Check Now</button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLatestRef } from '../../hooks/shared/useLatestRef';
import { useApiClient } from './useApiClient';
import type { HealthStatus, HealthCheckResult } from '../types';
import { API_CONFIG, TIMING } from '@/config';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Health check configuration
 */
export interface UseApiHealthConfig {
  /** Health check endpoint (default: /health) */
  endpoint?: string;
  /** Check interval in milliseconds (default: 30000) */
  interval?: number;
  /** Request timeout in milliseconds (default: 5000) */
  timeout?: number;
  /** Number of failures before marking unhealthy (default: 3) */
  failureThreshold?: number;
  /** Number of successes before marking healthy (default: 1) */
  successThreshold?: number;
  /** Enable automatic health checks (default: true) */
  autoCheck?: boolean;
  /** Callback on status change */
  onStatusChange?: (status: HealthStatus, previous: HealthStatus) => void;
  /** Callback on health check complete */
  onCheck?: (result: HealthCheckResult) => void;
  /** Custom health check function */
  healthCheckFn?: () => Promise<HealthCheckResult>;
}

/**
 * Return type for useApiHealth
 */
export interface UseApiHealthResult {
  /** Current health status */
  status: HealthStatus;
  /** Whether API is currently healthy */
  isHealthy: boolean;
  /** Whether API is degraded */
  isDegraded: boolean;
  /** Whether API is unhealthy */
  isUnhealthy: boolean;
  /** Last recorded latency in ms */
  latency: number | null;
  /** Average latency over recent checks */
  averageLatency: number | null;
  /** Last check timestamp */
  lastCheck: number | null;
  /** Last check error (if any) */
  lastError: string | null;
  /** Number of consecutive failures */
  consecutiveFailures: number;
  /** Number of consecutive successes */
  consecutiveSuccesses: number;
  /** Whether currently checking */
  isChecking: boolean;
  /** Trigger manual health check */
  checkNow: () => Promise<HealthCheckResult>;
  /** Start automatic health checks */
  startMonitoring: () => void;
  /** Stop automatic health checks */
  stopMonitoring: () => void;
  /** Whether monitoring is active */
  isMonitoring: boolean;
  /** Full health check history */
  history: HealthCheckResult[];
  /** Reset health state */
  reset: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_CONFIG: Required<Omit<UseApiHealthConfig, 'onStatusChange' | 'onCheck' | 'healthCheckFn'>> = {
  endpoint: API_CONFIG.ENDPOINTS.HEALTH.CHECK,
  interval: TIMING.BACKGROUND.POLL.STANDARD,
  timeout: API_CONFIG.TIMEOUT.HEALTH,
  failureThreshold: 3,
  successThreshold: 1,
  autoCheck: true,
};

const MAX_HISTORY_SIZE = 50;

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for monitoring API health and connectivity
 *
 * @param config - Health check configuration
 * @returns Health monitoring utilities and status
 *
 * @example
 * ```typescript
 * // Basic usage
 * const { status, isHealthy, latency } = useApiHealth();
 *
 * // With configuration
 * const { status, checkNow, stopMonitoring } = useApiHealth({
 *   endpoint: '/api/health',
 *   interval: 60000,
 *   failureThreshold: 5,
 *   onStatusChange: (newStatus, oldStatus) => {
 *     if (newStatus === 'unhealthy') {
 *       showErrorToast('API is currently unavailable');
 *     }
 *   },
 * });
 *
 * // Manual checks only
 * const { checkNow } = useApiHealth({
 *   autoCheck: false,
 * });
 * ```
 */
export function useApiHealth(config?: UseApiHealthConfig): UseApiHealthResult {
  const { client } = useApiClient();

  // Merge config with defaults
  const mergedConfig = useMemo(
    () => ({
      ...DEFAULT_CONFIG,
      ...config,
    }),
    [config]
  );

  // State
  const [status, setStatus] = useState<HealthStatus>('unknown');
  const [latency, setLatency] = useState<number | null>(null);
  const [lastCheck, setLastCheck] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [consecutiveSuccesses, setConsecutiveSuccesses] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(mergedConfig.autoCheck);
  const [history, setHistory] = useState<HealthCheckResult[]>([]);

  // Refs for callbacks and interval
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latencyHistory = useRef<number[]>([]);
  const previousStatus = useRef<HealthStatus>('unknown');

  // Refs to track consecutive counts for immediate reads (avoiding stale closure)
  // These are updated synchronously while state is updated asynchronously
  const consecutiveSuccessesRef = useRef(0);
  const consecutiveFailuresRef = useRef(0);

  // Calculate average latency
  const averageLatency = useMemo(() => {
    if (latencyHistory.current.length === 0) return null;
    const sum = latencyHistory.current.reduce((a, b) => a + b, 0);
    return Math.round(sum / latencyHistory.current.length);
  }, [latencyHistory.current.length, latency]);

  // Health check function
  const performHealthCheck = useCallback(async (): Promise<HealthCheckResult> => {
    setIsChecking(true);
    const startTime = Date.now();

    try {
      // Use custom health check function if provided
      if (config?.healthCheckFn) {
        const result = await config.healthCheckFn();
        setIsChecking(false);
        return result;
      }

      // Default health check
      const response = await client.get<{ status?: string; checks?: Record<string, unknown> }>(
        mergedConfig.endpoint,
        {
          timeout: mergedConfig.timeout,
          meta: { skipRetry: true, skipAuth: true },
        }
      );

      const endTime = Date.now();
      const checkLatency = endTime - startTime;

      // Update latency history
      latencyHistory.current.push(checkLatency);
      if (latencyHistory.current.length > 10) {
        latencyHistory.current.shift();
      }

      const result: HealthCheckResult = {
        status: 'healthy',
        timestamp: endTime,
        latency: checkLatency,
        checks: response.data.checks as Record<string, { status: HealthStatus; message?: string; latency?: number }>,
      };

      // Check for degraded status based on latency threshold
      if (checkLatency > mergedConfig.timeout / 2) {
        result.status = 'degraded';
      }

      setLatency(checkLatency);
      setLastCheck(endTime);
      setLastError(null);

      // Update refs synchronously for immediate threshold check
      consecutiveFailuresRef.current = 0;
      consecutiveSuccessesRef.current = consecutiveSuccessesRef.current + 1;

      // Update state for rendering
      setConsecutiveFailures(0);
      setConsecutiveSuccesses(consecutiveSuccessesRef.current);

      // Update status - use ref for immediate check (avoids stale closure)
      if (consecutiveSuccessesRef.current >= mergedConfig.successThreshold) {
        setStatus(result.status);
      }

      // Add to history
      setHistory((prev) => {
        const updated = [...prev, result];
        return updated.slice(-MAX_HISTORY_SIZE);
      });

      setIsChecking(false);

      // Notify
      config?.onCheck?.(result);

      return result;
    } catch (error) {
      const endTime = Date.now();
      const checkLatency = endTime - startTime;

      const errorMessage = error instanceof Error ? error.message : 'Health check failed';

      const result: HealthCheckResult = {
        status: 'unhealthy',
        timestamp: endTime,
        latency: checkLatency,
        error: errorMessage,
      };

      setLatency(checkLatency);
      setLastCheck(endTime);
      setLastError(errorMessage);

      // Update refs synchronously for immediate threshold check
      consecutiveSuccessesRef.current = 0;
      consecutiveFailuresRef.current = consecutiveFailuresRef.current + 1;

      // Update state for rendering
      setConsecutiveSuccesses(0);
      setConsecutiveFailures(consecutiveFailuresRef.current);

      // Update status - use ref for immediate check (avoids stale closure)
      if (consecutiveFailuresRef.current >= mergedConfig.failureThreshold) {
        setStatus('unhealthy');
      } else if (status === 'healthy') {
        setStatus('degraded');
      }

      // Add to history
      setHistory((prev) => {
        const updated = [...prev, result];
        return updated.slice(-MAX_HISTORY_SIZE);
      });

      setIsChecking(false);

      // Notify
      config?.onCheck?.(result);

      return result;
    }
  // Dependencies reduced: consecutiveSuccesses/Failures now use refs for immediate reads
  // status is still needed for degraded fallback logic
  }, [client, mergedConfig, config, status]);

  // Use useLatestRef to avoid interval thrashing when performHealthCheck changes
  const performHealthCheckRef = useLatestRef(performHealthCheck);

  // Status change notification
  useEffect(() => {
    if (status !== previousStatus.current) {
      config?.onStatusChange?.(status, previousStatus.current);
      previousStatus.current = status;
    }
  }, [status, config]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
  }, []);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setStatus('unknown');
    setLatency(null);
    setLastCheck(null);
    setLastError(null);
    setConsecutiveFailures(0);
    setConsecutiveSuccesses(0);
    setHistory([]);
    latencyHistory.current = [];
    // Also reset refs
    consecutiveSuccessesRef.current = 0;
    consecutiveFailuresRef.current = 0;
  }, []);

  // Manual check - uses ref to get latest performHealthCheck without causing recreation
  const checkNow = useCallback(async (): Promise<HealthCheckResult> => {
    return performHealthCheckRef.current();
  }, []); // Empty deps - ref always has latest function

  // Set up interval
  // Uses ref for performHealthCheck to avoid interval thrashing when the callback changes
  useEffect(() => {
    if (isMonitoring) {
      // Initial check
      performHealthCheckRef.current();

      // Set up interval - use wrapper function to call ref
      intervalRef.current = setInterval(() => {
        performHealthCheckRef.current();
      }, mergedConfig.interval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
    return undefined;
  }, [isMonitoring, mergedConfig.interval]); // Removed performHealthCheck - using ref instead

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return useMemo(
    () => ({
      status,
      isHealthy: status === 'healthy',
      isDegraded: status === 'degraded',
      isUnhealthy: status === 'unhealthy',
      latency,
      averageLatency,
      lastCheck,
      lastError,
      consecutiveFailures,
      consecutiveSuccesses,
      isChecking,
      checkNow,
      startMonitoring,
      stopMonitoring,
      isMonitoring,
      history,
      reset,
    }),
    [
      status,
      latency,
      averageLatency,
      lastCheck,
      lastError,
      consecutiveFailures,
      consecutiveSuccesses,
      isChecking,
      checkNow,
      startMonitoring,
      stopMonitoring,
      isMonitoring,
      history,
      reset,
    ]
  );
}

// =============================================================================
// SPECIALIZED HOOKS
// =============================================================================

/**
 * Hook for simple connectivity check
 *
 * @example
 * ```typescript
 * const isOnline = useApiConnectivity();
 *
 * if (!isOnline) {
 *   return <OfflineIndicator />;
 * }
 * ```
 */
export function useApiConnectivity(): boolean {
  const { isHealthy, isDegraded } = useApiHealth({
    interval: TIMING.BACKGROUND.POLL.SLOW,
    failureThreshold: 2,
  });

  return isHealthy || isDegraded;
}

/**
 * Hook for network-aware operations
 *
 * @example
 * ```typescript
 * const { canMakeRequest, waitForConnectivity } = useNetworkAware();
 *
 * const handleSubmit = async () => {
 *   if (!canMakeRequest) {
 *     await waitForConnectivity();
 *   }
 *   // Proceed with request
 * };
 * ```
 */
export function useNetworkAware(): {
  canMakeRequest: boolean;
  isOnline: boolean;
  isBrowserOnline: boolean;
  waitForConnectivity: (timeout?: number) => Promise<void>;
} {
  const [isBrowserOnline, setIsBrowserOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const { isHealthy, isDegraded, checkNow } = useApiHealth({
    autoCheck: false,
  });

  // Listen for browser online/offline events
  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const canMakeRequest = isBrowserOnline && (isHealthy || isDegraded);

  const waitForConnectivity = useCallback(
    async (timeout = 30000): Promise<void> => {
      const startTime = Date.now();

      while (Date.now() - startTime < timeout) {
        if (isBrowserOnline) {
          const result = await checkNow();
          if (result.status === 'healthy' || result.status === 'degraded') {
            return;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      throw new Error('Connectivity timeout');
    },
    [isBrowserOnline, checkNow]
  );

  return {
    canMakeRequest,
    isOnline: isHealthy || isDegraded,
    isBrowserOnline,
    waitForConnectivity,
  };
}

/**
 * Hook for monitoring multiple API endpoints
 *
 * @example
 * ```typescript
 * const services = useMultiApiHealth([
 *   { name: 'Main API', endpoint: '/health' },
 *   { name: 'Auth Service', endpoint: '/auth/health' },
 *   { name: 'File Service', endpoint: '/files/health' },
 * ]);
 *
 * return (
 *   <ul>
 *     {services.map(s => (
 *       <li key={s.name}>
 *         {s.name}: {s.status} ({s.latency}ms)
 *       </li>
 *     ))}
 *   </ul>
 * );
 * ```
 */
export function useMultiApiHealth(
  endpoints: Array<{ name: string; endpoint: string; interval?: number }>
): Array<{
  name: string;
  endpoint: string;
  status: HealthStatus;
  latency: number | null;
  isHealthy: boolean;
}> {
  const [results, setResults] = useState<
    Map<string, { status: HealthStatus; latency: number | null }>
  >(new Map());

  const { client } = useApiClient();

  useEffect(() => {
    const intervals: Array<ReturnType<typeof setInterval>> = [];

    for (const { name, endpoint, interval = TIMING.BACKGROUND.POLL.STANDARD } of endpoints) {
      const check = async () => {
        const startTime = Date.now();

        try {
          await client.get(endpoint, {
            timeout: API_CONFIG.TIMEOUT.HEALTH,
            meta: { skipRetry: true, skipAuth: true },
          });

          const latency = Date.now() - startTime;
          setResults((prev) => {
            const next = new Map(prev);
            next.set(name, { status: 'healthy', latency });
            return next;
          });
        } catch {
          const latency = Date.now() - startTime;
          setResults((prev) => {
            const next = new Map(prev);
            next.set(name, { status: 'unhealthy', latency });
            return next;
          });
        }
      };

      // Initial check
      check();

      // Set up interval
      intervals.push(setInterval(check, interval));
    }

    return () => {
      intervals.forEach(clearInterval);
    };
  }, [client, endpoints]);

  return endpoints.map(({ name, endpoint }) => {
    const result = results.get(name) || { status: 'unknown' as HealthStatus, latency: null };
    return {
      name,
      endpoint,
      status: result.status,
      latency: result.latency,
      isHealthy: result.status === 'healthy',
    };
  });
}
