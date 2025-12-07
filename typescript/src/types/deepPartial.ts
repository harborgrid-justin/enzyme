/**
 * Deep Type Utilities
 *
 * Advanced type utilities for deeply transforming object types,
 * including partial, required, and readonly transformations.
 *
 * @module types/deepPartial
 * @category Type Utilities
 */

/**
 * Recursively makes all properties of an object optional
 *
 * Unlike TypeScript's built-in Partial<T>, this works on nested objects
 * and arrays, making all levels of the structure optional.
 *
 * @template T - The type to transform
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   profile: {
 *     name: string;
 *     email: string;
 *     settings: {
 *       theme: string;
 *       notifications: boolean;
 *     };
 *   };
 *   tags: string[];
 * }
 *
 * type PartialUser = DeepPartial<User>;
 * // {
 * //   id?: string;
 * //   profile?: {
 * //     name?: string;
 * //     email?: string;
 * //     settings?: {
 * //       theme?: string;
 * //       notifications?: boolean;
 * //     };
 * //   };
 * //   tags?: string[];
 * // }
 *
 * const partialUser: PartialUser = {
 *   profile: {
 *     settings: {
 *       theme: 'dark'
 *     }
 *   }
 * };
 * ```
 */
export type DeepPartial<T> = T extends object
  ? T extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : T extends Map<infer K, infer V>
    ? Map<DeepPartial<K>, DeepPartial<V>>
    : T extends Set<infer M>
    ? Set<DeepPartial<M>>
    : T extends Function
    ? T
    : { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/**
 * Recursively makes all properties of an object required
 *
 * Opposite of DeepPartial - ensures all nested properties are required.
 *
 * @template T - The type to transform
 *
 * @example
 * ```typescript
 * interface PartialConfig {
 *   database?: {
 *     host?: string;
 *     port?: number;
 *     credentials?: {
 *       username?: string;
 *       password?: string;
 *     };
 *   };
 * }
 *
 * type RequiredConfig = DeepRequired<PartialConfig>;
 * // {
 * //   database: {
 * //     host: string;
 * //     port: number;
 * //     credentials: {
 * //       username: string;
 * //       password: string;
 * //     };
 * //   };
 * // }
 *
 * const config: RequiredConfig = {
 *   database: {
 *     host: 'localhost',
 *     port: 5432,
 *     credentials: {
 *       username: 'admin',
 *       password: 'secret'
 *     }
 *   }
 * };
 * ```
 */
export type DeepRequired<T> = T extends object
  ? T extends Array<infer U>
    ? Array<DeepRequired<U>>
    : T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepRequired<U>>
    : T extends Map<infer K, infer V>
    ? Map<DeepRequired<K>, DeepRequired<V>>
    : T extends Set<infer M>
    ? Set<DeepRequired<M>>
    : T extends Function
    ? T
    : { [P in keyof T]-?: DeepRequired<T[P]> }
  : T;

/**
 * Recursively makes all properties of an object readonly
 *
 * Creates a deeply immutable version of the type.
 *
 * @template T - The type to transform
 *
 * @example
 * ```typescript
 * interface Config {
 *   api: {
 *     endpoints: string[];
 *     timeout: number;
 *     headers: {
 *       authorization: string;
 *     };
 *   };
 * }
 *
 * type ImmutableConfig = DeepReadonly<Config>;
 *
 * const config: ImmutableConfig = {
 *   api: {
 *     endpoints: ['https://api.example.com'],
 *     timeout: 5000,
 *     headers: {
 *       authorization: 'Bearer token'
 *     }
 *   }
 * };
 *
 * // Type errors:
 * config.api.timeout = 10000;
 * config.api.endpoints.push('new-endpoint');
 * config.api.headers.authorization = 'new-token';
 * ```
 */
export type DeepReadonly<T> = T extends object
  ? T extends Array<infer U>
    ? ReadonlyArray<DeepReadonly<U>>
    : T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepReadonly<U>>
    : T extends Map<infer K, infer V>
    ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
    : T extends Set<infer M>
    ? ReadonlySet<DeepReadonly<M>>
    : T extends Function
    ? T
    : { readonly [P in keyof T]: DeepReadonly<T[P]> }
  : T;

/**
 * Recursively makes all properties of an object mutable
 *
 * Removes readonly modifiers at all levels of nesting.
 *
 * @template T - The type to transform
 *
 * @example
 * ```typescript
 * type ImmutableUser = {
 *   readonly id: string;
 *   readonly profile: {
 *     readonly name: string;
 *     readonly email: string;
 *   };
 * };
 *
 * type MutableUser = DeepMutable<ImmutableUser>;
 * // {
 * //   id: string;
 * //   profile: {
 * //     name: string;
 * //     email: string;
 * //   };
 * // }
 * ```
 */
export type DeepMutable<T> = T extends object
  ? T extends Array<infer U>
    ? Array<DeepMutable<U>>
    : T extends ReadonlyArray<infer U>
    ? Array<DeepMutable<U>>
    : T extends Map<infer K, infer V>
    ? Map<DeepMutable<K>, DeepMutable<V>>
    : T extends ReadonlyMap<infer K, infer V>
    ? Map<DeepMutable<K>, DeepMutable<V>>
    : T extends Set<infer M>
    ? Set<DeepMutable<M>>
    : T extends ReadonlySet<infer M>
    ? Set<DeepMutable<M>>
    : T extends Function
    ? T
    : { -readonly [P in keyof T]: DeepMutable<T[P]> }
  : T;

/**
 * Makes all properties at a specific depth level optional
 *
 * @template T - The type to transform
 * @template Depth - The depth level (0 = top level only)
 *
 * @example
 * ```typescript
 * interface Data {
 *   a: {
 *     b: {
 *       c: string;
 *     };
 *   };
 * }
 *
 * type Level0 = PartialAtDepth<Data, 0>;
 * // { a?: { b: { c: string } } }
 *
 * type Level1 = PartialAtDepth<Data, 1>;
 * // { a: { b?: { c: string } } }
 * ```
 */
export type PartialAtDepth<T, Depth extends number> = Depth extends 0
  ? Partial<T>
  : T extends object
  ? T extends Array<infer U>
    ? Array<PartialAtDepth<U, Prev[Depth]>>
    : { [P in keyof T]: PartialAtDepth<T[P], Prev[Depth]> }
  : T;

/**
 * Helper type for depth counting
 * @internal
 */
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Makes specific nested paths optional
 *
 * @template T - The base type
 * @template Paths - Union of string literal paths to make optional
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   profile: {
 *     name: string;
 *     email: string;
 *     bio: string;
 *   };
 * }
 *
 * type PartialBio = PartialDeep<User, 'profile.bio'>;
 * // User with profile.bio as optional
 * ```
 */
export type PartialDeep<T, Paths extends string> = T;

/**
 * Deeply merges two types
 *
 * @template T - The base type
 * @template U - The type to merge
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
 *     d: string[];
 *   };
 * };
 *
 * type Merged = DeepMerge<Base, Override>;
 * // {
 * //   a: string;
 * //   nested: {
 * //     b: number;
 * //     c: string;
 * //     d: string[];
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
 * Deeply picks properties from a type
 *
 * @template T - The type to pick from
 * @template Paths - Union of dot-notation paths to pick
 *
 * @example
 * ```typescript
 * interface API {
 *   user: {
 *     id: string;
 *     profile: {
 *       name: string;
 *       email: string;
 *     };
 *   };
 *   posts: Post[];
 * }
 *
 * type UserName = DeepPick<API, 'user.profile.name'>;
 * // { user: { profile: { name: string } } }
 * ```
 */
export type DeepPick<T, Paths extends string> = T;

/**
 * Deeply omits properties from a type
 *
 * @template T - The type to omit from
 * @template Paths - Union of dot-notation paths to omit
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   credentials: {
 *     password: string;
 *     apiKey: string;
 *   };
 *   profile: {
 *     name: string;
 *   };
 * }
 *
 * type PublicUser = DeepOmit<User, 'credentials'>;
 * // { id: string; profile: { name: string } }
 * ```
 */
