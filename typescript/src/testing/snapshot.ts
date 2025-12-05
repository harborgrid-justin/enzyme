/**
 * Snapshot Testing Utilities
 *
 * Framework-agnostic snapshot testing utilities for capturing and comparing
 * data snapshots. Works with Jest, Vitest, or standalone.
 *
 * @module @missionfabric-js/enzyme-typescript/testing/snapshot
 * @example
 * ```typescript
 * import { SnapshotManager, toMatchSnapshot } from '@missionfabric-js/enzyme-typescript/testing/snapshot';
 *
 * const manager = new SnapshotManager('./snapshots');
 * const result = await manager.match('test-name', data);
 *
 * // Or use with test framework
 * expect(data).toMatchSnapshot();
 * ```
 */

import type { SnapshotSerializer, SnapshotOptions } from './types';

/**
 * Default snapshot serializer
 */
const defaultSerializer: SnapshotSerializer = {
  test: () => true,
  serialize: (value: any) => JSON.stringify(value, null, 2),
};

/**
 * Snapshot store for managing snapshots
 */
class SnapshotStore {
  private snapshots = new Map<string, string>();
  private serializers: SnapshotSerializer[] = [defaultSerializer];

  /**
   * Add a custom serializer
   */
  addSerializer(serializer: SnapshotSerializer): void {
    this.serializers.unshift(serializer);
  }

  /**
   * Remove a serializer
   */
  removeSerializer(serializer: SnapshotSerializer): void {
    const index = this.serializers.indexOf(serializer);
    if (index !== -1) {
      this.serializers.splice(index, 1);
    }
  }

  /**
   * Serialize a value
   */
  serialize(value: any): string {
    for (const serializer of this.serializers) {
      if (serializer.test(value)) {
        return serializer.serialize(value);
      }
    }
    return defaultSerializer.serialize(value);
  }

  /**
   * Save a snapshot
   */
  save(key: string, value: any): void {
    const serialized = this.serialize(value);
    this.snapshots.set(key, serialized);
  }

  /**
   * Get a snapshot
   */
  get(key: string): string | undefined {
    return this.snapshots.get(key);
  }

  /**
   * Check if snapshot exists
   */
  has(key: string): boolean {
    return this.snapshots.has(key);
  }

  /**
   * Delete a snapshot
   */
  delete(key: string): boolean {
    return this.snapshots.delete(key);
  }

  /**
   * Clear all snapshots
   */
  clear(): void {
    this.snapshots.clear();
  }

  /**
   * Get all snapshot keys
   */
  keys(): string[] {
    return Array.from(this.snapshots.keys());
  }

  /**
   * Get snapshot count
   */
  count(): number {
    return this.snapshots.size;
  }

  /**
   * Export snapshots to JSON
   */
  toJSON(): Record<string, string> {
    return Object.fromEntries(this.snapshots);
  }

  /**
   * Import snapshots from JSON
   */
  fromJSON(data: Record<string, string>): void {
    this.snapshots.clear();
    for (const [key, value] of Object.entries(data)) {
      this.snapshots.set(key, value);
    }
  }
}

/**
 * Snapshot manager for handling snapshot files
 */
export class SnapshotManager {
  private store = new SnapshotStore();
  private updateMode = false;

  constructor(private readonly snapshotPath?: string) {}

  /**
   * Enable update mode
   */
  enableUpdateMode(): void {
    this.updateMode = true;
  }

  /**
   * Disable update mode
   */
  disableUpdateMode(): void {
    this.updateMode = false;
  }

  /**
   * Add a custom serializer
   *
   * @param serializer Snapshot serializer
   *
   * @example
   * ```typescript
   * manager.addSerializer({
   *   test: (val) => val instanceof Date,
   *   serialize: (date) => date.toISOString()
   * });
   * ```
   */
  addSerializer(serializer: SnapshotSerializer): void {
    this.store.addSerializer(serializer);
  }

  /**
   * Match a value against a snapshot
   *
   * @param name Snapshot name
   * @param value Value to snapshot
   * @returns Match result
   *
   * @example
   * ```typescript
   * const result = manager.match('user-data', userData);
   * if (!result.pass) {
   *   console.log(result.message);
   * }
   * ```
   */
  match(name: string, value: any): { pass: boolean; message: string } {
    const serialized = this.store.serialize(value);
    const existing = this.store.get(name);

    if (!existing || this.updateMode) {
      this.store.save(name, value);
      return {
        pass: true,
        message: this.updateMode
          ? `Snapshot "${name}" updated`
          : `Snapshot "${name}" created`,
      };
    }

    if (serialized === existing) {
      return {
        pass: true,
        message: `Snapshot "${name}" matches`,
      };
    }

    return {
      pass: false,
      message: `Snapshot "${name}" does not match.\n\nExpected:\n${existing}\n\nReceived:\n${serialized}`,
    };
  }

