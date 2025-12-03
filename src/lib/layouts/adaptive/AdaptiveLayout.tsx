/**
 * @fileoverview AdaptiveLayout Component
 *
 * The main wrapper component for the Adaptive Layout system. Provides automatic
 * content-aware layout selection, morph transitions, and CLS prevention for
 * its children.
 *
 * @module layouts/adaptive/AdaptiveLayout
 * @version 1.0.0
 */

/* eslint-disable react-refresh/only-export-components */

import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { AdaptiveLayoutContext } from '../../contexts/AdaptiveLayoutContext';
import type {
  AdaptiveLayoutProps,
  CLSGuardConfig,
  ContentAnalysis,
  // LayoutComputeResult,
  // LayoutConstraint,
  LayoutEngineConfig,
  LayoutMode,
  LayoutState,
  MorphTransitionConfig,
} from './types';
import {
  DEFAULT_LAYOUT_ENGINE_CONFIG,
  DEFAULT_MORPH_TRANSITION_CONFIG,
  DEFAULT_CLS_GUARD_CONFIG,
} from './types';
import { createLayoutEngine } from './layout-engine';
import { createMorphController } from './morph-transition';
import { createCLSGuard } from './cls-guard';
import { createConstraintSolver } from './constraint-solver';

// =============================================================================
// CONTEXT
// =============================================================================

/* @refresh reset */

/**
 * Context for sharing adaptive layout state and controls.
 */
type AdaptiveLayoutContextValue = unknown;
type AdaptiveLayoutContextValueInternal = unknown;

/**
 * Hook to access the adaptive layout context.
 *
 * @throws Error if used outside AdaptiveLayout
 */
export function useAdaptiveLayoutContext(): AdaptiveLayoutContextValue {
  const context = useContext(AdaptiveLayoutContext);
  if (!context) {
    throw new Error('useAdaptiveLayoutContext must be used within an AdaptiveLayout');
  }
  return context as AdaptiveLayoutContextValueInternal;
}

// =============================================================================
// CHILD REGISTRY
// =============================================================================

/**
 * Registry for tracking child elements.
 */
interface ChildRegistry {
  elements: Map<string, RefObject<HTMLElement>>;
  register: (id: string, ref: RefObject<HTMLElement>) => void;
  unregister: (id: string) => void;
  getElements: () => Map<string, HTMLElement>;
}

/**
 * Creates a child registry for tracking elements.
 */
function createChildRegistry(): ChildRegistry {
  const elements = new Map<string, RefObject<HTMLElement>>();

  return {
    elements,
    register: (id: string, ref: RefObject<HTMLElement>) => {
      elements.set(id, ref);
    },
    unregister: (id: string) => {
      elements.delete(id);
    },
    getElements: () => {
      const result = new Map<string, HTMLElement>();
      for (const [id, ref] of elements) {
        if (ref.current !== null && ref.current !== undefined) {
          result.set(id, ref.current);
        }
      }
      return result;
    },
  };
}

// =============================================================================
// ADAPTIVE LAYOUT COMPONENT
// =============================================================================

/**
 * AdaptiveLayout is the main wrapper component for the adaptive layout system.
 * It provides content-aware layout selection, smooth morph transitions, and
 * CLS prevention for its children.
 *
 * @example
 * ```tsx
 * <AdaptiveLayout
 *   initialMode="grid"
 *   config={{ contentAware: true }}
 *   transitionConfig={{ duration: 300 }}
 *   onModeChange={(mode) => console.log('Mode changed:', mode)}
 * >
 *   <AdaptiveGrid>
 *     {items.map(item => (
 *       <Card key={item.id}>{item.content}</Card>
 *     ))}
 *   </AdaptiveGrid>
 * </AdaptiveLayout>
 * ```
 */
