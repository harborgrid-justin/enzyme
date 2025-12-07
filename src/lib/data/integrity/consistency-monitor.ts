/**
 * @file Consistency Monitor
 * @description Real-time state consistency monitoring with automatic
 * validation, drift detection, and repair capabilities.
 *
 * Features:
 * - Real-time state change monitoring
 * - Automatic integrity validation on changes
 * - State drift detection between sources
 * - Consistency snapshots and comparison
 * - React integration with hooks
 *
 * @example
 * ```typescript
 * import { createConsistencyMonitor, useConsistencyMonitor } from '@/lib/data/integrity';
 *
 * const monitor = createConsistencyMonitor({
 *   integrityChecker: checker,
 *   onViolation: (violations) => console.error('Violations:', violations),
 *   autoRepair: false,
 * });
 *
 * // In React
 * const { status, violations, checkNow, repair } = useConsistencyMonitor(monitor, entities);
 * ```
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NormalizedEntities } from '../normalization/normalizer';
import type {
  IntegrityChecker,
  IntegrityReport,
  IntegrityViolation,
  RepairOptions,
  RepairResult,
} from './integrity-checker';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Monitor status
 */
export type MonitorStatus = 'idle' | 'checking' | 'valid' | 'invalid' | 'repairing' | 'error';

/**
 * State snapshot
 */
export interface StateSnapshot {
  /** Snapshot ID */
  id: string;
  /** Timestamp */
  timestamp: number;
  /** Entity counts */
  entityCounts: Record<string, number>;
  /** Hash of state for comparison */
  hash: string;
  /** Integrity report at snapshot time */
  report?: IntegrityReport;
  /** Optional label */
  label?: string;
}

/**
 * Drift detection result
 */
export interface DriftResult {
  /** Whether drift was detected */
  hasDrift: boolean;
  /** Snapshot comparison */
  snapshots: {
    source: StateSnapshot;
    target: StateSnapshot;
  };
  /** Changed entities */
  changes: {
    added: Record<string, string[]>;
    removed: Record<string, string[]>;
    modified: Record<string, string[]>;
  };
  /** Total change count */
  totalChanges: number;
}

/**
 * Monitor event types
 */
export type MonitorEventType =
  | 'check-start'
  | 'check-complete'
  | 'violation-detected'
  | 'repair-start'
  | 'repair-complete'
  | 'drift-detected'
  | 'snapshot-created'
  | 'status-change'
  | 'error';

/**
 * Monitor event
 */
export interface MonitorEvent {
  type: MonitorEventType;
  timestamp: number;
  data?: unknown;
}

/**
 * Event listener
 */
export type MonitorEventListener = (event: MonitorEvent) => void;

/**
 * Consistency monitor configuration
 */
export interface ConsistencyMonitorConfig {
  /** Integrity checker instance */
  integrityChecker: IntegrityChecker;
  /** Check interval in milliseconds (0 = manual only) */
  checkInterval?: number;
  /** Debounce time for change detection */
  debounceMs?: number;
  /** Auto repair on violations */
  autoRepair?: boolean;
  /** Repair options for auto repair */
  repairOptions?: RepairOptions;
  /** Max snapshots to keep */
  maxSnapshots?: number;
  /** Violation callback */
  onViolation?: (violations: IntegrityViolation[]) => void;
  /** Drift callback */
  onDrift?: (drift: DriftResult) => void;
  /** Error callback */
  onError?: (error: Error) => void;
}

/**
 * Consistency monitor interface
 */
