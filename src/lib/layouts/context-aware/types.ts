/**
 * @fileoverview Comprehensive type definitions for Context & DOM Aware Layout System
 *
 * This module defines all TypeScript types, interfaces, and type utilities used
 * throughout the context-aware layout system. The types are designed to be:
 * - Strictly typed with no implicit `any`
 * - Composable through discriminated unions
 * - Self-documenting with comprehensive JSDoc
 * - Performance-oriented with readonly modifiers where appropriate
 *
 * @module layouts/context-aware/types
 * @author Agent 4 - PhD Context Systems Expert
 * @version 1.0.0
 */

import type React from 'react';
import type { CSSProperties, RefObject, ReactNode } from 'react';

// ============================================================================
// Layout Type Definitions
// ============================================================================

/**
 * Represents the CSS display layout type of an element.
 * Used for layout ancestry tracking and constraint inheritance.
 *
 * @remarks
 * The layout type determines how child elements are positioned and
 * how constraints are inherited through the DOM tree.
 */
export type LayoutType =
  | 'grid'
  | 'flex'
  | 'block'
  | 'inline'
  | 'inline-block'
  | 'inline-flex'
  | 'inline-grid'
  | 'table'
  | 'table-row'
  | 'table-cell'
  | 'contents'
  | 'none';

/**
 * Represents CSS position property values.
 */
export type PositionType = 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';

/**
 * Represents CSS overflow property values.
 */
export type OverflowType = 'visible' | 'hidden' | 'scroll' | 'auto' | 'clip';

/**
 * Flex direction for flex containers.
 */
export type FlexDirection = 'row' | 'row-reverse' | 'column' | 'column-reverse';

/**
 * Grid auto flow direction for grid containers.
 */
export type GridAutoFlow = 'row' | 'column' | 'dense' | 'row dense' | 'column dense';

// ============================================================================
// Dimension and Constraint Types
// ============================================================================

/**
 * Represents a dimension value that can be a number (pixels) or CSS string.
 */
export type DimensionValue = number | string | 'auto' | 'inherit' | 'initial';

/**
 * Immutable dimension bounds for layout constraints.
 */
export interface DimensionBounds {
  readonly min: number;
  readonly max: number;
  readonly current: number;
}

/**
 * Comprehensive layout constraints for an element.
 *
 * @remarks
 * These constraints are inherited and transformed through the layout
 * ancestry chain, allowing child elements to understand their available space.
 */
export interface LayoutConstraints {
  /** Width constraints in pixels */
  readonly width: DimensionBounds;
  /** Height constraints in pixels */
  readonly height: DimensionBounds;
  /** Whether the element can grow in the main axis */
  readonly canGrow: boolean;
  /** Whether the element can shrink in the main axis */
  readonly canShrink: boolean;
  /** Aspect ratio constraint (width / height), null if unconstrained */
  readonly aspectRatio: number | null;
  /** Whether the element is absolutely positioned (breaks flow) */
  readonly isAbsolutelyPositioned: boolean;
  /** Whether the element creates a new stacking context */
  readonly createsStackingContext: boolean;
}

/**
 * Represents the computed bounding box of an element.
 * Extends DOMRect with additional computed properties.
 */
export interface ComputedBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
  /** Content box dimensions (excluding padding and border) */
  readonly contentBox: {
    readonly width: number;
    readonly height: number;
  };
  /** Padding box dimensions (including padding, excluding border) */
  readonly paddingBox: {
    readonly width: number;
    readonly height: number;
  };
  /** Border box dimensions (including padding and border) */
  readonly borderBox: {
    readonly width: number;
    readonly height: number;
  };
}

// ============================================================================
// Layout Ancestor Types
// ============================================================================

/**
 * Represents a single ancestor in the layout chain.
 *
 * @remarks
 * Layout ancestors provide context about the parent elements' layout
 * types, dimensions, and constraints. This enables child components
 * to make intelligent layout decisions.
 */
export interface LayoutAncestor {
  /** Unique identifier for the ancestor element */
  readonly id: string;
  /** Reference to the actual DOM element */
  readonly element: Element;
  /** The CSS display layout type */
  readonly layoutType: LayoutType;
  /** The CSS position type */
  readonly positionType: PositionType;
  /** Computed bounding box */
  readonly bounds: ComputedBounds;
  /** Layout constraints for children */
  readonly constraints: LayoutConstraints;
  /** Depth in the layout ancestry (0 = closest parent) */
  readonly depth: number;
  /** Whether this ancestor is a scroll container */
  readonly isScrollContainer: boolean;
  /** Whether this ancestor creates a containing block for absolute positioning */
  readonly isContainingBlock: boolean;
  /** Flex-specific properties (only present for flex containers) */
  readonly flexProperties?: FlexContainerProperties;
  /** Grid-specific properties (only present for grid containers) */
  readonly gridProperties?: GridContainerProperties;
}

