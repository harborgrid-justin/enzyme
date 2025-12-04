/**
 * @file Extension Testing Utilities
 * @description Testing utilities specifically for the extension system
 *
 * Pattern from: @testing-library/react, vitest, jest
 *
 * @example
 * import {
 *   createMockExtensionManager,
 *   createTestExtension,
 *   assertExtensionHookCalled
 * } from '@missionfabric-js/enzyme-cli/extensions/testing'
 */

import type {
  EnzymeExtension,
  GeneratorHookContext,
  FileHookContext,
  ValidationResult,
  GeneratorHooks,
  FileExtension,
} from './types.js';
import {
  EnzymeExtensionManager,
  EnzymeClient,
  defineExtension,
} from './manager.js';

// ============================================================================
// Mock Extension Manager
// ============================================================================

/**
 * Create a mock extension manager for testing
 * Provides spies for all public methods
 *
 * @example
 * const manager = createMockExtensionManager()
 * manager.register(myExtension)
 * expect(manager.register).toHaveBeenCalledWith(myExtension)
 */
export function createMockExtensionManager(): EnzymeExtensionManager & {
  _spies: {
    register: jest.Mock;
    unregister: jest.Mock;
    executeGeneratorHooks: jest.Mock;
    executeFileHooks: jest.Mock;
    executeValidation: jest.Mock;
  };
} {
  const manager = new EnzymeExtensionManager();

  // Create spies for all public methods
  const spies = {
    register: jest.fn(manager.register.bind(manager)),
    unregister: jest.fn(manager.unregister.bind(manager)),
    executeGeneratorHooks: jest.fn(manager.executeGeneratorHooks.bind(manager)),
    executeFileHooks: jest.fn(manager.executeFileHooks.bind(manager)),
    executeValidation: jest.fn(manager.executeValidation.bind(manager)),
  };

  // Replace methods with spies
  manager.register = spies.register;
  manager.unregister = spies.unregister;
  manager.executeGeneratorHooks = spies.executeGeneratorHooks;
  manager.executeFileHooks = spies.executeFileHooks;
  manager.executeValidation = spies.executeValidation;

  return Object.assign(manager, { _spies: spies });
}

// ============================================================================
// Mock Extension Client
// ============================================================================

/**
 * Create a mock extension client for testing
 *
 * @example
 * const client = createMockExtensionClient()
 * const extended = client.$extends(myExtension)
 * expect(extended).toBeInstanceOf(EnzymeClient)
 */
export function createMockExtensionClient(): EnzymeClient & {
  _spies: {
    $extends: jest.Mock;
    executeHooks: jest.Mock;
    executeFileHooks: jest.Mock;
    applyResultExtensions: jest.Mock;
    validate: jest.Mock;
  };
} {
  const client = new EnzymeClient();

  const spies = {
    $extends: jest.fn(client.$extends.bind(client)),
    executeHooks: jest.fn(client.executeHooks.bind(client)),
    executeFileHooks: jest.fn(client.executeFileHooks.bind(client)),
    applyResultExtensions: jest.fn(client.applyResultExtensions.bind(client)),
    validate: jest.fn(client.validate.bind(client)),
  };

  // Replace methods with spies
  client.$extends = spies.$extends;
  client.executeHooks = spies.executeHooks;
  client.executeFileHooks = spies.executeFileHooks;
  client.applyResultExtensions = spies.applyResultExtensions;
  client.validate = spies.validate;

  return Object.assign(client, { _spies: spies });
}

// ============================================================================
// Test Extension Factory
// ============================================================================

export interface TestExtensionOverrides {
  name?: string;
  version?: string;
  description?: string;
  generator?: Partial<EnzymeExtension['generator']>;
  command?: EnzymeExtension['command'];
  template?: EnzymeExtension['template'];
  file?: Partial<EnzymeExtension['file']>;
  result?: EnzymeExtension['result'];
  client?: EnzymeExtension['client'];
}

/**
 * Create a test extension with optional overrides
 * All hooks are spies by default
 *
 * @example
 * const extension = createTestExtension({
 *   name: 'test:my-extension',
 *   generator: {
 *     component: {
 *       beforeGenerate: jest.fn()
 *     }
 *   }
 * })
 */
export function createTestExtension(
  overrides: TestExtensionOverrides = {}
): EnzymeExtension & {
  _hooks: {
    beforeGenerate?: jest.Mock;
    afterGenerate?: jest.Mock;
    onError?: jest.Mock;
    validate?: jest.Mock;
    beforeWrite?: jest.Mock;
    afterWrite?: jest.Mock;
    beforeRead?: jest.Mock;
    afterRead?: jest.Mock;
    fileOnError?: jest.Mock;
  };
} {
  const hooks = {
    beforeGenerate: jest.fn(),
    afterGenerate: jest.fn(),
    onError: jest.fn(),
    validate: jest.fn().mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
    } as ValidationResult),
    beforeWrite: jest.fn(),
    afterWrite: jest.fn(),
    beforeRead: jest.fn(),
    afterRead: jest.fn(),
    fileOnError: jest.fn(),
  };

  const extension: EnzymeExtension = {
    name: overrides.name ?? 'test:extension',
    version: overrides.version ?? '1.0.0',
    description: overrides.description ?? 'Test extension',
    generator: overrides.generator,
    command: overrides.command,
    template: overrides.template,
    file: overrides.file,
    result: overrides.result,
    client: overrides.client,
  };

  return Object.assign(extension, { _hooks: hooks });
}

