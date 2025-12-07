/**
 * @file Render Tracker
 * @description Track React component renders and detect performance issues
 */

// ============================================================================
// Types
// ============================================================================

/**
 *
 */
export interface RenderRecord {
  id: string;
  componentName: string;
  timestamp: number;
  duration: number;
  props?: Record<string, unknown>;
  state?: Record<string, unknown>;
  hooks?: unknown[];
  reason?: RenderReason;
  fiber?: {
    type: string;
    key: string | null;
  };
}

export enum RenderReason {
  PROPS_CHANGED = 'props_changed',
  STATE_CHANGED = 'state_changed',
  PARENT_RENDERED = 'parent_rendered',
  CONTEXT_CHANGED = 'context_changed',
  HOOKS_CHANGED = 'hooks_changed',
  FORCE_UPDATE = 'force_update',
  UNKNOWN = 'unknown',
}

/**
 *
 */
export interface ComponentStats {
  name: string;
  renderCount: number;
  totalDuration: number;
  avgDuration: number;
  maxDuration: number;
  minDuration: number;
  unnecessaryRenders: number;
  lastRender?: RenderRecord;
}

/**
 *
 */
export interface RenderTreeNode {
  componentName: string;
  renderTime: number;
  duration: number;
  children: RenderTreeNode[];
  props?: Record<string, unknown>;
}

/**
 *
 */
export interface TrackerOptions {
  /** Enable prop tracking */
  trackProps?: boolean;
  /** Enable state tracking */
  trackState?: boolean;
  /** Enable hook tracking */
  trackHooks?: boolean;
  /** Maximum render records to keep */
  maxRecords?: number;
  /** Detect unnecessary renders */
  detectUnnecessary?: boolean;
  /** Component name patterns to ignore */
  ignorePatterns?: RegExp[];
}

// ============================================================================
// Render Tracker
// ============================================================================

/**
 *
 */
export class RenderTracker {
  private readonly options: Required<TrackerOptions>;
  private renders: RenderRecord[] = [];
  private readonly stats = new Map<string, ComponentStats>();
  private renderIdCounter = 0;
  private isTracking = false;
  private renderTree: RenderTreeNode[] = [];
  private readonly activeRenders = new Map<string, RenderRecord>();

  /**
   *
   * @param options
   */
  constructor(options: TrackerOptions = {}) {
    this.options = {
      trackProps: options.trackProps ?? true,
      trackState: options.trackState ?? true,
      trackHooks: options.trackHooks ?? false,
      maxRecords: options.maxRecords ?? 1000,
      detectUnnecessary: options.detectUnnecessary ?? true,
      ignorePatterns: options.ignorePatterns ?? [/^[a-z]/, /Fragment/, /Provider/, /Consumer/],
    };
  }

  /**
   * Start tracking renders
   */
  start(): void {
    this.isTracking = true;
  }

  /**
   * Stop tracking renders
   */
  stop(): void {
    this.isTracking = false;
  }

  /**
   * Record component render start
   * @param componentName
   * @param props
   * @param state
   * @param hooks
   */
  startRender(
    componentName: string,
    props?: Record<string, unknown>,
    state?: Record<string, unknown>,
    hooks?: unknown[]
  ): string {
    if (!this.isTracking || this.shouldIgnore(componentName)) {
      return '';
    }

    const renderId = this.generateRenderId();
    const record: RenderRecord = {
      id: renderId,
      componentName,
      timestamp: performance.now(),
      duration: 0,
      ...(this.options.trackProps && props !== undefined && { props }),
      ...(this.options.trackState && state !== undefined && { state }),
      ...(this.options.trackHooks && hooks !== undefined && { hooks }),
    };

    this.activeRenders.set(renderId, record);
    return renderId;
  }

  /**
   * Record component render end
   * @param renderId
   * @param reason
   */
  endRender(renderId: string, reason?: RenderReason): void {
    if (!renderId) {
      return;
    }

    const record = this.activeRenders.get(renderId);
    if (!record) {
      return;
    }

    // Calculate duration
    record.duration = performance.now() - record.timestamp;
    if (reason !== undefined) {
      record.reason = reason;
    }

    // Detect unnecessary renders
    if (this.options.detectUnnecessary) {
      const isUnnecessary = this.detectUnnecessaryRender(record);
      if (isUnnecessary) {
        const stats = this.stats.get(record.componentName);
        if (stats) {
          stats.unnecessaryRenders++;
        }
      }
    }

    // Store record
    this.renders.push(record);
    this.activeRenders.delete(renderId);

    // Update stats
    this.updateStats(record);

    // Enforce max records
    if (this.renders.length > this.options.maxRecords) {
      this.renders = this.renders.slice(-this.options.maxRecords);
    }
  }

  /**
   * Get all render records
   * @param componentName
   */
  getRenders(componentName?: string): RenderRecord[] {
    if (componentName) {
      return this.renders.filter((r) => r.componentName === componentName);
    }
    return [...this.renders];
  }

  /**
   * Get component statistics
   * @param componentName
   */
  getStats(componentName?: string): ComponentStats | ComponentStats[] {
    if (componentName) {
      return this.stats.get(componentName) ?? this.createEmptyStats(componentName);
    }
    return [...this.stats.values()];
  }

  /**
   * Get slow renders (above threshold)
   * @param thresholdMs
   */
  getSlowRenders(thresholdMs = 16): RenderRecord[] {
    return this.renders.filter((r) => r.duration > thresholdMs);
  }

  /**
   * Get unnecessary renders
   */
  getUnnecessaryRenders(): RenderRecord[] {
    const unnecessary: RenderRecord[] = [];

    for (const record of this.renders) {
      if (this.detectUnnecessaryRender(record)) {
        unnecessary.push(record);
      }
    }

    return unnecessary;
  }

