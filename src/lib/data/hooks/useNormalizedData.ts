/**
 * @file useNormalizedData Hook
 * @description React hook for working with normalized data including
 * entity selection, denormalization, and CRUD operations.
 *
 * Features:
 * - Entity selection and memoization
 * - Automatic denormalization
 * - CRUD operations with normalization
 * - Selector composition
 * - Optimized re-renders
 *
 * @example
 * ```typescript
 * import { useNormalizedData, useEntity, useEntities } from '@/lib/data';
 *
 * function PostList() {
 *   const { entities, getEntity, updateEntity } = useNormalizedData(store);
 *   const posts = useEntities(entities, 'posts', postIds, postSchema);
 *
 *   return posts.map(post => (
 *     <PostCard key={post.id} post={post} />
 *   ));
 * }
 *
 * function PostCard({ postId }) {
 *   const post = useEntity(entities, 'posts', postId, postSchema);
 *   return <div>{post?.title}</div>;
 * }
 * ```
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  NormalizedEntities,
  Entity,
  EntitySchema,
  Schema,
  NormalizationResult,
} from '../normalization/normalizer';
import {
  normalizeAndMerge,
  getEntity as getEntityFromState,
  getEntities as getEntitiesFromState,
  getAllEntities,
  updateEntity as updateEntityInState,
  removeEntity as removeEntityFromState,
  mergeEntities,
  ArraySchema,
} from '../normalization/normalizer';
import {
  denormalize,
  denormalizeMany,
  type DenormalizeOptions,
} from '../normalization/denormalizer';
import type { SchemaRegistry } from '../normalization/schema-registry';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Normalized data store
 */
export interface NormalizedStore {
  /** Get current entities */
  getEntities: () => NormalizedEntities;
  /** Set entities */
  setEntities: (entities: NormalizedEntities) => void;
  /** Subscribe to changes */
  subscribe: (listener: () => void) => () => void;
}

/**
 * Normalized data state
 */
export interface NormalizedDataState {
  /** Current entities */
  entities: NormalizedEntities;
  /** Entity counts by type */
  entityCounts: Record<string, number>;
  /** Last update timestamp */
  lastUpdatedAt: number | null;
  /** Is loading */
  isLoading: boolean;
}

/**
 * Validation function type
 */
export type ValidationFunction<T = unknown> = (data: T) => boolean | { valid: boolean; errors?: string[] };

/**
 * Validation error thrown when data fails validation
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: string[] = []
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Hook options
 */
export interface UseNormalizedDataOptions {
  /** Schema registry for denormalization */
  registry?: SchemaRegistry;
  /** Default denormalization options */
  denormalizeOptions?: DenormalizeOptions;
  /** Enable change tracking */
  trackChanges?: boolean;
  /** Callback on entity change */
  onEntityChange?: (entityType: string, entityId: string, entity: Entity | null) => void;
  /** Optional validation function to run before writes */
  validate?: ValidationFunction;
  /** Whether to throw on validation failure (default: true) */
  throwOnValidationError?: boolean;
}

/**
 * Hook return type
 */
