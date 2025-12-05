/**
 * Schema composition utilities for merging and extending schemas
 * @module @missionfabric-js/enzyme-typescript/schema/compose
 *
 * @example
 * ```typescript
 * import { merge, extend, pick, omit } from '@missionfabric-js/enzyme-typescript/schema/compose';
 *
 * const baseSchema = z.object({ id: z.string() });
 * const extendedSchema = extend(baseSchema, { name: z.string() });
 * ```
 */

import { z } from 'zod';

/**
 * Merge two object schemas
 *
 * @param schema1 - First schema
 * @param schema2 - Second schema
 * @returns Merged schema
 *
 * @example
 * ```typescript
 * const userBase = z.object({
 *   id: z.string(),
 *   name: z.string(),
 * });
 *
 * const userTimestamps = z.object({
 *   createdAt: z.date(),
 *   updatedAt: z.date(),
 * });
 *
 * const userSchema = merge(userBase, userTimestamps);
 * // { id, name, createdAt, updatedAt }
 * ```
 */
export function merge<A extends z.ZodRawShape, B extends z.ZodRawShape>(
  schema1: z.ZodObject<A>,
  schema2: z.ZodObject<B>
): z.ZodObject<A & B> {
  return schema1.merge(schema2);
}

/**
 * Extend an object schema with additional fields
 *
 * @param schema - Base schema
 * @param extension - Fields to add
 * @returns Extended schema
 *
 * @example
 * ```typescript
 * const baseSchema = z.object({
 *   id: z.string(),
 * });
 *
 * const extendedSchema = extend(baseSchema, {
 *   name: z.string(),
 *   email: z.string().email(),
 * });
 * ```
 */
export function extend<T extends z.ZodRawShape, E extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  extension: E
): z.ZodObject<T & E> {
  return schema.extend(extension);
}

/**
 * Pick specific fields from an object schema
 *
 * @param schema - Source schema
 * @param keys - Keys to pick
 * @returns Schema with only picked fields
 *
 * @example
 * ```typescript
 * const userSchema = z.object({
 *   id: z.string(),
 *   name: z.string(),
 *   email: z.string(),
 *   password: z.string(),
 * });
 *
 * const publicUserSchema = pick(userSchema, ['id', 'name', 'email']);
 * // { id, name, email }
 * ```
 */
export function pick<T extends z.ZodRawShape, K extends keyof T>(
  schema: z.ZodObject<T>,
  keys: K[]
): z.ZodObject<Pick<T, K>> {
  return schema.pick(
    keys.reduce((acc, key) => ({ ...acc, [key]: true }), {} as Record<K, true>)
  );
}

/**
 * Omit specific fields from an object schema
 *
 * @param schema - Source schema
 * @param keys - Keys to omit
 * @returns Schema without omitted fields
 *
 * @example
 * ```typescript
 * const userSchema = z.object({
 *   id: z.string(),
 *   name: z.string(),
 *   email: z.string(),
 *   password: z.string(),
 * });
 *
 * const userWithoutPasswordSchema = omit(userSchema, ['password']);
 * // { id, name, email }
 * ```
 */
export function omit<T extends z.ZodRawShape, K extends keyof T>(
  schema: z.ZodObject<T>,
  keys: K[]
): z.ZodObject<Omit<T, K>> {
  return schema.omit(
    keys.reduce((acc, key) => ({ ...acc, [key]: true }), {} as Record<K, true>)
  );
}

/**
 * Make all fields in a schema partial (optional)
 *
 * @param schema - Source schema
 * @returns Schema with all optional fields
 *
 * @example
 * ```typescript
 * const userSchema = z.object({
 *   name: z.string(),
 *   email: z.string(),
 *   age: z.number(),
 * });
 *
 * const partialUserSchema = partial(userSchema);
 * // All fields are optional
 * ```
 */
export function partial<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): z.ZodObject<{ [K in keyof T]: z.ZodOptional<T[K]> }> {
  return schema.partial();
}

/**
 * Make specific fields in a schema partial
 *
 * @param schema - Source schema
 * @param keys - Keys to make partial
 * @returns Schema with specified fields optional
 *
 * @example
 * ```typescript
 * const userSchema = z.object({
 *   id: z.string(),
 *   name: z.string(),
 *   email: z.string(),
 *   phone: z.string(),
 * });
 *
 * const schema = partialFields(userSchema, ['phone', 'email']);
 * // id and name are required, phone and email are optional
 * ```
 */
