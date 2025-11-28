/**
 * @file Data Layer Module Index
 * @description Comprehensive frontend data layer library providing validation,
 * synchronization, normalization, integrity checking, and React hooks.
 *
 * @module @/lib/data
 *
 * ## Modules
 *
 * ### Validation
 * Schema-based validation with Zod-style API, runtime type checking, and form validation.
 * ```typescript
 * import { v, is, rules, useFormValidation } from '@/lib/data';
 * ```
 *
 * ### Synchronization
 * Multi-source data sync with conflict resolution and optimistic updates.
 * ```typescript
 * import { createSyncEngine, createConflictResolver, useOptimisticSync } from '@/lib/data';
 * ```
 *
 * ### Normalization
 * Entity normalization/denormalization with schema registry.
 * ```typescript
 * import { normalize, denormalize, schema, createSchemaRegistry } from '@/lib/data';
 * ```
 *
 * ### Integrity
 * Data integrity checking with consistency monitoring.
 * ```typescript
 * import { createIntegrityChecker, createConsistencyMonitor } from '@/lib/data';
 * ```
 *
 * ### React Hooks
 * Comprehensive hooks for all data operations.
 * ```typescript
 * import { useDataValidation, useDataSync, useDataIntegrity, useNormalizedData } from '@/lib/data';
 * ```
 *
 * @example
 * ```typescript
 * // Full example: Validated, normalized, synced data with integrity
 * import {
 *   v, schema, normalize, denormalize,
 *   createSyncEngine, createIntegrityChecker,
 *   useDataValidation, useDataSync, useDataIntegrity,
 * } from '@/lib/data';
 *
 * // Define schemas
 * const userSchema = v.object({
 *   id: v.string(),
 *   name: v.string().min(1),
 *   email: v.string().email(),
 * });
 *
 * const userEntitySchema = schema.entity('users');
 * const postEntitySchema = schema.entity('posts', {
 *   author: userEntitySchema,
 * });
 *
 * // Normalize API response
 * const { entities, result } = normalize(apiResponse, postEntitySchema);
 *
 * // Validate data
 * const validationResult = userSchema.safeParse(userData);
 *
 * // Use in React
 * function UserList() {
 *   const { isValid, errors } = useDataValidation(userSchema);
 *   const { data, sync } = useDataSync({ engine, entityType: 'users' });
 *   const { violations } = useDataIntegrity(checker, entities);
 * }
 * ```
 */

// =============================================================================
// VALIDATION MODULE
// =============================================================================

export {
  // Schema Validator
  v,
  BaseSchema,
  StringSchema,
  NumberSchema,
  BooleanSchema,
  DateSchema,
  ArraySchema as ValidationArraySchema,
  ObjectSchema as ValidationObjectSchema,
  EnumSchema,
  LiteralSchema,
  UnionSchema as ValidationUnionSchema,
  RecordSchema,
  UnknownSchema,
  SchemaValidationError,

  // Types
  type Schema as ValidationSchema,
  type ValidationResult,
  type ValidationIssue,

  // Runtime Checker
  is,
  assertIs,
  narrow,
  narrowOrDefault,
  safeGet,
  safeGetPath,

  // Type Guards
  assertString,
  assertNumber,
  assertBoolean,
  assertArray,
  assertObject,
  // assertFunction,
  assertDefined,
  // assertNonNull,
  // assertInstanceOf,

  // Brand Types
  type Brand,
  // type Branded,

  // Form Validator
  rules,
  createFormValidator,
  useFormValidation,
  useField,

  // Types
  // type FieldValidationRule,
  // type ValidationRuleResult,
  // type FormValidatorConfig,
  type FormValidator,
  type FormState,
  // type UseFormValidationOptions,
  // type UseFormValidationReturn,
} from './validation';

// =============================================================================
// SYNC MODULE
// =============================================================================

