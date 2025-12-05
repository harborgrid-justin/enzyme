/**
 * Option type for null-safe operations.
 *
 * Inspired by Rust's Option<T>, this provides a type-safe way to handle
 * nullable values without using null or undefined.
 *
 * @example
 * ```typescript
 * function findUser(id: string): Option<User> {
 *   const user = database.get(id);
 *   return user ? Option.some(user) : Option.none();
 * }
 *
 * const userOption = findUser('123');
 * const username = Option.map(userOption, user => user.name);
 * const displayName = Option.unwrapOr(username, 'Anonymous');
 * ```
 *
 * @module core/option
 */

/**
 * Represents a value that exists.
 */
export interface Some<T> {
  readonly kind: 'some';
  readonly value: T;
}

/**
 * Represents the absence of a value.
 */
export interface None {
  readonly kind: 'none';
}

/**
 * An Option type that represents either a value (Some) or no value (None).
 *
 * @template T - The type of the contained value
 */
export type Option<T> = Some<T> | None;

/**
 * Type guard to check if an Option is Some.
 *
 * @param option - The option to check
 * @returns True if the option is Some
 */
export function isSome<T>(option: Option<T>): option is Some<T> {
  return option.kind === 'some';
}

/**
 * Type guard to check if an Option is None.
 *
 * @param option - The option to check
 * @returns True if the option is None
 */
export function isNone<T>(option: Option<T>): option is None {
  return option.kind === 'none';
}

/**
 * Pattern matching interface for Option.
 */
export interface OptionMatcher<T, R> {
  some: (value: T) => R;
  none: () => R;
}

/**
 * Namespace containing Option utility functions.
 */
export namespace Option {
  /**
   * Creates an Option containing a value.
   *
   * @param value - The value to wrap
   * @returns A Some Option
   *
   * @example
   * ```typescript
   * const opt = Option.some(42);
   * console.log(opt.value); // 42
   * ```
   */
  export function some<T>(value: T): Option<T> {
    return { kind: 'some', value };
  }

  /**
   * Creates an Option representing no value.
   *
   * @returns A None Option
   *
   * @example
   * ```typescript
   * const opt = Option.none<number>();
   * console.log(opt.kind); // 'none'
   * ```
   */
  export function none<T = never>(): Option<T> {
    return { kind: 'none' };
  }

  /**
   * Creates an Option from a nullable value.
   *
   * @param value - The nullable value
   * @returns Some if value is not null/undefined, None otherwise
   *
   * @example
   * ```typescript
   * const opt1 = Option.from(42); // Some(42)
   * const opt2 = Option.from(null); // None
   * const opt3 = Option.from(undefined); // None
   * ```
   */
  export function from<T>(value: T | null | undefined): Option<T> {
    return value != null ? some(value) : none();
  }

  /**
   * Creates an Option from a value using a predicate.
   *
   * @param value - The value to test
   * @param predicate - Function to test the value
   * @returns Some if predicate returns true, None otherwise
   *
   * @example
   * ```typescript
   * const opt = Option.fromPredicate(5, x => x > 0);
   * // Some(5)
   * ```
   */
  export function fromPredicate<T>(
    value: T,
    predicate: (value: T) => boolean
  ): Option<T> {
    return predicate(value) ? some(value) : none();
  }

  /**
   * Pattern matching for Option types.
   *
   * @param option - The option to match against
   * @param matcher - Object with some and none handlers
   * @returns The result of the matched handler
   *
   * @example
   * ```typescript
   * const opt = Option.some(42);
   * const message = Option.match(opt, {
   *   some: (value) => `Value: ${value}`,
   *   none: () => 'No value',
   * });
   * ```
   */
  export function match<T, R>(
    option: Option<T>,
    matcher: OptionMatcher<T, R>
  ): R {
    return option.kind === 'some' ? matcher.some(option.value) : matcher.none();
  }

  /**
   * Maps an Option's value to a new value.
   *
   * @param option - The option to map
   * @param fn - The mapping function
   * @returns A new Option with the mapped value
   *
   * @example
   * ```typescript
   * const opt = Option.some(5);
   * const doubled = Option.map(opt, x => x * 2);
   * // Some(10)
   * ```
   */
  export function map<T, U>(option: Option<T>, fn: (value: T) => U): Option<U> {
    return option.kind === 'some' ? some(fn(option.value)) : none();
  }

  /**
   * Maps an Option's value to a new Option.
   *
   * @param option - The option to map
   * @param fn - Function that returns an Option
   * @returns The result of the function or None
   *
   * @example
   * ```typescript
   * const opt = Option.some('5');
   * const parsed = Option.andThen(opt, (str) => {
   *   const num = parseInt(str);
   *   return isNaN(num) ? Option.none() : Option.some(num);
   * });
   * ```
   */
  export function andThen<T, U>(
    option: Option<T>,
    fn: (value: T) => Option<U>
  ): Option<U> {
    return option.kind === 'some' ? fn(option.value) : none();
  }

  /**
   * Alias for andThen. Maps an Option's value to a new Option.
   */
  export const flatMap = andThen;

