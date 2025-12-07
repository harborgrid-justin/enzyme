/**
 * @file Hydration Boundary Component
 * @description Wraps components for selective, prioritized hydration.
 *
 * HydrationBoundary creates a boundary around components that should be
 * hydrated on demand rather than immediately. It provides:
 *
 * - Configurable hydration priority and triggers
 * - Placeholder rendering before hydration
 * - Error handling with fallback rendering
 * - Integration with the hydration scheduler
 * - Support for interaction capture and replay
 *
 * @module hydration/HydrationBoundary
 *
 * @example
 * ```tsx
 * // Basic usage - hydrate when visible
 * <HydrationBoundary priority="normal" trigger="visible">
 *   <ExpensiveComponent />
 * </HydrationBoundary>
 *
 * // Critical above-the-fold content
 * <HydrationBoundary
 *   priority="critical"
 *   trigger="immediate"
 *   aboveTheFold
 * >
 *   <HeroSection />
 * </HydrationBoundary>
 *
 * // Interaction-triggered with placeholder
 * <HydrationBoundary
 *   priority="high"
 *   trigger="interaction"
 *   placeholder={<SkeletonButton />}
 * >
 *   <InteractiveButton />
 * </HydrationBoundary>
 * ```
 */

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useId,
  type ReactNode,
  type ComponentType,
  type CSSProperties,
  lazy,
  Suspense,
} from 'react';

import { useOptionalHydrationContext } from './HydrationProvider';

import type {
  HydrationBoundaryProps,
  HydrationBoundaryId,
  HydrationTask,
  WithHydrationBoundaryOptions,
} from './types';

import { createBoundaryId } from './types';
import { isDev } from '@/lib/core/config/env-helper';

// ============================================================================
// Internal Types
// ============================================================================

/**
 * Captured interaction event for replay after hydration
 */
interface CapturedInteraction {
  type: string;
  target: EventTarget | null;
  timestamp: number;
  clientX?: number;
  clientY?: number;
}