  /**
   * Get render tree
   */
  getRenderTree(): RenderTreeNode[] {
    return [...this.renderTree];
  }

  /**
   * Build render tree from records
   * @param records
   */
  buildRenderTree(records: RenderRecord[]): RenderTreeNode[] {
    // Sort by timestamp
    const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp);

    const tree: RenderTreeNode[] = [];
    const stack: RenderTreeNode[] = [];

    for (const record of sorted) {
      const node: RenderTreeNode = {
        componentName: record.componentName,
        renderTime: record.timestamp,
        duration: record.duration,
        children: [],
        ...(record.props !== undefined && { props: record.props }),
      };

      // Find parent based on timing
      while (stack.length > 0) {
        const parent = stack[stack.length - 1];
        if (!parent) {
          stack.pop();
          continue;
        }
        const parentEnd = parent.renderTime + parent.duration;

        if (record.timestamp < parentEnd) {
          parent.children.push(node);
          stack.push(node);
          break;
        } else {
          stack.pop();
        }
      }

      if (stack.length === 0) {
        tree.push(node);
        stack.push(node);
      }
    }

    this.renderTree = tree;
    return tree;
  }

  /**
   * Get optimization suggestions
   */
  getOptimizationSuggestions(): Array<{
    component: string;
    issue: string;
    suggestion: string;
    severity: 'low' | 'medium' | 'high';
  }> {
    const suggestions: Array<{
      component: string;
      issue: string;
      suggestion: string;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    for (const [componentName, stats] of this.stats) {
      // High render count
      if (stats.renderCount > 100) {
        suggestions.push({
          component: componentName,
          issue: `Rendered ${stats.renderCount} times`,
          suggestion: 'Consider using React.memo() or useMemo() to reduce re-renders',
          severity: stats.renderCount > 500 ? 'high' : 'medium',
        });
      }

      // Slow renders
      if (stats.avgDuration > 16) {
        suggestions.push({
          component: componentName,
          issue: `Average render time: ${stats.avgDuration.toFixed(2)}ms`,
          suggestion: 'Consider optimizing component logic or using code splitting',
          severity: stats.avgDuration > 50 ? 'high' : 'medium',
        });
      }

      // Unnecessary renders
      const unnecessaryPercent = (stats.unnecessaryRenders / stats.renderCount) * 100;
      if (unnecessaryPercent > 30) {
        suggestions.push({
          component: componentName,
          issue: `${unnecessaryPercent.toFixed(0)}% unnecessary renders`,
          suggestion: 'Use React.memo() with custom comparison or check prop dependencies',
          severity: unnecessaryPercent > 60 ? 'high' : 'medium',
        });
      }
    }

    return suggestions.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Clear all records
   */
  clear(): void {
    this.renders = [];
    this.stats.clear();
    this.renderTree = [];
    this.activeRenders.clear();
  }

  /**
   * Export tracking data
   */
  export(): string {
    return JSON.stringify(
      {
        version: '1.0.0',
        exportTime: Date.now(),
        renders: this.renders,
        stats: [...this.stats.entries()],
      },
      null,
      2
    );
  }

  /**
   * Detect unnecessary render
   * @param record
   */
  private detectUnnecessaryRender(record: RenderRecord): boolean {
    // Find previous render of same component
    const previousRenders = this.renders.filter(
      (r) => r.componentName === record.componentName && r.timestamp < record.timestamp
    );

    if (previousRenders.length === 0) {
      return false; // First render is not unnecessary
    }

    const previous = previousRenders[previousRenders.length - 1];
    if (!previous) {
      return false;
    }

    // Check if props changed
    if (record.props && previous.props) {
      if (this.deepEqual(record.props, previous.props)) {
        return true; // Props didn't change
      }
    }

    // Check if state changed
    if (record.state && previous.state) {
      if (this.deepEqual(record.state, previous.state)) {
        return true; // State didn't change
      }
    }

    return false;
  }

  /**
   * Update component statistics
   * @param record
   */
  private updateStats(record: RenderRecord): void {
    let stats = this.stats.get(record.componentName);

    if (!stats) {
      stats = this.createEmptyStats(record.componentName);
      this.stats.set(record.componentName, stats);
    }

    stats.renderCount++;
    stats.totalDuration += record.duration;
    stats.avgDuration = stats.totalDuration / stats.renderCount;
    stats.maxDuration = Math.max(stats.maxDuration, record.duration);
    stats.minDuration = Math.min(stats.minDuration, record.duration);
    stats.lastRender = record;
  }

  /**
   * Create empty stats object
   * @param componentName
   */
  private createEmptyStats(componentName: string): ComponentStats {
    return {
      name: componentName,
      renderCount: 0,
      totalDuration: 0,
      avgDuration: 0,
      maxDuration: 0,
      minDuration: Number.POSITIVE_INFINITY,
      unnecessaryRenders: 0,
    };
  }

  /**
   * Check if component should be ignored
   * @param componentName
   */
  private shouldIgnore(componentName: string): boolean {
    return this.options.ignorePatterns.some((pattern) => pattern.test(componentName));
  }

  /**
   * Generate render ID
   */
  private generateRenderId(): string {
    return `render_${Date.now()}_${this.renderIdCounter++}`;
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
}

// ============================================================================
// Global Tracker Instance
// ============================================================================

let globalTracker: RenderTracker | null = null;

/**
 * Get or create global tracker instance
 * @param options
 */
export function getGlobalTracker(options?: TrackerOptions): RenderTracker {
  if (!globalTracker) {
    globalTracker = new RenderTracker(options);
  }
  return globalTracker;
}

/**
 * Reset global tracker
 */
export function resetGlobalTracker(): void {
  globalTracker = null;
}
