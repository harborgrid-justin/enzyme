/**
 * @file Streaming Hooks Index
 * @description Central export point for all streaming-related React hooks.
 *
 * This module exports hooks for interacting with the Dynamic HTML Streaming
 * Engine, providing controls for stream lifecycle, status monitoring,
 * priority management, and content deferral.
 *
 * @module streaming/hooks
 * @version 1.0.0
 * @author Harbor Framework Team
 *
 * @example
 * ```tsx
 * import {
 *   useStream,
 *   useStreamStatus,
 *   useStreamPriority,
 *   useDeferredStream,
 * } from '@/lib/streaming/hooks';
 *
 * function MyStreamingComponent() {
 *   const stream = useStream('my-boundary');
 *   const status = useStreamStatus('my-boundary');
 *   const priority = useStreamPriority('my-boundary');
 *   const deferred = useDeferredStream({ deferUntilVisible: true });
 *
 *   // ... use streaming functionality
 * }
 * ```
 */

// ============================================================================
// Core Stream Hook
// ============================================================================

export {
  useStream,
  useMultipleStreams,
  useAwaitStream,
  type UseStreamOptions,
  type UseMultipleStreamsResult,
} from './useStream';

// ============================================================================
// Stream Status Hook
// ============================================================================

export {
  useStreamStatus,
  useExtendedStreamStatus,
  type UseStreamStatusOptions,
  type StatusDetails,
  type UseExtendedStreamStatusResult,
} from './useStreamStatus';

// ============================================================================
// Stream Priority Hook
// ============================================================================

export {
  useStreamPriority,
  useExtendedStreamPriority,
  useCriticalPriority,
  useDeferredPriority,
  type UseStreamPriorityOptions,
  type UseExtendedStreamPriorityResult,
} from './useStreamPriority';

// ============================================================================
// Deferred Stream Hook
// ============================================================================

export {
  useDeferredStream,
  useExtendedDeferredStream,
  useDeferUntilVisible,
  useDeferUntilIdle,
  useDeferUntilEvent,
  type UseExtendedDeferredStreamResult,
} from './useDeferredStream';

// ============================================================================
// Re-export Types
// ============================================================================

export type {
  UseStreamResult,
  UseStreamStatusResult,
  UseStreamPriorityResult,
  UseDeferredStreamOptions,
  UseDeferredStreamResult,
} from '../types';
