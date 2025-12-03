/**
 * @file Extension System Exports
 * @description Prisma-inspired extension system for Enzyme CLI
 */

// Types
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

// Branded type constructors
export { createPluginId, createExtensionId } from './types.js';

// Namespace
export { Enzyme } from './types.js';

// Manager
export {
  EnzymeExtensionManager,
  EnzymeClient,
  createExtensionManager,
  createEnzymeClient,
  defineExtension,
} from './manager.js';

// Built-in extensions
export * from './built-in/index.js';
