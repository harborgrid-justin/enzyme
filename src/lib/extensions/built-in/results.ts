/**
 * @file Results Extension
 * @description Comprehensive results extension inspired by Prisma's result extensions
 *
 * Implements enterprise patterns for:
 * - Computed fields with dependency tracking
 * - Result transformations and normalization
 * - Memoization and caching
 * - Field masking and aliasing
 * - Result aggregation and diffing
 * - React Query integration
 *
 * @version 2.0.0
 */

import type { QueryClient } from '@tanstack/react-query';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Computed field definition with dependency tracking
 */
export interface ComputedFieldDef<T, TDeps extends (keyof T)[], TResult> {
  /** Field dependencies needed for computation */
  needs: TDeps;
  /** Computation function receiving only needed fields */
  compute: (data: Pick<T, TDeps[number]>) => TResult;
  /** Enable memoization for expensive computations */
  cache?: boolean;
  /** Cache key function for memoization (default: JSON.stringify) */
  cacheKey?: (data: Pick<T, TDeps[number]>) => string;
}

/**
 * Result transformer function type
 */
export type ResultTransformer<T, R = T> = (result: T) => R;

/**
 * Normalization schema for nested data structures
 */
export interface NormalizationSchema<T = unknown> {
  /** Entity name for this schema */
  entity: string;
  /** ID field name (default: 'id') */
  idField?: keyof T;
  /** Nested entities to normalize */
  relations?: Record<string, NormalizationSchema>;
  /** Array fields that should be normalized */
  arrays?: (keyof T)[];
}

/**
 * Normalized data structure
 */
export interface NormalizedData<T = unknown> {
  /** Normalized entities by type */
  entities: Record<string, Record<string | number, T>>;
  /** Root result reference */
  result: string | number | (string | number)[];
}

/**
 * Field masking configuration
 */
export interface FieldMaskConfig {
  /** Fields to mask completely (removed from output) */
  remove?: string[];
  /** Fields to redact (replaced with [REDACTED]) */
  redact?: string[];
  /** Custom masking functions */
  custom?: Record<string, (value: unknown) => unknown>;
}

/**
 * Field aliasing configuration
 */
export type FieldAliases = Record<string, string>;

/**
 * Result diff operation
 */
export interface DiffOperation {
  /** Operation type */
  op: 'add' | 'remove' | 'replace' | 'update';
  /** Path to the changed value */
  path: string[];
  /** Old value (for remove/replace/update) */
  oldValue?: unknown;
  /** New value (for add/replace/update) */
  newValue?: unknown;
}

/**
 * Result diff output
 */
export interface ResultDiff {
  /** List of changes */
  changes: DiffOperation[];
  /** Has any changes */
  hasChanges: boolean;
  /** Number of changes */
  changeCount: number;
  /** Changed fields */
  changedFields: Set<string>;
}

/**
 * Aggregation function type
 */
export type AggregationFn<T, R> = (results: T[]) => R;

/**
 * Memoization cache entry
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  hits: number;
}

// ============================================================================
// Memoization Cache
// ============================================================================

/**
 * LRU cache for computed field memoization
 */
class MemoizationCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private maxAge: number;

  constructor(maxSize = 1000, maxAge = 300000) {
    this.maxSize = maxSize;
    this.maxAge = maxAge;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return undefined;
    }

    // Update hit count and move to end (LRU)
    entry.hits++;
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: string, value: T): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  stats(): { size: number; hits: number; avgHits: number } {
    let totalHits = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
    }

    return {
      size: this.cache.size,
      hits: totalHits,
      avgHits: this.cache.size > 0 ? totalHits / this.cache.size : 0,
    };
  }
}

// ============================================================================
// Core Result Enhancement Engine
// ============================================================================

/**
 * Result enhancement engine with computed fields and transformations
 */
export class ResultEnhancer<T extends Record<string, unknown> = Record<string, unknown>> {
  private computedFields = new Map<string, ComputedFieldDef<T, (keyof T)[], unknown>>();
  private transformers: ResultTransformer<T, unknown>[] = [];
  private cache = new MemoizationCache();

  /**
   * Define a computed field
   */
  defineComputedField<TDeps extends (keyof T)[], TResult>(
    name: string,
    definition: ComputedFieldDef<T, TDeps, TResult>
  ): this {
    this.computedFields.set(name, definition as ComputedFieldDef<T, (keyof T)[], unknown>);
    return this;
  }

