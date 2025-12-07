/**
 * Test Fixture Management
 *
 * Utilities for managing test fixtures and test data. Supports loading,
 * caching, setup/teardown, and fixture organization.
 *
 * @module @missionfabric-js/enzyme-typescript/testing/fixture
 * @example
 * ```typescript
 * import { createFixture, FixtureManager } from '@missionfabric-js/enzyme-typescript/testing/fixture';
 *
 * const userFixture = createFixture({
 *   name: 'default-user',
 *   data: { id: '1', name: 'Test User', email: 'test@example.com' },
 *   setup: async () => {
 *     // Setup code
 *   },
 *   teardown: async () => {
 *     // Cleanup code
 *   }
 * });
 *
 * const manager = new FixtureManager();
 * await manager.register(userFixture);
 * const user = await manager.load('default-user');
 * ```
 */

import type { TestFixture, FixtureLoader } from './types';

/**
 * Fixture registry storing all fixtures
 */
const fixtureRegistry = new Map<string, TestFixture<any>>();

/**
 * Active fixtures that have been set up
 */
const activeFixtures = new Set<string>();

/**
 * Create a test fixture
 *
 * @template T Fixture data type
 * @param config Fixture configuration
 * @returns Test fixture
 *
 * @example
 * ```typescript
 * const productFixture = createFixture({
 *   name: 'laptop',
 *   data: {
 *     id: 'prod-1',
 *     name: 'MacBook Pro',
 *     price: 2499.99
 *   },
 *   tags: ['product', 'electronics']
 * });
 * ```
 */
export function createFixture<T>(config: {
  name: string;
  data: T;
  setup?: () => void | Promise<void>;
  teardown?: () => void | Promise<void>;
  tags?: string[];
}): TestFixture<T> {
  return {
    name: config.name,
    data: config.data,
    setup: config.setup,
    teardown: config.teardown,
    tags: config.tags || [],
  };
}

/**
 * Fixture manager for registering and loading fixtures
 *
 * @example
 * ```typescript
 * const manager = new FixtureManager();
 *
 * manager.register(createFixture({
 *   name: 'admin-user',
 *   data: { id: '1', role: 'admin' }
 * }));
 *
 * const admin = await manager.load<User>('admin-user');
 * ```
 */
export class FixtureManager implements FixtureLoader {
  private fixtures = new Map<string, TestFixture<any>>();
  private loaded = new Set<string>();
  private setupPromises = new Map<string, Promise<void>>();

  /**
   * Register a fixture
   *
   * @param fixture Fixture to register
   *
   * @example
   * ```typescript
   * manager.register(userFixture);
   * ```
   */
  register<T>(fixture: TestFixture<T>): void {
    this.fixtures.set(fixture.name, fixture);
  }

  /**
   * Register multiple fixtures
   *
   * @param fixtures Fixtures to register
   *
   * @example
   * ```typescript
   * manager.registerMany([userFixture, productFixture]);
   * ```
   */
  registerMany<T>(fixtures: TestFixture<T>[]): void {
    for (const fixture of fixtures) {
      this.register(fixture);
    }
  }

  /**
   * Load a fixture by name
   *
   * @template T Fixture data type
   * @param name Fixture name
   * @returns Loaded fixture
   *
   * @example
   * ```typescript
   * const user = await manager.load<User>('default-user');
   * ```
   */
  async load<T>(name: string): Promise<TestFixture<T>> {
    const fixture = this.fixtures.get(name);

    if (!fixture) {
      throw new Error(`Fixture '${name}' not found`);
    }

    // Run setup if not already loaded
    if (!this.loaded.has(name)) {
      if (fixture.setup) {
        // Ensure setup runs only once even with concurrent calls
        if (!this.setupPromises.has(name)) {
          this.setupPromises.set(name, fixture.setup());
        }
        await this.setupPromises.get(name);
      }
      this.loaded.add(name);
    }

    return fixture;
  }

  /**
   * Load multiple fixtures
   *
   * @template T Fixture data type
   * @param names Fixture names
   * @returns Loaded fixtures
   *
   * @example
   * ```typescript
   * const [user, product] = await manager.loadMany(['user', 'product']);
   * ```
   */
  async loadMany<T>(names: string[]): Promise<TestFixture<T>[]> {
    return Promise.all(names.map((name) => this.load<T>(name)));
  }

