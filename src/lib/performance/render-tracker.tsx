/**
 * @file Render Performance Tracker
 * @description Comprehensive React component render performance tracking with:
 * - Component render time tracking
 * - Re-render detection and analysis
 * - Render waterfall visualization data
 * - Wasted render detection
 * - Render phase breakdown (render vs commit)
 *
 * This module provides deep insights into React rendering performance,
 * helping identify components that may need optimization.
 *
 * @example
 * ```typescript
 * import { RenderTracker, trackRender, withRenderTracking } from '@/lib/performance';
 *
 * // Manual tracking
 * const tracker = RenderTracker.getInstance();
 * const stop = tracker.startRender('MyComponent');
 * // ... component renders ...
 * stop();
 *
 * // HOC tracking
 * const TrackedComponent = withRenderTracking(MyComponent, 'MyComponent');
 *
 * // Hook tracking (in component)
 * const { startRender, endRender } = useRenderMetrics('MyComponent');
 * ```
 */

import React from 'react';
import { RENDER_CONFIG, formatDuration } from '../../config/performance.config';

// ============================================================================
// Types
// ============================================================================

/**
 * Render phase type
 */
export type RenderPhase = 'render' | 'commit' | 'layout-effect' | 'effect';

/**
 * Render reason for re-renders
 */
export type RenderReason =
  | 'initial'
  | 'props-change'
  | 'state-change'
  | 'context-change'
  | 'parent-render'
  | 'hooks-change'
  | 'force-update'
  | 'unknown';

/**
 * Single render entry
 */
export interface RenderEntry {
  readonly id: string;
  readonly componentName: string;
  readonly componentId: string;
  readonly phase: RenderPhase;
  readonly duration: number;
  readonly startTime: number;
  readonly endTime: number;
  readonly isInitial: boolean;
  readonly reason: RenderReason;
  readonly propsChanged?: string[];
  readonly stateChanged?: string[];
  readonly isWasted: boolean;
  readonly parentId?: string;
  readonly depth: number;
  readonly timestamp: number;
}

/**
 * Component render statistics
 */
export interface ComponentRenderStats {
  readonly componentName: string;
  readonly totalRenders: number;
  readonly initialRenders: number;
  readonly reRenders: number;
  readonly wastedRenders: number;
  readonly wastedRenderRate: number;
  readonly totalRenderTime: number;
  readonly averageRenderTime: number;
  readonly minRenderTime: number;
  readonly maxRenderTime: number;
  readonly p50RenderTime: number;
  readonly p95RenderTime: number;
  readonly isSlowComponent: boolean;
  readonly lastRenderTime: number;
  readonly rendersByReason: Record<RenderReason, number>;
}

/**
 * Render waterfall entry for visualization
 */
export interface RenderWaterfallEntry {
  readonly id: string;
  readonly componentName: string;
  readonly startOffset: number;
  readonly duration: number;
  readonly depth: number;
  readonly phase: RenderPhase;
  readonly isWasted: boolean;
  readonly children: RenderWaterfallEntry[];
}

/**
 * Render interaction (user interaction leading to renders)
 */
export interface RenderInteraction {
  readonly id: string;
  readonly name: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly duration: number;
  readonly renderCount: number;
  readonly componentCount: number;
  readonly wastedRenderCount: number;
  readonly renders: RenderEntry[];
  readonly timestamp: number;
}

/**
 * Render tracker configuration
 */
export interface RenderTrackerConfig {
  /** Maximum render history entries */
  readonly maxHistorySize?: number;
  /** Slow component threshold (ms) */
  readonly slowThreshold?: number;
  /** Wasted render threshold (ms) - renders under this are considered wasted if no visible change */
  readonly wastedThreshold?: number;
  /** Enable profiling in production */
  readonly enableInProduction?: boolean;
  /** Sample rate (0-1) */
  readonly sampleRate?: number;
  /** Callback on slow render */
  readonly onSlowRender?: (entry: RenderEntry) => void;
  /** Callback on wasted render */
  readonly onWastedRender?: (entry: RenderEntry) => void;
  /** Enable debug logging */
  readonly debug?: boolean;
}