export interface ConsistencyMonitor {
  /** Get current status */
  getStatus: () => MonitorStatus;
  /** Get last report */
  getLastReport: () => IntegrityReport | null;
  /** Run check now */
  check: (entities: NormalizedEntities) => Promise<IntegrityReport>;
  /** Repair violations */
  repair: (entities: NormalizedEntities, options?: RepairOptions) => RepairResult;
  /** Create snapshot */
  createSnapshot: (entities: NormalizedEntities, label?: string) => StateSnapshot;
  /** Get snapshots */
  getSnapshots: () => StateSnapshot[];
  /** Compare with snapshot */
  compareWithSnapshot: (entities: NormalizedEntities, snapshotId: string) => DriftResult | null;
  /** Detect drift between current and last snapshot */
  detectDrift: (entities: NormalizedEntities) => DriftResult | null;
  /** Start automatic monitoring */
  start: (getEntities: () => NormalizedEntities) => void;
  /** Stop monitoring */
  stop: () => void;
  /** Is monitoring active */
  isActive: () => boolean;
  /** Subscribe to events */
  subscribe: (listener: MonitorEventListener) => () => void;
  /** Get event history */
  getHistory: () => MonitorEvent[];
  /** Clear history */
  clearHistory: () => void;
  /** Dispose monitor */
  dispose: () => void;
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Generate simple hash for state comparison
 */
function hashState(entities: NormalizedEntities): string {
  const parts: string[] = [];

  for (const [type, entityMap] of Object.entries(entities).sort()) {
    const ids = Object.keys(entityMap).sort();
    parts.push(`${type}:${ids.length}:${ids.join(',')}`);
  }

  // Simple hash function
  const str = parts.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Count entities
 */
function countEntities(entities: NormalizedEntities): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [type, entityMap] of Object.entries(entities)) {
    counts[type] = Object.keys(entityMap).length;
  }
  return counts;
}

// =============================================================================
// CONSISTENCY MONITOR FACTORY
// =============================================================================

/**
 * Create a consistency monitor
 *
 * @param config - Monitor configuration
 * @returns Consistency monitor instance
 *
 * @example
 * ```typescript
 * const monitor = createConsistencyMonitor({
 *   integrityChecker: checker,
 *   checkInterval: 30000, // Check every 30 seconds
 *   autoRepair: false,
 *   onViolation: (violations) => {
 *     console.error('Data integrity violations:', violations);
 *     // Send to error tracking
 *   },
 * });
 *
 * // Manual check
 * const report = await monitor.check(state.entities);
 *
 * // Create snapshot before major operation
 * monitor.createSnapshot(state.entities, 'pre-migration');
 *
 * // Detect drift after operation
 * const drift = monitor.detectDrift(state.entities);
 * ```
 */
