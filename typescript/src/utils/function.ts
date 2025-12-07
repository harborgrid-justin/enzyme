/**
 * Function Utilities
 *
 * Provides type-safe function manipulation utilities including
 * debounce, throttle, memoization, and currying.
 *
 * @module utils/function
 * @example
 * ```typescript
 * import { debounce, throttle, memoize } from '@missionfabric-js/enzyme-typescript/utils';
 *
 * const debouncedFn = debounce(() => console.log('called'), 300);
 * const throttledFn = throttle(() => console.log('called'), 1000);
 * ```
 */

/**
 * Creates a debounced function that delays execution until after wait milliseconds.
 *
 * @param fn - The function to debounce
 * @param wait - The debounce wait time in milliseconds
 * @param options - Debounce options
 * @returns The debounced function
 *
 * @example
 * ```typescript
 * const debouncedSearch = debounce((query: string) => {
 *   console.log('Searching for:', query);
 * }, 300);
 *
 * debouncedSearch('hello'); // Only executes after 300ms of no calls
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): T & { cancel: () => void } {
  const { leading = false, trailing = true } = options;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime = 0;

  const debounced = function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const isLeading = leading && now - lastCallTime > wait;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (isLeading) {
      lastCallTime = now;
      return fn.apply(this, args);
    }

    if (trailing) {
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now();
        fn.apply(this, args);
        timeoutId = null;
      }, wait);
    }
  } as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * Creates a throttled function that only executes at most once per wait period.
 *
 * @param fn - The function to throttle
 * @param wait - The throttle wait time in milliseconds
 * @param options - Throttle options
 * @returns The throttled function
 *
 * @example
 * ```typescript
 * const throttledScroll = throttle(() => {
 *   console.log('Scroll event');
 * }, 100);
 *
 * window.addEventListener('scroll', throttledScroll);
 * ```
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): T & { cancel: () => void } {
  const { leading = true, trailing = true } = options;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime = 0;
  let lastArgs: Parameters<T> | null = null;

  const execute = function (this: any, args: Parameters<T>) {
    lastCallTime = Date.now();
    lastArgs = null;
    return fn.apply(this, args);
  };

  const throttled = function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    if (timeSinceLastCall >= wait) {
      if (leading) {
        return execute.call(this, args);
      }
    }

    lastArgs = args;

    if (!timeoutId && trailing) {
      timeoutId = setTimeout(() => {
        if (lastArgs) {
          execute.call(this, lastArgs);
        }
        timeoutId = null;
      }, wait - timeSinceLastCall);
    }
  } as T & { cancel: () => void };

  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
  };

  return throttled;
}

/**
 * Creates a memoized function that caches results based on arguments.
 *
 * @param fn - The function to memoize
 * @param resolver - Optional function to generate cache key
 * @returns The memoized function
 *
 * @example
 * ```typescript
 * const fibonacci = memoize((n: number): number => {
 *   if (n <= 1) return n;
 *   return fibonacci(n - 1) + fibonacci(n - 2);
 * });
 *
 * fibonacci(40); // Fast due to memoization
 * ```
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  resolver?: (...args: Parameters<T>) => string
): T & { cache: Map<string, ReturnType<T>> } {
  const cache = new Map<string, ReturnType<T>>();

  const memoized = function (this: any, ...args: Parameters<T>): ReturnType<T> {
    const key = resolver ? resolver(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  } as T & { cache: Map<string, ReturnType<T>> };

  memoized.cache = cache;

  return memoized;
}

/**
 * Creates a function that invokes fn with arguments reversed.
 *
 * @param fn - The function to flip
 * @returns The flipped function
 *
 * @example
 * ```typescript
 * const divide = (a: number, b: number) => a / b;
 * const flippedDivide = flip(divide);
 * flippedDivide(2, 10); // 10 / 2 = 5
 * ```
 */
export function flip<T extends (...args: any[]) => any>(fn: T): T {
  return ((...args: Parameters<T>) => fn(...args.reverse())) as T;
}

/**
 * Creates a function that negates the result of the predicate fn.
 *
 * @param fn - The predicate function to negate
 * @returns The negated function
 *
 * @example
 * ```typescript
 * const isEven = (n: number) => n % 2 === 0;
 * const isOdd = negate(isEven);
 * isOdd(3); // true
 * ```
 */
export function negate<T extends (...args: any[]) => boolean>(fn: T): T {
  return ((...args: Parameters<T>) => !fn(...args)) as T;
}

/**
 * Creates a function that only executes once.
 *
 * @param fn - The function to restrict
 * @returns The once-wrapped function
 *
 * @example
 * ```typescript
 * const initialize = once(() => {
 *   console.log('Initialized');
 * });
 *
 * initialize(); // Logs 'Initialized'
 * initialize(); // Does nothing
 * ```
 */
export function once<T extends (...args: any[]) => any>(fn: T): T {
  let called = false;
  let result: ReturnType<T>;

  return ((...args: Parameters<T>) => {
    if (!called) {
      called = true;
      result = fn(...args);
    }
    return result;
  }) as T;
}

