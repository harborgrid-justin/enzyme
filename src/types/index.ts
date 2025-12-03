/**
 * @file Types Index
 * @description Central export for all shared types, utility types, and type helpers
 * @module @/types
 *
 * This module provides:
 * - API types for request/response handling
 * - Branded types for type-safe identifiers
 * - Utility types for common TypeScript patterns
 * - Conditional type helpers for enhanced inference
 *
 * @example
 * ```typescript
 * import type { UserId, ApiResponse, DeepPartial } from '@/types';
 *
 * const userId: UserId = 'user_123' as UserId;
 * const response: ApiResponse<User> = await fetchUser(userId);
 * ```
 */

import type * as React from 'react';

// =============================================================================
// API TYPES
// =============================================================================

export type {
  ApiResponse,
  ApiResponseMeta,
  PaginationMeta,
  PaginatedResponse,
  ApiErrorResponse,
  PaginationParams,
  SortParams,
  FilterParams,
  ListQueryParams,
  Timestamps,
  SoftDelete,
  BaseEntity,
  UserRef,
  AuditFields,
  FileUploadResponse,
  BatchOperationResponse,
  HealthCheckResponse,
  ApiSuccessResponse,
  ApiFailureResponse,
  HttpStatusCode,
  CacheControl,
  RateLimitInfo,
  ValidationError,
  ValidationErrorResponse,
} from './api';

// =============================================================================
// BRANDED TYPES - Nominal Typing for Enhanced Type Safety
// =============================================================================

/**
 * Brand symbol for creating nominal types
 * @internal
 */
declare const __brand: unique symbol;

/**
 * Branded type - creates a nominal type that is incompatible with its base type
 *
 * This pattern prevents accidental type confusion between semantically different
 * values that share the same structural type (e.g., UserId vs PostId, both strings)
 *
 * @template T - The base type to brand
 * @template Brand - A unique brand identifier
 *
 * @example
 * ```typescript
 * type UserId = Branded<string, 'UserId'>;
 * type PostId = Branded<string, 'PostId'>;
 *
 * const userId: UserId = 'user_123' as UserId;
 * const postId: PostId = 'post_456' as PostId;
 *
 * // This would be a compile error:
 * // const invalid: UserId = postId;
 * ```
 */
export type Branded<T, Brand extends string> = T & { readonly [__brand]: Brand };

/**
 * User identifier - branded string type
 *
 * @example
 * ```typescript
 * const userId: UserId = createUserId('usr_abc123');
 * ```
 */
export type UserId = Branded<string, 'UserId'>;

/**
 * Organization identifier - branded string type
 */
export type OrganizationId = Branded<string, 'OrganizationId'>;

/**
 * Session identifier - branded string type
 */
export type SessionId = Branded<string, 'SessionId'>;

/**
 * API key - branded string type for sensitive credentials
 */
export type ApiKey = Branded<string, 'ApiKey'>;

/**
 * Access token - branded string type for JWT/OAuth tokens
 */
export type AccessToken = Branded<string, 'AccessToken'>;

/**
 * Refresh token - branded string type
 */
export type RefreshToken = Branded<string, 'RefreshToken'>;

/**
 * Email address - branded string type
 */
export type Email = Branded<string, 'Email'>;

/**
 * UUID - branded string type for universally unique identifiers
 */
export type UUID = Branded<string, 'UUID'>;

/**
 * ISO 8601 datetime string - branded type for date/time values
 */
export type ISODateString = Branded<string, 'ISODateString'>;

/**
 * URL string - branded type for validated URLs
 */
export type URLString = Branded<string, 'URLString'>;

/**
 * Positive integer - branded number type
 */
export type PositiveInteger = Branded<number, 'PositiveInteger'>;

/**
 * Percentage value (0-100) - branded number type
 */
export type Percentage = Branded<number, 'Percentage'>;

// =============================================================================
// BRANDED TYPE FACTORIES
// =============================================================================

/**
 * Create a UserId from a string
 *
 * @param id - The raw string identifier
 * @returns A branded UserId
 *
 * @example
 * ```typescript
 * const userId = createUserId('usr_abc123');
 * ```
 */
export function createUserId(id: string): UserId {
  return id as UserId;
}

/**
 * Create a UUID from a string
 *
 * @param id - The raw UUID string
 * @returns A branded UUID
 * @throws {Error} If the string is not a valid UUID format
 */
