/**
 * @file Debug Module Index
 * @description Main export file for Enzyme VS Code debugging tools
 */

// Imports for types used in this file
import { getGlobalRecorder } from './action-recorder';
import { getGlobalRouteBreakpointProvider } from './breakpoints/route-breakpoint-provider';
import { getGlobalBreakpointProvider } from './breakpoints/state-breakpoint-provider';
import { getGlobalInspector } from './network-inspector';
import { getGlobalProfiler } from './performance-profiler';
import { getGlobalTracker } from './render-tracker';
import { getGlobalSnapshotManager } from './snapshots/snapshot-manager';
import { getGlobalDebugger } from './state-debugger';
import { getGlobalWatchProvider } from './watch/state-watch-provider';
import type { ActionRecorder} from './action-recorder';
import type { RouteBreakpointProvider} from './breakpoints/route-breakpoint-provider';
import type { StateBreakpointProvider} from './breakpoints/state-breakpoint-provider';
import type { NetworkInspector} from './network-inspector';
import type { PerformanceProfiler} from './performance-profiler';
import type { RenderTracker} from './render-tracker';
import type { SnapshotManager} from './snapshots/snapshot-manager';
import type { StateDebugger} from './state-debugger';
import type { StateWatchProvider} from './watch/state-watch-provider';

// ============================================================================
// Core Debugging
// ============================================================================

export {
  StateDebugger,
  getGlobalDebugger,
  resetGlobalDebugger,
  type DebuggerConfig,
  type DebuggerState,
  type StateSnapshot,
  type TimeTravelState,
} from './state-debugger';

export {
  StateBridge,
  getGlobalBridge,
  resetGlobalBridge,
  MessageType,
  type BridgeMessage,
  type BridgeSession,
  type ConnectionConfig,
  type MessageHandler,
} from './state-bridge';

export {
  ActionRecorder,
  getGlobalRecorder,
  resetGlobalRecorder,
  type ActionRecord,
  type RecorderFilter,
  type RecorderOptions,
  type RecordingSession,
} from './action-recorder';

export {
  StateDiff,
  quickDiff,
  getDiffSummary,
  visualizeDiff,
  DiffType,
  type DiffNode,
  type DiffOptions,
  type DiffSummary,
} from './state-diff';

export {
  StateBreakpointProvider,
  getGlobalBreakpointProvider,
  resetGlobalBreakpointProvider,
  BreakpointCondition,
  type StateBreakpoint,
  type BreakpointHit,
  type BreakpointCallback,
} from './breakpoints/state-breakpoint-provider';

export {
  RouteBreakpointProvider,
  getGlobalRouteBreakpointProvider,
  resetGlobalRouteBreakpointProvider,
  RouteEventType,
  type RouteBreakpoint,
  type RouteEvent,
  type RouteBreakpointHit,
  type RouteBreakpointCallback,
} from './breakpoints/route-breakpoint-provider';

export {
  StateWatchProvider,
  getGlobalWatchProvider,
  resetGlobalWatchProvider,
  type WatchExpression,
  type WatchUpdate,
  type WatchCallback,
} from './watch/state-watch-provider';

export {
  RenderTracker,
  getGlobalTracker,
  resetGlobalTracker,
  RenderReason,
  type RenderRecord,
  type ComponentStats,
  type RenderTreeNode,
  type TrackerOptions,
} from './render-tracker';

export {
  PerformanceProfiler,
  getGlobalProfiler,
  resetGlobalProfiler,
  ProfileEventType,
  type ProfileEvent,
  type FlameGraphNode,
  type PerformanceMetrics,
  type ProfilerOptions,
} from './performance-profiler';

export {
  NetworkInspector,
  getGlobalInspector,
  resetGlobalInspector,
  type NetworkRequest,
  type RequestTiming,
  type RequestMock,
  type InspectorOptions,
  type NetworkStats,
} from './network-inspector';

export {
  SnapshotManager,
  getGlobalSnapshotManager,
  resetGlobalSnapshotManager,
  type Snapshot,
  type SnapshotComparison,
  type SnapshotOptions,
} from './snapshots/snapshot-manager';

