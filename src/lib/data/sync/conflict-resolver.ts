/**
 * @file Conflict Resolver
 * @description Advanced conflict resolution strategies for data synchronization
 * including three-way merge, field-level resolution, and vector clocks.
 *
 * Features:
 * - Multiple resolution strategies
 * - Three-way merge support
 * - Field-level conflict resolution
 * - Vector clock implementation
 * - Custom merge functions
 * - Conflict history tracking
 *
 * @example
 * ```typescript
 * import { createConflictResolver, threeWayMerge } from '@/lib/data/sync';
 *
 * const resolver = createConflictResolver({
 *   strategy: 'three-way-merge',
 *   fieldStrategies: {
 *     updatedAt: 'latest',
 *     version: 'increment',
 *   },
 * });
 *
 * const resolved = resolver.resolve(local, remote, base);
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Conflict resolution strategy
 */
export type ConflictStrategy =
  | 'server-wins'
  | 'client-wins'
  | 'latest-wins'
  | 'three-way-merge'
  | 'field-level'
  | 'manual';

/**
 * Field-level resolution strategy
 */
export type FieldStrategy =
  | 'server'
  | 'client'
  | 'latest'
  | 'merge'
  | 'concat'
  | 'sum'
  | 'max'
  | 'min'
  | 'increment'
  | 'custom';

/**
 * Conflict information
 */
export interface Conflict {
  /** Field path where conflict occurred */
  path: string[];
  /** Local value */
  localValue: unknown;
  /** Remote value */
  remoteValue: unknown;
  /** Base value (if available) */
  baseValue?: unknown;
  /** Local modified timestamp */
  localModifiedAt?: number;
  /** Remote modified timestamp */
  remoteModifiedAt?: number;
  /** Resolved value */
  resolvedValue?: unknown;
  /** How it was resolved */
  resolution?: string;
}

/**
 * Conflict resolution result
 */
export interface ConflictResolutionResult<T> {
  /** Merged data */
  data: T;
  /** Whether conflicts were detected */
  hasConflicts: boolean;
  /** List of conflicts */
  conflicts: Conflict[];
  /** Resolution metadata */
  metadata: {
    strategy: ConflictStrategy;
    resolvedAt: number;
    localVersion?: string;
    remoteVersion?: string;
  };
}

/**
 * Conflict resolver configuration
 */
export interface ConflictResolverConfig {
  /** Default resolution strategy */
  strategy: ConflictStrategy;
  /** Field-level strategies */
  fieldStrategies?: Record<
    string,
    FieldStrategy | ((local: unknown, remote: unknown, base?: unknown) => unknown)
  >;
  /** Fields to ignore in merge */
  ignoreFields?: string[];
  /** Fields that should always use server value */
  serverFields?: string[];
  /** Fields that should always use client value */
  clientFields?: string[];
  /** Timestamp field for latest-wins */
  timestampField?: string;
  /** Custom merge function */
  customMerge?: <T>(local: T, remote: T, base?: T) => T;
  /** Track conflict history */
  trackHistory?: boolean;
}

/**
 * Vector clock for distributed systems
 */
export interface VectorClock {
  [nodeId: string]: number;
}

/**
 * Conflict resolver instance
 */
export interface ConflictResolver<T = unknown> {
  /** Resolve conflict between local and remote */
  resolve: (local: T, remote: T, base?: T) => ConflictResolutionResult<T>;
  /** Get conflicts without resolving */
  detectConflicts: (local: T, remote: T, base?: T) => Conflict[];
  /** Compare vector clocks */
  compareVersions: (
    localClock: VectorClock,
    remoteClock: VectorClock
  ) => 'equal' | 'local-newer' | 'remote-newer' | 'concurrent';
  /** Merge vector clocks */
  mergeClocks: (localClock: VectorClock, remoteClock: VectorClock) => VectorClock;
  /** Get conflict history */
  getHistory: () => ConflictResolutionResult<T>[];
  /** Clear history */
  clearHistory: () => void;
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Deep equality check
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;

  if (typeof a === 'object') {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => deepEqual(item, b[index]));
    }

    if (Array.isArray(a) || Array.isArray(b)) return false;

    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) return false;

    return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
  }

  return false;
}

/**
 * Deep clone
 */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item: unknown) => deepClone(item)) as unknown as T;
  }

  const cloned: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    cloned[key] = deepClone((obj as Record<string, unknown>)[key]);
  }
  return cloned as T;
}

/**
 * Get value at path
 */
function getAtPath(obj: unknown, path: string[]): unknown {
  let current = obj;
  for (const key of path) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Set value at path
 */
function setAtPath<T>(obj: T, path: string[], value: unknown): T {
  if (path.length === 0) return value as T;

  const cloned = deepClone(obj);
  let current = cloned as Record<string, unknown>;

  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i] as string;
    current[key] ??= {};
    current = current[key] as Record<string, unknown>;
  }

  current[path[path.length - 1] as string] = value;
  return cloned;
}