export interface UseNormalizedDataReturn {
  /** Current state */
  state: NormalizedDataState;
  /** Current entities */
  entities: NormalizedEntities;
  /** Get entity by type and ID */
  getEntity: <T extends Entity>(entityType: string, entityId: string) => T | undefined;
  /** Get multiple entities */
  getEntities: <T extends Entity>(entityType: string, ids: string[]) => T[];
  /** Get all entities of type */
  getAllOfType: <T extends Entity>(entityType: string) => T[];
  /** Get denormalized entity */
  getDenormalized: <T>(entityType: string, entityId: string, schema: EntitySchema) => T | null;
  /** Get multiple denormalized entities */
  getDenormalizedMany: <T extends Entity>(entityType: string, ids: string[], schema: EntitySchema) => T[];
  /** Normalize and add data */
  addData: <T>(data: unknown, schema: Schema) => NormalizationResult<T>;
  /** Update entity */
  updateEntity: <T extends Entity>(entityType: string, entityId: string, updates: Partial<T>) => void;
  /** Remove entity */
  removeEntity: (entityType: string, entityId: string) => void;
  /** Merge entities */
  mergeData: (source: NormalizedEntities, strategy?: 'overwrite' | 'keep' | 'merge') => void;
  /** Clear all entities */
  clearAll: () => void;
  /** Clear entities of type */
  clearType: (entityType: string) => void;
  /** Get entity count */
  getCount: (entityType: string) => number;
  /** Check if entity exists */
  hasEntity: (entityType: string, entityId: string) => boolean;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for working with normalized data
 *
 * @param store - Normalized data store
 * @param options - Hook options
 * @returns Normalized data state and methods
 */
export function useNormalizedData(
  store: NormalizedStore,
  options: UseNormalizedDataOptions = {}
): UseNormalizedDataReturn {
  const {
    registry: _registry,
    denormalizeOptions = {},
    trackChanges = false,
    onEntityChange,
    validate,
    throwOnValidationError = true,
  } = options;

  // Helper function to validate data before writes
  const validateData = useCallback(
    <T>(data: T): boolean => {
      if (!validate) return true;

      const result = validate(data);
      const isValid = typeof result === 'boolean' ? result : result.valid;
      const errors = typeof result === 'object' && result.errors ? result.errors : [];

      if (!isValid && throwOnValidationError) {
        throw new ValidationError('Data validation failed', errors);
      }

      return isValid;
    },
    [validate, throwOnValidationError]
  );

  // State
  const [state, setState] = useState<NormalizedDataState>(() => {
    const entities = store.getEntities();
    return {
      entities,
      entityCounts: Object.fromEntries(
        Object.entries(entities).map(([type, map]) => [type, Object.keys(map).length])
      ),
      lastUpdatedAt: null,
      isLoading: false,
    };
  });

  // Refs
  const storeRef = useRef(store);
  storeRef.current = store;

  // Subscribe to store changes
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const entities = storeRef.current.getEntities();
      setState({
        entities,
        entityCounts: Object.fromEntries(
          Object.entries(entities).map(([type, map]) => [type, Object.keys(map).length])
        ),
        lastUpdatedAt: Date.now(),
        isLoading: false,
      });
    });

    return unsubscribe;
  }, [store]);

  // Get entity
  const getEntity = useCallback(
    <T extends Entity>(entityType: string, entityId: string): T | undefined => {
      return getEntityFromState<T>(state.entities, entityType, entityId);
    },
    [state.entities]
  );

  // Get multiple entities
  const getEntitiesFn = useCallback(
    <T extends Entity>(entityType: string, ids: string[]): T[] => {
      return getEntitiesFromState<T>(state.entities, entityType, ids);
    },
    [state.entities]
  );

  // Get all entities of type
  const getAllOfType = useCallback(
    <T extends Entity>(entityType: string): T[] => {
      return getAllEntities<T>(state.entities, entityType);
    },
    [state.entities]
  );

  // Get denormalized entity
  const getDenormalized = useCallback(
    <T>(_entityType: string, entityId: string, schema: EntitySchema): T | null => {
      return denormalize<T>(entityId, schema, state.entities, denormalizeOptions);
    },
    [state.entities, denormalizeOptions]
  );

  // Get multiple denormalized entities
  const getDenormalizedMany = useCallback(
    <T extends Entity>(_entityType: string, ids: string[], schema: EntitySchema): T[] => {
      return denormalizeMany<T>(ids, schema, state.entities, denormalizeOptions);
    },
    [state.entities, denormalizeOptions]
  );

  // Normalize and add data with optional validation
  const addData = useCallback(
    <T>(data: unknown, schema: Schema): NormalizationResult<T> => {
      // Validate data before normalizing if validation is configured
      validateData(data);
      const result = normalizeAndMerge<T>(data, schema, state.entities);
      storeRef.current.setEntities(result.entities);
      return result;
    },
    [state.entities, validateData]
  );

  // Update entity with optional validation
  const updateEntityFn = useCallback(
    <T extends Entity>(entityType: string, entityId: string, updates: Partial<T>): void => {
      // Validate updates before applying if validation is configured
      validateData(updates);
      const updated = updateEntityInState<T>(state.entities, entityType, entityId, updates);
      storeRef.current.setEntities(updated);

      if (trackChanges && onEntityChange) {
        const entity = getEntityFromState<T>(updated, entityType, entityId);
        onEntityChange(entityType, entityId, entity ?? null);
      }
    },
    [state.entities, trackChanges, onEntityChange, validateData]
  );

  // Remove entity
  const removeEntityFn = useCallback(
    (entityType: string, entityId: string): void => {
      const updated = removeEntityFromState(state.entities, entityType, entityId);
      storeRef.current.setEntities(updated);

      if (trackChanges && onEntityChange) {
        onEntityChange(entityType, entityId, null);
      }
    },
    [state.entities, trackChanges, onEntityChange]
  );

  // Merge entities
  const mergeData = useCallback(
    (source: NormalizedEntities, strategy: 'overwrite' | 'keep' | 'merge' = 'merge'): void => {
      const merged = mergeEntities(state.entities, source, strategy);
      storeRef.current.setEntities(merged);
    },
    [state.entities]
  );

  // Clear all entities
  const clearAll = useCallback((): void => {
    storeRef.current.setEntities({});
  }, []);

  // Clear entities of type
  const clearType = useCallback(
    (entityType: string): void => {
      const { [entityType]: _removed, ...rest } = state.entities;
      storeRef.current.setEntities(rest);
    },
    [state.entities]
  );

  // Get entity count
  const getCount = useCallback(
    (entityType: string): number => {
      return state.entityCounts[entityType] ?? 0;
    },
    [state.entityCounts]
  );

  // Check if entity exists
  const hasEntity = useCallback(
    (entityType: string, entityId: string): boolean => {
      return !!state.entities[entityType]?.[entityId];
    },
    [state.entities]
  );

  return {
    state,
    entities: state.entities,
    getEntity,
    getEntities: getEntitiesFn,
    getAllOfType,
    getDenormalized,
    getDenormalizedMany,
    addData,
    updateEntity: updateEntityFn,
    removeEntity: removeEntityFn,
    mergeData,
    clearAll,
    clearType,
    getCount,
    hasEntity,
  };
}

