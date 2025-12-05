/**
 * Composable function pipeline utilities.
 *
 * Provides utilities for functional composition, allowing you to build
 * complex operations from simple functions.
 *
 * @example
 * ```typescript
 * const addOne = (x: number) => x + 1;
 * const double = (x: number) => x * 2;
 * const square = (x: number) => x * x;
 *
 * // Pipe: left to right
 * const result1 = pipe(5, addOne, double, square);
 * // (5 + 1) * 2 = 12, 12 * 12 = 144
 *
 * // Compose: right to left
 * const transform = compose(square, double, addOne);
 * const result2 = transform(5); // Same as above: 144
 * ```
 *
 * @module core/pipeline
 */

/**
 * Type for a unary function (function with one argument).
 */
export type UnaryFn<T, R> = (arg: T) => R;

/**
 * Pipes a value through a series of functions (left to right).
 *
 * @param value - The initial value
 * @param fns - Functions to apply in sequence
 * @returns The final transformed value
 *
 * @example
 * ```typescript
 * const result = pipe(
 *   10,
 *   x => x + 5,
 *   x => x * 2,
 *   x => x.toString()
 * );
 * // "30"
 * ```
 */
export function pipe<A>(value: A): A;
export function pipe<A, B>(value: A, fn1: UnaryFn<A, B>): B;
export function pipe<A, B, C>(
  value: A,
  fn1: UnaryFn<A, B>,
  fn2: UnaryFn<B, C>
): C;
export function pipe<A, B, C, D>(
  value: A,
  fn1: UnaryFn<A, B>,
  fn2: UnaryFn<B, C>,
  fn3: UnaryFn<C, D>
): D;
export function pipe<A, B, C, D, E>(
  value: A,
  fn1: UnaryFn<A, B>,
  fn2: UnaryFn<B, C>,
  fn3: UnaryFn<C, D>,
  fn4: UnaryFn<D, E>
): E;
export function pipe<A, B, C, D, E, F>(
  value: A,
  fn1: UnaryFn<A, B>,
  fn2: UnaryFn<B, C>,
  fn3: UnaryFn<C, D>,
  fn4: UnaryFn<D, E>,
  fn5: UnaryFn<E, F>
): F;
export function pipe<A, B, C, D, E, F, G>(
  value: A,
  fn1: UnaryFn<A, B>,
  fn2: UnaryFn<B, C>,
  fn3: UnaryFn<C, D>,
  fn4: UnaryFn<D, E>,
  fn5: UnaryFn<E, F>,
  fn6: UnaryFn<F, G>
): G;
export function pipe<A, B, C, D, E, F, G, H>(
  value: A,
  fn1: UnaryFn<A, B>,
  fn2: UnaryFn<B, C>,
  fn3: UnaryFn<C, D>,
  fn4: UnaryFn<D, E>,
  fn5: UnaryFn<E, F>,
  fn6: UnaryFn<F, G>,
  fn7: UnaryFn<G, H>
): H;
export function pipe<A, B, C, D, E, F, G, H, I>(
  value: A,
  fn1: UnaryFn<A, B>,
  fn2: UnaryFn<B, C>,
  fn3: UnaryFn<C, D>,
  fn4: UnaryFn<D, E>,
  fn5: UnaryFn<E, F>,
  fn6: UnaryFn<F, G>,
  fn7: UnaryFn<G, H>,
  fn8: UnaryFn<H, I>
): I;
export function pipe<A, B, C, D, E, F, G, H, I, J>(
  value: A,
  fn1: UnaryFn<A, B>,
  fn2: UnaryFn<B, C>,
  fn3: UnaryFn<C, D>,
  fn4: UnaryFn<D, E>,
  fn5: UnaryFn<E, F>,
  fn6: UnaryFn<F, G>,
  fn7: UnaryFn<G, H>,
  fn8: UnaryFn<H, I>,
  fn9: UnaryFn<I, J>
): J;
export function pipe(value: unknown, ...fns: UnaryFn<unknown, unknown>[]): unknown {
  return fns.reduce((acc, fn) => fn(acc), value);
}

/**
 * Composes functions right to left.
 *
 * @param fns - Functions to compose
 * @returns A new function that applies all functions in reverse order
 *
 * @example
 * ```typescript
 * const addOne = (x: number) => x + 1;
 * const double = (x: number) => x * 2;
 *
 * const transform = compose(double, addOne);
 * const result = transform(5); // (5 + 1) * 2 = 12
 * ```
 */
