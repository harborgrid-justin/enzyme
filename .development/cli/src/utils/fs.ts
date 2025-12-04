/**
 * @file File system utilities with helpful error handling
 * @module utils/fs
 */

import * as fs from 'fs-extra';
import { glob } from 'glob';
import { dirname } from 'path';
import { FileOperationResult, FileSystemOptions } from '../types/index.js';

/**
 * Check if a file or directory exists
 * @param path - Path to check
 * @returns True if exists, false otherwise
 */
export async function exists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if path is a directory
 * @param path - Path to check
 * @returns True if directory, false otherwise
 */
export async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await fs.stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if path is a file
 * @param path - Path to check
 * @returns True if file, false otherwise
 */
export async function isFile(path: string): Promise<boolean> {
  try {
    const stats = await fs.stat(path);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Read file contents
 * @param path - File path
 * @param encoding - File encoding (default: utf-8)
 * @returns File contents
 */
export async function readFile(path: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
  try {
    return await fs.readFile(path, encoding);
  } catch (error) {
    throw new Error(`Failed to read file ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Write file contents
 * @param path - File path
 * @param contents - File contents
 * @param options - File system options
 * @returns Operation result
 */
export async function writeFile(
  path: string,
  contents: string,
  options?: FileSystemOptions
): Promise<FileOperationResult> {
  try {
    // Check if file exists
    const fileExists = await exists(path);

    if (fileExists && !options?.overwrite) {
      return {
        success: false,
        path,
        message: 'File already exists. Use --force to overwrite.',
      };
    }

    // Ensure directory exists
    if (options?.recursive) {
      await fs.ensureDir(dirname(path));
    }

    await fs.writeFile(path, contents, 'utf-8');

    return {
      success: true,
      path,
      message: fileExists ? 'File updated successfully' : 'File created successfully',
    };
  } catch (error) {
    return {
      success: false,
      path,
      error: error instanceof Error ? error : new Error('Unknown error'),
      message: `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Copy file or directory
 * @param src - Source path
 * @param dest - Destination path
 * @param options - File system options
 * @returns Operation result
 */
export async function copy(src: string, dest: string, options?: FileSystemOptions): Promise<FileOperationResult> {
  try {
    // Check if destination exists
    const destExists = await exists(dest);

    if (destExists && !options?.overwrite) {
      return {
        success: false,
        path: dest,
        message: 'Destination already exists. Use --force to overwrite.',
      };
    }

    // Ensure parent directory exists
    if (options?.recursive) {
      await fs.ensureDir(dirname(dest));
    }

    await fs.copy(src, dest, {
      overwrite: options?.overwrite,
      preserveTimestamps: options?.preserveTimestamps,
    });

    return {
      success: true,
      path: dest,
      message: 'Copied successfully',
    };
  } catch (error) {
    return {
      success: false,
      path: dest,
      error: error instanceof Error ? error : new Error('Unknown error'),
      message: `Failed to copy: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Move file or directory
 * @param src - Source path
 * @param dest - Destination path
 * @param options - File system options
 * @returns Operation result
 */
export async function move(src: string, dest: string, options?: FileSystemOptions): Promise<FileOperationResult> {
  try {
    // Check if destination exists
    const destExists = await exists(dest);

    if (destExists && !options?.overwrite) {
      return {
        success: false,
        path: dest,
        message: 'Destination already exists. Use --force to overwrite.',
      };
    }

    await fs.move(src, dest, {
      overwrite: options?.overwrite,
    });

    return {
      success: true,
      path: dest,
      message: 'Moved successfully',
    };
  } catch (error) {
    return {
      success: false,
      path: dest,
      error: error instanceof Error ? error : new Error('Unknown error'),
      message: `Failed to move: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Delete file or directory
 * @param path - Path to delete
 * @returns Operation result
 */
export async function remove(path: string): Promise<FileOperationResult> {
  try {
    await fs.remove(path);

    return {
      success: true,
      path,
      message: 'Deleted successfully',
    };
  } catch (error) {
    return {
      success: false,
      path,
      error: error instanceof Error ? error : new Error('Unknown error'),
      message: `Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Create directory
 * @param path - Directory path
 * @param options - File system options
 * @returns Operation result
 */
export async function mkdir(path: string, options?: FileSystemOptions): Promise<FileOperationResult> {
  try {
    const dirExists = await exists(path);

    if (dirExists) {
      return {
        success: false,
        path,
        message: 'Directory already exists',
      };
    }

    if (options?.recursive) {
      await fs.ensureDir(path);
    } else {
      await fs.mkdir(path);
    }

    return {
      success: true,
      path,
      message: 'Directory created successfully',
    };
  } catch (error) {
    return {
      success: false,
      path,
      error: error instanceof Error ? error : new Error('Unknown error'),
      message: `Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Read directory contents
 * @param path - Directory path
 * @returns Array of file/directory names
 */
export async function readDir(path: string): Promise<string[]> {
  try {
    return await fs.readdir(path);
  } catch (error) {
    throw new Error(`Failed to read directory ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Find files matching a pattern
 * @param pattern - Glob pattern
 * @param cwd - Current working directory
 * @returns Array of matching file paths
 */
export async function findFiles(pattern: string, cwd?: string): Promise<string[]> {
  try {
    return await glob(pattern, {
      cwd: cwd || process.cwd(),
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
    });
  } catch (error) {
    throw new Error(`Failed to find files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Read JSON file
 * @param path - File path
 * @returns Parsed JSON object
 */
export async function readJson<T = any>(path: string): Promise<T> {
  try {
    return await fs.readJson(path);
  } catch (error) {
    throw new Error(`Failed to read JSON file ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Write JSON file
 * @param path - File path
 * @param data - Data to write
 * @param options - File system options
 * @returns Operation result
 */
export async function writeJson(
  path: string,
  data: any,
  options?: FileSystemOptions & { spaces?: number }
): Promise<FileOperationResult> {
  try {
    // Ensure directory exists
    if (options?.recursive) {
      await fs.ensureDir(dirname(path));
    }

    await fs.writeJson(path, data, {
      spaces: options?.spaces ?? 2,
    });

    return {
      success: true,
      path,
      message: 'JSON file written successfully',
    };
  } catch (error) {
    return {
      success: false,
      path,
      error: error instanceof Error ? error : new Error('Unknown error'),
      message: `Failed to write JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Empty a directory
 * @param path - Directory path
 * @returns Operation result
 */
export async function emptyDir(path: string): Promise<FileOperationResult> {
  try {
    await fs.emptyDir(path);

    return {
      success: true,
      path,
      message: 'Directory emptied successfully',
    };
  } catch (error) {
    return {
      success: false,
      path,
      error: error instanceof Error ? error : new Error('Unknown error'),
      message: `Failed to empty directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Ensure directory exists (create if it doesn't)
 * @param path - Directory path
 * @returns Operation result
 */
export async function ensureDir(path: string): Promise<FileOperationResult> {
  try {
    await fs.ensureDir(path);

    return {
      success: true,
      path,
      message: 'Directory ensured',
    };
  } catch (error) {
    return {
      success: false,
      path,
      error: error instanceof Error ? error : new Error('Unknown error'),
      message: `Failed to ensure directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get file stats
 * @param path - File path
 * @returns File stats
 */
export async function getStats(path: string): Promise<fs.Stats> {
  try {
    return await fs.stat(path);
  } catch (error) {
    throw new Error(`Failed to get stats for ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
