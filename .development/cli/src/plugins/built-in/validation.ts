/**
 * @file Validation plugin for generation operations
 * @module plugins/built-in/validation
 */

import { Plugin, GenerationContext, ValidationResult } from '../../types/index.js';
import { exists, isDirectory } from '../../utils/fs.js';
import { resolve } from 'path';

/**
 * Validation plugin
 */
export const validationPlugin: Plugin = {
  name: 'validation',
  version: '1.0.0',
  description: 'Validates generation parameters and environment',

  hooks: {
    async validate(context: GenerationContext): Promise<ValidationResult> {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate name
      if (!context.name || context.name.trim().length === 0) {
        errors.push('Name is required');
      } else {
        // Validate name format based on type
        if (context.type === 'component' || context.type === 'page') {
          if (!/^[A-Z][A-Za-z0-9]*$/.test(context.name)) {
            errors.push('Component/Page name must be in PascalCase and start with a capital letter');
          }
        }

        if (context.type === 'hook') {
          if (!context.name.startsWith('use')) {
            errors.push('Hook name must start with "use"');
          }
          if (!/^use[A-Z][A-Za-z0-9]*$/.test(context.name)) {
            errors.push('Hook name must be in camelCase starting with "use"');
          }
        }

        // Check for reserved names
        const reservedNames = [
          'React',
          'Component',
          'Fragment',
          'useState',
          'useEffect',
          'useContext',
          'useReducer',
          'useCallback',
          'useMemo',
          'useRef',
          'useImperativeHandle',
          'useLayoutEffect',
          'useDebugValue',
        ];

        if (reservedNames.includes(context.name)) {
          errors.push(`"${context.name}" is a reserved name`);
        }
      }

      // Validate output directory
      if (!context.outputDir || context.outputDir.trim().length === 0) {
        errors.push('Output directory is required');
      } else {
        const outputPath = resolve(context.context.cwd, context.outputDir);

        // Check if output directory exists
        if (!(await exists(outputPath))) {
          warnings.push(`Output directory "${context.outputDir}" does not exist. It will be created.`);
        } else if (!(await isDirectory(outputPath))) {
          errors.push(`Output path "${context.outputDir}" exists but is not a directory`);
        }

        // Check for existing files
        const targetPath = resolve(outputPath, context.name);
        if (await exists(targetPath)) {
          if (!context.context.options.force) {
            errors.push(
              `Target "${context.name}" already exists in ${context.outputDir}. Use --force to overwrite.`
            );
          } else {
            warnings.push(`Target "${context.name}" will be overwritten`);
          }
        }
      }

      // Validate options based on type
      if (context.type === 'component') {
        // Validate style options
        if (context.options.styles && context.options.styleType) {
          const validStyleTypes = ['css', 'scss', 'less', 'styled-components'];
          if (!validStyleTypes.includes(context.options.styleType as string)) {
            errors.push(`Invalid style type: ${context.options.styleType}`);
          }
        }

        // Validate export type
        if (context.options.export) {
          const validExportTypes = ['named', 'default'];
          if (!validExportTypes.includes(context.options.export as string)) {
            errors.push(`Invalid export type: ${context.options.export}`);
          }
        }
      }

      if (context.type === 'page') {
        // Validate route path
        if (context.options.route && context.options.path) {
          const routePath = context.options.path as string;
          if (!routePath.startsWith('/')) {
            warnings.push('Route path should start with "/"');
          }
        }
      }

      if (context.type === 'hook') {
        // Validate hook type
        if (context.options.type) {
          const validHookTypes = ['state', 'effect', 'context', 'custom'];
          if (!validHookTypes.includes(context.options.type as string)) {
            errors.push(`Invalid hook type: ${context.options.type}`);
          }
        }
      }

      if (context.type === 'service') {
        // Validate service type
        if (context.options.type) {
          const validServiceTypes = ['api', 'storage', 'auth', 'custom'];
          if (!validServiceTypes.includes(context.options.type as string)) {
            errors.push(`Invalid service type: ${context.options.type}`);
          }
        }
      }

      // Check for TypeScript configuration if generating TypeScript files
      if (context.context.config.typescript) {
        const tsconfigPath = resolve(context.context.cwd, 'tsconfig.json');
        if (!(await exists(tsconfigPath))) {
          warnings.push('TypeScript is enabled but tsconfig.json not found');
        }
      }

      // Check for testing setup if tests are requested
      if (context.options.tests) {
        const testFramework = context.context.config.testing?.framework;
        const configFiles: Record<string, string> = {
          jest: 'jest.config.js',
          vitest: 'vitest.config.ts',
        };

        const configFile = configFiles[testFramework || 'jest'];
        const configPath = resolve(context.context.cwd, configFile);

        if (!(await exists(configPath))) {
          warnings.push(`Testing is enabled but ${configFile} not found`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    },

    async beforeGenerate(context: GenerationContext): Promise<void> {
      // Log validation warnings
      const validation = await this.validate!(context);

      if (validation.warnings.length > 0) {
        context.context.logger.warn('Validation warnings:');
        validation.warnings.forEach((warning) => {
          context.context.logger.warn(`  • ${warning}`);
        });
      }
    },
  },
};

/**
 * Validate naming convention
 */
export function validateNamingConvention(
  name: string,
  convention: 'kebab' | 'pascal' | 'camel' | 'snake'
): boolean {
  const patterns: Record<string, RegExp> = {
    kebab: /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/,
    pascal: /^[A-Z][A-Za-z0-9]*$/,
    camel: /^[a-z][A-Za-z0-9]*$/,
    snake: /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/,
  };

  return patterns[convention]?.test(name) ?? false;
}

/**
 * Validate file name
 */
export function validateFileName(fileName: string): boolean {
  // Check for invalid characters (including control chars 0x00-0x1f)
  // eslint-disable-next-line no-control-regex
  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  if (invalidChars.test(fileName)) {
    return false;
  }

  // Check for reserved names on Windows
  const reservedNames = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;
  if (reservedNames.test(fileName.split('.')[0])) {
    return false;
  }

  return true;
}

/**
 * Validate directory path
 */
export function validateDirectoryPath(path: string): boolean {
  // Check for invalid characters (including control chars 0x00-0x1f)
  // eslint-disable-next-line no-control-regex
  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  return !invalidChars.test(path);
}