interface HydrationBoundaryState {
  hydrationState:
    | 'idle'
    | 'loading'
    | 'complete'
    | 'error'
    | 'pending'
    | 'hydrated'
    | 'hydrating'
    | 'skipped';
  error: Error | null;
  isClient: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a stable boundary ID.
 */
function generateBoundaryId(providedId: string | undefined, reactId: string): HydrationBoundaryId {
  const id = providedId ?? `hydration-boundary-${reactId.replace(/:/g, '-')}`;
  return createBoundaryId(id);
}

/**
 * Default placeholder for loading state.
 */
function DefaultPlaceholder(): React.JSX.Element {
  return (
    <div
      className="hydration-placeholder"
      style={{
        minHeight: '1em',
        background: 'transparent',
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Default error fallback.
 */
function DefaultErrorFallback({ error }: { error: Error }): React.JSX.Element {
  return (
    <div
      className="hydration-error"
      role="alert"
      style={{
        padding: '1rem',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '4px',
        color: 'inherit',
      }}
    >
      <strong>Component Error</strong>
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.875em', opacity: 0.8 }}>{error.message}</p>
    </div>
  );
}

// ============================================================================
// HydrationBoundary Component
// ============================================================================

/**
 * Wraps components for selective, prioritized hydration.
 *
 * This component integrates with the HydrationScheduler to provide
 * controlled hydration timing based on priority, visibility, and
 * user interactions.
 *
 * @param props - Boundary props
 * @returns The boundary wrapper with children or placeholder
 */
export function HydrationBoundary({
  id: providedId,
  children,
  priority = 'normal',
  trigger = 'visible',
  placeholder,
  errorFallback,
  onHydrationStart,
  onHydrationComplete,
  onHydrationError,
  ssrOnly = false,
  mediaQuery,
  timeout,
  estimatedCost,
  aboveTheFold = false,
  className,
  style,
}: HydrationBoundaryProps): React.JSX.Element {
  // ==========================================================================
  // Refs and IDs
  // ==========================================================================

  const reactId = useId();
  const boundaryId = useMemo(() => generateBoundaryId(providedId, reactId), [providedId, reactId]);

  const containerRef = useRef<HTMLDivElement>(null);
  const hydrationCallbackRef = useRef<(() => Promise<void>) | null>(null);
  const capturedInteractionsRef = useRef<CapturedInteraction[]>([]);

  // ==========================================================================
  // Context
  // ==========================================================================

  const hydrationContext = useOptionalHydrationContext();

  // ==========================================================================
  // State
  // ==========================================================================

  const [state, setState] = useState<HydrationBoundaryState>({
    hydrationState: 'pending',
    error: null,
    isClient: false,
  });

  // ==========================================================================
  // Client Detection
  // ==========================================================================

  useEffect(() => {
    queueMicrotask(() => {
      setState((prev) => ({ ...prev, isClient: true }));
    });
  }, []);

  // ==========================================================================
  // Hydration Callback
  // ==========================================================================

  /**
   * Capture interaction events during pre-hydration state.
   * INP Optimization: Instead of blocking all interactions with pointerEvents: 'none',
   * we capture them and replay after hydration completes.
   */
  const captureInteraction = useCallback(
    (event: React.MouseEvent | React.TouchEvent | React.KeyboardEvent) => {
      // Only capture if not yet hydrated
      if (state.hydrationState !== 'pending' && state.hydrationState !== 'hydrating') {
        return;
      }

      const captured: CapturedInteraction = {
        type: event.type,
        target: event.target,
        timestamp: Date.now(),
      };

      // Capture position for mouse/touch events
      if ('clientX' in event) {
        captured.clientX = event.clientX;
        captured.clientY = event.clientY;
      }

      capturedInteractionsRef.current.push(captured);

      // Prevent the event from propagating during pre-hydration
      event.preventDefault();
      event.stopPropagation();
    },
    [state.hydrationState]
  );

  /**
   * Replay captured interactions after hydration completes.
   */
  const replayCapturedInteractions = useCallback(() => {
    const interactions = capturedInteractionsRef.current;
    if (interactions.length === 0) return;

    // Replay interactions with a small delay to ensure DOM is ready
    requestAnimationFrame(() => {
      for (const interaction of interactions) {
        if (interaction.target && interaction.target instanceof Element) {
          try {
            // For click events, dispatch a new click event
            if (interaction.type === 'click' || interaction.type === 'mousedown') {
              const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                clientX: interaction.clientX,
                clientY: interaction.clientY,
              });
              interaction.target.dispatchEvent(clickEvent);
            }
          } catch {
            // Silently fail if replay fails
          }
        }
      }

      // Clear captured interactions after replay
      capturedInteractionsRef.current = [];
    });
  }, []);

  /**
   * The actual hydration function that transitions state.
   */
  const performHydration = useCallback(async (): Promise<void> => {
    // Call start callback
    onHydrationStart?.();

    // Simply transition to hydrated state
    // The children are already rendered, this just marks them as interactive
    return new Promise<void>((resolve) => {
      // Use requestAnimationFrame to ensure we don't block the main thread
      requestAnimationFrame(() => {
        setState((prev) => ({
          ...prev,
          hydrationState: 'hydrated',
        }));

        // Replay any captured interactions after hydration
        replayCapturedInteractions();

        resolve();
      });
    });
  }, [onHydrationStart, replayCapturedInteractions]);

  // Store in ref for scheduler (in effect to avoid ref access during render)
  useEffect(() => {
    hydrationCallbackRef.current = performHydration;
  }, [performHydration]);

  // ==========================================================================
  // Scheduler Registration
  // ==========================================================================

  useEffect(() => {
    // Skip if SSR-only
    if (ssrOnly) {
      queueMicrotask(() => {
        setState((prev) => ({ ...prev, hydrationState: 'skipped' }));
      });
      return;
    }

    // Skip if no context or not on client
    if (hydrationContext == null || !state.isClient) {
      // Without context, hydrate immediately
      if (state.isClient) {
        queueMicrotask(() => {
          setState((prev) => ({ ...prev, hydrationState: 'hydrated' }));
        });
      }
      return;
    }

    // Create task
    const task: HydrationTask = {
      id: boundaryId,
      priority,
      trigger,
      hydrate: async () => {
        const startTime = performance.now();

        try {
          setState((prev) => ({ ...prev, hydrationState: 'hydrating' }));
          await hydrationCallbackRef.current?.();

          const duration = performance.now() - startTime;
          onHydrationComplete?.(duration);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          setState((prev) => ({
            ...prev,
            hydrationState: 'error',
            error: err,
          }));
          onHydrationError?.(err);
          throw err;
        }
      },
      onHydrated: () => {
        // Additional cleanup if needed
      },
      onError: (error) => {
        console.error(`[HydrationBoundary] Error hydrating ${boundaryId}:`, error);
      },
      enqueuedAt: Date.now(),
      element: containerRef.current,
      estimatedCost,
      timeout,
      cancellable: true,
      metadata: {
        componentName: providedId,
        aboveTheFold,
        routePath: mediaQuery,
      },
    };

    // Register with scheduler
    hydrationContext.registerBoundary(task);

    // Cleanup on unmount
    return () => {
      hydrationContext.unregisterBoundary(boundaryId);
    };
  }, [
    boundaryId,
    priority,
    trigger,
    ssrOnly,
    hydrationContext,
    state.isClient,
    estimatedCost,
    timeout,
    aboveTheFold,
    providedId,
    mediaQuery,
    onHydrationComplete,
    onHydrationError,
  ]);

  // ==========================================================================
  // Render Logic
  // ==========================================================================

  /**
   * Determines what to render based on current state.
   */
  const renderContent = (): ReactNode => {
    // SSR-only: render children without interactivity
    if (ssrOnly) {
      return children;
    }

    // Error state
    if (state.hydrationState === 'error' && state.error != null) {
      if (typeof errorFallback === 'function') {
        return errorFallback(state.error);
      }
      if (errorFallback != null) {
        return errorFallback;
      }
      return <DefaultErrorFallback error={state.error} />;
    }

    // Not yet on client - render placeholder for SSR
    if (!state.isClient) {
      return placeholder ?? <DefaultPlaceholder />;
    }

    // Pending/Hydrating - render children with interaction capture
    // INP Optimization: Instead of blocking interactions with pointerEvents: 'none',
    // we capture them and replay after hydration for better perceived responsiveness
    if (state.hydrationState === 'pending' || state.hydrationState === 'hydrating') {
      return (
        <>
          {/* Render actual children with interaction capture for INP optimization */}
          <div
            className="hydration-content"
            aria-hidden="false"
            onClickCapture={captureInteraction}
            onMouseDownCapture={captureInteraction}
            onTouchStartCapture={captureInteraction}
            onKeyDownCapture={captureInteraction}
          >
            {children}
          </div>
          {/* Optional loading indicator for hydrating state */}
          {state.hydrationState === 'hydrating' && (
            <div
              className="hydration-loading-indicator"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(1px)',
                pointerEvents: 'none',
              }}
              aria-label="Loading..."
            />
          )}
        </>
      );
    }

    // Hydrated - render fully interactive children
    return children;
  };

  // ==========================================================================
  // Container Styles
  // ==========================================================================

  const containerStyles = useMemo<CSSProperties>(() => {
    const baseStyles: CSSProperties = {
      position: 'relative',
      ...style,
    };

    // Add visual indicators in development
    if (isDev()) {
      if (state.hydrationState === 'pending') {
        baseStyles.outline = '1px dashed rgba(59, 130, 246, 0.5)';
      } else if (state.hydrationState === 'hydrating') {
        baseStyles.outline = '1px solid rgba(59, 130, 246, 0.8)';
      }
    }

    return baseStyles;
  }, [style, state.hydrationState]);

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div
      ref={containerRef}
      id={boundaryId}
      className={`hydration-boundary hydration-${state.hydrationState} ${className ?? ''}`}
      style={containerStyles}
      data-hydration-state={state.hydrationState}
      data-hydration-priority={priority}
      data-hydration-trigger={trigger}
      data-hydration-boundary-id={boundaryId}
    >
      {renderContent()}
    </div>
  );
}

