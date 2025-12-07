import * as vscode from 'vscode';

export class FeatureCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();

    // Find feature definitions
    const featurePattern = /createFeature\s*\(\s*\{/g;
    let match;

    while ((match = featurePattern.exec(text)) !== null) {
      const position = document.positionAt(match.index);
      const range = new vscode.Range(position, position);

      // Extract feature information
      const featureInfo = this.extractFeatureInfo(document, position);

      if (featureInfo) {
        // Feature status (enabled/disabled)
        const statusIcon = featureInfo.enabled ? '$(check)' : '$(x)';
        const statusText = featureInfo.enabled ? 'Enabled' : 'Disabled';

        codeLenses.push(
          new vscode.CodeLens(range, {
            title: `${statusIcon} ${statusText}`,
            command: 'enzyme.toggleFeature',
            arguments: [featureInfo.name, document.uri],
          })
        );

        // Feature flag configuration
        if (featureInfo.flag) {
          codeLenses.push(
            new vscode.CodeLens(range, {
              title: `$(flag) Flag: ${featureInfo.flag}`,
              command: 'enzyme.editFeatureFlag',
              arguments: [featureInfo.flag],
            })
          );
        }

        // Routes count
        if (featureInfo.routeCount > 0) {
          codeLenses.push(
            new vscode.CodeLens(range, {
              title: `$(link) ${featureInfo.routeCount} routes`,
              command: 'enzyme.showFeatureRoutes',
              arguments: [featureInfo.name, document.uri],
            })
          );
        }

        // Open dashboard
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: '$(dashboard) Open Dashboard',
            command: 'enzyme.openFeatureDashboard',
            arguments: [featureInfo.name],
          })
        );
      }
    }

    return codeLenses;
  }

  private extractFeatureInfo(
    document: vscode.TextDocument,
    position: vscode.Position
  ): {
    name: string;
    enabled: boolean;
    flag?: string;
    routeCount: number;
  } | null {
    // Find the feature object boundaries
    let currentLine = position.line;
    let braceCount = 0;
    let featureText = '';

    while (currentLine < document.lineCount && currentLine < position.line + 100) {
      const line = document.lineAt(currentLine);
      featureText += line.text + '\n';

      for (const char of line.text) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }

      if (braceCount === 0 && currentLine > position.line) {
        break;
      }

      currentLine++;
    }

    // Extract name
    const nameMatch = featureText.match(/name:\s*['"]([^'"]+)['"]/);
    const name = nameMatch ? nameMatch[1] : 'Unknown';

    // Extract enabled status
    const enabledMatch = featureText.match(/enabled:\s*(true|false)/);
    const enabled = enabledMatch ? enabledMatch[1] === 'true' : true;

    // Extract feature flag
    const flagMatch = featureText.match(/flag:\s*['"]([^'"]+)['"]/);
    const flag = flagMatch ? flagMatch[1] : undefined;

    // Count routes
    const routesMatch = featureText.match(/routes:\s*\[([^\]]*)\]/);
    const routeCount = routesMatch
      ? (routesMatch[1].match(/createRoute/g) || []).length
      : 0;

    return {
      name,
      enabled,
      flag,
      routeCount,
    };
  }

  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }
}
