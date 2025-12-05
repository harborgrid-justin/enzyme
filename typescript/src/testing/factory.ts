/**
 * Test Data Factory Utilities
 *
 * Factory pattern implementation for creating test data, similar to factory-bot.
 * Supports traits, sequences, associations, and both sync/async creation.
 *
 * @module @missionfabric-js/enzyme-typescript/testing/factory
 * @example
 * ```typescript
 * import { defineFactory, sequence } from '@missionfabric-js/enzyme-typescript/testing/factory';
 *
 * interface User {
 *   id: string;
 *   email: string;
 *   name: string;
 *   role: 'user' | 'admin';
 * }
 *
 * const userFactory = defineFactory<User>({
 *   id: () => sequence('user-id', (n) => `user-${n}`),
 *   email: () => sequence('email', (n) => `user${n}@example.com`),
 *   name: () => 'Test User',
 *   role: () => 'user'
 * });
 *
 * const user = userFactory.build();
 * const admin = userFactory.build({ role: 'admin' });
 * const users = userFactory.buildList(5);
 * ```
 */

import type {
  Factory,
  FactoryWithTraits,
  FactoryBuilder,
  AsyncFactoryBuilder,
  FactoryTrait,
  DeepPartial,
  TestDataBuilder,
} from './types';

/**
 * Sequence counter storage
 */
const sequences = new Map<string, number>();

/**
 * Create a sequence generator
 *
 * @template T The type returned by the sequence
 * @param name Unique sequence name
 * @param generator Function that generates values from the sequence number
 * @returns The next value in the sequence
 *
 * @example
 * ```typescript
 * const id = sequence('user-id', (n) => `user-${n}`);
 * const email = sequence('email', (n) => `user${n}@test.com`);
 * ```
 */
export function sequence<T>(name: string, generator: (n: number) => T): T {
  const current = sequences.get(name) || 0;
  const next = current + 1;
  sequences.set(name, next);
  return generator(next);
}

/**
 * Reset a sequence counter
 *
 * @param name Sequence name to reset
 *
 * @example
 * ```typescript
 * resetSequence('user-id');
 * ```
 */
export function resetSequence(name: string): void {
  sequences.delete(name);
}

/**
 * Reset all sequence counters
 *
 * @example
 * ```typescript
 * resetAllSequences();
 * ```
 */
export function resetAllSequences(): void {
  sequences.clear();
}

/**
 * Get current sequence value without incrementing
 *
 * @param name Sequence name
 * @returns Current sequence value or 0 if not yet used
 *
 * @example
 * ```typescript
 * const current = getSequenceValue('user-id');
 * ```
 */
export function getSequenceValue(name: string): number {
  return sequences.get(name) || 0;
}

/**
 * Factory attribute definition
 */
type FactoryAttribute<T, K extends keyof T> = T[K] | (() => T[K]) | (() => Promise<T[K]>);

/**
 * Factory attributes definition
 */
type FactoryAttributes<T> = {
  [K in keyof T]: FactoryAttribute<T, K>;
};

/**
 * Options for factory creation
 */
interface FactoryOptions<T> {
  /**
   * Custom create function for persisting data
   */
  onCreate?: (data: T) => Promise<T>;

  /**
   * After build hook
   */
  afterBuild?: (data: T) => T | Promise<T>;

  /**
   * After create hook
   */
  afterCreate?: (data: T) => T | Promise<T>;
}

/**
 * Deep merge objects
 */
function deepMerge<T>(target: T, source: DeepPartial<T>): T {
  const result = { ...target } as any;

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      if (targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else {
        result[key] = sourceValue;
      }
    } else {
      result[key] = sourceValue;
    }
  }

  return result;
}

/**
 * Resolve factory attributes to actual values
 */
async function resolveAttributes<T>(
  attributes: FactoryAttributes<T>,
  overrides: DeepPartial<T> = {}
): Promise<T> {
  const result = {} as T;

  for (const key in attributes) {
    if (key in overrides && overrides[key] !== undefined) {
      result[key] = overrides[key] as T[typeof key];
    } else {
      const attr = attributes[key];
      result[key] = typeof attr === 'function' ? await (attr as () => T[typeof key])() : attr;
    }
  }

  return deepMerge(result, overrides);
}

