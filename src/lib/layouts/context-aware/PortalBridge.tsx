/**
 * @fileoverview Portal Bridge Component
 *
 * A React component that renders children through a portal while
 * maintaining DOM context from the source location.
 *
 * Features:
 * - Preserves DOM context across portal boundaries
 * - Manages z-index automatically
 * - Supports event bridging back to source
 * - Handles nested portals correctly
 *
 * @module layouts/context-aware/PortalBridge
 * @author Agent 4 - PhD Context Systems Expert
 * @version 1.0.0
 */

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useContext,
} from 'react';
import { PortalBridgeContext } from '../../contexts/PortalBridgeContext';
import { createPortal } from 'react-dom';

import type {
  PortalContext,
  PortalBridgeProps,
  DOMContextSnapshot,
} from './types';
import { Z_INDEX_LAYERS } from './types';
import {
  getPortalContextManager,
  createPortalContext,
  destroyPortalContext,
} from './portal-bridge';
import { getZIndexManager } from './z-index-manager';
import { useDOMContextValue } from './DOMContextProvider';

// ============================================================================
// Portal Context
// ============================================================================

/* @refresh reset */

/**
 * React context for portal state.
 */
/**
 * Hook to access portal context.
 */
export function usePortalBridgeContext(): PortalContext | null {
  const context = useContext(PortalBridgeContext);
  return (context as PortalContext | null) ?? null;
}

// ============================================================================
// PortalBridge Component
// ============================================================================

/**
 * Renders children through a portal while preserving DOM context.
 *
 * @remarks
 * This component creates a React portal but ensures that the
 * DOM context from the source location is available to the
 * portal content. This is useful for modals, tooltips, and
 * other overlay components that need to know about their
 * logical position in the component tree.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <PortalBridge>
 *   <Modal>Content</Modal>
 * </PortalBridge>
 *
 * // With custom target and layer
 * <PortalBridge
 *   target="#modal-root"
 *   layer="modal"
 *   bridgeEvents
 * >
 *   <Modal>Content</Modal>
 * </PortalBridge>
 *
 * // With lifecycle callbacks
 * <PortalBridge
 *   onPortalMount={(portal) => console.log('Mounted:', portal)}
 *   onPortalUnmount={() => console.log('Unmounted')}
 * >
 *   <Tooltip>Content</Tooltip>
 * </PortalBridge>
 * ```
 */
export function PortalBridge({
  children,
  target,
  layer = 'modal',
  bridgeEvents = true,
  preserveScrollPosition = false,
  onPortalMount,
  onPortalUnmount,
  className,
  style,
  'data-testid': testId,
}: PortalBridgeProps): React.JSX.Element | null {
  // Refs
  const sourceRef = useRef<HTMLDivElement>(null);
  const portalContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionRef = useRef<{ x: number; y: number } | null>(null);

  // State
  const [portalContext, setPortalContext] = useState<PortalContext | null>(null);
  const [_portalRoot, setPortalRoot] = useState<Element | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);

  // Get current DOM context
  const domContext = useDOMContextValue();

  // Get parent portal context (for nested portals)
  const parentPortalContext = usePortalBridgeContext();

  // Check if we're in SSR
  const isSSR = typeof window === 'undefined';

  /**
   * Resolves the portal target element.
   */
  const resolveTarget = useCallback((): Element | null => {
    if (isSSR) {
      return null;
    }

    if (target instanceof Element) {
      return target;
    }

    if (typeof target === 'string') {
      return document.querySelector(target);
    }

    // Default: create or find portal root
    let root = document.getElementById('portal-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'portal-root';
      document.body.appendChild(root);
    }
    return root;
  }, [target, isSSR]);

  /**
   * Creates the portal container element.
   */
  const createPortalContainer = useCallback((): HTMLDivElement => {
    const container = document.createElement('div');
    container.setAttribute('data-portal-container', 'true');
    container.setAttribute('data-portal-layer', layer);

    // Apply z-index
    const zIndex = Z_INDEX_LAYERS[layer];
    container.style.cssText = `
      position: relative;
      z-index: ${zIndex};
    `;

    if (className != null && className !== '') {
      container.className = className;
    }

    if (style != null) {
      Object.assign(container.style, style);
    }

    if (testId != null && testId !== '') {
      container.setAttribute('data-testid', testId);
    }

    return container;
  }, [layer, className, style, testId]);

  // Initialize portal
  useEffect(() => {
    if (isSSR) {
      return;
    }

    const root = resolveTarget();
    if (!root) {
      console.warn('[PortalBridge] Could not resolve portal target');
      return;
    }

    setPortalRoot(root);

    // Create portal container
    const container = createPortalContainer();
    portalContainerRef.current = container;
    setPortalContainer(container);
    root.appendChild(container);

    // Save scroll position if preserving
    if (preserveScrollPosition) {
      scrollPositionRef.current = {
        x: window.scrollX,
        y: window.scrollY,
      };
    }

    // Create portal context
    if (sourceRef.current) {
      const ctx = createPortalContext(sourceRef.current, {
        target: container,
        layer,
        bridgeEvents,
        parentPortal: parentPortalContext,
      });

      setPortalContext(ctx);
      setIsReady(true);

      // Register with z-index manager
      const zIndexManager = getZIndexManager();
      zIndexManager.register(container, { layer });

      // Call mount callback
      onPortalMount?.(ctx);
    }

    // Cleanup
    return () => {
      if (portalContainerRef.current && root.contains(portalContainerRef.current)) {
        root.removeChild(portalContainerRef.current);
      }

      if (portalContext) {
        destroyPortalContext(portalContext.portalId);
      }

      // Restore scroll position if needed
      if (preserveScrollPosition && scrollPositionRef.current) {
        window.scrollTo(scrollPositionRef.current.x, scrollPositionRef.current.y);
      }

      onPortalUnmount?.();
    };
  }, [
    isSSR,
    resolveTarget,
    createPortalContainer,
    layer,
    bridgeEvents,
    preserveScrollPosition,
    parentPortalContext,
    onPortalMount,
    onPortalUnmount,
    portalContext,
  ]);

  // Update portal context when DOM context changes
  useEffect(() => {
    if (portalContext && sourceRef.current) {
      const manager = getPortalContextManager();
      manager.refreshSourceContext(portalContext.portalId);
    }
  }, [domContext, portalContext]);

  // Render source marker and portal
  return (
    <>
      {/* Source marker for context capture */}
      <div
        ref={sourceRef}
        data-portal-source="true"
        style={{ display: 'contents' }}
      />

      {/* Portal content */}
      {isReady && portalContainer != null && portalContext != null && (
        <PortalBridgeContext.Provider value={portalContext}>
          {createPortal(
            <PortalContent sourceContext={portalContext.sourceContext}>
              {children}
            </PortalContent>,
            portalContainer
          )}
        </PortalBridgeContext.Provider>
      )}
    </>
  );
}