// ============================================================================
// Debug Adapters
// ============================================================================

export {
  EnzymeDebugAdapter,
  getGlobalDebugAdapter,
  resetGlobalDebugAdapter,
  type DebugConfiguration,
  type VariableScope,
  type Variable,
  type StackFrame,
  type Thread,
} from './debug-adapter/enzyme-debug-adapter';

export {
  EnzymeDebugSession,
  getGlobalDebugSession,
  resetGlobalDebugSession,
  SessionState,
  type SessionOptions,
} from './debug-adapter/enzyme-debug-session';

export {
  DebugAdapterDescriptorFactory,
  getGlobalAdapterFactory,
  resetGlobalAdapterFactory,
  AdapterMode,
  type AdapterDescriptor,
  type AdapterFactoryOptions,
} from './debug-adapter/descriptors';

// ============================================================================
// Visualizations
// ============================================================================

export {
  StateTreeView,
  formatNodeValue,
  getNodeStyle,
  NodeType,
  type TreeNode,
  type TreeViewOptions,
  type NodeUpdate,
  type NodeUpdateCallback,
} from './visualizations/state-tree-view';

export {
  ActionTimeline,
  formatActionDetails,
  exportTimelineAsSVG,
  type TimelineItem,
  type TimelineGroup,
  type TimelineOptions,
  type TimeRange,
} from './visualizations/action-timeline';

export {
  DependencyGraph,
  getGlobalGraph,
  resetGlobalGraph,
  NodeKind,
  type GraphNode,
  type GraphEdge,
  type Graph,
  type LayoutOptions,
  type CircularDependency,
} from './visualizations/dependency-graph';

// ============================================================================
// Debug Features Registration
// ============================================================================

/**
 * Configuration for debug features
 */
export interface DebugFeaturesConfig {
  /** Enable state debugging */
  enableStateDebug?: boolean;
  /** Enable action recording */
  enableActionRecording?: boolean;
  /** Enable render tracking */
  enableRenderTracking?: boolean;
  /** Enable performance profiling */
  enableProfiling?: boolean;
  /** Enable network inspection */
  enableNetworkInspection?: boolean;
  /** Enable breakpoints */
  enableBreakpoints?: boolean;
  /** Enable watch expressions */
  enableWatch?: boolean;
  /** Enable snapshots */
  enableSnapshots?: boolean;
  /** Bridge configuration */
  bridge?: {
    url?: string;
    autoConnect?: boolean;
  };
  /** Auto-start features */
  autoStart?: boolean;
}

/**
 * Debug features instance
 */
export class DebugFeatures {
  private readonly config: Required<DebugFeaturesConfig>;
  private debugger?: StateDebugger;
  // private bridge?: StateBridge;
  private recorder?: ActionRecorder;
  private renderTracker?: RenderTracker;
  private profiler?: PerformanceProfiler;
  private networkInspector?: NetworkInspector;
  private stateBreakpoints?: StateBreakpointProvider;
  private routeBreakpoints?: RouteBreakpointProvider;
  private watchProvider?: StateWatchProvider;
  private snapshotManager?: SnapshotManager;

  /**
   *
   * @param config
   */
  constructor(config: DebugFeaturesConfig = {}) {
    this.config = {
      enableStateDebug: config.enableStateDebug ?? true,
      enableActionRecording: config.enableActionRecording ?? true,
      enableRenderTracking: config.enableRenderTracking ?? false,
      enableProfiling: config.enableProfiling ?? false,
      enableNetworkInspection: config.enableNetworkInspection ?? false,
      enableBreakpoints: config.enableBreakpoints ?? true,
      enableWatch: config.enableWatch ?? true,
      enableSnapshots: config.enableSnapshots ?? true,
      bridge: {
        url: config.bridge?.url ?? 'ws://localhost:3001',
        autoConnect: config.bridge?.autoConnect ?? false,
      },
      autoStart: config.autoStart ?? true,
    };
  }

