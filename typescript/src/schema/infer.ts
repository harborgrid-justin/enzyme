/**
 * Type inference utilities for Zod schemas
 * @module @missionfabric-js/enzyme-typescript/schema/infer
 *
 * @example
 * ```typescript
 * import { Infer, Input, Output } from '@missionfabric-js/enzyme-typescript/schema/infer';
 *
 * const userSchema = z.object({
 *   name: z.string(),
 *   age: z.number(),
 * });
 *
 * type User = Infer<typeof userSchema>;
 * ```
 */

import { z } from 'zod';

/**
 * Infer the output type from a Zod schema
 * This is the type after parsing and transformations
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   name: z.string(),
 *   age: z.coerce.number(),
 * });
 *
 * type User = Infer<typeof schema>;
 * // { name: string; age: number }
 * ```
 */
export type Infer<T extends z.ZodTypeAny> = z.infer<T>;

/**
 * Infer the input type from a Zod schema
 * This is the type before parsing and transformations
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   name: z.string(),
 *   age: z.coerce.number(),
 * });
 *
 * type UserInput = Input<typeof schema>;
 * // { name: string; age: string | number }
 * ```
 */
export type Input<T extends z.ZodTypeAny> = z.input<T>;

/**
 * Infer the output type from a Zod schema (alias for Infer)
 *
 * @example
 * ```typescript
 * const schema = z.object({ name: z.string() });
 * type User = Output<typeof schema>;
 * ```
 */
export type Output<T extends z.ZodTypeAny> = z.output<T>;

/**
 * Extract the shape from a Zod object schema
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   name: z.string(),
 *   age: z.number(),
 * });
 *
 * type Shape = ExtractShape<typeof schema>;
 * // { name: ZodString; age: ZodNumber }
 * ```
 */
export type ExtractShape<T extends z.ZodObject<any>> = T extends z.ZodObject<infer S>
  ? S
  : never;

/**
 * Extract the element type from a Zod array schema
 *
 * @example
 * ```typescript
 * const schema = z.array(z.string());
 * type Element = ExtractArrayElement<typeof schema>;
 * // string
 * ```
 */
export type ExtractArrayElement<T extends z.ZodArray<any>> = T extends z.ZodArray<infer E>
  ? z.infer<E>
  : never;

/**
 * Extract the options from a Zod enum schema
 *
 * @example
 * ```typescript
 * const schema = z.enum(['admin', 'user', 'guest']);
 * type Role = ExtractEnumValues<typeof schema>;
 * // 'admin' | 'user' | 'guest'
 * ```
 */
export type ExtractEnumValues<T extends z.ZodEnum<any>> = T extends z.ZodEnum<infer E>
  ? E[number]
  : never;

/**
 * Extract the key type from a Zod record schema
 *
 * @example
 * ```typescript
 * const schema = z.record(z.string(), z.number());
 * type Key = ExtractRecordKey<typeof schema>;
 * // string
 * ```
 */
export type ExtractRecordKey<T extends z.ZodRecord<any, any>> = T extends z.ZodRecord<
  infer K,
  any
>
  ? z.infer<K>
  : never;

/**
 * Extract the value type from a Zod record schema
 *
 * @example
 * ```typescript
 * const schema = z.record(z.string(), z.number());
 * type Value = ExtractRecordValue<typeof schema>;
 * // number
 * ```
 */
export type ExtractRecordValue<T extends z.ZodRecord<any, any>> = T extends z.ZodRecord<
  any,
  infer V
>
  ? z.infer<V>
  : never;

/**
 * Make specific fields required in an inferred type
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   id: z.string().optional(),
 *   name: z.string().optional(),
 *   email: z.string().optional(),
 * });
 *
 * type User = Infer<typeof schema>;
 * type UserWithRequiredId = MakeRequired<User, 'id' | 'email'>;
 * // { id: string; name?: string; email: string }
 * ```
 */
