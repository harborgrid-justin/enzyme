/**
 * @file useBuffer Hook
 * @description Generic buffering/batching hook for accumulating items and flushing based on size or time
 * 
 * This hook is useful for scenarios like:
 * - Batching analytics events before sending
 * - Accumulating performance metrics
 * - Buffering real-time updates before rendering
 * - Debouncing multiple rapid updates into batches
 * 
 * @example
 * ```tsx
 * function AnalyticsTracker() {
 *   const { add, flush } = useBuffer({
 *     maxSize: 10,
 *     flushInterval: 5000,
 *     onFlush: (events) => sendToAnalytics(events)
 *   });
 * 
 *   const trackEvent = (event) => {
 *     add(event); // Automatically flushes when buffer reaches 10 or after 5s
 *   };
 * 
 *   return <button onClick={() => trackEvent({ type: 'click' })}>Click Me</button>;
 * }
 * ```
 */

import { useRef, useCallback, useEffect } from 'react';
import { useLatestRef } from './useLatestRef';

/**
 * Buffer configuration options
 */
export interface BufferOptions<T> {
  /** Maximum buffer size before auto-flush */
  maxSize?: number;
  
  /** Time interval for auto-flush (ms) */
  flushInterval?: number;
  
  /** Callback when buffer is flushed */
  onFlush?: (items: T[]) => void | Promise<void>;
  
  /** Whether to flush on component unmount */
  flushOnUnmount?: boolean;
  
  /** Custom flush condition */
  shouldFlush?: (buffer: T[]) => boolean;
}

/**
 * Buffer hook return type
 */
export interface UseBufferResult<T> {
  /** Add item to buffer */
  add: (item: T) => void;
  
  /** Add multiple items to buffer */
  addMany: (items: T[]) => void;
  
  /** Manually flush buffer */
  flush: () => void;
  
  /** Clear buffer without flushing */
  clear: () => void;
  
  /** Get current buffer size */
  size: () => number;
  
  /** Get current buffer contents (read-only) */
  peek: () => readonly T[];
}

/**
 * Hook for buffering items with automatic flushing
 * 
 * @param options - Buffer configuration
 * @returns Buffer control interface
 */
export function useBuffer<T>(options: BufferOptions<T> = {}): UseBufferResult<T> {
  const {
    maxSize = 10,
    flushInterval = 5000,
    onFlush,
    flushOnUnmount = true,
    shouldFlush,
  } = options;

  const bufferRef = useRef<T[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const onFlushRef = useLatestRef(onFlush);
  const shouldFlushRef = useLatestRef(shouldFlush);

  // Flush buffer and call callback
  const flush = useCallback(() => {
    if (bufferRef.current.length === 0) return;

    const items = [...bufferRef.current];
    bufferRef.current = [];

    // Clear timer if exists
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }

    // Call flush callback
    onFlushRef.current?.(items);
  }, [onFlushRef]);

  // Start flush timer
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (flushInterval > 0) {
      timerRef.current = setTimeout(flush, flushInterval);
    }
  }, [flush, flushInterval]);

  // Check if buffer should be flushed
  const checkFlush = useCallback(() => {
    const buffer = bufferRef.current;

    // Check custom condition
    if (shouldFlushRef.current?.(buffer)) {
      flush();
      return;
    }

    // Check size threshold
    if (maxSize > 0 && buffer.length >= maxSize) {
      flush();
    }
  }, [flush, maxSize, shouldFlushRef]);

  // Add single item
  const add = useCallback((item: T) => {
    bufferRef.current.push(item);
    
    // Start timer on first item
    if (bufferRef.current.length === 1) {
      startTimer();
    }

    checkFlush();
  }, [checkFlush, startTimer]);

  // Add multiple items
  const addMany = useCallback((items: T[]) => {
    if (items.length === 0) return;

    const wasEmpty = bufferRef.current.length === 0;
    bufferRef.current.push(...items);

    if (wasEmpty) {
      startTimer();
    }

    checkFlush();
  }, [checkFlush, startTimer]);

  // Clear buffer without flushing
  const clear = useCallback(() => {
    bufferRef.current = [];
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  // Get buffer size
  const size = useCallback(() => bufferRef.current.length, []);

  // Peek at buffer contents
  const peek = useCallback(() => bufferRef.current as readonly T[], []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (flushOnUnmount && bufferRef.current.length > 0) {
        onFlushRef.current?.(bufferRef.current);
      }
    };
  }, [flushOnUnmount, onFlushRef]);

  return {
    add,
    addMany,
    flush,
    clear,
    size,
    peek,
  };
}

/**
 * Hook for buffering with time-based windows
 * 
 * Flushes buffer at regular intervals regardless of size. Useful for
 * aggregating time-series data or periodic batch updates.
 * 
 * @example
 * ```tsx
 * const { add } = useTimeWindowBuffer({
 *   windowSize: 1000, // 1 second windows
 *   onFlush: (items) => console.log(`${items.length} items in window`)
 * });
 * ```
 */
export function useTimeWindowBuffer<T>(
  options: Omit<BufferOptions<T>, 'maxSize' | 'shouldFlush'> & {
    windowSize: number;
  }
): UseBufferResult<T> {
  return useBuffer({
    ...options,
    maxSize: Infinity,
    flushInterval: options.windowSize,
  });
}

/**
 * Hook for buffering with size-based batches only
 * 
 * Flushes only when buffer reaches max size (no time-based flushing).
 * Useful for operations that must happen in specific batch sizes.
 * 
 * @example
 * ```tsx
 * const { add } = useBatchBuffer({
 *   batchSize: 100,
 *   onFlush: (batch) => bulkInsert(batch)
 * });
 * ```
 */
export function useBatchBuffer<T>(
  options: Omit<BufferOptions<T>, 'flushInterval' | 'shouldFlush'> & {
    batchSize: number;
  }
): UseBufferResult<T> {
  return useBuffer({
    ...options,
    maxSize: options.batchSize,
    flushInterval: 0,
  });
}
