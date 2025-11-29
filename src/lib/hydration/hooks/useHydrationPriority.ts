/**
 * @file useHydrationPriority Hook
 * @description Hook for dynamically controlling hydration priority of boundaries.
 *
 * This hook enables runtime adjustment of hydration priorities based on
 * user behavior, viewport changes, or application state.
 *
 * @module hydration/hooks/useHydrationPriority
 *
 * @example
 * ```tsx
 * function SmartComponent({ boundaryId }: { boundaryId: string }) {
 *   const { priority, setPriority, boost, reduce } = useHydrationPriority(boundaryId);
 *
 *   // Boost priority on hover
 *   const handleMouseEnter = () => boost();
 *
 *   // Reduce when scrolled away
 *   useEffect(() => {
 *     const observer = new IntersectionObserver(([entry]) => {
 *       if (!entry.isIntersecting) {
 *         reduce();
 *       } else {
 *         setPriority('normal');
 *       }
 *     });
 *
 *     observer.observe(ref.current);
 *     return () => observer.disconnect();
 *   }, [reduce, setPriority]);
 *
 *   return (
 *     <div ref={ref} onMouseEnter={handleMouseEnter}>
 *       Current priority: {priority}
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback, useMemo, type RefObject } from 'react';

import { useOptionalHydrationContext } from '../HydrationProvider';
import { getHydrationScheduler } from '../hydration-scheduler';

import type { HydrationPriority, HydrationBoundaryId } from '../types';

import { createBoundaryId } from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Priority level as a numeric value (0 = highest, 4 = lowest).
 */
export type PriorityLevel = 0 | 1 | 2 | 3 | 4;

/**
 * Return type for the useHydrationPriority hook.
 */
export interface UseHydrationPriorityReturn {
  /**
   * Current priority level as a string.
   */
  readonly priority: HydrationPriority;

  /**
   * Current priority as a numeric value (0 = highest, 4 = lowest).
   */
  readonly priorityLevel: PriorityLevel;

  /**
   * Sets the priority to a specific level.
   *
   * @param priority - New priority level
   */
  readonly setPriority: (priority: HydrationPriority) => void;

  /**
   * Increases priority by one level (towards critical).
   * No-op if already at critical priority.
   */
  readonly boost: () => void;

  /**
   * Decreases priority by one level (towards idle).
   * No-op if already at idle priority.
   */
  readonly reduce: () => void;

  /**
   * Sets priority to critical (highest).
   */
  readonly makeCritical: () => void;

  /**
   * Sets priority to idle (lowest).
   */
  readonly makeIdle: () => void;

  /**
   * Resets priority to the original/default level.
   */
  readonly reset: () => void;

  /**
   * The original priority before any changes.
   */
  readonly originalPriority: HydrationPriority;
}

/**
 * Options for the useHydrationPriority hook.
 */
export interface UseHydrationPriorityOptions {
  /**
   * Initial priority level if boundary is not yet registered.
   *
   * @default 'normal'
   */
  readonly defaultPriority?: HydrationPriority;

  /**
   * Whether to persist priority changes across renders.
   *
   * @default true
   */
  readonly persist?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Priority levels ordered from highest to lowest.
 */
const PRIORITY_ORDER: readonly HydrationPriority[] = [
  'critical',
  'high',
  'normal',
  'low',
  'idle',
] as const;

/**
 * Maps priority strings to numeric levels.
 */
const PRIORITY_TO_LEVEL: Record<HydrationPriority, PriorityLevel> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
  idle: 4,
};

/**
 * Maps numeric levels to priority strings.
 */
