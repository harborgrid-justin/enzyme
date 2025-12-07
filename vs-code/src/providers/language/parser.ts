import * as path from 'node:path';
import * as ts from 'typescript';
import * as vscode from 'vscode';

/**
 * Represents a route definition extracted from source code
 */
export interface RouteDefinition {
  name: string;
  path: string;
  component?: string;
  guards?: string[];
  params?: string[];
  position: vscode.Position;
  range: vscode.Range;
  file: string;
}

/**
 * Represents a hook usage in source code
 */
export interface HookUsage {
  name: string;
  args?: string[];
  returnType?: string;
  position: vscode.Position;
  range: vscode.Range;
  file: string;
}

/**
 * Represents a component definition
 */
export interface ComponentDefinition {
  name: string;
  props?: Record<string, string>;
  position: vscode.Position;
  range: vscode.Range;
  file: string;
  isExported: boolean;
}

/**
 * Represents a store definition
 */
export interface StoreDefinition {
  name: string;
  sliceName?: string;
  state?: Record<string, string>;
  actions?: string[];
  position: vscode.Position;
  range: vscode.Range;
  file: string;
}

/**
 * Represents an API endpoint definition
 */
export interface ApiDefinition {
  name: string;
  method: string;
  endpoint: string;
  requestType?: string;
  responseType?: string;
  position: vscode.Position;
  range: vscode.Range;
  file: string;
}

/**
 * Cache entry for parsed files
 */
interface CacheEntry {
  version: number;
  sourceFile: ts.SourceFile;
  routes: RouteDefinition[];
  hooks: HookUsage[];
  components: ComponentDefinition[];
  stores: StoreDefinition[];
  apis: ApiDefinition[];
}

/**
 * EnzymeParser - Utility class for parsing TypeScript/TSX files
 * and extracting Enzyme-specific constructs
 */
export class EnzymeParser {
  private readonly cache = new Map<string, CacheEntry>();

  /**
   *
   */
  constructor() {
    // Intentionally empty - parser initialized with default settings
  }

  /**
   * Initialize parser with workspace configuration
   * @param workspaceRoot
   * @param _workspaceRoot
   */
  public async initialize(_workspaceRoot: string): Promise<void> {
    // Parser initialization - reserved for future use
  }

  /**
   * Parse a document and extract all Enzyme entities
   * @param document
   */
  public parseDocument(document: vscode.TextDocument): ParseResult {
    const filePath = document.uri.fsPath;
    const {version} = document;

    // Check cache
    const cached = this.cache.get(filePath);
    if (cached?.version === version) {
      return {
        routes: cached.routes,
        hooks: cached.hooks,
        components: cached.components,
        stores: cached.stores,
        apis: cached.apis,
      };
    }

    // Parse source file
    const sourceFile = ts.createSourceFile(
      filePath,
      document.getText(),
      ts.ScriptTarget.Latest,
      true,
      this.getScriptKind(filePath)
    );

    // Extract entities
    const routes = this.extractRoutes(sourceFile, document);
    const hooks = this.extractHooks(sourceFile, document);
    const components = this.extractComponents(sourceFile, document);
    const stores = this.extractStores(sourceFile, document);
    const apis = this.extractApis(sourceFile, document);

    // Cache results
    this.cache.set(filePath, {
      version,
      sourceFile,
      routes,
      hooks,
      components,
      stores,
      apis,
    });

    return { routes, hooks, components, stores, apis };
  }

