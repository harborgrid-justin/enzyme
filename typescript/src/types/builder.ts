/**
 * TypedBuilder Pattern
 *
 * Type-safe builder pattern utilities for fluent object construction
 * with compile-time validation of required properties.
 *
 * @module types/builder
 * @category Type Utilities
 */

/**
 * Marks specific keys as set in a builder
 *
 * @template T - The target type
 * @template K - Keys that have been set
 *
 * @internal
 */
type BuilderState<T, K extends keyof T = never> = {
  __set: K;
  __type: T;
};

/**
 * Builder interface with fluent setter methods
 *
 * Creates a type-safe builder with methods for each property.
 * Tracks which properties have been set and enforces required
 * properties before building.
 *
 * @template T - The type being built
 * @template Set - Union of keys that have been set
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 *   age?: number;
 * }
 *
 * type UserBuilder = Builder<User>;
 *
 * const builder = createBuilder<User>();
 *
 * const user = builder
 *   .setId('123')
 *   .setName('John')
 *   .setEmail('john@example.com')
 *   .build(); // OK
 *
 * const invalid = builder
 *   .setId('123')
 *   .build(); // Error: name and email required
 * ```
 */
export type Builder<T, Set extends keyof T = never> = {
  [K in keyof T as `set${Capitalize<string & K>}`]: (
    value: T[K]
  ) => Builder<T, Set | K>;
} & {
  build: RequiredKeys<T> extends Set
    ? () => T
    : () => 'Error: Missing required properties';
};

/**
 * Extracts required keys from a type
 *
 * @template T - The type to analyze
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
 * Extracts optional keys from a type
 *
 * @template T - The type to analyze
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 *   email?: string;
 *   bio?: string;
 * }
 *
 * type Optional = OptionalKeys<User>; // 'email' | 'bio'
 * ```
 */
export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

/**
 * Progressive builder that requires properties in a specific order
 *
 * @template T - The target type
 * @template Keys - Ordered tuple of keys
 * @template Index - Current index in the sequence
 *
 * @example
 * ```typescript
 * interface DatabaseConfig {
 *   host: string;
 *   port: number;
 *   database: string;
 *   username: string;
 *   password: string;
 * }
 *
 * type ConfigBuilder = ProgressiveBuilder<
 *   DatabaseConfig,
 *   ['host', 'port', 'database', 'username', 'password']
 * >;
 *
 * // Must be called in order:
 * const config = builder
 *   .setHost('localhost')
 *   .setPort(5432)
 *   .setDatabase('mydb')
 *   .setUsername('admin')
 *   .setPassword('secret')
 *   .build();
 * ```
 */
export type ProgressiveBuilder<
  T,
  Keys extends readonly (keyof T)[],
  Index extends number = 0
> = Index extends Keys['length']
  ? { build: () => T }
  : Keys[Index] extends keyof T
  ? {
      [K in Keys[Index] as `set${Capitalize<string & K>}`]: (
        value: T[K]
      ) => ProgressiveBuilder<T, Keys, Inc[Index]>;
    }
  : never;

/**
 * Increment helper for progressive builder
 * @internal
 */
type Inc = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

/**
 * Immutable builder that returns new instances
 *
 * @template T - The target type
 * @template Current - The current partial state
 *
 * @example
 * ```typescript
 * interface Point {
 *   x: number;
 *   y: number;
 *   z: number;
 * }
 *
 * type PointBuilder = ImmutableBuilder<Point>;
 *
 * const builder1 = createImmutableBuilder<Point>();
 * const builder2 = builder1.setX(10);
 * const builder3 = builder2.setY(20);
 *
 * // builder1, builder2, builder3 are all different instances
 * ```
 */
export type ImmutableBuilder<T, Current = {}> = {
  [K in keyof T as `set${Capitalize<string & K>}`]: (
    value: T[K]
  ) => ImmutableBuilder<T, Current & { [P in K]: T[K] }>;
} & {
  build: Current extends T ? () => T : () => never;
  getState: () => Current;
};

/**
 * Conditional builder with validation constraints
 *
 * @template T - The target type
 * @template Constraints - Validation constraints
 *
 * @example
 * ```typescript
 * interface Payment {
 *   amount: number;
 *   currency: string;
 *   method: 'card' | 'bank';
 *   cardNumber?: string;
 *   accountNumber?: string;
 * }
 *
 * type PaymentBuilder = ConditionalBuilder<
 *   Payment,
 *   {
 *     method: 'card' ? { required: ['cardNumber'] }
 *       : method: 'bank' ? { required: ['accountNumber'] }
 *       : never
 *   }
 * >;
 * ```
 */
