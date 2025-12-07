import * as vscode from 'vscode';
import { getParser } from './parser';

/**
 * EnzymeDocumentSymbolProvider - Provides document outline symbols
 * Extracts routes, components, hooks, stores for outline view and breadcrumbs
 */
export class EnzymeDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  /**
   * Provide document symbols
   * @param document - Document to provide symbols for
   * @param _token - Cancellation token
   * @returns Array of document symbols or undefined
   */
  public async provideDocumentSymbols(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): Promise<vscode.DocumentSymbol[] | undefined> {
    const parser = getParser();
    const result = parser.parseDocument(document);

    const symbols: vscode.DocumentSymbol[] = [];

    // Add route symbols
    result.routes.forEach(route => {
      const symbol = new vscode.DocumentSymbol(
        route.name,
        route.path,
        vscode.SymbolKind.Constant,
        route.range,
        route.range
      );

      // Add child symbols for route properties
      if (route.component) {
        const componentSymbol = new vscode.DocumentSymbol(
          'component',
          route.component,
          vscode.SymbolKind.Property,
          route.range,
          route.range
        );
        symbol.children.push(componentSymbol);
      }

      if (route.guards && route.guards.length > 0) {
        route.guards.forEach(guard => {
          const guardSymbol = new vscode.DocumentSymbol(
            'guard',
            guard,
            vscode.SymbolKind.Property,
            route.range,
            route.range
          );
          symbol.children.push(guardSymbol);
        });
      }

      symbols.push(symbol);
    });

    // Add component symbols
    result.components.forEach(component => {
      const kind = component.isExported
        ? vscode.SymbolKind.Function
        : vscode.SymbolKind.Function;

      const symbol = new vscode.DocumentSymbol(
        component.name,
        'Component',
        kind,
        component.range,
        component.range
      );

      // Add props as children
      if (component.props) {
        Object.entries(component.props).forEach(([name, type]) => {
          const propertySymbol = new vscode.DocumentSymbol(
            name,
            type,
            vscode.SymbolKind.Property,
            component.range,
            component.range
          );
          symbol.children.push(propertySymbol);
        });
      }

      symbols.push(symbol);
    });

    // Add hook symbols
    result.hooks.forEach(hook => {
      const symbol = new vscode.DocumentSymbol(
        hook.name,
        'Hook Usage',
        vscode.SymbolKind.Function,
        hook.range,
        hook.range
      );

      symbols.push(symbol);
    });

    // Add store symbols
    result.stores.forEach(store => {
      const symbol = new vscode.DocumentSymbol(
        store.name,
        store.sliceName || 'Store',
        vscode.SymbolKind.Class,
        store.range,
        store.range
      );

      // Add state properties
      if (store.state) {
        Object.entries(store.state).forEach(([name, type]) => {
          const stateSymbol = new vscode.DocumentSymbol(
            name,
            type,
            vscode.SymbolKind.Property,
            store.range,
            store.range
          );
          symbol.children.push(stateSymbol);
        });
      }

      // Add actions
      if (store.actions) {
        store.actions.forEach(action => {
          const actionSymbol = new vscode.DocumentSymbol(
            action,
            'Action',
            vscode.SymbolKind.Method,
            store.range,
            store.range
          );
          symbol.children.push(actionSymbol);
        });
      }

      symbols.push(symbol);
    });

    // Add API symbols
    result.apis.forEach(api => {
      const symbol = new vscode.DocumentSymbol(
        api.name,
        `${api.method} ${api.endpoint}`,
        vscode.SymbolKind.Interface,
        api.range,
        api.range
      );

      symbols.push(symbol);
    });

    return symbols.length > 0 ? symbols : undefined;
  }
}
