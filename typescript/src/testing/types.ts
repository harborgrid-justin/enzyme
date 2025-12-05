/**
 * Testing Type Definitions
 *
 * Comprehensive type definitions for testing utilities in the enzyme framework.
 * Provides type-safe interfaces for factories, mocks, fixtures, and assertions.
 *
 * @module @missionfabric-js/enzyme-typescript/testing/types
 * @example
 * ```typescript
 * import type { Factory, MockOptions, TestFixture } from '@missionfabric-js/enzyme-typescript/testing/types';
 *
 * const userFactory: Factory<User> = {
 *   build: () => ({ id: '1', name: 'Test User' }),
 *   create: async () => ({ id: '1', name: 'Test User' })
 * };
 * ```
 */

/**
 * Factory builder function that creates test data
 * @template T The type of data being created
 */
export type FactoryBuilder<T> = (overrides?: Partial<T>) => T;

/**
 * Async factory builder function for data requiring async operations
 * @template T The type of data being created
 */
export type AsyncFactoryBuilder<T> = (overrides?: Partial<T>) => Promise<T>;

/**
 * Factory definition with build and create methods
 * @template T The type of data the factory produces
 */
export interface Factory<T> {
  /**
   * Build an instance without persisting
   */
  build: FactoryBuilder<T>;

  /**
   * Create and persist an instance (e.g., to database)
   */
  create: AsyncFactoryBuilder<T>;

  /**
   * Build multiple instances
   */
  buildList: (count: number, overrides?: Partial<T>) => T[];

  /**
   * Create and persist multiple instances
   */
  createList: (count: number, overrides?: Partial<T>) => Promise<T[]>;
}

/**
 * Factory trait that can modify default attributes
 * @template T The type being built
 */
export type FactoryTrait<T> = (attrs: Partial<T>) => Partial<T>;

/**
 * Factory definition with traits support
 * @template T The type of data the factory produces
 */
export interface FactoryWithTraits<T> extends Factory<T> {
  /**
   * Register a trait
   */
  trait: (name: string, trait: FactoryTrait<T>) => void;

  /**
   * Build with specific traits
   */
  buildWith: (traits: string[], overrides?: Partial<T>) => T;

  /**
   * Create with specific traits
   */
  createWith: (traits: string[], overrides?: Partial<T>) => Promise<T>;
}

/**
 * Mock function type
 */
export type MockFunction<TArgs extends any[] = any[], TReturn = any> = {
  (...args: TArgs): TReturn;
  mock: {
    calls: TArgs[];
    results: { type: 'return' | 'throw'; value: TReturn | Error }[];
    instances: any[];
  };
};

/**
 * Mock options for creating mocks
 */
export interface MockOptions<T = any> {
  /**
   * Default return value
   */
  returnValue?: T;

  /**
   * Implementation function
   */
  implementation?: (...args: any[]) => T;

  /**
   * Error to throw
   */
  throwError?: Error;

  /**
   * Resolved value for promise mocks
   */
  resolvedValue?: T;

  /**
   * Rejected value for promise mocks
   */
  rejectedValue?: Error;

  /**
   * Track calls
   */
  trackCalls?: boolean;
}

/**
 * Spy on an object's method
 */
export interface Spy<TObj = any, TMethod extends keyof TObj = keyof TObj> {
  /**
   * The original method
   */
  original: TObj[TMethod];

  /**
   * Restore the original method
   */
  restore: () => void;

  /**
   * Mock implementation
   */
  mock: MockFunction;

  /**
   * Call history
   */
  calls: any[][];
}

/**
 * Test fixture definition
 */
export interface TestFixture<T = any> {
  /**
   * Fixture name/identifier
   */
  name: string;

  /**
   * Fixture data
   */
  data: T;

  /**
   * Setup function run before tests
   */
  setup?: () => void | Promise<void>;

  /**
   * Teardown function run after tests
   */
  teardown?: () => void | Promise<void>;

  /**
   * Tags for filtering fixtures
   */
  tags?: string[];
}

/**
 * Fixture loader interface
 */
export interface FixtureLoader {
  /**
   * Load a fixture by name
   */
  load: <T>(name: string) => Promise<TestFixture<T>>;

  /**
   * Load multiple fixtures
   */
  loadMany: <T>(names: string[]) => Promise<TestFixture<T>[]>;

  /**
   * Load fixtures by tag
   */
  loadByTag: <T>(tag: string) => Promise<TestFixture<T>[]>;

  /**
   * Clear all loaded fixtures
   */
  clear: () => void;
}

/**
 * Custom assertion function
 */
export type AssertionFunction<T = any> = (actual: T, expected?: any, message?: string) => void | never;

/**
 * Assertion result
 */
export interface AssertionResult {
  /**
   * Whether the assertion passed
   */
  pass: boolean;

  /**
   * Assertion message
   */
  message: string;

  /**
   * Expected value
   */
  expected?: any;

  /**
   * Actual value
   */
  actual?: any;
}

/**
 * Custom matcher function
 */
