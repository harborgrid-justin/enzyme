/**
 * @file usePerformanceBudget Hook
 * @description React hook for performance budget awareness and enforcement.
 *
 * Provides components with real-time awareness of performance budget status,
 * enabling adaptive UI rendering based on budget violations.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isWithinBudget, degradationState, checkBudget } = usePerformanceBudget();
 *
 *   // Adapt rendering based on budget status
 *   if (!isWithinBudget('bundle.initial')) {
 *     return <LightweightVersion />;
 *   }
 *
 *   // Check custom budget
 *   const renderTime = measureRenderTime();
 *   checkBudget('customRender', renderTime, 16);
 *
 *   return <FullFeaturedVersion />;
 * }
 * ```
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  getBudgetManager,
  type PerformanceBudgetManager,
  type BudgetStatusSummary,
  type BudgetViolationRecord,
  type DegradationState,
  type BudgetThreshold,
  formatBudgetValue,
} from '../performance-budgets';

// ============================================================================
// Types
// ============================================================================

/**
 * Budget status for a specific metric
 */
export interface BudgetStatus {
  readonly name: string;
  readonly status: 'ok' | 'warning' | 'critical' | 'unknown';
  readonly currentValue: number | null;
  readonly threshold: BudgetThreshold | undefined;
  readonly percentOfBudget: number;
  readonly formattedValue: string;
  readonly formattedThreshold: string;
}

/**
 * Hook options
 */
export interface UsePerformanceBudgetOptions {
  /** Specific budgets to monitor (default: all) */
  readonly budgets?: string[];
  /** Callback on violation */
  readonly onViolation?: (violation: BudgetViolationRecord) => void;
  /** Callback on degradation change */
  readonly onDegradationChange?: (state: DegradationState) => void;
  /** Enable debug logging */
  readonly debug?: boolean;
}

/**
 * Hook return value
 */