  /**
   * Load fixtures by tag
   *
   * @template T Fixture data type
   * @param tag Tag to filter by
   * @returns Fixtures with matching tag
   *
   * @example
   * ```typescript
   * const productFixtures = await manager.loadByTag('product');
   * ```
   */
  async loadByTag<T>(tag: string): Promise<TestFixture<T>[]> {
    const fixtures = Array.from(this.fixtures.values()).filter((fixture) =>
      fixture.tags?.includes(tag)
    );

    return Promise.all(fixtures.map((fixture) => this.load<T>(fixture.name)));
  }

  /**
   * Get fixture data without setup
   *
   * @template T Fixture data type
   * @param name Fixture name
   * @returns Fixture data
   *
   * @example
   * ```typescript
   * const userData = manager.getData<User>('default-user');
   * ```
   */
  getData<T>(name: string): T {
    const fixture = this.fixtures.get(name);

    if (!fixture) {
      throw new Error(`Fixture '${name}' not found`);
    }

    return fixture.data;
  }

  /**
   * Check if a fixture is registered
   *
   * @param name Fixture name
   * @returns True if registered
   *
   * @example
   * ```typescript
   * if (manager.has('user')) {
   *   const user = await manager.load('user');
   * }
   * ```
   */
  has(name: string): boolean {
    return this.fixtures.has(name);
  }

  /**
   * Clear all loaded fixtures
   *
   * @example
   * ```typescript
   * manager.clear();
   * ```
   */
  clear(): void {
    this.loaded.clear();
    this.setupPromises.clear();
  }

  /**
   * Unload a fixture and run teardown
   *
   * @param name Fixture name
   *
   * @example
   * ```typescript
   * await manager.unload('default-user');
   * ```
   */
  async unload(name: string): Promise<void> {
    const fixture = this.fixtures.get(name);

    if (!fixture) {
      throw new Error(`Fixture '${name}' not found`);
    }

    if (this.loaded.has(name) && fixture.teardown) {
      await fixture.teardown();
    }

    this.loaded.delete(name);
    this.setupPromises.delete(name);
  }

  /**
   * Unload all fixtures and run teardowns
   *
   * @example
   * ```typescript
   * await manager.unloadAll();
   * ```
   */
  async unloadAll(): Promise<void> {
    const promises = Array.from(this.loaded).map((name) => this.unload(name));
    await Promise.all(promises);
  }

  /**
   * Get all fixture names
   *
   * @returns Array of fixture names
   *
   * @example
   * ```typescript
   * const names = manager.getFixtureNames();
   * console.log(names); // ['user', 'product', ...]
   * ```
   */
  getFixtureNames(): string[] {
    return Array.from(this.fixtures.keys());
  }

  /**
   * Get fixtures by tag without loading
   *
   * @param tag Tag to filter by
   * @returns Fixtures with matching tag
   *
   * @example
   * ```typescript
   * const productFixtures = manager.getByTag('product');
   * ```
   */
  getByTag(tag: string): TestFixture<any>[] {
    return Array.from(this.fixtures.values()).filter((fixture) => fixture.tags?.includes(tag));
  }
}

/**
 * Global fixture manager instance
 */
const globalManager = new FixtureManager();

/**
 * Register a fixture globally
 *
 * @param fixture Fixture to register
 *
 * @example
 * ```typescript
 * registerFixture(createFixture({
 *   name: 'user',
 *   data: { id: '1', name: 'Test' }
 * }));
 * ```
 */
export function registerFixture<T>(fixture: TestFixture<T>): void {
  globalManager.register(fixture);
}

/**
 * Load a fixture from global registry
 *
 * @template T Fixture data type
 * @param name Fixture name
 * @returns Loaded fixture
 *
 * @example
 * ```typescript
 * const user = await loadFixture<User>('user');
 * ```
 */
export function loadFixture<T>(name: string): Promise<TestFixture<T>> {
  return globalManager.load<T>(name);
}

/**
 * Load multiple fixtures from global registry
 *
 * @template T Fixture data type
 * @param names Fixture names
 * @returns Loaded fixtures
 *
 * @example
 * ```typescript
 * const [user, product] = await loadFixtures(['user', 'product']);
 * ```
 */
