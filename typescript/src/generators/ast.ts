/**
 * TypeScript AST Utilities for Code Manipulation
 *
 * Provides utilities for parsing, analyzing, and modifying TypeScript code
 * using the TypeScript Compiler API.
 *
 * @example
 * ```typescript
 * const ast = parseTypeScript('const x = 42;');
 * const modified = addImport(ast, 'React', 'react');
 * const code = printTypeScript(modified);
 * ```
 *
 * @module generators/ast
 */

/**
 * AST node type information
 */
export interface NodeInfo {
  /**
   * Node kind
   */
  kind: string;

  /**
   * Node text
   */
  text: string;

  /**
   * Start position
   */
  start: number;

  /**
   * End position
   */
  end: number;

  /**
   * Child nodes
   */
  children?: NodeInfo[];
}

/**
 * Import declaration information
 */
export interface ImportInfo {
  /**
   * Module specifier (e.g., 'react')
   */
  module: string;

  /**
   * Named imports
   */
  named: string[];

  /**
   * Default import
   */
  default?: string;

  /**
   * Namespace import
   */
  namespace?: string;

  /**
   * Full import statement text
   */
  text: string;
}

/**
 * Export declaration information
 */
export interface ExportInfo {
  /**
   * Export kind (named, default, namespace)
   */
  kind: 'named' | 'default' | 'namespace';

  /**
   * Exported name
   */
  name: string;

  /**
   * Export type (variable, function, class, interface, type)
   */
  type: string;

  /**
   * Full export statement text
   */
  text: string;
}

/**
 * Function/method information
 */
export interface FunctionInfo {
  /**
   * Function name
   */
  name: string;

  /**
   * Parameters
   */
  parameters: ParameterInfo[];

  /**
   * Return type
   */
  returnType?: string;

  /**
   * Is async
   */
  isAsync: boolean;

  /**
   * Is generator
   */
  isGenerator: boolean;

  /**
   * Type parameters
   */
  typeParameters?: string[];

  /**
   * JSDoc comment
   */
  documentation?: string;
}

/**
 * Parameter information
 */
export interface ParameterInfo {
  /**
   * Parameter name
   */
  name: string;

  /**
   * Parameter type
   */
  type?: string;

  /**
   * Is optional
   */
  optional: boolean;

  /**
   * Is rest parameter
   */
  isRest: boolean;

  /**
   * Default value
   */
  defaultValue?: string;
}

/**
 * Class information
 */
export interface ClassInfo {
  /**
   * Class name
   */
  name: string;

  /**
   * Extends clause
   */
  extends?: string;

  /**
   * Implements clauses
   */
  implements: string[];

  /**
   * Type parameters
   */
  typeParameters?: string[];

  /**
   * Properties
   */
  properties: PropertyInfo[];

  /**
   * Methods
   */
  methods: FunctionInfo[];

  /**
   * Constructor
   */
  constructor?: FunctionInfo;

  /**
   * Is abstract
   */
  isAbstract: boolean;

  /**
   * JSDoc comment
   */
  documentation?: string;
}

/**
 * Property information
 */
export interface PropertyInfo {
  /**
   * Property name
   */
  name: string;

  /**
   * Property type
   */
  type?: string;

  /**
   * Is optional
   */
  optional: boolean;

  /**
   * Is readonly
   */
  readonly: boolean;

  /**
   * Is static
   */
  static: boolean;

  /**
   * Access modifier
   */
  access?: 'public' | 'private' | 'protected';

  /**
   * Initializer
   */
  initializer?: string;
}

/**
 * Interface information
 */
export interface InterfaceInfo {
  /**
   * Interface name
   */
  name: string;

  /**
   * Extends clauses
   */
  extends: string[];

  /**
   * Type parameters
   */
  typeParameters?: string[];

  /**
   * Properties
   */
  properties: PropertyInfo[];

  /**
   * Methods
   */
  methods: FunctionInfo[];

  /**
   * JSDoc comment
   */
  documentation?: string;
}

/**
 * Type alias information
 */
export interface TypeAliasInfo {
  /**
   * Type name
   */
  name: string;