export function AdaptiveLayout({
  children,
  initialMode = 'grid',
  config = {},
  transitionConfig = {},
  clsConfig = {},
  constraints = [],
  onModeChange,
  onLayoutComputed,
  className,
  style,
  testId,
}: AdaptiveLayoutProps): ReactNode {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const childRegistryRef = useRef<ChildRegistry>(createChildRegistry());

  // Merge configurations with defaults
  const engineConfig = useMemo<LayoutEngineConfig>(
    () => ({ ...DEFAULT_LAYOUT_ENGINE_CONFIG, ...config }),
    [config]
  );

  const morphConfig = useMemo<MorphTransitionConfig>(
    () => ({ ...DEFAULT_MORPH_TRANSITION_CONFIG, ...transitionConfig }),
    [transitionConfig]
  );

  const guardConfig = useMemo<CLSGuardConfig>(
    () => ({ ...DEFAULT_CLS_GUARD_CONFIG, ...clsConfig }),
    [clsConfig]
  );

  // Create instances
  const engine = useMemo(() => createLayoutEngine(engineConfig), [engineConfig]);
  const morphController = useMemo(() => createMorphController(morphConfig), [morphConfig]);
  const clsGuard = useMemo(() => createCLSGuard(guardConfig), [guardConfig]);
  const constraintSolver = useMemo(() => createConstraintSolver(), []);

  // State
  const [currentMode, setCurrentMode] = useState<LayoutMode>(initialMode);
  const [layoutState, setLayoutState] = useState<LayoutState | null>(null);
  const [_analysis, setAnalysis] = useState<ContentAnalysis | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Previous mode for transitions
  const previousModeRef = useRef<LayoutMode>(initialMode);

  // Add constraints to solver
  useEffect(() => {
    constraintSolver.clear();
    for (const constraint of constraints) {
      constraintSolver.addConstraint(constraint);
    }
  }, [constraints, constraintSolver]);

  // Compute layout
  const computeLayout = useCallback(async () => {
    if (!containerRef.current) return;

    setIsComputing(true);

    try {
      const container = containerRef.current;
      const contentAnalysis = engine.analyze(container);
      setAnalysis(contentAnalysis);

      // Select mode based on analysis and constraints
      const selectedMode = engineConfig.contentAware
        ? engine.selectMode(contentAnalysis, constraints)
        : currentMode;

      // Compute layout
      const rect = container.getBoundingClientRect();
      const itemIds = Array.from(childRegistryRef.current.elements.keys());

      const result = engine.compute({
        containerId: container.id || 'adaptive-layout',
        itemIds,
        containerDimensions: { width: rect.width, height: rect.height },
        forcedMode: selectedMode,
      });

      // Check if mode changed
      if (selectedMode !== previousModeRef.current) {
        // Perform morph transition
        setIsTransitioning(true);

        const elements = childRegistryRef.current.getElements();
        if (elements.size > 0) {
          const first = morphController.snapshotFirst(elements);

          // Update state
          setLayoutState(result.state);
          setCurrentMode(selectedMode);

          // Force reflow
          void container.offsetHeight;

          const last = morphController.snapshotLast(elements);
          const context = morphController.createAnimation(first, last, elements);

          await morphController.play(context);
        } else {
          setLayoutState(result.state);
          setCurrentMode(selectedMode);
        }

        setIsTransitioning(false);
        previousModeRef.current = selectedMode;
        onModeChange?.(selectedMode, contentAnalysis);
      } else {
        setLayoutState(result.state);
      }

      onLayoutComputed?.(result);
    } finally {
      setIsComputing(false);
    }
  }, [
    engine,
    engineConfig.contentAware,
    constraints,
    currentMode,
    morphController,
    onModeChange,
    onLayoutComputed,
  ]);

  // Observe container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    let timeoutId: ReturnType<typeof setTimeout>;

    const cleanup = engine.observe(container, () => {
      // Debounce layout computation
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        void computeLayout();
      }, engineConfig.resizeDebounceMs);
    });

    // Initial computation
    void computeLayout();

    return () => {
      cleanup();
      clearTimeout(timeoutId);
    };
  }, [engine, engineConfig.resizeDebounceMs, computeLayout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      engine.destroy();
      morphController.destroy();
      clsGuard.destroy();
    };
  }, [engine, morphController, clsGuard]);

  // Register/unregister child handlers
  const registerChild = useCallback((id: string, ref: RefObject<HTMLElement>) => {
    childRegistryRef.current.register(id, ref);
  }, []);

  const unregisterChild = useCallback((id: string) => {
    childRegistryRef.current.unregister(id);
  }, []);

  // Context value
  const contextValue = useMemo(
    () => ({
      engine,
      morphController,
      clsGuard,
      constraintSolver,
      config: engineConfig,
      layoutState,
      registerChild,
      unregisterChild,
    }),
    [
      engine,
      morphController,
      clsGuard,
      constraintSolver,
      engineConfig,
      layoutState,
      registerChild,
      unregisterChild,
    ]
  );

  // Container styles based on layout mode
  const containerStyles = useMemo<CSSProperties>(() => {
    const baseStyles: CSSProperties = {
      position: 'relative',
      width: '100%',
      ...style,
    };

    // Add mode-specific styles
    switch (currentMode) {
      case 'grid':
        return {
          ...baseStyles,
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(${layoutState?.gridConfig?.columns !== undefined && layoutState.gridConfig.columns !== null && layoutState.gridConfig.columns !== 0 ? `calc(100% / ${layoutState.gridConfig.columns} - ${layoutState.gridConfig.gap ?? 0}px)` : '200px'}, 1fr))`,
          gap: `${layoutState?.gridConfig?.gap ?? 16}px`,
        };
      case 'list':
        return {
          ...baseStyles,
          display: 'flex',
          flexDirection: 'column',
          gap: `${layoutState?.listConfig?.gap ?? 12}px`,
        };
      case 'compact':
        return {
          ...baseStyles,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
          gap: '8px',
        };
      case 'expanded':
        return {
          ...baseStyles,
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          alignItems: 'center',
        };
      case 'dense':
        return {
          ...baseStyles,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
          gap: '4px',
        };
      case 'sparse':
        return {
          ...baseStyles,
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          padding: '48px',
          alignItems: 'center',
        };
      default:
        return baseStyles;
    }
  }, [currentMode, layoutState, style]);

  return (
    <AdaptiveLayoutContext.Provider
      value={
        contextValue as unknown as import('../../contexts/AdaptiveLayoutContext.ts').AdaptiveLayoutContextValue
      }
    >
      <div
        ref={containerRef}
        className={className}
        style={containerStyles}
        data-layout-mode={currentMode}
        data-computing={isComputing}
        data-transitioning={isTransitioning}
        data-testid={testId}
      >
        {children}
      </div>
    </AdaptiveLayoutContext.Provider>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export { AdaptiveLayoutContext };
export type { AdaptiveLayoutContextValueInternal as AdaptiveLayoutContextValue };
