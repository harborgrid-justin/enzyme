/**
 * Async utilities for handling asynchronous operations with proper error handling.
 *
 * Provides Result-based async operations and utilities for working with Promises
 * in a type-safe manner.
 *
 * @example
 * ```typescript
 * const result = await AsyncResult.from(async () => {
 *   const response = await fetch('/api/data');
 *   return response.json();
 * });
 *
 * if (AsyncResult.isOk(result)) {
 *   console.log(result.value);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 *
 * @module core/async
 */

import { Result } from './result.js';

/**
 * Type alias for a Promise that returns a Result.
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Namespace containing AsyncResult utility functions.
 */
export namespace AsyncResult {
  /**
   * Wraps an async function in a Result.
   *
   * @param fn - The async function to wrap
   * @returns A Promise of Result
   *
   * @example
   * ```typescript
   * const result = await AsyncResult.from(async () => {
   *   const data = await fetchData();
   *   return data;
   * });
   * ```
   */
  export function from<T>(fn: () => Promise<T>): AsyncResult<T, Error> {
    return Result.fromAsync(fn);
  }

  /**
   * Creates a successful AsyncResult.
   *
   * @param value - The success value
   * @returns A Promise of Ok Result
   */
  export function ok<T, E = never>(value: T): AsyncResult<T, E> {
    return Promise.resolve(Result.ok(value));
  }

  /**
   * Creates a failed AsyncResult.
   *
   * @param error - The error value
   * @returns A Promise of Err Result
   */
  export function err<T = never, E = Error>(error: E): AsyncResult<T, E> {
    return Promise.resolve(Result.err(error));
  }

  /**
   * Type guard to check if a Result is Ok.
   */
  export const isOk = Result.isOk;

  /**
   * Type guard to check if a Result is Err.
   */
  export const isErr = Result.isErr;

  /**
   * Maps an AsyncResult's success value.
   *
   * @param asyncResult - The async result to map
   * @param fn - The mapping function
   * @returns A new AsyncResult with mapped value
   *
   * @example
   * ```typescript
   * const result = AsyncResult.ok(5);
   * const doubled = await AsyncResult.map(result, x => x * 2);
   * ```
   */
  export async function map<T, E, U>(
    asyncResult: AsyncResult<T, E>,
    fn: (value: T) => U
  ): AsyncResult<U, E> {
    const result = await asyncResult;
    return Result.map(result, fn);
  }

  /**
   * Maps an AsyncResult's success value with an async function.
   *
   * @param asyncResult - The async result to map
   * @param fn - The async mapping function
   * @returns A new AsyncResult with mapped value
   *
   * @example
   * ```typescript
   * const result = AsyncResult.ok(5);
   * const doubled = await AsyncResult.mapAsync(result, async x => {
   *   await delay(100);
   *   return x * 2;
   * });
   * ```
   */
  export async function mapAsync<T, E, U>(
    asyncResult: AsyncResult<T, E>,
    fn: (value: T) => Promise<U>
  ): AsyncResult<U, E> {
    const result = await asyncResult;
    if (Result.isOk(result)) {
      try {
        const newValue = await fn(result.value);
        return Result.ok(newValue);
      } catch (error) {
        // If fn throws, preserve the original error type
        return result as unknown as Result<U, E>;
      }
    }
    return result;
  }

  /**
   * Maps an AsyncResult's error value.
   *
   * @param asyncResult - The async result to map
   * @param fn - The mapping function
   * @returns A new AsyncResult with mapped error
   */
  export async function mapErr<T, E, F>(
    asyncResult: AsyncResult<T, E>,
    fn: (error: E) => F
  ): AsyncResult<T, F> {
    const result = await asyncResult;
    return Result.mapErr(result, fn);
  }

  /**
   * Chains AsyncResult-returning operations.
   *
   * @param asyncResult - The async result to chain from
   * @param fn - Function that returns an AsyncResult
   * @returns The result of the function or original error
   *
   * @example
   * ```typescript
   * const result = AsyncResult.ok('user-123');
   * const user = await AsyncResult.andThen(result, async (id) => {
   *   return AsyncResult.from(() => fetchUser(id));
   * });
   * ```
   */
  export async function andThen<T, E, U>(
    asyncResult: AsyncResult<T, E>,
    fn: (value: T) => AsyncResult<U, E>
  ): AsyncResult<U, E> {
    const result = await asyncResult;
    if (Result.isOk(result)) {
      return fn(result.value);
    }
    return result;
  }

  /**
   * Alias for andThen.
   */
  export const flatMap = andThen;

  /**
   * Returns the success value or a default.
   *
   * @param asyncResult - The async result to unwrap
   * @param defaultValue - The default value if error
   * @returns The success value or default
   */
  export async function unwrapOr<T, E>(
    asyncResult: AsyncResult<T, E>,
    defaultValue: T
  ): Promise<T> {
    const result = await asyncResult;
    return Result.unwrapOr(result, defaultValue);
  }

  /**
   * Returns the success value or computes a default.
   *
   * @param asyncResult - The async result to unwrap
   * @param fn - Function to compute default from error
   * @returns The success value or computed default
   */
  export async function unwrapOrElse<T, E>(
    asyncResult: AsyncResult<T, E>,
    fn: (error: E) => T
  ): Promise<T> {
    const result = await asyncResult;
    return Result.unwrapOrElse(result, fn);
  }

