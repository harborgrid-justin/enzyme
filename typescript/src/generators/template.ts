/**
 * Template Engine for Code Generation
 *
 * Provides variable interpolation, conditionals, and iteration for generating code
 * from templates with type-safe variable substitution.
 *
 * @example
 * ```typescript
 * const template = new TemplateEngine();
 * const code = template.render(
 *   'export const {{name}} = {{value}};',
 *   { name: 'PI', value: '3.14' }
 * );
 * ```
 *
 * @module generators/template
 */

/**
 * Template variable context for interpolation
 */
export interface TemplateContext {
  [key: string]: unknown;
}

/**
 * Options for template rendering
 */
export interface TemplateOptions {
  /**
   * Opening delimiter for variables (default: '{{')
   */
  openDelimiter?: string;

  /**
   * Closing delimiter for variables (default: '}}')
   */
  closeDelimiter?: string;

  /**
   * Throw error on missing variables (default: true)
   */
  strict?: boolean;

  /**
   * Trim whitespace around conditionals
   */
  trim?: boolean;

  /**
   * Custom filters for value transformation
   */
  filters?: Record<string, (value: unknown) => string>;
}

/**
 * Template rendering result
 */
export interface RenderResult {
  /**
   * Rendered output
   */
  output: string;

  /**
   * Variables used in template
   */
  variables: string[];

  /**
   * Missing variables (if not strict)
   */
  missing: string[];
}

/**
 * Template engine for code generation with interpolation and conditionals
 *
 * @example
 * ```typescript
 * const engine = new TemplateEngine();
 *
 * // Simple interpolation
 * const result = engine.render('Hello {{name}}!', { name: 'World' });
 *
 * // With conditionals
 * const code = engine.render(`
 *   export {{#isDefault}}default{{/isDefault}} function {{name}}() {
 *     {{#hasReturn}}return {{returnValue}};{{/hasReturn}}
 *   }
 * `, {
 *   isDefault: true,
 *   name: 'myFunction',
 *   hasReturn: true,
 *   returnValue: 'null'
 * });
 *
 * // With filters
 * const filtered = engine.render('{{name|uppercase}}', { name: 'hello' }, {
 *   filters: { uppercase: (v) => String(v).toUpperCase() }
 * });
 * ```
 */
export class TemplateEngine {
  private defaultOptions: Required<TemplateOptions> = {
    openDelimiter: '{{',
    closeDelimiter: '}}',
    strict: true,
    trim: true,
    filters: {},
  };

  /**
   * Render a template with the given context
   *
   * @param template - Template string with variable placeholders
   * @param context - Variables to interpolate
   * @param options - Rendering options
   * @returns Rendered output
   *
   * @example
   * ```typescript
   * const engine = new TemplateEngine();
   * const output = engine.render(
   *   'const {{name}}: {{type}} = {{value}};',
   *   { name: 'count', type: 'number', value: '0' }
   * );
   * ```
   */
  render(
    template: string,
    context: TemplateContext,
    options?: TemplateOptions
  ): string {
    const result = this.renderWithInfo(template, context, options);
    return result.output;
  }

  /**
   * Render a template and return detailed information
   *
   * @param template - Template string
   * @param context - Variables to interpolate
   * @param options - Rendering options
   * @returns Rendering result with metadata
   */
  renderWithInfo(
    template: string,
    context: TemplateContext,
    options?: TemplateOptions
  ): RenderResult {
    const opts = { ...this.defaultOptions, ...options };
    const variables = new Set<string>();
    const missing = new Set<string>();

    let output = template;

    // Process conditionals first
    output = this.processConditionals(output, context, opts, variables, missing);

    // Process loops
    output = this.processLoops(output, context, opts, variables, missing);

    // Process variable interpolation
    output = this.processVariables(output, context, opts, variables, missing);

    return {
      output,
      variables: Array.from(variables),
      missing: Array.from(missing),
    };
  }

  /**
   * Process conditional blocks {{#condition}}...{{/condition}}
   */
  private processConditionals(
    template: string,
    context: TemplateContext,
    options: Required<TemplateOptions>,
    variables: Set<string>,
    missing: Set<string>
  ): string {
    const conditionalRegex = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;

    return template.replace(conditionalRegex, (match, varName, content) => {
      variables.add(varName);
      const value = this.getNestedValue(context, varName);

      if (value === undefined && options.strict) {
        throw new Error(`Missing variable in conditional: ${varName}`);
      }

      if (value === undefined) {
        missing.add(varName);
        return '';
      }

      const isTrue = this.isTruthy(value);
      if (!isTrue) {
        return '';
      }

      return options.trim ? content.trim() : content;
    });
  }

