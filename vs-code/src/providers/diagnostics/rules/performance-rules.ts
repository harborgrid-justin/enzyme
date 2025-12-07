import * as vscode from 'vscode';
import { createDiagnostic } from '../enzyme-diagnostics';

/**
 *
 */
export class PerformanceRules {
  /**
   *
   * @param document
   */
  public async analyze(document: vscode.TextDocument): Promise<vscode.Diagnostic[]> {
    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();

    // Only analyze React files
    if (!this.isReactFile(document)) {
      return diagnostics;
    }

    // Check for inline functions in JSX
    diagnostics.push(...this.checkInlineFunctionsInJSX(document, text));

    // Check for missing useCallback
    diagnostics.push(...this.checkMissingUseCallback(document, text));

    // Check for large bundle imports
    diagnostics.push(...this.checkLargeBundleImports(document, text));

    // Check for unnecessary re-renders
    diagnostics.push(...this.checkUnnecessaryReRenders(document, text));

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
  private checkInlineFunctionsInJSX(
    document: vscode.TextDocument,
    text: string
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    // Find inline arrow functions in JSX props
    const inlineFunctionPattern = /(\w+)={(\([^)]*\)\s*=>|=>\s*)/g;
    let match;

    while ((match = inlineFunctionPattern.exec(text)) !== null) {
      const propertyName = match[1];
      const position = document.positionAt(match.index);

      // Skip certain props that commonly use inline functions
      if (!propertyName || ['children', 'render', 'component'].includes(propertyName)) {
        continue;
      }

      // Check if we're inside JSX
      if (this.isInsideJSX(text, match.index)) {
        const range = new vscode.Range(position, position.translate(0, match[0].length));

        diagnostics.push(
          createDiagnostic(
            range,
            `Inline function in JSX prop '${propertyName}' creates a new function on every render. Consider using useCallback.`,
            vscode.DiagnosticSeverity.Warning,
            'inline-function-jsx'
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
  private checkMissingUseCallback(
    document: vscode.TextDocument,
    text: string
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    // Find function definitions in components that are passed as props
    const functionPattern = /const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*{/g;
    let match;

    while ((match = functionPattern.exec(text)) !== null) {
      const functionName = match[1];
      const position = document.positionAt(match.index);

      // Check if this function is passed as a prop
      const isProperty = new RegExp(`${functionName}\\s*[}=]`).test(text);

      // Check if it's already wrapped in useCallback
      const beforeContext = text.substring(Math.max(0, match.index - 100), match.index);
      const isWrapped = beforeContext.includes('useCallback');

      if (functionName && isProperty && !isWrapped && this.isInsideComponent(text, match.index)) {
        const range = new vscode.Range(position, position.translate(0, functionName.length + 10));

        diagnostics.push(
          createDiagnostic(
            range,
            `Function '${functionName}' is passed as a prop but not wrapped in useCallback. This may cause unnecessary re-renders.`,
            vscode.DiagnosticSeverity.Information,
            'should-use-callback'
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
  private checkLargeBundleImports(
    document: vscode.TextDocument,
    text: string
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    // Check for barrel imports from large libraries
    const largeLibraries = ['lodash', 'moment', 'rxjs', '@material-ui/icons'];

    for (const library of largeLibraries) {
      const barrelImportPattern = new RegExp(
        `import\\s+{([^}]+)}\\s+from\\s+['"]${library}['"]`,
        'g'
      );
      let match;

      while ((match = barrelImportPattern.exec(text)) !== null) {
        const imports = match[1];
        const position = document.positionAt(match.index);
        const range = new vscode.Range(position, position.translate(0, match[0].length));

        diagnostics.push(
          createDiagnostic(
            range,
            `Importing from '${library}' barrel export increases bundle size. Use submodule imports: import ${imports?.trim() ?? ''} from '${library}/...'`,
            vscode.DiagnosticSeverity.Warning,
            'large-bundle-import'
          )
        );
      }
    }

    // Check for importing entire libraries
    const entireLibraryPattern = /import\s+\*\s+as\s+(\w+)\s+from\s+["']([^"']+)["']/g;
    let match;

    while ((match = entireLibraryPattern.exec(text)) !== null) {
      const alias = match[1];
      const library = match[2];
      const position = document.positionAt(match.index);
      const range = new vscode.Range(position, position.translate(0, match[0].length));

      diagnostics.push(
        createDiagnostic(
          range,
          `Importing entire library '${library}' as '${alias}' increases bundle size. Import only what you need.`,
          vscode.DiagnosticSeverity.Warning,
          'large-bundle-import'
        )
      );
    }

    return diagnostics;
  }

  /**
   *
   * @param document
   * @param text
   */
  private checkUnnecessaryReRenders(
    document: vscode.TextDocument,
    text: string
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    // Check for object/array literals in JSX
    const literalInJSXPattern = /<\w+[^>]*\s+(\w+)={([[{])/g;
    let match;

    while ((match = literalInJSXPattern.exec(text)) !== null) {
      const propertyName = match[1];
      const position = document.positionAt(match.index);

      // Skip style prop as it's commonly an object
      if (!propertyName || propertyName === 'style') {
        continue;
      }

      const range = new vscode.Range(
        position,
        position.translate(0, propertyName.length + 3)
      );

      diagnostics.push(
        createDiagnostic(
          range,
          `Object/array literal in JSX prop '${propertyName}' creates a new reference on every render. Consider using useMemo.`,
          vscode.DiagnosticSeverity.Hint,
          'unnecessary-rerender'
        )
      );
    }

    // Check for excessive useState in single component
    const statePattern = /useState/g;
    const stateMatches = text.match(statePattern);

    if (stateMatches && stateMatches.length > 10) {
      // Find the component with many states
      const componentPattern = /(?:export\s+)?(?:const|function)\s+([A-Z]\w+)/;
      const componentMatch = componentPattern.exec(text);

      if (componentMatch?.[1]) {
        const position = document.positionAt(componentMatch.index);
        const range = new vscode.Range(
          position,
          position.translate(0, componentMatch[1].length)
        );

        diagnostics.push(
          createDiagnostic(
            range,
            `Component has ${stateMatches.length} useState calls. Consider consolidating related state or using useReducer.`,
            vscode.DiagnosticSeverity.Hint,
            'excessive-state'
          )
        );
      }
    }

    return diagnostics;
  }

  /**
   *
   * @param text
   * @param position
   */
  private isInsideJSX(text: string, position: number): boolean {
    // Simple heuristic: check for < before and > after
    const before = text.substring(Math.max(0, position - 200), position);
    const after = text.substring(position, Math.min(text.length, position + 200));

    const hasJSXBefore = /<[A-Z]\w+/.test(before);
    const hasJSXAfter = /\/?>/.test(after);

    return hasJSXBefore && hasJSXAfter;
  }

  /**
   *
   * @param text
   * @param position
   */
  private isInsideComponent(text: string, position: number): boolean {
    // Check if we're inside a component function
    const before = text.slice(0, Math.max(0, position));
    const componentPattern = /(?:export\s+)?(?:const|function)\s+([A-Z]\w+)/g;

    let lastComponentStart = -1;
    let match;

    while ((match = componentPattern.exec(before)) !== null) {
      lastComponentStart = match.index;
    }

    return lastComponentStart !== -1;
  }
}
