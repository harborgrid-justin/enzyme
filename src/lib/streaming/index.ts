/**
 * @file Dynamic HTML Streaming Engine - Main Module
 * @description Central export point for the Dynamic HTML Streaming Engine.
 *
 * This module provides a comprehensive streaming solution for progressive
 * HTML delivery in React applications. It enables:
 *
 * - Priority-based content streaming (critical, high, normal, low)
 * - Stream lifecycle management (start, pause, resume, abort)
 * - Backpressure handling with configurable strategies
 * - React Suspense integration
 * - Server-side rendering support
 * - Comprehensive metrics and telemetry
 *
 * @module streaming
 * @version 1.0.0
 * @author Harbor Framework Team
 *
 * @example
 * ```tsx
 * // Setup in your app
 * import { StreamProvider, StreamBoundary, StreamPriority } from '@/lib/streaming';
 *
 * function App() {
 *   return (
 *     <StreamProvider config={{ debug: true }}>
 *       <StreamBoundary id="nav" priority="critical">
 *         <Navigation />
 *       </StreamBoundary>
 *
 *       <StreamBoundary
 *         id="hero"
 *         priority="high"
 *         placeholder={<HeroSkeleton />}
 *       >
 *         <HeroSection />
 *       </StreamBoundary>
 *
 *       <StreamBoundary
 *         id="content"
 *         priority="normal"
 *         deferMs={100}
 *       >
 *         <MainContent />
 *       </StreamBoundary>
 *     </StreamProvider>
 *   );
 * }
 * ```
 */

// ============================================================================
// Core Components
// ============================================================================

/**
 * StreamProvider - Context provider for streaming configuration
 * @see {@link StreamProvider}
 */
export {
  StreamProvider,
  useStreamContext,
  useOptionalStreamContext,
  useStreamingAvailable,
  useIsSSR,
  useStreamMetrics,
  useStreamEvents,
  withStream,
  StreamErrorBoundary,
  isServerEnvironment,
  isStreamingSupported,
  type WithStreamProps,
} from './StreamProvider';

/**
 * StreamBoundary - Component for defining streaming boundaries
 * @see {@link StreamBoundary}
 */
export {
  StreamBoundary,
  CriticalStreamBoundary,
  DeferredStreamBoundary,
  ConditionalStreamBoundary,
  DefaultPlaceholder,
  NonStreamingFallback,
  createBoundaryActivationScript,
  createBoundaryMarker,
  type ConditionalStreamBoundaryProps,
} from './StreamBoundary';

// ============================================================================
// Core Engine
// ============================================================================

/**
 * StreamingEngine - Core streaming engine implementation
 * @see {@link StreamingEngine}
 */
export {
  StreamingEngine,
  createStreamingEngine,
  createChunk,
  calculateChecksum,
  createReadableStream,
  createChunkTransformStream,
} from './streaming-engine';

// ============================================================================
// Hooks
// ============================================================================

/**
 * Streaming hooks for component integration
 * @see {@link useStream}
 * @see {@link useStreamStatus}
 * @see {@link useStreamPriority}
 * @see {@link useDeferredStream}
 */
export {
  // Core stream hook
  useStream,
  useMultipleStreams,
  useAwaitStream,

  // Status monitoring
  useStreamStatus,
  useExtendedStreamStatus,

  // Priority control
  useStreamPriority,
  useExtendedStreamPriority,
  useCriticalPriority,
  useDeferredPriority,

  // Deferral
  useDeferredStream,
  useExtendedDeferredStream,
  useDeferUntilVisible,
  useDeferUntilIdle,
  useDeferUntilEvent,

  // Hook types
  type UseStreamOptions,
  type UseMultipleStreamsResult,
  type UseStreamStatusOptions,
  type StatusDetails,
  type UseExtendedStreamStatusResult,
  type UseStreamPriorityOptions,
  type UseExtendedStreamPriorityResult,
  type UseExtendedDeferredStreamResult,
} from './hooks';

// ============================================================================
// Server Integration
// ============================================================================

/**
 * Server-side streaming utilities
 * @see {@link createStreamingMiddleware}
 * @see {@link createServerStreamContext}
 */
export {
  // Middleware
  createStreamingMiddleware,
  createServerStreamContext,
  createStreamingHeaders,
  createEarlyHints,

  // Serialization
  serializeStreamState,
  deserializeStreamState,
  createHydrationScript,

  // Markers
  StreamMarkers,
  wrapBoundaryContent,
  createServerChunk,

  // Pipeline
  createStreamingPipeline,
  createFlushSchedule,

  // React SSR
  createReactStreamOptions,
  createShellHtml,

  // Utilities
  generateNonce,

  // Constants
  DEFAULT_MIDDLEWARE_OPTIONS,
  STREAMING_HEADERS,

  // Server types
  type StreamingRequest,
  type StreamingResponse,
  type NextFunction,
  type StreamingMiddleware,
  type PreloadResource,
  type FlushScheduleEntry,
  type RenderToStreamOptions,
  type ShellOptions,
} from './server';

// ============================================================================
// Types
// ============================================================================

/**
 * Type definitions for the streaming system
 */
export {
  // Enums
  StreamPriority,
  StreamState,
  BackpressureStrategy,
  StreamErrorCode,
  StreamEventType,
  DeferReason,

  // Configuration types
  type StreamConfig,
  type EngineConfig,

  // Data structures
  type StreamChunk,
  type StreamBoundaryData,
  type QueueEntry,

  // Error types
  type StreamError,
  createStreamError,
  isRetryableError,

  // Metrics
  type StreamMetrics,
  type BoundaryMetrics,

  // Events
  type StreamEvent,
  type StreamEventHandler,
  type StreamEventPayload,

  // Function types
  type ChunkTransformer,
  type TransformContext,

  // Component props
  type StreamBoundaryProps,
  type StreamProviderProps,

  // Context value
  type StreamContextValue,

  // Hook return types
  type UseStreamResult,
  type UseStreamStatusResult,
  type UseStreamPriorityResult,
  type UseDeferredStreamOptions,
  type UseDeferredStreamResult,

  // Server types
  type ServerStreamContext,
  type StreamingMiddlewareOptions,
  type SerializedStreamState,

  // Utility types
  type DeepPartial,

  // Type guards
  isStreamError,
  isStreamChunk,

  // Constants
  PRIORITY_VALUES,
  DEFAULT_ENGINE_CONFIG,
  DEFAULT_METRICS,
} from './types';