function createConsistencyMonitor(config: ConsistencyMonitorConfig): ConsistencyMonitor {
  const {
    integrityChecker,
    checkInterval = 0,
    debounceMs: _debounceMs = 100,
    autoRepair = false,
    repairOptions = {},
    maxSnapshots = 10,
    onViolation,
    onDrift,
    onError,
  } = config;

  // Internal state
  let status: MonitorStatus = 'idle';
  let lastReport: IntegrityReport | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
  let isActive = false;
  let getEntitiesFn: (() => NormalizedEntities) | null = null;

  const snapshots: StateSnapshot[] = [];
  const listeners: Set<MonitorEventListener> = new Set();
  const history: MonitorEvent[] = [];

  /**
   * Emit event
   */
  function emit(type: MonitorEventType, data?: unknown): void {
    const event: MonitorEvent = {
      type,
      timestamp: Date.now(),
      data,
    };

    history.push(event);
    if (history.length > 100) {
      history.shift();
    }

    listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[ConsistencyMonitor] Listener error:', error);
      }
    });
  }

  /**
   * Set status
   */
  function setStatus(newStatus: MonitorStatus): void {
    if (status !== newStatus) {
      status = newStatus;
      emit('status-change', { status: newStatus });
    }
  }

  /**
   * Get current status
   */
  function getStatus(): MonitorStatus {
    return status;
  }

  /**
   * Get last report
   */
  function getLastReport(): IntegrityReport | null {
    return lastReport;
  }

  /**
   * Run integrity check
   */
  async function check(entities: NormalizedEntities): Promise<IntegrityReport> {
    setStatus('checking');
    emit('check-start');

    try {
      const report = integrityChecker.check(entities);
      lastReport = report;

      if (report.violations.length > 0) {
        setStatus('invalid');
        emit('violation-detected', { violations: report.violations });
        onViolation?.(report.violations);

        if (autoRepair) {
          repair(entities, repairOptions);
        }
      } else {
        setStatus('valid');
      }

      emit('check-complete', { report });
      return report;
    } catch (error) {
      setStatus('error');
      emit('error', { error });
      onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Repair violations
   */
  function repair(entities: NormalizedEntities, options: RepairOptions = {}): RepairResult {
    if (!lastReport) {
      lastReport = integrityChecker.check(entities);
    }

    setStatus('repairing');
    emit('repair-start');

    try {
      const result = integrityChecker.repair(entities, lastReport, options);

      emit('repair-complete', { result });

      if (result.remaining.length === 0) {
        setStatus('valid');
      } else {
        setStatus('invalid');
      }

      return result;
    } catch (error) {
      setStatus('error');
      emit('error', { error });
      throw error;
    }
  }

  /**
   * Create state snapshot
   */
  function createSnapshot(entities: NormalizedEntities, label?: string): StateSnapshot {
    const snapshot: StateSnapshot = {
      id: generateId(),
      timestamp: Date.now(),
      entityCounts: countEntities(entities),
      hash: hashState(entities),
      report: lastReport ?? undefined,
      label,
    };

    snapshots.push(snapshot);

    // Trim old snapshots
    while (snapshots.length > maxSnapshots) {
      snapshots.shift();
    }

    emit('snapshot-created', { snapshot });
    return snapshot;
  }

  /**
   * Get all snapshots
   */
  function getSnapshots(): StateSnapshot[] {
    return [...snapshots];
  }

  /**
   * Compare current state with a snapshot
   */
  function compareWithSnapshot(
    entities: NormalizedEntities,
    snapshotId: string
  ): DriftResult | null {
    const sourceSnapshot = snapshots.find((s) => s.id === snapshotId);
    if (!sourceSnapshot) {
      return null;
    }

    const targetSnapshot: StateSnapshot = {
      id: generateId(),
      timestamp: Date.now(),
      entityCounts: countEntities(entities),
      hash: hashState(entities),
    };

    const changes: DriftResult['changes'] = {
      added: {},
      removed: {},
      modified: {},
    };

    // Detect changes
    const allTypes = new Set([
      ...Object.keys(sourceSnapshot.entityCounts),
      ...Object.keys(targetSnapshot.entityCounts),
    ]);

    let totalChanges = 0;

    for (const type of allTypes) {
      const sourceCount = sourceSnapshot.entityCounts[type] ?? 0;
      const targetCount = targetSnapshot.entityCounts[type] ?? 0;

      if (sourceCount !== targetCount) {
        const diff = targetCount - sourceCount;
        if (diff > 0) {
          changes.added[type] = [`+${diff} entities`];
        } else {
          changes.removed[type] = [`${diff} entities`];
        }
        totalChanges += Math.abs(diff);
      }
    }

    const hasDrift = sourceSnapshot.hash !== targetSnapshot.hash;

    const result: DriftResult = {
      hasDrift,
      snapshots: {
        source: sourceSnapshot,
        target: targetSnapshot,
      },
      changes,
      totalChanges,
    };

    if (hasDrift) {
      emit('drift-detected', { drift: result });
      onDrift?.(result);
    }

    return result;
  }

  /**
   * Detect drift from last snapshot
   */
  function detectDrift(entities: NormalizedEntities): DriftResult | null {
    const lastSnapshot = snapshots[snapshots.length - 1];
    if (!lastSnapshot) {
      return null;
    }

    return compareWithSnapshot(entities, lastSnapshot.id);
  }

  /**
   * Start automatic monitoring
   */
  function start(getEntities: () => NormalizedEntities): void {
    if (isActive) {
      return;
    }

    isActive = true;
    getEntitiesFn = getEntities;

    if (checkInterval > 0) {
      intervalId = setInterval(() => {
        if (getEntitiesFn) {
          void check(getEntitiesFn()).catch((error: unknown) => {
            console.error('[ConsistencyMonitor] Check error:', error);
          });
        }
      }, checkInterval);
    }
  }

  /**
   * Stop monitoring
   */
  function stop(): void {
    isActive = false;
    getEntitiesFn = null;

    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
      debounceTimeout = null;
    }
  }

  /**
   * Check if monitoring is active
   */
  function checkIsActive(): boolean {
    return isActive;
  }

  /**
   * Subscribe to events
   */
  function subscribe(listener: MonitorEventListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  /**
   * Get event history
   */
  function getHistory(): MonitorEvent[] {
    return [...history];
  }

  /**
   * Clear history
   */
  function clearHistory(): void {
    history.length = 0;
  }

  /**
   * Dispose monitor
   */
  function dispose(): void {
    stop();
    listeners.clear();
    history.length = 0;
    snapshots.length = 0;
    lastReport = null;
    status = 'idle';
  }

  return {
    getStatus,
    getLastReport,
    check,
    repair,
    createSnapshot,
    getSnapshots,
    compareWithSnapshot,
    detectDrift,
    start,
    stop,
    isActive: checkIsActive,
    subscribe,
    getHistory,
    clearHistory,
    dispose,
  };
}

export default createConsistencyMonitor;

// =============================================================================
// REACT HOOKS
// =============================================================================

/**
 * Hook for consistency monitoring
 *
 * @param monitor - Consistency monitor instance
 * @param entities - Normalized entities to monitor
 * @param options - Hook options
 * @returns Monitor state and actions
 *
 * @example
 * ```typescript
 * const { status, violations, lastReport, checkNow, repair, createSnapshot } =
 *   useConsistencyMonitor(monitor, state.entities);
 *
 * if (status === 'invalid') {
 *   return <Alert>Data integrity issues detected</Alert>;
 * }
 * ```
 */
export function useConsistencyMonitor(
  monitor: ConsistencyMonitor,
  entities: NormalizedEntities,
  options: {
    autoCheck?: boolean;
    checkOnMount?: boolean;
  } = {}
): {
  status: MonitorStatus;
  violations: IntegrityViolation[];
  lastReport: IntegrityReport | null;
  isChecking: boolean;
  isRepairing: boolean;
  checkNow: () => Promise<IntegrityReport>;
  repair: (options?: RepairOptions) => RepairResult;
  createSnapshot: (label?: string) => StateSnapshot;
  snapshots: StateSnapshot[];
} {
  const { autoCheck = false, checkOnMount = true } = options;

  const [status, setStatus] = useState<MonitorStatus>(monitor.getStatus());
  const [lastReport, setLastReport] = useState<IntegrityReport | null>(monitor.getLastReport());
  const [snapshots, setSnapshots] = useState<StateSnapshot[]>(monitor.getSnapshots());

  const entitiesRef = useRef(entities);

  // Update entities ref when entities change
  useEffect(() => {
    entitiesRef.current = entities;
  }, [entities]);

  // Subscribe to monitor events
  useEffect(() => {


    return monitor.subscribe((event) => {
      switch (event.type) {
        case 'status-change':
          setStatus((event.data as { status: MonitorStatus }).status);
          break;
        case 'check-complete':
          setLastReport((event.data as { report: IntegrityReport }).report);
          break;
        case 'snapshot-created':
          setSnapshots(monitor.getSnapshots());
          break;
      }
    });
  }, [monitor]);

  // Check on mount
  useEffect(() => {
    if (checkOnMount) {
      monitor.check(entities).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto check on entity changes
  useEffect(() => {
    if (autoCheck) {
      monitor.check(entities).catch(console.error);
    }
  }, [autoCheck, entities, monitor]);

  const checkNow = useCallback(async () => {
    return monitor.check(entitiesRef.current);
  }, [monitor]);

  const repairFn = useCallback(
    (repairOptions?: RepairOptions) => {
      return monitor.repair(entitiesRef.current, repairOptions);
    },
    [monitor]
  );

  const createSnapshotFn = useCallback(
    (label?: string) => {
      return monitor.createSnapshot(entitiesRef.current, label);
    },
    [monitor]
  );

  const violations = useMemo(() => lastReport?.violations ?? [], [lastReport]);

  return {
    status,
    violations,
    lastReport,
    isChecking: status === 'checking',
    isRepairing: status === 'repairing',
    checkNow,
    repair: repairFn,
    createSnapshot: createSnapshotFn,
    snapshots,
  };
}

/**
 * Hook for drift detection
 *
 * @param monitor - Consistency monitor instance
 * @param entities - Normalized entities
 * @returns Drift detection state and actions
 */
export function useDriftDetection(
  monitor: ConsistencyMonitor,
  entities: NormalizedEntities
): {
  hasDrift: boolean;
  drift: DriftResult | null;
  detectDrift: () => DriftResult | null;
  compareWithSnapshot: (snapshotId: string) => DriftResult | null;
  createSnapshot: (label?: string) => StateSnapshot;
  snapshots: StateSnapshot[];
} {
  const [drift, setDrift] = useState<DriftResult | null>(null);
  const [snapshots, setSnapshots] = useState<StateSnapshot[]>(monitor.getSnapshots());

  const entitiesRef = useRef(entities);

  // Update entities ref when entities change
  useEffect(() => {
    entitiesRef.current = entities;
  }, [entities]);

  useEffect(() => {
    return monitor.subscribe((event) => {
      if (event.type === 'drift-detected') {
        setDrift((event.data as { drift: DriftResult }).drift);
      }
      if (event.type === 'snapshot-created') {
        setSnapshots(monitor.getSnapshots());
      }
    });
  }, [monitor]);

  const detectDriftFn = useCallback(() => {
    const result = monitor.detectDrift(entitiesRef.current);
    setDrift(result);
    return result;
  }, [monitor]);

  const compareWithSnapshotFn = useCallback(
    (snapshotId: string) => {
      const result = monitor.compareWithSnapshot(entitiesRef.current, snapshotId);
      setDrift(result);
      return result;
    },
    [monitor]
  );

  const createSnapshotFn = useCallback(
    (label?: string) => {
      return monitor.createSnapshot(entitiesRef.current, label);
    },
    [monitor]
  );

  return {
    hasDrift: drift?.hasDrift ?? false,
    drift,
    detectDrift: detectDriftFn,
    compareWithSnapshot: compareWithSnapshotFn,
    createSnapshot: createSnapshotFn,
    snapshots,
  };
}

/**
 * Hook for integrity validation on state changes
 *
 * @param integrityChecker - Integrity checker instance
 * @param entities - Normalized entities
 * @param options - Hook options
 * @returns Validation state and actions
 */
export function useIntegrityValidation(
  integrityChecker: IntegrityChecker,
  entities: NormalizedEntities,
  options: {
    validateOnChange?: boolean;
    debounceMs?: number;
  } = {}
): {
  isValid: boolean;
  isValidating: boolean;
  violations: IntegrityViolation[];
  report: IntegrityReport | null;
  validate: () => IntegrityReport;
  checkEntity: (entityType: string, entityId: string) => IntegrityViolation[];
} {
  const { validateOnChange = true, debounceMs = 300 } = options;

  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const entitiesRef = useRef(entities);

  // Update entities ref when entities change
  useEffect(() => {
    entitiesRef.current = entities;
  }, [entities]);

  const validate = useCallback(() => {
    setIsValidating(true);
    const result = integrityChecker.check(entitiesRef.current);
    setReport(result);
    setIsValidating(false);
    return result;
  }, [integrityChecker]);

  const checkEntity = useCallback(
    (entityType: string, entityId: string) => {
      return integrityChecker.checkEntity(entityType, entityId, entitiesRef.current);
    },
    [integrityChecker]
  );

  // Validate on change with debounce
  useEffect(() => {
    if (!validateOnChange) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      validate();
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [entities, validateOnChange, debounceMs, validate]);

  return {
    isValid: report?.valid ?? true,
    isValidating,
    violations: report?.violations ?? [],
    report,
    validate,
    checkEntity,
  };
}
