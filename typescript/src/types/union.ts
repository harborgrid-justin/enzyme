/**
 * Union Type Utilities
 *
 * Advanced utilities for working with union types, including distribution,
 * discrimination, and extraction operations.
 *
 * @module types/union
 * @category Type Utilities
 */

/**
 * Distributes a type operation over a union
 *
 * Forces TypeScript to apply a mapped type to each member of a union
 * individually rather than to the union as a whole.
 *
 * @template T - The union type
 * @template F - The transformation to apply
 *
 * @example
 * ```typescript
 * type Union = { type: 'a'; value: string } | { type: 'b'; value: number };
 *
 * type Keys = Distribute<Union, keyof T>;
 * // 'type' | 'value' | 'type' | 'value'
 * // Instead of just: 'type' | 'value'
 * ```
 */
export type Distribute<T, F> = T extends any ? F : never;

/**
 * Creates a discriminated union helper
 *
 * Ensures a union type has a common discriminant property.
 *
 * @template K - The discriminant key
 * @template T - The union type
 *
 * @example
 * ```typescript
 * type Shape = DiscriminatedUnion<
 *   'kind',
 *   | { kind: 'circle'; radius: number }
 *   | { kind: 'square'; size: number }
 *   | { kind: 'triangle'; base: number; height: number }
 * >;
 *
 * function getArea(shape: Shape): number {
 *   switch (shape.kind) {
 *     case 'circle':
 *       return Math.PI * shape.radius ** 2;
 *     case 'square':
 *       return shape.size ** 2;
 *     case 'triangle':
 *       return (shape.base * shape.height) / 2;
 *   }
 * }
 * ```
 */
export type DiscriminatedUnion<K extends PropertyKey, T> = T extends any
  ? K extends keyof T
    ? T
    : never
  : never;

/**
 * Extracts union members that match a condition
 *
 * @template T - The union type
 * @template Condition - The condition to match
 *
 * @example
 * ```typescript
 * type Mixed = string | number | boolean | null;
 * type Primitives = ExtractUnion<Mixed, string | number>;
 * // string | number
 * ```
 */
export type ExtractUnion<T, Condition> = T extends Condition ? T : never;

/**
 * Excludes union members that match a condition
 *
 * @template T - The union type
 * @template Condition - The condition to exclude
 *
 * @example
 * ```typescript
 * type Mixed = string | number | boolean | null;
 * type NonNull = ExcludeUnion<Mixed, null>;
 * // string | number | boolean
 * ```
 */
export type ExcludeUnion<T, Condition> = T extends Condition ? never : T;

/**
 * Filters union members by property value
 *
 * @template T - The union type
 * @template K - The property key
 * @template V - The property value to match
 *
 * @example
 * ```typescript
 * type Events =
 *   | { type: 'click'; x: number; y: number }
 *   | { type: 'keypress'; key: string }
 *   | { type: 'scroll'; delta: number };
 *
 * type ClickEvent = FilterUnion<Events, 'type', 'click'>;
 * // { type: 'click'; x: number; y: number }
 * ```
 */
export type FilterUnion<T, K extends keyof any, V> = T extends any
  ? K extends keyof T
    ? T[K] extends V
      ? T
      : never
    : never
  : never;

/**
 * Gets all possible values for a property across a union
 *
 * @template T - The union type
 * @template K - The property key
 *
 * @example
 * ```typescript
 * type Events =
 *   | { type: 'click'; x: number }
 *   | { type: 'keypress'; key: string };
 *
 * type EventTypes = UnionPropertyValues<Events, 'type'>;
 * // 'click' | 'keypress'
 * ```
 */
export type UnionPropertyValues<T, K extends keyof any> = T extends any
  ? K extends keyof T
    ? T[K]
    : never
  : never;

/**
 * Converts a union to an intersection
 *
 * Uses distributive conditional types to convert union to intersection.
 *
 * @template T - The union type
 *
 * @example
 * ```typescript
 * type A = { a: string };
 * type B = { b: number };
 * type Union = A | B;
 *
 * type Intersection = UnionToIntersection<Union>;
 * // { a: string } & { b: number }
 * ```
 */
export type UnionToIntersection<T> = (
  T extends any ? (x: T) => any : never
) extends (x: infer R) => any
  ? R
  : never;

