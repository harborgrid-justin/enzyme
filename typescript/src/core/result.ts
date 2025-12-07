/**
 * Result type for type-safe error handling.
 *
 * Inspired by Rust's Result<T, E>, this provides a way to handle operations
 * that can fail without throwing exceptions.
 *
 * @example
 * ```typescript
 * function divide(a: number, b: number): Result<number, string> {
 *   if (b === 0) {
 *     return Result.err('Division by zero');
 *   }
 *   return Result.ok(a / b);
 * }
 *
 * const result = divide(10, 2);
 * if (result.isOk()) {
 *   console.log(result.value); // 5
 * } else {
 *   console.error(result.error);
 * }
 *
 * // Or use pattern matching
 * const message = result.match({
 *   ok: (value) => `Result: ${value}`,
 *   err: (error) => `Error: ${error}`,
 * });
 * ```
 *
 * @module core/result
 */

/**
 * Represents a successful result containing a value of type T.
 */
export interface Ok<T> {
  readonly kind: 'ok';
  readonly value: T;
}

/**
 * Represents a failed result containing an error of type E.
 */
export interface Err<E> {
  readonly kind: 'err';
  readonly error: E;
}

/**
 * A Result type that represents either success (Ok) or failure (Err).
 *
 * @template T - The type of the success value
 * @template E - The type of the error value
 */
export type Result<T, E> = Ok<T> | Err<E>;

/**
 * Type guard to check if a Result is Ok.
 *
 * @param result - The result to check
 * @returns True if the result is Ok
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.kind === 'ok';
}

/**
 * Type guard to check if a Result is Err.
 *
 * @param result - The result to check
 * @returns True if the result is Err
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.kind === 'err';
}

/**
 * Pattern matching interface for Result.
 */
export interface ResultMatcher<T, E, R> {
  ok: (value: T) => R;
  err: (error: E) => R;
}

/**
 * Namespace containing Result utility functions.
 */
export namespace Result {
  /**
   * Creates a successful Result.
   *
   * @param value - The success value
   * @returns An Ok Result
   *
   * @example
   * ```typescript
   * const result = Result.ok(42);
   * console.log(result.value); // 42
   * ```
   */
  export function ok<T, E = never>(value: T): Result<T, E> {
    return { kind: 'ok', value };
  }

  /**
   * Creates a failed Result.
   *
   * @param error - The error value
   * @returns An Err Result
   *
   * @example
   * ```typescript
   * const result = Result.err('Something went wrong');
   * console.log(result.error); // 'Something went wrong'
   * ```
   */
  export function err<T = never, E = unknown>(error: E): Result<T, E> {
    return { kind: 'err', error };
  }

