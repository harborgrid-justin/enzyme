/**
 * Object Type Utilities
 *
 * Advanced utilities for manipulating object types, including pick, omit,
 * merge, and other structural transformations.
 *
 * @module types/object
 * @category Type Utilities
 */

/**
 * Strict version of Pick that errors on invalid keys
 *
 * @template T - The object type
 * @template K - Keys to pick
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 * }
 *
 * type UserBasic = StrictPick<User, 'id' | 'name'>; // OK
 * type Invalid = StrictPick<User, 'id' | 'invalid'>; // Error
 * ```
 */
export type StrictPick<T, K extends keyof T> = Pick<T, K>;

/**
 * Strict version of Omit that errors on invalid keys
 *
 * @template T - The object type
 * @template K - Keys to omit
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 * }
 *
 * type UserNoEmail = StrictOmit<User, 'email'>; // OK
 * type Invalid = StrictOmit<User, 'invalid'>; // Error
 * ```
 */
export type StrictOmit<T, K extends keyof T> = Omit<T, K>;

/**
 * Picks properties by value type
 *
 * @template T - The object type
 * @template V - The value type to match
 *
 * @example
 * ```typescript
 * interface Data {
 *   id: string;
 *   count: number;
 *   active: boolean;
 *   name: string;
 * }
 *
 * type StringProps = PickByType<Data, string>;
 * // { id: string; name: string }
 * ```
 */
export type PickByType<T, V> = Pick<
  T,
  { [K in keyof T]: T[K] extends V ? K : never }[keyof T]
>;

/**
 * Omits properties by value type
 *
 * @template T - The object type
 * @template V - The value type to omit
 *
 * @example
 * ```typescript
 * interface Data {
 *   id: string;
 *   count: number;
 *   active: boolean;
 * }
 *
 * type NoStrings = OmitByType<Data, string>;
 * // { count: number; active: boolean }
 * ```
 */
export type OmitByType<T, V> = Omit<
  T,
  { [K in keyof T]: T[K] extends V ? K : never }[keyof T]
>;

/**
 * Merges two types with right-side priority
 *
 * @template T - The base type
 * @template U - The override type
 *
 * @example
 * ```typescript
 * type Base = {
 *   a: string;
 *   b: number;
 *   c: boolean;
 * };
 *
 * type Override = {
 *   b: string;
 *   d: Date;
 * };
 *
 * type Merged = Merge<Base, Override>;
 * // { a: string; b: string; c: boolean; d: Date }
 * ```
 */
export type Merge<T, U> = Omit<T, keyof U> & U;

/**
 * Deeply merges two object types
 *
 * @template T - The base type
 * @template U - The override type
 *
 * @example
 * ```typescript
 * type Base = {
 *   a: string;
 *   nested: {
 *     b: number;
 *     c: boolean;
 *   };
 * };
 *
 * type Override = {
 *   nested: {
 *     c: string;
 *     d: Date;
 *   };
 * };
 *
 * type Merged = DeepMerge<Base, Override>;
 * // {
 * //   a: string;
 * //   nested: {
 * //     b: number;
 * //     c: string;
 * //     d: Date;
 * //   };
 * // }
 * ```
 */
export type DeepMerge<T, U> = T extends object
  ? U extends object
    ? {
        [K in keyof T | keyof U]: K extends keyof U
          ? K extends keyof T
            ? DeepMerge<T[K], U[K]>
            : U[K]
          : K extends keyof T
          ? T[K]
          : never;
      }
    : U
  : U;

/**
 * Makes specific properties optional
 *
 * @template T - The object type
 * @template K - Keys to make optional
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 * }
 *
 * type UserPartial = PartialBy<User, 'email'>;
 * // { id: string; name: string; email?: string }
 * ```
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Makes specific properties required
 *
 * @template T - The object type
 * @template K - Keys to make required
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name?: string;
 *   email?: string;
 * }
 *
 * type RequiredUser = RequiredBy<User, 'name' | 'email'>;
 * // { id: string; name: string; email: string }
 * ```
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Makes specific properties readonly
 *
 * @template T - The object type
 * @template K - Keys to make readonly
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 * }
 *
 * type ImmutableId = ReadonlyBy<User, 'id'>;
 * // { readonly id: string; name: string }
 * ```
 */
