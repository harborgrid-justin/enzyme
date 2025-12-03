/**
 * @file Dynamic HTML Streaming Engine - Type Definitions
 * @description Comprehensive TypeScript type system for the streaming architecture.
 *
 * This module provides the foundational type definitions for the Dynamic HTML Streaming
 * Engine, implementing a priority-based streaming system with full lifecycle management,
 * backpressure handling, and React Suspense integration.
 *
 * @module streaming/types
 * @version 1.0.0
 * @author Harbor Framework Team
 */

import type React from 'react';
import type { ReactNode } from 'react';

// ============================================================================
// Core Enumerations
// ============================================================================

/**
 * Stream priority levels for content delivery ordering.
 *
 * @description
 * Priority levels determine the order in which stream chunks are processed
 * and delivered to the client. Higher priority content is streamed first
 * to optimize Time to First Contentful Paint (FCP) and Largest Contentful Paint (LCP).
 *
 * - `critical`: Above-the-fold content, navigation, and essential UI chrome
 * - `high`: Primary content visible without scrolling
 * - `normal`: Standard content that may require minimal scrolling
 * - `low`: Below-the-fold content, deferred widgets, and analytics
 *
 * @example
 * ```typescript
 * const config: StreamConfig = {
 *   priority: StreamPriority.Critical,
 *   deferMs: 0,
 * };
 * ```
 */
export enum StreamPriority {
  Critical = 'critical',
  High = 'high',
  Normal = 'normal',
  Low = 'low',
}

/**
 * Numeric priority values for queue ordering.
 * Lower values indicate higher priority (processed first).
 */
export const PRIORITY_VALUES: Record<StreamPriority, number> = {
  [StreamPriority.Critical]: 0,
  [StreamPriority.High]: 1,
  [StreamPriority.Normal]: 2,
  [StreamPriority.Low]: 3,
} as const;

/**
 * Stream lifecycle states representing the current operational status.
 *
 * @description
 * The streaming engine follows a state machine pattern with well-defined
 * transitions between states:
 *
 * ```
 * idle --> pending --> streaming --> completed
 *                  \-> paused ->/
 *                  \-> error
 *                  \-> aborted
 * ```
 */
export enum StreamState {
  /** Initial state before streaming begins */
  Idle = 'idle',
  /** Stream is queued and waiting to be processed */
  Pending = 'pending',
  /** Actively streaming content */
  Streaming = 'streaming',
  /** Temporarily paused, can be resumed */
  Paused = 'paused',
  /** Successfully completed all chunks */
  Completed = 'completed',
  /** Terminated due to an error */
  Error = 'error',
  /** Manually aborted by user or system */
  Aborted = 'aborted',
}

/**
 * Backpressure strategy for handling buffer overflow situations.
 *
 * @description
 * When the stream buffer reaches capacity, the backpressure strategy
 * determines how the engine handles incoming data:
 *
 * - `pause`: Pause the source stream until buffer drains
 * - `drop`: Drop new chunks (lossy, but maintains flow)
 * - `buffer`: Dynamically expand buffer (memory intensive)
 * - `error`: Throw an error to halt processing
 */
export enum BackpressureStrategy {
  Pause = 'pause',
  Drop = 'drop',
  Buffer = 'buffer',
  Error = 'error',
}

// ============================================================================
// Configuration Interfaces
// ============================================================================

/**
 * Configuration for individual stream boundaries.
 *
 * @description
 * StreamConfig defines the behavior of a single streaming boundary,
 * including priority, timing, and lifecycle callbacks.
 *
 * @example
 * ```typescript
 * const heroConfig: StreamConfig = {
 *   priority: StreamPriority.Critical,
 *   deferMs: 0,
 *   placeholder: <HeroSkeleton />,
 *   onStreamStart: () => performance.mark('hero-stream-start'),
 *   onStreamComplete: () => performance.measure('hero-stream', 'hero-stream-start'),
 * };
 * ```
 */