/**
 * Define a factory for creating test data
 *
 * @template T The type of data the factory creates
 * @param attributes Default attributes for the factory
 * @param options Factory options
 * @returns A factory instance
 *
 * @example
 * ```typescript
 * interface Product {
 *   id: string;
 *   name: string;
 *   price: number;
 *   inStock: boolean;
 * }
 *
 * const productFactory = defineFactory<Product>({
 *   id: () => sequence('product-id', (n) => `prod-${n}`),
 *   name: () => 'Test Product',
 *   price: () => 99.99,
 *   inStock: () => true
 * });
 *
 * const product = productFactory.build();
 * const expensiveProduct = productFactory.build({ price: 999.99 });
 * ```
 */
export function defineFactory<T extends Record<string, any>>(
  attributes: FactoryAttributes<T>,
  options: FactoryOptions<T> = {}
): FactoryWithTraits<T> {
  const traits = new Map<string, FactoryTrait<T>>();

  const build: FactoryBuilder<T> = (overrides = {}) => {
    const data = {} as T;

    for (const key in attributes) {
      if (key in overrides && overrides[key] !== undefined) {
        data[key] = overrides[key] as T[typeof key];
      } else {
        const attr = attributes[key];
        const value = typeof attr === 'function' ? (attr as () => T[typeof key])() : attr;
        data[key] = value instanceof Promise ? (value as any) : value;
      }
    }

    const merged = deepMerge(data, overrides as DeepPartial<T>);
    return options.afterBuild ? (options.afterBuild(merged) as T) : merged;
  };

  const create: AsyncFactoryBuilder<T> = async (overrides = {}) => {
    const data = await resolveAttributes(attributes, overrides as DeepPartial<T>);
    const afterBuild = options.afterBuild ? await options.afterBuild(data) : data;
    const created = options.onCreate ? await options.onCreate(afterBuild) : afterBuild;
    return options.afterCreate ? await options.afterCreate(created) : created;
  };

  const buildList = (count: number, overrides: Partial<T> = {}): T[] => {
    return Array.from({ length: count }, () => build(overrides));
  };

  const createList = async (count: number, overrides: Partial<T> = {}): Promise<T[]> => {
    return Promise.all(Array.from({ length: count }, () => create(overrides)));
  };

  const trait = (name: string, traitFn: FactoryTrait<T>): void => {
    traits.set(name, traitFn);
  };

  const buildWith = (traitNames: string[], overrides: Partial<T> = {}): T => {
    let attrs = { ...overrides };
    for (const name of traitNames) {
      const traitFn = traits.get(name);
      if (traitFn) {
        attrs = { ...attrs, ...traitFn(attrs) };
      }
    }
    return build(attrs);
  };

  const createWith = async (traitNames: string[], overrides: Partial<T> = {}): Promise<T> => {
    let attrs = { ...overrides };
    for (const name of traitNames) {
      const traitFn = traits.get(name);
      if (traitFn) {
        attrs = { ...attrs, ...traitFn(attrs) };
      }
    }
    return create(attrs);
  };

  return {
    build,
    create,
    buildList,
    createList,
    trait,
    buildWith,
    createWith,
  };
}

/**
 * Create a test data builder with fluent API
 *
 * @template T The type being built
 * @param defaults Default values
 * @returns A fluent builder
 *
 * @example
 * ```typescript
 * const user = builder({ name: '', email: '' })
 *   .with('name', 'John Doe')
 *   .with('email', 'john@example.com')
 *   .build();
 * ```
 */
export function builder<T extends Record<string, any>>(defaults: T): TestDataBuilder<T> {
  let data = { ...defaults };

  return {
    with<K extends keyof T>(key: K, value: T[K]): TestDataBuilder<T> {
      data = { ...data, [key]: value };
      return this;
    },

    withMany(overrides: Partial<T>): TestDataBuilder<T> {
      data = { ...data, ...overrides };
      return this;
    },

    build(): T {
      return { ...data };
    },
  };
}

/**
 * Create a random integer between min and max (inclusive)
 *
 * @param min Minimum value
 * @param max Maximum value
 * @returns Random integer
 *
 * @example
 * ```typescript
 * const age = randomInt(18, 65);
 * const score = randomInt(0, 100);
 * ```
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Create a random float between min and max
 *
 * @param min Minimum value
 * @param max Maximum value
 * @param decimals Number of decimal places
 * @returns Random float
 *
 * @example
 * ```typescript
 * const price = randomFloat(0.99, 999.99, 2);
 * const rating = randomFloat(0, 5, 1);
 * ```
 */
