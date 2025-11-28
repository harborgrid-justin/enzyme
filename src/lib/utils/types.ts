/**
 * @file Common Type Utilities
 * @description Shared type definitions and type helpers
 *
 * This module provides common utility types. Many core types are now
 * centralized in shared/type-utils.ts - prefer importing from there.
 */

// Re-export canonical types from shared utilities
// Note: Some types are commented out to avoid conflicts
// export type { DeepPartial, DeepReadonly } from '../shared/type-utils';
export type { Result } from '../shared/type-utils';
// export type { Brand, Milliseconds, Seconds, Pixels, Percentage } from '../shared/type-utils';
export { ok, err, isOk, isErr } from '../shared/type-utils';

/**
 * Make all properties required recursively
 */
export type DeepRequired<T> = T extends object
  ? { [P in keyof T]-?: DeepRequired<T[P]> }
  : T;

/**
 * Make all properties readonly recursively
 */
export type DeepReadonly<T> = T extends object
  ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
  : T;

/**
 * Make specific keys optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific keys required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Extract keys of a certain type
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Omit keys of a certain type
 */
export type OmitByType<T, U> = Pick<T, { [K in keyof T]: T[K] extends U ? never : K }[keyof T]>;

/**
 * Pick keys of a certain type
 */
export type PickByType<T, U> = Pick<T, KeysOfType<T, U>>;

/**
 * Nullable type
 */
export type Nullable<T> = T | null;

/**
 * Maybe type (null or undefined)
 */
export type Maybe<T> = T | null | undefined;

/**
 * Non-nullable nested type
 */
export type NonNullableDeep<T> = T extends object
  ? { [K in keyof T]: NonNullableDeep<NonNullable<T[K]>> }
  : NonNullable<T>;

/**
 * Union to intersection
 */
export type UnionToIntersection<U> = (
  U extends unknown ? (x: U) => void : never
) extends (x: infer I) => void
  ? I
  : never;

/**
 * String literal type
 */
export type StringLiteral<T> = T extends string
  ? string extends T
    ? never
    : T
  : never;

/**
 * Branded type for nominal typing
 */
export type Brand<T, B extends string> = T & { readonly __brand: B };

/**
 * ID type
 */
export type Id<T extends string = string> = Brand<string, T>;

/**
 * Create branded type helper
 */
export function brand<T, B extends string>(value: T): Brand<T, B> {
  return value as Brand<T, B>;
}

/**
 * Unwrap Promise type
 */
export type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

/**
 * Function type
 */
export type Fn<Args extends unknown[] = unknown[], Return = unknown> = (
  ...args: Args
) => Return;

/**
 * Async function type
 */
export type AsyncFn<Args extends unknown[] = unknown[], Return = unknown> = (
  ...args: Args
) => Promise<Return>;

/**
 * Class constructor type
 */
export type Constructor<T = object> = new (...args: unknown[]) => T;

/**
 * Get return type of constructor
 */
export type InstanceOf<T extends Constructor> = T extends Constructor<infer I>
  ? I
  : never;

/**
 * Tuple type
 */
export type Tuple<T, N extends number> = N extends N
  ? number extends N
    ? T[]
    : TupleOfHelper<T, N, []>
  : never;

type TupleOfHelper<T, N extends number, R extends unknown[]> = R['length'] extends N
  ? R
  : TupleOfHelper<T, N, [T, ...R]>;

/**
 * Record with string keys
 */
export type Dictionary<T = unknown> = Record<string, T>;

/**
 * Entries type
 */
export type Entries<T> = [keyof T, T[keyof T]][];

/**
 * Values type
 */
export type ValueOf<T> = T[keyof T];

/**
 * Flatten type
 */
export type Flatten<T> = T extends (infer U)[] ? U : T;

/**
 * Element type of array
 */
export type ElementOf<T> = T extends readonly (infer E)[] ? E : never;

/**
 * Path keys of nested object
 */
export type PathKeys<T, D extends number = 5> = [D] extends [never]
  ? never
  : T extends object
  ? {
      [K in keyof T]-?: K extends string | number
        ? `${K}` | `${K}.${PathKeys<T[K], Prev[D]>}`
        : never;
    }[keyof T]
  : never;

type Prev = [never, 0, 1, 2, 3, 4, ...0[]];

/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/**
 * Mutable type (remove readonly)
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Deep mutable type
 */
export type DeepMutable<T> = {
  -readonly [P in keyof T]: T[P] extends object ? DeepMutable<T[P]> : T[P];
};

/**
 * Exact type (no excess properties)
 */
export type Exact<T, Shape> = T extends Shape
  ? Exclude<keyof T, keyof Shape> extends never
    ? T
    : never
  : never;

/**
 * JSON-serializable type
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * JSON object type
 */
export type JsonObject = { [key: string]: JsonValue };

/**
 * Error with code
 */
export interface CodedError extends Error {
  code: string;
}

// Result type and related functions are re-exported from shared/type-utils at the top of this file.
// See: ok, err, isOk, isErr, Result
