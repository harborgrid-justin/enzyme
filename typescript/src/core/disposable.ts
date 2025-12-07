/**
 * Resource disposal patterns using Symbol.dispose and Symbol.asyncDispose.
 *
 * Provides utilities for managing resources that need cleanup, leveraging
 * the TC39 Explicit Resource Management proposal (using statement).
 *
 * @example
 * ```typescript
 * // Using the 'using' keyword (when available)
 * {
 *   using file = createFileHandle('data.txt');
 *   // File is automatically closed when scope exits
 * }
 *
 * // Manual disposal
 * const resource = createResource();
 * try {
 *   // Use resource...
 * } finally {
 *   resource[Symbol.dispose]();
 * }
 * ```
 *
 * @module core/disposable
 */

/**
 * Interface for synchronously disposable resources.
 */
export interface Disposable {
  /**
   * Disposes of the resource.
   */
  [Symbol.dispose](): void;
}

/**
 * Interface for asynchronously disposable resources.
 */
export interface AsyncDisposable {
  /**
   * Asynchronously disposes of the resource.
   */
  [Symbol.asyncDispose](): Promise<void>;
}

/**
 * Type guard to check if an object is Disposable.
 *
 * @param obj - The object to check
 * @returns True if the object has a dispose method
 */
export function isDisposable(obj: unknown): obj is Disposable {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    Symbol.dispose in obj &&
    typeof (obj as Record<symbol, unknown>)[Symbol.dispose] === 'function'
  );
}

/**
 * Type guard to check if an object is AsyncDisposable.
 *
 * @param obj - The object to check
 * @returns True if the object has an async dispose method
 */
export function isAsyncDisposable(obj: unknown): obj is AsyncDisposable {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    Symbol.asyncDispose in obj &&
    typeof (obj as Record<symbol, unknown>)[Symbol.asyncDispose] === 'function'
  );
}

/**
 * Creates a Disposable wrapper around a cleanup function.
 *
 * @param cleanup - The cleanup function to call on disposal
 * @returns A Disposable object
 *
 * @example
 * ```typescript
 * const timer = createDisposable(() => {
 *   clearInterval(intervalId);
 * });
 *
 * // Later...
 * timer[Symbol.dispose]();
 * ```
 */
export function createDisposable(cleanup: () => void): Disposable {
  let disposed = false;

  return {
    [Symbol.dispose](): void {
      if (!disposed) {
        disposed = true;
        cleanup();
      }
    },
  };
}

/**
 * Creates an AsyncDisposable wrapper around an async cleanup function.
 *
 * @param cleanup - The async cleanup function to call on disposal
 * @returns An AsyncDisposable object
 *
 * @example
 * ```typescript
 * const connection = createAsyncDisposable(async () => {
 *   await db.disconnect();
 * });
 *
 * // Later...
 * await connection[Symbol.asyncDispose]();
 * ```
 */
export function createAsyncDisposable(
  cleanup: () => Promise<void>
): AsyncDisposable {
  let disposed = false;

  return {
    async [Symbol.asyncDispose](): Promise<void> {
      if (!disposed) {
        disposed = true;
        await cleanup();
      }
    },
  };
}

/**
 * Disposes of a resource safely, catching any errors.
 *
 * @param resource - The resource to dispose
 * @returns The error if disposal failed, undefined otherwise
 *
 * @example
 * ```typescript
 * const resource = createResource();
 * const error = safeDispose(resource);
 * if (error) {
 *   console.error('Failed to dispose resource:', error);
 * }
 * ```
 */