  /**
   * Add a result transformer
   */
  addTransformer<R>(transformer: ResultTransformer<T, R>): this {
    this.transformers.push(transformer as ResultTransformer<T, unknown>);
    return this;
  }

  /**
   * Enhance a result with computed fields
   */
  enhance(result: T): T & Record<string, unknown> {
    const enhanced = { ...result };

    // Compute all defined fields
    for (const [fieldName, definition] of this.computedFields) {
      // Check if all dependencies are present
      const hasAllDeps = definition.needs.every((dep) => dep in result);
      if (!hasAllDeps) continue;

      // Extract dependencies
      const deps = definition.needs.reduce(
        (acc, key) => {
          acc[key] = result[key];
          return acc;
        },
        {} as Record<keyof T, unknown>
      ) as Pick<T, (typeof definition.needs)[number]>;

      // Check cache if enabled
      if (definition.cache) {
        const cacheKeyFn = definition.cacheKey || ((data: unknown) => JSON.stringify(data));
        const cacheKey = `${fieldName}:${cacheKeyFn(deps)}`;

        const cached = this.cache.get(cacheKey);
        if (cached !== undefined) {
          enhanced[fieldName] = cached;
          continue;
        }

        // Compute and cache
        const computed = definition.compute(deps);
        this.cache.set(cacheKey, computed);
        enhanced[fieldName] = computed;
      } else {
        // Compute without caching
        enhanced[fieldName] = definition.compute(deps);
      }
    }

    // Apply transformers
    let transformed: unknown = enhanced;
    for (const transformer of this.transformers) {
      transformed = transformer(transformed as T);
    }

    return transformed as T & Record<string, unknown>;
  }

  /**
   * Enhance multiple results
   */
  enhanceMany(results: T[]): (T & Record<string, unknown>)[] {
    return results.map((result) => this.enhance(result));
  }

