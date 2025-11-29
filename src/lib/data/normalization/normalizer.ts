/**
 * @file Entity Normalizer
 * @description Production-grade entity normalization for transforming nested
 * API responses into flat, normalized state structures.
 *
 * Features:
 * - Automatic entity extraction from nested data
 * - Relationship handling (hasMany, belongsTo)
 * - Circular reference detection
 * - Schema-based normalization
 * - TypeScript type inference
 *
 * @example
 * ```typescript
 * import { normalize, schema } from '@/lib/data/normalization';
 *
 * const userSchema = schema.entity('users');
 * const postSchema = schema.entity('posts', {
 *   author: userSchema,
 * });
 *
 * const { entities, result } = normalize(apiResponse, postSchema);
 * // entities.users = { '1': {...}, '2': {...} }
 * // entities.posts = { '101': {...author: '1'} }
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Entity with required ID field
 */
export interface Entity {
  id: string | number;
  [key: string]: unknown;
}

/**
 * Normalized entity map
 */
export type EntityMap<T extends Entity = Entity> = Record<string, T>;

/**
 * Normalized entities by type
 */
export type NormalizedEntities = Record<string, EntityMap>;

/**
 * Normalization result
 */
export interface NormalizationResult<TResult = string | string[]> {
  /** Normalized entities by type */
  entities: NormalizedEntities;
  /** Result reference(s) - ID or array of IDs */
  result: TResult;
}

/**
 * Entity schema definition
 */
export interface EntitySchemaDefinition {
  /** Entity type name */
  name: string;
  /** ID attribute name */
  idAttribute?: string | ((entity: Entity) => string);
  /** Relationship definitions */
  relations?: Record<string, EntitySchema | ArraySchema | UnionSchema>;
  /** Process entity after extraction */
  processStrategy?: (entity: Entity) => Entity;
  /** Merge strategy for duplicate entities */
  mergeStrategy?: (existingEntity: Entity, newEntity: Entity) => Entity;
  /** Fields to exclude from normalization */
  excludeFields?: string[];
}

/**
 * Schema types
 */
export type Schema = EntitySchema | ArraySchema | ObjectSchema | UnionSchema | ValueSchema;

// =============================================================================
// SCHEMA CLASSES
// =============================================================================

/**
 * Entity Schema
 */
export class EntitySchema {
  readonly _type = 'entity' as const;
  readonly name: string;
  readonly idAttribute: string | ((entity: Entity) => string);
  readonly relations: Record<string, Schema>;
  readonly processStrategy?: (entity: Entity) => Entity;
  readonly mergeStrategy: (existingEntity: Entity, newEntity: Entity) => Entity;
  readonly excludeFields: string[];

  constructor(name: string, definition?: Omit<EntitySchemaDefinition, 'name'>) {
    this.name = name;
    this.idAttribute = definition?.idAttribute ?? 'id';
    this.relations = (definition?.relations != null ? definition.relations as Record<string, Schema> : {});
    this.processStrategy = definition?.processStrategy;
    this.mergeStrategy = definition?.mergeStrategy ?? ((_, newEntity) => newEntity);
    this.excludeFields = definition?.excludeFields ?? [];
  }

  /**
   * Get entity ID
   */
  getId(entity: Entity): string {
    if (typeof this.idAttribute === 'function') {
      return this.idAttribute(entity);
    }
    return String(entity[this.idAttribute]);
  }

  /**
   * Define a relationship
   */
  define(relations: Record<string, Schema>): EntitySchema {
    return new EntitySchema(this.name, {
      idAttribute: this.idAttribute,
      relations: { ...this.relations, ...relations } as Record<string, EntitySchema | ArraySchema | UnionSchema>,
      processStrategy: this.processStrategy,
      mergeStrategy: this.mergeStrategy,
      excludeFields: this.excludeFields,
    });
  }
}

/**
 * Array Schema
 */
export class ArraySchema {
  readonly _type = 'array' as const;
  readonly schema: Schema;

  constructor(schema: Schema) {
    this.schema = schema;
  }
}

/**
 * Object Schema
 */
export class ObjectSchema {
  readonly _type = 'object' as const;
  readonly schema: Record<string, Schema>;

  constructor(schema: Record<string, Schema>) {
    this.schema = schema;
  }
}

/**
 * Union Schema (for polymorphic relationships)
 */
export class UnionSchema {
  readonly _type = 'union' as const;
  readonly schemas: Record<string, EntitySchema>;
  readonly schemaAttribute: string | ((entity: Entity) => string);

  constructor(
    schemas: Record<string, EntitySchema>,
    schemaAttribute: string | ((entity: Entity) => string) = '__typename'
  ) {
    this.schemas = schemas;
    this.schemaAttribute = schemaAttribute;
  }