export function safeDispose(resource: Disposable | null | undefined): Error | undefined {
  if (resource == null) {
    return undefined;
  }

  try {
    resource[Symbol.dispose]();
    return undefined;
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Asynchronously disposes of a resource safely, catching any errors.
 *
 * @param resource - The resource to dispose
 * @returns Promise resolving to the error if disposal failed
 */
export async function safeAsyncDispose(
  resource: AsyncDisposable | null | undefined
): Promise<Error | undefined> {
  if (resource == null) {
    return undefined;
  }

  try {
    await resource[Symbol.asyncDispose]();
    return undefined;
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * DisposableStack for managing multiple disposable resources.
 *
 * @example
 * ```typescript
 * const stack = new DisposableStack();
 * stack.use(createFileHandle('file1.txt'));
 * stack.use(createFileHandle('file2.txt'));
 * stack.defer(() => console.log('Cleanup!'));
 *
 * // Dispose all resources in reverse order
 * stack[Symbol.dispose]();
 * ```
 */
export class DisposableStack implements Disposable {
  private readonly stack: Array<Disposable | (() => void)> = [];
  private disposed = false;

  /**
   * Adds a disposable resource to the stack.
   *
   * @param resource - The resource to add
   * @returns The resource (for chaining)
   */
  use<T extends Disposable>(resource: T): T {
    this.checkNotDisposed();
    this.stack.push(resource);
    return resource;
  }

  /**
   * Adds a cleanup function to the stack.
   *
   * @param cleanup - The cleanup function
   */
  defer(cleanup: () => void): void {
    this.checkNotDisposed();
    this.stack.push(cleanup);
  }

  /**
   * Moves resources from another stack to this stack.
   *
   * @param from - The stack to move from
   */
  move(from: DisposableStack): void {
    this.checkNotDisposed();
    from.checkNotDisposed();

    // Move resources
    while (from.stack.length > 0) {
      const resource = from.stack.pop()!;
      this.stack.push(resource);
    }

    // Mark source stack as disposed
    from.disposed = true;
  }

  /**
   * Disposes all resources in reverse order.
   */
  [Symbol.dispose](): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    const errors: Error[] = [];

    // Dispose in reverse order (LIFO)
    while (this.stack.length > 0) {
      const resource = this.stack.pop()!;

      try {
        if (typeof resource === 'function') {
          resource();
        } else {
          resource[Symbol.dispose]();
        }
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    // If there were errors, throw an aggregate error
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Errors occurred during disposal');
    }
  }

  /**
   * Checks if the stack has been disposed.
   */
  get isDisposed(): boolean {
    return this.disposed;
  }

  private checkNotDisposed(): void {
    if (this.disposed) {
      throw new Error('DisposableStack has already been disposed');
    }
  }
}

/**
 * AsyncDisposableStack for managing multiple async disposable resources.
 *
 * @example
 * ```typescript
 * const stack = new AsyncDisposableStack();
 * await stack.use(createDatabaseConnection());
 * await stack.use(createFileHandle('data.txt'));
 * stack.defer(async () => {
 *   await cleanup();
 * });
 *
 * // Dispose all resources in reverse order
 * await stack[Symbol.asyncDispose]();
 * ```
 */
export class AsyncDisposableStack implements AsyncDisposable {
  private readonly stack: Array<AsyncDisposable | (() => Promise<void>)> = [];
  private disposed = false;

  /**
   * Adds an async disposable resource to the stack.
   *
   * @param resource - The resource to add
   * @returns The resource (for chaining)
   */
  use<T extends AsyncDisposable>(resource: T): T {
    this.checkNotDisposed();
    this.stack.push(resource);
    return resource;
  }

  /**
   * Adds an async cleanup function to the stack.
   *
   * @param cleanup - The async cleanup function
   */
  defer(cleanup: () => Promise<void>): void {
    this.checkNotDisposed();
    this.stack.push(cleanup);
  }

  /**
   * Moves resources from another stack to this stack.
   *
   * @param from - The stack to move from
   */
  move(from: AsyncDisposableStack): void {
    this.checkNotDisposed();
    from.checkNotDisposed();

    // Move resources
    while (from.stack.length > 0) {
      const resource = from.stack.pop()!;
      this.stack.push(resource);
    }

    // Mark source stack as disposed
    from.disposed = true;
  }

  /**
   * Asynchronously disposes all resources in reverse order.
   */
  async [Symbol.asyncDispose](): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    const errors: Error[] = [];

    // Dispose in reverse order (LIFO)
    while (this.stack.length > 0) {
      const resource = this.stack.pop()!;

      try {
        if (typeof resource === 'function') {
          await resource();
        } else {
          await resource[Symbol.asyncDispose]();
        }
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    // If there were errors, throw an aggregate error
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Errors occurred during disposal');
    }
  }

  /**
   * Checks if the stack has been disposed.
   */
  get isDisposed(): boolean {
    return this.disposed;
  }

  private checkNotDisposed(): void {
    if (this.disposed) {
      throw new Error('AsyncDisposableStack has already been disposed');
    }
  }
}

/**
 * Helper to safely execute code with automatic resource disposal.
 *
 * @param factory - Function that creates a disposable resource
 * @param action - Function to execute with the resource
 * @returns The result of the action
 *
 * @example
 * ```typescript
 * const result = withDisposable(
 *   () => createFileHandle('data.txt'),
 *   (file) => {
 *     return file.read();
 *   }
 * );
 * // File is automatically disposed
 * ```
 */
export function withDisposable<T extends Disposable, R>(
  factory: () => T,
  action: (resource: T) => R
): R {
  const resource = factory();
  try {
    return action(resource);
  } finally {
    resource[Symbol.dispose]();
  }
}

/**
 * Helper to safely execute async code with automatic resource disposal.
 *
 * @param factory - Function that creates an async disposable resource
 * @param action - Async function to execute with the resource
 * @returns Promise of the action result
 *
 * @example
 * ```typescript
 * const result = await withAsyncDisposable(
 *   async () => createDatabaseConnection(),
 *   async (db) => {
 *     return await db.query('SELECT * FROM users');
 *   }
 * );
 * // Connection is automatically disposed
 * ```
 */
export async function withAsyncDisposable<T extends AsyncDisposable, R>(
  factory: () => Promise<T>,
  action: (resource: T) => Promise<R>
): Promise<R> {
  const resource = await factory();
  try {
    return await action(resource);
  } finally {
    await resource[Symbol.asyncDispose]();
  }
}

/**
 * Combines multiple disposables into a single disposable.
 *
 * @param disposables - Array of disposables to combine
 * @returns A single Disposable that disposes all resources
 *
 * @example
 * ```typescript
 * const combined = combineDisposables([
 *   createFileHandle('file1.txt'),
 *   createFileHandle('file2.txt'),
 * ]);
 *
 * // Dispose all at once
 * combined[Symbol.dispose]();
 * ```
 */
export function combineDisposables(disposables: Disposable[]): Disposable {
  return createDisposable(() => {
    const errors: Error[] = [];

    // Dispose in reverse order
    for (let i = disposables.length - 1; i >= 0; i--) {
      const error = safeDispose(disposables[i]);
      if (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(errors, 'Errors occurred during disposal');
    }
  });
}

/**
 * Combines multiple async disposables into a single async disposable.
 *
 * @param disposables - Array of async disposables to combine
 * @returns A single AsyncDisposable that disposes all resources
 */
export function combineAsyncDisposables(
  disposables: AsyncDisposable[]
): AsyncDisposable {
  return createAsyncDisposable(async () => {
    const errors: Error[] = [];

    // Dispose in reverse order
    for (let i = disposables.length - 1; i >= 0; i--) {
      const error = await safeAsyncDispose(disposables[i]);
      if (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(errors, 'Errors occurred during disposal');
    }
  });
}
