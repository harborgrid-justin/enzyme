/**
 * @file Stream Context
 * @description Context for streaming functionality (Fast Refresh compliant).
 */

import { createContext } from 'react';
import type { StreamError, StreamMetrics } from '../streaming/types';

/**
 * Stream state
 */
export type StreamState = 'idle' | 'streaming' | 'paused' | 'completed' | 'error';

/**
 * Stream priority
 */
export type StreamPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Stream context value
 */
export interface StreamContextValue {
  startStream: (streamId: string, priority?: StreamPriority) => void;
  pauseStream: (streamId: string) => void;
  resumeStream: (streamId: string) => void;
  cancelStream: (streamId: string) => void;
  getStreamState: (streamId: string) => StreamState | undefined;
  getMetrics: () => StreamMetrics;
  isStreaming: boolean;
  activeStreams: Set<string>;
  onError?: (error: StreamError) => void;
}

/**
 * Stream context - extracted for Fast Refresh compliance
 */
export const StreamContext = createContext<StreamContextValue | null>(null);

StreamContext.displayName = 'StreamContext';
