/**
 * @file Environment Helper Utilities
 * @description Centralized environment detection helpers for use throughout the library.
 *
 * IMPORTANT: Use these helpers instead of direct process.env.NODE_ENV checks.
 * This ensures consistent behavior and easier testing.
 *
 * @example
 * ```typescript
 * import { isDev, isProd, isTest } from '@/lib/core/config/env-helper';
 *
 * if (isDev()) {
 *   console.log('Development mode enabled');
 * }
 * ```
 */

import { env } from '@/config';

/**
 * Check if currently in development environment
 * @returns true if NODE_ENV is 'development'
 */
export function isDev(): boolean {
  return env.isDev;
}

/**
 * Check if currently in production environment
 * @returns true if NODE_ENV is 'production'
 */
export function isProd(): boolean {
  return env.isProd;
}

/**
 * Check if currently in test environment
 * @returns true if NODE_ENV is 'test'
 */
export function isTest(): boolean {
  return env.isTest;
}

/**
 * Check if currently in staging environment
 * @returns true if APP_ENV is 'staging'
 */
export function isStaging(): boolean {
  return env.appEnv === 'staging';
}

/**
 * Get current environment name
 * @returns The current environment name
 */
export function getEnvironment(): string {
  return env.appEnv;
}

/**
 * Conditional debug logging - only logs in development
 * @param message - Message to log
 * @param data - Optional data to include
 */
export function devLog(message: string, ...data: unknown[]): void {
  if (isDev()) {
    console.info(`[DEV] ${message}`, ...data);
  }
}

/**
 * Conditional warning logging - only logs in development
 * @param message - Warning message
 * @param data - Optional data to include
 */
export function devWarn(message: string, ...data: unknown[]): void {
  if (isDev()) {
    console.warn(`[DEV] ${message}`, ...data);
  }
}

/**
 * Conditional error logging - logs in all environments
 * but with stack traces only in development
 * @param message - Error message
 * @param error - Optional error object
 */
export function logError(message: string, error?: unknown): void {
  if (isDev()) {
    console.error(`[ERROR] ${message}`, error);
  } else {
    console.error(`[ERROR] ${message}`);
  }
}

/**
 * Execute callback only in development
 * @param callback - Function to execute in development
 */
export function inDevelopment(callback: () => void): void {
  if (isDev()) {
    callback();
  }
}

/**
 * Execute callback only in production
 * @param callback - Function to execute in production
 */
export function inProduction(callback: () => void): void {
  if (isProd()) {
    callback();
  }
}