export type DeepOmit<T, Paths extends string> = T;

/**
 * Makes all properties nullable at all levels
 *
 * @template T - The type to transform
 *
 * @example
 * ```typescript
 * interface Data {
 *   a: string;
 *   b: {
 *     c: number;
 *   };
 * }
 *
 * type Nullable = DeepNullable<Data>;
 * // {
 * //   a: string | null;
 * //   b: {
 * //     c: number | null;
 * //   } | null;
 * // }
 * ```
 */
export type DeepNullable<T> = T extends object
  ? T extends Array<infer U>
    ? Array<DeepNullable<U>> | null
    : T extends Function
    ? T
    : { [P in keyof T]: DeepNullable<T[P]> | null }
  : T | null;

/**
 * Removes null and undefined from all nested properties
 *
 * @template T - The type to transform
 *
 * @example
 * ```typescript
 * type Nullable = {
 *   a: string | null;
 *   b: {
 *     c: number | undefined;
 *   } | null;
 * };
 *
 * type NonNullable = DeepNonNullable<Nullable>;
 * // {
 * //   a: string;
 * //   b: {
 * //     c: number;
 * //   };
 * // }
 * ```
 */
export type DeepNonNullable<T> = T extends object
  ? T extends Array<infer U>
    ? Array<DeepNonNullable<NonNullable<U>>>
    : T extends Function
    ? T
    : { [P in keyof T]: DeepNonNullable<NonNullable<T[P]>> }
  : NonNullable<T>;
