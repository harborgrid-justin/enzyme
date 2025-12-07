import * as vscode from 'vscode';
import { getIndex } from './enzyme-index';

/**
 * EnzymeWorkspaceSymbolProvider - Provides workspace-wide symbol search
 * Searches across all Enzyme entities with fuzzy matching
 */
export class EnzymeWorkspaceSymbolProvider implements vscode.WorkspaceSymbolProvider {
  /**
   * Provide workspace symbols
   * @param query - Search query string
   * @param _token - Cancellation token
   * @returns Array of symbol information or undefined
   */
  public async provideWorkspaceSymbols(
    query: string,
    _token: vscode.CancellationToken
  ): Promise<vscode.SymbolInformation[] | undefined> {
    if (!query || query.length < 2) {
      return undefined;
    }

    const symbols: vscode.SymbolInformation[] = [];

    try {
      const index = getIndex();

      // Search routes
      const routes = index.searchRoutes(query);
      routes.forEach(route => {
        symbols.push(
          new vscode.SymbolInformation(
            `Route: ${route.name}`,
            vscode.SymbolKind.Constant,
            route.path,
            new vscode.Location(vscode.Uri.file(route.file), route.position)
          )
        );
      });

      // Search components
      const components = index.searchComponents(query);
      components.forEach(component => {
        symbols.push(
          new vscode.SymbolInformation(
            component.name,
            vscode.SymbolKind.Class,
            'Component',
            new vscode.Location(vscode.Uri.file(component.file), component.position)
          )
        );
      });

      // Search hooks
      const hooks = index.searchHooks(query);
      hooks.forEach(hook => {
        if (hook.file && hook.position) {
          symbols.push(
            new vscode.SymbolInformation(
              hook.name,
              vscode.SymbolKind.Function,
              'Hook',
              new vscode.Location(vscode.Uri.file(hook.file), hook.position)
            )
          );
        }
      });

      // Search stores
      const stores = index.searchStores(query);
      stores.forEach(store => {
        symbols.push(
          new vscode.SymbolInformation(
            store.name,
            vscode.SymbolKind.Class,
            store.sliceName || 'Store',
            new vscode.Location(vscode.Uri.file(store.file), store.position)
          )
        );
      });

      // Search APIs
      const apis = index.searchApis(query);
      apis.forEach(api => {
        symbols.push(
          new vscode.SymbolInformation(
            api.name,
            vscode.SymbolKind.Interface,
            'API',
            new vscode.Location(vscode.Uri.file(api.file), api.position)
          )
        );
      });
    } catch (error) {
      console.error('Error providing workspace symbols:', error);
    }

    return symbols.length > 0 ? symbols : undefined;
  }

  /**
   * Resolve workspace symbol (optional, for lazy loading)
   * @param symbol - Symbol to resolve
   * @param _token - Cancellation token
   * @returns Resolved symbol information
   */
  public async resolveWorkspaceSymbol(
    symbol: vscode.SymbolInformation,
    _token: vscode.CancellationToken
  ): Promise<vscode.SymbolInformation | undefined> {
    return symbol;
  }
}
