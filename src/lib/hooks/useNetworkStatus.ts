/**
 * @file Network Status Hooks
 * @description React hooks for network status monitoring and online/offline handling
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  networkMonitor,
  type NetworkStatus,
  type NetworkQuality,
  getSuggestedAction,
} from '../utils/networkStatus';
import { isSlowConnection as checkSlowConnection } from './shared/networkUtils';

/**
 * Hook to monitor network online/offline status
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() => networkMonitor.isOnline());

  useEffect(() => {
    const unsubscribe = networkMonitor.onStatusChange((status) => {
      setIsOnline(status.online);
    });

    return unsubscribe;
  }, []);

  return isOnline;
}

/**
 * Hook to get full network status
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState(() => networkMonitor.getStatus());

  useEffect(() => {
    const unsubscribe = networkMonitor.onStatusChange(setStatus);
    return unsubscribe;
  }, []);

  return status;
}

/**
 * Hook to monitor network quality
 */
export function useNetworkQuality(): NetworkQuality {
  const [quality, setQuality] = useState(() => networkMonitor.getQuality());

  useEffect(() => {
    const unsubscribe = networkMonitor.onQualityChange(setQuality);
    return unsubscribe;
  }, []);

  return quality;
}

/**
 * Hook to get suggested actions based on network quality
 */
export function useNetworkSuggestions(): ReturnType<typeof getSuggestedAction> {
  const quality = useNetworkQuality();
  return useMemo(() => getSuggestedAction(quality), [quality]);
}

/**
 * Hook to check if connection is slow
 */
export function useSlowConnection(): boolean {
  const status = useNetworkStatus();

  return useMemo(() => {
    return checkSlowConnection();
  }, [status]);
}

/**
 * Hook options for offline behavior
 */
export interface UseOfflineFallbackOptions<T> {
  /** Fallback value when offline */
  fallbackValue: T;
  /** Whether to show notification when offline */
  showNotification?: boolean;
  /** Custom offline message */
  offlineMessage?: string;
}

/**
 * Hook to provide fallback values when offline
 */
export function useOfflineFallback<T>(
  value: T,
  options: UseOfflineFallbackOptions<T>
): {
  value: T;
  isOffline: boolean;
  isFallback: boolean;
} {
  const isOnline = useOnlineStatus();
  const lastOnlineValue = useRef<T>(value);

  // Update last online value when online
  useEffect(() => {
    if (isOnline) {
      lastOnlineValue.current = value;
    }
  }, [isOnline, value]);

  const effectiveValue = isOnline ? value : (lastOnlineValue.current ?? options.fallbackValue);
  const isFallback = !isOnline && effectiveValue === options.fallbackValue;

  return {
    value: effectiveValue,
    isOffline: !isOnline,
    isFallback,
  };
}

/**
 * Hook to execute callback when coming back online
 */
export function useOnReconnect(callback: () => void): void {
  const isOnline = useOnlineStatus();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
    } else if (wasOffline.current) {
      wasOffline.current = false;
      callback();
    }
  }, [isOnline, callback]);
}

/**
 * Hook to wait for online status
 */
export function useWaitForOnline(): {
  isOnline: boolean;
  waitForOnline: (timeout?: number) => Promise<boolean>;
} {
  const isOnline = useOnlineStatus();

  const waitForOnline = useCallback(async (timeout?: number) => {
    return networkMonitor.waitForOnline(timeout);
  }, []);

  return { isOnline, waitForOnline };
}

/**
 * Hook for network-aware data fetching
 */
export interface UseNetworkAwareFetchOptions {
  /** Minimum quality required to fetch */
  minQuality?: NetworkQuality;
  /** Whether to retry on reconnect */
  retryOnReconnect?: boolean;
  /** Custom fetch function */
  fetchFn?: () => Promise<unknown>;
}

/**
 * Hook result for network-aware fetch
 */
export interface UseNetworkAwareFetchResult {
  canFetch: boolean;
  quality: NetworkQuality;
  isOnline: boolean;
  suggestions: ReturnType<typeof getSuggestedAction>;
  refetchOnReconnect: () => void;
}

/**
 * Hook to manage network-aware fetching
 */
export function useNetworkAwareFetch(
  options: UseNetworkAwareFetchOptions = {}
): UseNetworkAwareFetchResult {
  const isOnline = useOnlineStatus();
  const quality = useNetworkQuality();
  const suggestions = useNetworkSuggestions();
  const { minQuality = 'poor', retryOnReconnect = true, fetchFn } = options;

  const qualityOrder: NetworkQuality[] = ['offline', 'poor', 'fair', 'good', 'excellent'];
  const canFetch =
    isOnline && qualityOrder.indexOf(quality) >= qualityOrder.indexOf(minQuality);

  // Retry on reconnect
  useOnReconnect(
    useCallback(() => {
      if (retryOnReconnect && fetchFn) {
        fetchFn();
      }
    }, [retryOnReconnect, fetchFn])
  );

  const refetchOnReconnect = useCallback(() => {
    if (fetchFn) {
      fetchFn();
    }
  }, [fetchFn]);

  return {
    canFetch,
    quality,
    isOnline,
    suggestions,
    refetchOnReconnect,
  };
}

/**
 * Hook to show offline indicator
 */
export function useOfflineIndicator(): {
  showIndicator: boolean;
  message: string;
  quality: NetworkQuality;
} {
  const isOnline = useOnlineStatus();
  const quality = useNetworkQuality();
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowIndicator(true);
    } else {
      // Delay hiding indicator to allow for brief disconnections
      const timer = setTimeout(() => {
        setShowIndicator(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOnline]);

  const message = useMemo(() => {
    if (!isOnline) return 'You are offline';
    if (quality === 'poor') return 'Slow connection detected';
    return '';
  }, [isOnline, quality]);

  return {
    showIndicator: showIndicator || quality === 'poor',
    message,
    quality,
  };
}

/**
 * Hook to track connection changes
 */
export function useConnectionTracker(): {
  changes: Array<{ online: boolean; timestamp: number }>;
  disconnectCount: number;
  lastDisconnect: number | null;
  avgOfflineDuration: number;
} {
  const isOnline = useOnlineStatus();
  const [changes, setChanges] = useState<Array<{ online: boolean; timestamp: number }>>([]);

  useEffect(() => {
    setChanges((prev) => [...prev.slice(-19), { online: isOnline, timestamp: Date.now() }]);
  }, [isOnline]);

  const stats = useMemo(() => {
    const disconnects = changes.filter((c) => !c.online);
    const reconnects = changes.filter((c) => c.online);

    let totalOffline = 0;
    for (let i = 0; i < disconnects.length; i++) {
      const disconnect = disconnects[i];
      if (!disconnect) continue;
      
      const reconnect = reconnects.find((r) => r.timestamp > disconnect.timestamp);
      if (reconnect) {
        totalOffline += reconnect.timestamp - disconnect.timestamp;
      }
    }

    return {
      changes,
      disconnectCount: disconnects.length,
      lastDisconnect: disconnects.length > 0 ? disconnects[disconnects.length - 1]?.timestamp ?? null : null,
      avgOfflineDuration: disconnects.length > 0 ? totalOffline / disconnects.length : 0,
    };
  }, [changes]);

  return stats;
}
