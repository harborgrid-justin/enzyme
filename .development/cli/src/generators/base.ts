/**
 * @file Base Generator
 * @description Abstract base class for all code generators with common utilities
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import Handlebars from 'handlebars';
import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import { glob } from 'glob';

// ============================================================================
// Types
// ============================================================================

/**
 * Generator configuration options
 */
export interface GeneratorOptions {
  /** Target directory for generated files */
  targetDir?: string;
  /** Whether to overwrite existing files */
  force?: boolean;
  /** Whether to run in dry-run mode (no file writes) */
  dryRun?: boolean;
  /** Whether to skip prompts and use defaults */
  skipPrompts?: boolean;
  /** Verbose logging */
  verbose?: boolean;
}

/**
 * Template context for Handlebars
 */
export interface TemplateContext {
  name: string;
  [key: string]: unknown;
}

/**
 * File to be generated
 */
export interface GeneratedFile {
  /** File path relative to target directory */
  path: string;
  /** File content */
  content: string;
  /** Whether to overwrite if exists */
  overwrite?: boolean;
}

/**
 * Generator result
 */
export interface GeneratorResult {
  /** Whether generation was successful */
  success: boolean;
  /** Files that were generated */
  files: string[];
  /** Error message if failed */
  error?: string;
  /** Additional messages */
  messages?: string[];
}

// ============================================================================
// Base Generator Class
// ============================================================================

/**
 * Abstract base class for all generators
 * Provides common functionality for file generation, template rendering, and validation
 */
export abstract class BaseGenerator<TOptions extends GeneratorOptions = GeneratorOptions> {
  protected options: TOptions;
  protected spinner: Ora;
  protected templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor(options: TOptions) {
    this.options = options;
    this.spinner = ora();
    this.registerHelpers();
  }

  // ==========================================================================
  // Abstract Methods (Must be implemented by subclasses)
  // ==========================================================================

  /**
   * Get the generator name
   */
  protected abstract getName(): string;

  /**
   * Validate the options
   * @throws Error if validation fails
   */
  protected abstract validate(): Promise<void> | void;

  /**
   * Generate files
   * @returns Array of files to generate
   */
  protected abstract generate(): Promise<GeneratedFile[]> | GeneratedFile[];

  // ==========================================================================
  // Lifecycle Hooks (Can be overridden by subclasses)
  // ==========================================================================

  /**
   * Hook called before generation starts
   */
  protected async beforeGenerate(): Promise<void> {
    // Override in subclass if needed
  }

  /**
   * Hook called after generation completes
   */
  protected async afterGenerate(result: GeneratorResult): Promise<void> {
    // Override in subclass if needed
    if (this.options.verbose) {
      console.log(chalk.gray(`Generated ${result.files.length} files`));
    }
  }

  /**
   * Hook called when an error occurs
   */
  protected async onError(error: Error): Promise<void> {
    // Override in subclass if needed
    this.spinner.fail(chalk.red(`Generation failed: ${error.message}`));
  }

  // ==========================================================================
  // Public Methods
  // ==========================================================================

  /**
   * Run the generator
   */
  public async run(): Promise<GeneratorResult> {
    const result: GeneratorResult = {
      success: false,
      files: [],
      messages: [],
    };

    try {
      this.spinner.start(chalk.blue(`Generating ${this.getName()}...`));

      // Lifecycle: Before generate
      await this.beforeGenerate();

      // Validate options
      await this.validate();

      // Generate files
      const files = await this.generate();

      // Write files to disk
      if (!this.options.dryRun) {
        for (const file of files) {
          await this.writeFile(file);
          result.files.push(file.path);
        }
      } else {
        // Dry run: just collect file paths
        result.files = files.map(f => f.path);
        result.messages?.push('Dry run - no files written');
      }

      result.success = true;
      this.spinner.succeed(chalk.green(`Generated ${this.getName()} successfully!`));

      // Lifecycle: After generate
      await this.afterGenerate(result);

      return result;
    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : String(error);

      // Lifecycle: On error
      await this.onError(error instanceof Error ? error : new Error(String(error)));

      return result;
    }
  }

  // ==========================================================================
  // Template Utilities
  // ==========================================================================