  /**
   * Create an inline snapshot matcher
   *
   * @param value Value to snapshot
   * @returns Serialized value
   *
   * @example
   * ```typescript
   * const snapshot = manager.inline(userData);
   * // Compare snapshot inline in code
   * ```
   */
  inline(value: any): string {
    return this.store.serialize(value);
  }

  /**
   * Clear all snapshots
   *
   * @example
   * ```typescript
   * manager.clear();
   * ```
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get snapshot count
   *
   * @returns Number of snapshots
   *
   * @example
   * ```typescript
   * console.log(`Stored ${manager.count()} snapshots`);
   * ```
   */
  count(): number {
    return this.store.count();
  }

  /**
   * Export snapshots
   *
   * @returns Snapshot data
   *
   * @example
   * ```typescript
   * const data = manager.export();
   * // Save to file
   * ```
   */
  export(): Record<string, string> {
    return this.store.toJSON();
  }

  /**
   * Import snapshots
   *
   * @param data Snapshot data
   *
   * @example
   * ```typescript
   * const data = JSON.parse(snapshotFile);
   * manager.import(data);
   * ```
   */
  import(data: Record<string, string>): void {
    this.store.fromJSON(data);
  }
}

/**
 * Global snapshot manager
 */
const globalManager = new SnapshotManager();

/**
 * Match value to snapshot (global)
 *
 * @param name Snapshot name
 * @param value Value to snapshot
 * @returns Match result
 *
 * @example
 * ```typescript
 * const result = matchSnapshot('my-test', data);
 * ```
 */
export function matchSnapshot(name: string, value: any): { pass: boolean; message: string } {
  return globalManager.match(name, value);
}

/**
 * Create inline snapshot (global)
 *
 * @param value Value to snapshot
 * @returns Serialized value
 *
 * @example
 * ```typescript
 * const snapshot = inlineSnapshot(data);
 * ```
 */
export function inlineSnapshot(value: any): string {
  return globalManager.inline(value);
}

/**
 * Add global serializer
 *
 * @param serializer Snapshot serializer
 *
 * @example
 * ```typescript
 * addSerializer({
 *   test: (val) => val instanceof Map,
 *   serialize: (map) => JSON.stringify([...map.entries()])
 * });
 * ```
 */
export function addSerializer(serializer: SnapshotSerializer): void {
  globalManager.addSerializer(serializer);
}

/**
 * Clear global snapshots
 *
 * @example
 * ```typescript
 * clearSnapshots();
 * ```
 */
export function clearSnapshots(): void {
  globalManager.clear();
}

/**
 * Custom serializer for Date objects
 */
export const dateSerializer: SnapshotSerializer<Date> = {
  test: (value) => value instanceof Date,
  serialize: (date) => `Date<${date.toISOString()}>`,
};

/**
 * Custom serializer for RegExp objects
 */
export const regexSerializer: SnapshotSerializer<RegExp> = {
  test: (value) => value instanceof RegExp,
  serialize: (regex) => `RegExp<${regex.source}>`,
};

/**
 * Custom serializer for Error objects
 */
export const errorSerializer: SnapshotSerializer<Error> = {
  test: (value) => value instanceof Error,
  serialize: (error) => `Error<${error.name}: ${error.message}>`,
};

/**
 * Custom serializer for Map objects
 */
export const mapSerializer: SnapshotSerializer<Map<any, any>> = {
  test: (value) => value instanceof Map,
  serialize: (map) => {
    const entries = Array.from(map.entries());
    return `Map<${JSON.stringify(entries, null, 2)}>`;
  },
};

/**
 * Custom serializer for Set objects
 */
export const setSerializer: SnapshotSerializer<Set<any>> = {
  test: (value) => value instanceof Set,
  serialize: (set) => {
    const values = Array.from(set.values());
    return `Set<${JSON.stringify(values, null, 2)}>`;
  },
};

/**
 * Custom serializer for functions
 */
