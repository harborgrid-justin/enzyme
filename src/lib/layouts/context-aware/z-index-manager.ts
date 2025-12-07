/**
 * @fileoverview Z-Index Management System
 *
 * This module provides comprehensive z-index management:
 * - Layer-based z-index allocation
 * - Stacking context tracking
 * - Conflict resolution
 * - Dynamic z-index assignment
 *
 * @module layouts/context-aware/z-index-manager
 * @author Agent 4 - PhD Context Systems Expert
 * @version 1.0.0
 */

import type { ZIndexLayer, ZIndexContext, ContextTrackingConfig } from './types';
import { Z_INDEX_LAYERS, DEFAULT_TRACKING_CONFIG } from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Registration for a z-index allocation.
 */
export interface ZIndexRegistration {
  /** Unique registration ID */
  id: string;
  /** The element being registered */
  element: Element;
  /** Assigned layer */
  layer: ZIndexLayer;
  /** Assigned z-index value */
  zIndex: number;
  /** Priority within layer (higher = on top) */
  priority: number;
  /** Registration timestamp */
  registeredAt: number;
}

/**
 * Options for z-index registration.
 */
export interface ZIndexRegistrationOptions {
  /** Layer to register in */
  layer?: ZIndexLayer;
  /** Priority within layer (default: 0) */
  priority?: number;
  /** Whether to auto-increment within layer */
  autoIncrement?: boolean;
}

/**
 * Callback for z-index changes.
 */
export type ZIndexChangeCallback = (registration: ZIndexRegistration) => void;

// ============================================================================
// Constants
// ============================================================================

/**
 * Gap between z-index values within a layer for dynamic insertion.
 */
const LAYER_GAP = 10;

/**
 * Maximum z-index value before requiring rebalancing.
 */
const MAX_LAYER_OFFSET = 900;

// ============================================================================
// ZIndexManager Class
// ============================================================================

/**
 * Manages z-index values across the application.
 *
 * @remarks
 * Provides a centralized system for z-index management that prevents
 * conflicts and ensures consistent layering behavior.
 *
 * @example
 * ```typescript
 * const manager = ZIndexManager.getInstance();
 *
 * // Register an element in the modal layer
 * const reg = manager.register(element, { layer: 'modal' });
 *
 * // Apply the z-index
 * element.style.zIndex = String(reg.zIndex);
 *
 * // When done:
 * manager.unregister(reg.id);
 * ```
 */
export class ZIndexManager {
  private static instance: ZIndexManager | null = null;

  /** Map of registration IDs to registrations */
  private readonly registrations: Map<string, ZIndexRegistration> = new Map();

  /** Map of elements to their registration IDs */
  private readonly elementToId: WeakMap<Element, string> = new WeakMap();

  /** Map of layers to their registration IDs (ordered by z-index) */
  private readonly layerRegistrations: Map<ZIndexLayer, string[]> = new Map();

  /** Current offset within each layer */
  private readonly layerOffsets: Map<ZIndexLayer, number> = new Map();

  /** Change callbacks */
  private readonly changeCallbacks: Set<ZIndexChangeCallback> = new Set();

  /** Configuration */
  private readonly config: ContextTrackingConfig;

  /** Registration ID counter */
  private registrationIdCounter = 0;

  /**
   * Creates a new ZIndexManager instance.
   */
  private constructor(config: Partial<ContextTrackingConfig> = {}) {
    this.config = { ...DEFAULT_TRACKING_CONFIG, ...config };

    // Initialize layer registrations and offsets
    (Object.keys(Z_INDEX_LAYERS) as ZIndexLayer[]).forEach((layer) => {
      this.layerRegistrations.set(layer, []);
      this.layerOffsets.set(layer, 0);
    });
  }

  /**
   * Gets the singleton instance.
   */
  public static getInstance(config?: Partial<ContextTrackingConfig>): ZIndexManager {
    ZIndexManager.instance ??= new ZIndexManager(config);
    return ZIndexManager.instance;
  }

  /**
   * Resets the singleton instance.
   */
  public static resetInstance(): void {
    if (ZIndexManager.instance) {
      ZIndexManager.instance.clear();
      ZIndexManager.instance = null;
    }
  }

  // ==========================================================================
  // Public API - Registration
  // ==========================================================================

