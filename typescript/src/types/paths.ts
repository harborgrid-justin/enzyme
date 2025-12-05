/**
 * Type-Safe Path Utilities
 *
 * Advanced utilities for type-safe object path access using dot notation
 * and path-based type extraction.
 *
 * @module types/paths
 * @category Type Utilities
 */

/**
 * Generates all possible paths through an object type
 *
 * Creates a union of string literals representing valid dot-notation
 * paths to all leaf values in the object.
 *
 * @template T - The object type to generate paths for
 * @template Depth - Maximum depth to traverse (default: 10)
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
 *     };
 *   };
 *   tags: string[];
 * }
 *
 * type UserPaths = Path<User>;
 * // 'id' | 'profile' | 'profile.name' | 'profile.email' |
 * // 'profile.settings' | 'profile.settings.theme' | 'tags'
 *
 * function get<P extends UserPaths>(path: P): PathValue<User, P> {
 *   // Implementation
 * }
 *
 * const name = get('profile.name'); // string
 * const theme = get('profile.settings.theme'); // string
 * ```
 */
export type Path<T, Depth extends number = 10> = Depth extends 0
  ? never
  : T extends object
  ? {
      [K in keyof T]-?: K extends string | number
        ? T[K] extends object
          ? T[K] extends Array<any>
            ? `${K}` | `${K}.${Path<T[K], Prev[Depth]>}`
            : `${K}` | `${K}.${Path<T[K], Prev[Depth]>}`
          : `${K}`
        : never;
    }[keyof T]
  : never;

/**
 * Helper type for depth counting
 * @internal
 */
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Generates paths to leaf values only (no intermediate objects)
 *
 * @template T - The object type
 * @template Depth - Maximum depth to traverse
 *
 * @example
 * ```typescript
 * interface Config {
 *   database: {
 *     host: string;
 *     port: number;
 *   };
 * }
 *
 * type Leaves = LeafPath<Config>;
 * // 'database.host' | 'database.port'
 * // (excludes 'database')
 * ```
 */
export type LeafPath<T, Depth extends number = 10> = Depth extends 0
  ? never
  : T extends object
  ? {
      [K in keyof T]-?: T[K] extends object
        ? T[K] extends Array<any>
          ? `${K & string}`
          : `${K & string}.${LeafPath<T[K], Prev[Depth]>}`
        : `${K & string}`;
    }[keyof T]
  : never;

/**
 * Extracts the type at a given path
 *
 * @template T - The object type
 * @template P - The path as a string literal
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   profile: {
 *     name: string;
 *     age: number;
 *   };
 * }
 *
 * type Name = PathValue<User, 'profile.name'>; // string
 * type Age = PathValue<User, 'profile.age'>; // number
 * type Profile = PathValue<User, 'profile'>; // { name: string; age: number }
 *
 * function getValue<P extends Path<User>>(
 *   obj: User,
 *   path: P
 * ): PathValue<User, P> {
 *   // Implementation with type-safe return
 * }
 * ```
 */
export type PathValue<T, P extends string> = P extends keyof T
  ? T[P]
  : P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<T[K], Rest>
    : never
  : never;

/**
 * Creates a type with a value set at a specific path
 *
 * @template T - The base object type
 * @template P - The path to set
 * @template V - The value type to set
 *
 * @example
 * ```typescript
 * interface User {
 *   profile: {
 *     name: string;
 *   };
 * }
 *
 * type Updated = SetPath<User, 'profile.name', number>;
 * // { profile: { name: number } }
 * ```
 */
export type SetPath<T, P extends string, V> = P extends keyof T
  ? Omit<T, P> & { [K in P]: V }
  : P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? Omit<T, K> & { [Key in K]: SetPath<T[K], Rest, V> }
    : T
  : T;

/**
 * Array index path utilities
 *
 * @template T - The array type
 *
 * @example
 * ```typescript
 * interface Data {
 *   items: Array<{
 *     id: string;
 *     name: string;
 *   }>;
 * }
 *
 * type ItemPath = Path<Data>;
 * // 'items' | 'items.0' | 'items.0.id' | 'items.0.name' | ...
 *
 * type ItemId = PathValue<Data, 'items.0.id'>; // string
 * ```
 */
export type ArrayPath<T extends readonly any[]> = T extends readonly (infer U)[]
  ? `${number}` | `${number}.${Path<U>}`
  : never;

/**
 * Generates all paths with their corresponding value types
 *
 * @template T - The object type
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   age: number;
 *   profile: {
 *     name: string;
 *   };
 * }
 *
 * type Paths = PathsWithType<User>;
 * // {
 * //   id: string;
 * //   age: number;
 * //   profile: { name: string };
 * //   'profile.name': string;
 * // }
 * ```
 */
