/**
 * File System Utilities for Code Generation
 *
 * Provides safe and convenient utilities for creating, updating, and managing
 * generated code files with backup and rollback capabilities.
 *
 * @example
 * ```typescript
 * const fileGen = new FileGenerator('/path/to/project');
 * await fileGen.create('src/components/Button.tsx', buttonCode);
 * await fileGen.update('src/index.ts', (content) => content + exportStatement);
 * ```
 *
 * @module generators/file
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * File operation result
 */
export interface FileOperationResult {
  /**
   * Operation was successful
   */
  success: boolean;

  /**
   * File path
   */
  path: string;

  /**
   * Operation type
   */
  operation: 'create' | 'update' | 'delete' | 'backup' | 'restore';

  /**
   * Error message if failed
   */
  error?: string;

  /**
   * Backup path if created
   */
  backupPath?: string;
}

/**
 * File generation options
 */
export interface FileGenerationOptions {
  /**
   * Create backup before modifying
   */
  backup?: boolean;

  /**
   * Overwrite existing file
   */
  overwrite?: boolean;

  /**
   * Create parent directories
   */
  createDirs?: boolean;

  /**
   * File encoding
   */
  encoding?: BufferEncoding;

  /**
   * Dry run - don't actually write files
   */
  dryRun?: boolean;
}

/**
 * File template for batch generation
 */
export interface FileTemplate {
  /**
   * Relative path from base directory
   */
  path: string;

  /**
   * File content or generator function
   */
  content: string | (() => string | Promise<string>);

  /**
   * Options for this file
   */
  options?: FileGenerationOptions;
}

/**
 * Batch operation result
 */
export interface BatchOperationResult {
  /**
   * All operations successful
   */
  success: boolean;

  /**
   * Individual file results
   */
  results: FileOperationResult[];

  /**
   * Total files processed
   */
  total: number;

  /**
   * Number of successful operations
   */
  successful: number;

  /**
   * Number of failed operations
   */
  failed: number;
}

/**
 * File generator for creating and managing generated code files
 *
 * @example
 * ```typescript
 * const generator = new FileGenerator('/my/project');
 *
 * // Create a new file
 * await generator.create('src/utils/helper.ts', 'export function helper() {}');
 *
 * // Update existing file
 * await generator.update('src/index.ts', (content) => {
 *   return content + '\nexport * from "./utils/helper";';
 * });
 *
 * // Delete file
 * await generator.delete('src/old-file.ts');
 *
 * // Batch create
 * await generator.createBatch([
 *   { path: 'src/components/A.tsx', content: componentA },
 *   { path: 'src/components/B.tsx', content: componentB },
 * ]);
 * ```
 */
export class FileGenerator {
  private baseDir: string;
  private backupDir: string;
  private operations: FileOperationResult[] = [];

  constructor(baseDir: string, backupDir?: string) {
    this.baseDir = path.resolve(baseDir);
    this.backupDir = backupDir
      ? path.resolve(backupDir)
      : path.join(this.baseDir, '.generator-backups');
  }

  /**
   * Create a new file
   *
   * @param filePath - Relative path from base directory
   * @param content - File content
   * @param options - Generation options
   * @returns Operation result
   *
   * @example
   * ```typescript
   * await generator.create('src/Button.tsx', componentCode, {
   *   createDirs: true,
   *   overwrite: false
   * });
   * ```
   */
  async create(
    filePath: string,
    content: string,
    options?: FileGenerationOptions
  ): Promise<FileOperationResult> {
    const opts = this.getDefaultOptions(options);
    const fullPath = this.resolvePath(filePath);

    try {
      // Check if file exists
      if (await this.exists(fullPath)) {
        if (!opts.overwrite) {
          return {
            success: false,
            path: filePath,
            operation: 'create',
            error: 'File already exists and overwrite is false',
          };
        }

        // Backup existing file if requested
        if (opts.backup) {
          await this.backupFile(fullPath);
        }
      }

      // Create parent directories
      if (opts.createDirs) {
        await this.ensureDir(path.dirname(fullPath));
      }

      // Write file
      if (!opts.dryRun) {
        await fs.promises.writeFile(fullPath, content, opts.encoding);
      }

      const result: FileOperationResult = {
        success: true,
        path: filePath,
        operation: 'create',
      };

      this.operations.push(result);
      return result;
    } catch (error) {
      const result: FileOperationResult = {
        success: false,
        path: filePath,
        operation: 'create',
        error: error instanceof Error ? error.message : String(error),
      };

      this.operations.push(result);
      return result;
    }
  }