// ============================================================================
// Higher-Order Component
// ============================================================================

/* eslint-disable react-refresh/only-export-components */
/**
 * HOC to wrap a component with a HydrationBoundary.
 *
 * @param Component - The component to wrap
 * @param options - Boundary options
 * @returns Wrapped component with hydration boundary
 *
 * @example
 * ```tsx
 * const HydratedChart = withHydrationBoundary(Chart, {
 *   defaultPriority: 'low',
 *   defaultTrigger: 'visible',
 *   placeholder: <ChartSkeleton />,
 * });
 *
 * // Use like normal component
 * <HydratedChart data={chartData} />
 *
 * // Override boundary props as needed
 * <HydratedChart data={chartData} priority="high" />
 * ```
 */
export function withHydrationBoundary<P extends object>(
  Component: ComponentType<P>,
  options: WithHydrationBoundaryOptions<P> = {}
): ComponentType<P & Partial<HydrationBoundaryProps>> {
  const {
    displayName,
    defaultPriority = 'normal',
    defaultTrigger = 'visible',
    placeholder: optionPlaceholder,
    aboveTheFold: optionAboveTheFold = false,
    estimatedCost: optionEstimatedCost,
  } = options;

  function WrappedComponent(props: P & Partial<HydrationBoundaryProps>): React.JSX.Element {
    const {
      priority = defaultPriority,
      trigger = defaultTrigger,
      placeholder = typeof optionPlaceholder === 'function'
        ? optionPlaceholder(props as P)
        : optionPlaceholder,
      aboveTheFold = optionAboveTheFold,
      estimatedCost = optionEstimatedCost,
      id,
      errorFallback,
      onHydrationStart,
      onHydrationComplete,
      onHydrationError,
      ssrOnly,
      visibilityConfig,
      mediaQuery,
      timeout,
      className,
      style,
      ...componentProps
    } = props;

    return (
      <HydrationBoundary
        id={id}
        priority={priority}
        trigger={trigger}
        placeholder={placeholder}
        errorFallback={errorFallback}
        onHydrationStart={onHydrationStart}
        onHydrationComplete={onHydrationComplete}
        onHydrationError={onHydrationError}
        ssrOnly={ssrOnly}
        visibilityConfig={visibilityConfig}
        mediaQuery={mediaQuery}
        timeout={timeout}
        estimatedCost={estimatedCost}
        aboveTheFold={aboveTheFold}
        className={className}
        style={style}
      >
        <Component {...(componentProps as P)} />
      </HydrationBoundary>
    );
  }

  WrappedComponent.displayName =
    displayName ??
    `withHydrationBoundary(${Component.displayName ?? Component.name ?? 'Component'})`;

  return WrappedComponent;
}