  /**
   * Registers an element for z-index management.
   *
   * @param element - Element to register
   * @param options - Registration options
   * @returns Registration object
   */
  public register(element: Element, options: ZIndexRegistrationOptions = {}): ZIndexRegistration {
    const { layer = 'base', priority = 0, autoIncrement = true } = options;

    // Check if already registered
    const existingId = this.elementToId.get(element);
    if (existingId !== undefined) {
      const existing = this.registrations.get(existingId);
      if (existing !== undefined) {
        // Update if layer changed
        if (existing.layer !== layer) {
          this.unregister(existingId);
        } else {
          return existing;
        }
      }
    }

    // Generate registration ID
    const id = this.generateId();

    // Calculate z-index
    const baseZIndex = Z_INDEX_LAYERS[layer];
    let offset = 0;

    if (autoIncrement) {
      const currentOffset = this.layerOffsets.get(layer) ?? 0;
      offset = currentOffset + LAYER_GAP;
      this.layerOffsets.set(layer, offset);

      // Check if rebalancing needed
      if (offset >= MAX_LAYER_OFFSET) {
        this.rebalanceLayer(layer);
        offset = this.layerOffsets.get(layer) ?? 0;
      }
    }

    const zIndex = baseZIndex + offset + priority;

    // Create registration
    const registration: ZIndexRegistration = {
      id,
      element,
      layer,
      zIndex,
      priority,
      registeredAt: Date.now(),
    };

    // Store registration
    this.registrations.set(id, registration);
    this.elementToId.set(element, id);

    // Add to layer registrations
    const layerRegs = this.layerRegistrations.get(layer) ?? [];
    layerRegs.push(id);
    this.layerRegistrations.set(layer, layerRegs);

    // Sort layer by z-index
    this.sortLayer(layer);

    // Notify callbacks
    this.notifyChange(registration);

    if (this.config.debug) {
      // eslint-disable-next-line no-console -- debug logging
      console.debug('[ZIndexManager] Registered:', id, registration);
    }

    return registration;
  }

  /**
   * Unregisters an element.
   *
   * @param idOrElement - Registration ID or element to unregister
   */
  public unregister(idOrElement: string | Element): void {
    let id: string | undefined;

    if (typeof idOrElement === 'string') {
      id = idOrElement;
    } else {
      id = this.elementToId.get(idOrElement);
    }

    if (id === undefined || id === '') {
      return;
    }

    const registration = this.registrations.get(id);
    if (registration === undefined) {
      return;
    }

    // Remove from maps
    this.registrations.delete(id);
    this.elementToId.delete(registration.element);

    // Remove from layer registrations
    const layerRegs = this.layerRegistrations.get(registration.layer);
    if (layerRegs !== undefined) {
      const index = layerRegs.indexOf(id);
      if (index !== -1) {
        layerRegs.splice(index, 1);
      }
    }

    if (this.config.debug) {
      // eslint-disable-next-line no-console -- debug logging
      console.debug('[ZIndexManager] Unregistered:', id);
    }
  }

  /**
   * Updates an existing registration.
   *
   * @param id - Registration ID
   * @param options - New options
   * @returns Updated registration or null
   */
  public update(
    id: string,
    options: Partial<ZIndexRegistrationOptions>
  ): ZIndexRegistration | null {
    const existing = this.registrations.get(id);
    if (!existing) {
      return null;
    }

    // If layer changed, re-register
    if (options.layer && options.layer !== existing.layer) {
      this.unregister(id);
      return this.register(existing.element, {
        layer: options.layer,
        priority: options.priority ?? existing.priority,
        autoIncrement: options.autoIncrement,
      });
    }

    // Update priority
    if (options.priority !== undefined && options.priority !== existing.priority) {
      const newZIndex =
        Z_INDEX_LAYERS[existing.layer] +
        (existing.zIndex - Z_INDEX_LAYERS[existing.layer]) +
        (options.priority - existing.priority);

      const updated: ZIndexRegistration = {
        ...existing,
        priority: options.priority,
        zIndex: newZIndex,
      };

      this.registrations.set(id, updated);
      this.sortLayer(existing.layer);
      this.notifyChange(updated);

      return updated;
    }

    return existing;
  }

  // ==========================================================================
  // Public API - Query
  // ==========================================================================

  /**
   * Gets the registration for an element.
   *
   * @param element - Element to look up
   * @returns Registration or null
   */
  public getRegistration(element: Element): ZIndexRegistration | null {
    const id = this.elementToId.get(element);
    if (id === undefined || id === '') {
      return null;
    }
    return this.registrations.get(id) ?? null;
  }

  /**
   * Gets all registrations in a layer.
   *
   * @param layer - Layer to query
   * @returns Array of registrations (sorted by z-index)
   */
  public getLayerRegistrations(layer: ZIndexLayer): ZIndexRegistration[] {
    const ids = this.layerRegistrations.get(layer) ?? [];
    return ids
      .map((id) => this.registrations.get(id))
      .filter((reg): reg is ZIndexRegistration => reg !== undefined);
  }

