/**
 * @file Path utilities and resolvers
 * @module utils/path
 */

import { resolve, dirname, basename, extname, join, relative, isAbsolute, sep } from 'path';
import { homedir } from 'os';

/**
 * Resolve path relative to current working directory
 * @param path - Path to resolve
 * @param cwd - Current working directory
 * @returns Resolved absolute path
 */
export function resolvePath(path: string, cwd?: string): string {
  const base = cwd || process.cwd();

  // Handle home directory expansion
  if (path.startsWith('~')) {
    return join(homedir(), path.slice(1));
  }

  // Return absolute paths as-is
  if (isAbsolute(path)) {
    return path;
  }

  return resolve(base, path);
}

/**
 * Convert path to use forward slashes (cross-platform)
 * @param path - Path to normalize
 * @returns Path with forward slashes
 */
export function normalizeSlashes(path: string): string {
  return path.split(sep).join('/');
}

/**
 * Get relative path from one location to another
 * @param from - From path
 * @param to - To path
 * @returns Relative path
 */
export function getRelativePath(from: string, to: string): string {
  return normalizeSlashes(relative(from, to));
}

/**
 * Convert a file name to different naming conventions
 * @param name - File name
 * @param convention - Naming convention
 * @returns Converted name
 */
export function convertNamingConvention(
  name: string,
  convention: 'kebab' | 'pascal' | 'camel' | 'snake'
): string {
  // Remove file extension if present
  const ext = extname(name);
  const baseName = ext ? basename(name, ext) : name;

  // Split on various separators and special characters
  const words = baseName
    .replace(/([a-z])([A-Z])/g, '$1 $2') // PascalCase/camelCase
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2') // Handle acronyms
    .replace(/[-_\s]+/g, ' ') // Replace separators with space
    .trim()
    .toLowerCase()
    .split(/\s+/);

  switch (convention) {
    case 'kebab':
      return words.join('-');

    case 'pascal':
      return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('');

    case 'camel':
      return words
        .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
        .join('');

    case 'snake':
      return words.join('_');

    default:
      return baseName;
  }
}

/**
 * Get file name from path
 * @param path - File path
 * @param includeExtension - Include file extension
 * @returns File name
 */
export function getFileName(path: string, includeExtension = true): string {
  if (includeExtension) {
    return basename(path);
  }
  return basename(path, extname(path));
}

/**
 * Get directory name from path
 * @param path - File path
 * @returns Directory name
 */
export function getDirName(path: string): string {
  return dirname(path);
}

/**
 * Get file extension
 * @param path - File path
 * @param includeDot - Include the dot in extension
 * @returns File extension
 */
export function getExtension(path: string, includeDot = true): string {
  const ext = extname(path);
  return includeDot ? ext : ext.slice(1);
}

/**
 * Join paths
 * @param paths - Paths to join
 * @returns Joined path
 */
export function joinPaths(...paths: string[]): string {
  return normalizeSlashes(join(...paths));
}

/**
 * Check if path is absolute
 * @param path - Path to check
 * @returns True if absolute
 */
export function isAbsolutePath(path: string): boolean {
  return isAbsolute(path);
}

/**
 * Resolve component path based on configuration
 * @param name - Component name
 * @param baseDir - Base directory
 * @param convention - Naming convention
 * @returns Resolved component path
 */
export function resolveComponentPath(
  name: string,
  baseDir: string,
  convention: 'kebab' | 'pascal' | 'camel' | 'snake' = 'kebab'
): string {
  const convertedName = convertNamingConvention(name, convention);
  return resolvePath(joinPaths(baseDir, convertedName));
}

/**
 * Resolve output file path for generated files
 * @param name - File name
 * @param outputDir - Output directory
 * @param extension - File extension
 * @param convention - Naming convention
 * @returns Resolved file path
 */
export function resolveOutputPath(
  name: string,
  outputDir: string,
  extension: string,
  convention: 'kebab' | 'pascal' | 'camel' | 'snake' = 'kebab'
): string {
  const convertedName = convertNamingConvention(name, convention);
  const fileName = `${convertedName}.${extension.replace(/^\./, '')}`;
  return resolvePath(joinPaths(outputDir, fileName));
}

/**
 * Parse import path to determine if it's relative, absolute, or from node_modules
 * @param importPath - Import path
 * @returns Import path type
 */
export function parseImportPath(importPath: string): {
  type: 'relative' | 'absolute' | 'package';
  path: string;
} {
  if (importPath.startsWith('.')) {
    return { type: 'relative', path: importPath };
  }

  if (isAbsolute(importPath)) {
    return { type: 'absolute', path: importPath };
  }

  return { type: 'package', path: importPath };
}

/**
 * Create import path from source to target
 * @param from - Source file path
 * @param to - Target file path
 * @param includeExtension - Include file extension in import
 * @returns Import path
 */
export function createImportPath(from: string, to: string, includeExtension = false): string {
  const fromDir = dirname(from);
  let relativePath = getRelativePath(fromDir, to);

  // Ensure path starts with ./ or ../
  if (!relativePath.startsWith('.')) {
    relativePath = `./${relativePath}`;
  }

  // Remove extension if not needed
  if (!includeExtension && extname(relativePath)) {
    relativePath = relativePath.replace(/\.[^.]+$/, '');
  }

  return relativePath;
}

/**
 * Get home directory
 * @returns Home directory path
 */
export function getHomeDir(): string {
  return homedir();
}

/**
 * Expand tilde in path
 * @param path - Path with possible tilde
 * @returns Expanded path
 */
export function expandTilde(path: string): string {
  if (path.startsWith('~/') || path === '~') {
    return join(homedir(), path.slice(1));
  }
  return path;
}

/**
 * Check if path is inside another path
 * @param childPath - Child path
 * @param parentPath - Parent path
 * @returns True if child is inside parent
 */
export function isPathInside(childPath: string, parentPath: string): boolean {
  const relPath = relative(parentPath, childPath);
  return !relPath.startsWith('..') && !isAbsolute(relPath);
}

/**
 * Get common base path from multiple paths
 * @param paths - Array of paths
 * @returns Common base path
 */
export function getCommonBasePath(paths: string[]): string {
  if (paths.length === 0) return '';
  if (paths.length === 1) return dirname(paths[0]);

  const normalizedPaths = paths.map((p) => normalizeSlashes(p));
  const parts = normalizedPaths[0].split('/');

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (!normalizedPaths.every((p) => p.split('/')[i] === part)) {
      return parts.slice(0, i).join('/');
    }
  }

  return parts.join('/');
}

/**
 * Ensure path ends with separator
 * @param path - Path to check
 * @returns Path with trailing separator
 */
export function ensureTrailingSeparator(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}

/**
 * Remove trailing separator from path
 * @param path - Path to check
 * @returns Path without trailing separator
 */
export function removeTrailingSeparator(path: string): string {
  return path.replace(/\/+$/, '');
}