  /**
   * Update an existing file
   *
   * @param filePath - Relative path from base directory
   * @param updater - Function to transform file content
   * @param options - Generation options
   * @returns Operation result
   *
   * @example
   * ```typescript
   * await generator.update('src/index.ts', (content) => {
   *   return content.replace('old', 'new');
   * }, { backup: true });
   * ```
   */
  async update(
    filePath: string,
    updater: (content: string) => string | Promise<string>,
    options?: FileGenerationOptions
  ): Promise<FileOperationResult> {
    const opts = this.getDefaultOptions(options);
    const fullPath = this.resolvePath(filePath);

    try {
      // Check if file exists
      if (!(await this.exists(fullPath))) {
        return {
          success: false,
          path: filePath,
          operation: 'update',
          error: 'File does not exist',
        };
      }

      // Backup existing file if requested
      if (opts.backup) {
        await this.backupFile(fullPath);
      }

      // Read current content
      const currentContent = await fs.promises.readFile(fullPath, opts.encoding);

      // Apply updater
      const newContent = await updater(currentContent);

      // Write updated content
      if (!opts.dryRun) {
        await fs.promises.writeFile(fullPath, newContent, opts.encoding);
      }

      const result: FileOperationResult = {
        success: true,
        path: filePath,
        operation: 'update',
      };

      this.operations.push(result);
      return result;
    } catch (error) {
      const result: FileOperationResult = {
        success: false,
        path: filePath,
        operation: 'update',
        error: error instanceof Error ? error.message : String(error),
      };

      this.operations.push(result);
      return result;
    }
  }

  /**
   * Delete a file
   *
   * @param filePath - Relative path from base directory
   * @param options - Generation options
   * @returns Operation result
   *
   * @example
   * ```typescript
   * await generator.delete('src/old-component.tsx', { backup: true });
   * ```
   */
  async delete(
    filePath: string,
    options?: FileGenerationOptions
  ): Promise<FileOperationResult> {
    const opts = this.getDefaultOptions(options);
    const fullPath = this.resolvePath(filePath);

    try {
      // Check if file exists
      if (!(await this.exists(fullPath))) {
        return {
          success: false,
          path: filePath,
          operation: 'delete',
          error: 'File does not exist',
        };
      }

      // Backup before deleting
      if (opts.backup) {
        await this.backupFile(fullPath);
      }

      // Delete file
      if (!opts.dryRun) {
        await fs.promises.unlink(fullPath);
      }

      const result: FileOperationResult = {
        success: true,
        path: filePath,
        operation: 'delete',
      };

      this.operations.push(result);
      return result;
    } catch (error) {
      const result: FileOperationResult = {
        success: false,
        path: filePath,
        operation: 'delete',
        error: error instanceof Error ? error.message : String(error),
      };

      this.operations.push(result);
      return result;
    }
  }

  /**
   * Create multiple files in batch
   *
   * @param templates - Array of file templates
   * @param options - Default options for all files
   * @returns Batch operation result
   *
   * @example
   * ```typescript
   * await generator.createBatch([
   *   { path: 'src/A.ts', content: 'export const A = 1;' },
   *   { path: 'src/B.ts', content: 'export const B = 2;' },
   * ]);
   * ```
   */
  async createBatch(
    templates: FileTemplate[],
    options?: FileGenerationOptions
  ): Promise<BatchOperationResult> {
    const results: FileOperationResult[] = [];

    for (const template of templates) {
      const content =
        typeof template.content === 'function'
          ? await template.content()
          : template.content;

      const result = await this.create(
        template.path,
        content,
        { ...options, ...template.options }
      );

      results.push(result);
    }

    return this.createBatchResult(results);
  }

  /**
   * Read file content
   *
   * @param filePath - Relative path from base directory
   * @param encoding - File encoding
   * @returns File content
   */
  async read(
    filePath: string,
    encoding: BufferEncoding = 'utf-8'
  ): Promise<string> {
    const fullPath = this.resolvePath(filePath);
    return fs.promises.readFile(fullPath, encoding);
  }

  /**
   * Check if file exists
   *
   * @param filePath - Relative or absolute path
   * @returns True if file exists
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure directory exists
   *
   * @param dirPath - Directory path
   */
  async ensureDir(dirPath: string): Promise<void> {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }

