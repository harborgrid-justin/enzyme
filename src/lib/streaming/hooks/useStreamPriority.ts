/**
 * @file useStreamPriority Hook
 * @description Hook for controlling stream priority dynamically.
 *
 * Enables runtime priority adjustment for stream boundaries,
 * allowing components to escalate or de-escalate their streaming
 * priority based on user interaction or visibility changes.
 *
 * @module streaming/hooks/useStreamPriority
 * @version 1.0.0
 * @author Harbor Framework Team
 *
 * @example
 * ```tsx
 * function HoverableCard({ boundaryId }: { boundaryId: string }) {
 *   const { priority, escalate, deescalate } = useStreamPriority(boundaryId);
 *
 *   return (
 *     <div
 *       onMouseEnter={escalate}
 *       onMouseLeave={deescalate}
 *     >
 *       <p>Priority: {priority}</p>
 *       <StreamBoundary id={boundaryId} priority={priority}>
 *         <CardContent />
 *       </StreamBoundary>
 *     </div>
 *   );
 * }
 * ```
 */

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';

import { useOptionalStreamContext } from '../StreamProvider';

import {
  type UseStreamPriorityResult,
  StreamPriority,
  PRIORITY_VALUES,
} from '../types';

// ============================================================================
// Priority Level Ordering
// ============================================================================

/**
 * Ordered array of priority levels from highest to lowest.
 */
const PRIORITY_ORDER: StreamPriority[] = [
  StreamPriority.Critical,
  StreamPriority.High,
  StreamPriority.Normal,
  StreamPriority.Low,
];

/**
 * Gets the next higher priority level.
 */
function getHigherPriority(current: StreamPriority): StreamPriority {
  const index = PRIORITY_ORDER.indexOf(current);
  const [highestPriority] = PRIORITY_ORDER;
  if (index <= 0) return highestPriority ?? StreamPriority.Critical;
  const nextPriority = PRIORITY_ORDER[index - 1];
  return nextPriority ?? StreamPriority.Critical;
}

/**
 * Gets the next lower priority level.
 */
function getLowerPriority(current: StreamPriority): StreamPriority {
  const index = PRIORITY_ORDER.indexOf(current);
  const lowestPriority = PRIORITY_ORDER[PRIORITY_ORDER.length - 1];
  if (index >= PRIORITY_ORDER.length - 1) return lowestPriority ?? StreamPriority.Low;
  const nextPriority = PRIORITY_ORDER[index + 1];
  return nextPriority ?? StreamPriority.Low;
}

// ============================================================================
// Hook Options
// ============================================================================

/**
 * Options for the useStreamPriority hook.
 */
export interface UseStreamPriorityOptions {
  /**
   * Initial priority level.
   * @default StreamPriority.Normal
   */
  initialPriority?: StreamPriority;

  /**
   * Minimum priority level (highest allowed).
   * @default StreamPriority.Critical
   */
  minPriority?: StreamPriority;

  /**
   * Maximum priority level (lowest allowed).
   * @default StreamPriority.Low
   */
  maxPriority?: StreamPriority;

  /**
   * Callback when priority changes.
   */
  onPriorityChange?: (priority: StreamPriority) => void;

  /**
   * Auto-escalate on user interaction.
   * @default false
   */
  escalateOnInteraction?: boolean;

  /**
   * Auto-escalate when element becomes visible.
   * @default false
   */
  escalateOnVisible?: boolean;

  /**
   * Visibility threshold for auto-escalation.
   * @default 0.5
   */
  visibilityThreshold?: number;

  /**
   * Cooldown period before de-escalation in milliseconds.
   * @default 0
   */
  deescalateCooldown?: number;
}

// ============================================================================
// Default Result
// ============================================================================

const DEFAULT_RESULT: UseStreamPriorityResult = {
  priority: StreamPriority.Normal,
  setPriority: () => {},
  escalate: () => {},
  deescalate: () => {},
};

// ============================================================================
// Main Hook Implementation
// ============================================================================