const LEVEL_TO_PRIORITY: Record<PriorityLevel, HydrationPriority> = {
  0: 'critical',
  1: 'high',
  2: 'normal',
  3: 'low',
  4: 'idle',
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clamps a priority level to valid bounds.
 */
function clampLevel(level: number): PriorityLevel {
  return Math.max(0, Math.min(4, Math.round(level))) as PriorityLevel;
}

/**
 * Gets the next higher priority (towards critical).
 */
function getHigherPriority(current: HydrationPriority): HydrationPriority {
  const currentLevel = PRIORITY_TO_LEVEL[current];
  const newLevel = clampLevel(currentLevel - 1);
  return LEVEL_TO_PRIORITY[newLevel];
}

/**
 * Gets the next lower priority (towards idle).
 */
function getLowerPriority(current: HydrationPriority): HydrationPriority {
  const currentLevel = PRIORITY_TO_LEVEL[current];
  const newLevel = clampLevel(currentLevel + 1);
  return LEVEL_TO_PRIORITY[newLevel];
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for dynamically controlling hydration priority.
 *
 * Enables runtime adjustment of hydration priorities based on
 * user behavior or application state.
 *
 * @param boundaryId - ID of the boundary to control
 * @param options - Hook options
 * @returns Priority control interface
 *
 * @example
 * ```tsx
 * // Basic priority control
 * function PriorityControls({ boundaryId }: { boundaryId: string }) {
 *   const { priority, boost, reduce, makeCritical, makeIdle } = useHydrationPriority(boundaryId);
 *
 *   return (
 *     <div>
 *       <span>Priority: {priority}</span>
 *       <button onClick={boost}>Boost</button>
 *       <button onClick={reduce}>Reduce</button>
 *       <button onClick={makeCritical}>Critical</button>
 *       <button onClick={makeIdle}>Idle</button>
 *     </div>
 *   );
 * }
 *
 * // Automatic priority based on visibility
 * function VisibilityAwarePriority({ boundaryId }: { boundaryId: string }) {
 *   const containerRef = useRef<HTMLDivElement>(null);
 *   const { setPriority } = useHydrationPriority(boundaryId);
 *
 *   useEffect(() => {
 *     const observer = new IntersectionObserver(
 *       ([entry]) => {
 *         if (entry.isIntersecting) {
 *           setPriority(entry.intersectionRatio > 0.5 ? 'high' : 'normal');
 *         } else {
 *           setPriority('low');
 *         }
 *       },
 *       { threshold: [0, 0.5, 1] }
 *     );
 *
 *     if (containerRef.current) {
 *       observer.observe(containerRef.current);
 *     }
 *
 *     return () => observer.disconnect();
 *   }, [setPriority]);
 *
 *   return <div ref={containerRef}>...</div>;
 * }
 * ```
 */
export function useHydrationPriority(
  boundaryId: string | HydrationBoundaryId,
  options: UseHydrationPriorityOptions = {}
): UseHydrationPriorityReturn {
  const { defaultPriority = 'normal' } = options;

  // Normalize boundary ID
  const normalizedId = useMemo(
    () =>
      typeof boundaryId === 'string'
        ? createBoundaryId(boundaryId)
        : boundaryId,
    [boundaryId]
  );

  // Get context (optional)
  const context = useOptionalHydrationContext();

  // ==========================================================================
  // State
  // ==========================================================================

  const [currentPriority, setCurrentPriority] = useState<HydrationPriority>(defaultPriority);
  const [originalPriority] = useState<HydrationPriority>(defaultPriority);

  // ==========================================================================
  // Sync with Scheduler
  // ==========================================================================

  useEffect(() => {
    // Try to get current priority from scheduler
    try {
      const scheduler = getHydrationScheduler();
      const status = scheduler.getStatus(normalizedId);

      if (status) {
        // We don't have direct access to task priority from status,
        // so we keep the local state as source of truth
      }
    } catch {
      // Scheduler not available
    }
  }, [normalizedId]);

  // ==========================================================================
  // Priority Setter
  // ==========================================================================

  const setPriority = useCallback(
    (priority: HydrationPriority): void => {
      setCurrentPriority(priority);

      // Update scheduler if available
      if (context) {
        context.updatePriority(normalizedId, priority);
      } else {
        try {
          const scheduler = getHydrationScheduler();
          scheduler.updatePriority(normalizedId, priority);
        } catch {
          // Scheduler not available
        }
      }
    },
    [context, normalizedId]
  );

  // ==========================================================================
  // Priority Controls
  // ==========================================================================

  const boost = useCallback((): void => {
    const newPriority = getHigherPriority(currentPriority);
    if (newPriority !== currentPriority) {
      setPriority(newPriority);
    }
  }, [currentPriority, setPriority]);

  const reduce = useCallback((): void => {
    const newPriority = getLowerPriority(currentPriority);
    if (newPriority !== currentPriority) {
      setPriority(newPriority);
    }
  }, [currentPriority, setPriority]);

  const makeCritical = useCallback((): void => {
    setPriority('critical');
  }, [setPriority]);

  const makeIdle = useCallback((): void => {
    setPriority('idle');
  }, [setPriority]);

  const reset = useCallback((): void => {
    setPriority(originalPriority);
  }, [originalPriority, setPriority]);

  // ==========================================================================
  // Return
  // ==========================================================================

  return useMemo<UseHydrationPriorityReturn>(
    () => ({
      priority: currentPriority,
      priorityLevel: PRIORITY_TO_LEVEL[currentPriority],
      setPriority,
      boost,
      reduce,
      makeCritical,
      makeIdle,
      reset,
      originalPriority,
    }),
    [
      currentPriority,
      setPriority,
      boost,
      reduce,
      makeCritical,
      makeIdle,
      reset,
      originalPriority,
    ]
  );
}

/**
 * Hook for adaptive priority based on user engagement signals.
 *
 * Automatically adjusts priority based on:
 * - Hover: Boosts priority
 * - Focus: Boosts priority
 * - Visibility: Adjusts based on viewport intersection
 *
 * @param boundaryId - ID of the boundary to control
 * @param elementRef - React ref to the element to observe
 * @returns Priority control interface
 *
 * @example
 * ```tsx
 * function AdaptiveComponent({ boundaryId }: { boundaryId: string }) {
 *   const containerRef = useRef<HTMLDivElement>(null);
 *   const { priority } = useAdaptiveHydrationPriority(boundaryId, containerRef);
 *
 *   return (
 *     <div ref={containerRef} tabIndex={0}>
 *       <span>Auto-adjusted priority: {priority}</span>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAdaptiveHydrationPriority(
  boundaryId: string | HydrationBoundaryId,
  elementRef: RefObject<HTMLElement>
): UseHydrationPriorityReturn {
  const priorityControl = useHydrationPriority(boundaryId);

  useEffect(() => {
    const element = elementRef.current;
    if (element === null || element === undefined) return;

    // Hover handler - boost on hover
    const handleMouseEnter = (): void => {
      if (priorityControl.priorityLevel > 1) {
        priorityControl.boost();
      }
    };

    const handleMouseLeave = (): void => {
      // Optional: restore after a delay
    };

    // Focus handler - boost on focus
    const handleFocus = (): void => {
      priorityControl.makeCritical();
    };

    const handleBlur = (): void => {
      priorityControl.reset();
    };

    // Add listeners
    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('focusin', handleFocus);
    element.addEventListener('focusout', handleBlur);

    // Intersection observer for visibility
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (!entry.isIntersecting) {
          priorityControl.reduce();
        } else if (entry.intersectionRatio > 0.5) {
          priorityControl.boost();
        }
      },
      { threshold: [0, 0.5] }
    );

    observer.observe(element);

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.removeEventListener('focusin', handleFocus);
      element.removeEventListener('focusout', handleBlur);
      observer.disconnect();
    };
  }, [elementRef, priorityControl]);

  return priorityControl;
}

// ============================================================================
// Exports
// ============================================================================

export { PRIORITY_ORDER, PRIORITY_TO_LEVEL, LEVEL_TO_PRIORITY };
// Types are already exported inline above
