/**
 * @fileoverview Context-Aware Layout Hooks Barrel Export
 *
 * This module exports all hooks for the Context & DOM Aware Layout system.
 *
 * @module layouts/context-aware/hooks
 * @author Agent 4 - PhD Context Systems Expert
 * @version 1.0.0
 */

// ============================================================================
// DOM Context Hooks
// ============================================================================

export {
  useDOMContext,
  useDOMContextWithElement,
  useContextSelector,
  useContextEffect,
  type DOMContextSelector,
} from './useDOMContext';

// ============================================================================
// Layout Ancestry Hooks
// ============================================================================

export {
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
} from './useLayoutAncestry';

// ============================================================================
// Viewport Position Hooks
// ============================================================================

export {
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
} from './useViewportPosition';

// ============================================================================
// Scroll Context Hooks
// ============================================================================

export {
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
} from './useScrollContext';

// ============================================================================
// Portal Context Hooks
// ============================================================================

export {
  usePortalContext,
  useIsInPortal,
  useSourceContext,
  usePortalNestingDepth,
  usePortalHierarchy,
  useZIndexForLayer,
  useZIndexContext,
  useZIndexRegistration,
  useZIndexLayers,
} from './usePortalContext';
