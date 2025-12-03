/**
 * @file Built-in Extensions
 * @description Ready-to-use extensions implementing best practices from research
 *
 * Extensions based on patterns from:
 * - axios: Logging and performance tracking
 * - prisma: Validation and result transformation
 * - socket.io: Error handling and retry
 * - lodash: Formatting and utility functions
 */

import type { EnzymeExtension } from '../types.js';

// ============================================================================
// Logging Extension (axios pattern)
// ============================================================================

/**
 * Logging extension that tracks all generator operations
 *
 * @example
 * const enzyme = new Enzyme().$extends(loggingExtension)
 */
export const loggingExtension: EnzymeExtension = {
  name: 'enzyme:logging',
  version: '1.0.0',
  description: 'Logs all generator operations with timing information',

  generator: {
    $allGenerators: {
      async beforeGenerate({ generator, name, args }) {
        const timestamp = new Date().toISOString();
        console.log(`\n[${timestamp}] 🚀 Starting ${generator} generation: ${name}`);

        if (process.env.ENZYME_DEBUG) {
          console.log('  Args:', JSON.stringify(args, null, 2));
        }
      },

      async afterGenerate({ generator, name, result }) {
        const timestamp = new Date().toISOString();
        const files = Array.isArray(result) ? result : (result as any)?.files ?? [];
        console.log(`[${timestamp}] ✅ Completed ${generator}: ${name}`);
        console.log(`  Generated ${files.length} file(s)`);
      },

      async onError({ error, generator }) {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] ❌ Error in ${generator}:`, error.message);
      },
    },
  },
};

// ============================================================================
// Performance Extension (axios/socket.io pattern)
// ============================================================================

interface PerformanceMetrics {
  totalOperations: number;
  totalDuration: number;
  averageDuration: number;
  slowOperations: Array<{
    generator: string;
    name: string;
    duration: number;
    timestamp: Date;
  }>;
}

const performanceMetrics: PerformanceMetrics = {
  totalOperations: 0,
  totalDuration: 0,
  averageDuration: 0,
  slowOperations: [],
};

const operationStartTimes = new Map<string, number>();

/**
 * Performance monitoring extension
 *
 * @example
 * const enzyme = new Enzyme().$extends(performanceExtension)
 * // After operations
 * console.log(getPerformanceMetrics())
 */
export const performanceExtension: EnzymeExtension = {
  name: 'enzyme:performance',
  version: '1.0.0',
  description: 'Tracks performance metrics for all operations',

  generator: {
    $allGenerators: {
      async beforeGenerate({ generator, name }) {
        const key = `${generator}:${name}`;
        operationStartTimes.set(key, performance.now());
      },

      async afterGenerate({ generator, name }) {
        const key = `${generator}:${name}`;
        const startTime = operationStartTimes.get(key);

        if (startTime) {
          const duration = performance.now() - startTime;

          performanceMetrics.totalOperations++;
          performanceMetrics.totalDuration += duration;
          performanceMetrics.averageDuration =
            performanceMetrics.totalDuration / performanceMetrics.totalOperations;

          // Track slow operations (>1000ms)
          if (duration > 1000) {
            performanceMetrics.slowOperations.push({
              generator,
              name,
              duration,
              timestamp: new Date(),
            });
          }

          operationStartTimes.delete(key);

          if (process.env.ENZYME_DEBUG) {
            console.log(`  ⏱️  Duration: ${duration.toFixed(2)}ms`);
          }
        }
      },
    },
  },

  client: {
    $getMetrics(): PerformanceMetrics {
      return { ...performanceMetrics };
    },

    $resetMetrics(): void {
      performanceMetrics.totalOperations = 0;
      performanceMetrics.totalDuration = 0;
      performanceMetrics.averageDuration = 0;
      performanceMetrics.slowOperations = [];
    },
  },
};

/**
 * Get current performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  return { ...performanceMetrics };
}

// ============================================================================
// Validation Extension (prisma pattern)
// ============================================================================

/**
 * Strict validation extension that enforces naming conventions
 *
 * @example
 * const enzyme = new Enzyme().$extends(validationExtension)
 */
export const validationExtension: EnzymeExtension = {
  name: 'enzyme:validation',
  version: '1.0.0',
  description: 'Enforces naming conventions and validates inputs',

  generator: {
    component: {
      async validate({ name }) {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Must be PascalCase
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
          errors.push(`Component name "${name}" must be PascalCase (e.g., MyComponent)`);
        }

        // Warn about generic names
        const genericNames = ['Component', 'Item', 'Element', 'Container', 'Wrapper'];
        if (genericNames.includes(name)) {
          warnings.push(`Consider using a more descriptive name than "${name}"`);
        }

        return { valid: errors.length === 0, errors, warnings };
      },
    },

    hook: {
      async validate({ name }) {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Must start with 'use'
        if (!name.startsWith('use')) {
          errors.push(`Hook name "${name}" must start with "use" (e.g., useMyHook)`);
        }

        // Must be camelCase after 'use'
        const afterUse = name.slice(3);
        if (afterUse && !/^[A-Z][a-zA-Z0-9]*$/.test(afterUse)) {
          errors.push(`Hook name "${name}" must be camelCase starting with "use" (e.g., useUserData)`);
        }

        return { valid: errors.length === 0, errors, warnings };
      },
    },

    page: {
      async validate({ name }) {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Must be PascalCase
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
          errors.push(`Page name "${name}" must be PascalCase (e.g., Dashboard)`);
        }

        // Should end with 'Page' for clarity
        if (!name.endsWith('Page')) {
          warnings.push(`Consider ending page names with "Page" for clarity (e.g., ${name}Page)`);
        }

        return { valid: errors.length === 0, errors, warnings };
      },
    },

    service: {
      async validate({ name }) {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Must be PascalCase
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
          errors.push(`Service name "${name}" must be PascalCase (e.g., UserService)`);
        }

        // Should end with 'Service' for clarity
        if (!name.endsWith('Service')) {
          warnings.push(`Consider ending service names with "Service" for clarity (e.g., ${name}Service)`);
        }

        return { valid: errors.length === 0, errors, warnings };
      },
    },
  },
};

// ============================================================================
// Formatting Extension (lodash/prettier pattern)
// ============================================================================

/**
 * Auto-formatting extension for generated files
 * Note: Requires prettier to be installed in the project
 *
 * @example
 * const enzyme = new Enzyme().$extends(formattingExtension)
 */
export const formattingExtension: EnzymeExtension = {
  name: 'enzyme:formatting',
  version: '1.0.0',
  description: 'Auto-formats generated files using prettier',

  file: {
    async beforeWrite({ path, content, modify }) {
      try {
        // Dynamic import to avoid hard dependency
        const prettier = await import('prettier').catch(() => null);

        if (!prettier) {
          // Prettier not installed, skip formatting
          return;
        }

        // Determine parser based on file extension
        const ext = path.split('.').pop()?.toLowerCase();
        const parserMap: Record<string, string> = {
          ts: 'typescript',
          tsx: 'typescript',
          js: 'babel',
          jsx: 'babel',
          json: 'json',
          md: 'markdown',
          css: 'css',
          scss: 'scss',
          html: 'html',
        };

        const parser = parserMap[ext ?? ''];
        if (!parser) return;

        // Load prettier config if available
        const config = await prettier.resolveConfig(path);

        const formatted = await prettier.format(content, {
          parser,
          ...config,
        });

        modify({ content: formatted });
      } catch {
        // Formatting failed, continue with original content
      }
    },
  },

  template: {
    helpers: {
      /** Convert to camelCase */
      camelCase: (str: unknown) => {
        if (typeof str !== 'string') return '';
        return str
          .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
          .replace(/^./, (c) => c.toLowerCase());
      },

      /** Convert to PascalCase */
      pascalCase: (str: unknown) => {
        if (typeof str !== 'string') return '';
        return str
          .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
          .replace(/^./, (c) => c.toUpperCase());
      },

      /** Convert to kebab-case */
      kebabCase: (str: unknown) => {
        if (typeof str !== 'string') return '';
        return str
          .replace(/([a-z])([A-Z])/g, '$1-$2')
          .replace(/[\s_]+/g, '-')
          .toLowerCase();
      },

      /** Convert to snake_case */
      snakeCase: (str: unknown) => {
        if (typeof str !== 'string') return '';
        return str
          .replace(/([a-z])([A-Z])/g, '$1_$2')
          .replace(/[\s-]+/g, '_')
          .toLowerCase();
      },

      /** Convert to SCREAMING_SNAKE_CASE */
      screamingSnakeCase: (str: unknown) => {
        if (typeof str !== 'string') return '';
        return str
          .replace(/([a-z])([A-Z])/g, '$1_$2')
          .replace(/[\s-]+/g, '_')
          .toUpperCase();
      },
    },

    filters: {
      /** Capitalize first letter */
      capitalize: (str: unknown) => {
        if (typeof str !== 'string') return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
      },

      /** Lowercase */
      lower: (str: unknown) => {
        if (typeof str !== 'string') return '';
        return str.toLowerCase();
      },

      /** Uppercase */
      upper: (str: unknown) => {
        if (typeof str !== 'string') return '';
        return str.toUpperCase();
      },

      /** Pluralize (basic) */
      pluralize: (str: unknown) => {
        if (typeof str !== 'string') return '';
        if (str.endsWith('y')) return str.slice(0, -1) + 'ies';
        if (str.endsWith('s') || str.endsWith('x') || str.endsWith('ch') || str.endsWith('sh')) {
          return str + 'es';
        }
        return str + 's';
      },

      /** Singularize (basic) */
      singularize: (str: unknown) => {
        if (typeof str !== 'string') return '';
        if (str.endsWith('ies')) return str.slice(0, -3) + 'y';
        if (str.endsWith('es')) return str.slice(0, -2);
        if (str.endsWith('s')) return str.slice(0, -1);
        return str;
      },
    },
  },
};

// ============================================================================
// Result Enhancement Extension (prisma pattern)
// ============================================================================

/**
 * Result enhancement extension that adds computed fields
 *
 * @example
 * const enzyme = new Enzyme().$extends(resultExtension)
 * const result = await enzyme.generate.component('MyComponent')
 * console.log(result.metadata.importPath) // "@/components/MyComponent"
 */
export const resultExtension: EnzymeExtension = {
  name: 'enzyme:result',
  version: '1.0.0',
  description: 'Adds computed metadata to generation results',

  result: {
    component: {
      metadata: {
        needs: ['name', 'path'],
        compute(result) {
          const name = result.name as string;
          const path = result.path as string;

          return {
            displayName: name,
            fileName: `${name}.tsx`,
            testFileName: `${name}.test.tsx`,
            storyFileName: `${name}.stories.tsx`,
            importPath: `@/components/${path}/${name}`,
            cssClassName: name
              .replace(/([a-z])([A-Z])/g, '$1-$2')
              .toLowerCase(),
          };
        },
      },
    },

    hook: {
      metadata: {
        needs: ['name', 'path'],
        compute(result) {
          const name = result.name as string;
          const path = result.path as string;

          return {
            displayName: name,
            fileName: `${name}.ts`,
            testFileName: `${name}.test.ts`,
            importPath: `@/hooks/${path}/${name}`,
          };
        },
      },
    },

    page: {
      metadata: {
        needs: ['name', 'path'],
        compute(result) {
          const name = result.name as string;
          const path = result.path as string;
          const routePath = name
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .toLowerCase()
            .replace(/page$/, '');

          return {
            displayName: name,
            fileName: `${name}.tsx`,
            testFileName: `${name}.test.tsx`,
            importPath: `@/pages/${path}/${name}`,
            routePath: `/${routePath || 'home'}`,
          };
        },
      },
    },

    service: {
      metadata: {
        needs: ['name', 'path'],
        compute(result) {
          const name = result.name as string;
          const path = result.path as string;

          return {
            displayName: name,
            fileName: `${name}.ts`,
            testFileName: `${name}.test.ts`,
            importPath: `@/services/${path}/${name}`,
          };
        },
      },
    },
  },
};

// ============================================================================
// Git Integration Extension (socket.io pattern)
// ============================================================================

/**
 * Git integration extension that stages and commits generated files
 *
 * @example
 * const enzyme = new Enzyme().$extends(gitExtension)
 */
export const gitExtension: EnzymeExtension = {
  name: 'enzyme:git',
  version: '1.0.0',
  description: 'Automatically stages generated files',

  generator: {
    $allGenerators: {
      async afterGenerate({ generator, name, result }) {
        // Skip if git integration is disabled
        if (process.env.ENZYME_NO_GIT) return;

        try {
          const { execSync } = await import('child_process');

          // Check if we're in a git repository
          try {
            execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
          } catch {
            // Not a git repo, skip
            return;
          }

          // Get generated files
          const files = Array.isArray(result) ? result : (result as any)?.files ?? [];

          if (files.length === 0) return;

          // Stage files
          const filePaths = files.map((f: string | { path: string }) =>
            typeof f === 'string' ? f : f.path
          );

          for (const filePath of filePaths) {
            try {
              execSync(`git add "${filePath}"`, { stdio: 'ignore' });
            } catch {
              // File might not exist yet or be ignored
            }
          }

          if (process.env.ENZYME_DEBUG) {
            console.log(`  📝 Staged ${filePaths.length} file(s) for commit`);
          }
        } catch {
          // Git operations failed, continue silently
        }
      },
    },
  },

  command: {
    'commit-generated': {
      description: 'Commit all staged generated files',
      options: [
        {
          name: 'message',
          alias: 'm',
          type: 'string',
          description: 'Commit message',
          default: 'chore: add generated files',
        },
      ],
      async handler(_context, options) {
        try {
          const { execSync } = await import('child_process');
          const message = (options.message as string) || 'chore: add generated files';

          execSync(`git commit -m "${message}"`, { stdio: 'inherit' });
          console.log('✅ Committed generated files');
        } catch (error) {
          console.error('❌ Failed to commit:', error);
        }
      },
    },
  },
};

// ============================================================================
// Dry Run Extension
// ============================================================================

/**
 * Dry run extension that previews changes without writing files
 *
 * @example
 * const enzyme = new Enzyme().$extends(dryRunExtension)
 */
export const dryRunExtension: EnzymeExtension = {
  name: 'enzyme:dry-run',
  version: '1.0.0',
  description: 'Previews changes without writing files',

  file: {
    async beforeWrite({ path, content, modify }) {
      if (process.env.ENZYME_DRY_RUN || process.argv.includes('--dry-run')) {
        console.log(`\n📄 Would create: ${path}`);
        console.log('─'.repeat(50));

        // Show preview of content
        const lines = content.split('\n');
        const preview = lines.slice(0, 20);
        console.log(preview.join('\n'));

        if (lines.length > 20) {
          console.log(`\n... (${lines.length - 20} more lines)`);
        }

        console.log('─'.repeat(50));

        // Prevent actual write by modifying to empty
        // Note: In a real implementation, you'd use a different mechanism
        throw new Error('DRY_RUN_SKIP');
      }
    },

    async onError({ error }) {
      // Swallow dry run skip errors
      if (error.message === 'DRY_RUN_SKIP') {
        return;
      }
      throw error;
    },
  },
};

// ============================================================================
// Export All Built-in Extensions
// ============================================================================

/**
 * Get all built-in extensions
 */
export function getBuiltInExtensions(): EnzymeExtension[] {
  return [
    loggingExtension,
    performanceExtension,
    validationExtension,
    formattingExtension,
    resultExtension,
    gitExtension,
    dryRunExtension,
  ];
}

/**
 * Get recommended extensions for production
 */
export function getProductionExtensions(): EnzymeExtension[] {
  return [
    validationExtension,
    formattingExtension,
    resultExtension,
  ];
}

/**
 * Get recommended extensions for development
 */
export function getDevelopmentExtensions(): EnzymeExtension[] {
  return [
    loggingExtension,
    performanceExtension,
    validationExtension,
    formattingExtension,
    resultExtension,
    gitExtension,
  ];
}
