/**
 * @file Parallel Routes Support
 * @description Implements parallel route loading patterns inspired by Next.js App Router.
 * Enables simultaneous loading of multiple route segments with independent loading states.
 *
 * @module @/lib/routing/advanced/parallel-routes
 *
 * This module provides:
 * - Parallel route slot definitions
 * - Simultaneous route segment loading
 * - Independent loading/error states per slot
 * - Slot composition and rendering
 * - Named slot routing conventions
 *
 * @example
 * ```typescript
 * import { createParallelRoutes, ParallelRouteSlot } from '@/lib/routing/advanced/parallel-routes';
 *
 * const parallel = createParallelRoutes({
 *   slots: {
 *     main: { path: '/dashboard', component: DashboardPage },
 *     sidebar: { path: '@sidebar', component: SidebarPanel },
 *     modal: { path: '@modal', component: ModalContainer },
 *   },
 * });
 * ```
 */

import type { ComponentType, ReactNode } from 'react';
import {
  parsePathParams as coreParsePathParams,
  getPatternSpecificity as coreGetPatternSpecificity,
} from '../core/path-utils';

// =============================================================================
// Types
// =============================================================================

/**
 * Parallel route slot configuration
 */
export interface ParallelRouteSlot<TProps = unknown> {
  /** Slot identifier (e.g., '@modal', '@sidebar') */
  readonly name: string;
  /** Path pattern for this slot (can include params) */
  readonly path: string;
  /** Component to render in this slot */
  readonly component: ComponentType<TProps>;
  /** Loading component for this slot */
  readonly loading?: ComponentType;
  /** Error component for this slot */
  readonly error?: ComponentType<{ error: Error; reset: () => void }>;
  /** Default component when slot is inactive */
  readonly default?: ComponentType;
  /** Whether this slot is optional */
  readonly optional?: boolean;
  /** Custom slot metadata */
  readonly meta?: Record<string, unknown>;
  /** Feature flag for this slot */
  readonly featureFlag?: string;
}

/**
 * Parallel routes configuration
 */
export interface ParallelRoutesConfig {
  /** Named slots for parallel rendering */
  readonly slots: Record<string, Omit<ParallelRouteSlot, 'name'>>;
  /** Default slot to use if none specified */
  readonly defaultSlot?: string;
  /** Layout component that wraps all slots */
  readonly layout?: ComponentType<{ children: ReactNode; slots: Record<string, ReactNode> }>;
  /** Enable slot-level code splitting */
  readonly codeSplit?: boolean;
  /** Feature flag for parallel routes */
  readonly featureFlag?: string;
}

/**
 * Slot render state
 */
export interface SlotRenderState {
  /** Whether slot is loading */
  readonly isLoading: boolean;
  /** Whether slot has error */
  readonly hasError: boolean;
  /** Error if any */
  readonly error: Error | null;
  /** Whether slot is active */
  readonly isActive: boolean;
  /** Current render content */
  readonly content: ReactNode | null;
}

/**
 * Parallel routes render context
 */
export interface ParallelRoutesContext {
  /** All slot states */
  readonly slots: ReadonlyMap<string, SlotRenderState>;
  /** Active slot names */
  readonly activeSlots: readonly string[];
  /** Refresh a specific slot */
  readonly refreshSlot: (slotName: string) => Promise<void>;
  /** Set slot active/inactive */
  readonly setSlotActive: (slotName: string, active: boolean) => void;
  /** Get slot render content */
  readonly getSlotContent: (slotName: string) => ReactNode | null;
}

/**
 * Slot match result
 */
export interface SlotMatch {
  /** Matched slot */
  readonly slot: ParallelRouteSlot;
  /** Extracted parameters */
  readonly params: Record<string, string>;
  /** Full matched path */
  readonly path: string;
  /** Match score (for sorting) */
  readonly score: number;
}

/**
 * Parallel route resolution result
 */