  /**
   * Gets the z-index for a layer.
   *
   * @param layer - Layer to query
   * @returns Base z-index for the layer
   */
  public getLayerZIndex(layer: ZIndexLayer): number {
    return Z_INDEX_LAYERS[layer];
  }

  /**
   * Gets the z-index context for an element.
   *
   * @param element - Element to query
   * @returns Z-index context
   */
  public getZIndexContext(element: Element): ZIndexContext {
    const registration = this.getRegistration(element);

    if (registration) {
      const layerRegs = this.layerRegistrations.get(registration.layer) ?? [];
      const orderInLayer = layerRegs.indexOf(registration.id);

      return {
        zIndex: registration.zIndex,
        layer: registration.layer,
        stackingContextRoot: this.findStackingContextRoot(element),
        createsStackingContext: this.createsStackingContext(element),
        orderInLayer,
        layerCount: layerRegs.length,
      };
    }

    return {
      zIndex: 0,
      layer: 'base',
      stackingContextRoot: this.findStackingContextRoot(element),
      createsStackingContext: this.createsStackingContext(element),
      orderInLayer: 0,
      layerCount: 0,
    };
  }

  /**
   * Gets the next available z-index in a layer.
   *
   * @param layer - Layer to query
   * @returns Next z-index value
   */
  public getNextZIndex(layer: ZIndexLayer): number {
    const baseZIndex = Z_INDEX_LAYERS[layer];
    const currentOffset = this.layerOffsets.get(layer) ?? 0;
    return baseZIndex + currentOffset + LAYER_GAP;
  }

  /**
   * Gets the highest z-index currently in use in a layer.
   *
   * @param layer - Layer to query
   * @returns Highest z-index or base layer z-index
   */
  public getHighestZIndex(layer: ZIndexLayer): number {
    const regs = this.getLayerRegistrations(layer);
    if (regs.length === 0) {
      return Z_INDEX_LAYERS[layer];
    }
    return Math.max(...regs.map((r) => r.zIndex));
  }

  // ==========================================================================
  // Public API - Lifecycle
  // ==========================================================================

  /**
   * Subscribes to z-index changes.
   *
   * @param callback - Change callback
   * @returns Unsubscribe function
   */
  public onChange(callback: ZIndexChangeCallback): () => void {
    this.changeCallbacks.add(callback);
    return () => {
      this.changeCallbacks.delete(callback);
    };
  }

  /**
   * Brings an element to the front of its layer.
   *
   * @param element - Element to bring to front
   */
  public bringToFront(element: Element): void {
    const registration = this.getRegistration(element);
    if (!registration) {
      return;
    }

    const highestZIndex = this.getHighestZIndex(registration.layer);
    if (registration.zIndex >= highestZIndex) {
      return; // Already at front
    }

    // Update z-index to be highest
    const updated: ZIndexRegistration = {
      ...registration,
      zIndex: highestZIndex + LAYER_GAP,
    };

    this.registrations.set(registration.id, updated);
    this.sortLayer(registration.layer);
    this.notifyChange(updated);

    // Update layer offset
    const currentOffset = this.layerOffsets.get(registration.layer) ?? 0;
    this.layerOffsets.set(
      registration.layer,
      Math.max(currentOffset, updated.zIndex - Z_INDEX_LAYERS[registration.layer])
    );
  }

  /**
   * Sends an element to the back of its layer.
   *
   * @param element - Element to send to back
   */
  public sendToBack(element: Element): void {
    const registration = this.getRegistration(element);
    if (!registration) {
      return;
    }

    const layerRegs = this.getLayerRegistrations(registration.layer);
    if (layerRegs.length === 0) {
      return;
    }

    const lowestZIndex = Math.min(...layerRegs.map((r) => r.zIndex));
    if (registration.zIndex <= lowestZIndex) {
      return; // Already at back
    }

    // Update z-index to be lowest
    const updated: ZIndexRegistration = {
      ...registration,
      zIndex: Math.max(Z_INDEX_LAYERS[registration.layer], lowestZIndex - LAYER_GAP),
    };

    this.registrations.set(registration.id, updated);
    this.sortLayer(registration.layer);
    this.notifyChange(updated);
  }

