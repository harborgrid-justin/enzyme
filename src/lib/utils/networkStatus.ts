/**
 * @file Network Status Utilities
 * @description Online/offline detection, connection quality monitoring,
 * and network-aware request handling
 */

import { globalEventBus } from './eventEmitter';
import { logger } from './logging';

// ============================================================================
// Types
// ============================================================================

/**
 * Network connection type
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
 * Network effective type (speed-based)
 */
export type EffectiveType = 'slow-2g' | '2g' | '3g' | '4g';

/**
 * Network status information
 */
export interface NetworkStatus {
  /** Whether the browser is online */
  online: boolean;
  /** Connection type */
  type: ConnectionType;
  /** Effective connection type (based on measured speed) */
  effectiveType: EffectiveType;
  /** Downlink speed in Mbps */
  downlink: number;
  /** Round-trip time in ms */
  rtt: number;
  /** Whether data saver mode is enabled */
  saveData: boolean;
  /** Timestamp of last status update */
  timestamp: number;
}

/**
 * Network quality tier
 */
export type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

/**
 * Network status change callback
 */
export type NetworkStatusCallback = (status: NetworkStatus) => void;

/**
 * Network quality change callback
 */
export type NetworkQualityCallback = (quality: NetworkQuality) => void;

/**
 * Network monitor configuration
 */
export interface NetworkMonitorConfig {
  /** Ping endpoint for connectivity check */
  pingEndpoint?: string;
  /** Ping interval in ms */
  pingInterval?: number;
  /** Ping timeout in ms */
  pingTimeout?: number;
  /** Enable periodic pinging */
  enablePing?: boolean;
  /** Downlink threshold for "good" quality (Mbps) */
  goodDownlinkThreshold?: number;
  /** RTT threshold for "good" quality (ms) */
  goodRttThreshold?: number;
}

// ============================================================================
// Network Information API Types
// ============================================================================

/**
 * Network Information API types (not yet standard)
 */
interface NetworkInformation extends EventTarget {
  type?: ConnectionType;
  effectiveType?: EffectiveType;
  downlink?: number;
  downlinkMax?: number;
  rtt?: number;
  saveData?: boolean;
  onchange?: ((this: NetworkInformation, ev: Event) => void) | null;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

// ============================================================================
// Network Monitor
// ============================================================================

/**
 * Network status monitor with quality detection and event handling
 */
export class NetworkMonitor {
  private config: Required<NetworkMonitorConfig>;
  private statusCallbacks = new Set<NetworkStatusCallback>();
  private qualityCallbacks = new Set<NetworkQualityCallback>();
  private currentStatus: NetworkStatus;
  private currentQuality: NetworkQuality = 'unknown' as NetworkQuality;
  private pingIntervalId: ReturnType<typeof setInterval> | null = null;
  private disposed = false;

  constructor(config: NetworkMonitorConfig = {}) {
    this.config = {
      pingEndpoint: config.pingEndpoint ?? '/api/health',
      pingInterval: config.pingInterval ?? 30000,
      pingTimeout: config.pingTimeout ?? 5000,
      enablePing: config.enablePing ?? false,
      goodDownlinkThreshold: config.goodDownlinkThreshold ?? 1.5,
      goodRttThreshold: config.goodRttThreshold ?? 300,
    };

    this.currentStatus = this.getNetworkStatus();
    this.currentQuality = this.calculateQuality(this.currentStatus);

    this.setupListeners();
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.config.enablePing && !this.pingIntervalId) {
      this.pingIntervalId = setInterval(() => { void this.ping(); }, this.config.pingInterval);
      // Initial ping
      void this.ping();
    }
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  /**
   * Perform connectivity ping
   */
  async ping(): Promise<boolean> {
    if (!this.currentStatus.online) return false;

    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.pingTimeout
      );

