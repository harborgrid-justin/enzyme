/**
 * @file Streaming Middleware Utilities
 * @description Server-side utilities for SSR streaming integration.
 *
 * This module provides middleware patterns, utilities, and helpers for
 * integrating the Dynamic HTML Streaming Engine with server-side rendering
 * frameworks like Express, Fastify, or Next.js.
 *
 * @module streaming/server/streaming-middleware
 * @version 1.0.0
 * @author Harbor Framework Team
 *
 * @example
 * ```typescript
 * // Express integration
 * import { createStreamingMiddleware } from '@/lib/streaming/server';
 *
 * app.use(createStreamingMiddleware({
 *   compress: true,
 *   enableEarlyHints: true,
 * }));
 *
 * app.get('/', async (req, res) => {
 *   const stream = await renderToStreamingResponse(App, req);
 *   stream.pipe(res);
 * });
 * ```
 */

import type {
  StreamingMiddlewareOptions,
  ServerStreamContext,
  SerializedStreamState,
  StreamConfig,
  StreamChunk,
} from '../types';
import { StreamState, StreamPriority, calculateChecksum } from '../streaming-engine';

// ============================================================================
// Constants
// ============================================================================

/**
 * Default middleware options.
 */
const DEFAULT_MIDDLEWARE_OPTIONS: Required<StreamingMiddlewareOptions> = {
  compress: true,
  compressThreshold: 1024,
  headers: {},
  nonceGenerator: () => generateNonce(),
  timeoutMs: 30000,
  enableEarlyHints: false,
  onError: () => {},
};

/**
 * Streaming-specific HTTP headers.
 */
const STREAMING_HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  TRANSFER_ENCODING: 'Transfer-Encoding',
  X_ACCEL_BUFFERING: 'X-Accel-Buffering',
  CACHE_CONTROL: 'Cache-Control',
  X_STREAM_BOUNDARY: 'X-Stream-Boundary',
  X_STREAM_NONCE: 'X-Stream-Nonce',
} as const;

// ============================================================================
// Nonce Generation
// ============================================================================

/**
 * Generates a cryptographically secure nonce for CSP.
 *
 * @returns Base64-encoded nonce string
 *
 * @example
 * ```typescript
 * const nonce = generateNonce();
 * // Returns: "abc123def456..."
 * ```
 */
