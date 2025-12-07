import * as vscode from 'vscode';

/**
 *
 */
export class RouteCodeLensProvider implements vscode.CodeLensProvider {
  private readonly _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  /**
   *
   * @param document
   * @param token
   */
  public provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();

    // Find route definitions
    const routePattern = /createRoute\s*\(\s*{/g;
    let match;

    while ((match = routePattern.exec(text)) !== null) {
      const position = document.positionAt(match.index);
      const range = new vscode.Range(position, position);

      // Extract route information
      const routeInfo = this.extractRouteInfo(document, position);

      if (routeInfo) {
        // "Navigate to Page" lens
        if (routeInfo.component) {
          codeLenses.push(
            new vscode.CodeLens(range, {
              title: `$(link) Navigate to ${routeInfo.component}`,
              command: 'enzyme.navigateToComponent',
              arguments: [routeInfo.component, document.uri],
            })
          );
        }

        // Show route path
        if (routeInfo.path) {
          codeLenses.push(
            new vscode.CodeLens(range, {
              title: `$(globe) ${routeInfo.path}`,
              command: '',
            })
          );
        }

        // Show guard chain
        if (routeInfo.guards && routeInfo.guards.length > 0) {
          codeLenses.push(
            new vscode.CodeLens(range, {
              title: `$(shield) Guards: ${routeInfo.guards.join(' → ')}`,
              command: 'enzyme.showGuardDetails',
              arguments: [routeInfo.guards],
            })
          );
        }

        // Show references count
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: '$(references) Find references',
            command: 'editor.action.findReferences',
            arguments: [document.uri, position],
          })
        );
      }
    }

    return codeLenses;
  }

  /**
   *
   * @param document
   * @param position
   */
  private extractRouteInfo(
    document: vscode.TextDocument,
    position: vscode.Position
  ): {
    path?: string;
    component?: string;
    guards?: string[];
  } | null {
    // Find the route object boundaries
    let currentLine = position.line;
    let braceCount = 0;
    let routeText = '';

    // Scan forward to find the complete route definition
    while (currentLine < document.lineCount && currentLine < position.line + 50) {
      const line = document.lineAt(currentLine);
      routeText += `${line.text  }\n`;

      for (const char of line.text) {
        if (char === '{') {braceCount++;}
        if (char === '}') {braceCount--;}
      }

      if (braceCount === 0 && currentLine > position.line) {
        break;
      }

      currentLine++;
    }

    // Extract path
    const pathMatch = /path:\s*["']([^"']+)["']/.exec(routeText);
    const path = pathMatch ? pathMatch[1] : undefined;

    // Extract component
    const componentMatch = /component:\s*(\w+)/.exec(routeText);
    const component = componentMatch ? componentMatch[1] : undefined;

    // Extract guards
    const guardsMatch = /guards:\s*\[([^\]]+)]/.exec(routeText);
    const guards = guardsMatch && guardsMatch[1]
      ? guardsMatch[1]
          .split(',')
          .map((g) => g.trim())
          .filter((g) => g.length > 0)
      : undefined;

    const result: { path?: string; component?: string; guards?: string[] } = {};
    if (path) result.path = path;
    if (component) result.component = component;
    if (guards) result.guards = guards;

    return result;
  }

  /**
   *
   */
  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }
}