  /**
   * Get schema for entity
   */
  getSchema(entity: Entity): EntitySchema | undefined {
    const type =
      typeof this.schemaAttribute === 'function'
        ? this.schemaAttribute(entity)
        : String(entity[this.schemaAttribute]);
    return this.schemas[type];
  }
}

/**
 * Value Schema (pass-through)
 */
export class ValueSchema {
  readonly _type = 'value' as const;
}

// =============================================================================
// SCHEMA FACTORY
// =============================================================================

/**
 * Schema factory functions
 */
export const schema = {
  /**
   * Create entity schema
   */
  entity: (name: string, relations?: Record<string, Schema>, options?: Omit<EntitySchemaDefinition, 'name' | 'relations'>): EntitySchema =>
    new EntitySchema(name, { ...options, relations: relations as Record<string, EntitySchema | ArraySchema | UnionSchema> | undefined }),

  /**
   * Create array schema
   */
  array: (itemSchema: Schema): ArraySchema => new ArraySchema(itemSchema),

  /**
   * Create object schema
   */
  object: (shape: Record<string, Schema>): ObjectSchema => new ObjectSchema(shape),

  /**
   * Create union schema
   */
  union: (schemas: Record<string, EntitySchema>, schemaAttribute?: string | ((entity: Entity) => string)): UnionSchema =>
    new UnionSchema(schemas, schemaAttribute),

  /**
   * Create value schema (pass-through)
   */
  value: (): ValueSchema => new ValueSchema(),
};

// =============================================================================
// NORMALIZER
// =============================================================================

/**
 * Normalization context
 */
interface NormalizationContext {
  entities: NormalizedEntities;
  visitedEntities: Set<string>;
}

/**
 * Create initial context
 */
function createContext(): NormalizationContext {
  return {
    entities: {},
    visitedEntities: new Set(),
  };
}

/**
 * Add entity to context
 */
function addEntity(
  context: NormalizationContext,
  entitySchema: EntitySchema,
  entity: Entity
): string {
  const entityType = entitySchema.name;
  const entityId = entitySchema.getId(entity);
  const visitKey = `${entityType}:${entityId}`;

  // Ensure entity type exists
  context.entities[entityType] ??= {};

  // Apply process strategy
  const processedEntity = entitySchema.processStrategy
    ? entitySchema.processStrategy(entity)
    : entity;

  // Check for existing entity
  const existing = context.entities[entityType][entityId];
  if (existing) {
    // Merge with existing
    context.entities[entityType][entityId] = entitySchema.mergeStrategy(
      existing,
      processedEntity
    );
  } else {
    context.entities[entityType][entityId] = processedEntity;
  }

  // Mark as visited
  context.visitedEntities.add(visitKey);

  return entityId;
}

/**
 * Normalize a value with a schema
 */
function normalizeValue(
  value: unknown,
  schema: Schema,
  context: NormalizationContext
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  switch (schema._type) {
    case 'entity':
      return normalizeEntity(value as Entity, schema, context);

    case 'array':
      return normalizeArray(value as unknown[], schema, context);

    case 'object':
      return normalizeObject(value as Record<string, unknown>, schema, context);

    case 'union':
      return normalizeUnion(value as Entity, schema, context);

    case 'value':
      return value;

    default:
      return value;
  }
}

/**
 * Normalize an entity
 */
function normalizeEntity(
  entity: Entity,
  entitySchema: EntitySchema,
  context: NormalizationContext
): string {
  const entityId = entitySchema.getId(entity);
  const visitKey = `${entitySchema.name}:${entityId}`;

  // Check for circular reference
  if (context.visitedEntities.has(visitKey)) {
    return entityId;
  }

  // Create normalized entity
  const normalizedEntity: Entity = { id: entityId };

  // Copy fields
  for (const [key, value] of Object.entries(entity)) {
    if (entitySchema.excludeFields.includes(key)) {
      continue;
    }

    if (key in entitySchema.relations) {
      // Normalize relationship
      const relationSchema = entitySchema.relations[key];
      if (relationSchema) {
        normalizedEntity[key] = normalizeValue(value, relationSchema, context);
      }
    } else {
      // Copy value
      normalizedEntity[key] = value;
    }
  }

  // Add to entities
  return addEntity(context, entitySchema, normalizedEntity);
}

/**
 * Normalize an array
 */
function normalizeArray(
  items: unknown[],
  arraySchema: ArraySchema,
  context: NormalizationContext
): unknown[] {
  return items.map((item) => normalizeValue(item, arraySchema.schema, context));
}

/**
 * Normalize an object
 */
