/**
 * Branded/Nominal Types
 *
 * Type-safe branded types for creating distinct types from primitives.
 * Prevents accidental mixing of semantically different values with the same underlying type.
 *
 * @module types/brand
 * @category Type Utilities
 */

/**
 * Brand symbol used to tag branded types
 * @internal
 */
declare const __brand: unique symbol;

/**
 * Creates a branded type from a base type
 *
 * Branded types are structurally identical to their base type but
 * are treated as distinct types by TypeScript's type system.
 *
 * @template T - The base type to brand
 * @template Brand - The brand identifier (typically a string literal)
 *
 * @example
 * ```typescript
 * type UserId = Brand<string, 'UserId'>;
 * type ProductId = Brand<string, 'ProductId'>;
 *
 * const userId: UserId = 'user-123' as UserId;
 * const productId: ProductId = 'prod-456' as ProductId;
 *
 * // Type error: Type 'UserId' is not assignable to type 'ProductId'
 * const invalid: ProductId = userId;
 * ```
 */
export type Brand<T, Brand extends string> = T & {
  readonly [__brand]: Brand;
};

/**
 * Creates a nominal type with multiple brands
 *
 * Allows stacking multiple brand identifiers on a single type
 * for more complex type relationships.
 *
 * @template T - The base type
 * @template Brands - Tuple of brand identifiers
 *
 * @example
 * ```typescript
 * type ValidatedEmail = MultiBrand<string, ['Email', 'Validated']>;
 * type UnvalidatedEmail = Brand<string, 'Email'>;
 *
 * const email: ValidatedEmail = 'user@example.com' as ValidatedEmail;
 *
 * function sendEmail(to: ValidatedEmail): void {
 *   // Only accepts validated emails
 * }
 * ```
 */
export type MultiBrand<T, Brands extends readonly string[]> = T & {
  readonly [__brand]: Brands;
};

/**
 * Extracts the base type from a branded type
 *
 * @template T - The branded type
 *
 * @example
 * ```typescript
 * type UserId = Brand<string, 'UserId'>;
 * type Base = Unbrand<UserId>; // string
 * ```
 */
export type Unbrand<T> = T extends Brand<infer U, any> ? U : T;

/**
 * Checks if a type is branded
 *
 * @template T - The type to check
 *
 * @example
 * ```typescript
 * type UserId = Brand<string, 'UserId'>;
 * type Check1 = IsBranded<UserId>; // true
 * type Check2 = IsBranded<string>; // false
 * ```
 */
export type IsBranded<T> = typeof __brand extends keyof T ? true : false;

/**
 * Branded string type
 *
 * @template Brand - The brand identifier
 *
 * @example
 * ```typescript
 * type Email = BrandedString<'Email'>;
 * type Username = BrandedString<'Username'>;
 *
 * const email: Email = 'user@example.com' as Email;
 * const username: Username = email; // Type error
 * ```
 */
export type BrandedString<Brand extends string> = Brand<string, Brand>;

/**
 * Branded number type
 *
 * @template Brand - The brand identifier
 *
 * @example
 * ```typescript
 * type Percentage = BrandedNumber<'Percentage'>;
 * type Dollars = BrandedNumber<'Dollars'>;
 *
 * const percent: Percentage = 95.5 as Percentage;
 * const price: Dollars = percent; // Type error
 * ```
 */
export type BrandedNumber<Brand extends string> = Brand<number, Brand>;

/**
 * Branded integer type (runtime validation not included)
 *
 * @template Brand - The brand identifier
 *
 * @example
 * ```typescript
 * type Count = BrandedInteger<'Count'>;
 * type Index = BrandedInteger<'Index'>;
 *
 * const count: Count = 42 as Count;
 * const index: Index = count; // Type error
 * ```
 */
export type BrandedInteger<Brand extends string> = Brand<number, Brand>;

/**
 * Branded boolean type
 *
 * @template Brand - The brand identifier
 *
 * @example
 * ```typescript
 * type Validated = BrandedBoolean<'Validated'>;
 * type Authorized = BrandedBoolean<'Authorized'>;
 *
 * const validated: Validated = true as Validated;
 * const authorized: Authorized = validated; // Type error
 * ```
 */