export type PathsWithType<T, Depth extends number = 10> = Depth extends 0
  ? {}
  : T extends object
  ? {
      [K in keyof T]-?: T[K] extends object
        ? { [P in K]: T[K] } & {
            [P in `${K & string}.${Path<T[K], Prev[Depth]>}`]: PathValue<
              T[K],
              P extends `${K & string}.${infer Rest}` ? Rest : never
            >;
          }
        : { [P in K]: T[K] };
    }[keyof T]
  : {};

/**
 * Gets all paths that have values of a specific type
 *
 * @template T - The object type
 * @template V - The value type to match
 *
 * @example
 * ```typescript
 * interface Data {
 *   id: string;
 *   count: number;
 *   nested: {
 *     name: string;
 *     value: number;
 *   };
 * }
 *
 * type StringPaths = PathsOfType<Data, string>;
 * // 'id' | 'nested.name'
 *
 * type NumberPaths = PathsOfType<Data, number>;
 * // 'count' | 'nested.value'
 * ```
 */
export type PathsOfType<T, V, Depth extends number = 10> = {
  [K in Path<T, Depth>]: PathValue<T, K> extends V ? K : never;
}[Path<T, Depth>];

/**
 * Splits a path string into tuple of segments
 *
 * @template P - The path string
 *
 * @example
 * ```typescript
 * type Segments = SplitPath<'user.profile.name'>;
 * // ['user', 'profile', 'name']
 * ```
 */
export type SplitPath<P extends string> = P extends `${infer Head}.${infer Tail}`
  ? [Head, ...SplitPath<Tail>]
  : [P];

/**
 * Joins path segments into a dot-notation string
 *
 * @template Parts - Tuple of path segments
 *
 * @example
 * ```typescript
 * type Joined = JoinPath<['user', 'profile', 'name']>;
 * // 'user.profile.name'
 * ```
 */
export type JoinPath<Parts extends readonly string[]> = Parts extends readonly [
  infer Head,
  ...infer Tail
]
  ? Head extends string
    ? Tail extends readonly string[]
      ? Tail extends readonly []
        ? Head
        : `${Head}.${JoinPath<Tail>}`
      : never
    : never
  : never;

/**
 * Gets the parent path of a given path
 *
 * @template P - The path string
 *
 * @example
 * ```typescript
 * type Parent = ParentPath<'user.profile.name'>;
 * // 'user.profile'
 * ```
 */
export type ParentPath<P extends string> = P extends `${infer Parent}.${infer _}`
  ? Parent extends `${string}.${string}`
    ? Parent
    : Parent
  : never;

/**
 * Gets the leaf segment of a path
 *
 * @template P - The path string
 *
 * @example
 * ```typescript
 * type Leaf = LeafSegment<'user.profile.name'>;
 * // 'name'
 * ```
 */
export type LeafSegment<P extends string> = P extends `${infer _}.${infer Rest}`
  ? LeafSegment<Rest>
  : P;

/**
 * Validates that a path exists in a type
 *
 * @template T - The object type
 * @template P - The path to validate
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   profile: {
 *     name: string;
 *   };
 * }
 *
 * type Valid = ValidPath<User, 'profile.name'>; // 'profile.name'
 * type Invalid = ValidPath<User, 'invalid.path'>; // never
 * ```
 */
export type ValidPath<T, P extends string> = P extends Path<T> ? P : never;

/**
 * Type-safe path builder
 *
 * @template T - The object type
 *
 * @example
 * ```typescript
 * interface User {
 *   profile: {
 *     settings: {
 *       theme: string;
 *     };
 *   };
 * }
 *
 * type Builder = PathBuilder<User>;
 * // {
 * //   profile: {
 * //     settings: {
 * //       theme: 'profile.settings.theme'
 * //     }
 * //   }
 * // }
 * ```
 */
export type PathBuilder<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T]: T[K] extends object
        ? PathBuilder<T[K], Prefix extends '' ? `${K & string}` : `${Prefix}.${K & string}`>
        : Prefix extends ''
        ? `${K & string}`
        : `${Prefix}.${K & string}`;
    }
  : Prefix;

/**
 * Depth of a path (number of segments)
 *
 * @template P - The path string
 *
 * @example
 * ```typescript
 * type Depth1 = PathDepth<'user'>; // 1
 * type Depth3 = PathDepth<'user.profile.name'>; // 3
 * ```
 */
export type PathDepth<P extends string> = SplitPath<P>['length'];