export interface StreamConfig {
  /**
   * Priority level for this stream boundary.
   * @default StreamPriority.Normal
   */
  priority: StreamPriority | `${StreamPriority}`;

  /**
   * Delay in milliseconds before streaming begins.
   * Useful for staggering non-critical content.
   * @default 0
   */
  deferMs?: number;

  /**
   * Maximum time in milliseconds to wait for stream completion.
   * After timeout, fallback content is rendered.
   * @default 30000
   */
  timeoutMs?: number;

  /**
   * Placeholder content displayed during streaming.
   * Should match the approximate dimensions of final content
   * to prevent Cumulative Layout Shift (CLS).
   */
  placeholder?: ReactNode;

  /**
   * Fallback content for non-streaming environments
   * or when streaming fails.
   */
  fallback?: ReactNode;

  /**
   * Enable server-side rendering integration.
   * @default true
   */
  ssr?: boolean;

  /**
   * Callback invoked when streaming begins.
   */
  onStreamStart?: () => void;

  /**
   * Callback invoked when streaming completes successfully.
   */
  onStreamComplete?: () => void;

  /**
   * Callback invoked when streaming encounters an error.
   * @param error - The error that occurred
   */
  onStreamError?: (error: StreamError) => void;

  /**
   * Callback invoked when stream is aborted.
   * @param reason - The reason for abortion
   */
  onStreamAbort?: (reason: string) => void;
}

/**
 * Global streaming engine configuration.
 *
 * @description
 * EngineConfig controls the behavior of the entire streaming system,
 * including buffer management, concurrency limits, and debugging options.
 */
export interface EngineConfig {
  /**
   * Maximum number of concurrent streams.
   * Higher values increase throughput but consume more memory.
   * @default 6
   */
  maxConcurrentStreams: number;

  /**
   * Size of the chunk buffer in bytes.
   * @default 65536 (64KB)
   */
  bufferSize: number;

  /**
   * High water mark for backpressure in bytes.
   * When buffer exceeds this, backpressure is applied.
   * @default 16384 (16KB)
   */
  highWaterMark: number;

  /**
   * Strategy for handling backpressure.
   * @default BackpressureStrategy.Pause
   */
  backpressureStrategy: BackpressureStrategy;

  /**
   * Enable debug logging.
   * @default false
   */
  debug: boolean;

  /**
   * Enable performance metrics collection.
   * @default true
   */
  enableMetrics: boolean;

  /**
   * Custom chunk transformer function.
   * Applied to each chunk before delivery.
   */
  chunkTransformer?: ChunkTransformer;

  /**
   * Global timeout for all streams in milliseconds.
   * Individual stream timeouts take precedence.
   * @default 60000 (1 minute)
   */
  globalTimeoutMs: number;

  /**
   * Enable automatic retry for failed chunks.
   * @default true
   */
  enableRetry: boolean;

  /**
   * Maximum retry attempts for failed chunks.
   * @default 3
   */
  maxRetries: number;

  /**
   * Base delay between retries in milliseconds.
   * Uses exponential backoff.
   * @default 1000
   */
  retryDelayMs: number;
}

/**
 * Default engine configuration values.
 */
export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  maxConcurrentStreams: 6,
  bufferSize: 65536,
  highWaterMark: 16384,
  backpressureStrategy: BackpressureStrategy.Pause,
  debug: false,
  enableMetrics: true,
  globalTimeoutMs: 60000,
  enableRetry: true,
  maxRetries: 3,
  retryDelayMs: 1000,
} as const;

// ============================================================================
// Stream Data Structures
// ============================================================================

/**
 * Individual stream chunk with metadata.
 *
 * @description
 * Represents a single unit of data in the stream, along with
 * metadata for ordering, timing, and integrity verification.
 */
export interface StreamChunk {
  /** Unique identifier for this chunk */
  id: string;

  /** Sequence number for ordering */
  sequence: number;

  /** The actual data payload */
  data: string | Uint8Array;

