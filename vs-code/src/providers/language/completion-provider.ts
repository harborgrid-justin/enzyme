import * as vscode from 'vscode';
import { getIndex } from './enzyme-index';
import { getParser } from './parser';

/**
 * EnzymeCompletionProvider - Provides IntelliSense completions for Enzyme
 * Supports routes, hooks, components, imports, and configuration
 */
export class EnzymeCompletionProvider implements vscode.CompletionItemProvider {
  private enzymeConfigItems: vscode.CompletionItem[] = [];

  constructor() {
    this.initializeConfigCompletions();
  }

  /**
   * Initialize configuration completions
   */
  private initializeConfigCompletions(): void {
    // Enzyme config completions
    const configOptions = [
      {
        label: 'features',
        kind: vscode.CompletionItemKind.Property,
        detail: 'Feature configuration',
        documentation: 'Configure feature flags and feature modules',
        insertText: new vscode.SnippetString('features: {\n\t$1\n}'),
      },
      {
        label: 'routes',
        kind: vscode.CompletionItemKind.Property,
        detail: 'Route configuration',
        documentation: 'Define application routes and route guards',
        insertText: new vscode.SnippetString('routes: {\n\t$1\n}'),
      },
      {
        label: 'api',
        kind: vscode.CompletionItemKind.Property,
        detail: 'API configuration',
        documentation: 'Configure API client settings',
        insertText: new vscode.SnippetString('api: {\n\tbaseURL: "$1",\n\ttimeout: ${2:30000}\n}'),
      },
      {
        label: 'auth',
        kind: vscode.CompletionItemKind.Property,
        detail: 'Authentication configuration',
        documentation: 'Configure authentication settings',
        insertText: new vscode.SnippetString('auth: {\n\tprovider: "$1",\n\tredirectUrl: "$2"\n}'),
      },
      {
        label: 'store',
        kind: vscode.CompletionItemKind.Property,
        detail: 'Store configuration',
        documentation: 'Configure global state management',
        insertText: new vscode.SnippetString('store: {\n\tdevTools: ${1:true}\n}'),
      },
    ];

    this.enzymeConfigItems = configOptions.map(opt => {
      const item = new vscode.CompletionItem(opt.label, opt.kind);
      item.detail = opt.detail;
      item.documentation = new vscode.MarkdownString(opt.documentation);
      item.insertText = opt.insertText;
      return item;
    });
  }

  /**
   * Provide completion items
   */
  public async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[] | vscode.CompletionList | undefined> {
    const line = document.lineAt(position.line).text;
    const linePrefix = line.substring(0, position.character);

    // Configuration file completions
    if (document.fileName.endsWith('enzyme.config.ts') || document.fileName.endsWith('enzyme.config.js')) {
      return this.provideConfigCompletions(document, position, linePrefix);
    }

    // Route completions (routes.)
    if (linePrefix.endsWith('routes.')) {
      return this.provideRouteCompletions();
    }

    // Hook completions (use...)
    if (this.shouldProvideHookCompletions(linePrefix)) {
      return this.provideHookCompletions();
    }

    // JSX component completions
    if (context.triggerCharacter === '<' || this.isInJsxContext(document, position)) {
      return this.provideComponentCompletions(linePrefix);
    }

    // Import completions
    if (this.isInImportStatement(linePrefix)) {
      return this.provideImportCompletions(linePrefix);
    }

    // Store selector completions
    if (linePrefix.includes('useStore(') || linePrefix.includes('state.')) {
      return this.provideStoreCompletions(linePrefix);
    }

    return undefined;
  }

  /**
   * Provide configuration completions
   */
  private provideConfigCompletions(
    document: vscode.TextDocument,
    position: vscode.Position,
    linePrefix: string
  ): vscode.CompletionItem[] {
    // Check if we're inside the main config object
    if (this.isInConfigObject(document, position)) {
      return this.enzymeConfigItems;
    }

    return [];
  }

  /**
   * Check if position is inside config object
   */
  private isInConfigObject(document: vscode.TextDocument, position: vscode.Position): boolean {
    // Simplified check - look for export default or defineConfig
    const text = document.getText();
    return text.includes('export default') || text.includes('defineConfig');
  }

