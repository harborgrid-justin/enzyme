/**
 * @file useStreamStatus Hook
 * @description Hook for monitoring detailed stream status and progress.
 *
 * Provides comprehensive status information about a stream boundary
 * including state, timing, transfer statistics, and human-readable
 * status messages.
 *
 * @module streaming/hooks/useStreamStatus
 * @version 1.0.0
 * @author Harbor Framework Team
 *
 * @example
 * ```tsx
 * function StreamingIndicator({ boundaryId }: { boundaryId: string }) {
 *   const status = useStreamStatus(boundaryId);
 *
 *   return (
 *     <div>
 *       <p>Status: {status.statusMessage}</p>
 *       <p>Elapsed: {status.elapsedTime}ms</p>
 *       <p>Bytes: {status.bytesTransferred}</p>
 *       {status.estimatedTimeRemaining && (
 *         <p>ETA: {status.estimatedTimeRemaining}ms</p>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */

import {
  useState,
  useEffect,
  useRef,
  useMemo,
} from 'react';

import { useOptionalStreamContext } from '../StreamProvider';

import {
  type UseStreamStatusResult,
  StreamState,
  StreamEventType,
} from '../types';

// ============================================================================
// Status Messages
// ============================================================================

/**
 * Human-readable status messages for each stream state.
 */
const STATUS_MESSAGES: Record<StreamState, string> = {
  [StreamState.Idle]: 'Waiting to start',
  [StreamState.Pending]: 'Preparing to stream',
  [StreamState.Streaming]: 'Streaming content',
  [StreamState.Paused]: 'Stream paused',
  [StreamState.Completed]: 'Stream complete',
  [StreamState.Error]: 'Stream error',
  [StreamState.Aborted]: 'Stream cancelled',
};

// ============================================================================
// Default Result
// ============================================================================

const DEFAULT_RESULT: UseStreamStatusResult = {
  state: StreamState.Idle,
  statusMessage: STATUS_MESSAGES[StreamState.Idle],
  isRegistered: false,
  elapsedTime: null,
  estimatedTimeRemaining: null,
  bytesTransferred: 0,
  chunksReceived: 0,
};

// ============================================================================
// Hook Options
// ============================================================================

/**
 * Options for the useStreamStatus hook.
 */
export interface UseStreamStatusOptions {
  /**
   * Update interval for elapsed time in milliseconds.
   * @default 100
   */
  updateInterval?: number;

  /**
   * Whether to track elapsed time.
   * @default true
   */
  trackElapsedTime?: boolean;

  /**
   * Custom status message generator.
   */
  formatStatusMessage?: (state: StreamState, details: StatusDetails) => string;
}

/**
 * Details provided to custom status message formatter.
 */
export interface StatusDetails {
  elapsedTime: number | null;
  bytesTransferred: number;
  chunksReceived: number;
  estimatedTimeRemaining: number | null;
}

// ============================================================================
// Main Hook Implementation
// ============================================================================

/**
 * Hook for monitoring detailed stream status.
 *
 * @description
 * Provides comprehensive information about a stream's status,
 * including timing, transfer statistics, and human-readable messages.
 *
 * Features:
 * - Real-time state monitoring
 * - Elapsed time tracking
 * - Estimated time remaining calculation
 * - Transfer statistics (bytes, chunks)
 * - Customizable status messages
 *
 * @param boundaryId - Boundary ID to monitor
 * @param options - Optional configuration
 * @returns Detailed stream status
 *
 * @example
 * ```tsx
 * // Basic usage
 * const status = useStreamStatus('main-content');
 *
 * // With options
 * const status = useStreamStatus('main-content', {
 *   updateInterval: 50,
 *   formatStatusMessage: (state, details) => {
 *     if (state === StreamState.Streaming) {
 *       return `Loading: ${details.bytesTransferred} bytes`;
 *     }
 *     return STATUS_MESSAGES[state];
 *   },
 * });
 * ```
 */
