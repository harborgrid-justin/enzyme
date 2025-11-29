/**
 * @file Schema Registry
 * @description Central registry for managing entity schemas with relationship
 * tracking, validation, and schema versioning support.
 *
 * Features:
 * - Centralized schema management
 * - Automatic relationship inference
 * - Schema versioning and migration
 * - Schema validation and integrity checks
 * - Lazy schema resolution for circular references
 *
 * @example
 * ```typescript
 * import { createSchemaRegistry, schema } from '@/lib/data/normalization';
 *
 * const registry = createSchemaRegistry();
 *
 * registry.register('users', {
 *   relations: {
 *     posts: schema.array('posts'),
 *     profile: 'profiles',
 *   },
 * });
 *
 * registry.register('posts', {
 *   relations: {
 *     author: 'users',
 *     comments: schema.array('comments'),
 *   },
 * });
 *
 * const { entities, result } = registry.normalize(data, 'posts');
 * ```
 */

import {
  EntitySchema,
  ArraySchema,
  ObjectSchema,
  UnionSchema,
  ValueSchema,
  type Schema,
  type Entity,
  type NormalizedEntities,
  type NormalizationResult,
  normalize as baseNormalize,
} from './normalizer';
import { denormalize as baseDenormalize, type DenormalizeOptions } from './denormalizer';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Schema definition for registry
 */
export interface SchemaDefinition {
  /** ID attribute name or function */
  idAttribute?: string | ((entity: Entity) => string);
  /** Relationship definitions (can reference other schemas by name) */
  relations?: Record<string, string | Schema | RelationDefinition>;
  /** Process entity after extraction */
  processStrategy?: (entity: Entity) => Entity;
  /** Merge strategy for duplicate entities */
  mergeStrategy?: (existing: Entity, incoming: Entity) => Entity;
  /** Fields to exclude from normalization */
  excludeFields?: string[];
  /** Schema version */
  version?: number;
  /** Migration function from previous version */
  migrate?: (entity: Entity, fromVersion: number) => Entity;
}

/**
 * Relation definition
 */
export interface RelationDefinition {
  /** Schema name or schema instance */
  schema: string | Schema;
  /** Relation type */
  type: 'entity' | 'array' | 'union';
  /** For union types, the discriminator */
  schemaAttribute?: string | ((entity: Entity) => string);
  /** Union schema mappings */
  schemas?: Record<string, string>;
}

/**
 * Registered schema entry
 */
interface RegisteredSchema {
  name: string;
  definition: SchemaDefinition;
  schema: EntitySchema | null;
  version: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Schema registry configuration
 */
export interface SchemaRegistryConfig {
  /** Enable strict mode (throw on undefined schemas) */
  strict?: boolean;
  /** Enable automatic reverse relationship inference */
  inferReverseRelations?: boolean;
  /** Default ID attribute */
  defaultIdAttribute?: string;
  /** Schema version storage key */
  versionStorageKey?: string;
  /** Enable schema caching */
  enableCaching?: boolean;
}

/**
 * Schema registry interface
 */
export interface SchemaRegistry {
  /** Register a schema */
  register: (name: string, definition?: SchemaDefinition) => EntitySchema;
  /** Get a schema by name */
  get: (name: string) => EntitySchema | undefined;
  /** Check if schema exists */
  has: (name: string) => boolean;
  /** Get all registered schema names */
  getNames: () => string[];
  /** Get all schemas */
  getAll: () => Map<string, EntitySchema>;
  /** Unregister a schema */
  unregister: (name: string) => boolean;
  /** Clear all schemas */
  clear: () => void;
  /** Normalize data using registry */
  normalize: <T = string | string[]>(data: unknown, schemaName: string) => NormalizationResult<T>;
  /** Denormalize data using registry */
  denormalize: <T = unknown>(
    input: unknown,
    schemaName: string,
    entities: NormalizedEntities,
    options?: DenormalizeOptions
  ) => T | null;
  /** Validate schema integrity */
  validate: () => SchemaValidationResult;
  /** Get schema dependencies */
  getDependencies: (name: string) => string[];
  /** Get reverse dependencies */
  getReverseDependencies: (name: string) => string[];
  /** Export schemas for serialization */
  export: () => ExportedSchemas;
  /** Import schemas from serialization */
  import: (schemas: ExportedSchemas) => void;
  /** Get schema version */
  getVersion: (name: string) => number;
  /** Migrate entity to latest schema version */
  migrateEntity: (name: string, entity: Entity, fromVersion: number) => Entity;
}

/**
 * Schema validation result
 */
export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaValidationError[];
  warnings: SchemaValidationWarning[];
}