export function generateNonce(): string {
  if (typeof crypto !== 'undefined' && crypto !== null && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }

  // Fallback for older environments
  const array = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto !== null && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(array);
  } else {
    // Last resort fallback
    for (let i = 0; i < 16; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// Stream Context Factory
// ============================================================================

/**
 * Creates a server stream context for managing streaming output.
 *
 * @description
 * The server stream context provides a consistent interface for writing
 * streaming content regardless of the underlying HTTP server framework.
 *
 * @param writer - The write function for the response
 * @param flush - Optional flush function
 * @param options - Middleware options
 * @returns Server stream context
 *
 * @example
 * ```typescript
 * const context = createServerStreamContext(
 *   (chunk) => res.write(chunk),
 *   () => res.flush?.(),
 *   { nonce: 'abc123' }
 * );
 *
 * context.write('<div>Content</div>');
 * context.flush();
 * context.end();
 * ```
 */
export function createServerStreamContext(
  writer: (chunk: string | Uint8Array) => void,
  flush?: () => void,
  options: Partial<StreamingMiddlewareOptions> = {}
): ServerStreamContext {
  const mergedOptions = { ...DEFAULT_MIDDLEWARE_OPTIONS, ...options };
  const requestId = generateNonce().slice(0, 8);
  const nonce = mergedOptions.nonceGenerator();
  const headers = new Map<string, string>();

  // Set default streaming headers
  headers.set(STREAMING_HEADERS.CONTENT_TYPE, 'text/html; charset=utf-8');
  headers.set(STREAMING_HEADERS.TRANSFER_ENCODING, 'chunked');
  headers.set(STREAMING_HEADERS.X_ACCEL_BUFFERING, 'no'); // Disable nginx buffering
  headers.set(STREAMING_HEADERS.X_STREAM_NONCE, nonce);

  // Add custom headers
  for (const [key, value] of Object.entries(mergedOptions.headers)) {
    headers.set(key, value);
  }

  return {
    write: (chunk: string | Uint8Array) => {
      try {
        writer(chunk);
      } catch (error) {
        mergedOptions.onError?.(error as Error);
      }
    },
    flush: () => {
      try {
        flush?.();
      } catch (error) {
        mergedOptions.onError?.(error as Error);
      }
    },
    end: () => {
      // Signal end of stream - implementation depends on framework
    },
    nonce,
    requestId,
    headers,
  };
}

// ============================================================================
// Streaming Response Helpers
// ============================================================================

/**
 * Creates streaming response headers.
 *
 * @param options - Middleware options
 * @returns Headers object for streaming response
 */
export function createStreamingHeaders(
  options: Partial<StreamingMiddlewareOptions> = {}
): Record<string, string> {
  const mergedOptions = { ...DEFAULT_MIDDLEWARE_OPTIONS, ...options };
  const nonce = mergedOptions.nonceGenerator();

  const headers: Record<string, string> = {
    [STREAMING_HEADERS.CONTENT_TYPE]: 'text/html; charset=utf-8',
    [STREAMING_HEADERS.TRANSFER_ENCODING]: 'chunked',
    [STREAMING_HEADERS.X_ACCEL_BUFFERING]: 'no',
    [STREAMING_HEADERS.X_STREAM_NONCE]: nonce,
    ...mergedOptions.headers,
  };

  if (!mergedOptions.compress) {
    headers['Content-Encoding'] = 'identity';
  }

  return headers;
}

/**
 * Creates early hints (103) headers for resource preloading.
 *
 * @param resources - Resources to preload
 * @returns Early hints headers
 *
 * @example
 * ```typescript
 * const hints = createEarlyHints([
 *   { href: '/styles.css', as: 'style' },
 *   { href: '/app.js', as: 'script' },
 * ]);
 * ```
 */
export interface PreloadResource {
  href: string;
  as: 'script' | 'style' | 'font' | 'image' | 'fetch';
  crossOrigin?: 'anonymous' | 'use-credentials';
  type?: string;
}

export function createEarlyHints(resources: PreloadResource[]): string[] {
  return resources.map((resource) => {
    let hint = `<${resource.href}>; rel=preload; as=${resource.as}`;
    if (resource.crossOrigin != null && resource.crossOrigin !== '') {
      hint += `; crossorigin=${resource.crossOrigin}`;
    }
    if (resource.type != null && resource.type !== '') {
      hint += `; type=${resource.type}`;
    }
    return hint;
  });
}

// ============================================================================
// Stream Serialization
// ============================================================================

/**
 * Serializes stream state for client-side hydration.
 *
 * @description
 * Creates a serialized representation of stream state that can be
 * embedded in the HTML for client-side rehydration.
 *
 * @param boundaryId - Boundary identifier
 * @param content - Rendered content
 * @param metadata - Additional metadata
 * @returns Serialized stream state
 *
 * @example
 * ```typescript
 * const serialized = serializeStreamState('hero', '<div>Hero Content</div>');
 * // Embed in HTML for hydration
 * ```
 */
export function serializeStreamState(
  boundaryId: string,
  content: string,
  metadata?: Record<string, unknown>
): SerializedStreamState {
  return {
    boundaryId,
    state: StreamState.Completed,
    content,
    checksum: calculateChecksum(content),
    serverTimestamp: Date.now(),
    metadata,
  };
}

/**
 * Creates a script tag for hydrating stream state on the client.
 *
 * @param states - Array of serialized stream states
 * @param nonce - CSP nonce
 * @returns HTML script tag string
 */
export function createHydrationScript(
  states: SerializedStreamState[],
  nonce?: string
): string {
  const data = JSON.stringify(states);
  const nonceAttr = (nonce != null && nonce !== '') ? ` nonce="${nonce}"` : '';

  return `<script${nonceAttr}>
    window.__STREAM_STATE__ = window.__STREAM_STATE__ || [];
    window.__STREAM_STATE__.push(...${data});
  </script>`;
}

/**
 * Deserializes stream state from hydration data.
 *
 * @param data - Serialized state data
 * @returns Parsed stream state or null if invalid
 */
export function deserializeStreamState(
  data: unknown
): SerializedStreamState | null {
  if (data == null || typeof data !== 'object') return null;

  const state = data as Partial<SerializedStreamState>;

  if (
    typeof state.boundaryId !== 'string' ||
    typeof state.content !== 'string' ||
    typeof state.checksum !== 'string'
  ) {
    return null;
  }

  // Verify checksum
  const computedChecksum = calculateChecksum(state.content);
  if (computedChecksum !== state.checksum) {
    console.warn(
      `[StreamHydration] Checksum mismatch for boundary "${state.boundaryId}"`
    );
    return null;
  }

  return state as SerializedStreamState;
}

// ============================================================================
// Stream Boundary Markers
// ============================================================================

/**
 * Creates HTML markers for stream boundaries.
 *
 * @description
 * These markers are used to identify stream boundary locations in the
 * HTML output, enabling client-side hydration and activation.
 */
export const StreamMarkers = {
  /**
   * Creates a start marker for a stream boundary.
   */
  start: (boundaryId: string, config?: Partial<StreamConfig>): string => {
    const attrs = config
      ? ` data-priority="${config.priority ?? 'normal'}" data-defer="${config.deferMs ?? 0}"`
      : '';
    return `<!--stream:start:${boundaryId}${attrs}-->`;
  },

  /**
   * Creates an end marker for a stream boundary.
   */
  end: (boundaryId: string): string => {
    return `<!--stream:end:${boundaryId}-->`;
  },

  /**
   * Creates a placeholder marker.
   */
  placeholder: (boundaryId: string): string => {
    return `<div data-stream-placeholder="${boundaryId}" style="display:contents"></div>`;
  },

  /**
   * Creates an error marker.
   */
  error: (boundaryId: string, message: string): string => {
    const escaped = message.replace(/--/g, '- -');
    return `<!--stream:error:${boundaryId}:${escaped}-->`;
  },
};

// ============================================================================
// Chunk Creation Utilities
// ============================================================================

/**
 * Creates a stream chunk for server-side streaming.
 *
 * @param data - Chunk data
 * @param boundaryId - Parent boundary ID
 * @param sequence - Chunk sequence number
 * @param isFinal - Whether this is the final chunk
 * @returns Stream chunk
 */
export function createServerChunk(
  data: string,
  boundaryId: string,
  sequence: number,
  isFinal = false
): StreamChunk {
  return {
    id: `${boundaryId}-chunk-${sequence}`,
    sequence,
    data,
    timestamp: Date.now(),
    size: new TextEncoder().encode(data).length,
    isFinal,
    boundaryId,
    checksum: calculateChecksum(data),
  };
}

/**
 * Wraps content in stream boundary markers with activation script.
 *
 * @param boundaryId - Boundary identifier
 * @param content - Content to wrap
 * @param nonce - CSP nonce
 * @param config - Stream configuration
 * @returns Wrapped content string
 */
export function wrapBoundaryContent(
  boundaryId: string,
  content: string,
  nonce?: string,
  config?: Partial<StreamConfig>
): string {
  const nonceAttr = (nonce != null && nonce !== '') ? ` nonce="${nonce}"` : '';
  const priority = config?.priority ?? StreamPriority.Normal;

  return `
${StreamMarkers.start(boundaryId, config)}
<div data-stream-id="${boundaryId}" data-stream-state="completed" data-stream-priority="${priority}">
${content}
</div>
<script${nonceAttr}>
(function() {
  if (window.__STREAM_BOUNDARIES__) {
    window.__STREAM_BOUNDARIES__.complete('${boundaryId}');
  }
})();
</script>
${StreamMarkers.end(boundaryId)}
`.trim();
}

// ============================================================================
// Streaming Pipeline Utilities
// ============================================================================

/**
 * Creates a priority-sorted stream pipeline.
 *
 * @description
 * Organizes stream boundaries by priority for optimal streaming order.
 *
 * @param boundaries - Map of boundary configurations
 * @returns Sorted array of boundary entries
 */
export function createStreamingPipeline(
  boundaries: Map<string, StreamConfig>
): Array<[string, StreamConfig]> {
  const entries = Array.from(boundaries.entries());

  return entries.sort((a, b) => {
    const priorityA = getPriorityValue(a[1].priority);
    const priorityB = getPriorityValue(b[1].priority);
    return priorityA - priorityB;
  });
}

/**
 * Gets numeric priority value for sorting.
 */
function getPriorityValue(priority: StreamPriority | `${StreamPriority}`): number {
  const values: Record<string, number> = {
    critical: 0,
    high: 1,
    normal: 2,
    low: 3,
  };
  return values[priority] ?? 2;
}

/**
 * Creates a flush schedule based on priorities.
 *
 * @description
 * Generates a schedule for when to flush content to the client
 * based on boundary priorities and defer times.
 *
 * @param boundaries - Boundary configurations
 * @returns Flush schedule with timing
 */
export interface FlushScheduleEntry {
  boundaryId: string;
  priority: StreamPriority;
  flushAfterMs: number;
}

export function createFlushSchedule(
  boundaries: Map<string, StreamConfig>
): FlushScheduleEntry[] {
  const schedule: FlushScheduleEntry[] = [];

  for (const [boundaryId, config] of boundaries) {
    schedule.push({
      boundaryId,
      priority: (config.priority as StreamPriority) ?? StreamPriority.Normal,
      flushAfterMs: config.deferMs ?? 0,
    });
  }

  return schedule.sort((a, b) => {
    // Sort by flush time, then by priority
    if (a.flushAfterMs !== b.flushAfterMs) {
      return a.flushAfterMs - b.flushAfterMs;
    }
    return getPriorityValue(a.priority) - getPriorityValue(b.priority);
  });
}

// ============================================================================
// Express-style Middleware Factory
// ============================================================================

/**
 * Request-like interface for middleware.
 */
export interface StreamingRequest {
  url: string;
  method: string;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Response-like interface for middleware.
 */
export interface StreamingResponse {
  setHeader: (name: string, value: string) => void;
  write: (chunk: string | Uint8Array) => boolean;
  end: (chunk?: string | Uint8Array) => void;
  flush?: () => void;
  writableEnded?: boolean;
}

/**
 * Next function type for middleware.
 */
export type NextFunction = (error?: Error) => void;

/**
 * Streaming middleware function type.
 */
export type StreamingMiddleware = (
  req: StreamingRequest,
  res: StreamingResponse,
  next: NextFunction
) => void | Promise<void>;

/**
 * Creates streaming middleware for Express-style servers.
 *
 * @description
 * Factory function that creates middleware for setting up streaming
 * response handling with proper headers and context.
 *
 * @param options - Middleware options
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * const streamingMiddleware = createStreamingMiddleware({
 *   compress: true,
 *   enableEarlyHints: true,
 * });
 *
 * app.use(streamingMiddleware);
 * ```
 */
export function createStreamingMiddleware(
  options: Partial<StreamingMiddlewareOptions> = {}
): StreamingMiddleware {
  const mergedOptions = { ...DEFAULT_MIDDLEWARE_OPTIONS, ...options };

  return (req, res, next) => {
    // Set streaming headers
    const headers = createStreamingHeaders(mergedOptions);
    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value);
    }

    // Create stream context and attach to request
    const context = createServerStreamContext(
      (chunk) => res.write(chunk),
      () => res.flush?.(),
      mergedOptions
    );

    // Attach context to request for use in route handlers
    (req as StreamingRequest & { streamContext: ServerStreamContext }).streamContext = context;

    // Set up timeout
    if (mergedOptions.timeoutMs > 0) {
      setTimeout(() => {
        if (res.writableEnded !== true) {
          context.end();
        }
      }, mergedOptions.timeoutMs);
    }

    next();
  };
}

// ============================================================================
// React SSR Integration Helpers
// ============================================================================

/**
 * Options for React streaming render.
 */
export interface RenderToStreamOptions {
  /** Bootstrap scripts to include */
  bootstrapScripts?: string[];
  /** Bootstrap modules to include */
  bootstrapModules?: string[];
  /** CSP nonce for inline scripts */
  nonce?: string;
  /** Called when shell is ready */
  onShellReady?: () => void;
  /** Called when shell errors */
  onShellError?: (error: Error) => void;
  /** Called when all content is ready */
  onAllReady?: () => void;
  /** Called on any error */
  onError?: (error: Error) => void;
}

/**
 * Creates options for React 18's renderToPipeableStream.
 *
 * @description
 * Generates configuration compatible with React 18's streaming SSR API.
 *
 * @param options - Render options
 * @returns Options for renderToPipeableStream
 *
 * @example
 * ```typescript
 * import { renderToPipeableStream } from 'react-dom/server';
 *
 * const streamOptions = createReactStreamOptions({
 *   bootstrapScripts: ['/app.js'],
 *   nonce: generateNonce(),
 *   onShellReady() {
 *     res.statusCode = 200;
 *     stream.pipe(res);
 *   },
 * });
 *
 * const { pipe } = renderToPipeableStream(<App />, streamOptions);
 * ```
 */
export function createReactStreamOptions(
  options: RenderToStreamOptions = {}
): RenderToStreamOptions {
  return {
    bootstrapScripts: options.bootstrapScripts,
    bootstrapModules: options.bootstrapModules,
    nonce: options.nonce,
    onShellReady: options.onShellReady,
    onShellError: (error) => {
      console.error('[StreamingSSR] Shell error:', error);
      options.onShellError?.(error);
    },
    onAllReady: options.onAllReady,
    onError: (error) => {
      console.error('[StreamingSSR] Error:', error);
      options.onError?.(error);
    },
  };
}

/**
 * Creates the shell HTML for streaming SSR.
 *
 * @description
 * Generates the initial HTML shell that will be sent before
 * streaming content begins.
 *
 * @param options - Shell configuration
 * @returns HTML shell string
 */
export interface ShellOptions {
  /** Document title */
  title?: string;
  /** Language attribute */
  lang?: string;
  /** Meta tags */
  meta?: Array<Record<string, string>>;
  /** Link tags (stylesheets, preloads) */
  links?: Array<Record<string, string>>;
  /** Inline styles */
  styles?: string;
  /** CSP nonce */
  nonce?: string;
  /** Initial state to embed */
  initialState?: Record<string, unknown>;
  /** Root element ID */
  rootId?: string;
}

export function createShellHtml(options: ShellOptions = {}): {
  head: string;
  bodyStart: string;
  bodyEnd: string;
} {
  const {
    title = '',
    lang = 'en',
    meta = [],
    links = [],
    styles = '',
    nonce,
    initialState,
    rootId = 'root',
  } = options;

  const nonceAttr = (nonce != null && nonce !== '') ? ` nonce="${nonce}"` : '';

  // Build meta tags
  const metaTags = meta
    .map((attrs) => {
      const attrStr = Object.entries(attrs)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');
      return `<meta ${attrStr}>`;
    })
    .join('\n    ');

  // Build link tags
  const linkTags = links
    .map((attrs) => {
      const attrStr = Object.entries(attrs)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');
      return `<link ${attrStr}>`;
    })
    .join('\n    ');

  // Build initial state script
  const stateScript = initialState
    ? `<script${nonceAttr}>window.__INITIAL_STATE__=${JSON.stringify(initialState)}</script>`
    : '';

  // Build style tag
  const styleTag = styles ? `<style${nonceAttr}>${styles}</style>` : '';

  return {
    head: `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${metaTags}
    ${title ? `<title>${title}</title>` : ''}
    ${linkTags}
    ${styleTag}
    ${stateScript}
</head>`,
    bodyStart: `<body>
    <div id="${rootId}">`,
    bodyEnd: `</div>
</body>
</html>`,
  };
}

// ============================================================================
// Exports
// ============================================================================

export {
  DEFAULT_MIDDLEWARE_OPTIONS,
  STREAMING_HEADERS,
};
