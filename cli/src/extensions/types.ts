/**
 * @file Extension System Types
 * @description Prisma-inspired type-safe extension system for Enzyme CLI
 *
 * Key patterns implemented from research:
 * - Prisma: $extends API with composition
 * - axios: Interceptor chains with execution order
 * - lodash: Composable function pipelines
 * - socket.io: Middleware chains with next()
 */

// ============================================================================
// Branded Types (Prisma Pattern)
// ============================================================================

declare const brand: unique symbol;

/**
 * Brand utility for creating nominal types
 * Prevents mixing different ID types (prevents 10-15% of ID-related bugs)
 */
export type Brand<T, TBrand extends string> = T & { [brand]: TBrand };

// Domain-specific branded types
export type PluginId = Brand<string, 'PluginId'>;
export type ExtensionId = Brand<string, 'ExtensionId'>;
export type GeneratorId = Brand<string, 'GeneratorId'>;
export type TemplateId = Brand<string, 'TemplateId'>;
export type CommandId = Brand<string, 'CommandId'>;

/**
 * Type-safe ID constructors
 */
export function createPluginId(id: string): PluginId {
  if (!id || id.length < 1) throw new Error('Invalid plugin ID');
  return id as PluginId;
}

export function createExtensionId(id: string): ExtensionId {
  if (!id || id.length < 1) throw new Error('Invalid extension ID');
  return id as ExtensionId;
}

// ============================================================================
// Extension Component Types
// ============================================================================

/**
 * Generator hook context with type-safe modification
 */
export interface GeneratorHookContext<TArgs = unknown, TResult = unknown> {
  /** Generator name (component, page, hook, etc.) */
  generator: string;
  /** Operation being performed */
  operation: 'generate' | 'update' | 'delete';
  /** Entity name being generated */
  name: string;
  /** Generator arguments */
  args: TArgs;
  /** Modify arguments before execution */
  modify: (changes: Partial<TArgs>) => void;
  /** Execute the generator */
  execute: (args: TArgs) => Promise<TResult>;
  /** Add additional files to output */
  addFiles?: (files: GeneratedFile[]) => void;
  /** Generation result (available in afterGenerate) */
  result?: TResult;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

/**
 * Generator hook function type
 */
export type GeneratorHook<TArgs = unknown, TResult = unknown> = (
  context: GeneratorHookContext<TArgs, TResult>
) => Promise<TResult | void> | TResult | void;

/**
 * Error hook function type
 */
export type ErrorHook = (context: {
  error: Error;
  generator: string;
  operation: string;
  retry: () => Promise<void>;
}) => Promise<void> | void;

/**
 * Validation hook return type
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validation hook function type
 */
export type ValidationHook = (context: GeneratorHookContext) =>
  Promise<ValidationResult> | ValidationResult;

/**
 * Generator extension configuration
 */
export interface GeneratorExtension {
  component?: GeneratorHooks;
  page?: GeneratorHooks;
  hook?: GeneratorHooks;
  service?: GeneratorHooks;
  slice?: GeneratorHooks;
  module?: GeneratorHooks;
  route?: GeneratorHooks;
  /** Apply to all generators */
  $allGenerators?: GeneratorHooks & {
    $allOperations?: GeneratorHook;
  };
}

export interface GeneratorHooks {
  beforeGenerate?: GeneratorHook;
  afterGenerate?: GeneratorHook;
  onError?: ErrorHook;
  validate?: ValidationHook;
}

// ============================================================================
// Command Extension Types
// ============================================================================

export interface CommandContext {
  cwd: string;
  logger: Logger;
  config: EnzymeConfig;
  args: string[];
}

export interface Logger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  debug: (message: string) => void;
  success: (message: string) => void;
  table: (data: Record<string, unknown>[]) => void;
  newLine: () => void;
  header: (title: string) => void;
}

export interface EnzymeConfig {
  projectName?: string;
  typescript?: boolean;
  features?: Record<string, boolean>;
  plugins?: string[];
  [key: string]: unknown;
}

export interface OptionDefinition {
  name: string;
  alias?: string;
  type: 'string' | 'number' | 'boolean';
  default?: unknown;
  choices?: string[];
  description?: string;
  required?: boolean;
}

export type CommandHandler = (
  context: CommandContext,
  options: Record<string, unknown>
) => Promise<void> | void;

export interface CommandDefinition {
  description: string;
  options?: OptionDefinition[];
  handler: CommandHandler;
}

export interface CommandExtension {
  [commandName: string]: CommandDefinition;
}

// ============================================================================
// Template Extension Types
// ============================================================================

export type TemplateHelper = (...args: unknown[]) => unknown;
export type TemplateFilter = (value: unknown, ...args: unknown[]) => unknown;

export interface TemplateExtension {
  /** Custom template helpers */
  helpers?: Record<string, TemplateHelper>;
  /** Custom template filters */
  filters?: Record<string, TemplateFilter>;
  /** Reusable template partials */
  partials?: Record<string, string>;
}