  /**
   * Register Handlebars helpers
   */
  protected registerHelpers(): void {
    // PascalCase helper
    Handlebars.registerHelper('pascalCase', (str: string) => {
      return str
        .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
        .replace(/^(.)/, (c) => c.toUpperCase());
    });

    // camelCase helper
    Handlebars.registerHelper('camelCase', (str: string) => {
      const pascal = str
        .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
        .replace(/^(.)/, (c) => c.toUpperCase());
      return pascal.charAt(0).toLowerCase() + pascal.slice(1);
    });

    // kebab-case helper
    Handlebars.registerHelper('kebabCase', (str: string) => {
      return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
    });

    // snake_case helper
    Handlebars.registerHelper('snakeCase', (str: string) => {
      return str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
    });

    // UPPER_CASE helper
    Handlebars.registerHelper('upperCase', (str: string) => {
      return str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toUpperCase();
    });

    // Conditional helpers
    Handlebars.registerHelper('if_eq', function(this: unknown, a: unknown, b: unknown, options) {
      return a === b ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('if_neq', function(this: unknown, a: unknown, b: unknown, options) {
      return a !== b ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('if_includes', function(this: unknown, arr: unknown[], item: unknown, options) {
      return Array.isArray(arr) && arr.includes(item) ? options.fn(this) : options.inverse(this);
    });
  }

  /**
   * Render a template with context
   */
  protected renderTemplate(template: string, context: TemplateContext): string {
    const compiled = Handlebars.compile(template);
    return compiled(context);
  }

  /**
   * Load and render a template file
   */
  protected async renderTemplateFile(
    templatePath: string,
    context: TemplateContext
  ): Promise<string> {
    // Check cache first
    let template = this.templateCache.get(templatePath);

    if (!template) {
      // Load template from file
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      template = Handlebars.compile(templateContent);
      this.templateCache.set(templatePath, template);
    }

    return template(context);
  }

  /**
   * Get template directory for this generator
   */
  protected getTemplateDir(): string {
    // Templates are located in cli/src/generators/{generator-name}/templates/
    const generatorName = this.getName().toLowerCase();
    return path.join(__dirname, generatorName, 'templates');
  }

  /**
   * Get all template files in the template directory
   */
  protected async getTemplateFiles(pattern = '**/*.hbs'): Promise<string[]> {
    const templateDir = this.getTemplateDir();
    const files = await glob(pattern, {
      cwd: templateDir,
      absolute: true,
      nodir: true,
    });
    return files;
  }

  // ==========================================================================
  // File System Utilities
  // ==========================================================================

  /**
   * Write a file to disk
   */
  protected async writeFile(file: GeneratedFile): Promise<void> {
    const targetPath = this.resolveTargetPath(file.path);

    // Check if file exists
    if (await fs.pathExists(targetPath)) {
      if (!this.options.force && !file.overwrite) {
        if (this.options.verbose) {
          console.log(chalk.yellow(`Skipped (already exists): ${file.path}`));
        }
        return;
      }
    }

    // Ensure directory exists
    await fs.ensureDir(path.dirname(targetPath));

    // Write file
    await fs.writeFile(targetPath, file.content, 'utf-8');

    if (this.options.verbose) {
      console.log(chalk.green(`Created: ${file.path}`));
    }
  }

  /**
   * Resolve the full target path for a file
   */
  protected resolveTargetPath(relativePath: string): string {
    const baseDir = this.options.targetDir || process.cwd();
    return path.join(baseDir, relativePath);
  }

  /**
   * Check if a file exists
   */
  protected async fileExists(relativePath: string): Promise<boolean> {
    const targetPath = this.resolveTargetPath(relativePath);
    return fs.pathExists(targetPath);
  }

  /**
   * Read a file
   */
  protected async readFile(relativePath: string): Promise<string> {
    const targetPath = this.resolveTargetPath(relativePath);
    return fs.readFile(targetPath, 'utf-8');
  }

  /**
   * Ensure a directory exists
   */
  protected async ensureDir(relativePath: string): Promise<void> {
    const targetPath = this.resolveTargetPath(relativePath);
    await fs.ensureDir(targetPath);
  }

  // ==========================================================================
  // Validation Utilities
  // ==========================================================================

  /**
   * Validate that a name is a valid identifier
   */
  protected validateName(name: string): void {
    if (!name || name.trim() === '') {
      throw new Error('Name cannot be empty');
    }

    if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(name)) {
      throw new Error(
        'Name must start with a letter and contain only letters, numbers, hyphens, and underscores'
      );
    }
  }

  /**
   * Validate that a path is safe (no directory traversal)
   */
  protected validatePath(filePath: string): void {
    const normalized = path.normalize(filePath);
    if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
      throw new Error('Path must be relative and not traverse parent directories');
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Log a message
   */
  protected log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red,
    };

    console.log(colors[type](message));
  }

  /**
   * Log verbose message
   */
  protected logVerbose(message: string): void {
    if (this.options.verbose) {
      console.log(chalk.gray(message));
    }
  }

  /**
   * Format a file path for display
   */
  protected formatPath(filePath: string): string {
    return chalk.cyan(filePath);
  }
}
