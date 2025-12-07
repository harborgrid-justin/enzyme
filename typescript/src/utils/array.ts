/**
 * Array Utilities
 *
 * Provides type-safe array manipulation and transformation functions
 * for common operations like grouping, chunking, and filtering.
 *
 * @module utils/array
 * @example
 * ```typescript
 * import { chunk, unique, groupBy } from '@missionfabric-js/enzyme-typescript/utils';
 *
 * const chunked = chunk([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]
 * const uniqueItems = unique([1, 2, 2, 3]); // [1, 2, 3]
 * ```
 */

/**
 * Chunks an array into smaller arrays of specified size.
 *
 * @param array - The array to chunk
 * @param size - The size of each chunk
 * @returns An array of chunks
 *
 * @example
 * ```typescript
 * chunk([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]
 * chunk(['a', 'b', 'c'], 1); // [['a'], ['b'], ['c']]
 * ```
 */
export function chunk<T>(array: T[], size: number): T[][] {
  if (size <= 0) throw new Error('Chunk size must be positive');

  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Returns unique values from an array.
 *
 * @param array - The array to process
 * @returns An array with unique values
 *
 * @example
 * ```typescript
 * unique([1, 2, 2, 3, 3, 3]); // [1, 2, 3]
 * unique(['a', 'b', 'a']); // ['a', 'b']
 * ```
 */
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

/**
 * Returns unique values from an array based on a key function.
 *
 * @param array - The array to process
 * @param keyFn - Function to generate unique key
 * @returns An array with unique values
 *
 * @example
 * ```typescript
 * uniqueBy([{ id: 1 }, { id: 1 }, { id: 2 }], (item) => item.id);
 * // [{ id: 1 }, { id: 2 }]
 * ```
 */
export function uniqueBy<T>(array: T[], keyFn: (item: T) => any): T[] {
  const seen = new Set();
  return array.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Groups array elements by a key function.
 *
 * @param array - The array to group
 * @param keyFn - Function to generate group key
 * @returns An object with grouped values
 *
 * @example
 * ```typescript
 * groupBy([{ type: 'a', val: 1 }, { type: 'b', val: 2 }, { type: 'a', val: 3 }], (item) => item.type);
 * // { a: [{ type: 'a', val: 1 }, { type: 'a', val: 3 }], b: [{ type: 'b', val: 2 }] }
 * ```
 */
export function groupBy<T>(
  array: T[],
  keyFn: (item: T) => string | number
): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const key = String(keyFn(item));
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Counts occurrences of each value in an array.
 *
 * @param array - The array to count
 * @returns An object with counts
 *
 * @example
 * ```typescript
 * countBy([1, 2, 2, 3, 3, 3]); // { '1': 1, '2': 2, '3': 3 }
 * countBy(['a', 'b', 'a']); // { 'a': 2, 'b': 1 }
 * ```
 */
export function countBy<T>(array: T[]): Record<string, number> {
  return array.reduce((counts, item) => {
    const key = String(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
}

/**
 * Flattens a nested array by one level.
 *
 * @param array - The array to flatten
 * @returns The flattened array
 *
 * @example
 * ```typescript
 * flatten([[1, 2], [3, 4], [5]]); // [1, 2, 3, 4, 5]
 * flatten([['a'], ['b', 'c']]); // ['a', 'b', 'c']
 * ```
 */
export function flatten<T>(array: T[][]): T[] {
  return array.flat();
}

/**
 * Deeply flattens a nested array.
 *
 * @param array - The array to flatten
 * @returns The flattened array
 *
 * @example
 * ```typescript
 * flattenDeep([1, [2, [3, [4]]]]); // [1, 2, 3, 4]
 * flattenDeep([[['a']], 'b']); // ['a', 'b']
 * ```
 */
export function flattenDeep<T>(array: any[]): T[] {
  return array.reduce((acc, item) => {
    if (Array.isArray(item)) {
      return acc.concat(flattenDeep(item));
    }
    return acc.concat(item);
  }, []);
}

/**
 * Returns the intersection of multiple arrays.
 *
 * @param arrays - The arrays to intersect
 * @returns An array with common elements
 *
 * @example
 * ```typescript
 * intersection([1, 2, 3], [2, 3, 4]); // [2, 3]
 * intersection(['a', 'b'], ['b', 'c'], ['b', 'd']); // ['b']
 * ```
 */
export function intersection<T>(...arrays: T[][]): T[] {
  if (arrays.length === 0) return [];

  const [first, ...rest] = arrays;
  return unique(first.filter((item) =>
    rest.every((array) => array.includes(item))
  ));
}

/**
 * Returns the difference between the first array and other arrays.
 *
 * @param array - The source array
 * @param others - Arrays to subtract
 * @returns An array with elements not in other arrays
 *
 * @example
 * ```typescript
 * difference([1, 2, 3, 4], [2, 3]); // [1, 4]
 * difference(['a', 'b', 'c'], ['b'], ['c']); // ['a']
 * ```
 */
export function difference<T>(array: T[], ...others: T[][]): T[] {
  const otherItems = new Set(others.flat());
  return array.filter((item) => !otherItems.has(item));
}

/**
 * Returns the union of multiple arrays (all unique elements).
 *
 * @param arrays - The arrays to union
 * @returns An array with all unique elements
 *
 * @example
 * ```typescript
 * union([1, 2], [2, 3], [3, 4]); // [1, 2, 3, 4]
 * union(['a'], ['b'], ['a', 'c']); // ['a', 'b', 'c']
 * ```
 */
export function union<T>(...arrays: T[][]): T[] {
  return unique(arrays.flat());
}

/**
 * Partitions an array into two arrays based on a predicate.
 *
 * @param array - The array to partition
 * @param predicate - The predicate function
 * @returns A tuple of [matching, nonMatching]
 *
 * @example
 * ```typescript
 * partition([1, 2, 3, 4], (x) => x % 2 === 0); // [[2, 4], [1, 3]]
 * ```
 */
export function partition<T>(
  array: T[],
  predicate: (item: T) => boolean
): [T[], T[]] {
  const matching: T[] = [];
  const nonMatching: T[] = [];

  for (const item of array) {
    if (predicate(item)) {
      matching.push(item);
    } else {
      nonMatching.push(item);
    }
  }

  return [matching, nonMatching];
}

/**
 * Takes the first n elements from an array.
 *
 * @param array - The source array
 * @param n - Number of elements to take
 * @returns The first n elements
 *
 * @example
 * ```typescript
 * take([1, 2, 3, 4], 2); // [1, 2]
 * take(['a', 'b', 'c'], 5); // ['a', 'b', 'c']
 * ```
 */
export function take<T>(array: T[], n: number): T[] {
  return array.slice(0, Math.max(0, n));
}

/**
 * Drops the first n elements from an array.
 *
 * @param array - The source array
 * @param n - Number of elements to drop
 * @returns The remaining elements
 *
 * @example
 * ```typescript
 * drop([1, 2, 3, 4], 2); // [3, 4]
 * drop(['a', 'b', 'c'], 5); // []
 * ```
 */
export function drop<T>(array: T[], n: number): T[] {
  return array.slice(Math.max(0, n));
}

/**
 * Returns a random element from an array.
 *
 * @param array - The source array
 * @returns A random element
 *
 * @example
 * ```typescript
 * sample([1, 2, 3, 4]); // Random element like 2 or 4
 * ```
 */
export function sample<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined;
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Returns n random elements from an array.
 *
 * @param array - The source array
 * @param n - Number of elements to sample
 * @returns An array of random elements
 *
 * @example
 * ```typescript
 * sampleSize([1, 2, 3, 4, 5], 3); // Random elements like [2, 4, 1]
 * ```
 */
export function sampleSize<T>(array: T[], n: number): T[] {
  const shuffled = shuffle([...array]);
  return take(shuffled, n);
}

/**
 * Shuffles an array randomly.
 *
 * @param array - The array to shuffle
 * @returns A shuffled copy of the array
 *
 * @example
 * ```typescript
 * shuffle([1, 2, 3, 4]); // Random order like [3, 1, 4, 2]
 * ```
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Sorts an array by a key function.
 *
 * @param array - The array to sort
 * @param keyFn - Function to generate sort key
 * @param order - Sort order ('asc' or 'desc')
 * @returns A sorted copy of the array
 *
 * @example
 * ```typescript
 * sortBy([{ age: 30 }, { age: 20 }], (item) => item.age); // [{ age: 20 }, { age: 30 }]
 * sortBy([3, 1, 2], (x) => x, 'desc'); // [3, 2, 1]
 * ```
 */
export function sortBy<T>(
  array: T[],
  keyFn: (item: T) => any,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  const result = [...array];
  const multiplier = order === 'asc' ? 1 : -1;

  return result.sort((a, b) => {
    const keyA = keyFn(a);
    const keyB = keyFn(b);

    if (keyA < keyB) return -1 * multiplier;
    if (keyA > keyB) return 1 * multiplier;
    return 0;
  });
}

/**
 * Zips multiple arrays together into tuples.
 *
 * @param arrays - The arrays to zip
 * @returns An array of tuples
 *
 * @example
 * ```typescript
 * zip([1, 2], ['a', 'b']); // [[1, 'a'], [2, 'b']]
 * zip([1, 2, 3], ['a', 'b']); // [[1, 'a'], [2, 'b'], [3, undefined]]
 * ```
 */
export function zip<T extends any[]>(...arrays: T[]): any[][] {
  const maxLength = Math.max(...arrays.map((arr) => arr.length));
  return Array.from({ length: maxLength }, (_, i) =>
    arrays.map((arr) => arr[i])
  );
}

/**
 * Converts an array of key-value pairs into an object.
 *
 * @param pairs - Array of [key, value] pairs
 * @returns An object
 *
 * @example
 * ```typescript
 * fromPairs([['a', 1], ['b', 2]]); // { a: 1, b: 2 }
 * ```
 */
export function fromPairs<K extends string | number, V>(
  pairs: [K, V][]
): Record<K, V> {
  return pairs.reduce((obj, [key, value]) => {
    obj[key] = value;
    return obj;
  }, {} as Record<K, V>);
}

/**
 * Converts an object into an array of key-value pairs.
 *
 * @param obj - The object to convert
 * @returns An array of [key, value] pairs
 *
 * @example
 * ```typescript
 * toPairs({ a: 1, b: 2 }); // [['a', 1], ['b', 2]]
 * ```
 */
export function toPairs<T extends Record<string, any>>(
  obj: T
): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
}

/**
 * Compacts an array by removing falsy values.
 *
 * @param array - The array to compact
 * @returns An array without falsy values
 *
 * @example
 * ```typescript
 * compact([0, 1, false, 2, '', 3, null, undefined]); // [1, 2, 3]
 * ```
 */
export function compact<T>(array: T[]): NonNullable<T>[] {
  return array.filter(Boolean) as NonNullable<T>[];
}

/**
 * Creates a range of numbers.
 *
 * @param start - The start value (or end if only one argument)
 * @param end - The end value (exclusive)
 * @param step - The step value
 * @returns An array of numbers
 *
 * @example
 * ```typescript
 * range(5); // [0, 1, 2, 3, 4]
 * range(1, 5); // [1, 2, 3, 4]
 * range(0, 10, 2); // [0, 2, 4, 6, 8]
 * ```
 */
export function range(start: number, end?: number, step = 1): number[] {
  if (end === undefined) {
    end = start;
    start = 0;
  }

  const result: number[] = [];
  for (let i = start; i < end; i += step) {
    result.push(i);
  }
  return result;
}
