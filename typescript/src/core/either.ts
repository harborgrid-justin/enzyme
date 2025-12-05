/**
 * Either type for disjoint unions.
 *
 * Represents a value that can be one of two types. Unlike Result,
 * neither side is considered an "error" - both are valid values.
 *
 * @example
 * ```typescript
 * type StringOrNumber = Either<string, number>;
 *
 * function parseInput(input: string): StringOrNumber {
 *   const num = parseInt(input);
 *   return isNaN(num)
 *     ? Either.left(input)
 *     : Either.right(num);
 * }
 *
 * const result = parseInput('42');
 * const message = Either.match(result, {
 *   left: (str) => `Got string: ${str}`,
 *   right: (num) => `Got number: ${num}`,
 * });
 * ```
 *
 * @module core/either
 */

/**
 * Represents the left variant of an Either.
 */
export interface Left<L> {
  readonly kind: 'left';
  readonly value: L;
}

/**
 * Represents the right variant of an Either.
 */
export interface Right<R> {
  readonly kind: 'right';
  readonly value: R;
}

/**
 * An Either type that represents a value that can be one of two types.
 *
 * @template L - The type of the left variant
 * @template R - The type of the right variant
 */
export type Either<L, R> = Left<L> | Right<R>;

/**
 * Type guard to check if an Either is Left.
 *
 * @param either - The either to check
 * @returns True if the either is Left
 */
export function isLeft<L, R>(either: Either<L, R>): either is Left<L> {
  return either.kind === 'left';
}

/**
 * Type guard to check if an Either is Right.
 *
 * @param either - The either to check
 * @returns True if the either is Right
 */
export function isRight<L, R>(either: Either<L, R>): either is Right<R> {
  return either.kind === 'right';
}

/**
 * Pattern matching interface for Either.
 */
export interface EitherMatcher<L, R, T> {
  left: (value: L) => T;
  right: (value: R) => T;
}

/**
 * Namespace containing Either utility functions.
 */
export namespace Either {
  /**
   * Creates an Either with a left value.
   *
   * @param value - The left value
   * @returns A Left Either
   *
   * @example
   * ```typescript
   * const either = Either.left('error');
   * console.log(either.value); // 'error'
   * ```
   */
  export function left<L, R = never>(value: L): Either<L, R> {
    return { kind: 'left', value };
  }

  /**
   * Creates an Either with a right value.
   *
   * @param value - The right value
   * @returns A Right Either
   *
   * @example
   * ```typescript
   * const either = Either.right(42);
   * console.log(either.value); // 42
   * ```
   */
  export function right<L = never, R = unknown>(value: R): Either<L, R> {
    return { kind: 'right', value };
  }

  /**
   * Creates an Either from a nullable value.
   *
   * @param value - The nullable value
   * @param leftValue - The value to use for Left if null/undefined
   * @returns Right if value exists, Left otherwise
   *
   * @example
   * ```typescript
   * const either = Either.from(null, 'not found');
   * // Left('not found')
   * ```
   */
  export function from<L, R>(
    value: R | null | undefined,
    leftValue: L
  ): Either<L, R> {
    return value != null ? right(value) : left(leftValue);
  }

  /**
   * Creates an Either from a predicate.
   *
   * @param value - The value to test
   * @param predicate - Function to test the value
   * @param leftValue - Value for Left if predicate fails
   * @returns Right if predicate passes, Left otherwise
   *
   * @example
   * ```typescript
   * const either = Either.fromPredicate(5, x => x > 0, 'negative');
   * // Right(5)
   * ```
   */
  export function fromPredicate<L, R>(
    value: R,
    predicate: (value: R) => boolean,
    leftValue: L
  ): Either<L, R> {
    return predicate(value) ? right(value) : left(leftValue);
  }

  /**
   * Pattern matching for Either types.
   *
   * @param either - The either to match against
   * @param matcher - Object with left and right handlers
   * @returns The result of the matched handler
   *
   * @example
   * ```typescript
   * const either = Either.right(42);
   * const message = Either.match(either, {
   *   left: (err) => `Error: ${err}`,
   *   right: (val) => `Value: ${val}`,
   * });
   * ```
   */
  export function match<L, R, T>(
    either: Either<L, R>,
    matcher: EitherMatcher<L, R, T>
  ): T {
    return either.kind === 'left'
      ? matcher.left(either.value)
      : matcher.right(either.value);
  }

  /**
   * Maps the right value of an Either.
   *
   * @param either - The either to map
   * @param fn - The mapping function
   * @returns A new Either with the mapped right value
   *
   * @example
   * ```typescript
   * const either = Either.right(5);
   * const doubled = Either.map(either, x => x * 2);
   * // Right(10)
   * ```
   */
  export function map<L, R, T>(
    either: Either<L, R>,
    fn: (value: R) => T
  ): Either<L, T> {
    return either.kind === 'right' ? right(fn(either.value)) : either;
  }

