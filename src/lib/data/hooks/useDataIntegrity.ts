/**
 * @file useDataIntegrity Hook
 * @description React hook for monitoring and maintaining data integrity
 * with automatic validation, repair capabilities, and drift detection.
 *
 * Features:
 * - Real-time integrity monitoring
 * - Automatic and manual validation
 * - Integrity violation tracking
 * - Repair suggestions and execution
 * - State drift detection
 *
 * @example
 * ```typescript
 * import { useDataIntegrity, createIntegrityChecker } from '@/lib/data';
 *
 * const checker = createIntegrityChecker({
 *   entities: ['users', 'posts'],
 *   relations: [{ from: 'posts', field: 'authorId', to: 'users' }],
 * });
 *
 * function DataStatus() {
 *   const {
 *     isValid,
 *     violations,
 *     checkIntegrity,
 *     repair,
 *   } = useDataIntegrity(checker, normalizedEntities);
 *
 *   if (!isValid) {
 *     return <Alert>Data integrity issues: {violations.length}</Alert>;
 *   }
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { NormalizedEntities } from '../normalization/normalizer';
import type {
  IntegrityChecker,
  IntegrityReport,
  IntegrityViolation,
  RepairOptions,
  RepairResult,
} from '../integrity/integrity-checker';
import type {
  ConsistencyMonitor,
  MonitorStatus,
  StateSnapshot,
  DriftResult,
} from '../integrity/consistency-monitor';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Integrity state
 */
export interface IntegrityState {
  /** Overall validity */
  isValid: boolean;
  /** Is checking */
  isChecking: boolean;
  /** Is repairing */
  isRepairing: boolean;
  /** Last check report */
  lastReport: IntegrityReport | null;
  /** Current violations */
  violations: IntegrityViolation[];
  /** Violations by severity */
  violationsByType: {
    errors: IntegrityViolation[];
    warnings: IntegrityViolation[];
    info: IntegrityViolation[];
  };
  /** Last check timestamp */
  lastCheckAt: number | null;
  /** Check duration */
  lastCheckDuration: number | null;
}

/**
 * Integrity hook options
 */
export interface UseDataIntegrityOptions {
  /** Auto check on mount */
  autoCheck?: boolean;
  /** Auto check on entity changes */
  checkOnChange?: boolean;
  /** Debounce delay for change checks */
  debounceMs?: number;
  /** Auto repair on violations */
  autoRepair?: boolean;
  /** Repair only errors (not warnings) */
  repairErrorsOnly?: boolean;
  /** Callback on violations detected */
  onViolations?: (violations: IntegrityViolation[]) => void;
  /** Callback on integrity valid */
  onValid?: () => void;
  /** Callback on repair complete */
  onRepair?: (result: RepairResult) => void;
}

/**
 * Integrity hook return type
 */