export function compose<A>(): UnaryFn<A, A>;
export function compose<A, B>(fn1: UnaryFn<A, B>): UnaryFn<A, B>;
export function compose<A, B, C>(
  fn2: UnaryFn<B, C>,
  fn1: UnaryFn<A, B>
): UnaryFn<A, C>;
export function compose<A, B, C, D>(
  fn3: UnaryFn<C, D>,
  fn2: UnaryFn<B, C>,
  fn1: UnaryFn<A, B>
): UnaryFn<A, D>;
export function compose<A, B, C, D, E>(
  fn4: UnaryFn<D, E>,
  fn3: UnaryFn<C, D>,
  fn2: UnaryFn<B, C>,
  fn1: UnaryFn<A, B>
): UnaryFn<A, E>;
export function compose<A, B, C, D, E, F>(
  fn5: UnaryFn<E, F>,
  fn4: UnaryFn<D, E>,
  fn3: UnaryFn<C, D>,
  fn2: UnaryFn<B, C>,
  fn1: UnaryFn<A, B>
): UnaryFn<A, F>;
export function compose<A, B, C, D, E, F, G>(
  fn6: UnaryFn<F, G>,
  fn5: UnaryFn<E, F>,
  fn4: UnaryFn<D, E>,
  fn3: UnaryFn<C, D>,
  fn2: UnaryFn<B, C>,
  fn1: UnaryFn<A, B>
): UnaryFn<A, G>;
export function compose<A, B, C, D, E, F, G, H>(
  fn7: UnaryFn<G, H>,
  fn6: UnaryFn<F, G>,
  fn5: UnaryFn<E, F>,
  fn4: UnaryFn<D, E>,
  fn3: UnaryFn<C, D>,
  fn2: UnaryFn<B, C>,
  fn1: UnaryFn<A, B>
): UnaryFn<A, H>;
export function compose<A, B, C, D, E, F, G, H, I>(
  fn8: UnaryFn<H, I>,
  fn7: UnaryFn<G, H>,
  fn6: UnaryFn<F, G>,
  fn5: UnaryFn<E, F>,
  fn4: UnaryFn<D, E>,
  fn3: UnaryFn<C, D>,
  fn2: UnaryFn<B, C>,
  fn1: UnaryFn<A, B>
): UnaryFn<A, I>;
export function compose<A, B, C, D, E, F, G, H, I, J>(
  fn9: UnaryFn<I, J>,
  fn8: UnaryFn<H, I>,
  fn7: UnaryFn<G, H>,
  fn6: UnaryFn<F, G>,
  fn5: UnaryFn<E, F>,
  fn4: UnaryFn<D, E>,
  fn3: UnaryFn<C, D>,
  fn2: UnaryFn<B, C>,
  fn1: UnaryFn<A, B>
): UnaryFn<A, J>;
export function compose(
  ...fns: UnaryFn<unknown, unknown>[]
): UnaryFn<unknown, unknown> {
  return (value: unknown) => fns.reduceRight((acc, fn) => fn(acc), value);
}

/**
 * Composes functions left to right (alias for pipe as a function).
 *
 * @param fns - Functions to compose
 * @returns A new function that applies all functions in order
 *
 * @example
 * ```typescript
 * const addOne = (x: number) => x + 1;
 * const double = (x: number) => x * 2;
 *
 * const transform = flow(addOne, double);
 * const result = transform(5); // (5 + 1) * 2 = 12
 * ```
 */