  /**
   * Extract route definitions from source file
   * @param sourceFile
   * @param document
   */
  private extractRoutes(
    sourceFile: ts.SourceFile,
    document: vscode.TextDocument
  ): RouteDefinition[] {
    const routes: RouteDefinition[] = [];

    const visit = (node: ts.Node) => {
      // Look for route definitions like: routes.home, routes.dashboard
      if (ts.isPropertyAccessExpression(node)) {
        const text = node.getText(sourceFile);
        if (text.startsWith('routes.')) {
          const routeName = node.name.text;
          const position = document.positionAt(node.getStart(sourceFile));
          const range = new vscode.Range(
            position,
            document.positionAt(node.getEnd())
          );

          routes.push({
            name: routeName,
            path: `/${routeName}`, // Simplified - would extract from config
            position,
            range,
            file: document.uri.fsPath,
            guards: [],
            params: [],
          });
        }
      }

      // Look for route configurations in enzyme.config.ts
      if (ts.isObjectLiteralExpression(node)) {
        node.properties.forEach(property => {
          if (ts.isPropertyAssignment(property)) {
            const name = property.name?.getText(sourceFile);
            if (name === 'routes' && ts.isObjectLiteralExpression(property.initializer)) {
              this.extractRoutesFromConfig(property.initializer, sourceFile, document, routes);
            }
          }
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return routes;
  }

  /**
   * Extract routes from configuration object
   * @param node
   * @param sourceFile
   * @param document
   * @param routes
   */
  private extractRoutesFromConfig(
    node: ts.ObjectLiteralExpression,
    sourceFile: ts.SourceFile,
    document: vscode.TextDocument,
    routes: RouteDefinition[]
  ): void {
    node.properties.forEach(property => {
      if (ts.isPropertyAssignment(property)) {
        const routeName = property.name?.getText(sourceFile).replace(/["']/g, '');
        const position = document.positionAt(property.getStart(sourceFile));
        const range = new vscode.Range(
          position,
          document.positionAt(property.getEnd())
        );

        let routePath = `/${routeName}`;
        let component: string | undefined;
        let guards: string[] = [];
        let params: string[] = [];

        // Extract route details from initializer
        if (ts.isObjectLiteralExpression(property.initializer)) {
          property.initializer.properties.forEach(routeProperty => {
            if (ts.isPropertyAssignment(routeProperty)) {
              const key = routeProperty.name?.getText(sourceFile);
              const value = routeProperty.initializer.getText(sourceFile).replace(/["']/g, '');

              if (key === 'path') {
                routePath = value;
                // Extract params from path like /user/:id
                const paramMatches = routePath.match(/:(\w+)/g);
                if (paramMatches) {
                  params = paramMatches.map(p => p.slice(1));
                }
              } else if (key === 'component') {
                component = value;
              } else if (key === 'guards' && ts.isArrayLiteralExpression(routeProperty.initializer)) {
                guards = routeProperty.initializer.elements.map(e =>
                  e.getText(sourceFile).replace(/["']/g, '')
                );
              }
            }
          });
        }

        routes.push({
          name: routeName,
          path: routePath,
          ...(component ? { component } : {}),
          guards,
          params,
          position,
          range,
          file: document.uri.fsPath,
        });
      }
    });
  }

  /**
   * Extract hook usages from source file
   * @param sourceFile
   * @param document
   */
  private extractHooks(
    sourceFile: ts.SourceFile,
    document: vscode.TextDocument
  ): HookUsage[] {
    const hooks: HookUsage[] = [];
    const enzymeHooks = [
      'useAuth',
      'useStore',
      'useFeatureFlag',
      'useApiRequest',
      'useRouter',
      'useRouteParams',
      'useQuery',
      'useMutation',
    ];

    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const callText = node.expression.getText(sourceFile);

        if (enzymeHooks.some(hook => callText.includes(hook))) {
          const hookName = callText.split('.').pop() || callText;
          const position = document.positionAt(node.getStart(sourceFile));
          const range = new vscode.Range(
            position,
            document.positionAt(node.getEnd())
          );

          const args = node.arguments.map(argument => argument.getText(sourceFile));

          hooks.push({
            name: hookName,
            args,
            position,
            range,
            file: document.uri.fsPath,
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return hooks;
  }

  /**
   * Extract component definitions from source file
   * @param sourceFile
   * @param document
   */
  private extractComponents(
    sourceFile: ts.SourceFile,
    document: vscode.TextDocument
  ): ComponentDefinition[] {
    const components: ComponentDefinition[] = [];

    const visit = (node: ts.Node) => {
      // Function components
      if (ts.isFunctionDeclaration(node) && node.name) {
        const name = node.name.text;
        // Check if it's a React component (starts with uppercase)
        if (/^[A-Z]/.test(name)) {
          const position = document.positionAt(node.getStart(sourceFile));
          const range = new vscode.Range(
            position,
            document.positionAt(node.getEnd())
          );

          const props = this.extractPropsFromFunction(node, sourceFile);
          const isExported = this.isNodeExported(node);

          components.push({
            name,
            ...(props ? { props } : {}),
            position,
            range,
            file: document.uri.fsPath,
            isExported,
          });
        }
      }

      // Arrow function components
      if (ts.isVariableDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
        const name = node.name.text;
        if (/^[A-Z]/.test(name) && node.initializer) {
          if (ts.isArrowFunction(node.initializer)) {
            const position = document.positionAt(node.getStart(sourceFile));
            const range = new vscode.Range(
              position,
              document.positionAt(node.getEnd())
            );

            const props = this.extractPropsFromArrowFunction(node.initializer, sourceFile);
            const isExported = this.isNodeExported(node.parent.parent);

            components.push({
              name,
              ...(props ? { props } : {}),
              position,
              range,
              file: document.uri.fsPath,
              isExported,
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return components;
  }

  /**
   * Extract store definitions from source file
   * @param sourceFile
   * @param document
   */
  private extractStores(
    sourceFile: ts.SourceFile,
    document: vscode.TextDocument
  ): StoreDefinition[] {
    const stores: StoreDefinition[] = [];

    const visit = (node: ts.Node) => {
      // Look for createSlice calls
      if (ts.isCallExpression(node)) {
        const callText = node.expression.getText(sourceFile);

        if (callText.includes('createSlice') || callText.includes('createAppStore')) {
          const position = document.positionAt(node.getStart(sourceFile));
          const range = new vscode.Range(
            position,
            document.positionAt(node.getEnd())
          );

          let name = 'unknown';
          let sliceName: string | undefined;
          const state: Record<string, string> = {};
          const actions: string[] = [];

          // Extract store details from argument
          if (node.arguments.length > 0) {
            const argument = node.arguments[0];
            if (argument && ts.isObjectLiteralExpression(argument)) {
              argument.properties.forEach(property => {
                if (ts.isPropertyAssignment(property)) {
                  const key = property.name?.getText(sourceFile);

                  if (key === 'name' && property.initializer) {
                    sliceName = property.initializer.getText(sourceFile).replace(/["']/g, '');
                    name = sliceName;
                  } else if (key === 'initialState' && ts.isObjectLiteralExpression(property.initializer)) {
                    property.initializer.properties.forEach(stateProperty => {
                      if (ts.isPropertyAssignment(stateProperty)) {
                        const stateName = stateProperty.name?.getText(sourceFile);
                        if (!stateName || !stateProperty.initializer) {return;}
                        const stateType = this.inferType(stateProperty.initializer, sourceFile);
                        state[stateName] = stateType;
                      }
                    });
                  } else if (key === 'reducers' && ts.isObjectLiteralExpression(property.initializer)) {
                    property.initializer.properties.forEach(reducer => {
                      if (ts.isPropertyAssignment(reducer) || ts.isMethodDeclaration(reducer)) {
                        const reducerName = reducer.name?.getText(sourceFile);
                        if (reducerName) {
                          actions.push(reducerName);
                        }
                      }
                    });
                  }
                }
              });
            }
          }

          stores.push({
            name,
            ...(sliceName ? { sliceName } : {}),
            ...(Object.keys(state).length > 0 ? { state } : {}),
            ...(actions.length > 0 ? { actions } : {}),
            position,
            range,
            file: document.uri.fsPath,
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return stores;
  }

  /**
   * Extract API definitions from source file
   * @param sourceFile
   * @param document
   */
  private extractApis(
    sourceFile: ts.SourceFile,
    document: vscode.TextDocument
  ): ApiDefinition[] {
    const apis: ApiDefinition[] = [];

    const visit = (node: ts.Node) => {
      // Look for apiClient calls
      if (ts.isCallExpression(node)) {
        const callText = node.expression.getText(sourceFile);

        // Match patterns like apiClient.get(), RequestBuilder.post()
        const match = /\.(get|post|put|patch|delete|head|options)\(/.exec(callText);
        if (match?.[1]) {
          const method = match[1].toUpperCase();
          const position = document.positionAt(node.getStart(sourceFile));
          const range = new vscode.Range(
            position,
            document.positionAt(node.getEnd())
          );

          let endpoint = '';
          const firstArgument = node.arguments[0];
          if (node.arguments.length > 0 && firstArgument) {
            endpoint = firstArgument.getText(sourceFile).replace(/["']/g, '');
          }

          apis.push({
            name: `${method} ${endpoint}`,
            method,
            endpoint,
            position,
            range,
            file: document.uri.fsPath,
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return apis;
  }

  /**
   * Extract props from function declaration
   * @param node
   * @param sourceFile
   */
  private extractPropsFromFunction(
    node: ts.FunctionDeclaration,
    sourceFile: ts.SourceFile
  ): Record<string, string> | undefined {
    if (node.parameters.length === 0) {
      return undefined;
    }

    const propsParam = node.parameters[0];
    if (!propsParam?.type) {
      return undefined;
    }

    return this.extractPropsFromType(propsParam.type, sourceFile);
  }

  /**
   * Extract props from arrow function
   * @param node
   * @param sourceFile
   */
  private extractPropsFromArrowFunction(
    node: ts.ArrowFunction,
    sourceFile: ts.SourceFile
  ): Record<string, string> | undefined {
    if (node.parameters.length === 0) {
      return undefined;
    }

    const propsParam = node.parameters[0];
    if (!propsParam?.type) {
      return undefined;
    }

    return this.extractPropsFromType(propsParam.type, sourceFile);
  }

  /**
   * Extract props from type node
   * @param typeNode
   * @param sourceFile
   */
  private extractPropsFromType(
    typeNode: ts.TypeNode,
    sourceFile: ts.SourceFile
  ): Record<string, string> | undefined {
    const props: Record<string, string> = {};

    if (ts.isTypeLiteralNode(typeNode)) {
      typeNode.members.forEach(member => {
        if (ts.isPropertySignature(member) && member.name) {
          const propertyName = member.name.getText(sourceFile);
          const propertyType = member.type?.getText(sourceFile) || 'any';
          props[propertyName] = propertyType;
        }
      });
      return props;
    }

    return undefined;
  }

  /**
   * Check if node is exported
   * @param node
   */
  private isNodeExported(node: ts.Node): boolean {
    return (
      (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0 ||
      (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
    );
  }

  /**
   * Infer type from node
   * @param node
   * @param _sourceFile
   */
  private inferType(node: ts.Node, _sourceFile: ts.SourceFile): string {
    if (ts.isStringLiteral(node)) {
      return 'string';
    }
    if (ts.isNumericLiteral(node)) {
      return 'number';
    }
    if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword) {
      return 'boolean';
    }
    if (ts.isArrayLiteralExpression(node)) {
      return 'array';
    }
    if (ts.isObjectLiteralExpression(node)) {
      return 'object';
    }
    return 'unknown';
  }

  /**
   * Get script kind based on file extension
   * @param filePath
   */
  private getScriptKind(filePath: string): ts.ScriptKind {
    const extension = path.extname(filePath);
    switch (extension) {
      case '.ts':
        return ts.ScriptKind.TS;
      case '.tsx':
        return ts.ScriptKind.TSX;
      case '.jsx':
        return ts.ScriptKind.JSX;
      case '.js':
      default:
        return ts.ScriptKind.JS;
    }
  }

  /**
   * Get source file from cache or parse
   * @param document
   */
  public getSourceFile(document: vscode.TextDocument): ts.SourceFile | undefined {
    const cached = this.cache.get(document.uri.fsPath);
    if (cached && cached.version === document.version) {
      return cached.sourceFile;
    }

    return ts.createSourceFile(
      document.uri.fsPath,
      document.getText(),
      ts.ScriptTarget.Latest,
      true,
      this.getScriptKind(document.uri.fsPath)
    );
  }

  /**
   * Clear cache for a specific file
   * @param filePath
   */
  public clearCache(filePath: string): void {
    this.cache.delete(filePath);
  }

  /**
   * Clear all caches
   */
  public clearAllCaches(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; files: string[] } {
    return {
      size: this.cache.size,
      files: [...this.cache.keys()],
    };
  }
}

/**
 * Parse result containing all extracted entities
 */
export interface ParseResult {
  routes: RouteDefinition[];
  hooks: HookUsage[];
  components: ComponentDefinition[];
  stores: StoreDefinition[];
  apis: ApiDefinition[];
}

/**
 * Singleton parser instance
 */
let parserInstance: EnzymeParser | undefined;

/**
 * Get or create parser instance
 */
export function getParser(): EnzymeParser {
  if (!parserInstance) {
    parserInstance = new EnzymeParser();
  }
  return parserInstance;
}

/**
 * Reset parser instance (useful for testing)
 */
export function resetParser(): void {
  parserInstance = undefined;
}
