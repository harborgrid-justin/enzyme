/**
 * @fileoverview Portal Context Bridge System
 *
 * This module provides context preservation across React portals:
 * - Maintains DOM context when rendering through portals
 * - Bridges z-index management across portal boundaries
 * - Enables event bubbling back to source context
 * - Supports nested portal hierarchies
 *
 * @module layouts/context-aware/portal-bridge
 * @author Agent 4 - PhD Context Systems Expert
 * @version 1.0.0
 */

import type {
  PortalContext,
  DOMContextSnapshot,
  ZIndexLayer,
  ZIndexContext,
  LayoutAncestor,
  ViewportInfo,
  ScrollContainer,
  ContextTrackingConfig,
} from './types';
import { Z_INDEX_LAYERS, DEFAULT_TRACKING_CONFIG } from './types';
import { getDOMContextTracker } from './dom-context';
import { getViewportTracker } from './viewport-awareness';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for creating a portal context.
 */
export interface PortalContextOptions {
  /** Target portal root element or selector */
  target?: Element | string;
  /** Z-index layer for the portal */
  layer?: ZIndexLayer;
  /** Whether to bridge events back to source */
  bridgeEvents?: boolean;
  /** Parent portal context (for nesting) */
  parentPortal?: PortalContext | null;
}

/**
 * Callback for portal lifecycle events.
 */
export type PortalLifecycleCallback = (portal: PortalContext) => void;

/**
 * Event handler for bridged events.
 */
export type BridgedEventHandler = (event: Event, sourceContext: DOMContextSnapshot) => void;

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PORTAL_ROOT_ID = 'portal-root';
const PORTAL_CONTEXT_ATTR = 'data-portal-context';

// ============================================================================
// PortalContextManager Class
// ============================================================================

/**
 * Manages portal contexts and context bridging across portal boundaries.
 *
 * @remarks
 * Singleton class that handles the creation and management of portal contexts,
 * ensuring that DOM context is preserved when components render through portals.
 *
 * @example
 * ```typescript
 * const manager = PortalContextManager.getInstance();
 *
 * // Create a portal context from a source element
 * const context = manager.createPortalContext(sourceElement, {
 *   target: document.getElementById('modal-root'),
 *   layer: 'modal',
 *   bridgeEvents: true,
 * });
 *
 * // Use the context in your portal
 * // When done:
 * manager.destroyPortalContext(context.portalId);
 * ```
 */
export class PortalContextManager {
  private static instance: PortalContextManager | null = null;

  /** Map of portal IDs to their contexts */
  private readonly portalContexts: Map<string, PortalContext> = new Map();

  /** Map of portal IDs to their source elements */
  private readonly sourceElements: Map<string, Element> = new Map();

  /** Map of portal IDs to lifecycle callbacks */
  private readonly lifecycleCallbacks: Map<string, Set<PortalLifecycleCallback>> = new Map();

  /** Map of portal IDs to bridged event handlers */
  private readonly eventHandlers: Map<string, Set<BridgedEventHandler>> = new Map();

  /** Configuration */
  private readonly config: ContextTrackingConfig;

  /** Whether we're in SSR mode */
  private readonly isSSR: boolean;

  /** Portal ID counter */
  private portalIdCounter = 0;

  /**
   * Creates a new PortalContextManager instance.
   */
  private constructor(config: Partial<ContextTrackingConfig> = {}) {
    this.config = { ...DEFAULT_TRACKING_CONFIG, ...config };
    this.isSSR = typeof window === 'undefined';
  }

  /**
   * Gets the singleton instance.
   */
  public static getInstance(config?: Partial<ContextTrackingConfig>): PortalContextManager {
    PortalContextManager.instance ??= new PortalContextManager(config);
    return PortalContextManager.instance;
  }

  /**
   * Resets the singleton instance.
   */
  public static resetInstance(): void {
    if (PortalContextManager.instance) {
      PortalContextManager.instance.destroyAll();
      PortalContextManager.instance = null;
    }
  }

