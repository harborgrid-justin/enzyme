import * as vscode from 'vscode';

/**
 *
 */
export class FeatureCodeLensProvider implements vscode.CodeLensProvider {
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

    // Find feature definitions
    const featurePattern = /createFeature\s*\(\s*{/g;
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

  /**
   *
   * @param document
   * @param position
   */
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
      featureText += `${line.text  }\n`;

      for (const char of line.text) {
        if (char === '{') {braceCount++;}
        if (char === '}') {braceCount--;}
      }

      if (braceCount === 0 && currentLine > position.line) {
        break;
      }

      currentLine++;
    }

    // Extract name
    const nameMatch = /name:\s*["']([^"']+)["']/.exec(featureText);
    const name = nameMatch ? nameMatch[1] : 'Unknown';

    // Extract enabled status
    const enabledMatch = /enabled:\s*(true|false)/.exec(featureText);
    const enabled = enabledMatch ? enabledMatch[1] === 'true' : true;

    // Extract feature flag
    const flagMatch = /flag:\s*["']([^"']+)["']/.exec(featureText);
    const flag = flagMatch ? flagMatch[1] : undefined;

    // Count routes
    const routesMatch = /routes:\s*\[([^\]]*)]/.exec(featureText);
    const routeCount = routesMatch && routesMatch[1]
      ? (routesMatch[1].match(/createRoute/g) || []).length
      : 0;

    const result: {
      name: string;
      enabled: boolean;
      flag?: string;
      routeCount: number;
    } = {
      name: name || 'Unknown',
      enabled,
      routeCount,
    };

    if (flag !== undefined) {
      result.flag = flag;
    }

    return result;
  }

  /**
   *
   */
  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }
}