export type ReadonlyBy<T, K extends keyof T> = Omit<T, K> & Readonly<Pick<T, K>>;

/**
 * Makes specific properties mutable
 *
 * @template T - The object type
 * @template K - Keys to make mutable
 *
 * @example
 * ```typescript
 * interface User {
 *   readonly id: string;
 *   readonly name: string;
 *   readonly email: string;
 * }
 *
 * type MutableName = MutableBy<User, 'name'>;
 * // { readonly id: string; name: string; readonly email: string }
 * ```
 */
export type MutableBy<T, K extends keyof T> = Omit<T, K> & {
  -readonly [P in K]: T[P];
};

/**
 * Makes all properties nullable
 *
 * @template T - The object type
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 * }
 *
 * type NullableUser = Nullable<User>;
 * // { id: string | null; name: string | null }
 * ```
 */
export type Nullable<T> = { [K in keyof T]: T[K] | null };

/**
 * Makes specific properties nullable
 *
 * @template T - The object type
 * @template K - Keys to make nullable
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 * }
 *
 * type UserNullableEmail = NullableBy<User, 'email'>;
 * // { id: string; name: string; email: string | null }
 * ```
 */
export type NullableBy<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: T[P] | null;
};

/**
 * Removes null from all properties
 *
 * @template T - The object type
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string | null;
 *   name: string | null;
 * }
 *
 * type NonNullUser = NonNullableObject<User>;
 * // { id: string; name: string }
 * ```
 */
export type NonNullableObject<T> = {
  [K in keyof T]: NonNullable<T[K]>;
};

/**
 * Flattens nested object types one level
 *
 * @template T - The object type
 *
 * @example
 * ```typescript
 * interface Nested {
 *   a: string;
 *   b: {
 *     c: number;
 *     d: boolean;
 *   };
 * }
 *
 * type Flat = Flatten<Nested>;
 * // { a: string; c: number; d: boolean }
 * ```
 */
export type Flatten<T> = T extends object
  ? {
      [K in keyof T]: T[K] extends object
        ? T[K] extends Array<any>
          ? T[K]
          : Flatten<T[K]>
        : T[K];
    }[keyof T] extends infer U
    ? { [K in keyof U]: U[K] }
    : never
  : T;

/**
 * Renames object keys
 *
 * @template T - The object type
 * @template M - Mapping of old keys to new keys
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 * }
 *
 * type Renamed = RenameKeys<User, { id: 'userId'; name: 'userName' }>;
 * // { userId: string; userName: string }
 * ```
 */
export type RenameKeys<T, M extends Record<keyof T, PropertyKey>> = {
  [K in keyof T as K extends keyof M ? M[K] : K]: T[K];
};

/**
 * Inverts an object type (swaps keys and values)
 *
 * @template T - The object type
 *
 * @example
 * ```typescript
 * type Status = {
 *   active: 'ACTIVE';
 *   inactive: 'INACTIVE';
 * };
 *
 * type Inverted = Invert<Status>;
 * // { ACTIVE: 'active'; INACTIVE: 'inactive' }
 * ```
 */
export type Invert<T extends Record<PropertyKey, PropertyKey>> = {
  [V in T[keyof T]]: {
    [K in keyof T]: T[K] extends V ? K : never;
  }[keyof T];
};

/**
 * Gets all required keys from an object type
 *
 * @template T - The object type
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 *   email?: string;
 * }
 *
 * type Required = RequiredKeys<User>; // 'id' | 'name'
 * ```
 */
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

/**
 * Gets all optional keys from an object type
 *
 * @template T - The object type
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 *   email?: string;
 * }
 *
 * type Optional = OptionalKeys<User>; // 'email'
 * ```
 */
export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

/**
 * Gets all readonly keys from an object type
 *
 * @template T - The object type
 *
 * @example
 * ```typescript
 * interface User {
 *   readonly id: string;
 *   name: string;
 * }
 *
 * type Readonly = ReadonlyKeys<User>; // 'id'
 * ```
 */