/**
 * Get all paths in an object
 */
function getAllPaths(obj: unknown, prefix: string[] = []): string[][] {
  const paths: string[][] = [];

  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    if (prefix.length > 0) {
      paths.push(prefix);
    }
    return paths;
  }

  const objRecord = obj as Record<string, unknown>;

  for (const key of Object.keys(objRecord)) {
    const newPrefix = [...prefix, key];
    const value = objRecord[key];

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...getAllPaths(value, newPrefix));
    } else {
      paths.push(newPrefix);
    }
  }

  return paths;
}

// =============================================================================
// THREE-WAY MERGE
// =============================================================================

/**
 * Three-way merge algorithm
 */
export function threeWayMerge<T extends Record<string, unknown>>(
  local: T,
  remote: T,
  base: T,
  config: {
    fieldStrategies?: Record<string, FieldStrategy>;
    ignoreFields?: string[];
  } = {}
): ConflictResolutionResult<T> {
  const { fieldStrategies = {}, ignoreFields = [] } = config;
  const conflicts: Conflict[] = [];
  const result = deepClone(base) as Record<string, unknown>;

  // Get all unique paths
  const allPaths = new Set<string>();
  getAllPaths(local).forEach((p) => allPaths.add(p.join('.')));
  getAllPaths(remote).forEach((p) => allPaths.add(p.join('.')));
  getAllPaths(base).forEach((p) => allPaths.add(p.join('.')));

  for (const pathStr of allPaths) {
    const path = pathStr.split('.');

    // Skip ignored fields
    if (ignoreFields.some((f) => pathStr.startsWith(f))) {
      continue;
    }

    const localValue = getAtPath(local, path);
    const remoteValue = getAtPath(remote, path);
    const baseValue = getAtPath(base, path);

    const localChanged = !deepEqual(localValue, baseValue);
    const remoteChanged = !deepEqual(remoteValue, baseValue);

    if (!localChanged && !remoteChanged) {
      // No changes
      setAtPath(result as T, path, baseValue);
    } else if (localChanged && !remoteChanged) {
      // Only local changed
      setAtPath(result as T, path, localValue);
    } else if (!localChanged && remoteChanged) {
      // Only remote changed
      setAtPath(result as T, path, remoteValue);
    } else if (deepEqual(localValue, remoteValue)) {
      // Both changed to same value
      setAtPath(result as T, path, localValue);
    } else {
      // Conflict - both changed to different values
      const fieldStrategy =
        fieldStrategies[pathStr] ?? fieldStrategies[path[0] as string] ?? 'server';

      let resolvedValue: unknown;
      let resolution: string;

      switch (fieldStrategy) {
        case 'client':
          resolvedValue = localValue;
          resolution = 'client-wins';
          break;
        case 'server':
          resolvedValue = remoteValue;
          resolution = 'server-wins';
          break;
        case 'merge':
          if (typeof localValue === 'object' && typeof remoteValue === 'object') {
            resolvedValue = { ...(remoteValue as object), ...(localValue as object) };
            resolution = 'merged';
          } else {
            resolvedValue = remoteValue;
            resolution = 'server-wins';
          }
          break;
        case 'concat':
          if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
            resolvedValue = [
              ...new Set([...(remoteValue as unknown[]), ...(localValue as unknown[])]),
            ];
            resolution = 'concatenated';
          } else {
            resolvedValue = remoteValue;
            resolution = 'server-wins';
          }
          break;
        case 'sum':
          if (
            typeof localValue === 'number' &&
            typeof remoteValue === 'number' &&
            typeof baseValue === 'number'
          ) {
            resolvedValue = baseValue + (localValue - baseValue) + (remoteValue - baseValue);
            resolution = 'summed';
          } else {
            resolvedValue = remoteValue;
            resolution = 'server-wins';
          }
          break;
        case 'max':
          resolvedValue = Math.max(Number(localValue), Number(remoteValue));
          resolution = 'max';
          break;
        case 'min':
          resolvedValue = Math.min(Number(localValue), Number(remoteValue));
          resolution = 'min';
          break;
        case 'increment':
          resolvedValue = Math.max(Number(localValue), Number(remoteValue)) + 1;
          resolution = 'incremented';
          break;
        default:
          resolvedValue = remoteValue;
          resolution = 'server-wins';
      }

      conflicts.push({
        path,
        localValue,
        remoteValue,
        baseValue,
        resolvedValue,
        resolution,
      });

      setAtPath(result as T, path, resolvedValue);
    }
  }

  return {
    data: result as T,
    hasConflicts: conflicts.length > 0,
    conflicts,
    metadata: {
      strategy: 'three-way-merge',
      resolvedAt: Date.now(),
    },
  };
}