// ============================================================================
// Portal Content Wrapper
// ============================================================================

/**
 * Props for PortalContent component.
 */
interface PortalContentProps {
  children: React.ReactNode;
  sourceContext: DOMContextSnapshot;
}

/**
 * Wraps portal content and provides source context information.
 */
function PortalContent({ children, sourceContext }: PortalContentProps): React.JSX.Element {
  return (
    <div
      data-portal-content="true"
      data-source-context-time={sourceContext.timestamp}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Convenience Components
// ============================================================================

/**
 * Props for ModalPortal component.
 */
export interface ModalPortalProps extends Omit<PortalBridgeProps, 'layer'> {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Accessible label for the modal */
  ariaLabel?: string;
  /** ID of element that labels the modal */
  ariaLabelledBy?: string;
  /** ID of element that describes the modal */
  ariaDescribedBy?: string;
}

/**
 * Portal specifically configured for modal dialogs.
 * Includes proper accessibility attributes: role="dialog" and aria-modal="true"
 *
 * @example
 * ```tsx
 * <ModalPortal isOpen={isModalOpen} ariaLabel="Confirmation dialog">
 *   <ModalDialog>
 *     <ModalHeader>Title</ModalHeader>
 *     <ModalBody>Content</ModalBody>
 *   </ModalDialog>
 * </ModalPortal>
 * ```
 */
export function ModalPortal({
  isOpen,
  children,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  ...props
}: ModalPortalProps): React.JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <PortalBridge layer="modal" {...props}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
      >
        {children}
      </div>
    </PortalBridge>
  );
}

/**
 * Props for TooltipPortal component.
 */
export interface TooltipPortalProps extends Omit<PortalBridgeProps, 'layer'> {
  /** Whether the tooltip is visible */
  isVisible: boolean;
}

/**
 * Portal specifically configured for tooltips.
 *
 * @example
 * ```tsx
 * <TooltipPortal isVisible={showTooltip}>
 *   <Tooltip position={position}>
 *     Tooltip content
 *   </Tooltip>
 * </TooltipPortal>
 * ```
 */
export function TooltipPortal({
  isVisible,
  children,
  ...props
}: TooltipPortalProps): React.JSX.Element | null {
  if (!isVisible) {
    return null;
  }

  return (
    <PortalBridge layer="tooltip" bridgeEvents={false} {...props}>
      {children}
    </PortalBridge>
  );
}

/**
 * Props for PopoverPortal component.
 */
export interface PopoverPortalProps extends Omit<PortalBridgeProps, 'layer'> {
  /** Whether the popover is open */
  isOpen: boolean;
}

/**
 * Portal specifically configured for popovers.
 *
 * @example
 * ```tsx
 * <PopoverPortal isOpen={isPopoverOpen}>
 *   <Popover>
 *     Popover content
 *   </Popover>
 * </PopoverPortal>
 * ```
 */
export function PopoverPortal({
  isOpen,
  children,
  ...props
}: PopoverPortalProps): React.JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <PortalBridge layer="popover" {...props}>
    {children}
  </PortalBridge>
);
}
