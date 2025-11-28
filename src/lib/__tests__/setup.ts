/**
 * @file Test Setup for Library Tests
 * @description Provides test-specific setup for lib module tests including
 * providers, mocks, and utilities. This extends the global test setup.
 */

import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { server } from '../../test/mocks/server';
import { resetMockData } from '../../test/mocks/handlers';

// ============================================================================
// MSW Server Setup
// ============================================================================

beforeEach(() => {
  // Reset mock data before each test
  resetMockData();
});

afterEach(() => {
  // Reset handlers to default after each test
  server.resetHandlers();
  // Cleanup React Testing Library
  cleanup();
  // Clear all mocks
  vi.clearAllMocks();
});

// ============================================================================
// Test Storage Management
// ============================================================================

/**
 * In-memory storage for tests
 */
export class TestStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }
}

// ============================================================================
// Timer Utilities
// ============================================================================

/**
 * Advance all timers by a specified amount
 */
export function advanceTimers(ms: number): void {
  vi.advanceTimersByTime(ms);
}

/**
 * Run all pending timers
 */
export function runAllTimers(): void {
  vi.runAllTimers();
}

/**
 * Run all pending microtasks
 */
export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

// ============================================================================
// Wait Utilities
// ============================================================================

/**
 * Wait for a condition to be true
 */
export async function waitFor<T>(
  condition: () => T | Promise<T>,
  options: { timeout?: number; interval?: number } = {}
): Promise<T> {
  const { timeout = 5000, interval = 50 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await condition();
      if (result) {
        return result;
      }
    } catch {
      // Continue waiting
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`waitFor timed out after ${timeout}ms`);
}

/**
 * Wait for the next tick
 */
export async function nextTick(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

// ============================================================================
// Mock Data Helpers
// ============================================================================

/**
 * Generate a unique ID for tests
 */
export function generateTestId(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a mock timestamp
 */
export function createMockTimestamp(offsetMs = 0): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

// ============================================================================
// Export Types
// ============================================================================

export interface TestContext {
  storage: TestStorage;
}

// ============================================================================
// Global Test Context
// ============================================================================

/**
 * Create a fresh test context
 */
export function createTestContext(): TestContext {
  return {
    storage: new TestStorage(),
  };
}