// =============================================================================
// VECTOR CLOCK
// =============================================================================

/**
 * Compare two vector clocks
 */
export function compareVectorClocks(
  a: VectorClock,
  b: VectorClock
): 'equal' | 'a-newer' | 'b-newer' | 'concurrent' {
  let aGreater = false;
  let bGreater = false;

  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const key of allKeys) {
    const aVal = a[key] !== undefined && a[key] !== 0 ? a[key] : 0;
    const bVal = b[key] !== undefined && b[key] !== 0 ? b[key] : 0;

    if (aVal > bVal) aGreater = true;
    if (bVal > aVal) bGreater = true;
  }

  if (!aGreater && !bGreater) return 'equal';
  if (aGreater && !bGreater) return 'a-newer';
  if (!aGreater && bGreater) return 'b-newer';
  return 'concurrent';
}

/**
 * Merge two vector clocks
 */
export function mergeVectorClocks(a: VectorClock, b: VectorClock): VectorClock {
  const result: VectorClock = {};
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const key of allKeys) {
    result[key] = Math.max(
      a[key] !== undefined && a[key] !== 0 ? a[key] : 0,
      b[key] !== undefined && b[key] !== 0 ? b[key] : 0
    );
  }

  return result;
}

/**
 * Increment vector clock for a node
 */
export function incrementVectorClock(clock: VectorClock, nodeId: string): VectorClock {
  return {
    ...clock,
    [nodeId]: (clock[nodeId] !== undefined && clock[nodeId] !== 0 ? clock[nodeId] : 0) + 1,
  };
}

/**
 * Create initial vector clock
 */
export function createVectorClock(nodeId: string): VectorClock {
  return { [nodeId]: 1 };
}

// =============================================================================
// CONFLICT RESOLVER FACTORY
// =============================================================================

/**
 * Create a conflict resolver
 */
