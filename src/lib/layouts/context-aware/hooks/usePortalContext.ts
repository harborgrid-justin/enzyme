/**
 * @fileoverview usePortalContext Hook
 *
 * Provides access to portal context and z-index management.
 *
 * @module layouts/context-aware/hooks/usePortalContext
 * @author Agent 4 - PhD Context Systems Expert
 * @version 1.0.0
 */

import { useCallback, useMemo } from 'react';

import type {
  PortalContext,
  DOMContextSnapshot,
  ZIndexLayer,
  UsePortalContextReturn,
} from '../types';
import { Z_INDEX_LAYERS } from '../types';
import { useDOMContextValue } from '../DOMContextProvider';
import { usePortalBridgeContext } from '../PortalBridge';
// import {
//   getPortalContextManager,
//   getPortalHierarchy,
// } from '../portal-bridge';
import { getZIndexManager, getLayerZIndex } from '../z-index-manager';

// ============================================================================
// usePortalContext Hook
// ============================================================================

/**
 * Hook to access portal context information.
 *
 * @remarks
 * This hook provides information about whether the component is
 * inside a portal, the source context, and z-index management utilities.
 *
 * @returns Portal context information and utilities
 *
 * @example
 * ```tsx
 * function ModalContent() {
 *   const {
 *     portal,
 *     isInPortal,
 *     sourceContext,
 *     layer,
 *     getLayerZIndex,
 *   } = usePortalContext();
 *
 *   return (
 *     <div>
 *       {isInPortal && (
 *         <p>
 *           This is in a portal at z-index layer: {layer}
 *           (z-index: {getLayerZIndex(layer)})
 *         </p>
 *       )}
 *       {sourceContext && (
 *         <p>
 *           Source viewport width: {sourceContext.viewport.width}px
 *         </p>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePortalContext(): UsePortalContextReturn {
  // Try to get context from PortalBridge first
  const bridgeContext = usePortalBridgeContext();

  // Fall back to DOM context
  const domContext = useDOMContextValue();
  const portal = bridgeContext ?? domContext.portal;

  // Get layer z-index function
  const getZIndex = useCallback(
    (layer: ZIndexLayer): number => {
      return getLayerZIndex(layer);
    },
    []
  );

  // Determine current layer
  const layer: ZIndexLayer = useMemo(() => {
    if (!portal) {
      return 'base';
    }

    // Find the layer that matches the portal's z-index
    const entries = Object.entries(Z_INDEX_LAYERS) as [ZIndexLayer, number][];
    const matchingEntry = entries.find(([_, zIndex]) => zIndex === portal.layer);
    return matchingEntry?.[0] || 'base';
  }, [portal]);

  return {
    portal,
    isInPortal: portal !== null,
    sourceContext: portal?.sourceContext || null,
    layer,
    getLayerZIndex: getZIndex,
  };
}

// ============================================================================
// Specialized Portal Hooks
// ============================================================================

/**
 * Hook to check if inside a portal.
 *
 * @returns Whether inside a portal
 *
 * @example
 * ```tsx
 * function ConditionalComponent() {
 *   const isInPortal = useIsInPortal();
 *
 *   if (isInPortal) {
 *     return <PortalOptimizedVersion />;
 *   }
 *
 *   return <NormalVersion />;
 * }
 * ```
 */
export function useIsInPortal(): boolean {
  const { isInPortal } = usePortalContext();
  return isInPortal;
}

/**
 * Hook to get the source context from before the portal.
 *
 * @returns Source context snapshot or null
 *
 * @example
 * ```tsx
 * function ContextAwareModal() {
 *   const sourceContext = useSourceContext();
 *
 *   if (sourceContext) {
 *     // Use source viewport for positioning calculations
 *     const { viewport } = sourceContext;
 *     // ...
 *   }
 *
 *   return <ModalContent />;
 * }
 * ```
 */
export function useSourceContext(): DOMContextSnapshot | null {
  const { sourceContext } = usePortalContext();
  return sourceContext;
}