export type ReadonlyKeys<T> = {
  [K in keyof T]-?: (<U>() => U extends { [P in K]: T[K] } ? 1 : 2) extends <
    U
  >() => U extends { -readonly [P in K]: T[K] } ? 1 : 2
    ? never
    : K;
}[keyof T];

/**
 * Gets all mutable keys from an object type
 *
 * @template T - The object type
 *
 * @example
 * ```typescript
 * interface User {
 *   readonly id: string;
 *   name: string;
 * }
 *
 * type Mutable = MutableKeys<User>; // 'name'
 * ```
 */
export type MutableKeys<T> = {
  [K in keyof T]-?: (<U>() => U extends { [P in K]: T[K] } ? 1 : 2) extends <
    U
  >() => U extends { -readonly [P in K]: T[K] } ? 1 : 2
    ? K
    : never;
}[keyof T];

/**
 * Creates a type with only function properties
 *
 * @template T - The object type
 *
 * @example
 * ```typescript
 * interface Mixed {
 *   name: string;
 *   greet: () => void;
 *   calculate: (x: number) => number;
 * }
 *
 * type Functions = FunctionProperties<Mixed>;
 * // { greet: () => void; calculate: (x: number) => number }
 * ```
 */
export type FunctionProperties<T> = PickByType<T, (...args: any[]) => any>;

/**
 * Creates a type with only non-function properties
 *
 * @template T - The object type
 *
 * @example
 * ```typescript
 * interface Mixed {
 *   name: string;
 *   age: number;
 *   greet: () => void;
 * }
 *
 * type NonFunctions = NonFunctionProperties<Mixed>;
 * // { name: string; age: number }
 * ```
 */
export type NonFunctionProperties<T> = OmitByType<T, (...args: any[]) => any>;

/**
 * Overrides properties in T with properties from U
 *
 * @template T - The base type
 * @template U - The override type
 *
 * @example
 * ```typescript
 * interface Base {
 *   id: string;
 *   value: number;
 * }
 *
 * interface Override {
 *   value: string;
 * }
 *
 * type Result = Override<Base, Override>;
 * // { id: string; value: string }
 * ```
 */
export type Override<T, U> = Omit<T, keyof U> & U;

/**
 * Creates intersection of two object types
 *
 * @template T - First type
 * @template U - Second type
 *
 * @example
 * ```typescript
 * type A = { a: string; b: number };
 * type B = { b: number; c: boolean };
 * type Common = Intersection<A, B>;
 * // { b: number }
 * ```
 */
export type Intersection<T, U> = Pick<T, Extract<keyof T, keyof U>>;

/**
 * Creates difference of two object types
 *
 * @template T - First type
 * @template U - Second type
 *
 * @example
 * ```typescript
 * type A = { a: string; b: number };
 * type B = { b: number; c: boolean };
 * type Diff = Difference<A, B>;
 * // { a: string }
 * ```
 */
export type Difference<T, U> = Pick<T, Exclude<keyof T, keyof U>>;

/**
 * Creates symmetric difference of two object types
 *
 * @template T - First type
 * @template U - Second type
 *
 * @example
 * ```typescript
 * type A = { a: string; b: number };
 * type B = { b: number; c: boolean };
 * type SymDiff = SymmetricDifference<A, B>;
 * // { a: string; c: boolean }
 * ```
 */
export type SymmetricDifference<T, U> = Omit<T & U, keyof (T | U)>;

/**
 * Freezes an object type (deep readonly with const assertion)
 *
 * @template T - The object type
 *
 * @example
 * ```typescript
 * interface Config {
 *   values: number[];
 * }
 *
 * type Frozen = Freeze<Config>;
 * // { readonly values: readonly number[] }
 * ```
 */
export type Freeze<T> = {
  readonly [K in keyof T]: T[K] extends object
    ? T[K] extends Array<infer U>
      ? ReadonlyArray<Freeze<U>>
      : Freeze<T[K]>
    : T[K];
};
