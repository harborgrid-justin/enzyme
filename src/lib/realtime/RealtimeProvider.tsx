/* @refresh reset */
/**
 * @file Realtime Provider
 * @description Manages WebSocket/SSE connection and distributes events by channel.
 *
 * This provider handles real-time communication (WebSocket/SSE), distinct from
 * the streaming/ module which handles React 18 SSR HTML streaming.
 */

import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { RealtimeContext, type RealtimeContextValue, type ConnectionState } from '../contexts/RealtimeContext';
import { WebSocketClient, createWebSocketClient, type WebSocketState } from './websocketClient';
import { SSEClient, createSSEClient, type SSEState } from './sseClient';
import { StreamQueryCacheUpdater, type StreamEvent, type CacheUpdateStrategy } from './streamToQueryCache';
import { queryClient } from '../queries/queryClient';
import { useFeatureFlag } from '../flags/useFeatureFlag';
import { flagKeys } from '../flags/flagKeys';

/**
 * Realtime connection type
 */
export type RealtimeConnectionType = 'websocket' | 'sse';

/**
 * Realtime provider configuration
 */
export interface RealtimeProviderConfig {
  type: RealtimeConnectionType;
  url?: string;
  autoConnect?: boolean;
  cacheStrategies?: CacheUpdateStrategy[];
}

/**
 * Realtime provider props
 */
export interface RealtimeProviderProps {
  children: ReactNode;
  config?: RealtimeProviderConfig;
}

/**
 * Default configuration
 */
const defaultConfig: RealtimeProviderConfig = {
  type: 'websocket',
  autoConnect: true,
  cacheStrategies: [],
};

/**
 * Realtime provider component
 *
 * Manages WebSocket or SSE connections for real-time data streaming.
 * Respects the 'real-time-updates' feature flag - when disabled, no connections are established.
 *
 * @example
 * ```tsx
 * <RealtimeProvider config={{ type: 'websocket', url: '/ws' }}>
 *   <App />
 * </RealtimeProvider>
 * ```
 */
export function RealtimeProvider({
  children,
  config = defaultConfig,
}: RealtimeProviderProps): React.ReactElement {
  // Check if real-time updates are enabled via feature flag
  const realtimeEnabled = useFeatureFlag(flagKeys.REAL_TIME_UPDATES);

  const mergedConfig = { ...defaultConfig, ...config };

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');

  const clientRef = useRef<WebSocketClient | SSEClient | null>(null);
  const cacheUpdaterRef = useRef<StreamQueryCacheUpdater | null>(null);
  const channelHandlersRef = useRef<Map<string, Set<(data: unknown) => void>>>(new Map());

  /**
   * Map WebSocketState/SSEState to ConnectionState
   */
  const mapToConnectionState = (state: WebSocketState | SSEState): ConnectionState => {
    // Both WebSocketState and SSEState align with ConnectionState except for 'error'
    // WebSocket has 'error', but ConnectionState also has 'error', so direct mapping works
    return state as ConnectionState;
  };

  /**
   * Initialize the realtime client
   * Only establishes connection if real-time updates feature flag is enabled
   */
  useEffect(() => {
    // Skip initialization if real-time updates are disabled via feature flag
    if (!realtimeEnabled) {
      console.info('[RealtimeProvider] Real-time updates disabled via feature flag');
      return;
    }

    // Create appropriate client
    if (mergedConfig.type === 'websocket') {
      clientRef.current = createWebSocketClient(mergedConfig.url ?? '/ws');
    } else {
      clientRef.current = createSSEClient(mergedConfig.url ?? '/events');
    }

    // Setup cache updater
    if (mergedConfig.cacheStrategies !== undefined && mergedConfig.cacheStrategies.length > 0) {
      cacheUpdaterRef.current = new StreamQueryCacheUpdater({
        queryClient,
        strategies: mergedConfig.cacheStrategies,
      });
    }

    // Setup state change handler
    const client = clientRef.current;
    const unsubState = client.onStateChange((state) => setConnectionState(mapToConnectionState(state)));

    // Setup message handler
    const unsubMessage = client.onMessage((data: unknown) => {
      // Process cache updates
      if (cacheUpdaterRef.current && isStreamEvent(data)) {
        cacheUpdaterRef.current.processEvent(data);
      }

      // Route to channel handlers
      if (typeof data === 'object' && data !== null && 'channel' in data) {
        const channelData = data as { channel: string; data: unknown };
        const handlers = channelHandlersRef.current.get(channelData.channel);
        handlers?.forEach((handler) => handler(channelData.data));
      }
    });

    // Auto-connect if enabled
    if (mergedConfig.autoConnect === true) {
      client.connect();
    }

    return () => {
      unsubState();
      unsubMessage();
      client.disconnect();
    };
   
  }, [realtimeEnabled, mergedConfig.type, mergedConfig.url, mergedConfig.autoConnect, mergedConfig.cacheStrategies]);

  /**
   * Connect to realtime server
   * Only connects if real-time updates feature flag is enabled
   */
  const connect = useCallback(() => {
    if (!realtimeEnabled) {
      console.warn('[RealtimeProvider] Cannot connect - real-time updates disabled via feature flag');
      return;
    }
    clientRef.current?.connect();
  }, [realtimeEnabled]);

  /**
   * Disconnect from realtime server
   */
  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
  }, []);

  /**
   * Subscribe to a channel
   */
  const subscribe = useCallback(
    (channel: string, handler: (data: unknown) => void) => {
      // Track handler locally
      if (!channelHandlersRef.current.has(channel)) {
        channelHandlersRef.current.set(channel, new Set());
      }
      const handlers = channelHandlersRef.current.get(channel);
      if (handlers) {
        handlers.add(handler);
      }

      // Subscribe via client if WebSocket
      let clientUnsub: (() => void) | undefined;
      if (clientRef.current instanceof WebSocketClient) {
        clientUnsub = clientRef.current.subscribe(channel, handler);
      } else if (clientRef.current instanceof SSEClient) {
        clientUnsub = clientRef.current.on(channel, handler);
      }

      // Return unsubscribe function
      return () => {
        const handlers = channelHandlersRef.current.get(channel);
        if (handlers) {
          handlers.delete(handler);
          if (handlers.size === 0) {
            channelHandlersRef.current.delete(channel);
          }
        }
        clientUnsub?.();
      };
    },
    []
  );

  /**
   * Send data to a channel (WebSocket only)
   */
  const send = useCallback((channel: string, data: unknown) => {
    if (clientRef.current instanceof WebSocketClient) {
      clientRef.current.sendToChannel(channel, data);
    } else {
      console.warn('[RealtimeProvider] SSE does not support sending data');
    }
  }, []);

  // PERFORMANCE: Memoize context value to prevent unnecessary re-renders
  const value: RealtimeContextValue = useMemo(() => ({
    connectionState,
    isConnected: connectionState === 'connected',
    connect,
    disconnect,
    subscribe,
    send,
    realtimeEnabled,
  }), [connectionState, connect, disconnect, subscribe, send, realtimeEnabled]);

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

/**
 * Type guard for stream events
 */
function isStreamEvent(data: unknown): data is StreamEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    'entity' in data &&
    'timestamp' in data
  );
}

/**
 * Hook to access realtime context
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isConnected, subscribe, send } = useRealtimeContext();
 *   // ...
 * }
 * ```
 */
// eslint-disable-next-line react-refresh/only-export-components -- Hook is closely related to provider component
export function useRealtimeContext(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context.isConnected && context.connectionState === 'disconnected') {
    console.warn('[useRealtimeContext] Must be used within RealtimeProvider');
  }
  return context;
}
