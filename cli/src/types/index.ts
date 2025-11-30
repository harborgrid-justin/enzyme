/**
 * @file Shared type definitions for the Enzyme CLI
 * @module types
 *
 * Enterprise-grade type definitions for the most powerful and easy-to-use
 * CLI scaffolding tool for building React applications with Enzyme.
 */

// Re-export config types for unified access
export type {
  Features,
  Generators,
  Style,
  TypeScriptConfig,
  BuildConfig,
  TestingConfig,
  LintingConfig,
  EnzymeConfig as ConfigSchemaType,
  PartialEnzymeConfig,
} from '../config/schema.js';

/**
 * Global CLI options available to all commands
 */
export interface GlobalOptions {
  /** Enable verbose logging output */
  verbose?: boolean;
  /** Perform a dry run without making actual changes */
  dryRun?: boolean;
  /** Force operation without confirmation prompts */
  force?: boolean;
  /** Disable colored output */
  noColor?: boolean;
  /** Path to custom configuration file */
  config?: string;
  /** Interactive mode - prompt for missing options */
  interactive?: boolean;
}

/**
 * Log levels for the logger utility
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  SUCCESS = 'success',
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  success(message: string, ...args: unknown[]): void;
  setLevel(level: LogLevel): void;
  setVerbose(verbose: boolean): void;
}

/**
 * File operation result
 */
export interface FileOperationResult {
  success: boolean;
  path: string;
  message?: string;
  error?: Error;
}

/**
 * Template data context
 */
export interface TemplateContext {
  [key: string]: unknown;
}

/**
 * Template compilation options
 */
export interface TemplateOptions {
  /** Template source */
  source: string;
  /** Data context for template */
  context: TemplateContext;
  /** Additional Handlebars helpers */
  helpers?: Record<string, (...args: unknown[]) => unknown>;
}

/**
 * File system operation options
 */
export interface FileSystemOptions {
  /** Overwrite existing files */
  overwrite?: boolean;
  /** Create parent directories if they don't exist */
  recursive?: boolean;
  /** Preserve file timestamps */
  preserveTimestamps?: boolean;
}

/**
 * Command execution context
 */
export interface CommandContext {
  /** Global options */
  options: GlobalOptions;
  /** Logger instance */
  logger: Logger;
  /** Current working directory */
  cwd: string;
  /** Configuration */
  config: EnzymeConfig;
  /** Plugin manager */
  pluginManager: PluginManager;
}

/**
 * Enzyme CLI configuration
 */
export interface EnzymeConfig {
  /** Project name */
  name?: string;
  /** Project version */
  version?: string;
  /** Component output directory */
  componentDir?: string;
  /** Page output directory */
  pageDir?: string;
  /** Hook output directory */
  hookDir?: string;
  /** Service output directory */
  serviceDir?: string;
  /** Test output directory */
  testDir?: string;
  /** Default component template */
  defaultTemplate?: string;
  /** Enable TypeScript */
  typescript?: boolean;
  /** Enable CSS Modules */
  cssModules?: boolean;
  /** CSS preprocessor (scss, less, stylus) */
  cssPreprocessor?: 'scss' | 'less' | 'stylus' | 'none';
  /** Enable Storybook integration */
  storybook?: boolean;
  /** Enable testing library integration */
  testing?: boolean;
  /** Testing framework (jest, vitest) */
  testFramework?: 'jest' | 'vitest';
  /** Linting configuration */
  linting?: {
    enabled: boolean;
    eslint?: boolean;
    prettier?: boolean;
  };
  /** Git integration */
  git?: {
    enabled: boolean;
    autoCommit?: boolean;
    commitMessage?: string;
  };
  /** Custom plugins */
  plugins?: string[];
  /** Template directories */
  templateDirs?: string[];
  /** File naming convention */
  fileNaming?: 'kebab' | 'pascal' | 'camel' | 'snake';
  /** Import style */
  importStyle?: 'named' | 'default';
}

/**
 * Plugin lifecycle hooks
 */
export interface PluginHooks {
  /** Called before generation starts */
  beforeGenerate?: (context: GenerationContext) => Promise<void> | void;
  /** Called after generation completes */
  afterGenerate?: (context: GenerationContext, result: GenerationResult) => Promise<void> | void;
  /** Called to validate generation parameters */
  validate?: (context: GenerationContext) => Promise<ValidationResult> | ValidationResult;
  /** Called during initialization */
  init?: (context: CommandContext) => Promise<void> | void;
  /** Called during cleanup */
  cleanup?: (context: CommandContext) => Promise<void> | void;
}

/**
 * Plugin definition
 */
