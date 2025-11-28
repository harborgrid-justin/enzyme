/**
 * @fileoverview DOM Context Provider Component
 *
 * This component provides comprehensive DOM context to its descendants:
 * - Layout ancestry tracking
 * - Viewport awareness
 * - Scroll container detection
 * - Portal context bridging
 * - Z-index management
 *
 * Features:
 * - Automatic context updates on layout changes
 * - Performance-optimized batched updates
 * - Memory-efficient context storage
 * - SSR-compatible with graceful degradation
 *
 * @module layouts/context-aware/DOMContextProvider
 * @author Agent 4 - PhD Context Systems Expert
 * @version 1.0.0
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

import type {
  DOMContext,
  DOMContextProviderProps,
  ViewportInfo,
  LayoutAncestor,
  ScrollContainer,
  PortalContext,
  ZIndexContext,
} from './types';
import { DEFAULT_TRACKING_CONFIG } from './types';
import { getDOMContextTracker } from './dom-context';
import { getViewportTracker } from './viewport-awareness';
import { findScrollContainer } from './scroll-tracker';
import { getPortalContextManager } from './portal-bridge';
import { getZIndexManager } from './z-index-manager';

// ============================================================================
// Context Creation
// ============================================================================

/**
 * Default DOM context for SSR and initial render.
 */
const defaultDOMContext: DOMContext = {
  ancestors: [],
  viewport: {
    width: 1024,
    height: 768,
    scrollX: 0,
    scrollY: 0,
    scrollWidth: 1024,
    scrollHeight: 768,
    devicePixelRatio: 1,
    isTouch: false,
    orientation: 'landscape',
    safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
  },
  scrollContainer: null,
  portal: null,
  zIndex: {
    zIndex: 0,
    layer: 'base',
    stackingContextRoot: null,
    createsStackingContext: false,
    orderInLayer: 0,
    layerCount: 0,
  },
  isInitialized: false,
  isSSR: typeof window === 'undefined',
  contextId: 'default',
  lastUpdated: 0,
};

/**
 * React context for DOM context state.
 */
export const DOMContextReactContext = createContext<DOMContext>(defaultDOMContext);

/**
 * React context for DOM context update function.
 */
export const DOMContextUpdateContext = createContext<(() => void) | null>(null);

// ============================================================================
// Context ID Generation
// ============================================================================

let contextIdCounter = 0;

function generateContextId(): string {
  return `dom-ctx-${++contextIdCounter}-${Date.now()}`;
}

// ============================================================================
// DOMContextProvider Component
// ============================================================================

/**
 * Provides DOM context to descendant components.
 *
 * @remarks
 * This is the main provider component that should wrap your application
 * or the parts of your application that need DOM context awareness.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <DOMContextProvider>
 *   <App />
 * </DOMContextProvider>
 *
 * // With options
 * <DOMContextProvider
 *   updateDebounceMs={100}
 *   trackScrollContainers={true}
 *   onContextUpdate={(ctx) => console.log('Context updated:', ctx)}
 * >
 *   <App />
 * </DOMContextProvider>
 * ```
 */