/**
 * Properties specific to flex containers.
 */
export interface FlexContainerProperties {
  readonly direction: FlexDirection;
  readonly wrap: 'nowrap' | 'wrap' | 'wrap-reverse';
  readonly justifyContent: string;
  readonly alignItems: string;
  readonly alignContent: string;
  readonly gap: number;
  readonly rowGap: number;
  readonly columnGap: number;
}

/**
 * Properties specific to grid containers.
 */
export interface GridContainerProperties {
  readonly templateColumns: string;
  readonly templateRows: string;
  readonly autoFlow: GridAutoFlow;
  readonly gap: number;
  readonly rowGap: number;
  readonly columnGap: number;
  readonly templateAreas: string | null;
}

// ============================================================================
// Viewport Types
// ============================================================================

/**
 * Visibility states for elements relative to the viewport.
 */
export type VisibilityState =
  | 'visible' // Fully visible in viewport
  | 'partial' // Partially visible
  | 'hidden' // Not visible (above/below viewport)
  | 'obscured' // In viewport but covered by another element
  | 'unknown'; // State cannot be determined (SSR)

/**
 * Scroll direction for tracking scroll behavior.
 */
export type ScrollDirection = 'up' | 'down' | 'left' | 'right' | 'none';

/**
 * Comprehensive viewport information.
 *
 * @remarks
 * Provides a complete picture of the viewport state including
 * dimensions, scroll position, and device characteristics.
 */
export interface ViewportInfo {
  /** Viewport width in pixels */
  readonly width: number;
  /** Viewport height in pixels */
  readonly height: number;
  /** Current horizontal scroll position */
  readonly scrollX: number;
  /** Current vertical scroll position */
  readonly scrollY: number;
  /** Maximum horizontal scroll distance */
  readonly scrollWidth: number;
  /** Maximum vertical scroll distance */
  readonly scrollHeight: number;
  /** Device pixel ratio for high-DPI displays */
  readonly devicePixelRatio: number;
  /** Whether the device supports touch input */
  readonly isTouch: boolean;
  /** Current orientation ('portrait' | 'landscape') */
  readonly orientation: 'portrait' | 'landscape';
  /** Safe area insets for notched displays */
  readonly safeAreaInsets: {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
  };
}

/**
 * Position of an element relative to the viewport.
 */
export interface ViewportPosition {
  /** Element's bounds relative to viewport */
  readonly bounds: ComputedBounds;
  /** Visibility state in viewport */
  readonly visibility: VisibilityState;
  /** Intersection ratio with viewport (0-1) */
  readonly intersectionRatio: number;
  /** Distance from viewport edges */
  readonly distanceFromViewport: {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
  };
  /** Whether element is above, below, or within viewport */
  readonly relativePosition: 'above' | 'within' | 'below' | 'left' | 'right';
  /** Timestamp of last position update */
  readonly lastUpdated: number;
}

// ============================================================================
// Scroll Container Types
// ============================================================================

/**
 * Scroll container detection and state information.
 */
export interface ScrollContainer {
  /** Reference to the scroll container element */
  readonly element: Element;
  /** Unique identifier */
  readonly id: string;
  /** Current scroll position */
  readonly scrollPosition: {
    readonly x: number;
    readonly y: number;
  };
  /** Total scrollable dimensions */
  readonly scrollDimensions: {
    readonly width: number;
    readonly height: number;
  };
  /** Visible dimensions (container size) */
  readonly visibleDimensions: {
    readonly width: number;
    readonly height: number;
  };
  /** Overflow configuration */
  readonly overflow: {
    readonly x: OverflowType;
    readonly y: OverflowType;
  };
  /** Whether currently scrolling */
  readonly isScrolling: boolean;
  /** Current scroll direction */
  readonly scrollDirection: ScrollDirection;
  /** Scroll velocity for momentum detection */
  readonly scrollVelocity: {
    readonly x: number;
    readonly y: number;
  };
  /** Scroll progress (0-1) for each axis */
  readonly scrollProgress: {
    readonly x: number;
    readonly y: number;
  };
  /** Whether scroll has reached edges */
  readonly atEdge: {
    readonly top: boolean;
    readonly right: boolean;
    readonly bottom: boolean;
    readonly left: boolean;
  };
}

/**
 * Sticky element coordination state.
 */