export interface UseDataIntegrityReturn {
  /** Current state */
  state: IntegrityState;
  /** Is valid */
  isValid: boolean;
  /** Is checking */
  isChecking: boolean;
  /** Is repairing */
  isRepairing: boolean;
  /** All violations */
  violations: IntegrityViolation[];
  /** Error violations only */
  errors: IntegrityViolation[];
  /** Warning violations only */
  warnings: IntegrityViolation[];
  /** Last report */
  lastReport: IntegrityReport | null;
  /** Check integrity now */
  checkIntegrity: () => IntegrityReport;
  /** Check specific entity */
  checkEntity: (entityType: string, entityId: string) => IntegrityViolation[];
  /** Repair violations */
  repair: (options?: RepairOptions) => RepairResult;
  /** Clear state */
  clear: () => void;
  /** Get violations for entity */
  getEntityViolations: (entityType: string, entityId: string) => IntegrityViolation[];
  /** Check if entity has violations */
  hasEntityViolations: (entityType: string, entityId: string) => boolean;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for data integrity checking
 *
 * @param checker - Integrity checker instance
 * @param entities - Normalized entities to check
 * @param options - Hook options
 * @returns Integrity state and methods
 */
export function useDataIntegrity(
  checker: IntegrityChecker,
  entities: NormalizedEntities,
  options: UseDataIntegrityOptions = {}
): UseDataIntegrityReturn {
  const {
    autoCheck = true,
    checkOnChange = false,
    debounceMs = 300,
    autoRepair = false,
    repairErrorsOnly = true,
    onViolations,
    onValid,
    onRepair,
  } = options;

  // State
  const [state, setState] = useState<IntegrityState>({
    isValid: true,
    isChecking: false,
    isRepairing: false,
    lastReport: null,
    violations: [],
    violationsByType: {
      errors: [],
      warnings: [],
      info: [],
    },
    lastCheckAt: null,
    lastCheckDuration: null,
  });

  // Refs
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkerRef = useRef(checker);
  const entitiesRef = useRef(entities);
  const repairRef = useRef<((repairOptions?: RepairOptions) => RepairResult) | null>(null);

  // Update refs without causing re-renders
  useEffect(() => {
    checkerRef.current = checker;
  }, [checker]);

  useEffect(() => {
    entitiesRef.current = entities;
  }, [entities]);

  // Group violations by severity
  const groupViolations = useCallback((violations: IntegrityViolation[]) => {
    return {
      errors: violations.filter((v) => v.severity === 'error'),
      warnings: violations.filter((v) => v.severity === 'warning'),
      info: violations.filter((v) => v.severity === 'info'),
    };
  }, []);

  // Check integrity
  const checkIntegrity = useCallback((): IntegrityReport => {
    setState((prev) => ({ ...prev, isChecking: true }));

    const startTime = performance.now();
    const report = checkerRef.current.check(entitiesRef.current);
    const duration = performance.now() - startTime;

    const violationsByType = groupViolations(report.violations);

    setState({
      isValid: report.valid,
      isChecking: false,
      isRepairing: false,
      lastReport: report,
      violations: report.violations,
      violationsByType,
      lastCheckAt: Date.now(),
      lastCheckDuration: duration,
    });

    if (report.violations.length > 0) {
      onViolations?.(report.violations);

      if (autoRepair && repairRef.current != null) {
        // Defer repair to next tick
        setTimeout(() => {
          if (repairRef.current != null) {
            repairRef.current({ errorsOnly: repairErrorsOnly });
          }
        }, 0);
      }
    } else {
      onValid?.();
    }

    return report;
  }, [groupViolations, autoRepair, repairErrorsOnly, onViolations, onValid]);

  // Check specific entity
  const checkEntity = useCallback(
    (entityType: string, entityId: string): IntegrityViolation[] => {
      return checkerRef.current.checkEntity(entityType, entityId, entitiesRef.current);
    },
    []
  );

  // Repair violations
  const repair = useCallback(
    (repairOptions?: RepairOptions): RepairResult => {
      if (state.lastReport == null) {
        // Run check first if no report
        const report = checkIntegrity();
        if (report.valid) {
          return {
            entities: entitiesRef.current,
            repairs: [],
            remaining: [],
          };
        }
      }

      setState((prev) => ({ ...prev, isRepairing: true }));

      const result = checkerRef.current.repair(
        entitiesRef.current,
        state.lastReport as IntegrityReport,
        repairOptions
      );

      const violationsByType = groupViolations(result.remaining);

      setState((prev) => ({
        ...prev,
        isRepairing: false,
        isValid: result.remaining.length === 0,
        violations: result.remaining,
        violationsByType,
      }));

      onRepair?.(result);

      return result;
    },
    [state.lastReport, checkIntegrity, groupViolations, onRepair]
  );

  // Update repair ref
  useEffect(() => {
    repairRef.current = repair;
  }, [repair]);

  // Clear state
  const clear = useCallback(() => {
    setState({
      isValid: true,
      isChecking: false,
      isRepairing: false,
      lastReport: null,
      violations: [],
      violationsByType: {
        errors: [],
        warnings: [],
        info: [],
      },
      lastCheckAt: null,
      lastCheckDuration: null,
    });
  }, []);

  // Get violations for entity
  const getEntityViolations = useCallback(
    (entityType: string, entityId: string): IntegrityViolation[] => {
      return state.violations.filter(
        (v) => v.entityType === entityType && v.entityId === entityId
      );
    },
    [state.violations]
  );

  // Check if entity has violations
  const hasEntityViolations = useCallback(
    (entityType: string, entityId: string): boolean => {
      return state.violations.some(
        (v) => v.entityType === entityType && v.entityId === entityId
      );
    },
    [state.violations]
  );

  // Auto check on mount
  useEffect(() => {
    if (autoCheck) {
      checkIntegrity();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check on entity changes with debounce
  useEffect(() => {
    if (!checkOnChange) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      checkIntegrity();
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [entities, checkOnChange, debounceMs, checkIntegrity]);

  return {
    state,
    isValid: state.isValid,
    isChecking: state.isChecking,
    isRepairing: state.isRepairing,
    violations: state.violations,
    errors: state.violationsByType.errors,
    warnings: state.violationsByType.warnings,
    lastReport: state.lastReport,
    checkIntegrity,
    checkEntity,
    repair,
    clear,
    getEntityViolations,
    hasEntityViolations,
  };
}

// =============================================================================
// SPECIALIZED HOOKS
// =============================================================================

/**
 * Hook for monitoring integrity with consistency monitor
 *
 * @param monitor - Consistency monitor instance
 * @param entities - Normalized entities
 * @returns Monitor state and actions
 */
export function useIntegrityMonitor(
  monitor: ConsistencyMonitor,
  entities: NormalizedEntities
): {
  status: MonitorStatus;
  isValid: boolean;
  violations: IntegrityViolation[];
  lastReport: IntegrityReport | null;
  check: () => Promise<IntegrityReport>;
  repair: (options?: RepairOptions) => Promise<RepairResult>;
  createSnapshot: (label?: string) => StateSnapshot;
  snapshots: StateSnapshot[];
} {
  const [status, setStatus] = useState<MonitorStatus>(monitor.getStatus());
  const [lastReport, setLastReport] = useState<IntegrityReport | null>(monitor.getLastReport());
  const [snapshots, setSnapshots] = useState<StateSnapshot[]>(monitor.getSnapshots());

  const entitiesRef = useRef(entities);

  // Update ref without causing re-renders
  useEffect(() => {
    entitiesRef.current = entities;
  }, [entities]);

  useEffect(() => {
    const unsubscribe = monitor.subscribe((event) => {
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

    return unsubscribe;
  }, [monitor]);

  const check = useCallback(async () => {
    return monitor.check(entitiesRef.current);
  }, [monitor]);

  const repair = useCallback(
    (options?: RepairOptions) => {
      return monitor.repair(entitiesRef.current, options);
    },
    [monitor]
  );

  const createSnapshot = useCallback(
    (label?: string) => {
      return monitor.createSnapshot(entitiesRef.current, label);
    },
    [monitor]
  );

  return {
    status,
    isValid: status === 'valid',
    violations: lastReport?.violations ?? [],
    lastReport,
    check,
    repair,
    createSnapshot,
    snapshots,
  };
}

/**
 * Hook for drift detection
 *
 * @param monitor - Consistency monitor instance
 * @param entities - Normalized entities
 * @returns Drift detection state
 */
export function useIntegrityDrift(
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

  // Update ref without causing re-renders
  useEffect(() => {
    entitiesRef.current = entities;
  }, [entities]);

  useEffect(() => {
    const unsubscribe = monitor.subscribe((event) => {
      if (event.type === 'drift-detected') {
        setDrift((event.data as { drift: DriftResult }).drift);
      }
      if (event.type === 'snapshot-created') {
        setSnapshots(monitor.getSnapshots());
      }
    });

    return unsubscribe;
  }, [monitor]);

  const detectDrift = useCallback(() => {
    const result = monitor.detectDrift(entitiesRef.current);
    setDrift(result);
    return result;
  }, [monitor]);

  const compareWithSnapshot = useCallback(
    (snapshotId: string) => {
      const result = monitor.compareWithSnapshot(entitiesRef.current, snapshotId);
      setDrift(result);
      return result;
    },
    [monitor]
  );

  const createSnapshot = useCallback(
    (label?: string) => {
      return monitor.createSnapshot(entitiesRef.current, label);
    },
    [monitor]
  );

  return {
    hasDrift: drift?.hasDrift ?? false,
    drift,
    detectDrift,
    compareWithSnapshot,
    createSnapshot,
    snapshots,
  };
}

/**
 * Hook for entity-level integrity checking
 *
 * @param checker - Integrity checker instance
 * @param entities - Normalized entities
 * @param entityType - Entity type to check
 * @param entityId - Entity ID to check
 * @returns Entity integrity state
 */
export function useEntityIntegrity(
  checker: IntegrityChecker,
  entities: NormalizedEntities,
  entityType: string,
  entityId: string
): {
  isValid: boolean;
  violations: IntegrityViolation[];
  check: () => IntegrityViolation[];
} {
  // Use useMemo to compute violations from dependencies
  const violations = useMemo(() => {
    return checker.checkEntity(entityType, entityId, entities);
  }, [checker, entities, entityType, entityId]);

  const [manualViolations, setManualViolations] = useState<IntegrityViolation[] | null>(null);

  const check = useCallback(() => {
    const result = checker.checkEntity(entityType, entityId, entities);
    setManualViolations(result);
    return result;
  }, [checker, entities, entityType, entityId]);

  // Use manual violations if available, otherwise use auto-computed
  const activeViolations = manualViolations ?? violations;

return {
  isValid: activeViolations.length === 0,
  violations: activeViolations,
  check,
};
}