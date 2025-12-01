/**
 * @file Safe Operations
 * @description Enterprise-grade utilities for safe JSON parsing, operation timeouts,
 * and defensive coding patterns to prevent blocking and crashes
 */

import type React from 'react';
import { TimeoutError } from './resilience';

/**
 * Result type for operations that can fail
 */
export type SafeResult<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * JSON parse error
 */
export class JSONParseError extends Error {
  readonly isJSONParseError = true;
  readonly originalValue: string;

  constructor(message: string, originalValue: string) {
    super(message);
    this.name = 'JSONParseError';
    this.originalValue = originalValue.substring(0, 100); // Truncate for safety
  }
}

/**
 * Operation timeout error
 */
export class OperationTimeoutError extends TimeoutError {
  readonly operationName: string;
  readonly timeoutMs: number;

  constructor(operationName: string, timeoutMs: number) {
    super(`Operation '${operationName}' timed out after ${timeoutMs}ms`);
    this.name = 'OperationTimeoutError';
    this.operationName = operationName;
    this.timeoutMs = timeoutMs;
  }
}

// ============================================================================
// Safe JSON Parsing
// ============================================================================

/**
 * Safely parse JSON with a fallback value
 *
 * @param value - The JSON string to parse
 * @param fallback - The fallback value if parsing fails
 * @returns The parsed value or fallback
 *
 * @example
 * ```typescript
 * const config = safeJSONParse(configString, { theme: 'light' });
 * ```
 */
export function safeJSONParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * Parse JSON with detailed error information
 *
 * @param value - The JSON string to parse
 * @returns A SafeResult with parsed data or error
 *
 * @example
 * ```typescript
 * const result = parseJSONSafe<Config>(configString);
 * if (result.success) {
 *   useConfig(result.data);
 * } else {
 *   logError(result.error);
 * }
 * ```
 */
export function parseJSONSafe<T>(value: string): SafeResult<T, JSONParseError> {
  try {
    const data = JSON.parse(value) as T;
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parse error';
    return {
      success: false,
      error: new JSONParseError(message, value),
    };
  }
}

/**
 * Parse JSON with validation
 *
 * @param value - The JSON string to parse
 * @param validator - A function to validate the parsed result
 * @param fallback - Optional fallback value if parsing or validation fails
 * @returns The validated parsed value, fallback, or throws
 *
 * @example
 * ```typescript
 * const config = parseJSONWithValidation(
 *   configString,
 *   (data): data is Config => 'theme' in data,
 *   defaultConfig
 * );
 * ```
 */
export function parseJSONWithValidation<T>(
  value: string,
  validator: (data: unknown) => data is T,
  fallback?: T
): T {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (validator(parsed)) {
      return parsed;
    }
    if (fallback !== undefined) {
      return fallback;
    }
    throw new JSONParseError('Parsed value failed validation', value);
  } catch (error) {
    if (fallback !== undefined) {
      return fallback;
    }
    if (error instanceof JSONParseError) {
      throw error;
    }
    throw new JSONParseError(
      error instanceof Error ? error.message : 'Unknown parse error',
      value
    );
  }
}

/**
 * Stringify JSON safely with fallback
 *
 * @param value - The value to stringify
 * @param fallback - The fallback string if stringification fails
 * @returns The JSON string or fallback
 */
export function safeJSONStringify(value: unknown, fallback = '{}'): string {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

// ============================================================================
// Operation Timeouts
// ============================================================================

/**
 * Execute an async operation with timeout
 *
 * @param operation - The async operation to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param operationName - Name of the operation for error messages
 * @returns The operation result
 * @throws OperationTimeoutError if the operation times out
 *
 * @example
 * ```typescript
 * const data = await withOperationTimeout(
 *   () => fetchData(),
 *   5000,
 *   'fetchData'
 * );
 * ```
 */
export async function withOperationTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  operationName = 'operation'
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new OperationTimeoutError(operationName, timeoutMs));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([operation(), timeoutPromise]);
    return result;
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Execute an async operation with timeout and fallback
 *
 * @param operation - The async operation to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param fallback - Fallback value if operation times out
 * @param operationName - Name of the operation for logging
 * @returns The operation result or fallback
 *
 * @example
 * ```typescript
 * const config = await withTimeoutFallback(
 *   () => fetchRemoteConfig(),
 *   5000,
 *   defaultConfig,
 *   'fetchRemoteConfig'
 * );
 * ```
 */
