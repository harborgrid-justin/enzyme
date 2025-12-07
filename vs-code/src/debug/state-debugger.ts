/**
 * @file State Debugger
 * @description Main debugger for Enzyme state with DevTools integration
 */

import { ActionRecorder, type ActionRecord } from './action-recorder';
import { StateBridge, MessageType, type BridgeMessage } from './state-bridge';
import { StateDiff, type DiffNode } from './state-diff';

// ============================================================================
// Types
// ============================================================================

/**
 *
 */
export interface StateSnapshot {
  id: string;
  name?: string;
  timestamp: number;
  state: unknown;
  storeName?: string;
  metadata?: Record<string, unknown>;
}

/**
 *
 */
export interface TimeTravelState {
  snapshots: StateSnapshot[];
  currentIndex: number;
  isTimeTraveling: boolean;
}

/**
 *
 */
export interface DebuggerConfig {
  /** Enable DevTools integration */
  enableDevTools?: boolean;
  /** Enable action recording */
  enableRecording?: boolean;
  /** Enable state snapshots */
  enableSnapshots?: boolean;
  /** Maximum snapshots to keep */
  maxSnapshots?: number;
  /** Bridge configuration */
  bridge?: {
    url: string;
    autoConnect?: boolean;
  };
}

/**
 *
 */
export interface DebuggerState {
  connected: boolean;
  recording: boolean;
  timeTraveling: boolean;
  snapshotCount: number;
  actionCount: number;
}

// ============================================================================
// State Debugger
// ============================================================================

/**
 *
 */
export class StateDebugger {
  private readonly config: Required<DebuggerConfig>;
  private snapshots: StateSnapshot[] = [];
  private readonly recorder: ActionRecorder;
  private readonly bridge: StateBridge | null = null;
  private readonly differ: StateDiff;
  private readonly timeTravel: TimeTravelState;
  private snapshotIdCounter = 0;
  private isInitialized = false;

  /**
   *
   * @param config
   */
  constructor(config: DebuggerConfig = {}) {
    this.config = {
      enableDevTools: config.enableDevTools ?? true,
      enableRecording: config.enableRecording ?? true,
      enableSnapshots: config.enableSnapshots ?? true,
      maxSnapshots: config.maxSnapshots ?? 100,
      bridge: config.bridge ?? { url: 'ws://localhost:3001', autoConnect: false },
    };

    this.recorder = new ActionRecorder({
      maxActions: 1000,
      recordState: true,
    });

    this.differ = new StateDiff({
      ignorePaths: ['_hasHydrated', '_timestamp'],
    });

    this.timeTravel = {
      snapshots: [],
      currentIndex: -1,
      isTimeTraveling: false,
    };

    if (this.config.bridge) {
      this.bridge = new StateBridge({
        url: this.config.bridge.url,
      });

      if (this.config.bridge.autoConnect) {
        this.connectToBridge().catch((error) => {
          console.error('Failed to connect to bridge:', error);
        });
      }
    }
  }

  /**
   * Initialize debugger
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.config.enableRecording) {
      this.recorder.start();
    }

    if (this.bridge) {
      this.setupBridgeHandlers();
    }

    this.isInitialized = true;
  }

  /**
   * Connect to dev server bridge
   */
  async connectToBridge(): Promise<void> {
    if (!this.bridge) {
      throw new Error('Bridge not configured');
    }

    await this.bridge.connect();
    this.bridge.subscribeToState();
  }

  /**
   * Disconnect from bridge
   */
  disconnectFromBridge(): void {
    if (this.bridge) {
      this.bridge.disconnect();
    }
  }

  /**
   * Capture state snapshot
   * @param state
   * @param name
   * @param storeName
   */
  captureSnapshot(state: unknown, name?: string, storeName?: string): StateSnapshot {
    const snapshot: StateSnapshot = {
      id: this.generateSnapshotId(),
      ...(name !== undefined && { name }),
      timestamp: Date.now(),
      state: this.deepClone(state),
      ...(storeName !== undefined && { storeName }),
    };

    if (this.config.enableSnapshots) {
      this.snapshots.push(snapshot);

      // Enforce max snapshots
      if (this.snapshots.length > this.config.maxSnapshots) {
        this.snapshots = this.snapshots.slice(-this.config.maxSnapshots);
      }
    }

    return snapshot;
  }

  /**
   * Get snapshot by ID
   * @param id
   */
  getSnapshot(id: string): StateSnapshot | undefined {
    return this.snapshots.find((s) => s.id === id);
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): StateSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Compute diff between two snapshots
   * @param snapshotId1
   * @param snapshotId2
   */
  computeDiff(snapshotId1: string, snapshotId2: string): DiffNode | null {
    const s1 = this.getSnapshot(snapshotId1);
    const s2 = this.getSnapshot(snapshotId2);

    if (!s1 || !s2) {
      return null;
    }

    return this.differ.diff(s1.state, s2.state);
  }

  /**
   * Record action
   * @param action
   */
  recordAction(action: Omit<ActionRecord, 'id' | 'timestamp'>): ActionRecord {
    return this.recorder.record(action);
  }

  /**
   * Get recorded actions
   */
  getActions(): ActionRecord[] {
    return this.recorder.getActions();
  }

  /**
   * Clear all recorded actions
   */
  clearActions(): void {
    this.recorder.clear();
  }

  /**
   * Export state and actions
   */
  exportDebugData(): string {
    return JSON.stringify(
      {
        version: '1.0.0',
        exportTime: Date.now(),
        snapshots: this.snapshots,
        actions: this.recorder.getActions(),
        sessions: this.recorder.getSessions(),
      },
      null,
      2
    );
  }