/**
 * Schema validation error
 */
export interface SchemaValidationError {
  schema: string;
  type: 'missing_relation' | 'circular_dependency' | 'invalid_definition';
  message: string;
  details?: unknown;
}

/**
 * Schema validation warning
 */
export interface SchemaValidationWarning {
  schema: string;
  type: 'unused_schema' | 'missing_reverse_relation' | 'potential_issue';
  message: string;
  details?: unknown;
}

/**
 * Exported schemas format
 */
export interface ExportedSchemas {
  version: string;
  schemas: Record<string, SchemaDefinition & { name: string }>;
  exportedAt: string;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: Required<SchemaRegistryConfig> = {
  strict: false,
  inferReverseRelations: false,
  defaultIdAttribute: 'id',
  versionStorageKey: 'schema_versions',
  enableCaching: true,
};

// =============================================================================
// SCHEMA REGISTRY FACTORY
// =============================================================================

/**
 * Create a schema registry
 *
 * @param config - Registry configuration
 * @returns Schema registry instance
 *
 * @example
 * ```typescript
 * const registry = createSchemaRegistry({ strict: true });
 *
 * // Register schemas
 * registry.register('users', {
 *   relations: {
 *     posts: { schema: 'posts', type: 'array' },
 *   },
 * });
 *
 * registry.register('posts', {
 *   relations: {
 *     author: 'users',
 *   },
 * });
 *
 * // Use registry
 * const { entities, result } = registry.normalize(apiData, 'posts');
 * const post = registry.denormalize('101', 'posts', entities);
 * ```
 */
export function createSchemaRegistry(config: SchemaRegistryConfig = {}): SchemaRegistry {
  const options: Required<SchemaRegistryConfig> = { ...DEFAULT_CONFIG, ...config };

  // Internal storage
  const registeredSchemas = new Map<string, RegisteredSchema>();
  const resolvedSchemas = new Map<string, EntitySchema>();
  const schemaCache = new Map<string, Schema>();

  /**
   * Resolve a relation definition to a Schema
   */
  function resolveRelation(relation: string | Schema | RelationDefinition): Schema {
    // String reference
    if (typeof relation === 'string') {
      return getOrCreateSchema(relation);
    }

    // Already a schema
    if (relation instanceof EntitySchema ||
        relation instanceof ArraySchema ||
        relation instanceof ObjectSchema ||
        relation instanceof UnionSchema ||
        relation instanceof ValueSchema) {
      return relation;
    }

    // Relation definition
    const def = relation;
    const baseSchema = typeof def.schema === 'string'
      ? getOrCreateSchema(def.schema)
      : def.schema;

    switch (def.type) {
      case 'array':
        return new ArraySchema(baseSchema);

      case 'union': {
        if (!def.schemas) {
          throw new Error('Union relation requires schemas mapping');
        }
        const unionSchemas: Record<string, EntitySchema> = {};
        for (const [key, schemaName] of Object.entries(def.schemas)) {
          unionSchemas[key] = getOrCreateSchema(schemaName);
        }
        return new UnionSchema(unionSchemas, def.schemaAttribute);
      }

      case 'entity':
      default:
        return baseSchema;
    }
  }

  /**
   * Get or create a schema by name
   */
  function getOrCreateSchema(name: string): EntitySchema {
    // Check resolved cache
    const cachedSchema = resolvedSchemas.get(name);
    if (cachedSchema != null) {
      return cachedSchema;
    }

    // Check if registered
    const registered = registeredSchemas.get(name);
    if (registered?.schema) {
      return registered.schema;
    }

    // Create placeholder for forward reference
    if (options.strict && !registeredSchemas.has(name)) {
      throw new Error(`[SchemaRegistry] Schema "${name}" is not registered`);
    }

    // Create new schema
    const schema = new EntitySchema(name, {
      idAttribute: options.defaultIdAttribute,
    });

    resolvedSchemas.set(name, schema);
    return schema;
  }

  /**
   * Build full schema from definition
   */
  function buildSchema(name: string, definition: SchemaDefinition): EntitySchema {
    const relations: Record<string, Schema> = {};

    // Resolve all relations
    if (definition.relations) {
      for (const [key, value] of Object.entries(definition.relations)) {
        relations[key] = resolveRelation(value);
      }
    }

    // Create entity schema
    const schema = new EntitySchema(name, {
      idAttribute: definition.idAttribute ?? options.defaultIdAttribute,
      relations: relations as Record<string, EntitySchema | ArraySchema | UnionSchema>,
      processStrategy: definition.processStrategy,
      mergeStrategy: definition.mergeStrategy,
      excludeFields: definition.excludeFields,
    });

    return schema;
  }

  /**
   * Resolve all pending schema references
   */
  function resolveAllSchemas(): void {
    // First pass: build all schemas
    for (const [name, registered] of registeredSchemas) {
      if (!registered.schema) {
        registered.schema = buildSchema(name, registered.definition);
        resolvedSchemas.set(name, registered.schema);
      }
    }

    // Second pass: update references for circular dependencies
    for (const [name, registered] of registeredSchemas) {
      if (registered.definition.relations) {
        // const schema = registered.schema!;
        const newRelations: Record<string, Schema> = {};

        for (const [key, value] of Object.entries(registered.definition.relations)) {
          newRelations[key] = resolveRelation(value);
        }

        // Replace schema with updated relations
        const updatedSchema = new EntitySchema(name, {
          idAttribute: registered.definition.idAttribute ?? options.defaultIdAttribute,
          relations: newRelations as Record<string, EntitySchema | ArraySchema | UnionSchema>,
          processStrategy: registered.definition.processStrategy,
          mergeStrategy: registered.definition.mergeStrategy,
          excludeFields: registered.definition.excludeFields,
        });

        registered.schema = updatedSchema;
        resolvedSchemas.set(name, updatedSchema);
      }
    }
  }

  /**
   * Register a schema
   */
  function register(name: string, definition: SchemaDefinition = {}): EntitySchema {
    const now = Date.now();
    const existing = registeredSchemas.get(name);

    registeredSchemas.set(name, {
      name,
      definition,
      schema: null,
      version: definition.version !== undefined && definition.version !== 0 ? definition.version : 1,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });

    // Clear resolved cache to force rebuild
    resolvedSchemas.delete(name);
    schemaCache.clear();

    // Resolve all schemas
    resolveAllSchemas();

    const resolved = resolvedSchemas.get(name);
    if (resolved === undefined) {
      throw new Error(`Failed to resolve schema: ${name}`);
    }
    return resolved;
  }

  /**
   * Get a schema by name
   */
  function get(name: string): EntitySchema | undefined {
    return resolvedSchemas.get(name);
  }

  /**
   * Check if schema exists
   */
  function has(name: string): boolean {
    return registeredSchemas.has(name);
  }

  /**
   * Get all registered schema names
   */
  function getNames(): string[] {
    return Array.from(registeredSchemas.keys());
  }

  /**
   * Get all schemas
   */
  function getAll(): Map<string, EntitySchema> {
    return new Map(resolvedSchemas);
  }

  /**
   * Unregister a schema
   */
  function unregister(name: string): boolean {
    const existed = registeredSchemas.delete(name);
    resolvedSchemas.delete(name);
    schemaCache.clear();
    return existed;
  }

  /**
   * Clear all schemas
   */
  function clear(): void {
    registeredSchemas.clear();
    resolvedSchemas.clear();
    schemaCache.clear();
  }

  /**
   * Normalize data using registry
   */
  function normalize<T = string | string[]>(
    data: unknown,
    schemaName: string
  ): NormalizationResult<T> {
    const entitySchema = resolvedSchemas.get(schemaName);
    if (!entitySchema) {
      if (options.strict) {
        throw new Error(`[SchemaRegistry] Schema "${schemaName}" is not registered`);
      }
      // Auto-register
      register(schemaName);
    }

    const schema = resolvedSchemas.get(schemaName);
    if (schema === undefined) {
      throw new Error(`Failed to resolve schema: ${schemaName}`);
    }
    return baseNormalize<T>(data, schema);
  }

  /**
   * Denormalize data using registry
   */
  function denormalize<T = unknown>(
    input: unknown,
    schemaName: string,
    entities: NormalizedEntities,
    denormOptions: DenormalizeOptions = {}
  ): T | null {
    const entitySchema = resolvedSchemas.get(schemaName);
    if (!entitySchema) {
      if (options.strict) {
        throw new Error(`[SchemaRegistry] Schema "${schemaName}" is not registered`);
      }
      return null;
    }

    return baseDenormalize<T>(input, entitySchema, entities, denormOptions);
  }

  /**
   * Validate schema integrity
   */
  function validate(): SchemaValidationResult {
    const errors: SchemaValidationError[] = [];
    const warnings: SchemaValidationWarning[] = [];
    const usedSchemas = new Set<string>();

    for (const [name, registered] of registeredSchemas) {
      const {definition} = registered;

      // Check relations
      if (definition.relations) {
        for (const [relationKey, relation] of Object.entries(definition.relations)) {
          let targetName: string | null = null;

          if (typeof relation === 'string') {
            targetName = relation;
          } else if (typeof relation === 'object' && 'schema' in relation) {
            if (typeof relation.schema === 'string') {
              targetName = relation.schema;
            }
          }

          if (targetName !== null && targetName !== '') {
            usedSchemas.add(targetName);

            if (!registeredSchemas.has(targetName)) {
              errors.push({
                schema: name,
                type: 'missing_relation',
                message: `Relation "${relationKey}" references undefined schema "${targetName}"`,
                details: { relation: relationKey, target: targetName },
              });
            }

            // Check for reverse relation
            if (options.inferReverseRelations) {
              const targetDef = registeredSchemas.get(targetName)?.definition;
              if (targetDef?.relations) {
                const hasReverse = Object.values(targetDef.relations).some((rel) => {
                  if (typeof rel === 'string') return rel === name;
                  if (typeof rel === 'object' && 'schema' in rel) {
                    return rel.schema === name;
                  }
                  return false;
                });

                if (!hasReverse) {
                  warnings.push({
                    schema: targetName,
                    type: 'missing_reverse_relation',
                    message: `Schema "${targetName}" has no reverse relation to "${name}"`,
                    details: { from: name, relation: relationKey },
                  });
                }
              }
            }
          }
        }
      }
    }

    // Check for unused schemas
    for (const name of registeredSchemas.keys()) {
      if (!usedSchemas.has(name)) {
        // Check if it's a root schema (not referenced by others)
        const isReferenced = Array.from(registeredSchemas.values()).some((reg) => {
          if (!reg.definition.relations) return false;
          return Object.values(reg.definition.relations).some((rel) => {
            if (typeof rel === 'string') return rel === name;
            if (typeof rel === 'object' && 'schema' in rel) {
              return rel.schema === name;
            }
            return false;
          });
        });

        if (!isReferenced && registeredSchemas.size > 1) {
          warnings.push({
            schema: name,
            type: 'unused_schema',
            message: `Schema "${name}" is not referenced by any other schema`,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get schema dependencies
   */
  function getDependencies(name: string): string[] {
    const registered = registeredSchemas.get(name);
    if (!registered?.definition.relations) {
      return [];
    }

    const deps = new Set<string>();

    for (const relation of Object.values(registered.definition.relations)) {
      if (typeof relation === 'string') {
        deps.add(relation);
      } else if (typeof relation === 'object' && 'schema' in relation) {
        if (typeof relation.schema === 'string') {
          deps.add(relation.schema);
        }
        if ('schema' in relation && relation.schema !== undefined && relation.schema !== null && relation.schema !== '') {
          const schemas = typeof relation.schema === 'object' ? Object.values(relation.schema) : [];
          schemas.forEach((s) => {
            if (typeof s === 'string') deps.add(s);
          });
        }
      }
    }

    return Array.from(deps);
  }

  /**
   * Get reverse dependencies
   */
  function getReverseDependencies(name: string): string[] {
    const deps: string[] = [];

    for (const [schemaName, registered] of registeredSchemas) {
      if (schemaName === name) continue;
      if (!registered.definition.relations) continue;

      for (const relation of Object.values(registered.definition.relations)) {
        let matches = false;

        if (typeof relation === 'string') {
          matches = relation === name;
        } else if (typeof relation === 'object' && 'schema' in relation) {
          if (typeof relation.schema === 'string') {
            matches = relation.schema === name;
          }
          if ('schemas' in relation && relation.schemas) {
            matches = matches || Object.values(relation.schemas).includes(name);
          }
        }

        if (matches) {
          deps.push(schemaName);
          break;
        }
      }
    }

    return deps;
  }

  /**
   * Export schemas for serialization
   */
  function exportSchemas(): ExportedSchemas {
    const schemas: Record<string, SchemaDefinition & { name: string }> = {};

    for (const [name, registered] of registeredSchemas) {
      // Convert relations to serializable format
      const relations: Record<string, string | RelationDefinition> = {};

      if (registered.definition.relations) {
        for (const [key, relation] of Object.entries(registered.definition.relations)) {
          if (typeof relation === 'string') {
            relations[key] = relation;
          } else if (relation instanceof EntitySchema) {
            relations[key] = relation.name;
          } else if (relation instanceof ArraySchema) {
            const innerSchema = relation.schema;
            if (innerSchema instanceof EntitySchema) {
              relations[key] = { schema: innerSchema.name, type: 'array' };
            }
          } else if (typeof relation === 'object' && 'schema' in relation) {
            relations[key] = relation as RelationDefinition;
          }
        }
      }

      schemas[name] = {
        name,
        ...registered.definition,
        relations: Object.keys(relations).length > 0 ? relations : undefined,
        // Omit non-serializable functions
        processStrategy: undefined,
        mergeStrategy: undefined,
        migrate: undefined,
      };
    }

    return {
      version: '1.0.0',
      schemas,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Import schemas from serialization
   */
  function importSchemas(exported: ExportedSchemas): void {
    clear();

    for (const [name, schema] of Object.entries(exported.schemas)) {
      register(name, {
        idAttribute: schema.idAttribute,
        relations: schema.relations,
        excludeFields: schema.excludeFields,
        version: schema.version,
      });
    }
  }

  /**
   * Get schema version
   */
  function getVersion(name: string): number {
    const version = registeredSchemas.get(name)?.version;
    return version !== undefined && version !== 0 ? version : 0;
  }

  /**
   * Migrate entity to latest schema version
   */
  function migrateEntity(name: string, entity: Entity, fromVersion: number): Entity {
    const registered = registeredSchemas.get(name);
    if (!registered) {
      return entity;
    }

    const currentVersion = registered.version;
    if (fromVersion >= currentVersion) {
      return entity;
    }

    // Apply migrations
    let migratedEntity = { ...entity };
    const {migrate} = registered.definition;

    if (migrate) {
      for (let v = fromVersion; v < currentVersion; v++) {
        migratedEntity = migrate(migratedEntity, v);
      }
    }

    return migratedEntity;
  }

  return {
    register,
    get,
    has,
    getNames,
    getAll,
    unregister,
    clear,
    normalize,
    denormalize,
    validate,
    getDependencies,
    getReverseDependencies,
    export: exportSchemas,
    import: importSchemas,
    getVersion,
    migrateEntity,
  };
}

// =============================================================================
// SINGLETON REGISTRY
// =============================================================================

/**
 * Default global schema registry
 */
let globalRegistry: SchemaRegistry | null = null;

/**
 * Get or create global schema registry
 */
export function getGlobalRegistry(): SchemaRegistry {
  globalRegistry ??= createSchemaRegistry();
  return globalRegistry;
}

/**
 * Reset global schema registry
 */
export function resetGlobalRegistry(): void {
  globalRegistry?.clear();
  globalRegistry = null;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Register a schema in global registry
 */
export function registerSchema(name: string, definition?: SchemaDefinition): EntitySchema {
  return getGlobalRegistry().register(name, definition);
}

/**
 * Get schema from global registry
 */
export function getSchema(name: string): EntitySchema | undefined {
  return getGlobalRegistry().get(name);
}

/**
 * Normalize using global registry
 */
export function normalizeWithRegistry<T = string | string[]>(
  data: unknown,
  schemaName: string
): NormalizationResult<T> {
  return getGlobalRegistry().normalize<T>(data, schemaName);
}

/**
 * Denormalize using global registry
 */
export function denormalizeWithRegistry<T = unknown>(
  input: unknown,
  schemaName: string,
  entities: NormalizedEntities,
  options?: DenormalizeOptions
): T | null {
  return getGlobalRegistry().denormalize<T>(input, schemaName, entities, options);
}

// =============================================================================
// SCHEMA BUILDER
// =============================================================================

/**
 * Fluent schema builder
 */
export class SchemaBuilder {
  private name: string;
  private definition: SchemaDefinition;
  private registry: SchemaRegistry;

  constructor(name: string, registry?: SchemaRegistry) {
    this.name = name;
    this.definition = {};
    this.registry = registry ?? getGlobalRegistry();
  }

  /**
   * Set ID attribute
   */
  id(attribute: string | ((entity: Entity) => string)): this {
    this.definition.idAttribute = attribute;
    return this;
  }

  /**
   * Add entity relation
   */
  belongsTo(field: string, schemaName: string): this {
    this.definition.relations ??= {};
    this.definition.relations[field] = schemaName;
    return this;
  }

  /**
   * Add array relation
   */
  hasMany(field: string, schemaName: string): this {
    this.definition.relations ??= {};
    this.definition.relations[field] = { schema: schemaName, type: 'array' };
    return this;
  }

  /**
   * Add union relation
   */
  union(
    field: string,
    schemas: Record<string, string>,
    discriminator: string | ((entity: Entity) => string) = '__typename'
  ): this {
    this.definition.relations ??= {};
    const schemaValues = Object.values(schemas);
    const [firstSchema] = schemaValues;
    if (firstSchema === undefined || firstSchema === '') {
      throw new Error(`Union must have at least one schema for field ${field}`);
    }
    this.definition.relations[field] = {
      schema: firstSchema,
      type: 'union',
      schemas,
      schemaAttribute: discriminator,
    };
    return this;
  }

  /**
   * Set process strategy
   */
  process(fn: (entity: Entity) => Entity): this {
    this.definition.processStrategy = fn;
    return this;
  }

  /**
   * Set merge strategy
   */
  merge(fn: (existing: Entity, incoming: Entity) => Entity): this {
    this.definition.mergeStrategy = fn;
    return this;
  }

  /**
   * Set excluded fields
   */
  exclude(...fields: string[]): this {
    this.definition.excludeFields = fields;
    return this;
  }

  /**
   * Set version
   */
  version(v: number, migrate?: (entity: Entity, fromVersion: number) => Entity): this {
    this.definition.version = v;
    this.definition.migrate = migrate;
    return this;
  }

  /**
   * Build and register schema
   */
  build(): EntitySchema {
    return this.registry.register(this.name, this.definition);
  }
}

/**
 * Create a schema builder
 */
export function defineSchema(name: string, registry?: SchemaRegistry): SchemaBuilder {
  return new SchemaBuilder(name, registry);
}
