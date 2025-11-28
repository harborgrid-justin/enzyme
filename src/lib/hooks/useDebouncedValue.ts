/**
 * @file useDebouncedValue Hook
 * @description Hook for debouncing values with configurable options
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Debounce options
 */
export interface DebounceOptions {
  /** Debounce delay in milliseconds */
  delay?: number;
  
  /** Leading edge trigger */
  leading?: boolean;
  
  /** Trailing edge trigger */
  trailing?: boolean;
  
  /** Maximum wait time before forced update */
  maxWait?: number;
}

/**
 * Hook for debouncing a value
 */
export function useDebouncedValue<T>(
  value: T,
  delay: number = 300,
  options: Omit<DebounceOptions, 'delay'> = {}
): T {
  const { leading = false, trailing = true, maxWait } = options;
  
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const lastValue = useRef<T>(value);
  const lastCallTime = useRef<number | null>(null);
  const lastInvokeTime = useRef<number>(0);
  const timerId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerId = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerId.current) clearTimeout(timerId.current);
      if (maxTimerId.current) clearTimeout(maxTimerId.current);
    };
  }, []);
  
  useEffect(() => {
    const now = Date.now();
    const isInvoking = shouldInvoke(now);
    
    lastValue.current = value;
    lastCallTime.current = now;
    
    if (isInvoking) {
      if (timerId.current === null && leading) {
        // Leading edge
        lastInvokeTime.current = now;
        setDebouncedValue(value);
        startMaxWaitTimer();
      }
    }
    
    // Reset debounce timer
    if (timerId.current) clearTimeout(timerId.current);
    
    if (trailing) {
      timerId.current = setTimeout(() => {
        if (lastCallTime.current !== null) {
          lastInvokeTime.current = Date.now();
          setDebouncedValue(lastValue.current);
          timerId.current = null;
          if (maxTimerId.current) {
            clearTimeout(maxTimerId.current);
            maxTimerId.current = null;
          }
        }
      }, delay);
    }
    
    function shouldInvoke(time: number): boolean {
      const timeSinceLastCall = lastCallTime.current === null 
        ? delay 
        : time - lastCallTime.current;
      const timeSinceLastInvoke = time - lastInvokeTime.current;
      
      return (
        lastCallTime.current === null ||
        timeSinceLastCall >= delay ||
        timeSinceLastCall < 0 ||
        (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
      );
    }
    
    function startMaxWaitTimer() {
      if (maxWait !== undefined && maxTimerId.current === null) {
        maxTimerId.current = setTimeout(() => {
          if (lastCallTime.current !== null) {
            lastInvokeTime.current = Date.now();
            setDebouncedValue(lastValue.current);
            maxTimerId.current = null;
          }
        }, maxWait);
      }
    }
    
     
  }, [value, delay, leading, trailing, maxWait]);
  
  return debouncedValue;
}

/**
 * Hook for debouncing a callback function
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 300,
  options: Omit<DebounceOptions, 'delay'> = {}
): {
  callback: (...args: Parameters<T>) => void;
  cancel: () => void;
  flush: () => void;
  pending: () => boolean;
} {
  const { leading = false, trailing = true, maxWait } = options;
  
  const callbackRef = useRef(callback);
  const timerId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastArgs = useRef<Parameters<T> | null>(null);
  const lastInvokeTime = useRef<number>(0);
  const leadingInvoked = useRef(false);
  
  // Update callback ref
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerId.current) clearTimeout(timerId.current);
      if (maxTimerId.current) clearTimeout(maxTimerId.current);
    };
  }, []);
  
  const invokeCallback = useCallback(() => {
    if (lastArgs.current !== null) {
      callbackRef.current(...lastArgs.current);
      lastArgs.current = null;
      lastInvokeTime.current = Date.now();
    }
  }, []);
  
  const cancel = useCallback(() => {
    if (timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }
    if (maxTimerId.current) {
      clearTimeout(maxTimerId.current);
      maxTimerId.current = null;
    }
    lastArgs.current = null;
    leadingInvoked.current = false;
  }, []);
  
  const flush = useCallback(() => {
    if (timerId.current || maxTimerId.current) {
      invokeCallback();
      cancel();
    }
  }, [invokeCallback, cancel]);
  
  const pending = useCallback(() => {
    return timerId.current !== null || maxTimerId.current !== null;
  }, []);
  
  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      lastArgs.current = args;
      
      // Cancel existing timers
      if (timerId.current) clearTimeout(timerId.current);
      
      // Leading edge
      if (leading && !leadingInvoked.current) {
        leadingInvoked.current = true;
        invokeCallback();
        
        // Start max wait timer
        if (maxWait !== undefined && maxTimerId.current === null) {
          maxTimerId.current = setTimeout(() => {
            invokeCallback();
            maxTimerId.current = null;
          }, maxWait);
        }
        return;
      }
      
      // Trailing edge timer
      if (trailing) {
        timerId.current = setTimeout(() => {
          invokeCallback();
          timerId.current = null;
          leadingInvoked.current = false;
          if (maxTimerId.current) {
            clearTimeout(maxTimerId.current);
            maxTimerId.current = null;
          }
        }, delay);
      }
      
      // Max wait timer (if not already set)
      if (maxWait !== undefined && maxTimerId.current === null) {
        maxTimerId.current = setTimeout(() => {
          invokeCallback();
          maxTimerId.current = null;
          if (timerId.current) {
            clearTimeout(timerId.current);
            timerId.current = null;
          }
        }, maxWait);
      }
    },
    [delay, leading, trailing, maxWait, invokeCallback]
  );
  
  return useMemo(
    () => ({
      callback: debouncedCallback,
      cancel,
      flush,
      pending,
    }),
    [debouncedCallback, cancel, flush, pending]
  );
}

/**
 * Hook for throttling a value
 */
export function useThrottledValue<T>(value: T, limit: number = 300): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRun = useRef<number>(Date.now());
  
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastRun = now - lastRun.current;
    
    if (timeSinceLastRun >= limit) {
      lastRun.current = now;
      setThrottledValue(value);
      return undefined;
    } else {
      const timeoutId = setTimeout(() => {
        lastRun.current = Date.now();
        setThrottledValue(value);
      }, limit - timeSinceLastRun);
      
      return () => clearTimeout(timeoutId);
    }
  }, [value, limit]);
  
  return throttledValue;
}
