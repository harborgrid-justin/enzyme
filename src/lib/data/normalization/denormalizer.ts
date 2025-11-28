/**
 * @file Entity Denormalizer
 * @description Transform normalized data back to nested structures
 * with selective denormalization and caching support.
 *
 * Features:
 * - Reconstruct nested objects from normalized state
 * - Selective field denormalization
 * - Circular reference handling
 * - Memoization for performance
 * - Partial denormalization
 *
 * @example
 * ```typescript
 * import { denormalize, schema } from '@/lib/data/normalization';
 *
 * const post = denormalize('101', postSchema, entities);
 * // Reconstructs: { id: '101', author: { id: '1', name: 'John' }, ... }
 * ```
 */

import type {
  Entity,
  // EntityMap,
  NormalizedEntities,
  EntitySchema,
  ArraySchema,
  ObjectSchema,
  UnionSchema,
  Schema,
} from './normalizer';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Denormalization options
 */
export interface DenormalizeOptions {
  /** Maximum depth to denormalize (default: Infinity) */
  maxDepth?: number;
  /** Fields to include in denormalization */
  includeFields?: string[];
  /** Fields to exclude from denormalization */
  excludeFields?: string[];
  /** Enable memoization */
  memoize?: boolean;
  /** Circular reference handling */
  circularBehavior?: 'skip' | 'id-only' | 'shallow';
}

/**
 * Denormalization context
 */
interface DenormalizeContext {
  entities: NormalizedEntities;
  visited: Set<string>;
  depth: number;
  options: Required<DenormalizeOptions>;
  cache: Map<string, Entity>;
}

// =============================================================================
// DEFAULT OPTIONS
// =============================================================================

const DEFAULT_OPTIONS: Required<DenormalizeOptions> = {
  maxDepth: Infinity,
  includeFields: [],
  excludeFields: [],
  memoize: true,
  circularBehavior: 'id-only',
};

// =============================================================================
// DENORMALIZER
// =============================================================================

/**
 * Create denormalization context
 */
function createContext(
  entities: NormalizedEntities,
  options: DenormalizeOptions
): DenormalizeContext {
  return {
    entities,
    visited: new Set(),
    depth: 0,
    options: { ...DEFAULT_OPTIONS, ...options },
    cache: new Map(),
  };
}

/**
 * Get cache key for entity
 */
function getCacheKey(entityType: string, id: string, depth: number): string {
  return `${entityType}:${id}:${depth}`;
}

/**
 * Check if field should be included
 */
function shouldIncludeField(
  field: string,
  options: Required<DenormalizeOptions>
): boolean {
  if (options.excludeFields.includes(field)) {
    return false;
  }
  if (options.includeFields.length > 0) {
    return options.includeFields.includes(field);
  }
  return true;
}

/**
 * Denormalize a value with schema
 */
function denormalizeValue(
  value: unknown,
  schema: Schema,
  context: DenormalizeContext
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  switch (schema._type) {
    case 'entity':
      return denormalizeEntityInternal(value as string, schema, context);

    case 'array':
      return denormalizeArray(value as unknown[], schema, context);

    case 'object':
      return denormalizeObject(value as Record<string, unknown>, schema, context);

    case 'union':
      return denormalizeUnion(value as string, schema, context);

    case 'value':
      return value;

    default:
      return value;
  }
}

/**
 * Denormalize an entity (internal helper)
 */