function normalizeObject(
  obj: Record<string, unknown>,
  objectSchema: ObjectSchema,
  context: NormalizationContext
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (key in objectSchema.schema) {
      const fieldSchema = objectSchema.schema[key];
      if (fieldSchema) {
        result[key] = normalizeValue(value, fieldSchema, context);
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Normalize a union type
 */
function normalizeUnion(
  entity: Entity,
  unionSchema: UnionSchema,
  context: NormalizationContext
): string | null {
  const entitySchema = unionSchema.getSchema(entity);
  if (!entitySchema) {
    console.warn('[Normalizer] Unknown union type for entity:', entity);
    return null;
  }

  return normalizeEntity(entity, entitySchema, context);
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Normalize data with a schema
 *
 * @param data - Data to normalize
 * @param schema - Schema defining the structure
 * @returns Normalized result with entities and result reference
 *
 * @example
 * ```typescript
 * // Single entity
 * const { entities, result } = normalize(user, userSchema);
 * // result = "1"
 * // entities.users = { "1": {...} }
 *
 * // Array of entities
 * const { entities, result } = normalize(users, schema.array(userSchema));
 * // result = ["1", "2", "3"]
 * // entities.users = { "1": {...}, "2": {...}, "3": {...} }
 * ```
 */
export function normalize<TResult = string | string[]>(
  data: unknown,
  inputSchema: Schema
): NormalizationResult<TResult> {
  const context = createContext();
  const result = normalizeValue(data, inputSchema, context);

  return {
    entities: context.entities,
    result: result as TResult,
  };
}

/**
 * Normalize and merge with existing entities
 *
 * @param data - New data to normalize
 * @param schema - Schema defining the structure
 * @param existingEntities - Existing normalized entities
 * @returns Merged normalization result
 */
export function normalizeAndMerge<TResult = string | string[]>(
  data: unknown,
  inputSchema: Schema,
  existingEntities: NormalizedEntities
): NormalizationResult<TResult> {
  const context: NormalizationContext = {
    entities: { ...existingEntities },
    visitedEntities: new Set(),
  };

  // Deep clone existing entities
  for (const [type, entities] of Object.entries(existingEntities)) {
    context.entities[type] = { ...entities };
  }

  const result = normalizeValue(data, inputSchema, context);

  return {
    entities: context.entities,
    result: result as TResult,
  };
}

/**
 * Normalize batch of data
 *
 * @param items - Array of items to normalize
 * @param schema - Entity schema for each item
 * @returns Combined normalization result
 */
export function normalizeBatch<T extends Entity>(
  items: T[],
  entitySchema: EntitySchema
): NormalizationResult<string[]> {
  return normalize(items, new ArraySchema(entitySchema));
}

/**
 * Get entity from normalized state
 */
export function getEntity<T extends Entity>(
  entities: NormalizedEntities,
  entityType: string,
  id: string
): T | undefined {
  return entities[entityType]?.[id] as T | undefined;
}

/**
 * Get multiple entities from normalized state
 */
export function getEntities<T extends Entity>(
  entities: NormalizedEntities,
  entityType: string,
  ids: string[]
): T[] {
  const entityMap = entities[entityType];
  if (!entityMap) return [];

  return ids.map((id) => entityMap[id] as T).filter(Boolean);
}

/**
 * Get all entities of a type
 */
export function getAllEntities<T extends Entity>(
  entities: NormalizedEntities,
  entityType: string
): T[] {
  const entityMap = entities[entityType];
  if (!entityMap) return [];

  return Object.values(entityMap) as T[];
}

/**
 * Update entity in normalized state
 */
export function updateEntity<T extends Entity>(
  entities: NormalizedEntities,
  entityType: string,
  id: string,
  updates: Partial<T>
): NormalizedEntities {
  const entityMap = entities[entityType];
  if (!entityMap?.[id]) {
    return entities;
  }

  return {
    ...entities,
    [entityType]: {
      ...entityMap,
      [id]: { ...entityMap[id], ...updates },
    },
  };
}

/**
 * Remove entity from normalized state
 */
export function removeEntity(
  entities: NormalizedEntities,
  entityType: string,
  id: string
): NormalizedEntities {
  const entityMap = entities[entityType];
  if (!entityMap?.[id]) {
    return entities;
  }

  const { [id]: _removed, ...rest } = entityMap;
  return {
    ...entities,
    [entityType]: rest,
  };
}

/**
 * Merge two normalized states
 */
export function mergeEntities(
  target: NormalizedEntities,
  source: NormalizedEntities,
  mergeStrategy: 'overwrite' | 'keep' | 'merge' = 'merge'
): NormalizedEntities {
  const result: NormalizedEntities = { ...target };

  for (const [entityType, entityMap] of Object.entries(source)) {
    if (!result[entityType]) {
      result[entityType] = { ...entityMap };
      continue;
    }

    result[entityType] = { ...result[entityType] };

    for (const [id, entity] of Object.entries(entityMap)) {
      const existing = result[entityType][id];

      switch (mergeStrategy) {
        case 'overwrite':
          result[entityType][id] = entity;
          break;
        case 'keep':
          if (!existing) {
            result[entityType][id] = entity;
          }
          break;
        case 'merge':
          result[entityType][id] = existing
            ? { ...existing, ...entity }
            : entity;
          break;
      }
    }
  }

  return result;
}
