/**
 * @file Unified Network Utilities
 * @description Standardized network information access, connection quality
 * detection, and online/offline status utilities.
 *
 * This module unifies patterns from:
 * - hooks/shared/networkUtils.ts
 * - utils/networkStatus.ts
 *
 * @module shared/network-utils
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Connection type from Network Information API.
 */
export type ConnectionType =
  | 'wifi'
  | '4g'
  | '3g'
  | '2g'
  | 'slow-2g'
  | 'ethernet'
  | 'bluetooth'
  | 'cellular'
  | 'none'
  | 'unknown';

/**
 * Effective connection type (speed-based).
 */
export type EffectiveType = 'slow-2g' | '2g' | '3g' | '4g';

/**
 * Network quality tier.
 */
export type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

/**
 * Network information from the Network Information API.
 */
export interface NetworkInfo {
  /** Whether the browser reports online status */
  online: boolean;
  /** Connection type (wifi, cellular, etc.) */
  type: ConnectionType;
  /** Effective connection type based on measured speed */
  effectiveType: EffectiveType;
  /** Estimated downlink speed in Mbps */
  downlinkMbps: number;
  /** Estimated round-trip time in milliseconds */
  rttMs: number;
  /** Whether data saver mode is enabled */
  saveData: boolean;
  /** Calculated quality tier */
  quality: NetworkQuality;
  /** Timestamp of measurement */
  timestamp: number;
}

/**
 * Network Information API types (non-standard).
 */
interface NavigatorNetworkInfo extends EventTarget {
  type?: ConnectionType;
  effectiveType?: EffectiveType;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  onchange?: ((this: NavigatorNetworkInfo, ev: Event) => void) | null;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NavigatorNetworkInfo;
  mozConnection?: NavigatorNetworkInfo;
  webkitConnection?: NavigatorNetworkInfo;
}

// =============================================================================
// Quality Assessment
// =============================================================================

/**
 * Quality ranking for connection types (higher is better).
 */
const QUALITY_RANK: Record<EffectiveType, number> = {
  '4g': 4,
  '3g': 3,
  '2g': 2,
  'slow-2g': 1,
};

/**
 * Calculate network quality tier from metrics.
 */
function calculateQuality(
  online: boolean,
  effectiveType: EffectiveType,
  downlinkMbps: number,
  rttMs: number
): NetworkQuality {
  if (!online) return 'offline';

  // Use effective type as primary indicator
  if (effectiveType === 'slow-2g' || effectiveType === '2g') {
    return 'poor';
  }

  // Use measured values for finer granularity
  if (downlinkMbps >= 5 && rttMs <= 100) return 'excellent';
  if (downlinkMbps >= 1.5 && rttMs <= 300) return 'good';
  if (effectiveType === '3g' || downlinkMbps >= 0.5) return 'fair';

  return 'poor';
}

// =============================================================================
// Network Information Access
// =============================================================================

/**
 * Get the Network Information API connection object.
 */
function getConnection(): NavigatorNetworkInfo | undefined {
  if (typeof navigator === 'undefined') return undefined;

  const nav = navigator as NavigatorWithConnection;
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
}

/**
 * Get current network information.
 *
 * @returns Current network information with quality assessment
 *
 * @example
 * ```ts
 * const network = getNetworkInfo();
 * if (network.quality === 'poor') {
 *   // Show low-quality content
 * }
 * ```
 */
export function getNetworkInfo(): NetworkInfo {
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const connection = getConnection();

  const type = (connection?.type as ConnectionType) ?? 'unknown';
  const effectiveType = connection?.effectiveType ?? '4g';
  const downlinkMbps = connection?.downlink ?? 10;
  const rttMs = connection?.rtt ?? 50;
  const saveData = connection?.saveData ?? false;

  return {
    online,
    type,
    effectiveType,
    downlinkMbps,
    rttMs,
    saveData,
    quality: calculateQuality(online, effectiveType, downlinkMbps, rttMs),
    timestamp: Date.now(),
  };
}

/**
 * Check if browser is currently online.
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Check if current connection meets minimum quality requirement.
 *
 * @param minimum - Minimum required effective type
 * @returns True if current connection meets requirement
 */
export function meetsMinimumQuality(minimum: EffectiveType): boolean {
  const network = getNetworkInfo();
  return QUALITY_RANK[network.effectiveType] >= QUALITY_RANK[minimum];
}

/**
 * Check if connection is considered slow.
 *
 * @param thresholds - Custom thresholds for slow detection
 */
export function isSlowConnection(thresholds?: {
  maxDownlinkMbps?: number;
  maxRttMs?: number;
}): boolean {
  const network = getNetworkInfo();
  const { maxDownlinkMbps = 1.5, maxRttMs = 300 } = thresholds ?? {};

  return (
    network.saveData ||
    network.effectiveType === '2g' ||
    network.effectiveType === 'slow-2g' ||
    network.downlinkMbps < maxDownlinkMbps ||
    network.rttMs > maxRttMs
  );
}

