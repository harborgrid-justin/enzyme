/**
 * Generator Utilities
 *
 * Provides utilities for template rendering, dependency resolution, and file operations.
 *
 * @module cli/generators/project/utils
 */

import { writeFile as fsWriteFile, readFile as fsReadFile, copyFile as fsCopyFile } from 'fs/promises';
import { dirname } from 'path';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import type { Feature, TemplateType } from './index';

/**
 * Template context type
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
 * Dependency map for features
 */
export const FEATURE_DEPENDENCIES: Record<string, { dependencies?: string[]; devDependencies?: string[] }> = {
  auth: {
    dependencies: ['@missionfabric-js/enzyme/auth'],
  },
  state: {
    dependencies: ['zustand', '@tanstack/react-query'],
  },
  routing: {
    dependencies: ['react-router-dom'],
  },
  realtime: {
    dependencies: ['@missionfabric-js/enzyme/realtime'],
  },
  monitoring: {
    dependencies: ['@missionfabric-js/enzyme/monitoring', 'web-vitals'],
  },
  theme: {
    dependencies: ['@missionfabric-js/enzyme/theme'],
  },
};

/**
 * Base dependencies for all projects
 */
export const BASE_DEPENDENCIES = {
  dependencies: {
    '@missionfabric-js/enzyme': '^1.0.6',
    'react': '^18.3.1',
    'react-dom': '^18.3.1',
  },
  devDependencies: {
    '@types/react': '^18.3.18',
    '@types/react-dom': '^18.3.5',
    '@vitejs/plugin-react': '^5.1.1',
    'typescript': '^5.7.2',
    'vite': '^7.2.4',
    'tailwindcss': '^4.1.17',
    '@tailwindcss/postcss': '^4.1.17',
    'autoprefixer': '^10.4.20',
    'postcss': '^8.4.49',
    'eslint': '^9.39.1',
    '@typescript-eslint/eslint-plugin': '^8.48.0',
    '@typescript-eslint/parser': '^8.48.0',
    'prettier': '^3.7.1',
    'prettier-plugin-tailwindcss': '^0.7.1',
  },
};

/**
 * Resolves dependencies based on features
 */
export function resolveDependencies(features: Feature[]): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  const dependencies: Record<string, string> = { ...BASE_DEPENDENCIES.dependencies };
  const devDependencies: Record<string, string> = { ...BASE_DEPENDENCIES.devDependencies };

  // Add feature-specific dependencies
  for (const feature of features) {
    const featureDeps = FEATURE_DEPENDENCIES[feature];
    if (featureDeps) {
      if (featureDeps.dependencies) {
        for (const dep of featureDeps.dependencies) {
          // For enzyme submodules, don't add separate entries
          if (dep.startsWith('@missionfabric-js/enzyme/')) {
            continue;
          }
          // Add standard dependency version mappings
          if (dep === 'zustand') {
            dependencies[dep] = '^5.0.2';
          } else if (dep === '@tanstack/react-query') {
            dependencies[dep] = '^5.60.5';
          } else if (dep === 'react-router-dom') {
            dependencies[dep] = '^6.26.2';
          } else if (dep === 'web-vitals') {
            dependencies[dep] = '^5.1.0';
          }
        }
      }
      if (featureDeps.devDependencies) {
        for (const dep of featureDeps.devDependencies) {
          devDependencies[dep] = 'latest';
        }
      }
    }
  }

  return { dependencies, devDependencies };
}

/**
 * Simple template renderer using Handlebars-like syntax
 * Supports:
 * - {{variable}} - variable interpolation
 * - {{#if condition}}...{{/if}} - conditional blocks
 * - {{#each array}}...{{/each}} - iteration
 */
export function renderTemplate(template: string, context: TemplateContext): string {
  let result = template;

  // Replace variables
  result = result.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return context[varName]?.toString() ?? match;
  });

  // Handle if blocks
  result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
    return context[condition] ? content : '';
  });

  // Handle unless blocks
  result = result.replace(/\{\{#unless (\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g, (match, condition, content) => {
    return !context[condition] ? content : '';
  });

  // Handle each blocks
  result = result.replace(/\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayName, content) => {
    const array = context[arrayName];
    if (!Array.isArray(array)) return '';

    return array.map(item => {
      if (typeof item === 'string') {
        return content.replace(/\{\{this\}\}/g, item);
      }
      return content;
    }).join('\n');
  });

  return result;
}

/**
 * Writes a file to disk, creating directories as needed
 */
export async function writeFile(path: string, content: string): Promise<void> {
  const dir = dirname(path);

  // Create directory if it doesn't exist
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  await fsWriteFile(path, content, 'utf-8');
}

/**
 * Reads a file from disk
 */
export async function readFile(path: string): Promise<string> {
  return await fsReadFile(path, 'utf-8');
}

/**
 * Copies a template file to destination
 */
export async function copyTemplate(sourcePath: string, destPath: string, context?: TemplateContext): Promise<void> {
  const dir = dirname(destPath);

  // Create directory if it doesn't exist
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  if (context) {
    // Read, render, and write
    const content = await readFile(sourcePath);
    const rendered = renderTemplate(content, context);
    await fsWriteFile(destPath, rendered, 'utf-8');
  } else {
    // Direct copy
    await fsCopyFile(sourcePath, destPath);
  }
}

/**
 * Checks for conflicts in the target directory
 */
export function checkConflicts(targetPath: string, files: string[]): string[] {
  const conflicts: string[] = [];

  for (const file of files) {
    const fullPath = `${targetPath}/${file}`;
    if (existsSync(fullPath)) {
      conflicts.push(file);
    }
  }

  return conflicts;
}

/**
 * Formats package.json with proper indentation
 */
export function formatPackageJson(packageJson: Record<string, any>): string {
  return JSON.stringify(packageJson, null, 2) + '\n';
}

/**
 * Validates npm package name
 */
export function isValidNpmName(name: string): boolean {
  const npmNameRegex = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
  return npmNameRegex.test(name) && name.length <= 214;
}

/**
 * Converts a string to kebab-case
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Converts a string to PascalCase
 */
export function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Converts a string to camelCase
 */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Sorts package.json keys in standard order
 */
export function sortPackageJson(packageJson: Record<string, any>): Record<string, any> {
  const order = [
    'name',
    'version',
    'private',
    'description',
    'type',
    'author',
    'license',
    'keywords',
    'homepage',
    'repository',
    'bugs',
    'scripts',
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'engines',
  ];

  const sorted: Record<string, any> = {};

  // Add keys in order
  for (const key of order) {
    if (key in packageJson) {
      sorted[key] = packageJson[key];
    }
  }

  // Add any remaining keys
  for (const key of Object.keys(packageJson)) {
    if (!(key in sorted)) {
      sorted[key] = packageJson[key];
    }
  }

  return sorted;
}