export interface ParallelRouteResolution {
  /** Matched slots */
  readonly matches: ReadonlyMap<string, SlotMatch>;
  /** Unmatched slot names */
  readonly unmatched: readonly string[];
  /** Resolution timestamp */
  readonly timestamp: number;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Slot name prefix for parallel routes
 */
export const SLOT_PREFIX = '@';

/**
 * Default slot name
 */
export const DEFAULT_SLOT_NAME = 'children';

// =============================================================================
// ParallelRoutes Class
// =============================================================================

/**
 * Manages parallel route slot rendering
 *
 * @example
 * ```typescript
 * const parallel = new ParallelRoutes({
 *   slots: {
 *     main: { path: '/', component: MainPage },
 *     sidebar: { path: '@sidebar', component: Sidebar },
 *   },
 * });
 *
 * const matches = parallel.resolveSlots('/dashboard');
 * ```
 */
export class ParallelRoutes {
  private readonly config: ParallelRoutesConfig;
  private readonly slots: Map<string, ParallelRouteSlot>;
  private readonly slotStates: Map<string, SlotRenderState>;

  constructor(config: ParallelRoutesConfig) {
    this.config = config;
    this.slots = new Map();
    this.slotStates = new Map();

    // Initialize slots
    for (const [name, slotConfig] of Object.entries(config.slots)) {
      const slot: ParallelRouteSlot = {
        ...slotConfig,
        name,
      };
      this.slots.set(name, slot);
      this.slotStates.set(name, {
        isLoading: false,
        hasError: false,
        error: null,
        isActive: false,
        content: null,
      });
    }
  }

  /**
   * Get all slot configurations
   */
  getSlots(): ReadonlyMap<string, ParallelRouteSlot> {
    return this.slots;
  }

  /**
   * Get a specific slot configuration
   */
  getSlot(name: string): ParallelRouteSlot | undefined {
    return this.slots.get(name);
  }

  /**
   * Get slot state
   */
  getSlotState(name: string): SlotRenderState | undefined {
    return this.slotStates.get(name);
  }

  /**
   * Resolve which slots match a given path
   *
   * @param path - Current URL path
   * @returns Resolution result with matched slots
   */
  resolveSlots(path: string): ParallelRouteResolution {
    const matches = new Map<string, SlotMatch>();
    const unmatched: string[] = [];

    for (const [name, slot] of this.slots) {
      const match = this.matchSlot(slot, path);
      if (match) {
        matches.set(name, match);
      } else if (slot.optional !== true) {
        unmatched.push(name);
      }
    }

    return {
      matches,
      unmatched,
      timestamp: Date.now(),
    };
  }

  /**
   * Match a single slot against a path
   */
  private matchSlot(slot: ParallelRouteSlot, path: string): SlotMatch | null {
    // Parallel slots (starting with @) match against slot-specific paths
    if (slot.path.startsWith(SLOT_PREFIX)) {
      // Check if path includes the slot indicator
      const slotPath = slot.path.slice(1); // Remove @
      if (path.includes(`/${SLOT_PREFIX}${slotPath}`)) {
        return {
          slot,
          params: {},
          path: slot.path,
          score: this.calculateMatchScore(slot.path, path),
        };
      }
      return null;
    }

    // Regular path matching with parameter extraction
    const params = this.extractParams(slot.path, path);
    if (params !== null) {
      return {
        slot,
        params,
        path,
        score: this.calculateMatchScore(slot.path, path),
      };
    }

    return null;
  }

  /**
   * Extract parameters from a path given a pattern
   *
   * Delegates to core path utilities.
   */
  private extractParams(pattern: string, path: string): Record<string, string> | null {
    return coreParsePathParams(pattern, path);
  }

  /**
   * Calculate match score for sorting
   *
   * Delegates to core pattern specificity calculation.
   */
  private calculateMatchScore(pattern: string, _path: string): number {
    return coreGetPatternSpecificity(pattern);
  }

  /**
   * Update slot state
   */
  updateSlotState(name: string, update: Partial<SlotRenderState>): void {
    const current = this.slotStates.get(name);
    if (current) {
      this.slotStates.set(name, { ...current, ...update });
    }
  }

  /**
   * Create render context for use in components
   */
  createContext(): ParallelRoutesContext {
    return {
      slots: this.slotStates,
      activeSlots: Array.from(this.slotStates.entries())
        .filter(([_, state]) => state.isActive)
        .map(([name]) => name),
      refreshSlot: (slotName: string) => {
        this.updateSlotState(slotName, { isLoading: true, hasError: false, error: null });
        // Actual refresh logic would be implemented by the consumer
      },
      setSlotActive: (slotName: string, active: boolean) => {
        this.updateSlotState(slotName, { isActive: active });
      },
      getSlotContent: async (slotName: string) => {
        return this.slotStates.get(slotName)?.content ?? null;
      },
    };
  }