  /**
   * Type parameters
   */
  typeParameters?: string[];

  /**
   * Type definition
   */
  type: string;

  /**
   * JSDoc comment
   */
  documentation?: string;
}

/**
 * Parse TypeScript source code into a simple AST representation
 *
 * Note: This is a simplified parser. For production use with TypeScript Compiler API,
 * you would use ts.createSourceFile and ts.transform.
 *
 * @param source - TypeScript source code
 * @returns Parsed information about the code
 *
 * @example
 * ```typescript
 * const info = parseTypeScript(`
 *   import React from 'react';
 *
 *   export function Component() {
 *     return <div>Hello</div>;
 *   }
 * `);
 * ```
 */
export function parseTypeScript(source: string): {
  imports: ImportInfo[];
  exports: ExportInfo[];
  functions: FunctionInfo[];
  classes: ClassInfo[];
  interfaces: InterfaceInfo[];
  types: TypeAliasInfo[];
} {
  return {
    imports: extractImports(source),
    exports: extractExports(source),
    functions: extractFunctions(source),
    classes: extractClasses(source),
    interfaces: extractInterfaces(source),
    types: extractTypeAliases(source),
  };
}

/**
 * Extract import statements from source code
 *
 * @param source - Source code
 * @returns Array of import information
 */
export function extractImports(source: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  const importRegex = /import\s+(?:(\w+)|{([^}]+)}|\*\s+as\s+(\w+))(?:\s*,\s*(?:{([^}]+)}|\*\s+as\s+(\w+)))?\s+from\s+['"]([^'"]+)['"]/g;

  let match;
  while ((match = importRegex.exec(source)) !== null) {
    const [text, defaultImport, namedImportsStr1, namespaceImport1, namedImportsStr2, namespaceImport2, module] = match;

    const named: string[] = [];
    if (namedImportsStr1) {
      named.push(...namedImportsStr1.split(',').map(s => s.trim()));
    }
    if (namedImportsStr2) {
      named.push(...namedImportsStr2.split(',').map(s => s.trim()));
    }

    imports.push({
      module,
      named: named.filter(n => n.length > 0),
      default: defaultImport,
      namespace: namespaceImport1 || namespaceImport2,
      text,
    });
  }

  return imports;
}

/**
 * Extract export statements from source code
 *
 * @param source - Source code
 * @returns Array of export information
 */
export function extractExports(source: string): ExportInfo[] {
  const exports: ExportInfo[] = [];

  // Default exports
  const defaultExportRegex = /export\s+default\s+(?:function|class|interface|type)?\s*(\w+)?/g;
  let match;
  while ((match = defaultExportRegex.exec(source)) !== null) {
    exports.push({
      kind: 'default',
      name: match[1] || 'default',
      type: 'unknown',
      text: match[0],
    });
  }

  // Named exports
  const namedExportRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
  while ((match = namedExportRegex.exec(source)) !== null) {
    exports.push({
      kind: 'named',
      name: match[1],
      type: match[0].includes('function') ? 'function' :
            match[0].includes('class') ? 'class' :
            match[0].includes('interface') ? 'interface' :
            match[0].includes('type') ? 'type' :
            match[0].includes('enum') ? 'enum' : 'variable',
      text: match[0],
    });
  }

  return exports;
}

/**
 * Extract function declarations from source code
 *
 * @param source - Source code
 * @returns Array of function information
 */
export function extractFunctions(source: string): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*(?:<([^>]+)>)?\s*\(([^)]*)\)\s*(?::\s*([^{]+))?/g;

  let match;
  while ((match = functionRegex.exec(source)) !== null) {
    const [text, name, typeParams, params, returnType] = match;

    functions.push({
      name,
      parameters: parseParameters(params),
      returnType: returnType?.trim(),
      isAsync: text.includes('async'),
      isGenerator: text.includes('*'),
      typeParameters: typeParams ? typeParams.split(',').map(t => t.trim()) : undefined,
    });
  }

  return functions;
}

/**
 * Extract class declarations from source code
 *
 * @param source - Source code
 * @returns Array of class information
 */
