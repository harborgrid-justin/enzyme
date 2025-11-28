/**
 * @file useStream Hook
 * @description Core hook for accessing streaming context and controlling streams.
 *
 * The useStream hook provides a comprehensive interface for interacting with
 * stream boundaries, including state monitoring, lifecycle control, and
 * progress tracking.
 *
 * @module streaming/hooks/useStream
 * @version 1.0.0
 * @author Harbor Framework Team
 *
 * @example
 * ```tsx
 * function StreamingContent() {
 *   const { state, isStreaming, start, pause, resume, abort } = useStream('content');
 *
 *   return (
 *     <div>
 *       <p>State: {state}</p>
 *       <button onClick={start} disabled={isStreaming}>Start</button>
 *       <button onClick={pause} disabled={!isStreaming}>Pause</button>
 *       <button onClick={resume}>Resume</button>
 *       <button onClick={() => abort('User cancelled')}>Cancel</button>
 *     </div>
 *   );
 * }
 * ```
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  useLayoutEffect,
} from 'react';

import { useStreamContext, useOptionalStreamContext } from '../StreamProvider';

import {
  type UseStreamResult,
  type StreamError,
  type StreamConfig,
  StreamState,
  StreamEventType,
} from '../types';

// ============================================================================
// Hook Options
// ============================================================================

/**
 * Options for the useStream hook.
 */
export interface UseStreamOptions {
  /**
   * Boundary ID to monitor/control.
   * If not provided, creates an unregistered stream interface.
   */
  boundaryId?: string;

  /**
   * Stream configuration for auto-registration.
   * If provided with boundaryId, the boundary will be automatically registered.
   */
  config?: StreamConfig;

  /**
   * Auto-start streaming when the hook mounts.
   * @default false
   */
  autoStart?: boolean;

  /**
   * Callback when stream state changes.
   */
  onStateChange?: (state: StreamState) => void;

  /**
   * Callback when stream completes.
   */
  onComplete?: () => void;

  /**
   * Callback when stream errors.
   */
  onError?: (error: StreamError) => void;
}

// ============================================================================
// Default Result for No Context
// ============================================================================

const DEFAULT_RESULT: UseStreamResult = {
  state: StreamState.Idle,
  isStreaming: false,
  isComplete: false,
  hasError: false,
  error: null,
  progress: null,
  start: () => {},
  pause: () => {},
  resume: () => {},
  abort: () => {},
  reset: () => {},
};

// ============================================================================
// Main Hook Implementation
// ============================================================================

/**
 * Core hook for stream control and monitoring.
 *
 * @description
 * Provides a complete interface for interacting with a stream boundary,
 * including state observation, lifecycle control, and progress tracking.
 *
 * Features:
 * - Real-time state monitoring
 * - Lifecycle control (start, pause, resume, abort)
 * - Progress tracking (when determinable)
 * - Error handling
 * - Automatic cleanup on unmount
 *
 * @param boundaryIdOrOptions - Boundary ID string or options object
 * @returns Stream control interface
 *
 * @example
 * ```tsx
 * // Simple usage with just boundary ID
 * const stream = useStream('my-boundary');
 *
 * // Usage with options
 * const stream = useStream({
 *   boundaryId: 'my-boundary',
 *   config: { priority: StreamPriority.High },
 *   autoStart: true,
 *   onComplete: () => console.log('Done!'),
 * });
 *
 * // Control stream lifecycle
 * stream.start();
 * stream.pause();
 * stream.resume();
 * stream.abort('User cancelled');
 * stream.reset();
 * ```
 */