// =============================================================================
// SPECIALIZED HOOKS
// =============================================================================

/**
 * Hook for selecting a single entity
 *
 * @param entities - Normalized entities
 * @param entityType - Entity type
 * @param entityId - Entity ID
 * @param schema - Optional schema for denormalization
 * @param options - Denormalization options
 * @returns Entity or null
 */
export function useEntity<T extends Entity>(
  entities: NormalizedEntities,
  entityType: string,
  entityId: string | null | undefined,
  schema?: EntitySchema,
  options?: DenormalizeOptions
): T | null {
  return useMemo(() => {
    if (entityId == null || entityId === '') return null;

    if (schema !== undefined) {
      return denormalize<T>(entityId, schema, entities, options);
    }

    return getEntityFromState<T>(entities, entityType, entityId) ?? null;
  }, [entities, entityType, entityId, schema, options]);
}

/**
 * Hook for selecting multiple entities
 *
 * @param entities - Normalized entities
 * @param entityType - Entity type
 * @param ids - Entity IDs
 * @param schema - Optional schema for denormalization
 * @param options - Denormalization options
 * @returns Array of entities
 */
export function useEntities<T extends Entity>(
  entities: NormalizedEntities,
  entityType: string,
  ids: string[],
  schema?: EntitySchema,
  options?: DenormalizeOptions
): T[] {
  return useMemo(() => {
    if (ids.length === 0) return [];

    if (schema) {
      return denormalizeMany<T>(ids, schema, entities, options);
    }

    return getEntitiesFromState<T>(entities, entityType, ids);
  }, [entities, entityType, ids, schema, options]);
}