  /**
   * Provide route completions
   */
  private provideRouteCompletions(): vscode.CompletionItem[] {
    try {
      const index = getIndex();
      const routes = index.getAllRoutes();

      return routes.map(route => {
        const item = new vscode.CompletionItem(
          route.name,
          vscode.CompletionItemKind.Constant
        );

        item.detail = `Route: ${route.path}`;

        const docs = new vscode.MarkdownString();
        docs.appendMarkdown(`**Route:** \`${route.path}\`\n\n`);

        if (route.params && route.params.length > 0) {
          docs.appendMarkdown(`**Parameters:** ${route.params.join(', ')}\n\n`);
        }

        if (route.guards && route.guards.length > 0) {
          docs.appendMarkdown(`**Guards:** ${route.guards.join(', ')}\n\n`);
        }

        if (route.component) {
          docs.appendMarkdown(`**Component:** ${route.component}\n\n`);
        }

        item.documentation = docs;
        item.sortText = `0_${route.name}`;

        return item;
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Should provide hook completions
   */
  private shouldProvideHookCompletions(linePrefix: string): boolean {
    // Match patterns like: const ... = use, const { } = use, use
    return /(?:const\s+.*?=\s+)?use[A-Z]?/.test(linePrefix) || linePrefix.trim().startsWith('use');
  }

  /**
   * Provide hook completions
   */
  private provideHookCompletions(): vscode.CompletionItem[] {
    try {
      const index = getIndex();
      const hooks = index.getAllHooks();

      return hooks.map(hook => {
        const item = new vscode.CompletionItem(
          hook.name,
          vscode.CompletionItemKind.Function
        );

        item.detail = hook.signature;

        const docs = new vscode.MarkdownString();
        docs.appendCodeblock(hook.signature, 'typescript');

        if (hook.description) {
          docs.appendMarkdown(`\n${hook.description}\n\n`);
        }

        if (hook.parameters && hook.parameters.length > 0) {
          docs.appendMarkdown('**Parameters:**\n\n');
          hook.parameters.forEach(param => {
            docs.appendMarkdown(`- \`${param.name}\`: ${param.type}`);
            if (param.description) {
              docs.appendMarkdown(` - ${param.description}`);
            }
            docs.appendMarkdown('\n');
          });
          docs.appendMarkdown('\n');
        }

        if (hook.returnType) {
          docs.appendMarkdown(`**Returns:** \`${hook.returnType}\`\n\n`);
        }

        if (hook.examples && hook.examples.length > 0) {
          docs.appendMarkdown('**Examples:**\n\n');
          hook.examples.forEach(example => {
            docs.appendCodeblock(example, 'typescript');
          });
        }

        item.documentation = docs;

        // Create snippet for function call
        if (hook.parameters && hook.parameters.length > 0) {
          const params = hook.parameters.map((p, i) => `\${${i + 1}:${p.name}}`).join(', ');
          item.insertText = new vscode.SnippetString(`${hook.name}(${params})`);
        } else {
          item.insertText = new vscode.SnippetString(`${hook.name}()`);
        }

        item.sortText = `0_${hook.name}`;

        return item;
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Check if position is in JSX context
   */
  private isInJsxContext(document: vscode.TextDocument, position: vscode.Position): boolean {
    const line = document.lineAt(position.line).text;
    // Simple heuristic: check for JSX opening tag
    return /<[A-Z]/.test(line) || /return\s*\(/.test(line);
  }

  /**
   * Provide component completions
   */
  private provideComponentCompletions(linePrefix: string): vscode.CompletionItem[] {
    try {
      const index = getIndex();
      const components = index.getAllComponents();

      return components.map(component => {
        const item = new vscode.CompletionItem(
          component.name,
          vscode.CompletionItemKind.Class
        );

        item.detail = `Component: ${component.name}`;

        const docs = new vscode.MarkdownString();
        docs.appendMarkdown(`**Component:** \`${component.name}\`\n\n`);

        if (component.description) {
          docs.appendMarkdown(`${component.description}\n\n`);
        }

        if (component.props) {
          docs.appendMarkdown('**Props:**\n\n');
          Object.entries(component.props).forEach(([name, type]) => {
            docs.appendMarkdown(`- \`${name}\`: ${type}\n`);
          });
          docs.appendMarkdown('\n');
        }

        item.documentation = docs;

        // Create JSX snippet
        if (component.props && Object.keys(component.props).length > 0) {
          const props = Object.keys(component.props)
            .map((name, i) => `${name}={$${i + 1}}`)
            .join(' ');
          item.insertText = new vscode.SnippetString(
            `${component.name} ${props}>$0</${component.name}>`
          );
        } else {
          item.insertText = new vscode.SnippetString(
            `${component.name}>$0</${component.name}>`
          );
        }

        item.sortText = `0_${component.name}`;

        return item;
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Check if in import statement
   */
  private isInImportStatement(linePrefix: string): boolean {
    return /import\s+.*from\s+['"]/.test(linePrefix);
  }

  /**
   * Provide import completions
   */
  private provideImportCompletions(linePrefix: string): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];

    // Enzyme framework imports
    const enzymeImports = [
      {
        label: '@enzyme/core',
        detail: 'Enzyme core utilities',
        insertText: '@enzyme/core',
      },
      {
        label: '@enzyme/router',
        detail: 'Enzyme routing',
        insertText: '@enzyme/router',
      },
      {
        label: '@enzyme/store',
        detail: 'Enzyme state management',
        insertText: '@enzyme/store',
      },
      {
        label: '@enzyme/api',
        detail: 'Enzyme API client',
        insertText: '@enzyme/api',
      },
      {
        label: '@enzyme/hooks',
        detail: 'Enzyme hooks',
        insertText: '@enzyme/hooks',
      },
      {
        label: '@enzyme/ui',
        detail: 'Enzyme UI components',
        insertText: '@enzyme/ui',
      },
    ];

    return enzymeImports.map(imp => {
      const item = new vscode.CompletionItem(
        imp.label,
        vscode.CompletionItemKind.Module
      );
      item.detail = imp.detail;
      item.insertText = imp.insertText;
      return item;
    });
  }

  /**
   * Provide store completions
   */
  private provideStoreCompletions(linePrefix: string): vscode.CompletionItem[] {
    try {
      const index = getIndex();
      const stores = index.getAllStores();

      const items: vscode.CompletionItem[] = [];

      stores.forEach(store => {
        // Store slice completion
        if (store.sliceName) {
          const sliceItem = new vscode.CompletionItem(
            store.sliceName,
            vscode.CompletionItemKind.Property
          );
          sliceItem.detail = `Store slice: ${store.sliceName}`;

          const docs = new vscode.MarkdownString();
          docs.appendMarkdown(`**Store Slice:** \`${store.sliceName}\`\n\n`);

          if (store.state) {
            docs.appendMarkdown('**State:**\n\n');
            Object.entries(store.state).forEach(([key, type]) => {
              docs.appendMarkdown(`- \`${key}\`: ${type}\n`);
            });
            docs.appendMarkdown('\n');
          }

          if (store.actions && store.actions.length > 0) {
            docs.appendMarkdown('**Actions:**\n\n');
            store.actions.forEach(action => {
              docs.appendMarkdown(`- \`${action}\`\n`);
            });
          }

          sliceItem.documentation = docs;
          items.push(sliceItem);
        }

        // Action completions
        if (store.actions) {
          store.actions.forEach(action => {
            const actionItem = new vscode.CompletionItem(
              action,
              vscode.CompletionItemKind.Method
            );
            actionItem.detail = `Action: ${store.name}.${action}`;
            items.push(actionItem);
          });
        }
      });

      return items;
    } catch (error) {
      return [];
    }
  }

  /**
   * Resolve completion item with additional details
   */
  public async resolveCompletionItem(
    item: vscode.CompletionItem,
    token: vscode.CancellationToken
  ): Promise<vscode.CompletionItem> {
    // Additional details can be loaded lazily here
    return item;
  }
}

/**
 * Get trigger characters for completion
 */
export function getCompletionTriggerCharacters(): string[] {
  return ['.', '<', '/', '"', "'"];
}
