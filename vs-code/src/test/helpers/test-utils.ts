/**
 * @file Test Utilities
 * @description Common test utilities and helpers for unit and integration tests
 */

import { vi, expect } from 'vitest';

/**
 * Creates a mock function with type safety
 * @template T - The function type
 * @returns A mock function
 * @example
 * const mockFn = createMock<(x: number) => string>();
 * mockFn.mockReturnValue('test');
 */
export function createMock<T extends (...args: any[]) => any>() {
  return vi.fn<Parameters<T>, ReturnType<T>>();
}

/**
 * Waits for a specified number of milliseconds
 * Useful for testing async operations and timeouts
 * @param ms - Milliseconds to wait
 * @returns Promise that resolves after the specified time
 * @example
 * await wait(100); // Wait 100ms
 */
export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Waits for a condition to become true
 * @param condition - Function that returns true when condition is met
 * @param options - Configuration options
 * @param options.timeout - Maximum time to wait in milliseconds (default: 5000)
 * @param options.interval - Check interval in milliseconds (default: 100)
 * @returns Promise that resolves when condition is true
 * @throws Error if timeout is reached
 * @example
 * await waitFor(() => element.isVisible(), { timeout: 3000 });
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await wait(interval);
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Flushes all pending promises in the microtask queue
 * Useful for testing promise chains
 * @returns Promise that resolves after all pending promises
 * @example
 * await flushPromises();
 */
export async function flushPromises(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

/**
 * Creates a deferred promise that can be resolved or rejected externally
 * @template T - Type of the resolved value
 * @returns Object with promise and control functions
 * @example
 * const deferred = createDeferred<string>();
 * doSomething().then(() => deferred.resolve('done'));
 * await deferred.promise;
 */
export function createDeferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Captures all calls to console methods during test execution
 * @returns Object with captured logs and restore function
 * @example
 * const captured = captureConsole();
 * console.log('test');
 * expect(captured.logs).toContain('test');
 * captured.restore();
 */
export function captureConsole() {
  const logs: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = vi.fn((...args: any[]) => {
    logs.push(args.join(' '));
  });

  console.warn = vi.fn((...args: any[]) => {
    warnings.push(args.join(' '));
  });

  console.error = vi.fn((...args: any[]) => {
    errors.push(args.join(' '));
  });

  return {
    logs,
    warnings,
    errors,
    restore: () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    },
  };
}

/**
 * Creates a mock Date object with a fixed timestamp
 * @param timestamp - The fixed timestamp (default: 0)
 * @returns Object with mock date and restore function
 * @example
 * const mockDate = createMockDate(new Date('2024-01-01').getTime());
 * // All Date operations use 2024-01-01
 * mockDate.restore();
 */
export function createMockDate(timestamp = 0) {
  const OriginalDate = global.Date;

  /**
   *
   */
  class MockDate extends Date {
    /**
     *
     * @param {...any} args
     */
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(timestamp);
      } else {
        super(args[0] as any);
      }
    }

    /**
     *
     */
    static override now() {
      return timestamp;
    }
  }

  global.Date = MockDate as any;

  return {
    restore: () => {
      global.Date = OriginalDate;
    },
    setTimestamp: (newTimestamp: number) => {
      timestamp = newTimestamp;
    },
  };
}

/**
 * Creates a spy on an object method
 * @template T - Type of the object
 * @template K - Type of the method name
 * @param obj - The object containing the method
 * @param object
 * @param method - The method name to spy on
 * @returns Spy function
 * @example
 * const spy = spyOn(myObject, 'methodName');
 * expect(spy).toHaveBeenCalled();
 */
export function spyOn<T extends object, K extends keyof T>(
  object: T,
  method: K
): T[K] extends (...args: any[]) => any ? ReturnType<typeof vi.spyOn> : never {
  return vi.spyOn(object, method as any) as any;
}

/**
 * Creates a mock implementation that calls different functions based on call count
 * @template T - Function type
 * @param implementations - Array of implementations to use in order
 * @returns Mock function
 * @example
 * const mock = createSequentialMock([
 *   () => 'first',
 *   () => 'second',
 *   () => 'third'
 * ]);
 */
export function createSequentialMock<T extends (...args: any[]) => any>(
  implementations: Array<(...args: Parameters<T>) => ReturnType<T>>
) {
  let callCount = 0;

  return vi.fn((...args: Parameters<T>): ReturnType<T> => {
    const impl = implementations[callCount] || implementations[implementations.length - 1];
    callCount++;
    if (!impl) {
      throw new Error('No implementations provided to createSequentialMock');
    }
    return impl(...args);
  });
}

/**
 * Asserts that a function throws a specific error
 * @param fn - Function to test
 * @param expectedError - Expected error message or error class
 * @returns Promise that resolves if error is thrown
 * @example
 * await expectError(() => throwingFunction(), 'Expected error message');
 */
