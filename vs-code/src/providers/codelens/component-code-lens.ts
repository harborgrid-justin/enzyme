import * as vscode from 'vscode';

/**
 *
 */
export class ComponentCodeLensProvider implements vscode.CodeLensProvider {
  private readonly _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  /**
   *
   * @param document
   * @param token
   * @param _token
   */
  public provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();

    // Find React component definitions (function and const)
    const componentPatterns = [
      /export\s+(?:default\s+)?function\s+([A-Z]\w+)/g,
      /export\s+const\s+([A-Z]\w+):\s*(?:React\.)?FC/g,
      /export\s+const\s+([A-Z]\w+)\s*=\s*\([^)]*\)\s*(?:=>|:)/g,
    ];

    for (const pattern of componentPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const componentName = match[1];
        if (!componentName) {continue;}

        const position = document.positionAt(match.index);
        const range = new vscode.Range(position, position);

        // "X usages" lens
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: '$(references) Find usages',
            command: 'editor.action.findReferences',
            arguments: [document.uri, position],
          })
        );

        // Check if story file exists
        const storyPath = this.getStoryPath(document.uri, componentName);
        if (storyPath) {
          codeLenses.push(
            new vscode.CodeLens(range, {
              title: '$(book) Open Story',
              command: 'vscode.open',
              arguments: [vscode.Uri.file(storyPath)],
            })
          );
        }

        // Check if test file exists
        const testPath = this.getTestPath(document.uri, componentName);
        if (testPath) {
          codeLenses.push(
            new vscode.CodeLens(range, {
              title: '$(beaker) Run Tests',
              command: 'enzyme.runComponentTests',
              arguments: [testPath],
            })
          );
        }

        // Performance metrics (if available)
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: '$(graph) Performance',
            command: 'enzyme.showComponentMetrics',
            arguments: [componentName, document.uri],
          })
        );
      }
    }

    return codeLenses;
  }

  /**
   *
   * @param componentUri
   * @param componentName
   * @param _componentUri
   * @param _componentName
   */
  private getStoryPath(_componentUri: vscode.Uri, _componentName: string): string | null {
    // Check if any of these files exist (simplified - in real implementation, use fs)
    // For now, return null as we can't sync check file existence
    return null;
  }

  /**
   *
   * @param componentUri
   * @param componentName
   * @param _componentUri
   * @param _componentName
   */
  private getTestPath(_componentUri: vscode.Uri, _componentName: string): string | null {
    // Check if any of these files exist (simplified)
    return null;
  }

  /**
   *
   */
  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }
}
