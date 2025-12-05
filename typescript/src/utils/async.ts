/**
 * Async Utilities
 *
 * Provides type-safe async utilities for handling promises,
 * delays, retries, and parallel execution.
 *
 * @module utils/async
 * @example
 * ```typescript
 * import { sleep, retry, timeout, parallel } from '@missionfabric-js/enzyme-typescript/utils';
 *
 * await sleep(1000); // Wait 1 second
 * const result = await retry(() => fetchData(), 3);
 * ```
 */

/**
 * Delays execution for a specified number of milliseconds.
 *
 * @param ms - The number of milliseconds to sleep
 * @returns A promise that resolves after the delay
 *
 * @example
 * ```typescript
 * await sleep(1000); // Wait 1 second
 * console.log('1 second later');
 * ```
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Options for retry function.
 */
export interface RetryOptions {
  /** Number of retry attempts */
  attempts?: number;
  /** Delay between retries in milliseconds */
  delay?: number;
  /** Exponential backoff factor */
  backoff?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Function to determine if error should trigger retry */
  shouldRetry?: (error: any) => boolean;
  /** Callback called on each retry */
  onRetry?: (error: any, attempt: number) => void;
}

/**
 * Retries an async function with exponential backoff.
 *
 * @param fn - The async function to retry
 * @param options - Retry options
 * @returns A promise that resolves with the function result
 *
 * @example
 * ```typescript
 * const data = await retry(
 *   () => fetch('/api/data').then(r => r.json()),
 *   { attempts: 3, delay: 1000, backoff: 2 }
 * );
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    attempts = 3,
    delay = 1000,
    backoff = 2,
    maxDelay = 30000,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === attempts || !shouldRetry(error)) {
        throw error;
      }

      const currentDelay = Math.min(delay * Math.pow(backoff, attempt - 1), maxDelay);

      if (onRetry) {
        onRetry(error, attempt);
      }

      await sleep(currentDelay);
    }
  }

  throw lastError;
}

/**
 * Wraps a promise with a timeout.
 *
 * @param promise - The promise to wrap
 * @param ms - The timeout in milliseconds
 * @param errorMessage - Optional custom error message
 * @returns A promise that rejects if timeout is reached
 *
 * @example
 * ```typescript
 * const data = await timeout(
 *   fetch('/api/data'),
 *   5000,
 *   'Request timed out'
 * );
 * ```
 */
export async function timeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Executes async functions in parallel with a concurrency limit.
 *
 * @param tasks - Array of async functions
 * @param concurrency - Maximum number of concurrent executions
 * @returns A promise that resolves with all results
 *
 * @example
 * ```typescript
 * const tasks = urls.map(url => () => fetch(url));
 * const results = await parallel(tasks, 3); // Max 3 concurrent requests
 * ```
 */
export async function parallel<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const promise = task().then((result) => {
      results[i] = result;
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex((p) => p === promise),
        1
      );
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Executes async functions in series (one after another).
 *
 * @param tasks - Array of async functions
 * @returns A promise that resolves with all results
 *
 * @example
 * ```typescript
 * const tasks = [
 *   () => step1(),
 *   () => step2(),
 *   () => step3(),
 * ];
 * const results = await series(tasks);
 * ```
 */
export async function series<T>(tasks: Array<() => Promise<T>>): Promise<T[]> {
  const results: T[] = [];

  for (const task of tasks) {
    results.push(await task());
  }

  return results;
}

/**
 * Wraps a promise to always resolve with [error, result] tuple.
 *
 * @param promise - The promise to wrap
 * @returns A promise that resolves with [error, result]
 *
 * @example
 * ```typescript
 * const [error, data] = await toResult(fetch('/api/data'));
 * if (error) {
 *   console.error('Failed:', error);
 * } else {
 *   console.log('Success:', data);
 * }
 * ```
 */
export async function toResult<T>(
  promise: Promise<T>
): Promise<[Error, null] | [null, T]> {
  try {
    const result = await promise;
    return [null, result];
  } catch (error) {
    return [error instanceof Error ? error : new Error(String(error)), null];
  }
}

/**
 * Creates a deferred promise with external resolve/reject.
 *
 * @returns An object with promise and resolve/reject functions
 *
 * @example
 * ```typescript
 * const deferred = createDeferred<string>();
 *
 * setTimeout(() => deferred.resolve('done'), 1000);
 *
 * const result = await deferred.promise; // 'done'
 * ```
 */
export function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: any) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Polls a function until it returns a truthy value or times out.
 *
 * @param fn - The function to poll
 * @param options - Polling options
 * @returns A promise that resolves when condition is met
 *
 * @example
 * ```typescript
 * await poll(
 *   () => document.querySelector('.loaded'),
 *   { interval: 100, timeout: 5000 }
 * );
 * ```
 */
