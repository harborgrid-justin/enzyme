import * as vscode from 'vscode';
import { createDiagnostic } from '../enzyme-diagnostics';

/**
 *
 */
export class ComponentRules {
  /**
   *
   * @param document
   */
  public async analyze(document: vscode.TextDocument): Promise<vscode.Diagnostic[]> {
    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();

    // Only analyze React component files
    if (!this.isReactFile(document)) {
      return diagnostics;
    }

    // Check for missing memo on list items
    diagnostics.push(...this.checkMissingMemo(document, text));

    // Check for missing key props
    diagnostics.push(...this.checkMissingKeyProp(document, text));

    // Check for large components
    diagnostics.push(...this.checkLargeComponents(document, text));

    // Check for missing error boundaries
    diagnostics.push(...this.checkMissingErrorBoundary(document, text));

    return diagnostics;
  }

  /**
   *
   * @param document
   */
  private isReactFile(document: vscode.TextDocument): boolean {
    return (
      document.languageId === 'typescriptreact' ||
      document.languageId === 'javascriptreact' ||
      document.getText().includes('from \'react\'') ||
      document.getText().includes('from "react"')
    );
  }

  /**
   *
   * @param document
   * @param text
   */
  private checkMissingMemo(document: vscode.TextDocument, text: string): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    // Find components rendered in .map()
    const mapPattern = /\.map\(\([^)]*\)\s*=>\s*<(\w+)/g;
    let match;

    while ((match = mapPattern.exec(text)) !== null) {
      const componentName = match[1];
      const position = document.positionAt(match.index);

      // Check if component is memoized
      if (componentName && !this.isComponentMemoized(text, componentName)) {
        const range = new vscode.Range(position, position.translate(0, match[0].length));
        diagnostics.push(
          createDiagnostic(
            range,
            `Component '${componentName}' in list should be wrapped with React.memo() to prevent unnecessary re-renders`,
            vscode.DiagnosticSeverity.Warning,
            'missing-memo'
          )
        );
      }
    }

    return diagnostics;
  }

  /**
   *
   * @param document
   * @param text
   */
  private checkMissingKeyProp(document: vscode.TextDocument, text: string): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    // Find JSX elements in .map() without key prop
    const mapPattern = /\.map\(\([^)]*\)\s*=>\s*<(\w+)([^>]*)>/g;
    let match;

    while ((match = mapPattern.exec(text)) !== null) {
      const componentName = match[1];
      const props = match[2];

      // Check if key prop exists
      if (props && !props.includes('key=')) {
        const position = document.positionAt(match.index);
        const range = new vscode.Range(position, position.translate(0, match[0].length));

        diagnostics.push(
          createDiagnostic(
            range,
            `Missing 'key' prop for <${componentName}> in list. Each child in a list should have a unique 'key' prop.`,
            vscode.DiagnosticSeverity.Error,
            'missing-key-prop'
          )
        );
      }
    }

    return diagnostics;
  }

  /**
   *
   * @param document
   * @param text
   */
  private checkLargeComponents(document: vscode.TextDocument, text: string): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    const maxComponentLines = 200;

    // Find component definitions
    const componentPattern = /(?:export\s+)?(?:const|function)\s+([A-Z]\w+)/g;
    let match;

    while ((match = componentPattern.exec(text)) !== null) {
      const componentName = match[1];
      const startPosition = document.positionAt(match.index);

      // Find component boundaries
      const componentInfo = this.getComponentBoundaries(document, startPosition);

      if (componentInfo) {
        const lineCount = componentInfo.endLine - componentInfo.startLine;

        if (lineCount > maxComponentLines && componentName) {
          const range = new vscode.Range(
            startPosition,
            startPosition.translate(0, componentName.length)
          );

          diagnostics.push(
            createDiagnostic(
              range,
              `Component '${componentName}' is ${lineCount} lines long. Consider splitting into smaller components (max ${maxComponentLines} lines recommended).`,
              vscode.DiagnosticSeverity.Information,
              'large-component'
            )
          );
        }
      }
    }

    return diagnostics;
  }

  /**
   *
   * @param document
   * @param text
   */
  private checkMissingErrorBoundary(
    document: vscode.TextDocument,
    text: string
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    // Find async components or components with data fetching
    const asyncPattern = /(?:async|useEffect|fetch|axios|await)\s*\(/g;
    const componentPattern = /(?:export\s+)?(?:const|function)\s+([A-Z]\w+)/g;

    const asyncPositions: number[] = [];
    let match;

    while ((match = asyncPattern.exec(text)) !== null) {
      asyncPositions.push(match.index);
    }

    // Check if components with async operations have error boundaries
    while ((match = componentPattern.exec(text)) !== null) {
      const componentName = match[1];
      const startPosition = document.positionAt(match.index);
      const componentInfo = this.getComponentBoundaries(document, startPosition);

      if (componentInfo) {
        const componentText = text.substring(componentInfo.startIndex, componentInfo.endIndex);

        // Check if this component has async operations
        const hasAsync = /async|useEffect|fetch|axios|await/.test(componentText);

        // Check if wrapped with ErrorBoundary
        const hasErrorBoundary = componentText.includes('ErrorBoundary');

        if (hasAsync && !hasErrorBoundary && componentName) {
          const range = new vscode.Range(
            startPosition,
            startPosition.translate(0, componentName.length)
          );

          diagnostics.push(
            createDiagnostic(
              range,
              `Component '${componentName}' has async operations but is not wrapped with an ErrorBoundary`,
              vscode.DiagnosticSeverity.Hint,
              'missing-error-boundary'
            )
          );
        }
      }
    }

    return diagnostics;
  }

  /**
   *
   * @param text
   * @param componentName
   */
  private isComponentMemoized(text: string, componentName: string): boolean {
    const memoPattern = new RegExp(`React\\.memo\\(${componentName}\\)|memo\\(${componentName}\\)`);
    return memoPattern.test(text);
  }

  /**
   *
   * @param document
   * @param startPosition
   */
  private getComponentBoundaries(
    document: vscode.TextDocument,
    startPosition: vscode.Position
  ): {
    startLine: number;
    endLine: number;
    startIndex: number;
    endIndex: number;
  } | null {
    let currentLine = startPosition.line;
    let braceCount = 0;
    let startedBody = false;
    let startLine = startPosition.line;
    let endLine = startPosition.line;

    // Find the opening brace
    while (currentLine < document.lineCount && currentLine < startPosition.line + 500) {
      const line = document.lineAt(currentLine);

      for (let i = 0; i < line.text.length; i++) {
        const char = line.text[i];
        if (char === '{') {
          braceCount++;
          startedBody = true;
          if (braceCount === 1) {
            startLine = currentLine;
          }
        }
        if (char === '}') {
          braceCount--;
          if (startedBody && braceCount === 0) {
            endLine = currentLine;
            const startIndex = document.offsetAt(new vscode.Position(startLine, 0));
            const endIndex = document.offsetAt(new vscode.Position(endLine + 1, 0));
            return { startLine, endLine, startIndex, endIndex };
          }
        }
      }

      currentLine++;
    }

    return null;
  }
}
