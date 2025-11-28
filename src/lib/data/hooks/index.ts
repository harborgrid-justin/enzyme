/**
 * @file Data Hooks Module Index
 * @description Exports for React hooks for data validation, synchronization,
 * integrity checking, and normalized data management.
 */

// Data Validation Hooks
export {
  // Main Hook
  useDataValidation,

  // Specialized Hooks
  useValidateOnChange,
  useValidateValue,
  useAsyncValidation,

  // Types
  type ValidationMode,
  type FieldErrors,
  type ValidationState,
  type UseDataValidationOptions,
  type UseDataValidationReturn,
} from './useDataValidation';

// Data Sync Hooks
export {
  // Main Hook
  useDataSync,

  // Specialized Hooks
  useSyncStatus,
  useSyncConflicts,

  // Types
  type SyncState,
  type UseDataSyncOptions,
  type UseDataSyncReturn,
} from './useDataSync';

// Data Integrity Hooks
export {
  // Main Hook
  useDataIntegrity,

  // Specialized Hooks
  useIntegrityMonitor,
  useIntegrityDrift,
  useEntityIntegrity,

  // Types
  type IntegrityState,
  type UseDataIntegrityOptions,
  type UseDataIntegrityReturn,
} from './useDataIntegrity';

// Normalized Data Hooks
export {
  // Main Hook
  useNormalizedData,

  // Specialized Hooks
  useEntity,
  useEntities,
  useAllEntities,
  useEntitySelector,
  useNormalizedCrud,

  // Utilities
  createNormalizedStore,

  // Types
  type NormalizedStore,
  type NormalizedDataState,
  type UseNormalizedDataOptions,
  type UseNormalizedDataReturn,
} from './useNormalizedData';
