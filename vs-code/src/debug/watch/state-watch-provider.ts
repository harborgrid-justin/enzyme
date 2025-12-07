/**
 * @file State Watch Provider
 * @description Watch expressions for state paths with real-time updates
 */

// ============================================================================
// Types
// ============================================================================

export interface WatchExpression {
  id: string;
  expression: string;
  storeName?: string;
  enabled: boolean;
  value?: unknown;
  error?: string;
  lastUpdate: number;
  condition?: (value: unknown) => boolean;
  formatter?: (value: unknown) => string;
}

export interface WatchUpdate {
  expression: WatchExpression;
  oldValue: unknown;
  newValue: unknown;
  timestamp: number;
}

export type WatchCallback = (update: WatchUpdate) => void | Promise<void>;

// ============================================================================
// State Watch Provider
// ============================================================================

export class StateWatchProvider {
  private watches = new Map<string, WatchExpression>();
  private callbacks = new Map<string, Set<WatchCallback>>();
  private watchIdCounter = 0;

  /**
   * Add a watch expression
   */
  addWatch(
    expression: string,
    storeName?: string,
    formatter?: (value: unknown) => string,
    condition?: (value: unknown) => boolean
  ): WatchExpression {
    const watch: WatchExpression = {
      id: this.generateWatchId(),
      expression,
      storeName,
      enabled: true,
      lastUpdate: Date.now(),
      formatter,
      condition,
    };

    this.watches.set(watch.id, watch);
    return watch;
  }

  /**
   * Remove a watch
   */
  removeWatch(id: string): boolean {
    this.callbacks.delete(id);
    return this.watches.delete(id);
  }

  /**
   * Enable a watch
   */
  enableWatch(id: string): void {
    const watch = this.watches.get(id);
    if (watch) {
      watch.enabled = true;
    }
  }

  /**
   * Disable a watch
   */
  disableWatch(id: string): void {
    const watch = this.watches.get(id);
    if (watch) {
      watch.enabled = false;
    }
  }

  /**
   * Get all watches
   */
  getWatches(storeName?: string): WatchExpression[] {
    const watches = Array.from(this.watches.values());
    if (storeName) {
      return watches.filter((w) => w.storeName === storeName);
    }
    return watches;
  }

  /**
   * Get watch by ID
   */
  getWatch(id: string): WatchExpression | undefined {
    return this.watches.get(id);
  }

  /**
   * Clear all watches
   */
  clearWatches(): void {
    this.watches.clear();
    this.callbacks.clear();
  }

  /**
   * Register watch callback
   */
  onWatch(watchId: string, callback: WatchCallback): () => void {
    if (!this.callbacks.has(watchId)) {
      this.callbacks.set(watchId, new Set());
    }

    const callbacks = this.callbacks.get(watchId)!;
    callbacks.add(callback);

    return () => {
      callbacks.delete(callback);
    };
  }

  /**
   * Update watch values from state
   */
  async updateWatches(storeName: string, state: Record<string, unknown>): Promise<void> {
    const watches = this.getWatches(storeName);

    for (const watch of watches) {
      if (!watch.enabled) {
        continue;
      }

      const oldValue = watch.value;
      let newValue: unknown;
      let error: string | undefined;

      try {
        newValue = this.evaluateExpression(watch.expression, state);
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        newValue = undefined;
      }

      // Check if value changed
      if (!this.deepEqual(oldValue, newValue) || error !== watch.error) {
        watch.value = newValue;
        watch.error = error;
        watch.lastUpdate = Date.now();

        // Check condition if specified
        if (watch.condition && newValue !== undefined) {
          try {
            if (!watch.condition(newValue)) {
              continue;
            }
          } catch (err) {
            console.error('Watch condition error:', err);
            continue;
          }
        }

        // Notify callbacks
        await this.notifyCallbacks(watch.id, {
          expression: watch,
          oldValue,
          newValue,
          timestamp: Date.now(),
        });
      }
    }
  }

