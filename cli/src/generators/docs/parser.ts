/**
 * TypeScript Parser
 * Extracts documentation metadata from TypeScript source files
 */

import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';

export interface ParsedSymbol {
  name: string;
  kind: string;
  filePath: string;
  line: number;
  documentation: string;
  examples: string[];
  deprecated?: string;
  since?: string;
  tags: Record<string, string>;
}

export interface ParsedFunction extends ParsedSymbol {
  parameters: FunctionParameter[];
  returnType: string;
  isAsync: boolean;
  isExported: boolean;
  typeParameters?: string[];
}

export interface FunctionParameter {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
  description?: string;
}

export interface ParsedInterface extends ParsedSymbol {
  properties: InterfaceProperty[];
  extends?: string[];
  isExported: boolean;
}

export interface InterfaceProperty {
  name: string;
  type: string;
  optional: boolean;
  readonly: boolean;
  description?: string;
}

export interface ParsedComponent extends ParsedSymbol {
  props?: ParsedInterface;
  isDefaultExport: boolean;
  hooks: string[];
  relatedComponents: string[];
}

export interface ParsedHook extends ParsedSymbol {
  parameters: FunctionParameter[];
  returnType: string;
  dependencies: string[];
}

export class TypeScriptParser {
  private program: ts.Program;
  private checker: ts.TypeChecker;

  constructor(private configPath?: string) {
    const config = this.loadTsConfig();
    this.program = ts.createProgram(config.fileNames, config.options);
    this.checker = this.program.getTypeChecker();
  }

  /**
   * Load TypeScript configuration
   */
  private loadTsConfig(): { fileNames: string[]; options: ts.CompilerOptions } {
    const configFile = this.configPath || ts.findConfigFile(
      process.cwd(),
      ts.sys.fileExists,
      'tsconfig.json'
    );

    if (!configFile) {
      return {
        fileNames: [],
        options: {
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.ESNext,
          jsx: ts.JsxEmit.React,
          strict: true,
        },
      };
    }

    const { config } = ts.readConfigFile(configFile, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(
      config,
      ts.sys,
      path.dirname(configFile)
    );

    return {
      fileNames: parsed.fileNames,
      options: parsed.options,
    };
  }

  /**
   * Parse a specific file
   */
  parseFile(filePath: string): ParsedSymbol[] {
    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) {
      return [];
    }

    const symbols: ParsedSymbol[] = [];

    ts.forEachChild(sourceFile, (node) => {
      const symbol = this.parseNode(node, sourceFile);
      if (symbol) {
        symbols.push(symbol);
      }
    });

    return symbols;
  }

  /**
   * Parse a TypeScript node
   */
  private parseNode(node: ts.Node, sourceFile: ts.SourceFile): ParsedSymbol | null {
    // Function declarations
    if (ts.isFunctionDeclaration(node) && node.name) {
      return this.parseFunctionDeclaration(node, sourceFile);
    }

    // Interface declarations
    if (ts.isInterfaceDeclaration(node)) {
      return this.parseInterfaceDeclaration(node, sourceFile);
    }

    // Variable declarations (for arrow functions, components, hooks)
    if (ts.isVariableStatement(node)) {
      return this.parseVariableStatement(node, sourceFile);
    }

    // Export declarations
    if (ts.isExportDeclaration(node)) {
      // Handle re-exports
      return null;
    }

    return null;
  }