export function partialFields<T extends z.ZodRawShape, K extends keyof T>(
  schema: z.ZodObject<T>,
  keys: K[]
): z.ZodObject<{
  [P in keyof T]: P extends K ? z.ZodOptional<T[P]> : T[P];
}> {
  return schema.partial(
    keys.reduce((acc, key) => ({ ...acc, [key]: true }), {} as Record<K, true>)
  ) as any;
}

/**
 * Make all fields in a schema required
 *
 * @param schema - Source schema
 * @returns Schema with all required fields
 *
 * @example
 * ```typescript
 * const partialSchema = z.object({
 *   name: z.string().optional(),
 *   email: z.string().optional(),
 * });
 *
 * const requiredSchema = required(partialSchema);
 * // All fields are required
 * ```
 */
export function required<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): z.ZodObject<{ [K in keyof T]: z.ZodType<Exclude<z.infer<T[K]>, undefined>> }> {
  return schema.required();
}

/**
 * Make specific fields in a schema required
 *
 * @param schema - Source schema
 * @param keys - Keys to make required
 * @returns Schema with specified fields required
 *
 * @example
 * ```typescript
 * const userSchema = z.object({
 *   id: z.string().optional(),
 *   name: z.string().optional(),
 *   email: z.string().optional(),
 * });
 *
 * const schema = requiredFields(userSchema, ['id', 'email']);
 * // id and email are required, name is optional
 * ```
 */
export function requiredFields<T extends z.ZodRawShape, K extends keyof T>(
  schema: z.ZodObject<T>,
  keys: K[]
): z.ZodObject<{
  [P in keyof T]: P extends K ? z.ZodType<Exclude<z.infer<T[P]>, undefined>> : T[P];
}> {
  return schema.required(
    keys.reduce((acc, key) => ({ ...acc, [key]: true }), {} as Record<K, true>)
  ) as any;
}

/**
 * Create a discriminated union schema
 *
 * @param discriminator - Discriminator key
 * @param options - Union options
 * @returns Discriminated union schema
 *
 * @example
 * ```typescript
 * const schema = discriminatedUnion('type', [
 *   z.object({ type: z.literal('user'), name: z.string() }),
 *   z.object({ type: z.literal('admin'), role: z.string() }),
 * ]);
 *
 * schema.parse({ type: 'user', name: 'John' }); // ✓
 * schema.parse({ type: 'admin', role: 'superadmin' }); // ✓
 * ```
 */
export function discriminatedUnion<
  K extends string,
  T extends [z.ZodDiscriminatedUnionOption<K>, ...z.ZodDiscriminatedUnionOption<K>[]]
>(
  discriminator: K,
  options: T
): z.ZodDiscriminatedUnion<K, T> {
  return z.discriminatedUnion(discriminator, options);
}

/**
 * Create an intersection of two schemas
 *
 * @param schema1 - First schema
 * @param schema2 - Second schema
 * @returns Intersection schema
 *
 * @example
 * ```typescript
 * const hasId = z.object({ id: z.string() });
 * const hasTimestamps = z.object({
 *   createdAt: z.date(),
 *   updatedAt: z.date(),
 * });
 *
 * const schema = intersection(hasId, hasTimestamps);
 * // Must satisfy both schemas
 * ```
 */
export function intersection<A extends z.ZodTypeAny, B extends z.ZodTypeAny>(
  schema1: A,
  schema2: B
): z.ZodIntersection<A, B> {
  return z.intersection(schema1, schema2);
}

/**
 * Create a union of schemas
 *
 * @param schemas - Array of schemas
 * @returns Union schema
 *
 * @example
 * ```typescript
 * const schema = union([
 *   z.string(),
 *   z.number(),
 *   z.boolean(),
 * ]);
 *
 * schema.parse('hello'); // ✓
 * schema.parse(42); // ✓
 * schema.parse(true); // ✓
 * ```
 */
export function union<T extends [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]>(
  schemas: T
): z.ZodUnion<T> {
  return z.union(schemas);
}

/**
 * Create a deep partial schema (nested objects are also partial)
 *
 * @param schema - Source schema
 * @returns Deep partial schema
 *
 * @example
 * ```typescript
 * const userSchema = z.object({
 *   name: z.string(),
 *   profile: z.object({
 *     bio: z.string(),
 *     avatar: z.string(),
 *   }),
 * });
 *
 * const deepPartialSchema = deepPartial(userSchema);
 * deepPartialSchema.parse({}); // ✓
 * deepPartialSchema.parse({ profile: { bio: 'Hello' } }); // ✓
 * ```
 */