  /** Timestamp when chunk was created */
  timestamp: number;

  /** Size of the chunk in bytes */
  size: number;

  /** Whether this is the final chunk */
  isFinal: boolean;

  /** Optional checksum for integrity verification */
  checksum?: string;

  /** Parent stream boundary ID */
  boundaryId: string;

  /** Chunk-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Stream boundary registration data.
 *
 * @description
 * Contains all information about a registered stream boundary,
 * used by the engine to manage and coordinate streams.
 */
export interface StreamBoundaryData {
  /** Unique identifier for this boundary */
  id: string;

  /** Configuration for this boundary */
  config: StreamConfig;

  /** Current state of this stream */
  state: StreamState;

  /** Queue of chunks for this boundary */
  chunks: StreamChunk[];

  /** Total bytes received */
  bytesReceived: number;

  /** Total bytes delivered to client */
  bytesDelivered: number;

  /** Timestamp when streaming started */
  startTime?: number;

  /** Timestamp when streaming completed */
  endTime?: number;

  /** Last error encountered */
  lastError?: StreamError;

  /** Retry count for this boundary */
  retryCount: number;

  /** AbortController for this stream */
  abortController: AbortController;
}

/**
 * Priority queue entry for stream scheduling.
 */
export interface QueueEntry {
  /** Boundary ID */
  boundaryId: string;

  /** Priority value (lower = higher priority) */
  priority: number;

  /** Timestamp when queued */
  queuedAt: number;

  /** Scheduled execution time */
  scheduledTime: number;
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Stream-specific error with context.
 *
 * @description
 * Extends the standard Error class with streaming-specific
 * information for debugging and error recovery.
 */
export interface StreamError {
  /** Error code for programmatic handling */
  code: StreamErrorCode;

  /** Human-readable error message */
  message: string;

  /** Boundary ID where error occurred */
  boundaryId?: string;

  /** Chunk ID if error was chunk-specific */
  chunkId?: string;

  /** Original error if this wraps another error */
  cause?: Error;

  /** Whether this error is retryable */
  retryable: boolean;

  /** Timestamp when error occurred */
  timestamp: number;

  /** Stack trace for debugging */
  stack?: string;
}

/**
 * Error codes for stream-specific errors.
 */
export enum StreamErrorCode {
  /** Network-related error */
  NetworkError = 'STREAM_NETWORK_ERROR',
  /** Stream timeout exceeded */
  TimeoutError = 'STREAM_TIMEOUT_ERROR',
  /** Stream was aborted */
  AbortError = 'STREAM_ABORT_ERROR',
  /** Buffer overflow */
  BufferOverflow = 'STREAM_BUFFER_OVERFLOW',
  /** Invalid chunk data */
  InvalidChunk = 'STREAM_INVALID_CHUNK',
  /** Checksum mismatch */
  ChecksumError = 'STREAM_CHECKSUM_ERROR',
  /** Server error response */
  ServerError = 'STREAM_SERVER_ERROR',
  /** Unknown/generic error */
  UnknownError = 'STREAM_UNKNOWN_ERROR',
  /** Configuration error */
  ConfigError = 'STREAM_CONFIG_ERROR',
  /** State machine violation */
  StateError = 'STREAM_STATE_ERROR',
}

/**
 * Factory function to create StreamError instances.
 */
export function createStreamError(
  code: StreamErrorCode,
  message: string,
  options?: Partial<Omit<StreamError, 'code' | 'message' | 'timestamp'>>
): StreamError {
  return {
    code,
    message,
    retryable: isRetryableError(code),
    timestamp: Date.now(),
    ...options,
  };
}

/**
 * Determines if an error code represents a retryable condition.
 */
export function isRetryableError(code: StreamErrorCode): boolean {
  return [
    StreamErrorCode.NetworkError,
    StreamErrorCode.TimeoutError,
    StreamErrorCode.ServerError,
  ].includes(code);
}

// ============================================================================
// Metrics & Telemetry
// ============================================================================

/**
 * Streaming performance metrics.
 *
 * @description
 * Comprehensive metrics for monitoring streaming performance,
 * useful for debugging and optimization.
 */
export interface StreamMetrics {
  /** Total number of active streams */
  activeStreams: number;