  /**
   * Get slot names that should render for a given path
   */
  getActiveSlotsForPath(path: string): string[] {
    const resolution = this.resolveSlots(path);
    return Array.from(resolution.matches.keys());
  }

  /**
   * Check if a slot is configured
   */
  hasSlot(name: string): boolean {
    return this.slots.has(name);
  }

  /**
   * Get the default slot
   */
  getDefaultSlot(): ParallelRouteSlot | undefined {
    const defaultName = this.config.defaultSlot ?? DEFAULT_SLOT_NAME;
    return this.slots.get(defaultName);
  }

  /**
   * Get layout component
   */
  getLayout(): ComponentType<{ children: ReactNode; slots: Record<string, ReactNode> }> | undefined {
    return this.config.layout;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new ParallelRoutes instance
 *
 * @param config - Parallel routes configuration
 * @returns Configured ParallelRoutes instance
 */
export function createParallelRoutes(config: ParallelRoutesConfig): ParallelRoutes {
  return new ParallelRoutes(config);
}

/**
 * Create a single slot configuration
 *
 * @param name - Slot name
 * @param config - Slot configuration
 * @returns Complete slot configuration
 */
export function createSlot<TProps = unknown>(
  name: string,
  config: Omit<ParallelRouteSlot<TProps>, 'name'>
): ParallelRouteSlot<TProps> {
  return {
    ...config,
    name,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a path segment is a slot reference
 *
 * @param segment - Path segment to check
 * @returns True if segment is a slot reference
 */
export function isSlotSegment(segment: string): boolean {
  return segment.startsWith(SLOT_PREFIX);
}

/**
 * Extract slot name from a segment
 *
 * @param segment - Slot segment (e.g., '@modal')
 * @returns Slot name (e.g., 'modal')
 */
export function extractSlotName(segment: string): string {
  return segment.startsWith(SLOT_PREFIX) ? segment.slice(1) : segment;
}

/**
 * Create a slot path from a slot name
 *
 * @param name - Slot name
 * @returns Slot path (e.g., '@modal')
 */
export function createSlotPath(name: string): string {
  return name.startsWith(SLOT_PREFIX) ? name : `${SLOT_PREFIX}${name}`;
}

/**
 * Merge slot states for composite rendering
 *
 * @param states - Array of slot states
 * @returns Merged loading/error state
 */
export function mergeSlotStates(states: readonly SlotRenderState[]): {
  isAnyLoading: boolean;
  isAllLoading: boolean;
  hasAnyError: boolean;
  errors: readonly Error[];
  isAllActive: boolean;
} {
  const errors = states.filter((s): s is typeof s & { error: Error } => s.error != null).map(s => s.error);

  return {
    isAnyLoading: states.some(s => s.isLoading),
    isAllLoading: states.every(s => s.isLoading),
    hasAnyError: errors.length > 0,
    errors,
    isAllActive: states.every(s => s.isActive),
  };
}

/**
 * Sort slots by priority for rendering order
 *
 * @param slots - Slots to sort
 * @param priority - Priority map (slot name -> priority number, higher = first)
 * @returns Sorted slots
 */
export function sortSlotsByPriority(
  slots: readonly ParallelRouteSlot[],
  priority: Record<string, number> = {}
): readonly ParallelRouteSlot[] {
  return [...slots].sort((a, b) => {
    const priorityA = priority[a.name] ?? 0;
    const priorityB = priority[b.name] ?? 0;
    return priorityB - priorityA;
  });
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for ParallelRouteSlot
 */
export function isParallelRouteSlot(value: unknown): value is ParallelRouteSlot {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'path' in value &&
    'component' in value
  );
}

/**
 * Type guard for SlotMatch
 */
export function isSlotMatch(value: unknown): value is SlotMatch {
  return (
    typeof value === 'object' &&
    value !== null &&
    'slot' in value &&
    'params' in value &&
    'score' in value
  );
}