export function extractClasses(source: string): ClassInfo[] {
  const classes: ClassInfo[] = [];
  const classRegex = /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:<([^>]+)>)?(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?\s*{/g;

  let match;
  while ((match = classRegex.exec(source)) !== null) {
    const [text, name, typeParams, extendsClause, implementsClause] = match;

    classes.push({
      name,
      extends: extendsClause,
      implements: implementsClause ? implementsClause.split(',').map(i => i.trim()) : [],
      typeParameters: typeParams ? typeParams.split(',').map(t => t.trim()) : undefined,
      properties: [],
      methods: [],
      isAbstract: text.includes('abstract'),
    });
  }

  return classes;
}

/**
 * Extract interface declarations from source code
 *
 * @param source - Source code
 * @returns Array of interface information
 */
export function extractInterfaces(source: string): InterfaceInfo[] {
  const interfaces: InterfaceInfo[] = [];
  const interfaceRegex = /(?:export\s+)?interface\s+(\w+)(?:<([^>]+)>)?(?:\s+extends\s+([^{]+))?\s*{/g;

  let match;
  while ((match = interfaceRegex.exec(source)) !== null) {
    const [_, name, typeParams, extendsClause] = match;

    interfaces.push({
      name,
      extends: extendsClause ? extendsClause.split(',').map(e => e.trim()) : [],
      typeParameters: typeParams ? typeParams.split(',').map(t => t.trim()) : undefined,
      properties: [],
      methods: [],
    });
  }

  return interfaces;
}

/**
 * Extract type alias declarations from source code
 *
 * @param source - Source code
 * @returns Array of type alias information
 */
export function extractTypeAliases(source: string): TypeAliasInfo[] {
  const types: TypeAliasInfo[] = [];
  const typeRegex = /(?:export\s+)?type\s+(\w+)(?:<([^>]+)>)?\s*=\s*([^;]+);/g;

  let match;
  while ((match = typeRegex.exec(source)) !== null) {
    const [_, name, typeParams, type] = match;

    types.push({
      name,
      typeParameters: typeParams ? typeParams.split(',').map(t => t.trim()) : undefined,
      type: type.trim(),
    });
  }

  return types;
}

/**
 * Parse function parameters
 */
function parseParameters(params: string): ParameterInfo[] {
  if (!params.trim()) {
    return [];
  }

  return params.split(',').map(param => {
    const trimmed = param.trim();
    const isRest = trimmed.startsWith('...');
    const withoutRest = isRest ? trimmed.slice(3) : trimmed;
    const [nameWithOptional, ...typeParts] = withoutRest.split(':');
    const optional = nameWithOptional.endsWith('?');
    const name = optional ? nameWithOptional.slice(0, -1) : nameWithOptional;
    const [type, defaultValue] = typeParts.join(':').split('=').map(s => s.trim());

    return {
      name: name.trim(),
      type: type || undefined,
      optional,
      isRest,
      defaultValue: defaultValue || undefined,
    };
  });
}

/**
 * Add an import statement to source code
 *
 * @param source - Source code
 * @param imports - Named imports or default import
 * @param module - Module specifier
 * @param options - Import options
 * @returns Modified source code
 *
 * @example
 * ```typescript
 * const code = addImport(
 *   'const x = 1;',
 *   ['useState', 'useEffect'],
 *   'react'
 * );
 * // import { useState, useEffect } from 'react';
 * // const x = 1;
 * ```
 */
export function addImport(
  source: string,
  imports: string | string[],
  module: string,
  options?: {
    /**
     * Add as default import
     */
    default?: boolean;
    /**
     * Add as namespace import
     */
    namespace?: boolean;
    /**
     * Add as type import
     */
    type?: boolean;
  }
): string {
  const existingImports = extractImports(source);
  const existingImport = existingImports.find(imp => imp.module === module);

  if (existingImport) {
    // Merge with existing import
    const named = Array.isArray(imports) ? imports : [];
    const defaultImport = options?.default && typeof imports === 'string' ? imports : existingImport.default;
    const namespace = options?.namespace && typeof imports === 'string' ? imports : existingImport.namespace;

    const allNamed = [...new Set([...existingImport.named, ...named])];
    const newImport = buildImportStatement(allNamed, module, { default: defaultImport, namespace, type: options?.type });

    return source.replace(existingImport.text, newImport);
  } else {
    // Add new import at the top
    const named = Array.isArray(imports) ? imports : [];
    const defaultImport = options?.default && typeof imports === 'string' ? imports : undefined;
    const namespace = options?.namespace && typeof imports === 'string' ? imports : undefined;

    const importStatement = buildImportStatement(named, module, { default: defaultImport, namespace, type: options?.type });

    // Find the position to insert (after existing imports or at the top)
    const lastImport = existingImports[existingImports.length - 1];
    if (lastImport) {
      const insertPos = source.indexOf(lastImport.text) + lastImport.text.length;
      return source.slice(0, insertPos) + '\n' + importStatement + source.slice(insertPos);
    } else {
      return importStatement + '\n\n' + source;
    }
  }
}

/**
 * Build an import statement
 */
function buildImportStatement(
  named: string[],
  module: string,
  options?: {
    default?: string;
    namespace?: string;
    type?: boolean;
  }
): string {
  const parts: string[] = [];

  if (options?.default) {
    parts.push(options.default);
  }

  if (options?.namespace) {
    parts.push(`* as ${options.namespace}`);
  }

  if (named.length > 0) {
    parts.push(`{ ${named.join(', ')} }`);
  }

  const typePrefix = options?.type ? 'type ' : '';
  return `import ${typePrefix}${parts.join(', ')} from '${module}';`;
}

/**
 * Add an export to source code
 *
 * @param source - Source code
 * @param name - Export name
 * @param options - Export options
 * @returns Modified source code
 *
 * @example
 * ```typescript
 * const code = addExport('const x = 1;', 'x');
 * // export const x = 1;
 * ```
 */
export function addExport(
  source: string,
  name: string,
  options?: {
    /**
     * Make it a default export
     */
    default?: boolean;
    /**
     * Export type
     */
    type?: boolean;
  }
): string {
  if (options?.default) {
    return source + `\n\nexport default ${name};`;
  }

  const typePrefix = options?.type ? 'type ' : '';
  const declarationRegex = new RegExp(`(const|let|var|function|class|interface|type|enum)\\s+${name}\\b`);

  return source.replace(declarationRegex, `export ${typePrefix}$1 ${name}`);
}

/**
 * Remove an import from source code
 *
 * @param source - Source code
 * @param module - Module specifier to remove
 * @returns Modified source code
 */
export function removeImport(source: string, module: string): string {
  const imports = extractImports(source);
  const importToRemove = imports.find(imp => imp.module === module);

  if (!importToRemove) {
    return source;
  }

  return source.replace(importToRemove.text, '').replace(/\n\n\n+/g, '\n\n');
}

/**
 * Format TypeScript code (simple indentation-based formatting)
 *
 * Note: For production use, integrate with prettier or typescript formatter
 *
 * @param source - Source code
 * @param options - Formatting options
 * @returns Formatted code
 */
export function formatTypeScript(
  source: string,
  options?: {
    /**
     * Indentation (default: 2 spaces)
     */
    indent?: number;
    /**
     * Use tabs instead of spaces
     */
    useTabs?: boolean;
    /**
     * Semicolons (default: true)
     */
    semicolons?: boolean;
  }
): string {
  const indent = options?.useTabs ? '\t' : ' '.repeat(options?.indent ?? 2);

  // Basic formatting - in production, use prettier
  let formatted = source;
  let level = 0;
  const lines = formatted.split('\n');

  const result = lines.map(line => {
    const trimmed = line.trim();

    if (trimmed.endsWith('{')) {
      const indented = indent.repeat(level) + trimmed;
      level++;
      return indented;
    } else if (trimmed.startsWith('}')) {
      level = Math.max(0, level - 1);
      return indent.repeat(level) + trimmed;
    } else if (trimmed) {
      return indent.repeat(level) + trimmed;
    }

    return '';
  });

  return result.join('\n');
}