export function useStream(
  boundaryIdOrOptions?: string | UseStreamOptions
): UseStreamResult {
  // Normalize arguments
  const options: UseStreamOptions = useMemo(() => {
    if (typeof boundaryIdOrOptions === 'string') {
      return { boundaryId: boundaryIdOrOptions };
    }
    return boundaryIdOrOptions ?? {};
  }, [boundaryIdOrOptions]);

  const {
    boundaryId,
    config,
    autoStart = false,
    onStateChange,
    onComplete,
    onError,
  } = options;

  // Get streaming context (optional to support usage outside provider)
  const context = useOptionalStreamContext();

  // State
  const [state, setState] = useState<StreamState>(StreamState.Idle);
  const [error, setError] = useState<StreamError | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  // Refs
  const isRegistered = useRef(false);
  const mountedRef = useRef(true);
  const bytesTotal = useRef<number | null>(null);
  const bytesReceived = useRef(0);

  // ==========================================================================
  // Registration & Cleanup
  // ==========================================================================

  useEffect(() => {
    mountedRef.current = true;

    // Skip if no context or no boundary ID
    if (context === null || context === undefined || boundaryId === undefined || boundaryId === null || boundaryId === '') {
      return;
    }

    // Register if config provided
    if (config && !isRegistered.current) {
      try {
        context.registerBoundary(boundaryId, {
          ...config,
          onStreamStart: () => {
            config.onStreamStart?.();
          },
          onStreamComplete: () => {
            config.onStreamComplete?.();
            onComplete?.();
          },
          onStreamError: (err) => {
            config.onStreamError?.(err);
            onError?.(err);
          },
        });
        isRegistered.current = true;
      } catch {
        // Boundary might already exist
        isRegistered.current = true;
      }
    }

    // Subscribe to events
    const unsubscribe = context.subscribe((event) => {
      if (event.boundaryId !== boundaryId || !mountedRef.current) return;

      switch (event.type) {
        case StreamEventType.StateChange: {
          const payload = event.payload as { from: StreamState; to: StreamState };
          setState(payload.to);
          onStateChange?.(payload.to);
          break;
        }
        case StreamEventType.Error: {
          const streamError = event.payload as StreamError;
          setError(streamError);
          onError?.(streamError);
          break;
        }
        case StreamEventType.Complete: {
          setState(StreamState.Completed);
          setProgress(1);
          onComplete?.();
          break;
        }
        case StreamEventType.Chunk: {
          // Update progress if we can determine it
          const chunk = event.payload as { size: number };
          bytesReceived.current += chunk.size;
          if (bytesTotal.current !== null && bytesTotal.current > 0) {
            setProgress(bytesReceived.current / bytesTotal.current);
          }
          break;
        }
      }
    });

    // Auto-start if configured
    if (autoStart) {
      context.startStream(boundaryId);
    }

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [boundaryId, config, context, autoStart, onStateChange, onComplete, onError]);

  // ==========================================================================
  // Actions
  // ==========================================================================

  const start = useCallback(() => {
    if (context === null || context === undefined || boundaryId === undefined || boundaryId === null || boundaryId === '') return;
    context.startStream(boundaryId);
  }, [context, boundaryId]);

  const pause = useCallback(() => {
    if (context === null || context === undefined || boundaryId === undefined || boundaryId === null || boundaryId === '') return;
    context.pauseStream(boundaryId);
  }, [context, boundaryId]);

  const resume = useCallback(() => {
    if (context === null || context === undefined || boundaryId === undefined || boundaryId === null || boundaryId === '') return;
    context.resumeStream(boundaryId);
  }, [context, boundaryId]);

  const abort = useCallback((reason?: string) => {
    if (context === null || context === undefined || boundaryId === undefined || boundaryId === null || boundaryId === '') return;
    context.abortStream(boundaryId, reason);
  }, [context, boundaryId]);

  const reset = useCallback(() => {
    setState(StreamState.Idle);
    setError(null);
    setProgress(null);
    bytesReceived.current = 0;
  }, []);

  // ==========================================================================
  // Computed Values
  // ==========================================================================

  const isStreaming = state === StreamState.Streaming;
  const isComplete = state === StreamState.Completed;
  const hasError = state === StreamState.Error;

  // Return memoized result to prevent unnecessary re-renders
  // This is critical for performance - returning a new object every render
  // would cause all consumers to re-render even when values haven't changed.
  return useMemo<UseStreamResult>(() => {
    // Return default result if no context
    if (!context) {
      return DEFAULT_RESULT;
    }

    return {
      state,
      isStreaming,
      isComplete,
      hasError,
      error,
      progress,
      start,
      pause,
      resume,
      abort,
      reset,
    };
  }, [
    context,
    state,
    isStreaming,
    isComplete,
    hasError,
    error,
    progress,
    start,
    pause,
    resume,
    abort,
    reset,
  ]);
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * Hook for monitoring multiple streams.
 *
 * @description
 * Provides aggregated state for multiple stream boundaries,
 * useful for tracking overall page streaming progress.
 *
 * @param boundaryIds - Array of boundary IDs to monitor
 * @returns Aggregated stream information
 *
 * @example
 * ```tsx
 * function PageLoader() {
 *   const { allComplete, progress, states } = useMultipleStreams([
 *     'header',
 *     'main',
 *     'sidebar',
 *     'footer',
 *   ]);
 *
 *   if (!allComplete) {
 *     return <ProgressBar value={progress} />;
 *   }
 *
 *   return <Page />;
 * }
 * ```
 */
export interface UseMultipleStreamsResult {
  /** States for each boundary */
  states: Map<string, StreamState>;
  /** Whether all streams are complete */
  allComplete: boolean;
  /** Whether any stream has an error */
  hasErrors: boolean;
  /** Aggregate progress (0-1) */
  progress: number;
  /** Number of active streams */
  activeCount: number;
  /** Number of completed streams */
  completedCount: number;
  /** Start all streams */
  startAll: () => void;
  /** Abort all streams */
  abortAll: (reason?: string) => void;
}

export function useMultipleStreams(boundaryIds: string[]): UseMultipleStreamsResult {
  const context = useOptionalStreamContext();
  const [states, setStates] = useState<Map<string, StreamState>>(new Map());

  useLayoutEffect(() => {
    if (!context) return;

    // Initialize states
    const initialStates = new Map<string, StreamState>();
    for (const id of boundaryIds) {
      const state = context.getBoundaryState(id);
      initialStates.set(id, state ?? StreamState.Idle);
    }
    setStates(initialStates);

    // Subscribe to updates
    const unsubscribe = context.subscribe((event) => {
      if (!boundaryIds.includes(event.boundaryId)) return;

      if (event.type === StreamEventType.StateChange) {
        const payload = event.payload as { to: StreamState };
        setStates((prev) => {
          const next = new Map(prev);
          next.set(event.boundaryId, payload.to);
          return next;
        });
      }
    });

    return unsubscribe;
  }, [context, boundaryIds]);

  const allComplete = useMemo(() => {
    if (states.size === 0) return false;
    return Array.from(states.values()).every(
      (s) => s === StreamState.Completed
    );
  }, [states]);

  const hasErrors = useMemo(() => {
    return Array.from(states.values()).some(
      (s) => s === StreamState.Error
    );
  }, [states]);

  const activeCount = useMemo(() => {
    return Array.from(states.values()).filter(
      (s) => s === StreamState.Streaming || s === StreamState.Paused
    ).length;
  }, [states]);

  const completedCount = useMemo(() => {
    return Array.from(states.values()).filter(
      (s) => s === StreamState.Completed
    ).length;
  }, [states]);

  const progress = useMemo(() => {
    if (boundaryIds.length === 0) return 0;
    return completedCount / boundaryIds.length;
  }, [boundaryIds.length, completedCount]);

  const startAll = useCallback(() => {
    if (!context) return;
    for (const id of boundaryIds) {
      context.startStream(id);
    }
  }, [context, boundaryIds]);

  const abortAll = useCallback((reason?: string) => {
    if (!context) return;
    for (const id of boundaryIds) {
      context.abortStream(id, reason);
    }
  }, [context, boundaryIds]);

  return {
    states,
    allComplete,
    hasErrors,
    progress,
    activeCount,
    completedCount,
    startAll,
    abortAll,
  };
}

/**
 * Hook for awaiting stream completion.
 *
 * @description
 * Returns a promise that resolves when the stream completes
 * or rejects when the stream errors.
 *
 * @param boundaryId - Boundary ID to await
 * @returns Promise that resolves/rejects with stream result
 *
 * @example
 * ```tsx
 * function DataProcessor() {
 *   const awaitStream = useAwaitStream('data-stream');
 *
 *   const handleProcess = async () => {
 *     try {
 *       await awaitStream();
 *       console.log('Stream completed, processing data...');
 *     } catch (error) {
 *       console.error('Stream failed:', error);
 *     }
 *   };
 *
 *   return <button onClick={handleProcess}>Process Data</button>;
 * }
 * ```
 */
export function useAwaitStream(boundaryId: string): () => Promise<void> {
  const context = useStreamContext();

  return useCallback(async () => {
    return new Promise<void>((resolve, reject) => {
      // Check if already complete
      const currentState = context.getBoundaryState(boundaryId);
      if (currentState === StreamState.Completed) {
        resolve();
        return;
      }
      if (currentState === StreamState.Error) {
        reject(new Error('Stream already in error state'));
        return;
      }

      const unsubscribe = context.subscribe((event) => {
        if (event.boundaryId !== boundaryId) return;

        if (event.type === StreamEventType.Complete) {
          unsubscribe();
          resolve();
        } else if (event.type === StreamEventType.Error) {
          unsubscribe();
          reject(event.payload instanceof Error ? event.payload : new Error(String(event.payload)));
        } else if (event.type === StreamEventType.Abort) {
          unsubscribe();
          reject(new Error('Stream aborted'));
        }
      });
  });
}, [context, boundaryId]);
}