export function useStreamStatus(
  boundaryId: string,
  options: UseStreamStatusOptions = {}
): UseStreamStatusResult {
  const {
    updateInterval = 100,
    trackElapsedTime = true,
    formatStatusMessage,
  } = options;

  const context = useOptionalStreamContext();

  // State
  const [state, setState] = useState<StreamState>(StreamState.Idle);
  const [isRegistered, setIsRegistered] = useState(false);
  const [bytesTransferred, setBytesTransferred] = useState(0);
  const [chunksReceived, setChunksReceived] = useState(0);
  const [elapsedTime, setElapsedTime] = useState<number | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);

  // Refs for timing
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousBytesRef = useRef(0);
  const previousTimeRef = useRef<number | null>(null);
  const bytesPerSecondRef = useRef<number | null>(null);
  const totalBytesRef = useRef<number | null>(null);

  // ==========================================================================
  // Subscription & State Updates
  // ==========================================================================

  useEffect(() => {
    if (!context) return;

    // Check if boundary exists
    const currentState = context.getBoundaryState(boundaryId);
    setIsRegistered(currentState !== null);
    if (currentState !== null) {
      setState(currentState);
    }

    // Subscribe to events
    const unsubscribe = context.subscribe((event) => {
      if (event.boundaryId !== boundaryId) return;

      switch (event.type) {
        case StreamEventType.StateChange: {
          const payload = event.payload as { from: StreamState; to: StreamState };
          setState(payload.to);

          // Track timing on state changes
          if (payload.to === StreamState.Streaming && !startTimeRef.current) {
            startTimeRef.current = performance.now();
          } else if (
            payload.to === StreamState.Completed ||
            payload.to === StreamState.Error ||
            payload.to === StreamState.Aborted
          ) {
            // Stop timing
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
          break;
        }

        case StreamEventType.Start: {
          setIsRegistered(true);
          startTimeRef.current = performance.now();
          previousTimeRef.current = performance.now();
          break;
        }

        case StreamEventType.Chunk: {
          const chunk = event.payload as { size: number };
          setChunksReceived((prev) => prev + 1);
          setBytesTransferred((prev) => {
            const newTotal = prev + chunk.size;

            // Calculate bytes per second for ETA
            const now = performance.now();
            if (previousTimeRef.current) {
              const timeDelta = now - previousTimeRef.current;
              if (timeDelta > 100) {
                // Only update rate every 100ms
                const bytesDelta = newTotal - previousBytesRef.current;
                bytesPerSecondRef.current = (bytesDelta / timeDelta) * 1000;
                previousBytesRef.current = newTotal;
                previousTimeRef.current = now;
              }
            }

            return newTotal;
          });
          break;
        }

        case StreamEventType.Complete: {
          // Final elapsed time
          if (startTimeRef.current) {
            setElapsedTime(performance.now() - startTimeRef.current);
          }
          setEstimatedTimeRemaining(0);
          break;
        }
      }
    });

    return () => {
      unsubscribe();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [context, boundaryId]);

  // ==========================================================================
  // Elapsed Time Tracking
  // ==========================================================================

  useEffect(() => {
    if (!trackElapsedTime) return;
    if (state !== StreamState.Streaming) return;

    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = performance.now() - startTimeRef.current;
        setElapsedTime(elapsed);

        // Calculate ETA if we have byte rate and total
        if (
          bytesPerSecondRef.current !== null &&
          bytesPerSecondRef.current > 0 &&
          totalBytesRef.current !== null
        ) {
          const remainingBytes = totalBytesRef.current - bytesTransferred;
          const eta = (remainingBytes / bytesPerSecondRef.current) * 1000;
          setEstimatedTimeRemaining(Math.max(0, eta));
        }
      }
    }, updateInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [trackElapsedTime, state, updateInterval, bytesTransferred]);

  // ==========================================================================
  // Status Message
  // ==========================================================================

  const statusMessage = useMemo(() => {
    const details: StatusDetails = {
      elapsedTime,
      bytesTransferred,
      chunksReceived,
      estimatedTimeRemaining,
    };

    if (formatStatusMessage) {
      return formatStatusMessage(state, details);
    }

    return STATUS_MESSAGES[state];
  }, [state, elapsedTime, bytesTransferred, chunksReceived, estimatedTimeRemaining, formatStatusMessage]);

  // ==========================================================================
  // Return Result
  // ==========================================================================

  if (!context) {
    return DEFAULT_RESULT;
  }

  return {
    state,
    statusMessage,
    isRegistered,
    elapsedTime,
    estimatedTimeRemaining,
    bytesTransferred,
    chunksReceived,
  };
}

// ============================================================================
// Extended Status Hook
// ============================================================================

/**
 * Extended result with additional details.
 */
export interface UseExtendedStreamStatusResult extends UseStreamStatusResult {
  /** Transfer rate in bytes per second */
  bytesPerSecond: number | null;
  /** Human-readable transfer rate */
  transferRate: string;
  /** Human-readable bytes transferred */
  formattedBytes: string;
  /** Human-readable elapsed time */
  formattedElapsed: string;
  /** Human-readable ETA */
  formattedETA: string;
  /** Whether stream is active (streaming or paused) */
  isActive: boolean;
  /** Whether stream has ended (completed, error, or aborted) */
  hasEnded: boolean;
}

/**
 * Formats bytes to human-readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Formats milliseconds to human-readable duration.
 */
function formatDuration(ms: number | null): string {
  if (ms === null) return '--';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Extended stream status hook with formatted values.
 *
 * @description
 * Provides all the information from useStreamStatus plus
 * human-readable formatted values for display.
 *
 * @example
 * ```tsx
 * function StreamDetails({ boundaryId }: { boundaryId: string }) {
 *   const status = useExtendedStreamStatus(boundaryId);
 *
 *   return (
 *     <div>
 *       <p>{status.statusMessage}</p>
 *       <p>Transferred: {status.formattedBytes}</p>
 *       <p>Rate: {status.transferRate}</p>
 *       <p>Elapsed: {status.formattedElapsed}</p>
 *       <p>ETA: {status.formattedETA}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useExtendedStreamStatus(
  boundaryId: string,
  options: UseStreamStatusOptions = {}
): UseExtendedStreamStatusResult {
  const baseStatus = useStreamStatus(boundaryId, options);

  // Track bytes per second locally
  const [bytesPerSecond, setBytesPerSecond] = useState<number | null>(null);
  const prevBytesRef = useRef(0);
  const prevTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (baseStatus.state !== StreamState.Streaming) return;

    const now = performance.now();
    if (prevTimeRef.current !== null) {
      const timeDelta = now - prevTimeRef.current;
      if (timeDelta > 100) {
        const bytesDelta = baseStatus.bytesTransferred - prevBytesRef.current;
        setBytesPerSecond((bytesDelta / timeDelta) * 1000);
        prevBytesRef.current = baseStatus.bytesTransferred;
        prevTimeRef.current = now;
      }
    } else {
      prevTimeRef.current = now;
      prevBytesRef.current = baseStatus.bytesTransferred;
    }
  }, [baseStatus.bytesTransferred, baseStatus.state]);

  const transferRate = useMemo(() => {
    if (bytesPerSecond === null) return '--';
    return `${formatBytes(bytesPerSecond)}/s`;
  }, [bytesPerSecond]);

  const formattedBytes = useMemo(
    () => formatBytes(baseStatus.bytesTransferred),
    [baseStatus.bytesTransferred]
  );

  const formattedElapsed = useMemo(
    () => formatDuration(baseStatus.elapsedTime),
    [baseStatus.elapsedTime]
  );

  const formattedETA = useMemo(
    () => formatDuration(baseStatus.estimatedTimeRemaining),
    [baseStatus.estimatedTimeRemaining]
  );

  const isActive = baseStatus.state === StreamState.Streaming ||
                   baseStatus.state === StreamState.Paused;

  const hasEnded = baseStatus.state === StreamState.Completed ||
                   baseStatus.state === StreamState.Error ||
                   baseStatus.state === StreamState.Aborted;

  return {
    ...baseStatus,
    bytesPerSecond,
    transferRate,
    formattedBytes,
    formattedElapsed,
    formattedETA,
    isActive,
    hasEnded,
  };
}

// ============================================================================
// Export
// ============================================================================

export default useStreamStatus;
