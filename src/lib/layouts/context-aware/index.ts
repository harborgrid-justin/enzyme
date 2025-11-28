/**
 * @fileoverview Context & DOM Aware Layout System - Main Barrel Export
 *
 * A comprehensive React library for DOM-aware layouts that provides:
 * - DOM ancestry tracking and propagation
 * - Viewport-relative positioning and visibility tracking
 * - Scroll container awareness and coordination
 * - Portal context bridging across boundaries
 * - Z-index management system
 *
 * Architecture Overview:
 * ---------------------
 * The system is built on several core layers:
 *
 * 1. **Core Systems** (dom-context, viewport-awareness, scroll-tracker, portal-bridge, z-index-manager)
 *    - Pure TypeScript classes for DOM tracking
 *    - Singleton pattern for global state
 *    - WeakMap caching for memory efficiency
 *    - Batched updates via RAF for performance
 *
 * 2. **React Context** (DOMContextProvider)
 *    - Provides DOM context to React tree
 *    - Automatic updates on layout changes
 *    - SSR-compatible with graceful degradation
 *
 * 3. **Context-Aware Components** (ContextAwareBox, PortalBridge, ScrollAwareContainer, ViewportAnchor)
 *    - Ready-to-use components with context awareness
 *    - Specialized variants for common patterns
 *
 * 4. **Hooks** (useDOMContext, useLayoutAncestry, useViewportPosition, etc.)
 *    - Fine-grained access to specific context aspects
 *    - Optimized for minimal re-renders
 *
 * @example
 * ```tsx
 * // Basic usage
 * import {
 *   DOMContextProvider,
 *   ContextAwareBox,
 *   useDOMContext,
 *   useLayoutAncestry,
 * } from '@/lib/layouts/context-aware';
 *
 * function App() {
 *   return (
 *     <DOMContextProvider>
 *       <Layout />
 *     </DOMContextProvider>
 *   );
 * }
 *
 * function Layout() {
 *   const { ancestors } = useLayoutAncestry();
 *   const isInFlex = ancestors.some(a => a.layoutType === 'flex');
 *
 *   return (
 *     <ContextAwareBox layoutHint="flex">
 *       <ResponsiveContent />
 *     </ContextAwareBox>
 *   );
 * }
 * ```
 *
 * @module layouts/context-aware
 * @author Agent 4 - PhD Context Systems Expert
 * @version 1.0.0
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Layout types
  LayoutType,
  PositionType,
  OverflowType,
  FlexDirection,
  GridAutoFlow,

  // Dimension types
  DimensionValue,
  DimensionBounds,
  LayoutConstraints,
  ComputedBounds,

  // Ancestor types
  LayoutAncestor,
  FlexContainerProperties,
  GridContainerProperties,

  // Viewport types
  VisibilityState,
  ScrollDirection,
  ViewportInfo,
  ViewportPosition,

  // Scroll types
  ScrollContainer,
  StickyState,

  // Portal types
  PortalContext,
  DOMContextSnapshot,

  // Z-index types
  ZIndexLayer,
  ZIndexContext,

  // Main context type
  DOMContext,

  // Component props
  ContextAwareComponentProps,
  DOMContextProviderProps,
  ContextAwareBoxProps,
  PortalBridgeProps,
  ScrollAwareContainerProps,
  ViewportAnchorProps,

  // Hook return types
  UseDOMContextReturn,
  UseLayoutAncestryReturn,
  UseViewportPositionReturn,
  UseScrollContextReturn,
  UsePortalContextReturn,

  // Event types
  DOMContextChangeEvent,
  ScrollEventDetail,

  // Configuration types
  ContextTrackingConfig,
} from './types';

// Type guards and constants
export {
  Z_INDEX_LAYERS,
  DEFAULT_TRACKING_CONFIG,
  isDefined,
  isLayoutType,
  isPositionType,
  isScrollContainer,
} from './types';

// ============================================================================
// Core System Exports
// ============================================================================

// DOM Context Tracker
export {
  DOMContextTracker,
  getDOMContextTracker,
  findAncestorByType,
  findScrollContainerAncestor,
  findContainingBlockAncestor,
  computeInheritedConstraints,
  isWithinLayoutType,
  getLayoutDepth,
} from './dom-context';

// Viewport Awareness
export {
  ViewportTracker,
  getViewportTracker,
  getViewport,
  onViewportChange,
  isElementInViewport,
  getViewportPosition,
  getDistanceFromViewportCenter,
  getOptimalScrollPosition,
  type ViewportChangeCallback,
  type VisibilityChangeCallback,
  type VisibilityObserverOptions,
} from './viewport-awareness';

// Scroll Tracker
export {
  ScrollTracker,
  ScrollContainerRegistry,
  getScrollContainerRegistry,
  findScrollContainer,
  createScrollTracker,
  type ScrollCallback,
  type ScrollEdgeCallback,
  type StickyCallback,
  type ScrollTrackingOptions,
} from './scroll-tracker';

// Portal Bridge
export {
  PortalContextManager,
  getPortalContextManager,
  createPortalContext,
  destroyPortalContext,
  getPortalContextForElement,
  isInPortal,
  getPortalHierarchy,
  type PortalContextOptions,
  type PortalLifecycleCallback,
  type BridgedEventHandler,
} from './portal-bridge';

// Z-Index Manager
export {
  ZIndexManager,
  getZIndexManager,
  registerZIndex,
  unregisterZIndex,
  getLayerZIndex,
  bringToFront,
  sendToBack,
  type ZIndexRegistration,
  type ZIndexRegistrationOptions,
  type ZIndexChangeCallback,
} from './z-index-manager';

// ============================================================================
// React Component Exports
// ============================================================================

// DOM Context Provider
export {
  DOMContextProvider,
  DOMContextReactContext,
  DOMContextUpdateContext,
  DOMContextConsumer,
  useDOMContextValue,
  useDOMContextRefresh,
  withDOMContext,
  NestedDOMContextProvider,
  useDOMContextSelector,
  type DOMContextConsumerProps,
  type WithDOMContextProps,
  type NestedDOMContextProviderProps,
} from './DOMContextProvider';

// Context-Aware Box
export {
  ContextAwareBox,
  FlexBox,
  GridBox,
  type PolymorphicContextAwareBoxProps,
  type BoxContext,
  type OnContextReadyCallback,
  type FlexBoxProps,
  type GridBoxProps,
} from './ContextAwareBox';

// Portal Bridge Component
export {
  PortalBridge,
  usePortalBridgeContext,
  ModalPortal,
  TooltipPortal,
  PopoverPortal,
  type ModalPortalProps,
  type TooltipPortalProps,
  type PopoverPortalProps,
} from './PortalBridge';

// Scroll-Aware Container
export {
  ScrollAwareContainer,
  useScrollContainerContext,
  useScrollControl,
  type ExtendedScrollAwareContainerProps,
} from './ScrollAwareContainer';

// Viewport Anchor
export {
  ViewportAnchor,
  LazyLoad,
  StickyHeader,
  ScrollTrigger,
  type ExtendedViewportAnchorProps,
  type LazyLoadProps,
  type StickyHeaderProps,
  type ScrollTriggerProps,
} from './ViewportAnchor';

// ============================================================================
// Hook Exports
// ============================================================================

// All hooks from the hooks directory
export {
  // DOM Context hooks
  useDOMContext,
  useDOMContextWithElement,
  useContextSelector,
  useContextEffect,
  type DOMContextSelector,

  // Layout Ancestry hooks
  useLayoutAncestry,
  useFlexAncestor,
  useGridAncestor,
  useScrollContainerAncestor,
  useContainingBlockAncestor,
  useIsInFlex,
  useIsInGrid,
  useIsInInline,
  useAvailableWidth,
  useAvailableHeight,
  useParentAspectRatio,

  // Viewport Position hooks
  useViewportPosition,
  useVisibility,
  useIntersectionRatio,
  useDistanceFromViewport,
  useDistanceFromCenter,
  useViewport,
  useViewportDimensions,
  useViewportScroll,
  useIsTouch,
  useOrientation,
  useSafeAreaInsets,

  // Scroll Context hooks
  useScrollContext,
  useScrollContainer,
  useScrollDirection,
  useScrollProgress,
  useIsScrolling,
  useScrollEdges,
  useScrollPosition,
  useScrollVelocity,
  useScrollToTop,
  useScrollToBottom,
  useScrollIntoView,

  // Portal Context hooks
  usePortalContext,
  useIsInPortal,
  useSourceContext,
  usePortalNestingDepth,
  usePortalHierarchy,
  useZIndexForLayer,
  useZIndexContext,
  useZIndexRegistration,
  useZIndexLayers,
} from './hooks';

// ============================================================================
// Default Export
// ============================================================================

/**
 * Default export providing the main provider component.
 */
export { DOMContextProvider as default } from './DOMContextProvider';