export interface StickyState {
  /** Whether the element is currently stuck */
  readonly isStuck: boolean;
  /** Which edge the element is stuck to */
  readonly stuckTo: 'top' | 'bottom' | 'left' | 'right' | null;
  /** Original position before sticking */
  readonly originalPosition: {
    readonly top: number;
    readonly left: number;
  };
  /** Current offset from stuck edge */
  readonly offset: number;
  /** Other sticky elements in the same container */
  readonly siblingStickies: ReadonlyArray<{
    readonly id: string;
    readonly isStuck: boolean;
    readonly offset: number;
  }>;
}

// ============================================================================
// Portal Context Types
// ============================================================================

/**
 * Portal context for maintaining state across portal boundaries.
 */
export interface PortalContext {
  /** The portal root element */
  readonly portalRoot: Element;
  /** Original context before portal */
  readonly sourceContext: DOMContextSnapshot;
  /** Z-index layer for this portal */
  readonly layer: number;
  /** Whether to bridge events back to source */
  readonly bridgeEvents: boolean;
  /** Portal nesting depth */
  readonly nestingDepth: number;
  /** Parent portal context (if nested) */
  readonly parentPortal: PortalContext | null;
  /** Unique identifier for this portal instance */
  readonly portalId: string;
}

/**
 * Snapshot of DOM context for portal bridging.
 */
export interface DOMContextSnapshot {
  /** Layout ancestry at snapshot time */
  readonly ancestors: ReadonlyArray<LayoutAncestor>;
  /** Viewport info at snapshot time */
  readonly viewport: ViewportInfo;
  /** Scroll container at snapshot time */
  readonly scrollContainer: ScrollContainer | null;
  /** Z-index context at snapshot time */
  readonly zIndex: ZIndexContext;
  /** Timestamp of snapshot */
  readonly timestamp: number;
}

// ============================================================================
// Z-Index Management Types
// ============================================================================

/**
 * Z-index layer presets for consistent stacking.
 */
export type ZIndexLayer =
  | 'base' // 0 - Normal content
  | 'dropdown' // 1000 - Dropdowns, selects
  | 'sticky' // 1100 - Sticky elements
  | 'fixed' // 1200 - Fixed elements
  | 'modalBackdrop' // 1300 - Modal backdrops
  | 'modal' // 1400 - Modal dialogs
  | 'popover' // 1500 - Popovers, tooltips
  | 'toast' // 1600 - Toast notifications
  | 'tooltip' // 1700 - Tooltips (highest priority)
  | 'max'; // 9999 - Maximum (use sparingly)

/**
 * Z-index values for each layer.
 */
export const Z_INDEX_LAYERS: Record<ZIndexLayer, number> = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  toast: 1600,
  tooltip: 1700,
  max: 9999,
} as const;

/**
 * Z-index context for stacking management.
 */
export interface ZIndexContext {
  /** Current z-index value */
  readonly zIndex: number;
  /** Layer this element belongs to */
  readonly layer: ZIndexLayer;
  /** Stacking context root element */
  readonly stackingContextRoot: Element | null;
  /** Whether this element creates a new stacking context */
  readonly createsStackingContext: boolean;
  /** Relative order within the same layer */
  readonly orderInLayer: number;
  /** Total elements in this layer */
  readonly layerCount: number;
}

// ============================================================================
// Complete DOM Context Type
// ============================================================================

/**
 * Complete DOM context combining all context aspects.
 *
 * @remarks
 * This is the main type that components receive from the context provider.
 * It provides comprehensive information about the element's DOM environment.
 *
 * @example
 * ```tsx
 * const context = useDOMContext();
 * if (context.ancestors[0]?.layoutType === 'flex') {
 *   // Parent is a flex container, adjust behavior
 * }
 * ```
 */
