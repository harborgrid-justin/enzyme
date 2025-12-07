/**
 * @fileoverview useLayoutMorph Hook
 *
 * Hook for triggering and controlling FLIP-based morph transitions.
 * Manages element registration, snapshots, and animation playback.
 *
 * @module layouts/adaptive/hooks/useLayoutMorph
 * @version 1.0.0
 */

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type {
  LayoutRect,
  LayoutState,
  MorphTransitionConfig,
  UseLayoutMorphReturn,
} from '../types';
import { DEFAULT_MORPH_TRANSITION_CONFIG } from '../types';
import { createMorphController } from '../morph-transition';

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Options for useLayoutMorph hook.
 */
export interface UseLayoutMorphOptions {
  /** Morph transition configuration */
  config?: Partial<MorphTransitionConfig>;
  /** Callback when morph starts */
  onMorphStart?: () => void;
  /** Callback when morph completes */
  onMorphComplete?: () => void;
  /** Callback when morph is interrupted */
  onMorphInterrupt?: () => void;
}

/**
 * Hook for controlling FLIP-based morph transitions.
 *
 * @param options - Hook configuration options
 * @returns Morph transition controls
 *
 * @example
 * ```tsx
 * function MorphingLayout() {
 *   const {
 *     morph,
 *     cancel,
 *     progress,
 *     isTransitioning,
 *     registerElement,
 *     snapshot
 *   } = useLayoutMorph({
 *     config: { duration: 300, easing: 'ease-out' },
 *     onMorphComplete: () => console.log('Morph complete!')
 *   });
 *
 *   const handleLayoutChange = async () => {
 *     snapshot(); // Capture current state
 *     // Make layout changes...
 *     await morph({ mode: 'list' });
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleLayoutChange}>Change Layout</button>
 *       {isTransitioning && <p>Progress: {(progress * 100).toFixed(0)}%</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useLayoutMorph(options: UseLayoutMorphOptions = {}): UseLayoutMorphReturn {
  const { config = {}, onMorphStart, onMorphComplete, onMorphInterrupt } = options;

  // Refs
  const controllerRef = useRef<ReturnType<typeof createMorphController> | null>(null);
  const elementsRef = useRef<Map<string, RefObject<HTMLElement>>>(new Map());
  const firstSnapshotRef = useRef<Map<string, LayoutRect> | null>(null);

  // State
  const [progress, setProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Merge config
  const mergedConfig = useMemo<MorphTransitionConfig>(
    () => ({
      ...DEFAULT_MORPH_TRANSITION_CONFIG,
      ...config,
      onStart: () => {
        onMorphStart?.();
        config.onStart?.();
      },
      onFrame: (p) => {
        setProgress(p);
        config.onFrame?.(p);
      },
      onComplete: () => {
        setIsTransitioning(false);
        onMorphComplete?.();
        config.onComplete?.();
      },
      onInterrupt: () => {
        setIsTransitioning(false);
        onMorphInterrupt?.();
        config.onInterrupt?.();
      },
    }),
    [config, onMorphStart, onMorphComplete, onMorphInterrupt]
  );

  // Initialize controller
  useEffect(() => {
    controllerRef.current = createMorphController(mergedConfig);

    return () => {
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
  }, [mergedConfig]);

  // Register element for FLIP tracking
  const registerElement = useCallback((id: string, ref: RefObject<HTMLElement>) => {
    elementsRef.current.set(id, ref);
  }, []);

  // Unregister element
  const unregisterElement = useCallback((id: string) => {
    elementsRef.current.delete(id);
  }, []);

  // Get current elements as HTMLElement map
  const getElements = useCallback((): Map<string, HTMLElement> => {
    const elements = new Map<string, HTMLElement>();

    for (const [id, ref] of elementsRef.current) {
      if (ref.current != null) {
        elements.set(id, ref.current);
      }
    }

    return elements;
  }, []);

  // Take snapshot of current state
  const snapshot = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller) return;

    const elements = getElements();
    firstSnapshotRef.current = controller.snapshotFirst(elements);
  }, [getElements]);

  // Trigger morph transition
  const morph = useCallback(
    async (_targetState: Partial<LayoutState>): Promise<void> => {
      const controller = controllerRef.current;
      if (!controller) return;

      setIsTransitioning(true);
      setProgress(0);

      const elements = getElements();

      // If we have a first snapshot, use it; otherwise take one now
      const first = firstSnapshotRef.current ?? controller.snapshotFirst(elements);
      firstSnapshotRef.current = null;

      // Force layout update
      // This would typically be triggered by the layout engine updating positions
      // For now, we'll just wait a frame
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const last = controller.snapshotLast(elements);
      const context = controller.createAnimation(first, last, elements);

      try {
        await controller.play(context);
      } catch (error) {
        // Animation was cancelled or interrupted
        console.warn('[useLayoutMorph] Animation interrupted:', error);
      }
    },
    [getElements]
  );

  // Cancel current transition
  const cancel = useCallback(() => {
    controllerRef.current?.cancel();
  }, []);

  return {
    morph,
    cancel,
    progress,
    isTransitioning,
    registerElement,
    unregisterElement,
    snapshot,
  };
}

// =============================================================================
// HELPER HOOKS
// =============================================================================

/**
 * Hook for automatically registering an element with the morph system.
 *
 * @param morphHook - The morph hook return value
 * @param id - Unique ID for the element
 * @returns Ref to attach to the element
 *
 * @example
 * ```tsx
 * function MorphableCard({ id, morphHook }: { id: string; morphHook: UseLayoutMorphReturn }) {
 *   const ref = useMorphElement(morphHook, id);
 *
 *   return <div ref={ref} data-layout-id={id}>Content</div>;
 * }
 * ```
 */
export function useMorphElement(
  morphHook: Pick<UseLayoutMorphReturn, 'registerElement' | 'unregisterElement'>,
  id: string
): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    morphHook.registerElement(id, ref as RefObject<HTMLElement>);

    return () => {
      morphHook.unregisterElement(id);
    };
  }, [morphHook, id]);

  return ref;
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { UseLayoutMorphReturn };