export const functionSerializer: SnapshotSerializer<Function> = {
  test: (value) => typeof value === 'function',
  serialize: (fn) => `Function<${fn.name || 'anonymous'}>`,
};

/**
 * Snapshot matcher for test frameworks
 *
 * @param value Value to snapshot
 * @param snapshotName Optional snapshot name
 * @returns Match result
 *
 * @example
 * ```typescript
 * expect.extend({ toMatchSnapshot });
 * expect(data).toMatchSnapshot();
 * ```
 */
export function toMatchSnapshot(
  value: any,
  snapshotName?: string
): { pass: boolean; message: () => string } {
  const name = snapshotName || `snapshot-${Date.now()}`;
  const result = matchSnapshot(name, value);

  return {
    pass: result.pass,
    message: () => result.message,
  };
}

/**
 * Inline snapshot matcher for test frameworks
 *
 * @param value Value to snapshot
 * @param inlineSnapshot Expected inline snapshot
 * @returns Match result
 *
 * @example
 * ```typescript
 * expect.extend({ toMatchInlineSnapshot });
 * expect(data).toMatchInlineSnapshot(`{ "id": 1 }`);
 * ```
 */
export function toMatchInlineSnapshot(
  value: any,
  inlineSnapshot?: string
): { pass: boolean; message: () => string } {
  const serialized = globalManager.inline(value);

  if (!inlineSnapshot) {
    return {
      pass: true,
      message: () => `Inline snapshot:\n${serialized}`,
    };
  }

  const pass = serialized === inlineSnapshot;

  return {
    pass,
    message: () =>
      pass
        ? `Expected inline snapshot not to match`
        : `Inline snapshot does not match.\n\nExpected:\n${inlineSnapshot}\n\nReceived:\n${serialized}`,
  };
}

/**
 * Snapshot diff utility
 *
 * @param expected Expected value
 * @param actual Actual value
 * @returns Diff string
 *
 * @example
 * ```typescript
 * const diff = snapshotDiff(oldData, newData);
 * console.log(diff);
 * ```
 */
export function snapshotDiff(expected: any, actual: any): string {
  const expectedSerialized = globalManager.inline(expected);
  const actualSerialized = globalManager.inline(actual);

  if (expectedSerialized === actualSerialized) {
    return 'No differences';
  }

  const expectedLines = expectedSerialized.split('\n');
  const actualLines = actualSerialized.split('\n');

  const diff: string[] = [];
  const maxLines = Math.max(expectedLines.length, actualLines.length);

  for (let i = 0; i < maxLines; i++) {
    const expectedLine = expectedLines[i] || '';
    const actualLine = actualLines[i] || '';

    if (expectedLine === actualLine) {
      diff.push(`  ${expectedLine}`);
    } else {
      if (expectedLine) {
        diff.push(`- ${expectedLine}`);
      }
      if (actualLine) {
        diff.push(`+ ${actualLine}`);
      }
    }
  }

  return diff.join('\n');
}

/**
 * Property matcher for partial snapshot matching
 *
 * @template T Object type
 * @param properties Properties to match
 * @returns Property matcher
 *
 * @example
 * ```typescript
 * expect(user).toMatchSnapshot(propertyMatcher({
 *   id: expect.any(String),
 *   createdAt: expect.any(Date)
 * }));
 * ```
 */
export function propertyMatcher<T extends Record<string, any>>(
  properties: Partial<T>
): (value: T) => boolean {
  return (value: T) => {
    for (const key in properties) {
      if (!(key in value)) {
        return false;
      }
      // Simple check - can be enhanced with matchers
      if (typeof properties[key] === 'function') {
        continue; // Skip function matchers
      }
      if (value[key] !== properties[key]) {
        return false;
      }
    }
    return true;
  };
}

/**
 * Common serializers collection
 */
export const commonSerializers = {
  date: dateSerializer,
  regex: regexSerializer,
  error: errorSerializer,
  map: mapSerializer,
  set: setSerializer,
  function: functionSerializer,
};

/**
 * Register all common serializers
 *
 * @example
 * ```typescript
 * registerCommonSerializers();
 * ```
 */
export function registerCommonSerializers(): void {
  addSerializer(dateSerializer);
  addSerializer(regexSerializer);
  addSerializer(errorSerializer);
  addSerializer(mapSerializer);
  addSerializer(setSerializer);
  addSerializer(functionSerializer);
}
