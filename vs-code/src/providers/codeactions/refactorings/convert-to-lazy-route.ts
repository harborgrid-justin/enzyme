import * as vscode from 'vscode';

/**
 *
 */
export class ConvertToLazyRouteRefactoring {
  /**
   *
   * @param document
   * @param range
   * @param context
   */
  public provideRefactorings(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    _context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    // Only offer this refactoring when cursor is on a route definition
    if (!this.isValidRouteDefinition(document, range)) {
      return actions;
    }

    const convertAction = new vscode.CodeAction(
      'Convert to Lazy Loaded Route',
      vscode.CodeActionKind.Refactor
    );

    convertAction.edit = this.createLazyRouteEdit(document, range);
    convertAction.isPreferred = true;

    actions.push(convertAction);

    return actions;
  }

  /**
   *
   * @param document
   * @param range
   */
  private isValidRouteDefinition(document: vscode.TextDocument, range: vscode.Range): boolean {
    const line = document.lineAt(range.start.line);
    const {text} = line;

    // Check if line contains route definition patterns
    return (
      /component:\s*\w+/.test(text) ||
      /createRoute\s*\(/.test(text) ||
      /path:\s*["']/.test(text)
    );
  }

  /**
   *
   * @param document
   * @param range
   */
  private createLazyRouteEdit(
    document: vscode.TextDocument,
    range: vscode.Range
  ): vscode.WorkspaceEdit {
    const edit = new vscode.WorkspaceEdit();

    // Find the route definition
    const routeDefinition = this.findRouteDefinition(document, range.start.line);

    if (!routeDefinition) {
      return edit;
    }

    const { startLine, endLine, component, importStatement } = routeDefinition;

    // Remove or comment out the import
    if (importStatement) {
      edit.delete(
        document.uri,
        new vscode.Range(
          new vscode.Position(importStatement.line, 0),
          new vscode.Position(importStatement.line + 1, 0)
        )
      );
    }

    // Find component usage in route
    const routeRange = new vscode.Range(
      new vscode.Position(startLine, 0),
      new vscode.Position(endLine, document.lineAt(endLine).text.length)
    );

    const routeText = document.getText(routeRange);

    // Replace component with lazy load
    const lazyRouteText = this.convertToLazyLoad(routeText, component);

    edit.replace(document.uri, routeRange, lazyRouteText);

    return edit;
  }

  /**
   *
   * @param document
   * @param startLine
   */
  private findRouteDefinition(
    document: vscode.TextDocument,
    startLine: number
  ): {
    startLine: number;
    endLine: number;
    component: string;
    importStatement?: { line: number; text: string };
  } | null {
    // Find the route object boundaries
    let currentLine = startLine;
    let braceCount = 0;
    let foundStart = false;
    let routeStartLine = startLine;
    let component = '';

    // Search backwards for createRoute or route object start
    while (currentLine >= 0 && currentLine >= startLine - 20) {
      const line = document.lineAt(currentLine);
      if (line.text.includes('createRoute') || (/\w+:\s*{/.exec(line.text))) {
        routeStartLine = currentLine;
        foundStart = true;
        break;
      }
      currentLine--;
    }

    if (!foundStart) {
      return null;
    }

    // Find component name
    currentLine = routeStartLine;
    let routeEndLine = routeStartLine;

    while (currentLine < document.lineCount && currentLine < routeStartLine + 50) {
      const line = document.lineAt(currentLine);
      const componentMatch = /component:\s*(\w+)/.exec(line.text);

      if (componentMatch && componentMatch[1]) {
        component = componentMatch[1];
      }

      // Track braces to find end of route definition
      for (const char of line.text) {
        if (char === '{') {braceCount++;}
        if (char === '}') {braceCount--;}
      }

      if (braceCount === 0 && currentLine > routeStartLine) {
        routeEndLine = currentLine;
        break;
      }

      currentLine++;
    }

    if (!component) {
      return null;
    }

    // Find import statement for component
    const importStatement = this.findComponentImport(document, component);

    const result: {
      startLine: number;
      endLine: number;
      component: string;
      importStatement?: { line: number; text: string };
    } = {
      startLine: routeStartLine,
      endLine: routeEndLine,
      component,
    };

    if (importStatement) {
      result.importStatement = importStatement;
    }

    return result;
  }

  /**
   *
   * @param document
   * @param component
   */
  private findComponentImport(
    document: vscode.TextDocument,
    component: string
  ): { line: number; text: string } | undefined {
    for (let i = 0; i < Math.min(100, document.lineCount); i++) {
      const line = document.lineAt(i);
      if (
        line.text.includes(`import`) &&
        (line.text.includes(`{ ${component}`) ||
          line.text.includes(`${component} }`) ||
          line.text.includes(`, ${component},`) ||
          line.text.includes(`import ${component}`))
      ) {
        return { line: i, text: line.text };
      }
    }
    return undefined;
  }

  /**
   *
   * @param routeText
   * @param component
   */
  private convertToLazyLoad(routeText: string, component: string): string {
    // Replace direct component reference with lazy load
    const lazyComponent = `lazy(() => import('./components/${component}'))`;

    // Replace in the route definition
    let converted = routeText.replace(
      new RegExp(`component:\\s*${component}\\b`),
      `component: ${lazyComponent}`
    );

    // If the route doesn't have a Suspense boundary, add it
    if (!converted.includes('Suspense')) {
      // Wrap the lazy component with Suspense
      converted = converted.replace(
        /component:\s*lazy\([^)]+\)/,
        `component: () => (
      <Suspense fallback={<LoadingSpinner />}>
        <${component} />
      </Suspense>
    )`
      );

      // Add note about adding Suspense manually
      converted = `  // TODO: Add Suspense boundary or loading state\n${  converted}`;
    }

    return converted;
  }
}

// Helper to check if import for lazy exists
/**
 *
 * @param document
 */
export function ensureLazyImport(document: vscode.TextDocument): vscode.WorkspaceEdit | null {
  const text = document.getText();

  // Check if lazy is already imported
  if (text.includes('lazy') && (/import\s+{[^}]*lazy[^}]*}\s+from\s+["']react["']/.exec(text))) {
    return null;
  }

  const edit = new vscode.WorkspaceEdit();

  // Find React import
  for (let i = 0; i < Math.min(50, document.lineCount); i++) {
    const line = document.lineAt(i);

    if (/import\s+(?:{[^}]*}|React)\s+from\s+["']react["']/.exec(line.text)) {
      // Add lazy to existing import
      const importMatch = /import\s+{([^}]*)}\s+from\s+["']react["']/.exec(line.text);

      if (importMatch && importMatch[1]) {
        const existingImports = importMatch[1];
        const newImports = existingImports.includes('lazy')
          ? existingImports
          : `${existingImports}, lazy, Suspense`;

        edit.replace(
          document.uri,
          new vscode.Range(
            new vscode.Position(i, 0),
            new vscode.Position(i, line.text.length)
          ),
          line.text.replace(existingImports, newImports)
        );
      } else {
        // Add new import line
        edit.insert(
          document.uri,
          new vscode.Position(i + 1, 0),
          "import { lazy, Suspense } from 'react';\n"
        );
      }

      return edit;
    }
  }

  // No React import found, add one
  edit.insert(
    document.uri,
    new vscode.Position(0, 0),
    "import { lazy, Suspense } from 'react';\n"
  );

  return edit;
}