  /**
   * Clears all registrations.
   */
  public clear(): void {
    this.registrations.clear();
    this.changeCallbacks.clear();

    // Reset layer data
    (Object.keys(Z_INDEX_LAYERS) as ZIndexLayer[]).forEach((layer) => {
      this.layerRegistrations.set(layer, []);
      this.layerOffsets.set(layer, 0);
    });

    if (this.config.debug) {
      // eslint-disable-next-line no-console -- debug logging
      console.debug('[ZIndexManager] Cleared all registrations');
    }
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Generates a unique registration ID.
   */
  private generateId(): string {
    return `zidx-${++this.registrationIdCounter}`;
  }

  /**
   * Sorts registrations within a layer by z-index.
   */
  private sortLayer(layer: ZIndexLayer): void {
    const ids = this.layerRegistrations.get(layer);
    if (!ids) {
      return;
    }

    ids.sort((a, b) => {
      const regA = this.registrations.get(a);
      const regB = this.registrations.get(b);
      if (regA === undefined || regB === undefined) return 0;
      return regA.zIndex - regB.zIndex;
    });
  }

  /**
   * Rebalances z-index values within a layer.
   */
  private rebalanceLayer(layer: ZIndexLayer): void {
    const ids = this.layerRegistrations.get(layer);
    if (ids === undefined || ids.length === 0) {
      this.layerOffsets.set(layer, 0);
      return;
    }

    const baseZIndex = Z_INDEX_LAYERS[layer];
    let offset = LAYER_GAP;

    ids.forEach((id) => {
      const registration = this.registrations.get(id);
      if (registration !== undefined) {
        const updated: ZIndexRegistration = {
          ...registration,
          zIndex: baseZIndex + offset + registration.priority,
        };
        this.registrations.set(id, updated);
        offset += LAYER_GAP;
      }
    });

    this.layerOffsets.set(layer, offset);

    if (this.config.debug) {
      // eslint-disable-next-line no-console -- debug logging
      console.debug('[ZIndexManager] Rebalanced layer:', layer);
    }
  }

  /**
   * Notifies change callbacks.
   */
  private notifyChange(registration: ZIndexRegistration): void {
    this.changeCallbacks.forEach((callback) => {
      try {
        callback(registration);
      } catch (error) {
        if (this.config.debug) {
          console.error('[ZIndexManager] Callback error:', error);
        }
      }
    });
  }

  /**
   * Finds the stacking context root for an element.
   */
  private findStackingContextRoot(element: Element): Element | null {
    let current: Element | null = element.parentElement;

    while (current) {
      if (this.createsStackingContext(current)) {
        return current;
      }
      current = current.parentElement;
    }

    return document.documentElement;
  }

  /**
   * Checks if an element creates a stacking context.
   */
  private createsStackingContext(element: Element): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const style = getComputedStyle(element);
    const { position } = style;

    // z-index on positioned element
    if (
      (position === 'relative' ||
        position === 'absolute' ||
        position === 'fixed' ||
        position === 'sticky') &&
      style.zIndex !== 'auto'
    ) {
      return true;
    }

    // opacity less than 1
    if (parseFloat(style.opacity) < 1) {
      return true;
    }

    // transform, filter, perspective
    if (style.transform !== 'none' || style.filter !== 'none' || style.perspective !== 'none') {
      return true;
    }

    // mix-blend-mode
    if (style.mixBlendMode !== 'normal') {
      return true;
    }

    // isolation
    if (style.isolation === 'isolate') {
      return true;
    }

    // will-change with certain values
    const { willChange } = style;
    if (willChange === 'transform' || willChange === 'opacity' || willChange === 'filter') {
      return true;
    }

    // contain
    const { contain } = style;
    return (
      contain === 'layout' || contain === 'paint' || contain === 'strict' || contain === 'content'
    );
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Gets the z-index manager instance.
 */
export function getZIndexManager(): ZIndexManager {
  return ZIndexManager.getInstance();
}

/**
 * Registers an element for z-index management.
 *
 * @param element - Element to register
 * @param options - Registration options
 * @returns Registration object
 */
export function registerZIndex(
  element: Element,
  options?: ZIndexRegistrationOptions
): ZIndexRegistration {
  return getZIndexManager().register(element, options);
}

/**
 * Unregisters an element from z-index management.
 *
 * @param idOrElement - Registration ID or element
 */
export function unregisterZIndex(idOrElement: string | Element): void {
  getZIndexManager().unregister(idOrElement);
}

/**
 * Gets the z-index for a specific layer.
 *
 * @param layer - Layer to query
 * @returns Z-index value
 */
export function getLayerZIndex(layer: ZIndexLayer): number {
  return Z_INDEX_LAYERS[layer];
}

/**
 * Brings an element to the front of its layer.
 *
 * @param element - Element to bring to front
 */
export function bringToFront(element: Element): void {
  getZIndexManager().bringToFront(element);
}

/**
 * Sends an element to the back of its layer.
 *
 * @param element - Element to send to back
 */
export function sendToBack(element: Element): void {
  getZIndexManager().sendToBack(element);
}