  /**
   * Clear memoization cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): ReturnType<MemoizationCache['stats']> {
    return this.cache.stats();
  }
}

// ============================================================================
// Transformation Utilities
// ============================================================================

/**
 * Transform result using a pipeline of transformers
 */
export function transform<T, R = T>(
  result: T,
  ...transformers: ResultTransformer<unknown, unknown>[]
): R {
  let transformed: unknown = result;
  for (const transformer of transformers) {
    transformed = transformer(transformed);
  }
  return transformed as R;
}

/**
 * Create a transformer that maps fields
 */
export function mapFields<T extends Record<string, unknown>>(
  mapper: Partial<Record<keyof T, (value: unknown) => unknown>>
): ResultTransformer<T> {
  return (result: T): T => {
    const mapped = { ...result };
    for (const [field, fn] of Object.entries(mapper)) {
      if (field in mapped && fn) {
        mapped[field as keyof T] = fn(mapped[field]);
      }
    }
    return mapped;
  };
}

/**
 * Create a transformer that filters fields
 */
export function pickFields<T extends Record<string, unknown>>(
  fields: (keyof T)[]
): ResultTransformer<T, Partial<T>> {
  return (result: T): Partial<T> => {
    const picked: Partial<T> = {};
    for (const field of fields) {
      if (field in result) {
        picked[field] = result[field];
      }
    }
    return picked;
  };
}

/**
 * Create a transformer that omits fields
 */
export function omitFields<T extends Record<string, unknown>>(
  fields: (keyof T)[]
): ResultTransformer<T> {
  return (result: T): T => {
    const omitted = { ...result };
    for (const field of fields) {
      delete omitted[field];
    }
    return omitted;
  };
}

// ============================================================================
// Normalization
// ============================================================================

/**
 * Normalize nested data structures
 */
export function normalize<T>(data: T, schema: NormalizationSchema<T>): NormalizedData {
  const entities: Record<string, Record<string | number, unknown>> = {};

  function normalizeEntity<E>(entity: E, entitySchema: NormalizationSchema<E>): string | number {
    const { entity: entityName, idField = 'id', relations = {}, arrays = [] } = entitySchema;

    // Initialize entity collection if needed
    if (!entities[entityName]) {
      entities[entityName] = {};
    }

    // Get entity ID
    const id = (entity as Record<string, unknown>)[idField as string] as string | number;
    if (!id) throw new Error(`Entity missing ID field: ${String(idField)}`);

    // Clone entity and normalize relations
    const normalized = { ...entity } as Record<string, unknown>;

    // Normalize relations
    for (const [field, relationSchema] of Object.entries(relations)) {
      const value = normalized[field];
      if (value) {
        if (Array.isArray(value)) {
          normalized[field] = value.map((item) =>
            normalizeEntity(item, relationSchema as NormalizationSchema<typeof item>)
          );
        } else {
          normalized[field] = normalizeEntity(value, relationSchema as NormalizationSchema<typeof value>);
        }
      }
    }

    // Normalize arrays
    for (const arrayField of arrays) {
      const value = normalized[arrayField as string];
      if (Array.isArray(value)) {
        // Arrays are already normalized or will be handled by relations
      }
    }

    // Store normalized entity
    entities[entityName][id] = normalized;
    return id;
  }

  // Normalize root data
  let result: string | number | (string | number)[];
  if (Array.isArray(data)) {
    result = data.map((item) => normalizeEntity(item, schema));
  } else {
    result = normalizeEntity(data, schema);
  }

  return { entities, result };
}

/**
 * Denormalize data back to nested structure
 */
export function denormalize<T>(
  normalized: NormalizedData,
  schema: NormalizationSchema<T>
): T | T[] {
  function denormalizeEntity<E>(
    id: string | number,
    entitySchema: NormalizationSchema<E>
  ): E {
    const { entity: entityName, relations = {} } = entitySchema;

    // Get entity from normalized data
    const entity = normalized.entities[entityName]?.[id];
    if (!entity) throw new Error(`Entity not found: ${entityName}[${id}]`);

    // Clone entity
    const denormalized = { ...entity } as Record<string, unknown>;

    // Denormalize relations
    for (const [field, relationSchema] of Object.entries(relations)) {
      const value = denormalized[field];
      if (value) {
        if (Array.isArray(value)) {
          denormalized[field] = value.map((relId) =>
            denormalizeEntity(relId, relationSchema as NormalizationSchema)
          );
        } else if (typeof value === 'string' || typeof value === 'number') {
          denormalized[field] = denormalizeEntity(
            value,
            relationSchema as NormalizationSchema
          );
        }
      }
    }

    return denormalized as E;
  }

  // Denormalize root result
  if (Array.isArray(normalized.result)) {
    return normalized.result.map((id) => denormalizeEntity(id, schema)) as T[];
  } else {
    return denormalizeEntity(normalized.result, schema) as T;
  }
}

// ============================================================================
// Field Masking
// ============================================================================

/**
 * Mask sensitive fields in results
 */
export function mask<T extends Record<string, unknown>>(
  result: T,
  config: FieldMaskConfig
): T {
  const masked = { ...result };

  // Remove fields
  if (config.remove) {
    for (const field of config.remove) {
      delete masked[field];
    }
  }

  // Redact fields
  if (config.redact) {
    for (const field of config.redact) {
      if (field in masked) {
        masked[field] = '[REDACTED]' as T[Extract<keyof T, string>];
      }
    }
  }

  // Apply custom masking
  if (config.custom) {
    for (const [field, maskFn] of Object.entries(config.custom)) {
      if (field in masked) {
        masked[field] = maskFn(masked[field]) as T[Extract<keyof T, string>];
      }
    }
  }

  return masked;
}

/**
 * Mask fields deeply (recursive)
 */
export function maskDeep<T>(result: T, config: FieldMaskConfig): T {
  if (Array.isArray(result)) {
    return result.map((item) => maskDeep(item, config)) as T;
  }

  if (result && typeof result === 'object') {
    return mask(result as Record<string, unknown>, config) as T;
  }

  return result;
}

// ============================================================================
// Field Aliasing
// ============================================================================

/**
 * Alias field names in result
 */
export function alias<T extends Record<string, unknown>>(
  result: T,
  aliases: FieldAliases
): Record<string, unknown> {
  const aliased: Record<string, unknown> = {};

  for (const [oldName, newName] of Object.entries(aliases)) {
    if (oldName in result) {
      aliased[newName] = result[oldName];
    }
  }

  // Copy non-aliased fields
  for (const [key, value] of Object.entries(result)) {
    if (!(key in aliases)) {
      aliased[key] = value;
    }
  }

  return aliased;
}

// ============================================================================
// Result Aggregation
// ============================================================================

/**
 * Aggregate multiple results
 */
export function aggregate<T, R>(results: T[], aggregator: AggregationFn<T, R>): R {
  return aggregator(results);
}

/**
 * Common aggregation functions
 */
export const aggregators = {
  /** Sum numeric field across results */
  sum:
    <T extends Record<string, unknown>>(field: keyof T): AggregationFn<T, number> =>
    (results) =>
      results.reduce((sum, result) => sum + (Number(result[field]) || 0), 0),

  /** Average numeric field across results */
  avg:
    <T extends Record<string, unknown>>(field: keyof T): AggregationFn<T, number> =>
    (results) => {
      if (results.length === 0) return 0;
      const sum = results.reduce((s, result) => s + (Number(result[field]) || 0), 0);
      return sum / results.length;
    },

  /** Find minimum value */
  min:
    <T extends Record<string, unknown>>(field: keyof T): AggregationFn<T, number> =>
    (results) => {
      if (results.length === 0) return 0;
      return Math.min(...results.map((r) => Number(r[field]) || 0));
    },

  /** Find maximum value */
  max:
    <T extends Record<string, unknown>>(field: keyof T): AggregationFn<T, number> =>
    (results) => {
      if (results.length === 0) return 0;
      return Math.max(...results.map((r) => Number(r[field]) || 0));
    },

  /** Count results */
  count: <T>(): AggregationFn<T, number> => (results) => results.length,

  /** Group by field */
  groupBy:
    <T extends Record<string, unknown>>(
      field: keyof T
    ): AggregationFn<T, Record<string, T[]>> =>
    (results) => {
      const groups: Record<string, T[]> = {};
      for (const result of results) {
        const key = String(result[field]);
        if (!groups[key]) groups[key] = [];
        groups[key].push(result);
      }
      return groups;
    },

  /** Merge all results into one */
  merge: <T extends Record<string, unknown>>(): AggregationFn<T, T> => (results) =>
    Object.assign({}, ...results),
};

// ============================================================================
// Result Diffing
// ============================================================================

/**
 * Compute diff between two results
 */
export function diff<T>(oldResult: T, newResult: T): ResultDiff {
  const changes: DiffOperation[] = [];
  const changedFields = new Set<string>();

  function diffValues(
    oldVal: unknown,
    newVal: unknown,
    path: string[] = []
  ): void {
    // Handle null/undefined
    if (oldVal === newVal) return;

    if (oldVal === null || oldVal === undefined) {
      changes.push({ op: 'add', path, newValue: newVal });
      changedFields.add(path[0] || '');
      return;
    }

    if (newVal === null || newVal === undefined) {
      changes.push({ op: 'remove', path, oldValue: oldVal });
      changedFields.add(path[0] || '');
      return;
    }

    // Handle arrays
    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      const maxLength = Math.max(oldVal.length, newVal.length);
      for (let i = 0; i < maxLength; i++) {
        if (i >= oldVal.length) {
          changes.push({ op: 'add', path: [...path, String(i)], newValue: newVal[i] });
          changedFields.add(path[0] || '');
        } else if (i >= newVal.length) {
          changes.push({ op: 'remove', path: [...path, String(i)], oldValue: oldVal[i] });
          changedFields.add(path[0] || '');
        } else {
          diffValues(oldVal[i], newVal[i], [...path, String(i)]);
        }
      }
      return;
    }

    // Handle objects
    if (
      typeof oldVal === 'object' &&
      typeof newVal === 'object' &&
      !Array.isArray(oldVal) &&
      !Array.isArray(newVal)
    ) {
      const oldKeys = new Set(Object.keys(oldVal as Record<string, unknown>));
      const newKeys = new Set(Object.keys(newVal as Record<string, unknown>));

      // Check for removed keys
      for (const key of oldKeys) {
        if (!newKeys.has(key)) {
          changes.push({
            op: 'remove',
            path: [...path, key],
            oldValue: (oldVal as Record<string, unknown>)[key],
          });
          changedFields.add(path[0] || key);
        }
      }

      // Check for added/changed keys
      for (const key of newKeys) {
        if (!oldKeys.has(key)) {
          changes.push({
            op: 'add',
            path: [...path, key],
            newValue: (newVal as Record<string, unknown>)[key],
          });
          changedFields.add(path[0] || key);
        } else {
          diffValues(
            (oldVal as Record<string, unknown>)[key],
            (newVal as Record<string, unknown>)[key],
            [...path, key]
          );
        }
      }
      return;
    }

    // Primitive values differ
    changes.push({ op: 'replace', path, oldValue: oldVal, newValue: newVal });
    changedFields.add(path[0] || '');
  }