  /**
   * Import state and actions
   * @param json
   */
  importDebugData(json: string): void {
    try {
      const data = JSON.parse(json);

      if (data.snapshots && Array.isArray(data.snapshots)) {
        this.snapshots = data.snapshots;
      }

      if (data.actions) {
        this.recorder.import(JSON.stringify({ actions: data.actions }));
      }
    } catch (error) {
      throw new Error(
        `Failed to import debug data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Start time travel mode
   */
  startTimeTravel(): void {
    if (this.snapshots.length === 0) {
      throw new Error('No snapshots available for time travel');
    }

    this.timeTravel.snapshots = [...this.snapshots];
    this.timeTravel.currentIndex = this.snapshots.length - 1;
    this.timeTravel.isTimeTraveling = true;
  }

  /**
   * End time travel mode
   */
  endTimeTravel(): void {
    this.timeTravel.isTimeTraveling = false;
    this.timeTravel.currentIndex = -1;
  }

  /**
   * Go to previous snapshot
   */
  timeTravelPrevious(): StateSnapshot | null {
    if (!this.timeTravel.isTimeTraveling) {
      throw new Error('Not in time travel mode');
    }

    if (this.timeTravel.currentIndex > 0) {
      this.timeTravel.currentIndex--;
      return this.timeTravel.snapshots[this.timeTravel.currentIndex] ?? null;
    }

    return null;
  }

  /**
   * Go to next snapshot
   */
  timeTravelNext(): StateSnapshot | null {
    if (!this.timeTravel.isTimeTraveling) {
      throw new Error('Not in time travel mode');
    }

    if (this.timeTravel.currentIndex < this.timeTravel.snapshots.length - 1) {
      this.timeTravel.currentIndex++;
      return this.timeTravel.snapshots[this.timeTravel.currentIndex] ?? null;
    }

    return null;
  }

  /**
   * Go to specific snapshot
   * @param index
   */
  timeTravelTo(index: number): StateSnapshot | null {
    if (!this.timeTravel.isTimeTraveling) {
      throw new Error('Not in time travel mode');
    }

    if (index >= 0 && index < this.timeTravel.snapshots.length) {
      this.timeTravel.currentIndex = index;
      return this.timeTravel.snapshots[index] ?? null;
    }

    return null;
  }

  /**
   * Get current time travel state
   */
  getTimeTravelState(): StateSnapshot | null {
    if (!this.timeTravel.isTimeTraveling) {
      return null;
    }

    return this.timeTravel.snapshots[this.timeTravel.currentIndex] ?? null;
  }

  /**
   * Replay actions
   * @param onAction
   * @param fromIndex
   * @param toIndex
   * @param speed
   */
  async replayActions(
    onAction: (action: ActionRecord) => void | Promise<void>,
    fromIndex = 0,
    toIndex?: number,
    speed = 1
  ): Promise<void> {
    const actions = this.recorder.getActions();
    const actionsToReplay = actions.slice(fromIndex, toIndex);
    await this.recorder.replay(actionsToReplay, onAction, speed);
  }

  /**
   * Get debugger state
   */
  getState(): DebuggerState {
    return {
      connected: this.bridge?.getStatus().connected ?? false,
      recording: this.recorder.getActions().length > 0,
      timeTraveling: this.timeTravel.isTimeTraveling,
      snapshotCount: this.snapshots.length,
      actionCount: this.recorder.getActions().length,
    };
  }

  /**
   * Clear all snapshots
   */
  clearSnapshots(): void {
    this.snapshots = [];
  }

  /**
   * Dispose debugger
   */
  dispose(): void {
    this.disconnectFromBridge();
    this.recorder.stop();
    this.clearSnapshots();
    this.clearActions();
    this.isInitialized = false;
  }

  /**
   * Setup bridge message handlers
   */
  private setupBridgeHandlers(): void {
    if (!this.bridge) {
      return;
    }

    // Handle state snapshots
    this.bridge.on(MessageType.STATE_SNAPSHOT, (message: BridgeMessage) => {
      const { state, storeName } = message.payload as { state: unknown; storeName?: string };
      this.captureSnapshot(state, undefined, storeName);
    });

    // Handle state updates
    this.bridge.on(MessageType.STATE_UPDATE, (message: BridgeMessage) => {
      const { state, storeName } = message.payload as { state: unknown; storeName?: string };
      this.captureSnapshot(state, 'Auto', storeName);
    });

    // Handle recorded actions
    this.bridge.on(MessageType.ACTION_RECORDED, (message: BridgeMessage) => {
      const action = message.payload as Omit<ActionRecord, 'id' | 'timestamp'>;
      this.recordAction(action);
    });
  }

  /**
   * Generate snapshot ID
   */
  private generateSnapshotId(): string {
    return `snapshot_${Date.now()}_${this.snapshotIdCounter++}`;
  }

  /**
   * Deep clone value
   * @param value
   */
  private deepClone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }
}

// ============================================================================
// Global Debugger Instance
// ============================================================================

let globalDebugger: StateDebugger | null = null;

/**
 * Get or create global debugger instance
 * @param config
 */
export function getGlobalDebugger(config?: DebuggerConfig): StateDebugger {
  if (!globalDebugger) {
    globalDebugger = new StateDebugger(config);
  }
  return globalDebugger;
}

/**
 * Reset global debugger
 */
export function resetGlobalDebugger(): void {
  if (globalDebugger) {
    globalDebugger.dispose();
  }
  globalDebugger = null;
}
