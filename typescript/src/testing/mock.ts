/**
 * Enhanced Mocking Utilities
 *
 * Framework-agnostic mocking utilities for creating spies, stubs, and mocks.
 * Works with Jest, Vitest, or standalone.
 *
 * @module @missionfabric-js/enzyme-typescript/testing/mock
 * @example
 * ```typescript
 * import { createMock, spy, stub } from '@missionfabric-js/enzyme-typescript/testing/mock';
 *
 * // Create a mock function
 * const mockFn = createMock();
 * mockFn('test');
 * console.log(mockFn.mock.calls); // [['test']]
 *
 * // Spy on an object method
 * const obj = { save: () => 'saved' };
 * const saveSpy = spy(obj, 'save');
 * obj.save();
 * console.log(saveSpy.calls); // [[]]
 * saveSpy.restore();
 *
 * // Create a stub with return value
 * const stubFn = stub().returns('mocked value');
 * console.log(stubFn()); // 'mocked value'
 * ```
 */

import type { MockFunction, MockOptions, Spy } from './types';

/**
 * Create a mock function
 *
 * @template TArgs Function argument types
 * @template TReturn Function return type
 * @param options Mock options
 * @returns Mock function
 *
 * @example
 * ```typescript
 * const mockFn = createMock<[string, number], boolean>({
 *   returnValue: true
 * });
 *
 * const result = mockFn('test', 42);
 * console.log(result); // true
 * console.log(mockFn.mock.calls); // [['test', 42]]
 * ```
 */
export function createMock<TArgs extends any[] = any[], TReturn = any>(
  options: MockOptions<TReturn> = {}
): MockFunction<TArgs, TReturn> {
  const calls: TArgs[] = [];
  const results: { type: 'return' | 'throw'; value: TReturn | Error }[] = [];
  const instances: any[] = [];

  const mockFn = function (this: any, ...args: TArgs): TReturn {
    calls.push(args);
    instances.push(this);

    try {
      let result: TReturn;

      if (options.throwError) {
        throw options.throwError;
      }

      if (options.implementation) {
        result = options.implementation(...args);
      } else if (options.resolvedValue !== undefined) {
        result = Promise.resolve(options.resolvedValue) as TReturn;
      } else if (options.rejectedValue !== undefined) {
        result = Promise.reject(options.rejectedValue) as TReturn;
      } else if (options.returnValue !== undefined) {
        result = options.returnValue;
      } else {
        result = undefined as TReturn;
      }

      results.push({ type: 'return', value: result });
      return result;
    } catch (error) {
      results.push({ type: 'throw', value: error as Error });
      throw error;
    }
  } as MockFunction<TArgs, TReturn>;

  mockFn.mock = {
    calls,
    results,
    instances,
  };

  return mockFn;
}

/**
 * Stub builder for creating configurable mock functions
 */
class StubBuilder<TArgs extends any[] = any[], TReturn = any> {
  private implementation?: (...args: TArgs) => TReturn;
  private returnValue?: TReturn;
  private throwError?: Error;
  private resolvedValue?: TReturn;
  private rejectedValue?: Error;
  private callCount = 0;
  private returnValues: TReturn[] = [];
  private callBehaviors: Map<number, () => TReturn> = new Map();

  /**
   * Set the return value
   */
  returns(value: TReturn): this {
    this.returnValue = value;
    return this;
  }

  /**
   * Set the implementation
   */
  callsFake(impl: (...args: TArgs) => TReturn): this {
    this.implementation = impl;
    return this;
  }

  /**
   * Set error to throw
   */
  throws(error: Error | string): this {
    this.throwError = typeof error === 'string' ? new Error(error) : error;
    return this;
  }

  /**
   * Set resolved value (for promise stubs)
   */
  resolves(value: TReturn): this {
    this.resolvedValue = value;
    return this;
  }

  /**
   * Set rejected value (for promise stubs)
   */
  rejects(error: Error | string): this {
    this.rejectedValue = typeof error === 'string' ? new Error(error) : error;
    return this;
  }

  /**
   * Return different values on consecutive calls
   */
  returnsSequence(...values: TReturn[]): this {
    this.returnValues = values;
    return this;
  }

  /**
   * Set behavior for specific call number
   */
  onCall(callNumber: number, behavior: () => TReturn): this {
    this.callBehaviors.set(callNumber, behavior);
    return this;
  }

  /**
   * Return value on first call
   */
  onFirstCall(value: TReturn): this {
    return this.onCall(0, () => value);
  }

  /**
   * Return value on second call
   */
  onSecondCall(value: TReturn): this {
    return this.onCall(1, () => value);
  }

  /**
   * Return value on third call
   */
  onThirdCall(value: TReturn): this {
    return this.onCall(2, () => value);
  }