  // ==========================================================================
  // Public API - Portal Creation
  // ==========================================================================

  /**
   * Creates a new portal context.
   *
   * @param sourceElement - The element where the portal is invoked
   * @param options - Portal options
   * @returns Created PortalContext
   */
  public createPortalContext(
    sourceElement: Element,
    options: PortalContextOptions = {}
  ): PortalContext {
    const {
      target,
      layer = 'modal',
      bridgeEvents = true,
      parentPortal = null,
    } = options;

    // Resolve portal root
    const portalRoot = this.resolvePortalRoot(target);
    if (!portalRoot) {
      throw new Error('[PortalContextManager] Could not resolve portal root');
    }

    // Generate portal ID
    const portalId = this.generatePortalId();

    // Capture source context snapshot
    const sourceContext = this.captureContextSnapshot(sourceElement);

    // Calculate nesting depth
    const nestingDepth = parentPortal ? parentPortal.nestingDepth + 1 : 0;

    // Create portal context
    const portalContext: PortalContext = {
      portalRoot,
      sourceContext,
      layer: Z_INDEX_LAYERS[layer],
      bridgeEvents,
      nestingDepth,
      parentPortal,
      portalId,
    };

    // Store context and source element
    this.portalContexts.set(portalId, portalContext);
    this.sourceElements.set(portalId, sourceElement);

    // Mark portal root with context attribute
    portalRoot.setAttribute(PORTAL_CONTEXT_ATTR, portalId);

    // Set up event bridging if enabled
    if (bridgeEvents && !this.isSSR) {
      this.setupEventBridging(portalId, portalRoot, sourceContext);
    }

    // Notify lifecycle callbacks
    this.notifyLifecycle(portalId, portalContext);

    if (this.config.debug === true) {
      // eslint-disable-next-line no-console -- debug logging
      console.debug('[PortalContextManager] Created portal:', portalId, portalContext);
    }

    return portalContext;
  }

  /**
   * Destroys a portal context.
   *
   * @param portalId - ID of the portal to destroy
   */
  public destroyPortalContext(portalId: string): void {
    const context = this.portalContexts.get(portalId);
    if (!context) {
      return;
    }

    // Remove portal root attribute
    context.portalRoot.removeAttribute(PORTAL_CONTEXT_ATTR);

    // Clean up event bridging
    this.cleanupEventBridging(portalId);

    // Remove from maps
    this.portalContexts.delete(portalId);
    this.sourceElements.delete(portalId);
    this.lifecycleCallbacks.delete(portalId);
    this.eventHandlers.delete(portalId);

    if (this.config.debug === true) {
      // eslint-disable-next-line no-console -- debug logging
      console.debug('[PortalContextManager] Destroyed portal:', portalId);
    }
  }

  /**
   * Destroys all portal contexts.
   */
  public destroyAll(): void {
    const portalIds = Array.from(this.portalContexts.keys());
    portalIds.forEach((id) => this.destroyPortalContext(id));
  }

  // ==========================================================================
  // Public API - Context Access
  // ==========================================================================

  /**
   * Gets a portal context by ID.
   *
   * @param portalId - Portal ID
   * @returns PortalContext or undefined
   */
  public getPortalContext(portalId: string): PortalContext | undefined {
    return this.portalContexts.get(portalId);
  }

  /**
   * Gets the portal context for an element (if it's inside a portal).
   *
   * @param element - Element to check
   * @returns PortalContext or null
   */
  public getContextForElement(element: Element): PortalContext | null {
    // Walk up the DOM to find a portal root
    let current: Element | null = element;

    while (current !== null) {
      const portalId = current.getAttribute(PORTAL_CONTEXT_ATTR);
      if ((portalId !== null) && (portalId !== '')) {
        return this.portalContexts.get(portalId) ?? null;
      }
      current = current.parentElement;
    }

    return null;
  }