export async function withTimeoutFallback<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  fallback: T,
  operationName = 'operation'
): Promise<T> {
  try {
    return await withOperationTimeout(operation, timeoutMs, operationName);
  } catch (error) {
    if (error instanceof OperationTimeoutError) {
      console.warn(`[${operationName}] Timed out after ${timeoutMs}ms, using fallback`);
      return fallback;
    }
    throw error;
  }
}

/**
 * Execute a sync operation with timeout using a promise wrapper
 * Note: This doesn't actually interrupt the sync operation,
 * but provides timeout behavior for tracking purposes
 *
 * @param operation - The sync operation to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param operationName - Name of the operation
 */
export async function withSyncTimeout<T>(
  operation: () => T,
  timeoutMs: number,
  operationName = 'operation'
): Promise<T> {
  return withOperationTimeout(
    async () => operation(),
    timeoutMs,
    operationName
  );
}

// ============================================================================
// Safe Storage Operations
// ============================================================================

/**
 * Safely get item from localStorage with fallback
 *
 * @param key - The storage key
 * @param fallback - The fallback value if retrieval fails
 * @returns The stored value or fallback
 */
export function safeLocalStorageGet<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === 'undefined') {
      return fallback;
    }
    const item = localStorage.getItem(key);
    if (item === null) {
      return fallback;
    }
    return safeJSONParse(item, fallback);
  } catch {
    // localStorage can throw in private browsing mode or when disabled
    return fallback;
  }
}

/**
 * Safely set item in localStorage
 *
 * @param key - The storage key
 * @param value - The value to store
 * @returns true if successful, false otherwise
 */
export function safeLocalStorageSet(key: string, value: unknown): boolean {
  try {
    if (typeof localStorage === 'undefined') {
      return false;
    }
    localStorage.setItem(key, safeJSONStringify(value));
    return true;
  } catch (error) {
    // Handle QuotaExceededError and other storage errors
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('[Storage] Quota exceeded for key:', key);
    }
    return false;
  }
}

/**
 * Safely remove item from localStorage
 *
 * @param key - The storage key
 * @returns true if successful, false otherwise
 */
export function safeLocalStorageRemove(key: string): boolean {
  try {
    if (typeof localStorage === 'undefined') {
      return false;
    }
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely get item from sessionStorage with fallback
 */
export function safeSessionStorageGet<T>(key: string, fallback: T): T {
  try {
    if (typeof sessionStorage === 'undefined') {
      return fallback;
    }
    const item = sessionStorage.getItem(key);
    if (item === null) {
      return fallback;
    }
    return safeJSONParse(item, fallback);
  } catch {
    return fallback;
  }
}

/**
 * Safely set item in sessionStorage
 */
export function safeSessionStorageSet(key: string, value: unknown): boolean {
  try {
    if (typeof sessionStorage === 'undefined') {
      return false;
    }
    sessionStorage.setItem(key, safeJSONStringify(value));
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Safe Property Access
// ============================================================================

/**
 * Safely access a nested property with fallback
 *
 * @param obj - The object to access
 * @param path - The property path (e.g., 'user.profile.name')
 * @param fallback - The fallback value if access fails
 * @returns The property value or fallback
 *
 * @example
 * ```typescript
 * const name = safeGet(user, 'profile.name', 'Anonymous');
 * ```
 */
export function safeGet<T>(obj: unknown, path: string, fallback: T): T {
  try {
    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return fallback;
      }
      current = (current as Record<string, unknown>)[key];
    }

    return current !== undefined ? (current as T) : fallback;
  } catch {
    return fallback;
  }
}

// ============================================================================
// Safe Function Execution
// ============================================================================

/**
 * Execute a function safely, catching any errors
 *
 * @param fn - The function to execute
 * @param fallback - The fallback value if execution fails
 * @param onError - Optional error handler
 * @returns The function result or fallback
 */
export function safeExecute<T>(
  fn: () => T,
  fallback: T,
  onError?: (error: unknown) => void
): T {
  try {
    return fn();
  } catch (error) {
    onError?.(error);
    return fallback;
  }
}

/**
 * Execute an async function safely, catching any errors
 *
 * @param fn - The async function to execute
 * @param fallback - The fallback value if execution fails
 * @param onError - Optional error handler
 * @returns The function result or fallback
 */
export async function safeExecuteAsync<T>(
  fn: () => Promise<T>,
  fallback: T,
  onError?: (error: unknown) => void
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    onError?.(error);
    return fallback;
  }
}

// ============================================================================
// Promise Utilities
// ============================================================================

/**
 * Execute multiple promises and collect results with errors
 * This is a wrapper around Promise.allSettled with better typing
 *
 * @param promises - Array of promises to execute
 * @returns Object with successful results and errors
 *
 * @example
 * ```typescript
 * const { results, errors } = await safePromiseAll([
 *   fetchUser(),
 *   fetchPosts(),
 *   fetchComments(),
 * ]);
 * ```
 */
export async function safePromiseAll<T>(
  promises: Promise<T>[]
): Promise<{
  results: T[];
  errors: { index: number; error: unknown }[];
  allSucceeded: boolean;
}> {
  const settled = await Promise.allSettled(promises);

  const results: T[] = [];
  const errors: { index: number; error: unknown }[] = [];

  settled.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      errors.push({ index, error: result.reason });
    }
  });

  return {
    results,
    errors,
    allSucceeded: errors.length === 0,
  };
}

