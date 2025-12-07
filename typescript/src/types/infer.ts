/**
 * Type Inference Utilities
 *
 * Advanced utilities for inferring and extracting types from complex
 * structures including promises, arrays, functions, and generic types.
 *
 * @module types/infer
 * @category Type Utilities
 */

/**
 * Recursively unwraps Promise types
 *
 * @template T - The type to unwrap
 *
 * @example
 * ```typescript
 * type A = Awaited<Promise<string>>; // string
 * type B = Awaited<Promise<Promise<number>>>; // number
 * type C = Awaited<Promise<string> | Promise<number>>; // string | number
 * type D = Awaited<string>; // string (non-promise pass through)
 * ```
 */
export type Awaited<T> = T extends Promise<infer U>
  ? Awaited<U>
  : T extends PromiseLike<infer U>
  ? Awaited<U>
  : T;

/**
 * Extracts the element type from an array
 *
 * @template T - The array type
 *
 * @example
 * ```typescript
 * type A = UnwrapArray<string[]>; // string
 * type B = UnwrapArray<readonly number[]>; // number
 * type C = UnwrapArray<Array<User>>; // User
 * type D = UnwrapArray<[string, number]>; // string | number
 * type E = UnwrapArray<string>; // string (non-array pass through)
 * ```
 */
export type UnwrapArray<T> = T extends readonly (infer U)[]
  ? U
  : T extends Array<infer U>
  ? U
  : T;

/**
 * Deeply unwraps nested arrays
 *
 * @template T - The type to unwrap
 *
 * @example
 * ```typescript
 * type A = DeepUnwrapArray<string[][][]>; // string
 * type B = DeepUnwrapArray<Array<Array<number>>>; // number
 * ```
 */
export type DeepUnwrapArray<T> = T extends readonly (infer U)[]
  ? DeepUnwrapArray<U>
  : T extends Array<infer U>
  ? DeepUnwrapArray<U>
  : T;

/**
 * Infers the return type of a Promise-returning function
 *
 * @template T - The function type
 *
 * @example
 * ```typescript
 * async function fetchUser(): Promise<User> {
 *   // ...
 * }
 *
 * type UserType = PromiseReturnType<typeof fetchUser>; // User
 * ```
 */
export type PromiseReturnType<T extends (...args: any[]) => any> = Awaited<
  ReturnType<T>
>;

/**
 * Extracts the type from a readonly type
 *
 * @template T - The readonly type
 *
 * @example
 * ```typescript
 * type A = Mutable<readonly string[]>; // string[]
 * type B = Mutable<Readonly<{ x: number }>>; // { x: number }
 * ```
 */
export type Mutable<T> = T extends readonly (infer U)[]
  ? U[]
  : T extends ReadonlyArray<infer U>
  ? Array<U>
  : T extends Readonly<infer U>
  ? U
  : T;

/**
 * Infers the this type from a method
 *
 * @template T - The method type
 *
 * @example
 * ```typescript
 * class MyClass {
 *   method(this: MyClass, x: number): void {}
 * }
 *
 * type ThisType = InferThis<MyClass['method']>; // MyClass
 * ```
 */
export type InferThis<T> = T extends (this: infer This, ...args: any[]) => any
  ? This
  : unknown;

/**
 * Extracts the value type from a Record/Map/Object
 *
 * @template T - The collection type
 *
 * @example
 * ```typescript
 * type A = ValueOf<{ a: string; b: number }>; // string | number
 * type B = ValueOf<Map<string, User>>; // User
 * type C = ValueOf<Record<string, boolean>>; // boolean
 * ```
 */
export type ValueOf<T> = T extends Map<any, infer V>
  ? V
  : T extends Set<infer V>
  ? V
  : T extends ReadonlyMap<any, infer V>
  ? V
  : T extends ReadonlySet<infer V>
  ? V
  : T extends object
  ? T[keyof T]
  : never;