/**
 * Converts a union to a tuple
 *
 * @template T - The union type
 *
 * @example
 * ```typescript
 * type Union = 'a' | 'b' | 'c';
 * type Tuple = UnionToTuple<Union>;
 * // ['a', 'b', 'c'] (order may vary)
 * ```
 */
export type UnionToTuple<T> = UnionToIntersection<
  T extends any ? (t: T) => T : never
> extends (_: any) => infer W
  ? [...UnionToTuple<Exclude<T, W>>, W]
  : [];

/**
 * Gets the last element of a union (arbitrary order)
 *
 * @template T - The union type
 *
 * @example
 * ```typescript
 * type Union = 'a' | 'b' | 'c';
 * type Last = LastOfUnion<Union>; // one of 'a' | 'b' | 'c'
 * ```
 */
export type LastOfUnion<T> = UnionToIntersection<
  T extends any ? (x: T) => void : never
> extends (x: infer L) => void
  ? L
  : never;

/**
 * Checks if a type is a union
 *
 * @template T - The type to check
 *
 * @example
 * ```typescript
 * type A = IsUnion<string | number>; // true
 * type B = IsUnion<string>; // false
 * ```
 */
export type IsUnion<T, U = T> = T extends any
  ? [U] extends [T]
    ? false
    : true
  : never;

/**
 * Gets the number of members in a union
 *
 * @template T - The union type
 *
 * @example
 * ```typescript
 * type Count = UnionLength<'a' | 'b' | 'c'>; // 3
 * ```
 */
export type UnionLength<T> = UnionToTuple<T>['length'];

/**
 * Splits a union into two groups
 *
 * @template T - The union type
 * @template Condition - The condition to split on
 *
 * @example
 * ```typescript
 * type Mixed = string | number | boolean | null;
 * type Split = SplitUnion<Mixed, string | number>;
 * // [string | number, boolean | null]
 * ```
 */
export type SplitUnion<T, Condition> = [
  ExtractUnion<T, Condition>,
  ExcludeUnion<T, Condition>
];

/**
 * Makes all union members partial
 *
 * @template T - The union type
 *
 * @example
 * ```typescript
 * type Union = { a: string } | { b: number };
 * type PartialUnion = PartialUnion<Union>;
 * // { a?: string } | { b?: number }
 * ```
 */
export type PartialUnion<T> = T extends any ? Partial<T> : never;

/**
 * Makes all union members required
 *
 * @template T - The union type
 *
 * @example
 * ```typescript
 * type Union = { a?: string } | { b?: number };
 * type RequiredUnion = RequiredUnion<Union>;
 * // { a: string } | { b: number }
 * ```
 */
export type RequiredUnion<T> = T extends any ? Required<T> : never;

/**
 * Makes all union members readonly
 *
 * @template T - The union type
 *
 * @example
 * ```typescript
 * type Union = { a: string } | { b: number };
 * type ReadonlyUnion = ReadonlyUnion<Union>;
 * // { readonly a: string } | { readonly b: number }
 * ```
 */
export type ReadonlyUnion<T> = T extends any ? Readonly<T> : never;

/**
 * Extracts common properties from all union members
 *
 * @template T - The union type
 *
 * @example
 * ```typescript
 * type Union =
 *   | { type: 'a'; value: string; common: number }
 *   | { type: 'b'; data: boolean; common: number };
 *
 * type Common = CommonProperties<Union>;
 * // { type: string; common: number }
 * ```
 */
export type CommonProperties<T> = {
  [K in keyof UnionToIntersection<T>]: UnionToIntersection<T>[K];
};

/**
 * Extracts unique properties from union members
 *
 * @template T - The union type
 *
 * @example
 * ```typescript
 * type Union =
 *   | { type: 'a'; value: string; common: number }
 *   | { type: 'b'; data: boolean; common: number };
 *
 * type Unique = UniqueProperties<Union>;
 * // { value: string } | { data: boolean }
 * ```
 */
export type UniqueProperties<T> = T extends any
  ? Omit<T, keyof CommonProperties<T>>
  : never;

/**
 * Flattens nested unions
 *
 * @template T - The nested union type
 *
 * @example
 * ```typescript
 * type Nested = (string | number) | (boolean | null);
 * type Flat = FlattenUnion<Nested>;
 * // string | number | boolean | null
 * ```
 */