export function createUUID(id: string): UUID {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new Error(`Invalid UUID format: ${id}`);
  }
  return id as UUID;
}

/**
 * Create an Email from a string
 *
 * @param email - The raw email string
 * @returns A branded Email
 * @throws {Error} If the string is not a valid email format
 */
export function createEmail(email: string): Email {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error(`Invalid email format: ${email}`);
  }
  return email as Email;
}

/**
 * Create an ISODateString from a Date or string
 *
 * @param date - The date to convert
 * @returns A branded ISODateString
 */
export function createISODateString(date: Date | string): ISODateString {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString() as ISODateString;
}

// =============================================================================
// UTILITY TYPES - Common TypeScript Patterns
// =============================================================================

/**
 * Prettify a type for better IntelliSense display
 *
 * Flattens intersected types into a single object type for cleaner
 * tooltips in IDE hover information
 *
 * @template T - The type to prettify
 *
 * @example
 * ```typescript
 * type Merged = { a: string } & { b: number };
 * type Pretty = Prettify<Merged>;
 * // Displays as: { a: string; b: number }
 * ```
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * Deep partial type - makes all properties optional recursively
 *
 * Unlike Partial<T>, this works on nested object properties
 *
 * @template T - The type to make deeply partial
 *
 * @example
 * ```typescript
 * interface User {
 *   name: string;
 *   profile: { bio: string; avatar: string };
 * }
 * type PartialUser = DeepPartial<User>;
 * // { name?: string; profile?: { bio?: string; avatar?: string } }
 * ```
 */
export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

/**
 * Deep required type - makes all properties required recursively
 *
 * Opposite of DeepPartial, ensures all nested properties are required
 *
 * @template T - The type to make deeply required
 */
export type DeepRequired<T> = T extends object ? { [P in keyof T]-?: DeepRequired<T[P]> } : T;

/**
 * Deep readonly type - makes all properties readonly recursively
 *
 * Ensures immutability at all levels of a nested object
 *
 * @template T - The type to make deeply readonly
 *
 * @example
 * ```typescript
 * const config: DeepReadonly<Config> = loadConfig();
 * // config.nested.value = 'new'; // Error: Cannot assign to readonly property
 * ```
 */
export type DeepReadonly<T> = T extends object
  ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
  : T;

/**
 * Make specific keys optional while keeping others required
 *
 * @template T - The object type
 * @template K - The keys to make optional
 *
 * @example
 * ```typescript
 * interface User { id: string; name: string; email: string }
 * type CreateUser = PartialBy<User, 'id'>;
 * // { id?: string; name: string; email: string }
 * ```
 */
export type PartialBy<T, K extends keyof T> = Prettify<Omit<T, K> & Partial<Pick<T, K>>>;

/**
 * Make specific keys required while keeping others as-is
 *
 * @template T - The object type
 * @template K - The keys to make required
 *
 * @example
 * ```typescript
 * interface Config { host?: string; port?: number }
 * type RequiredConfig = RequiredBy<Config, 'host'>;
 * // { host: string; port?: number }
 * ```
 */
export type RequiredBy<T, K extends keyof T> = Prettify<Omit<T, K> & Required<Pick<T, K>>>;

/**
 * Extract the value type from a Record type
 *
 * @template T - A Record type
 *
 * @example
 * ```typescript
 * type UserRecord = Record<string, User>;
 * type UserType = ValueOf<UserRecord>; // User
 * ```
 */
export type ValueOf<T> = T[keyof T];

/**
 * Extract array element type
 *
 * @template T - An array type
 *
 * @example
 * ```typescript
 * type Users = User[];
 * type SingleUser = ArrayElement<Users>; // User
 * ```
 */
export type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;

/**
 * Create a union type from array values (for const arrays)
 *
 * @template T - A readonly array type
 *
 * @example
 * ```typescript
 * const roles = ['admin', 'user', 'guest'] as const;
 * type Role = ArrayValues<typeof roles>; // 'admin' | 'user' | 'guest'
 * ```
 */
export type ArrayValues<T extends readonly unknown[]> = T[number];

/**
 * Exclude null and undefined from a type
 *
 * @template T - The type to make non-nullable
 */
export type NonNullableDeep<T> = T extends object
  ? { [P in keyof T]: NonNullableDeep<NonNullable<T[P]>> }
  : NonNullable<T>;