  /**
   * Build the mock function
   */
  build(): MockFunction<TArgs, TReturn> {
    return createMock<TArgs, TReturn>({
      implementation: (...args: TArgs): TReturn => {
        const currentCall = this.callCount++;

        // Check for call-specific behavior
        if (this.callBehaviors.has(currentCall)) {
          return this.callBehaviors.get(currentCall)!();
        }

        // Check for sequence return values
        if (this.returnValues.length > 0) {
          const index = Math.min(currentCall, this.returnValues.length - 1);
          return this.returnValues[index];
        }

        // Use custom implementation
        if (this.implementation) {
          return this.implementation(...args);
        }

        // Throw error if configured
        if (this.throwError) {
          throw this.throwError;
        }

        // Return resolved/rejected promise
        if (this.resolvedValue !== undefined) {
          return Promise.resolve(this.resolvedValue) as TReturn;
        }
        if (this.rejectedValue !== undefined) {
          return Promise.reject(this.rejectedValue) as TReturn;
        }

        // Return configured value
        if (this.returnValue !== undefined) {
          return this.returnValue;
        }

        return undefined as TReturn;
      },
    });
  }
}

/**
 * Create a stub with fluent builder API
 *
 * @template TArgs Function argument types
 * @template TReturn Function return type
 * @returns Stub builder
 *
 * @example
 * ```typescript
 * const stubFn = stub<[number], string>()
 *   .onFirstCall('first')
 *   .onSecondCall('second')
 *   .returns('default')
 *   .build();
 *
 * console.log(stubFn(1)); // 'first'
 * console.log(stubFn(2)); // 'second'
 * console.log(stubFn(3)); // 'default'
 * ```
 */
export function stub<TArgs extends any[] = any[], TReturn = any>(): StubBuilder<TArgs, TReturn> {
  return new StubBuilder<TArgs, TReturn>();
}

/**
 * Spy on an object's method
 *
 * @template TObj Object type
 * @template TMethod Method name
 * @param obj Object to spy on
 * @param method Method name
 * @returns Spy instance
 *
 * @example
 * ```typescript
 * const calculator = {
 *   add: (a: number, b: number) => a + b
 * };
 *
 * const addSpy = spy(calculator, 'add');
 * calculator.add(2, 3);
 *
 * console.log(addSpy.calls); // [[2, 3]]
 * console.log(addSpy.mock.results); // [{ type: 'return', value: 5 }]
 *
 * addSpy.restore();
 * ```
 */
export function spy<TObj extends Record<string, any>, TMethod extends keyof TObj>(
  obj: TObj,
  method: TMethod
): Spy<TObj, TMethod> {
  const original = obj[method];
  const calls: any[][] = [];

  if (typeof original !== 'function') {
    throw new Error(`Property '${String(method)}' is not a function`);
  }

  const mockFn = createMock({
    implementation: (...args: any[]) => {
      calls.push(args);
      return (original as Function).apply(obj, args);
    },
  });

  obj[method] = mockFn as TObj[TMethod];

  return {
    original,
    restore: () => {
      obj[method] = original;
    },
    mock: mockFn,
    calls,
  };
}

/**
 * Create a deep mock of an object with all methods mocked
 *
 * @template T Object type
 * @param partial Partial implementation
 * @returns Mocked object
 *
 * @example
 * ```typescript
 * interface UserService {
 *   getUser(id: string): Promise<User>;
 *   saveUser(user: User): Promise<void>;
 *   deleteUser(id: string): Promise<void>;
 * }
 *
 * const mockService = mockDeep<UserService>({
 *   getUser: stub<[string], Promise<User>>()
 *     .resolves({ id: '1', name: 'Test' })
 *     .build()
 * });
 * ```
 */
export function mockDeep<T extends Record<string, any>>(partial: Partial<T> = {}): T {
  return new Proxy(partial as T, {
    get(target, prop) {
      if (prop in target) {
        return target[prop as keyof T];
      }

      // Create a mock function for any accessed property
      const mockFn = createMock();
      target[prop as keyof T] = mockFn as T[keyof T];
      return mockFn;
    },
  });
}

/**
 * Create a mock implementation of a class
 *
 * @template T Class type
 * @param constructor Class constructor
 * @param implementation Partial implementation
 * @returns Mocked instance
 *
 * @example
 * ```typescript
 * class UserRepository {
 *   findById(id: string): User | null {
 *     throw new Error('Not implemented');
 *   }
 *   save(user: User): void {
 *     throw new Error('Not implemented');
 *   }
 * }
 *
 * const mockRepo = mockClass(UserRepository, {
 *   findById: stub<[string], User | null>()
 *     .returns({ id: '1', name: 'Test' })
 *     .build()
 * });
 * ```
 */