/**
 * Hook for controlling stream priority.
 *
 * @description
 * Provides an interface for dynamically adjusting stream priority,
 * enabling responsive streaming based on user behavior and visibility.
 *
 * Features:
 * - Manual priority control
 * - Escalation and de-escalation helpers
 * - Optional auto-escalation on interaction
 * - Optional auto-escalation on visibility
 * - Priority bounds enforcement
 * - Cooldown support for de-escalation
 *
 * @param boundaryId - Boundary ID to control
 * @param options - Optional configuration
 * @returns Priority control interface
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { priority, setPriority, escalate, deescalate } = useStreamPriority('content');
 *
 * // With options
 * const { priority, escalate } = useStreamPriority('content', {
 *   initialPriority: StreamPriority.Low,
 *   escalateOnInteraction: true,
 *   deescalateCooldown: 5000,
 * });
 *
 * // Manual control
 * setPriority(StreamPriority.High);
 *
 * // Incremental adjustment
 * escalate();   // Low -> Normal -> High -> Critical
 * deescalate(); // Critical -> High -> Normal -> Low
 * ```
 */
export function useStreamPriority(
  boundaryId: string,
  options: UseStreamPriorityOptions = {}
): UseStreamPriorityResult {
  const {
    initialPriority = StreamPriority.Normal,
    minPriority = StreamPriority.Critical,
    maxPriority = StreamPriority.Low,
    onPriorityChange,
    escalateOnVisible = false,
    visibilityThreshold = 0.5,
    deescalateCooldown = 0,
  } = options;

  const context = useOptionalStreamContext();
  const [priority, setPriorityState] = useState<StreamPriority>(initialPriority);
  const cooldownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  // ==========================================================================
  // Priority Bounds
  // ==========================================================================

  const minPriorityValue = PRIORITY_VALUES[minPriority];
  const maxPriorityValue = PRIORITY_VALUES[maxPriority];

  /**
   * Clamps priority within configured bounds.
   */
  const clampPriority = useCallback(
    (targetPriority: StreamPriority): StreamPriority => {
      const targetValue = PRIORITY_VALUES[targetPriority];
      if (targetValue < minPriorityValue) return minPriority;
      if (targetValue > maxPriorityValue) return maxPriority;
      return targetPriority;
    },
    [minPriority, maxPriority, minPriorityValue, maxPriorityValue]
  );

  // ==========================================================================
  // Priority Control
  // ==========================================================================

  const setPriority = useCallback(
    (newPriority: StreamPriority) => {
      const clampedPriority = clampPriority(newPriority);
      setPriorityState(clampedPriority);
      onPriorityChange?.(clampedPriority);
    },
    [clampPriority, onPriorityChange]
  );

  const escalate = useCallback(() => {
    setPriorityState((current) => {
      const newPriority = clampPriority(getHigherPriority(current));
      if (newPriority !== current) {
        onPriorityChange?.(newPriority);
      }
      return newPriority;
    });

    // Clear any pending de-escalation
    if (cooldownTimeoutRef.current) {
      clearTimeout(cooldownTimeoutRef.current);
      cooldownTimeoutRef.current = null;
    }
  }, [clampPriority, onPriorityChange]);

  const deescalate = useCallback(() => {
    const performDeescalate = (): void => {
      setPriorityState((current) => {
        const newPriority = clampPriority(getLowerPriority(current));
        if (newPriority !== current) {
          onPriorityChange?.(newPriority);
        }
        return newPriority;
      });
    };

    if (deescalateCooldown > 0) {
      // Schedule de-escalation after cooldown
      if (cooldownTimeoutRef.current) {
        clearTimeout(cooldownTimeoutRef.current);
      }
      cooldownTimeoutRef.current = setTimeout(performDeescalate, deescalateCooldown);
    } else {
      performDeescalate();
    }
  }, [clampPriority, onPriorityChange, deescalateCooldown]);

  // ==========================================================================
  // Auto-Escalation on Visibility
  // ==========================================================================

  useEffect(() => {
    if (!escalateOnVisible || typeof IntersectionObserver === 'undefined') {
      return;
    }

    // Find the element by boundary ID
    const element = document.querySelector(`[data-stream-id="${boundaryId}"]`);
    if (!element) return;

    elementRef.current = element as HTMLElement;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= visibilityThreshold) {
            // Escalate when visible
            escalate();
          } else {
            // De-escalate when not visible
            deescalate();
          }
        }
      },
      { threshold: visibilityThreshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [boundaryId, escalateOnVisible, visibilityThreshold, escalate, deescalate]);

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  useEffect(() => {
    return () => {
      if (cooldownTimeoutRef.current) {
        clearTimeout(cooldownTimeoutRef.current);
      }
    };
  }, []);

  // Return default if no context
  if (!context) {
    return DEFAULT_RESULT;
  }

  return {
    priority,
    setPriority,
    escalate,
    deescalate,
  };
}

