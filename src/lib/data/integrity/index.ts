/**
 * @file Integrity Module Index
 * @description Exports for the data integrity library including
 * integrity checker, consistency monitor, and related utilities.
 */

// Integrity Checker
export {
  // Types
  type RelationDefinition,
  type ConstraintDefinition,
  type AnomalyRule,
  type AnomalyResult,
  type IntegrityViolation,
  type IntegrityReport,
  type IntegrityCheckerConfig,
  type RepairOptions,
  type RepairResult,
  type IntegrityChecker,

  // Factory
  createIntegrityChecker,

  // Built-in Anomaly Rules
  createDuplicateDetectionRule,
  createStaleDataRule,
  createRequiredFieldsRule,
  createConsistencyRule,

  // Built-in Constraints
  createUniqueConstraint,
  createRangeConstraint,
  createPatternConstraint,
  createEnumConstraint,
} from './integrity-checker';

// Consistency Monitor
export {
  // Types
  type MonitorStatus,
  type StateSnapshot,
  type DriftResult,
  type MonitorEventType,
  type MonitorEvent,
  type MonitorEventListener,
  type ConsistencyMonitorConfig,
  type ConsistencyMonitor,

  // Factory
  createConsistencyMonitor,

  // React Hooks
  useConsistencyMonitor,
  useDriftDetection,
  useIntegrityValidation,
} from './consistency-monitor';