export function mockClass<T>(
  constructor: new (...args: any[]) => T,
  implementation: Partial<T> = {}
): T {
  const instance = Object.create(constructor.prototype);

  // Copy provided implementations
  Object.assign(instance, implementation);

  // Mock all prototype methods not already provided
  const proto = constructor.prototype;
  const propertyNames = Object.getOwnPropertyNames(proto);

  for (const name of propertyNames) {
    if (name === 'constructor') continue;

    const descriptor = Object.getOwnPropertyDescriptor(proto, name);
    if (descriptor && typeof descriptor.value === 'function') {
      if (!(name in implementation)) {
        instance[name] = createMock();
      }
    }
  }

  return instance;
}

/**
 * Reset a mock function's state
 *
 * @param mockFn Mock function to reset
 *
 * @example
 * ```typescript
 * const mockFn = createMock();
 * mockFn('test');
 * resetMock(mockFn);
 * console.log(mockFn.mock.calls.length); // 0
 * ```
 */
export function resetMock(mockFn: MockFunction): void {
  mockFn.mock.calls.length = 0;
  mockFn.mock.results.length = 0;
  mockFn.mock.instances.length = 0;
}

/**
 * Clear all calls from a mock but preserve implementation
 *
 * @param mockFn Mock function to clear
 *
 * @example
 * ```typescript
 * const mockFn = createMock({ returnValue: 'test' });
 * mockFn();
 * clearMock(mockFn);
 * console.log(mockFn.mock.calls.length); // 0
 * console.log(mockFn()); // 'test' (implementation preserved)
 * ```
 */
export function clearMock(mockFn: MockFunction): void {
  mockFn.mock.calls.length = 0;
  mockFn.mock.results.length = 0;
  mockFn.mock.instances.length = 0;
}

/**
 * Check if a mock was called
 *
 * @param mockFn Mock function to check
 * @returns True if called
 *
 * @example
 * ```typescript
 * const mockFn = createMock();
 * console.log(wasCalled(mockFn)); // false
 * mockFn();
 * console.log(wasCalled(mockFn)); // true
 * ```
 */
export function wasCalled(mockFn: MockFunction): boolean {
  return mockFn.mock.calls.length > 0;
}

/**
 * Check if a mock was called with specific arguments
 *
 * @param mockFn Mock function to check
 * @param args Expected arguments
 * @returns True if called with args
 *
 * @example
 * ```typescript
 * const mockFn = createMock();
 * mockFn('test', 42);
 * console.log(wasCalledWith(mockFn, ['test', 42])); // true
 * console.log(wasCalledWith(mockFn, ['other'])); // false
 * ```
 */
export function wasCalledWith(mockFn: MockFunction, args: any[]): boolean {
  return mockFn.mock.calls.some((call) => {
    if (call.length !== args.length) return false;
    return call.every((arg, index) => arg === args[index]);
  });
}

/**
 * Get the number of times a mock was called
 *
 * @param mockFn Mock function to check
 * @returns Call count
 *
 * @example
 * ```typescript
 * const mockFn = createMock();
 * mockFn();
 * mockFn();
 * console.log(getCallCount(mockFn)); // 2
 * ```
 */
export function getCallCount(mockFn: MockFunction): number {
  return mockFn.mock.calls.length;
}

/**
 * Get the arguments from a specific call
 *
 * @param mockFn Mock function
 * @param callIndex Call index (0-based)
 * @returns Arguments from that call
 *
 * @example
 * ```typescript
 * const mockFn = createMock();
 * mockFn('first');
 * mockFn('second');
 * console.log(getCall(mockFn, 0)); // ['first']
 * console.log(getCall(mockFn, 1)); // ['second']
 * ```
 */
export function getCall(mockFn: MockFunction, callIndex: number): any[] {
  return mockFn.mock.calls[callIndex] || [];
}

/**
 * Get the last call arguments
 *
 * @param mockFn Mock function
 * @returns Arguments from last call
 *
 * @example
 * ```typescript
 * const mockFn = createMock();
 * mockFn('first');
 * mockFn('last');
 * console.log(getLastCall(mockFn)); // ['last']
 * ```
 */
export function getLastCall(mockFn: MockFunction): any[] {
  return mockFn.mock.calls[mockFn.mock.calls.length - 1] || [];
}

/**
 * Get the first call arguments
 *
 * @param mockFn Mock function
 * @returns Arguments from first call
 *
 * @example
 * ```typescript
 * const mockFn = createMock();
 * mockFn('first');
 * mockFn('second');
 * console.log(getFirstCall(mockFn)); // ['first']
 * ```
 */
export function getFirstCall(mockFn: MockFunction): any[] {
  return mockFn.mock.calls[0] || [];
}