export function flow<A>(): UnaryFn<A, A>;
export function flow<A, B>(fn1: UnaryFn<A, B>): UnaryFn<A, B>;
export function flow<A, B, C>(
  fn1: UnaryFn<A, B>,
  fn2: UnaryFn<B, C>
): UnaryFn<A, C>;
export function flow<A, B, C, D>(
  fn1: UnaryFn<A, B>,
  fn2: UnaryFn<B, C>,
  fn3: UnaryFn<C, D>
): UnaryFn<A, D>;
export function flow<A, B, C, D, E>(
  fn1: UnaryFn<A, B>,
  fn2: UnaryFn<B, C>,
  fn3: UnaryFn<C, D>,
  fn4: UnaryFn<D, E>
): UnaryFn<A, E>;
export function flow<A, B, C, D, E, F>(
  fn1: UnaryFn<A, B>,
  fn2: UnaryFn<B, C>,
  fn3: UnaryFn<C, D>,
  fn4: UnaryFn<D, E>,
  fn5: UnaryFn<E, F>
): UnaryFn<A, F>;
export function flow<A, B, C, D, E, F, G>(
  fn1: UnaryFn<A, B>,
  fn2: UnaryFn<B, C>,
  fn3: UnaryFn<C, D>,
  fn4: UnaryFn<D, E>,
  fn5: UnaryFn<E, F>,
  fn6: UnaryFn<F, G>
): UnaryFn<A, G>;
export function flow<A, B, C, D, E, F, G, H>(
  fn1: UnaryFn<A, B>,
  fn2: UnaryFn<B, C>,
  fn3: UnaryFn<C, D>,
  fn4: UnaryFn<D, E>,
  fn5: UnaryFn<E, F>,
  fn6: UnaryFn<F, G>,
  fn7: UnaryFn<G, H>
): UnaryFn<A, H>;
export function flow<A, B, C, D, E, F, G, H, I>(
  fn1: UnaryFn<A, B>,
  fn2: UnaryFn<B, C>,
  fn3: UnaryFn<C, D>,
  fn4: UnaryFn<D, E>,
  fn5: UnaryFn<E, F>,
  fn6: UnaryFn<F, G>,
  fn7: UnaryFn<G, H>,
  fn8: UnaryFn<H, I>
): UnaryFn<A, I>;
export function flow<A, B, C, D, E, F, G, H, I, J>(
  fn1: UnaryFn<A, B>,
  fn2: UnaryFn<B, C>,
  fn3: UnaryFn<C, D>,
  fn4: UnaryFn<D, E>,
  fn5: UnaryFn<E, F>,
  fn6: UnaryFn<F, G>,
  fn7: UnaryFn<G, H>,
  fn8: UnaryFn<H, I>,
  fn9: UnaryFn<I, J>
): UnaryFn<A, J>;
export function flow(
  ...fns: UnaryFn<unknown, unknown>[]
): UnaryFn<unknown, unknown> {
  return (value: unknown) => fns.reduce((acc, fn) => fn(acc), value);
}

/**
 * Creates a function that always returns the same value.
 *
 * @param value - The value to return
 * @returns A function that returns the value
 *
 * @example
 * ```typescript
 * const getZero = constant(0);
 * console.log(getZero()); // 0
 * console.log(getZero()); // 0
 * ```
 */
export function constant<T>(value: T): () => T {
  return () => value;
}

/**
 * Identity function - returns its argument unchanged.
 *
 * @param value - The value to return
 * @returns The same value
 *
 * @example
 * ```typescript
 * const numbers = [1, 2, 3];
 * const same = numbers.map(identity); // [1, 2, 3]
 * ```
 */
export function identity<T>(value: T): T {
  return value;
}

/**
 * Creates a function that calls a function with its argument.
 *
 * @param fn - The function to call
 * @returns A function that calls fn
 *
 * @example
 * ```typescript
 * const callWithFive = apply(5);
 * const addOne = (x: number) => x + 1;
 * console.log(callWithFive(addOne)); // 6
 * ```
 */
export function apply<T, R>(arg: T): (fn: UnaryFn<T, R>) => R {
  return (fn) => fn(arg);
}

/**
 * Partially applies a function with one argument.
 *
 * @param fn - The function to partially apply
 * @param arg1 - The first argument
 * @returns A function expecting remaining arguments
 *
 * @example
 * ```typescript
 * const add = (a: number, b: number) => a + b;
 * const addFive = partial(add, 5);
 * console.log(addFive(3)); // 8
 * ```
 */
export function partial<T1, T2, R>(
  fn: (arg1: T1, arg2: T2) => R,
  arg1: T1
): (arg2: T2) => R {
  return (arg2) => fn(arg1, arg2);
}

/**
 * Curries a two-argument function.
 *
 * @param fn - The function to curry
 * @returns A curried function
 *
 * @example
 * ```typescript
 * const add = (a: number, b: number) => a + b;
 * const curriedAdd = curry(add);
 * console.log(curriedAdd(5)(3)); // 8
 * ```
 */