  /**
   * Combines multiple AsyncResults into an AsyncResult of array.
   *
   * @param asyncResults - Array of async results
   * @returns AsyncResult containing array of values or first error
   *
   * @example
   * ```typescript
   * const results = [
   *   AsyncResult.from(() => fetchUser('1')),
   *   AsyncResult.from(() => fetchUser('2')),
   *   AsyncResult.from(() => fetchUser('3')),
   * ];
   * const allUsers = await AsyncResult.all(results);
   * ```
   */
  export async function all<T, E>(
    asyncResults: ReadonlyArray<AsyncResult<T, E>>
  ): AsyncResult<T[], E> {
    const results = await Promise.all(asyncResults);
    return Result.all(results);
  }

  /**
   * Returns the first successful AsyncResult or the last error.
   *
   * @param asyncResults - Array of async results
   * @returns First successful result or last error
   *
   * @example
   * ```typescript
   * const results = [
   *   AsyncResult.from(() => fetchFromPrimary()),
   *   AsyncResult.from(() => fetchFromBackup()),
   * ];
   * const data = await AsyncResult.any(results);
   * ```
   */
  export async function any<T, E>(
    asyncResults: ReadonlyArray<AsyncResult<T, E>>
  ): AsyncResult<T, E> {
    const results = await Promise.all(asyncResults);
    return Result.any(results);
  }

  /**
   * Runs async operations in sequence, collecting results.
   *
   * @param items - Items to process
   * @param fn - Async function to apply to each item
   * @returns AsyncResult containing array of results
   *
   * @example
   * ```typescript
   * const userIds = ['1', '2', '3'];
   * const users = await AsyncResult.sequence(userIds, async (id) => {
   *   return AsyncResult.from(() => fetchUser(id));
   * });
   * ```
   */
  export async function sequence<T, U, E>(
    items: ReadonlyArray<T>,
    fn: (item: T, index: number) => AsyncResult<U, E>
  ): AsyncResult<U[], E> {
    const results: U[] = [];
    for (let i = 0; i < items.length; i++) {
      const result = await fn(items[i], i);
      if (Result.isErr(result)) {
        return result;
      }
      results.push(result.value);
    }
    return Result.ok(results);
  }

  /**
   * Runs async operations in parallel with a concurrency limit.
   *
   * @param items - Items to process
   * @param fn - Async function to apply to each item
   * @param concurrency - Maximum number of concurrent operations
   * @returns AsyncResult containing array of results
   *
   * @example
   * ```typescript
   * const urls = ['url1', 'url2', 'url3', ...];
   * const data = await AsyncResult.parallel(urls, async (url) => {
   *   return AsyncResult.from(() => fetch(url).then(r => r.json()));
   * }, 3); // Max 3 concurrent requests
   * ```
   */
  export async function parallel<T, U, E>(
    items: ReadonlyArray<T>,
    fn: (item: T, index: number) => AsyncResult<U, E>,
    concurrency: number = Infinity
  ): AsyncResult<U[], E> {
    if (concurrency <= 0) {
      return Result.err(new Error('Concurrency must be positive') as E);
    }

    const results: U[] = new Array(items.length);
    const executing: Promise<void>[] = [];

    for (let i = 0; i < items.length; i++) {
      const promise = (async (index: number) => {
        const result = await fn(items[index], index);
        if (Result.isErr(result)) {
          throw result;
        }
        results[index] = result.value;
      })(i);

      executing.push(promise);

      if (executing.length >= concurrency) {
        try {
          await Promise.race(executing);
        } catch (error) {
          if (Result.isErr(error as Result<unknown, E>)) {
            return error as Result<U[], E>;
          }
        }
        executing.splice(
          executing.findIndex(p => p === promise),
          1
        );
      }
    }

    try {
      await Promise.all(executing);
      return Result.ok(results);
    } catch (error) {
      if (Result.isErr(error as Result<unknown, E>)) {
        return error as Result<U[], E>;
      }
      return Result.err(error as E);
    }
  }

  /**
   * Retries an async operation with exponential backoff.
   *
   * @param fn - The async function to retry
   * @param options - Retry options
   * @returns AsyncResult of the operation
   *
   * @example
   * ```typescript
   * const result = await AsyncResult.retry(
   *   () => AsyncResult.from(() => fetch('/api/data')),
   *   { maxAttempts: 3, delayMs: 1000, backoff: 2 }
   * );
   * ```
   */
  export async function retry<T, E>(
    fn: () => AsyncResult<T, E>,
    options: {
      maxAttempts?: number;
      delayMs?: number;
      backoff?: number;
      shouldRetry?: (error: E, attempt: number) => boolean;
    } = {}
  ): AsyncResult<T, E> {
    const {
      maxAttempts = 3,
      delayMs = 1000,
      backoff = 2,
      shouldRetry = () => true,
    } = options;

    let lastError: E | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const result = await fn();

      if (Result.isOk(result)) {
        return result;
      }

      lastError = result.error;

      if (attempt < maxAttempts && shouldRetry(result.error, attempt)) {
        const delay = delayMs * Math.pow(backoff, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return Result.err(lastError as E);
  }

  /**
   * Adds a timeout to an AsyncResult.
   *
   * @param asyncResult - The async result to timeout
   * @param timeoutMs - Timeout in milliseconds
   * @param timeoutError - Error to return on timeout
   * @returns AsyncResult that times out
   *
   * @example
   * ```typescript
   * const result = await AsyncResult.timeout(
   *   AsyncResult.from(() => slowOperation()),
   *   5000,
   *   new Error('Operation timed out')
   * );
   * ```
   */
  export async function timeout<T, E>(
    asyncResult: AsyncResult<T, E>,
    timeoutMs: number,
    timeoutError: E
  ): AsyncResult<T, E> {
    const timeoutPromise = new Promise<Result<T, E>>((resolve) => {
      setTimeout(() => resolve(Result.err(timeoutError)), timeoutMs);
    });

    return Promise.race([asyncResult, timeoutPromise]);
  }
}
