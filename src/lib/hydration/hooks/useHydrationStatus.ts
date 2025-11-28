/**
 * @file useHydrationStatus Hook
 * @description Hook for tracking the hydration status of a specific boundary.
 *
 * This hook provides real-time status tracking for hydration boundaries,
 * including state transitions, timing information, and error details.
 *
 * @module hydration/hooks/useHydrationStatus
 *
 * @example
 * ```tsx
 * function ComponentWithStatus() {
 *   const status = useHydrationStatus('my-boundary-id');
 *
 *   if (status.state === 'pending') {
 *     return <Skeleton />;
 *   }
 *
 *   if (status.state === 'error') {
 *     return <ErrorDisplay error={status.error} />;
 *   }
 *
 *   return <FullyHydratedComponent />;
 * }
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

import { useOptionalHydrationContext } from '../HydrationProvider';
import { getHydrationScheduler } from '../hydration-scheduler';

import type {
  HydrationStatus,
  HydrationState,
  HydrationBoundaryId,
} from '../types';

import { createInitialHydrationStatus, createBoundaryId } from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Extended status information with computed properties.
 */
export interface UseHydrationStatusReturn extends HydrationStatus {
  /**
   * Whether the boundary is fully hydrated and interactive.
   */
  readonly isHydrated: boolean;

  /**
   * Whether the boundary is currently hydrating.
   */
  readonly isHydrating: boolean;

  /**
   * Whether the boundary is pending hydration.
   */
  readonly isPending: boolean;

  /**
   * Whether the boundary encountered an error.
   */
  readonly hasError: boolean;

  /**
   * Whether the boundary was skipped (SSR-only).
   */
  readonly isSkipped: boolean;

  /**
   * Progress percentage (0-100) based on state.
   */
  readonly progress: number;

  /**
   * Human-readable status description.
   */
  readonly description: string;
}

/**
 * Options for the useHydrationStatus hook.
 */
export interface UseHydrationStatusOptions {
  /**
   * Polling interval in milliseconds for status updates.
   * Set to 0 to disable polling (only event-driven updates).
   *
   * @default 100
   */
  readonly pollInterval?: number;