// ============================================================================
// Mock Hook Contexts
// ============================================================================

export type HookContextType = 'generator' | 'file';

export interface GeneratorHookContextOptions<TArgs = Record<string, unknown>> {
  generator?: string;
  operation?: 'generate' | 'update' | 'delete';
  name?: string;
  args?: TArgs;
  result?: unknown;
}

export interface FileHookContextOptions {
  path?: string;
  content?: string;
  success?: boolean;
}

/**
 * Create a mock hook context for testing
 *
 * @example
 * const context = mockHookContext('generator', {
 *   generator: 'component',
 *   name: 'MyComponent',
 *   args: { withTests: true }
 * })
 */
export function mockHookContext(
  type: 'generator',
  overrides?: GeneratorHookContextOptions
): GeneratorHookContext;
export function mockHookContext(
  type: 'file',
  overrides?: FileHookContextOptions
): FileHookContext;
export function mockHookContext(
  type: HookContextType,
  overrides: GeneratorHookContextOptions | FileHookContextOptions = {}
): GeneratorHookContext | FileHookContext {
  if (type === 'generator') {
    const genOverrides = overrides as GeneratorHookContextOptions;
    let currentArgs = genOverrides.args ?? {};

    return {
      generator: genOverrides.generator ?? 'component',
      operation: genOverrides.operation ?? 'generate',
      name: genOverrides.name ?? 'TestComponent',
      args: currentArgs,
      modify: jest.fn((changes) => {
        currentArgs = { ...currentArgs, ...changes };
      }),
      execute: jest.fn().mockResolvedValue({
        name: genOverrides.name ?? 'TestComponent',
        files: ['TestComponent.tsx'],
        path: 'src/components',
      }),
      addFiles: jest.fn(),
      result: genOverrides.result,
    } as GeneratorHookContext;
  } else {
    const fileOverrides = overrides as FileHookContextOptions;
    let currentPath = fileOverrides.path ?? 'test.ts';
    let currentContent = fileOverrides.content ?? 'export const test = true;';

    return {
      path: currentPath,
      content: currentContent,
      modify: jest.fn((changes) => {
        if (changes.path !== undefined) currentPath = changes.path;
        if (changes.content !== undefined) currentContent = changes.content;
      }),
      success: fileOverrides.success,
    } as FileHookContext;
  }
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that a specific hook was called on the manager
 *
 * @example
 * const manager = createMockExtensionManager()
 * manager.register(myExtension)
 * await manager.executeGeneratorHooks('beforeGenerate', 'component', context)
 *
 * assertExtensionHookCalled(manager, 'beforeGenerate')
 */
export function assertExtensionHookCalled(
  manager: EnzymeExtensionManager & { _spies?: { executeGeneratorHooks: jest.Mock } },
  hookName: keyof GeneratorHooks
): void {
  if (!manager._spies) {
    throw new Error('Manager must be created with createMockExtensionManager()');
  }

  const calls = manager._spies.executeGeneratorHooks.mock.calls;
  const hookWasCalled = calls.some((call) => call[0] === hookName);

  if (!hookWasCalled) {
    throw new Error(
      `Expected hook "${hookName}" to be called, but it was not.\n` +
      `Called hooks: ${calls.map(c => c[0]).join(', ')}`
    );
  }
}

/**
 * Assert that a file hook was called on the manager
 *
 * @example
 * assertFileHookCalled(manager, 'beforeWrite')
 */
export function assertFileHookCalled(
  manager: EnzymeExtensionManager & { _spies?: { executeFileHooks: jest.Mock } },
  hookName: keyof FileExtension
): void {
  if (!manager._spies) {
    throw new Error('Manager must be created with createMockExtensionManager()');
  }

  const calls = manager._spies.executeFileHooks.mock.calls;
  const hookWasCalled = calls.some((call) => call[0] === hookName);

  if (!hookWasCalled) {
    throw new Error(
      `Expected file hook "${hookName}" to be called, but it was not.\n` +
      `Called hooks: ${calls.map(c => c[0]).join(', ')}`
    );
  }
}

/**
 * Assert that an extension was registered
 *
 * @example
 * assertExtensionRegistered(manager, 'my-extension')
 */
export function assertExtensionRegistered(
  manager: EnzymeExtensionManager,
  extensionName: string
): void {
  const extension = manager.getExtension(extensionName);

  if (!extension) {
    throw new Error(
      `Expected extension "${extensionName}" to be registered, but it was not.\n` +
      `Registered extensions: ${manager.list().join(', ')}`
    );
  }
}

/**
 * Assert that an extension was NOT registered
 *
 * @example
 * assertExtensionNotRegistered(manager, 'my-extension')
 */
export function assertExtensionNotRegistered(
  manager: EnzymeExtensionManager,
  extensionName: string
): void {
  const extension = manager.getExtension(extensionName);

  if (extension) {
    throw new Error(
      `Expected extension "${extensionName}" to NOT be registered, but it was.`
    );
  }
}

// ============================================================================
// Extension Spy Wrapper
// ============================================================================

export interface ExtensionSpy extends EnzymeExtension {
  _spies: {
    hooks: {
      [K in keyof GeneratorHooks]?: jest.Mock;
    };
    fileHooks: {
      [K in keyof FileExtension]?: jest.Mock;
    };
  };
}

/**
 * Create a spy wrapper around an extension
 * Useful for testing extension behavior
 *
 * @example
 * const extension = loggingExtension
 * const spy = createExtensionSpy(extension)
 *
 * const client = new EnzymeClient().$extends(spy)
 * await client.executeHooks('beforeGenerate', 'component', context)
 *
 * expect(spy._spies.hooks.beforeGenerate).toHaveBeenCalled()
 */
export function createExtensionSpy(extension: EnzymeExtension): ExtensionSpy {
  const hookSpies: Record<string, jest.Mock> = {};
  const fileHookSpies: Record<string, jest.Mock> = {};

  const spiedExtension: EnzymeExtension = {
    ...extension,
    generator: extension.generator
      ? Object.fromEntries(
          Object.entries(extension.generator).map(([genName, hooks]) => {
            if (typeof hooks === 'object' && hooks !== null) {
              const spiedHooks = Object.fromEntries(
                Object.entries(hooks).map(([hookName, hook]) => {
                  if (typeof hook === 'function') {
                    const spy = jest.fn(hook);
                    hookSpies[hookName] = spy;
                    return [hookName, spy];
                  }
                  return [hookName, hook];
                })
              );
              return [genName, spiedHooks];
            }
            return [genName, hooks];
          })
        )
      : undefined,
    file: extension.file
      ? Object.fromEntries(
          Object.entries(extension.file).map(([hookName, hook]) => {
            if (typeof hook === 'function') {
              const spy = jest.fn(hook);
              fileHookSpies[hookName] = spy;
              return [hookName, spy];
            }
            return [hookName, hook];
          })
        )
      : undefined,
  };

  return Object.assign(spiedExtension, {
    _spies: {
      hooks: hookSpies,
      fileHooks: fileHookSpies,
    },
  });
}

// ============================================================================
// Test Runners
// ============================================================================

/**
 * Test that an extension can be composed with others
 *
 * @example
 * testExtensionComposition([loggingExtension, validationExtension])
 */
export async function testExtensionComposition(
  extensions: EnzymeExtension[]
): Promise<void> {
  const client = new EnzymeClient();

  // Test that all extensions can be added
  let composedClient = client;
  for (const extension of extensions) {
    composedClient = composedClient.$extends(extension);
  }

  // Verify all extensions are registered
  const manager = composedClient.extensions;
  for (const extension of extensions) {
    assertExtensionRegistered(manager, extension.name);
  }
}

/**
 * Test extension hook execution order
 *
 * @example
 * await testHookExecutionOrder(
 *   [ext1, ext2, ext3],
 *   'beforeGenerate',
 *   'component'
 * )
 */
export async function testHookExecutionOrder(
  extensions: EnzymeExtension[],
  hookName: keyof GeneratorHooks,
  generator: string
): Promise<string[]> {
  const executionOrder: string[] = [];

  // Create test extensions that track execution
  const trackingExtensions = extensions.map((ext) => {
    const hooks = ext.generator?.[generator as keyof typeof ext.generator] as
      | GeneratorHooks
      | undefined;
    const hook = hooks?.[hookName];

    if (!hook) {
      return ext;
    }

    return {
      ...ext,
      generator: {
        ...ext.generator,
        [generator]: {
          ...hooks,
          [hookName]: async (context: GeneratorHookContext) => {
            executionOrder.push(ext.name);
            return hook(context);
          },
        },
      },
    };
  });

  // Create client with tracking extensions
  let client = new EnzymeClient();
  for (const ext of trackingExtensions) {
    client = client.$extends(ext);
  }

  // Execute hook
  const context = mockHookContext('generator', {
    generator,
    name: 'Test',
  });

  await client.executeHooks(hookName, generator, context);

  return executionOrder;
}

// ============================================================================
// Re-exports for Convenience
// ============================================================================

export {
  EnzymeExtensionManager,
  EnzymeClient,
  defineExtension,
} from './manager.js';

export type {
  EnzymeExtension,
  GeneratorHookContext,
  FileHookContext,
  ValidationResult,
} from './types.js';

// Declare jest as a global for type checking (consumers provide their own)
declare const jest: {
  fn: (implementation?: (...args: any[]) => any) => any;
};