// ============================================================================
// Lazy Hydration Component
// ============================================================================

/**
 * Props for LazyHydration component.
 */
interface LazyHydrationProps<P extends object> {
  /** Factory function that returns a promise resolving to the component */
  factory: () => Promise<{ default: ComponentType<P> }>;
  /** Props to pass to the lazy-loaded component */
  componentProps: P;
  /** Hydration boundary props */
  boundaryProps?: Partial<HydrationBoundaryProps>;
}

/**
 * Combines React.lazy with HydrationBoundary for maximum efficiency.
 *
 * This component provides both code-splitting (via React.lazy) and
 * selective hydration (via HydrationBoundary).
 *
 * @example
 * ```tsx
 * <LazyHydration
 *   factory={() => import('./HeavyChart')}
 *   componentProps={{ data: chartData }}
 *   boundaryProps={{
 *     priority: 'low',
 *     trigger: 'visible',
 *     placeholder: <ChartSkeleton />,
 *   }}
 * />
 * ```
 */
export function LazyHydration<P extends object>({
  factory,
  componentProps,
  boundaryProps = {},
}: LazyHydrationProps<P>): React.JSX.Element {
  // Create lazy component once with proper typing
  const LazyComponent = useMemo(() => lazy(factory), [factory]);

  const { placeholder = <DefaultPlaceholder />, ...restBoundaryProps } = boundaryProps;

  return (
    <HydrationBoundary {...restBoundaryProps} placeholder={placeholder}>
      <Suspense fallback={placeholder}>
        <LazyComponent {...componentProps} />
      </Suspense>
    </HydrationBoundary>
  );
}

// ============================================================================
// Exports
// ============================================================================

export type { HydrationBoundaryProps, WithHydrationBoundaryOptions, LazyHydrationProps };
