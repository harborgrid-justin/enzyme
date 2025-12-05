/**
 * Test Setup and Teardown Utilities
 *
 * Utilities for managing test lifecycle, setup, teardown, and cleanup.
 * Framework-agnostic and works with any testing framework.
 *
 * @module @missionfabric-js/enzyme-typescript/testing/setup
 * @example
 * ```typescript
 * import { TestSetup, createTestContext } from '@missionfabric-js/enzyme-typescript/testing/setup';
 *
 * const setup = new TestSetup();
 * setup.beforeAll(async () => {
 *   await db.connect();
 * });
 * setup.afterAll(async () => {
 *   await db.disconnect();
 * });
 * ```
 */

import type { TestHook, TestLifecycle, TestContext, TestSuiteConfig } from './types';

/**
 * Test setup manager for handling lifecycle hooks
 */
export class TestSetup {
  private beforeAllHooks: TestHook[] = [];
  private beforeEachHooks: TestHook[] = [];
  private afterEachHooks: TestHook[] = [];
  private afterAllHooks: TestHook[] = [];
  private cleanupFunctions: Array<() => void | Promise<void>> = [];

  /**
   * Register a hook to run before all tests
   *
   * @param hook Hook function
   *
   * @example
   * ```typescript
   * setup.beforeAll(async () => {
   *   await database.connect();
   * });
   * ```
   */
  beforeAll(hook: TestHook): void {
    this.beforeAllHooks.push(hook);
  }

  /**
   * Register a hook to run before each test
   *
   * @param hook Hook function
   *
   * @example
   * ```typescript
   * setup.beforeEach(() => {
   *   console.log('Starting test...');
   * });
   * ```
   */
  beforeEach(hook: TestHook): void {
    this.beforeEachHooks.push(hook);
  }

  /**
   * Register a hook to run after each test
   *
   * @param hook Hook function
   *
   * @example
   * ```typescript
   * setup.afterEach(async () => {
   *   await clearTestData();
   * });
   * ```
   */
  afterEach(hook: TestHook): void {
    this.afterEachHooks.push(hook);
  }

  /**
   * Register a hook to run after all tests
   *
   * @param hook Hook function
   *
   * @example
   * ```typescript
   * setup.afterAll(async () => {
   *   await database.disconnect();
   * });
   * ```
   */
  afterAll(hook: TestHook): void {
    this.afterAllHooks.push(hook);
  }

  /**
   * Register a cleanup function
   *
   * @param cleanup Cleanup function
   *
   * @example
   * ```typescript
   * setup.addCleanup(() => {
   *   fs.unlinkSync(tempFile);
   * });
   * ```
   */
  addCleanup(cleanup: () => void | Promise<void>): void {
    this.cleanupFunctions.push(cleanup);
  }

  /**
   * Run all beforeAll hooks
   *
   * @example
   * ```typescript
   * await setup.runBeforeAll();
   * ```
   */
  async runBeforeAll(): Promise<void> {
    for (const hook of this.beforeAllHooks) {
      await hook();
    }
  }

  /**
   * Run all beforeEach hooks
   *
   * @example
   * ```typescript
   * await setup.runBeforeEach();
   * ```
   */
  async runBeforeEach(): Promise<void> {
    for (const hook of this.beforeEachHooks) {
      await hook();
    }
  }

  /**
   * Run all afterEach hooks
   *
   * @example
   * ```typescript
   * await setup.runAfterEach();
   * ```
   */
  async runAfterEach(): Promise<void> {
    for (const hook of this.afterEachHooks) {
      await hook();
    }
  }

  /**
   * Run all afterAll hooks
   *
   * @example
   * ```typescript
   * await setup.runAfterAll();
   * ```
   */
  async runAfterAll(): Promise<void> {
    for (const hook of this.afterAllHooks) {
      await hook();
    }
  }

  /**
   * Run all cleanup functions
   *
   * @example
   * ```typescript
   * await setup.runCleanup();
   * ```
   */
  async runCleanup(): Promise<void> {
    for (const cleanup of this.cleanupFunctions) {
      await cleanup();
    }
    this.cleanupFunctions = [];
  }

  /**
   * Clear all hooks
   *
   * @example
   * ```typescript
   * setup.clear();
   * ```
   */
  clear(): void {
    this.beforeAllHooks = [];
    this.beforeEachHooks = [];
    this.afterEachHooks = [];
    this.afterAllHooks = [];
    this.cleanupFunctions = [];
  }

  /**
   * Get lifecycle configuration
   *
   * @returns Test lifecycle hooks
   *
   * @example
   * ```typescript
   * const lifecycle = setup.getLifecycle();
   * ```
   */
  getLifecycle(): TestLifecycle {
    return {
      beforeAll: async () => this.runBeforeAll(),
      beforeEach: async () => this.runBeforeEach(),
      afterEach: async () => this.runAfterEach(),
      afterAll: async () => this.runAfterAll(),
    };
  }
}

