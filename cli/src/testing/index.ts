/**
 * @file Testing Utilities Export
 * @description Test utilities for consumers to test their Enzyme integrations
 *
 * Pattern from: @testing-library/react, MSW, Prisma testing utilities
 *
 * @example
 * import { createMockContext, mockGeneratorResult } from '@missionfabric-js/enzyme-cli/testing'
 */

import type {
  GeneratorHookContext,
  CommandContext,
  EnzymeConfig,
  ValidationResult,
  GeneratorResult,
  Logger,
} from '../extensions/types.js';

// ============================================================================
// Mock Factories
// ============================================================================

/**
 * Create a mock logger
 */
export function createMockLogger(): Logger {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
    table: jest.fn(),
    newLine: jest.fn(),
    header: jest.fn(),
  };
}

/**
 * Create a mock Enzyme config
 */
export function createMockConfig(overrides: Partial<EnzymeConfig> = {}): EnzymeConfig {
  return {
    projectName: 'test-project',
    typescript: true,
    features: {
      auth: false,
      state: true,
      routing: true,
      realtime: false,
      monitoring: false,
      theme: false,
      flags: false,
    },
    plugins: [],
    ...overrides,
  };
}

/**
 * Create a mock command context
 */
export function createMockCommandContext(
  overrides: Partial<CommandContext> = {}
): CommandContext {
  return {
    cwd: '/mock/project',
    logger: createMockLogger(),
    config: createMockConfig(),
    args: [],
    ...overrides,
  };
}

/**
 * Create a mock generator hook context
 */
export function createMockGeneratorContext<TArgs = Record<string, unknown>>(
  overrides: Partial<GeneratorHookContext<TArgs>> = {}
): GeneratorHookContext<TArgs> {
  let currentArgs = (overrides.args ?? {}) as TArgs;

  return {
    generator: 'component',
    operation: 'generate',
    name: 'TestComponent',
    args: currentArgs,
    modify: jest.fn((changes: Partial<TArgs>) => {
      currentArgs = { ...currentArgs, ...changes };
    }),
    execute: jest.fn().mockResolvedValue({
      name: 'TestComponent',
      files: ['TestComponent.tsx'],
      path: 'src/components',
    }),
    addFiles: jest.fn(),
    ...overrides,
  };
}

/**
 * Create a mock generator result
 */
export function createMockGeneratorResult(
  overrides: Partial<GeneratorResult> = {}
): GeneratorResult {
  return {
    name: 'TestComponent',
    files: ['TestComponent.tsx', 'TestComponent.test.tsx'],
    path: 'src/components/TestComponent',
    dependencies: [],
    ...overrides,
  };
}

/**
 * Create a mock validation result
 */
export function createMockValidationResult(
  overrides: Partial<ValidationResult> = {}
): ValidationResult {
  return {
    valid: true,
    errors: [],
    warnings: [],
    ...overrides,
  };
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Wait for async operations to complete
 */
export function flushPromises(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

/**
 * Create a deferred promise for testing async flows
 */
export function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Mock file system for testing file operations
 */
export class MockFileSystem {
  private files: Map<string, string> = new Map();

  write(path: string, content: string): void {
    this.files.set(path, content);
  }

  read(path: string): string | undefined {
    return this.files.get(path);
  }

  exists(path: string): boolean {
    return this.files.has(path);
  }

  delete(path: string): boolean {
    return this.files.delete(path);
  }

  list(): string[] {
    return Array.from(this.files.keys());
  }

  clear(): void {
    this.files.clear();
  }

  getAll(): Map<string, string> {
    return new Map(this.files);
  }
}

/**
 * Create a mock file system instance
 */
export function createMockFileSystem(): MockFileSystem {
  return new MockFileSystem();
}

// ============================================================================
// Extension Testing Utilities
// ============================================================================

import type { EnzymeExtension } from '../extensions/types.js';
import { EnzymeClient } from '../extensions/manager.js';

/**
 * Create a test client with extensions
 */
export function createTestClient(...extensions: EnzymeExtension[]): EnzymeClient {
  let client = new EnzymeClient();

  for (const extension of extensions) {
    client = client.$extends(extension);
  }

  return client;
}

/**
 * Test that an extension has required properties
 */
export function validateExtensionStructure(extension: EnzymeExtension): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!extension.name) {
    errors.push('Extension must have a name');
  }

  if (typeof extension.name !== 'string') {
    errors.push('Extension name must be a string');
  }

  if (extension.version && typeof extension.version !== 'string') {
    errors.push('Extension version must be a string');
  }

  // Validate generator hooks
  if (extension.generator) {
    const validHooks = ['beforeGenerate', 'afterGenerate', 'onError', 'validate'];
    const generators = ['component', 'page', 'hook', 'service', 'slice', 'module', 'route', '$allGenerators'];

    for (const gen of generators) {
      const genHooks = (extension.generator as any)[gen];
      if (genHooks) {
        for (const [hookName, hook] of Object.entries(genHooks)) {
          if (!validHooks.includes(hookName) && hookName !== '$allOperations') {
            errors.push(`Invalid hook "${hookName}" in generator.${gen}`);
          }
          if (typeof hook !== 'function') {
            errors.push(`Hook generator.${gen}.${hookName} must be a function`);
          }
        }
      }
    }
  }

  // Validate command extension
  if (extension.command) {
    for (const [name, cmd] of Object.entries(extension.command)) {
      if (!cmd.description) {
        errors.push(`Command "${name}" must have a description`);
      }
      if (typeof cmd.handler !== 'function') {
        errors.push(`Command "${name}" must have a handler function`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Snapshot Utilities
// ============================================================================

/**
 * Normalize generated content for snapshot testing
 * Removes timestamps and other dynamic values
 */
export function normalizeForSnapshot(content: string): string {
  return content
    // Remove timestamps
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/g, '<TIMESTAMP>')
    // Remove UUIDs
    .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '<UUID>')
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    // Remove trailing whitespace
    .replace(/[ \t]+$/gm, '');
}

/**
 * Create a snapshot-friendly representation of generated files
 */
export function createFileSnapshot(
  files: Array<{ path: string; content: string }>
): Record<string, string> {
  const snapshot: Record<string, string> = {};

  for (const file of files) {
    snapshot[file.path] = normalizeForSnapshot(file.content);
  }

  return snapshot;
}

// ============================================================================
// Re-exports for Convenience
// ============================================================================

export type {
  GeneratorHookContext,
  CommandContext,
  EnzymeConfig,
  ValidationResult,
  GeneratorResult,
  Logger,
  EnzymeExtension,
} from '../extensions/types.js';

export { EnzymeClient, defineExtension } from '../extensions/manager.js';

// Declare jest as a global for type checking (consumers provide their own)
declare const jest: {
  fn: () => any;
};
