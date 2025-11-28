/**
 * @file Server Integration Module Index
 * @description Central export point for server-side streaming utilities.
 *
 * This module provides all utilities needed for integrating the Dynamic HTML
 * Streaming Engine with server-side rendering frameworks. It includes
 * middleware factories, serialization utilities, and SSR helpers.
 *
 * @module streaming/server
 * @version 1.0.0
 * @author Harbor Framework Team
 *
 * @example
 * ```typescript
 * import {
 *   createStreamingMiddleware,
 *   createServerStreamContext,
 *   createReactStreamOptions,
 *   generateNonce,
 * } from '@/lib/streaming/server';
 *
 * // Set up Express middleware
 * app.use(createStreamingMiddleware({ compress: true }));
 *
 * // Handle streaming SSR
 * app.get('/', (req, res) => {
 *   const nonce = generateNonce();
 *   const context = createServerStreamContext(
 *     (chunk) => res.write(chunk),
 *     () => res.flush?.(),
 *     { nonce }
 *   );
 *
 *   // Render with React streaming
 *   const options = createReactStreamOptions({
 *     nonce,
 *     onShellReady() {
 *       res.statusCode = 200;
 *       stream.pipe(res);
 *     },
 *   });
 *
 *   const { pipe } = renderToPipeableStream(<App />, options);
 * });
 * ```
 */

// ============================================================================
// Middleware & Context
// ============================================================================

export {
  // Middleware factory
  createStreamingMiddleware,

  // Context creation
  createServerStreamContext,

  // Headers
  createStreamingHeaders,
  createEarlyHints,

  // Constants
  DEFAULT_MIDDLEWARE_OPTIONS,
  STREAMING_HEADERS,

  // Types
  type StreamingRequest,
  type StreamingResponse,
  type NextFunction,
  type StreamingMiddleware,
  type PreloadResource,
} from './streaming-middleware';

// ============================================================================
// Serialization
// ============================================================================

export {
  // State serialization
  serializeStreamState,
  deserializeStreamState,

  // Hydration
  createHydrationScript,
} from './streaming-middleware';

// ============================================================================
// Markers & Wrappers
// ============================================================================

export {
  // Boundary markers
  StreamMarkers,

  // Content wrapping
  wrapBoundaryContent,
  createServerChunk,
} from './streaming-middleware';

// ============================================================================
// Pipeline & Scheduling
// ============================================================================

export {
  // Pipeline creation
  createStreamingPipeline,
  createFlushSchedule,

  // Types
  type FlushScheduleEntry,
} from './streaming-middleware';

// ============================================================================
// React SSR Integration
// ============================================================================

export {
  // React stream options
  createReactStreamOptions,
  createShellHtml,

  // Types
  type RenderToStreamOptions,
  type ShellOptions,
} from './streaming-middleware';

// ============================================================================
// Utilities
// ============================================================================

export {
  // Nonce generation
  generateNonce,
} from './streaming-middleware';

// ============================================================================
// Re-export Server Types
// ============================================================================

export type {
  ServerStreamContext,
  StreamingMiddlewareOptions,
  SerializedStreamState,
} from '../types';