  /** Total number of completed streams */
  completedStreams: number;

  /** Total number of failed streams */
  failedStreams: number;

  /** Total bytes transferred across all streams */
  totalBytesTransferred: number;

  /** Current buffer utilization (0-1) */
  bufferUtilization: number;

  /** Average chunk latency in milliseconds */
  averageChunkLatency: number;

  /** Time to first chunk across all streams in milliseconds */
  averageTimeToFirstChunk: number;

  /** Streams per priority level */
  streamsByPriority: Record<StreamPriority, number>;

  /** Backpressure events count */
  backpressureEvents: number;

  /** Retry attempts count */
  retryAttempts: number;

  /** Timestamp of last metric update */
  lastUpdated: number;

  /** Per-boundary metrics */
  boundaryMetrics: Map<string, BoundaryMetrics>;
}

/**
 * Metrics for an individual stream boundary.
 */
export interface BoundaryMetrics {
  /** Boundary identifier */
  boundaryId: string;

  /** Time to first chunk in milliseconds */
  timeToFirstChunk: number;

  /** Time to completion in milliseconds */
  timeToComplete: number;

  /** Total chunks received */
  chunksReceived: number;

  /** Total bytes received */
  bytesReceived: number;

  /** Average chunk size in bytes */
  averageChunkSize: number;

  /** Number of retry attempts */
  retries: number;

  /** Whether stream completed successfully */
  successful: boolean;
}

/**
 * Default empty metrics object.
 */
export const DEFAULT_METRICS: StreamMetrics = {
  activeStreams: 0,
  completedStreams: 0,
  failedStreams: 0,
  totalBytesTransferred: 0,
  bufferUtilization: 0,
  averageChunkLatency: 0,
  averageTimeToFirstChunk: 0,
  streamsByPriority: {
    [StreamPriority.Critical]: 0,
    [StreamPriority.High]: 0,
    [StreamPriority.Normal]: 0,
    [StreamPriority.Low]: 0,
  },
  backpressureEvents: 0,
  retryAttempts: 0,
  lastUpdated: 0,
  boundaryMetrics: new Map(),
} as const;

// ============================================================================
// Function Types
// ============================================================================

/**
 * Chunk transformer function type.
 * Applied to each chunk before delivery.
 */
export type ChunkTransformer = (
  chunk: StreamChunk,
  context: TransformContext
) => StreamChunk | Promise<StreamChunk>;

/**
 * Context provided to chunk transformers.
 */
export interface TransformContext {
  /** Boundary ID for this chunk */
  boundaryId: string;

  /** Stream configuration */
  config: StreamConfig;

  /** Total chunks processed so far */
  totalChunks: number;

  /** Total bytes processed so far */
  totalBytes: number;
}

/**
 * Stream event handler function type.
 */
export type StreamEventHandler<T = unknown> = (event: StreamEvent<T>) => void;

/**
 * Stream event with typed payload.
 */
export interface StreamEvent<T = unknown> {
  /** Event type */
  type: StreamEventType;

  /** Boundary ID */
  boundaryId: string;

  /** Event timestamp */
  timestamp: number;

  /** Event payload */
  payload?: T;
}

/**
 * Stream event types.
 */
export enum StreamEventType {
  Start = 'stream:start',
  Chunk = 'stream:chunk',
  Pause = 'stream:pause',
  Resume = 'stream:resume',
  Complete = 'stream:complete',
  Error = 'stream:error',
  Abort = 'stream:abort',
  Backpressure = 'stream:backpressure',
  Retry = 'stream:retry',
  StateChange = 'stream:state-change',
}

// ============================================================================
// React Component Types
// ============================================================================

/**
 * Props for the StreamBoundary component.
 */
export interface StreamBoundaryProps {
  /** Unique identifier for this boundary */
  id?: string;