  /**
   * Maps the left value of an Either.
   *
   * @param either - The either to map
   * @param fn - The mapping function
   * @returns A new Either with the mapped left value
   *
   * @example
   * ```typescript
   * const either = Either.left('error');
   * const mapped = Either.mapLeft(either, err => `Fatal: ${err}`);
   * // Left('Fatal: error')
   * ```
   */
  export function mapLeft<L, R, T>(
    either: Either<L, R>,
    fn: (value: L) => T
  ): Either<T, R> {
    return either.kind === 'left' ? left(fn(either.value)) : either;
  }

  /**
   * Maps both sides of an Either.
   *
   * @param either - The either to map
   * @param leftFn - Function to map left values
   * @param rightFn - Function to map right values
   * @returns A new Either with both sides mapped
   *
   * @example
   * ```typescript
   * const either = Either.right(5);
   * const mapped = Either.bimap(
   *   either,
   *   err => `Error: ${err}`,
   *   val => val * 2
   * );
   * // Right(10)
   * ```
   */
  export function bimap<L, R, T, U>(
    either: Either<L, R>,
    leftFn: (value: L) => T,
    rightFn: (value: R) => U
  ): Either<T, U> {
    return either.kind === 'left'
      ? left(leftFn(either.value))
      : right(rightFn(either.value));
  }

  /**
   * Chains Either-returning operations on the right value.
   *
   * @param either - The either to chain from
   * @param fn - Function that returns a new Either
   * @returns The result of the function or the original left
   *
   * @example
   * ```typescript
   * const either = Either.right('5');
   * const parsed = Either.andThen(either, (str) => {
   *   const num = parseInt(str);
   *   return isNaN(num)
   *     ? Either.left('Invalid number')
   *     : Either.right(num);
   * });
   * ```
   */
  export function andThen<L, R, T>(
    either: Either<L, R>,
    fn: (value: R) => Either<L, T>
  ): Either<L, T> {
    return either.kind === 'right' ? fn(either.value) : either;
  }

  /**
   * Alias for andThen. Chains Either-returning operations.
   */
  export const flatMap = andThen;

  /**
   * Swaps the left and right values.
   *
   * @param either - The either to swap
   * @returns An Either with left and right swapped
   *
   * @example
   * ```typescript
   * const either = Either.left('error');
   * const swapped = Either.swap(either);
   * // Right('error')
   * ```
   */
  export function swap<L, R>(either: Either<L, R>): Either<R, L> {
    return either.kind === 'left' ? right(either.value) : left(either.value);
  }

  /**
   * Returns the right value or a default.
   *
   * @param either - The either to unwrap
   * @param defaultValue - The default value if left
   * @returns The right value or default
   *
   * @example
   * ```typescript
   * const either = Either.left('error');
   * const value = Either.unwrapOr(either, 0); // 0
   * ```
   */
  export function unwrapOr<L, R>(either: Either<L, R>, defaultValue: R): R {
    return either.kind === 'right' ? either.value : defaultValue;
  }

  /**
   * Returns the right value or computes a default from left.
   *
   * @param either - The either to unwrap
   * @param fn - Function to compute default from left value
   * @returns The right value or computed default
   *
   * @example
   * ```typescript
   * const either = Either.left('error');
   * const value = Either.unwrapOrElse(either, err => `Default: ${err}`);
   * ```
   */
  export function unwrapOrElse<L, R>(
    either: Either<L, R>,
    fn: (value: L) => R
  ): R {
    return either.kind === 'right' ? either.value : fn(either.value);
  }

  /**
   * Merges an Either into a single value.
   *
   * @param either - The either to merge
   * @returns The left or right value
   *
   * @example
   * ```typescript
   * const either1: Either<string, string> = Either.left('left');
   * const value1 = Either.merge(either1); // 'left'
   *
   * const either2: Either<number, number> = Either.right(42);
   * const value2 = Either.merge(either2); // 42
   * ```
   */
  export function merge<T>(either: Either<T, T>): T {
    return either.value;
  }

  /**
   * Combines two Eithers into a tuple.
   *
   * @param e1 - First either
   * @param e2 - Second either
   * @returns Right with tuple if both are Right, first Left otherwise
   *
   * @example
   * ```typescript
   * const e1 = Either.right(1);
   * const e2 = Either.right('a');
   * const combined = Either.combine(e1, e2);
   * // Right([1, 'a'])
   * ```
   */
  export function combine<L, R1, R2>(
    e1: Either<L, R1>,
    e2: Either<L, R2>
  ): Either<L, [R1, R2]> {
    if (e1.kind === 'left') return e1;
    if (e2.kind === 'left') return e2;
    return right([e1.value, e2.value]);
  }

  /**
   * Combines an array of Eithers into an Either of array.
   *
   * @param eithers - Array of eithers
   * @returns Right with array if all are Right, first Left otherwise
   *
   * @example
   * ```typescript
   * const eithers = [Either.right(1), Either.right(2), Either.right(3)];
   * const combined = Either.all(eithers);
   * // Right([1, 2, 3])
   * ```
   */
  export function all<L, R>(
    eithers: ReadonlyArray<Either<L, R>>
  ): Either<L, R[]> {
    const values: R[] = [];
    for (const either of eithers) {
      if (either.kind === 'left') {
        return either;
      }
      values.push(either.value);
    }
    return right(values);
  }
}