export type BrandedBoolean<Brand extends string> = Brand<boolean, Brand>;

/**
 * Branded array type
 *
 * @template T - The element type
 * @template Brand - The brand identifier
 *
 * @example
 * ```typescript
 * type SortedArray<T> = BrandedArray<T, 'Sorted'>;
 * type UniqueArray<T> = BrandedArray<T, 'Unique'>;
 *
 * const sorted: SortedArray<number> = [1, 2, 3] as SortedArray<number>;
 * const unique: UniqueArray<number> = sorted; // Type error
 * ```
 */
export type BrandedArray<T, Brand extends string> = Brand<T[], Brand>;

/**
 * Nominal type using class-based approach
 *
 * Alternative to Brand that uses a phantom type parameter.
 * Useful when you need runtime type guards.
 *
 * @template T - The base type
 * @template Tag - The nominal tag
 *
 * @example
 * ```typescript
 * type UUID = Nominal<string, 'UUID'>;
 * type Email = Nominal<string, 'Email'>;
 *
 * function createUUID(value: string): UUID {
 *   return value as UUID;
 * }
 *
 * const uuid = createUUID('550e8400-e29b-41d4-a716-446655440000');
 * const email: Email = uuid; // Type error
 * ```
 */
export type Nominal<T, Tag extends string> = T & {
  readonly __nominal: Tag;
};

/**
 * Opaque type that completely hides the underlying structure
 *
 * Creates a type that cannot be constructed directly and must
 * use factory functions. Provides the strongest type safety.
 *
 * @template T - The base type
 * @template Tag - The opaque identifier
 *
 * @example
 * ```typescript
 * type ApiToken = Opaque<string, 'ApiToken'>;
 *
 * namespace ApiToken {
 *   export function create(value: string): ApiToken {
 *     // Validate token format
 *     if (!/^[A-Za-z0-9-_]+$/.test(value)) {
 *       throw new Error('Invalid token format');
 *     }
 *     return value as ApiToken;
 *   }
 *
 *   export function unwrap(token: ApiToken): string {
 *     return token as string;
 *   }
 * }
 *
 * const token = ApiToken.create('valid-token-123');
 * const invalid: ApiToken = 'just-a-string'; // Type error
 * ```
 */
export type Opaque<T, Tag extends string> = T & {
  readonly __opaque: Tag;
  readonly __value: never;
};

/**
 * Flavored type - a weaker form of branding
 *
 * Unlike Brand, flavored types can be assigned from their base type
 * without explicit casting, but maintain distinction in return types.
 *
 * @template T - The base type
 * @template Flavor - The flavor identifier
 *
 * @example
 * ```typescript
 * type Kilometers = Flavor<number, 'Kilometers'>;
 * type Miles = Flavor<number, 'Miles'>;
 *
 * function calculateDistance(km: Kilometers): Miles {
 *   return (km * 0.621371) as Miles;
 * }
 *
 * const distance = calculateDistance(100); // Works without 'as Kilometers'
 * ```
 */
export type Flavor<T, Flavor extends string> = T & {
  readonly __flavor?: Flavor;
};

/**
 * Type guard helper for branded types
 *
 * @template T - The branded type
 *
 * @example
 * ```typescript
 * type UserId = Brand<string, 'UserId'>;
 *
 * type UserIdGuard = TypeGuard<UserId>;
 * // (value: unknown) => value is UserId
 *
 * const isUserId: UserIdGuard = (value): value is UserId => {
 *   return typeof value === 'string' && value.startsWith('user-');
 * };
 * ```
 */
export type TypeGuard<T> = (value: unknown) => value is T;

/**
 * Extracts the brand identifier from a branded type
 *
 * @template T - The branded type
 *
 * @example
 * ```typescript
 * type UserId = Brand<string, 'UserId'>;
 * type BrandName = ExtractBrand<UserId>; // 'UserId'
 * ```
 */
export type ExtractBrand<T> = T extends Brand<any, infer B>
  ? B
  : T extends Nominal<any, infer N>
  ? N
  : T extends Opaque<any, infer O>
  ? O
  : never;