  /**
   * Get formatted watch value
   */
  getFormattedValue(id: string): string | undefined {
    const watch = this.watches.get(id);
    if (!watch) {
      return undefined;
    }

    if (watch.error) {
      return `Error: ${watch.error}`;
    }

    if (watch.value === undefined) {
      return 'undefined';
    }

    // Use custom formatter if provided
    if (watch.formatter) {
      try {
        return watch.formatter(watch.value);
      } catch (error) {
        return `Formatter error: ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    // Default formatting
    return this.defaultFormat(watch.value);
  }

  /**
   * Evaluate expression against state
   * SECURITY: Restricted to safe property access only, no arbitrary code execution
   */
  private evaluateExpression(expression: string, state: Record<string, unknown>): unknown {
    // Only allow simple path expressions for security
    // Patterns allowed: "property", "object.property", "array[0]", "nested.path.value"
    if (!/^[a-zA-Z_$][\w$.[\]0-9]*$/.test(expression)) {
      throw new Error(
        'Invalid expression. Only simple property paths are allowed (e.g., "user.name", "items[0].value"). ' +
        'Complex expressions are disabled for security reasons.'
      );
    }

    // Parse and evaluate the path safely
    return this.evaluatePropertyPath(state, expression);
  }

  /**
   * Safely evaluate a property path (e.g., "user.name" or "items[0].value")
   */
  private evaluatePropertyPath(obj: Record<string, unknown>, path: string): unknown {
    // Split by dots and handle array accessors
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // Handle array accessor like "items[0]"
      const arrayMatch = part.match(/^([a-zA-Z_$][\w]*)(\[(\d+)\])$/);
      if (arrayMatch) {
        const [, prop, , index] = arrayMatch;
        if (typeof current === 'object') {
          current = (current as Record<string, unknown>)[prop];
        } else {
          return undefined;
        }

        if (!Array.isArray(current)) {
          return undefined;
        }

        const idx = parseInt(index, 10);
        current = current[idx];
      } else {
        // Simple property access
        if (typeof current === 'object') {
          current = (current as Record<string, unknown>)[part];
        } else {
          return undefined;
        }
      }
    }

    return current;
  }

  /**
   * Get value at path in object
   */
  private getValueAtPath(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

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
   * Default value formatter
   */
  private defaultFormat(value: unknown): string {
    if (value === null) {
      return 'null';
    }

    if (value === undefined) {
      return 'undefined';
    }

    if (typeof value === 'string') {
      return `"${value}"`;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '[]';
      }
      if (value.length <= 3) {
        return `[${value.map((v) => this.defaultFormat(v)).join(', ')}]`;
      }
      return `Array(${value.length})`;
    }

    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) {
        return '{}';
      }
      if (keys.length <= 3) {
        const entries = keys
          .map((k) => `${k}: ${this.defaultFormat((value as Record<string, unknown>)[k])}`)
          .join(', ');
        return `{${entries}}`;
      }
      return `Object(${keys.length})`;
    }

    return String(value);
  }

  /**
   * Deep equality check
   */
  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (typeof a !== typeof b) return false;

    if (typeof a === 'object' && typeof b === 'object') {
      const aKeys = Object.keys(a);
      const bKeys = Object.keys(b);

      if (aKeys.length !== bKeys.length) return false;

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
   * Notify callbacks
   */
  private async notifyCallbacks(watchId: string, update: WatchUpdate): Promise<void> {
    const callbacks = this.callbacks.get(watchId);
    if (!callbacks) {
      return;
    }

    for (const callback of callbacks) {
      try {
        await callback(update);
      } catch (error) {
        console.error('Watch callback error:', error);
      }
    }
  }

  /**
   * Generate watch ID
   */
  private generateWatchId(): string {
    return `watch_${Date.now()}_${this.watchIdCounter++}`;
  }
}

// ============================================================================
// Global Provider Instance
// ============================================================================

let globalProvider: StateWatchProvider | null = null;

/**
 * Get or create global provider instance
 */
export function getGlobalWatchProvider(): StateWatchProvider {
  if (!globalProvider) {
    globalProvider = new StateWatchProvider();
  }
  return globalProvider;
}

/**
 * Reset global provider
 */
export function resetGlobalWatchProvider(): void {
  globalProvider = null;
}