  /**
   * Initialize debug features
   */
  async initialize(): Promise<void> {
    // State debugger
    if (this.config.enableStateDebug) {
      this.debugger = getGlobalDebugger({
        enableDevTools: true,
        enableRecording: this.config.enableActionRecording,
        enableSnapshots: this.config.enableSnapshots,
        bridge: this.config.bridge as { url: string; autoConnect?: boolean },
      });
      await this.debugger.initialize();
    }

    // Action recorder
    if (this.config.enableActionRecording) {
      this.recorder = getGlobalRecorder({
        maxActions: 1000,
        recordState: true,
      });
      if (this.config.autoStart) {
        this.recorder.start();
      }
    }

    // Render tracker
    if (this.config.enableRenderTracking) {
      this.renderTracker = getGlobalTracker({
        trackProps: true,
        trackState: true,
        detectUnnecessary: true,
      });
      if (this.config.autoStart) {
        this.renderTracker.start();
      }
    }

    // Performance profiler
    if (this.config.enableProfiling) {
      this.profiler = getGlobalProfiler({
        autoStart: this.config.autoStart,
      });
    }

    // Network inspector
    if (this.config.enableNetworkInspection) {
      this.networkInspector = getGlobalInspector({
        intercept: true,
        recordBodies: true,
      });
      if (this.config.autoStart) {
        this.networkInspector.start();
      }
    }

    // Breakpoints
    if (this.config.enableBreakpoints) {
      this.stateBreakpoints = getGlobalBreakpointProvider();
      this.routeBreakpoints = getGlobalRouteBreakpointProvider();
    }

    // Watch
    if (this.config.enableWatch) {
      this.watchProvider = getGlobalWatchProvider();
    }

    // Snapshots
    if (this.config.enableSnapshots) {
      this.snapshotManager = getGlobalSnapshotManager({
        maxSnapshots: 50,
      });
    }
  }

  /**
   * Get debugger instance
   */
  getDebugger(): StateDebugger | undefined {
    return this.debugger;
  }

  /**
   * Get recorder instance
   */
  getRecorder(): ActionRecorder | undefined {
    return this.recorder;
  }

  /**
   * Get render tracker instance
   */
  getRenderTracker(): RenderTracker | undefined {
    return this.renderTracker;
  }

  /**
   * Get profiler instance
   */
  getProfiler(): PerformanceProfiler | undefined {
    return this.profiler;
  }

  /**
   * Get network inspector instance
   */
  getNetworkInspector(): NetworkInspector | undefined {
    return this.networkInspector;
  }

  /**
   * Get state breakpoints provider
   */
  getStateBreakpoints(): StateBreakpointProvider | undefined {
    return this.stateBreakpoints;
  }

  /**
   * Get route breakpoints provider
   */
  getRouteBreakpoints(): RouteBreakpointProvider | undefined {
    return this.routeBreakpoints;
  }

  /**
   * Get watch provider
   */
  getWatchProvider(): StateWatchProvider | undefined {
    return this.watchProvider;
  }

  /**
   * Get snapshot manager
   */
  getSnapshotManager(): SnapshotManager | undefined {
    return this.snapshotManager;
  }

  /**
   * Dispose all debug features
   */
  dispose(): void {
    this.debugger?.dispose();
    this.recorder?.stop();
    this.renderTracker?.stop();
    this.profiler?.stop();
    this.networkInspector?.stop();
    this.snapshotManager?.dispose();
  }
}

// ============================================================================
// Global Features Instance
// ============================================================================

let globalFeatures: DebugFeatures | null = null;

/**
 * Register debug features
 * @param config
 */
export async function registerDebugFeatures(
  config: DebugFeaturesConfig = {}
): Promise<DebugFeatures> {
  if (!globalFeatures) {
    globalFeatures = new DebugFeatures(config);
    await globalFeatures.initialize();
  }
  return globalFeatures;
}

/**
 * Get registered debug features
 */
export function getDebugFeatures(): DebugFeatures | null {
  return globalFeatures;
}

/**
 * Dispose debug features
 */
export function disposeDebugFeatures(): void {
  if (globalFeatures) {
    globalFeatures.dispose();
    globalFeatures = null;
  }
}
