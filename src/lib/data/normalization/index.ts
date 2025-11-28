/**
 * @file Normalization Module Index
 * @description Exports for the entity normalization library including
 * normalizer, denormalizer, and schema registry.
 */

// Normalizer
export {
  // Types
  type Entity,
  type EntityMap,
  type NormalizedEntities,
  type NormalizationResult,
  type EntitySchemaDefinition,
  type Schema,

  // Schema Classes
  EntitySchema,
  ArraySchema,
  ObjectSchema,
  UnionSchema,
  ValueSchema,

  // Schema Factory
  schema,

  // Core Functions
  normalize,
  normalizeAndMerge,
  normalizeBatch,

  // Entity Utilities
  getEntity,
  getEntities,
  getAllEntities,
  updateEntity,
  removeEntity,
  mergeEntities,
} from './normalizer';

// Denormalizer
export {
  // Types
  type DenormalizeOptions,

  // Core Functions
  denormalize,
  denormalizeEntity,
  denormalizeMany,
  denormalizeSelect,
  denormalizeShallow,

  // Factory
  createDenormalizer,

  // Utilities
  canDenormalize,
} from './denormalizer';

// Schema Registry
export {
  // Types
  type SchemaDefinition,
  type RelationDefinition,
  type SchemaRegistryConfig,
  type SchemaRegistry,
  type SchemaValidationResult,
  type SchemaValidationError,
  type SchemaValidationWarning,
  type ExportedSchemas,

  // Factory
  createSchemaRegistry,

  // Global Registry
  getGlobalRegistry,
  resetGlobalRegistry,
  registerSchema,
  getSchema,
  normalizeWithRegistry,
  denormalizeWithRegistry,

  // Schema Builder
  SchemaBuilder,
  defineSchema,
} from './schema-registry';