  /** Child content to stream */
  children: ReactNode;

  /** Stream priority level */
  priority?: StreamPriority | `${StreamPriority}`;

  /** Delay before streaming begins */
  deferMs?: number;

  /** Timeout for stream completion */
  timeoutMs?: number;

  /** Placeholder during streaming */
  placeholder?: ReactNode;

  /** Fallback for non-streaming environments */
  fallback?: ReactNode;

  /** Enable SSR integration */
  ssr?: boolean;

  /** Callback when streaming starts */
  onStreamStart?: () => void;

  /** Callback when streaming completes */
  onStreamComplete?: () => void;

  /** Callback when streaming errors */
  onStreamError?: (error: StreamError) => void;

  /** CSS class name */
  className?: string;

  /** Custom test ID for testing */
  testId?: string;
}

/**
 * Props for the StreamProvider component.
 */
export interface StreamProviderProps {
  /** Child components */
  children: ReactNode;

  /** Engine configuration overrides */
  config?: Partial<EngineConfig>;

  /** Enable debug mode */
  debug?: boolean;

  /** Enable metrics collection */
  enableMetrics?: boolean;

  /** Global error handler */
  onError?: (error: StreamError) => void;

  /** Metrics update callback */
  onMetricsUpdate?: (metrics: StreamMetrics) => void;
}

/**
 * Stream context value provided by StreamProvider.
 */
export interface StreamContextValue {
  /** Register a new stream boundary */
  registerBoundary: (id: string, config: StreamConfig) => void;

  /** Unregister a stream boundary */
  unregisterBoundary: (id: string) => void;

  /** Get current state of a boundary */
  getBoundaryState: (id: string) => StreamState | null;

  /** Start streaming for a boundary */
  startStream: (id: string) => void;

  /** Pause streaming for a boundary */
  pauseStream: (id: string) => void;

  /** Resume streaming for a boundary */
  resumeStream: (id: string) => void;

  /** Abort streaming for a boundary */
  abortStream: (id: string, reason?: string) => void;

  /** Get current metrics */
  getMetrics: () => StreamMetrics;

  /** Subscribe to stream events */
  subscribe: (handler: StreamEventHandler) => () => void;

  /** Current engine configuration */
  config: EngineConfig;

  /** Whether streaming is supported in current environment */
  isStreamingSupported: boolean;

  /** Whether currently in SSR context */
  isSSR: boolean;
}

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * Return type for useStream hook.
 */
export interface UseStreamResult {
  /** Current stream state */
  state: StreamState;

  /** Whether stream is currently active */
  isStreaming: boolean;

  /** Whether stream has completed */
  isComplete: boolean;

  /** Whether stream has errored */
  hasError: boolean;

  /** Current error if any */
  error: StreamError | null;

  /** Progress (0-1) if determinable */
  progress: number | null;

  /** Start the stream */
  start: () => void;

  /** Pause the stream */
  pause: () => void;

  /** Resume the stream */
  resume: () => void;

  /** Abort the stream */
  abort: (reason?: string) => void;

  /** Reset the stream to initial state */
  reset: () => void;
}

/**
 * Return type for useStreamStatus hook.
 */
export interface UseStreamStatusResult {
  /** Current state for the boundary */
  state: StreamState;

  /** Human-readable status message */
  statusMessage: string;

  /** Whether the boundary is registered */
  isRegistered: boolean;

  /** Time elapsed since stream started in milliseconds */
  elapsedTime: number | null;

  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining: number | null;

  /** Bytes transferred */
  bytesTransferred: number;

  /** Number of chunks received */
  chunksReceived: number;
}

/**
 * Return type for useStreamPriority hook.
 */
export interface UseStreamPriorityResult {
  /** Current priority */
  priority: StreamPriority;

  /** Update priority */
  setPriority: (priority: StreamPriority) => void;

