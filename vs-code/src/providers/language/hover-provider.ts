import * as vscode from 'vscode';
import { getIndex } from './enzyme-index';
import { getParser } from './parser';

/**
 * EnzymeHoverProvider - Provides hover information for Enzyme entities
 * Shows documentation, signatures, and examples
 */
export class EnzymeHoverProvider implements vscode.HoverProvider {
  /**
   * Provide hover information
   */
  public async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | undefined> {
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) {
      return undefined;
    }

    const word = document.getText(wordRange);
    const line = document.lineAt(position.line).text;

    // Check for route hover
    if (line.includes('routes.') && wordRange) {
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
  }

  /**
   * Get route hover information
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
      markdown.appendMarkdown(`[View route definition](${vscode.Uri.file(route.file)})\n`);

      return new vscode.Hover(markdown, range);
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get hook hover information
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
        hook.examples.forEach((example, index) => {
          markdown.appendCodeblock(example, 'typescript');
          if (index < hook.examples!.length - 1) {
            markdown.appendMarkdown('\n');
          }
        });
      }

      // Add documentation link
      markdown.appendMarkdown('\n---\n\n');
      markdown.appendMarkdown(`[View documentation](https://enzyme-docs.example.com/hooks/${hookName})\n`);

      return new vscode.Hover(markdown, range);
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get component hover information
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
            } else {
              return `${name}={...}`;
            }
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
      markdown.appendMarkdown(`[View component source](${vscode.Uri.file(component.file)})\n`);

      return new vscode.Hover(markdown, range);
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get store hover information
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
      markdown.appendMarkdown(`[View store definition](${vscode.Uri.file(store.file)})\n`);

      return new vscode.Hover(markdown, range);
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get API hover information
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
      const methodMatch = line.match(/\.(get|post|put|patch|delete|head|options)\s*\(/i);

      if (!methodMatch) {
        return undefined;
      }

      const method = methodMatch[1].toUpperCase();

      // Extract endpoint from the line
      const endpointMatch = line.match(/['"]([^'"]+)['"]/);
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
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get configuration hover information
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
   */
  private isInJsxContext(document: vscode.TextDocument, position: vscode.Position): boolean {
    const line = document.lineAt(position.line).text;
    return /<[A-Z]/.test(line) || line.includes('</');
  }

  /**
   * Check if in store context
   */
  private isInStoreContext(line: string): boolean {
    return line.includes('useStore') || line.includes('state.') || line.includes('dispatch(');
  }

  /**
   * Check if in API context
   */
  private isInApiContext(line: string): boolean {
    return (
      line.includes('apiClient') ||
      line.includes('RequestBuilder') ||
      /\.(get|post|put|patch|delete)\(/.test(line)
    );
  }
}