function denormalizeEntityInternal(
  id: string | Entity,
  entitySchema: EntitySchema,
  context: DenormalizeContext
): Entity | string | null {
  // Handle already denormalized entity
  if (typeof id === 'object' && id !== null) {
    return id;
  }

  const entityId = String(id);
  const entityType = entitySchema.name;
  const visitKey = `${entityType}:${entityId}`;

  // Check max depth
  if (context.depth > context.options.maxDepth) {
    return entityId;
  }

  // Check for circular reference
  if (context.visited.has(visitKey)) {
    switch (context.options.circularBehavior) {
      case 'skip':
        return null;
      case 'id-only':
        return entityId;
      case 'shallow':
        // Return entity without relations
        const entity = context.entities[entityType]?.[entityId];
        return entity ? { ...entity } : entityId;
    }
  }

  // Check cache
  if (context.options.memoize) {
    const cacheKey = getCacheKey(entityType, entityId, context.depth);
    const cached = context.cache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Get normalized entity
  const normalizedEntity = context.entities[entityType]?.[entityId];
  if (!normalizedEntity) {
    return entityId;
  }

  // Mark as visited
  context.visited.add(visitKey);

  // Create denormalized entity
  const denormalized: Entity = { id: entityId };

  // Increment depth
  const childContext: DenormalizeContext = {
    ...context,
    depth: context.depth + 1,
    visited: new Set(context.visited),
  };

  // Process fields
  for (const [key, value] of Object.entries(normalizedEntity)) {
    if (!shouldIncludeField(key, context.options)) {
      continue;
    }

    if (key in entitySchema.relations) {
      // Denormalize relationship
      const relationSchema = entitySchema.relations[key];
      if (relationSchema) {
        denormalized[key] = denormalizeValue(value, relationSchema, childContext);
      }
    } else {
      // Copy value
      denormalized[key] = value;
    }
  }

  // Cache result
  if (context.options.memoize) {
    const cacheKey = getCacheKey(entityType, entityId, context.depth);
    context.cache.set(cacheKey, denormalized);
  }

  // Unmark as visited
  context.visited.delete(visitKey);

  return denormalized;
}

/**
 * Denormalize an array
 */
function denormalizeArray(
  items: unknown[],
  arraySchema: ArraySchema,
  context: DenormalizeContext
): unknown[] {
  return items
    .map((item) => denormalizeValue(item, arraySchema.schema, context))
    .filter((item) => item !== null);
}

/**
 * Denormalize an object
 */
function denormalizeObject(
  obj: Record<string, unknown>,
  objectSchema: ObjectSchema,
  context: DenormalizeContext
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (!shouldIncludeField(key, context.options)) {
      continue;
    }

    if (key in objectSchema.schema) {
      const fieldSchema = objectSchema.schema[key];
      if (fieldSchema) {
        result[key] = denormalizeValue(value, fieldSchema, context);
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Denormalize a union type
 */
function denormalizeUnion(
  id: string,
  unionSchema: UnionSchema,
  context: DenormalizeContext
): Entity | string | null {
  // Try each schema in the union
  for (const entitySchema of Object.values(unionSchema.schemas)) {
    const entity = context.entities[entitySchema.name]?.[id];
    if (entity) {
      return denormalizeEntityInternal(id, entitySchema, context);
    }
  }

  return id;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Denormalize data from normalized state
 *
 * @param input - ID(s) or normalized reference
 * @param schema - Schema defining the structure
 * @param entities - Normalized entities
 * @param options - Denormalization options
 * @returns Denormalized data
 *
 * @example
 * ```typescript
 * // Single entity
 * const user = denormalize('1', userSchema, entities);
 *
 * // Multiple entities
 * const users = denormalize(['1', '2'], schema.array(userSchema), entities);
 *
 * // With options
 * const user = denormalize('1', userSchema, entities, {
 *   maxDepth: 2,
 *   excludeFields: ['password'],
 * });
 * ```
 */
export function denormalize<T = unknown>(
  input: unknown,
  inputSchema: Schema,
  entities: NormalizedEntities,
  options: DenormalizeOptions = {}
): T | null {
  if (input === null || input === undefined) {
    return null;
  }

  const context = createContext(entities, options);
  return denormalizeValue(input, inputSchema, context) as T;
}

/**
 * Denormalize a single entity by type and ID
 *
 * @param entityType - Entity type name
 * @param id - Entity ID
 * @param schema - Entity schema
 * @param entities - Normalized entities
 * @param options - Denormalization options
 * @returns Denormalized entity
 */
export function denormalizeEntity<T extends Entity>(
  entityType: string,
  id: string,
  schema: EntitySchema,
  entities: NormalizedEntities,
  options: DenormalizeOptions = {}
): T | null {
  if (schema.name !== entityType) {
    console.warn(`[Denormalizer] Schema name mismatch: ${schema.name} !== ${entityType}`);
  }

  return denormalize<T>(id, schema, entities, options);
}

/**
 * Denormalize multiple entities
 *
 * @param ids - Array of entity IDs
 * @param schema - Entity schema
 * @param entities - Normalized entities
 * @param options - Denormalization options
 * @returns Array of denormalized entities
 */
export function denormalizeMany<T extends Entity>(
  ids: string[],
  schema: EntitySchema,
  entities: NormalizedEntities,
  options: DenormalizeOptions = {}
): T[] {
  const context = createContext(entities, options);
  return ids
    .map((id) => denormalizeEntity<T>(id, schema, context) as T | null)
    .filter((entity): entity is T => entity !== null);

  function denormalizeEntity<U extends Entity>(
    id: string,
    entitySchema: EntitySchema,
    ctx: DenormalizeContext
  ): U | null {
    return denormalizeValue(id, entitySchema, ctx) as U | null;
  }
}

/**
 * Create a memoized denormalizer for a specific schema
 *
 * @param schema - Schema to denormalize with
 * @param options - Default options
 * @returns Memoized denormalize function
 */
export function createDenormalizer<T = unknown>(
  inputSchema: Schema,
  defaultOptions: DenormalizeOptions = {}
): (input: unknown, entities: NormalizedEntities, options?: DenormalizeOptions) => T | null {
  const cache = new Map<string, T>();

  return (input, entities, options = {}) => {
    const mergedOptions = { ...defaultOptions, ...options };

    // Generate cache key
    const cacheKey = JSON.stringify({ input, options: mergedOptions });

    if (mergedOptions.memoize !== false && cache.has(cacheKey)) {
      return cache.get(cacheKey) as T;
    }

    const result = denormalize<T>(input, inputSchema, entities, mergedOptions);

    if (mergedOptions.memoize !== false && result !== null) {
      cache.set(cacheKey, result);
    }

    return result;
  };
}

/**
 * Denormalize with field selection (GraphQL-like)
 *
 * @param input - ID(s) or normalized reference
 * @param schema - Schema defining the structure
 * @param entities - Normalized entities
 * @param fields - Fields to include
 * @returns Denormalized data with selected fields
 */
export function denormalizeSelect<T = unknown>(
  input: unknown,
  inputSchema: Schema,
  entities: NormalizedEntities,
  fields: string[]
): T | null {
  return denormalize<T>(input, inputSchema, entities, {
    includeFields: fields,
  });
}

/**
 * Shallow denormalize (only first level)
 *
 * @param input - ID(s) or normalized reference
 * @param schema - Schema defining the structure
 * @param entities - Normalized entities
 * @returns Shallowly denormalized data
 */
export function denormalizeShallow<T = unknown>(
  input: unknown,
  inputSchema: Schema,
  entities: NormalizedEntities
): T | null {
  return denormalize<T>(input, inputSchema, entities, {
    maxDepth: 1,
  });
}

/**
 * Check if entities contain all required data for denormalization
 *
 * @param input - ID(s) to check
 * @param schema - Schema to check against
 * @param entities - Normalized entities
 * @returns Whether all required entities exist
 */
export function canDenormalize(
  input: unknown,
  inputSchema: Schema,
  entities: NormalizedEntities
): boolean {
  if (input === null || input === undefined) {
    return true;
  }

  function checkValue(value: unknown, schema: Schema): boolean {
    switch (schema._type) {
      case 'entity': {
        const entitySchema = schema as EntitySchema;
        const id = String(value);
        return !!entities[entitySchema.name]?.[id];
      }

      case 'array': {
        const arraySchema = schema as ArraySchema;
        return (value as unknown[]).every((item) =>
          checkValue(item, arraySchema.schema)
        );
      }

      case 'object': {
        const objectSchema = schema as ObjectSchema;
        const obj = value as Record<string, unknown>;
        return Object.entries(objectSchema.schema).every(([key, fieldSchema]) =>
          checkValue(obj[key], fieldSchema)
        );
      }

      case 'union': {
        const unionSchema = schema as UnionSchema;
        const id = String(value);
        return Object.values(unionSchema.schemas).some(
          (entitySchema) => !!entities[entitySchema.name]?.[id]
        );
      }

      case 'value':
        return true;

      default:
        return true;
    }
  }

  return checkValue(input, inputSchema);
}