export function curry<T1, T2, R>(
  fn: (arg1: T1, arg2: T2) => R
): (arg1: T1) => (arg2: T2) => R {
  return (arg1) => (arg2) => fn(arg1, arg2);
}

/**
 * Curries a three-argument function.
 *
 * @param fn - The function to curry
 * @returns A curried function
 *
 * @example
 * ```typescript
 * const add3 = (a: number, b: number, c: number) => a + b + c;
 * const curriedAdd3 = curry3(add3);
 * console.log(curriedAdd3(1)(2)(3)); // 6
 * ```
 */
export function curry3<T1, T2, T3, R>(
  fn: (arg1: T1, arg2: T2, arg3: T3) => R
): (arg1: T1) => (arg2: T2) => (arg3: T3) => R {
  return (arg1) => (arg2) => (arg3) => fn(arg1, arg2, arg3);
}

/**
 * Flips the arguments of a two-argument function.
 *
 * @param fn - The function to flip
 * @returns A function with flipped arguments
 *
 * @example
 * ```typescript
 * const divide = (a: number, b: number) => a / b;
 * const flippedDivide = flip(divide);
 * console.log(divide(10, 2)); // 5
 * console.log(flippedDivide(10, 2)); // 0.2
 * ```
 */
export function flip<T1, T2, R>(
  fn: (arg1: T1, arg2: T2) => R
): (arg2: T2, arg1: T1) => R {
  return (arg2, arg1) => fn(arg1, arg2);
}

/**
 * Memoizes a function (caches results based on arguments).
 *
 * @param fn - The function to memoize
 * @param keyFn - Optional function to compute cache key
 * @returns A memoized version of the function
 *
 * @example
 * ```typescript
 * const expensiveOperation = (n: number) => {
 *   console.log('Computing...');
 *   return n * n;
 * };
 *
 * const memoized = memoize(expensiveOperation);
 * console.log(memoized(5)); // Computing... 25
 * console.log(memoized(5)); // 25 (cached, no log)
 * ```
 */
export function memoize<T, R>(
  fn: UnaryFn<T, R>,
  keyFn: (arg: T) => string = (arg) => JSON.stringify(arg)
): UnaryFn<T, R> {
  const cache = new Map<string, R>();

  return (arg: T): R => {
    const key = keyFn(arg);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const result = fn(arg);
    cache.set(key, result);
    return result;
  };
}

/**
 * Debounces a function (delays execution until after wait time).
 *
 * @param fn - The function to debounce
 * @param waitMs - The wait time in milliseconds
 * @returns A debounced version of the function
 *
 * @example
 * ```typescript
 * const search = (query: string) => console.log('Searching:', query);
 * const debouncedSearch = debounce(search, 300);
 *
 * debouncedSearch('a');
 * debouncedSearch('ab');
 * debouncedSearch('abc'); // Only this will execute after 300ms
 * ```
 */
export function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  waitMs: number
): (...args: T) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: T): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, waitMs);
  };
}

/**
 * Throttles a function (limits execution rate).
 *
 * @param fn - The function to throttle
 * @param waitMs - The minimum wait time between executions
 * @returns A throttled version of the function
 *
 * @example
 * ```typescript
 * const log = (msg: string) => console.log(msg);
 * const throttledLog = throttle(log, 1000);
 *
 * throttledLog('a'); // Executes immediately
 * throttledLog('b'); // Ignored
 * throttledLog('c'); // Ignored
 * // After 1000ms, throttle resets
 * ```
 */
export function throttle<T extends unknown[]>(
  fn: (...args: T) => void,
  waitMs: number
): (...args: T) => void {
  let lastCallTime = 0;

  return (...args: T): void => {
    const now = Date.now();
    if (now - lastCallTime >= waitMs) {
      lastCallTime = now;
      fn(...args);
    }
  };
}

/**
 * Creates a function that calls multiple functions in sequence.
 *
 * @param fns - Functions to call
 * @returns A function that calls all functions with the same arguments
 *
 * @example
 * ```typescript
 * const log = (msg: string) => console.log(msg);
 * const alert = (msg: string) => window.alert(msg);
 * const logAndAlert = tap(log, alert);
 *
 * logAndAlert('Hello'); // Logs and alerts
 * ```
 */
export function tap<T extends unknown[]>(
  ...fns: Array<(...args: T) => void>
): (...args: T) => void {
  return (...args: T): void => {
    fns.forEach(fn => fn(...args));
  };
}
