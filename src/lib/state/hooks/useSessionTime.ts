/**
 * @file Session Time Hooks
 * @description React hooks for time-based session calculations.
 *
 * These hooks replace the deprecated selectors that used Date.now() inside
 * createSelector combiners. Using Date.now() in selectors breaks memoization
 * because the combiner returns a new value on every call.
 *
 * These hooks properly handle time-based calculations with:
 * - Configurable update intervals
 * - Proper cleanup on unmount
 * - Stable references for callback dependencies
 *
 * @module state/hooks/useSessionTime
 * @version 1.0.0
 *
 * @example
 * ```tsx
 * function SessionTimer() {
 *   const duration = useSessionDuration();
 *   const timeUntilExpiry = useTimeUntilExpiry();
 *   const isExpired = useIsSessionExpired();
 *
 *   if (isExpired) {
 *     return <SessionExpiredModal />;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Session duration: {formatDuration(duration)}</p>
 *       <p>Time until expiry: {formatDuration(timeUntilExpiry)}</p>
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '../store';
import {
  selectSessionStartedAt,
  selectSessionExpiresAt,
  selectLastActivity,
  selectActivityTimeoutMs,
  selectIsSessionActive,
} from '../selectors';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for session time hooks.
 */
export interface SessionTimeOptions {
  /**
   * Update interval in milliseconds.
   * Lower values provide more accurate time displays but use more resources.
   * @default 1000 (1 second)
   */
  readonly updateInterval?: number;