export interface UsePerformanceBudgetReturn {
  /** Check if a specific budget is within limits */
  readonly isWithinBudget: (budgetName: string) => boolean;
  /** Get status for a specific budget */
  readonly getBudgetStatus: (budgetName: string) => BudgetStatus | null;
  /** Get all monitored budget statuses */
  readonly budgetStatuses: BudgetStatus[];
  /** Current degradation state */
  readonly degradationState: DegradationState;
  /** Whether any budget is violated */
  readonly hasViolations: boolean;
  /** Recent violations */
  readonly recentViolations: BudgetViolationRecord[];
  /** Overall health score (0-100) */
  readonly healthScore: number;
  /** Check a custom budget value */
  readonly checkBudget: (name: string, value: number, threshold?: number) => boolean;
  /** Record a metric value */
  readonly recordMetric: (name: string, value: number) => void;
  /** Check if degradation strategy is active */
  readonly isStrategyActive: (strategy: string) => boolean;
  /** Force degradation deactivation */
  readonly deactivateDegradation: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for performance budget awareness
 */
export function usePerformanceBudget(
  options: UsePerformanceBudgetOptions = {}
): UsePerformanceBudgetReturn {
  const { budgets, onViolation, onDegradationChange, debug = false } = options;

  // Get budget manager instance
  const managerRef = useRef<PerformanceBudgetManager | null>(null);

  if (managerRef.current === null) {
    managerRef.current = getBudgetManager({
      debug,
      onViolation: (violation) => {
        onViolation?.(violation);
      },
      onDegradationChange: (state) => {
        setDegradationState(state);
        onDegradationChange?.(state);
      },
    });
  }

  const manager = managerRef.current;

  // State
  const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatusSummary[]>([]);
  const [degradationState, setDegradationState] = useState<DegradationState>(() =>
    manager.getDegradationState()
  );
  const [healthScore, setHealthScore] = useState<number>(100);
  const [recentViolations, setRecentViolations] = useState<BudgetViolationRecord[]>([]);

  // Update statuses periodically
  useEffect(() => {
    const updateStatuses = () => {
      let statuses = manager.getAllStatuses();

      // Filter to specific budgets if specified
      if (budgets && budgets.length > 0) {
        statuses = statuses.filter((s) => budgets.includes(s.budgetName));
      }

      setBudgetStatuses(statuses);
      setHealthScore(manager.getHealthScore());
      setDegradationState(manager.getDegradationState());
      setRecentViolations(manager.getViolations().slice(-10));
    };

    // Initial update
    updateStatuses();

    // Periodic updates
    const intervalId = setInterval(updateStatuses, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [manager, budgets]);

  // Convert BudgetStatusSummary to BudgetStatus
  const formattedStatuses = useMemo<BudgetStatus[]>(() => {
    return budgetStatuses.map((summary) => {
      const unit = summary.threshold?.unit ?? 'ms';
      const percentOfBudget = summary.currentValue !== null && summary.threshold
        ? (summary.currentValue / summary.threshold.warning) * 100
        : 0;

      return {
        name: summary.budgetName,
        status: summary.status,
        currentValue: summary.currentValue,
        threshold: summary.threshold,
        percentOfBudget,
        formattedValue: summary.currentValue !== null
          ? formatBudgetValue(summary.currentValue, unit)
          : 'N/A',
        formattedThreshold: summary.threshold
          ? formatBudgetValue(summary.threshold.warning, unit)
          : 'N/A',
      };
    });
  }, [budgetStatuses]);

  // Check if within budget
  const isWithinBudget = useCallback(
    (budgetName: string): boolean => {
      const status = manager.getStatus(budgetName);
      return status?.status === 'ok' || status?.status === 'unknown';
    },
    [manager]
  );

  // Get budget status
  const getBudgetStatus = useCallback(
    (budgetName: string): BudgetStatus | null => {
      const summary = manager.getStatus(budgetName);
      if (!summary) return null;

      const unit = summary.threshold?.unit ?? 'ms';
      const percentOfBudget = summary.currentValue !== null && summary.threshold
        ? (summary.currentValue / summary.threshold.warning) * 100
        : 0;

      return {
        name: summary.budgetName,
        status: summary.status,
        currentValue: summary.currentValue,
        threshold: summary.threshold,
        percentOfBudget,
        formattedValue: summary.currentValue !== null
          ? formatBudgetValue(summary.currentValue, unit)
          : 'N/A',
        formattedThreshold: summary.threshold
          ? formatBudgetValue(summary.threshold.warning, unit)
          : 'N/A',
      };
    },
    [manager]
  );

  // Check custom budget
  const checkBudget = useCallback(
    (name: string, value: number, threshold?: number): boolean => {
      const budget = manager.getBudget(name);
      const effectiveThreshold = threshold ?? budget?.warning;

      if (effectiveThreshold === undefined) {
        if (debug) {
          console.warn(`[usePerformanceBudget] No threshold for budget: ${name}`);
        }
        return true;
      }

      manager.record(name, value);
      return value <= effectiveThreshold;
    },
    [manager, debug]
  );

  // Record metric
  const recordMetric = useCallback(
    (name: string, value: number): void => {
      manager.record(name, value);
    },
    [manager]
  );

  // Check if strategy is active
  const isStrategyActive = useCallback(
    (strategy: string): boolean => {
      // Validate strategy is a valid DegradationStrategy
      const validStrategies = [
        'reduce-animations',
        'reduce-images',
        'reduce-features',
        'reduce-polling',
        'defer-non-critical',
        'custom',
      ] as const;
      type ValidStrategy = (typeof validStrategies)[number];
      if (validStrategies.includes(strategy as ValidStrategy)) {
        return manager.isStrategyActive(strategy as ValidStrategy);
      }
      return false;
    },
    [manager]
  );

  // Deactivate degradation
  const deactivateDegradation = useCallback((): void => {
    manager.deactivateDegradation();
  }, [manager]);

  // Compute hasViolations
  const hasViolations = useMemo(() => {
    return formattedStatuses.some((s) => s.status === 'warning' || s.status === 'critical');
  }, [formattedStatuses]);

  return {
    isWithinBudget,
    getBudgetStatus,
    budgetStatuses: formattedStatuses,
    degradationState,
    hasViolations,
    recentViolations,
    healthScore,
    checkBudget,
    recordMetric,
    isStrategyActive,
    deactivateDegradation,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to get a single budget status
 */
export function useBudgetStatus(budgetName: string): BudgetStatus | null {
  const { getBudgetStatus } = usePerformanceBudget({ budgets: [budgetName] });
  return getBudgetStatus(budgetName);
}

/**
 * Hook to check if in degraded mode
 */
export function useDegradedMode(): {
  isDegraded: boolean;
  level: DegradationState['level'];
  strategies: string[];
} {
  const { degradationState } = usePerformanceBudget();

  return {
    isDegraded: degradationState.isActive,
    level: degradationState.level,
    strategies: degradationState.activeStrategies,
  };
}

/**
 * Hook to conditionally render based on budget
 */
export function useBudgetConditional<T>(
  budgetName: string,
  fullValue: T,
  reducedValue: T
): T {
  const { isWithinBudget } = usePerformanceBudget({ budgets: [budgetName] });

  return isWithinBudget(budgetName) ? fullValue : reducedValue;
}

// ============================================================================
// Exports
// ============================================================================

// Types are already exported at their declaration sites