/**
 * Creates a function that only executes after being called n times.
 *
 * @param n - The number of calls before execution
 * @param fn - The function to restrict
 * @returns The restricted function
 *
 * @example
 * ```typescript
 * const logAfterThree = after(3, () => console.log('Called 3 times'));
 *
 * logAfterThree(); // Nothing
 * logAfterThree(); // Nothing
 * logAfterThree(); // Logs 'Called 3 times'
 * ```
 */
export function after<T extends (...args: any[]) => any>(n: number, fn: T): T {
  let count = 0;

  return ((...args: Parameters<T>) => {
    count++;
    if (count >= n) {
      return fn(...args);
    }
  }) as T;
}

/**
 * Creates a function that only executes up to n times.
 *
 * @param n - The maximum number of calls
 * @param fn - The function to restrict
 * @returns The restricted function
 *
 * @example
 * ```typescript
 * const logTwice = before(2, () => console.log('Called'));
 *
 * logTwice(); // Logs 'Called'
 * logTwice(); // Logs 'Called'
 * logTwice(); // Does nothing
 * ```
 */
export function before<T extends (...args: any[]) => any>(n: number, fn: T): T {
  let count = 0;
  let result: ReturnType<T>;

  return ((...args: Parameters<T>) => {
    if (count < n) {
      count++;
      result = fn(...args);
    }
    return result;
  }) as T;
}

/**
 * Creates a curried version of a function.
 *
 * @param fn - The function to curry
 * @param arity - The arity of the function (default: fn.length)
 * @returns The curried function
 *
 * @example
 * ```typescript
 * const add = (a: number, b: number, c: number) => a + b + c;
 * const curriedAdd = curry(add);
 *
 * curriedAdd(1)(2)(3); // 6
 * curriedAdd(1, 2)(3); // 6
 * curriedAdd(1)(2, 3); // 6
 * ```
 */
export function curry<T extends (...args: any[]) => any>(
  fn: T,
  arity: number = fn.length
): any {
  return function curried(this: any, ...args: any[]): any {
    if (args.length >= arity) {
      return fn.apply(this, args);
    }
    return function (this: any, ...nextArgs: any[]) {
      return curried.apply(this, [...args, ...nextArgs]);
    };
  };
}

/**
 * Creates a function that accepts arguments of fn and returns a new function
 * expecting the remaining arguments.
 *
 * @param fn - The function to partially apply
 * @param args - The arguments to partially apply
 * @returns The partially applied function
 *
 * @example
 * ```typescript
 * const multiply = (a: number, b: number) => a * b;
 * const double = partial(multiply, 2);
 * double(5); // 10
 * ```
 */
export function partial<T extends (...args: any[]) => any>(
  fn: T,
  ...args: any[]
): (...remainingArgs: any[]) => ReturnType<T> {
  return (...remainingArgs: any[]) => fn(...args, ...remainingArgs);
}

/**
 * Composes functions from right to left.
 *
 * @param fns - The functions to compose
 * @returns The composed function
 *
 * @example
 * ```typescript
 * const add1 = (x: number) => x + 1;
 * const double = (x: number) => x * 2;
 * const add1ThenDouble = compose(double, add1);
 * add1ThenDouble(3); // 8 (3 + 1 = 4, 4 * 2 = 8)
 * ```
 */
export function compose<T>(...fns: Array<(arg: any) => any>): (arg: T) => any {
  return (arg: T) => fns.reduceRight((result, fn) => fn(result), arg);
}

/**
 * Composes functions from left to right (pipe).
 *
 * @param fns - The functions to pipe
 * @returns The piped function
 *
 * @example
 * ```typescript
 * const add1 = (x: number) => x + 1;
 * const double = (x: number) => x * 2;
 * const add1ThenDouble = pipe(add1, double);
 * add1ThenDouble(3); // 8 (3 + 1 = 4, 4 * 2 = 8)
 * ```
 */
export function pipe<T>(...fns: Array<(arg: any) => any>): (arg: T) => any {
  return (arg: T) => fns.reduce((result, fn) => fn(result), arg);
}

/**
 * Delays execution of a function.
 *
 * @param fn - The function to delay
 * @param wait - The delay in milliseconds
 * @returns A function that returns a promise
 *
 * @example
 * ```typescript
 * const delayedLog = delay(() => console.log('Hello'), 1000);
 * delayedLog(); // Logs 'Hello' after 1 second
 * ```
 */
export function delay<T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return (...args: Parameters<T>) =>
    new Promise((resolve) => {
      setTimeout(() => resolve(fn(...args)), wait);
    });
}

/**
 * Creates a function that returns a constant value.
 *
 * @param value - The value to return
 * @returns A function that returns the value
 *
 * @example
 * ```typescript
 * const getFortyTwo = constant(42);
 * getFortyTwo(); // 42
 * ```
 */
export function constant<T>(value: T): () => T {
  return () => value;
}

/**
 * Identity function that returns its argument.
 *
 * @param value - The value to return
 * @returns The same value
 *
 * @example
 * ```typescript
 * identity(5); // 5
 * [1, 2, 3].map(identity); // [1, 2, 3]
 * ```
 */
export function identity<T>(value: T): T {
  return value;
}

/**
 * No-operation function that does nothing.
 *
 * @example
 * ```typescript
 * noop(); // Does nothing
 * const callback = shouldLog ? console.log : noop;
 * ```
 */
export function noop(): void {
  // Intentionally empty
}