  /**
   * Process loop blocks {{#each items}}...{{/each}}
   */
  private processLoops(
    template: string,
    context: TemplateContext,
    options: Required<TemplateOptions>,
    variables: Set<string>,
    missing: Set<string>
  ): string {
    const loopRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

    return template.replace(loopRegex, (match, varName, content) => {
      variables.add(varName);
      const value = this.getNestedValue(context, varName);

      if (value === undefined && options.strict) {
        throw new Error(`Missing variable in loop: ${varName}`);
      }

      if (value === undefined) {
        missing.add(varName);
        return '';
      }

      if (!Array.isArray(value)) {
        throw new Error(`Variable ${varName} must be an array for iteration`);
      }

      return value
        .map((item, index) => {
          const loopContext = {
            ...context,
            item,
            index,
            first: index === 0,
            last: index === value.length - 1,
          };
          return this.processVariables(content, loopContext, options, variables, missing);
        })
        .join(options.trim ? '\n' : '');
    });
  }

  /**
   * Process variable interpolation {{varName}}
   */
  private processVariables(
    template: string,
    context: TemplateContext,
    options: Required<TemplateOptions>,
    variables: Set<string>,
    missing: Set<string>
  ): string {
    const { openDelimiter, closeDelimiter } = options;
    const escapedOpen = this.escapeRegex(openDelimiter);
    const escapedClose = this.escapeRegex(closeDelimiter);

    const varRegex = new RegExp(
      `${escapedOpen}([\\w.]+)(?:\\|([\\w]+))?${escapedClose}`,
      'g'
    );

    return template.replace(varRegex, (match, varPath, filterName) => {
      variables.add(varPath);
      let value = this.getNestedValue(context, varPath);

      if (value === undefined && options.strict) {
        throw new Error(`Missing variable: ${varPath}`);
      }

      if (value === undefined) {
        missing.add(varPath);
        return match; // Keep placeholder if not strict
      }

      // Apply filter if specified
      if (filterName && options.filters[filterName]) {
        value = options.filters[filterName](value);
      }

      return String(value);
    });
  }

  /**
   * Get nested value from context using dot notation
   */
  private getNestedValue(context: TemplateContext, path: string): unknown {
    const parts = path.split('.');
    let value: unknown = context;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = (value as Record<string, unknown>)[part];
    }

    return value;
  }

  /**
   * Check if value is truthy for conditionals
   */
  private isTruthy(value: unknown): boolean {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return Boolean(value);
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Create a reusable compiled template
   *
   * @param template - Template string
   * @param options - Rendering options
   * @returns Function that renders the template with context
   *
   * @example
   * ```typescript
   * const engine = new TemplateEngine();
   * const renderGreeting = engine.compile('Hello {{name}}!');
   *
   * console.log(renderGreeting({ name: 'Alice' }));
   * console.log(renderGreeting({ name: 'Bob' }));
   * ```
   */
  compile(
    template: string,
    options?: TemplateOptions
  ): (context: TemplateContext) => string {
    return (context: TemplateContext) => this.render(template, context, options);
  }
}

/**
 * Create a new template engine instance
 *
 * @param options - Default options for the engine
 * @returns Template engine instance
 *
 * @example
 * ```typescript
 * const engine = createTemplateEngine({ strict: false });
 * const output = engine.render('{{greeting}}', {});
 * ```
 */
export function createTemplateEngine(options?: TemplateOptions): TemplateEngine {
  const engine = new TemplateEngine();
  return engine;
}

/**
 * Quick render function for simple template use cases
 *
 * @param template - Template string
 * @param context - Variables to interpolate
 * @param options - Rendering options
 * @returns Rendered output
 *
 * @example
 * ```typescript
 * const output = renderTemplate(
 *   'export const {{name}} = {{value}};',
 *   { name: 'VERSION', value: '"1.0.0"' }
 * );
 * ```
 */
export function renderTemplate(
  template: string,
  context: TemplateContext,
  options?: TemplateOptions
): string {
  const engine = new TemplateEngine();
  return engine.render(template, context, options);
}

/**
 * Common filters for template rendering
 */
export const commonFilters = {
  /**
   * Convert to uppercase
   */
  uppercase: (value: unknown): string => String(value).toUpperCase(),

  /**
   * Convert to lowercase
   */
  lowercase: (value: unknown): string => String(value).toLowerCase(),

  /**
   * Capitalize first letter
   */
  capitalize: (value: unknown): string => {
    const str = String(value);
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /**
   * Convert to camelCase
   */
  camelCase: (value: unknown): string => {
    const str = String(value);
    return str.replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
  },

  /**
   * Convert to PascalCase
   */
  pascalCase: (value: unknown): string => {
    const camel = commonFilters.camelCase(value);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  },

  /**
   * Convert to snake_case
   */
  snakeCase: (value: unknown): string => {
    const str = String(value);
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  },

  /**
   * Convert to kebab-case
   */
  kebabCase: (value: unknown): string => {
    const str = String(value);
    return str
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
  },

  /**
   * JSON stringify
   */
  json: (value: unknown): string => JSON.stringify(value, null, 2),

  /**
   * Escape for string literal
   */
  escape: (value: unknown): string => {
    return String(value)
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  },
};
