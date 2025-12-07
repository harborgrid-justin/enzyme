import * as vscode from 'vscode';
import { getIndex } from './enzyme-index';
import { getParser } from './parser';

/**
 * EnzymeDefinitionProvider - Provides go-to-definition functionality
 * Supports routes, components, hooks, stores, and features
 */
export class EnzymeDefinitionProvider implements vscode.DefinitionProvider {
  /**
   * Provide definition location(s)
   */
  public async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Definition | vscode.LocationLink[] | undefined> {
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) {
      return undefined;
    }

    const word = document.getText(wordRange);
    const line = document.lineAt(position.line).text;

    // Route definition
    if (line.includes('routes.') && wordRange) {
      const routeDef = this.getRouteDefinition(word);
      if (routeDef) {
        return routeDef;
      }
    }

    // Component definition
    if (/^[A-Z]/.test(word)) {
      const componentDef = this.getComponentDefinition(word);
      if (componentDef) {
        return componentDef;
      }
    }

    // Hook definition
    if (word.startsWith('use') && /^use[A-Z]/.test(word)) {
      const hookDef = this.getHookDefinition(word);
      if (hookDef) {
        return hookDef;
      }
    }

    // Store definition
    if (this.isInStoreContext(line)) {
      const storeDef = this.getStoreDefinition(word);
      if (storeDef) {
        return storeDef;
      }
    }

    // Import definition
    if (this.isInImportStatement(line)) {
      const importDef = this.getImportDefinition(document, position, word);
      if (importDef) {
        return importDef;
      }
    }

    return undefined;
  }

  /**
   * Get route definition location
   */
  private getRouteDefinition(routeName: string): vscode.Location | undefined {
    try {
      const index = getIndex();
      const route = index.getRoute(routeName);

      if (!route) {
        return undefined;
      }

      return new vscode.Location(
        vscode.Uri.file(route.file),
        route.position
      );
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get component definition location
   */
  private getComponentDefinition(componentName: string): vscode.Location | undefined {
    try {
      const index = getIndex();
      const component = index.getComponent(componentName);

      if (!component) {
        return undefined;
      }

      return new vscode.Location(
        vscode.Uri.file(component.file),
        component.position
      );
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get hook definition location
   */
  private getHookDefinition(hookName: string): vscode.Location | undefined {
    try {
      const index = getIndex();
      const hook = index.getHook(hookName);

      if (!hook || !hook.file || !hook.position) {
        return undefined;
      }

      return new vscode.Location(
        vscode.Uri.file(hook.file),
        hook.position
      );
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get store definition location
   */
  private getStoreDefinition(storeName: string): vscode.Location | undefined {
    try {
      const index = getIndex();
      const store = index.getStore(storeName);

      if (!store) {
        return undefined;
      }

      return new vscode.Location(
        vscode.Uri.file(store.file),
        store.position
      );
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get import definition location
   */
  private async getImportDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    word: string
  ): Promise<vscode.Location | undefined> {
    // This would require resolving module paths
    // For now, return undefined - can be enhanced with module resolution
    return undefined;
  }

  /**
   * Check if in store context
   */
  private isInStoreContext(line: string): boolean {
    return line.includes('useStore') || line.includes('state.') || line.includes('dispatch(');
  }

  /**
   * Check if in import statement
   */
  private isInImportStatement(line: string): boolean {
    return /import\s+/.test(line);
  }
}
