import * as vscode from 'vscode';

/**
 *
 */
export class HookCodeLensProvider implements vscode.CodeLensProvider {
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

    // Find custom hook definitions (functions starting with 'use')
    const hookPattern = /export\s+(?:const|function)\s+(use[A-Z]\w+)/g;
    let match;

    while ((match = hookPattern.exec(text)) !== null) {
      const hookName = match[1];
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

      // Dependencies count
      const hookInfo = this.extractHookInfo(document, position);
      if (hookInfo) {
        if (hookInfo.dependencies.length > 0) {
          codeLenses.push(
            new vscode.CodeLens(range, {
              title: `$(list-tree) ${hookInfo.dependencies.length} dependencies`,
              command: 'enzyme.showHookDependencies',
              arguments: [hookName, hookInfo.dependencies],
            })
          );
        }

        // Show hook complexity
        if (hookInfo.complexity > 5) {
          codeLenses.push(
            new vscode.CodeLens(range, {
              title: `$(warning) Complexity: ${hookInfo.complexity}`,
              command: 'enzyme.showHookComplexity',
              arguments: [hookName, hookInfo],
            })
          );
        }
      }

      // View in debugger
      codeLenses.push(
        new vscode.CodeLens(range, {
          title: '$(debug) Debug Hook',
          command: 'enzyme.debugHook',
          arguments: [hookName, document.uri],
        })
      );
    }

    return codeLenses;
  }

  /**
   *
   * @param document
   * @param position
   */
  private extractHookInfo(
    document: vscode.TextDocument,
    position: vscode.Position
  ): {
    dependencies: string[];
    complexity: number;
  } | null {
    // Find the hook function body
    let currentLine = position.line;
    let braceCount = 0;
    let hookText = '';
    let startedBody = false;

    while (currentLine < document.lineCount && currentLine < position.line + 100) {
      const line = document.lineAt(currentLine);
      hookText += `${line.text  }\n`;

      for (const char of line.text) {
        if (char === '{') {
          braceCount++;
          startedBody = true;
        }
        if (char === '}') {braceCount--;}
      }

      if (startedBody && braceCount === 0) {
        break;
      }

      currentLine++;
    }

    // Extract dependencies from useEffect, useCallback, useMemo
    const dependencies = new Set<string>();
    const depPattern = /\[([^\]]*)]/g;
    let depMatch;

    while ((depMatch = depPattern.exec(hookText)) !== null) {
      if (depMatch[1]) {
        const deps = depMatch[1]
          .split(',')
          .map((d) => d.trim())
          .filter((d) => d.length > 0);
        deps.forEach((dep) => dependencies.add(dep));
      }
    }

    // Calculate complexity (simplified)
    const complexity =
      (hookText.match(/useState|useEffect|useCallback|useMemo/g) || []).length +
      (hookText.match(/if\s*\(|while\s*\(|for\s*\(/g) || []).length;

    return {
      dependencies: [...dependencies],
      complexity,
    };
  }

  /**
   *
   */
  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }
}
