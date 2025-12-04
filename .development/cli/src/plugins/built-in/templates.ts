/**
 * @file Templates plugin for managing and resolving templates
 * @module plugins/built-in/templates
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { Plugin, GenerationContext, ValidationResult } from '../../types/index.js';
import { exists, findFiles } from '../../utils/fs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Template registry
 */
const templateRegistry: Map<string, string> = new Map();

/**
 * Templates plugin
 */
export const templatesPlugin: Plugin = {
  name: 'templates',
  version: '1.0.0',
  description: 'Manages template resolution and validation',

  hooks: {
    async init(context) {
      context.logger.debug('Initializing templates plugin...');

      // Load templates from configured directories
      const templateDirs = [
        resolve(__dirname, '../../../templates'), // Built-in templates
        ...(context.config.templateDirs?.map((dir: string) => resolve(context.cwd, dir)) || []),
      ];

      for (const dir of templateDirs) {
        if (await exists(dir)) {
          try {
            await loadTemplatesFromDirectory(dir);
            context.logger.debug(`Loaded templates from: ${dir}`);
          } catch (error) {
            context.logger.warn(
              `Failed to load templates from ${dir}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }
      }

      context.logger.debug(`Template registry contains ${templateRegistry.size} templates`);
    },

    async validate(context: GenerationContext): Promise<ValidationResult> {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate template if specified
      if (context.template) {
        if (!templateRegistry.has(context.template)) {
          errors.push(`Template "${context.template}" not found`);
        }
      } else {
        // Check for default template
        const defaultTemplate = `${context.type}-default`;
        if (!templateRegistry.has(defaultTemplate)) {
          warnings.push(`No default template found for type "${context.type}"`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    },

    async beforeGenerate(context: GenerationContext): Promise<void> {
      // Resolve template
      const templateName = context.template || `${context.type}-default`;
      const templatePath = templateRegistry.get(templateName);

      if (!templatePath) {
        throw new Error(`Template "${templateName}" not found`);
      }

      // Add template path to context options
      context.options.templatePath = templatePath;
      context.context.logger.debug(`Using template: ${templateName} (${templatePath})`);
    },
  },

  config: {
    builtInTemplates: true,
  },
};

/**
 * Load templates from directory
 */
async function loadTemplatesFromDirectory(dir: string): Promise<void> {
  try {
    const files = await findFiles('**/*.hbs', dir);

    for (const file of files) {
      // Get template name from file path
      const relativePath = file.replace(dir, '').replace(/^\//, '');
      const templateName = relativePath.replace(/\.hbs$/, '').replace(/\//g, '-');

      templateRegistry.set(templateName, file);
    }
  } catch (error) {
    throw new Error(`Failed to load templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Register a template
 */
export function registerTemplate(name: string, path: string): void {
  templateRegistry.set(name, path);
}

/**
 * Get template path
 */
export function getTemplatePath(name: string): string | undefined {
  return templateRegistry.get(name);
}

/**
 * List all templates
 */
export function listTemplates(): string[] {
  return Array.from(templateRegistry.keys());
}

/**
 * Check if template exists
 */
export function hasTemplate(name: string): boolean {
  return templateRegistry.has(name);
}

/**
 * Clear template registry
 */
export function clearTemplates(): void {
  templateRegistry.clear();
}
