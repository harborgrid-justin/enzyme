/**
 * @fileoverview useAdaptiveLayout Hook
 *
 * Primary hook for accessing and controlling the adaptive layout system.
 * Provides access to layout state, mode, analysis, and control functions.
 *
 * @module layouts/adaptive/hooks/useAdaptiveLayout
 * @version 1.0.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ContentAnalysis,
  Dimensions,
  LayoutComputeResult,
  LayoutEngineConfig,
  LayoutMode,
  LayoutState,
  UseAdaptiveLayoutReturn,
} from '../types';
import { DEFAULT_LAYOUT_ENGINE_CONFIG } from '../types';
import { createLayoutEngine } from '../layout-engine';

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Options for useAdaptiveLayout hook.
 */
export interface UseAdaptiveLayoutOptions {
  /** Initial layout mode */
  initialMode?: LayoutMode;
  /** Layout engine configuration */
  config?: Partial<LayoutEngineConfig>;
  /** Callback when layout mode changes */
  onModeChange?: (mode: LayoutMode, analysis: ContentAnalysis) => void;
  /** Callback when layout is computed */
  onLayoutComputed?: (result: LayoutComputeResult) => void;
  /** Whether to auto-detect layout mode */
  autoDetect?: boolean;
}

/**
 * Hook for accessing and controlling the adaptive layout system.
 *
 * @param options - Hook configuration options
 * @returns Adaptive layout state and controls
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     layoutState,
 *     mode,
 *     analysis,
 *     setMode,
 *     containerRef
 *   } = useAdaptiveLayout({
 *     initialMode: 'grid',
 *     autoDetect: true,
 *     onModeChange: (mode) => console.log('Mode changed:', mode)
 *   });
 *
 *   return (
 *     <div ref={containerRef}>
 *       <p>Current mode: {mode}</p>
 *       <p>Items: {analysis?.itemCount}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAdaptiveLayout(options: UseAdaptiveLayoutOptions = {}): UseAdaptiveLayoutReturn {
  const {
    initialMode = 'grid',
    config = {},
    onModeChange,
    onLayoutComputed,
    autoDetect = true,
  } = options;

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ReturnType<typeof createLayoutEngine> | null>(null);

  // State
  const [mode, setModeState] = useState<LayoutMode>(initialMode);
  const [layoutState, setLayoutState] = useState<LayoutState | null>(null);
  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Merge config with defaults
  const mergedConfig = useMemo<LayoutEngineConfig>(
    () => ({ ...DEFAULT_LAYOUT_ENGINE_CONFIG, ...config }),
    [config]
  );

  // Initialize engine
  useEffect(() => {
    engineRef.current = createLayoutEngine(mergedConfig);

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [mergedConfig]);

  // Compute layout
  const computeLayout = useCallback(() => {
    const engine = engineRef.current;
    const container = containerRef.current;

    if (!engine || !container) return;

    setIsComputing(true);

    try {
      // Analyze content
      const contentAnalysis = engine.analyze(container);
      setAnalysis(contentAnalysis);

      // Get container dimensions
      const rect = container.getBoundingClientRect();
      const containerDimensions: Dimensions = { width: rect.width, height: rect.height };

      // Get item IDs from children
      const itemIds = Array.from(container.children).map((child, index) => {
        const id = (child as HTMLElement).getAttribute('data-layout-id');
        return id ?? `item-${index}`;
      });

      // Compute layout
      const result = engine.compute({
        containerId: container.id || 'adaptive-container',
        itemIds,
        containerDimensions,
        forcedMode: autoDetect ? undefined : mode,
      });

      // Update state
      setLayoutState(result.state);

      // Check for mode change
      if (autoDetect && result.state.mode !== mode) {
        setModeState(result.state.mode);
        onModeChange?.(result.state.mode, contentAnalysis);
      }

      onLayoutComputed?.(result);
    } finally {
      setIsComputing(false);
    }
  }, [autoDetect, mode, onModeChange, onLayoutComputed]);

  // Set mode manually
  const setMode = useCallback(
    (newMode: LayoutMode) => {
      const previousMode = mode;
      setModeState(newMode);

      if (newMode !== previousMode) {
        setIsTransitioning(true);

        // Recompute layout with new mode
        requestAnimationFrame(() => {
          computeLayout();
          setIsTransitioning(false);
        });
      }
    },
    [mode, computeLayout]
  );

  // Recompute layout
  const recompute = useCallback(() => {
    computeLayout();
  }, [computeLayout]);

  // Observe container size changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const engine = engineRef.current;
    if (!engine) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const cleanup = engine.observe(container, () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(computeLayout, mergedConfig.resizeDebounceMs);
    });

    // Initial computation
    computeLayout();

    return () => {
      cleanup();
      clearTimeout(timeoutId);
    };
  }, [computeLayout, mergedConfig.resizeDebounceMs]);

  return {
    layoutState,
    mode,
    analysis,
    isComputing,
    isTransitioning,
    setMode,
    recompute,
    containerRef,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { UseAdaptiveLayoutReturn };