/**
 * Extracts the key type from a Record/Map/Object
 *
 * @template T - The collection type
 *
 * @example
 * ```typescript
 * type A = KeyOf<{ a: string; b: number }>; // 'a' | 'b'
 * type B = KeyOf<Map<string, User>>; // string
 * type C = KeyOf<Record<'x' | 'y', number>>; // 'x' | 'y'
 * ```
 */
export type KeyOf<T> = T extends Map<infer K, any>
  ? K
  : T extends ReadonlyMap<infer K, any>
  ? K
  : T extends object
  ? keyof T
  : never;

/**
 * Infers constructor parameters
 *
 * @template T - The constructor type
 *
 * @example
 * ```typescript
 * class User {
 *   constructor(name: string, age: number) {}
 * }
 *
 * type Params = ConstructorParams<typeof User>; // [string, number]
 * ```
 */
export type ConstructorParams<T> = T extends new (...args: infer P) => any
  ? P
  : never;

/**
 * Infers the instance type of a constructor
 *
 * @template T - The constructor type
 *
 * @example
 * ```typescript
 * class User {
 *   name: string;
 * }
 *
 * type Instance = InstanceTypeOf<typeof User>; // User
 * ```
 */
export type InstanceTypeOf<T> = T extends new (...args: any[]) => infer R
  ? R
  : never;

/**
 * Extracts the discriminant property type from a union
 *
 * @template T - The union type
 * @template K - The discriminant key
 *
 * @example
 * ```typescript
 * type Shape =
 *   | { kind: 'circle'; radius: number }
 *   | { kind: 'square'; size: number }
 *   | { kind: 'triangle'; base: number; height: number };
 *
 * type Kind = DiscriminantValue<Shape, 'kind'>;
 * // 'circle' | 'square' | 'triangle'
 * ```
 */
export type DiscriminantValue<T, K extends keyof T> = T extends any
  ? T[K]
  : never;

/**
 * Infers a union member by its discriminant value
 *
 * @template T - The union type
 * @template K - The discriminant key
 * @template V - The discriminant value
 *
 * @example
 * ```typescript
 * type Shape =
 *   | { kind: 'circle'; radius: number }
 *   | { kind: 'square'; size: number };
 *
 * type Circle = InferByDiscriminant<Shape, 'kind', 'circle'>;
 * // { kind: 'circle'; radius: number }
 * ```
 */
export type InferByDiscriminant<
  T,
  K extends keyof T,
  V extends T[K]
> = T extends any ? (T[K] extends V ? T : never) : never;

/**
 * Extracts generic type parameters
 *
 * @template T - The generic type
 *
 * @example
 * ```typescript
 * type A = InferGeneric<Promise<string>>; // string
 * type B = InferGeneric<Array<number>>; // number
 * type C = InferGeneric<Map<string, User>>; // [string, User]
 * ```
 */
export type InferGeneric<T> = T extends Promise<infer U>
  ? U
  : T extends Array<infer U>
  ? U
  : T extends Map<infer K, infer V>
  ? [K, V]
  : T extends Set<infer M>
  ? M
  : never;

/**
 * Infers the element type of an iterable
 *
 * @template T - The iterable type
 *
 * @example
 * ```typescript
 * type A = IterableType<string[]>; // string
 * type B = IterableType<Set<number>>; // number
 * type C = IterableType<Map<string, User>>; // [string, User]
 * ```
 */
export type IterableType<T> = T extends Iterable<infer U> ? U : never;

/**
 * Extracts the resolve type from a Promise constructor
 *
 * @template T - The Promise executor type
 *
 * @example
 * ```typescript
 * type Executor = (
 *   resolve: (value: User) => void,
 *   reject: (error: Error) => void
 * ) => void;
 *
 * type Resolved = ResolveType<Executor>; // User
 * ```
 */
export type ResolveType<T> = T extends (
  resolve: (value: infer R) => any,
  ...args: any[]
) => any
  ? R
  : never;