export function deepPartial<T extends z.ZodTypeAny>(schema: T): z.ZodOptional<T> {
  return schema.deepPartial() as z.ZodOptional<T>;
}

/**
 * Create a passthrough schema that allows unknown keys
 *
 * @param schema - Source schema
 * @returns Passthrough schema
 *
 * @example
 * ```typescript
 * const strictSchema = z.object({ name: z.string() });
 * const passthroughSchema = passthrough(strictSchema);
 *
 * passthroughSchema.parse({ name: 'John', extra: 'field' }); // ✓
 * // { name: 'John', extra: 'field' }
 * ```
 */
export function passthrough<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): z.ZodObject<T, 'passthrough'> {
  return schema.passthrough();
}

/**
 * Create a strict schema that rejects unknown keys
 *
 * @param schema - Source schema
 * @returns Strict schema
 *
 * @example
 * ```typescript
 * const schema = z.object({ name: z.string() });
 * const strictSchema = strict(schema);
 *
 * strictSchema.parse({ name: 'John', extra: 'field' }); // ✗
 * ```
 */
export function strict<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): z.ZodObject<T, 'strict'> {
  return schema.strict();
}

/**
 * Create a catchall schema for handling unknown keys
 *
 * @param schema - Source schema
 * @param catchallSchema - Schema for unknown keys
 * @returns Catchall schema
 *
 * @example
 * ```typescript
 * const schema = z.object({ name: z.string() });
 * const catchallSchema = catchall(schema, z.string());
 *
 * catchallSchema.parse({
 *   name: 'John',
 *   extra1: 'value1',
 *   extra2: 'value2',
 * }); // ✓
 * ```
 */
export function catchall<T extends z.ZodRawShape, C extends z.ZodTypeAny>(
  schema: z.ZodObject<T>,
  catchallSchema: C
): z.ZodObject<T, 'strip', C> {
  return schema.catchall(catchallSchema);
}

/**
 * Create a branded type for nominal typing
 *
 * @param schema - Base schema
 * @param brand - Brand name
 * @returns Branded schema
 *
 * @example
 * ```typescript
 * const UserId = brand(z.string(), 'UserId');
 * const PostId = brand(z.string(), 'PostId');
 *
 * type UserId = z.infer<typeof UserId>; // string & { __brand: 'UserId' }
 * type PostId = z.infer<typeof PostId>; // string & { __brand: 'PostId' }
 *
 * // Prevents mixing different ID types
 * function getUser(id: UserId) { ... }
 * const userId = UserId.parse('user-123');
 * const postId = PostId.parse('post-456');
 * getUser(userId); // ✓
 * getUser(postId); // ✗ Type error
 * ```
 */
export function brand<T extends z.ZodTypeAny, B extends string>(
  schema: T,
  brand: B
): z.ZodBranded<T, B> {
  return schema.brand(brand);
}

/**
 * Create a record schema with specific key and value types
 *
 * @param keySchema - Schema for keys
 * @param valueSchema - Schema for values
 * @returns Record schema
 *
 * @example
 * ```typescript
 * const schema = record(z.string(), z.number());
 * schema.parse({ a: 1, b: 2, c: 3 }); // ✓
 *
 * const enumKeySchema = record(
 *   z.enum(['red', 'green', 'blue']),
 *   z.string()
 * );
 * ```
 */
export function record<K extends z.ZodTypeAny, V extends z.ZodTypeAny>(
  keySchema: K,
  valueSchema: V
): z.ZodRecord<K, V> {
  return z.record(keySchema, valueSchema);
}

/**
 * Wrap a schema to make it nullable
 *
 * @param schema - Base schema
 * @returns Nullable schema
 *
 * @example
 * ```typescript
 * const schema = nullable(z.string());
 * schema.parse('hello'); // 'hello'
 * schema.parse(null); // null
 * ```
 */
export function nullable<T extends z.ZodTypeAny>(schema: T): z.ZodNullable<T> {
  return schema.nullable();
}

/**
 * Wrap a schema to make it optional
 *
 * @param schema - Base schema
 * @returns Optional schema
 *
 * @example
 * ```typescript
 * const schema = optional(z.string());
 * schema.parse('hello'); // 'hello'
 * schema.parse(undefined); // undefined
 * ```
 */
export function optional<T extends z.ZodTypeAny>(schema: T): z.ZodOptional<T> {
  return schema.optional();
}