/**
 * Active render context for tracking hierarchies
 */
interface ActiveRender {
  readonly id: string;
  readonly componentName: string;
  readonly componentId: string;
  readonly startTime: number;
  readonly phase: RenderPhase;
  readonly isInitial: boolean;
  readonly parentId?: string;
  readonly depth: number;
}

/**
 * Component instance tracking
 */
interface ComponentInstance {
  readonly componentId: string;
  readonly componentName: string;
  readonly renderCount: number;
  readonly lastRenderTime: number;
  readonly lastProps?: Record<string, unknown>;
  readonly lastState?: Record<string, unknown>;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: Required<RenderTrackerConfig> = {
  maxHistorySize: 1000,
  slowThreshold: RENDER_CONFIG.slowComponentThreshold,
  wastedThreshold: RENDER_CONFIG.wastedRenderThreshold,
  enableInProduction: RENDER_CONFIG.enableProdProfiling,
  sampleRate: RENDER_CONFIG.sampleRate,
  onSlowRender: () => {},
  onWastedRender: () => {},
  debug: false,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate unique ID
 */
function generateId(): string {
  return `render_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate component instance ID
 */
function generateComponentId(componentName: string): string {
  return `${componentName}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedArr.length) - 1;
  const safeIndex = Math.max(0, Math.min(index, sortedArr.length - 1));
  const value = sortedArr[safeIndex];
  return value ?? 0;
}

/**
 * Check if we should sample this render
 */
function shouldSample(sampleRate: number): boolean {
  return Math.random() < sampleRate;
}

/**
 * Deep compare objects to detect changes
 */
function getChangedKeys(
  prev: Record<string, unknown> | undefined,
  next: Record<string, unknown> | undefined
): string[] {
  if (prev === undefined || prev === null || next === undefined || next === null) return [];

  const changed: string[] = [];
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);

  allKeys.forEach((key) => {
    if (prev[key] !== next[key]) {
      changed.push(key);
    }
  });

  return changed;
}

// ============================================================================
// Render Tracker Class
// ============================================================================

/**
 * Comprehensive render performance tracker
 */
export class RenderTracker {
  private static instance: RenderTracker | null = null;

  private readonly config: Required<RenderTrackerConfig>;
  private readonly renderHistory: RenderEntry[] = [];
  private readonly activeRenders: Map<string, ActiveRender> = new Map();
  private readonly componentInstances: Map<string, ComponentInstance> = new Map();
  private readonly interactions: RenderInteraction[] = [];

  private currentInteraction: {
    id: string;
    name: string;
    startTime: number;
    renders: RenderEntry[];
  } | null = null;

  private renderStack: string[] = [];
  private isEnabled = true;
  private readonly isProd = false;

