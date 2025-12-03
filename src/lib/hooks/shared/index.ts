/**
 * @file Shared Hook Utilities
 * @description Common utilities used across multiple hooks
 *
 * These utilities provide foundational patterns for:
 * - Component lifecycle management
 * - Network quality detection
 * - Data buffering/batching
 * - Ref management
 *
 * Import from this module when building custom hooks or components
 * that need these common patterns.
 */

// Mounted state tracking
export { useIsMounted, useMountedState } from './useIsMounted';

// Latest value refs
export { useLatestRef, useLatestCallback, useLatestRefs } from './useLatestRef';

// Network utilities
export {
  getNetworkInfo,
  meetsMinimumQuality,
  shouldAllowPrefetch,
  monitorNetworkQuality,
  isSlowConnection,
  getConnectionQualityLabel,
  type ConnectionType,
  type NetworkInformation,
} from './networkUtils';

// Buffering utilities
export {
  useBuffer,
  useTimeWindowBuffer,
  useBatchBuffer,
  type BufferOptions,
  type UseBufferResult,
} from './useBuffer';