  /**
   * Whether to subscribe to scheduler events for real-time updates.
   *
   * @default true
   */
  readonly subscribeToEvents?: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculates progress percentage based on hydration state.
 */
function calculateProgress(state: HydrationState): number {
  switch (state) {
    case 'pending':
      return 0;
    case 'hydrating':
      return 50;
    case 'hydrated':
    case 'skipped':
      return 100;
    case 'error':
      return 0;
  }
}

/**
 * Gets a human-readable description of the hydration state.
 */
function getStatusDescription(state: HydrationState, error?: Error | null): string {
  switch (state) {
    case 'pending':
      return 'Waiting for hydration';
    case 'hydrating':
      return 'Hydrating component...';
    case 'hydrated':
      return 'Fully interactive';
    case 'skipped':
      return 'Server-rendered only';
    case 'error':
      return error?.message ?? 'Hydration failed';
  }
}

/**
 * Creates an extended status object with computed properties.
 */
function createExtendedStatus(status: HydrationStatus): UseHydrationStatusReturn {
  return {
    ...status,
    isHydrated: status.state === 'hydrated',
    isHydrating: status.state === 'hydrating',
    isPending: status.state === 'pending',
    hasError: status.state === 'error',
    isSkipped: status.state === 'skipped',
    progress: calculateProgress(status.state),
    description: getStatusDescription(status.state, status.error),
  };
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for tracking the hydration status of a specific boundary.
 *
 * Provides real-time status updates with computed convenience properties.
 *
 * @param boundaryId - ID of the boundary to track (string will be converted)
 * @param options - Hook options
 * @returns Extended hydration status with computed properties
 *
 * @example
 * ```tsx
 * function StatusIndicator({ boundaryId }: { boundaryId: string }) {
 *   const {
 *     isHydrated,
 *     isHydrating,
 *     isPending,
 *     hasError,
 *     progress,
 *     description,
 *     duration,
 *   } = useHydrationStatus(boundaryId);
 *
 *   if (hasError) {
 *     return <span className="error">{description}</span>;
 *   }
 *
 *   return (
 *     <div>
 *       <progress value={progress} max={100} />
 *       <span>{description}</span>
 *       {isHydrated && duration && (
 *         <span>Hydrated in {duration.toFixed(0)}ms</span>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useHydrationStatus(
  boundaryId: string | HydrationBoundaryId,
  options: UseHydrationStatusOptions = {}
): UseHydrationStatusReturn {
  const { pollInterval = 100, subscribeToEvents = true } = options;

  // Normalize boundary ID
  const normalizedId = useMemo(
    () =>
      typeof boundaryId === 'string'
        ? createBoundaryId(boundaryId)
        : boundaryId,
    [boundaryId]
  );

  // Get context (optional, as we can fallback to direct scheduler access)
  const context = useOptionalHydrationContext();

  // ==========================================================================
  // State
  // ==========================================================================

  const [status, setStatus] = useState<UseHydrationStatusReturn>(() =>
    createExtendedStatus(createInitialHydrationStatus())
  );

  // ==========================================================================
  // Status Fetcher
  // ==========================================================================

  const fetchStatus = useCallback(() => {
    let newStatus: HydrationStatus | undefined;

    if (context) {
      newStatus = context.getBoundaryStatus(normalizedId);
    } else {
      // Try direct scheduler access
      try {
        const scheduler = getHydrationScheduler();
        newStatus = scheduler.getStatus(normalizedId);
      } catch {
        // Scheduler not available
      }
    }

    if (newStatus) {
      setStatus(createExtendedStatus(newStatus));
    }
  }, [context, normalizedId]);

  // ==========================================================================
  // Event Subscription
  // ==========================================================================

  useEffect(() => {
    if (!subscribeToEvents) {
      return;
    }

    // Try to subscribe to scheduler events
    try {
      const scheduler = getHydrationScheduler();

      const unsubscribeStart = scheduler.on('hydration:start', (event) => {
        if (event.boundaryId === normalizedId) {
          fetchStatus();
        }
      });

      const unsubscribeComplete = scheduler.on('hydration:complete', (event) => {
        if (event.boundaryId === normalizedId) {
          fetchStatus();
        }
      });

      const unsubscribeError = scheduler.on('hydration:error', (event) => {
        if (event.boundaryId === normalizedId) {
          fetchStatus();
        }
      });

      return () => {
        unsubscribeStart();
        unsubscribeComplete();
        unsubscribeError();
      };
    } catch {
      // Scheduler not available, rely on polling
      return;
    }
  }, [normalizedId, subscribeToEvents, fetchStatus]);

  // ==========================================================================
  // Polling
  // ==========================================================================

  useEffect(() => {
    // Initial fetch
    fetchStatus();

    // Setup polling if enabled
    if (pollInterval > 0) {
      const intervalId = setInterval(fetchStatus, pollInterval);
      return () => clearInterval(intervalId);
    }

    return;
  }, [fetchStatus, pollInterval]);

  // ==========================================================================
  // Return
  // ==========================================================================

  return status;
}

/**
 * Hook for checking if a boundary is hydrated.
 *
 * Simplified hook when only hydration completion matters.
 *
 * @param boundaryId - ID of the boundary to check
 * @returns true if the boundary is fully hydrated
 *
 * @example
 * ```tsx
 * function InteractiveButton({ boundaryId }: { boundaryId: string }) {
 *   const isHydrated = useIsHydrated(boundaryId);
 *
 *   return (
 *     <button
 *       disabled={!isHydrated}
 *       onClick={handleClick}
 *     >
 *       {isHydrated ? 'Click Me' : 'Loading...'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useIsHydrated(boundaryId: string | HydrationBoundaryId): boolean {
  const { isHydrated } = useHydrationStatus(boundaryId);
  return isHydrated;
}

/**
 * Hook for waiting until a boundary is hydrated.
 *
 * Returns a promise that resolves when the boundary is hydrated.
 * Useful for imperative code that needs to wait for hydration.
 *
 * @param boundaryId - ID of the boundary to wait for
 * @param timeout - Maximum time to wait in milliseconds (default: 10000)
 * @returns Promise that resolves when hydrated
 *
 * @example
 * ```tsx
 * function ComponentWithEffect({ boundaryId }: { boundaryId: string }) {
 *   const waitForHydration = useWaitForHydration(boundaryId);
 *
 *   useEffect(() => {
 *     async function init() {
 *       await waitForHydration();
 *       // Safe to interact with hydrated component now
 *       performPostHydrationSetup();
 *     }
 *     init();
 *   }, [waitForHydration]);
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useWaitForHydration(
  boundaryId: string | HydrationBoundaryId,
  timeout = 10000
): () => Promise<void> {
  const { isHydrated, hasError } = useHydrationStatus(boundaryId);

  return useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Already hydrated
      if (isHydrated) {
        resolve();
        return;
      }

      // Already errored
      if (hasError) {
        reject(new Error('Hydration failed'));
        return;
      }

      // Setup timeout
      const timeoutId = setTimeout(() => {
        reject(new Error(`Hydration timeout after ${timeout}ms`));
      }, timeout);

      // Poll for completion
      const checkInterval = setInterval(() => {
        try {
          const scheduler = getHydrationScheduler();
          const status = scheduler.getStatus(
            typeof boundaryId === 'string' ? createBoundaryId(boundaryId) : boundaryId
          );

          if (status?.state === 'hydrated') {
            clearTimeout(timeoutId);
            clearInterval(checkInterval);
            resolve();
          } else if (status?.state === 'error') {
            clearTimeout(timeoutId);
            clearInterval(checkInterval);
            reject(status.error ?? new Error('Hydration failed'));
          }
        } catch {
          // Continue polling
        }
      }, 50);
    });
  }, [boundaryId, isHydrated, hasError, timeout]);
}

// ============================================================================
// Exports
// ============================================================================

// Types are already exported inline above