/**
 * Extract keys of a type that match a value type
 *
 * @template T - The object type
 * @template V - The value type to match
 *
 * @example
 * ```typescript
 * interface User { id: string; name: string; age: number }
 * type StringKeys = KeysOfType<User, string>; // 'id' | 'name'
 * ```
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/**
 * Pick properties of a specific type
 *
 * @template T - The object type
 * @template V - The value type to pick
 *
 * @example
 * ```typescript
 * interface User { id: string; name: string; age: number }
 * type StringProps = PickByType<User, string>; // { id: string; name: string }
 * ```
 */
export type PickByType<T, V> = Pick<T, KeysOfType<T, V>>;

/**
 * Omit properties of a specific type
 *
 * @template T - The object type
 * @template V - The value type to omit
 */
export type OmitByType<T, V> = Omit<T, KeysOfType<T, V>>;

/**
 * Make properties mutable (remove readonly)
 *
 * @template T - The type with readonly properties
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Deep mutable type - removes readonly from all nested properties
 *
 * @template T - The type to make mutable
 */
export type DeepMutable<T> = T extends object ? { -readonly [P in keyof T]: DeepMutable<T[P]> } : T;

// =============================================================================
// FUNCTION TYPES
// =============================================================================

/**
 * Extract parameter types from a function
 *
 * @template T - A function type
 */
export type FunctionParameters<T extends (...args: unknown[]) => unknown> = Parameters<T>;

/**
 * Extract return type from a function, unwrapping Promise if async
 *
 * @template T - A function type
 *
 * @example
 * ```typescript
 * async function fetchUser(): Promise<User> { ... }
 * type Result = AsyncReturnType<typeof fetchUser>; // User
 * ```
 */
export type AsyncReturnType<T extends (...args: unknown[]) => unknown> =
  ReturnType<T> extends Promise<infer R> ? R : ReturnType<T>;

/**
 * Create a typed event handler function type
 *
 * @template E - The event type
 *
 * @example
 * ```typescript
 * type ClickHandler = EventHandler<MouseEvent>;
 * ```
 */
export type EventHandler<E extends Event = Event> = (event: E) => void;

/**
 * Callback function with typed result
 *
 * @template T - The result type
 * @template E - The error type (defaults to Error)
 */
export type Callback<T, E = Error> = (error: E | null, result?: T) => void;

// =============================================================================
// CONDITIONAL TYPES
// =============================================================================

/**
 * Check if type T is exactly type U (not just assignable)
 *
 * @template T - First type to compare
 * @template U - Second type to compare
 *
 * @example
 * ```typescript
 * type Test1 = Equals<string, string>; // true
 * type Test2 = Equals<string, 'hello'>; // false
 * ```
 */
export type Equals<T, U> =
  (<G>() => G extends T ? 1 : 2) extends <G>() => G extends U ? 1 : 2 ? true : false;

/**
 * Conditional type that resolves based on whether T is assignable to U
 *
 * @template T - The type to check
 * @template U - The type to check against
 * @template Then - Type to return if true
 * @template Else - Type to return if false
 */
export type If<T, U, Then, Else> = T extends U ? Then : Else;

/**
 * Check if a type is never
 *
 * @template T - The type to check
 */
export type IsNever<T> = [T] extends [never] ? true : false;

/**
 * Check if a type is unknown
 *
 * @template T - The type to check
 */
export type IsUnknown<T> = unknown extends T ? (IsNever<T> extends true ? false : true) : false;

/**
 * Check if a type is any
 *
 * @template T - The type to check
 */
export type IsAny<T> = 0 extends 1 & T ? true : false;

/**
 * Exclude properties with never values
 *
 * @template T - The object type to filter
 */
export type ExcludeNever<T> = {
  [K in keyof T as T[K] extends never ? never : K]: T[K];
};

// =============================================================================
// OBJECT MANIPULATION TYPES
// =============================================================================

/**
 * Merge two types, with the second type taking precedence
 *
 * @template T - Base type
 * @template U - Override type
 *
 * @example
 * ```typescript
 * type Base = { a: string; b: number };
 * type Override = { b: string; c: boolean };
 * type Merged = Merge<Base, Override>;
 * // { a: string; b: string; c: boolean }
 * ```
 */
export type Merge<T, U> = Prettify<Omit<T, keyof U> & U>;

/**
 * Create a type with only the shared keys between two types
 *
 * @template T - First type
 * @template U - Second type
 */