export type FlattenUnion<T> = T extends any
  ? T extends infer U
    ? U extends any[]
      ? U[number]
      : U
    : never
  : never;

/**
 * Extracts literal types from a union
 *
 * @template T - The union type
 *
 * @example
 * ```typescript
 * type Mixed = 'a' | 'b' | string | 123 | number;
 * type Literals = ExtractLiterals<Mixed>;
 * // 'a' | 'b' | 123
 * ```
 */
export type ExtractLiterals<T> = T extends string
  ? string extends T
    ? never
    : T
  : T extends number
  ? number extends T
    ? never
    : T
  : T extends boolean
  ? boolean extends T
    ? never
    : T
  : never;

/**
 * Extracts non-literal types from a union
 *
 * @template T - The union type
 *
 * @example
 * ```typescript
 * type Mixed = 'a' | 'b' | string | 123 | number;
 * type NonLiterals = ExtractNonLiterals<Mixed>;
 * // string | number
 * ```
 */
export type ExtractNonLiterals<T> = T extends string
  ? string extends T
    ? T
    : never
  : T extends number
  ? number extends T
    ? T
    : never
  : T extends boolean
  ? boolean extends T
    ? T
    : never
  : T;

/**
 * Removes duplicates from a union
 *
 * @template T - The union type
 *
 * @example
 * ```typescript
 * type Duplicated = string | number | string | boolean | number;
 * type Unique = UniqueUnion<Duplicated>;
 * // string | number | boolean
 * ```
 */
export type UniqueUnion<T> = T;

/**
 * Maps over union members
 *
 * @template T - The union type
 * @template F - The mapping function type
 *
 * @example
 * ```typescript
 * type Union = { id: string } | { id: number };
 * type Mapped = MapUnion<Union, (x: T) => T['id']>;
 * // string | number
 * ```
 */
export type MapUnion<T, F> = T extends any ? F : never;

/**
 * Validates all union members satisfy a constraint
 *
 * @template T - The union type
 * @template Constraint - The constraint to check
 *
 * @example
 * ```typescript
 * type Valid = ValidateUnion<{ id: string } | { id: number }, { id: any }>;
 * // true
 *
 * type Invalid = ValidateUnion<{ id: string } | { name: number }, { id: any }>;
 * // false
 * ```
 */
export type ValidateUnion<T, Constraint> = T extends Constraint ? true : false;

/**
 * Creates exhaustive type guards for discriminated unions
 *
 * @template T - The discriminated union type
 * @template K - The discriminant key
 *
 * @example
 * ```typescript
 * type Action =
 *   | { type: 'increment' }
 *   | { type: 'decrement' }
 *   | { type: 'reset'; value: number };
 *
 * type Guards = UnionTypeGuards<Action, 'type'>;
 * // {
 * //   increment: (x: Action) => x is { type: 'increment' };
 * //   decrement: (x: Action) => x is { type: 'decrement' };
 * //   reset: (x: Action) => x is { type: 'reset'; value: number };
 * // }
 * ```
 */
export type UnionTypeGuards<T, K extends keyof any> = {
  [V in UnionPropertyValues<T, K>]: (x: T) => x is FilterUnion<T, K, V>;
};

/**
 * Merges properties across union members
 *
 * @template T - The union type
 *
 * @example
 * ```typescript
 * type Union =
 *   | { a: string; b: number }
 *   | { b: number; c: boolean };
 *
 * type Merged = MergeUnion<Union>;
 * // { a: string; b: number; c: boolean }
 * ```
 */
export type MergeUnion<T> = {
  [K in keyof UnionToIntersection<T>]: UnionToIntersection<T>[K];
};

/**
 * Wraps each union member in a container type
 *
 * @template T - The union type
 * @template Wrapper - The wrapper type constructor
 *
 * @example
 * ```typescript
 * type Union = string | number | boolean;
 * type Wrapped = WrapUnion<Union, Array>;
 * // string[] | number[] | boolean[]
 * ```
 */
export type WrapUnion<T, Wrapper extends new (x: any) => any> = T extends any
  ? Wrapper extends new (x: T) => infer R
    ? R
    : never
  : never;
