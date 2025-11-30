/**
 * @file Template engine utilities using Handlebars
 * @module utils/template
 */

import Handlebars from 'handlebars';
import { TemplateContext, TemplateOptions, TemplateHelper } from '../types/index.js';
import { convertNamingConvention } from './path.js';

/**
 * Template engine class
 */
export class TemplateEngine {
  private handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create();
    this.registerDefaultHelpers();
  }

  /**
   * Register default Handlebars helpers
   */
  private registerDefaultHelpers(): void {
    // Naming convention helpers
    this.handlebars.registerHelper('kebabCase', (str: string) => {
      return convertNamingConvention(str, 'kebab');
    });

    this.handlebars.registerHelper('pascalCase', (str: string) => {
      return convertNamingConvention(str, 'pascal');
    });

    this.handlebars.registerHelper('camelCase', (str: string) => {
      return convertNamingConvention(str, 'camel');
    });

    this.handlebars.registerHelper('snakeCase', (str: string) => {
      return convertNamingConvention(str, 'snake');
    });

    // String manipulation helpers
    this.handlebars.registerHelper('uppercase', (str: string) => {
      return str.toUpperCase();
    });

    this.handlebars.registerHelper('lowercase', (str: string) => {
      return str.toLowerCase();
    });

    this.handlebars.registerHelper('capitalize', (str: string) => {
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    // Pluralization helper (simple)
    this.handlebars.registerHelper('pluralize', (str: string) => {
      if (str.endsWith('s')) return str;
      if (str.endsWith('y')) return str.slice(0, -1) + 'ies';
      return str + 's';
    });

    // Conditional helpers
    this.handlebars.registerHelper('eq', (a: any, b: any) => {
      return a === b;
    });

    this.handlebars.registerHelper('ne', (a: any, b: any) => {
      return a !== b;
    });

    this.handlebars.registerHelper('lt', (a: number, b: number) => {
      return a < b;
    });

    this.handlebars.registerHelper('gt', (a: number, b: number) => {
      return a > b;
    });

    this.handlebars.registerHelper('and', (...args: any[]) => {
      // Remove options object
      const values = args.slice(0, -1);
      return values.every((v) => !!v);
    });

    this.handlebars.registerHelper('or', (...args: any[]) => {
      // Remove options object
      const values = args.slice(0, -1);
      return values.some((v) => !!v);
    });

    this.handlebars.registerHelper('not', (value: any) => {
      return !value;
    });

    // Array helpers
    this.handlebars.registerHelper('join', (array: any[], separator: string) => {
      return Array.isArray(array) ? array.join(separator || ', ') : '';
    });

    this.handlebars.registerHelper('length', (array: any[]) => {
      return Array.isArray(array) ? array.length : 0;
    });

    // Date helpers
    this.handlebars.registerHelper('currentYear', () => {
      return new Date().getFullYear();
    });

    this.handlebars.registerHelper('currentDate', () => {
      return new Date().toISOString().split('T')[0];
    });

    // JSON helper
    this.handlebars.registerHelper('json', (obj: any) => {
      return JSON.stringify(obj, null, 2);
    });

    // Indent helper
    this.handlebars.registerHelper('indent', (str: string, spaces: number) => {
      const indent = ' '.repeat(spaces || 2);
      return str
        .split('\n')
        .map((line) => (line ? indent + line : line))
        .join('\n');
    });

    // Import path helper
    this.handlebars.registerHelper('importPath', (path: string, removeExtension = true) => {
      if (removeExtension) {
        return path.replace(/\.[^.]+$/, '');
      }
      return path;
    });

    // Quote helper
    this.handlebars.registerHelper('quote', (str: string, type: 'single' | 'double' = 'single') => {
      const quote = type === 'single' ? "'" : '"';
      return `${quote}${str}${quote}`;
    });

    // Comment helper
    this.handlebars.registerHelper('comment', (text: string, style: 'line' | 'block' = 'line') => {
      if (style === 'line') {
        return `// ${text}`;
      }
      return `/* ${text} */`;
    });
  }

  /**
   * Register a custom helper
   * @param name - Helper name
   * @param fn - Helper function
   */
  registerHelper(name: string, fn: Handlebars.HelperDelegate): void {
    this.handlebars.registerHelper(name, fn);
  }

  /**
   * Register multiple helpers
   * @param helpers - Object with helper functions
   */
  registerHelpers(helpers: Record<string, TemplateHelper>): void {
    Object.entries(helpers).forEach(([name, fn]) => {
      this.registerHelper(name, fn as Handlebars.HelperDelegate);
    });
  }

  /**
   * Register a partial
   * @param name - Partial name
   * @param template - Partial template
   */
  registerPartial(name: string, template: string): void {
    this.handlebars.registerPartial(name, template);
  }

  /**
   * Compile template
   * @param source - Template source
   * @returns Compiled template function
   */
  compile(source: string): Handlebars.TemplateDelegate {
    return this.handlebars.compile(source);
  }

  /**
   * Render template with context
   * @param options - Template options
   * @returns Rendered template
   */
  render(options: TemplateOptions): string {
    const { source, context, helpers } = options;

    // Register temporary helpers
    if (helpers) {
      this.registerHelpers(helpers);
    }

    const template = this.compile(source);
    return template(context);
  }

  /**
   * Render template from string
   * @param source - Template source
   * @param context - Template context
   * @returns Rendered template
   */
  renderString(source: string, context: TemplateContext): string {
    return this.render({ source, context });
  }
}

/**
 * Default template engine instance
 */
export const templateEngine = new TemplateEngine();

/**
 * Render template with context
 * @param source - Template source
 * @param context - Template context
 * @param helpers - Optional custom helpers
 * @returns Rendered template
 */
export function renderTemplate(
  source: string,
  context: TemplateContext,
  helpers?: Record<string, TemplateHelper>
): string {
  return templateEngine.render({ source, context, helpers });
}

/**
 * Create a reusable template function
 * @param source - Template source
 * @returns Template function
 */
export function createTemplate(source: string): (context: TemplateContext) => string {
  const compiled = templateEngine.compile(source);
  return (context: TemplateContext) => compiled(context);
}

/**
 * Register a global helper
 * @param name - Helper name
 * @param fn - Helper function
 */
export function registerHelper(name: string, fn: Handlebars.HelperDelegate): void {
  templateEngine.registerHelper(name, fn);
}

/**
 * Register multiple global helpers
 * @param helpers - Object with helper functions
 */
export function registerHelpers(helpers: Record<string, TemplateHelper>): void {
  templateEngine.registerHelpers(helpers);
}

/**
 * Register a global partial
 * @param name - Partial name
 * @param template - Partial template
 */
export function registerPartial(name: string, template: string): void {
  templateEngine.registerPartial(name, template);
}

/**
 * Common template snippets
 */
export const snippets = {
  /**
   * React component import
   */
  reactImport: `import React from 'react';`,

  /**
   * TypeScript interface
   */
  interface: (name: string, props: Record<string, string>) => {
    const properties = Object.entries(props)
      .map(([key, type]) => `  ${key}: ${type};`)
      .join('\n');
    return `export interface ${name} {\n${properties}\n}`;
  },

  /**
   * Export statement
   */
  export: (name: string, isDefault = false) => {
    return isDefault ? `export default ${name};` : `export { ${name} };`;
  },

  /**
   * Import statement
   */
  import: (imports: string | string[], from: string, isDefault = false) => {
    if (isDefault) {
      return `import ${imports} from '${from}';`;
    }
    const importList = Array.isArray(imports) ? imports.join(', ') : imports;
    return `import { ${importList} } from '${from}';`;
  },

  /**
   * JSDoc comment
   */
  jsdoc: (description: string, params?: Record<string, string>, returns?: string) => {
    let doc = `/**\n * ${description}\n`;

    if (params) {
      Object.entries(params).forEach(([name, type]) => {
        doc += ` * @param {${type}} ${name}\n`;
      });
    }

    if (returns) {
      doc += ` * @returns {${returns}}\n`;
    }

    doc += ' */';
    return doc;
  },

  /**
   * File header comment
   */
  fileHeader: (description: string, author?: string) => {
    let header = `/**\n * ${description}\n`;

    if (author) {
      header += ` * @author ${author}\n`;
    }

    header += ` * @created ${new Date().toISOString().split('T')[0]}\n`;
    header += ' */';

    return header;
  },
};