export type MatcherFunction<T = any> = (actual: T, expected: any) => AssertionResult;

/**
 * Matcher context
 */
export interface MatcherContext {
  /**
   * Whether this is a .not matcher
   */
  isNot: boolean;

  /**
   * Promise matcher (for async assertions)
   */
  promise: string;

  /**
   * Equals function for deep equality
   */
  equals: (a: any, b: any) => boolean;

  /**
   * Utils for formatting messages
   */
  utils: {
    matcherHint: (matcherName: string, received?: string, expected?: string, options?: any) => string;
    printExpected: (value: any) => string;
    printReceived: (value: any) => string;
  };
}

/**
 * Snapshot serializer
 */
export interface SnapshotSerializer<T = any> {
  /**
   * Test if this serializer should be used for the value
   */
  test: (value: any) => boolean;

  /**
   * Serialize the value
   */
  serialize: (value: T, config?: any, indentation?: string, depth?: number) => string;
}

/**
 * Snapshot options
 */
export interface SnapshotOptions {
  /**
   * Update snapshots
   */
  update?: boolean;

  /**
   * Snapshot file path
   */
  filepath?: string;

  /**
   * Custom serializers
   */
  serializers?: SnapshotSerializer[];

  /**
   * Inline snapshots
   */
  inline?: boolean;
}

/**
 * Coverage report
 */
export interface CoverageReport {
  /**
   * Total statements
   */
  totalStatements: number;

  /**
   * Covered statements
   */
  coveredStatements: number;

  /**
   * Total branches
   */
  totalBranches: number;

  /**
   * Covered branches
   */
  coveredBranches: number;

  /**
   * Total functions
   */
  totalFunctions: number;

  /**
   * Covered functions
   */
  coveredFunctions: number;

  /**
   * Total lines
   */
  totalLines: number;

  /**
   * Covered lines
   */
  coveredLines: number;

  /**
   * Statement coverage percentage
   */
  statementCoverage: number;

  /**
   * Branch coverage percentage
   */
  branchCoverage: number;

  /**
   * Function coverage percentage
   */
  functionCoverage: number;

  /**
   * Line coverage percentage
   */
  lineCoverage: number;
}

/**
 * File coverage information
 */
export interface FileCoverage extends CoverageReport {
  /**
   * File path
   */
  path: string;

  /**
   * Uncovered lines
   */
  uncoveredLines: number[];

  /**
   * Uncovered branches
   */
  uncoveredBranches: Array<{ line: number; branch: number }>;
}

/**
 * Coverage threshold configuration
 */
export interface CoverageThresholds {
  /**
   * Minimum statement coverage percentage
   */
  statements?: number;

  /**
   * Minimum branch coverage percentage
   */
  branches?: number;

  /**
   * Minimum function coverage percentage
   */
  functions?: number;

  /**
   * Minimum line coverage percentage
   */
  lines?: number;
}

/**
 * Test setup/teardown hook
 */
export type TestHook = () => void | Promise<void>;

/**
 * Test lifecycle hooks
 */
export interface TestLifecycle {
  /**
   * Run before all tests
   */
  beforeAll?: TestHook;

  /**
   * Run before each test
   */
  beforeEach?: TestHook;

  /**
   * Run after each test
   */
  afterEach?: TestHook;

  /**
   * Run after all tests
   */
  afterAll?: TestHook;
}

/**
 * Test context
 */
export interface TestContext<T = any> {
  /**
   * Test name
   */
  name: string;

  /**
   * Test data/state
   */
  data: T;

  /**
   * Cleanup functions
   */
  cleanup: Array<() => void | Promise<void>>;

  /**
   * Register a cleanup function
   */
  addCleanup: (fn: () => void | Promise<void>) => void;

  /**
   * Run all cleanup functions
   */
  runCleanup: () => Promise<void>;
}

/**
 * Test suite configuration
 */
export interface TestSuiteConfig {
  /**
   * Suite name
   */
  name: string;

  /**
   * Setup/teardown hooks
   */
  lifecycle?: TestLifecycle;

  /**
   * Timeout in milliseconds
   */
  timeout?: number;

  /**
   * Number of retries
   */
  retries?: number;

  /**
   * Tags for filtering
   */
  tags?: string[];

  /**
   * Skip this suite
   */
  skip?: boolean;

  /**
   * Run only this suite
   */
  only?: boolean;
}

/**
 * Deep partial type helper
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Mock return type helper
 */
export type MockReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

/**
 * Mock parameters type helper
 */
export type MockParameters<T> = T extends (...args: infer P) => any ? P : never;

/**
 * Awaited type helper for async values
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Test data builder
 */
export interface TestDataBuilder<T> {
  /**
   * Set a property value
   */
  with<K extends keyof T>(key: K, value: T[K]): TestDataBuilder<T>;

  /**
   * Set multiple properties
   */
  withMany(overrides: Partial<T>): TestDataBuilder<T>;

  /**
   * Build the final object
   */
  build(): T;
}
