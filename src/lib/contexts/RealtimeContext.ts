/**
 * @file Realtime Context
 * @description Context for real-time connections (Fast Refresh compliant).
 */

import { createContext } from 'react';

/**
 * WebSocket/SSE connection state
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

/**
 * Realtime context value
 */
export interface RealtimeContextValue {
  connectionState: ConnectionState;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  subscribe: (channel: string, handler: (data: unknown) => void) => () => void;
  send: (channel: string, data: unknown) => void;
  /** Whether real-time updates are enabled via feature flag */
  realtimeEnabled: boolean;
}

/**
 * Default context value
 */
export const defaultRealtimeContext: RealtimeContextValue = {
  connectionState: 'disconnected',
  isConnected: false,
  connect: () => {},
  disconnect: () => {},
  subscribe: () => () => {},
  send: () => {},
  realtimeEnabled: true, // Default to true for backwards compatibility
};

/**
 * Realtime context - extracted for Fast Refresh compliance
 */
export const RealtimeContext = createContext<RealtimeContextValue>(defaultRealtimeContext);

RealtimeContext.displayName = 'RealtimeContext';