/**
 * Hook for selecting all entities of a type
 *
 * @param entities - Normalized entities
 * @param entityType - Entity type
 * @param filter - Optional filter function
 * @param sort - Optional sort function
 * @returns Array of entities
 */
export function useAllEntities<T extends Entity>(
  entities: NormalizedEntities,
  entityType: string,
  filter?: (entity: T) => boolean,
  sort?: (a: T, b: T) => number
): T[] {
  return useMemo(() => {
    let result = getAllEntities<T>(entities, entityType);

    if (filter) {
      result = result.filter(filter);
    }

    if (sort) {
      result = [...result].sort(sort);
    }

    return result;
  }, [entities, entityType, filter, sort]);
}

/**
 * Hook for entity selector with memoization
 *
 * @param entities - Normalized entities
 * @param selector - Selector function
 * @param deps - Additional dependencies
 * @returns Selected value
 */
export function useEntitySelector<T>(
  entities: NormalizedEntities,
  selector: (entities: NormalizedEntities) => T,
  _deps: unknown[] = []
): T {
  // Note: deps parameter is kept for API compatibility but not used
  // Users should memoize their selector function instead
  return useMemo(() => selector(entities), [entities, selector]);
}

/**
 * Hook for normalized CRUD operations
 *
 * @param store - Normalized store
 * @param entityType - Entity type
 * @param schema - Entity schema
 * @returns CRUD operations
 */
export function useNormalizedCrud<T extends Entity>(
  store: NormalizedStore,
  entityType: string,
  schema: EntitySchema
): {
  items: T[];
  getById: (id: string) => T | null;
  create: (data: Omit<T, 'id'> & { id?: string }) => T;
  update: (id: string, data: Partial<T>) => T | null;
  remove: (id: string) => void;
  upsert: (data: T) => T;
  upsertMany: (items: T[]) => T[];
} {
  const [entities, setEntities] = useState<NormalizedEntities>(store.getEntities());

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setEntities(store.getEntities());
    });
    return unsubscribe;
  }, [store]);

  const items = useMemo(() => {
    return getAllEntities<T>(entities, entityType);
  }, [entities, entityType]);

  const getById = useCallback(
    (id: string): T | null => {
      return denormalize<T>(id, schema, entities) ?? null;
    },
    [entities, schema]
  );

  const create = useCallback(
    (data: Omit<T, 'id'> & { id?: string }): T => {
      const id = (data.id != null && data.id !== '') ? data.id : `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const entity = { ...data, id } as T;
      const result = normalizeAndMerge(entity, schema, entities);
      store.setEntities(result.entities);
      return entity;
    },
    [entities, schema, store]
  );

  const update = useCallback(
    (id: string, data: Partial<T>): T | null => {
      const existing = getEntityFromState<T>(entities, entityType, id);
      if (!existing) return null;

      const updated = updateEntityInState<T>(entities, entityType, id, data);
      store.setEntities(updated);
      return { ...existing, ...data } as T;
    },
    [entities, entityType, store]
  );

  const remove = useCallback(
    (id: string): void => {
      const updated = removeEntityFromState(entities, entityType, id);
      store.setEntities(updated);
    },
    [entities, entityType, store]
  );

  const upsert = useCallback(
    (data: T): T => {
      const result = normalizeAndMerge(data, schema, entities);
      store.setEntities(result.entities);
      return data;
    },
    [entities, schema, store]
  );

  const upsertMany = useCallback(
    (newItems: T[]): T[] => {
      const arraySchema = new ArraySchema(schema);
      const result = normalizeAndMerge(newItems, arraySchema, entities);
      store.setEntities(result.entities);
      return newItems;
    },
    [entities, schema, store]
  );

  return {
    items,
    getById,
    create,
    update,
    remove,
    upsert,
    upsertMany,
  };
}

/**
 * Create a simple normalized store
 */
export function createNormalizedStore(
  initialEntities: NormalizedEntities = {}
): NormalizedStore {
  let entities = initialEntities;
  const listeners = new Set<() => void>();

  return {
    getEntities: () => entities,
    setEntities: (newEntities) => {
      entities = newEntities;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
}