  /**
   * Gets the source context for a portal.
   *
   * @param portalId - Portal ID
   * @returns Source context snapshot or null
   */
  public getSourceContext(portalId: string): DOMContextSnapshot | null {
    const context = this.portalContexts.get(portalId);
    return context?.sourceContext ?? null;
  }

  /**
   * Gets the source element for a portal.
   *
   * @param portalId - Portal ID
   * @returns Source element or null
   */
  public getSourceElement(portalId: string): Element | null {
    return this.sourceElements.get(portalId) ?? null;
  }

  /**
   * Checks if an element is inside a portal.
   *
   * @param element - Element to check
   * @returns Whether element is inside a portal
   */
  public isInPortal(element: Element): boolean {
    return this.getContextForElement(element) !== null;
  }

  /**
   * Gets the portal hierarchy for an element.
   *
   * @param element - Element to check
   * @returns Array of portal contexts from innermost to outermost
   */
  public getPortalHierarchy(element: Element): PortalContext[] {
    const hierarchy: PortalContext[] = [];
    let context = this.getContextForElement(element);

    while (context) {
      hierarchy.push(context);
      context = context.parentPortal;
    }

    return hierarchy;
  }

  // ==========================================================================
  // Public API - Lifecycle & Events
  // ==========================================================================

  /**
   * Registers a lifecycle callback for a portal.
   *
   * @param portalId - Portal ID
   * @param callback - Lifecycle callback
   * @returns Unregister function
   */
  public onLifecycle(portalId: string, callback: PortalLifecycleCallback): () => void {
    let callbacks = this.lifecycleCallbacks.get(portalId);
    if (!callbacks) {
      callbacks = new Set();
      this.lifecycleCallbacks.set(portalId, callbacks);
    }
    callbacks.add(callback);

    return () => {
      callbacks?.delete(callback);
    };
  }

  /**
   * Registers an event handler for bridged events.
   *
   * @param portalId - Portal ID
   * @param handler - Event handler
   * @returns Unregister function
   */
  public onBridgedEvent(portalId: string, handler: BridgedEventHandler): () => void {
    let handlers = this.eventHandlers.get(portalId);
    if (!handlers) {
      handlers = new Set();
      this.eventHandlers.set(portalId, handlers);
    }
    handlers.add(handler);

    return () => {
      handlers?.delete(handler);
    };
  }

