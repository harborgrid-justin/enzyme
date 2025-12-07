/**
 * @file Action Recorder
 * @description Record and replay dispatched actions
 */

// ============================================================================
// Types
// ============================================================================

export interface ActionRecord {
  /** Unique action ID */
  id: string;
  /** Action type */
  type: string;
  /** Action payload */
  payload?: unknown;
  /** Timestamp */
  timestamp: number;
  /** Store/slice name */
  store?: string;
  /** Source (e.g., 'user', 'system', 'api') */
  source?: string;
  /** State before action */
  stateBefore?: unknown;
  /** State after action */
  stateAfter?: unknown;
  /** Duration (ms) */
  duration?: number;
}

export interface RecorderOptions {
  /** Maximum number of actions to keep */
  maxActions?: number;
  /** Record state snapshots */
  recordState?: boolean;
  /** Stores to record (empty = all) */
  stores?: string[];
  /** Action type patterns to ignore */
  ignorePatterns?: RegExp[];
}

export interface RecorderFilter {
  /** Filter by store name */
  store?: string;
  /** Filter by action type */
  type?: string;
  /** Filter by source */
  source?: string;
  /** Time range (from) */
  fromTime?: number;
  /** Time range (to) */
  toTime?: number;
  /** Text search in type */
  search?: string;
}

export interface RecordingSession {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  actions: ActionRecord[];
}

// ============================================================================
// Action Recorder
// ============================================================================

export class ActionRecorder {
  private actions: ActionRecord[] = [];
  private sessions: Map<string, RecordingSession> = new Map();
  private currentSessionId: string | null = null;
  private isRecording = false;
  private options: Required<RecorderOptions>;
  private actionIdCounter = 0;

  constructor(options: RecorderOptions = {}) {
    this.options = {
      maxActions: options.maxActions ?? 1000,
      recordState: options.recordState ?? true,
      stores: options.stores ?? [],
      ignorePatterns: options.ignorePatterns ?? [],
    };
  }

  /**
   * Start recording actions
   */
  start(): void {
    this.isRecording = true;
  }

  /**
   * Stop recording actions
   */
  stop(): void {
    this.isRecording = false;
  }

  /**
   * Record an action
   */
  record(action: Omit<ActionRecord, 'id' | 'timestamp'>): ActionRecord {
    if (!this.isRecording) {
      return {
        ...action,
        id: this.generateActionId(),
        timestamp: Date.now(),
      };
    }

    // Check if action should be ignored
    if (this.shouldIgnoreAction(action.type)) {
      return {
        ...action,
        id: this.generateActionId(),
        timestamp: Date.now(),
      };
    }

    // Check store filter
    if (this.options.stores.length > 0 && action.store) {
      if (!this.options.stores.includes(action.store)) {
        return {
          ...action,
          id: this.generateActionId(),
          timestamp: Date.now(),
        };
      }
    }

    const record: ActionRecord = {
      ...action,
      id: this.generateActionId(),
      timestamp: Date.now(),
    };

    this.actions.push(record);

    // Add to current session if active
    if (this.currentSessionId) {
      const session = this.sessions.get(this.currentSessionId);
      if (session) {
        session.actions.push(record);
      }
    }

    // Enforce max actions limit
    if (this.actions.length > this.options.maxActions) {
      this.actions = this.actions.slice(-this.options.maxActions);
    }

    return record;
  }

  /**
   * Get all recorded actions
   */
  getActions(filter?: RecorderFilter): ActionRecord[] {
    return this.filterActions(this.actions, filter);
  }

  /**
   * Get action by ID
   */
  getAction(id: string): ActionRecord | undefined {
    return this.actions.find((action) => action.id === id);
  }

  /**
   * Clear all recorded actions
   */
  clear(): void {
    this.actions = [];
  }