/**
 * Create a test context
 *
 * @template T Context data type
 * @param name Test name
 * @param data Initial data
 * @returns Test context
 *
 * @example
 * ```typescript
 * const context = createTestContext('my-test', { userId: '123' });
 * context.addCleanup(() => {
 *   // Cleanup code
 * });
 * await context.runCleanup();
 * ```
 */
export function createTestContext<T = any>(name: string, data: T): TestContext<T> {
  const cleanup: Array<() => void | Promise<void>> = [];

  return {
    name,
    data,
    cleanup,
    addCleanup: (fn: () => void | Promise<void>) => {
      cleanup.push(fn);
    },
    runCleanup: async () => {
      for (const fn of cleanup) {
        await fn();
      }
      cleanup.length = 0;
    },
  };
}

/**
 * Global test setup instance
 */
const globalSetup = new TestSetup();

/**
 * Register a global beforeAll hook
 *
 * @param hook Hook function
 *
 * @example
 * ```typescript
 * beforeAll(async () => {
 *   await initializeTestEnvironment();
 * });
 * ```
 */
export function beforeAll(hook: TestHook): void {
  globalSetup.beforeAll(hook);
}

/**
 * Register a global beforeEach hook
 *
 * @param hook Hook function
 *
 * @example
 * ```typescript
 * beforeEach(() => {
 *   resetMocks();
 * });
 * ```
 */
export function beforeEach(hook: TestHook): void {
  globalSetup.beforeEach(hook);
}

/**
 * Register a global afterEach hook
 *
 * @param hook Hook function
 *
 * @example
 * ```typescript
 * afterEach(async () => {
 *   await cleanupTestData();
 * });
 * ```
 */
export function afterEach(hook: TestHook): void {
  globalSetup.afterEach(hook);
}

/**
 * Register a global afterAll hook
 *
 * @param hook Hook function
 *
 * @example
 * ```typescript
 * afterAll(async () => {
 *   await teardownTestEnvironment();
 * });
 * ```
 */
export function afterAll(hook: TestHook): void {
  globalSetup.afterAll(hook);
}

/**
 * Register a global cleanup function
 *
 * @param cleanup Cleanup function
 *
 * @example
 * ```typescript
 * addCleanup(() => {
 *   // Cleanup code
 * });
 * ```
 */
export function addCleanup(cleanup: () => void | Promise<void>): void {
  globalSetup.addCleanup(cleanup);
}

/**
 * Run global cleanup
 *
 * @example
 * ```typescript
 * await runCleanup();
 * ```
 */
export function runCleanup(): Promise<void> {
  return globalSetup.runCleanup();
}

/**
 * Create a test suite with configuration
 *
 * @param config Suite configuration
 * @returns Test suite
 *
 * @example
 * ```typescript
 * const suite = createTestSuite({
 *   name: 'User Tests',
 *   lifecycle: {
 *     beforeAll: async () => {
 *       await db.connect();
 *     },
 *     afterAll: async () => {
 *       await db.disconnect();
 *     }
 *   },
 *   timeout: 5000
 * });
 * ```
 */
export function createTestSuite(config: TestSuiteConfig): {
  config: TestSuiteConfig;
  setup: TestSetup;
} {
  const setup = new TestSetup();

  if (config.lifecycle?.beforeAll) {
    setup.beforeAll(config.lifecycle.beforeAll);
  }
  if (config.lifecycle?.beforeEach) {
    setup.beforeEach(config.lifecycle.beforeEach);
  }
  if (config.lifecycle?.afterEach) {
    setup.afterEach(config.lifecycle.afterEach);
  }
  if (config.lifecycle?.afterAll) {
    setup.afterAll(config.lifecycle.afterAll);
  }

  return {
    config,
    setup,
  };
}

/**
 * Temporary resource manager
 */
export class TempResourceManager {
  private resources: Array<{
    id: string;
    cleanup: () => void | Promise<void>;
  }> = [];

  /**
   * Register a temporary resource
   *
   * @param id Resource identifier
   * @param cleanup Cleanup function
   *
   * @example
   * ```typescript
   * const manager = new TempResourceManager();
   * manager.register('temp-file', () => fs.unlinkSync(tempFile));
   * ```
   */
  register(id: string, cleanup: () => void | Promise<void>): void {
    this.resources.push({ id, cleanup });
  }

  /**
   * Cleanup a specific resource
   *
   * @param id Resource identifier
   *
   * @example
   * ```typescript
   * await manager.cleanup('temp-file');
   * ```
   */
  async cleanup(id: string): Promise<void> {
    const index = this.resources.findIndex((r) => r.id === id);
    if (index !== -1) {
      const resource = this.resources[index];
      await resource.cleanup();
      this.resources.splice(index, 1);
    }
  }

