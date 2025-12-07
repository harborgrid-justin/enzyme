/**
 * @file State Breakpoint Provider
 * @description Conditional breakpoints on state changes
 */

// ============================================================================
// Types
// ============================================================================

export enum BreakpointCondition {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CHANGED = 'changed',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  CONTAINS = 'contains',
  MATCHES = 'matches',
}

/**
 *
 */
export interface StateBreakpoint {
  id: string;
  enabled: boolean;
  storeName: string;
  path: string;
  condition: BreakpointCondition;
  value?: unknown;
  hitCount: number;
  logMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 *
 */
export interface BreakpointHit {
  breakpoint: StateBreakpoint;
  timestamp: number;
  oldValue: unknown;
  newValue: unknown;
  stackTrace?: string[];
}

/**
 *
 */
export type BreakpointCallback = (hit: BreakpointHit) => void | Promise<void>;

// ============================================================================
// State Breakpoint Provider
// ============================================================================

/**
 *
 */
export class StateBreakpointProvider {
  private readonly breakpoints = new Map<string, StateBreakpoint>();
  private hits: BreakpointHit[] = [];
  private readonly callbacks = new Set<BreakpointCallback>();
  private breakpointIdCounter = 0;
  private readonly stateCache = new Map<string, Map<string, unknown>>();

  /**
   * Add a state breakpoint
   * @param storeName
   * @param path
   * @param condition
   * @param value
   * @param logMessage
   */
  addBreakpoint(
    storeName: string,
    path: string,
    condition: BreakpointCondition,
    value?: unknown,
    logMessage?: string
  ): StateBreakpoint {
    const breakpoint: StateBreakpoint = {
      id: this.generateBreakpointId(),
      enabled: true,
      storeName,
      path,
      condition,
      ...(value !== undefined && { value }),
      hitCount: 0,
      ...(logMessage !== undefined && { logMessage }),
    };

    this.breakpoints.set(breakpoint.id, breakpoint);
    return breakpoint;
  }

  /**
   * Remove a breakpoint
   * @param id
   */
  removeBreakpoint(id: string): boolean {
    return this.breakpoints.delete(id);
  }

  /**
   * Enable a breakpoint
   * @param id
   */
  enableBreakpoint(id: string): void {
    const breakpoint = this.breakpoints.get(id);
    if (breakpoint) {
      breakpoint.enabled = true;
    }
  }

  /**
   * Disable a breakpoint
   * @param id
   */
  disableBreakpoint(id: string): void {
    const breakpoint = this.breakpoints.get(id);
    if (breakpoint) {
      breakpoint.enabled = false;
    }
  }

  /**
   * Get all breakpoints
   * @param storeName
   */
  getBreakpoints(storeName?: string): StateBreakpoint[] {
    const breakpoints = [...this.breakpoints.values()];
    if (storeName) {
      return breakpoints.filter((bp) => bp.storeName === storeName);
    }
    return breakpoints;
  }

  /**
   * Get breakpoint by ID
   * @param id
   */
  getBreakpoint(id: string): StateBreakpoint | undefined {
    return this.breakpoints.get(id);
  }

  /**
   * Clear all breakpoints
   */
  clearBreakpoints(): void {
    this.breakpoints.clear();
  }