export function loadFixtures<T>(names: string[]): Promise<TestFixture<T>[]> {
  return globalManager.loadMany<T>(names);
}

/**
 * Unload all global fixtures
 *
 * @example
 * ```typescript
 * afterAll(async () => {
 *   await unloadAllFixtures();
 * });
 * ```
 */
export function unloadAllFixtures(): Promise<void> {
  return globalManager.unloadAll();
}

/**
 * Clear global fixture registry
 *
 * @example
 * ```typescript
 * clearFixtures();
 * ```
 */
export function clearFixtures(): void {
  globalManager.clear();
}

/**
 * Create a fixture from JSON file
 *
 * @template T Fixture data type
 * @param name Fixture name
 * @param data Fixture data
 * @param options Additional options
 * @returns Test fixture
 *
 * @example
 * ```typescript
 * const users = fixtureFromData('users', [
 *   { id: '1', name: 'Alice' },
 *   { id: '2', name: 'Bob' }
 * ], { tags: ['user', 'seed-data'] });
 * ```
 */
export function fixtureFromData<T>(
  name: string,
  data: T,
  options: {
    setup?: () => void | Promise<void>;
    teardown?: () => void | Promise<void>;
    tags?: string[];
  } = {}
): TestFixture<T> {
  return createFixture({
    name,
    data,
    setup: options.setup,
    teardown: options.teardown,
    tags: options.tags,
  });
}

/**
 * Create multiple fixtures from a data map
 *
 * @template T Fixture data type
 * @param fixtures Map of fixture name to data
 * @param tags Optional tags to apply to all fixtures
 * @returns Array of test fixtures
 *
 * @example
 * ```typescript
 * const fixtures = fixturesFromMap({
 *   'user-1': { id: '1', name: 'Alice' },
 *   'user-2': { id: '2', name: 'Bob' }
 * }, ['user']);
 * ```
 */
export function fixturesFromMap<T>(
  fixtures: Record<string, T>,
  tags?: string[]
): TestFixture<T>[] {
  return Object.entries(fixtures).map(([name, data]) =>
    createFixture({
      name,
      data,
      tags,
    })
  );
}

/**
 * Fixture builder with fluent API
 *
 * @example
 * ```typescript
 * const fixture = fixtureBuilder<User>('admin-user')
 *   .withData({ id: '1', role: 'admin' })
 *   .withSetup(async () => {
 *     await db.connect();
 *   })
 *   .withTeardown(async () => {
 *     await db.disconnect();
 *   })
 *   .withTags(['user', 'admin'])
 *   .build();
 * ```
 */
export class FixtureBuilder<T> {
  private name: string;
  private data?: T;
  private setup?: () => void | Promise<void>;
  private teardown?: () => void | Promise<void>;
  private tags: string[] = [];

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Set fixture data
   */
  withData(data: T): this {
    this.data = data;
    return this;
  }

  /**
   * Set setup function
   */
  withSetup(setup: () => void | Promise<void>): this {
    this.setup = setup;
    return this;
  }

  /**
   * Set teardown function
   */
  withTeardown(teardown: () => void | Promise<void>): this {
    this.teardown = teardown;
    return this;
  }

  /**
   * Set tags
   */
  withTags(tags: string[]): this {
    this.tags = tags;
    return this;
  }

  /**
   * Add a tag
   */
  addTag(tag: string): this {
    this.tags.push(tag);
    return this;
  }

  /**
   * Build the fixture
   */
  build(): TestFixture<T> {
    if (!this.data) {
      throw new Error('Fixture data is required');
    }

    return createFixture({
      name: this.name,
      data: this.data,
      setup: this.setup,
      teardown: this.teardown,
      tags: this.tags,
    });
  }
}

/**
 * Create a fixture builder
 *
 * @template T Fixture data type
 * @param name Fixture name
 * @returns Fixture builder
 *
 * @example
 * ```typescript
 * const fixture = fixtureBuilder<User>('user')
 *   .withData({ id: '1', name: 'Test' })
 *   .build();
 * ```
 */
export function fixtureBuilder<T>(name: string): FixtureBuilder<T> {
  return new FixtureBuilder<T>(name);
}