  diffValues(oldResult, newResult);

  return {
    changes,
    hasChanges: changes.length > 0,
    changeCount: changes.length,
    changedFields,
  };
}

/**
 * Apply a diff to a result
 */
export function applyDiff<T>(result: T, resultDiff: ResultDiff): T {
  let modified = JSON.parse(JSON.stringify(result)); // Deep clone

  for (const change of resultDiff.changes) {
    let current: Record<string, unknown> = modified as Record<string, unknown>;

    // Navigate to parent
    for (let i = 0; i < change.path.length - 1; i++) {
      const key = change.path[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    const lastKey = change.path[change.path.length - 1];

    // Apply operation
    switch (change.op) {
      case 'add':
      case 'replace':
      case 'update':
        if (lastKey !== undefined) {
          current[lastKey] = change.newValue;
        }
        break;
      case 'remove':
        if (lastKey !== undefined) {
          delete current[lastKey];
        }
        break;
    }
  }

  return modified;
}

// ============================================================================
// React Query Integration
// ============================================================================

/**
 * React Query integration options
 */
export interface ReactQueryIntegrationOptions {
  /** Query client instance */
  queryClient: QueryClient;
  /** Auto-enhance query results */
  autoEnhance?: boolean;
  /** Result enhancer instance */
  enhancer?: ResultEnhancer;
}

/**
 * Create React Query integration middleware
 */
export function createReactQueryMiddleware(options: ReactQueryIntegrationOptions) {
  const { queryClient, autoEnhance = true, enhancer } = options;

  // Intercept query results and enhance them
  return {
    /**
     * Enhance query data automatically
     */
    enhanceQuery<T extends Record<string, unknown>>(
      queryKey: unknown[],
      data: T
    ): T & Record<string, unknown> {
      if (!autoEnhance || !enhancer) return data;
      return enhancer.enhance(data);
    },

    /**
     * Invalidate queries with diff detection
     */
    async invalidateWithDiff<T>(queryKey: unknown[], newData: T): Promise<void> {
      const oldData = queryClient.getQueryData<T>(queryKey);
      if (!oldData) {
        await queryClient.invalidateQueries({ queryKey });
        return;
      }

      const resultDiff = diff(oldData, newData);
      if (resultDiff.hasChanges) {
        await queryClient.invalidateQueries({ queryKey });
      }
    },

    /**
     * Set query data with normalization
     */
    setNormalizedData<T>(
      queryKey: unknown[],
      data: T,
      schema: NormalizationSchema<T>
    ): void {
      const normalized = normalize(data, schema);
      queryClient.setQueryData(queryKey, normalized);
    },

    /**
     * Get and denormalize query data
     */
    getDenormalizedData<T>(
      queryKey: unknown[],
      schema: NormalizationSchema<T>
    ): T | T[] | undefined {
      const normalized = queryClient.getQueryData<NormalizedData>(queryKey);
      if (!normalized) return undefined;
      return denormalize(normalized, schema);
    },
  };
}

// ============================================================================
// Extension Definition
// ============================================================================

/**
 * Built-in model registry for computed fields
 */
const modelEnhancers = new Map<string, ResultEnhancer>();

/**
 * Get or create enhancer for a model
 */
function getModelEnhancer<T extends Record<string, unknown>>(model: string): ResultEnhancer<T> {
  if (!modelEnhancers.has(model)) {
    modelEnhancers.set(model, new ResultEnhancer<T>());
  }
  return modelEnhancers.get(model) as ResultEnhancer<T>;
}

/**
 * Results extension for enzyme
 */
export const resultsExtension = {
  name: 'enzyme:results',
  version: '2.0.0',
  description: 'Comprehensive result transformations and computed fields',

  // Client methods available on enzyme instance
  client: {
    /**
     * Define a computed field for a model
     */
    $defineComputedField<T extends Record<string, unknown>, TDeps extends (keyof T)[], TResult>(
      model: string,
      field: string,
      definition: ComputedFieldDef<T, TDeps, TResult>
    ): void {
      const enhancer = getModelEnhancer<T>(model);
      enhancer.defineComputedField(field, definition);
    },

    /**
     * Transform a result with multiple transformers
     */
    $transform<T, R = T>(
      result: T,
      ...transformers: ResultTransformer<unknown, unknown>[]
    ): R {
      return transform(result, ...transformers);
    },

    /**
     * Normalize nested data
     */
    $normalize<T>(data: T, schema: NormalizationSchema<T>): NormalizedData {
      return normalize(data, schema);
    },

    /**
     * Denormalize data back to nested structure
     */
    $denormalize<T>(normalized: NormalizedData, schema: NormalizationSchema<T>): T | T[] {
      return denormalize(normalized, schema);
    },

    /**
     * Mask sensitive fields
     */
    $mask<T extends Record<string, unknown>>(result: T, config: FieldMaskConfig): T {
      return mask(result, config);
    },

    /**
     * Mask fields deeply (recursive)
     */
    $maskDeep<T>(result: T, config: FieldMaskConfig): T {
      return maskDeep(result, config);
    },

    /**
     * Alias field names
     */
    $alias<T extends Record<string, unknown>>(result: T, aliases: FieldAliases): Record<string, unknown> {
      return alias(result, aliases);
    },

    /**
     * Compute diff between two results
     */
    $diff<T>(oldResult: T, newResult: T): ResultDiff {
      return diff(oldResult, newResult);
    },

    /**
     * Apply a diff to a result
     */
    $applyDiff<T>(result: T, resultDiff: ResultDiff): T {
      return applyDiff(result, resultDiff);
    },

    /**
     * Aggregate multiple results
     */
    $aggregate<T, R>(results: T[], aggregator: AggregationFn<T, R>): R {
      return aggregate(results, aggregator);
    },

    /**
     * Enhance result with computed fields
     */
    $enhance<T extends Record<string, unknown>>(
      model: string,
      result: T
    ): T & Record<string, unknown> {
      const enhancer = getModelEnhancer<T>(model);
      return enhancer.enhance(result);
    },

    /**
     * Enhance multiple results
     */
    $enhanceMany<T extends Record<string, unknown>>(
      model: string,
      results: T[]
    ): (T & Record<string, unknown>)[] {
      const enhancer = getModelEnhancer<T>(model);
      return enhancer.enhanceMany(results);
    },

    /**
     * Clear memoization cache for a model
     */
    $clearCache(model?: string): void {
      if (model) {
        const enhancer = modelEnhancers.get(model);
        if (enhancer) enhancer.clearCache();
      } else {
        for (const enhancer of modelEnhancers.values()) {
          enhancer.clearCache();
        }
      }
    },

    /**
     * Get cache statistics
     */
    $getCacheStats(
      model?: string
    ): Record<string, ReturnType<ResultEnhancer['getCacheStats']>> {
      if (model) {
        const enhancer = modelEnhancers.get(model);
        return enhancer ? { [model]: enhancer.getCacheStats() } : {};
      }

      const stats: Record<string, ReturnType<ResultEnhancer['getCacheStats']>> = {};
      for (const [modelName, enhancer] of modelEnhancers) {
        stats[modelName] = enhancer.getCacheStats();
      }
      return stats;
    },

    /**
     * Create React Query integration
     */
    $createReactQueryMiddleware(options: ReactQueryIntegrationOptions) {
      return createReactQueryMiddleware(options);
    },
  },

  // Utility exports
  utils: {
    ResultEnhancer,
    mapFields,
    pickFields,
    omitFields,
    aggregators,
  },
} as const;

// ============================================================================
// Type-safe Extension Interface
// ============================================================================

/**
 * Type-safe extension type for TypeScript inference
 */
export type ResultsExtension = typeof resultsExtension;

/**
 * Extended enzyme client type with result methods
 */
export interface EnzymeClientWithResults {
  $defineComputedField: typeof resultsExtension.client.$defineComputedField;
  $transform: typeof resultsExtension.client.$transform;
  $normalize: typeof resultsExtension.client.$normalize;
  $denormalize: typeof resultsExtension.client.$denormalize;
  $mask: typeof resultsExtension.client.$mask;
  $maskDeep: typeof resultsExtension.client.$maskDeep;
  $alias: typeof resultsExtension.client.$alias;
  $diff: typeof resultsExtension.client.$diff;
  $applyDiff: typeof resultsExtension.client.$applyDiff;
  $aggregate: typeof resultsExtension.client.$aggregate;
  $enhance: typeof resultsExtension.client.$enhance;
  $enhanceMany: typeof resultsExtension.client.$enhanceMany;
  $clearCache: typeof resultsExtension.client.$clearCache;
  $getCacheStats: typeof resultsExtension.client.$getCacheStats;
  $createReactQueryMiddleware: typeof resultsExtension.client.$createReactQueryMiddleware;
}

// ============================================================================
// Exports
// ============================================================================

export default resultsExtension;

// Re-export all types and utilities
export type {
  ResultTransformer,
  NormalizationSchema,
  NormalizedData,
  FieldMaskConfig,
  FieldAliases,
  DiffOperation,
  ResultDiff,
  AggregationFn,
  ReactQueryIntegrationOptions,
};