/**
 * Get human-readable quality label.
 */
export function getQualityLabel(quality?: NetworkQuality): string {
  const q = quality ?? getNetworkInfo().quality;

  const labels: Record<NetworkQuality, string> = {
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
    offline: 'Offline',
  };

  return labels[q];
}

// =============================================================================
// Network Change Monitoring
// =============================================================================

/**
 * Callback for network status changes.
 */
export type NetworkChangeCallback = (info: NetworkInfo) => void;

/**
 * Monitor network quality changes.
 *
 * @param callback - Function called when network quality changes
 * @returns Cleanup function to stop monitoring
 *
 * @example
 * ```ts
 * const unsubscribe = onNetworkChange((network) => {
 *   console.log('Network changed:', network.quality);
 * });
 *
 * // Later, cleanup
 * unsubscribe();
 * ```
 */
export function onNetworkChange(callback: NetworkChangeCallback): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const connection = getConnection();
  const cleanups: (() => void)[] = [];

  // Listen to Network Information API changes
  if (connection) {
    const handleChange = (): void => {
      callback(getNetworkInfo());
    };

    connection.addEventListener('change', handleChange);
    cleanups.push(() => connection.removeEventListener('change', handleChange));
  }

  // Listen to online/offline events
  const handleOnline = (): void => callback(getNetworkInfo());
  const handleOffline = (): void => callback(getNetworkInfo());

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  cleanups.push(() => window.removeEventListener('online', handleOnline));
  cleanups.push(() => window.removeEventListener('offline', handleOffline));

  return () => cleanups.forEach((cleanup) => cleanup());
}

/**
 * Listen for online status changes only.
 */
export function onOnlineChange(callback: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleOnline = (): void => callback(true);
  const handleOffline = (): void => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// =============================================================================
// Prefetch Decision Utilities
// =============================================================================

/**
 * Check if prefetching should be allowed based on network conditions.
 *
 * @param options - Prefetch configuration
 * @returns True if prefetching should proceed
 *
 * @example
 * ```ts
 * if (shouldAllowPrefetch({ minQuality: '3g', respectDataSaver: true })) {
 *   prefetchNextPage();
 * }
 * ```
 */
export function shouldAllowPrefetch(
  options: {
    /** Minimum required effective connection type */
    minQuality?: EffectiveType;
    /** Skip prefetch if data saver is enabled */
    respectDataSaver?: boolean;
    /** Skip prefetch if offline */
    requireOnline?: boolean;
  } = {}
): boolean {
  const { minQuality = '2g', respectDataSaver = true, requireOnline = true } = options;

  const network = getNetworkInfo();

  if (requireOnline && !network.online) {
    return false;
  }

  if (respectDataSaver && network.saveData) {
    return false;
  }

  return meetsMinimumQuality(minQuality);
}

/**
 * Get recommended resource loading strategy based on network.
 */
export function getLoadingStrategy(): 'eager' | 'lazy' | 'none' {
  const network = getNetworkInfo();

  if (!network.online) return 'none';
  if (network.quality === 'excellent' || network.quality === 'good') {
    return 'eager';
  }
  return 'lazy';
}

/**
 * Get recommended image quality based on network.
 */
export function getRecommendedImageQuality(): 'high' | 'medium' | 'low' {
  const network = getNetworkInfo();

  if (network.saveData) return 'low';

  switch (network.quality) {
    case 'excellent':
      return 'high';
    case 'good':
    case 'fair':
      return 'medium';
    default:
      return 'low';
  }
}

// =============================================================================
// Connection Ping Utilities
// =============================================================================

/**
 * Ping an endpoint to check actual connectivity.
 *
 * Note: This function intentionally uses raw fetch() rather than apiClient because:
 * 1. It uses 'no-cors' mode which is only available with raw fetch
 * 2. Ping is a low-level network diagnostic, not an API call
 * 3. It must work with any URL, not just API endpoints
 *
 * @see {@link @/lib/api/api-client} for the main API client
 *
 * @param url - URL to ping
 * @param timeoutMs - Timeout in milliseconds
 * @returns True if ping succeeded
 */
export async function pingEndpoint(url: string, timeoutMs = 5000): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Raw fetch is intentional - uses 'no-cors' mode for cross-origin pings
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok || response.type === 'opaque';
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

/**
 * Measure actual round-trip time to an endpoint.
 *
 * @param url - URL to measure
 * @param samples - Number of samples to average
 * @returns Average RTT in milliseconds, or null if failed
 */
export async function measureRtt(url: string, samples = 3): Promise<number | null> {
  const times: number[] = [];

  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    const success = await pingEndpoint(url, 3000);
    const end = performance.now();

    if (success) {
      times.push(end - start);
    }

    // Small delay between samples
    if (i < samples - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  if (times.length === 0) return null;
  return times.reduce((a, b) => a + b, 0) / times.length;
}