// ============================================================================
// Extended Priority Hook
// ============================================================================

/**
 * Extended result with additional controls.
 */
export interface UseExtendedStreamPriorityResult extends UseStreamPriorityResult {
  /** Whether at maximum priority (critical) */
  isMaxPriority: boolean;
  /** Whether at minimum priority (low) */
  isMinPriority: boolean;
  /** Set to maximum priority */
  maximize: () => void;
  /** Set to minimum priority */
  minimize: () => void;
  /** Reset to initial priority */
  reset: () => void;
  /** Priority value (0-3, lower is higher priority) */
  priorityValue: number;
  /** Props to spread on element for auto-escalation on hover */
  hoverProps: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
  /** Props to spread on element for auto-escalation on focus */
  focusProps: {
    onFocus: () => void;
    onBlur: () => void;
  };
}

/**
 * Extended stream priority hook with additional controls.
 *
 * @description
 * Provides all the functionality of useStreamPriority plus
 * additional convenience methods and computed values.
 *
 * @example
 * ```tsx
 * function InteractiveCard({ boundaryId }: { boundaryId: string }) {
 *   const {
 *     priority,
 *     isMaxPriority,
 *     maximize,
 *     reset,
 *     hoverProps,
 *     focusProps,
 *   } = useExtendedStreamPriority(boundaryId);
 *
 *   return (
 *     <div {...hoverProps} {...focusProps}>
 *       <p>Priority: {priority}</p>
 *       <button onClick={maximize} disabled={isMaxPriority}>
 *         Maximize Priority
 *       </button>
 *       <button onClick={reset}>Reset</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useExtendedStreamPriority(
  boundaryId: string,
  options: UseStreamPriorityOptions = {}
): UseExtendedStreamPriorityResult {
  const { initialPriority = StreamPriority.Normal } = options;
  const basePriority = useStreamPriority(boundaryId, options);

  const isMaxPriority = basePriority.priority === StreamPriority.Critical;
  const isMinPriority = basePriority.priority === StreamPriority.Low;
  const priorityValue = PRIORITY_VALUES[basePriority.priority];

  const maximize = useCallback(() => {
    basePriority.setPriority(StreamPriority.Critical);
  }, [basePriority]);

  const minimize = useCallback(() => {
    basePriority.setPriority(StreamPriority.Low);
  }, [basePriority]);

  const reset = useCallback(() => {
    basePriority.setPriority(initialPriority);
  }, [basePriority, initialPriority]);

  const hoverProps = useMemo(
    () => ({
      onMouseEnter: basePriority.escalate,
      onMouseLeave: basePriority.deescalate,
    }),
    [basePriority.escalate, basePriority.deescalate]
  );

  const focusProps = useMemo(
    () => ({
      onFocus: basePriority.escalate,
      onBlur: basePriority.deescalate,
    }),
    [basePriority.escalate, basePriority.deescalate]
  );

  return {
    ...basePriority,
    isMaxPriority,
    isMinPriority,
    priorityValue,
    maximize,
    minimize,
    reset,
    hoverProps,
    focusProps,
  };
}

// ============================================================================
// Priority Preset Hooks
// ============================================================================

/**
 * Hook for critical priority streams.
 *
 * @description
 * Pre-configured for critical priority with no ability
 * to de-escalate below high priority.
 */
export function useCriticalPriority(
  boundaryId: string,
  options: Omit<UseStreamPriorityOptions, 'initialPriority' | 'maxPriority'> = {}
): UseStreamPriorityResult {
  return useStreamPriority(boundaryId, {
    ...options,
    initialPriority: StreamPriority.Critical,
    maxPriority: StreamPriority.High,
  });
}

/**
 * Hook for deferred priority streams.
 *
 * @description
 * Pre-configured for low priority with ability
 * to escalate on interaction.
 */
export function useDeferredPriority(
  boundaryId: string,
  options: Omit<UseStreamPriorityOptions, 'initialPriority'> = {}
): UseStreamPriorityResult {
  return useStreamPriority(boundaryId, {
    ...options,
  initialPriority: StreamPriority.Low,
  escalateOnInteraction: true,
});
}