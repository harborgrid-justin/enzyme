/**
 * TypeScript type definitions for Enzyme CLI
 *
 * @module cli/types
 */

/**
 * Template types supported by the generator
 */
export type TemplateType = 'minimal' | 'standard' | 'enterprise' | 'full';

/**
 * Package manager options
 */
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

/**
 * Available features that can be enabled
 */
export type Feature =
  | 'auth'
  | 'state'
  | 'routing'
  | 'realtime'
  | 'monitoring'
  | 'theme';

/**
 * Project generator options
 */
export interface ProjectGeneratorOptions {
  /** Project name */
  projectName: string;
  /** Template to use */
  template: TemplateType;
  /** Package manager to use */
  packageManager: PackageManager;
  /** Initialize git repository */
  git: boolean;
  /** Run package install after generation */
  install: boolean;
  /** Use TypeScript (always true for enzyme) */
  typescript: boolean;
  /** Additional features to enable */
  features: Feature[];
  /** Output directory (defaults to cwd) */
  outputDir?: string;
}

/**
 * Template context for rendering
 */
export interface TemplateContext {
  projectName: string;
  template: TemplateType;
  features: Feature[];
  hasAuth: boolean;
  hasState: boolean;
  hasRouting: boolean;
  hasRealtime: boolean;
  hasMonitoring: boolean;
  hasTheme: boolean;
  packageManager: string;
  [key: string]: any;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Dependencies configuration
 */
export interface DependenciesConfig {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}