export function randomFloat(min: number, max: number, decimals: number = 2): number {
  const value = Math.random() * (max - min) + min;
  return parseFloat(value.toFixed(decimals));
}

/**
 * Pick a random element from an array
 *
 * @template T Element type
 * @param array Array to pick from
 * @returns Random element
 *
 * @example
 * ```typescript
 * const role = randomElement(['user', 'admin', 'moderator']);
 * const status = randomElement(['active', 'inactive', 'pending']);
 * ```
 */
export function randomElement<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

/**
 * Generate a random boolean with optional probability
 *
 * @param probability Probability of true (0-1), defaults to 0.5
 * @returns Random boolean
 *
 * @example
 * ```typescript
 * const isActive = randomBoolean(); // 50% chance
 * const isPremium = randomBoolean(0.2); // 20% chance
 * ```
 */
export function randomBoolean(probability: number = 0.5): boolean {
  return Math.random() < probability;
}

/**
 * Generate a random string of specified length
 *
 * @param length String length
 * @param charset Character set to use
 * @returns Random string
 *
 * @example
 * ```typescript
 * const token = randomString(32);
 * const code = randomString(6, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
 * ```
 */
export function randomString(
  length: number,
  charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(randomInt(0, charset.length - 1));
  }
  return result;
}

/**
 * Generate a random UUID v4
 *
 * @returns Random UUID
 *
 * @example
 * ```typescript
 * const id = randomUUID();
 * ```
 */
export function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a random date between start and end
 *
 * @param start Start date
 * @param end End date
 * @returns Random date
 *
 * @example
 * ```typescript
 * const birthDate = randomDate(new Date('1950-01-01'), new Date('2005-12-31'));
 * const createdAt = randomDate(new Date('2024-01-01'), new Date());
 * ```
 */
export function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Create an association to another factory
 *
 * @template T The type of the associated data
 * @param factory Factory to use for association
 * @param overrides Overrides for the factory
 * @returns Factory builder function
 *
 * @example
 * ```typescript
 * const postFactory = defineFactory<Post>({
 *   id: () => randomUUID(),
 *   title: () => 'Test Post',
 *   author: () => association(userFactory, { role: 'author' })
 * });
 * ```
 */
export function association<T>(factory: Factory<T>, overrides: Partial<T> = {}): () => T {
  return () => factory.build(overrides);
}

/**
 * Create an async association to another factory
 *
 * @template T The type of the associated data
 * @param factory Factory to use for association
 * @param overrides Overrides for the factory
 * @returns Async factory builder function
 *
 * @example
 * ```typescript
 * const postFactory = defineFactory<Post>({
 *   id: () => randomUUID(),
 *   title: () => 'Test Post',
 *   author: () => asyncAssociation(userFactory, { role: 'author' })
 * });
 * ```
 */
export function asyncAssociation<T>(
  factory: Factory<T>,
  overrides: Partial<T> = {}
): () => Promise<T> {
  return () => factory.create(overrides);
}

/**
 * Create a has-many association
 *
 * @template T The type of the associated data
 * @param factory Factory to use for associations
 * @param count Number of items to create
 * @param overrides Overrides for the factory
 * @returns Factory builder function
 *
 * @example
 * ```typescript
 * const userFactory = defineFactory<User>({
 *   id: () => randomUUID(),
 *   name: () => 'Test User',
 *   posts: () => hasMany(postFactory, 3)
 * });
 * ```
 */
export function hasMany<T>(
  factory: Factory<T>,
  count: number,
  overrides: Partial<T> = {}
): () => T[] {
  return () => factory.buildList(count, overrides);
}

/**
 * Create an async has-many association
 *
 * @template T The type of the associated data
 * @param factory Factory to use for associations
 * @param count Number of items to create
 * @param overrides Overrides for the factory
 * @returns Async factory builder function
 *
 * @example
 * ```typescript
 * const userFactory = defineFactory<User>({
 *   id: () => randomUUID(),
 *   name: () => 'Test User',
 *   posts: () => asyncHasMany(postFactory, 5)
 * });
 * ```
 */
export function asyncHasMany<T>(
  factory: Factory<T>,
  count: number,
  overrides: Partial<T> = {}
): () => Promise<T[]> {
  return () => factory.createList(count, overrides);
}