export function createConflictResolver<T extends Record<string, unknown>>(
  config: ConflictResolverConfig
): ConflictResolver<T> {
  const {
    strategy,
    fieldStrategies = {},
    ignoreFields = [],
    serverFields = [],
    clientFields = [],
    timestampField = 'updatedAt',
    customMerge,
    trackHistory = false,
  } = config;

  const history: ConflictResolutionResult<T>[] = [];

  // Build effective field strategies
  const effectiveFieldStrategies: Record<
    string,
    FieldStrategy | ((local: unknown, remote: unknown, base?: unknown) => unknown)
  > = { ...fieldStrategies };
  for (const field of serverFields) {
    effectiveFieldStrategies[field] = 'server';
  }
  for (const field of clientFields) {
    effectiveFieldStrategies[field] = 'client';
  }

  function resolve(local: T, remote: T, base?: T): ConflictResolutionResult<T> {
    let result: ConflictResolutionResult<T>;

    switch (strategy) {
      case 'server-wins':
        result = {
          data: deepClone(remote),
          hasConflicts: false,
          conflicts: [],
          metadata: {
            strategy: 'server-wins',
            resolvedAt: Date.now(),
          },
        };
        break;

      case 'client-wins':
        result = {
          data: deepClone(local),
          hasConflicts: false,
          conflicts: [],
          metadata: {
            strategy: 'client-wins',
            resolvedAt: Date.now(),
          },
        };
        break;

      case 'latest-wins': {
        const localTs = (getAtPath(local, [timestampField]) as number) || 0;
        const remoteTs = (getAtPath(remote, [timestampField]) as number) || 0;
        result = {
          data: deepClone(localTs > remoteTs ? local : remote),
          hasConflicts: false,
          conflicts: [],
          metadata: {
            strategy: 'latest-wins',
            resolvedAt: Date.now(),
          },
        };
        break;
      }

      case 'three-way-merge':
        if (base) {
          result = threeWayMerge(local, remote, base, {
            fieldStrategies: effectiveFieldStrategies as Record<string, FieldStrategy>,
            ignoreFields,
          });
        } else {
          // Fall back to field-level without base
          result = resolveFieldLevel(local, remote);
        }
        break;

      case 'field-level':
        result = resolveFieldLevel(local, remote);
        break;

      case 'manual':
        if (customMerge) {
          result = {
            data: customMerge(local, remote, base),
            hasConflicts: false,
            conflicts: [],
            metadata: {
              strategy: 'manual',
              resolvedAt: Date.now(),
            },
          };
        } else {
          // Fall back to server-wins
          result = {
            data: deepClone(remote),
            hasConflicts: false,
            conflicts: [],
            metadata: {
              strategy: 'server-wins',
              resolvedAt: Date.now(),
            },
          };
        }
        break;

      default:
        result = {
          data: deepClone(remote),
          hasConflicts: false,
          conflicts: [],
          metadata: {
            strategy: 'server-wins',
            resolvedAt: Date.now(),
          },
        };
    }

    if (trackHistory) {
      history.push(result);
    }

    return result;
  }

  function resolveFieldLevel(local: T, remote: T): ConflictResolutionResult<T> {
    const conflicts: Conflict[] = [];
    const result = deepClone(remote) as Record<string, unknown>;

    const allPaths = new Set<string>();
    getAllPaths(local).forEach((p) => allPaths.add(p.join('.')));
    getAllPaths(remote).forEach((p) => allPaths.add(p.join('.')));

    for (const pathStr of allPaths) {
      const path = pathStr.split('.');

      if (ignoreFields.some((f) => pathStr.startsWith(f))) {
        continue;
      }

      const localValue = getAtPath(local, path);
      const remoteValue = getAtPath(remote, path);

      if (deepEqual(localValue, remoteValue)) {
        continue;
      }

      const fieldStrategy =
        effectiveFieldStrategies[pathStr] ??
        effectiveFieldStrategies[path[0] as string] ??
        'server';

      let resolvedValue: unknown;
      let resolution: string;

      if (typeof fieldStrategy === 'function') {
        resolvedValue = fieldStrategy(localValue, remoteValue);
        resolution = 'custom';
      } else {
        switch (fieldStrategy) {
          case 'client':
            resolvedValue = localValue;
            resolution = 'client-wins';
            break;
          case 'latest': {
            const localTs = (getAtPath(local, [timestampField]) as number) || 0;
            const remoteTs = (getAtPath(remote, [timestampField]) as number) || 0;
            resolvedValue = localTs > remoteTs ? localValue : remoteValue;
            resolution = localTs > remoteTs ? 'local-latest' : 'remote-latest';
            break;
          }
          default:
            resolvedValue = remoteValue;
            resolution = 'server-wins';
        }
      }

      conflicts.push({
        path,
        localValue,
        remoteValue,
        resolvedValue,
        resolution,
      });

      setAtPath(result as T, path, resolvedValue);
    }

    return {
      data: result as T,
      hasConflicts: conflicts.length > 0,
      conflicts,
      metadata: {
        strategy: 'field-level',
        resolvedAt: Date.now(),
      },
    };
  }

  function detectConflicts(local: T, remote: T, base?: T): Conflict[] {
    const conflicts: Conflict[] = [];

    const allPaths = new Set<string>();
    getAllPaths(local).forEach((p) => allPaths.add(p.join('.')));
    getAllPaths(remote).forEach((p) => allPaths.add(p.join('.')));

    for (const pathStr of allPaths) {
      const path = pathStr.split('.');

      if (ignoreFields.some((f) => pathStr.startsWith(f))) {
        continue;
      }

      const localValue = getAtPath(local, path);
      const remoteValue = getAtPath(remote, path);
      const baseValue = base ? getAtPath(base, path) : undefined;

      if (deepEqual(localValue, remoteValue)) {
        continue;
      }

      if (base) {
        const localChanged = !deepEqual(localValue, baseValue);
        const remoteChanged = !deepEqual(remoteValue, baseValue);

        if (localChanged && remoteChanged) {
          conflicts.push({
            path,
            localValue,
            remoteValue,
            baseValue,
          });
        }
      } else {
        conflicts.push({
          path,
          localValue,
          remoteValue,
        });
      }
    }

    return conflicts;
  }

  return {
    resolve,
    detectConflicts,

    compareVersions: (localClock, remoteClock) => {
      const result = compareVectorClocks(localClock, remoteClock);
      if (result === 'a-newer') return 'local-newer';
      if (result === 'b-newer') return 'remote-newer';
      return result;
    },

    mergeClocks: mergeVectorClocks,

    getHistory: () => [...history],
    clearHistory: () => {
      history.length = 0;
    },
  };
}

// =============================================================================
// PRESET RESOLVERS
// =============================================================================

/**
 * Server-wins resolver
 */
export const serverWinsResolver = <T extends Record<string, unknown>>(): ConflictResolver<T> =>
  createConflictResolver<T>({ strategy: 'server-wins' });

/**
 * Client-wins resolver
 */
export const clientWinsResolver = <T extends Record<string, unknown>>(): ConflictResolver<T> =>
  createConflictResolver<T>({ strategy: 'client-wins' });

/**
 * Latest-wins resolver
 */
export const latestWinsResolver = <T extends Record<string, unknown>>(
  timestampField = 'updatedAt'
): ConflictResolver<T> => createConflictResolver<T>({ strategy: 'latest-wins', timestampField });

/**
 * Three-way merge resolver
 */
export const threeWayMergeResolver = <T extends Record<string, unknown>>(
  options?: Partial<ConflictResolverConfig>
): ConflictResolver<T> =>
  createConflictResolver<T>({
    strategy: 'three-way-merge',
    ...options,
  });
