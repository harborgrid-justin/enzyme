import * as vscode from 'vscode';
import { logger } from '../../core/logger';
import { getIndex } from './enzyme-index';

/**
 * EnzymeHoverProvider - Provides rich hover information for Enzyme framework entities
 *
 * This provider displays comprehensive hover tooltips including:
 * - Route definitions with path, parameters, guards, and components
 * - Hook signatures with parameters, return types, and examples
 * - Component props interfaces and JSX usage examples
 * - Store state shapes, actions, and usage patterns
 * - API endpoint details and request/response types
 * - Configuration option documentation
 *
 * FEATURES:
 * - Markdown-formatted documentation with syntax highlighting
 * - Code examples and usage patterns
 * - Links to definition files
 * - Parameter and type information
 *
 * BEST PRACTICES:
 * - Respects cancellation tokens for responsiveness
 * - Efficient context detection to minimize computation
 * - Error handling for missing or malformed data
 *
 * @implements {vscode.HoverProvider}
 */
export class EnzymeHoverProvider implements vscode.HoverProvider {
  /**
   * Provide hover information for the symbol at the given position
   *
   * Analyzes the context at the cursor position and returns rich hover content:
   * - Routes: path, params, guards, component info
   * - Hooks: signature, parameters, return type, examples
   * - Components: props interface, usage examples
   * - Store: state shape, actions, selectors
   * - APIs: endpoint, method, request/response types
   * - Config: option documentation and examples
   *
   * @param document - The document containing the symbol
   * @param position - The position of the cursor in the document
   * @param token - Cancellation token for long-running operations
   * @returns Hover information or undefined if none available
   *
   * PERFORMANCE: Uses early returns and context detection to minimize work
   * BEST PRACTICE: Properly handles cancellation for responsiveness
   */
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.Hover | undefined {
    // BEST PRACTICE: Check cancellation token
    if (token.isCancellationRequested) {
      return undefined;
    }

    try {
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) {
      return undefined;
    }

    const word = document.getText(wordRange);
    const line = document.lineAt(position.line).text;

    // Check for route hover
    if (line.includes('routes.')) {
      const routeHover = this.getRouteHover(word, wordRange);
      if (routeHover) {
        return routeHover;
      }
    }

    // Check for hook hover
    if (word.startsWith('use') && /^use[A-Z]/.test(word)) {
      const hookHover = this.getHookHover(word, wordRange);
      if (hookHover) {
        return hookHover;
      }
    }

    // Check for component hover (uppercase first letter)
    if (/^[A-Z]/.test(word) && this.isInJsxContext(document, position)) {
      const componentHover = this.getComponentHover(word, wordRange);
      if (componentHover) {
        return componentHover;
      }
    }

    // Check for store hover
    if (this.isInStoreContext(line)) {
      const storeHover = this.getStoreHover(word, wordRange);
      if (storeHover) {
        return storeHover;
      }
    }

    // Check for API hover
    if (this.isInApiContext(line)) {
      const apiHover = this.getApiHover(document, position, wordRange);
      if (apiHover) {
        return apiHover;
      }
    }

    // Check for config hover in enzyme.config.ts
    if (document.fileName.endsWith('enzyme.config.ts') || document.fileName.endsWith('enzyme.config.js')) {
      const configHover = this.getConfigHover(word, wordRange);
      if (configHover) {
        return configHover;
      }
    }

      return undefined;
    } catch (error) {
      logger.debug('Error providing hover:', error);
      return undefined;
    }
  }

  /**
   * Get hover information for a route
   *
   * Creates rich markdown hover content including:
   * - Route name and path
   * - Path parameters
   * - Route guards
   * - Associated component
   * - Usage examples with buildPath
   * - Link to route definition file
   *
   * @param routeName - Name of the route
   * @param range - Range of the route reference in the document
   * @returns Hover object with markdown content or undefined
   * @private
   *
   * ERROR HANDLING: Returns undefined if route not found or index unavailable
   */
  private getRouteHover(routeName: string, range: vscode.Range): vscode.Hover | undefined {
    try {
      const index = getIndex();
      const route = index.getRoute(routeName);

      if (!route) {
        return undefined;
      }

      const markdown = new vscode.MarkdownString();
      markdown.isTrusted = true;

      markdown.appendMarkdown(`### Route: \`${route.name}\`\n\n`);
      markdown.appendMarkdown(`**Path:** \`${route.path}\`\n\n`);

      if (route.component) {
        markdown.appendMarkdown(`**Component:** \`${route.component}\`\n\n`);
      }

      if (route.params && route.params.length > 0) {
        markdown.appendMarkdown('**Parameters:**\n\n');
        route.params.forEach(param => {
          markdown.appendMarkdown(`- \`${param}\`\n`);
        });
        markdown.appendMarkdown('\n');
      }

      if (route.guards && route.guards.length > 0) {
        markdown.appendMarkdown('**Guards:**\n\n');
        route.guards.forEach(guard => {
          markdown.appendMarkdown(`- \`${guard}\`\n`);
        });
        markdown.appendMarkdown('\n');
      }

      markdown.appendMarkdown('---\n\n');
      markdown.appendMarkdown('**Example:**\n\n');
      markdown.appendCodeblock(`router.push(routes.${routeName});`, 'typescript');

      if (route.params && route.params.length > 0) {
        const paramsExample = route.params.map(p => `${p}: "value"`).join(', ');
        markdown.appendCodeblock(
          `buildPath(routes.${routeName}, { ${paramsExample} });`,
          'typescript'
        );
      }

      // Add link to route file
      markdown.appendMarkdown('\n---\n\n');
      markdown.appendMarkdown(`[View route definition](${vscode.Uri.file(route.file).toString()})\n`);

      return new vscode.Hover(markdown, range);
    } catch (error) {
      logger.debug(`Error getting route hover for ${routeName}:`, error);
      return undefined;
    }
  }

  /**
   * Get hover information for a React hook
   *
   * Creates comprehensive hover content including:
   * - Hook signature with type information
   * - Description of hook functionality
   * - Parameter details with types and descriptions
   * - Return type information
   * - Code examples demonstrating usage
   * - Link to documentation
   *
   * @param hookName - Name of the hook (e.g., 'useAuth', 'useStore')
   * @param range - Range of the hook reference in the document
   * @returns Hover object with markdown content or undefined
   * @private
   *
   * ERROR HANDLING: Returns undefined if hook not found in index
   */
  private getHookHover(hookName: string, range: vscode.Range): vscode.Hover | undefined {
    try {
      const index = getIndex();
      const hook = index.getHook(hookName);

      if (!hook) {
        return undefined;
      }

      const markdown = new vscode.MarkdownString();
      markdown.isTrusted = true;

      markdown.appendMarkdown(`### ${hookName}\n\n`);
      markdown.appendCodeblock(hook.signature, 'typescript');

      if (hook.description) {
        markdown.appendMarkdown(`\n${hook.description}\n\n`);
      }

      if (hook.parameters && hook.parameters.length > 0) {
        markdown.appendMarkdown('**Parameters:**\n\n');
        hook.parameters.forEach(param => {
          markdown.appendMarkdown(`- **\`${param.name}\`** (\`${param.type}\`)`);
          if (param.description) {
            markdown.appendMarkdown(` - ${param.description}`);
          }
          markdown.appendMarkdown('\n');
        });
        markdown.appendMarkdown('\n');
      }

      if (hook.returnType) {
        markdown.appendMarkdown(`**Returns:** \`${hook.returnType}\`\n\n`);
      }

      if (hook.examples && hook.examples.length > 0) {
        markdown.appendMarkdown('---\n\n**Examples:**\n\n');
        const {examples} = hook;
        examples.forEach((example, index) => {
          markdown.appendCodeblock(example, 'typescript');
          if (index < examples.length - 1) {
            markdown.appendMarkdown('\n');
          }
        });
      }

      // Add documentation link
      markdown.appendMarkdown('\n---\n\n');
      markdown.appendMarkdown(`[View documentation](https://enzyme-docs.example.com/hooks/${hookName})\n`);

      return new vscode.Hover(markdown, range);
    } catch (error) {
      logger.debug(`Error getting hook hover for ${hookName}:`, error);
      return undefined;
    }
  }

  /**
   * Get hover information for a React component
   *
   * Creates rich hover content including:
   * - Component name and description
   * - Props interface with types
   * - JSX usage examples with sample prop values
   * - Link to component source file
   *
   * @param componentName - Name of the component
   * @param range - Range of the component reference in the document
   * @returns Hover object with markdown content or undefined
   * @private
   *
   * ERROR HANDLING: Returns undefined if component not found in index
   */
  private getComponentHover(componentName: string, range: vscode.Range): vscode.Hover | undefined {
    try {
      const index = getIndex();
      const component = index.getComponent(componentName);

      if (!component) {
        return undefined;
      }

      const markdown = new vscode.MarkdownString();
      markdown.isTrusted = true;

      markdown.appendMarkdown(`### Component: \`${component.name}\`\n\n`);

      if (component.description) {
        markdown.appendMarkdown(`${component.description}\n\n`);
      }

      if (component.props && Object.keys(component.props).length > 0) {
        markdown.appendMarkdown('**Props:**\n\n');
        markdown.appendMarkdown('```typescript\n');
        markdown.appendMarkdown(`interface ${component.name}Props {\n`);
        Object.entries(component.props).forEach(([name, type]) => {
          markdown.appendMarkdown(`  ${name}: ${type};\n`);
        });
        markdown.appendMarkdown('}\n');
        markdown.appendMarkdown('```\n\n');
      }

      markdown.appendMarkdown('---\n\n**Example:**\n\n');
      if (component.props && Object.keys(component.props).length > 0) {
        const propsExample = Object.entries(component.props)
          .slice(0, 3) // Show first 3 props
          .map(([name, type]) => {
            if (type === 'string') {
              return `${name}="value"`;
            } else if (type === 'number') {
              return `${name}={42}`;
            } else if (type === 'boolean') {
              return name;
            } 
              return `${name}={...}`;
            
          })
          .join('\n  ');

        markdown.appendCodeblock(
          `<${component.name}\n  ${propsExample}\n/>`,
          'tsx'
        );
      } else {
        markdown.appendCodeblock(`<${component.name} />`, 'tsx');
      }

      // Add link to component file
      markdown.appendMarkdown('\n---\n\n');
      markdown.appendMarkdown(`[View component source](${vscode.Uri.file(component.file).toString()})\n`);

      return new vscode.Hover(markdown, range);
    } catch {
      return undefined;
    }
  }

  /**
   * Get store hover information
   * @param storeName - Name of the store slice
   * @param range - Range of the store reference
   * @returns Hover object with store information or undefined
   * @private
   */
  private getStoreHover(storeName: string, range: vscode.Range): vscode.Hover | undefined {
    try {
      const index = getIndex();
      const store = index.getStore(storeName);

      if (!store) {
        return undefined;
      }

      const markdown = new vscode.MarkdownString();
      markdown.isTrusted = true;

      markdown.appendMarkdown(`### Store: \`${store.name}\`\n\n`);

      if (store.sliceName) {
        markdown.appendMarkdown(`**Slice:** \`${store.sliceName}\`\n\n`);
      }

      if (store.state && Object.keys(store.state).length > 0) {
        markdown.appendMarkdown('**State Shape:**\n\n');
        markdown.appendMarkdown('```typescript\n');
        markdown.appendMarkdown('{\n');
        Object.entries(store.state).forEach(([key, type]) => {
          markdown.appendMarkdown(`  ${key}: ${type};\n`);
        });
        markdown.appendMarkdown('}\n');
        markdown.appendMarkdown('```\n\n');
      }

      if (store.actions && store.actions.length > 0) {
        markdown.appendMarkdown('**Actions:**\n\n');
        store.actions.forEach(action => {
          markdown.appendMarkdown(`- \`${action}\`\n`);
        });
        markdown.appendMarkdown('\n');
      }

      markdown.appendMarkdown('---\n\n**Example:**\n\n');
      if (store.sliceName) {
        markdown.appendCodeblock(
          `const data = useStore(state => state.${store.sliceName});`,
          'typescript'
        );
      }

      if (store.actions && store.actions.length > 0) {
        markdown.appendCodeblock(
          `dispatch(${store.actions[0]}(payload));`,
          'typescript'
        );
      }

      // Add link to store file
      markdown.appendMarkdown('\n---\n\n');
      markdown.appendMarkdown(`[View store definition](${vscode.Uri.file(store.file).toString()})\n`);

      return new vscode.Hover(markdown, range);
    } catch {
      return undefined;
    }
  }

  /**
   * Get API hover information
   * @param document - Document containing the API call
   * @param position - Position of the cursor
   * @param range - Range of the API reference
   * @returns Hover object with API information or undefined
   * @private
   */
  private getApiHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    range: vscode.Range
  ): vscode.Hover | undefined {
    try {
      const index = getIndex();
      const apis = index.getAllApis();

      // Try to find API call at current position
      const line = document.lineAt(position.line).text;
      const methodMatch = /\.(get|post|put|patch|delete|head|options)\s*\(/i.exec(line);

      if (!methodMatch) {
        return undefined;
      }

      if (!methodMatch[1]) {
        return undefined;
      }

      const method = methodMatch[1].toUpperCase();

      // Extract endpoint from the line
      const endpointMatch = /["']([^"']+)["']/.exec(line);
      if (!endpointMatch) {
        return undefined;
      }

      const endpoint = endpointMatch[1];

      // Find matching API
      const api = apis.find(a => a.method === method && a.endpoint === endpoint);

      const markdown = new vscode.MarkdownString();
      markdown.isTrusted = true;

      markdown.appendMarkdown(`### API Request\n\n`);
      markdown.appendCodeblock(`${method} ${endpoint}`, 'http');

      if (api) {
        if (api.description) {
          markdown.appendMarkdown(`\n${api.description}\n\n`);
        }

        if (api.requestType) {
          markdown.appendMarkdown(`**Request Type:** \`${api.requestType}\`\n\n`);
        }

        if (api.responseType) {
          markdown.appendMarkdown(`**Response Type:** \`${api.responseType}\`\n\n`);
        }
      }

      markdown.appendMarkdown('---\n\n**Example:**\n\n');
      markdown.appendCodeblock(
        `const response = await apiClient.${method.toLowerCase()}('${endpoint}');`,
        'typescript'
      );

      return new vscode.Hover(markdown, range);
    } catch {
      return undefined;
    }
  }

  /**
   * Get configuration hover information
   * @param configKey - Configuration key name
   * @param range - Range of the config reference
   * @returns Hover object with configuration information or undefined
   * @private
   */
  private getConfigHover(configKey: string, range: vscode.Range): vscode.Hover | undefined {
    const configDocs: Record<string, { description: string; type: string; example: string }> = {
      features: {
        description: 'Configure feature flags and feature modules',
        type: 'Record<string, FeatureConfig>',
        example: `features: {
  darkMode: {
    enabled: true,
    rollout: 100
  }
}`,
      },
      routes: {
        description: 'Define application routes and route configuration',
        type: 'Record<string, RouteConfig>',
        example: `routes: {
  home: {
    path: '/',
    component: HomePage
  },
  user: {
    path: '/user/:id',
    component: UserPage,
    guards: ['auth']
  }
}`,
      },
      api: {
        description: 'Configure API client settings',
        type: 'ApiConfig',
        example: `api: {
  baseURL: 'https://api.example.com',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
}`,
      },
      auth: {
        description: 'Configure authentication settings',
        type: 'AuthConfig',
        example: `auth: {
  provider: 'oauth',
  redirectUrl: '/auth/callback',
  tokenKey: 'access_token'
}`,
      },
      store: {
        description: 'Configure global state management',
        type: 'StoreConfig',
        example: `store: {
  devTools: true,
  persist: ['auth', 'user']
}`,
      },
    };

    const config = configDocs[configKey];
    if (!config) {
      return undefined;
    }

    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;

    markdown.appendMarkdown(`### Config: \`${configKey}\`\n\n`);
    markdown.appendMarkdown(`${config.description}\n\n`);
    markdown.appendMarkdown(`**Type:** \`${config.type}\`\n\n`);
    markdown.appendMarkdown('---\n\n**Example:**\n\n');
    markdown.appendCodeblock(config.example, 'typescript');

    return new vscode.Hover(markdown, range);
  }

  /**
   * Check if position is in JSX context
   *
   * Determines if the cursor is positioned within JSX code by looking for
   * JSX opening tags (<Component) or closing tags (</Component>).
   *
   * @param document - The document to check
   * @param position - Position to check for JSX context
   * @returns True if position appears to be in JSX code
   * @private
   */
  private isInJsxContext(document: vscode.TextDocument, position: vscode.Position): boolean {
    const line = document.lineAt(position.line).text;
    return /<[A-Z]/.test(line) || line.includes('</');
  }

  /**
   * Check if in store/state context
   *
   * Determines if the line contains store-related code like:
   * - useStore hook calls
   * - State access (state.*)
   * - Dispatch calls
   *
   * @param line - Line of text to check
   * @returns True if line appears to be store-related
   * @private
   */
  private isInStoreContext(line: string): boolean {
    return line.includes('useStore') || line.includes('state.') || line.includes('dispatch(');
  }

  /**
   * Check if in API context
   *
   * Determines if the line contains API-related code like:
   * - apiClient method calls
   * - RequestBuilder usage
   * - HTTP method calls (get, post, etc.)
   *
   * @param line - Line of text to check
   * @returns True if line appears to be API-related
   * @private
   */
  private isInApiContext(line: string): boolean {
    return (
      line.includes('apiClient') ||
      line.includes('RequestBuilder') ||
      /\.(get|post|put|patch|delete)\(/.test(line)
    );
  }

  /**
   * Dispose the hover provider and clean up resources
   *
   * PERFORMANCE: Ensures proper cleanup to prevent memory leaks
   *
   * @public
   */
  public dispose(): void {
    logger.debug('EnzymeHoverProvider disposed');
  }
}