/**
 * Execute multiple named promises and collect results with errors
 *
 * @param namedPromises - Object with named promises
 * @returns Object with results, errors, and success status
 *
 * @example
 * ```typescript
 * const { results, errors } = await safePromiseAllNamed({
 *   user: fetchUser(),
 *   posts: fetchPosts(),
 *   comments: fetchComments(),
 * });
 *
 * if (results.user) {
 *   // User was fetched successfully
 * }
 * ```
 */
export async function safePromiseAllNamed<T extends Record<string, Promise<unknown>>>(
  namedPromises: T
): Promise<{
  results: { [K in keyof T]?: Awaited<T[K]> };
  errors: { [K in keyof T]?: unknown };
  allSucceeded: boolean;
}> {
  const keys = Object.keys(namedPromises) as (keyof T)[];
  const promises = keys.map((key) => namedPromises[key]);

  const settled = await Promise.allSettled(promises);

  const results: { [K in keyof T]?: Awaited<T[K]> } = {};
  const errors: { [K in keyof T]?: unknown } = {};

  settled.forEach((result, index) => {
    const key = keys[index];
    if (result.status === 'fulfilled') {
      results[key] = result.value as Awaited<T[typeof key]>;
    } else {
      errors[key] = result.reason;
    }
  });

  return {
    results,
    errors,
    allSucceeded: Object.keys(errors).length === 0,
  };
}

// ============================================================================
// Event Handler Safety
// ============================================================================

/**
 * Create a safe event handler that catches errors
 *
 * @param handler - The event handler function
 * @param onError - Optional error handler
 * @returns A wrapped handler that catches errors
 *
 * @example
 * ```typescript
 * <button onClick={createSafeHandler(handleClick, reportError)}>
 *   Click me
 * </button>
 * ```
 */
export function createSafeHandler<E extends Event>(
  handler: (event: E) => void | Promise<void>,
  onError?: (error: unknown, event: E) => void
): (event: E) => void {
  return (event: E) => {
    try {
      const result = handler(event);
      if (result instanceof Promise) {
        result.catch((error) => {
          onError?.(error, event);
        });
      }
    } catch (error) {
      onError?.(error, event);
    }
  };
}

/**
 * Create a safe React event handler
 */
export function createSafeReactHandler<E extends React.SyntheticEvent>(
  handler: (event: E) => void | Promise<void>,
  onError?: (error: unknown, event: E) => void
): (event: E) => void {
  return (event: E) => {
    try {
      const result = handler(event);
      if (result instanceof Promise) {
        result.catch((error) => {
          onError?.(error, event);
        });
      }
    } catch (error) {
      onError?.(error, event);
    }
  };
}
