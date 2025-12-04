/**
 * @file Extension System Exports
 * @description Prisma-inspired extension system for Enzyme CLI
 *
 * @example
 * import { EnzymeClient, loggingExtension, validationExtension } from '@enzyme/cli/extensions'
 *
 * const enzyme = new EnzymeClient()
 *   .$extends(loggingExtension)
 *   .$extends(validationExtension)
 */

// ============================================================================
// Core Types
// ============================================================================

export type {
  EnzymeExtension,
  GeneratorExtension,
  GeneratorHooks,
  GeneratorHookContext,
  GeneratorHook,
  ErrorHook,
  ValidationHook,
  ValidationResult,
  CommandExtension,
  CommandContext,
  CommandDefinition,
  CommandHandler,
  OptionDefinition,
  TemplateExtension,
  TemplateHelper,
  TemplateFilter,
  FileExtension,
  FileHook,
  FileHookContext,
  FileErrorHook,
  ResultExtension,
  ResultFieldDefinition,
  ClientExtension,
  ClientMethod,
  ExtensionManager,
  Logger,
  EnzymeConfig,
  GeneratedFile,
  // Branded types
  PluginId,
  ExtensionId,
  GeneratorId,
  TemplateId,
  CommandId,
  Brand,
  // Generator args/results
  ComponentGeneratorArgs,
  PageGeneratorArgs,
  HookGeneratorArgs,
  GeneratorResult,
} from './types.js';

// ============================================================================
// Branded Type Constructors
// ============================================================================

export { createPluginId, createExtensionId } from './types.js';

// ============================================================================
// Namespace
// ============================================================================

export { Enzyme } from './types.js';

// ============================================================================
// Core Classes and Factories
// ============================================================================

export {
  EnzymeExtensionManager,
  EnzymeClient,
  createExtensionManager,
  createEnzymeClient,
  defineExtension,
} from './manager.js';

// ============================================================================
// Built-in Extensions
// ============================================================================

export {
  // Individual extensions
  loggingExtension,
  performanceExtension,
  validationExtension,
  formattingExtension,
  resultExtension,
  gitExtension,
  dryRunExtension,
  errorsExtension,
  // Factory functions
  getBuiltInExtensions,
  getProductionExtensions,
  getDevelopmentExtensions,
  createExtensionBundle,
  getExtensionByName,
  // Performance utilities
  getPerformanceMetrics,
  // Types
  type BuiltInExtensionName,
} from './built-in/index.js';

// ============================================================================
// React Hooks (Separate Export Path)
// ============================================================================

/**
 * React hooks for extensions
 * Import from '@enzyme/cli/extensions/hooks'
 *
 * @example
 * import { ExtensionProvider, useExtension } from '@enzyme/cli/extensions/hooks'
 */
export type { ExtensionContextValue, ExtensionProviderProps } from './hooks.js';

// ============================================================================
// Testing Utilities (Separate Export Path)
// ============================================================================

/**
 * Testing utilities for extensions
 * Import from '@enzyme/cli/extensions/testing'
 *
 * @example
 * import { createMockExtensionManager } from '@enzyme/cli/extensions/testing'
 */
export type { ExtensionSpy } from './testing.js';