      const response = await fetch(this.config.pingEndpoint, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const endTime = performance.now();
      const latency = endTime - startTime;

      if (response.ok) {
        // Update RTT estimate
        this.currentStatus.rtt = latency;
        this.updateStatus();
        return true;
      }

      return false;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.debug('[Network] Ping timeout');
      }
      return false;
    }
  }

  /**
   * Get current status
   */
  getStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  /**
   * Get current quality
   */
  getQuality(): NetworkQuality {
    return this.currentQuality;
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return this.currentStatus.online;
  }

  /**
   * Check if connection is metered/slow
   */
  isSlowConnection(): boolean {
    return (
      this.currentStatus.saveData ||
      this.currentQuality === 'poor' ||
      this.currentStatus.effectiveType === '2g' ||
      this.currentStatus.effectiveType === 'slow-2g'
    );
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: NetworkStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    // Emit current status immediately
    callback(this.currentStatus);
    return () => this.statusCallbacks.delete(callback);
  }

  /**
   * Subscribe to quality changes
   */
  onQualityChange(callback: NetworkQualityCallback): () => void {
    this.qualityCallbacks.add(callback);
    // Emit current quality immediately
    callback(this.currentQuality);
    return () => this.qualityCallbacks.delete(callback);
  }

  /**
   * Wait for online status
   */
  async waitForOnline(timeout?: number): Promise<boolean> {
    if (this.currentStatus.online) return true;

    return new Promise((resolve) => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      const unsubscribe = this.onStatusChange((status) => {
        if (status.online) {
          if (timeoutId) clearTimeout(timeoutId);
          unsubscribe();
          resolve(true);
        }
      });

      if (timeout !== undefined && timeout > 0) {
        timeoutId = setTimeout(() => {
          unsubscribe();
          resolve(false);
        }, timeout);
      }
    });
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.stop();

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);

      const connection = this.getConnection();
      if (connection) {
        connection.removeEventListener('change', this.handleConnectionChange);
      }
    }

    this.statusCallbacks.clear();
    this.qualityCallbacks.clear();
  }

  /**
   * Get the Network Information API connection object
   */
  private getConnection(): NetworkInformation | undefined {
    if (typeof navigator === 'undefined') return undefined;

    const nav = navigator as NavigatorWithConnection;
    return nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
  }

  /**
   * Get current network status
   */
  private getNetworkStatus(): NetworkStatus {
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const connection = this.getConnection();

    return {
      online,
      type: (connection?.type as ConnectionType) ?? 'unknown',
      effectiveType: connection?.effectiveType ?? '4g',
      downlink: connection?.downlink ?? 10,
      rtt: connection?.rtt ?? 50,
      saveData: connection?.saveData ?? false,
      timestamp: Date.now(),
    };
  }

  /**
   * Calculate network quality tier
   */
  private calculateQuality(status: NetworkStatus): NetworkQuality {
    if (!status.online) return 'offline';

    const { downlink, rtt, effectiveType } = status;

    // Effective type mapping
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      return 'poor';
    }

    // Quality based on measured values
    if (downlink >= 5 && rtt <= 100) return 'excellent';
    if (downlink >= this.config.goodDownlinkThreshold && rtt <= this.config.goodRttThreshold) return 'good';
    if (effectiveType === '3g' || downlink >= 0.5) return 'fair';

    return 'poor';
  }

  /**
   * Setup event listeners
   */
  private setupListeners(): void {
    if (typeof window === 'undefined') return;

    // Online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Network Information API events
    const connection = this.getConnection();
    if (connection) {
      connection.addEventListener('change', this.handleConnectionChange);
    }
  }

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    logger.info('[Network] Online');
    this.updateStatus();

    globalEventBus.emitSync('network:online', undefined);
  };

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    logger.warn('[Network] Offline');
    this.updateStatus();

    globalEventBus.emitSync('network:offline', undefined);
  };

  /**
   * Handle connection change event
   */
  private handleConnectionChange = (): void => {
    this.updateStatus();
  };

  /**
   * Update status and notify callbacks
   */
  private updateStatus(): void {
    const newStatus = this.getNetworkStatus();
    const newQuality = this.calculateQuality(newStatus);

    const statusChanged =
      this.currentStatus.online !== newStatus.online ||
      this.currentStatus.effectiveType !== newStatus.effectiveType ||
      Math.abs(this.currentStatus.downlink - newStatus.downlink) > 0.5;

    const qualityChanged = this.currentQuality !== newQuality;

    this.currentStatus = newStatus;

    if (statusChanged) {
      this.statusCallbacks.forEach((cb) => cb(newStatus));
    }

    if (qualityChanged) {
      this.currentQuality = newQuality;
      this.qualityCallbacks.forEach((cb) => cb(newQuality));

      globalEventBus.emitSync('network:qualityChange', { quality: newQuality });
      logger.debug('[Network] Quality changed', { quality: newQuality });
    }
  }
}

// ============================================================================
// Network-Aware Request Handler
// ============================================================================

/**
 * Network-aware fetch options
 */
export interface NetworkAwareFetchOptions extends RequestInit {
  /** Whether to queue request when offline */
  queueOffline?: boolean;
  /** Minimum quality required to send request */
  minQuality?: NetworkQuality;
  /** Timeout for waiting online */
  onlineTimeout?: number;
  /** Enable automatic retry on network recovery */
  retryOnRecovery?: boolean;
}

/**
 * Queued request
 */
interface QueuedRequest {
  url: string;
  options: NetworkAwareFetchOptions;
  resolve: (value: Response) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

/**
 * Network-aware fetch wrapper
 */
export class NetworkAwareFetch {
  private monitor: NetworkMonitor;
  private offlineQueue: QueuedRequest[] = [];
  private unsubscribe: (() => void) | null = null;

  constructor(monitor: NetworkMonitor) {
    this.monitor = monitor;
    this.setupRecoveryHandler();
  }