  /**
   * Cleanup all resources
   *
   * @example
   * ```typescript
   * await manager.cleanupAll();
   * ```
   */
  async cleanupAll(): Promise<void> {
    for (const resource of this.resources) {
      await resource.cleanup();
    }
    this.resources = [];
  }

  /**
   * Get number of active resources
   *
   * @returns Resource count
   *
   * @example
   * ```typescript
   * console.log(`Active resources: ${manager.count()}`);
   * ```
   */
  count(): number {
    return this.resources.length;
  }
}

/**
 * Environment variable manager for tests
 */
export class TestEnvManager {
  private original = new Map<string, string | undefined>();

  /**
   * Set an environment variable
   *
   * @param key Variable name
   * @param value Variable value
   *
   * @example
   * ```typescript
   * const env = new TestEnvManager();
   * env.set('NODE_ENV', 'test');
   * ```
   */
  set(key: string, value: string): void {
    if (!this.original.has(key)) {
      this.original.set(key, process.env[key]);
    }
    process.env[key] = value;
  }

  /**
   * Set multiple environment variables
   *
   * @param vars Variables to set
   *
   * @example
   * ```typescript
   * env.setMany({
   *   NODE_ENV: 'test',
   *   API_URL: 'http://localhost:3000'
   * });
   * ```
   */
  setMany(vars: Record<string, string>): void {
    for (const [key, value] of Object.entries(vars)) {
      this.set(key, value);
    }
  }

  /**
   * Restore original environment variables
   *
   * @example
   * ```typescript
   * env.restore();
   * ```
   */
  restore(): void {
    for (const [key, value] of this.original.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    this.original.clear();
  }

  /**
   * Clear all environment variables
   *
   * @example
   * ```typescript
   * env.clear();
   * ```
   */
  clear(): void {
    this.original.clear();
  }
}

/**
 * Mock timer manager
 */
export class MockTimerManager {
  private timers: NodeJS.Timeout[] = [];
  private intervals: NodeJS.Timeout[] = [];

  /**
   * Create a mock timeout
   *
   * @param callback Callback function
   * @param delay Delay in milliseconds
   * @returns Timeout ID
   *
   * @example
   * ```typescript
   * const timers = new MockTimerManager();
   * const id = timers.setTimeout(() => console.log('done'), 1000);
   * ```
   */
  setTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const timer = setTimeout(callback, delay);
    this.timers.push(timer);
    return timer;
  }

  /**
   * Create a mock interval
   *
   * @param callback Callback function
   * @param delay Delay in milliseconds
   * @returns Interval ID
   *
   * @example
   * ```typescript
   * const id = timers.setInterval(() => console.log('tick'), 1000);
   * ```
   */
  setInterval(callback: () => void, delay: number): NodeJS.Timeout {
    const interval = setInterval(callback, delay);
    this.intervals.push(interval);
    return interval;
  }

  /**
   * Clear all timers and intervals
   *
   * @example
   * ```typescript
   * timers.clearAll();
   * ```
   */
  clearAll(): void {
    this.timers.forEach(clearTimeout);
    this.intervals.forEach(clearInterval);
    this.timers = [];
    this.intervals = [];
  }

  /**
   * Get number of active timers
   *
   * @returns Timer count
   *
   * @example
   * ```typescript
   * console.log(`Active timers: ${timers.count()}`);
   * ```
   */
  count(): number {
    return this.timers.length + this.intervals.length;
  }
}

/**
 * Retry a test function
 *
 * @param fn Test function
 * @param retries Number of retries
 * @param delay Delay between retries (ms)
 * @returns Test result
 *
 * @example
 * ```typescript
 * await retry(async () => {
 *   const result = await fetchData();
 *   expect(result).toBeDefined();
 * }, 3, 1000);
 * ```
 */
export async function retry<T>(
  fn: () => T | Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < retries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Wait for a condition to be true
 *
 * @param condition Condition function
 * @param timeout Timeout in milliseconds
 * @param interval Check interval in milliseconds
 * @returns True if condition met
 *
 * @example
 * ```typescript
 * await waitFor(() => element.isVisible(), 5000);
 * ```
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Sleep for a specified duration
 *
 * @param ms Duration in milliseconds
 *
 * @example
 * ```typescript
 * await sleep(1000); // Sleep for 1 second
 * ```
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run tests in isolation
 *
 * @param fn Test function
 * @returns Test result
 *
 * @example
 * ```typescript
 * await isolate(async () => {
 *   const result = await dangerousOperation();
 *   expect(result).toBeDefined();
 * });
 * ```
 */
export async function isolate<T>(fn: () => T | Promise<T>): Promise<T> {
  const context = createTestContext('isolated-test', {});

  try {
    return await fn();
  } finally {
    await context.runCleanup();
  }
}
