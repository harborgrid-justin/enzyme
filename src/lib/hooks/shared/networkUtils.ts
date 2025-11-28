/**
 * @file Network Utilities
 * @description Shared utilities for network information and quality detection
 * 
 * This module provides cross-browser network information access and quality
 * assessment utilities. It's used by network-aware hooks and prefetching logic.
 */

/**
 * Connection quality type based on Network Information API
 */
export type ConnectionType = '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';

/**
 * Network information from the Navigator.connection API
 */
export interface NetworkInformation {
  /** Effective connection type (4g, 3g, etc.) */
  effectiveType?: ConnectionType;
  /** Estimated downlink speed in Mbps */
  downlink?: number;
  /** Estimated round-trip time in ms */
  rtt?: number;
  /** Whether user has enabled data saver mode */
  saveData?: boolean;
}

/**
 * Navigator with connection property (non-standard API)
 */
interface NavigatorWithConnection extends Navigator {
  connection?: EventTarget & NetworkInformation;
}

/**
 * Connection quality ranking for comparison
 * Higher numbers indicate better quality
 */
const CONNECTION_QUALITY_RANK: Record<ConnectionType, number> = {
  '4g': 4,
  '3g': 3,
  '2g': 2,
  'slow-2g': 1,
  unknown: 3, // Assume decent connection if unknown
};

/**
 * Get current network information from browser
 * 
 * Uses the Network Information API if available. Falls back to safe defaults
 * if the API is not supported (e.g., Firefox, Safari).
 * 
 * @returns Current network information
 * 
 * @example
 * ```ts
 * const network = getNetworkInfo();
 * console.log(`Connection: ${network.effectiveType}, RTT: ${network.rtt}ms`);
 * ```
 */
export function getNetworkInfo(): NetworkInformation {
  if (typeof globalThis.navigator === 'undefined') {
    return {
      effectiveType: 'unknown',
      downlink: Infinity,
      rtt: 0,
      saveData: false,
    };
  }

  const navigator = globalThis.navigator as NavigatorWithConnection | undefined;
  const connection = navigator?.connection;

  return {
    effectiveType: connection?.effectiveType ?? 'unknown',
    downlink: connection?.downlink ?? Infinity,
    rtt: connection?.rtt ?? 0,
    saveData: connection?.saveData ?? false,
  };
}

/**
 * Check if current connection meets minimum quality requirement
 * 
 * @param current - Current connection type
 * @param minimum - Minimum required connection type
 * @returns True if current meets or exceeds minimum quality
 * 
 * @example
 * ```ts
 * if (meetsMinimumQuality(network.effectiveType, '3g')) {
 *   // Load high-quality assets
 * }
 * ```
 */
export function meetsMinimumQuality(
  current: ConnectionType,
  minimum: ConnectionType
): boolean {
  return CONNECTION_QUALITY_RANK[current] >= CONNECTION_QUALITY_RANK[minimum];
}

/**
 * Check if prefetching should be allowed based on network conditions
 * 
 * @param options - Prefetch configuration options
 * @param options.respectDataSaver - Skip prefetch if data saver is enabled
 * @param options.minConnectionQuality - Minimum connection quality required
 * @returns True if prefetching should proceed
 * 
 * @example
 * ```ts
 * if (shouldAllowPrefetch({ minConnectionQuality: '3g' })) {
 *   prefetchData();
 * }
 * ```
 */
export function shouldAllowPrefetch(
  options: {
    respectDataSaver?: boolean;
    minConnectionQuality?: ConnectionType;
  } = {}
): boolean {
  const {
    respectDataSaver = true,
    minConnectionQuality = '2g',
  } = options;

  const networkInfo = getNetworkInfo();

  // Respect data saver mode
  if (respectDataSaver && networkInfo.saveData === true) {
    return false;
  }

  // Check minimum connection quality
  if (!meetsMinimumQuality(networkInfo.effectiveType ?? 'unknown', minConnectionQuality)) {
    return false;
  }

  return true;
}

/**
 * Monitor network quality changes
 * 
 * Sets up an event listener for network quality changes. Returns a cleanup
 * function to remove the listener.
 * 
 * @param callback - Function called when network quality changes
 * @returns Cleanup function to remove the listener
 * 
 * @example
 * ```ts
 * const unsubscribe = monitorNetworkQuality((info) => {
 *   console.log('Network changed:', info.effectiveType);
 * });
 * 
 * // Later, cleanup
 * unsubscribe();
 * ```
 */
export function monitorNetworkQuality(
  callback: (info: NetworkInformation) => void
): () => void {
  if (typeof globalThis.navigator === 'undefined') {
    return () => {};
  }

  const navigator = globalThis.navigator as NavigatorWithConnection | undefined;
  const connection = navigator?.connection;

  if (!connection) {
    // Return no-op cleanup function if API not available
    return () => {};
  }

  const handleChange = (): void => {
    callback(getNetworkInfo());
  };

  connection.addEventListener('change', handleChange);

  return () => {
    connection.removeEventListener('change', handleChange);
  };
}

/**
 * Check if connection is considered slow
 * 
 * A connection is slow if it's 2G/slow-2G, has low downlink speed,
 * high RTT, or data saver mode is enabled.
 * 
 * @param threshold - Optional custom thresholds
 * @returns True if connection is slow
 */
export function isSlowConnection(threshold?: {
  maxDownlink?: number;
  maxRtt?: number;
}): boolean {
  const info = getNetworkInfo();
  const { maxDownlink = 1.5, maxRtt = 300 } = threshold ?? {};

  return (
    info.saveData === true ||
    info.effectiveType === '2g' ||
    info.effectiveType === 'slow-2g' ||
    (info.downlink !== undefined && info.downlink < maxDownlink) ||
    (info.rtt !== undefined && info.rtt > maxRtt)
  );
}

/**
 * Get descriptive quality label for connection
 * 
 * @returns Human-readable quality label
 */
export function getConnectionQualityLabel(type?: ConnectionType): string {
  const effectiveType = type ?? getNetworkInfo().effectiveType ?? 'unknown';
  
  const labels: Record<ConnectionType, string> = {
    '4g': 'Excellent',
    '3g': 'Good',
    '2g': 'Fair',
    'slow-2g': 'Poor',
    'unknown': 'Unknown',
  };

  return labels[effectiveType];
}