  /**
   * Private constructor for singleton pattern
   */
  private constructor(config: RenderTrackerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Disable in production unless explicitly enabled
    if (this.isProd && !this.config.enableInProduction) {
      this.isEnabled = false;
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: RenderTrackerConfig): RenderTracker {
    RenderTracker.instance ??= new RenderTracker(config);
    return RenderTracker.instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  public static resetInstance(): void {
    RenderTracker.instance = null;
  }

  // ==========================================================================
  // Render Tracking
  // ==========================================================================

  /**
   * Start tracking a render
   */
  public startRender(
    componentName: string,
    options: {
      componentId?: string;
      phase?: RenderPhase;
      isInitial?: boolean;
      props?: Record<string, unknown>;
      state?: Record<string, unknown>;
    } = {}
  ): () => RenderEntry | null {
    if (!this.isEnabled || !shouldSample(this.config.sampleRate)) {
      return () => null;
    }

    const {
      componentId = this.getOrCreateComponentId(componentName),
      phase = 'render',
      isInitial = false,
      props,
      state,
    } = options;

    const id = generateId();
    const parentId = this.renderStack[this.renderStack.length - 1];
    const depth = this.renderStack.length;

    const activeRender: ActiveRender = {
      id,
      componentName,
      componentId,
      startTime: performance.now(),
      phase,
      isInitial,
      parentId,
      depth,
    };

    this.activeRenders.set(id, activeRender);
    this.renderStack.push(id);

    // Store props/state for change detection
    const instance = this.componentInstances.get(componentId);
    const propsChanged = props ? getChangedKeys(instance?.lastProps, props) : undefined;
    const stateChanged = state ? getChangedKeys(instance?.lastState, state) : undefined;

    // Return stop function
    return () => this.endRender(id, { propsChanged, stateChanged, props, state });
  }

  /**
   * Start tracking an interaction (e.g., click, input)
   */
  public startInteraction(name: string): () => RenderInteraction | null {
    if (!this.isEnabled) {
      return () => null;
    }

    this.currentInteraction = {
      id: generateId(),
      name,
      startTime: performance.now(),
      renders: [],
    };

    return () => this.endInteraction();
  }

  /**
   * Get render statistics for a component
   */
  public getComponentStats(componentName: string): ComponentRenderStats | null {
    const renders = this.renderHistory.filter((r) => r.componentName === componentName);
    if (renders.length === 0) return null;

    const durations = renders.map((r) => r.duration).sort((a, b) => a - b);
    const totalTime = durations.reduce((sum, d) => sum + d, 0);
    const wastedCount = renders.filter((r) => r.isWasted).length;
    const initialCount = renders.filter((r) => r.isInitial).length;

    const rendersByReason: Record<RenderReason, number> = {
      initial: 0,
      'props-change': 0,
      'state-change': 0,
      'context-change': 0,
      'parent-render': 0,
      'hooks-change': 0,
      'force-update': 0,
      unknown: 0,
    };

    renders.forEach((r) => {
      rendersByReason[r.reason]++;
    });

    const minDuration = durations[0] ?? 0;
    const maxDuration = durations[durations.length - 1] ?? 0;
    const lastRender = renders[renders.length - 1];
    const lastDuration = lastRender?.duration ?? 0;

    return {
      componentName,
      totalRenders: renders.length,
      initialRenders: initialCount,
      reRenders: renders.length - initialCount,
      wastedRenders: wastedCount,
      wastedRenderRate: (wastedCount / renders.length) * 100,
      totalRenderTime: totalTime,
      averageRenderTime: totalTime / renders.length,
      minRenderTime: minDuration,
      maxRenderTime: maxDuration,
      p50RenderTime: percentile(durations, 50),
      p95RenderTime: percentile(durations, 95),
      isSlowComponent: percentile(durations, 50) > this.config.slowThreshold,
      lastRenderTime: lastDuration,
      rendersByReason,
    };
  }

  /**
   * Get all component statistics
   */
  public getAllComponentStats(): ComponentRenderStats[] {
    const componentNames = new Set(this.renderHistory.map((r) => r.componentName));
    const stats: ComponentRenderStats[] = [];

    componentNames.forEach((name) => {
      const stat = this.getComponentStats(name);
      if (stat) stats.push(stat);
    });

    // Sort by total render time (most expensive first)
    return stats.sort((a, b) => b.totalRenderTime - a.totalRenderTime);
  }

  /**
   * Get slow components
   */
  public getSlowComponents(): ComponentRenderStats[] {
    return this.getAllComponentStats().filter((s) => s.isSlowComponent);
  }

  /**
   * Get components with wasted renders
   */
  public getWastedRenderComponents(): ComponentRenderStats[] {
    return this.getAllComponentStats()
      .filter((s) => s.wastedRenders > 0)
      .sort((a, b) => b.wastedRenderRate - a.wastedRenderRate);
  }

  // ==========================================================================
  // Interaction Tracking
  // ==========================================================================

  /**
   * Build render waterfall for visualization
   */
  public buildWaterfall(
    options: {
      interactionId?: string;
      startTime?: number;
      endTime?: number;
    } = {}
  ): RenderWaterfallEntry[] {
    let renders = [...this.renderHistory];

    // Filter by interaction if specified
    const { interactionId } = options;
    if (interactionId !== undefined && interactionId !== null && interactionId !== '') {
      const interaction = this.interactions.find((i) => i.id === interactionId);
      if (interaction !== undefined && interaction !== null) {
        // eslint-disable-next-line prefer-destructuring -- reassigning existing variable
        renders = interaction.renders;
      }
    }

    // Filter by time range
    if (options.startTime !== undefined) {
      const {startTime} = options;
      renders = renders.filter((r) => r.startTime >= startTime);
    }
    if (options.endTime !== undefined) {
      const {endTime} = options;
      renders = renders.filter((r) => r.endTime <= endTime);
    }

    if (renders.length === 0) return [];

    // Find root renders (no parent or parent not in list)
    const renderIds = new Set(renders.map((r) => r.id));
    const baseTime = renders.reduce((min, r) => Math.min(min, r.startTime), Infinity);

    // Build tree structure
    const buildEntry = (render: RenderEntry): RenderWaterfallEntry => {
      const children = renders
        .filter((r) => r.parentId === render.id)
        .map(buildEntry);

      return {
        id: render.id,
        componentName: render.componentName,
        startOffset: render.startTime - baseTime,
        duration: render.duration,
        depth: render.depth,
        phase: render.phase,
        isWasted: render.isWasted,
        children,
      };
    };

    // Get root entries
    const rootRenders = renders.filter(
      (r) => r.parentId === undefined || !renderIds.has(r.parentId)
    );

    return rootRenders.map(buildEntry);
  }

  /**
   * Export waterfall as JSON for visualization tools
   */
  public exportWaterfallJson(options?: Parameters<typeof this.buildWaterfall>[0]): string {
    return JSON.stringify(this.buildWaterfall(options), null, 2);
  }

  // ==========================================================================
  // Statistics & Analysis
  // ==========================================================================

  /**
   * Get render history
   */
  public getHistory(): RenderEntry[] {
    return [...this.renderHistory];
  }

  /**
   * Get recent renders
   */
  public getRecentRenders(count: number = 50): RenderEntry[] {
    return this.renderHistory.slice(-count);
  }

  /**
   * Get interactions
   */
  public getInteractions(): RenderInteraction[] {
    return [...this.interactions];
  }

  /**
   * Clear all history
   */
  public clear(): void {
    this.renderHistory.length = 0;
    this.interactions.length = 0;
    this.componentInstances.clear();
    this.log('History cleared');
  }

  // ==========================================================================
  // Waterfall Visualization
  // ==========================================================================

  /**
   * Enable tracking
   */
  public enable(): void {
    this.isEnabled = true;
    this.log('Tracking enabled');
  }

  /**
   * Disable tracking
   */
  public disable(): void {
    this.isEnabled = false;
    this.log('Tracking disabled');
  }

  // ==========================================================================
  // History & Management
  // ==========================================================================

  /**
   * Check if tracking is enabled
   */
  public isTrackingEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Generate render performance report
   */
  public generateReport(): string {
    const stats = this.getAllComponentStats();
    const slowComponents = this.getSlowComponents();
    const wastedComponents = this.getWastedRenderComponents();

    const totalRenders = this.renderHistory.length;
    const totalWasted = this.renderHistory.filter((r) => r.isWasted).length;
    const wastedRate = totalRenders > 0 ? (totalWasted / totalRenders) * 100 : 0;

    const lines = [
      '='.repeat(60),
      'RENDER PERFORMANCE REPORT',
      '='.repeat(60),
      '',
      `Generated: ${new Date().toISOString()}`,
      `Total Renders Tracked: ${totalRenders}`,
      `Unique Components: ${stats.length}`,
      `Wasted Render Rate: ${wastedRate.toFixed(1)}%`,
      '',
      '--- Slow Components ---',
      '',
    ];

    if (slowComponents.length === 0) {
      lines.push('  No slow components detected');
    } else {
      slowComponents.slice(0, 10).forEach((s) => {
        lines.push(
          `  - ${s.componentName}: avg ${formatDuration(s.averageRenderTime)}, ` +
          `p95 ${formatDuration(s.p95RenderTime)}`
        );
      });
    }

    lines.push('');
    lines.push('--- Components with Wasted Renders ---');
    lines.push('');

    if (wastedComponents.length === 0) {
      lines.push('  No wasted renders detected');
    } else {
      wastedComponents.slice(0, 10).forEach((s) => {
        lines.push(
          `  - ${s.componentName}: ${s.wastedRenders} wasted (${s.wastedRenderRate.toFixed(1)}%)`
        );
      });
    }

    lines.push('');
    lines.push('--- Top 10 Components by Render Time ---');
    lines.push('');

    stats.slice(0, 10).forEach((s, i) => {
      lines.push(
        `  ${i + 1}. ${s.componentName}: ${formatDuration(s.totalRenderTime)} total, ` +
        `${s.totalRenders} renders`
      );
    });

    lines.push('');
    lines.push('='.repeat(60));

    return lines.join('\n');
  }

  /**
   * End tracking a render
   */
  private endRender(
    renderId: string,
    options: {
      propsChanged?: string[];
      stateChanged?: string[];
      props?: Record<string, unknown>;
      state?: Record<string, unknown>;
    } = {}
  ): RenderEntry | null {
    const activeRender = this.activeRenders.get(renderId);
    if (activeRender === undefined) return null;

    const endTime = performance.now();
    const duration = endTime - activeRender.startTime;

    // Pop from render stack
    const stackIndex = this.renderStack.indexOf(renderId);
    if (stackIndex !== -1) {
      this.renderStack.splice(stackIndex, 1);
    }

    // Determine render reason
    const reason = this.determineRenderReason(
      activeRender,
      options.propsChanged,
      options.stateChanged
    );

    // Detect wasted render
    const isWasted = this.isWastedRender(duration, reason, options.propsChanged, options.stateChanged);

    const entry: RenderEntry = {
      id: renderId,
      componentName: activeRender.componentName,
      componentId: activeRender.componentId,
      phase: activeRender.phase,
      duration,
      startTime: activeRender.startTime,
      endTime,
      isInitial: activeRender.isInitial,
      reason,
      propsChanged: options.propsChanged,
      stateChanged: options.stateChanged,
      isWasted,
      parentId: activeRender.parentId,
      depth: activeRender.depth,
      timestamp: Date.now(),
    };

    // Update component instance
    this.updateComponentInstance(activeRender.componentId, activeRender.componentName, {
      props: options.props,
      state: options.state,
      renderTime: duration,
    });

    // Add to history
    this.renderHistory.push(entry);
    this.trimHistory();

    // Add to current interaction if active
    if (this.currentInteraction !== null) {
      this.currentInteraction.renders.push(entry);
    }

    // Callbacks
    if (duration > this.config.slowThreshold) {
      this.config.onSlowRender(entry);
      this.log(`Slow render: ${activeRender.componentName} (${formatDuration(duration)})`);
    }

    if (isWasted) {
      this.config.onWastedRender(entry);
      this.log(`Wasted render: ${activeRender.componentName}`);
    }

    // Cleanup
    this.activeRenders.delete(renderId);

    return entry;
  }

  /**
   * Determine the reason for a render
   */
  private determineRenderReason(
    activeRender: ActiveRender,
    propsChanged?: string[],
    stateChanged?: string[]
  ): RenderReason {
    if (activeRender.isInitial) return 'initial';
    if (propsChanged !== undefined && propsChanged.length > 0) return 'props-change';
    if (stateChanged !== undefined && stateChanged.length > 0) return 'state-change';
    if (activeRender.parentId !== undefined) return 'parent-render';
    return 'unknown';
  }

  /**
   * Detect if a render was wasted (no meaningful work done)
   */
  private isWastedRender(
    duration: number,
    reason: RenderReason,
    propsChanged?: string[],
    stateChanged?: string[]
  ): boolean {
    // Initial renders are never wasted
    if (reason === 'initial') return false;

    // Very fast renders with no detected changes are likely wasted
    if (duration < this.config.wastedThreshold) {
      if (reason === 'parent-render' || reason === 'unknown') {
        return true;
      }
      // Re-render with no props/state changes
      if ((propsChanged === undefined || propsChanged.length === 0) &&
          (stateChanged === undefined || stateChanged.length === 0)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get or create component instance ID
   */
  private getOrCreateComponentId(componentName: string): string {
    // In a real implementation, this would use React fiber to get stable IDs
    // For now, we generate a simple ID
    return generateComponentId(componentName);
  }

  /**
   * Update component instance tracking
   */
  private updateComponentInstance(
    componentId: string,
    componentName: string,
    data: {
      props?: Record<string, unknown>;
      state?: Record<string, unknown>;
      renderTime: number;
    }
  ): void {
    const existing = this.componentInstances.get(componentId);

    this.componentInstances.set(componentId, {
      componentId,
      componentName,
      renderCount: (existing?.renderCount ?? 0) + 1,
      lastRenderTime: data.renderTime,
      lastProps: data.props,
      lastState: data.state,
    });
  }

  // ==========================================================================
  // Reporting
  // ==========================================================================

  /**
   * End tracking an interaction
   */
  private endInteraction(): RenderInteraction | null {
    if (this.currentInteraction === null) return null;

    const endTime = performance.now();
    const { id, name, startTime, renders } = this.currentInteraction;

    const uniqueComponents = new Set(renders.map((r) => r.componentName));
    const wastedCount = renders.filter((r) => r.isWasted).length;

    const interaction: RenderInteraction = {
      id,
      name,
      startTime,
      endTime,
      duration: endTime - startTime,
      renderCount: renders.length,
      componentCount: uniqueComponents.size,
      wastedRenderCount: wastedCount,
      renders: [...renders],
      timestamp: Date.now(),
    };

    this.interactions.push(interaction);
    this.trimInteractions();

    this.currentInteraction = null;

    this.log(
      `Interaction "${name}": ${renders.length} renders, ` +
      `${uniqueComponents.size} components, ${formatDuration(interaction.duration)}`
    );

    return interaction;
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  /**
   * Trim history to max size
   */
  private trimHistory(): void {
    if (this.renderHistory.length > this.config.maxHistorySize) {
      this.renderHistory.splice(0, this.renderHistory.length - this.config.maxHistorySize);
    }
  }

  /**
   * Trim interactions to reasonable size
   */
  private trimInteractions(): void {
    if (this.interactions.length > 100) {
      this.interactions.splice(0, this.interactions.length - 100);
    }
  }

  /**
   * Debug logging
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.info(`[RenderTracker] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get the singleton RenderTracker instance
 */
export function getRenderTracker(config?: RenderTrackerConfig): RenderTracker {
  return RenderTracker.getInstance(config);
}

/**
 * Track a render (convenience function)
 */
export function trackRender(
  componentName: string,
  options?: Parameters<RenderTracker['startRender']>[1]
): ReturnType<RenderTracker['startRender']> {
  return getRenderTracker().startRender(componentName, options);
}

/**
 * Track an interaction (convenience function)
 */
export function trackInteraction(
  name: string
): ReturnType<RenderTracker['startInteraction']> {
  return getRenderTracker().startInteraction(name);
}

// ============================================================================
// React HOC for Render Tracking
// ============================================================================

/**
 * HOC that wraps a component with render tracking
 *
 * @example
 * ```tsx
 * const TrackedMyComponent = withRenderTracking(MyComponent, 'MyComponent');
 * ```
 */
export function withRenderTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.ComponentType<P> {
  const tracker = getRenderTracker();

  const TrackedComponent = (props: P): React.ReactElement => {
    const stopTracking = tracker.startRender(componentName, {
      props: props as Record<string, unknown>,
    });

    // We need to use useEffect to call stopTracking after render
    // This is a simplified version - in production you'd want to use
    // React's Profiler API or a more sophisticated approach

    // For now, we'll stop tracking immediately after render phase
    // A real implementation would hook into React's profiler
    void Promise.resolve().then(stopTracking);

    return <Component {...props} />;
  };

  TrackedComponent.displayName = `WithRenderTracking(${componentName})`;

  return TrackedComponent as React.ComponentType<P>;
}

// ============================================================================
// Exports
// ============================================================================

// Note: We can't use JSX here without importing React
// The withRenderTracking function above is a template - actual implementation
// would need to be in a .tsx file