export type MakeRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Make specific fields optional in an inferred type
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   id: z.string(),
 *   name: z.string(),
 *   email: z.string(),
 * });
 *
 * type User = Infer<typeof schema>;
 * type PartialUser = MakeOptional<User, 'email'>;
 * // { id: string; name: string; email?: string }
 * ```
 */
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make all fields nullable in an inferred type
 *
 * @example
 * ```typescript
 * type User = { id: string; name: string };
 * type NullableUser = MakeNullable<User>;
 * // { id: string | null; name: string | null }
 * ```
 */
export type MakeNullable<T> = {
  [K in keyof T]: T[K] | null;
};

/**
 * Deep partial type for nested objects
 *
 * @example
 * ```typescript
 * type User = {
 *   name: string;
 *   profile: {
 *     bio: string;
 *     avatar: string;
 *   };
 * };
 *
 * type PartialUser = DeepPartial<User>;
 * // {
 * //   name?: string;
 * //   profile?: {
 * //     bio?: string;
 * //     avatar?: string;
 * //   };
 * // }
 * ```
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

/**
 * Deep required type for nested objects
 *
 * @example
 * ```typescript
 * type User = {
 *   name?: string;
 *   profile?: {
 *     bio?: string;
 *     avatar?: string;
 *   };
 * };
 *
 * type RequiredUser = DeepRequired<User>;
 * // {
 * //   name: string;
 * //   profile: {
 * //     bio: string;
 * //     avatar: string;
 * //   };
 * // }
 * ```
 */
export type DeepRequired<T> = T extends object
  ? {
      [P in keyof T]-?: DeepRequired<T[P]>;
    }
  : T;

/**
 * Get the keys of an object type
 *
 * @example
 * ```typescript
 * type User = { id: string; name: string; email: string };
 * type Keys = KeysOf<User>;
 * // 'id' | 'name' | 'email'
 * ```
 */
export type KeysOf<T> = keyof T;

/**
 * Get the values of an object type
 *
 * @example
 * ```typescript
 * type User = { id: string; name: string; age: number };
 * type Values = ValuesOf<User>;
 * // string | number
 * ```
 */
export type ValuesOf<T> = T[keyof T];

/**
 * Helper to infer literal types from const arrays
 *
 * @example
 * ```typescript
 * const roles = ['admin', 'user', 'guest'] as const;
 * type Role = ArrayElement<typeof roles>;
 * // 'admin' | 'user' | 'guest'
 * ```
 */
export type ArrayElement<T extends ReadonlyArray<unknown>> = T extends ReadonlyArray<
  infer E
>
  ? E
  : never;

/**
 * Utility to unwrap a promise type
 *
 * @example
 * ```typescript
 * type UserPromise = Promise<{ id: string; name: string }>;
 * type User = Awaited<UserPromise>;
 * // { id: string; name: string }
 * ```
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Create a type from a schema definition object
 *
 * @example
 * ```typescript
 * const schemaShape = {
 *   id: z.string(),
 *   name: z.string(),
 *   age: z.number(),
 * } as const;
 *
 * type User = InferShape<typeof schemaShape>;
 * // { id: string; name: string; age: number }
 * ```
 */
export type InferShape<T extends z.ZodRawShape> = {
  [K in keyof T]: z.infer<T[K]>;
};

/**
 * Utility to get safe parse result type
 *
 * @example
 * ```typescript
 * const schema = z.object({ name: z.string() });
 * type ParseResult = SafeParseResult<typeof schema>;
 * // { success: true; data: { name: string } } | { success: false; error: ZodError }
 * ```
 */
export type SafeParseResult<T extends z.ZodTypeAny> = z.SafeParseReturnType<
  z.input<T>,
  z.output<T>
>;

/**
 * Utility to get safe parse success type
 *
 * @example
 * ```typescript
 * const schema = z.object({ name: z.string() });
 * type Success = SafeParseSuccess<typeof schema>;
 * // { success: true; data: { name: string } }
 * ```
 */
export type SafeParseSuccess<T extends z.ZodTypeAny> = z.SafeParseSuccess<z.output<T>>;

/**
 * Utility to get safe parse error type
 *
 * @example
 * ```typescript
 * const schema = z.object({ name: z.string() });
 * type Error = SafeParseError<typeof schema>;
 * // { success: false; error: ZodError }
 * ```
 */
export type SafeParseError<T extends z.ZodTypeAny> = z.SafeParseError<z.input<T>>;

/**
 * Extract branded type brand
 *
 * @example
 * ```typescript
 * const UserId = z.string().brand('UserId');
 * type Brand = ExtractBrand<z.infer<typeof UserId>>;
 * // 'UserId'
 * ```
 */
export type ExtractBrand<T> = T extends { __brand: infer B } ? B : never;

/**
 * Check if a type is optional
 *
 * @example
 * ```typescript
 * type IsOptional1 = IsOptional<string | undefined>; // true
 * type IsOptional2 = IsOptional<string>; // false
 * ```
 */
export type IsOptional<T> = undefined extends T ? true : false;

/**
 * Check if a type is nullable
 *
 * @example
 * ```typescript
 * type IsNullable1 = IsNullable<string | null>; // true
 * type IsNullable2 = IsNullable<string>; // false
 * ```
 */
export type IsNullable<T> = null extends T ? true : false;

/**
 * Get required keys from an object type
 *
 * @example
 * ```typescript
 * type User = { id: string; name?: string; email: string };
 * type Required = RequiredKeys<User>;
 * // 'id' | 'email'
 * ```
 */
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

/**
 * Get optional keys from an object type
 *
 * @example
 * ```typescript
 * type User = { id: string; name?: string; email: string };
 * type Optional = OptionalKeys<User>;
 * // 'name'
 * ```
 */
export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

/**
 * Merge two types, with the second type overriding the first
 *
 * @example
 * ```typescript
 * type A = { id: string; name: string };
 * type B = { name: number; age: number };
 * type Merged = MergeTypes<A, B>;
 * // { id: string; name: number; age: number }
 * ```
 */
export type MergeTypes<A, B> = Omit<A, keyof B> & B;

/**
 * Create a readonly version of a type
 *
 * @example
 * ```typescript
 * type User = { id: string; name: string };
 * type ReadonlyUser = DeepReadonly<User>;
 * // { readonly id: string; readonly name: string }
 * ```
 */
export type DeepReadonly<T> = T extends (infer R)[]
  ? ReadonlyArray<DeepReadonly<R>>
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

/**
 * Create a mutable version of a readonly type
 *
 * @example
 * ```typescript
 * type ReadonlyUser = { readonly id: string; readonly name: string };
 * type MutableUser = Mutable<ReadonlyUser>;
 * // { id: string; name: string }
 * ```
 */
export type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};