  /** Escalate priority to next higher level */
  escalate: () => void;

  /** Deescalate priority to next lower level */
  deescalate: () => void;
}

/**
 * Options for useDeferredStream hook.
 */
export interface UseDeferredStreamOptions {
  /** Defer until element is visible */
  deferUntilVisible?: boolean;

  /** Defer until browser is idle */
  deferUntilIdle?: boolean;

  /** Defer until specific event */
  deferUntilEvent?: string;

  /** Maximum defer time in milliseconds */
  maxDeferMs?: number;

  /** Intersection observer threshold for visibility */
  visibilityThreshold?: number;
}

/**
 * Return type for useDeferredStream hook.
 */
export interface UseDeferredStreamResult {
  /** Whether stream should be deferred */
  isDeferred: boolean;

  /** Trigger immediate streaming */
  triggerNow: () => void;

  /** Ref to attach to the element for visibility detection */
  ref: React.RefObject<HTMLElement>;

  /** Reason for deferral */
  deferReason: DeferReason | null;
}

/**
 * Reasons for stream deferral.
 */
export enum DeferReason {
  NotVisible = 'not-visible',
  BrowserBusy = 'browser-busy',
  WaitingForEvent = 'waiting-for-event',
  TimeBased = 'time-based',
  ManualHold = 'manual-hold',
}

// ============================================================================
// Server Integration Types
// ============================================================================

/**
 * Server-side streaming context.
 */
export interface ServerStreamContext {
  /** Write a chunk to the response stream */
  write: (chunk: string | Uint8Array) => void;

  /** Flush buffered content */
  flush: () => void;

  /** Signal that streaming is complete */
  end: () => void;

  /** Current nonce for CSP */
  nonce?: string;

  /** Request ID for correlation */
  requestId: string;

  /** Response headers to set */
  headers: Map<string, string>;
}

/**
 * Streaming middleware options.
 */
export interface StreamingMiddlewareOptions {
  /** Enable gzip compression */
  compress?: boolean;

  /** Minimum bytes before compression */
  compressThreshold?: number;

  /** Custom response headers */
  headers?: Record<string, string>;

  /** CSP nonce generator */
  nonceGenerator?: () => string;

  /** Request timeout in milliseconds */
  timeoutMs?: number;

  /** Enable early hints (103) */
  enableEarlyHints?: boolean;

  /** Error handler */
  onError?: (error: Error) => void;
}

/**
 * Serialized stream state for hydration.
 */
export interface SerializedStreamState {
  /** Boundary ID */
  boundaryId: string;

  /** Final state */
  state: StreamState;

  /** Serialized content */
  content: string;

  /** Checksum for validation */
  checksum: string;

  /** Server render timestamp */
  serverTimestamp: number;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Deep partial type utility.
 *
 * @deprecated Import from '../shared/type-utils' instead.
 * This re-export is provided for backward compatibility.
 */
export type { DeepPartial } from '../shared/type-utils';

/**
 * Extract event payload type.
 */
export type StreamEventPayload<T extends StreamEventType> = T extends StreamEventType.Chunk
  ? StreamChunk
  : T extends StreamEventType.Error
    ? StreamError
    : T extends StreamEventType.StateChange
      ? { from: StreamState; to: StreamState }
      : T extends StreamEventType.Backpressure
        ? { pressure: number }
        : T extends StreamEventType.Retry
          ? { attempt: number; maxAttempts: number }
          : unknown;

/**
 * Type guard for StreamError.
 */
export function isStreamError(error: unknown): error is StreamError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'retryable' in error &&
    Object.values(StreamErrorCode).includes((error as StreamError).code)
  );
}

/**
 * Type guard for StreamChunk.
 */
export function isStreamChunk(chunk: unknown): chunk is StreamChunk {
  return (
    typeof chunk === 'object' &&
    chunk !== null &&
    'id' in chunk &&
    'sequence' in chunk &&
    'data' in chunk &&
    'boundaryId' in chunk
  );
}
