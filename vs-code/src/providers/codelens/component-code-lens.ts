import * as vscode from 'vscode';
import * as path from 'path';

export class ComponentCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
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

  private getStoryPath(componentUri: vscode.Uri, componentName: string): string | null {
    const dir = path.dirname(componentUri.fsPath);
    const baseName = path.basename(componentUri.fsPath, path.extname(componentUri.fsPath));

    // Common story file patterns
    const storyPatterns = [
      path.join(dir, `${baseName}.stories.tsx`),
      path.join(dir, `${baseName}.stories.ts`),
      path.join(dir, `${componentName}.stories.tsx`),
      path.join(dir, `${componentName}.stories.ts`),
      path.join(dir, '__stories__', `${baseName}.stories.tsx`),
    ];

    // Check if any of these files exist (simplified - in real implementation, use fs)
    // For now, return null as we can't sync check file existence
    return null;
  }

  private getTestPath(componentUri: vscode.Uri, componentName: string): string | null {
    const dir = path.dirname(componentUri.fsPath);
    const baseName = path.basename(componentUri.fsPath, path.extname(componentUri.fsPath));

    // Common test file patterns
    const testPatterns = [
      path.join(dir, `${baseName}.test.tsx`),
      path.join(dir, `${baseName}.test.ts`),
      path.join(dir, `${baseName}.spec.tsx`),
      path.join(dir, `${componentName}.test.tsx`),
      path.join(dir, '__tests__', `${baseName}.test.tsx`),
    ];

    // Check if any of these files exist (simplified)
    return null;
  }

  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }
}
