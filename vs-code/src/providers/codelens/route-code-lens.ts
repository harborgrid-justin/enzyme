import * as vscode from 'vscode';

export class RouteCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();

    // Find route definitions
    const routePattern = /createRoute\s*\(\s*\{/g;
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
      routeText += line.text + '\n';

      for (const char of line.text) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }

      if (braceCount === 0 && currentLine > position.line) {
        break;
      }

      currentLine++;
    }

    // Extract path
    const pathMatch = routeText.match(/path:\s*['"]([^'"]+)['"]/);
    const path = pathMatch ? pathMatch[1] : undefined;

    // Extract component
    const componentMatch = routeText.match(/component:\s*(\w+)/);
    const component = componentMatch ? componentMatch[1] : undefined;

    // Extract guards
    const guardsMatch = routeText.match(/guards:\s*\[([^\]]+)\]/);
    const guards = guardsMatch
      ? guardsMatch[1]
          .split(',')
          .map((g) => g.trim())
          .filter((g) => g.length > 0)
      : undefined;

    return { path, component, guards };
  }

  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }
}