export interface DOMContext {
  /** Complete layout ancestry chain */
  readonly ancestors: ReadonlyArray<LayoutAncestor>;
  /** Current viewport information */
  readonly viewport: ViewportInfo;
  /** Nearest scroll container (null if none) */
  readonly scrollContainer: ScrollContainer | null;
  /** Portal context (null if not in portal) */
  readonly portal: PortalContext | null;
  /** Z-index stacking context */
  readonly zIndex: ZIndexContext;
  /** Whether context is fully initialized */
  readonly isInitialized: boolean;
  /** Whether running in SSR mode */
  readonly isSSR: boolean;
  /** Unique context instance ID */
  readonly contextId: string;
  /** Timestamp of last context update */
  readonly lastUpdated: number;
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Base props for context-aware components.
 */
export interface ContextAwareComponentProps {
  /** React children */
  children?: ReactNode;
  /** Optional CSS class name */
  className?: string;
  /** Optional inline styles */
  style?: CSSProperties;
  /** Optional test ID for testing */
  'data-testid'?: string;
}

/**
 * Props for DOMContextProvider component.
 */
export interface DOMContextProviderProps extends ContextAwareComponentProps {
  /** Initial viewport info for SSR */
  initialViewport?: Partial<ViewportInfo>;
  /** Debounce time for context updates (ms) */
  updateDebounceMs?: number;
  /** Whether to track scroll containers */
  trackScrollContainers?: boolean;
  /** Whether to track z-index contexts */
  trackZIndex?: boolean;
  /** Callback when context updates */
  onContextUpdate?: (context: DOMContext) => void;
}

/**
 * Props for ContextAwareBox component.
 */
export interface ContextAwareBoxProps extends ContextAwareComponentProps {
  /** HTML element to render */
  as?: keyof React.JSX.IntrinsicElements;
  /** Ref to the underlying element */
  ref?: RefObject<HTMLElement>;
  /** Whether to provide context to children */
  provideContext?: boolean;
  /** Callback with DOM context */
  onContextReady?: (context: DOMContext) => void;
  /** Layout hint for children */
  layoutHint?: LayoutType;
}

/**
 * Props for PortalBridge component.
 */
export interface PortalBridgeProps extends ContextAwareComponentProps {
  /** Target element or selector for portal */
  target?: Element | string;
  /** Z-index layer for portal */
  layer?: ZIndexLayer;
  /** Whether to bridge events to source context */
  bridgeEvents?: boolean;
  /** Whether to preserve scroll position on mount */
  preserveScrollPosition?: boolean;
  /** Callback when portal is mounted */
  onPortalMount?: (portal: PortalContext) => void;
  /** Callback when portal is unmounted */
  onPortalUnmount?: () => void;
  /**
   * Whether to render children inline as fallback when portal cannot be created.
   * This prevents blank pages when React environment issues occur.
   * @default true
   */
  fallbackToInline?: boolean;
  /**
   * Custom fallback content to render when portal fails.
   * If not provided and fallbackToInline is true, children will render inline.
   */
  fallback?: React.ReactNode;
  /**
   * Callback when portal initialization fails.
   */
  onPortalError?: (error: Error) => void;
}

/**
 * Props for ScrollAwareContainer component.
 */
export interface ScrollAwareContainerProps extends ContextAwareComponentProps {
  /** Whether to virtualize content */
  virtualize?: boolean;
  /** Item height for virtualization */
  itemHeight?: number;
  /** Overscan count for virtualization */
  overscan?: number;
  /** Callback on scroll */
  onScroll?: (scrollState: ScrollContainer) => void;
  /** Callback when scroll reaches edge */
  onScrollEdge?: (edge: 'top' | 'right' | 'bottom' | 'left') => void;
  /** Whether to hide scrollbar */
  hideScrollbar?: boolean;
  /** Scroll behavior ('auto' | 'smooth') */
  scrollBehavior?: 'auto' | 'smooth';
}

/**
 * Props for ViewportAnchor component.
 */
export interface ViewportAnchorProps extends ContextAwareComponentProps {
  /** Anchor point on element */
  anchor?: 'top' | 'center' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Sticky behavior configuration */
  sticky?: {
    /** Whether sticky is enabled */
    enabled: boolean;
    /** Offset from edge when stuck */
    offset?: number;
    /** Which edge to stick to */
    edge?: 'top' | 'bottom';
    /** Z-index when stuck */
    zIndex?: number;
  };
  /** Callback when visibility changes */
  onVisibilityChange?: (visibility: VisibilityState) => void;
  /** Callback when position changes */
  onPositionChange?: (position: ViewportPosition) => void;
  /** Intersection threshold for visibility callbacks */
  intersectionThreshold?: number | number[];
}

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * Return type for useDOMContext hook.
 */
export interface UseDOMContextReturn {
  /** Current DOM context */
  context: DOMContext;
  /** Whether context is loading */
  isLoading: boolean;
  /** Ref to attach to observed element */
  ref: RefObject<HTMLElement | null>;
  /** Force context update */
  refresh: () => void;
}

/**
 * Return type for useLayoutAncestry hook.
 */
export interface UseLayoutAncestryReturn {
  /** Full ancestry chain */
  ancestors: ReadonlyArray<LayoutAncestor>;
  /** Closest ancestor of a specific type */
  findAncestor: (type: LayoutType) => LayoutAncestor | undefined;
  /** Check if in a specific layout type */
  isInLayout: (type: LayoutType) => boolean;
  /** Get constraints from nearest constraining ancestor */
  constraints: LayoutConstraints | null;
  /** Depth in layout tree */
  depth: number;
}

/**
 * Return type for useViewportPosition hook.
 */
export interface UseViewportPositionReturn {
  /** Current viewport position */
  position: ViewportPosition | null;
  /** Whether element is visible */
  isVisible: boolean;
  /** Whether element is fully visible */
  isFullyVisible: boolean;
  /** Current visibility state */
  visibility: VisibilityState;
  /** Ref to attach to observed element */
  ref: RefObject<HTMLElement | null>;
  /** Scroll element into view */
  scrollIntoView: (options?: ScrollIntoViewOptions) => void;
}

/**
 * Return type for useScrollContext hook.
 */
export interface UseScrollContextReturn {
  /** Current scroll container state */
  scrollContainer: ScrollContainer | null;
  /** Whether in a scroll container */
  isInScrollContainer: boolean;
  /** Scroll to specific position */
  scrollTo: (options: { x?: number; y?: number; behavior?: 'auto' | 'smooth' }) => void;
  /** Scroll by offset */
  scrollBy: (options: { x?: number; y?: number; behavior?: 'auto' | 'smooth' }) => void;
  /** Current scroll direction */
  scrollDirection: ScrollDirection;
  /** Current scroll progress (0-1) */
  scrollProgress: { x: number; y: number };
}

/**
 * Return type for usePortalContext hook.
 */
export interface UsePortalContextReturn {
  /** Current portal context */
  portal: PortalContext | null;
  /** Whether inside a portal */
  isInPortal: boolean;
  /** Source context (from before portal) */
  sourceContext: DOMContextSnapshot | null;
  /** Current z-index layer */
  layer: ZIndexLayer;
  /** Get z-index for a layer */
  getLayerZIndex: (layer: ZIndexLayer) => number;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * DOM context change event detail.
 */
export interface DOMContextChangeEvent {
  /** Previous context state */
  previousContext: DOMContext;
  /** New context state */
  newContext: DOMContext;
  /** What triggered the change */
  trigger: 'resize' | 'scroll' | 'mutation' | 'manual' | 'initial';
  /** Timestamp of change */
  timestamp: number;
}

/**
 * Scroll event detail for scroll containers.
 */
export interface ScrollEventDetail {
  /** Scroll container state */
  container: ScrollContainer;
  /** Delta from previous position */
  delta: { x: number; y: number };
  /** Whether scroll is from user interaction */
  isUserScroll: boolean;
  /** Whether scroll is from programmatic action */
  isProgrammaticScroll: boolean;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for context tracking behavior.
 */
export interface ContextTrackingConfig {
  /** Throttle interval for resize/scroll events (ms) */
  throttleMs: number;
  /** Debounce interval for batch updates (ms) */
  debounceMs: number;
  /** Whether to use RAF for updates */
  useRAF: boolean;
  /** Whether to track mutations */
  trackMutations: boolean;
  /** Mutation observer config */
  mutationConfig: MutationObserverInit;
  /** Intersection observer thresholds */
  intersectionThresholds: number[];
  /** Whether to enable debug mode */
  debug: boolean;
}

/**
 * Default context tracking configuration.
 */
export const DEFAULT_TRACKING_CONFIG: ContextTrackingConfig = {
  throttleMs: 16, // ~60fps
  debounceMs: 100,
  useRAF: true,
  trackMutations: true,
  mutationConfig: {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class'],
  },
  intersectionThresholds: [0, 0.25, 0.5, 0.75, 1],
  debug: false,
} as const;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extracts the element type from a ref.
 */
export type RefElement<T> = T extends RefObject<infer E> ? E : never;

/**
 * Makes selected properties required.
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Creates a partial type with some required keys.
 */
export type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>;

/**
 * Deep readonly type.
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Type guard for checking if value is defined.
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard for layout type.
 */
export function isLayoutType(value: string): value is LayoutType {
  return [
    'grid',
    'flex',
    'block',
    'inline',
    'inline-block',
    'inline-flex',
    'inline-grid',
    'table',
    'table-row',
    'table-cell',
    'contents',
    'none',
  ].includes(value);
}

/**
 * Type guard for position type.
 */
export function isPositionType(value: string): value is PositionType {
  return ['static', 'relative', 'absolute', 'fixed', 'sticky'].includes(value);
}

/**
 * Type guard for scroll container.
 */
export function isScrollContainer(element: Element): boolean {
  const style = getComputedStyle(element);
  const { overflowX } = style;
  const { overflowY } = style;
  return (
    overflowX === 'auto' || overflowX === 'scroll' || overflowY === 'auto' || overflowY === 'scroll'
  );
}