  /**
   * Make network-aware fetch request
   */
  async fetch(url: string, options: NetworkAwareFetchOptions = {}): Promise<Response> {
    const {
      queueOffline = false,
      minQuality,
      onlineTimeout = 30000,
      retryOnRecovery = true,
      ...fetchOptions
    } = options;

    // Check network status
    if (!this.monitor.isOnline()) {
      if (queueOffline) {
        return this.queueRequest(url, options);
      }

      // Wait for online if timeout specified
      if (onlineTimeout > 0) {
        const online = await this.monitor.waitForOnline(onlineTimeout);
        if (!online) {
          throw new NetworkError('Network unavailable', 'offline');
        }
      } else {
        throw new NetworkError('Network unavailable', 'offline');
      }
    }

    // Check minimum quality
    if (minQuality) {
      const quality = this.monitor.getQuality();
      const qualityOrder: NetworkQuality[] = ['offline', 'poor', 'fair', 'good', 'excellent'];
      const currentIndex = qualityOrder.indexOf(quality);
      const minIndex = qualityOrder.indexOf(minQuality);

      if (currentIndex < minIndex) {
        throw new NetworkError(
          `Network quality insufficient: ${quality} < ${minQuality}`,
          'quality'
        );
      }
    }

    try {
      return await fetch(url, fetchOptions);
    } catch (error) {
      // If request failed due to network and retry is enabled, queue it
      if (
        retryOnRecovery &&
        error instanceof TypeError &&
        error.message.includes('fetch')
      ) {
        if (queueOffline) {
          return this.queueRequest(url, options);
        }
      }
      throw error;
    }
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.offlineQueue.length;
  }

  /**
   * Clear offline queue
   */
  clearQueue(): void {
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    queue.forEach((request) => {
      request.reject(new Error('Queue cleared'));
    });
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.unsubscribe?.();
    this.clearQueue();
  }

  /**
   * Setup handler for network recovery
   */
  private setupRecoveryHandler(): void {
    this.unsubscribe = this.monitor.onStatusChange((status) => {
      if (status.online && this.offlineQueue.length > 0) {
        void this.processQueue();
      }
    });
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    logger.info('[Network] Processing offline queue', { count: queue.length });

    for (const request of queue) {
      // Skip requests older than 5 minutes
      if (Date.now() - request.timestamp > 300000) {
        request.reject(new Error('Request expired in offline queue'));
        continue;
      }

      try {
        const response = await fetch(request.url, request.options);
        request.resolve(response);
      } catch (error) {
        request.reject(error as Error);
      }
    }
  }

  /**
   * Queue request for later execution
   */
  private async queueRequest(url: string, options: NetworkAwareFetchOptions): Promise<Response> {
    return new Promise((resolve, reject) => {
      this.offlineQueue.push({
        url,
        options,
        resolve,
        reject,
        timestamp: Date.now(),
      });

      logger.debug('[Network] Request queued', { url, queueSize: this.offlineQueue.length });
    });
  }
}

// ============================================================================
// Network Error
// ============================================================================

/**
 * Network-related error
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly reason: 'offline' | 'timeout' | 'quality' | 'unknown'
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Check if error is due to offline status
 */
export function isOfflineError(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return error.reason === 'offline';
  }
  if (error instanceof TypeError) {
    return error.message.includes('fetch') || error.message.includes('network');
  }
  return false;
}

/**
 * Get suggested action based on network quality
 */
export function getSuggestedAction(quality: NetworkQuality): {
  loadImages: boolean;
  prefetch: boolean;
  useCache: boolean;
  reducedMotion: boolean;
} {
  switch (quality) {
    case 'excellent':
      return { loadImages: true, prefetch: true, useCache: false, reducedMotion: false };
    case 'good':
      return { loadImages: true, prefetch: true, useCache: false, reducedMotion: false };
    case 'fair':
      return { loadImages: true, prefetch: false, useCache: true, reducedMotion: false };
    case 'poor':
      return { loadImages: false, prefetch: false, useCache: true, reducedMotion: true };
    case 'offline':
      return { loadImages: false, prefetch: false, useCache: true, reducedMotion: true };
    default:
      return { loadImages: true, prefetch: false, useCache: true, reducedMotion: false };
  }
}

// ============================================================================
// Default Instance
// ============================================================================

/**
 * Global network monitor instance
 */
export const networkMonitor = new NetworkMonitor();

/**
 * Global network-aware fetch instance
 */
export const networkAwareFetch = new NetworkAwareFetch(networkMonitor);

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Check if browser is online
 */
export function isOnline(): boolean {
  return networkMonitor.isOnline();
}

/**
 * Check if connection is slow
 */
export function isSlowConnection(): boolean {
  return networkMonitor.isSlowConnection();
}

/**
 * Get current network quality
 */
export function getNetworkQuality(): NetworkQuality {
  return networkMonitor.getQuality();
}

/**
 * Wait for online status
 */
export async function waitForOnline(timeout?: number): Promise<boolean> {
  return networkMonitor.waitForOnline(timeout);
}