/**
 * Extracts the reject type from a Promise constructor
 *
 * @template T - The Promise executor type
 *
 * @example
 * ```typescript
 * type Executor = (
 *   resolve: (value: User) => void,
 *   reject: (error: Error) => void
 * ) => void;
 *
 * type Rejected = RejectType<Executor>; // Error
 * ```
 */
export type RejectType<T> = T extends (
  resolve: any,
  reject: (error: infer E) => any,
  ...args: any[]
) => any
  ? E
  : never;

/**
 * Infers tuple element types
 *
 * @template T - The tuple type
 *
 * @example
 * ```typescript
 * type Tuple = [string, number, boolean];
 * type First = TupleElement<Tuple, 0>; // string
 * type Second = TupleElement<Tuple, 1>; // number
 * type Third = TupleElement<Tuple, 2>; // boolean
 * ```
 */
export type TupleElement<T extends readonly any[], N extends number> = T[N];

/**
 * Extracts the first element type of a tuple
 *
 * @template T - The tuple type
 *
 * @example
 * ```typescript
 * type Tuple = [string, number, boolean];
 * type First = Head<Tuple>; // string
 * ```
 */
export type Head<T extends readonly any[]> = T extends readonly [
  infer H,
  ...any[]
]
  ? H
  : never;

/**
 * Extracts all but the first element of a tuple
 *
 * @template T - The tuple type
 *
 * @example
 * ```typescript
 * type Tuple = [string, number, boolean];
 * type Rest = Tail<Tuple>; // [number, boolean]
 * ```
 */
export type Tail<T extends readonly any[]> = T extends readonly [any, ...infer R]
  ? R
  : never;

/**
 * Extracts the last element type of a tuple
 *
 * @template T - The tuple type
 *
 * @example
 * ```typescript
 * type Tuple = [string, number, boolean];
 * type Last = Last<Tuple>; // boolean
 * ```
 */
export type Last<T extends readonly any[]> = T extends readonly [...any[], infer L]
  ? L
  : never;

/**
 * Infers function overload signatures
 *
 * @template T - The overloaded function type
 *
 * @example
 * ```typescript
 * function parse(input: string): number;
 * function parse(input: number): string;
 * function parse(input: string | number): string | number {
 *   return typeof input === 'string' ? parseInt(input) : String(input);
 * }
 *
 * type Overloads = FunctionOverloads<typeof parse>;
 * ```
 */
export type FunctionOverloads<T> = T extends {
  (...args: infer A1): infer R1;
  (...args: infer A2): infer R2;
}
  ? [(...args: A1) => R1, (...args: A2) => R2]
  : T extends (...args: infer A) => infer R
  ? [(...args: A) => R]
  : never;

/**
 * Extracts the callback type from an async operation
 *
 * @template T - The async function type
 *
 * @example
 * ```typescript
 * function fetchData(
 *   callback: (error: Error | null, data: User | null) => void
 * ): void;
 *
 * type Callback = CallbackType<typeof fetchData>;
 * // (error: Error | null, data: User | null) => void
 * ```
 */
export type CallbackType<T> = T extends (callback: infer C) => any
  ? C
  : T extends (...args: [...infer Args, infer Last]) => any
  ? Last extends (...args: any[]) => any
    ? Last
    : never
  : never;

/**
 * Infers deeply nested property types
 *
 * @template T - The object type
 * @template Path - Dot-notation path
 *
 * @example
 * ```typescript
 * interface Nested {
 *   a: {
 *     b: {
 *       c: string;
 *     };
 *   };
 * }
 *
 * type Value = DeepInfer<Nested, 'a.b.c'>; // string
 * ```
 */
export type DeepInfer<T, Path extends string> = Path extends keyof T
  ? T[Path]
  : Path extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? DeepInfer<T[K], Rest>
    : never
  : never;