  /**
   * Wraps a function that may throw in a Result.
   *
   * @param fn - The function to wrap
   * @returns A Result containing the function's return value or error
   *
   * @example
   * ```typescript
   * const result = Result.from(() => JSON.parse('{"valid": true}'));
   * // Result<unknown, Error>
   * ```
   */
  export function from<T>(fn: () => T): Result<T, Error> {
    try {
      return ok(fn());
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Wraps an async function that may throw in a Result.
   *
   * @param fn - The async function to wrap
   * @returns A Promise of Result containing the function's return value or error
   *
   * @example
   * ```typescript
   * const result = await Result.fromAsync(async () => {
   *   const response = await fetch('/api/data');
   *   return response.json();
   * });
   * ```
   */
  export async function fromAsync<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
    try {
      return ok(await fn());
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Pattern matching for Result types.
   *
   * @param result - The result to match against
   * @param matcher - Object with ok and err handlers
   * @returns The result of the matched handler
   *
   * @example
   * ```typescript
   * const result = Result.ok(42);
   * const message = Result.match(result, {
   *   ok: (value) => `Success: ${value}`,
   *   err: (error) => `Error: ${error}`,
   * });
   * ```
   */
  export function match<T, E, R>(
    result: Result<T, E>,
    matcher: ResultMatcher<T, E, R>
  ): R {
    return result.kind === 'ok' ? matcher.ok(result.value) : matcher.err(result.error);
  }

  /**
   * Maps a Result's success value to a new value.
   *
   * @param result - The result to map
   * @param fn - The mapping function
   * @returns A new Result with the mapped value
   *
   * @example
   * ```typescript
   * const result = Result.ok(5);
   * const doubled = Result.map(result, x => x * 2);
   * // Result.ok(10)
   * ```
   */
  export function map<T, E, U>(
    result: Result<T, E>,
    fn: (value: T) => U
  ): Result<U, E> {
    return result.kind === 'ok' ? ok(fn(result.value)) : result;
  }

  /**
   * Maps a Result's error value to a new error.
   *
   * @param result - The result to map
   * @param fn - The mapping function
   * @returns A new Result with the mapped error
   *
   * @example
   * ```typescript
   * const result = Result.err('not found');
   * const mapped = Result.mapErr(result, err => `Error: ${err}`);
   * // Result.err('Error: not found')
   * ```
   */
  export function mapErr<T, E, F>(
    result: Result<T, E>,
    fn: (error: E) => F
  ): Result<T, F> {
    return result.kind === 'err' ? err(fn(result.error)) : result;
  }

  /**
   * Chains Result-returning operations.
   *
   * @param result - The result to chain from
   * @param fn - Function that returns a new Result
   * @returns The result of the function or the original error
   *
   * @example
   * ```typescript
   * const result = Result.ok('5');
   * const parsed = Result.andThen(result, (str) => {
   *   const num = parseInt(str);
   *   return isNaN(num) ? Result.err('Invalid number') : Result.ok(num);
   * });
   * ```
   */
  export function andThen<T, E, U>(
    result: Result<T, E>,
    fn: (value: T) => Result<U, E>
  ): Result<U, E> {
    return result.kind === 'ok' ? fn(result.value) : result;
  }

  /**
   * Alias for andThen. Chains Result-returning operations.
   */
  export const flatMap = andThen;

  /**
   * Returns the success value or a default value.
   *
   * @param result - The result to unwrap
   * @param defaultValue - The default value to return if Err
   * @returns The success value or default
   *
   * @example
   * ```typescript
   * const result = Result.err('error');
   * const value = Result.unwrapOr(result, 0); // 0
   * ```
   */
  export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    return result.kind === 'ok' ? result.value : defaultValue;
  }

  /**
   * Returns the success value or computes a default from the error.
   *
   * @param result - The result to unwrap
   * @param fn - Function to compute default from error
   * @returns The success value or computed default
   *
   * @example
   * ```typescript
   * const result = Result.err(404);
   * const value = Result.unwrapOrElse(result, (code) => `Error ${code}`);
   * ```
   */
  export function unwrapOrElse<T, E>(
    result: Result<T, E>,
    fn: (error: E) => T
  ): T {
    return result.kind === 'ok' ? result.value : fn(result.error);
  }

  /**
   * Combines two Results into a tuple.
   *
   * @param r1 - First result
   * @param r2 - Second result
   * @returns Result containing tuple of values or first error
   *
   * @example
   * ```typescript
   * const r1 = Result.ok(1);
   * const r2 = Result.ok('a');
   * const combined = Result.combine(r1, r2);
   * // Result.ok([1, 'a'])
   * ```
   */
  export function combine<T1, T2, E>(
    r1: Result<T1, E>,
    r2: Result<T2, E>
  ): Result<[T1, T2], E> {
    if (r1.kind === 'err') return r1;
    if (r2.kind === 'err') return r2;
    return ok([r1.value, r2.value]);
  }

  /**
   * Combines an array of Results into a Result of array.
   *
   * @param results - Array of results
   * @returns Result containing array of values or first error
   *
   * @example
   * ```typescript
   * const results = [Result.ok(1), Result.ok(2), Result.ok(3)];
   * const combined = Result.all(results);
   * // Result.ok([1, 2, 3])
   * ```
   */
  export function all<T, E>(results: ReadonlyArray<Result<T, E>>): Result<T[], E> {
    const values: T[] = [];
    for (const result of results) {
      if (result.kind === 'err') {
        return result;
      }
      values.push(result.value);
    }
    return ok(values);
  }

  /**
   * Returns the first Ok result or the last Err.
   *
   * @param results - Array of results
   * @returns First Ok result or last Err
   *
   * @example
   * ```typescript
   * const results = [
   *   Result.err('error 1'),
   *   Result.ok(42),
   *   Result.err('error 2')
   * ];
   * const first = Result.any(results);
   * // Result.ok(42)
   * ```
   */
  export function any<T, E>(results: ReadonlyArray<Result<T, E>>): Result<T, E> {
    let lastErr: Result<T, E> | null = null;
    for (const result of results) {
      if (result.kind === 'ok') {
        return result;
      }
      lastErr = result;
    }
    return lastErr ?? err(undefined as E);
  }
}