export interface Plugin {
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Plugin description */
  description?: string;
  /** Plugin hooks */
  hooks: PluginHooks;
  /** Plugin configuration */
  config?: Record<string, unknown>;
}

/**
 * Plugin manager interface
 */
export interface PluginManager {
  /** Load plugins */
  load(pluginPaths: string[]): Promise<void>;
  /** Register a plugin */
  register(plugin: Plugin): void;
  /** Get all plugins */
  getPlugins(): Plugin[];
  /** Execute hook across all plugins */
  executeHook<T extends keyof PluginHooks>(
    hookName: T,
    ...args: Parameters<NonNullable<PluginHooks[T]>>
  ): Promise<void>;
}

/**
 * Generation context passed to plugins
 */
export interface GenerationContext {
  /** Type of artifact being generated */
  type: 'component' | 'page' | 'hook' | 'service' | 'test' | 'story';
  /** Name of the artifact */
  name: string;
  /** Output directory */
  outputDir: string;
  /** Template to use */
  template?: string;
  /** Additional options */
  options: Record<string, unknown>;
  /** Command context */
  context: CommandContext;
}

/**
 * Generation result
 */
export interface GenerationResult {
  /** Whether generation was successful */
  success: boolean;
  /** Files that were created */
  filesCreated: string[];
  /** Files that were modified */
  filesModified: string[];
  /** Error if generation failed */
  error?: Error;
  /** Additional messages */
  messages: string[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
}

/**
 * Prompt question type
 */
export interface PromptQuestion {
  type: 'input' | 'confirm' | 'list' | 'checkbox' | 'password';
  name: string;
  message: string;
  default?: unknown;
  choices?: Array<string | { name: string; value: unknown }>;
  validate?: (input: unknown) => boolean | string;
  when?: (answers: Record<string, unknown>) => boolean;
}

/**
 * Project information
 */
export interface ProjectInfo {
  /** Project name */
  name: string;
  /** Project root directory */
  root: string;
  /** Package manager (npm, yarn, pnpm) */
  packageManager: 'npm' | 'yarn' | 'pnpm';
  /** Whether it's a TypeScript project */
  isTypeScript: boolean;
  /** Whether it has a git repository */
  hasGit: boolean;
  /** Framework being used */
  framework?: string;
  /** Framework version */
  frameworkVersion?: string;
}

/**
 * Migration definition
 */
export interface Migration {
  /** Migration name */
  name: string;
  /** Migration version */
  version: string;
  /** Migration description */
  description: string;
  /** Run the migration */
  up: (context: CommandContext) => Promise<void>;
  /** Rollback the migration */
  down?: (context: CommandContext) => Promise<void>;
}

/**
 * Analysis result
 */
export interface AnalysisResult {
  /** Project information */
  project: ProjectInfo;
  /** Component count */
  componentCount: number;
  /** Page count */
  pageCount: number;
  /** Hook count */
  hookCount: number;
  /** Test coverage percentage */
  testCoverage?: number;
  /** Dependencies */
  dependencies: Record<string, string>;
  /** Dev dependencies */
  devDependencies: Record<string, string>;
  /** Issues found */
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
    file?: string;
    line?: number;
  }>;
  /** Recommendations */
  recommendations: string[];
}

/**
 * Component generation options
 */
export interface ComponentOptions {
  /** Component name */
  name: string;
  /** Output directory */
  dir?: string;
  /** Component type */
  type?: 'functional' | 'class';
  /** Include styles */
  styles?: boolean;
  /** Style type */
  styleType?: 'css' | 'scss' | 'less' | 'styled-components';
  /** Include tests */
  tests?: boolean;
  /** Include Storybook story */
  story?: boolean;
  /** Export type */
  export?: 'named' | 'default';
  /** Include props interface */
  props?: boolean;
}

/**
 * Page generation options
 */
export interface PageOptions {
  /** Page name */
  name: string;
  /** Output directory */
  dir?: string;
  /** Include route configuration */
  route?: boolean;
  /** Route path */
  path?: string;
  /** Include layout */
  layout?: boolean;
  /** Include SEO meta tags */
  seo?: boolean;
}

/**
 * Hook generation options
 */
export interface HookOptions {
  /** Hook name */
  name: string;
  /** Output directory */
  dir?: string;
  /** Include tests */
  tests?: boolean;
  /** Hook type */
  type?: 'state' | 'effect' | 'context' | 'custom';
}

/**
 * Service generation options
 */
export interface ServiceOptions {
  /** Service name */
  name: string;
  /** Output directory */
  dir?: string;
  /** Include tests */
  tests?: boolean;
  /** Service type */
  type?: 'api' | 'storage' | 'auth' | 'custom';
}