export type ConditionalBuilder<T, Constraints = {}> = Builder<T>;

/**
 * Nested builder for complex object structures
 *
 * @template T - The target type
 *
 * @example
 * ```typescript
 * interface Company {
 *   name: string;
 *   address: {
 *     street: string;
 *     city: string;
 *     country: string;
 *   };
 *   contact: {
 *     email: string;
 *     phone: string;
 *   };
 * }
 *
 * type CompanyBuilder = NestedBuilder<Company>;
 *
 * const company = builder
 *   .setName('Acme Corp')
 *   .withAddress(addr => addr
 *     .setStreet('123 Main St')
 *     .setCity('Springfield')
 *     .setCountry('USA')
 *   )
 *   .withContact(contact => contact
 *     .setEmail('info@acme.com')
 *     .setPhone('555-0100')
 *   )
 *   .build();
 * ```
 */
export type NestedBuilder<T, Set extends keyof T = never> = {
  [K in keyof T as T[K] extends object
    ? never
    : `set${Capitalize<string & K>}`]: (value: T[K]) => NestedBuilder<T, Set | K>;
} & {
  [K in keyof T as T[K] extends object
    ? `with${Capitalize<string & K>}`
    : never]: (
    builder: (nested: Builder<T[K]>) => Builder<T[K]>
  ) => NestedBuilder<T, Set | K>;
} & {
  build: RequiredKeys<T> extends Set ? () => T : () => never;
};

/**
 * Patch builder for partial updates
 *
 * @template T - The target type
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 *   updatedAt: Date;
 * }
 *
 * type UserPatch = PatchBuilder<User>;
 *
 * const patch = patchBuilder<User>()
 *   .setName('New Name')
 *   .setEmail('new@email.com')
 *   .build(); // Partial<User>
 * ```
 */
export type PatchBuilder<T> = {
  [K in keyof T as `set${Capitalize<string & K>}`]: (
    value: T[K]
  ) => PatchBuilder<T>;
} & {
  build: () => Partial<T>;
  reset: () => PatchBuilder<T>;
};

/**
 * Factory builder with predefined presets
 *
 * @template T - The target type
 * @template Presets - Named preset configurations
 *
 * @example
 * ```typescript
 * interface Theme {
 *   primaryColor: string;
 *   backgroundColor: string;
 *   textColor: string;
 * }
 *
 * type ThemeBuilder = FactoryBuilder<
 *   Theme,
 *   {
 *     light: { backgroundColor: 'white', textColor: 'black' };
 *     dark: { backgroundColor: 'black', textColor: 'white' };
 *   }
 * >;
 *
 * const theme = builder
 *   .fromPreset('dark')
 *   .setPrimaryColor('#007bff')
 *   .build();
 * ```
 */
export type FactoryBuilder<T, Presets extends Record<string, Partial<T>>> = {
  fromPreset: <K extends keyof Presets>(
    preset: K
  ) => Builder<T, keyof Presets[K]>;
} & Builder<T>;

/**
 * Validates that all required fields are set
 *
 * @template T - The target type
 * @template Set - Keys that have been set
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 *   email?: string;
 * }
 *
 * type Valid = ValidateBuilder<User, 'id' | 'name'>; // true
 * type Invalid = ValidateBuilder<User, 'id'>; // false
 * ```
 */
export type ValidateBuilder<T, Set extends keyof T> = RequiredKeys<T> extends Set
  ? true
  : false;

/**
 * Gets missing required fields
 *
 * @template T - The target type
 * @template Set - Keys that have been set
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 *   bio?: string;
 * }
 *
 * type Missing = MissingFields<User, 'id' | 'name'>;
 * // 'email'
 * ```
 */
export type MissingFields<T, Set extends keyof T> = Exclude<RequiredKeys<T>, Set>;

/**
 * Fluent API builder with chained methods
 *
 * @template T - The target type
 *
 * @example
 * ```typescript
 * interface QueryBuilder {
 *   select: string[];
 *   from: string;
 *   where: Record<string, any>;
 *   limit: number;
 * }
 *
 * const query = fluentBuilder<QueryBuilder>()
 *   .select(['id', 'name'])
 *   .from('users')
 *   .where({ active: true })
 *   .limit(10)
 *   .build();
 * ```
 */
export type FluentBuilder<T> = {
  [K in keyof T]: (value: T[K]) => FluentBuilder<T>;
} & {
  build: () => Partial<T>;
};
