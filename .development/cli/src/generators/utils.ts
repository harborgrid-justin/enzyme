/**
 * @file Generator Utilities
 * @description Shared utility functions for generators
 */

import * as path from 'path';
import type { ImportStatement } from './types';

// ============================================================================
// String Utilities
// ============================================================================

/**
 * Convert string to PascalCase
 */
export function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toUpperCase());
}

/**
 * Convert string to camelCase
 */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Convert string to kebab-case
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Convert string to snake_case
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/**
 * Convert string to UPPER_CASE
 */
export function toUpperCase(str: string): string {
  return toSnakeCase(str).toUpperCase();
}

// ============================================================================
// Path Utilities
// ============================================================================

/**
 * Resolve component path based on type
 */
export function resolveComponentPath(name: string, type?: string, customPath?: string): string {
  if (customPath) {
    return customPath;
  }

  const fileName = toPascalCase(name);

  switch (type) {
    case 'ui':
      return path.join('src', 'components', 'ui', fileName);
    case 'feature':
      return path.join('src', 'components', 'features', fileName);
    case 'layout':
      return path.join('src', 'components', 'layouts', fileName);
    case 'shared':
    default:
      return path.join('src', 'components', 'shared', fileName);
  }
}

/**
 * Resolve hook path
 */
export function resolveHookPath(name: string, customPath?: string): string {
  if (customPath) {
    return customPath;
  }

  const fileName = toCamelCase(name);
  return path.join('src', 'hooks', fileName);
}

/**
 * Resolve page path
 */
export function resolvePagePath(name: string, customPath?: string): string {
  if (customPath) {
    return customPath;
  }

  const fileName = toPascalCase(name);
  return path.join('src', 'pages', fileName);
}

/**
 * Resolve route path
 */
export function resolveRoutePath(routePath: string): string {
  // Convert route path to file path
  // /users/:id -> users/[id]
  const normalized = routePath
    .replace(/^\//, '') // Remove leading slash
    .replace(/:([^/]+)/g, '[$1]'); // Convert :param to [param]

  return path.join('src', 'routes', normalized);
}

/**
 * Resolve module path
 */
export function resolveModulePath(name: string): string {
  const moduleName = toKebabCase(name);
  return path.join('src', 'lib', moduleName);
}

/**
 * Resolve slice path
 */
export function resolveSlicePath(name: string): string {
  const fileName = toCamelCase(name) + 'Slice';
  return path.join('src', 'state', 'slices', fileName);
}

/**
 * Resolve service path
 */
export function resolveServicePath(name: string): string {
  const fileName = toCamelCase(name) + 'Service';
  return path.join('src', 'services', fileName);
}

// ============================================================================
// Import/Export Utilities
// ============================================================================

/**
 * Generate import statement
 */
export function generateImport(statement: ImportStatement): string {
  const { module, imports, type, default: defaultImport } = statement;

  const parts: string[] = [];

  // Type imports
  const typePrefix = type ? 'type ' : '';

  // Default import
  if (defaultImport) {
    parts.push(defaultImport);
  }

  // Named imports
  if (imports.length > 0) {
    const namedImports = imports.join(', ');
    parts.push(`{ ${typePrefix}${namedImports} }`);
  }

  const importPart = parts.join(', ');

  return `import ${importPart} from '${module}';`;
}

/**
 * Generate multiple import statements
 */
export function generateImports(statements: ImportStatement[]): string {
  return statements.map(s => generateImport(s)).join('\n');
}

/**
 * Generate export statement
 */
export function generateExport(name: string, isDefault = false): string {
  if (isDefault) {
    return `export default ${name};`;
  }
  return `export { ${name} };`;
}

// ============================================================================
// Code Generation Utilities
// ============================================================================

/**
 * Generate JSDoc comment
 */
export function generateJSDoc(description: string, params?: Record<string, string>, returns?: string): string {
  const lines = [
    '/**',
    ` * ${description}`,
  ];

  if (params) {
    lines.push(' *');
    for (const [name, desc] of Object.entries(params)) {
      lines.push(` * @param ${name} - ${desc}`);
    }
  }

  if (returns) {
    lines.push(' *');
    lines.push(` * @returns ${returns}`);
  }

  lines.push(' */');

  return lines.join('\n');
}

/**
 * Generate TypeScript interface
 */
export function generateInterface(name: string, properties: Record<string, string>, exported = true): string {
  const exportPrefix = exported ? 'export ' : '';
  const lines = [
    `${exportPrefix}interface ${name} {`,
  ];

  for (const [propName, propType] of Object.entries(properties)) {
    lines.push(`  ${propName}: ${propType};`);
  }

  lines.push('}');

  return lines.join('\n');
}

/**
 * Generate TypeScript type alias
 */
export function generateType(name: string, definition: string, exported = true): string {
  const exportPrefix = exported ? 'export ' : '';
  return `${exportPrefix}type ${name} = ${definition};`;
}

// ============================================================================
// Template Context Helpers
// ============================================================================

/**
 * Create base template context with common helpers
 */
export function createBaseContext(name: string): Record<string, unknown> {
  return {
    name,
    pascalName: toPascalCase(name),
    camelName: toCamelCase(name),
    kebabName: toKebabCase(name),
    snakeName: toSnakeCase(name),
    upperName: toUpperCase(name),
    timestamp: new Date().toISOString(),
    year: new Date().getFullYear(),
  };
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate component name
 */
export function validateComponentName(name: string): void {
  if (!name || name.trim() === '') {
    throw new Error('Component name cannot be empty');
  }

  if (!/^[A-Z][a-zA-Z0-9]*$/.test(toPascalCase(name))) {
    throw new Error('Component name must be a valid PascalCase identifier');
  }
}

/**
 * Validate hook name
 */
export function validateHookName(name: string): void {
  if (!name || name.trim() === '') {
    throw new Error('Hook name cannot be empty');
  }

  const camelName = toCamelCase(name);
  if (!camelName.startsWith('use')) {
    throw new Error('Hook name must start with "use"');
  }

  if (!/^use[A-Z][a-zA-Z0-9]*$/.test(camelName)) {
    throw new Error('Hook name must be a valid camelCase identifier starting with "use"');
  }
}

/**
 * Validate route path
 */
export function validateRoutePath(routePath: string): void {
  if (!routePath || routePath.trim() === '') {
    throw new Error('Route path cannot be empty');
  }

  if (!routePath.startsWith('/')) {
    throw new Error('Route path must start with "/"');
  }

  // Check for valid route parameters
  const paramRegex = /:([a-zA-Z][a-zA-Z0-9]*)/g;
  const matches = routePath.matchAll(paramRegex);
  for (const match of matches) {
    const param = match[1];
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(param)) {
      throw new Error(`Invalid route parameter: ${param}`);
    }
  }
}

/**
 * Validate identifier
 */
export function validateIdentifier(name: string, label = 'Name'): void {
  if (!name || name.trim() === '') {
    throw new Error(`${label} cannot be empty`);
  }

  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(
      `${label} must start with a letter and contain only letters, numbers, and underscores`
    );
  }
}