  /**
   * Filters an Option based on a predicate.
   *
   * @param option - The option to filter
   * @param predicate - The filter predicate
   * @returns The original Some if predicate is true, None otherwise
   *
   * @example
   * ```typescript
   * const opt = Option.some(5);
   * const filtered = Option.filter(opt, x => x > 3);
   * // Some(5)
   * ```
   */
  export function filter<T>(
    option: Option<T>,
    predicate: (value: T) => boolean
  ): Option<T> {
    return option.kind === 'some' && predicate(option.value) ? option : none();
  }

  /**
   * Returns the value or a default value.
   *
   * @param option - The option to unwrap
   * @param defaultValue - The default value to return if None
   * @returns The contained value or default
   *
   * @example
   * ```typescript
   * const opt = Option.none<number>();
   * const value = Option.unwrapOr(opt, 0); // 0
   * ```
   */
  export function unwrapOr<T>(option: Option<T>, defaultValue: T): T {
    return option.kind === 'some' ? option.value : defaultValue;
  }

  /**
   * Returns the value or computes a default.
   *
   * @param option - The option to unwrap
   * @param fn - Function to compute default value
   * @returns The contained value or computed default
   *
   * @example
   * ```typescript
   * const opt = Option.none<number>();
   * const value = Option.unwrapOrElse(opt, () => 42);
   * ```
   */
  export function unwrapOrElse<T>(option: Option<T>, fn: () => T): T {
    return option.kind === 'some' ? option.value : fn();
  }

  /**
   * Returns the value or null.
   *
   * @param option - The option to convert
   * @returns The contained value or null
   *
   * @example
   * ```typescript
   * const opt = Option.some(42);
   * const value = Option.toNullable(opt); // 42
   * ```
   */
  export function toNullable<T>(option: Option<T>): T | null {
    return option.kind === 'some' ? option.value : null;
  }

  /**
   * Returns the value or undefined.
   *
   * @param option - The option to convert
   * @returns The contained value or undefined
   *
   * @example
   * ```typescript
   * const opt = Option.none<number>();
   * const value = Option.toUndefined(opt); // undefined
   * ```
   */
  export function toUndefined<T>(option: Option<T>): T | undefined {
    return option.kind === 'some' ? option.value : undefined;
  }

  /**
   * Combines two Options into a tuple.
   *
   * @param o1 - First option
   * @param o2 - Second option
   * @returns Some with tuple if both are Some, None otherwise
   *
   * @example
   * ```typescript
   * const o1 = Option.some(1);
   * const o2 = Option.some('a');
   * const combined = Option.combine(o1, o2);
   * // Some([1, 'a'])
   * ```
   */
  export function combine<T1, T2>(
    o1: Option<T1>,
    o2: Option<T2>
  ): Option<[T1, T2]> {
    if (o1.kind === 'none' || o2.kind === 'none') {
      return none();
    }
    return some([o1.value, o2.value]);
  }

  /**
   * Combines an array of Options into an Option of array.
   *
   * @param options - Array of options
   * @returns Some with array if all are Some, None otherwise
   *
   * @example
   * ```typescript
   * const options = [Option.some(1), Option.some(2), Option.some(3)];
   * const combined = Option.all(options);
   * // Some([1, 2, 3])
   * ```
   */
  export function all<T>(options: ReadonlyArray<Option<T>>): Option<T[]> {
    const values: T[] = [];
    for (const option of options) {
      if (option.kind === 'none') {
        return none();
      }
      values.push(option.value);
    }
    return some(values);
  }

  /**
   * Returns the first Some option or None.
   *
   * @param options - Array of options
   * @returns First Some option or None
   *
   * @example
   * ```typescript
   * const options = [Option.none(), Option.some(42), Option.some(100)];
   * const first = Option.any(options);
   * // Some(42)
   * ```
   */
  export function any<T>(options: ReadonlyArray<Option<T>>): Option<T> {
    for (const option of options) {
      if (option.kind === 'some') {
        return option;
      }
    }
    return none();
  }

  /**
   * Returns the first option or the second if the first is None.
   *
   * @param option - The primary option
   * @param alternative - The alternative option
   * @returns The first Some option
   *
   * @example
   * ```typescript
   * const opt1 = Option.none<number>();
   * const opt2 = Option.some(42);
   * const result = Option.or(opt1, opt2);
   * // Some(42)
   * ```
   */
  export function or<T>(option: Option<T>, alternative: Option<T>): Option<T> {
    return option.kind === 'some' ? option : alternative;
  }

  /**
   * Returns the first option if both are Some, otherwise None.
   *
   * @param option - The primary option
   * @param other - The other option
   * @returns The first option if both are Some
   *
   * @example
   * ```typescript
   * const opt1 = Option.some(1);
   * const opt2 = Option.some(2);
   * const result = Option.and(opt1, opt2);
   * // Some(1)
   * ```
   */
  export function and<T, U>(option: Option<T>, other: Option<U>): Option<T> {
    return option.kind === 'some' && other.kind === 'some' ? option : none();
  }
}
