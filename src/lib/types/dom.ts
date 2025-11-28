/**
 * @file Extended DOM Types
 * @description Type definitions for non-standard and browser-specific APIs
 * @module @/lib/types/dom
 */

// =============================================================================
// Network Information API (Chrome, Firefox, Opera)
// =============================================================================

/**
 * Network connection information
 * @see https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation
 */
export interface NetworkInformation {
  /** Connection type */
  readonly type?: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
  /** Effective connection type based on measured network performance */
  readonly effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  /** Effective bandwidth estimate in Mbps */
  readonly downlink?: number;
  /** Maximum downlink speed in Mbps */
  readonly downlinkMax?: number;
  /** Estimated round-trip time in ms */
  readonly rtt?: number;
  /** Data saver mode enabled */
  readonly saveData?: boolean;
  /** Event listener methods */
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

/**
 * Navigator extended with connection information
 */
export interface NavigatorWithConnection extends Navigator {
  /** Standard connection API */
  connection?: NetworkInformation;
  /** Mozilla prefixed connection API */
  mozConnection?: NetworkInformation;
  /** WebKit prefixed connection API */
  webkitConnection?: NetworkInformation;
}

// =============================================================================
// Performance Memory API (Chrome)
// =============================================================================

/**
 * Memory usage information (Chrome-specific)
 * @see https://developer.chrome.com/docs/devtools/memory-problems/
 */
export interface MemoryInfo {
  /** Used JavaScript heap size in bytes */
  readonly usedJSHeapSize: number;
  /** Total JavaScript heap size in bytes */
  readonly totalJSHeapSize: number;
  /** JavaScript heap size limit in bytes */
  readonly jsHeapSizeLimit: number;
}

/**
 * Performance extended with memory information
 */
export interface PerformanceWithMemory extends Performance {
  /** Memory usage information (Chrome only) */
  readonly memory?: MemoryInfo;
}

// =============================================================================
// Idle Callback API
// =============================================================================

/**
 * Idle deadline information
 * @see https://developer.mozilla.org/en-US/docs/Web/API/IdleDeadline
 */
export interface IdleDeadline {
  /** Whether the callback was invoked due to timeout */
  readonly didTimeout: boolean;
  /** Time remaining in milliseconds */
  timeRemaining(): number;
}

/**
 * Idle callback ID type
 */
export type IdleCallbackId = number;

/**
 * Idle callback function signature
 */
export type IdleRequestCallback = (deadline: IdleDeadline) => void;

/**
 * Window extended with requestIdleCallback
 */
export interface WindowWithIdleCallback extends Window {
  requestIdleCallback(
    callback: IdleRequestCallback,
    options?: { timeout?: number }
  ): IdleCallbackId;
  cancelIdleCallback(id: IdleCallbackId): void;
}

// =============================================================================
// Storage Quota API
// =============================================================================

/**
 * Storage quota information
 * @see https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate
 */
export interface StorageQuota {
  /** Storage used in bytes */
  readonly usage: number;
  /** Storage quota in bytes */
  readonly quota: number;
}

/**
 * Navigator extended with storage API
 */
export interface NavigatorWithStorage extends Navigator {
  storage?: {
    estimate(): Promise<StorageQuota>;
    persist(): Promise<boolean>;
    persisted(): Promise<boolean>;
  };
}

// =============================================================================
// Device Memory API
// =============================================================================

/**
 * Navigator extended with device memory
 */
export interface NavigatorWithDeviceMemory extends Navigator {
  /** Approximate device RAM in GB */
  readonly deviceMemory?: number;
}

// =============================================================================
// Combined Extended Types
// =============================================================================

/**
 * Extended navigator combining all non-standard APIs
 */
export type ExtendedNavigator =
  & Navigator
  & Partial<NavigatorWithConnection>
  & Partial<NavigatorWithStorage>
  & Partial<NavigatorWithDeviceMemory>;

/**
 * Extended performance combining all non-standard APIs
 */
export type ExtendedPerformance =
  & Performance
  & Partial<PerformanceWithMemory>;

/**
 * Extended window combining all non-standard APIs
 */
export type ExtendedWindow =
  & Window
  & Partial<WindowWithIdleCallback>;