export type Intersection<T, U> = Pick<T, Extract<keyof T, keyof U>>;

/**
 * Create a type with keys that exist in T but not in U
 *
 * @template T - Base type
 * @template U - Type to diff against
 */
export type Diff<T, U> = Pick<T, Exclude<keyof T, keyof U>>;

/**
 * Rename keys in an object type
 *
 * @template T - The object type
 * @template KeyMap - A mapping of old keys to new keys
 *
 * @example
 * ```typescript
 * type User = { firstName: string; lastName: string };
 * type Renamed = RenameKeys<User, { firstName: 'first'; lastName: 'last' }>;
 * // { first: string; last: string }
 * ```
 */
export type RenameKeys<T, KeyMap extends Record<string, string>> = {
  [K in keyof T as K extends keyof KeyMap ? KeyMap[K] : K]: T[K];
};

// =============================================================================
// STRING LITERAL TYPES
// =============================================================================

/**
 * Convert a string literal type to uppercase
 *
 * @template S - The string literal type
 */
export type UpperCase<S extends string> = Uppercase<S>;

/**
 * Convert a string literal type to lowercase
 *
 * @template S - The string literal type
 */
export type LowerCase<S extends string> = Lowercase<S>;

/**
 * Capitalize the first letter of a string literal type
 *
 * @template S - The string literal type
 */
export type CapitalizeString<S extends string> = Capitalize<S>;

/**
 * Uncapitalize the first letter of a string literal type
 *
 * @template S - The string literal type
 */
export type UncapitalizeString<S extends string> = Uncapitalize<S>;

/**
 * Split a string literal by a delimiter
 *
 * @template S - The string to split
 * @template D - The delimiter
 *
 * @example
 * ```typescript
 * type Parts = Split<'a/b/c', '/'>; // ['a', 'b', 'c']
 * ```
 */
export type Split<S extends string, D extends string> = S extends `${infer Head}${D}${infer Tail}`
  ? [Head, ...Split<Tail, D>]
  : [S];

/**
 * Join string literal types with a delimiter
 *
 * @template T - Array of string literals
 * @template D - The delimiter
 *
 * @example
 * ```typescript
 * type Joined = Join<['a', 'b', 'c'], '-'>; // 'a-b-c'
 * ```
 */
export type Join<T extends readonly string[], D extends string> = T extends readonly []
  ? ''
  : T extends readonly [infer F extends string]
    ? F
    : T extends readonly [infer F extends string, ...infer R extends string[]]
      ? `${F}${D}${Join<R, D>}`
      : never;

// =============================================================================
// TUPLE TYPES
// =============================================================================

/**
 * Get the first element type of a tuple
 *
 * @template T - A tuple type
 */
export type Head<T extends readonly unknown[]> = T extends readonly [infer H, ...unknown[]]
  ? H
  : never;

/**
 * Get all elements except the first from a tuple
 *
 * @template T - A tuple type
 */
export type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer R]
  ? R
  : never;

/**
 * Get the last element type of a tuple
 *
 * @template T - A tuple type
 */
export type Last<T extends readonly unknown[]> = T extends readonly [...unknown[], infer L]
  ? L
  : never;

/**
 * Get the length of a tuple type
 *
 * @template T - A tuple type
 */
export type Length<T extends readonly unknown[]> = T['length'];

/**
 * Prepend an element to a tuple type
 *
 * @template T - A tuple type
 * @template E - The element to prepend
 */
export type Prepend<T extends readonly unknown[], E> = [E, ...T];

/**
 * Append an element to a tuple type
 *
 * @template T - A tuple type
 * @template E - The element to append
 */
export type Append<T extends readonly unknown[], E> = [...T, E];

// =============================================================================
// REACT-SPECIFIC TYPES
// =============================================================================

/**
 * Props type for a React component
 *
 * @template T - A React component type
 */
export type PropsOf<T extends React.ComponentType<never>> =
  T extends React.ComponentType<infer P> ? P : never;

/**
 * Children-only props
 */
export interface ChildrenProps {
  readonly children: React.ReactNode;
}

/**
 * Optional children props
 */
export interface OptionalChildrenProps {
  readonly children?: React.ReactNode;
}

/**
 * Class name prop
 */
export interface ClassNameProps {
  readonly className?: string;
}

/**
 * Style prop
 */