/**
 * Hook to get the current portal nesting depth.
 *
 * @returns Nesting depth (0 if not in portal)
 *
 * @example
 * ```tsx
 * function NestedModal() {
 *   const nestingDepth = usePortalNestingDepth();
 *
 *   return (
 *     <div style={{ zIndex: 1400 + nestingDepth }}>
 *       Nested modal at depth {nestingDepth}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePortalNestingDepth(): number {
  const { portal } = usePortalContext();
  return portal?.nestingDepth || 0;
}

/**
 * Hook to get the portal hierarchy.
 *
 * @returns Array of portal contexts from innermost to outermost
 *
 * @example
 * ```tsx
 * function PortalDebug() {
 *   const hierarchy = usePortalHierarchy();
 *
 *   return (
 *     <div>
 *       <p>Portal depth: {hierarchy.length}</p>
 *       {hierarchy.map((portal, i) => (
 *         <p key={i}>Level {i}: {portal.portalId}</p>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePortalHierarchy(): PortalContext[] {
  const { portal } = usePortalContext();

  return useMemo(() => {
    if (!portal) {
      return [];
    }

    const hierarchy: PortalContext[] = [];
    let current: PortalContext | null = portal;

    while (current) {
      hierarchy.push(current);
      current = current.parentPortal;
    }

    return hierarchy;
  }, [portal]);
}

// ============================================================================
// Z-Index Hooks
// ============================================================================

/**
 * Hook to get z-index value for a specific layer.
 *
 * @param layer - Z-index layer
 * @returns Z-index value
 *
 * @example
 * ```tsx
 * function FloatingElement() {
 *   const zIndex = useZIndexForLayer('popover');
 *
 *   return (
 *     <div style={{ zIndex }}>
 *       Floating content
 *     </div>
 *   );
 * }
 * ```
 */
export function useZIndexForLayer(layer: ZIndexLayer): number {
  return useMemo(() => Z_INDEX_LAYERS[layer], [layer]);
}

/**
 * Hook to get the current element's z-index context.
 *
 * @returns Z-index context from DOM context
 *
 * @example
 * ```tsx
 * function StackingAwareComponent() {
 *   const zIndexContext = useZIndexContext();
 *
 *   return (
 *     <div>
 *       Current z-index: {zIndexContext.zIndex}
 *       Layer: {zIndexContext.layer}
 *       Creates stacking context: {zIndexContext.createsStackingContext ? 'yes' : 'no'}
 *     </div>
 *   );
 * }
 * ```
 */
export function useZIndexContext() {
  const domContext = useDOMContextValue();
  return domContext.zIndex;
}

/**
 * Hook to register an element with the z-index manager.
 *
 * @param layer - Z-index layer to register in
 * @returns Registration info and utilities
 *
 * @example
 * ```tsx
 * function ManagedOverlay() {
 *   const { ref, zIndex, bringToFront } = useZIndexRegistration('modal');
 *
 *   return (
 *     <div ref={ref} style={{ zIndex }} onClick={bringToFront}>
 *       Click to bring to front
 *     </div>
 *   );
 * }
 * ```
 */
export function useZIndexRegistration(layer: ZIndexLayer = 'base'): {
  ref: React.RefCallback<HTMLElement>;
  zIndex: number;
  bringToFront: () => void;
  sendToBack: () => void;
} {
  const elementRef = { current: null as HTMLElement | null };
  const zIndexManager = getZIndexManager();

  // Registration ref callback
  const ref = useCallback(
    (node: HTMLElement | null) => {
      // Unregister previous element
      if (elementRef.current) {
        zIndexManager.unregister(elementRef.current);
      }

      // Register new element
      if (node) {
        const registration = zIndexManager.register(node, { layer });
        node.style.zIndex = String(registration.zIndex);
      }

      elementRef.current = node;
    },
    [layer, zIndexManager]
  );

  // Get z-index
  const zIndex = useMemo(() => {
    if (elementRef.current) {
      const reg = zIndexManager.getRegistration(elementRef.current);
      return reg?.zIndex ?? Z_INDEX_LAYERS[layer];
    }
    return Z_INDEX_LAYERS[layer];
  }, [layer, zIndexManager]);

  // Bring to front
  const bringToFront = useCallback(() => {
    if (elementRef.current) {
      zIndexManager.bringToFront(elementRef.current);
      const reg = zIndexManager.getRegistration(elementRef.current);
      if (reg) {
        elementRef.current.style.zIndex = String(reg.zIndex);
      }
    }
  }, [zIndexManager]);

  // Send to back
  const sendToBack = useCallback(() => {
    if (elementRef.current) {
      zIndexManager.sendToBack(elementRef.current);
      const reg = zIndexManager.getRegistration(elementRef.current);
      if (reg) {
        elementRef.current.style.zIndex = String(reg.zIndex);
      }
    }
  }, [zIndexManager]);

  return { ref, zIndex, bringToFront, sendToBack };
}

/**
 * Hook to get all z-index layers for reference.
 *
 * @returns Record of layer names to z-index values
 *
 * @example
 * ```tsx
 * function ZIndexReference() {
 *   const layers = useZIndexLayers();
 *
 *   return (
 *     <ul>
 *       {Object.entries(layers).map(([name, value]) => (
 *         <li key={name}>{name}: {value}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
*/
export function useZIndexLayers(): Record<ZIndexLayer, number> {
return Z_INDEX_LAYERS;
}