export {
  // Sync Engine
  createSyncEngine,
  createApiSource,
  createLocalStorageSource,
  createMemorySource,

  // Types
  type SourcePriority,
  type SyncDirection,
  type SyncStatus,
  type SyncMetadata,
  type SyncEventType,
  type SyncEvent,
  type SyncSource,
  type QueryOptions,
  type SyncEngineConfig,
  type EntitySyncConfig,
  type SyncOperation,
  type SyncEngine,
  type SyncOptions,
  type SyncResult,
  type SyncConflict,

  // Conflict Resolver
  createConflictResolver,
  threeWayMerge,
  compareVectorClocks,
  mergeVectorClocks,
  incrementVectorClock,
  createVectorClock,
  serverWinsResolver,
  clientWinsResolver,
  latestWinsResolver,
  threeWayMergeResolver,

  // Types
  type ConflictStrategy,
  type FieldStrategy,
  type Conflict,
  type ConflictResolutionResult,
  type ConflictResolverConfig,
  type VectorClock,
  type ConflictResolver,

  // Optimistic Sync
  useOptimisticSync,
  useOptimisticList,

  // Types
  type OptimisticStatus,
  type PendingChange,
  type OptimisticSyncConfig,
  type OptimisticSyncState,
  type OptimisticSyncActions,
  type OptimisticSyncReturn,
  type ListItem,
  type OptimisticListConfig,
  type PendingListOperation,
} from './sync';

// =============================================================================
// NORMALIZATION MODULE
// =============================================================================

export {
  // Normalizer
  normalize,
  normalizeAndMerge,
  normalizeBatch,
  schema,
  EntitySchema,
  ValueSchema,

  // Entity Utilities
  getEntity,
  getEntities,
  getAllEntities,
  updateEntity,
  removeEntity,
  mergeEntities,

  // Types
  type Entity,
  type EntityMap,
  type NormalizedEntities,
  type NormalizationResult,
  type EntitySchemaDefinition,

  // Denormalizer
  denormalize,
  denormalizeEntity,
  denormalizeMany,
  denormalizeSelect,
  denormalizeShallow,
  createDenormalizer,
  canDenormalize,

  // Types
  type DenormalizeOptions,

  // Schema Registry
  createSchemaRegistry,
  getGlobalRegistry,
  resetGlobalRegistry,
  registerSchema,
  getSchema,
  normalizeWithRegistry,
  denormalizeWithRegistry,
  SchemaBuilder,
  defineSchema,

  // Types
  type SchemaDefinition,
  type RelationDefinition,
  type SchemaRegistryConfig,
  type SchemaRegistry,
  type SchemaValidationResult,
  type SchemaValidationError as RegistryValidationError,
  type SchemaValidationWarning,
  type ExportedSchemas,
} from './normalization';

// =============================================================================
// INTEGRITY MODULE
// =============================================================================

export {
  // Integrity Checker
  createIntegrityChecker,
  createDuplicateDetectionRule,
  createStaleDataRule,
  createRequiredFieldsRule,
  createConsistencyRule,
  createUniqueConstraint,
  createRangeConstraint,
  createPatternConstraint,
  createEnumConstraint,

  // Types
  type ConstraintDefinition,
  type AnomalyRule,
  type AnomalyResult,
  type IntegrityViolation,
  type IntegrityReport,
  type IntegrityCheckerConfig,
  type RepairOptions,
  type RepairResult,
  type IntegrityChecker,

  // Consistency Monitor
  createConsistencyMonitor,
  useConsistencyMonitor,
  useDriftDetection,
  useIntegrityValidation,

  // Types
  type MonitorStatus,
  type StateSnapshot,
  type DriftResult,
  type MonitorEventType,
  type MonitorEvent,
  type MonitorEventListener,
  type ConsistencyMonitorConfig,
  type ConsistencyMonitor,
} from './integrity';

// =============================================================================
// REACT HOOKS
// =============================================================================

export {
  // Data Validation
  useDataValidation,
  useValidateOnChange,
  useValidateValue,
  useAsyncValidation,

  // Types
  type ValidationMode,
  type FieldErrors,
  type ValidationState,
  type UseDataValidationOptions,
  type UseDataValidationReturn,

  // Data Sync
  useDataSync,
  useSyncStatus,
  useSyncConflicts,

  // Types
  type SyncState,
  type UseDataSyncOptions,
  type UseDataSyncReturn,

  // Data Integrity
  useDataIntegrity,
  useIntegrityMonitor,
  useIntegrityDrift,
  useEntityIntegrity,

  // Types
  type IntegrityState,
  type UseDataIntegrityOptions,
  type UseDataIntegrityReturn,

  // Normalized Data
  useNormalizedData,
  useEntity,
  useEntities,
  useAllEntities,
  useEntitySelector,
  useNormalizedCrud,
  createNormalizedStore,

  // Types
  type NormalizedStore,
  type NormalizedDataState,
  type UseNormalizedDataOptions,
  type UseNormalizedDataReturn,
} from './hooks';