export interface StyleProps {
  readonly style?: React.CSSProperties;
}

/**
 * Common HTML element props
 */
export type HTMLProps<E extends HTMLElement = HTMLElement> = React.HTMLAttributes<E> &
  ClassNameProps &
  StyleProps;

/**
 * Polymorphic component props - supports "as" prop for element type
 *
 * @template E - The default element type
 * @template P - Additional props
 *
 * @example
 * ```typescript
 * type ButtonProps = PolymorphicProps<'button', { variant: 'primary' | 'secondary' }>;
 * // Supports: <Button as="a" href="..." variant="primary" />
 * ```
 */
export type PolymorphicProps<E extends React.ElementType, P extends object = object> = Omit<
  P & React.ComponentPropsWithRef<E>,
  keyof P | 'as'
> &
  PolymorphicAs<E>;

type PolymorphicAs<E extends React.ElementType> = {
  readonly as?: E;
};

// =============================================================================
// FORM & VALIDATION TYPES
// =============================================================================

/**
 * Form field state
 *
 * @template T - The field value type
 */
export interface FieldState<T> {
  readonly value: T;
  readonly error?: string;
  readonly touched: boolean;
  readonly dirty: boolean;
}

/**
 * Form state derived from a schema
 *
 * @template T - The form values type
 */
export type FormState<T extends Record<string, unknown>> = {
  readonly [K in keyof T]: FieldState<T[K]>;
};

/**
 * Validation result
 *
 * @template T - The validated value type
 */
export type ValidationResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly errors: readonly string[] };

// =============================================================================
// ASYNC TYPES
// =============================================================================

/**
 * Async state for data fetching
 *
 * @template T - The data type
 * @template E - The error type
 */
export type AsyncState<T, E = Error> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'error'; readonly error: E };

/**
 * Resource state with loading, error, and data
 *
 * @template T - The resource data type
 */
export interface Resource<T> {
  readonly data: T | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: Error | null;
  readonly isSuccess: boolean;
}

/**
 * Unwrap a Promise type
 *
 * @template T - A Promise type
 */
export type Awaited<T> = T extends Promise<infer R> ? Awaited<R> : T;

/**
 * Make a type promisified
 *
 * @template T - The type to wrap in Promise
 */
export type Promisify<T> = Promise<T>;

/**
 * Make all methods of an object async
 *
 * @template T - An object with methods
 */
export type AsyncMethods<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => Promise<R> : T[K];
};

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard result type
 *
 * @template T - The type being guarded
 */
export type TypeGuard<T> = (value: unknown) => value is T;

/**
 * Assert function type
 *
 * @template T - The type being asserted
 */
export type AssertFunction<T> = (value: unknown, message?: string) => asserts value is T;

/**
 * Check if value is defined (not null or undefined)
 *
 * @param value - The value to check
 * @returns True if value is defined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if value is a non-empty string
 *
 * @param value - The value to check
 * @returns True if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Check if value is a plain object
 *
 * @param value - The value to check
 * @returns True if value is a plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Assert that a value is never (for exhaustive checks)
 *
 * @param value - The value that should be never
 * @param message - Optional error message
 * @throws {Error} Always throws, as this should be unreachable
 *
 * @example
 * ```typescript
 * switch (status) {
 *   case 'pending': return 'Pending';
 *   case 'complete': return 'Complete';
 *   default: assertNever(status);
 * }
 * ```
 */
export function assertNever(value: never, message?: string): never {
  throw new Error(message ?? `Unexpected value: ${String(value)}`);
}

// =============================================================================
// BUILDER PATTERN TYPES
// =============================================================================

/**
 * Builder pattern - chain method return type
 *
 * @template T - The builder class
 */
export type Chainable<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? R extends void
      ? (...args: A) => Chainable<T>
      : (...args: A) => R
    : T[K];
};

/**
 * Create a builder type from an interface
 *
 * @template T - The interface to create a builder for
 */
export type Builder<T> = {
  [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => Builder<T>;
} & {
  build: () => T;
};

// =============================================================================
// RE-EXPORTS FOR CONVENIENCE
// =============================================================================

/**
 * Standard React import types re-exported for convenience
 */
export type {
  ComponentType,
  ReactNode,
  ReactElement,
  FC,
  PropsWithChildren,
  MouseEvent,
  KeyboardEvent,
  ChangeEvent,
  FormEvent,
} from 'react';