export function DOMContextProvider({
  children,
  className,
  style,
  initialViewport,
  updateDebounceMs = DEFAULT_TRACKING_CONFIG.debounceMs,
  trackScrollContainers = true,
  trackZIndex = true,
  onContextUpdate,
  'data-testid': testId,
}: DOMContextProviderProps): React.JSX.Element {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const contextIdRef = useRef<string>(generateContextId());
  const rafHandleRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSSR = typeof window === 'undefined';

  // State
  const [context, setContext] = useState<DOMContext>(() => ({
    ...defaultDOMContext,
    viewport: initialViewport
      ? { ...defaultDOMContext.viewport, ...initialViewport }
      : defaultDOMContext.viewport,
    contextId: contextIdRef.current,
    isSSR,
  }));

  /**
   * Computes the full DOM context.
   */
  const computeContext = useCallback((): DOMContext => {
    if (isSSR || !containerRef.current) {
      return {
        ...defaultDOMContext,
        contextId: contextIdRef.current,
        isSSR,
        isInitialized: false,
      };
    }

    const element = containerRef.current;
    const domTracker = getDOMContextTracker();
    const viewportTracker = getViewportTracker();
    const zIndexManager = getZIndexManager();

    // Get ancestors
    const ancestors: readonly LayoutAncestor[] = domTracker.getAncestry(element);

    // Get viewport
    const viewport: ViewportInfo = viewportTracker.getViewport();

    // Get scroll container
    let scrollContainer: ScrollContainer | null = null;
    if (trackScrollContainers) {
      const scrollTracker = findScrollContainer(element);
      if (scrollTracker) {
        scrollContainer = scrollTracker.getState();
      }
    }

    // Get portal context
    const portalManager = getPortalContextManager();
    const portal: PortalContext | null = portalManager.getContextForElement(element);

    // Get z-index context
    let zIndex: ZIndexContext;
    if (trackZIndex) {
      zIndex = zIndexManager.getZIndexContext(element);
    } else {
      zIndex = defaultDOMContext.zIndex;
    }

    return {
      ancestors,
      viewport,
      scrollContainer,
      portal,
      zIndex,
      isInitialized: true,
      isSSR: false,
      contextId: contextIdRef.current,
      lastUpdated: Date.now(),
    };
  }, [isSSR, trackScrollContainers, trackZIndex]);

  /**
   * Updates context with debouncing.
   */
  const updateContext = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (rafHandleRef.current) {
        cancelAnimationFrame(rafHandleRef.current);
      }

      rafHandleRef.current = requestAnimationFrame(() => {
        const newContext = computeContext();
        setContext(newContext);
        onContextUpdate?.(newContext);
        rafHandleRef.current = null;
      });

      debounceTimerRef.current = null;
    }, updateDebounceMs);
  }, [computeContext, updateDebounceMs, onContextUpdate]);

  /**
   * Forces immediate context update (bypasses debounce).
   */
  const forceUpdate = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (rafHandleRef.current) {
      cancelAnimationFrame(rafHandleRef.current);
      rafHandleRef.current = null;
    }

    const newContext = computeContext();
    setContext(newContext);
    onContextUpdate?.(newContext);
  }, [computeContext, onContextUpdate]);

  // Initialize context on mount
  useEffect(() => {
    if (isSSR) {
      return;
    }

    // Initial context computation
    forceUpdate();

    // Subscribe to viewport changes
    const viewportTracker = getViewportTracker();
    const unsubscribeViewport = viewportTracker.onViewportChange(() => {
      updateContext();
    });

    // Set up resize observer
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateContext();
      });
      resizeObserver.observe(containerRef.current);
    }

    // Set up mutation observer
    let mutationObserver: MutationObserver | null = null;
    if (containerRef.current) {
      mutationObserver = new MutationObserver(() => {
        updateContext();
      });
      mutationObserver.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
    }

    // Cleanup
    return () => {
      unsubscribeViewport();
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (rafHandleRef.current) {
        cancelAnimationFrame(rafHandleRef.current);
      }
    };
  }, [isSSR, forceUpdate, updateContext]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => context, [context]);

  return (
    <DOMContextReactContext.Provider value={contextValue}>
      <DOMContextUpdateContext.Provider value={forceUpdate}>
        <div
          ref={containerRef}
          className={className}
          style={style}
          data-testid={testId}
          data-dom-context-root={contextIdRef.current}
        >
          {children}
        </div>
      </DOMContextUpdateContext.Provider>
    </DOMContextReactContext.Provider>
  );
}

// ============================================================================
// Consumer Components
// ============================================================================

/**
 * Props for DOMContextConsumer render prop component.
 */
export interface DOMContextConsumerProps {
  children: (context: DOMContext) => ReactNode;
}

/**
 * Render prop component for consuming DOM context.
 *
 * @example
 * ```tsx
 * <DOMContextConsumer>
 *   {(context) => (
 *     <div>
 *       Viewport: {context.viewport.width}x{context.viewport.height}
 *     </div>
 *   )}
 * </DOMContextConsumer>
 * ```
 */