export async function poll<T>(
  fn: () => T | Promise<T>,
  options: {
    interval?: number;
    timeout?: number;
    validate?: (result: T) => boolean;
  } = {}
): Promise<T> {
  const { interval = 100, timeout: timeoutMs = 5000, validate = Boolean } = options;

  const startTime = Date.now();

  while (true) {
    const result = await fn();

    if (validate(result)) {
      return result;
    }

    if (Date.now() - startTime >= timeoutMs) {
      throw new Error('Polling timed out');
    }

    await sleep(interval);
  }
}

/**
 * Debounces an async function, cancelling previous calls.
 *
 * @param fn - The async function to debounce
 * @param wait - The debounce wait time in milliseconds
 * @returns The debounced async function
 *
 * @example
 * ```typescript
 * const debouncedSearch = debounceAsync(
 *   async (query: string) => {
 *     const results = await searchAPI(query);
 *     return results;
 *   },
 *   300
 * );
 * ```
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let latestResolve: ((value: any) => void) | null = null;
  let latestReject: ((reason?: any) => void) | null = null;

  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (latestReject) {
      latestReject(new Error('Debounced'));
    }

    return new Promise((resolve, reject) => {
      latestResolve = resolve;
      latestReject = reject;

      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args);
          if (latestResolve === resolve) {
            resolve(result);
          }
        } catch (error) {
          if (latestReject === reject) {
            reject(error);
          }
        }
      }, wait);
    });
  };
}

/**
 * Executes async functions with a queue.
 *
 * @example
 * ```typescript
 * const queue = new AsyncQueue(2); // Max 2 concurrent
 *
 * const result1 = queue.add(() => fetchData1());
 * const result2 = queue.add(() => fetchData2());
 * const result3 = queue.add(() => fetchData3());
 *
 * await queue.waitAll();
 * ```
 */
export class AsyncQueue {
  private queue: Array<() => Promise<any>> = [];
  private running = 0;

  constructor(private concurrency: number) {}

  /**
   * Adds a task to the queue.
   *
   * @param task - The async function to add
   * @returns A promise that resolves with the task result
   */
  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.process();
    });
  }

  /**
   * Processes queued tasks.
   */
  private async process(): Promise<void> {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.running++;
    const task = this.queue.shift()!;

    try {
      await task();
    } finally {
      this.running--;
      this.process();
    }
  }

  /**
   * Waits for all tasks to complete.
   */
  async waitAll(): Promise<void> {
    while (this.running > 0 || this.queue.length > 0) {
      await sleep(10);
    }
  }

  /**
   * Gets the number of pending tasks.
   */
  get pending(): number {
    return this.queue.length;
  }

  /**
   * Gets the number of running tasks.
   */
  get active(): number {
    return this.running;
  }
}

/**
 * Wraps a callback-style function to return a promise.
 *
 * @param fn - The callback-style function
 * @returns A function that returns a promise
 *
 * @example
 * ```typescript
 * const readFile = promisify(fs.readFile);
 * const content = await readFile('file.txt', 'utf-8');
 * ```
 */
export function promisify<T extends (...args: any[]) => void>(
  fn: T
): (...args: any[]) => Promise<any> {
  return (...args: any[]) =>
    new Promise((resolve, reject) => {
      fn(...args, (error: any, result: any) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
}

/**
 * Race with index - like Promise.race but returns the index of the winner.
 *
 * @param promises - Array of promises
 * @returns A promise that resolves with [result, index]
 *
 * @example
 * ```typescript
 * const [result, index] = await raceWithIndex([
 *   fetch('/api/v1/data'),
 *   fetch('/api/v2/data'),
 * ]);
 * console.log(`Winner was promise ${index}`);
 * ```
 */
export async function raceWithIndex<T>(
  promises: Array<Promise<T>>
): Promise<[T, number]> {
  return Promise.race(
    promises.map((promise, index) =>
      promise.then((result) => [result, index] as [T, number])
    )
  );
}
