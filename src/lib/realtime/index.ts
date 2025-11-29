/**
 * @file Realtime Module Index
 * @description Central export point for real-time communication functionality.
 *
 * This module provides WebSocket and SSE clients for real-time data streaming.
 * It is distinct from the streaming/ module which handles React 18 SSR HTML streaming.
 */

// WebSocket client
export {
  WebSocketClient,
  createWebSocketClient,
  type WebSocketState,
  type WebSocketClientConfig,
  type MessageHandler,
  type ErrorHandler,
  type StateChangeHandler,
} from './websocket-client';

// SSE client
export {
  SSEClient,
  createSSEClient,
  type SSEState,
  type SSEClientConfig,
  type SSEMessageHandler,
  type SSEErrorHandler,
  type SSEStateChangeHandler,
} from './sse-client';

// Stream to query cache (internal naming preserved for cache update semantics)
export {
  StreamQueryCacheUpdater,
  createStreamCacheUpdater,
  createCacheStrategy,
  type StreamEvent,
  type StreamEventType,
  type CacheUpdateStrategy,
  type StreamCacheConfig,
} from './stream-to-query-cache';

// Realtime provider
export {
  RealtimeProvider,
  useRealtimeContext,
  type RealtimeConnectionType,
  type RealtimeProviderConfig,
  type RealtimeProviderProps,
} from './RealtimeProvider';

export type { RealtimeContextValue } from '../contexts/RealtimeContext';

// Realtime hooks
export {
  useRealtimeStream,
  useMultiRealtimeStream,
  useRealtimeConnection,
  useBufferedRealtimeStream,
  useRealtimePresence,
  type UseRealtimeStreamOptions,
  type UseRealtimeStreamResult,
} from './useRealtimeStream';