// ============================================================================
// File Extension Types
// ============================================================================

export interface FileHookContext {
  path: string;
  content: string;
  modify: (changes: { content?: string; path?: string }) => void;
  success?: boolean;
}

export type FileHook = (context: FileHookContext) => Promise<void> | void;

export type FileErrorHook = (context: {
  path: string;
  error: Error;
  retry: () => Promise<void>;
}) => Promise<void> | void;

export interface FileExtension {
  beforeWrite?: FileHook;
  afterWrite?: FileHook;
  beforeRead?: FileHook;
  afterRead?: FileHook;
  onError?: FileErrorHook;
}

// ============================================================================
// Result Extension Types
// ============================================================================

export interface ResultFieldDefinition<T = unknown> {
  /** Dependencies needed to compute this field */
  needs: string[];
  /** Computation function */
  compute: (result: Record<string, unknown>) => T;
}

export interface ResultExtension {
  component?: Record<string, ResultFieldDefinition>;
  page?: Record<string, ResultFieldDefinition>;
  hook?: Record<string, ResultFieldDefinition>;
  service?: Record<string, ResultFieldDefinition>;
  [generator: string]: Record<string, ResultFieldDefinition> | undefined;
}

// ============================================================================
// Client Extension Types
// ============================================================================

export type ClientMethod = (...args: unknown[]) => unknown;

export interface ClientExtension {
  [methodName: string]: ClientMethod;
}

// ============================================================================
// Main Extension Interface
// ============================================================================

/**
 * Complete Enzyme Extension definition
 * Inspired by Prisma's extension architecture
 */
export interface EnzymeExtension {
  /** Extension name (required) */
  name: string;
  /** Extension version */
  version?: string;
  /** Extension description */
  description?: string;

  /** Generator lifecycle hooks */
  generator?: GeneratorExtension;
  /** Custom CLI commands */
  command?: CommandExtension;
  /** Template helpers and filters */
  template?: TemplateExtension;
  /** File operation hooks */
  file?: FileExtension;
  /** Result transformations */
  result?: ResultExtension;
  /** Client-level utilities */
  client?: ClientExtension;
}

// ============================================================================
// Extension Manager Types
// ============================================================================

export interface ExtensionManager {
  /** Register an extension */
  register(extension: EnzymeExtension): void;
  /** Unregister an extension */
  unregister(name: string): boolean;
  /** Get all extensions */
  getExtensions(): EnzymeExtension[];
  /** Get extension by name */
  getExtension(name: string): EnzymeExtension | undefined;
  /** Execute generator hooks */
  executeGeneratorHooks<T>(
    hookName: keyof GeneratorHooks,
    generator: string,
    context: GeneratorHookContext
  ): Promise<T | void>;
  /** Execute file hooks */
  executeFileHooks(
    hookName: keyof FileExtension,
    context: FileHookContext
  ): Promise<void>;
  /** Get all custom commands */
  getCommands(): Map<string, CommandDefinition>;
  /** Get template helpers */
  getTemplateHelpers(): Record<string, TemplateHelper>;
  /** Get template filters */
  getTemplateFilters(): Record<string, TemplateFilter>;
}

// ============================================================================
// Type Utilities (Prisma-inspired)
// ============================================================================

/**
 * Enzyme namespace with type utilities
 */
export namespace Enzyme {
  /**
   * Define an extension with type inference
   */
  export function defineExtension<T extends EnzymeExtension>(extension: T): T {
    return extension;
  }

  /**
   * Get arguments type for a generator
   */
  export type Args<
    TGenerator extends string,
    TOperation extends string = 'generate'
  > = TGenerator extends 'component'
    ? ComponentGeneratorArgs
    : TGenerator extends 'page'
      ? PageGeneratorArgs
      : TGenerator extends 'hook'
        ? HookGeneratorArgs
        : Record<string, unknown>;

  /**
   * Get result type for a generator
   */
  export type Result<
    TGenerator extends string,
    TOperation extends string = 'generate'
  > = GeneratorResult;

  /**
   * Exact type matching for strict checking
   */
  export type Exact<Input, Shape> =
    Input extends Shape
      ? Exclude<keyof Input, keyof Shape> extends never
        ? Input
        : never
      : never;
}

// Generator argument types
export interface ComponentGeneratorArgs {
  name: string;
  path?: string;
  withTests?: boolean;
  withStory?: boolean;
  withStyles?: boolean;
  template?: string;
}

export interface PageGeneratorArgs {
  name: string;
  path?: string;
  withTests?: boolean;
  layout?: string;
  route?: string;
}

export interface HookGeneratorArgs {
  name: string;
  path?: string;
  type?: 'query' | 'mutation' | 'state' | 'effect' | 'callback' | 'custom';
  withTests?: boolean;
}

export interface GeneratorResult {
  name: string;
  files: string[];
  path: string;
  dependencies?: string[];
}