  /**
   * Search actions by text
   */
  search(query: string): ActionRecord[] {
    const lowerQuery = query.toLowerCase();
    return this.actions.filter((action) => {
      return (
        action.type.toLowerCase().includes(lowerQuery) ||
        action.store?.toLowerCase().includes(lowerQuery) ||
        action.source?.toLowerCase().includes(lowerQuery) ||
        JSON.stringify(action.payload).toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * Export action log as JSON
   */
  export(): string {
    return JSON.stringify(
      {
        version: '1.0.0',
        exportTime: Date.now(),
        actions: this.actions,
        sessions: Array.from(this.sessions.values()),
      },
      null,
      2
    );
  }

  /**
   * Import action log from JSON
   */
  import(json: string): void {
    try {
      const data = JSON.parse(json);
      if (data.actions && Array.isArray(data.actions)) {
        this.actions = data.actions;
      }
      if (data.sessions && Array.isArray(data.sessions)) {
        this.sessions.clear();
        for (const session of data.sessions) {
          this.sessions.set(session.id, session);
        }
      }
    } catch (error) {
      throw new Error(`Failed to import action log: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Start a new recording session
   */
  startSession(name: string): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const session: RecordingSession = {
      id: sessionId,
      name,
      startTime: Date.now(),
      actions: [],
    };

    this.sessions.set(sessionId, session);
    this.currentSessionId = sessionId;
    this.start();

    return sessionId;
  }

  /**
   * End current recording session
   */
  endSession(): RecordingSession | null {
    if (!this.currentSessionId) {
      return null;
    }

    const session = this.sessions.get(this.currentSessionId);
    if (session) {
      session.endTime = Date.now();
    }

    this.currentSessionId = null;
    this.stop();

    return session ?? null;
  }

  /**
   * Get recording session
   */
  getSession(sessionId: string): RecordingSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions
   */
  getSessions(): RecordingSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Replay actions with a callback
   */
  async replay(
    actions: ActionRecord[],
    onAction: (action: ActionRecord) => void | Promise<void>,
    speed = 1
  ): Promise<void> {
    if (actions.length === 0) {
      return;
    }

    const startTime = actions[0].timestamp;

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const nextAction = actions[i + 1];

      // Execute action
      await onAction(action);

      // Wait for next action timing
      if (nextAction) {
        const delay = (nextAction.timestamp - action.timestamp) / speed;
        if (delay > 0) {
          await this.sleep(delay);
        }
      }
    }
  }

  /**
   * Get action statistics
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    byStore: Record<string, number>;
    bySource: Record<string, number>;
    avgDuration: number;
  } {
    const stats = {
      total: this.actions.length,
      byType: {} as Record<string, number>,
      byStore: {} as Record<string, number>,
      bySource: {} as Record<string, number>,
      avgDuration: 0,
    };

    let totalDuration = 0;
    let durationCount = 0;

    for (const action of this.actions) {
      // By type
      stats.byType[action.type] = (stats.byType[action.type] ?? 0) + 1;

      // By store
      if (action.store) {
        stats.byStore[action.store] = (stats.byStore[action.store] ?? 0) + 1;
      }

      // By source
      if (action.source) {
        stats.bySource[action.source] = (stats.bySource[action.source] ?? 0) + 1;
      }

      // Duration
      if (action.duration !== undefined) {
        totalDuration += action.duration;
        durationCount++;
      }
    }

    if (durationCount > 0) {
      stats.avgDuration = totalDuration / durationCount;
    }

    return stats;
  }

  /**
   * Get actions in time range
   */
  getActionsInRange(fromTime: number, toTime: number): ActionRecord[] {
    return this.actions.filter(
      (action) => action.timestamp >= fromTime && action.timestamp <= toTime
    );
  }

  /**
   * Filter actions
   */
  private filterActions(actions: ActionRecord[], filter?: RecorderFilter): ActionRecord[] {
    if (!filter) {
      return actions;
    }

    return actions.filter((action) => {
      if (filter.store && action.store !== filter.store) {
        return false;
      }

      if (filter.type && action.type !== filter.type) {
        return false;
      }

      if (filter.source && action.source !== filter.source) {
        return false;
      }

      if (filter.fromTime && action.timestamp < filter.fromTime) {
        return false;
      }

      if (filter.toTime && action.timestamp > filter.toTime) {
        return false;
      }

      if (filter.search) {
        const lowerSearch = filter.search.toLowerCase();
        if (!action.type.toLowerCase().includes(lowerSearch)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Check if action should be ignored
   */
  private shouldIgnoreAction(type: string): boolean {
    return this.options.ignorePatterns.some((pattern) => pattern.test(type));
  }

  /**
   * Generate unique action ID
   */
  private generateActionId(): string {
    return `action_${Date.now()}_${this.actionIdCounter++}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Global Recorder Instance
// ============================================================================

let globalRecorder: ActionRecorder | null = null;

/**
 * Get or create global recorder instance
 */
export function getGlobalRecorder(options?: RecorderOptions): ActionRecorder {
  if (!globalRecorder) {
    globalRecorder = new ActionRecorder(options);
  }
  return globalRecorder;
}

/**
 * Reset global recorder
 */
export function resetGlobalRecorder(): void {
  globalRecorder = null;
}