  /**
   * Whether to enable automatic updates.
   * Set to false if you only need the initial value.
   * @default true
   */
  readonly enableUpdates?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_UPDATE_INTERVAL = 1000; // 1 second

// ============================================================================
// useSessionDuration
// ============================================================================

/**
 * Hook to get the current session duration.
 *
 * Unlike the deprecated selectSessionDuration selector, this hook properly
 * handles time calculations using useState and useEffect with an interval.
 *
 * @param options - Hook options
 * @returns Session duration in milliseconds, or null if no session
 *
 * @example
 * ```tsx
 * function SessionInfo() {
 *   const duration = useSessionDuration();
 *
 *   if (duration === null) {
 *     return <p>No active session</p>;
 *   }
 *
 *   const minutes = Math.floor(duration / 60000);
 *   return <p>Session active for {minutes} minutes</p>;
 * }
 * ```
 */
export function useSessionDuration(options: SessionTimeOptions = {}): number | null {
  const { updateInterval = DEFAULT_UPDATE_INTERVAL, enableUpdates = true } = options;

  const sessionStartedAt = useStore(selectSessionStartedAt);
  const isSessionActive = useStore(selectIsSessionActive);

  const [duration, setDuration] = useState<number | null>(() => {
    if (sessionStartedAt === null || !isSessionActive) return null;
    return Date.now() - sessionStartedAt;
  });

  useEffect(() => {
    // If no session, return null
    if (sessionStartedAt === null || !isSessionActive) {
      // Use setTimeout to make setState async and avoid cascading renders
      const timeoutId = setTimeout(() => {
        setDuration(null);
      }, 0);
      return () => {
        clearTimeout(timeoutId);
      };
    }

    // Calculate initial duration asynchronously
    const initialTimeoutId = setTimeout(() => {
      setDuration(Date.now() - sessionStartedAt);
    }, 0);

    // If updates are disabled, don't set up interval
    if (!enableUpdates) {
      return () => {
        clearTimeout(initialTimeoutId);
      };
    }

    // Set up interval for updates
    const intervalId = setInterval(() => {
      setDuration(Date.now() - sessionStartedAt);
    }, updateInterval);

    return () => {
      clearTimeout(initialTimeoutId);
      clearInterval(intervalId);
    };
  }, [sessionStartedAt, isSessionActive, updateInterval, enableUpdates]);

  return duration;
}

// ============================================================================
// useTimeUntilExpiry
// ============================================================================

/**
 * Hook to get the time until session expiry.
 *
 * Unlike the deprecated selectTimeUntilExpiry selector, this hook properly
 * handles time calculations using useState and useEffect with an interval.
 *
 * @param options - Hook options
 * @returns Time until expiry in milliseconds, or null if no expiry set
 *
 * @example
 * ```tsx
 * function ExpiryWarning() {
 *   const timeUntilExpiry = useTimeUntilExpiry();
 *
 *   if (timeUntilExpiry === null) {
 *     return null;
 *   }
 *
 *   if (timeUntilExpiry < 60000) {
 *     return <Alert>Session expires in less than a minute!</Alert>;
 *   }
 *
 *   return null;
 * }
 * ```
 */
export function useTimeUntilExpiry(options: SessionTimeOptions = {}): number | null {
  const { updateInterval = DEFAULT_UPDATE_INTERVAL, enableUpdates = true } = options;

  const sessionExpiresAt = useStore(selectSessionExpiresAt);

  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number | null>(() => {
    if (sessionExpiresAt === null) return null;
    return Math.max(0, sessionExpiresAt - Date.now());
  });

  useEffect(() => {
    // If no expiry set, return null
    if (sessionExpiresAt === null) {
      const timeoutId = setTimeout(() => {
        setTimeUntilExpiry(null);
      }, 0);
      return () => {
        clearTimeout(timeoutId);
      };
    }

    // Calculate initial time until expiry asynchronously
    const initialTimeoutId = setTimeout(() => {
      setTimeUntilExpiry(Math.max(0, sessionExpiresAt - Date.now()));
    }, 0);

    // If updates are disabled, don't set up interval
    if (!enableUpdates) {
      return () => {
        clearTimeout(initialTimeoutId);
      };
    }

    // Set up interval for updates
    const intervalId = setInterval(() => {
      const remaining = Math.max(0, sessionExpiresAt - Date.now());
      setTimeUntilExpiry(remaining);

      // Clear interval if expired (no need to keep updating)
      if (remaining === 0) {
        clearInterval(intervalId);
      }
    }, updateInterval);

    return () => {
      clearTimeout(initialTimeoutId);
      clearInterval(intervalId);
    };
  }, [sessionExpiresAt, updateInterval, enableUpdates]);

  return timeUntilExpiry;
}

// ============================================================================
// useIsSessionExpired
// ============================================================================

/**
 * Hook to check if the session is expired.
 *
 * Unlike the deprecated selectIsSessionExpired selector, this hook properly
 * handles time calculations using useState and useEffect with an interval.
 *
 * Checks both:
 * - Hard expiry time (sessionExpiresAt)
 * - Inactivity timeout (lastActivity + activityTimeoutMs)
 *
 * @param options - Hook options
 * @returns true if session is expired
 *
 * @example
 * ```tsx
 * function SessionGuard({ children }) {
 *   const isExpired = useIsSessionExpired();
 *
 *   if (isExpired) {
 *     return <Navigate to="/login" replace />;
 *   }
 *
 *   return children;
 * }
 * ```
 */
export function useIsSessionExpired(options: SessionTimeOptions = {}): boolean {
  const { updateInterval = DEFAULT_UPDATE_INTERVAL, enableUpdates = true } = options;

  const sessionExpiresAt = useStore(selectSessionExpiresAt);
  const lastActivity = useStore(selectLastActivity);
  const activityTimeoutMs = useStore(selectActivityTimeoutMs);

  const checkExpiry = useCallback((): boolean => {
    const now = Date.now();

    // Check hard expiry time
    if (sessionExpiresAt !== null && now > sessionExpiresAt) {
      return true;
    }

    // Check inactivity timeout
    if (lastActivity !== null && now - lastActivity > activityTimeoutMs) {
      return true;
    }

    return false;
  }, [sessionExpiresAt, lastActivity, activityTimeoutMs]);

  const [isExpired, setIsExpired] = useState<boolean>(checkExpiry);

  useEffect(() => {
    // Calculate initial expired state asynchronously
    const initialTimeoutId = setTimeout(() => {
      setIsExpired(checkExpiry());
    }, 0);

    // If updates are disabled, don't set up interval
    if (!enableUpdates) {
      return () => {
        clearTimeout(initialTimeoutId);
      };
    }

    // Set up interval for updates
    const intervalId = setInterval(() => {
      const expired = checkExpiry();
      setIsExpired(expired);

      // Clear interval if expired (no need to keep checking)
      if (expired) {
        clearInterval(intervalId);
      }
    }, updateInterval);

    return () => {
      clearTimeout(initialTimeoutId);
      clearInterval(intervalId);
    };
  }, [checkExpiry, updateInterval, enableUpdates]);

  return isExpired;
}

// ============================================================================
// useSessionTimeInfo (Combined Hook)
// ============================================================================

/**
 * Return type for useSessionTimeInfo hook.
 */
export interface SessionTimeInfo {
  /** Duration in milliseconds since session started */
  readonly duration: number | null;
  /** Time until expiry in milliseconds */
  readonly timeUntilExpiry: number | null;
  /** Whether the session is expired */
  readonly isExpired: boolean;
  /** Formatted duration string (e.g., "5m 30s") */
  readonly formattedDuration: string | null;
  /** Formatted time until expiry string (e.g., "2m 15s") */
  readonly formattedTimeUntilExpiry: string | null;
}

/**
 * Combined hook for all session time information.
 *
 * Use this when you need multiple time-based session values to avoid
 * multiple intervals running independently.
 *
 * @param options - Hook options
 * @returns Combined session time information
 *
 * @example
 * ```tsx
 * function SessionStatus() {
 *   const {
 *     formattedDuration,
 *     formattedTimeUntilExpiry,
 *     isExpired,
 *   } = useSessionTimeInfo();
 *
 *   if (isExpired) {
 *     return <p>Session expired</p>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Active: {formattedDuration}</p>
 *       <p>Expires in: {formattedTimeUntilExpiry}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSessionTimeInfo(options: SessionTimeOptions = {}): SessionTimeInfo {
  const { updateInterval = DEFAULT_UPDATE_INTERVAL, enableUpdates = true } = options;

  const sessionStartedAt = useStore(selectSessionStartedAt);
  const sessionExpiresAt = useStore(selectSessionExpiresAt);
  const lastActivity = useStore(selectLastActivity);
  const activityTimeoutMs = useStore(selectActivityTimeoutMs);
  const isSessionActive = useStore(selectIsSessionActive);

  const calculateState = useCallback(() => {
    const now = Date.now();

    // Duration
    const duration =
      sessionStartedAt !== null && isSessionActive ? now - sessionStartedAt : null;

    // Time until expiry
    const timeUntilExpiry =
      sessionExpiresAt !== null ? Math.max(0, sessionExpiresAt - now) : null;

    // Is expired
    let isExpired = false;
    if (sessionExpiresAt !== null && now > sessionExpiresAt) {
      isExpired = true;
    }
    if (lastActivity !== null && now - lastActivity > activityTimeoutMs) {
      isExpired = true;
    }

    return { duration, timeUntilExpiry, isExpired };
  }, [
    sessionStartedAt,
    sessionExpiresAt,
    lastActivity,
    activityTimeoutMs,
    isSessionActive,
  ]);

  const [state, setState] = useState(calculateState);

  useEffect(() => {
    const initialTimeoutId = setTimeout(() => {
      setState(calculateState());
    }, 0);

    if (!enableUpdates) {
      return () => {
        clearTimeout(initialTimeoutId);
      };
    }

    const intervalId = setInterval(() => {
      const newState = calculateState();
      setState(newState);

      // Stop updating if session is expired
      if (newState.isExpired) {
        clearInterval(intervalId);
      }
    }, updateInterval);

    return () => {
      clearTimeout(initialTimeoutId);
      clearInterval(intervalId);
    };
  }, [calculateState, updateInterval, enableUpdates]);

  // Format duration helper
  const formatDuration = useCallback((ms: number | null): string | null => {
    if (ms === null) return null;

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }, []);

  return useMemo<SessionTimeInfo>(
    () => ({
      duration: state.duration,
      timeUntilExpiry: state.timeUntilExpiry,
      isExpired: state.isExpired,
      formattedDuration: formatDuration(state.duration),
      formattedTimeUntilExpiry: formatDuration(state.timeUntilExpiry),
    }),
    [state.duration, state.timeUntilExpiry, state.isExpired, formatDuration]
  );
}