export async function expectError(
  fn: () => any | Promise<any>,
  expectedError?: string | RegExp | (new (...args: any[]) => Error)
): Promise<Error> {
  try {
    await fn();
    throw new Error('Expected function to throw an error, but it did not');
  } catch (error) {
    if (expectedError) {
      if (typeof expectedError === 'string') {
        expect((error as Error).message).toContain(expectedError);
      } else if (expectedError instanceof RegExp) {
        expect((error as Error).message).toMatch(expectedError);
      } else if (typeof expectedError === 'function') {
        expect(error).toBeInstanceOf(expectedError);
      }
    }
    return error as Error;
  }
}

/**
 * Creates a mock timer that can be controlled manually
 * @returns Object with timer control functions
 * @example
 * const timer = createMockTimer();
 * setTimeout(() => console.log('fired'), 1000);
 * timer.tick(1000); // Fires the timeout
 * timer.restore();
 */
export function createMockTimer() {
  vi.useFakeTimers();

  return {
    /**
     * Advances timers by the specified milliseconds
     * @param ms - Milliseconds to advance
     */
    tick: (ms: number) => {
      vi.advanceTimersByTime(ms);
    },
    /**
     * Runs all pending timers
     */
    runAll: () => {
      vi.runAllTimers();
    },
    /**
     * Runs only currently pending timers (not newly scheduled ones)
     */
    runPending: () => {
      vi.runOnlyPendingTimers();
    },
    /**
     * Restores real timers
     */
    restore: () => {
      vi.useRealTimers();
    },
    /**
     * Clears all timers
     */
    clear: () => {
      vi.clearAllTimers();
    },
  };
}

/**
 * Creates a mock file system for testing file operations
 * @returns Mock file system with common operations
 * @example
 * const fs = createMockFileSystem();
 * fs.addFile('/path/to/file.txt', 'content');
 * expect(fs.readFile('/path/to/file.txt')).toBe('content');
 */
export function createMockFileSystem() {
  const files = new Map<string, string>();

  return {
    /**
     * Adds a file to the mock file system
     * @param path - File path
     * @param content - File content
     */
    addFile: (path: string, content: string) => {
      files.set(path, content);
    },
    /**
     * Reads a file from the mock file system
     * @param path - File path
     * @returns File content or undefined if not found
     */
    readFile: (path: string): string | undefined => {
      return files.get(path);
    },
    /**
     * Checks if a file exists
     * @param path - File path
     * @returns True if file exists
     */
    exists: (path: string): boolean => {
      return files.has(path);
    },
    /**
     * Deletes a file
     * @param path - File path
     */
    deleteFile: (path: string) => {
      files.delete(path);
    },
    /**
     * Lists all files
     * @returns Array of file paths
     */
    listFiles: (): string[] => {
      return [...files.keys()];
    },
    /**
     * Clears all files
     */
    clear: () => {
      files.clear();
    },
  };
}

/**
 * Generates random test data
 * @param type - Type of data to generate
 * @param options - Generation options
 * @param options.length
 * @param options.min
 * @param options.max
 * @returns Generated test data
 * @example
 * const id = generateTestData('id'); // '1a2b3c4d'
 * const email = generateTestData('email'); // 'user123@example.com'
 */
export function generateTestData(
  type: 'id' | 'email' | 'string' | 'number',
  options: { length?: number; min?: number; max?: number } = {}
): string | number {
  switch (type) {
    case 'id':
      return Math.random().toString(36).slice(2, 10);

    case 'email':
      const randomId = Math.random().toString(36).slice(2, 8);
      return `user${randomId}@example.com`;

    case 'string': {
      const length = options.length || 10;
      return Math.random()
        .toString(36)
        .substring(2, 2 + length);
    }

    case 'number': {
      const min = options.min || 0;
      const max = options.max || 100;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    default:
      return '';
  }
}

/**
 * Creates a snapshot matcher for objects
 * Useful for testing complex object structures
 * @param obj - Object to create snapshot for
 * @param object
 * @returns Stringified snapshot
 * @example
 * expect(createSnapshot(result)).toMatchInlineSnapshot();
 */
export function createSnapshot(object: any): string {
  return JSON.stringify(object, null, 2);
}

/**
 * Asserts that two objects have the same structure (ignoring specific values)
 * @param actual - Actual object
 * @param expected - Expected object structure
 * @example
 * assertStructure({ id: '123', name: 'test' }, { id: expect.any(String), name: 'test' });
 */
export function assertStructure(actual: any, expected: any): void {
  expect(actual).toMatchObject(expected);
}

/**
 * Retries an async operation a specified number of times
 * @param operation - Async operation to retry
 * @param options - Retry options
 * @param options.maxAttempts
 * @param options.delay
 * @returns Result of the operation
 * @example
 * const result = await retry(() => flakeyOperation(), { maxAttempts: 3 });
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: { maxAttempts?: number; delay?: number } = {}
): Promise<T> {
  const { maxAttempts = 3, delay = 100 } = options;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await wait(delay);
      }
    }
  }

  throw lastError || new Error('Retry failed');
}