export function DOMContextConsumer({ children }: DOMContextConsumerProps): React.JSX.Element {
  const context = useContext(DOMContextReactContext);
  return <>{children(context)}</>;
}

// ============================================================================
// Hook Exports
// ============================================================================

/**
 * Hook to access the full DOM context.
 *
 * @returns Current DOMContext
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const context = useDOMContextValue();
 *   return <div>Initialized: {context.isInitialized}</div>;
 * }
 * ```
 */
export function useDOMContextValue(): DOMContext {
  return useContext(DOMContextReactContext);
}

/**
 * Hook to get the context update function.
 *
 * @returns Update function or null
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const refresh = useDOMContextRefresh();
 *   return <button onClick={() => refresh?.()}>Refresh</button>;
 * }
 * ```
 */
export function useDOMContextRefresh(): (() => void) | null {
  return useContext(DOMContextUpdateContext);
}

// ============================================================================
// Higher-Order Component
// ============================================================================

/**
 * Props injected by withDOMContext HOC.
 */
export interface WithDOMContextProps {
  domContext: DOMContext;
}

/**
 * Higher-order component that injects DOM context as a prop.
 *
 * @param Component - Component to wrap
 * @returns Wrapped component with DOM context
 *
 * @example
 * ```tsx
 * interface MyComponentProps extends WithDOMContextProps {
 *   title: string;
 * }
 *
 * function MyComponent({ title, domContext }: MyComponentProps) {
 *   return (
 *     <div>
 *       {title} - {domContext.viewport.width}px
 *     </div>
 *   );
 * }
 *
 * export default withDOMContext(MyComponent);
 * ```
 */
export function withDOMContext<P extends WithDOMContextProps>(
  Component: React.ComponentType<P>
): React.ComponentType<Omit<P, 'domContext'>> {
  const displayName = Component.displayName || Component.name || 'Component';

  const WrappedComponent = (props: Omit<P, 'domContext'>) => {
    const domContext = useDOMContextValue();
    return <Component {...(props as P)} domContext={domContext} />;
  };

  WrappedComponent.displayName = `withDOMContext(${displayName})`;

  return WrappedComponent;
}

// ============================================================================
// Nested Provider
// ============================================================================

/**
 * Props for NestedDOMContextProvider.
 */
export interface NestedDOMContextProviderProps extends Omit<DOMContextProviderProps, 'initialViewport'> {
  /** Whether to inherit from parent context */
  inheritParent?: boolean;
}

/**
 * Nested DOM context provider that can optionally inherit from parent.
 *
 * @remarks
 * Use this when you need a sub-tree to have its own DOM context
 * while optionally inheriting some state from the parent context.
 *
 * @example
 * ```tsx
 * <DOMContextProvider>
 *   <NestedDOMContextProvider inheritParent>
 *     <MyComponent />
 *   </NestedDOMContextProvider>
 * </DOMContextProvider>
 * ```
 */
export function NestedDOMContextProvider({
  children,
  inheritParent = true,
  ...props
}: NestedDOMContextProviderProps): React.JSX.Element {
  const parentContext = useDOMContextValue();

  // If inheriting and parent is initialized, merge viewport
  const initialViewport = inheritParent && parentContext.isInitialized
    ? parentContext.viewport
    : undefined;

  return (
    <DOMContextProvider {...props} initialViewport={initialViewport}>
      {children}
    </DOMContextProvider>
  );
}

// ============================================================================
// Selector Hook
// ============================================================================

/**
 * Hook to select a specific part of DOM context with memoization.
 *
 * @param selector - Selector function
 * @returns Selected value
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const viewport = useDOMContextSelector((ctx) => ctx.viewport);
 *   const isInitialized = useDOMContextSelector((ctx) => ctx.isInitialized);
 *
 *   return <div>Width: {viewport.width}</div>;
 * }
 * ```
 */
export function useDOMContextSelector<T>(
  selector: (context: DOMContext) => T
): T {
  const context = useDOMContextValue();
  return useMemo(() => selector(context), [context, selector]);
}

// ============================================================================
// Default Export
// ============================================================================

export default DOMContextProvider;