  /**
   * Parse function declaration
   */
  private parseFunctionDeclaration(
    node: ts.FunctionDeclaration,
    sourceFile: ts.SourceFile
  ): ParsedFunction {
    const symbol = this.checker.getSymbolAtLocation(node.name!);
    const jsDoc = this.getJSDocComments(node);
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    return {
      name: node.name!.text,
      kind: 'function',
      filePath: sourceFile.fileName,
      line: line + 1,
      documentation: jsDoc.description,
      examples: jsDoc.examples,
      tags: jsDoc.tags,
      deprecated: jsDoc.deprecated,
      since: jsDoc.since,
      parameters: this.parseParameters(node.parameters),
      returnType: this.getReturnType(node),
      isAsync: node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) || false,
      isExported: this.isExported(node),
      typeParameters: this.getTypeParameters(node.typeParameters),
    };
  }

  /**
   * Parse interface declaration
   */
  private parseInterfaceDeclaration(
    node: ts.InterfaceDeclaration,
    sourceFile: ts.SourceFile
  ): ParsedInterface {
    const jsDoc = this.getJSDocComments(node);
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    return {
      name: node.name.text,
      kind: 'interface',
      filePath: sourceFile.fileName,
      line: line + 1,
      documentation: jsDoc.description,
      examples: jsDoc.examples,
      tags: jsDoc.tags,
      deprecated: jsDoc.deprecated,
      since: jsDoc.since,
      properties: this.parseInterfaceProperties(node),
      extends: this.getExtends(node),
      isExported: this.isExported(node),
    };
  }

  /**
   * Parse variable statement (for const declarations)
   */
  private parseVariableStatement(
    node: ts.VariableStatement,
    sourceFile: ts.SourceFile
  ): ParsedSymbol | null {
    const declaration = node.declarationList.declarations[0];
    if (!declaration || !declaration.name || !ts.isIdentifier(declaration.name)) {
      return null;
    }

    const name = declaration.name.text;
    const jsDoc = this.getJSDocComments(node);
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    // Check if it's a React component
    if (this.isReactComponent(declaration)) {
      return this.parseComponent(declaration, sourceFile, jsDoc, line);
    }

    // Check if it's a custom hook
    if (name.startsWith('use') && ts.isArrowFunction(declaration.initializer!)) {
      return this.parseHook(declaration, sourceFile, jsDoc, line);
    }

    return null;
  }

  /**
   * Parse React component
   */
  private parseComponent(
    declaration: ts.VariableDeclaration,
    sourceFile: ts.SourceFile,
    jsDoc: JSDocInfo,
    line: number
  ): ParsedComponent {
    const name = (declaration.name as ts.Identifier).text;

    return {
      name,
      kind: 'component',
      filePath: sourceFile.fileName,
      line: line + 1,
      documentation: jsDoc.description,
      examples: jsDoc.examples,
      tags: jsDoc.tags,
      deprecated: jsDoc.deprecated,
      since: jsDoc.since,
      props: this.extractComponentProps(declaration),
      isDefaultExport: false, // TODO: Check for default export
      hooks: this.extractUsedHooks(declaration),
      relatedComponents: jsDoc.tags['related']?.split(',').map((s) => s.trim()) || [],
    };
  }

  /**
   * Parse custom hook
   */
  private parseHook(
    declaration: ts.VariableDeclaration,
    sourceFile: ts.SourceFile,
    jsDoc: JSDocInfo,
    line: number
  ): ParsedHook {
    const name = (declaration.name as ts.Identifier).text;
    const func = declaration.initializer as ts.ArrowFunction;

    return {
      name,
      kind: 'hook',
      filePath: sourceFile.fileName,
      line: line + 1,
      documentation: jsDoc.description,
      examples: jsDoc.examples,
      tags: jsDoc.tags,
      deprecated: jsDoc.deprecated,
      since: jsDoc.since,
      parameters: this.parseParameters(func.parameters),
      returnType: this.getReturnType(func),
      dependencies: this.extractHookDependencies(func),
    };
  }

  /**
   * Extract JSDoc comments
   */
  private getJSDocComments(node: ts.Node): JSDocInfo {
    const info: JSDocInfo = {
      description: '',
      examples: [],
      tags: {},
    };

    const jsDocTags = ts.getJSDocTags(node);
    const jsDocComments = ts.getJSDocCommentsAndTags(node);

    // Get main description
    for (const comment of jsDocComments) {
      if (ts.isJSDoc(comment) && comment.comment) {
        info.description = typeof comment.comment === 'string'
          ? comment.comment
          : comment.comment.map((c) => c.text).join('');
      }
    }

    // Parse tags
    for (const tag of jsDocTags) {
      const tagName = tag.tagName.text;
      const tagComment = tag.comment;
      const tagValue = typeof tagComment === 'string'
        ? tagComment
        : tagComment?.map((c) => c.text).join('') || '';

      if (tagName === 'example') {
        info.examples.push(tagValue);
      } else if (tagName === 'deprecated') {
        info.deprecated = tagValue || 'This API is deprecated';
      } else if (tagName === 'since') {
        info.since = tagValue;
      } else {
        info.tags[tagName] = tagValue;
      }
    }

    return info;
  }

  /**
   * Parse function parameters
   */
  private parseParameters(parameters: ts.NodeArray<ts.ParameterDeclaration>): FunctionParameter[] {
    return parameters.map((param) => {
      const name = param.name.getText();
      const type = param.type ? param.type.getText() : 'any';
      const optional = !!param.questionToken;
      const defaultValue = param.initializer?.getText();

      return {
        name,
        type,
        optional,
        defaultValue,
      };
    });
  }

  /**
   * Get return type
   */
  private getReturnType(node: ts.FunctionDeclaration | ts.ArrowFunction): string {
    if (node.type) {
      return node.type.getText();
    }

    const signature = this.checker.getSignatureFromDeclaration(node);
    if (signature) {
      const returnType = this.checker.getReturnTypeOfSignature(signature);
      return this.checker.typeToString(returnType);
    }

    return 'void';
  }

  /**
   * Get type parameters
   */
  private getTypeParameters(typeParameters?: ts.NodeArray<ts.TypeParameterDeclaration>): string[] | undefined {
    if (!typeParameters || typeParameters.length === 0) {
      return undefined;
    }

    return typeParameters.map((tp) => tp.getText());
  }

  /**
   * Parse interface properties
   */
  private parseInterfaceProperties(node: ts.InterfaceDeclaration): InterfaceProperty[] {
    return node.members.map((member) => {
      if (ts.isPropertySignature(member) && member.name) {
        const name = member.name.getText();
        const type = member.type?.getText() || 'any';
        const optional = !!member.questionToken;
        const readonly = member.modifiers?.some((m) => m.kind === ts.SyntaxKind.ReadonlyKeyword) || false;

        return {
          name,
          type,
          optional,
          readonly,
        };
      }

      return {
        name: 'unknown',
        type: 'unknown',
        optional: false,
        readonly: false,
      };
    });
  }

  /**
   * Get extended interfaces
   */
  private getExtends(node: ts.InterfaceDeclaration): string[] | undefined {
    if (!node.heritageClauses) {
      return undefined;
    }

    const extendsClause = node.heritageClauses.find(
      (clause) => clause.token === ts.SyntaxKind.ExtendsKeyword
    );

    if (!extendsClause) {
      return undefined;
    }

    return extendsClause.types.map((type) => type.getText());
  }

  /**
   * Check if node is exported
   */
  private isExported(node: ts.Node): boolean {
    return (
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) || false
    );
  }

  /**
   * Check if it's a React component
   */
  private isReactComponent(declaration: ts.VariableDeclaration): boolean {
    if (!declaration.initializer) {
      return false;
    }

    // Check if it's an arrow function returning JSX
    if (ts.isArrowFunction(declaration.initializer)) {
      const returnType = declaration.type?.getText() || '';
      return returnType.includes('JSX.Element') || returnType.includes('ReactElement');
    }

    return false;
  }

  /**
   * Extract component props interface
   */
  private extractComponentProps(declaration: ts.VariableDeclaration): ParsedInterface | undefined {
    if (!declaration.initializer || !ts.isArrowFunction(declaration.initializer)) {
      return undefined;
    }

    const params = declaration.initializer.parameters;
    if (params.length === 0) {
      return undefined;
    }

    const propsParam = params[0];
    if (!propsParam.type) {
      return undefined;
    }

    // TODO: Parse props type reference and resolve interface
    return undefined;
  }

  /**
   * Extract hooks used in component
   */
  private extractUsedHooks(declaration: ts.VariableDeclaration): string[] {
    const hooks: string[] = [];

    if (!declaration.initializer) {
      return hooks;
    }

    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const expr = node.expression;
        if (ts.isIdentifier(expr) && expr.text.startsWith('use')) {
          hooks.push(expr.text);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(declaration.initializer);
    return Array.from(new Set(hooks));
  }

  /**
   * Extract hook dependencies
   */
  private extractHookDependencies(func: ts.ArrowFunction): string[] {
    const deps: string[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const expr = node.expression;
        if (ts.isIdentifier(expr) && expr.text.startsWith('use')) {
          deps.push(expr.text);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(func);
    return Array.from(new Set(deps));
  }
}

interface JSDocInfo {
  description: string;
  examples: string[];
  tags: Record<string, string>;
  deprecated?: string;
  since?: string;
}

/**
 * Create a TypeScript parser instance
 */
export function createParser(configPath?: string): TypeScriptParser {
  return new TypeScriptParser(configPath);
}

/**
 * Parse multiple files
 */
export async function parseFiles(filePaths: string[], configPath?: string): Promise<Map<string, ParsedSymbol[]>> {
  const parser = createParser(configPath);
  const results = new Map<string, ParsedSymbol[]>();

  for (const filePath of filePaths) {
    const symbols = parser.parseFile(filePath);
    results.set(filePath, symbols);
  }

  return results;
}