  /**
   * Updates the source context snapshot for a portal.
   *
   * @param portalId - Portal ID
   */
  public refreshSourceContext(portalId: string): void {
    const sourceElement = this.sourceElements.get(portalId);
    const context = this.portalContexts.get(portalId);

    if (sourceElement && context) {
      const newSnapshot = this.captureContextSnapshot(sourceElement);
      // Create new context with updated snapshot
      const updatedContext: PortalContext = {
        ...context,
        sourceContext: newSnapshot,
      };
      this.portalContexts.set(portalId, updatedContext);
    }
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Generates a unique portal ID.
   */
  private generatePortalId(): string {
    return `portal-${++this.portalIdCounter}-${Date.now()}`;
  }

  /**
   * Resolves the portal root element.
   */
  private resolvePortalRoot(target?: Element | string): Element | null {
    if (this.isSSR) {
      return null;
    }

    if (target instanceof Element) {
      return target;
    }

    if (typeof target === 'string') {
      return document.querySelector(target);
    }

    // Try to find or create default portal root
    let root = document.getElementById(DEFAULT_PORTAL_ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = DEFAULT_PORTAL_ROOT_ID;
      document.body.appendChild(root);
    }

    return root;
  }

  /**
   * Captures a snapshot of the current DOM context.
   */
  private captureContextSnapshot(element: Element): DOMContextSnapshot {
    const tracker = getDOMContextTracker();
    const viewportTracker = getViewportTracker();

    // Get ancestors
    const ancestors: LayoutAncestor[] = tracker.getAncestry(element);

    // Get viewport
    const viewport: ViewportInfo = viewportTracker.getViewport();

    // Find scroll container (simplified for snapshot)
    const scrollContainer: ScrollContainer | null = null;
    // Note: In a full implementation, we would get this from ScrollContainerRegistry

    // Get z-index context (simplified)
    const zIndex: ZIndexContext = {
      zIndex: 0,
      layer: 'base',
      stackingContextRoot: null,
      createsStackingContext: false,
      orderInLayer: 0,
      layerCount: 1,
    };

    return {
      ancestors,
      viewport,
      scrollContainer,
      zIndex,
      timestamp: Date.now(),
    };
  }

  /**
   * Sets up event bridging for a portal.
   */
  private setupEventBridging(
    portalId: string,
    portalRoot: Element,
    sourceContext: DOMContextSnapshot
  ): void {
    // List of events to bridge
    const eventsTobridge = ['click', 'keydown', 'keyup', 'focus', 'blur'];

    const bridgeHandler = (event: Event): void => {
      const handlers = this.eventHandlers.get(portalId);
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(event, sourceContext);
          } catch (error) {
            if (this.config.debug) {
              console.error('[PortalContextManager] Event bridge error:', error);
            }
          }
        });
      }
    };

    // Store the handler reference for cleanup
    (portalRoot as Element & { __portalBridgeHandler?: (e: Event) => void }).__portalBridgeHandler = bridgeHandler;

    eventsTobridge.forEach((eventType) => {
      portalRoot.addEventListener(eventType, bridgeHandler, { capture: true });
    });
  }

  /**
   * Cleans up event bridging for a portal.
   */
  private cleanupEventBridging(portalId: string): void {
    const context = this.portalContexts.get(portalId);
    if (!context) {
      return;
    }

    const portalRoot = context.portalRoot as Element & { __portalBridgeHandler?: (e: Event) => void };
    const handler = portalRoot.__portalBridgeHandler;

    if (handler) {
      const eventsTobridge = ['click', 'keydown', 'keyup', 'focus', 'blur'];
      eventsTobridge.forEach((eventType) => {
        portalRoot.removeEventListener(eventType, handler, { capture: true });
      });
      delete portalRoot.__portalBridgeHandler;
    }
  }

  /**
   * Notifies lifecycle callbacks.
   */
  private notifyLifecycle(portalId: string, context: PortalContext): void {
    const callbacks = this.lifecycleCallbacks.get(portalId);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(context);
        } catch (error) {
          if (this.config.debug) {
            console.error('[PortalContextManager] Lifecycle callback error:', error);
          }
        }
      });
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Gets the portal context manager instance.
 */
export function getPortalContextManager(): PortalContextManager {
  return PortalContextManager.getInstance();
}

/**
 * Creates a portal context from a source element.
 *
 * @param sourceElement - Source element
 * @param options - Portal options
 * @returns Created portal context
 */
export function createPortalContext(
  sourceElement: Element,
  options?: PortalContextOptions
): PortalContext {
  return getPortalContextManager().createPortalContext(sourceElement, options);
}

/**
 * Destroys a portal context.
 *
 * @param portalId - Portal ID to destroy
 */
export function destroyPortalContext(portalId: string): void {
  getPortalContextManager().destroyPortalContext(portalId);
}

/**
 * Gets the portal context for an element.
 *
 * @param element - Element to check
 * @returns Portal context or null
 */
export function getPortalContextForElement(element: Element): PortalContext | null {
  return getPortalContextManager().getContextForElement(element);
}

/**
 * Checks if an element is inside a portal.
 *
 * @param element - Element to check
 * @returns Whether inside a portal
 */
export function isInPortal(element: Element): boolean {
  return getPortalContextManager().isInPortal(element);
}

/**
 * Gets the complete portal hierarchy for an element.
 *
 * @param element - Element to check
 * @returns Array of portal contexts
 */
export function getPortalHierarchy(element: Element): PortalContext[] {
  return getPortalContextManager().getPortalHierarchy(element);
}