  /**
   * Register breakpoint callback
   * @param callback
   */
  onBreakpoint(callback: BreakpointCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Check state change against breakpoints
   * @param storeName
   * @param newState
   */
  async checkBreakpoints(storeName: string, newState: Record<string, unknown>): Promise<void> {
    const breakpoints = this.getBreakpoints(storeName);
    if (breakpoints.length === 0) {
      return;
    }

    // Get cached state
    const oldStateMap = this.stateCache.get(storeName) ?? new Map();

    for (const breakpoint of breakpoints) {
      if (!breakpoint.enabled) {
        continue;
      }

      const oldValue = oldStateMap.get(breakpoint.path);
      const newValue = this.getValueAtPath(newState, breakpoint.path);

      // Check condition
      if (this.evaluateCondition(breakpoint, oldValue, newValue)) {
        breakpoint.hitCount++;

        const hit: BreakpointHit = {
          breakpoint,
          timestamp: Date.now(),
          oldValue,
          newValue,
          stackTrace: this.captureStackTrace(),
        };

        this.hits.push(hit);

        // Log message if specified
        if (breakpoint.logMessage) {
          const message = this.formatLogMessage(breakpoint.logMessage, hit);
          console.log(`[Breakpoint] ${message}`);
        }

        // Notify callbacks
        await this.notifyCallbacks(hit);
      }
    }

    // Update cache
    const newStateMap = new Map<string, unknown>();
    for (const breakpoint of breakpoints) {
      const value = this.getValueAtPath(newState, breakpoint.path);
      newStateMap.set(breakpoint.path, value);
    }
    this.stateCache.set(storeName, newStateMap);
  }

  /**
   * Get breakpoint hits
   * @param breakpointId
   */
  getHits(breakpointId?: string): BreakpointHit[] {
    if (breakpointId) {
      return this.hits.filter((hit) => hit.breakpoint.id === breakpointId);
    }
    return [...this.hits];
  }

  /**
   * Clear breakpoint hits
   */
  clearHits(): void {
    this.hits = [];
  }

  /**
   * Evaluate breakpoint condition
   * @param breakpoint
   * @param oldValue
   * @param newValue
   */
  private evaluateCondition(
    breakpoint: StateBreakpoint,
    oldValue: unknown,
    newValue: unknown
  ): boolean {
    switch (breakpoint.condition) {
      case BreakpointCondition.EQUALS:
        return this.deepEqual(newValue, breakpoint.value);

      case BreakpointCondition.NOT_EQUALS:
        return !this.deepEqual(newValue, breakpoint.value);

      case BreakpointCondition.CHANGED:
        return !this.deepEqual(oldValue, newValue);

      case BreakpointCondition.GREATER_THAN:
        return typeof newValue === 'number' && typeof breakpoint.value === 'number'
          ? newValue > breakpoint.value
          : false;

      case BreakpointCondition.LESS_THAN:
        return typeof newValue === 'number' && typeof breakpoint.value === 'number'
          ? newValue < breakpoint.value
          : false;

      case BreakpointCondition.CONTAINS:
        if (typeof newValue === 'string' && typeof breakpoint.value === 'string') {
          return newValue.includes(breakpoint.value);
        }
        if (Array.isArray(newValue)) {
          return newValue.includes(breakpoint.value);
        }
        return false;

      case BreakpointCondition.MATCHES:
        if (typeof newValue === 'string' && breakpoint.value instanceof RegExp) {
          return breakpoint.value.test(newValue);
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Get value at path in object
   * @param obj
   * @param object
   * @param path
   */
  private getValueAtPath(object: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = object;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Deep equality check
   * @param a
   * @param b
   */
  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) {return true;}
    if (a === null || b === null) {return false;}
    if (typeof a !== typeof b) {return false;}

    if (typeof a === 'object' && typeof b === 'object') {
      const aKeys = Object.keys(a);
      const bKeys = Object.keys(b);

      if (aKeys.length !== bKeys.length) {return false;}

      for (const key of aKeys) {
        if (!this.deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
          return false;
        }
      }

      return true;
    }

    return false;
  }

  /**
   * Capture stack trace
   */
  private captureStackTrace(): string[] {
    const stack = new Error().stack ?? '';
    return stack
      .split('\n')
      .slice(3) // Skip Error and this function
      .map((line) => line.trim());
  }

  /**
   * Format log message with placeholders
   * @param template
   * @param hit
   */
  private formatLogMessage(template: string, hit: BreakpointHit): string {
    return template
      .replace(/{path}/g, hit.breakpoint.path)
      .replace(/{oldValue}/g, JSON.stringify(hit.oldValue))
      .replace(/{newValue}/g, JSON.stringify(hit.newValue))
      .replace(/{storeName}/g, hit.breakpoint.storeName);
  }

  /**
   * Notify callbacks
   * @param hit
   */
  private async notifyCallbacks(hit: BreakpointHit): Promise<void> {
    for (const callback of this.callbacks) {
      try {
        await callback(hit);
      } catch (error) {
        console.error('Breakpoint callback error:', error);
      }
    }
  }

  /**
   * Generate breakpoint ID
   */
  private generateBreakpointId(): string {
    return `bp_${Date.now()}_${this.breakpointIdCounter++}`;
  }
}

// ============================================================================
// Global Provider Instance
// ============================================================================

let globalProvider: StateBreakpointProvider | null = null;

/**
 * Get or create global provider instance
 */
export function getGlobalBreakpointProvider(): StateBreakpointProvider {
  if (!globalProvider) {
    globalProvider = new StateBreakpointProvider();
  }
  return globalProvider;
}

/**
 * Reset global provider
 */
export function resetGlobalBreakpointProvider(): void {
  globalProvider = null;
}