  /**
   * Backup a file
   *
   * @param fullPath - Full path to file
   * @returns Backup path
   */
  private async backupFile(fullPath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const relativePath = path.relative(this.baseDir, fullPath);
    const backupPath = path.join(
      this.backupDir,
      `${relativePath}.${timestamp}.bak`
    );

    await this.ensureDir(path.dirname(backupPath));
    await fs.promises.copyFile(fullPath, backupPath);

    return backupPath;
  }

  /**
   * Restore from backup
   *
   * @param filePath - Original file path
   * @param backupPath - Backup file path
   * @returns Operation result
   */
  async restore(filePath: string, backupPath: string): Promise<FileOperationResult> {
    const fullPath = this.resolvePath(filePath);

    try {
      await fs.promises.copyFile(backupPath, fullPath);

      return {
        success: true,
        path: filePath,
        operation: 'restore',
      };
    } catch (error) {
      return {
        success: false,
        path: filePath,
        operation: 'restore',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get list of all backups for a file
   *
   * @param filePath - Relative path from base directory
   * @returns Array of backup paths
   */
  async getBackups(filePath: string): Promise<string[]> {
    const relativePath = path.relative(this.baseDir, this.resolvePath(filePath));
    const backupPattern = path.join(this.backupDir, relativePath);
    const backupDir = path.dirname(backupPattern);

    try {
      const files = await fs.promises.readdir(backupDir);
      const basename = path.basename(relativePath);
      return files
        .filter(file => file.startsWith(basename))
        .map(file => path.join(backupDir, file))
        .sort()
        .reverse(); // Most recent first
    } catch {
      return [];
    }
  }

  /**
   * Get operation history
   *
   * @returns Array of all operations performed
   */
  getOperationHistory(): FileOperationResult[] {
    return [...this.operations];
  }

  /**
   * Clear operation history
   */
  clearHistory(): void {
    this.operations = [];
  }

  /**
   * Resolve relative path to absolute
   */
  private resolvePath(filePath: string): string {
    return path.isAbsolute(filePath) ? filePath : path.join(this.baseDir, filePath);
  }

  /**
   * Get default options
   */
  private getDefaultOptions(options?: FileGenerationOptions): Required<FileGenerationOptions> {
    return {
      backup: false,
      overwrite: true,
      createDirs: true,
      encoding: 'utf-8',
      dryRun: false,
      ...options,
    };
  }

  /**
   * Create batch result from individual results
   */
  private createBatchResult(results: FileOperationResult[]): BatchOperationResult {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return {
      success: failed === 0,
      results,
      total: results.length,
      successful,
      failed,
    };
  }
}

/**
 * Create a file generator instance
 *
 * @param baseDir - Base directory for file operations
 * @param backupDir - Directory for backups (optional)
 * @returns FileGenerator instance
 *
 * @example
 * ```typescript
 * const generator = createFileGenerator('./src');
 * await generator.create('components/Button.tsx', code);
 * ```
 */
export function createFileGenerator(
  baseDir: string,
  backupDir?: string
): FileGenerator {
  return new FileGenerator(baseDir, backupDir);
}

/**
 * Utility to safely write a file
 *
 * @param filePath - Path to file
 * @param content - File content
 * @param options - Write options
 *
 * @example
 * ```typescript
 * await safeWriteFile('./output.ts', code, { backup: true });
 * ```
 */
export async function safeWriteFile(
  filePath: string,
  content: string,
  options?: FileGenerationOptions
): Promise<void> {
  const generator = new FileGenerator(path.dirname(filePath));
  const result = await generator.create(path.basename(filePath), content, options);

  if (!result.success) {
    throw new Error(result.error || 'Failed to write file');
  }
}

/**
 * Utility to safely update a file
 *
 * @param filePath - Path to file
 * @param updater - Function to transform content
 * @param options - Update options
 *
 * @example
 * ```typescript
 * await safeUpdateFile('./index.ts', (content) => {
 *   return content + '\nexport * from "./new-module";';
 * });
 * ```
 */
export async function safeUpdateFile(
  filePath: string,
  updater: (content: string) => string | Promise<string>,
  options?: FileGenerationOptions
): Promise<void> {
  const generator = new FileGenerator(path.dirname(filePath));
  const result = await generator.update(path.basename(filePath), updater, options);

  if (!result.success) {
    throw new Error(result.error || 'Failed to update file');
  }
}
